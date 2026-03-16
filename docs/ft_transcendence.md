# ft_transcendence — Documentacion del Proyecto

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | NestJS + TypeScript + Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Proxy | Nginx con SSL (certificado autofirmado) |
| Infraestructura | Docker Compose (4 contenedores: db, backend, frontend, nginx) |

---

## Conceptos Clave

### PostgreSQL

Base de datos relacional open-source. Almacena datos en tablas con filas y columnas, de forma similar a MySQL o MariaDB, pero con funcionalidades adicionales como soporte nativo de JSON, tipos de datos mas ricos y mayor cumplimiento del estandar SQL.

En este proyecto, el backend se conecta a PostgreSQL para leer y escribir datos. El contenedor de la base de datos utiliza un volumen persistente para conservar la informacion entre reinicios.

### Nginx (Reverse Proxy)

Nginx actua como **reverse proxy**: es el unico punto de entrada publico y redirige el trafico internamente segun la ruta de la URL.

```
/            ->  Frontend (la aplicacion web)
/api/        ->  Backend (la API REST)
/socket.io/  ->  Backend (WebSockets para comunicacion en tiempo real)
```

El cliente nunca se comunica directamente con el backend ni con el frontend. Toda peticion pasa por Nginx, que decide a que servicio reenviarla.

### SSL y Certificados Autofirmados

SSL/TLS cifra la comunicacion entre el navegador y el servidor. El proceso es el siguiente:

1. El servidor posee un **certificado** (archivo publico) y una **clave privada**.
2. Al conectarse por HTTPS, el servidor envia el certificado al navegador.
3. El navegador verifica la validez del certificado.
4. Se establece una conexion cifrada.

