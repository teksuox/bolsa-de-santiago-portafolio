# Guía de Docker - Simulador de Bolsa de Santiago (IPSA)

Debido a que la interfaz de "Code" de Google AI Studio filtra ciertos archivos sin extensión o con un punto inicial (como `Dockerfile` y `.dockerignore`) para mantener la lista de archivos de desarrollo de React más limpia, hemos creado este documento **`DOCKER.md`** para que siempre tengas acceso inmediato a las configuraciones exactas y puedas copiarlas directamente de ser necesario.

Los archivos reales (`Dockerfile`, `.dockerignore`, `docker-compose.yml`) **ya están creados y guardados en la raíz** del proyecto, por lo que el comando de Docker funcionará automáticamente. Si por alguna razón el exportador ZIP de tu entorno los omitió, copia el contenido de las secciones a continuación para recrearlos de forma idéntica.

---

## 1. Contenido de `Dockerfile`
Crea un archivo llamado `Dockerfile` en el directorio raíz con este contenido:

```dockerfile
# --- Stage 1: Build ----
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
ENV PORT=3002

# Instalar únicamente dependencias de producción (esbuild mantiene configurado 'external' en el package.json)
COPY package*.json ./
RUN npm install --only=production --ignore-scripts

# Copiar los recursos compilados (tanto el servidor compilado dist/server.cjs como el frontend en dist/)
COPY --from=builder /app/dist ./dist

# Exponer el puerto
EXPOSE 3002

# Executable de inicio
CMD ["node", "dist/server.cjs"]
```

---

## 2. Contenido de `.dockerignore`
Crea un archivo llamado `.dockerignore` en el directorio raíz con este contenido:

```text
node_modules
dist
.env
.git
.github
npm-debug.log
README.md
Dockerfile
docker-compose.yml
```

---

## 3. Contenido de `docker-compose.yml`
Crea un archivo llamado `docker-compose.yml` en el directorio raíz con este contenido:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: simulador-bolsa-santiago:latest
    container_name: bolsa-santiago-simulador
    ports:
      - "${PORT:-3002}:${PORT:-3002}"
    environment:
      - PORT=${PORT:-3002}
      - NODE_ENV=production
      # - GEMINI_API_KEY=tu-api-key-aqui     # Descomenta e ingresa tu clave si se requiere Gemini API
    restart: unless-stopped
```

---

## 💻 Instrucciones de Uso

Para levantar el simulador de portafolio con Docker de manera instantánea, sigue estos pasos desde la consola de tu terminal dentro de la carpeta del proyecto:

1. **Construir y levantar el contenedor:**
   ```bash
   docker compose up -d --build
   ```

2. **Verificar que el contenedor esté corriendo:**
   ```bash
   docker ps
   ```

3. **Acceder a la aplicación:**
   Abre tu navegador de preferencia e ingresa a: **`http://localhost:3002`**

4. **Para detener el contenedor:**
   ```bash
   docker compose down
   ```
