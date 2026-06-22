import { getOpenRouterRuntimeConfig, requestOpenRouterJson } from "./openrouter.js";
import { normalizeWhatsAppRecipient, sendWhatsAppText } from "./wapi.js";

const INTENTS = [
  "promessa_de_pagamento",
  "pagamento_realizado",
  "duvida_valor",
  "contestacao",
  "quer_humano",
  "saudacao",
  "outro",
];
const AUTOREPLY_BLOCKED_INTENTS = new Set(["contestacao", "quer_humano", "pagamento_realizado"]);

function centsToCurrency(cents) {
  const amount = Number(cents || 0) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getSaoPauloDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    iso: `${map.year}-${map.month}-${map.day}`,
    label: `${map.day}/${map.month}/${map.year}`,
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function formatIsoDateToPtBr(isoDate) {
  if (!isoDate) {
    return "não informada";
  }

  const [year, month, day] = String(isoDate).slice(0, 10).split("-");

  return year && month && day ? `${day}/${month}/${year}` : "não informada";
}

function getBusinessDayIso(year, month, businessDay) {
  let count = 0;

  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCMonth() !== month - 1) {
      break;
    }

    const weekDay = date.getUTCDay();

    if (weekDay === 0 || weekDay === 6) {
      continue;
    }

    count += 1;

    if (count === businessDay) {
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

function getCalendarDayIso(year, month, calendarDay) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(Number(calendarDay || 1), 1), lastDay);

  return new Date(Date.UTC(year, month - 1, safeDay)).toISOString().slice(0, 10);
}

function getComputedDueDateIso(message) {
  if (message.due_date) {
    return message.due_date instanceof Date
      ? getSaoPauloDateParts(message.due_date).iso
      : String(message.due_date).slice(0, 10);
  }

  const today = getSaoPauloDateParts();
  const dueDay = Number(message.fee_due_day || 5);

  if (message.fee_due_rule === "calendar_day") {
    return getCalendarDayIso(today.year, today.month, dueDay);
  }

  return getBusinessDayIso(today.year, today.month, dueDay);
}

function getDateDiffInDays(fromIsoDate, toIsoDate) {
  if (!fromIsoDate || !toIsoDate) {
    return null;
  }

  const from = new Date(`${fromIsoDate}T00:00:00Z`);
  const to = new Date(`${toIsoDate}T00:00:00Z`);
  const diff = Math.round((to.getTime() - from.getTime()) / 86400000);

  return Number.isFinite(diff) ? diff : null;
}

function getDueDateContext(dueDate) {
  const today = getSaoPauloDateParts();
  const dueIso = dueDate instanceof Date
    ? getSaoPauloDateParts(dueDate).iso
    : String(dueDate || "").slice(0, 10);
  const daysFromDue = getDateDiffInDays(dueIso, today.iso);
  let status = "sem_vencimento";

  if (daysFromDue !== null) {
    if (daysFromDue < 0) status = "a_vencer";
    if (daysFromDue === 0) status = "vence_hoje";
    if (daysFromDue === 1) status = "venceu_ontem";
    if (daysFromDue > 1) status = "vencido";
  }

  return {
    timezone: "America/Sao_Paulo",
    data_atual: today.iso,
    data_atual_br: today.label,
    vencimento_iso: dueIso || null,
    dias_desde_vencimento: daysFromDue === null ? null : Math.max(0, daysFromDue),
    dias_ate_vencimento: daysFromDue === null ? null : Math.max(0, -daysFromDue),
    status_temporal: status,
  };
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
      wc.contact_lid,
      r.full_name,
      r.unit_label,
      c.name as condominium_name,
      vp.current_status,
      vp.current_days_overdue,
      vp.current_amount_cents,
      vp.due_date,
      vp.fee_due_rule,
      vp.fee_due_day
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
  const computedDueDateIso = getComputedDueDateIso(message);
  const dueDate = formatIsoDateToPtBr(computedDueDateIso);
  const dueDateContext = getDueDateContext(computedDueDateIso);
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
          regra_vencimento_condominio: {
            tipo: message.fee_due_rule || "business_day",
            dia: Number(message.fee_due_day || 5),
          },
          contexto_temporal: dueDateContext,
        },
        historico_recente: history,
        mensagem_recebida: message.body,
        regras: [
          "Para promessa de pagamento, agradeça e peça comprovante quando pagar.",
          "Para pagamento realizado, peça comprovante ou confirmação do setor financeiro.",
          "Para contestação, dúvida sensível ou pedido humano, marque handoff_required como true.",
          "Para dúvida de valor, responda usando apenas valor_atual, vencimento e contexto_temporal informados pelo sistema.",
          "Use data_atual e status_temporal para explicar se o vencimento já passou, vence hoje ou ainda vai vencer.",
          "Se o condômino contestar uma data ou valor, compare com os dados do sistema antes de responder.",
          "Só reconheça erro se os dados do sistema confirmarem erro ou imprecisão anterior; se apenas faltou contexto, esclareça sem pedir desculpas em excesso.",
          "Se houver conflito que os dados do sistema não comprovem, marque handoff_required como true.",
          "Se o histórico recente já contém uma saudação sua, não cumprimente novamente; responda de forma direta e natural.",
          "Se pedirem boleto, link ou segunda via, não invente link nem diga que enviou; explique que vai encaminhar para o responsável ou oriente contato humano.",
          "Evite repetir literalmente a resposta anterior quando o histórico já contém a mesma informação.",
          "Não diga que baixou cobrança, removeu multa ou confirmou pagamento.",
        ],
      }),
    },
  ];
}

