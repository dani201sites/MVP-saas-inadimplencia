import { getSql } from "./_lib/db.js";
import { allowMethods, handleApiError, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) {
    return;
  }

  try {
    const sql = getSql();

    const [condos, residents, agents, cashflow] = await Promise.all([
      sql`
        select id, name, district, units_count, average_fee_cents, fee_due_rule, fee_due_day
        from condominiums
        order by name
      `,
      sql`
        select
          resident_id as id,
          full_name,
          email,
          phone,
          condominium_id,
          condominium_name,
          unit_label,
          fee_due_rule,
          fee_due_day,
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
          reference_month,
          amount_received_cents,
          amount_pending_cents
        from cashflow_monthly
        where condominium_id is null
        order by reference_month
      `,
    ]);
    let messages;

    try {
      messages = await sql`
        select
          ml.id,
          r.full_name as resident_name,
          ml.condominium_id,
          ml.channel::text as channel,
          ml.subject,
          coalesce(ml.recipient, r.email::text, '') as recipient,
          ml.status::text as status,
          ml.body,
          coalesce(ml.sent_at, ml.created_at) as sent_at
        from message_logs ml
        join residents r on r.id = ml.resident_id
        order by coalesce(ml.sent_at, ml.created_at) desc
        limit 100
      `;
    } catch (error) {
      if (error?.code !== "42703") {
        throw error;
      }

      messages = await sql`
        select
          ml.id,
          r.full_name as resident_name,
          ml.condominium_id,
          ml.channel::text as channel,
          ml.subject,
          '' as recipient,
          ml.status::text as status,
          ml.body,
          coalesce(ml.sent_at, ml.created_at) as sent_at
        from message_logs ml
        join residents r on r.id = ml.resident_id
        order by coalesce(ml.sent_at, ml.created_at) desc
        limit 100
      `;
    }

    sendJson(res, 200, {
      condos: condos.map((row) => ({
        id: row.id,
        name: row.name,
        district: row.district,
        units: Number(row.units_count),
        feeCents: Number(row.average_fee_cents),
        feeDueRule: row.fee_due_rule || "business_day",
        feeDueDay: Number(row.fee_due_day || 5),
      })),
      residents: residents.map((row) => ({
        id: row.id,
        name: row.full_name,
        email: row.email || "",
        phone: row.phone || "",
        condoId: row.condominium_id,
        condoName: row.condominium_name,
        unit: row.unit_label,
        feeDueRule: row.fee_due_rule || "business_day",
        feeDueDay: Number(row.fee_due_day || 5),
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
        condoId: row.condominium_id,
        channel: row.channel,
        subject: row.subject || "",
        recipient: row.recipient || "",
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
