import { getSql } from "../_lib/db.js";
import { allowMethods, handleApiError, readJsonBody, sendJson } from "../_lib/http.js";

function getQueryValue(req, key) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "", `https://${host}`);
  return url.searchParams.get(key);
}

function assertWebhookSecret(req) {
  const expectedSecret = process.env.WAPI_WEBHOOK_SECRET;

  if (!expectedSecret) {
    throw Object.assign(new Error("WAPI_WEBHOOK_SECRET não está configurado."), { statusCode: 500 });
  }

  if (getQueryValue(req, "secret") !== expectedSecret) {
    throw Object.assign(new Error("Webhook não autorizado."), { statusCode: 401 });
  }
}

function extractMessageId(payload) {
  return payload.messageId || payload.MessageId || payload.key?.id || payload.message?.id || null;
}

function normalizeWapiStatus(payload) {
  const rawStatus = String(payload.status || payload.ack || payload.messageStatus || "").toLowerCase();

  if (["error", "failed", "failure"].includes(rawStatus)) {
    return "failed";
  }

  if (["sent", "received", "read", "delivered", "server_ack", "device_ack", "read_ack"].includes(rawStatus)) {
    return "sent";
  }

  if (payload.event === "webhookDelivery" || payload.event === "webhookMessageStatus") {
    return "sent";
  }

  return null;
}

async function updateMessageStatus(sql, payload) {
  const externalMessageId = extractMessageId(payload);
  const status = normalizeWapiStatus(payload);

  if (!externalMessageId || !status) {
    return { matched: 0, externalMessageId, status };
  }

  const updated = await sql`
    update message_logs
    set
      status = cast(${status} as message_status),
      sent_at = coalesce(sent_at, now())
    where external_message_id = ${externalMessageId}
    returning id
  `;

  return { matched: updated.length, externalMessageId, status };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    assertWebhookSecret(req);

    const payload = await readJsonBody(req);
    const sql = getSql();
    const event = String(payload.event || "unknown");
    let result = { matched: 0, externalMessageId: null, status: null };

    if (["webhookDelivery", "webhookMessageStatus"].includes(event)) {
      result = await updateMessageStatus(sql, payload);
    }

    sendJson(res, 200, {
      ok: true,
      event,
      handled: result.matched > 0,
      externalMessageId: result.externalMessageId,
      status: result.status,
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
