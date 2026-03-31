# Hashing y Encriptación en Bases de Datos: Conceptos Clave

## Índice

1. [Por qué PostgreSQL con Django](#1-por-qué-postgresql-con-django)
2. [Hashing vs Encriptación: la diferencia fundamental](#2-hashing-vs-encriptación-la-diferencia-fundamental)
3. [Algoritmos de hashing: de peor a mejor](#3-algoritmos-de-hashing-de-peor-a-mejor)
4. [Argon2id: el estándar actual](#4-argon2id-el-estándar-actual)
5. [Breaches reales por hashing débil](#5-breaches-reales-por-hashing-débil)
6. [Encriptación de datos sensibles](#6-encriptación-de-datos-sensibles)
7. [Qué dicen OWASP y NIST en 2025](#7-qué-dicen-owasp-y-nist-en-2025)
8. [Qué necesita ft_transcendence](#8-qué-necesita-ft_transcendence)

---

## 1. Por qué PostgreSQL con Django

Django soporta 5 bases de datos de forma nativa: PostgreSQL, MariaDB, MySQL, Oracle y SQLite. Para ft_transcendence, PostgreSQL no es solo la mejor opción: es la que más sentido tiene por razones técnicas concretas.

Django tiene un módulo completo dedicado exclusivamente a PostgreSQL: `django.contrib.postgres`. Esto significa que hay funcionalidades del ORM que **solo existen** si usas PostgreSQL. Si eliges MariaDB, pierdes acceso a ese módulo entero y tienes que reescribir manualmente lo que PostgreSQL te da gratis.

### Funcionalidades exclusivas de PostgreSQL en Django

| Funcionalidad | PostgreSQL | MariaDB | SQLite |
|---|---|---|---|
| `ArrayField` (listas en un campo) | ✅ | ❌ | ❌ |
| `JSONField` con queries en JSONB | ✅ indexable | ⚠️ sin índices binarios | ⚠️ básico |
| Full-text search en el ORM | ✅ `SearchVector` | ❌ | ❌ |
| `CITextField` (case-insensitive) | ✅ | ❌ | ❌ |
| Extensión `pgcrypto` (encriptación) | ✅ | ❌ | ❌ |
| Soporte async nativo (`psycopg3`) | ✅ | ❌ | ❌ |

### Por qué importa para el proyecto

- **Múltiples usuarios concurrentes** → PostgreSQL tiene MVCC real (lecturas no bloquean escrituras).
- **WebSockets / real-time** → `psycopg3` soporta async nativo, crítico para Django Channels.
- **Datos JSON dinámicos** → JSONB indexable para configuración de partidas y preferencias.
- **Encriptación de campos sensibles** → `pgcrypto` como extensión nativa, sin librerías externas.

Aproximadamente el 60% de los proyectos Django en producción usan PostgreSQL. La documentación oficial usa PostgreSQL en todos sus ejemplos avanzados. Docker + Django + PostgreSQL es la combinación más documentada, testeada y con más recursos disponibles.

---

## 2. Hashing vs Encriptación: la diferencia fundamental

Estos dos conceptos se confunden constantemente. Son cosas diferentes que se usan para problemas diferentes.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   HASHING (una sola dirección)                              │
│   ════════════════════════════                              │
│                                                             │
│ "miPassword123"  ──→  [ Argon2id ]  ──→  "$argon2id$..."    │
│                                                             │
│   NO SE PUEDE REVERTIR ✗                                    │
│                                                             │
│   Uso: CONTRASEÑAS                                          │
│   • Nunca necesitas recuperar la contraseña original        │
│   • Solo comparas: hash(input) == hash(almacenado)          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ENCRIPTACIÓN (dos direcciones)                            │
│   ═══════════════════════════════                           │
│                                                             │
│ "612-345-678"  ──→  [ AES-256 + clave ]  ──→  "x8f2a..."    │
│ "x8f2a..."     ──→  [ AES-256 + clave ]  ──→  "612-345-678" │
│                                                             │
│   SE PUEDE REVERTIR ✓                                       │
│                                                             │
│   Uso: DATOS SENSIBLES que necesitas leer después           │
│   • Emails, datos personales, tokens                        │
│   • Necesitas la clave para desencriptar                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

La regla es simple: si el sistema alguna vez necesita **mostrar o usar el valor original**, necesita encriptación. Si solo necesita **verificar** que el valor es correcto, necesita hashing. Las contraseñas siempre van con hashing. Los emails o datos personales pueden ir con encriptación si necesitas mostrarlos.

---

## 3. Algoritmos de hashing: de peor a mejor

### Los rápidos: nunca para contraseñas

MD5, SHA-1, SHA-256 y SHA-512 son funciones de digestión criptográfica diseñadas para ser veloces: verificar integridad de archivos, firmar certificados, alimentar blockchains. Esa velocidad es exactamente por qué fallan para contraseñas.

Una NVIDIA RTX 4090 moderna calcula:
- **164.000 millones** de hashes MD5 por segundo
- **63.000 millones** de hashes SHA-256 por segundo
- **50.600 millones** de hashes SHA-1 por segundo

Una contraseña de 8 caracteres hasheada con MD5 cae en minutos con una sola GPU de consumo. Además, MD5 y SHA-1 tienen ataques de colisión conocidos: SHA-1 fue roto en la práctica por Google en 2017 (ataque SHAttered) y NIST lo deprecó en 2011.

SHA-256 y SHA-512 siguen siendo criptográficamente sólidos, no tienen colisiones conocidas, pero su velocidad los hace inútiles para proteger contraseñas aunque no estén "rotos" en sentido técnico.

Ninguno de estos algoritmos incluye salt automático ni factores de trabajo ajustables. Usarlos solos para contraseñas es inaceptable según todos los estándares modernos.

### Los algoritmos que sí protegen contraseñas

Las funciones de hashing diseñadas para contraseñas comparten tres propiedades críticas que los rápidos no tienen: **salt automático** (valor aleatorio único por contraseña), **parámetros de coste ajustables** (lentitud deliberada que escala con las mejoras de hardware) y **resistencia a la paralelización** en GPUs y hardware especializado.

#### PBKDF2 — el estándar mínimo

PBKDF2 (RFC 8018, 2000) itera HMAC sobre la contraseña y el salt cientos de miles de veces. Es el hasher por defecto de Django porque no requiere ninguna librería C externa, solo la stdlib de Python.

Su debilidad crítica es que **no tiene memory-hardness**: cada hash usa solo unos kilobytes de RAM, lo que lo hace altamente paralelizable en GPUs. Una RTX 4090 alcanza unos 15.000 hashes por segundo a 600.000 iteraciones. Su única ventaja exclusiva es que es **validado por FIPS-140**, el único aprobado para sistemas del gobierno de EE.UU.

Django 6.0 usa 1.200.000 iteraciones de HMAC-SHA-256, el doble del mínimo de OWASP. Es aceptable pero lejos del óptimo.

#### bcrypt — sólido pero envejeciendo

Creado en 1999 y basado en el costoso key schedule del cifrado Blowfish, bcrypt ha protegido contraseñas durante más de 25 años sin un ataque criptoanálítico práctico. Su único parámetro de coste es logarítmico: coste 12 significa 2¹² = 4.096 iteraciones de expansión de clave.

Dos debilidades limitan su futuro. Primero, usa solo **~4 KB de memoria** (las S-boxes de Blowfish), lo que lo hace bastante más amigable con las GPUs que los algoritmos memory-hard: una RTX 4090 alcanza unos 14.000 hashes por segundo en coste 5. Segundo, **trunca contraseñas silenciosamente a 72 bytes**. En 2024, Okta tuvo un incidente de seguridad relacionado con esta limitación. OWASP clasifica bcrypt como adecuado solo para "sistemas legacy donde Argon2 y scrypt no están disponibles."

#### scrypt — memory-hard sin dependencias externas

Colin Percival diseñó scrypt en 2009 (RFC 7914) con memory-hardness demostrable. Genera N bloques de datos pseudoaleatorios y los accede en orden pseudoaleatorio, forzando a los atacantes a almacenarlo todo en memoria o pagar un alto coste de recomputación. Percival estimó que scrypt es ~4.000× más costoso de atacar en hardware que bcrypt.

Su ventaja clave es la **disponibilidad nativa**: `hashlib.scrypt()` en Python y `crypto.scrypt()` en Node.js no requieren dependencias externas. OWASP lo recomienda como segunda opción cuando Argon2id no está disponible.

---

## 4. Argon2id: el estándar actual

Argon2 ganó el Password Hashing Competition en 2015 y fue estandarizado en RFC 9106. Su variante híbrida, **Argon2id**, combina acceso a memoria independiente de datos (resistiendo ataques de canal lateral) con acceso dependiente de datos (maximizando resistencia a GPUs).

### Cómo funciona

Argon2id opera asignando un bloque grande de RAM (entre **19 MiB y 2 GiB** según la configuración), llenándolo con datos pseudoaleatorios vía Blake2b y mezclándolo en múltiples pasadas. Tres parámetros independientes controlan la seguridad:

- **m** (memory cost): cuánta RAM requiere cada hash
- **t** (time cost): cuántas iteraciones se realizan
- **p** (parallelism): cuántos hilos paralelos se usan

La memory-hardness es la defensa clave. Cada intento de adivinar una contraseña requiere dedicar RAM real, algo que las GPUs no pueden paralelizar eficientemente porque tienen memoria limitada por núcleo. El mejor ataque conocido de trade-off contra Argon2id de 1 pasada solo reduce el producto tiempo-área por un factor de ~2,1.

### Configuraciones recomendadas por OWASP

| Configuración | memory_cost | time_cost | parallelism | Tiempo aprox. |
|---|---|---|---|---|
| Mínima | 19.456 KiB (19 MiB) | 2 | 1 | ~100-150ms |
| Recomendada | 47.104 KiB (46 MiB) | 1 | 1 | ~150-200ms |

---

## 5. Breaches reales por hashing débil

Las consecuencias de elegir el algoritmo equivocado no son teóricas.

**LinkedIn (2012)**: almacenaba 117 millones de contraseñas como SHA-1 sin salt. Los investigadores crackearon el **90% en días**. SHA-1 sin salt significa que dos usuarios con la misma contraseña tienen el mismo hash: crackeas uno, crackeas todos los que usan esa contraseña.

**Adobe (2013)**: usaba cifrado 3DES en modo ECB, ni siquiera hashing, sobre 153 millones de cuentas. El modo ECB produce el mismo texto cifrado para entradas idénticas, así que las contraseñas iguales eran visibles a simple vista en la base de datos.

**RockYou (2009)**: almacenaba 32 millones de contraseñas en **texto plano**. La lista filtrada se convirtió en el archivo `rockyou.txt` canónico, hoy incluido en todas las distribuciones de pentesting. Herramientas como Hashcat pueden probar todas sus 14 millones de entradas contra hashes MD5 en menos de un segundo.

**MySpace**: almacenaba 360 millones de contraseñas como SHA-1 sin salt de solo los primeros 10 caracteres en minúsculas. Dos limitaciones acumuladas que multiplicaron el daño.

Todos estos casos comparten el mismo patrón: eligieron algoritmos rápidos y convenientes en lugar de funciones diseñadas específicamente para contraseñas.

---

## 6. Encriptación de datos sensibles

### Cuándo encriptar (y cuándo no)

No todos los datos necesitan encriptación. HTTPS ya protege los datos en tránsito. La encriptación en base de datos protege contra un escenario concreto: que alguien consiga acceso directo a la base de datos (un dump de la DB, un backup expuesto, un administrador malicioso).

| Dato | Método | Razón |
|---|---|---|
| Contraseñas | **Hashing** (Argon2id) | Nunca necesitas la original. Solo verificar |
| Email del usuario | **Encriptación** (opcional) | Si necesitas mostrarlo en el perfil |
| Tokens de sesión | **Hashing** (Django lo gestiona) | SECRET_KEY + signed cookies |
| API keys | **Hashing** | Mismo principio que contraseñas |
| Datos personales (GDPR) | **Encriptación** (si aplica) | El usuario puede pedir exportarlos |
| Configuración de juego | **Nada** | No es dato sensible |
| Mensajes de chat | **Encriptación** (opcional) | Depende de la política de privacidad |

### Cómo funciona pgcrypto

`pgcrypto` es una extensión nativa de PostgreSQL que implementa cifrado simétrico (AES-256) y asimétrico directamente en el motor de base de datos. La encriptación ocurre dentro del servidor de PostgreSQL, no en la aplicación.

```
ESCRIBIR DATO                               LEER DATO
────────────                                ─────────

"612-345-678"                               Dato encriptado (bytea)
       │                                           │
       ▼                                           ▼
pgp_sym_encrypt(                            pgp_sym_decrypt(
  dato,                                       dato_encriptado,
  ENCRYPTION_KEY                               ENCRYPTION_KEY
)                                           )
       │                                           ▼
       ▼                                    "612-345-678"
bytea ilegible en DB
```

La clave de encriptación (`ENCRYPTION_KEY`) nunca se almacena en la base de datos: vive en las variables de entorno de la aplicación o en un gestor de secretos externo (como HashiCorp Vault si implementas ese módulo).

---

## 7. Qué dicen OWASP y NIST en 2025

### OWASP Password Storage Cheat Sheet

OWASP establece una jerarquía clara para 2025:

1. **Argon2id** — primera opción
2. **scrypt** — segunda opción cuando Argon2 no esté disponible
3. **bcrypt** — solo para sistemas legacy
4. **PBKDF2** — solo para cumplimiento FIPS

OWASP enfatiza que las contraseñas deben **hashearse, nunca encriptarse**, con salts automáticos y factores de trabajo calibrados para producir tiempos de hash de ~200-500ms.

### NIST SP 800-63B Revisión 4 (vigente agosto 2025)

NIST introdujo cambios importantes en su revisión más reciente:

- La longitud mínima de contraseña sube a **15 caracteres** para cuentas de factor único.
- Las reglas de composición (requerir mayúsculas, símbolos, etc.) están ahora **explícitamente prohibidas**: reducen la usabilidad sin mejorar significativamente la seguridad.
- La rotación periódica por calendario está prohibida; los cambios solo deben forzarse ante evidencia de compromiso.
- Los sistemas deben soportar contraseñas de al menos 64 caracteres y comparar las propuestas contra listas de contraseñas comprometidas conocidas.

NIST reconoce que las funciones memory-hard como Argon2id deben preferirse, aunque PBKDF2 sigue siendo la única opción validada por FIPS.

### El concepto de pepper

Ambos estándares recomiendan el **pepper** como defensa en profundidad: una clave secreta almacenada separada de la base de datos (en variables de entorno o un HSM) que se aplica vía HMAC o encriptación sobre el hash almacenado.

Si la base de datos se filtra, el pepper impide el crackeo offline a menos que el atacante también comprometa el servidor de aplicaciones. Es una capa adicional que no sustituye al buen hashing, sino que lo complementa.

---

## 8. Qué necesita ft_transcendence

### Requisitos obligatorios del subject

El subject exige explícitamente:
- Contraseñas **hasheadas** (hashed + salted)
- Schema claro con relaciones bien definidas
- Credenciales en variables de entorno (no en código)
- HTTPS obligatorio

### Qué algoritmo usar

Django con Argon2id supera todas las recomendaciones de OWASP con solo dos líneas de configuración. Pero incluso el PBKDF2 por defecto de Django (1.200.000 iteraciones) está por encima del mínimo de OWASP. Lo importante es no tocar el sistema de auth de Django para implementar hashing propio.

### Reglas que no se deben romper

- **Nunca** usar MD5, SHA-1 o SHA-256 directamente para contraseñas.
- **Nunca** asignar a `user.password` directamente: siempre `user.set_password()`.
- **Nunca** implementar hashing propio cuando Django ya lo gestiona.
- **Nunca** almacenar `SECRET_KEY` en el repositorio.
- **Nunca** transmitir contraseñas por HTTP.
- **Nunca** guardar contraseñas en texto plano en logs de debug.

---

## Referencias

| Recurso | URL |
|---|---|
| Django Password Management | https://docs.djangoproject.com/en/5.2/topics/auth/passwords/ |
| django.contrib.postgres | https://docs.djangoproject.com/en/5.2/ref/contrib/postgres/ |
| PostgreSQL pgcrypto | https://www.postgresql.org/docs/16/pgcrypto.html |
| OWASP Password Storage Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html |
| RFC 9106 (Argon2) | https://www.rfc-editor.org/rfc/rfc9106 |
| NIST SP 800-63B Rev. 4 | https://pages.nist.gov/800-63-4/ |
| argon2-cffi docs | https://argon2-cffi.readthedocs.io/ |
