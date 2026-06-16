(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const d of o)if(d.type==="childList")for(const u of d.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&r(u)}).observe(document,{childList:!0,subtree:!0});function i(o){const d={};return o.integrity&&(d.integrity=o.integrity),o.referrerPolicy&&(d.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?d.credentials="include":o.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function r(o){if(o.ep)return;o.ep=!0;const d=i(o);fetch(o.href,d)}})();const a={selectedCondo:"all",condos:[{id:"aurora",name:"Residencial Aurora",district:"Centro",units:84,fee:620},{id:"jardins",name:"Condomínio Jardins",district:"Vila Nova",units:126,fee:740},{id:"atlantic",name:"Edifício Atlantic",district:"Boa Vista",units:58,fee:910}],residents:[{id:1,name:"Marina Alves",condoId:"aurora",unit:"A-204",status:"overdue",amount:620,days:9},{id:2,name:"Rafael Nogueira",condoId:"aurora",unit:"B-110",status:"paid",amount:620,days:0},{id:3,name:"Camila Torres",condoId:"jardins",unit:"302",status:"overdue",amount:740,days:18},{id:4,name:"Bruno Martins",condoId:"jardins",unit:"611",status:"paid",amount:740,days:0},{id:5,name:"Paula Menezes",condoId:"atlantic",unit:"1201",status:"overdue",amount:910,days:31},{id:6,name:"Sérgio Lima",condoId:"atlantic",unit:"804",status:"paid",amount:910,days:0}],agents:[{channel:"WhatsApp",status:"Ativo",queue:12,tone:"objetivo e humano"},{channel:"E-mail",status:"Ativo",queue:7,tone:"formal e claro"},{channel:"SMS",status:"Pausado",queue:3,tone:"curto e direto"}],messages:[{resident:"Marina Alves",channel:"WhatsApp",text:"Lembrete enviado sobre pendência da unidade A-204.",time:"Hoje, 09:15"},{resident:"Camila Torres",channel:"E-mail",text:"E-mail enviado com resumo do débito e segunda via.",time:"Ontem, 16:40"}],cashflow:[{month:"Jan",received:92e3,pending:9400},{month:"Fev",received:98500,pending:7800},{month:"Mar",received:94800,pending:11200},{month:"Abr",received:102400,pending:6900},{month:"Mai",received:97100,pending:12400},{month:"Jun",received:106800,pending:8170}]},c=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}),$={dashboard:"Dashboard",agents:"Agentes",charges:"Cobranças",condos:"Condomínios",residents:"Condôminos",cashflow:"Fluxo de caixa"},n=e=>document.querySelector(e);function s(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function v(e){return a.condos.find(t=>t.id===e)?.name||"Sem condomínio"}function f(){return a.selectedCondo==="all"?a.residents:a.residents.filter(e=>e.condoId===a.selectedCondo)}function C(e){return e>=30?"E-mail":e>=15?"WhatsApp":"SMS"}function L(){const e=['<option value="all">Todos os condomínios</option>',...a.condos.map(t=>`<option value="${s(t.id)}">${s(t.name)}</option>`)].join("");n("#condoFilter").innerHTML=e,n("#condoFilter").value=a.selectedCondo,n("#residentCondo").innerHTML=a.condos.map(t=>`<option value="${s(t.id)}">${s(t.name)}</option>`).join("")}function y(){const e=f(),t=e.filter(l=>l.status==="paid"),i=e.filter(l=>l.status==="overdue"),r=e.reduce((l,p)=>l+p.amount,0),o=i.reduce((l,p)=>l+p.amount,0),d=e.length?Math.round(t.length/e.length*100):0,u=e.length?Math.round(i.length/e.length*100):0;n("#expectedRevenue").textContent=c.format(r),n("#overdueTotal").textContent=c.format(o),n("#overdueCount").textContent=`${i.length} condôminos em atraso`,n("#paidCount").textContent=t.length,n("#messageCount").textContent=a.messages.length,n("#paidPercent").textContent=`${d}%`,n("#overduePercent").textContent=`${u}%`,n("#paidBar").style.width=`${d}%`,n("#overdueBar").style.width=`${u}%`}function A(){n("#channelList").innerHTML=a.agents.map(e=>`
        <div class="channel-item">
          <div>
            <strong>${s(e.channel)}</strong>
            <p>${e.queue} mensagens na fila</p>
          </div>
          <span class="pill ${e.status==="Pausado"?"danger":""}">${s(e.status)}</span>
        </div>
      `).join("")}function x(){const e=f().filter(t=>t.status==="overdue");n("#overdueTable").innerHTML=e.map(t=>`
        <tr>
          <td>${s(t.name)}</td>
          <td>${s(v(t.condoId))}</td>
          <td>${s(t.unit)}</td>
          <td>${t.days} dias</td>
          <td>${c.format(t.amount)}</td>
          <td>${C(t.days)}</td>
        </tr>
      `).join("")}function M(){n("#agentCards").innerHTML=a.agents.map(e=>`
        <div class="agent-card">
          <div class="agent-card-header">
            <strong>${s(e.channel)}</strong>
            <span class="pill ${e.status==="Pausado"?"danger":""}">${s(e.status)}</span>
          </div>
          <p>${e.queue} mensagens aguardando envio.</p>
          <small>Tom: ${s(e.tone)}</small>
        </div>
      `).join("")}function b(){const e=a.residents.filter(t=>t.status==="overdue");n("#residentSelect").innerHTML=e.map(t=>`<option value="${t.id}">${s(t.name)} - ${s(t.unit)}</option>`).join(""),h()}function h(){const e=Number(n("#residentSelect").value),t=a.residents.find(i=>i.id===e);t&&(n("#messageInput").value=`Olá, ${t.name}. Identificamos uma pendência de ${c.format(t.amount)} referente à unidade ${t.unit} do ${v(t.condoId)}. Podemos te ajudar com a regularização?`)}function S(){n("#messageHistory").innerHTML=a.messages.map(e=>`
        <div class="history-item">
          <div class="history-top">
            <strong>${s(e.resident)}</strong>
            <span class="pill">${s(e.channel)}</span>
          </div>
          <p>${s(e.text)}</p>
          <small>${s(e.time)}</small>
        </div>
      `).join("")}function w(){n("#condoCards").innerHTML=a.condos.map(e=>{const t=a.residents.filter(r=>r.condoId===e.id),i=t.filter(r=>r.status==="overdue");return`
        <div class="condo-card">
          <div class="condo-card-header">
            <strong>${s(e.name)}</strong>
            <span class="pill">${e.units} unidades</span>
          </div>
          <p>${s(e.district)} - taxa média ${c.format(e.fee)}</p>
          <small>${t.length} condôminos cadastrados, ${i.length} em atraso</small>
        </div>
      `}).join("")}function T(){const e=f();n("#residentTable").innerHTML=e.map(t=>`
        <tr>
          <td>${s(t.name)}</td>
          <td>${s(v(t.condoId))}</td>
          <td>${s(t.unit)}</td>
          <td><span class="pill ${t.status==="overdue"?"danger":""}">${t.status==="paid"?"Adimplente":"Inadimplente"}</span></td>
          <td>${c.format(t.amount)}</td>
        </tr>
      `).join("")}function E(){const e=Math.max(...a.cashflow.map(i=>i.received+i.pending)),t=a.cashflow.at(-1);n("#cashflowChart").innerHTML=a.cashflow.map(i=>{const r=Math.max(8,i.received/e*100),o=Math.max(8,i.pending/e*100);return`
        <div class="chart-bar">
          <div class="chart-stack">
            <span class="received" style="height: ${r}%"></span>
            <span class="pending" style="height: ${o}%"></span>
          </div>
          <div class="chart-label">${i.month}</div>
        </div>
      `}).join(""),n("#cashReceived").textContent=c.format(t.received),n("#cashPending").textContent=c.format(t.pending),n("#cashExpected").textContent=c.format(t.received+t.pending)}function m(){L(),y(),A(),x(),M(),b(),S(),w(),T(),E()}function g(e){document.querySelectorAll(".view").forEach(t=>t.classList.remove("is-active")),document.querySelectorAll(".nav-item").forEach(t=>t.classList.remove("is-active")),n(`#${e}`).classList.add("is-active"),document.querySelector(`[data-view="${e}"]`)?.classList.add("is-active"),n("#viewTitle").textContent=$[e]}n("#loginForm").addEventListener("submit",e=>{e.preventDefault(),n("#loginScreen").classList.add("is-hidden"),n("#appScreen").classList.remove("is-hidden")});n("#logoutButton").addEventListener("click",()=>{n("#appScreen").classList.add("is-hidden"),n("#loginScreen").classList.remove("is-hidden")});document.querySelectorAll("[data-view], [data-view-link]").forEach(e=>{e.addEventListener("click",()=>{g(e.dataset.view||e.dataset.viewLink)})});n("#quickChargeButton").addEventListener("click",()=>g("charges"));n("#condoFilter").addEventListener("change",e=>{a.selectedCondo=e.target.value,m()});n("#residentSelect").addEventListener("change",h);n("#chargeForm").addEventListener("submit",e=>{e.preventDefault();const t=a.residents.find(r=>r.id===Number(n("#residentSelect").value)),i=n("#channelSelect").value;a.messages.unshift({resident:t.name,channel:i,text:n("#messageInput").value,time:"Agora"}),m()});n("#condoForm").addEventListener("submit",e=>{e.preventDefault();const t=n("#condoName").value.trim();a.condos.push({id:t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\W+/g,"-"),name:t,district:n("#condoDistrict").value.trim(),units:Number(n("#condoUnits").value),fee:Number(n("#condoFee").value)}),e.target.reset(),n("#condoUnits").value=80,n("#condoFee").value=620,m()});n("#residentForm").addEventListener("submit",e=>{e.preventDefault(),a.residents.push({id:Date.now(),name:n("#residentName").value.trim(),condoId:n("#residentCondo").value,unit:n("#residentUnit").value.trim(),status:n("#residentStatus").value,amount:Number(n("#residentAmount").value),days:Number(n("#residentDays").value)}),e.target.reset(),n("#residentAmount").value=620,n("#residentDays").value=0,m()});m();
