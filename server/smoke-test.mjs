import { createAlvisServer } from "../server.mjs";

const server = createAlvisServer();

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
