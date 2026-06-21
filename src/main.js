import "./styles.css";

const state = {
  selectedCondo: "all",
  selectedResidentStatus: "all",
  selectedAgentChannel: "whatsapp",
  condos: [],
  residents: [],
  agents: [],
  messages: [],
  aiConversations: [],
  billingCalendar: [],
  cashflow: [],
  hasLoaded: false,
  editingCondoId: null,
  editingResidentId: null,
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

const views = {
  dashboard: "Dashboard",
  agents: "Agentes",
  charges: "Cobranças",
  whatsappAi: "IA WhatsApp",
  condos: "Condomínios",
  residents: "Condôminos",
  cashflow: "Fluxo de caixa",
  settings: "Configurações",
};

const defaultBillingCalendar = [
  { offset: -5, label: "Lembrete", channel: "email" },
  { offset: -3, label: "Lembrete", channel: "whatsapp" },
  { offset: 0, label: "Cobrança/aviso no vencimento", channel: "whatsapp" },
  { offset: 1, label: "FollowUp pós vencimento", channel: "email" },
  { offset: 3, label: "FollowUp pós vencimento", channel: "whatsapp" },
  { offset: 5, label: "Cobrança reforçada", channel: "email" },
  { offset: 7, label: "Cobrança reforçada", channel: "whatsapp" },
  { offset: 10, label: "Cobrança Firme", channel: "email" },
  { offset: 14, label: "Cobrança Firme", channel: "whatsapp" },
  { offset: 18, label: "Última tentativa amigável", channel: "email" },
  { offset: 21, label: "Última tentativa amigável", channel: "whatsapp" },
  { offset: 26, label: "Aviso pré-jurídico", channel: "email" },
  { offset: 30, label: "Aviso Extrajudicial", channel: "whatsapp" },
];

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fromCents(value) {
  return Number(value || 0) / 100;
}

function getCondoName(condoId) {
  return state.condos.find((condo) => condo.id === condoId)?.name || "Sem condomínio";
}

function getResidentById(residentId) {
  return state.residents.find((resident) => resident.id === residentId);
}

function getAgentByChannel(channel) {
  return state.agents.find((agent) => agent.channel === channel);
}

function getFilteredResidents() {
  if (state.selectedCondo === "all") {
    return state.residents;
  }

  return state.residents.filter((resident) => resident.condoId === state.selectedCondo);
}

function nextChannel(days) {
  if (days >= 30) return "E-mail";
  if (days >= 15) return "WhatsApp";
  return "SMS";
}

function getChannelLabel(channel) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "E-mail";
  return "SMS";
}

function getAgentStatusLabel(status) {
  return status === "paused" ? "Pausado" : "Ativo";
}

function getMessageStatusLabel(status) {
  if (status === "sent") return "Enviado";
  if (status === "failed") return "Falhou";
  if (status === "queued") return "Na fila";
  return "Simulado";
}

function getMessageStatusClass(status) {
  if (status === "failed") return "danger";
  if (status === "sent") return "success";
  return "";
}

function formatCalendarOffset(offset) {
  if (offset < 0) return `D - ${Math.abs(offset)}`;
  if (offset > 0) return `D + ${offset}`;
  return "D 0";
}

function saveBillingCalendar() {
  localStorage.setItem("billingCalendar", JSON.stringify(state.billingCalendar));
}

function loadBillingCalendar() {
  try {
    const stored = JSON.parse(localStorage.getItem("billingCalendar") || "null");
    state.billingCalendar = Array.isArray(stored) && stored.length ? stored : defaultBillingCalendar;
  } catch {
    state.billingCalendar = defaultBillingCalendar;
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-compact", theme === "compact");
  localStorage.setItem("theme", theme);
}

function formatTimeline(value) {
  if (!value) return "Agora";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Agora";
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return `Ontem, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return timeFormatter.format(date);
}

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  const normalized = String(value).includes("T") ? String(value) : `${value}T00:00:00`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function setNotice(message = "", type = "info", target = "app") {
  const element = target === "login" ? $("#loginNotice") : $("#appNotice");

  if (!message) {
    element.textContent = "";
    element.className = "app-notice is-hidden";
    return;
  }

  element.textContent = message;
  element.className = `app-notice ${type}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível concluir a operação.");
  }

  return payload;
}

