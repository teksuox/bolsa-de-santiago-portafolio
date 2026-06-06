FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias necesarias para construir el proyecto
COPY package*.json ./
RUN npm install

# Copiar el código fuente y construir la aplicación
COPY . .
RUN npm run build

# --- Stage 2: Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instalar únicamente dependencias de producción (esbuild mantiene configurado 'external' en el package.json)
COPY package*.json ./
RUN npm install --only=production --ignore-scripts

# Copiar los recursos compilados (tanto el servidor compilado dist/server.cjs como el frontend en dist/)
COPY --from=builder /app/dist ./dist

# Exponer el puerto
EXPOSE 3000

# Executable de inicio
CMD ["node", "dist/server.cjs"]