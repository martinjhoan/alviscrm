-- Script de Inicialización de Datos por Defecto (Seed) para PostgreSQL en Alvis CRM
-- Inicializa la estructura con configuraciones de canales y supervisor por defecto

-- 1. Insertar Organización por Defecto
INSERT INTO organizations (id, name, plan, timezone)
VALUES (
    'org_alvis'::uuid, 
    'Alvis CRM', 
    'Omnicanal', 
    'America/Santo_Domingo'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Canales de Comunicación con sus capacidades y estado inicial de diseño
INSERT INTO channels (id, name, provider, status, capability)
VALUES 
    ('whatsapp', 'WhatsApp Business Cloud API', 'Meta', 'Diseñado', 'Mensajes, plantillas, webhooks, asignacion y SLA'),
    ('instagram', 'Instagram Messaging API', 'Meta', 'Diseñado', 'DMs, comentarios, handoff a agentes y etiquetado'),
    ('messenger', 'Messenger Platform', 'Meta', 'Diseñado', 'Conversaciones, respuestas rapidas y automatizaciones'),
    ('email', 'Email IMAP/SMTP', 'Nativo', 'Planificado', 'Bandeja, respuestas, tracking y secuencias'),
    ('sms', 'SMS', 'Proveedor externo', 'Planificado', 'Notificaciones, OTP y campañas transaccionales'),
    ('webchat', 'Web Chat', 'Alvis', 'Planificado', 'Widget embebido, bots y captura de leads')
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Equipos de Trabajo Iniciales
INSERT INTO teams (id, name, routing)
VALUES 
    ('e1111111-1111-1111-1111-111111111111'::uuid, 'Soporte', 'Round-robin'),
    ('e2222222-2222-2222-2222-222222222222'::uuid, 'Ventas', 'Por prioridad'),
    ('e3333333-3333-3333-3333-333333333333'::uuid, 'Marketing', 'Carga balanceada'),
    ('e4444444-4444-4444-4444-444444444444'::uuid, 'Tecnico', 'Round-robin')
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Agentes Iniciales (Asociados a sus respectivos equipos)
INSERT INTO agents (id, name, email, role, team_id)
VALUES 
    ('a1111111-1111-1111-1111-111111111111'::uuid, 'Maria R.', 'maria.r@alviscrm.com', 'Administrador', 'e2222222-2222-2222-2222-222222222222'::uuid),
    ('a2222222-2222-2222-2222-222222222222'::uuid, 'Rafael C.', 'rafael.c@alviscrm.com', 'Agente', 'e2222222-2222-2222-2222-222222222222'::uuid),
    ('a3333333-3333-3333-3333-333333333333'::uuid, 'Daniela P.', 'daniela.p@alviscrm.com', 'Supervisor', 'e1111111-1111-1111-1111-111111111111'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 5. Insertar Automatizaciones por Defecto
INSERT INTO automations (id, name, trigger_event, action_event, status)
VALUES 
    ('f1111111-1111-1111-1111-111111111111'::uuid, 'Asignar lead nuevo', 'incoming_message_without_owner', 'assign_by_schedule_and_availability', 'Activa'),
    ('f2222222-2222-2222-2222-222222222222'::uuid, 'Crear oportunidad', 'whatsapp_qualified_lead', 'create_deal_and_task', 'Borrador'),
    ('f3333333-3333-3333-3333-333333333333'::uuid, 'SLA soporte', 'unanswered_ticket_30_min', 'escalate_to_supervisor', 'Activa')
ON CONFLICT (id) DO NOTHING;

-- 6. Insertar Macros por Defecto
INSERT INTO macros (id, name, visibility, actions)
VALUES 
    ('m1111111-1111-1111-1111-111111111111'::uuid, 'Transferir a ventas', 'Publica', ARRAY['Asignar equipo: Ventas', 'Agregar etiqueta: sales-lead', 'Enviar respuesta de agenda']),
    ('m2222222-2222-2222-2222-222222222222'::uuid, 'Escalar a soporte tecnico', 'Publica', ARRAY['Asignar equipo: Tecnico', 'Prioridad: Alta', 'Nota interna con contexto']),
    ('m3333333-3333-3333-3333-333333333333'::uuid, 'Cerrar con encuesta', 'Publica', ARRAY['Enviar CSAT', 'Resolver conversacion', 'Enviar transcripcion'])
ON CONFLICT (id) DO NOTHING;

-- 7. Insertar Ajustes de Supervisor por Defecto
INSERT INTO manager_settings (id, business_hours, sla_limits, agent_capacity, routing_method)
VALUES (
    1,
    '{
        "activeDays": ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"],
        "startHour": "09:00",
        "endHour": "18:00"
    }'::jsonb,
    '{
        "Alta": 15,
        "Media": 60,
        "Baja": 240
    }'::jsonb,
    5,
    'round-robin'
)
ON CONFLICT (id) DO UPDATE 
SET business_hours = EXCLUDED.business_hours,
    sla_limits = EXCLUDED.sla_limits,
    agent_capacity = EXCLUDED.agent_capacity,
    routing_method = EXCLUDED.routing_method;
