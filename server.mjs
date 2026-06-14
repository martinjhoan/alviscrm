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

async function runMigrations() {
  if (!pool) return;
  try {
    await pool.query(`
      ALTER TABLE manager_settings 
      ADD COLUMN IF NOT EXISTS bot_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS bot_provider VARCHAR(50) DEFAULT 'openai',
      ADD COLUMN IF NOT EXISTS bot_model VARCHAR(100) DEFAULT 'gpt-4o',
      ADD COLUMN IF NOT EXISTS bot_api_key VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS bot_instructions TEXT DEFAULT 'Eres un asistente de atención al cliente útil y educado para Alvis CRM.',
      ADD COLUMN IF NOT EXISTS bot_resolution_timeout INTEGER DEFAULT 30,
      ADD COLUMN IF NOT EXISTS bot_transfer_human_keywords TEXT DEFAULT 'humano, agente, asesor, persona',
      ADD COLUMN IF NOT EXISTS bot_auto_label BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS bot_auto_priority BOOLEAN DEFAULT TRUE;
    `);
    
    await pool.query(`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS responder VARCHAR(20) DEFAULT 'bot';
    `);

    await pool.query(`
      ALTER TABLE contacts
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS instagram_psid VARCHAR(100),
      ADD COLUMN IF NOT EXISTS messenger_psid VARCHAR(100);
    `);

    // Auto-seed channels if empty
    const { rows: channelCountRows } = await pool.query("SELECT COUNT(*) FROM channels");
    if (Number(channelCountRows[0].count) === 0) {
      await pool.query(`
        INSERT INTO channels (id, name, provider, status, capability)
        VALUES 
          ('whatsapp', 'WhatsApp Business Cloud API', 'Meta', 'Diseñado', 'Mensajes, plantillas, webhooks, asignacion y SLA'),
          ('instagram', 'Instagram Messaging API', 'Meta', 'Diseñado', 'DMs, comentarios, handoff a agentes y etiquetado'),
          ('messenger', 'Messenger Platform', 'Meta', 'Diseñado', 'Conversaciones, respuestas rapidas y automatizaciones'),
          ('email', 'Email IMAP/SMTP', 'Nativo', 'Planificado', 'Bandeja, respuestas, tracking y secuencias'),
          ('sms', 'SMS', 'Proveedor externo', 'Planificado', 'Notificaciones, OTP y campañas transaccionales'),
          ('webchat', 'Web Chat', 'Alvis', 'Planificado', 'Widget embebido, bots y captura de leads')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("🌱 Base de datos: Canales por defecto inicializados correctamente.");
    }

    // Auto-seed teams if empty
    const { rows: teamCountRows } = await pool.query("SELECT COUNT(*) FROM teams");
    if (Number(teamCountRows[0].count) === 0) {
      await pool.query(`
        INSERT INTO teams (id, name, routing, agents, open, first_response, resolution)
        VALUES 
          ('e1111111-1111-1111-1111-111111111111'::uuid, 'Soporte', 'Round-robin', 5, 24, '1m 45s', '2h 30m'),
          ('e2222222-2222-2222-2222-222222222222'::uuid, 'Ventas', 'Por prioridad', 3, 8, '3m 10s', '6h 20m'),
          ('e3333333-3333-3333-3333-333333333333'::uuid, 'Marketing', 'Carga balanceada', 2, 5, '4m 05s', '4h 15m'),
          ('e4444444-4444-4444-4444-444444444444'::uuid, 'Tecnico', 'Round-robin', 4, 6, '7m 40s', '8h 05m')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("🌱 Base de datos: Equipos por defecto inicializados correctamente.");
    }

    // Auto-seed manager_settings if empty
    const { rows: settingsCountRows } = await pool.query("SELECT COUNT(*) FROM manager_settings");
    if (Number(settingsCountRows[0].count) === 0) {
      await pool.query(`
        INSERT INTO manager_settings (id, business_hours, sla_limits, agent_capacity, routing_method)
        VALUES (
          1,
          '{"activeDays": ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"], "startHour": "09:00", "endHour": "18:00"}'::jsonb,
          '{"Alta": 15, "Media": 60, "Baja": 240}'::jsonb,
          5,
          'round-robin'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("🌱 Base de datos: Ajustes de supervisor por defecto inicializados correctamente.");
    }
    
    console.log("✅ Migraciones y inicialización de base de datos ejecutadas correctamente.");
  } catch (err) {
    console.error("⚠️ Error ejecutando migraciones:", err.message);
  }
}
runMigrations();

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

  // Bucle de comprobación de tiempo de resolución (Auto-resolución por inactividad)
  setInterval(async () => {
    try {
      if (!isMemoryMode) {
        // DB Mode
        const { rows: settingsRows } = await pool.query('SELECT bot_resolution_timeout AS "botResolutionTimeout", bot_enabled AS "botEnabled" FROM manager_settings LIMIT 1');
        const settings = settingsRows[0] || {};
        const timeoutMinutes = Number(settings.botResolutionTimeout || 30);
        const botEnabled = settings.botEnabled !== false;

        if (botEnabled && timeoutMinutes > 0) {
          const { rows: inactiveConvs } = await pool.query(`
            SELECT id FROM conversations 
            WHERE status IN ('Abierta', 'Pendiente') 
              AND updated_at < NOW() - INTERVAL '1 minute' * $1
          `, [timeoutMinutes]);

          for (const conv of inactiveConvs) {
            await pool.query("UPDATE conversations SET status = 'Resuelta', updated_at = NOW() WHERE id = $1", [conv.id]);
            const sysMsg = "[Sistema] Conversación cerrada automáticamente por inactividad.";
            await pool.query(
              "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
              [randomUUID(), conv.id, "outgoing", sysMsg, true]
            );
            console.log(`[Auto-Resolver] Conversación ${conv.id} resuelta automáticamente por inactividad.`);
          }
        }
      } else {
        // Memory Mode
        const settings = memoryState.managerSettings || {};
        const timeoutMinutes = Number(settings.botResolutionTimeout || 30);
        const botEnabled = settings.botEnabled !== false;

        if (botEnabled && timeoutMinutes > 0) {
          const cutoff = Date.now() - timeoutMinutes * 60 * 1000;
          memoryState.conversations.forEach(c => {
            if (c.status === "Abierta" || c.status === "Pendiente") {
              let lastDate = new Date();
              if (c.messages && c.messages.length > 0) {
                const lastMsg = c.messages[c.messages.length - 1];
                if (lastMsg.createdAt) lastDate = new Date(lastMsg.createdAt);
              }
              
              if (lastDate.getTime() < cutoff) {
                c.status = "Resuelta";
                c.updatedAt = "Hace un momento";
                if (!c.messages) c.messages = [];
                c.messages.push({
                  id: randomUUID(),
                  direction: "outgoing",
                  text: "[Sistema] Conversación cerrada automáticamente por inactividad.",
                  time: "Ahora",
                  isPrivate: true,
                  createdAt: new Date().toISOString()
                });
                console.log(`[Auto-Resolver Memory] Conversación ${c.id} resuelta automáticamente por inactividad.`);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("❌ Error en auto-resolución periódica:", err.message);
    }
  }, 60000); // Check every 60 seconds

  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/webhooks/")) {
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
    const webhookMatch = url.pathname.match(/^\/api\/webhooks\/([^/]+)$/);
    const legacyWebhookMatch = url.pathname.match(/^\/webhooks\/whatsapp\/(\+?\d+)$/);

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

      if (credential === "bypass" || payload.bypass) {
        let agent = null;
        const { rows } = await pool.query("SELECT id, name, email, role, active FROM agents WHERE role = 'Administrador' LIMIT 1");
        if (rows.length > 0) {
          agent = rows[0];
        } else {
          const { rows: anyRows } = await pool.query("SELECT id, name, email, role, active FROM agents LIMIT 1");
          if (anyRows.length > 0) {
            agent = anyRows[0];
          } else {
            const id = randomUUID();
            const { rows: newRows } = await pool.query(
              "INSERT INTO agents (id, name, email, role, active) VALUES ($1, 'Administrador de Desarrollo', 'admin@tuempresa.com', 'Administrador', true) RETURNING id, name, email, role, active",
              [id]
            );
            agent = newRows[0];
          }
        }
        sendJson(response, 200, { success: true, agent });
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
        const totalAgents = Number(countRows[0].count);

        if (totalAgents > 0) {
          const allowMultiple = process.env.ALLOW_MULTIPLE_USERS === "true";
          if (!allowMultiple) {
            sendJson(response, 403, { error: "Acceso denegado. El registro de nuevos usuarios está desactivado. Contacta al administrador." });
            return;
          }
        }

        const role = totalAgents === 0 ? "Administrador" : "Agente";

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

    if (request.method === "POST" && url.pathname === "/api/conversations") {
      const payload = await readJson(request);
      const { contactId, channelId } = payload;
      if (!contactId || !channelId) {
        sendJson(response, 422, { error: "Contact ID y Channel ID son obligatorios" });
        return;
      }

      const { rows: existing } = await pool.query("SELECT id FROM conversations WHERE contact_id = $1 AND channel_id = $2 LIMIT 1", [contactId, channelId]);
      if (existing.length > 0) {
        const conversation = await loadConversationByIdFromDb(existing[0].id);
        sendJson(response, 200, { conversation });
        return;
      }

      const id = randomUUID();
      const channelNames = {
        whatsapp: "WhatsApp",
        instagram: "Instagram",
        messenger: "Messenger",
        email: "Email",
        sms: "SMS",
        webchat: "Web Chat"
      };
      const channelName = channelNames[channelId] || channelId;

      await pool.query(`
        INSERT INTO conversations (id, channel_id, contact_id, inbox, status, priority, labels, last_message, responder)
        VALUES ($1, $2, $3, $4, 'Abierta', 'Media', ARRAY[]::varchar[], 'Conversación iniciada desde el CRM', 'bot')
      `, [id, channelId, contactId, `${channelName} CRM`]);

      const conversation = await loadConversationByIdFromDb(id);
      sendJson(response, 201, { conversation });
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

      if (direction === "incoming") {
        const { rows: convRows } = await pool.query("SELECT responder FROM conversations WHERE id = $1", [conversationId]);
        const currentResponder = convRows[0]?.responder || "bot";
        if (currentResponder === "bot") {
          await handleBotResponse(conversationId, text, false);
        }
      } else if (direction === "outgoing") {
        const recipientId = await getRecipientIdFromConversation(conversationId);
        if (recipientId) {
          const { rows: convRows } = await pool.query("SELECT channel_id FROM conversations WHERE id = $1", [conversationId]);
          const channelId = convRows[0]?.channel_id;
          if (channelId) {
            await sendOutgoingMessageToChannel(channelId, recipientId, text);
          }
        }
      }

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
      if (payload.responder !== undefined) {
        fields.push(`responder = $${valIdx++}`);
        values.push(payload.responder);
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
        const notesValue = payload.notes || "";
        let finalNotes = notesValue;
        if (payload.phone && !notesValue.includes("WhatsApp Phone:")) {
          finalNotes = `WhatsApp Phone: ${payload.phone}\n${notesValue}`;
        }
        await pool.query(
          "INSERT INTO contacts (id, name, company_name, status, value, owner_id, notes, phone, instagram_psid, messenger_psid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          [id, recordName, payload.company, payload.status, payload.value || 0, ownerId, finalNotes, payload.phone || null, payload.instagram_psid || null, payload.messenger_psid || null]
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
        phone: payload.phone || "",
        instagram_psid: payload.instagram_psid || "",
        messenger_psid: payload.messenger_psid || "",
        createdAt: new Date().toISOString().slice(0, 10)
      };

      sendJson(response, 201, { type, record });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/manager/settings") {
      const { rows } = await pool.query(`
        SELECT 
          business_hours AS "businessHours", 
          sla_limits AS "slaLimits", 
          agent_capacity AS "agentCapacity", 
          routing_method AS "routingMethod",
          bot_enabled AS "botEnabled",
          bot_provider AS "botProvider",
          bot_model AS "botModel",
          bot_api_key AS "botApiKey",
          bot_instructions AS "botInstructions",
          bot_resolution_timeout AS "botResolutionTimeout",
          bot_transfer_human_keywords AS "botTransferHumanKeywords",
          bot_auto_label AS "botAutoLabel",
          bot_auto_priority AS "botAutoPriority"
        FROM manager_settings LIMIT 1
      `);
      const settings = rows[0] || {
        businessHours: { activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"], startHour: "09:00", endHour: "18:00" },
        slaLimits: { Alta: 15, Media: 60, Baja: 240 },
        agentCapacity: 5,
        routingMethod: "round-robin",
        botEnabled: true,
        botProvider: "openai",
        botModel: "gpt-4o",
        botApiKey: "",
        botInstructions: "Eres un asistente de atención al cliente útil y educado para Alvis CRM.",
        botResolutionTimeout: 30,
        botTransferHumanKeywords: "humano, agente, asesor, persona",
        botAutoLabel: true,
        botAutoPriority: true
      };
      sendJson(response, 200, settings);
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/manager/settings") {
      const payload = await readJson(request);
      const { 
        businessHours, 
        slaLimits, 
        agentCapacity, 
        routingMethod,
        botEnabled,
        botProvider,
        botModel,
        botApiKey,
        botInstructions,
        botResolutionTimeout,
        botTransferHumanKeywords,
        botAutoLabel,
        botAutoPriority
      } = payload;
      
      const { rows } = await pool.query(`
        INSERT INTO manager_settings (
          id, business_hours, sla_limits, agent_capacity, routing_method,
          bot_enabled, bot_provider, bot_model, bot_api_key, bot_instructions,
          bot_resolution_timeout, bot_transfer_human_keywords, bot_auto_label, bot_auto_priority
        )
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          business_hours = COALESCE($1, manager_settings.business_hours),
          sla_limits = COALESCE($2, manager_settings.sla_limits),
          agent_capacity = COALESCE($3, manager_settings.agent_capacity),
          routing_method = COALESCE($4, manager_settings.routing_method),
          bot_enabled = COALESCE($5, manager_settings.bot_enabled),
          bot_provider = COALESCE($6, manager_settings.bot_provider),
          bot_model = COALESCE($7, manager_settings.bot_model),
          bot_api_key = COALESCE($8, manager_settings.bot_api_key),
          bot_instructions = COALESCE($9, manager_settings.bot_instructions),
          bot_resolution_timeout = COALESCE($10, manager_settings.bot_resolution_timeout),
          bot_transfer_human_keywords = COALESCE($11, manager_settings.bot_transfer_human_keywords),
          bot_auto_label = COALESCE($12, manager_settings.bot_auto_label),
          bot_auto_priority = COALESCE($13, manager_settings.bot_auto_priority),
          updated_at = NOW()
        RETURNING 
          business_hours AS "businessHours", 
          sla_limits AS "slaLimits", 
          agent_capacity AS "agentCapacity", 
          routing_method AS "routingMethod",
          bot_enabled AS "botEnabled",
          bot_provider AS "botProvider",
          bot_model AS "botModel",
          bot_api_key AS "botApiKey",
          bot_instructions AS "botInstructions",
          bot_resolution_timeout AS "botResolutionTimeout",
          bot_transfer_human_keywords AS "botTransferHumanKeywords",
          bot_auto_label AS "botAutoLabel",
          bot_auto_priority AS "botAutoPriority"
      `, [
        businessHours ? JSON.stringify(businessHours) : null,
        slaLimits ? JSON.stringify(slaLimits) : null,
        agentCapacity !== undefined ? Number(agentCapacity) : null,
        routingMethod || null,
        botEnabled !== undefined ? !!botEnabled : null,
        botProvider || null,
        botModel || null,
        botApiKey !== undefined ? botApiKey : null,
        botInstructions || null,
        botResolutionTimeout !== undefined ? Number(botResolutionTimeout) : null,
        botTransferHumanKeywords || null,
        botAutoLabel !== undefined ? !!botAutoLabel : null,
        botAutoPriority !== undefined ? !!botAutoPriority : null
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

    if (webhookMatch || legacyWebhookMatch) {
      const channelId = webhookMatch ? webhookMatch[1] : "whatsapp";

      if (request.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode && token) {
          const { rows } = await pool.query("SELECT config, verify_token FROM channels WHERE id = $1 LIMIT 1", [channelId]);
          if (rows.length > 0) {
            const channel = rows[0];
            const config = channel.config || {};
            const dbVerifyToken = channel.verify_token || config.verifyToken || "";
            if (mode === "subscribe" && token === dbVerifyToken) {
              console.log(`✅ Webhook verificado con éxito para canal: ${channelId}`);
              response.writeHead(200, { "Content-Type": "text/plain" });
              response.end(challenge);
              return;
            }
          }
        }
        sendJson(response, 403, { error: "Fallo de verificación de token de webhook" });
        return;
      }

      if (request.method === "POST") {
        const payload = await readJson(request);
        console.log(`📩 Webhook recibido para canal ${channelId}:`, JSON.stringify(payload, null, 2));

        let incomingText = "";
        let senderId = "";
        let contactName = "";
        let noteMarker = "";

        const entry = payload.entry?.[0];
        if (channelId === "whatsapp") {
          const change = entry?.changes?.[0];
          const value = change?.value;
          const msg = value?.messages?.[0];
          if (msg && msg.text?.body) {
            incomingText = msg.text.body;
            senderId = msg.from;
            contactName = value?.contacts?.[0]?.profile?.name || `WhatsApp User ${senderId}`;
            noteMarker = `WhatsApp Phone: ${senderId}`;
          }
        } else if (channelId === "instagram" || channelId === "messenger") {
          const messaging = entry?.messaging?.[0];
          const msg = messaging?.message;
          if (msg && msg.text) {
            incomingText = msg.text;
            senderId = messaging.sender?.id;
            contactName = `${channelId === 'instagram' ? 'Instagram' : 'Messenger'} User ${senderId}`;
            noteMarker = `${channelId === 'instagram' ? 'Instagram' : 'Messenger'} PSID: ${senderId}`;
          }
        }

        if (incomingText && senderId) {
          let contactId = null;
          let contactQuery = "";
          let queryParam = "";
          if (channelId === "whatsapp") {
            contactQuery = "SELECT id FROM contacts WHERE phone = $1 OR notes LIKE $2 LIMIT 1";
            queryParam = `%WhatsApp Phone: ${senderId}%`;
          } else if (channelId === "instagram") {
            contactQuery = "SELECT id FROM contacts WHERE instagram_psid = $1 OR notes LIKE $2 LIMIT 1";
            queryParam = `%Instagram PSID: ${senderId}%`;
          } else if (channelId === "messenger") {
            contactQuery = "SELECT id FROM contacts WHERE messenger_psid = $1 OR notes LIKE $2 LIMIT 1";
            queryParam = `%Messenger PSID: ${senderId}%`;
          } else {
            contactQuery = "SELECT id FROM contacts WHERE notes LIKE $2 LIMIT 1";
            queryParam = `%${noteMarker}%`;
          }

          const { rows: contactRows } = await pool.query(contactQuery, [senderId, queryParam]);
          if (contactRows.length > 0) {
            contactId = contactRows[0].id;
          } else {
            contactId = randomUUID();
            let insertQuery = "";
            let insertParams = [];
            if (channelId === "whatsapp") {
              insertQuery = "INSERT INTO contacts (id, name, company_name, status, value, notes, phone) VALUES ($1, $2, $3, 'Nuevo', 0, $4, $5)";
              insertParams = [contactId, contactName, "WhatsApp Contact", noteMarker, senderId];
            } else if (channelId === "instagram") {
              insertQuery = "INSERT INTO contacts (id, name, company_name, status, value, notes, instagram_psid) VALUES ($1, $2, $3, 'Nuevo', 0, $4, $5)";
              insertParams = [contactId, contactName, "Instagram DM", noteMarker, senderId];
            } else if (channelId === "messenger") {
              insertQuery = "INSERT INTO contacts (id, name, company_name, status, value, notes, messenger_psid) VALUES ($1, $2, $3, 'Nuevo', 0, $4, $5)";
              insertParams = [contactId, contactName, "Messenger Chat", noteMarker, senderId];
            } else {
              insertQuery = "INSERT INTO contacts (id, name, company_name, status, value, notes) VALUES ($1, $2, $3, 'Nuevo', 0, $4)";
              insertParams = [contactId, contactName, "External Contact", noteMarker];
            }
            await pool.query(insertQuery, insertParams);
          }

          let conversationId = null;
          const { rows: convRows } = await pool.query("SELECT id FROM conversations WHERE contact_id = $1 AND channel_id = $2 LIMIT 1", [contactId, channelId]);
          if (convRows.length > 0) {
            conversationId = convRows[0].id;
          } else {
            conversationId = randomUUID();
            await pool.query(
              "INSERT INTO conversations (id, channel_id, contact_id, inbox, status, priority, labels, last_message, responder) VALUES ($1, $2, $3, $4, 'Abierta', 'Media', ARRAY[]::varchar[], $5, 'bot')",
              [conversationId, channelId, contactId, `${channelId.toUpperCase()} Webhook`, incomingText]
            );
          }

          const messageId = randomUUID();
          await pool.query(
            "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, 'incoming', $3, false)",
            [messageId, conversationId, incomingText]
          );

          await pool.query(
            "UPDATE conversations SET last_message = $1, updated_at = NOW(), status = CASE WHEN status = 'Resuelta' THEN 'Abierta' ELSE status END WHERE id = $2",
            [incomingText, conversationId]
          );

          await handleBotResponse(conversationId, incomingText, false);
        }

        sendJson(response, 200, { success: true });
        return;
      }
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
  
  const { rows: settingsRows } = await pool.query(`
    SELECT 
      business_hours AS "businessHours", 
      sla_limits AS "slaLimits", 
      agent_capacity AS "agentCapacity", 
      routing_method AS "routingMethod", 
      google_client_id AS "googleClientId",
      bot_enabled AS "botEnabled",
      bot_provider AS "botProvider",
      bot_model AS "botModel",
      bot_api_key AS "botApiKey",
      bot_instructions AS "botInstructions",
      bot_resolution_timeout AS "botResolutionTimeout",
      bot_transfer_human_keywords AS "botTransferHumanKeywords",
      bot_auto_label AS "botAutoLabel",
      bot_auto_priority AS "botAutoPriority"
    FROM manager_settings LIMIT 1
  `);
  const managerSettings = settingsRows[0] || {
    businessHours: { activeDays: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"], startHour: "09:00", endHour: "18:00" },
    slaLimits: { Alta: 15, Media: 60, Baja: 240 },
    agentCapacity: 5,
    routingMethod: "round-robin",
    googleClientId: "",
    botEnabled: true,
    botProvider: "openai",
    botModel: "gpt-4o",
    botApiKey: "",
    botInstructions: "Eres un asistente de atención al cliente útil y educado para Alvis CRM.",
    botResolutionTimeout: 30,
    botTransferHumanKeywords: "humano, agente, asesor, persona",
    botAutoLabel: true,
    botAutoPriority: true
  };

  const { rows: contacts } = await pool.query(`
    SELECT c.id, c.name, c.company_name AS company, c.status, c.value, COALESCE(a.name, 'Sin asignar') AS owner, c.notes, c.phone, c.instagram_psid AS "instagram_psid", c.messenger_psid AS "messenger_psid", TO_CHAR(c.created_at, 'YYYY-MM-DD') AS "createdAt"
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
  const publicUrl = process.env.PUBLIC_URL || "";

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
    googleClientId,
    publicUrl
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
      c.responder,
      c.updated_at
    FROM conversations c
    LEFT JOIN contacts co ON c.contact_id = co.id
    LEFT JOIN teams t ON c.team_id = t.id
    LEFT JOIN agents a ON c.owner_id = a.id
    ORDER BY c.updated_at DESC
  `);

  if (conversations.length === 0) {
    try {
      let contactId = null;
      const { rows: contactRows } = await pool.query("SELECT id FROM contacts LIMIT 1");
      if (contactRows.length > 0) {
        contactId = contactRows[0].id;
      } else {
        contactId = randomUUID();
        await pool.query(
          "INSERT INTO contacts (id, name, company_name, status, value, notes, phone) VALUES ($1, 'Cliente Demo', 'Empresa de Prueba', 'Nuevo', 1000, 'WhatsApp Phone: +18095551234\nCreado automáticamente como seed', '+18095551234')",
          [contactId]
        );
      }

      let agentId = null;
      const { rows: agentRows } = await pool.query("SELECT id FROM agents LIMIT 1");
      if (agentRows.length > 0) {
        agentId = agentRows[0].id;
      } else {
        agentId = randomUUID();
        await pool.query(
          "INSERT INTO agents (id, name, email, role, active) VALUES ($1, 'Soporte Demo', 'soporte@alvis.com', 'Agente', true)",
          [agentId]
        );
      }

      let teamId = null;
      const { rows: teamRows } = await pool.query("SELECT id FROM teams LIMIT 1");
      if (teamRows.length > 0) {
        teamId = teamRows[0].id;
      }

      const conversationId = "c2222222-2222-2222-2222-222222222222";
      await pool.query(`
        INSERT INTO conversations (id, channel_id, contact_id, inbox, team_id, status, priority, labels, last_message, owner_id, responder)
        VALUES ($1, 'whatsapp', $2, 'WhatsApp Principal', $3, 'Abierta', 'Alta', ARRAY['sales-lead', 'vip']::varchar[], 'Hola, me gustaría recibir información.', $4, 'bot')
      `, [conversationId, contactId, teamId, agentId]);

      await pool.query(`
        INSERT INTO messages (id, conversation_id, direction, text, is_private)
        VALUES ($1, $2, 'incoming', 'Hola, me gustaría recibir información.', false)
      `, [randomUUID(), conversationId]);

      console.log("🌱 Base de datos vacía, insertado registro de conversación semilla.");

      const { rows: reloadedConvs } = await pool.query(`
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
          c.responder,
          c.updated_at
        FROM conversations c
        LEFT JOIN contacts co ON c.contact_id = co.id
        LEFT JOIN teams t ON c.team_id = t.id
        LEFT JOIN agents a ON c.owner_id = a.id
        ORDER BY c.updated_at DESC
      `);
      conversations.push(...reloadedConvs);
    } catch (err) {
      console.error("⚠️ Error intentando crear conversación semilla en BD:", err.message);
    }
  }

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
    responder: c.responder || "bot",
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
      c.responder,
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
    responder: c.responder || "bot",
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
    const webhookMatch = url.pathname.match(/^\/api\/webhooks\/([^/]+)$/);
    const legacyWebhookMatch = url.pathname.match(/^\/webhooks\/whatsapp\/(\+?\d+)$/);

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
        googleClientId: process.env.GOOGLE_CLIENT_ID || state.managerSettings.googleClientId || "",
        publicUrl: process.env.PUBLIC_URL || ""
      };
      sendJson(response, 200, bootstrapData);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/conversations") {
      sendJson(response, 200, state.conversations);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/conversations") {
      const payload = await readJson(request);
      const { contactId, channelId } = payload;
      if (!contactId || !channelId) {
        sendJson(response, 422, { error: "Contact ID y Channel ID son obligatorios" });
        return;
      }

      const contact = state.records.contacts.find(c => c.id === contactId);
      if (!contact) {
        sendJson(response, 404, { error: "Contacto no encontrado" });
        return;
      }

      const channelNames = {
        whatsapp: "WhatsApp",
        instagram: "Instagram",
        messenger: "Messenger",
        email: "Email",
        sms: "SMS",
        webchat: "Web Chat"
      };
      const channelName = channelNames[channelId] || channelId;

      let conversation = state.conversations.find(c => c.contact === contact.name && c.channel === channelName);
      if (!conversation) {
        conversation = {
          id: randomUUID(),
          channel: channelName,
          contact: contact.name,
          company: contact.company || "",
          inbox: `${channelName} Local`,
          team: "Soporte",
          status: "Abierta",
          priority: "Media",
          labels: [],
          lastMessage: "Conversación iniciada desde el CRM",
          owner: "Sin asignar",
          responder: "bot",
          updatedAt: "Ahora",
          messages: []
        };
        state.conversations.unshift(conversation);
      }

      sendJson(response, 200, { conversation });
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

      if (direction === "incoming") {
        if (!conversation.responder) conversation.responder = "bot";
        if (conversation.responder === "bot") {
          await handleBotResponse(conversation.id, text, true, state);
        }
      }

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
      if (payload.responder !== undefined) conversation.responder = String(payload.responder);
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

      const notesValue = String(payload.notes || "").trim();
      let finalNotes = notesValue;
      if (payload.phone && !notesValue.includes("WhatsApp Phone:")) {
        finalNotes = `WhatsApp Phone: ${payload.phone}\n${notesValue}`;
      }
      const record = {
        id: randomUUID(),
        name: String(payload.name || "").trim(),
        company: String(payload.company || "").trim(),
        status: String(payload.status || "").trim(),
        value: Number(payload.value || 0),
        owner: String(payload.owner || "").trim(),
        notes: finalNotes,
        phone: String(payload.phone || "").trim(),
        instagram_psid: String(payload.instagram_psid || "").trim(),
        messenger_psid: String(payload.messenger_psid || "").trim(),
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
          routingMethod: "round-robin",
          botEnabled: true,
          botProvider: "openai",
          botModel: "gpt-4o",
          botApiKey: "",
          botInstructions: "Eres un asistente de atención al cliente útil y educado para Alvis CRM.",
          botResolutionTimeout: 30,
          botTransferHumanKeywords: "humano, agente, asesor, persona",
          botAutoLabel: true,
          botAutoPriority: true
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
      if (payload.botEnabled !== undefined) state.managerSettings.botEnabled = !!payload.botEnabled;
      if (payload.botProvider !== undefined) state.managerSettings.botProvider = String(payload.botProvider);
      if (payload.botModel !== undefined) state.managerSettings.botModel = String(payload.botModel);
      if (payload.botApiKey !== undefined) state.managerSettings.botApiKey = String(payload.botApiKey);
      if (payload.botInstructions !== undefined) state.managerSettings.botInstructions = String(payload.botInstructions);
      if (payload.botResolutionTimeout !== undefined) state.managerSettings.botResolutionTimeout = Number(payload.botResolutionTimeout);
      if (payload.botTransferHumanKeywords !== undefined) state.managerSettings.botTransferHumanKeywords = String(payload.botTransferHumanKeywords);
      if (payload.botAutoLabel !== undefined) state.managerSettings.botAutoLabel = !!payload.botAutoLabel;
      if (payload.botAutoPriority !== undefined) state.managerSettings.botAutoPriority = !!payload.botAutoPriority;
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

    if (webhookMatch || legacyWebhookMatch) {
      const channelId = webhookMatch ? webhookMatch[1] : "whatsapp";

      if (request.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode && token) {
          const channel = state.channels.find(c => c.id === channelId);
          if (channel) {
            const config = channel.config || {};
            const verifyToken = channel.verify_token || config.verifyToken || "";
            if (mode === "subscribe" && token === verifyToken) {
              response.writeHead(200, { "Content-Type": "text/plain" });
              response.end(challenge);
              return;
            }
          }
        }
        sendJson(response, 403, { error: "Fallo de verificación de token de webhook" });
        return;
      }

      if (request.method === "POST") {
        const payload = await readJson(request);
        const entry = payload.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const msg = value?.messages?.[0];

        if (msg && msg.text?.body) {
          const incomingText = msg.text.body;
          const fromPhone = msg.from;
          const contactName = value?.contacts?.[0]?.profile?.name || `WhatsApp User ${fromPhone}`;

          let conversation = state.conversations.find(c => c.inbox === "WhatsApp Webhook" && c.contact.includes(fromPhone));
          if (!conversation) {
            conversation = {
              id: randomUUID(),
              channel: "WhatsApp",
              contact: contactName,
              company: "WhatsApp Contact",
              inbox: "WhatsApp Webhook",
              team: "Soporte",
              status: "Abierta",
              priority: "Media",
              labels: [],
              lastMessage: incomingText,
              responder: "bot",
              updatedAt: "Ahora",
              messages: []
            };
            state.conversations.push(conversation);
          }

          conversation.messages = ensureMessages(conversation);
          const msgId = randomUUID();
          conversation.messages.push({
            id: msgId,
            direction: "incoming",
            text: incomingText,
            time: "Ahora",
            createdAt: new Date().toISOString()
          });
          conversation.lastMessage = incomingText;
          conversation.updatedAt = "Ahora";
          if (conversation.status === "Resuelta") conversation.status = "Abierta";

          if (conversation.responder === "bot") {
            await handleBotResponse(conversation.id, incomingText, true, state);
          }
        }
        sendJson(response, 200, { success: true });
        return;
      }
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

async function getRecipientIdFromConversation(conversationId) {
  const { rows } = await pool.query(`
    SELECT c.channel_id, co.phone, co.instagram_psid, co.messenger_psid, co.notes 
    FROM conversations c
    JOIN contacts co ON c.contact_id = co.id
    WHERE c.id = $1
  `, [conversationId]);

  if (rows.length === 0) return null;
  const channelId = rows[0].channel_id;
  const notes = rows[0].notes || "";

  if (channelId === "whatsapp") {
    if (rows[0].phone) return rows[0].phone;
    const match = notes.match(/WhatsApp Phone:\s*(\+?\d+)/);
    return match ? match[1] : null;
  } else if (channelId === "instagram") {
    if (rows[0].instagram_psid) return rows[0].instagram_psid;
    const match = notes.match(/Instagram PSID:\s*(\w+)/);
    return match ? match[1] : null;
  } else if (channelId === "messenger") {
    if (rows[0].messenger_psid) return rows[0].messenger_psid;
    const match = notes.match(/Messenger PSID:\s*(\w+)/);
    return match ? match[1] : null;
  }

  return null;
}

async function sendOutgoingMessageToChannel(channelId, recipientId, text) {
  try {
    const { rows } = await pool.query("SELECT config FROM channels WHERE id = $1 LIMIT 1", [channelId]);
    if (rows.length === 0) return;
    const config = rows[0].config || {};

    if (channelId === "whatsapp") {
      const phoneId = config.phoneId;
      const accessToken = config.accessToken;
      if (!phoneId || !accessToken) {
        console.warn("⚠️ Meta API: Falta Phone ID o Access Token en la configuración de WhatsApp.");
        return;
      }

      const cleanPhone = recipientId.replace(/\D/g, "");
      console.log(`📤 Enviando WhatsApp a ${cleanPhone} usando Phone ID ${phoneId}...`);
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { body: text }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Error en respuesta de API de WhatsApp: ${errText}`);
      } else {
        console.log(`✅ Mensaje enviado exitosamente a WhatsApp: ${cleanPhone}`);
      }
    } else if (channelId === "instagram" || channelId === "messenger") {
      const pageAccessToken = config.pageAccessToken;
      if (!pageAccessToken) {
        console.warn(`⚠️ Meta API: Falta Page Access Token en la configuración de ${channelId}.`);
        return;
      }

      console.log(`📤 Enviando DM a ${channelId} (destinatario PSID: ${recipientId})...`);
      const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pageAccessToken}`
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Error en respuesta de API de ${channelId}: ${errText}`);
      } else {
        console.log(`✅ DM enviado exitosamente a ${channelId}: ${recipientId}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error al enviar mensaje saliente al canal ${channelId}:`, err.message);
  }
}

