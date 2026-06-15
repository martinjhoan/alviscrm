-- Schema de Base de Datos PostgreSQL para Alvis CRM
-- Fase: Omnicanalidad y Alta Disponibilidad

-- Habilitar extensión para generación de UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Organizaciones
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'Omnicanal',
    timezone VARCHAR(100) DEFAULT 'America/Santo_Domingo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Canales (WhatsApp, Instagram, Email, etc.)
CREATE TABLE IF NOT EXISTS channels (
    id VARCHAR(50) PRIMARY KEY, -- 'whatsapp', 'instagram', 'messenger', 'email', 'sms', 'webchat'
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Diseñado', -- 'Diseñado', 'Activo', 'Inactivo'
    capability TEXT,
    -- Credenciales de API (Encriptadas o seguras)
    phone_number_id VARCHAR(255),
    access_token TEXT,
    whatsapp_business_account_id VARCHAR(255),
    verify_token VARCHAR(255), -- Para validación de Webhooks de Meta
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Equipos de Trabajo
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    routing VARCHAR(100) DEFAULT 'Round-robin', -- 'Round-robin', 'Por prioridad', 'Carga balanceada'
    agents INTEGER DEFAULT 0,
    open INTEGER DEFAULT 0,
    first_response VARCHAR(50) DEFAULT '',
    resolution VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Agentes (Usuarios de la Plataforma)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'Agente', -- 'Administrador', 'Supervisor', 'Agente'
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Contactos
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Nuevo', -- 'Nuevo', 'Contactado', 'Calificado', 'Cliente'
    value NUMERIC(12, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    notes TEXT,
    phone VARCHAR(50),
    instagram_psid VARCHAR(100),
    messenger_psid VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Conversaciones Omnicanal
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(50) REFERENCES channels(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    inbox VARCHAR(255) DEFAULT 'Principal',
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Abierta', -- 'Abierta', 'Pendiente', 'Resuelta'
    priority VARCHAR(50) DEFAULT 'Media', -- 'Baja', 'Media', 'Alta'
    labels VARCHAR(100)[] DEFAULT '{}', -- Etiquetas (ej. ['sales-lead', 'vip'])
    sla_limit_minutes INTEGER DEFAULT 60, -- SLA en minutos
    last_message TEXT,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    private_note TEXT,
    responder VARCHAR(20) DEFAULT 'bot',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Mensajes y Notas Privadas (Tipo Chatwoot)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL, -- 'incoming' (cliente) o 'outgoing' (agente/bot)
    text TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE, -- TRUE si es una Nota Privada (color amarillo en Chatwoot)
    sender_id UUID REFERENCES agents(id) ON DELETE SET NULL, -- NULL si viene del cliente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Empresas
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Prospecto', -- 'Prospecto', 'Activa', 'En riesgo', 'Inactiva'
    value NUMERIC(12, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabla de Oportunidades de Venta (Deals)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Prospecto', -- 'Prospecto', 'Propuesta', 'Negociacion', 'Cerrado'
    value NUMERIC(12, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla de Tareas
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'Hoy', 'En curso', 'Completada'
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabla de Tickets de Soporte
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Abierto', -- 'Abierto', 'En revision', 'Esperando cliente', 'Resuelto'
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tabla de Automatizaciones (Flujos)
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(255) NOT NULL, -- 'incoming_message', 'deal_stage_changed', etc.
    action_event VARCHAR(255) NOT NULL, -- 'assign_team', 'create_task', etc.
    status VARCHAR(50) DEFAULT 'Borrador', -- 'Borrador', 'Activa'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tabla de Macros (Respuestas Rápidas / Acciones en Lote)
CREATE TABLE IF NOT EXISTS macros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    visibility VARCHAR(50) DEFAULT 'Publica', -- 'Publica', 'Privada'
    actions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Tabla de Ajustes de Supervisor
CREATE TABLE IF NOT EXISTS manager_settings (
    id SERIAL PRIMARY KEY,
    business_hours JSONB NOT NULL DEFAULT '{
        "activeDays": ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"],
        "startHour": "09:00",
        "endHour": "18:00"
    }'::jsonb,
    sla_limits JSONB NOT NULL DEFAULT '{
        "Alta": 15,
        "Media": 60,
        "Baja": 240
    }'::jsonb,
    agent_capacity INTEGER DEFAULT 5,
    routing_method VARCHAR(100) DEFAULT 'round-robin',
    google_client_id VARCHAR(255),
    bot_enabled BOOLEAN DEFAULT TRUE,
    bot_provider VARCHAR(50) DEFAULT 'openai',
    bot_model VARCHAR(100) DEFAULT 'gpt-4o',
    bot_api_key VARCHAR(255) DEFAULT '',
    bot_instructions TEXT DEFAULT 'Eres un asistente de atención al cliente útil y educado para Alvis CRM.',
    bot_resolution_timeout INTEGER DEFAULT 30,
    bot_transfer_human_keywords TEXT DEFAULT 'humano, agente, asesor, persona',
    bot_auto_label BOOLEAN DEFAULT TRUE,
    bot_auto_priority BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Creación de Índices para Búsquedas de Alta Velocidad (Optimización de Base de Datos)
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_team ON agents(team_id);

-- 15. Tabla de Campañas (Marketing)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Borrador', -- 'Borrador', 'Programada', 'Activa', 'Finalizada'
    value NUMERIC(12, 2) DEFAULT 0.00,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Conexiones de Mensajería por Usuario (multi-número WhatsApp + webhook saliente a n8n/otras apps)
-- Nota: estas columnas/tablas también se crean automáticamente en runMigrations() de server.mjs,
-- por lo que en bases existentes NO requieren cambios manuales (se migran al reiniciar el servidor).
-- 'id' y 'owner_id' son VARCHAR (no UUID) para coincidir con los slugs generados por la app.
CREATE TABLE IF NOT EXISTS messaging_connections (
    id VARCHAR(40) PRIMARY KEY,            -- slug usado en la URL del webhook (ej. 'wa-ab12cd34ef56')
    owner_id VARCHAR(64),                  -- agents.id del usuario dueño de la conexión
    channel_id VARCHAR(30) DEFAULT 'whatsapp',
    label VARCHAR(120) DEFAULT 'WhatsApp', -- nombre visible del número
    phone_id VARCHAR(80),                  -- Phone Number ID (Meta)
    business_account_id VARCHAR(80),
    access_token TEXT,                     -- token del System User (Meta)
    verify_token VARCHAR(160),             -- token de verificación del webhook
    phone_display VARCHAR(60),
    forward_url TEXT,                      -- webhook saliente (n8n u otra app)
    forward_secret VARCHAR(200),           -- enviado como header X-Alvis-Secret
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messaging_connections_owner ON messaging_connections(owner_id);

-- Columnas añadidas para mensajería multiusuario
ALTER TABLE agents ADD COLUMN IF NOT EXISTS public_id VARCHAR(24);          -- "User ID" de mensajería
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS connection_id VARCHAR(40); -- conexión (número) usada
