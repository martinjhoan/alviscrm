import { randomUUID } from "node:crypto";

export function createSeedData() {
  return {
    organization: {
      id: "org_alvis",
      name: "Alvis CRM",
      plan: "Omnicanal",
      timezone: "America/Santo_Domingo"
    },
    records: {
      contacts: [],
      companies: [],
      deals: [],
      tasks: [],
      tickets: [],
      campaigns: []
    },
    conversations: [
      {
        id: "c2222222-2222-2222-2222-222222222222",
        channel: "WhatsApp",
        contact: "Cliente Demo",
        company: "Empresa de Prueba",
        inbox: "WhatsApp Principal",
        team: "Soporte",
        status: "Abierta",
        priority: "Alta",
        labels: ["sales-lead", "vip"],
        lastMessage: "Hola, me gustaría recibir información.",
        owner: "Maria R.",
        responder: "bot",
        updatedAt: "Ahora",
        messages: [
          {
            id: "m2222222-2222-2222-2222-222222222222",
            direction: "incoming",
            text: "Hola, me gustaría recibir información.",
            time: "Ahora",
            createdAt: new Date().toISOString()
          }
        ]
      }
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
      { id: randomUUID(), name: "Asignar lead nuevo", trigger: "Mensaje entrante sin propietario", action: "Asignar por horario y disponibilidad", status: "Activa" },
      { id: randomUUID(), name: "Crear oportunidad", trigger: "Lead calificado en WhatsApp", action: "Crear deal y tarea de seguimiento", status: "Borrador" },
      { id: randomUUID(), name: "SLA soporte", trigger: "Ticket sin respuesta por 30 minutos", action: "Escalar a supervisor", status: "Activa" }
    ],
    teams: [
      { id: randomUUID(), name: "Soporte", agents: 5, open: 24, firstResponse: "1m 45s", resolution: "2h 30m", routing: "Round-robin" },
      { id: randomUUID(), name: "Ventas", agents: 3, open: 8, firstResponse: "3m 10s", resolution: "6h 20m", routing: "Por prioridad" },
      { id: randomUUID(), name: "Marketing", agents: 2, open: 5, firstResponse: "4m 05s", resolution: "4h 15m", routing: "Por campaña" },
      { id: randomUUID(), name: "Tecnico", agents: 4, open: 6, firstResponse: "7m 40s", resolution: "8h 05m", routing: "Escalamiento" }
    ],
    macros: [
      { id: randomUUID(), name: "Transferir a ventas", visibility: "Publica", actions: ["Asignar equipo: Ventas", "Agregar etiqueta: sales-lead", "Enviar respuesta de agenda"] },
      { id: randomUUID(), name: "Escalar a soporte tecnico", visibility: "Publica", actions: ["Asignar equipo: Tecnico", "Prioridad: Alta", "Nota interna con contexto"] },
      { id: randomUUID(), name: "Cerrar con encuesta", visibility: "Publica", actions: ["Enviar CSAT", "Resolver conversacion", "Enviar transcripcion"] },
      { id: randomUUID(), name: "Seguimiento luego", visibility: "Privada", actions: ["Posponer 24h", "Agregar etiqueta: follow-up", "Crear tarea"] }
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
    }
  };
}
