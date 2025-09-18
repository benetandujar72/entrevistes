# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json ./
RUN npm ci || npm install

# Copiar código fuente
COPY . .

EXPOSE 5173

# Ejecutar el servidor de desarrollo en el contenedor
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]