async function loadAppData({ silent = false } = {}) {
  if (!silent) {
    setNotice("Sincronizando dados do Neon...");
  }

  const [data, aiData] = await Promise.all([
    requestJson("/api/bootstrap"),
    requestJson("/api/whatsapp-conversations").catch(() => ({ conversations: [] })),
  ]);
  state.condos = data.condos;
  state.residents = data.residents;
  state.agents = data.agents;
  state.messages = data.messages;
  state.aiConversations = aiData.conversations || [];
  state.cashflow = data.cashflow;
  state.selectedAgentChannel = state.agents.some((agent) => agent.channel === state.selectedAgentChannel)
    ? state.selectedAgentChannel
    : state.agents[0]?.channel || "whatsapp";
  state.hasLoaded = true;

  renderAll();

  if (!silent) {
    setNotice("Dados atualizados com sucesso.", "success");
    window.setTimeout(() => setNotice(""), 2200);
  }
}

function renderFilters() {
  const options = [
    `<option value="all">Todos os condomínios</option>`,
    ...state.condos.map((condo) => `<option value="${escapeHtml(condo.id)}">${escapeHtml(condo.name)}</option>`),
  ].join("");

  $("#condoFilter").innerHTML = options;
  $("#condoFilter").value = state.selectedCondo;

  $("#residentCondo").innerHTML = state.condos
    .map((condo) => `<option value="${escapeHtml(condo.id)}">${escapeHtml(condo.name)}</option>`)
    .join("");

  $("#channelSelect").innerHTML = state.agents
    .map((agent) => `<option value="${escapeHtml(agent.channel)}">${escapeHtml(getChannelLabel(agent.channel))}</option>`)
    .join("");
  $("#channelSelect").value = state.agents.some((agent) => agent.channel === "email") ? "email" : state.agents[0]?.channel || "email";

  $("#agentChannel").innerHTML = state.agents
    .map((agent) => `<option value="${escapeHtml(agent.channel)}">${escapeHtml(getChannelLabel(agent.channel))}</option>`)
    .join("");
  $("#agentChannel").value = state.selectedAgentChannel;
  updateChargeChannelState();
}

function renderMetrics() {
  const residents = getFilteredResidents();
  const paid = residents.filter((resident) => resident.status === "paid");
  const overdue = residents.filter((resident) => resident.status === "overdue");
  const expectedCents = residents.reduce((total, resident) => total + resident.amountCents, 0);
  const overdueTotalCents = overdue.reduce((total, resident) => total + resident.amountCents, 0);
  const paidPercent = residents.length ? Math.round((paid.length / residents.length) * 100) : 0;
  const overduePercent = residents.length ? Math.round((overdue.length / residents.length) * 100) : 0;

  $("#expectedRevenue").textContent = currency.format(fromCents(expectedCents));
  $("#overdueTotal").textContent = currency.format(fromCents(overdueTotalCents));
  $("#overdueCount").textContent = `${overdue.length} condôminos em atraso`;
  $("#paidCount").textContent = paid.length;
  $("#messageCount").textContent = state.messages.length;
  $("#paidPercent").textContent = `${paidPercent}%`;
  $("#overduePercent").textContent = `${overduePercent}%`;
  $("#paidBar").style.width = `${paidPercent}%`;
  $("#overdueBar").style.width = `${overduePercent}%`;
}

function renderChannels() {
  $("#channelList").innerHTML = state.agents
    .map(
      (agent) => `
        <div class="channel-item">
          <div>
            <strong>${escapeHtml(getChannelLabel(agent.channel))}</strong>
            <p>${["email", "whatsapp"].includes(agent.channel) ? `${agent.queue} mensagens na fila` : "Canal ainda não conectado"}</p>
          </div>
          <span class="pill ${agent.channel === "sms" || agent.status === "paused" ? "danger" : ""}">
            ${escapeHtml(agent.channel === "sms" ? "Em breve" : getAgentStatusLabel(agent.status))}
          </span>
        </div>
      `,
    )
    .join("");
}

