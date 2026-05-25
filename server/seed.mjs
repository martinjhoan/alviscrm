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
      contacts: [
        { id: randomUUID(), name: "Laura Jimenez", company: "Innova Legal", status: "Calificado", value: 18000, owner: "Comercial", notes: "Busca automatizar seguimiento de clientes corporativos.", createdAt: "2026-05-24" },
        { id: randomUUID(), name: "Carlos Medina", company: "Medina Group", status: "Contactado", value: 8200, owner: "Ventas", notes: "Interesado en paquete mensual de gestion.", createdAt: "2026-05-24" }
      ],
      companies: [
        { id: randomUUID(), name: "Innova Legal", company: "Servicios profesionales", status: "Activa", value: 42000, owner: "Cuentas", notes: "Cuenta prioritaria con potencial de expansion.", createdAt: "2026-05-24" },
        { id: randomUUID(), name: "Norte Supply", company: "Distribucion", status: "Prospecto", value: 26000, owner: "Ventas", notes: "Evaluando propuesta para equipo completo.", createdAt: "2026-05-24" }
      ],
      deals: [
        { id: randomUUID(), name: "Implementacion CRM", company: "Innova Legal", status: "Negociacion", value: 42000, owner: "Alvis", notes: "Decision esperada esta semana.", createdAt: "2026-05-24" },
        { id: randomUUID(), name: "Plan comercial anual", company: "Norte Supply", status: "Propuesta", value: 26000, owner: "Alvis", notes: "Enviar comparativo de planes.", createdAt: "2026-05-24" },
        { id: randomUUID(), name: "Capacitacion equipo", company: "Medina Group", status: "Prospecto", value: 8200, owner: "Ventas", notes: "Agendar demo con gerencia.", createdAt: "2026-05-24" }
      ],
      tasks: [
        { id: randomUUID(), name: "Llamar a Laura", company: "Innova Legal", status: "Hoy", value: 0, owner: "Alvis", notes: "Confirmar alcance y fecha de inicio.", createdAt: "2026-05-24" },
        { id: randomUUID(), name: "Enviar propuesta actualizada", company: "Norte Supply", status: "Pendiente", value: 0, owner: "Ventas", notes: "Incluir descuento por pago anual.", createdAt: "2026-05-24" }
      ],
      tickets: [
        { id: randomUUID(), name: "Consulta sobre facturacion", company: "Innova Legal", status: "En revision", value: 0, owner: "Soporte", notes: "Cliente solicita desglose por servicio.", createdAt: "2026-05-24" }
      ],
      campaigns: [
        { id: randomUUID(), name: "Reactivacion clientes frios", company: "Base general", status: "Activa", value: 12000, owner: "Marketing", notes: "Secuencia de 3 correos y llamada final.", createdAt: "2026-05-24" }
      ]
    },
    conversations: [
      { id: randomUUID(), channel: "WhatsApp", contact: "Laura Jimenez", company: "Innova Legal", inbox: "WhatsApp Principal", team: "Ventas", status: "Abierta", priority: "Alta", labels: ["sales-lead", "vip"], sla: "12 min", lastMessage: "Perfecto, enviame la propuesta con integracion a WhatsApp.", owner: "Maria R.", updatedAt: "Hace 8 min", privateNote: "@Alvis validar plan anual antes de enviar contrato." },
      { id: randomUUID(), channel: "Instagram", contact: "Norte Supply", company: "Norte Supply", inbox: "Instagram Leads", team: "Marketing", status: "Pendiente", priority: "Media", labels: ["new-customer"], sla: "42 min", lastMessage: "Gracias por escribirnos. Ya te conecto con ventas.", owner: "Sin asignar", updatedAt: "Hace 31 min", privateNote: "Lead entrante por campaña de automatizacion." },
      { id: randomUUID(), channel: "Messenger", contact: "Carlos Medina", company: "Medina Group", inbox: "Facebook Page", team: "Ventas", status: "Abierta", priority: "Media", labels: ["automation"], sla: "1 h 10 min", lastMessage: "Quiero saber si el CRM puede asignar leads automatico.", owner: "Rafael C.", updatedAt: "Hoy", privateNote: "Interesado en auto-asignacion y CRM." },
      { id: randomUUID(), channel: "Email", contact: "Finanzas Innova", company: "Innova Legal", inbox: "Soporte Email", team: "Soporte", status: "Resuelta", priority: "Baja", labels: ["billing"], sla: "Cumplido", lastMessage: "Factura recibida, muchas gracias.", owner: "Daniela P.", updatedAt: "Ayer", privateNote: "Caso cerrado con confirmacion del cliente." }
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
      { id: randomUUID(), name: "Marketing", agents: 2, open: 5, firstResponse: "4m 05s", resolution: "4h 15m", routing: "Por campana" },
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
