# Dockerfile para Alvis CRM
FROM node:20-alpine

WORKDIR /app

# Variables de entorno por defecto (pueden ser sobreescritas por EasyPanel)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copiar archivos de dependencias para instalación limpia
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el resto del código fuente del proyecto
COPY . .

# Exponer el puerto (EasyPanel puede sobreescribir PORT via env var)
EXPOSE 3000

# Health check para que EasyPanel sepa que el servicio está vivo
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

# Comando para iniciar la aplicación
CMD ["node", "server.mjs"]
