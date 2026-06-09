# Analizador y Portafolio de Inversión - Bolsa de Santiago

Este proyecto es un sistema interactivo y moderno para gestionar portafolios de inversión, realizar un seguimiento de dividendos y simular devoluciones de impuestos (F-22) para acciones listadas en la **Bolsa de Santiago (Chile)**.

*Este archivo y el proyecto completo han sido construidos por un **Asistente de Inteligencia Artificial (AI Coding Agent)** basado en las ideas, comentarios y dirección de un **Humano**.*

---

## 🚀 Características Principales

### 1. Portafolio Personalizado (`Mi Portafolio`)
*   **Gestión Detallada**: Registra tus compras de acciones indicando el ticker (ej. *CHILE*, *SQM-B*, *VAPORES*, *ANDINA-B*, *CFISPETF*), número de acciones, precio promedio de compra, fecha de adquisición y rendimiento acumulado objetivo.
*   **Valorización en Tiempo Real**: Visualiza el capital aportado versus el valor de mercado actual actualizado automáticamente, incluyendo la variación diaria en pesos chilenos (CLP).
*   **Métricas de Desempeño**: Cálculo del rendimiento anualizado aproximado del portafolio.

### 2. Tablero de Mercado (`Bolsa de Santiago`)
*   **Grilla Interactiva**: Una vista optimizada que simula la cotización de acciones del mercado chileno en tiempo real (datos de Yahoo Finance vía API interna / proxy).
*   **Personalización Absoluta**: 
    *   Puedes **eliminar/ocultar** tickers de la grilla que no te interesen para despejar tu área de trabajo.
    *   Puedes **buscar y agregar** cualquier acción o ETF disponible (ej. cotizaciones internacionales, ETFs extranjeros o locales como *CFISPETF*).
*   **Persistencia de Visibilidad**: Si decides ocultar acciones de la lista o agregar nuevas, estas preferencias se guardarán de forma permanente.

### 3. Seguimiento de Dividendos (`Historial de Dividendos`)
*   **Sincronización Inteligente**: Auto-carga el historial real de dividendos reportados para tus acciones directamente desde fuentes financieras según las fechas en que las has poseído.
*   **Control de Cobro**: Marca dividendos como "Cobrados" o "Pendientes" para mantener un flujo de caja preciso.
*   **Filtros**: Permite organizar visualmente tus retornos por año u origen.

### 4. Optimizador de Impuestos (`Devolución F-22`)
*   **Cálculo Automatizado**: Simulación de la devolución de impuesto global complementario en Chile para dividendos que otorgan crédito tributario (con o sin restitución).
*   **Personalización de Tasas**: Ajusta la tasa proyectada del Impuesto Global Complementario (IGC) y simula el impacto neto de tus retornos en la declaración anual.

### 5. Sincronización en Tiempo Real (`PocketBase Cloud & Local`)
*   **Sincronización Multidispositivo**: El sistema integra soporte completo para **PocketBase**, permitiendo que cualquier cambio (compras de acciones, dividendos ingresados, tasas de impuestos o tickers ocultos en la grilla) se actualice automáticamente en tiempo real en todos tus dispositivos y ordenadores.
*   **Conservación de Preferencias**: A diferencia de soluciones tradicionales, el respaldo **guarda exactamente el estado de la grilla** de la "Bolsa de Santiago". Si ocultaste acciones o agregaste activos personalizados en tu sesión, al importar el respaldo se restaurarán con absoluta precisión, mostrando únicamente lo que decidiste conservar en ese momento.

---

## 🛠️ Stack Tecnológico

*   **Frontend**: React (v18+) con TypeScript y Vite.
*   **Estilos**: Tailwind CSS con un diseño elegante de alto contraste moderno, optimizado con tipografía clara y visualización amigable en dispositivos móviles y de escritorio.
*   **Gráficos**: Recharts / D3 para analítica visual del portafolio y evolución de dividendos.
*   **Animaciones**: `motion` (Framer Motion) para transiciones fluidas de pestañas e interacciones de usuario.
*   **Persistencia**: Arquitectura híbrida integrada con **IndexedDB** como motor de base de datos relacional/documental del lado del cliente y **localStorage** como caché de sincronización rápida para preferencias de vista del navegador.

---

## ⚙️ Desarrollo e Instalación

Para ejecutar este proyecto en tu entorno local, asegúrate de tener instalado Node.js (versión 18 o superior) o Docker.

### 💻 Ejecución Local Tradicional

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

3. **Compilar para producción**:
   ```bash
   npm run build
   ```

### 🐳 Ejecución utilizando Docker

Si prefieres usar Docker para simplificar el despliegue o la ejecución, la aplicación está configurada para usar el puerto configurado mediante la variable de entorno `PORT` (puerto predeterminado: **3002**):

#### Alternativa A: Usando Docker Compose (Recomendado con PocketBase)
Levanta el simulador del portafolio y el servidor **PocketBase** de forma simultánea con un único comando:
```bash
docker-compose up --build
```
Al finalizar, tendrás disponibles:
- **Simulador de Bolsa de Santiago**: [http://localhost:3002](http://localhost:3002) (o el puerto que definas en `PORT`)
- **Panel Administrativo de PocketBase**: [http://localhost:8090/_/](http://localhost:8090/_/)

#### 🚀 Configurando PocketBase por primera vez:
Para que la auto-sincronización y el tiempo real funcionen, debes inicializar tu colección en PocketBase:
1. Entra a [http://localhost:8090/_/](http://localhost:8090/_/) y crea tu cuenta de administrador inicial.
2. Pulsa en **"New Collection"** y nómbrala exactamente: `portafolios`.
3. Agrega los siguientes campos en el editor visual:
   - `user`: Tipo **Relation** apuntando a `users`. Marca `"Max Select" = 1` y `"Non-empty (Required)" = Sí`.
   - `data`: Tipo **JSON**. Marca `"Non-empty (Required)" = Sí`.
4. Ve a la pestaña **"API Rules"** de la colección `portafolios` e ingresa la siguiente regla en los campos **List, View, Create y Update**:
   ```
   user = @request.auth.id
   ```
5. ¡Listo! Ya puedes ir al Simulador, ingresar al menú **Sincronización Cloud**, crear tu usuario normal e iniciar la auto-sincronización en tiempo real.

#### Alternativa B: Usando Docker CLI (Solo App)
1. **Construir la imagen**:
   ```bash
   docker build -t santiago-bolsa-portafolio .
   ```

2. **Iniciar el contenedor**:
   ```bash
   docker run -d -p 3002:3002 --name portafolio-chile santiago-bolsa-portafolio
   ```

La aplicación estará disponible y lista en tu navegador en [http://localhost:3002](http://localhost:3002). Si utilizas este método individual, puedes conectar la aplicación a cualquier instancia externa o local de PocketBase que tengas disponible de forma manual introduciendo su dirección IP o URL en la pestaña de configuración.

---

## 📝 Nota del Desarrollador (IA)
Este proyecto fue diseñado con el objetivo de proveer una experiencia de usuario extremadamente pulida y profesional para inversores del retail en Chile. Todo el código, la lógica de simulación, la persistencia en IndexedDB y la sincronización con Yahoo Finance fueron cuidadosamente ensamblados por la IA interpretando fielmente los requerimientos informados.
