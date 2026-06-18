import "./styles.css";

const state = {
  selectedCondo: "all",
  selectedAgentChannel: "whatsapp",
  condos: [],
  residents: [],
  agents: [],
  messages: [],
  cashflow: [],
  hasLoaded: false,
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
  condos: "Condomínios",
  residents: "Condôminos",
  cashflow: "Fluxo de caixa",
};

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

  const data = await requestJson("/api/bootstrap");
  state.condos = data.condos;
  state.residents = data.residents;
  state.agents = data.agents;
  state.messages = data.messages;
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

  $("#agentChannel").innerHTML = state.agents
    .map((agent) => `<option value="${escapeHtml(agent.channel)}">${escapeHtml(getChannelLabel(agent.channel))}</option>`)
    .join("");
  $("#agentChannel").value = state.selectedAgentChannel;
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
            <p>${agent.queue} mensagens na fila</p>
          </div>
          <span class="pill ${agent.status === "paused" ? "danger" : ""}">${escapeHtml(getAgentStatusLabel(agent.status))}</span>
        </div>
      `,
    )
    .join("");
}

function renderOverdueTable() {
  const overdue = getFilteredResidents().filter((resident) => resident.status === "overdue");

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
            <span class="pill ${agent.status === "paused" ? "danger" : ""}">${escapeHtml(getAgentStatusLabel(agent.status))}</span>
          </div>
          <p>${agent.queue} mensagens aguardando envio.</p>
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
  const options = state.residents
    .map((resident) => `<option value="${resident.id}">${escapeHtml(resident.name)} - ${escapeHtml(resident.unit)}</option>`)
    .join("");

  $("#residentSelect").innerHTML = options;
  updateMessagePreview();
}

function updateMessagePreview() {
  const residentId = $("#residentSelect").value;
  const resident = getResidentById(residentId);

  if (!resident) return;

  $("#messageInput").value = `Olá, ${resident.name}. Identificamos uma pendência de ${currency.format(fromCents(resident.amountCents))} referente à unidade ${resident.unit} do ${getCondoName(resident.condoId)}. Podemos te ajudar com a regularização?`;
}

function renderMessages() {
  $("#messageHistory").innerHTML = state.messages
    .map(
      (message) => `
        <div class="history-item">
          <div class="history-top">
            <strong>${escapeHtml(message.resident)}</strong>
            <span class="pill">${escapeHtml(getChannelLabel(message.channel))}</span>
          </div>
          ${message.subject ? `<small class="history-subject">${escapeHtml(message.subject)}</small>` : ""}
          <p>${escapeHtml(message.text)}</p>
          <small>${escapeHtml(formatTimeline(message.sentAt))}</small>
        </div>
      `,
    )
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
        </div>
      `;
    })
    .join("");
}

function renderResidents() {
  const residents = getFilteredResidents();

  $("#residentTable").innerHTML = residents
    .map(
      (resident) => `
        <tr>
          <td data-label="Nome">${escapeHtml(resident.name)}</td>
          <td data-label="Condomínio">${escapeHtml(getCondoName(resident.condoId))}</td>
          <td data-label="Unidade">${escapeHtml(resident.unit)}</td>
          <td data-label="Status"><span class="pill ${resident.status === "overdue" ? "danger" : ""}">${resident.status === "paid" ? "Adimplente" : "Inadimplente"}</span></td>
          <td data-label="Mensalidade">${currency.format(fromCents(resident.amountCents))}</td>
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

function renderAll() {
  renderFilters();
  renderMetrics();
  renderChannels();
  renderOverdueTable();
  renderAgents();
  renderAgentConfig();
  renderResidentSelect();
  renderMessages();
  renderCondos();
  renderResidents();
  renderCashflow();
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

$("#quickChargeButton").addEventListener("click", () => setView("charges"));

$("#condoFilter").addEventListener("change", (event) => {
  state.selectedCondo = event.target.value;
  renderAll();
});

$("#agentChannel").addEventListener("change", (event) => {
  state.selectedAgentChannel = event.target.value;
  renderAgentConfig();
});

$("#residentSelect").addEventListener("change", updateMessagePreview);

$("#chargeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  const previousLabel = button.textContent;

  button.disabled = true;
  button.textContent = "Enviando...";

  try {
    await requestJson("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        residentId: $("#residentSelect").value,
        channel: $("#channelSelect").value,
        message: $("#messageInput").value,
      }),
    });

    await loadAppData({ silent: true });
    setNotice("Cobrança por e-mail enviada e registrada no histórico.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = previousLabel;
  }
});

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
    setNotice("Configuração do agente atualizada.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});

$("#condoForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await requestJson("/api/condominiums", {
      method: "POST",
      body: JSON.stringify({
        name: $("#condoName").value.trim(),
        district: $("#condoDistrict").value.trim(),
        units: Number($("#condoUnits").value),
        fee: Number($("#condoFee").value),
      }),
    });

    event.target.reset();
    $("#condoUnits").value = 80;
    $("#condoFee").value = 620;
    await loadAppData({ silent: true });
    setNotice("Condomínio adicionado com sucesso.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});

$("#residentForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await requestJson("/api/residents", {
      method: "POST",
      body: JSON.stringify({
        name: $("#residentName").value.trim(),
        condoId: $("#residentCondo").value,
        unit: $("#residentUnit").value.trim(),
        amount: Number($("#residentAmount").value),
        status: $("#residentStatus").value,
        days: Number($("#residentDays").value),
      }),
    });

    event.target.reset();
    $("#residentAmount").value = 620;
    $("#residentDays").value = 0;
    await loadAppData({ silent: true });
    setNotice("Condômino adicionado com sucesso.", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
});
