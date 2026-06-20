import { getSql } from "./_lib/db.js";
import { normalizeWhatsAppRecipient, sendWhatsAppText } from "./_lib/wapi.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

function mapConversationMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    residentName: row.resident_name || row.contact_name || "Contato sem vínculo",
    contactName: row.contact_name || "",
    contactPhone: row.contact_phone || "",
    contactLid: row.contact_lid || "",
    unit: row.unit_label || "",
    condominiumName: row.condominium_name || "",
    body: row.body,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at,
    aiIntent: row.ai_intent || "",
    aiConfidence: row.ai_confidence === null ? null : Number(row.ai_confidence),
    aiShouldReply: Boolean(row.ai_should_reply),
    aiHandoffRequired: Boolean(row.ai_handoff_required),
    aiSuggestedReply: row.ai_suggested_reply || "",
    aiProcessedAt: row.ai_processed_at instanceof Date ? row.ai_processed_at.toISOString() : row.ai_processed_at,
    aiModel: row.ai_model || "",
    conversationStatus: row.conversation_status || "open",
  };
}

async function listConversations(sql) {
  const rows = await sql`
    select
      wcm.id,
      wcm.conversation_id,
      wcm.body,
      wcm.received_at,
      wcm.ai_intent,
      wcm.ai_confidence,
      wcm.ai_should_reply,
      wcm.ai_handoff_required,
      wcm.ai_suggested_reply,
      wcm.ai_processed_at,
      wcm.ai_model,
      wc.contact_name,
      wc.contact_phone,
      wc.contact_lid,
      wc.status::text as conversation_status,
      r.full_name as resident_name,
      r.unit_label,
      c.name as condominium_name
    from whatsapp_conversation_messages wcm
    join whatsapp_conversations wc on wc.id = wcm.conversation_id
    left join residents r on r.id = wcm.resident_id
    left join condominiums c on c.id = wcm.condominium_id
    where wcm.direction = 'inbound'::conversation_message_direction
    order by coalesce(wcm.received_at, wcm.created_at) desc
    limit 30
  `;

  return rows.map(mapConversationMessage);
}

async function sendApprovedReply(sql, { messageId, message }) {
  const rows = await sql`
    select
      wcm.id,
      wcm.conversation_id,
      wcm.resident_id,
      wcm.condominium_id,
      wcm.ai_suggested_reply,
      wc.contact_phone,
      wc.contact_lid,
      wc.contact_name
    from whatsapp_conversation_messages wcm
    join whatsapp_conversations wc on wc.id = wcm.conversation_id
    where wcm.id = ${messageId}
    limit 1
  `;
  const source = rows[0];

  if (!source) {
    throw Object.assign(new Error("Mensagem de origem não encontrada."), { statusCode: 404 });
  }

  const reply = String(message || source.ai_suggested_reply || "").trim();

  if (!reply) {
    throw Object.assign(new Error("A sugestão da IA está vazia."), { statusCode: 400 });
  }

  const recipient = source.contact_phone || source.contact_lid;

  if (!recipient) {
    throw Object.assign(new Error("Conversa sem telefone ou LID para responder no WhatsApp."), { statusCode: 400 });
  }

  const normalizedRecipient = normalizeWhatsAppRecipient(recipient);
  const delivery = await sendWhatsAppText({
    to: normalizedRecipient,
    message: reply,
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
      ${source.conversation_id},
      ${source.resident_id},
      ${source.condominium_id},
      'outbound'::conversation_message_direction,
      'operator'::conversation_message_origin,
      ${reply},
      ${delivery.externalMessageId},
      'ai_suggestion_approved',
      ${source.contact_phone},
      ${source.contact_lid},
      ${source.contact_name},
      ${sentAt}
    )
    returning id
  `;

  await sql`
    update whatsapp_conversation_messages
    set ai_should_reply = false
    where id = ${source.id}
  `;

  await sql`
    update whatsapp_conversations
    set
      last_message_at = ${sentAt},
      last_outbound_at = ${sentAt},
      ai_handoff_required = false
    where id = ${source.conversation_id}
  `;

  return {
    id: inserted[0]?.id || null,
    status: delivery.status,
    externalMessageId: delivery.externalMessageId,
  };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "POST"])) {
    return;
  }

  try {
    const sql = getSql();

    if (req.method === "GET") {
      sendJson(res, 200, { conversations: await listConversations(sql) });
      return;
    }

    const body = await readJsonBody(req);

    if (body.action !== "send_reply") {
      throw Object.assign(new Error("Ação inválida para conversas do WhatsApp."), { statusCode: 400 });
    }

    const result = await sendApprovedReply(sql, {
      messageId: String(body.messageId || "").trim(),
      message: String(body.message || "").trim(),
    });

    sendJson(res, 201, { ok: true, result });
  } catch (error) {
    handleApiError(res, error);
  }
}
