# Resumen de Arquitectura - Multi-Docker App

## 📋 Descripción General

Aplicación multi-container que calcula valores de Fibonacci usando una arquitectura distribuida con comunicación asíncrona entre servicios.

## 🏗️ Componentes de la Arquitectura

### 1. **Client (React)**
- **Tecnología**: React con React Router
- **Puerto**: 3000 (interno)
- **Función**: Interfaz de usuario que permite:
  - Ingresar un índice para calcular Fibonacci
  - Ver valores calculados actuales (desde Redis)
  - Ver historial de valores (desde Postgres)
- **Hostname**: `client`

### 2. **Nginx (Reverse Proxy)**
- **Tecnología**: Nginx
- **Puerto**: 80 (expuesto al exterior)
- **Función**: 
  - Punto de entrada único de la aplicación
  - Enruta peticiones:
    - `/` → Client (React)
    - `/api/*` → Server (API)
    - `/ws` → WebSocket para hot-reload en desarrollo
- **Hostname**: `nginx`
- **Comunicación directa**: Usa nombres de servicios (`client`, `api`)

### 3. **Server (API - Express)**
- **Tecnología**: Node.js + Express
- **Puerto**: 5000 (interno)
- **Hostname**: `api`
- **Función**: API REST que:
  - Recibe peticiones POST `/values` con un índice
  - Guarda el índice en Postgres (historial)
  - Guarda estado inicial en Redis (`'Nothing yet!'`)
  - Publica mensaje en canal Redis `'insert'` para el worker
  - Expone GET `/values/all` (desde Postgres)
  - Expone GET `/values/current` (desde Redis)

### 4. **Worker (Procesador de Tareas)**
- **Tecnología**: Node.js
- **Función**: 
  - Escucha el canal Redis `'insert'`
  - Calcula el valor de Fibonacci del índice recibido
  - Guarda el resultado en Redis
- **Comunicación**: Indirecta a través de Redis (pub/sub)

### 5. **Redis (Message Broker + Cache)**
- **Tecnología**: Redis
- **Puerto**: 6379
- **Función**:
  - **Pub/Sub**: Comunicación asíncrona entre Server y Worker
  - **Cache**: Almacena valores calculados actuales
  - **Canal**: `'insert'` para notificar al worker

### 6. **Postgres (Base de Datos)**
- **Tecnología**: PostgreSQL
- **Puerto**: 5432
- **Función**: Almacena historial de índices procesados
- **Tabla**: `values` (number INT)

## 🔄 Flujo de Datos

### Flujo Completo de una Petición:

```
1. Usuario → Nginx (puerto 80)
   ↓
2. Nginx → Client (React en puerto 3000)
   ↓
3. Usuario ingresa índice → Client hace POST /api/values
   ↓
4. Nginx → Server (API en puerto 5000)
   ↓
5. Server:
   - Guarda índice en Postgres (historial)
   - Guarda estado inicial en Redis: values[index] = 'Nothing yet!'
   - Publica mensaje en Redis canal 'insert' con el índice
   ↓
6. Worker (escuchando canal 'insert'):
   - Recibe el índice
   - Calcula Fibonacci
   - Guarda resultado en Redis: values[index] = resultado
   ↓
7. Client consulta GET /api/values/current
   ↓
8. Server lee desde Redis y devuelve valores calculados
```

## 🔌 Comunicación entre Servicios

### Comunicación Directa (por nombre de servicio):
- **Nginx → Client**: `http://client:3000`
- **Nginx → Server**: `http://api:5000`

### Comunicación Indirecta (a través de Redis):
- **Server ↔ Worker**: 
  - Server publica en canal `'insert'`
  - Worker se suscribe al canal `'insert'`
  - Worker escribe resultados en Redis
  - Server lee resultados desde Redis

### Comunicación con Bases de Datos:
- **Server → Postgres**: Conexión directa usando variables de entorno
- **Server → Redis**: Conexión directa para lectura/escritura
- **Worker → Redis**: Conexión directa para suscripción y escritura

## 🛠️ Stack Tecnológico

### Frontend:
- React
- React Router

### Backend:
- Node.js
- Express.js

### Bases de Datos:
- Redis (cache + message broker)
- PostgreSQL (persistencia)

### Infraestructura:
- Docker
- Docker Compose
- Nginx (reverse proxy)

### Despliegue:
- GitHub Actions (CI/CD)
- Docker Hub (registry de imágenes)
- AWS Elastic Beanstalk (hosting)
- AWS RDS (Postgres en producción)
- AWS ElastiCache (Redis en producción)

## 🌍 Entornos

### Desarrollo (`docker-compose.dev.yml`):
- **Volúmenes**: Código montado para hot-reload
- **Build local**: Construye imágenes desde Dockerfiles.dev
- **Servicios locales**: Redis y Postgres como contenedores
- **Puerto Nginx**: 3050

### Producción (`docker-compose.yml`):
- **Imágenes pre-construidas**: Desde Docker Hub
- **Servicios administrados**: RDS (Postgres) y ElastiCache (Redis)
- **Variables de entorno**: Configuradas en AWS Elastic Beanstalk
- **Puerto Nginx**: 80

## 📦 Proceso de Despliegue

1. **Build**: GitHub Actions construye imágenes Docker
2. **Push**: Sube imágenes a Docker Hub con tags de versión
3. **Package**: Crea ZIP con `docker-compose.yml` (instrucciones para AWS)
4. **Deploy**: Sube ZIP a S3 y despliega en Elastic Beanstalk
5. **AWS**: Lee `docker-compose.yml`, descarga imágenes y ejecuta contenedores

## 🔑 Conceptos Clave

- **Microservicios**: Cada servicio tiene una responsabilidad específica
- **Message Queue**: Redis pub/sub para comunicación asíncrona
- **Reverse Proxy**: Nginx como punto de entrada único
- **Service Discovery**: Docker Compose resuelve nombres de servicios a IPs
- **Separación de Concerns**: Worker procesa tareas pesadas fuera del request/response cycle

## 📊 Ventajas de esta Arquitectura

1. **Escalabilidad**: Worker puede escalarse independientemente
2. **Performance**: Cálculos pesados no bloquean la API
3. **Resiliencia**: Si el worker falla, la API sigue funcionando
4. **Cache**: Redis mejora tiempos de respuesta
5. **Historial**: Postgres mantiene persistencia de datos
