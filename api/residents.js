import { getCollectionStage, getSql, normalizeResidentStatus } from "./_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST", "PUT"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim() || null;
    const phone = String(body.phone || "").trim() || null;
    const condoId = String(body.condoId || "").trim();
    const unit = String(body.unit || "").trim();
    const amount = Number(body.amount);
    const status = normalizeResidentStatus(body.status);
    const days = status === "overdue" ? Math.max(0, Number(body.days) || 0) : 0;
    const amountCents = Math.round(amount * 100);
    const stage = getCollectionStage(status, days);
    const paidAt = status === "paid" ? new Date().toISOString() : null;

    if (req.method === "PUT" && !id) {
      throw Object.assign(new Error("Informe o condômino que será atualizado."), { statusCode: 400 });
    }

    if (!name || !condoId || !unit || !Number.isFinite(amount) || amount < 1) {
      throw Object.assign(new Error("Preencha os dados do condômino corretamente."), { statusCode: 400 });
    }

    const sql = getSql();
    let resident;

    if (req.method === "PUT") {
      const rows = await sql`
        update residents
        set
          condominium_id = ${condoId},
          full_name = ${name},
          unit_label = ${unit},
          phone = ${phone},
          email = ${email},
          monthly_fee_cents = ${amountCents},
          updated_at = now()
        where id = ${id}
        returning id, condominium_id, full_name, unit_label, phone, email, monthly_fee_cents
      `;

      if (!rows.length) {
        throw Object.assign(new Error("Condômino não encontrado para atualização."), { statusCode: 404 });
      }

      resident = rows[0];
    } else {
      [resident] = await sql`
        insert into residents (condominium_id, full_name, unit_label, phone, email, monthly_fee_cents)
        values (${condoId}, ${name}, ${unit}, ${phone}, ${email}, ${amountCents})
        returning id, condominium_id, full_name, unit_label, phone, email, monthly_fee_cents
      `;
    }

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
        ${status === "overdue" ? "Registro atualizado pelo painel do MVP." : "Pagamento marcado como regular no cadastro."}
      )
      on conflict (resident_id, reference_month) do update
      set
        condominium_id = excluded.condominium_id,
        due_date = excluded.due_date,
        amount_cents = excluded.amount_cents,
        status = excluded.status,
        days_overdue = excluded.days_overdue,
        stage = excluded.stage,
        paid_at = excluded.paid_at,
        notes = excluded.notes,
        updated_at = now()
    `;

    sendJson(res, req.method === "PUT" ? 200 : 201, {
      resident: {
        id: resident.id,
        name: resident.full_name,
        condoId: resident.condominium_id,
        unit: resident.unit_label,
        email: resident.email || "",
        phone: resident.phone || "",
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
