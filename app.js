const STORAGE_KEY = "alvis-crm-v1";

const modules = [
  { id: "dashboard", label: "Panel", icon: "⌂", locked: true },
  { id: "manager", label: "Supervisor", icon: "❖", locked: true },
  { id: "inbox", label: "Inbox", icon: "☏", locked: true },
  { id: "contacts", label: "Contactos", icon: "◉" },
  { id: "companies", label: "Empresas", icon: "▦" },
  { id: "deals", label: "Ventas", icon: "$" },
  { id: "tasks", label: "Tareas", icon: "✓" },
  { id: "tickets", label: "Soporte", icon: "!" },
  { id: "campaigns", label: "Marketing", icon: "↗" },
  { id: "channels", label: "Canales", icon: "◫" },
  { id: "automations", label: "Flujos", icon: "⟳" },
  { id: "teams", label: "Equipos", icon: "▥" },
  { id: "macros", label: "Macros", icon: "✦" },
  { id: "reports", label: "Reportes", icon: "⌁" },
  { id: "settings", label: "Ajustes", icon: "⚙", locked: true }
];

const defaultPreferences = {
  version: 4,
  enabledModules: modules.map((module) => module.id),
  enabledChannels: ["WhatsApp", "Instagram", "Messenger", "Email"],
  layout: {
    showSidebar: true,
    showBrand: false,
    showNavCounts: false,
    showSidebarFooter: false,
    showChannelHeader: false,
    showChannelTools: false,
    showContactPanel: false
  },
  composer: {
    enterKey: "newline",
    ctrlEnterKey: "send"
  }
};

const statusByType = {
  contacts: ["Nuevo", "Contactado", "Calificado", "Cliente"],
  companies: ["Prospecto", "Activa", "En riesgo", "Inactiva"],
  deals: ["Prospecto", "Propuesta", "Negociacion", "Cerrado"],
  tasks: ["Pendiente", "Hoy", "En curso", "Completada"],
  tickets: ["Abierto", "En revision", "Esperando cliente", "Resuelto"],
  campaigns: ["Borrador", "Programada", "Activa", "Finalizada"]
};

const initialState = {
  activeView: "dashboard",
  theme: "light",
  records: {
    contacts: [
      { id: crypto.randomUUID(), name: "Laura Jimenez", company: "Innova Legal", status: "Calificado", value: 18000, owner: "Comercial", notes: "Busca automatizar seguimiento de clientes corporativos.", createdAt: "2026-05-24" },
      { id: crypto.randomUUID(), name: "Carlos Medina", company: "Medina Group", status: "Contactado", value: 8200, owner: "Ventas", notes: "Interesado en paquete mensual de gestion.", createdAt: "2026-05-24" }
    ],
    companies: [
      { id: crypto.randomUUID(), name: "Innova Legal", company: "Servicios profesionales", status: "Activa", value: 42000, owner: "Cuentas", notes: "Cuenta prioritaria con potencial de expansion.", createdAt: "2026-05-24" },
      { id: crypto.randomUUID(), name: "Norte Supply", company: "Distribucion", status: "Prospecto", value: 26000, owner: "Ventas", notes: "Evaluando propuesta para equipo completo.", createdAt: "2026-05-24" }
    ],
    deals: [
      { id: crypto.randomUUID(), name: "Implementacion CRM", company: "Innova Legal", status: "Negociacion", value: 42000, owner: "Alvis", notes: "Decision esperada esta semana.", createdAt: "2026-05-24" },
      { id: crypto.randomUUID(), name: "Plan comercial anual", company: "Norte Supply", status: "Propuesta", value: 26000, owner: "Alvis", notes: "Enviar comparativo de planes.", createdAt: "2026-05-24" },
      { id: crypto.randomUUID(), name: "Capacitacion equipo", company: "Medina Group", status: "Prospecto", value: 8200, owner: "Ventas", notes: "Agendar demo con gerencia.", createdAt: "2026-05-24" }
    ],
    tasks: [
      { id: crypto.randomUUID(), name: "Llamar a Laura", company: "Innova Legal", status: "Hoy", value: 0, owner: "Alvis", notes: "Confirmar alcance y fecha de inicio.", createdAt: "2026-05-24" },
      { id: crypto.randomUUID(), name: "Enviar propuesta actualizada", company: "Norte Supply", status: "Pendiente", value: 0, owner: "Ventas", notes: "Incluir descuento por pago anual.", createdAt: "2026-05-24" }
    ],
    tickets: [
      { id: crypto.randomUUID(), name: "Consulta sobre facturacion", company: "Innova Legal", status: "En revision", value: 0, owner: "Soporte", notes: "Cliente solicita desglose por servicio.", createdAt: "2026-05-24" }
    ],
    campaigns: [
      { id: crypto.randomUUID(), name: "Reactivacion clientes frios", company: "Base general", status: "Activa", value: 12000, owner: "Marketing", notes: "Secuencia de 3 correos y llamada final.", createdAt: "2026-05-24" }
    ]
  },
  conversations: [
    { id: crypto.randomUUID(), channel: "WhatsApp", contact: "Laura Jimenez", company: "Innova Legal", inbox: "WhatsApp Principal", team: "Ventas", status: "Abierta", priority: "Alta", labels: ["sales-lead", "vip"], sla: "12 min", lastMessage: "Perfecto, enviame la propuesta con integracion a WhatsApp.", owner: "Maria R.", updatedAt: "Hace 8 min", privateNote: "@Alvis validar plan anual antes de enviar contrato." },
    { id: crypto.randomUUID(), channel: "Instagram", contact: "Norte Supply", company: "Norte Supply", inbox: "Instagram Leads", team: "Marketing", status: "Pendiente", priority: "Media", labels: ["new-customer"], sla: "42 min", lastMessage: "Gracias por escribirnos. Ya te conecto con ventas.", owner: "Sin asignar", updatedAt: "Hace 31 min", privateNote: "Lead entrante por campaña de automatizacion." },
    { id: crypto.randomUUID(), channel: "Messenger", contact: "Carlos Medina", company: "Medina Group", inbox: "Facebook Page", team: "Ventas", status: "Abierta", priority: "Media", labels: ["automation"], sla: "1 h 10 min", lastMessage: "Quiero saber si el CRM puede asignar leads automatico.", owner: "Rafael C.", updatedAt: "Hoy", privateNote: "Interesado en auto-asignacion y CRM." },
    { id: crypto.randomUUID(), channel: "Email", contact: "Finanzas Innova", company: "Innova Legal", inbox: "Soporte Email", team: "Soporte", status: "Resuelta", priority: "Baja", labels: ["billing"], sla: "Cumplido", lastMessage: "Factura recibida, muchas gracias.", owner: "Daniela P.", updatedAt: "Ayer", privateNote: "Caso cerrado con confirmacion del cliente." }
  ],
  channels: [
    { id: "whatsapp", name: "WhatsApp Business Cloud API", provider: "Meta", status: "Diseñado", capability: "Mensajes, plantillas, webhooks, asignacion y SLA" },
    { id: "instagram", name: "Instagram Messaging API", provider: "Meta", status: "Diseñado", capability: "DMs, comentarios, handoff a agentes y etiquetado" },
    { id: "messenger", name: "Messenger Platform", provider: "Meta", status: "Diseñado", capability: "Conversaciones, respuestas rapidas y automatizaciones" },
    { id: "email", name: "Email IMAP/SMTP", provider: "Nativo", status: "Planificado", capability: "Bandeja, respuestas, tracking y secuencias" },
    { id: "sms", name: "SMS", provider: "Proveedor externo", status: "Planificado", capability: "Notificaciones, OTP y campañas transaccionales" },
    { id: "webchat", name: "Web Chat", provider: "Alvis", status: "Planificado", capability: "Widget embebido, bots y captura de leads" }
  ],
  automations: [
    { id: crypto.randomUUID(), name: "Asignar lead nuevo", trigger: "Mensaje entrante sin propietario", action: "Asignar por horario y disponibilidad", status: "Activa" },
    { id: crypto.randomUUID(), name: "Crear oportunidad", trigger: "Lead calificado en WhatsApp", action: "Crear deal y tarea de seguimiento", status: "Borrador" },
    { id: crypto.randomUUID(), name: "SLA soporte", trigger: "Ticket sin respuesta por 30 minutos", action: "Escalar a supervisor", status: "Activa" }
  ],
  teams: [
    { id: crypto.randomUUID(), name: "Soporte", agents: 5, open: 24, firstResponse: "1m 45s", resolution: "2h 30m", routing: "Round-robin" },
    { id: crypto.randomUUID(), name: "Ventas", agents: 3, open: 8, firstResponse: "3m 10s", resolution: "6h 20m", routing: "Por prioridad" },
    { id: crypto.randomUUID(), name: "Marketing", agents: 2, open: 5, firstResponse: "4m 05s", resolution: "4h 15m", routing: "Por campana" },
    { id: crypto.randomUUID(), name: "Tecnico", agents: 4, open: 6, firstResponse: "7m 40s", resolution: "8h 05m", routing: "Escalamiento" }
  ],
  macros: [
    { id: crypto.randomUUID(), name: "Transferir a ventas", visibility: "Publica", actions: ["Asignar equipo: Ventas", "Agregar etiqueta: sales-lead", "Enviar respuesta de agenda"] },
    { id: crypto.randomUUID(), name: "Escalar a soporte tecnico", visibility: "Publica", actions: ["Asignar equipo: Tecnico", "Prioridad: Alta", "Nota interna con contexto"] },
    { id: crypto.randomUUID(), name: "Cerrar con encuesta", visibility: "Publica", actions: ["Enviar CSAT", "Resolver conversacion", "Enviar transcripcion"] },
    { id: crypto.randomUUID(), name: "Seguimiento luego", visibility: "Privada", actions: ["Posponer 24h", "Agregar etiqueta: follow-up", "Crear tarea"] }
  ],
  managerSettings: {
    businessHours: {
      activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"],
      startHour: "09:00",
      endHour: "18:00"
    },
    slaLimits: {
      Alta: 15,
      Media: 60,
      Baja: 240
    },
    agentCapacity: 5,
    routingMethod: "round-robin"
  },
  preferences: structuredClone(defaultPreferences)
};

let state = loadState();
let searchTerm = "";
let apiAvailable = false;
let activeInbox = "WhatsApp";
let selectedConversationId = null;
let inboxSearchTerm = "";
let activeConversationTab = "mine";
let inboxSearchTimer = null;
let activeManagerTab = "kpis";
let activeComposerMode = "reply";

