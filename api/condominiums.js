import { getSql, slugify } from "./_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST", "PUT"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    const district = String(body.district || "").trim();
    const units = Number(body.units);
    const fee = Number(body.fee);
    const feeDueRule = String(body.feeDueRule || "business_day").trim();
    const feeDueDay = Number(body.feeDueDay || 5);

    if (req.method === "PUT" && !id) {
      throw Object.assign(new Error("Informe o condomínio que será atualizado."), { statusCode: 400 });
    }

    const isValidDueRule = ["calendar_day", "business_day"].includes(feeDueRule);
    const isValidDueDay = Number.isInteger(feeDueDay)
      && feeDueDay >= 1
      && feeDueDay <= (feeDueRule === "business_day" ? 22 : 31);

    if (!name || !district || !Number.isFinite(units) || units < 1 || !Number.isFinite(fee) || fee < 1 || !isValidDueRule || !isValidDueDay) {
      throw Object.assign(new Error("Preencha os dados do condomínio corretamente."), { statusCode: 400 });
    }

    const sql = getSql();
    let row;

    if (req.method === "PUT") {
      const rows = await sql`
        update condominiums
        set
          name = ${name},
          slug = ${slugify(name)},
          district = ${district},
          units_count = ${Math.round(units)},
          average_fee_cents = ${Math.round(fee * 100)},
          fee_due_rule = ${feeDueRule},
          fee_due_day = ${feeDueDay},
          updated_at = now()
        where id = ${id}
        returning id, name, district, units_count, average_fee_cents, fee_due_rule, fee_due_day
      `;

      if (!rows.length) {
        throw Object.assign(new Error("Condomínio não encontrado para atualização."), { statusCode: 404 });
      }

      row = rows[0];
    } else {
      [row] = await sql`
        insert into condominiums (name, slug, district, units_count, average_fee_cents, fee_due_rule, fee_due_day)
        values (${name}, ${slugify(name)}, ${district}, ${Math.round(units)}, ${Math.round(fee * 100)}, ${feeDueRule}, ${feeDueDay})
        returning id, name, district, units_count, average_fee_cents, fee_due_rule, fee_due_day
      `;
    }

    sendJson(res, req.method === "PUT" ? 200 : 201, {
      condominium: {
        id: row.id,
        name: row.name,
        district: row.district,
        units: Number(row.units_count),
        feeCents: Number(row.average_fee_cents),
        feeDueRule: row.fee_due_rule,
        feeDueDay: Number(row.fee_due_day),
      },
    });
  } catch (error) {
    if (error?.code === "23505") {
      error.statusCode = 409;
      error.message = "Já existe um condomínio com esse nome.";
    }

    handleApiError(res, error);
  }
}
