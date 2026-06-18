function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "",
    replyTo: process.env.EMAIL_REPLY_TO || "",
    mode: String(process.env.EMAIL_SEND_MODE || "simulated").toLowerCase(),
  };
}

function requireLiveEmailConfig(config) {
  if (!config.apiKey) {
    throw Object.assign(new Error("A variável RESEND_API_KEY não está configurada."), { statusCode: 500 });
  }

  if (!config.from) {
    throw Object.assign(new Error("A variável EMAIL_FROM não está configurada."), { statusCode: 500 });
  }
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export async function sendEmail({ to, subject, message }) {
  const config = getEmailConfig();

  if (config.mode !== "live") {
    return {
      status: "simulated",
      externalMessageId: null,
    };
  }

  requireLiveEmailConfig(config);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject,
      text: message,
      ...(config.replyTo ? { reply_to: [config.replyTo] } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const resendMessage = payload?.message || payload?.error || "Não foi possível enviar o email pelo Resend.";
    throw Object.assign(new Error(resendMessage), { statusCode: 502 });
  }

  return {
    status: "sent",
    externalMessageId: payload?.id || null,
  };
}
