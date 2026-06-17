import { getSql, normalizeChannel } from "./_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await readJsonBody(req);
    const channel = normalizeChannel(body.channel);
    const toneLabel = String(body.toneLabel || "").trim();
    const baseTemplate = String(body.baseTemplate || "").trim();

    if (!toneLabel || !baseTemplate) {
      throw Object.assign(new Error("Preencha o tom e a mensagem base do agente."), { statusCode: 400 });
    }

    const sql = getSql();
    const updated = await sql`
      update message_agents
      set
        tone_label = ${toneLabel},
        base_template = ${baseTemplate},
        updated_at = now()
      where channel = cast(${channel} as channel_type)
      returning id
    `;

    if (!updated.length) {
      throw Object.assign(new Error("Agente não encontrado."), { statusCode: 404 });
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    handleApiError(res, error);
  }
}