const navList = document.querySelector("#navList");
const viewRoot = document.querySelector("#viewRoot");
const pageTitle = document.querySelector("#pageTitle");
const globalSearch = document.querySelector("#globalSearch");
const quickAddButton = document.querySelector("#quickAddButton");
const themeToggle = document.querySelector("#themeToggle");
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarTogglePersistent = document.querySelector("#sidebarTogglePersistent");
const recordDialog = document.querySelector("#recordDialog");
const recordForm = document.querySelector("#recordForm");
const recordType = document.querySelector("#recordType");
const recordStatus = document.querySelector("#recordStatus");

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(initialState);

  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeState(savedState) {
  const nextState = structuredClone(initialState);
  nextState.activeView = savedState.activeView || nextState.activeView;
  nextState.theme = savedState.theme || nextState.theme;
  nextState.records = { ...nextState.records, ...(savedState.records || {}) };
  nextState.conversations = savedState.conversations || nextState.conversations;
  nextState.channels = savedState.channels || nextState.channels;
  nextState.automations = savedState.automations || nextState.automations;
  nextState.teams = savedState.teams || nextState.teams;
  nextState.macros = savedState.macros || nextState.macros;
  nextState.managerSettings = savedState.managerSettings || nextState.managerSettings;
  nextState.preferences = normalizePreferences(savedState.preferences);
  return nextState;
}

function normalizePreferences(preferences = {}) {
  if (preferences.version !== defaultPreferences.version) {
    return structuredClone(defaultPreferences);
  }

  const enabledModules = preferences.enabledModules?.length ? preferences.enabledModules : defaultPreferences.enabledModules;
  const enabledChannels = preferences.enabledChannels?.length ? preferences.enabledChannels : defaultPreferences.enabledChannels;
  const lockedModules = modules.filter((module) => module.locked).map((module) => module.id);

  return {
    enabledModules: Array.from(new Set([...lockedModules, ...enabledModules])),
    enabledChannels: Array.from(new Set(enabledChannels)),
    version: defaultPreferences.version,
    layout: { ...defaultPreferences.layout, ...(preferences.layout || {}) },
    composer: { ...defaultPreferences.composer, ...(preferences.composer || {}) }
  };
}

function isModuleEnabled(id) {
  return state.preferences.enabledModules.includes(id);
}

function isChannelEnabled(channel) {
  return state.preferences.enabledChannels.includes(channel);
}

function enabledConversations() {
  return state.conversations.filter((conversation) => isChannelEnabled(conversation.channel));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function bootstrapFromApi() {
  if (location.protocol === "file:") return;

  try {
    const response = await fetch("/api/bootstrap", { headers: { Accept: "application/json" } });
    if (!response.ok) return;

    const apiState = await response.json();
    apiAvailable = true;
    state = normalizeState({
      ...apiState,
      activeView: state.activeView,
      theme: state.theme,
      preferences: state.preferences
    });
    saveState();
    render();
  } catch {
    apiAvailable = false;
  }
}

async function createRecord(type, record) {
  if (!apiAvailable) {
    state.records[type].unshift(record);
    return record;
  }

  const response = await fetch("/api/records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ type, ...record })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "No se pudo crear el registro" }));
    throw new Error(error.error || "No se pudo crear el registro");
  }

  const payload = await response.json();
  state.records[type].unshift(payload.record);
  return payload.record;
}

async function createConversationMessage(conversationId, text, direction = "outgoing") {
  if (!apiAvailable) {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) throw new Error("Conversacion no encontrada");
    const message = addLocalMessage(conversation, text, direction);
    return { conversation, message };
  }

  const response = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ text, direction })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "No se pudo enviar el mensaje" }));
    throw new Error(error.error || "No se pudo enviar el mensaje");
  }

  return response.json();
}

async function updateConversation(conversationId, updates) {
  if (!apiAvailable) {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) throw new Error("Conversacion no encontrada");
    Object.assign(conversation, updates, { updatedAt: "Ahora" });
    return { conversation };
  }

  const response = await fetch(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "No se pudo actualizar la conversacion" }));
    throw new Error(error.error || "No se pudo actualizar la conversacion");
  }

  return response.json();
}

async function updateManagerSettings(updates) {
  if (!state.managerSettings) state.managerSettings = {};
  if (updates.businessHours) state.managerSettings.businessHours = { ...state.managerSettings.businessHours, ...updates.businessHours };
  if (updates.slaLimits) state.managerSettings.slaLimits = { ...state.managerSettings.slaLimits, ...updates.slaLimits };
  if (updates.agentCapacity !== undefined) state.managerSettings.agentCapacity = Number(updates.agentCapacity);
  if (updates.routingMethod) state.managerSettings.routingMethod = String(updates.routingMethod);

  if (!apiAvailable) {
    saveState();
    return;
  }

  try {
    await fetch("/api/manager/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    saveState();
  } catch (error) {
    console.error("No se pudo guardar la configuracion del supervisor:", error);
  }
}

async function updateTeamOnServer(teamId, updates) {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return;
  Object.assign(team, updates);

  if (!apiAvailable) {
    saveState();
    return;
  }

  try {
    await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    saveState();
  } catch (error) {
    console.error("No se pudo actualizar el equipo:", error);
  }
}

async function updateAutomationOnServer(automationId, updates) {
  const automation = state.automations.find(a => a.id === automationId);
  if (!automation) return;
  Object.assign(automation, updates);

  if (!apiAvailable) {
    saveState();
    return;
  }

  try {
    await fetch(`/api/automations/${automationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    saveState();
  } catch (error) {
    console.error("No se pudo actualizar la automatizacion:", error);
  }
}

async function updateChannelOnServer(channelId, status) {
  const channel = state.channels.find(c => c.id === channelId);
  if (!channel) return;
  channel.status = status;

  if (!apiAvailable) {
    saveState();
    return;
  }

  try {
    await fetch(`/api/channels/${channelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    saveState();
  } catch (error) {
    console.error("No se pudo actualizar el canal:", error);
  }
}

async function createAutomationOnServer(automation) {
  if (!apiAvailable) {
    state.automations.unshift(automation);
    saveState();
    return automation;
  }

  try {
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(automation)
    });
    if (response.ok) {
      const payload = await response.json();
      state.automations.unshift(payload.automation);
      saveState();
      return payload.automation;
    }
  } catch (error) {
    console.error("No se pudo crear la automatizacion:", error);
  }
  state.automations.unshift(automation);
  saveState();
  return automation;
}

async function createMacroOnServer(macro) {
  if (!apiAvailable) {
    state.macros.unshift(macro);
    saveState();
    return macro;
  }

  try {
    const response = await fetch("/api/macros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(macro)
    });
    if (response.ok) {
      const payload = await response.json();
      state.macros.unshift(payload.macro);
      saveState();
      return payload.macro;
    }
  } catch (error) {
    console.error("No se pudo crear la macro:", error);
  }
  state.macros.unshift(macro);
  saveState();
  return macro;
}