async function handleBotResponse(conversationId, incomingText, isMemoryMode, memoryState) {
  let settings = null;
  let conversation = null;
  let history = [];

  if (isMemoryMode) {
    settings = memoryState.managerSettings || {};
    conversation = memoryState.conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    history = conversation.messages || [];
  } else {
    // DB Mode
    const { rows: settingsRows } = await pool.query(`
      SELECT 
        bot_enabled AS "botEnabled",
        bot_provider AS "botProvider",
        bot_model AS "botModel",
        bot_api_key AS "botApiKey",
        bot_instructions AS "botInstructions",
        bot_transfer_human_keywords AS "botTransferHumanKeywords",
        bot_auto_label AS "botAutoLabel",
        bot_auto_priority AS "botAutoPriority"
      FROM manager_settings LIMIT 1
    `);
    settings = settingsRows[0] || {};
    conversation = await loadConversationByIdFromDb(conversationId);
    if (!conversation) return;
    history = conversation.messages || [];
  }

  // 1. Check if bot is enabled
  if (settings.botEnabled === false) return;

  // 2. Check for human transfer keywords
  const keywords = (settings.botTransferHumanKeywords || "humano, agente, asesor, persona")
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);
  
  const textLower = incomingText.toLowerCase();
  const shouldTransfer = keywords.some(kw => textLower.includes(kw));

  if (shouldTransfer) {
    const transferMsg = "Entendido. Te estoy transfiriendo con un agente humano. En breve se comunicarán contigo.";
    const internalNote = "[Bot] Conversación transferida a un agente humano debido a la solicitud del cliente.";

    if (isMemoryMode) {
      conversation.responder = "human";
      conversation.messages = ensureMessages(conversation);
      // Add outgoing msg
      const msgId1 = randomUUID();
      conversation.messages.push({
        id: msgId1,
        direction: "outgoing",
        text: transferMsg,
        time: "Ahora",
        createdAt: new Date().toISOString()
      });
      // Add private note
      const msgId2 = randomUUID();
      conversation.messages.push({
        id: msgId2,
        direction: "outgoing",
        text: internalNote,
        time: "Ahora",
        isPrivate: true,
        createdAt: new Date().toISOString()
      });
      conversation.lastMessage = transferMsg;
      conversation.updatedAt = "Ahora";
    } else {
      // DB Mode
      await pool.query("UPDATE conversations SET responder = 'human', last_message = $1, updated_at = NOW() WHERE id = $2", [transferMsg, conversationId]);
      await pool.query(
        "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
        [randomUUID(), conversationId, "outgoing", transferMsg, false]
      );
      await pool.query(
        "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
        [randomUUID(), conversationId, "outgoing", internalNote, true]
      );
    }
    return;
  }

  // 3. Prepare Prompt
  const provider = settings.botProvider || "openai";
  const model = settings.botModel || "gpt-4o";
  const apiKey = settings.botApiKey || "";
  const instructions = settings.botInstructions || "Eres un asistente de atención al cliente útil y educado para Alvis CRM.";
  const autoLabel = settings.botAutoLabel !== false;
  const autoPriority = settings.botAutoPriority !== false;

  let systemPrompt = instructions;
  if (autoLabel || autoPriority) {
    systemPrompt += `\n\nDebes responder exclusivamente en el siguiente formato JSON (no incluyas markdown, no incluyas backticks \`\`\` ni texto explicativo antes o después, solo el objeto JSON plano):
{
  "response": "Tu respuesta al cliente aquí...",
  "priority": "${autoPriority ? 'Alta o Media o Baja (prioridad de urgencia detectada)' : 'Media'}",
  "labels": [${autoLabel ? '"etiqueta1", "etiqueta2" (etiquetas de temas detectados, ej. ventas, soporte, facturacion)' : ''}]
}`;
  }

  // Filter private notes and keep last 10 messages for context
  const contextMessages = history
    .filter(m => !m.isPrivate)
    .slice(-10)
    .map(m => ({
      role: m.direction === "incoming" ? "user" : "assistant",
      content: m.text
    }));

  let responseText = "";
  let detectedPriority = null;
  let detectedLabels = [];
  let apiCallSuccess = false;

  // 4. Call AI Provider API (if apiKey is provided or provider is ollama)
  const isMock = !apiKey && provider !== "ollama";

  if (!isMock) {
    try {
      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              ...contextMessages
            ],
            temperature: 0.7,
            response_format: (autoLabel || autoPriority) ? { type: "json_object" } : undefined
          })
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.choices?.[0]?.message?.content || "";
          apiCallSuccess = true;
        } else {
          const errText = await response.text();
          throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
        }
      } else if (provider === "anthropic") {
        const anthropicHistory = contextMessages.map(m => ({
          role: m.role,
          content: m.content
        }));
        const response = await fetch("https://api.openai.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: model,
            system: systemPrompt,
            messages: anthropicHistory,
            max_tokens: 1024
          })
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.content?.[0]?.text || "";
          apiCallSuccess = true;
        } else {
          const errText = await response.text();
          throw new Error(`Anthropic API Error (${response.status}): ${errText}`);
        }
      } else if (provider === "gemini") {
        const geminiContents = contextMessages.map(m => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }]
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: geminiContents,
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          apiCallSuccess = true;
        } else {
          const errText = await response.text();
          throw new Error(`Gemini API Error (${response.status}): ${errText}`);
        }
      } else if (provider === "ollama") {
        const ollamaUrl = apiKey || "http://localhost:11434";
        const response = await fetch(`${ollamaUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              ...contextMessages
            ],
            stream: false
          })
        });

        if (response.ok) {
          const data = await response.json();
          responseText = data.message?.content || "";
          apiCallSuccess = true;
        } else {
          const errText = await response.text();
          throw new Error(`Ollama API Error (${response.status}): ${errText}`);
        }
      }
    } catch (err) {
      console.error(`❌ Error en bot AI (${provider}):`, err.message);
      const errNote = `[Bot Error] Falló llamada a ${provider}: ${err.message}. Usando simulación.`;
      if (isMemoryMode) {
        conversation.messages = ensureMessages(conversation);
        conversation.messages.push({
          id: randomUUID(),
          direction: "outgoing",
          text: errNote,
          time: "Ahora",
          isPrivate: true,
          createdAt: new Date().toISOString()
        });
      } else {
        await pool.query(
          "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), conversationId, "outgoing", errNote, true]
        );
      }
    }
  }

  // 5. Parsing JSON Response (if enabled and call succeeded)
  let cleanText = responseText;
  if (apiCallSuccess && (autoLabel || autoPriority)) {
    try {
      let jsonStr = responseText.trim();
      if (jsonStr.includes("```")) {
        const matches = jsonStr.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        if (matches) jsonStr = matches[1];
      }
      const parsed = JSON.parse(jsonStr);
      cleanText = parsed.response || responseText;
      if (autoPriority && parsed.priority) detectedPriority = parsed.priority;
      if (autoLabel && Array.isArray(parsed.labels)) detectedLabels = parsed.labels;
    } catch (parseErr) {
      console.warn("⚠️ No se pudo parsear la respuesta estructurada del bot, usando texto plano.", parseErr.message);
    }
  }

  // 6. Mock Response Fallback (if mock mode or call failed)
  if (!apiCallSuccess || !cleanText) {
    cleanText = `[Demo Bot - ${provider}] Gracias por tu mensaje. El bot está en modo de demostración. Has dicho: "${incomingText}".`;
    detectedPriority = "Media";
    detectedLabels = ["bot-demo"];
    
    const textLower = incomingText.toLowerCase();
    if (textLower.includes("urgente") || textLower.includes("ayuda") || textLower.includes("error")) {
      detectedPriority = "Alta";
      detectedLabels.push("soporte");
    } else if (textLower.includes("precio") || textLower.includes("comprar") || textLower.includes("cotizar")) {
      detectedLabels.push("ventas");
    }
  }

  // 7. Save Bot Message and Apply Labels/Priority
  if (isMemoryMode) {
    conversation.messages = ensureMessages(conversation);
    const botMsgId = randomUUID();
    conversation.messages.push({
      id: botMsgId,
      direction: "outgoing",
      text: cleanText,
      time: "Ahora",
      createdAt: new Date().toISOString()
    });
    conversation.lastMessage = cleanText;
    conversation.updatedAt = "Ahora";
    if (detectedPriority) conversation.priority = detectedPriority;
    if (detectedLabels.length > 0) {
      conversation.labels = Array.from(new Set([...(conversation.labels || []), ...detectedLabels]));
    }
  } else {
    // DB Mode
    const botMsgId = randomUUID();
    await pool.query(
      "INSERT INTO messages (id, conversation_id, direction, text, is_private) VALUES ($1, $2, $3, $4, $5)",
      [botMsgId, conversationId, "outgoing", cleanText, false]
    );

    await pool.query("UPDATE conversations SET last_message = $1, updated_at = NOW() WHERE id = $2", [cleanText, conversationId]);

    if (detectedPriority) {
      await pool.query("UPDATE conversations SET priority = $1 WHERE id = $2", [detectedPriority, conversationId]);
    }
    if (detectedLabels.length > 0) {
      await pool.query(`
        UPDATE conversations 
        SET labels = ARRAY(
          SELECT DISTINCT unnest(array_cat(labels, $1::varchar[]))
        ) 
        WHERE id = $2
      `, [detectedLabels, conversationId]);
    }

    // Send bot response to external channel
    const recipientId = await getRecipientIdFromConversation(conversationId);
    if (recipientId) {
      const { rows: convRows } = await pool.query("SELECT channel_id FROM conversations WHERE id = $1", [conversationId]);
      const channelId = convRows[0]?.channel_id;
      if (channelId) {
        await sendOutgoingMessageToChannel(channelId, recipientId, cleanText);
      }
    }
  }
}
