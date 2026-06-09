# 🚀 Guía de Despliegue en Portainer con Dominio portafolio.ts

## 📋 Resumen

Tu aplicación consta de 2 servicios que deben comunicarse:

1. **Backend (Node.js)** - Puerto 3002
2. **PocketBase (BaaS)** - Puerto 8090

---

## ✅ ¿Necesita PocketBase un dominio propio?

**Respuesta: NO, no es necesario**

### Por qué funciona sin dominio propio:

**Opción 1: Red Docker (Recomendado para Portainer)**
```
Backend → pocketbase:8090 (dentro de la red Docker)
```
- Los contenedores se comunican por nombre de servicio
- No necesita dominio externo
- Más seguro y eficiente

**Opción 2: Con dominio (Opcional para acceso público)**
```
Backend → pocketbase.portafolio.ts (si lo expones)
```
- Útil si necesitas acceder a PocketBase desde afuera
- Requiere configurar DNS y reverse proxy

---

## 🐳 Configuración Docker Mejorada

### 1. `docker-compose.yml` Optimizado

```yaml
version: '3.8'

services:
  # Backend - Aplicación Node.js
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: portafolio-backend:latest
    container_name: portafolio-backend
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      # URL de PocketBase (interno, dentro de la red Docker)
      - POCKETBASE_URL=http://pocketbase:8090
    depends_on:
      - pocketbase
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PocketBase - Base de datos + Auth
  pocketbase:
    image: pocketbase/pocketbase:latest
    container_name: portafolio-pocketbase
    ports:
      - "8090:8090"
    volumes:
      - ./pocketbase_data:/pb_data
    environment:
      - DEBUG=false
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 🌐 Configuración para Portainer + Dominio

### Opción A: Nginx Reverse Proxy (Recomendado)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: portafolio-backend:latest
    environment:
      - NODE_ENV=production
      - PORT=3002
      - POCKETBASE_URL=http://pocketbase:8090
    depends_on:
      - pocketbase
    restart: unless-stopped
    networks:
      - portafolio-network

  pocketbase:
    image: pocketbase/pocketbase:latest
    volumes:
      - ./pocketbase_data:/pb_data
    restart: unless-stopped
    networks:
      - portafolio-network

  # Nginx como reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
      - pocketbase
    restart: unless-stopped
    networks:
      - portafolio-network

networks:
  portafolio-network:
    driver: bridge
```

---

