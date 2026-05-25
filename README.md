# Alvis CRM

Primera base funcional de un CRM profesional omnicanal creado desde cero.

## Que incluye

- Panel ejecutivo con metricas comerciales.
- Inbox unificado para mensajeria.
- Inbox con selector desplegable por canal y experiencia visual propia por mensajeria.
- Ajustes para ocultar modulos y canales que no se esten utilizando.
- Ajustes para ocultar barra lateral, marca, contadores, botones del canal y panel de contacto.
- Gestion de contactos, empresas, oportunidades, tareas, tickets y campañas.
- Modulo de canales nativos: WhatsApp Business Cloud API, Instagram Messaging, Messenger, email, SMS y web chat.
- Modulo de automatizaciones sobre mensajes, leads, oportunidades y soporte.
- Equipos, colas, asignacion, SLA, prioridades, etiquetas, notas privadas y macros.
- Pipeline comercial por etapas.
- Busqueda global.
- Creacion rapida de registros.
- Exportacion CSV por modulo.
- Reportes basicos de ventas.
- Tema claro/oscuro.
- Persistencia local con `localStorage`.

## Como abrirlo

Abre `index.html` en tu navegador. No requiere instalacion ni servidor para esta primera version.

La forma recomendada desde esta fase es levantar el backend local:

```bash
npm run dev
```

Luego abre `http://127.0.0.1:5173`.

También puedes usar:

```bash
node server.mjs
```

## Docker & Despliegue (Easypanel)

El proyecto incluye soporte nativo y optimizado para contenedores Docker, ideal para producción y despliegue rápido en plataformas como **Easypanel**.

### 1. Despliegue con Docker Compose (Recomendado)
Puedes iniciar la aplicación localmente o en tu servidor ejecutando:

```bash
docker compose up -d --build
```

Esto compilará la imagen de Docker basada en `Dockerfile` (usando la imagen oficial ligera de Node 20 Alpine) y mapeará el puerto `5173`.

### 2. Guía de Instalación en Easypanel

**Easypanel** te permite desplegar de tres formas distintas y sumamente sencillas:

#### Método A: Usando el Dockerfile del repositorio (Recomendado)
1. Ve a tu panel de **Easypanel** y crea un nuevo **App** (Aplicación).
2. En la pestaña **Source** (Origen), selecciona tu repositorio de GitHub.
3. En la sección **Build Method**, selecciona **Dockerfile**.
4. Deja la ruta por defecto (`Dockerfile`) y haz clic en **Save** y luego **Deploy**.
5. ¡Listo! Easypanel leerá el `Dockerfile` del proyecto, configurará el puerto y desplegará la app de inmediato.

#### Método B: Usando Nixpacks (Zero Config)
1. Crea un nuevo **App** en Easypanel apuntando a tu repositorio.
2. En **Build Method**, selecciona **Nixpacks** (el constructor por defecto ultra-rápido de Easypanel).
3. Nixpacks detectará automáticamente `package.json` y el script `npm start` para compilar e iniciar la aplicación sin configuraciones adicionales.

#### Método C: Usando Docker Compose en Easypanel
1. Crea un servicio de tipo **Compose** en Easypanel.
2. Pega el contenido de nuestro archivo `docker-compose.yml` en la caja de configuración.
3. Haz clic en **Deploy**.

### 3. Configuración de Variables de Entorno en Easypanel

El stack de Alvis CRM está diseñado para configurarse al 100% mediante variables de entorno dinámicas. Al desplegar en **Easypanel**, puedes establecer estas variables en la pestaña **Environment** (o **Variables de entorno**) de tus servicios correspondientes:

| Variable de Entorno | Descripción | Valor por Defecto / Sugerido |
| :--- | :--- | :--- |
| `PORT` | Puerto en el que corre el servidor de la App | `5173` |
| `POSTGRES_USER` | Usuario administrador de PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña ultra-segura para PostgreSQL | *Recomendado cambiar a algo robusto* |
| `POSTGRES_DB` | Nombre de la base de datos principal | `alvis_crm` |
| `DATABASE_URL` | Cadena de conexión JDBC/Postgres para la App y Worker | `postgresql://<USER>:<PASS>@postgresdb:5432/<DB>` |
| `REDIS_URL` | Dirección de la instancia de Redis para colas y caché | `redis://redis:6379/0` |

> [!TIP]
> **Persistencia Garantizada**: En `docker-compose.yml` hemos configurado volúmenes locales persistentes (`postgres_data` y `redis_data`). Esto asegura que cuando actualices tu aplicación en Easypanel o reinicies el servidor, toda tu base de datos de PostgreSQL y tus colas de Redis permanezcan intactas y seguras.

## Backend inicial

La app ya tiene un API local en Node nativo:

- `GET /api/health`
- `GET /api/bootstrap`
- `GET /api/conversations`
- `GET /api/channels`
- `GET /api/teams`
- `GET /api/macros`
- `POST /api/records`

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para la arquitectura omnicanal.

## Siguiente fase recomendada

1. Convertirlo en una app con backend multiusuario.
2. Crear un modelo de datos omnicanal: contactos, conversaciones, mensajes, canales, eventos, asignaciones y automatizaciones.
3. Implementar webhooks nativos para WhatsApp Business Cloud API, Instagram Messaging y Messenger.
4. Agregar autenticacion, roles, permisos, auditoria y cumplimiento.
5. Crear historial completo por cliente, con timeline de mensajes, llamadas, ventas y soporte.
6. Integrar correo, SMS, web chat, calendario, facturacion y pasarelas de pago.
7. Crear dashboards avanzados de ventas, soporte, marketing, SLA y productividad por agente.
8. Agregar funciones tipo plataforma: filtros guardados, collision detection, CSAT, macros ejecutables, business hours, capacidad por agente y reportes por inbox/equipo/etiqueta.
9. Convertir cada canal en una experiencia nativa: WhatsApp Business, Instagram Direct, Messenger, Email, SMS y Web Chat con UI, reglas y acciones propias.
10. Mantener todo modulo opcional detras de configuracion para que cada empresa vea solo lo que usa.

## Vision del producto

Alvis CRM debe evolucionar como una plataforma de automatizacion de negocios donde la mensajeria no sea un plugin externo, sino el nucleo operativo. Cada mensaje entrante debe poder crear o actualizar contactos, disparar flujos, asignar agentes, abrir oportunidades, generar tickets y alimentar reportes.
