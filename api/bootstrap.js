import { getSql } from "./_lib/db.js";
import { allowMethods, handleApiError, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) {
    return;
  }

  try {
    const sql = getSql();

    const [condos, residents, agents, messages, cashflow] = await Promise.all([
      sql`
        select id, name, district, units_count, average_fee_cents
        from condominiums
        order by name
      `,
      sql`
        select
          resident_id as id,
          full_name,
          email,
          condominium_id,
          condominium_name,
          unit_label,
          case
            when current_status = 'overdue' then 'overdue'
            else 'paid'
          end as status,
          current_amount_cents,
          current_days_overdue
        from v_resident_portfolio
        order by full_name
      `,
      sql`
        select
          channel::text as channel,
          status::text as status,
          queue_size,
          tone_label,
          base_template
        from message_agents
        order by channel
      `,
      sql`
        select
          id,
          resident_name,
          channel::text as channel,
          subject,
          status::text as status,
          body,
          coalesce(sent_at, created_at) as sent_at
        from v_message_history
        order by coalesce(sent_at, created_at) desc
        limit 20
      `,
      sql`
        select
          reference_month,
          amount_received_cents,
          amount_pending_cents
        from cashflow_monthly
        where condominium_id is null
        order by reference_month
      `,
    ]);

    sendJson(res, 200, {
      condos: condos.map((row) => ({
        id: row.id,
        name: row.name,
        district: row.district,
        units: Number(row.units_count),
        feeCents: Number(row.average_fee_cents),
      })),
      residents: residents.map((row) => ({
        id: row.id,
        name: row.full_name,
        email: row.email || "",
        condoId: row.condominium_id,
        condoName: row.condominium_name,
        unit: row.unit_label,
        status: row.status,
        amountCents: Number(row.current_amount_cents),
        days: Number(row.current_days_overdue),
      })),
      agents: agents.map((row) => ({
        channel: row.channel,
        status: row.status,
        queue: Number(row.queue_size),
        tone: row.tone_label,
        template: row.base_template,
      })),
      messages: messages.map((row) => ({
        id: row.id,
        resident: row.resident_name,
        channel: row.channel,
        subject: row.subject || "",
        status: row.status,
        text: row.body,
        isTest: String(row.subject || "").toLowerCase().includes("teste"),
        sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at,
      })),
      cashflow: cashflow.map((row) => ({
        referenceMonth: row.reference_month instanceof Date
          ? row.reference_month.toISOString().slice(0, 10)
          : String(row.reference_month).slice(0, 10),
        receivedCents: Number(row.amount_received_cents),
        pendingCents: Number(row.amount_pending_cents),
      })),
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
