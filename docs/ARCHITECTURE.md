# Arquitectura De Alvis CRM

Alvis CRM apunta a ser una plataforma omnicanal de automatizacion de negocios. La mensajeria debe ser nativa, no un plugin posterior.

## Principios

- Omnicanal desde el nucleo: WhatsApp, Instagram, Messenger, email, SMS y web chat deben alimentar el mismo modelo de conversaciones.
- CRM y mensajeria unificados: un mensaje puede crear contacto, oportunidad, ticket, tarea, etiqueta o automatizacion.
- Multi-tenant por diseño: cada empresa debe tener usuarios, equipos, canales, configuraciones, reglas y reportes aislados.
- Integraciones auditables: todo webhook externo debe guardarse como evento crudo antes de transformarse en mensaje o accion.
- Operacion profesional: asignacion, SLA, macros, notas internas, etiquetas, permisos, reportes y trazabilidad.

## Modelo De Dominio

- `organizations`: empresas que usan la plataforma.
- `users`: agentes, administradores y owners.
- `teams`: ventas, soporte, marketing, tecnico u otros equipos.
- `inboxes`: bandejas por canal o unidad operativa.
- `channels`: conexiones nativas como WhatsApp Cloud API, Instagram Messaging, Messenger, email, SMS y web chat.
- `contacts`: personas con historial omnicanal.
- `companies`: cuentas o empresas asociadas a contactos.
- `conversations`: hilos de atencion por contacto, canal e inbox.
- `messages`: mensajes entrantes, salientes, notas privadas y eventos de sistema.
- `assignments`: historial de responsables, transferencias y colas.
- `labels`: etiquetas comerciales, operativas o de soporte.
- `automation_rules`: reglas con disparadores, condiciones y acciones.
- `webhook_events`: payloads crudos recibidos desde proveedores.
- `deals`: oportunidades comerciales.
- `tickets`: casos de soporte.
- `audit_logs`: acciones sensibles para cumplimiento y soporte interno.

## Flujo De Mensaje Entrante

1. El proveedor envia un webhook al endpoint nativo.
2. El backend valida firma, token y origen.
3. El payload crudo se guarda en `webhook_events`.
4. El normalizador convierte el evento en `contact`, `conversation` y `message`.
5. El motor de reglas evalua automatizaciones.
6. El enrutador asigna inbox, equipo y agente.
7. El SLA se calcula segun horario, prioridad y reglas del cliente.
8. El frontend actualiza la bandeja del agente.

## Bandejas Separadas

Cada mensajeria debe operar como bandeja independiente, aunque todas vivan en el mismo centro omnicanal.

Una bandeja debe tener:

- Canal nativo asociado.
- Nombre operativo, por ejemplo `WhatsApp Principal` o `Instagram Leads`.
- Equipo por defecto.
- Reglas de asignacion.
- Horario de atencion.
- SLA propio.
- Permisos por rol.
- Macros disponibles.
- Filtros guardados.
- Reportes por volumen, respuesta, resolucion y conversion.

Esto permite mantener orden real por canal sin perder la vista global del cliente.

## Experiencia Por Canal

El Inbox no debe sentirse como una tabla generica. Debe tener un selector de canal y, al cambiarlo, adaptar la experiencia:

- WhatsApp Business: lista compacta, cabecera verde, burbujas de chat, plantillas, catalogo, etiquetas y respuestas rapidas.
- Instagram Direct: contexto social, perfil, comentarios, leads, etiquetas y respuestas visuales.
- Messenger: pagina, handoff, respuestas rapidas y asignacion.
- Email: asunto, remitente, CC, adjuntos y seguimiento.
- SMS: mensajes breves, opt-out, OTP y plantillas transaccionales.
- Web Chat: visitante, pagina actual, historial de navegacion y captura de lead.

La logica interna debe seguir normalizada, pero la interfaz debe respetar el lenguaje operativo de cada canal.

## Visibilidad Configurable

Todo modulo que no sea esencial debe poder ocultarse por organizacion:

- Modulos del menu principal.
- Canales de mensajeria.
- Acciones rapidas por canal.
- Layout operativo: barra lateral, marca, contadores, cabecera del canal y panel de contacto.
- Macros y flujos no usados.
- Reportes no disponibles para el plan o rol.

`Panel`, `Inbox` y `Ajustes` deben permanecer siempre visibles para evitar que un usuario deje la app sin navegacion basica.

## API Actual

Esta primera fase usa Node nativo y memoria de proceso para evitar dependencias iniciales.

- `GET /api/health`: estado del servicio.
- `GET /api/bootstrap`: estado inicial completo de la app.
- `GET /api/conversations`: conversaciones omnicanal.
- `GET /api/channels`: canales disponibles.
- `GET /api/teams`: equipos operativos.
- `GET /api/macros`: macros configuradas.
- `POST /api/records`: crear contacto, empresa, oportunidad, tarea, ticket o campana.

## Siguiente Backend Profesional

- Migrar persistencia de memoria a PostgreSQL.
- Agregar autenticacion con sesiones seguras.
- Agregar `organization_id` a todas las tablas operativas.
- Crear endpoints para mensajes, notas privadas, asignacion, etiquetas, macros y SLA.
- Implementar webhooks por proveedor: Meta, email, SMS y web chat.
- Agregar cola de trabajos para procesar webhooks y automatizaciones.
- Agregar websocket o server-sent events para actualizaciones en tiempo real.
- Crear modulo de permisos por rol y auditoria.

## Preparacion Para Meta

- Separar configuracion por cuenta de negocio, pagina, numero y app.
- Guardar tokens cifrados.
- Validar webhooks y conservar payloads crudos.
- Implementar plantillas WhatsApp, opt-in, politicas de ventana de atencion y estados de entrega.
- Mantener logs de envio, recepcion, errores y reintentos.
