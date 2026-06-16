import "./styles.css";

const state = {
  selectedCondo: "all",
  condos: [
    { id: "aurora", name: "Residencial Aurora", district: "Centro", units: 84, fee: 620 },
    { id: "jardins", name: "Condomínio Jardins", district: "Vila Nova", units: 126, fee: 740 },
    { id: "atlantic", name: "Edifício Atlantic", district: "Boa Vista", units: 58, fee: 910 },
  ],
  residents: [
    { id: 1, name: "Marina Alves", condoId: "aurora", unit: "A-204", status: "overdue", amount: 620, days: 9 },
    { id: 2, name: "Rafael Nogueira", condoId: "aurora", unit: "B-110", status: "paid", amount: 620, days: 0 },
    { id: 3, name: "Camila Torres", condoId: "jardins", unit: "302", status: "overdue", amount: 740, days: 18 },
    { id: 4, name: "Bruno Martins", condoId: "jardins", unit: "611", status: "paid", amount: 740, days: 0 },
    { id: 5, name: "Paula Menezes", condoId: "atlantic", unit: "1201", status: "overdue", amount: 910, days: 31 },
    { id: 6, name: "Sérgio Lima", condoId: "atlantic", unit: "804", status: "paid", amount: 910, days: 0 },
  ],
  agents: [
    { channel: "WhatsApp", status: "Ativo", queue: 12, tone: "objetivo e humano" },
    { channel: "E-mail", status: "Ativo", queue: 7, tone: "formal e claro" },
    { channel: "SMS", status: "Pausado", queue: 3, tone: "curto e direto" },
  ],
  messages: [
    { resident: "Marina Alves", channel: "WhatsApp", text: "Lembrete enviado sobre pendência da unidade A-204.", time: "Hoje, 09:15" },
    { resident: "Camila Torres", channel: "E-mail", text: "E-mail enviado com resumo do débito e segunda via.", time: "Ontem, 16:40" },
  ],
  cashflow: [
    { month: "Jan", received: 92000, pending: 9400 },
    { month: "Fev", received: 98500, pending: 7800 },
    { month: "Mar", received: 94800, pending: 11200 },
    { month: "Abr", received: 102400, pending: 6900 },
    { month: "Mai", received: 97100, pending: 12400 },
    { month: "Jun", received: 106800, pending: 8170 },
  ],
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
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

function getCondoName(condoId) {
  return state.condos.find((condo) => condo.id === condoId)?.name || "Sem condomínio";
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
}

function renderMetrics() {
  const residents = getFilteredResidents();
  const paid = residents.filter((resident) => resident.status === "paid");
  const overdue = residents.filter((resident) => resident.status === "overdue");
  const expected = residents.reduce((total, resident) => total + resident.amount, 0);
  const overdueTotal = overdue.reduce((total, resident) => total + resident.amount, 0);
  const paidPercent = residents.length ? Math.round((paid.length / residents.length) * 100) : 0;
  const overduePercent = residents.length ? Math.round((overdue.length / residents.length) * 100) : 0;

  $("#expectedRevenue").textContent = currency.format(expected);
  $("#overdueTotal").textContent = currency.format(overdueTotal);
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
            <strong>${escapeHtml(agent.channel)}</strong>
            <p>${agent.queue} mensagens na fila</p>
          </div>
          <span class="pill ${agent.status === "Pausado" ? "danger" : ""}">${escapeHtml(agent.status)}</span>
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
          <td data-label="Valor">${currency.format(resident.amount)}</td>
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
            <strong>${escapeHtml(agent.channel)}</strong>
            <span class="pill ${agent.status === "Pausado" ? "danger" : ""}">${escapeHtml(agent.status)}</span>
          </div>
          <p>${agent.queue} mensagens aguardando envio.</p>
          <small>Tom: ${escapeHtml(agent.tone)}</small>
        </div>
      `,
    )
    .join("");
}

function renderResidentSelect() {
  const overdue = state.residents.filter((resident) => resident.status === "overdue");

  $("#residentSelect").innerHTML = overdue
    .map((resident) => `<option value="${resident.id}">${escapeHtml(resident.name)} - ${escapeHtml(resident.unit)}</option>`)
    .join("");

  updateMessagePreview();
}

function updateMessagePreview() {
  const residentId = Number($("#residentSelect").value);
  const resident = state.residents.find((item) => item.id === residentId);

  if (!resident) return;

  $("#messageInput").value = `Olá, ${resident.name}. Identificamos uma pendência de ${currency.format(resident.amount)} referente à unidade ${resident.unit} do ${getCondoName(resident.condoId)}. Podemos te ajudar com a regularização?`;
}

function renderMessages() {
  $("#messageHistory").innerHTML = state.messages
    .map(
      (message) => `
        <div class="history-item">
          <div class="history-top">
            <strong>${escapeHtml(message.resident)}</strong>
            <span class="pill">${escapeHtml(message.channel)}</span>
          </div>
          <p>${escapeHtml(message.text)}</p>
          <small>${escapeHtml(message.time)}</small>
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
          <p>${escapeHtml(condo.district)} - taxa média ${currency.format(condo.fee)}</p>
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
          <td data-label="Mensalidade">${currency.format(resident.amount)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderCashflow() {
  const max = Math.max(...state.cashflow.map((item) => item.received + item.pending));
  const current = state.cashflow.at(-1);

  $("#cashflowChart").innerHTML = state.cashflow
    .map((item) => {
      const receivedHeight = Math.max(8, (item.received / max) * 100);
      const pendingHeight = Math.max(8, (item.pending / max) * 100);

      return `
        <div class="chart-bar">
          <div class="chart-stack">
            <span class="received" style="height: ${receivedHeight}%"></span>
            <span class="pending" style="height: ${pendingHeight}%"></span>
          </div>
          <div class="chart-label">${item.month}</div>
        </div>
      `;
    })
    .join("");

  $("#cashReceived").textContent = currency.format(current.received);
  $("#cashPending").textContent = currency.format(current.pending);
  $("#cashExpected").textContent = currency.format(current.received + current.pending);
}

function renderAll() {
  renderFilters();
  renderMetrics();
  renderChannels();
  renderOverdueTable();
  renderAgents();
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

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#loginScreen").classList.add("is-hidden");
  $("#appScreen").classList.remove("is-hidden");
});

$("#logoutButton").addEventListener("click", () => {
  $("#appScreen").classList.add("is-hidden");
  $("#loginScreen").classList.remove("is-hidden");
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

$("#residentSelect").addEventListener("change", updateMessagePreview);

$("#chargeForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const resident = state.residents.find((item) => item.id === Number($("#residentSelect").value));
  const channel = $("#channelSelect").value;

  state.messages.unshift({
    resident: resident.name,
    channel,
    text: $("#messageInput").value,
    time: "Agora",
  });

  renderAll();
});

$("#condoForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("#condoName").value.trim();

  state.condos.push({
    id: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, "-"),
    name,
    district: $("#condoDistrict").value.trim(),
    units: Number($("#condoUnits").value),
    fee: Number($("#condoFee").value),
  });

  event.target.reset();
  $("#condoUnits").value = 80;
  $("#condoFee").value = 620;
  renderAll();
});

$("#residentForm").addEventListener("submit", (event) => {
  event.preventDefault();

  state.residents.push({
    id: Date.now(),
    name: $("#residentName").value.trim(),
    condoId: $("#residentCondo").value,
    unit: $("#residentUnit").value.trim(),
    status: $("#residentStatus").value,
    amount: Number($("#residentAmount").value),
    days: Number($("#residentDays").value),
  });

  event.target.reset();
  $("#residentAmount").value = 620;
  $("#residentDays").value = 0;
  renderAll();
});

renderAll();