function money(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function allRecords() {
  return Object.entries(state.records).flatMap(([type, records]) => records.map((record) => ({ ...record, type })));
}

function filteredRecords(type) {
  const records = state.records[type] || [];
  if (!searchTerm) return records;

  return records.filter((record) => {
    const text = `${record.name} ${record.company} ${record.status} ${record.owner} ${record.notes}`.toLowerCase();
    return text.includes(searchTerm);
  });
}

function renderNav() {
  navList.innerHTML = modules
    .filter((item) => isModuleEnabled(item.id))
    .map((item) => {
      const count = state.records[item.id]?.length ?? state[item.id]?.length ?? "";
      const active = state.activeView === item.id ? "active" : "";
      return `
        <button class="nav-button ${active}" type="button" data-view="${item.id}" title="${item.label}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          ${state.preferences.layout.showNavCounts ? `<span class="nav-count">${count}</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  document.body.classList.toggle("inbox-mode", state.activeView === "inbox");
  applyLayoutPreferences();
  if (!isModuleEnabled(state.activeView)) state.activeView = "dashboard";
  renderNav();
  const module = modules.find((item) => item.id === state.activeView);
  pageTitle.textContent = module?.label === "Panel" ? "Panel ejecutivo" : module?.label || "CRM";

  if (state.activeView === "dashboard") renderDashboard();
  else if (state.activeView === "manager") renderManager();
  else if (state.activeView === "inbox") renderInbox();
  else if (state.activeView === "channels") renderChannels();
  else if (state.activeView === "automations") renderAutomations();
  else if (state.activeView === "teams") renderTeams();
  else if (state.activeView === "macros") renderMacros();
  else if (state.activeView === "reports") renderReports();
  else if (state.activeView === "settings") renderSettings();
  else renderModule(state.activeView);
}

function applyLayoutPreferences() {
  const layout = state.preferences.layout;
  document.body.classList.toggle("hide-sidebar", !layout.showSidebar);
  document.body.classList.toggle("hide-brand", !layout.showBrand);
  document.body.classList.toggle("hide-nav-counts", !layout.showNavCounts);
  document.body.classList.toggle("hide-sidebar-footer", !layout.showSidebarFooter);
  document.body.classList.toggle("hide-channel-header", !layout.showChannelHeader);
  document.body.classList.toggle("hide-channel-tools", !layout.showChannelTools);
  document.body.classList.toggle("hide-contact-panel", !layout.showContactPanel);
  if (sidebarToggle) {
    sidebarToggle.textContent = layout.showSidebar ? "☰" : "☷";
    sidebarToggle.title = layout.showSidebar ? "Ocultar menu" : "Mostrar menu";
    sidebarToggle.setAttribute("aria-label", sidebarToggle.title);
  }
}

function renderDashboard() {
  const records = allRecords();
  const openDeals = state.records.deals.filter((deal) => deal.status !== "Cerrado");
  const pipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const todayTasks = state.records.tasks.filter((task) => ["Hoy", "En curso"].includes(task.status));
  const activeTickets = state.records.tickets.filter((ticket) => ticket.status !== "Resuelto");
  const openConversations = enabledConversations().filter((conversation) => conversation.status !== "Resuelta");

  viewRoot.innerHTML = `
    <div class="metric-grid">
      ${metric("Clientes y contactos", state.records.contacts.length + state.records.companies.length, "+12%")}
      ${metric("Pipeline abierto", money(pipelineValue), "+8%")}
      ${metric("Conversaciones abiertas", openConversations.length, "Omnicanal")}
      ${metric("Tickets abiertos", activeTickets.length, "SLA")}
    </div>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Mensajeria</p>
            <h2>Inbox unificado</h2>
          </div>
          <button class="ghost-button" type="button" data-view-shortcut="inbox">Ver inbox</button>
        </div>
        <div class="list-stack">
          ${state.conversations.slice(0, 4).map(conversationCard).join("") || empty("No hay conversaciones.")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Ventas</p>
            <h2>Pipeline comercial</h2>
          </div>
          ${isModuleEnabled("deals") ? `<button class="ghost-button" type="button" data-open-create="deals">+ Oportunidad</button>` : ""}
        </div>
        ${pipelineMarkup()}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Prioridad</p>
            <h2>Proximas acciones</h2>
          </div>
          ${isModuleEnabled("tasks") ? `<button class="ghost-button" type="button" data-open-create="tasks">+ Tarea</button>` : ""}
        </div>
        <div class="list-stack">
          ${state.records.tasks.slice(0, 5).map(recordCard).join("") || empty("No hay tareas pendientes.")}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Actividad</p>
          <h2>Ultimos registros</h2>
        </div>
      </div>
      <div class="table-wrap">${tableMarkup(records.slice(0, 8))}</div>
    </section>
  `;
}

function renderInbox() {
  const channelGroups = getChannelGroups();
  if (activeInbox !== "all" && !isChannelEnabled(activeInbox)) activeInbox = channelGroups[0]?.name || "all";
  const baseConversations = enabledConversations();
  const scopedConversations = activeInbox === "all" ? baseConversations : baseConversations.filter((conversation) => conversation.channel === activeInbox);
  const tabbedConversations = filterConversationsByTab(scopedConversations);
  const inboxTerm = (inboxSearchTerm || searchTerm).toLowerCase();
  const conversations = inboxTerm
    ? tabbedConversations.filter((conversation) => `${conversation.channel} ${conversation.contact} ${conversation.company} ${conversation.status} ${conversation.owner} ${conversation.lastMessage}`.toLowerCase().includes(inboxTerm))
    : tabbedConversations;
  const selected = selectedConversationId ? conversations.find((conversation) => conversation.id === selectedConversationId) : null;
  const profile = getChannelProfile(activeInbox === "all" ? selected?.channel : activeInbox);
  const mineCount = scopedConversations.filter((conversation) => conversation.owner !== "Sin asignar").length;
  const unassignedCount = scopedConversations.filter((conversation) => conversation.owner === "Sin asignar").length;

  viewRoot.innerHTML = `
    <section class="panel inbox-panel chatwoot-inbox-panel channel-${profile.key}">
      <div class="channel-shell chatwoot-shell">
        
        <!-- Chatwoot Conversation List Shell -->
        <section class="conversation-list-shell chatwoot-chats-panel">
          <div class="chatwoot-chats-header">
            <div class="chatwoot-header-top">
              <h3>Conversaciones</h3>
              <span class="chatwoot-status-badge">Abiertas</span>
            </div>
            
            <!-- Dynamic Rounded Custom Channel Dropdown Picker (Matches Screenshot 2) -->
            <div class="chatwoot-channel-dropdown-wrap">
              <select id="channelSelect" class="chatwoot-channel-select">
                <option value="all" ${activeInbox === "all" ? "selected" : ""}>Todos los canales</option>
                ${["WhatsApp", "Instagram", "Messenger", "Email"].map(ch => {
                  const count = baseConversations.filter(c => c.channel === ch).length;
                  return `<option value="${escapeHtml(ch)}" ${activeInbox === ch ? "selected" : ""}>${escapeHtml(ch)} (${count})</option>`;
                }).join("")}
              </select>
            </div>
          </div>

          <!-- Chatwoot Search -->
          <div class="chatwoot-chats-search">
            <span>⌕</span>
            <input data-inbox-search type="search" placeholder="Buscar conversaciones..." value="${escapeHtml(inboxSearchTerm)}" />
          </div>

          <!-- Chatwoot Filter Tabs -->
          <div class="conversation-tabs chatwoot-filter-tabs">
            <button class="chatwoot-tab-btn ${activeConversationTab === 'mine' ? 'active' : ''}" type="button" data-conversation-tab="mine">Mías <span>${mineCount}</span></button>
            <button class="chatwoot-tab-btn ${activeConversationTab === 'unassigned' ? 'active' : ''}" type="button" data-conversation-tab="unassigned">Sin asignar <span>${unassignedCount}</span></button>
            <button class="chatwoot-tab-btn ${activeConversationTab === 'all' ? 'active' : ''}" type="button" data-conversation-tab="all">Todos <span>${scopedConversations.length}</span></button>
          </div>

          <!-- Chatwoot Chat Items List -->
          <div class="conversation-list chatwoot-chats-list">
            ${conversations.map((conversation) => inboxConversationCard(conversation, conversation.id === selectedConversationId, activeInbox === "all")).join("") || empty("No hay conversaciones.")}
          </div>
        </section>

        <!-- Chatwoot Conversation Workspace -->
        <section class="conversation-workspace chatwoot-chat-workspace">
          ${selected ? conversationDetail(selected, getChannelProfile(selected.channel)) : emptyConversationState()}
        </section>

      </div>
    </section>
  `;
}

function getChannelGroups() {
  const groups = new Map();
  enabledConversations().forEach((conversation) => {
    const current = groups.get(conversation.channel) || {
      name: conversation.channel,
      count: 0
    };
    current.count += 1;
    groups.set(conversation.channel, current);
  });
  return Array.from(groups.values());
}

function filterConversationsByTab(conversations) {
  if (activeConversationTab === "unassigned") return conversations.filter((conversation) => conversation.owner === "Sin asignar");
  if (activeConversationTab === "mine") return conversations.filter((conversation) => conversation.owner !== "Sin asignar");
  return conversations;
}

function getChannelProfile(channel = "WhatsApp") {
  const profiles = {
    WhatsApp: {
      key: "whatsapp",
      title: "WhatsApp Business",
      brand: "WhatsApp Business",
      subtitle: "Bandeja principal, plantillas, etiquetas y respuestas rapidas",
      logo: "W",
      composer: "Escribe un mensaje",
      action: "Enviar",
      tools: ["Plantillas", "Etiquetas", "Catalogo"]
    },
    Instagram: {
      key: "instagram",
      title: "Instagram Direct",
      brand: "Instagram",
      subtitle: "Mensajes directos, leads de perfil y conversaciones sociales",
      logo: "IG",
      composer: "Responder por Instagram",
      action: "Responder",
      tools: ["Perfil", "Comentarios", "Etiquetas"]
    },
    Messenger: {
      key: "messenger",
      title: "Messenger",
      brand: "Messenger",
      subtitle: "Mensajes de pagina, respuestas rapidas y handoff",
      logo: "M",
      composer: "Responder en Messenger",
      action: "Enviar",
      tools: ["Pagina", "Respuestas", "Asignar"]
    },
    Email: {
      key: "email",
      title: "Email",
      brand: "Email",
      subtitle: "Bandeja de soporte con asunto, remitente y seguimiento",
      logo: "@",
      composer: "Escribir respuesta por email",
      action: "Enviar email",
      tools: ["Asunto", "Adjuntar", "CC"]
    }
  };

  return profiles[channel] || {
    key: "omni",
    title: "Todos los canales",
    brand: "Centro omnicanal",
    subtitle: "Vista consolidada de todas las mensajerias",
    logo: "*",
    composer: "Responder en el canal seleccionado",
    action: "Enviar",
    tools: ["Canal", "Equipo", "Macro"]
  };
}

function conversationDetail(conversation, profile = getChannelProfile(conversation?.channel)) {
  if (!conversation) return "";
  const messages = conversationMessages(conversation);
  const avatarBg = getAvatarGradient(conversation.contact);

  return `
    <div class="chatwoot-detail-grid">
      <div class="chatwoot-thread-panel">
        
        <!-- Chatwoot Topbar Header -->
        <div class="chatwoot-thread-header">
          <div class="chatwoot-header-avatar" style="background: ${avatarBg}">${initials(conversation.contact)}</div>
          <div class="chatwoot-header-info">
            <h2>${escapeHtml(conversation.contact)}</h2>
            <p>💬 ${escapeHtml(conversation.inbox || "Bandeja principal")}</p>
          </div>
          <div class="chatwoot-header-actions">
            <div class="chatwoot-btn-group">
              <button class="chatwoot-resolve-btn" type="button" data-toggle-resolved="${conversation.id}">
                ${conversation.status === "Resuelta" ? "Reabrir" : "Resolver"}
              </button>
            </div>
            <button class="chatwoot-header-btn" type="button" title="Mas opciones" data-layout-toggle="showContactPanel">⋮</button>
          </div>
        </div>

        <!-- Chatwoot Plain Message Thread -->
        <div class="chatwoot-message-thread">
          ${messages.map(m => messageBubble(m, conversation)).join("")}
        </div>

        <!-- Chatwoot Composer Area -->
        <div class="chatwoot-reply-box ${activeComposerMode === 'note' ? 'note-mode' : ''}">
          <div class="chatwoot-composer-tabs">
            <button class="composer-tab-btn ${activeComposerMode === 'reply' ? 'active' : ''}" type="button" data-composer-tab="reply">Responder</button>
            <button class="composer-tab-btn ${activeComposerMode === 'note' ? 'active' : ''}" type="button" data-composer-tab="note">Nota privada</button>
          </div>
          <textarea data-composer data-conversation-id="${conversation.id}" rows="2" placeholder="${activeComposerMode === 'note' ? 'Escribe una nota privada (visible solo para agentes)...' : 'Shift + enter for new line. Comience con \'/\' para seleccionar una respuesta predefinida.'}" class="chatwoot-composer-input"></textarea>
          
          <div class="chatwoot-composer-footer">
            <div class="chatwoot-composer-tools">
              <button class="tool-btn" type="button" title="Emoji">☺</button>
              <button class="tool-btn" type="button" title="Adjuntar">📎</button>
              <button class="tool-btn" type="button" title="Nota de voz">🎙</button>
              <button class="tool-btn" type="button" title="Macros">✦</button>
            </div>
            <button class="chatwoot-send-btn" type="button" data-send-message="${conversation.id}">
              ${activeComposerMode === 'note' ? 'Guardar nota' : 'Enviar (CTRL + ↵)'}
            </button>
          </div>
        </div>
      </div>

      <!-- Compact Right Panel (Chatwoot Contact Info) -->
      <aside class="chatwoot-contact-sidebar contact-sidebar">
        <div class="contact-sidebar-header">
          <div>
            <p class="eyebrow">Contacto</p>
            <h3>${escapeHtml(conversation.contact)}</h3>
          </div>
          <button class="icon-button compact-button" type="button" data-layout-toggle="showContactPanel" aria-label="Ocultar" title="Ocultar">×</button>
        </div>
        <dl class="detail-list">
          <div><dt>Empresa</dt><dd>${escapeHtml(conversation.company || "-")}</dd></div>
          <div><dt>Equipo</dt><dd>${escapeHtml(conversation.team || "-")}</dd></div>
          <div><dt>Agente</dt><dd>${escapeHtml(conversation.owner || "-")}</dd></div>
          <div><dt>Canal</dt><dd>${escapeHtml(conversation.channel || "-")}</dd></div>
          <div><dt>Prioridad</dt><dd>${escapeHtml(conversation.priority || "-")}</dd></div>
          <div><dt>SLA</dt><dd>${escapeHtml(conversation.sla || "-")}</dd></div>
        </dl>
        <div class="label-row">
          ${(conversation.labels || []).map((label) => `<span class="badge">${escapeHtml(label)}</span>`).join("")}
        </div>
        ${conversation.privateNote ? `
          <div class="private-note-wrap">
            <strong>Nota interna:</strong>
            <p>${escapeHtml(conversation.privateNote)}</p>
          </div>
        ` : ""}
      </aside>
    </div>
  `;
}

function emptyConversationState() {
  return `
    <div class="empty-conversation">
      <div class="empty-illustration">···</div>
      <h2>Selecciona una conversacion</h2>
      <p>El historial y el cuadro de respuesta apareceran aqui.</p>
      <div class="shortcut-hints">
        <span>Ctrl</span><span>K</span><strong>menu de comandos</strong>
        <span>Ctrl</span><span>/</span><strong>atajos del teclado</strong>
      </div>
    </div>
  `;
}

function conversationMessages(conversation) {
  if (conversation.messages?.length) return conversation.messages;
  return [
    { direction: "incoming", text: conversation.lastMessage, time: conversation.updatedAt },
    { direction: "outgoing", text: "Gracias. Te confirmo internamente y vuelvo con el siguiente paso.", time: "Ahora" }
  ];
}

function addLocalMessage(conversation, text, direction = "outgoing") {
  conversation.messages = conversationMessages(conversation);
  const message = {
    id: crypto.randomUUID(),
    direction,
    text,
    time: "Ahora",
    createdAt: new Date().toISOString()
  };

  conversation.messages.push(message);
  conversation.lastMessage = text;
  conversation.updatedAt = "Ahora";
  if (conversation.status === "Resuelta") conversation.status = "Abierta";
  return message;
}

function messageBubble(message, conversation) {
  const isAgent = message.direction === "outgoing";
  const directionClass = isAgent ? "agent" : "customer";
  const ticks = isAgent ? `<span class="chatwoot-bubble-ticks">✓</span>` : "";
  const avatarBg = isAgent ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : getAvatarGradient(conversation?.contact || "Contacto");
  const avatarInitials = isAgent ? (conversation?.owner ? initials(conversation.owner) : "A") : initials(conversation?.contact || "C");

  return `
    <div class="chatwoot-bubble-wrap ${directionClass}">
      <div class="chatwoot-bubble-avatar" style="background: ${avatarBg}">${avatarInitials}</div>
      <div class="chatwoot-bubble">
        <span class="chatwoot-bubble-text">${escapeHtml(message.text)}</span>
        <div class="chatwoot-bubble-meta">
          <span class="chatwoot-bubble-time">${escapeHtml(message.time || "Ahora")}</span>
          ${ticks}
        </div>
      </div>
    </div>
  `;
}

function sendButtonLabel() {
  if (state.preferences.composer.ctrlEnterKey === "send") return "Enviar (Ctrl + ↵)";
  if (state.preferences.composer.enterKey === "send") return "Enviar (↵)";
  return "Enviar";
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function renderChannels() {
  const visibleChannels = state.channels.filter((channel) => isChannelEnabled(channelNameFromId(channel.id)));
  viewRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Integraciones nativas</p>
          <h2>Canales de mensajeria</h2>
        </div>
      </div>
      <div class="channel-grid">
        ${visibleChannels.map(channelCard).join("") || empty("No hay canales visibles. Activalos desde Ajustes.")}
      </div>
    </section>
  `;
}

function renderAutomations() {
  viewRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Automatizacion comercial</p>
          <h2>Flujos sobre mensajes y CRM</h2>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Flujo</th>
              <th>Disparador</th>
              <th>Accion</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${state.automations
              .map(
                (flow) => `
                  <tr>
                    <td><strong>${escapeHtml(flow.name)}</strong></td>
                    <td>${escapeHtml(flow.trigger)}</td>
                    <td>${escapeHtml(flow.action)}</td>
                    <td><span class="badge ${badgeTone(flow.status)}">${escapeHtml(flow.status)}</span></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTeams() {
  viewRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Operacion por equipos</p>
          <h2>Asignacion, colas y rendimiento</h2>
        </div>
      </div>
      <div class="channel-grid">
        ${state.teams
          .map(
            (team) => `
              <article class="record-card channel-card">
                <div class="conversation-topline">
                  <strong>${escapeHtml(team.name)}</strong>
                  <span class="badge warning">${team.open} abiertas</span>
                </div>
                <div class="record-meta">
                  <span>${team.agents} agentes</span>
                  <span>${escapeHtml(team.routing)}</span>
                </div>
                <dl class="detail-list">
                  <div><dt>Primera respuesta</dt><dd>${escapeHtml(team.firstResponse)}</dd></div>
                  <div><dt>Resolucion</dt><dd>${escapeHtml(team.resolution)}</dd></div>
                </dl>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMacros() {
  viewRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Productividad de agentes</p>
          <h2>Macros de acciones multiples</h2>
        </div>
      </div>
      <div class="channel-grid">
        ${state.macros
          .map(
            (macro) => `
              <article class="record-card channel-card">
                <div class="conversation-topline">
                  <strong>${escapeHtml(macro.name)}</strong>
                  <span class="badge">${escapeHtml(macro.visibility)}</span>
                </div>
                <div class="macro-actions">
                  ${macro.actions.map((action) => `<span>${escapeHtml(action)}</span>`).join("")}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function metric(label, value, change) {
  return `
    <article class="metric-card">
      <p class="metric-label">${label}</p>
      <p class="metric-value"><span>${value}</span><span class="metric-change">${change}</span></p>
    </article>
  `;
}

function pipelineMarkup() {
  const columns = statusByType.deals;
  return `
    <div class="pipeline">
      ${columns
        .map((status) => {
          const deals = state.records.deals.filter((deal) => deal.status === status);
          return `
            <div class="pipeline-column">
              <div class="column-title"><span>${status}</span><span>${money(deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0))}</span></div>
              ${deals.map(recordCard).join("") || empty("Sin oportunidades")}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function recordCard(record) {
  return `
    <article class="record-card">
      <strong>${escapeHtml(record.name)}</strong>
      <span>${escapeHtml(record.company || "Sin empresa")}</span>
      <div class="record-meta">
        <span class="badge ${badgeTone(record.status)}">${escapeHtml(record.status)}</span>
        <span>${money(record.value)}</span>
        <span>${escapeHtml(record.owner || "Sin responsable")}</span>
      </div>
    </article>
  `;
}

function conversationCard(conversation, active = false) {
  return `
    <article class="record-card conversation-card ${active ? "active" : ""}">
      <div class="conversation-topline">
        <strong>${escapeHtml(conversation.contact)}</strong>
        <span class="badge ${channelTone(conversation.channel)}">${escapeHtml(conversation.channel)}</span>
      </div>
      <span>${escapeHtml(conversation.company || "Sin empresa")}</span>
      <p>${escapeHtml(conversation.lastMessage)}</p>
      <div class="label-row">
        ${(conversation.labels || []).map((label) => `<span class="badge">${escapeHtml(label)}</span>`).join("")}
      </div>
      <div class="record-meta">
        <span class="badge ${badgeTone(conversation.status)}">${escapeHtml(conversation.status)}</span>
        <span>${escapeHtml(conversation.team || "Sin equipo")}</span>
        <span>${escapeHtml(conversation.priority)}</span>
        <span>${escapeHtml(conversation.owner)}</span>
        <span>SLA ${escapeHtml(conversation.sla || "-")}</span>
        <span>${escapeHtml(conversation.updatedAt)}</span>
      </div>
    </article>
  `;
}

function getAvatarGradient(name) {
  const hash = Array.from(name || "").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "linear-gradient(135deg, #12c2e9, #c471ed, #f64f59)",
    "linear-gradient(135deg, #00b09b, #96c93d)",
    "linear-gradient(135deg, #8a2387, #e94057, #f27121)",
    "linear-gradient(135deg, #f12711, #f5af19)",
    "linear-gradient(135deg, #654ea3, #eaafc8)",
    "linear-gradient(135deg, #FF416C, #FF4B2B)",
    "linear-gradient(135deg, #11998e, #38ef7d)",
    "linear-gradient(135deg, #1D976C, #93F9B9)"
  ];
  return colors[hash % colors.length];
}

function inboxConversationCard(conversation, active = false, showChannel = false) {
  const isAgent = conversation.messages && conversation.messages[conversation.messages.length - 1]?.direction === "outgoing";
  const ticks = isAgent ? `<span class="chatwoot-ticks">✓</span> ` : "";
  const avatarBg = getAvatarGradient(conversation.contact);
  
  // Dynamic channel indicator
  const channelIcons = {
    WhatsApp: "💬 WhatsApp",
    Instagram: "📸 Instagram",
    Messenger: "Ⓜ Messenger",
    Email: "✉ Email"
  };
  const chInfo = channelIcons[conversation.channel] || `💬 ${conversation.channel}`;

  return `
    <button class="chatwoot-chat-item ${active ? 'active' : ''}" type="button" data-open-conversation="${conversation.id}">
      <div class="chatwoot-item-avatar" style="background: ${avatarBg}">${initials(conversation.contact)}</div>
      <div class="chatwoot-item-content">
        <div class="chatwoot-item-meta-row">
          <span class="chatwoot-item-inbox">${chInfo}</span>
          <span class="chatwoot-item-assignee">${escapeHtml(conversation.owner || "Sin asignar")} · ${escapeHtml(conversation.updatedAt)}</span>
        </div>
        <strong class="chatwoot-item-name">${escapeHtml(conversation.contact)}</strong>
        <p class="chatwoot-item-msg">${ticks}${escapeHtml(conversation.lastMessage)}</p>
      </div>
    </button>
  `;
}

function channelCard(channel) {
  const hasConfig = channel.config ? "✓ Configurado" : "Sin configurar";
  return `
    <article class="record-card channel-card" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
      <div>
        <div class="conversation-topline">
          <strong>${escapeHtml(channel.name)}</strong>
          <span class="badge ${badgeTone(channel.status)}">${escapeHtml(channel.status)}</span>
        </div>
        <span style="color: var(--muted); font-size: 0.84rem;">${escapeHtml(channel.provider)}</span>
        <p style="margin-top: 8px; font-size: 0.86rem; line-height: 1.4; color: var(--text);">${escapeHtml(channel.capability)}</p>
        ${channel.config ? `<small style="display: block; margin-top: 6px; color: var(--success); font-weight: 700;">${hasConfig}</small>` : `<small style="display: block; margin-top: 6px; color: var(--muted);">${hasConfig}</small>`}
      </div>
      <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
        <button class="primary-button compact" type="button" data-configure-channel="${channel.id}">Configurar</button>
      </div>
    </article>
  `;
}

function tableMarkup(records) {
  if (!records.length) return empty("No hay registros que coincidan con la busqueda.");

  return `
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Cuenta</th>
          <th>Estado</th>
          <th>Valor</th>
          <th>Responsable</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .map(
            (record) => `
              <tr>
                <td><strong>${escapeHtml(record.name)}</strong></td>
                <td>${escapeHtml(record.company || "-")}</td>
                <td><span class="badge ${badgeTone(record.status)}">${escapeHtml(record.status)}</span></td>
                <td>${money(record.value)}</td>
                <td>${escapeHtml(record.owner || "-")}</td>
                <td>${escapeHtml(record.notes || "-")}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderModule(type) {
  const label = modules.find((item) => item.id === type)?.label || "Registros";
  const records = filteredRecords(type);

  viewRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${label}</p>
          <h2>${records.length} registros</h2>
        </div>
        <div class="split-actions">
          <button class="secondary-button" type="button" data-export="${type}">Exportar CSV</button>
          <button class="primary-button" type="button" data-open-create="${type}">+ Crear</button>
        </div>
      </div>
      <div class="table-wrap">${tableMarkup(records)}</div>
    </section>
  `;
}

function renderReports() {
  const deals = state.records.deals;
  const total = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0) || 1;
  const byStatus = statusByType.deals.map((status) => ({
    status,
    value: deals.filter((deal) => deal.status === status).reduce((sum, deal) => sum + Number(deal.value || 0), 0)
  }));

  viewRoot.innerHTML = `
    <div class="metric-grid">
      ${metric("Ingresos potenciales", money(total), "Pipeline")}
      ${metric("Ticket promedio", money(total / Math.max(deals.length, 1)), "Ventas")}
      ${metric("Conversion cerrada", `${Math.round((deals.filter((deal) => deal.status === "Cerrado").length / Math.max(deals.length, 1)) * 100)}%`, "CRM")}
      ${metric("Campañas activas", state.records.campaigns.filter((campaign) => campaign.status === "Activa").length, "Marketing")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Analitica</p>
          <h2>Valor por etapa de ventas</h2>
        </div>
      </div>
      <div class="report-bars">
        ${byStatus
          .map(
            (row) => `
              <div class="bar-row">
                <span>${row.status}</span>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.max((row.value / total) * 100, row.value ? 8 : 0)}%"></div></div>
                <strong>${money(row.value)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSettings() {
  viewRoot.innerHTML = `
    <section class="panel settings-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Configuracion</p>
          <h2>Visibilidad de la app</h2>
        </div>
      </div>
      <div class="settings-grid">
        <article class="settings-block">
          <div>
            <p class="eyebrow">Menu principal</p>
            <h3>Modulos visibles</h3>
          </div>
          <div class="toggle-list">
            ${modules.map(moduleToggle).join("")}
          </div>
        </article>

        <article class="settings-block">
          <div>
            <p class="eyebrow">Mensajeria</p>
            <h3>Canales visibles</h3>
          </div>
          <div class="toggle-list">
            ${["WhatsApp", "Instagram", "Messenger", "Email", "SMS", "Web Chat"].map(channelToggle).join("")}
          </div>
        </article>

        <article class="settings-block">
          <div>
            <p class="eyebrow">Layout</p>
            <h3>Elementos visibles</h3>
          </div>
          <div class="toggle-list">
            ${layoutToggle("showSidebar", "Barra lateral", "Menu completo de la izquierda")}
            ${layoutToggle("showBrand", "Marca superior", "Logo y nombre Alvis CRM")}
            ${layoutToggle("showNavCounts", "Contadores del menu", "Numeros junto a cada modulo")}
            ${layoutToggle("showSidebarFooter", "Estado inferior", "Aviso de guardado local")}
            ${layoutToggle("showChannelHeader", "Cabecera del canal", "Barra verde/visual de WhatsApp, Instagram, etc.")}
            ${layoutToggle("showChannelTools", "Botones del canal", "Plantillas, etiquetas, catalogo y similares")}
            ${layoutToggle("showContactPanel", "Panel de contacto", "Columna derecha con datos del cliente")}
          </div>
        </article>

        <article class="settings-block">
          <div>
            <p class="eyebrow">Teclado</p>
            <h3>Envio de mensajes</h3>
          </div>
          <div class="composer-settings">
            ${composerKeySelect("enterKey", "Enter")}
            ${composerKeySelect("ctrlEnterKey", "Ctrl + Enter")}
          </div>
        </article>

        <article class="settings-block">
          <div>
            <p class="eyebrow">Sistema</p>
            <h3>Estado actual</h3>
          </div>
          <div class="list-stack">
            <div class="settings-summary"><span>Modulos activos</span><strong>${state.preferences.enabledModules.length}</strong></div>
            <div class="settings-summary"><span>Canales activos</span><strong>${state.preferences.enabledChannels.length}</strong></div>
            <div class="settings-summary"><span>Persistencia</span><strong>${apiAvailable ? "API local" : "Navegador"}</strong></div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderManager() {
  const activeKPIs = activeManagerTab === "kpis" ? "active" : "";
  const activeTeams = activeManagerTab === "teams" ? "active" : "";
  const activeSchedule = activeManagerTab === "schedule" ? "active" : "";
  const activeFlows = activeManagerTab === "flows" ? "active" : "";

  // Dynamic KPI calculations
  const totalConvs = state.conversations.length || 1;
  const resolvedConvs = state.conversations.filter(c => c.status === "Resuelta").length;
  const slaSuccess = state.conversations.filter(c => c.sla === "Cumplido" || c.status === "Resuelta").length;
  const slaCompliance = Math.round((slaSuccess / totalConvs) * 100);

  // Active workload per team
  const teamsWorkloadMarkup = state.teams.map(team => {
    const assignedChats = state.conversations.filter(c => c.team === team.name && c.status !== "Resuelta").length;
    const maxCapacity = team.agents * (state.managerSettings?.agentCapacity || 5);
    const capacityPct = Math.min(Math.round((assignedChats / (maxCapacity || 1)) * 100), 100);
    return `
      <div class="team-load-card">
        <div class="team-load-header">
          <strong>${escapeHtml(team.name)}</strong>
          <span>${assignedChats} / ${maxCapacity} chats</span>
        </div>
        <div class="team-load-bar-track">
          <div class="team-load-bar-fill ${capacityPct > 80 ? 'danger' : capacityPct > 50 ? 'warning' : 'success'}" style="width: ${capacityPct}%"></div>
        </div>
        <small class="team-load-meta">${team.agents} agentes activos · Enrutamiento: ${escapeHtml(team.routing)}</small>
      </div>
    `;
  }).join("");

  // Tab Content HTML
  let tabContent = "";

  if (activeManagerTab === "kpis") {
    tabContent = `
      <div class="metric-grid">
        ${metric("SLA Cumplido", `${slaCompliance}%`, "Meta comercial: >80%")}
        ${metric("Tiempo primera respuesta", "2m 15s", "Promedio global")}
        ${metric("CSAT Estimado", "4.8 / 5.0", "Satisfaccion general")}
        ${metric("Agentes conectados", state.teams.reduce((sum, t) => sum + t.agents, 0), "En linea")}
      </div>
      
      <div class="content-grid manager-kpis-grid">
        <section class="panel manager-sub-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Carga de trabajo</p>
              <h2>Capacidad por equipo</h2>
            </div>
          </div>
          <div class="team-load-stack">
            ${teamsWorkloadMarkup}
          </div>
        </section>

        <section class="panel manager-sub-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Estado de colas</p>
              <h2>Conversaciones activas</h2>
            </div>
          </div>
          <div class="queue-status-stack">
            <div class="queue-stat-row">
              <span>Abiertas</span>
              <strong>${state.conversations.filter(c => c.status === "Abierta").length}</strong>
            </div>
            <div class="queue-stat-row">
              <span>Pendientes</span>
              <strong>${state.conversations.filter(c => c.status === "Pendiente").length}</strong>
            </div>
            <div class="queue-stat-row">
              <span>Resueltas</span>
              <strong>${resolvedConvs}</strong>
            </div>
            <div class="queue-stat-row border-top">
              <span>Total historico</span>
              <strong>${state.conversations.length}</strong>
            </div>
          </div>
        </section>
      </div>
    `;
  } else if (activeManagerTab === "teams") {
    tabContent = `
      <div class="panel manager-settings-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Equipos y colas</p>
            <h2>Configurar estrategia de enrutamiento</h2>
          </div>
        </div>
        <div class="manager-teams-grid">
          ${state.teams.map(team => `
            <article class="manager-team-card">
              <form class="team-routing-form" data-team-id="${team.id}">
                <div class="form-group">
                  <label>
                    Nombre del Equipo
                    <input type="text" name="name" value="${escapeHtml(team.name)}" required />
                  </label>
                </div>
                <div class="form-group row-group">
                  <label>
                    Agentes Activos
                    <input type="number" name="agents" value="${team.agents}" min="0" max="100" required />
                  </label>
                  <label>
                    Enrutamiento
                    <select name="routing">
                      <option value="Round-robin" ${team.routing === "Round-robin" ? "selected" : ""}>Round-robin (Ciclico)</option>
                      <option value="Por prioridad" ${team.routing === "Por prioridad" ? "selected" : ""}>Por prioridad (Lead Score)</option>
                      <option value="Carga balanceada" ${team.routing === "Carga balanceada" ? "selected" : ""}>Carga balanceada (Menor carga)</option>
                      <option value="Escalamiento" ${team.routing === "Escalamiento" ? "selected" : ""}>Escalamiento (Por niveles)</option>
                    </select>
                  </label>
                </div>
                <div class="team-card-actions">
                  <span class="capacity-badge">Capacidad maxima: ${team.agents * (state.managerSettings?.agentCapacity || 5)} chats</span>
                  <button class="primary-button compact" type="submit">Guardar equipo</button>
                </div>
              </form>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  } else if (activeManagerTab === "schedule") {
    const settings = state.managerSettings || {
      businessHours: { activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"], startHour: "09:00", endHour: "18:00" },
      slaLimits: { Alta: 15, Media: 60, Baja: 240 },
      agentCapacity: 5
    };
    const days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
    
    tabContent = `
      <div class="panel manager-settings-panel">
        <form id="managerSettingsForm" class="manager-form-layout">
          <div class="manager-form-section">
            <div class="section-title">
              <span class="icon">⏰</span>
              <div>
                <h3>Horario Comercial</h3>
                <small>Define cuando esta activo el enrutamiento automatico y el calculo de SLAs.</small>
              </div>
            </div>
            <div class="days-checkbox-grid">
              ${days.map(d => {
                const checked = settings.businessHours.activeDays.includes(d) ? "checked" : "";
                return `
                  <label class="day-checkbox-label">
                    <input type="checkbox" name="activeDays" value="${d}" ${checked} />
                    <span>${d}</span>
                  </label>
                `;
              }).join("")}
            </div>
            <div class="form-group row-group time-inputs">
              <label>
                Hora de apertura
                <input type="time" name="startHour" value="${settings.businessHours.startHour}" required />
              </label>
              <label>
                Hora de cierre
                <input type="time" name="endHour" value="${settings.businessHours.endHour}" required />
              </label>
            </div>
          </div>

          <div class="manager-form-section border-top">
            <div class="section-title">
              <span class="icon">⏱</span>
              <div>
                <h3>Limites de SLA (Minutos)</h3>
                <small>Tiempo de primera respuesta esperado por nivel de prioridad antes de alarmar.</small>
              </div>
            </div>
            <div class="form-group row-group sla-inputs">
              <label>
                Prioridad Alta (minutos)
                <input type="number" name="slaAlta" value="${settings.slaLimits.Alta}" min="1" max="1440" required />
              </label>
              <label>
                Prioridad Media (minutos)
                <input type="number" name="slaMedia" value="${settings.slaLimits.Media}" min="1" max="1440" required />
              </label>
              <label>
                Prioridad Baja (minutos)
                <input type="number" name="slaBaja" value="${settings.slaLimits.Baja}" min="1" max="1440" required />
              </label>
            </div>
          </div>

          <div class="manager-form-section border-top">
            <div class="section-title">
              <span class="icon">👤</span>
              <div>
                <h3>Capacidad de los Agentes</h3>
                <small>Establece el numero maximo de conversaciones simultaneas asignables por agente.</small>
              </div>
            </div>
            <div class="form-group slider-group">
              <div class="slider-header">
                <span>Chats maximos simultaneos</span>
                <strong id="agentCapacityValue">${settings.agentCapacity}</strong>
              </div>
              <input type="range" name="agentCapacity" min="1" max="15" value="${settings.agentCapacity}" id="agentCapacitySlider" />
            </div>
          </div>

          <div class="form-actions border-top">
            <button class="primary-button" type="submit">Guardar configuracion global</button>
          </div>
        </form>
      </div>
    `;
  } else if (activeManagerTab === "flows") {
    tabContent = `
      <div class="content-grid manager-flows-grid">
        <div class="manager-flows-left-stack">
          <section class="panel manager-sub-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Canales nativos</p>
                <h2>Estado de integraciones</h2>
              </div>
            </div>
            <div class="manager-channels-list">
              ${state.channels.map(channel => `
                <div class="manager-channel-row">
                  <div class="channel-info">
                    <strong>${escapeHtml(channel.name)}</strong>
                    <small>${escapeHtml(channel.provider)}</small>
                  </div>
                  <select class="channel-status-select" data-channel-id="${channel.id}">
                    <option value="Diseñado" ${channel.status === "Diseñado" ? "selected" : ""}>Diseñado</option>
                    <option value="Planificado" ${channel.status === "Planificado" ? "selected" : ""}>Planificado</option>
                    <option value="Activo" ${channel.status === "Activo" ? "selected" : ""}>Activo</option>
                  </select>
                </div>
              `).join("")}
            </div>
          </section>

          <section class="panel manager-sub-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Flujos de trabajo</p>
                <h2>Automatizaciones activas</h2>
              </div>
            </div>
            <div class="manager-automations-list">
              ${state.automations.map(flow => {
                const checked = flow.status === "Activa" ? "checked" : "";
                return `
                  <div class="manager-automation-row">
                    <div class="automation-info">
                      <strong>${escapeHtml(flow.name)}</strong>
                      <small>${escapeHtml(flow.trigger)} → ${escapeHtml(flow.action)}</small>
                    </div>
                    <label class="switch-toggle">
                      <input type="checkbox" class="automation-status-toggle" data-automation-id="${flow.id}" ${checked} />
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                `;
              }).join("")}
            </div>
          </section>
        </div>

        <div class="manager-flows-right-stack">
          <section class="panel manager-sub-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Nueva regla</p>
                <h2>Crear automatizacion</h2>
              </div>
            </div>
            <form id="createAutomationForm" class="manager-form-layout compact">
              <label>
                Nombre del Flujo
                <input type="text" name="name" placeholder="Ej. Notificar demora soporte" required />
              </label>
              <label>
                Disparador (Trigger)
                <input type="text" name="trigger" placeholder="Ej. Chat sin responder por 10m" required />
              </label>
              <label>
                Accion (Action)
                <input type="text" name="action" placeholder="Ej. Enviar plantilla alerta" required />
              </label>
              <button class="primary-button full-width" type="submit">Crear automatizacion</button>
            </form>
          </section>

          <section class="panel manager-sub-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Plantilla de macros</p>
                <h2>Crear macro de agentes</h2>
              </div>
            </div>
            <form id="createMacroForm" class="manager-form-layout compact">
              <label>
                Nombre de la Macro
                <input type="text" name="name" placeholder="Ej. Cerrar y reportar spam" required />
              </label>
              <label>
                Visibilidad
                <select name="visibility">
                  <option value="Publica">Publica (Todos los agentes)</option>
                  <option value="Privada">Privada (Solo tu)</option>
                </select>
              </label>
              <label>
                Acciones (Separadas por comas)
                <textarea name="actions" rows="3" placeholder="Ej. Asignar equipo: Ventas, Agregar etiqueta: spam, Cerrar conversacion" required></textarea>
              </label>
              <button class="primary-button full-width" type="submit">Crear macro</button>
            </form>
          </section>
        </div>
      </div>
    `;
  }

  viewRoot.innerHTML = `
    <div class="manager-shell">
      <div class="manager-tabs">
        <button class="manager-tab-btn ${activeKPIs}" data-manager-tab="kpis">📈 Monitoreo y KPIs</button>
        <button class="manager-tab-btn ${activeTeams}" data-manager-tab="teams">👥 Equipos y Enrutamiento</button>
        <button class="manager-tab-btn ${activeSchedule}" data-manager-tab="schedule">⏰ Horario y SLAs</button>
        <button class="manager-tab-btn ${activeFlows}" data-manager-tab="flows">⚡ Canales y Automatizacion</button>
      </div>
      <div class="manager-tab-content">
        ${tabContent}
      </div>
    </div>
  `;

  // Attach event listeners for the interactive controls inside renderManager
  attachManagerEventListeners();
}

function attachManagerEventListeners() {
  // Tab changing click handler
  const tabBtns = viewRoot.querySelectorAll(".manager-tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      activeManagerTab = btn.dataset.managerTab;
      renderManager();
    });
  });

  // Slider change real-time value display
  const slider = viewRoot.querySelector("#agentCapacitySlider");
  const sliderVal = viewRoot.querySelector("#agentCapacityValue");
  if (slider && sliderVal) {
    slider.addEventListener("input", (e) => {
      sliderVal.textContent = e.target.value;
    });
  }

  // Settings form submission
  const settingsForm = viewRoot.querySelector("#managerSettingsForm");
  if (settingsForm) {
    settingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(settingsForm);
      const activeDays = formData.getAll("activeDays");
      const startHour = formData.get("startHour");
      const endHour = formData.get("endHour");
      const slaAlta = formData.get("slaAlta");
      const slaMedia = formData.get("slaMedia");
      const slaBaja = formData.get("slaBaja");
      const agentCapacity = formData.get("agentCapacity");

      updateManagerSettings({
        businessHours: { activeDays, startHour, endHour },
        slaLimits: { Alta: Number(slaAlta), Media: Number(slaMedia), Baja: Number(slaBaja) },
        agentCapacity: Number(agentCapacity)
      }).then(() => {
        alert("Configuracion del supervisor guardada correctamente.");
        render();
      }).catch(err => alert(err.message));
    });
  }

  // Team editing form submissions
  const teamForms = viewRoot.querySelectorAll(".team-routing-form");
  teamForms.forEach(form => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const teamId = form.dataset.teamId;
      const formData = new FormData(form);
      const name = formData.get("name");
      const agents = formData.get("agents");
      const routing = formData.get("routing");

      updateTeamOnServer(teamId, {
        name,
        agents: Number(agents),
        routing
      }).then(() => {
        alert("Equipo actualizado correctamente.");
        render();
      }).catch(err => alert(err.message));
    });
  });

  // Channel status updates
  const channelSelects = viewRoot.querySelectorAll(".channel-status-select");
  channelSelects.forEach(select => {
    select.addEventListener("change", () => {
      const channelId = select.dataset.channelId;
      const status = select.value;
      updateChannelOnServer(channelId, status).then(() => {
        render();
      }).catch(err => alert(err.message));
    });
  });

  // Automation toggles
  const autoToggles = viewRoot.querySelectorAll(".automation-status-toggle");
  autoToggles.forEach(toggle => {
    toggle.addEventListener("change", () => {
      const id = toggle.dataset.automationId;
      const status = toggle.checked ? "Activa" : "Borrador";
      updateAutomationOnServer(id, { status }).then(() => {
        // Redraw if needed
      }).catch(err => alert(err.message));
    });
  });

  // Create automation form
  const createAutoForm = viewRoot.querySelector("#createAutomationForm");
  if (createAutoForm) {
    createAutoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(createAutoForm);
      const name = formData.get("name");
      const trigger = formData.get("trigger");
      const action = formData.get("action");

      const newFlow = {
        id: crypto.randomUUID(),
        name,
        trigger,
        action,
        status: "Activa"
      };

      createAutomationOnServer(newFlow).then(() => {
        alert("Flujo de automatizacion creado y activado.");
        createAutoForm.reset();
        renderManager();
      }).catch(err => alert(err.message));
    });
  }

  // Create macro form
  const createMacroForm = viewRoot.querySelector("#createMacroForm");
  if (createMacroForm) {
    createMacroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(createMacroForm);
      const name = formData.get("name");
      const visibility = formData.get("visibility");
      const rawActions = formData.get("actions") || "";
      const actions = rawActions.split(",").map(a => a.trim()).filter(Boolean);

      const newMacro = {
        id: crypto.randomUUID(),
        name,
        visibility,
        actions
      };

      createMacroOnServer(newMacro).then(() => {
        alert("Macro de agentes creada con exito.");
        createMacroForm.reset();
        renderManager();
      }).catch(err => alert(err.message));
    });
  }
}

function layoutToggle(key, label, description) {
  const checked = state.preferences.layout[key] ? "checked" : "";
  return `
    <label class="toggle-row">
      <input type="checkbox" data-toggle-layout="${key}" ${checked} />
      <span>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(description)}</small>
      </span>
    </label>
  `;
}

function composerKeySelect(key, label) {
  const value = state.preferences.composer[key];
  return `
    <label>
      ${escapeHtml(label)}
      <select data-composer-key="${key}">
        <option value="send" ${value === "send" ? "selected" : ""}>Enviar mensaje</option>
        <option value="newline" ${value === "newline" ? "selected" : ""}>Crear salto de linea</option>
      </select>
    </label>
  `;
}

function moduleToggle(module) {
  const checked = isModuleEnabled(module.id) ? "checked" : "";
  const disabled = module.locked ? "disabled" : "";
  return `
    <label class="toggle-row ${module.locked ? "locked" : ""}">
      <input type="checkbox" data-toggle-module="${module.id}" ${checked} ${disabled} />
      <span>
        <strong>${escapeHtml(module.label)}</strong>
        <small>${module.locked ? "Siempre visible" : "Se puede ocultar"}</small>
      </span>
    </label>
  `;
}

function channelToggle(channel) {
  const checked = isChannelEnabled(channel) ? "checked" : "";
  return `
    <label class="toggle-row">
      <input type="checkbox" data-toggle-channel="${escapeHtml(channel)}" ${checked} />
      <span>
        <strong>${escapeHtml(channel)}</strong>
        <small>${isChannelEnabled(channel) ? "Visible en Inbox" : "Oculto"}</small>
      </span>
    </label>
  `;
}

function empty(message) {
  return `<div class="empty-state">${message}</div>`;
}

function badgeTone(status) {
  if (["Cliente", "Activa", "Cerrado", "Completada", "Resuelto", "Finalizada"].includes(status)) return "success";
  if (["En riesgo", "Abierto"].includes(status)) return "danger";
  if (["Hoy", "En curso", "Negociacion", "En revision", "Activa", "Diseñado", "Esperando respuesta"].includes(status)) return "warning";
  return "";
}

function channelTone(channel) {
  if (channel === "WhatsApp") return "success";
  if (channel === "Instagram") return "warning";
  if (channel === "Messenger") return "";
  return "";
}

function channelClass(channel) {
  return String(channel || "").toLowerCase().replaceAll(" ", "-");
}

function channelNameFromId(id) {
  return {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    messenger: "Messenger",
    email: "Email",
    sms: "SMS",
    webchat: "Web Chat"
  }[id] || id;
}

function openCreateModal(type = state.activeView) {
  const safeType = statusByType[type] ? type : "contacts";
  recordType.value = safeType;
  updateStatusOptions();
  document.querySelector("#modalTitle").textContent = `Nuevo ${labelSingular(safeType)}`;
  recordForm.reset();
  recordType.value = safeType;
  updateStatusOptions();
  recordDialog.showModal();
}

function openChannelConfigModal(channelId) {
  const channel = state.channels.find(c => c.id === channelId);
  if (!channel) return;

  const dialog = document.querySelector("#channelConfigDialog");
  const form = document.querySelector("#channelConfigForm");
  const title = document.querySelector("#channelConfigTitle");
  const fields = document.querySelector("#channelConfigFields");
  const configChannelId = document.querySelector("#configChannelId");

  if (!dialog || !form || !fields) return;

  configChannelId.value = channel.id;
  title.textContent = `Configurar ${channel.name}`;
  form.reset();

  const config = channel.config || {};

  let html = "";
  if (channel.id === "whatsapp") {
    html = `
      <label class="full-field">
        Phone Number ID (Meta Developer)
        <input type="text" name="phoneId" value="${escapeHtml(config.phoneId)}" placeholder="Ej. 1093850284938" required />
      </label>
      <label class="full-field">
        WhatsApp Business Account ID
        <input type="text" name="businessAccountId" value="${escapeHtml(config.businessAccountId)}" placeholder="Ej. 2093850284938" required />
      </label>
      <label class="full-field">
        Meta API Access Token (System User)
        <input type="password" name="accessToken" value="${escapeHtml(config.accessToken)}" placeholder="EAAG..." required />
      </label>
      <label class="full-field">
        Webhook Verification Token (Opcional)
        <input type="text" name="verifyToken" value="${escapeHtml(config.verifyToken)}" placeholder="alvis-crm-verify-token-123" />
      </label>
    `;
  } else if (channel.id === "instagram" || channel.id === "messenger") {
    html = `
      <label class="full-field">
        Facebook Page ID
        <input type="text" name="pageId" value="${escapeHtml(config.pageId)}" placeholder="Ej. 1058291038" required />
      </label>
      <label class="full-field">
        Page Access Token
        <input type="password" name="pageAccessToken" value="${escapeHtml(config.pageAccessToken)}" placeholder="EAAG..." required />
      </label>
      <label class="full-field">
        App Secret Key (Opcional)
        <input type="password" name="appSecret" value="${escapeHtml(config.appSecret)}" placeholder="3f8a..." />
      </label>
    `;
  } else if (channel.id === "email") {
    html = `
      <label>
        Servidor IMAP (Entrada)
        <input type="text" name="imapHost" value="${escapeHtml(config.imapHost || 'imap.gmail.com')}" placeholder="imap.gmail.com" required />
      </label>
      <label>
        Puerto IMAP
        <input type="number" name="imapPort" value="${config.imapPort || 993}" placeholder="993" required />
      </label>
      <label>
        Servidor SMTP (Salida)
        <input type="text" name="smtpHost" value="${escapeHtml(config.smtpHost || 'smtp.gmail.com')}" placeholder="smtp.gmail.com" required />
      </label>
      <label>
        Puerto SMTP
        <input type="number" name="smtpPort" value="${config.smtpPort || 465}" placeholder="465" required />
      </label>
      <label class="full-field">
        Usuario de Correo
        <input type="email" name="username" value="${escapeHtml(config.username)}" placeholder="soporte@empresa.com" required />
      </label>
      <label class="full-field">
        Contraseña / App Password
        <input type="password" name="password" value="${escapeHtml(config.password)}" placeholder="••••••••••••••••" required />
      </label>
    `;
  } else if (channel.id === "sms") {
    html = `
      <label class="full-field">
        Twilio Account SID
        <input type="text" name="twilioSid" value="${escapeHtml(config.twilioSid)}" placeholder="AC..." required />
      </label>
      <label class="full-field">
        Twilio Auth Token
        <input type="password" name="twilioToken" value="${escapeHtml(config.twilioToken)}" placeholder="••••••••••••••••" required />
      </label>
      <label class="full-field">
        Número remitente (Twilio Phone)
        <input type="text" name="senderPhone" value="${escapeHtml(config.senderPhone)}" placeholder="+1234567890" required />
      </label>
    `;
  } else if (channel.id === "webchat") {
    const titleVal = config.widgetTitle || 'Chatea con Alvis';
    const colorVal = config.widgetColor || '#0f7b6c';
    const welcomeVal = config.welcomeMessage || '¡Hola! ¿En qué te podemos ayudar hoy?';

    const scriptCode = `<!-- Alvis CRM Web Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs) {
    w['AlvisWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];js.id='alvis-widget-script';
    js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','alvisChat','${location.origin || 'http://127.0.0.1:5174'}/widget.js'));
  
  alvisChat('init', {
    title: '${escapeJsString(titleVal)}',
    color: '${escapeJsString(colorVal)}',
    welcomeMessage: '${escapeJsString(welcomeVal)}'
  });
</script>`;

    const jsonCode = JSON.stringify({
      provider: "Alvis CRM",
      channelId: "webchat",
      status: "Activo",
      settings: {
        title: titleVal,
        color: colorVal,
        welcomeMessage: welcomeVal
      }
    }, null, 2);

    html = `
      <label class="full-field">
        Widget Title
        <input type="text" name="widgetTitle" id="webchatTitleInput" value="${escapeHtml(titleVal)}" placeholder="Ej. Chatea con Alvis" required />
      </label>
      <label class="full-field">
        Color del Widget (Hexadecimal)
        <input type="color" name="widgetColor" id="webchatColorInput" value="${colorVal}" required />
      </label>
      <label class="full-field">
        Mensaje de bienvenida automático
        <textarea name="welcomeMessage" id="webchatWelcomeInput" rows="2" placeholder="Ej. ¡Hola! ¿En qué te podemos ayudar hoy?">${escapeHtml(welcomeVal)}</textarea>
      </label>

      <!-- Código de instalación y JSON de integración -->
      <div class="full-field" style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px;">
        <p style="font-weight: bold; font-size: 0.82rem; color: var(--muted); margin: 0 0 6px;">Código de instalación (Widget Script)</p>
        <textarea id="webchatScriptOutput" readonly style="font-family: monospace; font-size: 0.76rem; background: var(--panel-soft); color: var(--text); resize: none; height: 95px; cursor: text; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--line);" onclick="this.select()">${escapeHtml(scriptCode)}</textarea>
      </div>

      <div class="full-field" style="margin-top: 10px;">
        <p style="font-weight: bold; font-size: 0.82rem; color: var(--muted); margin: 0 0 6px;">Configuración en formato JSON (API/Headless)</p>
        <textarea id="webchatJsonOutput" readonly style="font-family: monospace; font-size: 0.76rem; background: var(--panel-soft); color: var(--text); resize: none; height: 95px; cursor: text; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--line);" onclick="this.select()">${escapeHtml(jsonCode)}</textarea>
      </div>
    `;
  } else {
    html = `
      <label class="full-field">
        URL de Conexión / Endpoint API
        <input type="url" name="apiUrl" value="${escapeHtml(config.apiUrl)}" placeholder="https://api.proveedor.com/v1" required />
      </label>
      <label class="full-field">
        Clave API / Token de Autorización
        <input type="password" name="apiKey" value="${escapeHtml(config.apiKey)}" placeholder="sk_..." required />
      </label>
    `;
  }

  fields.innerHTML = html;

  // Real-time updates for Web Chat outputs
  if (channel.id === "webchat") {
    const titleInput = fields.querySelector("#webchatTitleInput");
    const colorInput = fields.querySelector("#webchatColorInput");
    const welcomeInput = fields.querySelector("#webchatWelcomeInput");
    const scriptOutput = fields.querySelector("#webchatScriptOutput");
    const jsonOutput = fields.querySelector("#webchatJsonOutput");

    const updateOutputs = () => {
      const title = titleInput.value || 'Chatea con Alvis';
      const color = colorInput.value || '#0f7b6c';
      const welcome = welcomeInput.value || '';

      const updatedScript = `<!-- Alvis CRM Web Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs) {
    w['AlvisWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];js.id='alvis-widget-script';
    js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','alvisChat','${location.origin || 'http://127.0.0.1:5174'}/widget.js'));
  
  alvisChat('init', {
    title: '${escapeJsString(title)}',
    color: '${escapeJsString(color)}',
    welcomeMessage: '${escapeJsString(welcome)}'
  });
</script>`;

      const updatedJson = JSON.stringify({
        provider: "Alvis CRM",
        channelId: "webchat",
        status: "Activo",
        settings: {
          title: title,
          color: color,
          welcomeMessage: welcome
        }
      }, null, 2);

      scriptOutput.value = updatedScript;
      jsonOutput.value = updatedJson;
    };

    titleInput.addEventListener("input", updateOutputs);
    colorInput.addEventListener("change", updateOutputs);
    welcomeInput.addEventListener("input", updateOutputs);
  }

  dialog.showModal();
}

async function updateChannelConfig(channelId, config) {
  const channel = state.channels.find(c => c.id === channelId);
  if (!channel) return;
  channel.config = config;
  channel.status = "Activo";

  if (!apiAvailable) {
    saveState();
    return channel;
  }

  try {
    const response = await fetch(`/api/channels/${channelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Activo", config })
    });
    if (response.ok) {
      const payload = await response.json();
      Object.assign(channel, payload.channel);
    }
    saveState();
  } catch (error) {
    console.error("No se pudo guardar la configuracion del canal:", error);
  }
  return channel;
}

function labelSingular(type) {
  return {
    contacts: "contacto",
    companies: "empresa",
    deals: "oportunidad",
    tasks: "tarea",
    tickets: "ticket",
    campaigns: "campaña"
  }[type];
}

function updateStatusOptions() {
  recordStatus.innerHTML = statusByType[recordType.value].map((status) => `<option value="${status}">${status}</option>`).join("");
}

function exportCsv(type) {
  const rows = state.records[type] || [];
  const header = ["nombre", "empresa", "estado", "valor", "responsable", "notas", "fecha"];
  const body = rows.map((record) =>
    [record.name, record.company, record.status, record.value, record.owner, record.notes, record.createdAt]
      .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alvis-crm-${type}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJsString(str) {
  return String(str || "").replaceAll("'", "\\'").replaceAll("\n", "\\n");
}

async function sendComposerMessage(composer) {
  if (!composer) return;
  const text = composer.value.trim();
  if (!text) return;

  try {
    let payload;
    if (activeComposerMode === "note") {
      payload = await updateConversation(composer.dataset.conversationId, { privateNote: text });
    } else {
      payload = await createConversationMessage(composer.dataset.conversationId, text);
    }
    replaceConversation(payload.conversation);
    selectedConversationId = payload.conversation.id;
    composer.value = "";
    saveState();
    render();
  } catch (error) {
    alert(error.message);
  }
}

function replaceConversation(conversation) {
  const index = state.conversations.findIndex((item) => item.id === conversation.id);
  if (index >= 0) state.conversations[index] = conversation;
}

async function toggleResolved(conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;

  const nextStatus = conversation.status === "Resuelta" ? "Abierta" : "Resuelta";
  try {
    const payload = await updateConversation(conversationId, { status: nextStatus });
    replaceConversation(payload.conversation);
    selectedConversationId = conversationId;
    saveState();
    render();
  } catch (error) {
    alert(error.message);
  }
}

function insertNewline(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = `${textarea.value.slice(0, start)}\n${textarea.value.slice(end)}`;
  textarea.selectionStart = start + 1;
  textarea.selectionEnd = start + 1;
}

navList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  state.activeView = button.dataset.view;
  saveState();
  render();
});

viewRoot.addEventListener("click", (event) => {
  const createButton = event.target.closest("[data-open-create]");
  const exportButton = event.target.closest("[data-export]");
  const shortcutButton = event.target.closest("[data-view-shortcut]");
  const layoutButton = event.target.closest("[data-layout-toggle]");
  const conversationButton = event.target.closest("[data-open-conversation]");
  const sendButton = event.target.closest("[data-send-message]");
  const tabButton = event.target.closest("[data-conversation-tab]");
  const resolveButton = event.target.closest("[data-toggle-resolved]");
  const compTabButton = event.target.closest("[data-composer-tab]");
  const configureChannelButton = event.target.closest("[data-configure-channel]");

  if (configureChannelButton) {
    const channelId = configureChannelButton.dataset.configureChannel;
    openChannelConfigModal(channelId);
    return;
  }
  if (compTabButton) {
    activeComposerMode = compTabButton.dataset.composerTab;
    render();
    return;
  }
  if (conversationButton) {
    selectedConversationId = conversationButton.dataset.openConversation;
    activeComposerMode = "reply";
    render();
    return;
  }
  if (tabButton) {
    activeConversationTab = tabButton.dataset.conversationTab;
    selectedConversationId = null;
    render();
    return;
  }
  if (resolveButton) {
    toggleResolved(resolveButton.dataset.toggleResolved);
    return;
  }
  if (sendButton) {
    const composer = viewRoot.querySelector(`[data-composer][data-conversation-id="${sendButton.dataset.sendMessage}"]`);
    sendComposerMessage(composer);
    return;
  }
  if (createButton) openCreateModal(createButton.dataset.openCreate);
  if (exportButton) exportCsv(exportButton.dataset.export);
  if (shortcutButton) {
    state.activeView = shortcutButton.dataset.viewShortcut;
    saveState();
    render();
  }
  if (layoutButton) {
    const key = layoutButton.dataset.layoutToggle;
    state.preferences.layout[key] = !state.preferences.layout[key];
    saveState();
    render();
  }
});

viewRoot.addEventListener("change", (event) => {
  const moduleToggle = event.target.closest("[data-toggle-module]");
  const channelToggle = event.target.closest("[data-toggle-channel]");
  const layoutToggle = event.target.closest("[data-toggle-layout]");
  const composerKey = event.target.closest("[data-composer-key]");

  if (event.target.id === "channelSelect") {
    activeInbox = event.target.value;
    selectedConversationId = null;
    render();
    return;
  }

  if (moduleToggle) {
    const moduleId = moduleToggle.dataset.toggleModule;
    const enabled = new Set(state.preferences.enabledModules);
    if (moduleToggle.checked) enabled.add(moduleId);
    else enabled.delete(moduleId);
    state.preferences.enabledModules = normalizePreferences({ ...state.preferences, enabledModules: Array.from(enabled) }).enabledModules;
    saveState();
    render();
    return;
  }

  if (channelToggle) {
    const channel = channelToggle.dataset.toggleChannel;
    const enabled = new Set(state.preferences.enabledChannels);
    if (channelToggle.checked) enabled.add(channel);
    else enabled.delete(channel);
    state.preferences.enabledChannels = normalizePreferences({ ...state.preferences, enabledChannels: Array.from(enabled) }).enabledChannels;
    if (activeInbox !== "all" && !state.preferences.enabledChannels.includes(activeInbox)) activeInbox = state.preferences.enabledChannels[0] || "all";
    saveState();
    render();
    return;
  }

  if (layoutToggle) {
    state.preferences.layout[layoutToggle.dataset.toggleLayout] = layoutToggle.checked;
    saveState();
    render();
    return;
  }

  if (composerKey) {
    state.preferences.composer[composerKey.dataset.composerKey] = composerKey.value;
    saveState();
    render();
  }
});

viewRoot.addEventListener("input", (event) => {
  if (!event.target.matches("[data-inbox-search]")) return;
  inboxSearchTerm = event.target.value.trim();
  clearTimeout(inboxSearchTimer);
  inboxSearchTimer = setTimeout(() => {
    render();
    const searchInput = viewRoot.querySelector("[data-inbox-search]");
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  }, 180);
});

viewRoot.addEventListener("keydown", (event) => {
  const composer = event.target.closest("[data-composer]");
  if (!composer || event.key !== "Enter") return;

  const isCtrlEnter = event.ctrlKey || event.metaKey;
  const action = isCtrlEnter ? state.preferences.composer.ctrlEnterKey : state.preferences.composer.enterKey;
  if (action === "send") {
    event.preventDefault();
    sendComposerMessage(composer);
    return;
  }

  if (isCtrlEnter && action === "newline") {
    event.preventDefault();
    insertNewline(composer);
  }
});

quickAddButton.addEventListener("click", () => openCreateModal());
recordType.addEventListener("change", updateStatusOptions);

sidebarToggle.addEventListener("click", () => {
  state.preferences.layout.showSidebar = !state.preferences.layout.showSidebar;
  saveState();
  render();
});

if (sidebarTogglePersistent) {
  sidebarTogglePersistent.addEventListener("click", () => {
    state.preferences.layout.showSidebar = !state.preferences.layout.showSidebar;
    saveState();
    render();
  });
}

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
  render();
});

globalSearch.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});

recordForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();

  const formData = new FormData(recordForm);
  const type = formData.get("type");
  const record = {
    id: crypto.randomUUID(),
    name: formData.get("name"),
    company: formData.get("company"),
    status: formData.get("status"),
    value: Number(formData.get("value") || 0),
    owner: formData.get("owner"),
    notes: formData.get("notes"),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  createRecord(type, record)
    .then(() => {
      state.activeView = type;
      saveState();
      recordDialog.close();
      render();
    })
    .catch((error) => {
      alert(error.message);
    });
});

const channelConfigForm = document.querySelector("#channelConfigForm");
const channelConfigDialog = document.querySelector("#channelConfigDialog");

if (channelConfigForm && channelConfigDialog) {
  channelConfigForm.addEventListener("submit", (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();

    const formData = new FormData(channelConfigForm);
    const channelId = formData.get("id");

    const config = {};
    formData.forEach((value, key) => {
      if (key !== "id") config[key] = value;
    });

    updateChannelConfig(channelId, config).then(() => {
      channelConfigDialog.close();
      render();
    });
  });
}

render();
bootstrapFromApi();
