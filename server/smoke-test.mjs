import { createAlvisServer } from "../server.mjs";
import { createSeedData } from "./seed.mjs";

const testState = createSeedData();
testState.conversations = [
  { id: "test-conversation-id", channel: "WhatsApp", contact: "Smoke Contact", company: "Smoke Company", inbox: "WhatsApp Principal", team: "Ventas", status: "Abierta", priority: "Alta", labels: ["sales-lead", "vip"], sla: "12 min", lastMessage: "Perfecto, enviame la propuesta.", owner: "Maria R.", updatedAt: "Hace 8 min" }
];
testState.teams = [
  { id: "test-team-id", name: "Soporte", agents: 5, open: 24, firstResponse: "1m 45s", routing: "Round-robin" }
];
testState.automations = [
  { id: "test-automation-id", name: "Asignar lead nuevo", trigger: "Mensaje entrante", action: "Asignar", status: "Activa" }
];

const server = createAlvisServer(testState);

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const health = await getJson(`${baseUrl}/api/health`);
  const bootstrap = await getJson(`${baseUrl}/api/bootstrap`);
  const firstConversation = bootstrap.conversations[0];
  const message = await postJson(`${baseUrl}/api/conversations/${firstConversation.id}/messages`, {
    text: "Mensaje de prueba",
    direction: "outgoing"
  });
  const resolved = await patchJson(`${baseUrl}/api/conversations/${firstConversation.id}`, {
    status: "Resuelta"
  });
  const created = await postJson(`${baseUrl}/api/records`, {
    type: "contacts",
    name: "Smoke Test",
    company: "Alvis",
    status: "Nuevo",
    value: 0,
    owner: "QA",
    notes: "Registro creado por prueba de humo"
  });

  // Test Supervisor APIs
  const settings = await getJson(`${baseUrl}/api/manager/settings`);
  const updatedSettings = await patchJson(`${baseUrl}/api/manager/settings`, {
    agentCapacity: 8
  });
  const firstTeam = bootstrap.teams[0];
  const updatedTeam = await patchJson(`${baseUrl}/api/teams/${firstTeam.id}`, {
    routing: "Carga balanceada"
  });
  const firstAutomation = bootstrap.automations[0];
  const updatedAutomation = await patchJson(`${baseUrl}/api/automations/${firstAutomation.id}`, {
    status: "Borrador"
  });
  const createdMacro = await postJson(`${baseUrl}/api/macros`, {
    name: "Smoke Macro Test",
    visibility: "Publica",
    actions: ["Asignar equipo: Soporte"]
  });
  // Test Development Bypass Auth
  const authBypass = await postJson(`${baseUrl}/api/auth/google`, { credential: "bypass", bypass: true });
  
  // Test Bot Response logic
  // 1. Send incoming message when responder is "bot" (default)
  const incomingMsg = await postJson(`${baseUrl}/api/conversations/${firstConversation.id}/messages`, {
    text: "Hola, me interesa comprar",
    direction: "incoming"
  });
  
  // Verify bot auto-responded in memory
  const bootstrapAfterBot = await getJson(`${baseUrl}/api/bootstrap`);
  const convAfterBot = bootstrapAfterBot.conversations.find(c => c.id === firstConversation.id);
  const lastMsg = convAfterBot.messages[convAfterBot.messages.length - 1];
  
  // 2. Toggle responder to "human"
  const toggledRes = await patchJson(`${baseUrl}/api/conversations/${firstConversation.id}`, {
    responder: "human"
  });
  
  // 3. Send incoming message when responder is "human"
  const incomingMsg2 = await postJson(`${baseUrl}/api/conversations/${firstConversation.id}/messages`, {
    text: "Hola, ¿hay alguien?",
    direction: "incoming"
  });
  
  // Verify bot did NOT respond
  const bootstrapAfterHuman = await getJson(`${baseUrl}/api/bootstrap`);
  const convAfterHuman = bootstrapAfterHuman.conversations.find(c => c.id === firstConversation.id);
  const lastMsg2 = convAfterHuman.messages[convAfterHuman.messages.length - 1];

  assert(health.ok, "health debe responder ok");
  assert(Array.isArray(bootstrap.conversations), "bootstrap debe incluir conversaciones");
  assert(message.message.text === "Mensaje de prueba", "POST de mensaje debe crear mensaje");
  assert(resolved.conversation.status === "Resuelta", "PATCH de conversacion debe actualizar estado");
  assert(created.record.name === "Smoke Test", "POST /api/records debe crear registro");
  assert(settings.businessHours, "settings debe incluir businessHours");
  assert(updatedSettings.agentCapacity === 8, "PATCH de settings debe actualizar agentCapacity");
  assert(updatedTeam.team.routing === "Carga balanceada", "PATCH de equipo debe actualizar enrutamiento");
  assert(updatedAutomation.automation.status === "Borrador", "PATCH de flujo debe actualizar estado");
  assert(createdMacro.macro.name === "Smoke Macro Test", "POST de macro debe crear macro");
  
  assert(authBypass.success && authBypass.agent, "Bypass authentication must succeed");
  assert(lastMsg.direction === "outgoing", "Bot must respond automatically to incoming message");
  assert(lastMsg.text.includes("[Demo Bot"), "Bot response should be mock fallback");
  assert(toggledRes.conversation.responder === "human", "Responder should toggle to human");
  assert(lastMsg2.direction === "incoming", "Bot must NOT respond when responder is human");

  console.log("Smoke test OK");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

async function getJson(url) {
  const response = await fetch(url);
  assert(response.ok, `${url} respondio ${response.status}`);
  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert(response.ok, `${url} respondio ${response.status}`);
  return response.json();
}

async function patchJson(url, payload) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert(response.ok, `${url} respondio ${response.status}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
