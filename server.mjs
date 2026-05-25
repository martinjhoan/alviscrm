import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { createSeedData } from "./server/seed.mjs";

const port = Number(process.env.PORT || 5173);
const root = process.cwd();

const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

export function createAlvisServer(state = createSeedData()) {
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url, state);
      return;
    }

    await serveStatic(url, response);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.HOST || "0.0.0.0";
  createAlvisServer().listen(port, host, () => {
    console.log(`Alvis CRM disponible en http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  });
}

async function handleApi(request, response, url, state) {
  try {
    const messageMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    const conversationMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
    const teamMatch = url.pathname.match(/^\/api\/teams\/([^/]+)$/);
    const automationMatch = url.pathname.match(/^\/api\/automations\/([^/]+)$/);
    const channelPatchMatch = url.pathname.match(/^\/api\/channels\/([^/]+)$/);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "alvis-crm-api" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/bootstrap") {
      sendJson(response, 200, state);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/conversations") {
      sendJson(response, 200, state.conversations);
      return;
    }

    if (request.method === "POST" && messageMatch) {
      const conversation = findConversation(state, messageMatch[1]);
      if (!conversation) {
        sendJson(response, 404, { error: "Conversacion no encontrada" });
        return;
      }

      const payload = await readJson(request);
      const text = String(payload.text || "").trim();
      const direction = payload.direction === "incoming" ? "incoming" : "outgoing";

      if (!text) {
        sendJson(response, 422, { error: "El mensaje no puede estar vacio" });
        return;
      }

      conversation.messages = ensureMessages(conversation);
      const message = {
        id: randomUUID(),
        direction,
        text,
        time: "Ahora",
        createdAt: new Date().toISOString()
      };

      conversation.messages.push(message);
      conversation.lastMessage = text;
      conversation.updatedAt = "Ahora";
      if (conversation.status === "Resuelta") conversation.status = "Abierta";

      sendJson(response, 201, { conversation, message });
      return;
    }

    if (request.method === "PATCH" && conversationMatch) {
      const conversation = findConversation(state, conversationMatch[1]);
      if (!conversation) {
        sendJson(response, 404, { error: "Conversacion no encontrada" });
        return;
      }

      const payload = await readJson(request);
      if (payload.status) conversation.status = String(payload.status);
      if (payload.owner) conversation.owner = String(payload.owner);
      if (payload.priority) conversation.priority = String(payload.priority);
      if (payload.privateNote !== undefined) conversation.privateNote = String(payload.privateNote);
      if (payload.labels) conversation.labels = Array.isArray(payload.labels) ? payload.labels.map(String) : conversation.labels;
      conversation.updatedAt = "Ahora";

      sendJson(response, 200, { conversation });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/channels") {
      sendJson(response, 200, state.channels);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/teams") {
      sendJson(response, 200, state.teams);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/macros") {
      sendJson(response, 200, state.macros);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/records") {
      const payload = await readJson(request);
      const type = payload.type;

      if (!state.records[type]) {
        sendJson(response, 400, { error: "Tipo de registro no valido" });
        return;
      }

      const record = {
        id: randomUUID(),
        name: String(payload.name || "").trim(),
        company: String(payload.company || "").trim(),
        status: String(payload.status || "").trim(),
        value: Number(payload.value || 0),
        owner: String(payload.owner || "").trim(),
        notes: String(payload.notes || "").trim(),
        createdAt: new Date().toISOString().slice(0, 10)
      };

      if (!record.name) {
        sendJson(response, 422, { error: "El nombre es obligatorio" });
        return;
      }

      state.records[type].unshift(record);
      sendJson(response, 201, { type, record });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/manager/settings") {
      if (!state.managerSettings) {
        state.managerSettings = {
          businessHours: {
            activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"],
            startHour: "09:00",
            endHour: "18:00"
          },
          slaLimits: { Alta: 15, Media: 60, Baja: 240 },
          agentCapacity: 5,
          routingMethod: "round-robin"
        };
      }
      sendJson(response, 200, state.managerSettings);
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/manager/settings") {
      const payload = await readJson(request);
      if (!state.managerSettings) state.managerSettings = {};
      if (payload.businessHours) state.managerSettings.businessHours = payload.businessHours;
      if (payload.slaLimits) state.managerSettings.slaLimits = payload.slaLimits;
      if (payload.agentCapacity !== undefined) state.managerSettings.agentCapacity = Number(payload.agentCapacity);
      if (payload.routingMethod) state.managerSettings.routingMethod = String(payload.routingMethod);
      sendJson(response, 200, state.managerSettings);
      return;
    }

    if (request.method === "PATCH" && teamMatch) {
      const team = state.teams.find(t => t.id === teamMatch[1]);
      if (!team) {
        sendJson(response, 404, { error: "Equipo no encontrado" });
        return;
      }
      const payload = await readJson(request);
      if (payload.routing) team.routing = String(payload.routing);
      if (payload.agents !== undefined) team.agents = Number(payload.agents);
      if (payload.name) team.name = String(payload.name);
      sendJson(response, 200, { team });
      return;
    }

    if (request.method === "PATCH" && automationMatch) {
      const automation = state.automations.find(a => a.id === automationMatch[1]);
      if (!automation) {
        sendJson(response, 404, { error: "Flujo no encontrado" });
        return;
      }
      const payload = await readJson(request);
      if (payload.status) automation.status = String(payload.status);
      if (payload.name) automation.name = String(payload.name);
      sendJson(response, 200, { automation });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/automations") {
      const payload = await readJson(request);
      if (!payload.name || !payload.trigger || !payload.action) {
        sendJson(response, 422, { error: "Nombre, disparador y accion son obligatorios" });
        return;
      }
      const automation = {
        id: randomUUID(),
        name: String(payload.name).trim(),
        trigger: String(payload.trigger).trim(),
        action: String(payload.action).trim(),
        status: String(payload.status || "Borrador").trim()
      };
      state.automations.push(automation);
      sendJson(response, 201, { automation });
      return;
    }

    if (request.method === "PATCH" && channelPatchMatch) {
      const channel = state.channels.find(c => c.id === channelPatchMatch[1]);
      if (!channel) {
        sendJson(response, 404, { error: "Canal no encontrado" });
        return;
      }
      const payload = await readJson(request);
      if (payload.status) channel.status = String(payload.status);
      if (payload.config) channel.config = { ...(channel.config || {}), ...payload.config };
      sendJson(response, 200, { channel });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/macros") {
      const payload = await readJson(request);
      if (!payload.name) {
        sendJson(response, 422, { error: "El nombre de la macro es obligatorio" });
        return;
      }
      const macro = {
        id: randomUUID(),
        name: String(payload.name).trim(),
        visibility: String(payload.visibility || "Publica").trim(),
        actions: Array.isArray(payload.actions) ? payload.actions.map(String) : []
      };
      state.macros.push(macro);
      sendJson(response, 201, { macro });
      return;
    }

    sendJson(response, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    sendJson(response, 500, { error: "Error interno", detail: error.message });
  }
}

function findConversation(state, id) {
  return state.conversations.find((conversation) => conversation.id === id);
}

function ensureMessages(conversation) {
  if (Array.isArray(conversation.messages) && conversation.messages.length) return conversation.messages;

  return [
    {
      id: randomUUID(),
      direction: "incoming",
      text: conversation.lastMessage,
      time: conversation.updatedAt,
      createdAt: new Date().toISOString()
    }
  ];
}

async function serveStatic(url, response) {
  try {
    const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = normalize(join(root, requestedPath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": staticTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body, null, 2));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Payload demasiado grande"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido"));
      }
    });
    request.on("error", reject);
  });
}