function renderOverdueTable() {
  const overdue = getFilteredResidents().filter((resident) => resident.status === "overdue");

  if (!overdue.length) {
    $("#overdueTable").innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state table-empty">
            <strong>Nenhum inadimplente neste filtro.</strong>
            <p>Selecione outro condomínio ou acompanhe a base completa na aba Condôminos.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  $("#overdueTable").innerHTML = overdue
    .map(
      (resident) => `
        <tr>
          <td data-label="Condômino">${escapeHtml(resident.name)}</td>
          <td data-label="Condomínio">${escapeHtml(getCondoName(resident.condoId))}</td>
          <td data-label="Unidade">${escapeHtml(resident.unit)}</td>
          <td data-label="Atraso">${resident.days} dias</td>
          <td data-label="Valor">${currency.format(fromCents(resident.amountCents))}</td>
          <td data-label="Próximo canal">${nextChannel(resident.days)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderAgents() {
  $("#agentCards").innerHTML = state.agents
    .map(
      (agent) => `
        <div class="agent-card">
          <div class="agent-card-header">
            <strong>${escapeHtml(getChannelLabel(agent.channel))}</strong>
            <span class="pill ${agent.channel === "sms" || agent.status === "paused" ? "danger" : ""}">
              ${escapeHtml(agent.channel === "sms" ? "Em breve" : getAgentStatusLabel(agent.status))}
            </span>
          </div>
          <p>${agent.channel === "sms" ? "Representado no MVP, mas sem integração ativa nesta etapa." : `${agent.queue} mensagens aguardando envio.`}</p>
          <small>Tom: ${escapeHtml(agent.tone)}</small>
        </div>
      `,
    )
    .join("");
}

function renderAgentConfig() {
  const currentAgent = state.agents.find((agent) => agent.channel === state.selectedAgentChannel) || state.agents[0];
  const toneOptions = Array.from(
    new Set([
      "Educado e objetivo",
      "Amigável e preventivo",
      "Firme e profissional",
      ...state.agents.map((agent) => agent.tone),
    ]),
  );

  $("#agentTone").innerHTML = toneOptions
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");

  if (!currentAgent) {
    $("#agentTone").value = "Educado e objetivo";
    $("#agentTemplate").value = "";
    return;
  }

  $("#agentChannel").value = currentAgent.channel;
  $("#agentTone").value = currentAgent.tone;
  $("#agentTemplate").value = currentAgent.template;
}

function renderResidentSelect() {
  const residents = getFilteredResidents();
  const options = residents
    .map((resident) => `<option value="${resident.id}">${escapeHtml(resident.name)} - ${escapeHtml(resident.unit)}</option>`)
    .join("");

  $("#residentSelect").innerHTML = options;
  updateMessagePreview();
  updateChargeEmailField({ shouldPrefill: true });
  updateChargeChannelState();
}

function updateMessagePreview() {
  const residentId = $("#residentSelect").value;
  const resident = getResidentById(residentId);

  if (!resident) {
    $("#messageInput").value = "";
    return;
  }

  const channel = $("#channelSelect").value;
  const agent = getAgentByChannel(channel) || getAgentByChannel("email");
  const fallbackTemplate = "Olá, {{nome}}. Identificamos uma pendência de {{valor}} referente à unidade {{unidade}} do {{condominio}}. Podemos te ajudar com a regularização?";
  const template = agent?.template || fallbackTemplate;

  $("#messageInput").value = template
    .replaceAll("{{nome}}", resident.name)
    .replaceAll("{{unidade}}", resident.unit)
    .replaceAll("{{condominio}}", getCondoName(resident.condoId))
    .replaceAll("{{valor}}", currency.format(fromCents(resident.amountCents)))
    .replaceAll("{{dias}}", String(resident.days || 0));
  updateChargeEmailField({ shouldPrefill: true });
}

function updateChargeEmailField({ shouldPrefill = false } = {}) {
  const channel = $("#channelSelect").value;
  const isEmail = channel === "email";
  const field = $("#emailRecipientField");
  const input = $("#emailRecipientInput");

  field.classList.toggle("is-hidden", !isEmail);
  input.required = isEmail;

  if (!isEmail) {
    input.value = "";
    return;
  }

  if (shouldPrefill || !input.value.trim()) {
    const resident = getResidentById($("#residentSelect").value);
    input.value = resident?.email || "";
  }
}

function updateChargeChannelState() {
  const channel = $("#channelSelect").value;
  const isEmail = channel === "email";
  const isWhatsApp = channel === "whatsapp";
  const submitButton = $("#chargeForm").querySelector("button[type='submit']");
  const text = $("#channelAvailabilityText");
  const resident = getResidentById($("#residentSelect").value);

  submitButton.disabled = !resident || channel === "sms" || (isWhatsApp && !resident?.phone);
  text.textContent = isEmail
    ? resident
      ? "Canal ativo: envio real por e-mail via Resend."
      : "Nenhum condômino disponível neste filtro."
    : isWhatsApp
      ? resident?.phone
        ? `Canal ativo: envio por WhatsApp para ${resident.phone}.`
        : "Este condômino não possui telefone cadastrado para WhatsApp."
      : `${getChannelLabel(channel)} ainda não está integrado neste MVP. Use e-mail ou WhatsApp por enquanto.`;
  text.classList.toggle("danger", !resident || channel === "sms" || (isWhatsApp && !resident?.phone));
}

function renderMessages() {
  const messages = state.messages.filter((message) => {
    if (state.selectedCondo === "all") {
      return true;
    }

    return message.condoId === state.selectedCondo;
  });

  if (!messages.length) {
    $("#messageHistory").innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma cobrança registrada neste filtro.</strong>
        <p>Envios por e-mail ou WhatsApp deste condomínio aparecerão aqui.</p>
      </div>
    `;
    return;
  }

  $("#messageHistory").innerHTML = messages
    .map(
      (message) => `
        <div class="history-item">
          <div class="history-top">
            <strong>${escapeHtml(message.resident)}</strong>
            <span class="pill ${escapeHtml(getMessageStatusClass(message.status))}">${escapeHtml(getMessageStatusLabel(message.status))}</span>
          </div>
          <div class="history-meta">
            <span>${escapeHtml(getChannelLabel(message.channel))}</span>
            ${message.recipient ? `<span>${escapeHtml(message.recipient)}</span>` : ""}
          </div>
          ${message.subject ? `<small class="history-subject">${escapeHtml(message.subject)}</small>` : ""}
          <p>${escapeHtml(message.text)}</p>
          <small>${escapeHtml(formatTimeline(message.sentAt))}</small>
        </div>
      `,
    )
    .join("");
}

function getAiIntentLabel(intent) {
  const labels = {
    promessa_de_pagamento: "Promessa de pagamento",
    pagamento_realizado: "Pagamento realizado",
    duvida_valor: "Dúvida sobre valor",
    contestacao: "Contestação",
    quer_humano: "Quer atendimento humano",
    saudacao: "Saudação",
    outro: "Outro",
  };

  return labels[intent] || "Sem análise";
}

function renderAiConversations() {
  const container = $("#aiConversationList");

  if (!container) return;

  if (!state.aiConversations.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma conversa recebida ainda.</strong>
        <p>Quando o condômino responder pelo WhatsApp, a análise da IA aparecerá aqui.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.aiConversations
    .map((conversation) => {
      const confidence = conversation.aiConfidence === null ? "" : `${Math.round(conversation.aiConfidence * 100)}%`;
      const contact = conversation.contactPhone || conversation.contactLid || "Contato não identificado";
      const canSend = Boolean(conversation.aiSuggestedReply && conversation.aiShouldReply);

      return `
        <article class="ai-conversation-card">
          <div class="ai-card-top">
            <div>
              <strong>${escapeHtml(conversation.residentName)}</strong>
              <p>${escapeHtml([conversation.condominiumName, conversation.unit].filter(Boolean).join(" - ") || contact)}</p>
            </div>
            <div class="ai-badges">
              <span class="pill ${conversation.aiHandoffRequired ? "danger" : "success"}">${escapeHtml(getAiIntentLabel(conversation.aiIntent))}</span>
              ${confidence ? `<span class="pill">${escapeHtml(confidence)}</span>` : ""}
            </div>
          </div>
          <div class="ai-message-block">
            <small>Mensagem recebida</small>
            <p>${escapeHtml(conversation.body)}</p>
          </div>
          <label>
            Sugestão da IA
            <textarea data-ai-reply="${escapeHtml(conversation.id)}" rows="4" ${canSend ? "" : "disabled"}>${escapeHtml(conversation.aiSuggestedReply || "A IA ainda não sugeriu resposta para esta mensagem.")}</textarea>
          </label>
          <div class="ai-card-footer">
            <small>${escapeHtml(formatTimeline(conversation.receivedAt))} ${conversation.aiModel ? `- ${escapeHtml(conversation.aiModel)}` : ""}</small>
            <button class="ghost-button" type="button" data-ai-send="${escapeHtml(conversation.id)}" ${canSend ? "" : "disabled"}>
              Enviar resposta aprovada
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCondos() {
  $("#condoCards").innerHTML = state.condos
    .map((condo) => {
      const residents = state.residents.filter((resident) => resident.condoId === condo.id);
      const overdue = residents.filter((resident) => resident.status === "overdue");

      return `
        <div class="condo-card">
          <div class="condo-card-header">
            <strong>${escapeHtml(condo.name)}</strong>
            <span class="pill">${condo.units} unidades</span>
          </div>
          <p>${escapeHtml(condo.district)} - taxa média ${currency.format(fromCents(condo.feeCents))}</p>
          <small>${residents.length} condôminos cadastrados, ${overdue.length} em atraso</small>
          <div class="card-actions">
            <button class="ghost-button" type="button" data-condo-view="${escapeHtml(condo.id)}">Ver operação</button>
            <button class="ghost-button" type="button" data-condo-edit="${escapeHtml(condo.id)}">Editar</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderResidents() {
  const residents = getFilteredResidents().filter((resident) => {
    if (state.selectedResidentStatus === "all") {
      return true;
    }

    return resident.status === state.selectedResidentStatus;
  });

  $("#residentStatusFilter").value = state.selectedResidentStatus;

  if (!residents.length) {
    $("#residentTable").innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state table-empty">
            <strong>Nenhum condômino encontrado.</strong>
            <p>Ajuste os filtros ou cadastre um novo condômino.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  $("#residentTable").innerHTML = residents
    .map(
      (resident) => `
        <tr>
          <td data-label="Nome">${escapeHtml(resident.name)}</td>
          <td data-label="Condomínio">${escapeHtml(getCondoName(resident.condoId))}</td>
          <td data-label="Unidade">${escapeHtml(resident.unit)}</td>
          <td data-label="Contato">${escapeHtml(resident.email || resident.phone || "Sem contato")}</td>
          <td data-label="Status"><span class="pill ${resident.status === "overdue" ? "danger" : ""}">${resident.status === "paid" ? "Adimplente" : "Inadimplente"}</span></td>
          <td data-label="Mensalidade">${currency.format(fromCents(resident.amountCents))}</td>
          <td data-label="Ações"><button class="ghost-button table-action" type="button" data-resident-edit="${escapeHtml(resident.id)}">Editar</button></td>
        </tr>
      `,
    )
    .join("");
}

function renderCashflow() {
  const points = state.cashflow.map((item) => ({
    ...item,
    month: monthFormatter.format(parseDate(item.referenceMonth) || new Date()).replace(".", ""),
  }));
  const max = Math.max(1, ...points.map((item) => item.receivedCents + item.pendingCents));
  const current = points.at(-1);

  $("#cashflowChart").innerHTML = points
    .map((item) => {
      const receivedHeight = Math.max(8, ((item.receivedCents || 0) / max) * 100);
      const pendingHeight = Math.max(8, ((item.pendingCents || 0) / max) * 100);

      return `
        <div class="chart-bar">
          <div class="chart-stack">
            <span class="received" style="height: ${receivedHeight}%"></span>
            <span class="pending" style="height: ${pendingHeight}%"></span>
          </div>
          <div class="chart-label">${escapeHtml(item.month)}</div>
        </div>
      `;
    })
    .join("");

  $("#cashReceived").textContent = current ? currency.format(fromCents(current.receivedCents)) : currency.format(0);
  $("#cashPending").textContent = current ? currency.format(fromCents(current.pendingCents)) : currency.format(0);
  $("#cashExpected").textContent = current
    ? currency.format(fromCents(current.receivedCents + current.pendingCents))
    : currency.format(0);
}

function renderBillingCalendar() {
  $("#billingCalendarTable").innerHTML = state.billingCalendar
    .map(
      (rule, index) => `
        <tr>
          <td data-label="Dia">
            <input class="inline-input" data-calendar-field="offset" data-calendar-index="${index}" type="number" value="${rule.offset}" />
            <small>${escapeHtml(formatCalendarOffset(Number(rule.offset)))}</small>
          </td>
          <td data-label="Etapa">
            <input class="inline-input" data-calendar-field="label" data-calendar-index="${index}" type="text" value="${escapeHtml(rule.label)}" />
          </td>
          <td data-label="Canal">
            <select class="inline-input" data-calendar-field="channel" data-calendar-index="${index}">
              <option value="email" ${rule.channel === "email" ? "selected" : ""}>Email</option>
              <option value="whatsapp" ${rule.channel === "whatsapp" ? "selected" : ""}>WhatsApp</option>
            </select>
          </td>
          <td data-label="Ações">
            <button class="ghost-button table-action" type="button" data-calendar-remove="${index}">Remover</button>
          </td>
        </tr>
      `,
    )
    .join("");
}

function resetCondoForm() {
  state.editingCondoId = null;
  $("#condoForm").reset();
  $("#condoUnits").value = 80;
  $("#condoFee").value = 620;
  $("#condoSubmitButton").textContent = "Adicionar condomínio";
  $("#condoCancelEditButton").classList.add("is-hidden");
}

function resetResidentForm() {
  state.editingResidentId = null;
  $("#residentForm").reset();
  $("#residentAmount").value = 620;
  $("#residentDays").value = 0;
  $("#residentEditorTitle").textContent = "Novo condômino";
  $("#residentSubmitButton").textContent = "Adicionar condômino";
  $("#residentCancelEditButton").classList.add("is-hidden");
  $("#residentEditorPanel").classList.add("is-hidden");
}

function openResidentCreateForm() {
  resetResidentForm();
  $("#residentEditorPanel").classList.remove("is-hidden");
  setView("residents");
}

function startCondoEdit(condoId) {
  const condo = state.condos.find((item) => item.id === condoId);

  if (!condo) return;

  state.editingCondoId = condoId;
  $("#condoName").value = condo.name;
  $("#condoDistrict").value = condo.district;
  $("#condoUnits").value = condo.units;
  $("#condoFee").value = fromCents(condo.feeCents);
  $("#condoSubmitButton").textContent = "Salvar condomínio";
  $("#condoCancelEditButton").classList.remove("is-hidden");
  setView("condos");
}

function startResidentEdit(residentId) {
  const resident = getResidentById(residentId);

  if (!resident) return;

  state.editingResidentId = residentId;
  $("#residentEditorPanel").classList.remove("is-hidden");
  $("#residentEditorTitle").textContent = "Editar condômino";
  $("#residentName").value = resident.name;
  $("#residentEmail").value = resident.email || "";
  $("#residentPhone").value = resident.phone || "";
  $("#residentCondo").value = resident.condoId;
  $("#residentUnit").value = resident.unit;
  $("#residentAmount").value = fromCents(resident.amountCents);
  $("#residentStatus").value = resident.status;
  $("#residentDays").value = resident.days || 0;
  $("#residentSubmitButton").textContent = "Salvar condômino";
  $("#residentCancelEditButton").classList.remove("is-hidden");
  setView("residents");
}

function renderAll() {
  renderFilters();
  renderMetrics();
  renderChannels();
  renderOverdueTable();
  renderAgents();
  renderAgentConfig();
  renderResidentSelect();
  renderMessages();
  renderAiConversations();
  renderCondos();
  renderResidents();
  renderCashflow();
  renderBillingCalendar();
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));

  $(`#${viewName}`).classList.add("is-active");
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add("is-active");
  $("#viewTitle").textContent = views[viewName];
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  const previousLabel = button.textContent;

  button.disabled = true;
  button.textContent = "Conectando...";

  try {
    await loadAppData();
    $("#loginScreen").classList.add("is-hidden");
    $("#appScreen").classList.remove("is-hidden");
  } catch (error) {
    setNotice(error.message, "error", "login");
  } finally {
    button.disabled = false;
    button.textContent = previousLabel;
  }
});

$("#logoutButton").addEventListener("click", () => {
  $("#appScreen").classList.add("is-hidden");
  $("#loginScreen").classList.remove("is-hidden");
  setNotice("");
});

document.querySelectorAll("[data-view], [data-view-link]").forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view || button.dataset.viewLink);
  });
});

