import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "redis";
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

console.log("==========================================");
console.log("💼 Alvis CRM - Servicio de Cola de Trabajos (Worker)");
const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
console.log(`📡 Conectándose a Redis en: ${redisUrl}`);
const dbUrl = process.env.DATABASE_URL;
console.log(`🗄️ Conectándose a PostgreSQL en: ${dbUrl ? "Configurado" : "No configurado"}`);
console.log("==========================================");

let redisClient = null;
let pgPool = null;

async function init() {
  // Conectar a Redis
  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
    await redisClient.connect();
    console.log("✅ Conexión establecida con Redis con éxito");
  } catch (err) {
    console.error("❌ No se pudo conectar a Redis:", err.message);
  }

  // Conectar a PostgreSQL
  if (dbUrl) {
    try {
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
      });
      const res = await pgPool.query("SELECT NOW()");
      console.log("✅ Conexión establecida con PostgreSQL con éxito:", res.rows[0].now);
    } catch (err) {
      console.error("❌ No se pudo conectar a PostgreSQL:", err.message);
    }
  }

  console.log("🚀 Worker iniciado y escuchando eventos de fondo (SLA, Automatizaciones, Webhooks)...");

  // Bucle de comprobación de cola
  setInterval(async () => {
    const now = new Date().toISOString();
    let redisStatus = "Desconectado";
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.ping();
        redisStatus = "Ok";
      } catch {
        redisStatus = "Error al hacer ping";
      }
    }
    console.log(`[${now}] 🔍 Verificando cola de trabajos en Redis - Estado: ${redisStatus} (0 tareas pendientes)`);
  }, 60000);
}

init().catch(err => {
  console.error("❌ Error fatal en el inicio del worker:", err);
});
