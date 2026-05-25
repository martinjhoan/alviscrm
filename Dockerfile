# Dockerfile para Alvis CRM
FROM node:20-alpine

WORKDIR /app

# Establecer entorno de producción por defecto
ENV NODE_ENV=production
ENV PORT=5173

# Copiar archivos de dependencias para instalación limpia
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el resto del código fuente del proyecto
COPY . .

# Exponer el puerto interno configurado
EXPOSE 5173

# Comando para iniciar la aplicación
CMD ["npm", "start"]
