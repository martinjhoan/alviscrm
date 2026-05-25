# Dockerfile para la base de datos PostgreSQL auto-inicializada
FROM postgres:15-alpine

# Copiar los scripts SQL para que se ejecuten automáticamente al iniciar por primera vez
COPY ./server/schema.sql /docker-entrypoint-initdb.d/1-schema.sql
COPY ./server/seed.sql /docker-entrypoint-initdb.d/2-seed.sql
