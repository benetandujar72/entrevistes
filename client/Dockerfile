# syntax=docker/dockerfile:1

# Etapa 1: Dependencias
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm install

# Etapa 2: Desarrollo
FROM node:20-alpine AS dev
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    wget \
    && rm -rf /var/cache/apk/*

# Copiar dependencias
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Generar archivos de SvelteKit necesarios para desarrollo
RUN npm run prepare

# Pre-optimizar dependencias de Vite para evitar reoptimizaciones
RUN npx vite optimize || true

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 5173

# Comando de desarrollo
# Usar node directamente para mejor manejo de señales
CMD ["node", "node_modules/.bin/vite", "dev"]

# Etapa 3: Producción (build)
FROM node:20-alpine AS build
WORKDIR /app

# Copiar dependencias
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Etapa 4: Servidor de producción
FROM node:20-alpine AS prod
WORKDIR /app

# Copiar archivos construidos y dependencias de producción
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5173

# Ejecutar servidor Node de SvelteKit
ENV PORT=5173
ENV HOST=0.0.0.0
CMD ["node", "build/index.js"]


