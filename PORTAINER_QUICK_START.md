# 🚀 Despliegue en Portainer - Guía Rápida

## 1️⃣ Rama de Trabajo

```
GitHub: https://github.com/teksuox/bolsa-de-santiago-portafolio
Rama:   agents/analisis-api-yahoo-finance-error-fix
```

## 2️⃣ Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `Dockerfile` | Backend Node.js con React |
| `Dockerfile.pocketbase` | **PocketBase personalizado** - Descarga v0.39.3 desde GitHub |
| `docker-compose.yml` | Orquestación de 3 servicios |
| `nginx.conf` | Reverse proxy para portafolio.ts |
| `server.ts` | API corregida (dividend yield: 2 decimales) |

## 3️⃣ En Portainer

```
Stacks → Add Stack

Name:          portafolio-bolsa-santiago
Method:        Repository
Repository:    https://github.com/teksuox/bolsa-de-santiago-portafolio.git
Reference:     agents/analisis-api-yahoo-finance-error-fix
Compose path:  docker-compose.yml

▶ Deploy the stack
```

## 4️⃣ Servicios Que Se Crean

```
portafolio-backend      (3002)  ← Express + React
portafolio-pocketbase   (8090)  ← Base de datos (INTERNO)
portafolio-nginx        (80)    ← Reverse proxy
```

## 5️⃣ Comunicación Interna

```
Backend ↔ PocketBase (sin dominio requerido)
POCKETBASE_URL=http://pocketbase:8090
```

## 6️⃣ Acceso Público

```
Frontend: https://portafolio.ts
API:      https://portafolio.ts/api/*
```

## ⏱️ Tiempo de Despliegue

- **Primera vez**: 5-10 minutos (descarga + build)
- **Actualizaciones**: 1-3 minutos

## ✅ Verificación

```bash
# SSH a tu VPS
docker ps | grep portafolio

# Ver logs
docker logs portafolio-backend
docker logs portafolio-pocketbase
docker logs portafolio-nginx

# Probar comunicación
docker exec portafolio-backend curl http://pocketbase:8090/api/health
# Retorna: true
```

---

**¡Listo! Solo haz click en Deploy en Portainer.** 🎉
