function getOpenRouterHeaders() {
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (process.env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }

  headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "Sistema de Inadimplentes";

  return headers;
}

function parseJsonFromText(text) {
  const raw = String(text || "").trim();
  const withoutFence = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonStart = withoutFence.indexOf("{");
  const jsonEnd = withoutFence.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error("A resposta da IA não veio em JSON.");
  }

  return JSON.parse(withoutFence.slice(jsonStart, jsonEnd + 1));
}

export function getOpenRouterRuntimeConfig() {
  const minConfidence = Number(process.env.OPENROUTER_AI_AUTOREPLY_MIN_CONFIDENCE || 0.75);

  return {
    enabled: process.env.OPENROUTER_AI_ENABLED === "true",
    mode: process.env.OPENROUTER_AI_MODE || "suggest",
    model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
    hasApiKey: Boolean(process.env.OPENROUTER_API_KEY),
    autoReplyEnabled: process.env.OPENROUTER_AI_AUTOREPLY_ENABLED === "true",
    autoReplyMinConfidence: Number.isFinite(minConfidence) ? Math.max(0, Math.min(1, minConfidence)) : 0.75,
  };
}

export async function requestOpenRouterJson({ messages, maxTokens = 220, temperature = 0.2 }) {
  const config = getOpenRouterRuntimeConfig();

  if (!config.hasApiKey) {
    throw Object.assign(new Error("OPENROUTER_API_KEY não está configurada."), { statusCode: 500 });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || "Falha ao chamar OpenRouter.";
    throw Object.assign(new Error(message), { statusCode: response.status, payload });
  }

  const content = payload?.choices?.[0]?.message?.content || "";

  return {
    model: payload?.model || config.model,
    usage: payload?.usage || null,
    data: parseJsonFromText(content),
  };
}
