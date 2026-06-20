import { getSql, normalizeChannel } from "./_lib/db.js";
import { sendEmail } from "./_lib/email.js";
import { saveOutboundWhatsAppMessage } from "./_lib/whatsapp-conversations.js";
import { normalizeWhatsAppRecipient, sendWhatsAppText } from "./_lib/wapi.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

async function findResidentContext(sql, residentId) {
  const rows = await sql`
    select
      resident_id,
      condominium_id,
      full_name,
      unit_label,
      email,
      phone,
      current_billing_record_id,
      stage
    from v_resident_portfolio
    where resident_id = ${residentId}
    limit 1
  `;

  if (!rows.length) {
    throw Object.assign(new Error("Condômino não encontrado para enviar a cobrança."), { statusCode: 404 });
  }

  return rows[0];
}

async function insertMessageLog(sql, resident, { channel, subject, message, recipient, status, externalMessageId }) {
  let inserted;

  try {
    inserted = await sql`
      with actor as (
        select id
        from app_users
        where email = 'admin@condoagent.com'
        order by created_at asc
        limit 1
      ),
      selected_agent as (
        select id
        from message_agents
        where channel = cast(${channel} as channel_type)
        limit 1
      )
      insert into message_logs (
        billing_record_id,
        resident_id,
        condominium_id,
        agent_id,
        created_by_user_id,
        channel,
        stage,
        subject,
        recipient,
        body,
        status,
        queued_at,
        sent_at,
        external_message_id
      )
      select
        ${resident.current_billing_record_id},
        ${resident.resident_id},
        ${resident.condominium_id},
        sa.id,
        a.id,
        cast(${channel} as channel_type),
        ${resident.stage},
        ${subject},
        ${recipient},
        ${message},
        cast(${status} as message_status),
        now(),
        now(),
        ${externalMessageId}
      from actor a
      full join selected_agent sa on true
      returning id
    `;
  } catch (error) {
    if (error?.code !== "42703") {
      throw error;
    }

    inserted = await sql`
      with actor as (
        select id
        from app_users
        where email = 'admin@condoagent.com'
        order by created_at asc
        limit 1
      ),
      selected_agent as (
        select id
        from message_agents
        where channel = cast(${channel} as channel_type)
        limit 1
      )
      insert into message_logs (
        billing_record_id,
        resident_id,
        condominium_id,
        agent_id,
        created_by_user_id,
        channel,
        stage,
        subject,
        body,
        status,
        queued_at,
        sent_at,
        external_message_id
      )
      select
        ${resident.current_billing_record_id},
        ${resident.resident_id},
        ${resident.condominium_id},
        sa.id,
        a.id,
        cast(${channel} as channel_type),
        ${resident.stage},
        ${subject},
        ${message},
        cast(${status} as message_status),
        now(),
        now(),
        ${externalMessageId}
      from actor a
      full join selected_agent sa on true
      returning id
    `;
  }

  if (!inserted.length) {
    throw Object.assign(new Error("Não foi possível registrar a cobrança no histórico."), { statusCode: 500 });
  }

  return inserted[0];
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const residentId = String(body.residentId || "").trim();
    const channel = normalizeChannel(body.channel);
    const emailTo = String(body.emailTo || "").trim();
    const message = String(body.message || "").trim();

    if (channel === "sms") {
      throw Object.assign(new Error("SMS ainda não está disponível. Use e-mail ou WhatsApp por enquanto."), { statusCode: 400 });
    }

    if (!residentId || !message) {
      throw Object.assign(new Error("Selecione um condômino e informe a mensagem."), { statusCode: 400 });
    }

    const sql = getSql();
    const resident = await findResidentContext(sql, residentId);
    const subject = `Cobrança da unidade ${resident.unit_label}`;
    const recipient = channel === "email" ? emailTo || resident.email : normalizeWhatsAppRecipient(resident.phone);
    let delivery;

    try {
      if (channel === "email") {
        if (!recipient) {
          throw Object.assign(new Error("Informe um e-mail de destino para enviar a cobrança."), { statusCode: 400 });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
          throw Object.assign(new Error("Informe um e-mail de destino válido."), { statusCode: 400 });
        }

        delivery = await sendEmail({
          to: recipient,
          subject,
          message,
        });
      } else {
        delivery = await sendWhatsAppText({
          to: recipient,
          message,
        });
      }
    } catch (error) {
      await insertMessageLog(sql, resident, {
        channel,
        subject,
        message,
        recipient,
        status: "failed",
        externalMessageId: null,
      });

      throw error;
    }

    const log = await insertMessageLog(sql, resident, {
      channel,
      subject,
      message,
      recipient,
      status: delivery.status,
      externalMessageId: delivery.externalMessageId,
    });
    let conversation = null;

    if (channel === "whatsapp") {
      conversation = await saveOutboundWhatsAppMessage(sql, resident, {
        messageLogId: log.id,
        message,
        recipient,
        externalMessageId: delivery.externalMessageId,
      });
    }

    sendJson(res, 201, {
      ok: true,
      id: log.id,
      status: delivery.status,
      externalMessageId: delivery.externalMessageId,
      conversation,
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
