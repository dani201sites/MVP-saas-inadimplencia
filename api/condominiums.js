import { getSql, slugify } from "./_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const name = String(body.name || "").trim();
    const district = String(body.district || "").trim();
    const units = Number(body.units);
    const fee = Number(body.fee);

    if (!name || !district || !Number.isFinite(units) || units < 1 || !Number.isFinite(fee) || fee < 1) {
      throw Object.assign(new Error("Preencha os dados do condomínio corretamente."), { statusCode: 400 });
    }

    const sql = getSql();
    const [row] = await sql`
      insert into condominiums (name, slug, district, units_count, average_fee_cents)
      values (${name}, ${slugify(name)}, ${district}, ${Math.round(units)}, ${Math.round(fee * 100)})
      returning id, name, district, units_count, average_fee_cents
    `;

    sendJson(res, 201, {
      condominium: {
        id: row.id,
        name: row.name,
        district: row.district,
        units: Number(row.units_count),
        feeCents: Number(row.average_fee_cents),
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