$("#newResidentButton").addEventListener("click", openResidentCreateForm);

$("#refreshAiConversationsButton").addEventListener("click", async () => {
  try {
    const data = await requestJson("/api/whatsapp-conversations");
    state.aiConversations = data.conversations || [];
    renderAiConversations();
    setNotice("Conversas de WhatsApp atualizadas.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});

$("#aiConversationList").addEventListener("click", async (event) => {
  const sendButton = event.target.closest("[data-ai-send]");

  if (!sendButton) return;

  const messageId = sendButton.dataset.aiSend;
  const textarea = document.querySelector(`[data-ai-reply="${CSS.escape(messageId)}"]`);
  const message = textarea?.value.trim() || "";
  const previousLabel = sendButton.textContent;

  if (!message) {
    setNotice("A resposta aprovada não pode ficar vazia.", "error");
    return;
  }

  sendButton.disabled = true;
  sendButton.textContent = "Enviando...";

  try {
    await requestJson("/api/whatsapp-conversations", {
      method: "POST",
      body: JSON.stringify({
        action: "send_reply",
        messageId,
        message,
      }),
    });
    await loadAppData({ silent: true });
    setNotice("Resposta aprovada enviada pelo WhatsApp.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = previousLabel;
  }
});

$("#condoFilter").addEventListener("change", (event) => {
  state.selectedCondo = event.target.value;
  renderAll();
});

$("#residentStatusFilter").addEventListener("change", (event) => {
  state.selectedResidentStatus = event.target.value;
  renderResidents();
});

$("#agentChannel").addEventListener("change", (event) => {
  state.selectedAgentChannel = event.target.value;
  renderAgentConfig();
});

$("#residentSelect").addEventListener("change", updateMessagePreview);
$("#channelSelect").addEventListener("change", () => {
  updateMessagePreview();
  updateChargeEmailField({ shouldPrefill: true });
  updateChargeChannelState();
});

$("#condoCancelEditButton").addEventListener("click", resetCondoForm);
$("#residentCancelEditButton").addEventListener("click", resetResidentForm);

$("#condoCards").addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-condo-view]");
  const editButton = event.target.closest("[data-condo-edit]");

  if (viewButton) {
    state.selectedCondo = viewButton.dataset.condoView;
    renderAll();
    setView("dashboard");
  }

  if (editButton) {
    startCondoEdit(editButton.dataset.condoEdit);
  }
});

$("#residentTable").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-resident-edit]");

  if (editButton) {
    startResidentEdit(editButton.dataset.residentEdit);
  }
});

