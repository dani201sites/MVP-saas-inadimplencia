import { getSql, normalizeChannel } from "./_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const residentId = String(body.residentId || "").trim();
    const channel = normalizeChannel(body.channel);
    const message = String(body.message || "").trim();

    if (!residentId || !message) {
      throw Object.assign(new Error("Selecione um condômino e informe a mensagem."), { statusCode: 400 });
    }

    const sql = getSql();
    const inserted = await sql`
      with target_resident as (
        select
          resident_id,
          condominium_id,
          full_name,
          unit_label,
          current_billing_record_id,
          stage
        from v_resident_portfolio
        where resident_id = ${residentId}
      ),
      actor as (
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
        body,
        status,
        queued_at,
        sent_at
      )
      select
        tr.current_billing_record_id,
        tr.resident_id,
        tr.condominium_id,
        sa.id,
        a.id,
        cast(${channel} as channel_type),
        tr.stage,
        ${message},
        'simulated'::message_status,
        now(),
        now()
      from target_resident tr
      left join actor a on true
      left join selected_agent sa on true
      returning id
    `;

    if (!inserted.length) {
      throw Object.assign(new Error("Condômino não encontrado para registrar a cobrança."), { statusCode: 404 });
    }

    sendJson(res, 201, { ok: true });
  } catch (error) {
    handleApiError(res, error);
  }
}
