# Implementación Técnica: PostgreSQL + Seguridad en ft_transcendence

## Índice

1. [Estructura del proyecto](#1-estructura-del-proyecto)
2. [Schema de base de datos](#2-schema-de-base-de-datos)
3. [Dónde toca la DB en ft_transcendence](#3-dónde-toca-la-db-en-ft_transcendence)
4. [Hashing de contraseñas: implementación paso a paso](#4-hashing-de-contraseñas-implementación-paso-a-paso)
5. [Encriptación con pgcrypto](#5-encriptación-con-pgcrypto)
6. [Variables de entorno y Docker](#6-variables-de-entorno-y-docker)
7. [settings.py completo](#7-settingspy-completo)
8. [Checklist de seguridad](#8-checklist-de-seguridad)

---

## 1. Estructura del proyecto

```
ft_transcendence/
├── .env                    ← IGNORADO por Git (secrets reales)
├── .env.example            ← EN Git (plantilla sin valores reales)
├── .gitignore              ← Debe incluir .env
├── docker-compose.yml
├── backend/
│   ├── settings.py         ← Lee de .env, nunca hardcodea secrets
│   ├── requirements.txt    ← Incluye django[argon2]
│   └── apps/
│       └── users/
│           ├── models.py
│           └── migrations/
│               └── 0001_enable_pgcrypto.py
└── docker/
    └── init.sql            ← Activa pgcrypto al crear el container
```

---

## 2. Schema de base de datos

### Tablas mínimas para el subject

```sql
-- Tabla principal de usuarios
-- Django la genera automáticamente con AbstractUser o User.
-- Campos relevantes para seguridad:

users (auth_user en Django por defecto)
├── id             (PK, autoincrement)
├── email          (unique, not null)
├── password       (hash Argon2id — Django lo gestiona, nunca tocar a mano)
├── username       (unique)
├── is_active      (boolean)
├── date_joined    (timestamp)
└── last_login     (timestamp)

-- Perfil extendido (si usas módulo de User Management)
user_profiles
├── id             (PK)
├── user_id        (FK → users, OneToOne)
├── display_name   (varchar 50)
├── avatar         (varchar — path o URL)
├── is_online      (boolean)
├── phone_encrypted (bytea, nullable — si usas pgcrypto)
└── updated_at     (timestamp)

-- Amistades
friendships
├── id             (PK)
├── user_id        (FK → users)
├── friend_id      (FK → users)
├── status         (enum: pending / accepted / blocked)
└── created_at     (timestamp)

-- Partidas (módulo Gaming)
games
├── id             (PK)
├── player1_id     (FK → users)
├── player2_id     (FK → users)
├── winner_id      (FK → users, nullable)
├── score_p1       (integer)
├── score_p2       (integer)
├── status         (enum: waiting / playing / finished)
├── settings       (JSONB — configuración de la partida)
└── played_at      (timestamp)

-- Mensajes de chat (módulo opcional)
messages
├── id             (PK)
├── sender_id      (FK → users)
├── receiver_id    (FK → users)
├── content        (text)
├── is_read        (boolean)
└── sent_at        (timestamp)
```

> **Nota sobre `password`**: Django almacena el hash en el campo `password` de la tabla `auth_user` con el formato `argon2$argon2id$v=19$m=19456,t=2,p=1$SALT$HASH`. Nunca se almacena la contraseña en claro ni un hash manual. Django lo gestiona completamente.

---

## 3. Dónde toca la DB en ft_transcendence

```
┌─────────────────────────────────────────────────────────────┐
│                  REQUISITOS OBLIGATORIOS                    │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │  User Management    │    │  Frontend + Backend         │ │
│  │ ─────────────────── │    │ ─────────────────────────── │ │
│  │ • Registro (email   │    │ • Validación de inputs      │ │
│  │   + password)       │    │   en frontend Y backend     │ │
│  │ • Login seguro      │    │ • HTTPS obligatorio         │ │
│  │ • Passwords hashed  │    │ • Sin errores en consola    │ │
│  │   + salted          │    │                             │ │
│  └────────┬────────────┘    └──────────────┬──────────────┘ │
│           │                                │                │
│           ▼                                ▼                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL (DB)                      ││
│  │  • Schema claro con relaciones definidas                ││
│  │  • Almacena usuarios, sesiones, datos de la app         ││
│  │  • Credenciales en .env (no en código)                  ││
│  │  • Container Docker con volumen persistente             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

MÓDULOS OPCIONALES QUE DEPENDEN DE LA DB
─────────────────────────────────────────
Web                          User Management
• ORM (Minor, 1pt)           • Perfiles + avatares (Major, 2pt)
• API pública 5+ endpoints   • Game stats + match history
• WebSockets real-time       • OAuth 2.0 (Minor, 1pt)
  (Major, 2pt)               • 2FA TOTP (Minor, 1pt)
                             • Roles y permisos (Major, 2pt)

Gaming                       Cybersecurity
• Stats de partidas          • HashiCorp Vault para
• Matchmaking                  secrets (Major, 2pt)
• Torneos / Leaderboards     • WAF/ModSecurity

Data & Analytics
• Dashboard analytics (Major, 2pt)
• GDPR compliance (Minor, 1pt)
• Export JSON/CSV
```

---

## 4. Hashing de contraseñas: implementación paso a paso

### El flujo que ocurre internamente

```
REGISTRO                                    LOGIN
────────                                    ─────

Usuario escribe                             Usuario escribe
"miPassword123"                             "miPassword123"
       │                                           │
       ▼                                           ▼
Django genera salt                          Django lee el hash
aleatorio (16 bytes)                        almacenado en DB
       │                                           │
       ▼                                           ▼
Argon2id(password + salt)                   Argon2id(input + salt del hash)
= hash único                                = nuevo_hash
       │                                           │
       ▼                                           ▼
Almacena en DB:                             ¿nuevo_hash == hash_almacenado?
"argon2$argon2id$v=19$                             │
 m=19456,t=2,p=1$SALT$HASH"                 ┌──────┴──────┐
                                            │             │
                                          Sí →          No →
                                    Login correcto    Error 401
```

### Paso 1: Instalar la dependencia

```bash
# En requirements.txt:
django[argon2]

# O directamente:
pip install django[argon2]

# Esto instala argon2-cffi, la librería C que Django usa internamente.
```

### Paso 2: Configurar PASSWORD_HASHERS en settings.py

```python
# settings.py

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',   # ← Preferido (nuevo)
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',   # ← Fallback (migración)
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
# El primer elemento es el que Django usa para hashear contraseñas nuevas.
# Los demás permiten verificar hashes anteriores y migrarlos al preferido
# automáticamente la próxima vez que el usuario haga login.
```

### Paso 3: No hay paso 3

Django lo gestiona todo. Estos son los métodos que debes usar y los que debes evitar:

```python
# ✅ CORRECTO — crear usuario
user = User.objects.create_user(
    username='alice',
    email='alice@example.com',
    password='contraseñaSegura123'  # Django hashea automáticamente
)

# ✅ CORRECTO — cambiar contraseña
user.set_password('nuevaContraseña456')
user.save()

# ✅ CORRECTO — verificar contraseña en login
from django.contrib.auth import authenticate
user = authenticate(request, username='alice', password='contraseñaSegura123')
# Devuelve el user si es correcto, None si no.

# ✅ CORRECTO — verificar manualmente
from django.contrib.auth.hashers import check_password
is_valid = check_password('contraseñaSegura123', user.password)

# ❌ INCORRECTO — nunca hacer esto
user.password = 'contraseñaSegura123'  # Guarda en texto plano
user.save()

# ❌ INCORRECTO — nunca esto tampoco
import hashlib
user.password = hashlib.sha256('contraseñaSegura123'.encode()).hexdigest()
```

### Validadores de contraseña (ya incluidos por defecto)

```python
# settings.py — estos vienen en el template de startproject, no los elimines

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        # Rechaza contraseñas parecidas al username o email del usuario
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 12},
        # NIST 2025 recomienda mínimo 15 para cuentas de factor único.
        # 12 es un equilibrio razonable para el proyecto.
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
        # Rechaza las 20.000 contraseñas más comunes (incluye rockyou.txt)
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
        # Rechaza contraseñas solo numéricas
    },
]
```

### Parámetros avanzados de Argon2id (opcional)

Los defaults de Django ya cumplen OWASP. Solo toca esto si tu servidor tiene más recursos:

```python
# Crea un hasher personalizado solo si necesitas ajustar parámetros
from django.contrib.auth.hashers import Argon2PasswordHasher

class StrongerArgon2PasswordHasher(Argon2PasswordHasher):
    # Parámetros OWASP recomendados (por encima del mínimo):
    memory_cost = 47104  # 46 MiB (default Django: 19456 = 19 MiB)
    time_cost = 1        # iteraciones
    parallelism = 1      # hilos

# Y en settings.py sustituye el primer elemento de PASSWORD_HASHERS:
# PASSWORD_HASHERS = [
#     'ruta.a.tu.StrongerArgon2PasswordHasher',
#     ...
# ]
```

---

## 5. Encriptación con pgcrypto

### Activar pgcrypto

#### Opción A: Init script de Docker (recomendada)

```sql
-- docker/init.sql
-- Este archivo se ejecuta automáticamente al crear el container por primera vez.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

```yaml
# docker-compose.yml — monta el init script
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
```

#### Opción B: Migración de Django

```python
# users/migrations/0001_enable_pgcrypto.py

from django.db import migrations

class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pgcrypto;",
            reverse_sql="DROP EXTENSION IF EXISTS pgcrypto;"
        ),
    ]
```

### Modelo con campo encriptado

```python
# users/models.py

from django.db import models
from django.conf import settings

class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    display_name = models.CharField(max_length=50)
    avatar = models.CharField(max_length=255, blank=True)
    is_online = models.BooleanField(default=False)

    # Campo sensible encriptado (bytea en PostgreSQL)
    # Solo necesario si implementas módulo de Cybersecurity / GDPR
    phone_encrypted = models.BinaryField(null=True, blank=True)

    def set_phone(self, phone_number: str) -> None:
        """Encripta y guarda el número de teléfono."""
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT pgp_sym_encrypt(%s::text, %s::text)",
                [phone_number, settings.ENCRYPTION_KEY]
            )
            self.phone_encrypted = cursor.fetchone()[0]

    def get_phone(self) -> str | None:
        """Desencripta y devuelve el número de teléfono."""
        if not self.phone_encrypted:
            return None
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT pgp_sym_decrypt(%s::bytea, %s::text)",
                [bytes(self.phone_encrypted), settings.ENCRYPTION_KEY]
            )
            return cursor.fetchone()[0]

    def __str__(self):
        return f"Profile({self.user.username})"
```

```python
# Uso en vistas o serializers:

profile = UserProfile.objects.get(user=request.user)

# Encriptar y guardar:
profile.set_phone("612-345-678")
profile.save()

# Leer y desencriptar:
phone = profile.get_phone()  # "612-345-678"
```

---

## 6. Variables de entorno y Docker

### .env.example (este SÍ va en Git)

```bash
# ── Django ──────────────────────────────────────────────────
SECRET_KEY=cambia-esto-por-una-clave-larga-y-aleatoria
DJANGO_DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# ── Base de datos ────────────────────────────────────────────
DB_NAME=transcendence_db
DB_USER=transcendence_user
DB_PASSWORD=cambia-esto-por-una-password-segura
DB_HOST=db
DB_PORT=5432

# ── Encriptación (solo si usas pgcrypto) ────────────────────
ENCRYPTION_KEY=cambia-esto-por-una-clave-de-al-menos-32-chars

# ── OAuth (si implementas ese módulo) ───────────────────────
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
OAUTH_REDIRECT_URI=https://localhost/auth/callback

# ── 2FA (si implementas ese módulo) ─────────────────────────
TOTP_ISSUER_NAME=ft_transcendence
```

### .gitignore

```gitignore
# Secrets — NUNCA en el repositorio
.env
*.pem
*.key
*.crt

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
*.egg-info/

# Docker volumes
pgdata/
media/

# IDEs
.vscode/
.idea/
```

### docker-compose.yml completo

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy   # Espera a que la DB esté lista
    env_file:
      - .env
    volumes:
      - ./backend:/app
      - media:/app/media
    expose:
      - "8000"
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8000"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "443:443"
      - "80:80"       # Redirige a 443
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - media:/app/media:ro
    depends_on:
      - backend

volumes:
  pgdata:
  media:
```

---

## 7. settings.py completo

```python
# backend/config/settings.py

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Seguridad ────────────────────────────────────────────────
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY no está definida en las variables de entorno")

DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('ALLOWED_HOSTS', '').split(',')
    if host.strip()
]

# ── Aplicaciones ─────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',      # Módulo exclusivo de PostgreSQL
    # Tus apps:
    'apps.users',
    'apps.games',
    # Librerías:
    # 'channels',                   # Si implementas WebSockets
    # 'rest_framework',             # Si implementas API
]

# ── Base de datos ────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# ── Hashing de contraseñas ───────────────────────────────────
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 12},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Encriptación (solo si usas pgcrypto) ────────────────────
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', '')

# ── HTTPS / Seguridad en producción ─────────────────────────
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS: fuerza HTTPS durante 1 año (solo en producción)
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

# ── Sesiones ────────────────────────────────────────────────
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 3600          # 1 hora de sesión
SESSION_COOKIE_HTTPONLY = True     # No accesible por JavaScript

# ── Archivos estáticos y media ───────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

---

## 8. Checklist de seguridad

### Obligatorio (subject)

- [ ] `PASSWORD_HASHERS` configurado con Argon2id como primer elemento
- [ ] `pip install django[argon2]` en requirements.txt
- [ ] `SECRET_KEY` solo en `.env`, nunca en código ni en Git
- [ ] `.env` en `.gitignore`
- [ ] `.env.example` en el repositorio (sin valores reales)
- [ ] Credenciales de DB en variables de entorno
- [ ] `SECURE_SSL_REDIRECT = True` en producción
- [ ] Nginx configurado con TLS (certificado autofirmado está bien para el subject)
- [ ] Volumen Docker persistente para la DB (`pgdata`)
- [ ] `healthcheck` en el servicio de DB en docker-compose

### Recomendado (buenas prácticas / módulos opcionales)

- [ ] `pgcrypto` activado si almacenas datos personales
- [ ] `ENCRYPTION_KEY` en variables de entorno
- [ ] `SESSION_COOKIE_SECURE = True`
- [ ] `CSRF_COOKIE_SECURE = True`
- [ ] `X_FRAME_OPTIONS = 'DENY'`
- [ ] `SECURE_CONTENT_TYPE_NOSNIFF = True`
- [ ] `AUTH_PASSWORD_VALIDATORS` configurado (no eliminar del template)
- [ ] Validación de inputs tanto en frontend como en backend
- [ ] Rate limiting en endpoints de login (protección contra brute force)
- [ ] Logs sin contraseñas ni datos sensibles

### Para el módulo de Cybersecurity

- [ ] HashiCorp Vault para gestión de secretos (sustituye `.env`)
- [ ] WAF / ModSecurity en Nginx
- [ ] 2FA TOTP implementado y almacenado correctamente
- [ ] Auditoría de accesos (logs de login, IPs, timestamps)