## 🔧 Configuración Nginx (nginx.conf)

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Frontend + Backend
    server {
        listen 80;
        server_name portafolio.ts;
        
        # Redirect HTTP a HTTPS (descomentar cuando tengas SSL)
        # return 301 https://$server_name$request_uri;

        # Frontend (index.html + assets)
        location / {
            proxy_pass http://app:3002;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # APIs del backend
        location /api/ {
            proxy_pass http://app:3002;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # PocketBase - Solo interno (no expuesto públicamente)
    # Si quieres exponer: descomentar
    # server {
    #     listen 80;
    #     server_name pocketbase.portafolio.ts;
    #     
    #     location / {
    #         proxy_pass http://pocketbase:8090;
    #         proxy_http_version 1.1;
    #         proxy_set_header Host $host;
    #         proxy_set_header X-Real-IP $remote_addr;
    #     }
    # }
}
```

---

## 📝 Actualizar Código del Frontend

### src/lib/pocketbase.ts

```typescript
import PocketBase from 'pocketbase';
import { DBBackupData } from '../db';

// Usar variable de entorno si está en servidor, else usar localhost
const DEFAULT_PB_URL = typeof window !== 'undefined' 
  ? (localStorage.getItem('pocketbase_url') || 'http://localhost:8090')
  : process.env.POCKETBASE_URL || 'http://pocketbase:8090';

export const pb = new PocketBase(DEFAULT_PB_URL);

export function updatePocketBaseUrl(url: string) {
  localStorage.setItem('pocketbase_url', url);
  pb.baseUrl = url;
}

export async function checkPocketBaseHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch (err) {
    console.warn('PocketBase health check failed:', err);
    return false;
  }
}

export async function uploadPortfolioToPB(data: DBBackupData): Promise<any> {
  if (!pb.authStore.isValid || !pb.authStore.model) {
    throw new Error('Debes iniciar sesión en PocketBase para sincronizar.');
  }

  const userId = pb.authStore.model.id;
  const records = await pb.collection('portafolios').getFullList({
    filter: `user = "${userId}"`,
    requestKey: null
  });

  if (records.length > 0) {
    return await pb.collection('portafolios').update(records[0].id, {
      data: data
    }, { requestKey: null });
  } else {
    return await pb.collection('portafolios').create({
      user: userId,
      data: data
    }, { requestKey: null });
  }
}

export async function downloadPortfolioFromPB(): Promise<DBBackupData | null> {
  if (!pb.authStore.isValid || !pb.authStore.model) {
    throw new Error('Debes iniciar sesión en PocketBase para sincronizar.');
  }

  const userId = pb.authStore.model.id;
  const records = await pb.collection('portafolios').getFullList({
    filter: `user = "${userId}"`,
    requestKey: null
  });

  return records.length > 0 ? (records[0].data as DBBackupData) : null;
}
```

---

## 🚀 Pasos para Desplegar en Portainer

### 1. Preparar el proyecto
```bash
# En tu máquina local
git add .
git commit -m "chore: preparar para despliegue en Portainer"
git push
```

### 2. En Portainer - Crear Stack

**Opción A: Sin Nginx (Simple)**
1. Ir a Portainer → Stacks → Add stack
2. Nombre: `portafolio-bolsa`
3. Pegar el `docker-compose.yml` simple
4. Deploy

**Opción B: Con Nginx + Dominio (Recomendado)**
1. Crear carpeta en el servidor: `/data/portafolio/`
2. Copiar archivos:
   - `docker-compose.yml`
   - `nginx.conf`
   - Dockerfile (si usas build local)
3. En Portainer → Stacks → Add stack
4. Seleccionar carpeta: `/data/portafolio/`
5. Deploy

### 3. Configurar DNS

En tu proveedor de DNS o en `/etc/hosts`:
```
123.45.67.89  portafolio.ts
```

### 4. Verificar conectividad

```bash
# Acceder a la app
curl http://portafolio.ts

# Verificar PocketBase (interno)
docker exec portafolio-backend curl http://pocketbase:8090/api/health

# Ver logs
docker logs portafolio-backend
docker logs portafolio-pocketbase
```

---

## 📊 Comunicación entre servicios

### ✅ Correcta (Interna, Red Docker)
```
Backend (3002) → pocketbase:8090 (nombre de servicio)
```

### ✅ También funciona (Con Nginx)
```
Cliente → portafolio.ts:80 (Nginx)
       → /api → Backend:3002
       → /pb → PocketBase:8090 (si lo configuras)
```

### ❌ No necesita
```
Backend → pocketbase.portafolio.ts (dominio externo)
```

---

## 🔐 Seguridad en Producción

### 1. SSL/TLS (HTTPS)
```bash
# Con Let's Encrypt + Certbot
certbot certonly --standalone -d portafolio.ts
```

Actualizar `nginx.conf`:
```nginx
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/portafolio.ts/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/portafolio.ts/privkey.pem;
```

### 2. Variables de entorno
Crear `.env.production`:
```
NODE_ENV=production
PORT=3002
POCKETBASE_URL=http://pocketbase:8090
```

### 3. Exponer PocketBase solo internamente
- NO abrir puerto 8090 públicamente
- Acceso solo a través de Nginx (si lo necesitas)

---

## 📈 Monitoreo

### Health Checks en Portainer
- **Backend**: `http://localhost:3002` ✓
- **PocketBase**: `http://pocketbase:8090/api/health` ✓

---

## ✨ Resumen Final

| Componente | URL Local | URL Producción | Necesita Dominio |
|-----------|-----------|----------------|------------------|
| Frontend | localhost:3002 | portafolio.ts | ✓ Sí |
| Backend APIs | localhost:3002/api | portafolio.ts/api | ✓ (mismo) |
| PocketBase | localhost:8090 | interno:8090 | ✗ No |

**Recomendación**: Usa la configuración con Nginx + Reverse Proxy. Es más segura, escalable y profesional.
