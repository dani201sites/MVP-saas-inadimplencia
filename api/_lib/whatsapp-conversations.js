import { normalizeWhatsAppRecipient } from "./wapi.js";

function getNestedText(payload) {
  const content = payload.msgContent || payload.message || {};

  if (typeof content.conversation === "string") {
    return content.conversation;
  }

  if (typeof content.extendedTextMessage?.text === "string") {
    return content.extendedTextMessage.text;
  }

  if (typeof content.imageMessage?.caption === "string") {
    return content.imageMessage.caption;
  }

  if (typeof content.videoMessage?.caption === "string") {
    return content.videoMessage.caption;
  }

  if (typeof content.documentMessage?.caption === "string") {
    return content.documentMessage.caption;
  }

  return "";
}

function getPayloadDate(payload) {
  const moment = Number(payload.moment || payload.timestamp || 0);

  if (!moment) {
    return new Date();
  }

  return new Date(moment > 9999999999 ? moment : moment * 1000);
}

function getContactIdentifiers(payload) {
  const sender = payload.sender || {};
  const chat = payload.chat || {};
  const senderId = String(sender.id || chat.id || "").trim();
  const senderLid = String(sender.senderLid || "").trim();
  const contactPhone = senderId && !senderId.endsWith("@lid") && !senderId.endsWith("@g.us")
    ? normalizeWhatsAppRecipient(senderId)
    : "";
  const contactLid = senderLid || (senderId.endsWith("@lid") ? senderId : "");

  return {
    contactPhone: contactPhone || null,
    contactLid: contactLid || null,
    contactName: sender.pushName || sender.verifiedBizName || null,
  };
}

async function findResidentByPhone(sql, contactPhone) {
  if (!contactPhone) {
    return null;
  }

  const rows = await sql`
    select id, condominium_id, full_name
    from residents
    where regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ${contactPhone}
    limit 1
  `;

  return rows[0] || null;
}

async function findConversation(sql, { contactPhone, contactLid }) {
  const rows = await sql`
    select id
    from whatsapp_conversations
    where (${contactPhone}::text is not null and contact_phone = ${contactPhone})
       or (${contactLid}::text is not null and contact_lid = ${contactLid})
    limit 1
  `;

  return rows[0] || null;
}

async function createConversation(sql, { contactPhone, contactLid, contactName, resident }) {
  const inserted = await sql`
    insert into whatsapp_conversations (
      resident_id,
      condominium_id,
      contact_phone,
      contact_lid,
      contact_name,
      last_message_at
    )
    values (
      ${resident?.id || null},
      ${resident?.condominium_id || null},
      ${contactPhone},
      ${contactLid},
      ${contactName},
      now()
    )
    returning id
  `;

  return inserted[0];
}

async function findOrCreateConversation(sql, contact, fallbackResident = null) {
  const resident = await findResidentByPhone(sql, contact.contactPhone) || fallbackResident;
  const existing = await findConversation(sql, contact);

  if (existing) {
    const updated = await sql`
      update whatsapp_conversations
      set
        resident_id = coalesce(resident_id, ${resident?.id || null}),
        condominium_id = coalesce(condominium_id, ${resident?.condominium_id || null}),
        contact_phone = coalesce(contact_phone, ${contact.contactPhone}),
        contact_lid = coalesce(contact_lid, ${contact.contactLid}),
        contact_name = coalesce(${contact.contactName}, contact_name),
        last_message_at = now()
      where id = ${existing.id}
      returning id
    `;

    return { conversation: updated[0], resident };
  }

  try {
    return {
      conversation: await createConversation(sql, { ...contact, resident }),
      resident,
    };
  } catch (error) {
    if (error?.code !== "23505") {
      throw error;
    }

    const conversation = await findConversation(sql, contact);
    return { conversation, resident };
  }
}

export async function saveInboundWhatsAppMessage(sql, payload) {
  if (payload.isGroup || payload.fromMe) {
    return { saved: false, reason: "ignored_non_resident_message" };
  }

  const contact = getContactIdentifiers(payload);

  if (!contact.contactPhone && !contact.contactLid) {
    return { saved: false, reason: "missing_contact_identifier" };
  }

  const { conversation, resident } = await findOrCreateConversation(sql, contact);
  const body = getNestedText(payload) || "[Mensagem recebida sem texto]";
  const receivedAt = getPayloadDate(payload);
  const externalMessageId = payload.messageId || payload.MessageId || payload.key?.id || null;
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
      raw_payload,
      received_at
    )
    values (
      ${conversation.id},
      ${resident?.id || null},
      ${resident?.condominium_id || null},
      'inbound'::conversation_message_direction,
      'resident'::conversation_message_origin,
      ${body},
      ${externalMessageId},
      ${payload.event || null},
      ${contact.contactPhone},
      ${contact.contactLid},
      ${contact.contactName},
      ${JSON.stringify(payload)}::jsonb,
      ${receivedAt}
    )
    on conflict (external_message_id) where external_message_id is not null do nothing
    returning id
  `;

  await sql`
    update whatsapp_conversations
    set
      last_message_at = ${receivedAt},
      last_inbound_at = ${receivedAt}
    where id = ${conversation.id}
  `;

  return {
    saved: inserted.length > 0,
    conversationId: conversation.id,
    messageId: inserted[0]?.id || null,
    residentId: resident?.id || null,
    body,
  };
}

export async function saveOutboundWhatsAppMessage(sql, resident, { messageLogId, message, recipient, externalMessageId }) {
  const normalizedRecipient = normalizeWhatsAppRecipient(recipient);
  const contact = normalizedRecipient.endsWith("@lid")
    ? { contactPhone: null, contactLid: normalizedRecipient, contactName: resident.full_name || null }
    : { contactPhone: normalizedRecipient, contactLid: null, contactName: resident.full_name || null };
  const resolvedResident = {
    id: resident.resident_id,
    condominium_id: resident.condominium_id,
  };
  const { conversation } = await findOrCreateConversation(sql, contact, resolvedResident);
  const sentAt = new Date();
  const inserted = await sql`
    insert into whatsapp_conversation_messages (
      conversation_id,
      resident_id,
      condominium_id,
      message_log_id,
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
      ${conversation.id},
      ${resident.resident_id},
      ${resident.condominium_id},
      ${messageLogId},
      'outbound'::conversation_message_direction,
      'operator'::conversation_message_origin,
      ${message},
      ${externalMessageId},
      'manual_charge',
      ${contact.contactPhone},
      ${contact.contactLid},
      ${resident.full_name || null},
      ${sentAt}
    )
    on conflict (external_message_id) where external_message_id is not null do nothing
    returning id
  `;

  await sql`
    update whatsapp_conversations
    set
      last_message_at = ${sentAt},
      last_outbound_at = ${sentAt}
    where id = ${conversation.id}
  `;

  return {
    saved: inserted.length > 0,
    conversationId: conversation.id,
    messageId: inserted[0]?.id || null,
  };
}
