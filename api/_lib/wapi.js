function getWapiConfig() {
  return {
    baseUrl: process.env.WAPI_API_BASE || "https://api.w-api.app/v1",
    instanceId: process.env.WAPI_INSTANCE_ID || "",
    token: process.env.WAPI_TOKEN || "",
    mode: String(process.env.WAPI_SEND_MODE || "simulated").toLowerCase(),
    delaySeconds: Number(process.env.WAPI_DEFAULT_DELAY_SECONDS || 5),
  };
}

function requireLiveWapiConfig(config) {
  if (!config.instanceId) {
    throw Object.assign(new Error("A variável WAPI_INSTANCE_ID não está configurada."), { statusCode: 500 });
  }

  if (!config.token) {
    throw Object.assign(new Error("A variável WAPI_TOKEN não está configurada."), { statusCode: 500 });
  }
}

export function normalizeWhatsAppRecipient(value) {
  const recipient = String(value || "").trim();

  if (recipient.endsWith("@lid") || recipient.endsWith("@g.us")) {
    return recipient;
  }

  return recipient.replace(/\D/g, "");
}

export async function sendWhatsAppText({ to, message }) {
  const config = getWapiConfig();
  const phone = normalizeWhatsAppRecipient(to);

  if (!phone) {
    throw Object.assign(new Error("Informe um telefone de WhatsApp para enviar a cobrança."), { statusCode: 400 });
  }

  if (config.mode !== "live") {
    return {
      status: "simulated",
      externalMessageId: null,
    };
  }

  requireLiveWapiConfig(config);

  const response = await fetch(`${config.baseUrl}/message/send-text?instanceId=${encodeURIComponent(config.instanceId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      message,
      delayMessage: Math.min(Math.max(config.delaySeconds || 5, 1), 15),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.error) {
    const wapiMessage = payload?.message || payload?.error || "Não foi possível enviar a mensagem pelo WhatsApp.";
    throw Object.assign(new Error(wapiMessage), { statusCode: 502 });
  }

  return {
    status: "queued",
    externalMessageId: payload?.messageId || payload?.MessageId || payload?.insertedId || null,
  };
}
