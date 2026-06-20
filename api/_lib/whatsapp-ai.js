import { getOpenRouterRuntimeConfig, requestOpenRouterJson } from "./openrouter.js";

const INTENTS = [
  "promessa_de_pagamento",
  "pagamento_realizado",
  "duvida_valor",
  "contestacao",
  "quer_humano",
  "saudacao",
  "outro",
];

function centsToCurrency(cents) {
  const amount = Number(cents || 0) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sanitizeAiResult(result) {
  const intent = INTENTS.includes(result?.intent) ? result.intent : "outro";
  const rawConfidence = Number(result?.confidence);
  const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0;
  const suggestedReply = String(result?.suggested_reply || "").trim().slice(0, 700);
  const summary = String(result?.summary || "").trim().slice(0, 500);

  return {
    intent,
    confidence,
    shouldReply: Boolean(result?.should_reply),
    handoffRequired: Boolean(result?.handoff_required),
    suggestedReply,
    summary,
    raw: result,
  };
}

async function loadMessageContext(sql, messageId, conversationId) {
  const rows = await sql`
    select
      wcm.id,
      wcm.body,
      wcm.conversation_id,
      wcm.resident_id,
      wcm.condominium_id,
      wc.contact_name,
      wc.contact_phone,
      r.full_name,
      r.unit_label,
      c.name as condominium_name,
      vp.current_status,
      vp.current_days_overdue,
      vp.current_amount_cents,
      vp.due_date
    from whatsapp_conversation_messages wcm
    join whatsapp_conversations wc on wc.id = wcm.conversation_id
    left join residents r on r.id = wcm.resident_id
    left join condominiums c on c.id = wcm.condominium_id
    left join v_resident_portfolio vp on vp.resident_id = wcm.resident_id
    where wcm.id = ${messageId}
    limit 1
  `;
  const message = rows[0] || null;

  const recentMessages = await sql`
    select direction, origin, body, coalesce(received_at, sent_at, created_at) as occurred_at
    from whatsapp_conversation_messages
    where conversation_id = ${conversationId}
    order by created_at desc
    limit 8
  `;

  return {
    message,
    recentMessages: recentMessages.reverse(),
  };
}

function buildPrompt({ message, recentMessages, mode }) {
  const residentName = message.full_name || message.contact_name || "condômino não identificado";
  const amount = centsToCurrency(message.current_amount_cents);
  const dueDate = message.due_date ? new Date(message.due_date).toLocaleDateString("pt-BR") : "não informada";
  const history = recentMessages
    .map((item) => `${item.direction}/${item.origin}: ${item.body}`)
    .join("\n")
    .slice(-2500);

  return [
    {
      role: "system",
      content: [
        "Você é um assistente de cobrança condominial em português do Brasil.",
        "Analise mensagens recebidas pelo WhatsApp e gere apenas JSON válido.",
        "Seja educado, curto e útil. Não ameace, não dê aconselhamento jurídico e não invente pagamento confirmado.",
        "Quando houver dúvida, peça confirmação humana.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        tarefa: mode === "classify" ? "classificar_intencao" : "classificar_e_sugerir_resposta",
        formatos_permitidos: {
          intent: INTENTS,
          confidence: "numero entre 0 e 1",
          should_reply: "boolean",
          handoff_required: "boolean",
          suggested_reply: "texto curto ou string vazia",
          summary: "resumo operacional curto",
        },
        contexto_condomino: {
          nome: residentName,
          unidade: message.unit_label || "não informada",
          condominio: message.condominium_name || "não identificado",
          status_cobranca: message.current_status || "não identificado",
          dias_em_atraso: message.current_days_overdue ?? null,
          valor_atual: amount,
          vencimento: dueDate,
        },
        historico_recente: history,
        mensagem_recebida: message.body,
        regras: [
          "Para promessa de pagamento, agradeça e peça comprovante quando pagar.",
          "Para pagamento realizado, peça comprovante ou confirmação do setor financeiro.",
          "Para contestação, dúvida sensível ou pedido humano, marque handoff_required como true.",
          "Não diga que baixou cobrança, removeu multa ou confirmou pagamento.",
        ],
      }),
    },
  ];
}

export async function analyzeInboundWhatsAppWithAi(sql, conversationResult) {
  const config = getOpenRouterRuntimeConfig();

  if (!config.enabled) {
    return { enabled: false, skipped: true, reason: "OPENROUTER_AI_ENABLED_off" };
  }

  if (!conversationResult?.saved || !conversationResult?.messageId) {
    return { enabled: true, skipped: true, reason: "message_not_saved" };
  }

  const { message, recentMessages } = await loadMessageContext(
    sql,
    conversationResult.messageId,
    conversationResult.conversationId,
  );

  if (!message?.body || message.body === "[Mensagem recebida sem texto]") {
    return { enabled: true, skipped: true, reason: "missing_text_body" };
  }

  async function saveAiFailure(error) {
    try {
      await sql`
        update whatsapp_conversation_messages
        set
          ai_analysis = ${JSON.stringify({ error: error.message })}::jsonb,
          ai_processed_at = now()
        where id = ${conversationResult.messageId}
      `;
    } catch {
      // Keep the W-API webhook healthy even if the AI migration is not applied yet.
    }
  }

  try {
    const completion = await requestOpenRouterJson({
      messages: buildPrompt({ message, recentMessages, mode: config.mode }),
      maxTokens: config.mode === "classify" ? 140 : 240,
      temperature: 0.2,
    });
    const result = sanitizeAiResult(completion.data);

    await sql`
      update whatsapp_conversation_messages
      set
        ai_intent = ${result.intent},
        ai_confidence = ${result.confidence},
        ai_should_reply = ${result.shouldReply},
        ai_handoff_required = ${result.handoffRequired},
        ai_suggested_reply = ${result.suggestedReply || null},
        ai_analysis = ${JSON.stringify({ ...result.raw, usage: completion.usage })}::jsonb,
        ai_model = ${completion.model},
        ai_processed_at = now()
      where id = ${conversationResult.messageId}
    `;

    await sql`
      update whatsapp_conversations
      set
        ai_handoff_required = ${result.handoffRequired},
        ai_summary = ${result.summary || null},
        status = case
          when ${result.handoffRequired} then 'waiting_human'::conversation_status
          else status
        end
      where id = ${conversationResult.conversationId}
    `;

    return {
      enabled: true,
      analyzed: true,
      intent: result.intent,
      confidence: result.confidence,
      shouldReply: result.shouldReply,
      handoffRequired: result.handoffRequired,
      suggestedReply: result.suggestedReply,
    };
  } catch (error) {
    await saveAiFailure(error);

    return {
      enabled: true,
      analyzed: false,
      error: error.message,
    };
  }
}