function getAutoReplyBlockReason(config, message, result) {
  if (!config.autoReplyEnabled) return "autoreply_disabled";
  if (!result.shouldReply) return "ai_should_reply_false";
  if (result.handoffRequired) return "handoff_required";
  if (!result.suggestedReply) return "missing_suggested_reply";
  if (result.confidence < config.autoReplyMinConfidence) return "low_confidence";
  if (AUTOREPLY_BLOCKED_INTENTS.has(result.intent)) return "blocked_intent";
  if (!message.contact_phone && !message.contact_lid) return "missing_contact_identifier";

  return null;
}

async function sendAutoReply(sql, message, result) {
  const recipient = normalizeWhatsAppRecipient(message.contact_phone || message.contact_lid);
  const delivery = await sendWhatsAppText({
    to: recipient,
    message: result.suggestedReply,
  });
  const sentAt = new Date();
  const inserted = await sql`
    insert into whatsapp_conversation_messages (
      conversation_id,
      resident_id,
      condominium_id,
      direction,
      origin,
      body,
      external_message_id,
      external_event,
      sender_phone,
      sender_lid,
      sender_name,
      sent_at
    )
    values (
      ${message.conversation_id},
      ${message.resident_id},
      ${message.condominium_id},
      'outbound'::conversation_message_direction,
      'ai'::conversation_message_origin,
      ${result.suggestedReply},
      ${delivery.externalMessageId},
      'ai_autoreply',
      ${message.contact_phone},
      ${message.contact_lid},
      ${message.contact_name || message.full_name || null},
      ${sentAt}
    )
    returning id
  `;

  await sql`
    update whatsapp_conversations
    set
      last_message_at = ${sentAt},
      last_outbound_at = ${sentAt},
      ai_handoff_required = false
    where id = ${message.conversation_id}
  `;

  return {
    sent: true,
    messageId: inserted[0]?.id || null,
    status: delivery.status,
    externalMessageId: delivery.externalMessageId,
  };
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
    const autoReplyBlockReason = getAutoReplyBlockReason(config, message, result);
    let autoReply = {
      enabled: config.autoReplyEnabled,
      sent: false,
      reason: autoReplyBlockReason,
    };

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

    if (!autoReplyBlockReason) {
      try {
        autoReply = {
          enabled: true,
          ...(await sendAutoReply(sql, message, result)),
        };

        await sql`
          update whatsapp_conversation_messages
          set ai_should_reply = false
          where id = ${conversationResult.messageId}
        `;
      } catch (error) {
        autoReply = {
          enabled: true,
          sent: false,
          reason: "send_failed",
          error: error.message,
        };
      }
    }

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
      autoReply,
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