Un **certificado autofirmado** se genera con `openssl` y no esta firmado por una autoridad reconocida (como Let's Encrypt), por lo que el navegador muestra una advertencia de "conexion no segura". Sin embargo, el cifrado funciona de forma identica. Para desarrollo local es suficiente.

La **redireccion HTTP a HTTPS** hace que Nginx escuche en el puerto 80 (HTTP) y responda con un codigo 301, forzando al navegador a usar la version HTTPS (puerto 443).

### Archivo `.env` y `.env.example`

Un archivo `.env` contiene variables de entorno en formato `CLAVE=valor`:

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=secreto123
POSTGRES_DB=myapp
BACKEND_PORT=3000
DOMAIN_NAME=localhost
```

Docker Compose lee este archivo automaticamente y sustituye las variables referenciadas con `${VARIABLE}` en `docker-compose.yml`, inyectandolas tambien dentro de los contenedores.

El **`.env.example`** es una copia del `.env` sin valores sensibles (contrasenas, claves API, etc.). Se sube al repositorio para que cualquier persona que clone el proyecto sepa que variables necesita configurar. El `.env` real se incluye en `.gitignore` para no exponer credenciales.

**Flujo:** clonar el repo, copiar `.env.example` a `.env`, rellenar valores, ejecutar `make all`.

---

## Arquitectura General

```
Cliente (navegador)
       |
       v
   Nginx (puerto 443, SSL)
       |
       |-- /          -> Frontend (React/Vite, puerto 5173)
       |-- /api/      -> Backend (NestJS, puerto 3000)
       +-- /socket.io -> Backend (WebSocket)
                              |
                              v
                        PostgreSQL (volumen persistente)
```

Nginx es la puerta de entrada. El frontend sirve la interfaz. El backend maneja la logica de negocio y se comunica con PostgreSQL. Todo se ejecuta en contenedores aislados dentro de redes Docker separadas (frontend_net, backend_net).

---

## Estructura del Proyecto

```
ft_transcendence/
|-- backend/               # API NestJS (puerto 3000)
|   |-- src/               # Codigo fuente
|   |   |-- auth/          # Modulo de autenticacion
|   |   |-- users/         # Modulo de usuarios
|   |   |-- common/        # Utilidades compartidas
|   |   +-- config/        # Configuracion de la aplicacion
|   +-- prisma/            # Esquema de base de datos (Prisma ORM)
|-- frontend/              # Aplicacion React (puerto 5173)
|   +-- src/
|       |-- pages/         # Vistas/paginas de la aplicacion
|       |-- components/    # Componentes reutilizables
|       |-- hooks/         # Custom hooks de React
|       |-- services/      # Llamadas a la API
|       |-- context/       # Contextos de React (estado global)
|       +-- types/         # Definiciones de tipos TypeScript
|-- database/              # Script de inicializacion de PostgreSQL
|-- nginx/                 # Configuracion de Nginx y certificados SSL
|-- docs/                  # Documentacion del proyecto
|-- docker-compose.yml     # Definicion de servicios Docker
|-- Makefile               # Comandos de gestion del proyecto
+-- .env.example           # Plantilla de variables de entorno
```

---

## Requisitos del Sistema

El Makefile detecta e instala automaticamente las dependencias necesarias:

| Dependencia | Descripcion |
|-------------|-------------|
| Docker | Motor de contenedores |
| Docker Compose (v2) | Orquestacion de servicios |
| OpenSSL | Generacion de certificados SSL |

### Distribuciones soportadas

- **Debian / Ubuntu / Linux Mint** — instalacion via `apt`
- **Arch / EndeavourOS / CachyOS / Manjaro / Garuda** — instalacion via `pacman`
- **Windows WSL** — utiliza el gestor de paquetes de la distribucion subyacente

---

## Comandos Disponibles

| Comando | Descripcion |
|---------|-------------|
| `make all` | Instala dependencias, configura el entorno, construye y levanta los servicios |
| `make deps` | Verifica e instala dependencias del sistema |
| `make setup` | Crea `.env` desde `.env.example` y genera certificados SSL |
| `make build` | Construye las imagenes Docker |
| `make up` | Levanta todos los servicios |
| `make down` | Detiene todos los servicios |
| `make restart` | Reinicia todos los servicios |
| `make logs` | Muestra los logs de todos los servicios en tiempo real |
| `make logs-front` | Logs del frontend |
| `make logs-back` | Logs del backend |
| `make logs-db` | Logs de la base de datos |
| `make clean` | Detiene servicios y elimina volumenes |
| `make fclean` | Limpieza total (volumenes + imagenes) |
| `make re` | Reconstruye el proyecto desde cero |
| `make status` | Muestra el estado de los contenedores |

El comando `make all` ejecuta automaticamente `deps`, `setup`, `build` y `up` en secuencia.

---

## Configuracion del Entorno

El archivo `.env.example` contiene todas las variables necesarias. Al ejecutar `make setup` se copia automaticamente a `.env`:

| Variable | Descripcion |
|----------|-------------|
| `POSTGRES_USER` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Contrasena de PostgreSQL |
| `POSTGRES_DB` | Nombre de la base de datos |
| `DATABASE_URL` | URL de conexion completa para Prisma |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |
| `JWT_EXPIRATION` | Tiempo de expiracion de los tokens |
| `VITE_API_URL` | URL de la API para el frontend |
| `NODE_ENV` | Entorno de ejecucion (development/production) |

---

## Servicios Docker

| Servicio | Imagen | Puerto | Red |
|----------|--------|--------|-----|
| db | postgres:16-alpine | 5432 | backend_net |
| backend | ft_transcendence-backend | 3000 (interno) | backend_net, frontend_net |
| frontend | ft_transcendence-frontend | 5173 (interno) | frontend_net |
| nginx | nginx:alpine | 80, 443 | backend_net, frontend_net |

La base de datos utiliza un volumen persistente (`db_data`) para conservar la informacion entre reinicios. Los puertos del frontend y backend no estan expuestos directamente; todo el trafico pasa por Nginx.

---

## Base de Datos

### Esquema actual (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

La extension `uuid-ossp` se habilita automaticamente en la inicializacion de PostgreSQL para la generacion de identificadores unicos.

---

## Acceso a la Aplicacion

| URL | Servicio | Contenido |
|-----|----------|-----------|
| `https://localhost` | Frontend | Interfaz web de la aplicacion |
| `https://localhost/api/` | Backend | API REST (respuestas JSON) |

El navegador mostrara una advertencia por el certificado autofirmado; es necesario aceptarlo para acceder en desarrollo local.

### Diferencia entre ambas rutas

Ambas URLs pasan por Nginx en el puerto 443, pero llegan a servicios distintos:

| | `https://localhost` | `https://localhost/api/` |
|---|---|---|
| **Servicio destino** | Contenedor frontend (React/Vite) | Contenedor backend (NestJS) |
| **Tipo de contenido** | HTML, CSS, JS | JSON (datos estructurados) |
| **Quien lo usa** | El navegador directamente | El frontend internamente (con `fetch` o `axios`) |
| **Ejemplo de respuesta** | Pagina HTML con la interfaz | `{ "status": "ok", "timestamp": "..." }` |

`/` sirve **lo que el usuario ve** (la aplicacion web), y `/api/` sirve **los datos que la aplicacion necesita** para funcionar. El frontend hace peticiones a `/api/` entre bastidores para cargar informacion, autenticar usuarios, enviar formularios, etc.

---

## Flujo de Desarrollo

1. Clonar el repositorio
2. Ejecutar `make all` (primera vez) o `make up` (posteriores)
3. Los cambios en el codigo se reflejan automaticamente gracias a los volumenes montados y los modos watch de Vite y NestJS
4. Consultar logs con `make logs`, `make logs-front` o `make logs-back`
5. Detener con `make down`

---

## Estado Actual

### Infraestructura

- Docker Compose con 4 servicios: PostgreSQL, backend, frontend y nginx.
- Nginx como reverse proxy: `/` hacia frontend, `/api/` hacia backend, `/socket.io/` preparado.
- SSL con certificados autofirmados y redireccion HTTP a HTTPS.
- Makefile con verificacion automatica de dependencias y comandos de gestion.
- Archivo `.env.example` con variables de entorno.

### Backend

- Aplicacion NestJS inicializada.
- CORS habilitado con credenciales.
- Validation pipes globales configurados.
- Prisma conectado a PostgreSQL.
- Un endpoint: `GET /` que devuelve `{ status, timestamp }`.
- Carpetas creadas para modulos auth, users, config y common.

### Frontend

- Aplicacion React con Vite y TypeScript.
- Tailwind CSS configurado.
- React Router configurado.
- Una pagina home con el titulo "ft_transcendence" y mensaje de bienvenida.
- Carpetas creadas para pages, components, hooks, services, context y types.

### Base de Datos

- PostgreSQL con extension `uuid-ossp`.
- Modelo User en Prisma: `id` (UUID), `email`, `username`, `password`, `avatar`, `createdAt`, `updatedAt`.
