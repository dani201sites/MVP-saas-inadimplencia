import { getSql } from "./_lib/db.js";
import { sendEmail, isValidEmail } from "./_lib/email.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

function normalizeInput(body) {
  const residentId = String(body.residentId || "").trim();
  const to = String(body.to || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (!residentId || !to || !subject || !message) {
    throw Object.assign(new Error("Informe condômino, email de destino, assunto e mensagem."), { statusCode: 400 });
  }

  if (!isValidEmail(to)) {
    throw Object.assign(new Error("Informe um email de destino válido."), { statusCode: 400 });
  }

  return { residentId, to, subject, message };
}

async function findResidentContext(sql, residentId) {
  const rows = await sql`
    select
      resident_id,
      condominium_id,
      current_billing_record_id,
      stage
    from v_resident_portfolio
    where resident_id = ${residentId}
    limit 1
  `;

  if (!rows.length) {
    throw Object.assign(new Error("Condômino não encontrado para enviar o email teste."), { statusCode: 404 });
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
    throw Object.assign(new Error("Não foi possível registrar o email teste no histórico."), { statusCode: 500 });
  }

  return inserted[0];
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const input = normalizeInput(await readJsonBody(req));
    const sql = getSql();
    const resident = await findResidentContext(sql, input.residentId);
    const delivery = await sendEmail({
      to: input.to,
      subject: input.subject,
      message: input.message,
    });

    const log = await insertMessageLog(sql, resident, {
      subject: input.subject,
      message: input.message,
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
