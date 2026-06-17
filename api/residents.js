import { getCollectionStage, getSql, normalizeResidentStatus } from "./_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const name = String(body.name || "").trim();
    const condoId = String(body.condoId || "").trim();
    const unit = String(body.unit || "").trim();
    const amount = Number(body.amount);
    const status = normalizeResidentStatus(body.status);
    const days = status === "overdue" ? Math.max(0, Number(body.days) || 0) : 0;
    const amountCents = Math.round(amount * 100);
    const stage = getCollectionStage(status, days);
    const paidAt = status === "paid" ? new Date().toISOString() : null;

    if (!name || !condoId || !unit || !Number.isFinite(amount) || amount < 1) {
      throw Object.assign(new Error("Preencha os dados do condômino corretamente."), { statusCode: 400 });
    }

    const sql = getSql();
    const [resident] = await sql`
      insert into residents (condominium_id, full_name, unit_label, monthly_fee_cents)
      values (${condoId}, ${name}, ${unit}, ${amountCents})
      returning id, condominium_id, full_name, unit_label, monthly_fee_cents
    `;

    await sql`
      insert into billing_records (
        resident_id,
        condominium_id,
        reference_month,
        due_date,
        amount_cents,
        status,
        days_overdue,
        stage,
        paid_at,
        notes
      )
      values (
        ${resident.id},
        ${resident.condominium_id},
        date_trunc('month', current_date)::date,
        current_date - cast(${days} as integer),
        ${amountCents},
        cast(${status} as billing_status),
        ${days},
        cast(${stage} as collection_stage),
        ${paidAt},
        ${status === "overdue" ? "Registro criado pelo painel do MVP." : "Pagamento marcado como regular no cadastro inicial."}
      )
      on conflict (resident_id, reference_month) do update
      set
        due_date = excluded.due_date,
        amount_cents = excluded.amount_cents,
        status = excluded.status,
        days_overdue = excluded.days_overdue,
        stage = excluded.stage,
        paid_at = excluded.paid_at,
        notes = excluded.notes,
        updated_at = now()
    `;

    sendJson(res, 201, {
      resident: {
        id: resident.id,
        name: resident.full_name,
        condoId: resident.condominium_id,
        unit: resident.unit_label,
        amountCents,
        status,
        days,
      },
    });
  } catch (error) {
    if (error?.code === "23505") {
      error.statusCode = 409;
      error.message = "Já existe um condômino cadastrado nessa unidade.";
    }

    handleApiError(res, error);
  }
}
