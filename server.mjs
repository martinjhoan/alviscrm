import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { createSeedData } from "./server/seed.mjs";
import pg from "pg";
const { Pool } = pg;

// Cargador de archivo .env nativo para compatibilidad sin dependencias externas
function loadEnv() {
  try {
    const envPath = join(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // Silencioso si el archivo .env no existe
  }
}
loadEnv();

const dbUrl = process.env.DATABASE_URL;
let pool = null;
if (dbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
  });
}

const port = Number(process.env.PORT || 5173);
const root = process.cwd();

const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon"
};

function formatRelativeTime(date) {
  if (!date) return "Ahora";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr < 24) return `Hace ${diffHr} h`;
  return `Hace ${diffDays} d`;
}

export function createAlvisServer(state) {
  const isMemoryMode = state !== undefined || !dbUrl;
  const memoryState = state || createSeedData();

  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      if (!isMemoryMode) {
        await handleApiDb(request, response, url);
      } else {
        await handleApiMemory(request, response, url, memoryState);
      }
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

// ==========================================
// 1. ENDPOINTS CON CONEXIÓN A POSTGRESQL (PRODUCCIÓN)
// ==========================================
async function handleApiDb(request, response, url) {
  try {
    const messageMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    const conversationMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
    const teamMatch = url.pathname.match(/^\/api\/teams\/([^/]+)$/);
    const automationMatch = url.pathname.match(/^\/api\/automations\/([^/]+)$/);
    const channelPatchMatch = url.pathname.match(/^\/api\/channels\/([^/]+)$/);

    if (request.method === "GET" && url.pathname === "/api/health") {
      try {
        await pool.query("SELECT 1");
        sendJson(response, 200, { ok: true, database: "connected", service: "alvis-crm-api" });
      } catch (err) {
        sendJson(response, 500, { ok: false, database: "disconnected", error: err.message });
      }
      return;
    }

    // Configuración Inicial (Setup Wizard)
    if (request.method === "POST" && url.pathname === "/api/setup") {
      const payload = await readJson(request);
      const { googleClientId, adminEmail, adminName } = payload;
      if (!googleClientId || !adminEmail) {
        sendJson(response, 422, { error: "Google Client ID y Email de Administrador son obligatorios" });
        return;
      }

      await pool.query(`
        INSERT INTO manager_settings (id, google_client_id)
        VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET google_client_id = EXCLUDED.google_client_id, updated_at = NOW()
      `, [googleClientId]);

      const agentId = "a1111111-1111-1111-1111-111111111111";
      await pool.query(`
        INSERT INTO agents (id, name, email, role, active)
        VALUES ($1, $2, $3, 'Administrador', true)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = 'Administrador'
      `, [agentId, adminName || "Administrador", adminEmail.trim().toLowerCase()]);

      process.env.GOOGLE_CLIENT_ID = googleClientId;
      sendJson(response, 200, { success: true, googleClientId });
      return;
    }

    // Autenticación exclusiva con Google
    if (request.method === "POST" && url.pathname === "/api/auth/google") {
      const payload = await readJson(request);
      const { credential } = payload;
      if (!credential) {
        sendJson(response, 400, { error: "Token de credenciales vacio" });
        return;
      }

      const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      let googleUser;
      try {
        const verifyResponse = await fetch(googleVerifyUrl);
        if (!verifyResponse.ok) throw new Error("Fallo la verificacion en Google");
        googleUser = await verifyResponse.json();
      } catch (err) {
        sendJson(response, 401, { error: "No se pudo validar el token con Google", detail: err.message });
        return;
      }

      const email = String(googleUser.email || "").trim().toLowerCase();
      const googleId = googleUser.sub;
      const name = googleUser.name || "Usuario de Google";

      if (!email || !googleId) {
        sendJson(response, 422, { error: "El token de Google no contiene email o sub" });
        return;
      }

      let agent = null;
      const { rows } = await pool.query("SELECT id, name, email, role, active FROM agents WHERE email = $1 LIMIT 1", [email]);
      if (rows.length > 0) {
        agent = rows[0];
        await pool.query("UPDATE agents SET google_id = $1 WHERE id = $2", [googleId, agent.id]);
      } else {
        // Registrar como primer admin o nuevo agente
        const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM agents");
        const isFirst = Number(countRows[0].count) === 0;
        const role = isFirst ? "Administrador" : "Agente";

        const id = randomUUID();
        const { rows: newRows } = await pool.query(
          "INSERT INTO agents (id, name, email, role, google_id, active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, role, active",
          [id, name, email, role, googleId]
        );
        agent = newRows[0];
      }

      sendJson(response, 200, { success: true, agent });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/bootstrap") {
      const data = await bootstrapFromDb();
      sendJson(response, 200, data);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/conversations") {
      const conversations = await loadConversationsFromDb();
      sendJson(response, 200, conversations);
      return;
    }

    if (request.method === "POST" && messageMatch) {
      const conversationId = messageMatch[1];
      const payload = await readJson(request);
      const text = String(payload.text || "").trim();
      const direction = payload.direction === "incoming" ? "incoming" : "outgoing";

      if (!text) {
        sendJson(response, 422, { error: "El mensaje no puede estar vacio" });
        return;
      }

      const messageId = randomUUID();
      await pool.query(
        "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
        [messageId, conversationId, direction, text, false]
      );

      await pool.query(
        "UPDATE conversations SET last_message = $1, updated_at = NOW(), status = CASE WHEN status = 'Resuelta' THEN 'Abierta' ELSE status END WHERE id = $2",
        [text, conversationId]
      );

      const conversation = await loadConversationByIdFromDb(conversationId);
      const message = {
        id: messageId,
        direction,
        text,
        time: "Ahora",
        createdAt: new Date().toISOString()
      };

      sendJson(response, 201, { conversation, message });
      return;
    }

    if (request.method === "PATCH" && conversationMatch) {
      const conversationId = conversationMatch[1];
      const payload = await readJson(request);

      let ownerId = undefined;
      if (payload.owner !== undefined) {
        if (payload.owner === "Sin asignar" || !payload.owner) {
          ownerId = null;
        } else {
          const { rows } = await pool.query("SELECT id FROM agents WHERE name = $1 LIMIT 1", [payload.owner]);
          ownerId = rows.length > 0 ? rows[0].id : null;
        }
      }

      const fields = [];
      const values = [];
      let valIdx = 1;

      if (payload.status !== undefined) {
        fields.push(`status = $${valIdx++}`);
        values.push(payload.status);
      }
      if (ownerId !== undefined) {
        fields.push(`owner_id = $${valIdx++}`);
        values.push(ownerId);
      }
      if (payload.priority !== undefined) {
        fields.push(`priority = $${valIdx++}`);
        values.push(payload.priority);
      }
      if (payload.privateNote !== undefined) {
        fields.push(`private_note = $${valIdx++}`);
        values.push(payload.privateNote);

        await pool.query(
          "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), conversationId, "outgoing", payload.privateNote, true]
        );
      }
      if (payload.labels !== undefined) {
        fields.push(`labels = $${valIdx++}`);
        values.push(payload.labels);
      }

      if (fields.length > 0) {
        fields.push(`updated_at = NOW()`);
        values.push(conversationId);
        await pool.query(`UPDATE conversations SET ${fields.join(", ")} WHERE id = $${valIdx}`, values);
      }

      const conversation = await loadConversationByIdFromDb(conversationId);
      if (!conversation) {
        sendJson(response, 404, { error: "Conversacion no encontrada" });
        return;
      }

      sendJson(response, 200, { conversation });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/channels") {
      const { rows } = await pool.query("SELECT id, name, provider, status, capability, config FROM channels");
      sendJson(response, 200, rows);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/teams") {
      const { rows } = await pool.query("SELECT id, name, routing, agents, open, first_response AS \"firstResponse\", resolution FROM teams");
      sendJson(response, 200, rows);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/macros") {
      const { rows } = await pool.query("SELECT id, name, visibility, actions FROM macros");
      sendJson(response, 200, rows);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/records") {
      const payload = await readJson(request);
      const type = payload.type;

      let ownerId = null;
      if (payload.owner) {
        const { rows } = await pool.query("SELECT id FROM agents WHERE name = $1 LIMIT 1", [payload.owner]);
        if (rows.length > 0) ownerId = rows[0].id;
      }

      let companyId = null;
      if (payload.company) {
        const { rows } = await pool.query("SELECT id FROM companies WHERE name = $1 LIMIT 1", [payload.company]);
        if (rows.length > 0) companyId = rows[0].id;
      }

      const id = randomUUID();
      const recordName = String(payload.name || "").trim();
      if (!recordName) {
        sendJson(response, 422, { error: "El nombre es obligatorio" });
        return;
      }

      if (type === "contacts") {
        await pool.query(
          "INSERT INTO contacts (id, name, company_name, status, value, owner_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [id, recordName, payload.company, payload.status, payload.value || 0, ownerId, payload.notes]
        );
      } else if (type === "companies") {
        await pool.query(
          "INSERT INTO companies (id, name, status, value, owner_id, notes) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, recordName, payload.status, payload.value || 0, ownerId, payload.notes]
        );
      } else if (type === "deals") {
        await pool.query(
          "INSERT INTO deals (id, name, company_id, status, value, owner_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [id, recordName, companyId, payload.status, payload.value || 0, ownerId, payload.notes]
        );
      } else if (type === "tasks") {
        await pool.query(
          "INSERT INTO tasks (id, name, status, owner_id, notes) VALUES ($1, $2, $3, $4, $5)",
          [id, recordName, payload.status, ownerId, payload.notes]
        );
      } else if (type === "tickets") {
        await pool.query(
          "INSERT INTO tickets (id, name, status, owner_id, notes) VALUES ($1, $2, $3, $4, $5)",
          [id, recordName, payload.status, ownerId, payload.notes]
        );
      } else if (type === "campaigns") {
        await pool.query(
          "INSERT INTO campaigns (id, name, status, value, owner_id, notes) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, recordName, payload.status, payload.value || 0, ownerId, payload.notes]
        );
      } else {
        sendJson(response, 400, { error: "Tipo de registro no valido" });
        return;
      }

      const record = {
        id,
        name: recordName,
        company: payload.company || "",
        status: payload.status || "",
        value: Number(payload.value || 0),
        owner: payload.owner || "Sin asignar",
        notes: payload.notes || "",
        createdAt: new Date().toISOString().slice(0, 10)
      };

      sendJson(response, 201, { type, record });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/manager/settings") {
      const { rows } = await pool.query("SELECT business_hours AS \"businessHours\", sla_limits AS \"slaLimits\", agent_capacity AS \"agentCapacity\", routing_method AS \"routingMethod\" FROM manager_settings LIMIT 1");
      const settings = rows[0] || {
        businessHours: { activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"], startHour: "09:00", endHour: "18:00" },
        slaLimits: { Alta: 15, Media: 60, Baja: 240 },
        agentCapacity: 5,
        routingMethod: "round-robin"
      };
      sendJson(response, 200, settings);
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/manager/settings") {
      const payload = await readJson(request);
      const { businessHours, slaLimits, agentCapacity, routingMethod } = payload;
      
      const { rows } = await pool.query(`
        INSERT INTO manager_settings (id, business_hours, sla_limits, agent_capacity, routing_method)
        VALUES (1, $1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          business_hours = COALESCE($1, manager_settings.business_hours),
          sla_limits = COALESCE($2, manager_settings.sla_limits),
          agent_capacity = COALESCE($3, manager_settings.agent_capacity),
          routing_method = COALESCE($4, manager_settings.routing_method),
          updated_at = NOW()
        RETURNING business_hours AS "businessHours", sla_limits AS "slaLimits", agent_capacity AS "agentCapacity", routing_method AS "routingMethod"
      `, [
        businessHours ? JSON.stringify(businessHours) : null,
        slaLimits ? JSON.stringify(slaLimits) : null,
        agentCapacity !== undefined ? Number(agentCapacity) : null,
        routingMethod || null
      ]);

      sendJson(response, 200, rows[0]);
      return;
    }

    if (request.method === "PATCH" && teamMatch) {
      const teamId = teamMatch[1];
      const payload = await readJson(request);
      const { name, agents, routing } = payload;

      const { rows } = await pool.query(`
        UPDATE teams 
        SET 
          name = COALESCE($1, name), 
          agents = COALESCE($2, agents), 
          routing = COALESCE($3, routing) 
        WHERE id = $4
        RETURNING id, name, routing, agents, open, first_response AS "firstResponse", resolution
      `, [name || null, agents !== undefined ? Number(agents) : null, routing || null, teamId]);

      if (rows.length === 0) {
        sendJson(response, 404, { error: "Equipo no encontrado" });
        return;
      }

      sendJson(response, 200, { team: rows[0] });
      return;
    }

    if (request.method === "PATCH" && automationMatch) {
      const automationId = automationMatch[1];
      const payload = await readJson(request);
      const { status, name } = payload;

      const { rows } = await pool.query(`
        UPDATE automations 
        SET status = COALESCE($1, status), name = COALESCE($2, name) 
        WHERE id = $3
        RETURNING id, name, trigger_event AS trigger, action_event AS action, status
      `, [status || null, name || null, automationId]);

      if (rows.length === 0) {
        sendJson(response, 404, { error: "Flujo no encontrado" });
        return;
      }

      sendJson(response, 200, { automation: rows[0] });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/automations") {
      const payload = await readJson(request);
      if (!payload.name || !payload.trigger || !payload.action) {
        sendJson(response, 422, { error: "Nombre, disparador y accion son obligatorios" });
        return;
      }

      const id = randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO automations (id, name, trigger_event, action_event, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, trigger_event AS trigger, action_event AS action, status
      `, [id, payload.name, payload.trigger, payload.action, payload.status || "Borrador"]);

      sendJson(response, 201, { automation: rows[0] });
      return;
    }

    if (request.method === "PATCH" && channelPatchMatch) {
      const channelId = channelPatchMatch[1];
      const payload = await readJson(request);
      const { status, config } = payload;

      const { rows } = await pool.query(`
        UPDATE channels 
        SET 
          status = COALESCE($1, status), 
          config = COALESCE(config, '{}'::jsonb) || $2::jsonb, 
          updated_at = NOW() 
        WHERE id = $3
        RETURNING id, name, provider, status, capability, config
      `, [status || null, config ? JSON.stringify(config) : null, channelId]);

      if (rows.length === 0) {
        sendJson(response, 404, { error: "Canal no encontrado" });
        return;
      }

      sendJson(response, 200, { channel: rows[0] });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/macros") {
      const payload = await readJson(request);
      if (!payload.name) {
        sendJson(response, 422, { error: "El nombre de la macro es obligatorio" });
        return;
      }

      const id = randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO macros (id, name, visibility, actions)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, visibility, actions
      `, [id, payload.name, payload.visibility || "Publica", payload.actions || []]);

      sendJson(response, 201, { macro: rows[0] });
      return;
    }

    sendJson(response, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    sendJson(response, 500, { error: "Error interno", detail: error.message });
  }
}

async function bootstrapFromDb() {
  const { rows: orgRows } = await pool.query("SELECT id, name, plan, timezone FROM organizations LIMIT 1");
  const organization = orgRows[0] || { id: "org_alvis", name: "Alvis CRM", plan: "Omnicanal", timezone: "America/Santo_Domingo" };

  const { rows: channels } = await pool.query("SELECT id, name, provider, status, capability, config FROM channels");
  const { rows: teams } = await pool.query("SELECT id, name, routing, agents, open, first_response AS \"firstResponse\", resolution FROM teams");
  const { rows: automations } = await pool.query("SELECT id, name, trigger_event AS trigger, action_event AS action, status FROM automations");
  const { rows: macros } = await pool.query("SELECT id, name, visibility, actions FROM macros");
  
  const { rows: settingsRows } = await pool.query("SELECT business_hours AS \"businessHours\", sla_limits AS \"slaLimits\", agent_capacity AS \"agentCapacity\", routing_method AS \"routingMethod\", google_client_id AS \"googleClientId\" FROM manager_settings LIMIT 1");
  const managerSettings = settingsRows[0] || {
    businessHours: { activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"], startHour: "09:00", endHour: "18:00" },
    slaLimits: { Alta: 15, Media: 60, Baja: 240 },
    agentCapacity: 5,
    routingMethod: "round-robin",
    googleClientId: ""
  };

  const { rows: contacts } = await pool.query(`
    SELECT c.id, c.name, c.company_name AS company, c.status, c.value, COALESCE(a.name, 'Sin asignar') AS owner, c.notes, TO_CHAR(c.created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM contacts c LEFT JOIN agents a ON c.owner_id = a.id ORDER BY c.created_at DESC
  `);
  const { rows: companies } = await pool.query(`
    SELECT c.id, c.name, c.status, c.value, COALESCE(a.name, 'Sin asignar') AS owner, c.notes, TO_CHAR(c.created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM companies c LEFT JOIN agents a ON c.owner_id = a.id ORDER BY c.created_at DESC
  `);
  const { rows: deals } = await pool.query(`
    SELECT d.id, d.name, COALESCE(c.name, '') AS company, d.status, d.value, COALESCE(a.name, 'Sin asignar') AS owner, d.notes, TO_CHAR(d.created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM deals d LEFT JOIN companies c ON d.company_id = c.id LEFT JOIN agents a ON d.owner_id = a.id ORDER BY d.created_at DESC
  `);
  const { rows: tasks } = await pool.query(`
    SELECT t.id, t.name, COALESCE(c.name, '') AS contact, t.status, COALESCE(a.name, 'Sin asignar') AS owner, t.notes, TO_CHAR(t.created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM tasks t LEFT JOIN contacts c ON t.contact_id = c.id LEFT JOIN agents a ON t.owner_id = a.id ORDER BY t.created_at DESC
  `);
  const { rows: tickets } = await pool.query(`
    SELECT t.id, t.name, COALESCE(c.name, '') AS contact, t.status, COALESCE(a.name, 'Sin asignar') AS owner, t.notes, TO_CHAR(t.created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM tickets t LEFT JOIN contacts c ON t.contact_id = c.id LEFT JOIN agents a ON t.owner_id = a.id ORDER BY t.created_at DESC
  `);
  const { rows: campaigns } = await pool.query(`
    SELECT c.id, c.name, c.status, c.value, COALESCE(a.name, 'Sin asignar') AS owner, c.notes, TO_CHAR(c.created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM campaigns c LEFT JOIN agents a ON c.owner_id = a.id ORDER BY c.created_at DESC
  `);

  const conversations = await loadConversationsFromDb();

  const googleClientId = process.env.GOOGLE_CLIENT_ID || managerSettings.googleClientId || "";

  return {
    organization,
    records: {
      contacts,
      companies,
      deals,
      tasks,
      tickets,
      campaigns
    },
    conversations,
    channels,
    automations,
    teams,
    macros,
    managerSettings,
    googleClientId
  };
}

async function loadConversationsFromDb() {
  const { rows: conversations } = await pool.query(`
    SELECT 
      c.id,
      c.channel_id,
      co.name AS contact,
      co.company_name AS company,
      c.inbox,
      t.name AS team,
      c.status,
      c.priority,
      c.labels,
      c.last_message AS "lastMessage",
      a.name AS owner,
      c.private_note AS "privateNote",
      c.updated_at
    FROM conversations c
    LEFT JOIN contacts co ON c.contact_id = co.id
    LEFT JOIN teams t ON c.team_id = t.id
    LEFT JOIN agents a ON c.owner_id = a.id
    ORDER BY c.updated_at DESC
  `);

  const { rows: messages } = await pool.query(`
    SELECT 
      id,
      conversation_id AS "conversationId",
      direction,
      text,
      is_private AS "isPrivate",
      created_at
    FROM messages
    ORDER BY created_at ASC
  `);

  const messagesByConv = {};
  for (const msg of messages) {
    if (!messagesByConv[msg.conversationId]) {
      messagesByConv[msg.conversationId] = [];
    }
    messagesByConv[msg.conversationId].push({
      id: msg.id,
      direction: msg.direction,
      text: msg.text,
      isPrivate: msg.isPrivate,
      createdAt: msg.created_at.toISOString(),
      time: formatRelativeTime(msg.created_at)
    });
  }

  const channelNames = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    messenger: "Messenger",
    email: "Email",
    sms: "SMS",
    webchat: "Web Chat"
  };

  return conversations.map(c => ({
    id: c.id,
    channel: channelNames[c.channel_id] || c.channel_id,
    contact: c.contact || "Contacto",
    company: c.company || "",
    inbox: c.inbox || "Principal",
    team: c.team || "Sin equipo",
    status: c.status || "Abierta",
    priority: c.priority || "Media",
    labels: c.labels || [],
    lastMessage: c.lastMessage || "",
    owner: c.owner || "Sin asignar",
    privateNote: c.privateNote || "",
    updatedAt: formatRelativeTime(c.updated_at),
    messages: messagesByConv[c.id] || []
  }));
}

async function loadConversationByIdFromDb(id) {
  const { rows: conversations } = await pool.query(`
    SELECT 
      c.id,
      c.channel_id,
      co.name AS contact,
      co.company_name AS company,
      c.inbox,
      t.name AS team,
      c.status,
      c.priority,
      c.labels,
      c.last_message AS "lastMessage",
      a.name AS owner,
      c.private_note AS "privateNote",
      c.updated_at
    FROM conversations c
    LEFT JOIN contacts co ON c.contact_id = co.id
    LEFT JOIN teams t ON c.team_id = t.id
    LEFT JOIN agents a ON c.owner_id = a.id
    WHERE c.id = $1
  `, [id]);

  if (conversations.length === 0) return null;

  const { rows: messages } = await pool.query(`
    SELECT 
      id,
      direction,
      text,
      is_private AS "isPrivate",
      created_at
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
  `, [id]);

  const formattedMessages = messages.map(m => ({
    id: m.id,
    direction: m.direction,
    text: m.text,
    isPrivate: m.isPrivate,
    createdAt: m.created_at.toISOString(),
    time: formatRelativeTime(m.created_at)
  }));

  const channelNames = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    messenger: "Messenger",
    email: "Email",
    sms: "SMS",
    webchat: "Web Chat"
  };

  const c = conversations[0];
  return {
    id: c.id,
    channel: channelNames[c.channel_id] || c.channel_id,
    contact: c.contact || "Contacto",
    company: c.company || "",
    inbox: c.inbox || "Principal",
    team: c.team || "Sin equipo",
    status: c.status || "Abierta",
    priority: c.priority || "Media",
    labels: c.labels || [],
    lastMessage: c.lastMessage || "",
    owner: c.owner || "Sin asignar",
    privateNote: c.privateNote || "",
    updatedAt: formatRelativeTime(c.updated_at),
    messages: formattedMessages
  };
}

// ==========================================
// 2. ENDPOINTS EN MEMORIA (FALLBACK / MOCK TESTS)
// ==========================================
async function handleApiMemory(request, response, url, state) {
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

    if (request.method === "POST" && url.pathname === "/api/setup") {
      const payload = await readJson(request);
      state.managerSettings.googleClientId = payload.googleClientId;
      process.env.GOOGLE_CLIENT_ID = payload.googleClientId;
      sendJson(response, 200, { success: true, googleClientId: payload.googleClientId });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/google") {
      const agent = { id: "a1111111-1111-1111-1111-111111111111", name: "Maria R.", email: "maria.r@alviscrm.com", role: "Administrador", active: true };
      sendJson(response, 200, { success: true, agent });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/bootstrap") {
      const bootstrapData = {
        ...state,
        googleClientId: process.env.GOOGLE_CLIENT_ID || state.managerSettings.googleClientId || ""
      };
      sendJson(response, 200, bootstrapData);
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
      if (payload.privateNote !== undefined) {
        conversation.privateNote = String(payload.privateNote);
        conversation.messages = ensureMessages(conversation);
        conversation.messages.push({
          id: randomUUID(),
          direction: "outgoing",
          text: payload.privateNote,
          time: "Ahora",
          isPrivate: true,
          createdAt: new Date().toISOString()
        });
      }
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

// ==========================================
// 3. ARCHIVOS ESTÁTICOS
// ==========================================
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
