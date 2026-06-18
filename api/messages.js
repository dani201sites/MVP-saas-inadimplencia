import { getSql, normalizeChannel } from "./_lib/db.js";
import { sendEmail } from "./_lib/email.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

async function findResidentContext(sql, residentId) {
  const rows = await sql`
    select
      resident_id,
      condominium_id,
      full_name,
      unit_label,
      email,
      current_billing_record_id,
      stage
    from v_resident_portfolio
    where resident_id = ${residentId}
    limit 1
  `;

  if (!rows.length) {
    throw Object.assign(new Error("Condômino não encontrado para enviar a cobrança."), { statusCode: 404 });
  }

  if (!rows[0].email) {
    throw Object.assign(new Error("Este condômino não possui e-mail cadastrado."), { statusCode: 400 });
  }

  return rows[0];
}

async function insertMessageLog(sql, resident, { subject, message, status, externalMessageId }) {
  const inserted = await sql`
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
      where channel = 'email'::channel_type
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
      'email'::channel_type,
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
    const message = String(body.message || "").trim();

    if (channel !== "email") {
      throw Object.assign(new Error("Este canal ainda não está disponível. Use e-mail por enquanto."), { statusCode: 400 });
    }

    if (!residentId || !message) {
      throw Object.assign(new Error("Selecione um condômino e informe a mensagem."), { statusCode: 400 });
    }

    const sql = getSql();
    const resident = await findResidentContext(sql, residentId);
    const subject = `Cobrança da unidade ${resident.unit_label}`;
    let delivery;

    try {
      delivery = await sendEmail({
        to: resident.email,
        subject,
        message,
      });
    } catch (error) {
      await insertMessageLog(sql, resident, {
        subject,
        message,
        status: "failed",
        externalMessageId: null,
      });

      throw error;
    }

    const log = await insertMessageLog(sql, resident, {
      subject,
      message,
      status: delivery.status,
      externalMessageId: delivery.externalMessageId,
    });

    sendJson(res, 201, {
      ok: true,
      id: log.id,
      status: delivery.status,
      externalMessageId: delivery.externalMessageId,
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