$("#addCalendarRuleButton").addEventListener("click", () => {
  state.billingCalendar.push({ offset: 0, label: "Nova etapa", channel: "email" });
  saveBillingCalendar();
  renderBillingCalendar();
});

$("#billingCalendarTable").addEventListener("input", (event) => {
  const field = event.target.dataset.calendarField;
  const index = Number(event.target.dataset.calendarIndex);

  if (!field || Number.isNaN(index) || !state.billingCalendar[index]) return;

  state.billingCalendar[index][field] = field === "offset" ? Number(event.target.value) : event.target.value;
  saveBillingCalendar();
});

$("#billingCalendarTable").addEventListener("change", (event) => {
  const field = event.target.dataset.calendarField;
  const index = Number(event.target.dataset.calendarIndex);

  if (!field || Number.isNaN(index) || !state.billingCalendar[index]) return;

  state.billingCalendar[index][field] = field === "offset" ? Number(event.target.value) : event.target.value;
  saveBillingCalendar();
  renderBillingCalendar();
});

$("#billingCalendarTable").addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-calendar-remove]");

  if (!removeButton) return;

  state.billingCalendar.splice(Number(removeButton.dataset.calendarRemove), 1);
  saveBillingCalendar();
  renderBillingCalendar();
});

$("#themeSelect").addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

