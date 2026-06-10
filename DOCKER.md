# Guía de Docker - Simulador de Bolsa de Santiago (IPSA)

## Requisitos

- Docker y Docker Compose (o Portainer)

## Stack

- **App**: Node.js 20 con Express + Vite (puerto 3002)
- **PocketBase**: Base de datos y autenticación (puerto 8090)

## Inicio Rápido

```bash
docker compose up -d --build
```

Esto levantará ambos servicios:
- **App**: `http://localhost:3002`
- **PocketBase Admin**: `http://localhost:8090/_/`

## Configuración de PocketBase

### 1. Crear cuenta de administrador

Entra a `http://localhost:8090/_/` y crea tu cuenta de admin.

### 2. Crear colección "portafolios"

1. Ingresa a la interfaz de administración de PocketBase: `http://localhost:8090/_/`
2. Pulsa **"New Collection"** y nómbrala exactamente: `portafolios`
3. Agrega estos dos campos:
   - **`user`**: tipo **Relation** → colección `users`.
     - `"Max Select" = 1`
     - `"Non-empty (Required)" = Sí`
   - **`data`**: tipo **JSON**.
     - `"Non-empty (Required)" = Sí`
4. Ve a la pestaña **"API Rules"** de la colección `portafolios`.
5. Sustituye las reglas vacías (bloqueadas) de **List**, **View**, **Create** y **Update** por:
   ```
   user = @request.auth.id
   ```
   Esto garantiza que ningún usuario pueda espiar o modificar el portafolio de otro.

### 3. (Opcional) Configurar URL personalizada

La app detecta automáticamente la URL de PocketBase desde la variable de entorno `POCKETBASE_URL`. En Docker Compose ya viene configurada como `http://pocketbase:8090`.

Si necesitas una URL distinta (ej: subdominio público), edita `docker-compose.yml`:
```yaml
environment:
  - POCKETBASE_URL=https://tudominio.com
```

### 4. Crear usuario normal

Desde la app, usa el formulario de registro en la pestaña **Respaldo Cloud** para crear tu usuario.

## Despliegue con Portainer + CloudPanel

1. Sube el proyecto a un repositorio público en GitHub
2. En Portainer, crea un Stack apuntando al repositorio
3. Portainer construirá y ejecutará los contenedores automáticamente
4. En CloudPanel, crea un subdominio (ej: `portafolio.dafda.cl`) que apunte al puerto 3002 del contenedor
5. Para PocketBase, crea otro subdominio o accede vía IP:8090

### Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3002` | Puerto de la aplicación |
| `POCKETBASE_URL` | `http://pocketbase:8090` | URL interna de PocketBase (Docker) |
| `POCKETBASE_PUBLIC_URL` | — | URL pública que el navegador usará para conectar a PocketBase (ej: `https://pb.dafda.cl`). Requerido en producción multi-usuario. |

## Comandos Útiles

```bash
# Construir y levantar
docker compose up -d --build

# Ver logs
docker compose logs -f

# Detener
docker compose down

# Ver contenedores activos
docker ps
```
