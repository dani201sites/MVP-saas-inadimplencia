import { neon } from "@neondatabase/serverless";

let sqlClient;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("A variável DATABASE_URL não está configurada.");
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeChannel(value) {
  const channel = String(value || "").trim().toLowerCase();

  if (!["whatsapp", "email", "sms"].includes(channel)) {
    throw new Error("Canal inválido.");
  }

  return channel;
}

export function normalizeResidentStatus(value) {
  return value === "overdue" ? "overdue" : "paid";
}

export function getCollectionStage(status, daysOverdue) {
  if (status !== "overdue") {
    return null;
  }

  if (daysOverdue >= 30) {
    return "pre_legal";
  }

  if (daysOverdue >= 15) {
    return "overdue_moderate";
  }

  return "overdue_light";
}