$("#chargeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  const previousLabel = button.textContent;

  button.disabled = true;
  button.textContent = "Enviando...";

  try {
    const selectedChannel = $("#channelSelect").value;
    const delivery = await requestJson("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        residentId: $("#residentSelect").value,
        channel: selectedChannel,
        emailTo: $("#emailRecipientInput").value.trim(),
        message: $("#messageInput").value,
      }),
    });

    await loadAppData({ silent: true });
    const statusText = delivery.status === "queued" ? "entrou na fila da W-API" : "foi registrada";
    setNotice(`Cobrança por ${getChannelLabel(selectedChannel)} ${statusText} no histórico.`, "success");
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = previousLabel;
  }
});

loadBillingCalendar();
$("#themeSelect").value = localStorage.getItem("theme") || "light";
applyTheme($("#themeSelect").value);

$("#agentConfigForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await requestJson("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        channel: $("#agentChannel").value,
        toneLabel: $("#agentTone").value,
        baseTemplate: $("#agentTemplate").value,
      }),
    });

    await loadAppData({ silent: true });
    updateMessagePreview();
    setNotice("Configuração do agente atualizada.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});

$("#condoForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const isEditing = Boolean(state.editingCondoId);

    await requestJson("/api/condominiums", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify({
        id: state.editingCondoId,
        name: $("#condoName").value.trim(),
        district: $("#condoDistrict").value.trim(),
        units: Number($("#condoUnits").value),
        fee: Number($("#condoFee").value),
      }),
    });

    resetCondoForm();
    await loadAppData({ silent: true });
    setNotice(isEditing ? "Condomínio atualizado com sucesso." : "Condomínio adicionado com sucesso.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});

$("#residentForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const isEditing = Boolean(state.editingResidentId);

    await requestJson("/api/residents", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify({
        id: state.editingResidentId,
        name: $("#residentName").value.trim(),
        email: $("#residentEmail").value.trim(),
        phone: $("#residentPhone").value.trim(),
        condoId: $("#residentCondo").value,
        unit: $("#residentUnit").value.trim(),
        amount: Number($("#residentAmount").value),
        status: $("#residentStatus").value,
        days: Number($("#residentDays").value),
      }),
    });

    resetResidentForm();
    await loadAppData({ silent: true });
    setNotice(isEditing ? "Condômino atualizado com sucesso." : "Condômino adicionado com sucesso.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});
