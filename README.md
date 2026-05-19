# ft_transcendence

## 📖 About

"ft_transcendence" is the final project of the 42 Madrid Common Core. This repository implements the **V.6 Specialized Projects — Education Platform / Course Catalogue** variant under the codename **Transcend Yoga**: a full e-learning platform about the history and practice of yoga, developed for a real client (Ananda).

The platform lets users browse, purchase and watch yoga course modules through a protected video player, manage their account and purchases, and interact with the platform in three languages. All editorial content is managed by the client through a headless CMS without developer intervention. The whole stack is containerized and runs behind an Nginx reverse proxy with TLS termination and a ModSecurity Web Application Firewall.

## 🎯 Objectives

- Designing and shipping a full-stack web product from scratch as a team of four
- Building an SSR application with Nuxt 4 + Nitro (frontend + backend in a single process)
- Designing a relational database schema with Prisma 5 over PostgreSQL 17
- Implementing secure authentication (Argon2id, JWT in `HttpOnly` cookies, Google OAuth 2.0, 2FA TOTP)
- Integrating real-money payments with Stripe Checkout and idempotent webhooks
- Gating premium video content through the Vimeo OAuth 2 API
- Operating a headless CMS (Directus 11) on top of the product's own Postgres tables
- Serving traffic through Nginx with TLS termination and a ModSecurity WAF (OWASP CRS 4.x)
- Achieving GDPR compliance with data export and account erasure endpoints
- Publishing a documented, rate-limited public REST API under `/api/v1`
- Supporting English, Spanish and French with per-locale editorial content

## 📋 Function Overview

<details>
<summary><strong>ft_transcendence — Transcend Yoga</strong></summary>

<br>

| Feature | Description |
|---------|-------------|
| **Full-stack SSR** | Nuxt 4 + Nitro single process; ~35 server routes under `server/api/` |
| **Authentication** | Email + password (Argon2id), JWT in `HttpOnly; Secure; SameSite=Strict` cookie |
| **Email verification** | Two-step signup with a 6-digit code sent via SMTP |
| **Google OAuth 2.0** | Full server-side flow with CSRF state cookie; creates or links accounts |
| **2FA TOTP** | Setup (QR + base32 secret), verify and disable endpoints; integrated with login |
| **Password recovery** | Time-limited reset token via email; Argon2id re-hash on reset |
| **Module catalogue** | Browsable list of yoga course modules per locale with progression indicators |
| **Stripe Checkout** | Session creation, anti-duplicate-charge guard, automatic VAT, cross-locale resolution |
| **Stripe webhooks** | Idempotent processing of checkout, payment_intent and invoice events |
| **Bundle pricing** | Floor / ceiling / proportional credit for prior purchases, editable from CMS |
| **Vimeo gated playback** | Purchase-gated video access; OAuth 2 token refresh; first class free as preview |
| **Public REST API** | `/api/v1` with `X-API-Key` auth, Zod validation, OpenAPI 3.1 docs |
| **Rate limiting** | Redis sliding-window on every auth and `/api/v1` endpoint |
| **GDPR endpoints** | `GET /api/me/export` (JSON), `DELETE /api/me` with confirmation email |
| **Directus CMS** | Headless CMS reading/writing the same Postgres tables as the app |
| **Multilanguage (EN/ES/FR)** | ~280 tagged UI strings per locale; locale resolved from query → cookie → `Accept-Language` |
| **Calendar events** | Weekly schedule editable both from Directus and from a web modal |
| **Custom design system** | 10+ bespoke components on top of Nuxt UI v4 |
| **ModSecurity WAF** | OWASP CRS 4.x in front of all traffic via Nginx |
| **Health checks** | Docker `healthcheck` on all five services; `/api/health` and `/api/status` endpoints |

<br>

</details>

<details>
<summary><strong>Usage Example & Testing</strong></summary>

### Quick Start

**1. Build and launch the full stack:**
```bash
make all
```

**2. Open the platform in the browser:**
```
https://localhost:8443         # Main application
https://localhost:8443/cms     # Directus admin panel
https://localhost:8443/api/v1/docs   # OpenAPI 3.1 schema (public REST API)
```

Accept the browser warning for the self-signed certificate.

**3. Load the editorial catalogue and demo accounts:**
```bash
make seed       # Modules, classes, FAQs, UI strings (idempotent)
make test       # Demo + tester user accounts (idempotent)
```

### Health & Vimeo Smoke Test (IV.9 DevOps)

```bash
make vimeo-check
```

Probes `/api/health` and exercises the Vimeo proxy with a non-existent video id. Expected output:
```
✓ /api/health OK
✓ Vimeo proxy answered 503 (token not configured) — handled gracefully
═══ Healthcheck OK ═══
```

### Public API Smoke Test (IV.1 Major)

```bash
make api
```

Exercises `POST /api/v1/reviews` three times to verify the API-key gate:
```
→ Without X-API-Key  (expected 401) ✓
→ Wrong X-API-Key    (expected 401) ✓
→ Correct X-API-Key  (expected 201) ✓
```

### Stripe Webhook (local dev)

Install the Stripe CLI and run it alongside the stack:

```bash
stripe listen --forward-to https://localhost:8443/api/stripe/webhook --skip-verify
```

Copy the printed `whsec_…` value into `STRIPE_WEBHOOK_SECRET` in `srcs/.env`, then `make restart`.

### Production Preview (no Nginx, no SSL)

```bash
make preview
```

Builds the production Nitro bundle and serves it on `http://localhost:3000`, bypassing Nginx and TLS termination entirely.

<br>

</details>

## 🚀 Installation & Structure

<details>
<summary><strong>📥 Setup & Usage</strong></summary>

<br>

```bash
# Clone the repository
git clone <repo-url> ft_transcendence
cd ft_transcendence

# Build and start the whole stack (creates .env + SSL cert, builds images, starts services)
make all

# First-time data loading
make seed         # editorial catalogue (modules, classes, tags, faqs)
make test         # demo + tester accounts

# Day-to-day commands
make up                 # start
make down               # stop
make restart            # down + up
make logs               # stream logs from every service
make logs-fullstack     # Nuxt logs only
make status             # docker compose ps
make preview            # production build on http://localhost:3000 (no SSL)
make vimeo-check        # smoke-test /api/health and Vimeo proxy
make api                # smoke-test the Public API key gate
make directus-snapshot  # save Directus schema to snapshots/
make directus-apply     # load snapshots/ into Directus
make shell-db           # open a psql shell on the PostgreSQL container
make clean              # stop + wipe volumes (DB, Redis, uploads)
make fclean             # clean + remove built images
make re                 # fclean + all
```

<br>

## Environment Variables

All credentials are stored in `srcs/.env` and injected into containers via Docker Compose. The file is auto-generated from `srcs/.env.example` by `make setup`. No passwords appear in any Dockerfile or compose file.

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | PostgreSQL credentials |
| `DATABASE_URL` | Prisma connection string |
| `JWT_SECRET` | Secret used to sign session JWTs (HS256) |
| `REDIS_PASSWORD` | Password protecting the Redis instance |
| `NGINX_HTTPS_PORT` / `NGINX_HTTP_PORT` | Host ports exposed by Nginx |
| `MODSEC_RULE_ENGINE` / `WAF_PARANOIA` | ModSecurity engine mode and CRS paranoia level |
| `DIRECTUS_KEY` / `DIRECTUS_SECRET` | Directus instance keys |
| `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD` | CMS admin credentials |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLIC_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API + webhook secrets |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google OAuth 2.0 credentials |
| `VIMEO_ACCESS_TOKEN` | Vimeo OAuth 2 token for gated playback |
| `API_KEY` | Public REST API key (`/api/v1` write endpoints) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Transactional email |

See `srcs/.env.example` for the full template.

<br>

## Module Selection (19 points)

| Section | Module | Type | Points |
|---------|--------|------|--------|
| **IV.1 Web** | Full-stack framework (Nuxt 4) | Major | 2 |
| **IV.1 Web** | Public API with API key + docs | Major | 2 |
| **IV.1 Web** | ORM (Prisma 5) | Minor | 1 |
| **IV.1 Web** | Server-Side Rendering | Minor | 1 |
| **IV.1 Web** | Custom design system | Minor | 1 |
| **IV.1 Web** | Advanced search | Minor | 1 |
| **IV.2 Accessibility** | Multi-language EN / ES / FR | Minor | 1 |
| **IV.2 Accessibility** | Multi-browser support | Minor | 1 |
| **IV.3 User Management** | Google OAuth 2.0 | Minor | 1 |
| **IV.3 User Management** | 2FA TOTP | Minor | 1 |
| **IV.8 Data & Analytics** | GDPR compliance | Minor | 1 |
| **IV.9 DevOps** | Health checks | Minor | 1 |
| **IV.10 Modules of Choice** | Stripe Payments integration | Major | 2 |
| **IV.10 Modules of Choice** | Directus CMS multilocale | Major | 2 |
| **IV.10 Modules of Choice** | Vimeo gated playback | Minor | 1 |
| | | **Total** | **19 pts** |

<br>

</details>

<details>
<summary><strong>📁 Project Structure</strong></summary>

<br>

```
ft_transcendence/
│
├── Makefile                                # Build, run, seed and smoke-test targets
├── README.md                               # GitHub project overview
├── LICENSE
├── .gitignore
│
├── docs/
│   ├── README.md                           # Full project documentation
│   ├── database_schema.png                 # ER diagram
│   └── docker_services.png                 # Container topology
│
└── srcs/
    ├── .env                                # Environment variables (auto-generated)
    ├── .env.example                        # Template for .env
    ├── docker-compose.yml                  # Service orchestration (5 containers, 2 networks)
    └── requirements/
        ├── nginx/                          # Reverse proxy + ModSecurity WAF
        │   ├── Dockerfile
        │   ├── conf.d/                     # TLS + FastCGI + WAF configuration
        │   ├── static/                     # Maintenance / error pages
        │   └── ssl/                        # Self-signed certificate (generated by make setup)
        ├── fullstack/                      # Nuxt 4 (SSR frontend + Nitro API)
        │   ├── Dockerfile
        │   ├── entrypoint.sh
        │   ├── nuxt.config.ts
        │   ├── package.json
        │   ├── tsconfig.json
        │   ├── prisma/
        │   │   └── schema.prisma           # 17 models with UUID/INT hybrid PKs
        │   ├── public/                     # Static assets
        │   ├── app/                        # Frontend (Vue 3, SSR)
        │   │   ├── app.vue
        │   │   ├── app.config.ts
        │   │   ├── assets/                 # Tailwind v4 styles
        │   │   ├── components/             # Custom design system (10+ components)
        │   │   ├── composables/            # useTags, useNotify, useAuth, ...
        │   │   ├── layouts/                # Default layout
        │   │   ├── middleware/             # Route guards
        │   │   ├── pages/                  # File-based routing
        │   │   └── plugins/                # Client-side plugins
        │   └── server/                     # Backend (Nitro server routes)
        │       ├── api/                    # ~35 endpoints
        │       │   ├── auth/               # register, login, logout, google/*, recovery
        │       │   ├── me/                 # profile, purchases, 2fa, export, erasure
        │       │   ├── modules/            # catalogue + detail
        │       │   ├── classes/            # lesson list + Vimeo embed proxy
        │       │   ├── checkout/           # Stripe Checkout session creation
        │       │   ├── stripe/             # Webhook handler (idempotent)
        │       │   ├── faqs/, reviews/     # Editorial content
        │       │   ├── calendar/           # Weekly schedule
        │       │   ├── career-milestones/  # Timeline content
        │       │   ├── tags/               # Localised UI strings
        │       │   ├── videos/             # Vimeo proxy (gated)
        │       │   ├── v1/                 # Public REST API (X-API-Key)
        │       │   ├── health.get.ts       # IV.9 healthcheck
        │       │   ├── status.get.ts       # Detailed service inventory
        │       │   ├── config.get.ts
        │       │   ├── privacy.get.ts
        │       │   └── locale.post.ts
        │       ├── middleware/             # Auth, rate limit, locale resolution
        │       └── utils/                  # mailer, api-key, access, pricing, vimeo, ...
        ├── database/
        │   └── init.sql                    # Postgres bootstrap (uuid-ossp, pgcrypto)
        ├── redis/
        │   └── redis.conf                  # Redis 7 configuration
        └── directus/                       # Generated on first run
            ├── extensions/                 # Custom Directus extensions
            └── snapshots/                  # Version-controlled CMS schema
```

<br>

</details>

<details>
<summary><strong>🧱 Infrastructure Overview</strong></summary>

<br>

### Architecture

A five-container stack with Nginx as the sole entry point. All other services are internal-only.

```
[Browser] ──HTTPS:8443──> [Nginx + ModSecurity] ──HTTP──> [Nuxt fullstack (SSR + API)]
                                                              │
                                                              ├──> [PostgreSQL 17]
                                                              ├──> [Redis 7]
                                                              └──> [Directus 11]
```

### Services

| Service | Image | Role |
|---------|-------|------|
| **nginx** | custom (Debian) | Reverse proxy, TLS termination (TLSv1.2/1.3), ModSecurity + OWASP CRS 4.x |
| **fullstack** | custom (node) | Nuxt 4 + Nitro — SSR frontend and ~35 API routes in one process |
| **db** | postgres:17-bookworm | Primary relational store (shared with Directus) |
| **redis** | redis:7.4-bookworm | Session cache + sliding-window rate limiting |
| **directus** | directus/directus:11 | Headless CMS reading/writing the product's own tables |

### Networks

Two Docker networks isolate concerns:

| Network | Members | Internal |
|---------|---------|----------|
| `proxy_net` | nginx, fullstack, directus | No (port 443/80 exposed by Nginx) |
| `data_net` | fullstack, db, redis, directus | Yes (no external egress) |

### Volumes

| Volume | Container path | Purpose |
|--------|----------------|---------|
| `yoga_db_data` | `/var/lib/postgresql/data` | PostgreSQL data files |
| `yoga_redis_data` | `/data` | Redis persistence |
| `yoga_directus_uploads` | `/directus/uploads` | CMS-uploaded media |

### Restart Policy

All services use `restart: unless-stopped`. Docker restarts any crashed container automatically until the operator explicitly stops the stack.

<br>

</details>

## 💡 Key Learning Outcomes

The ft_transcendence project ties together every layer of a modern web product:

- **Full-stack Architecture**: Sharing SSR and API code in a single Nuxt 4 process to eliminate cross-container hops at render time
- **Authentication Security**: Argon2id password hashing, JWT-in-cookie sessions, CSRF-protected OAuth, 2FA TOTP and constant-time API-key comparison
- **Payment Integration**: Idempotent Stripe webhook handling, anti-duplicate-charge guards and automatic VAT calculation
- **Database Design**: Hybrid UUID/integer primary-key strategy balancing auth security with CMS introspection constraints
- **Headless CMS Integration**: Running Directus on top of the product's own Postgres schema without owning a separate database
- **Public API Design**: Versioned `/api/v1`, OpenAPI 3.1 documentation, key-based auth and per-route rate limiting
- **Infrastructure & DevOps**: Docker Compose with health checks, dependency ordering, network isolation and a WAF in front of the perimeter
- **GDPR Compliance**: Data export and account erasure endpoints with fiscal-compliant order anonymisation and confirmation emails
- **Internationalisation**: Per-locale editorial content with query → cookie → `Accept-Language` fallback and cross-locale purchase resolution
- **Team Coordination**: Four-person delivery split across vertical tracks (backend / frontend / database / CMS) with a shared schema as the contract

## ⚙️ Technical Specifications

- **Frontend**: Nuxt 4 (Vue 3, SSR), Nuxt UI v4, Tailwind CSS v4, custom design system
- **Backend**: Nitro (bundled with Nuxt 4), ~35 server routes, Zod validation
- **Authentication**: Argon2id, JWT HS256 in `HttpOnly; Secure; SameSite` cookies, Google OAuth 2.0, 2FA TOTP (otplib + qrcode)
- **Database**: PostgreSQL 17 + Prisma 5 (17 models, hybrid UUID/INT PKs, `uuid-ossp` + `pgcrypto`)
- **Cache & Rate-limit**: Redis 7 (sliding-window) shared between fullstack and Directus
- **CMS**: Directus 11 introspecting the product's own Postgres tables
- **Reverse Proxy / WAF**: Nginx + ModSecurity (OWASP CRS 4.x), TLSv1.2 and TLSv1.3 only
- **Payments**: Stripe Checkout + signed webhook handler, automatic VAT, bundle pricing logic
- **Video**: Vimeo OAuth 2 with `private_video` scope, automatic token refresh
- **Mailing**: Nodemailer over SMTP for verification, recovery, purchase receipts and GDPR confirmations
- **Public API**: `/api/v1` with `X-API-Key` (constant-time compare), Zod validation, OpenAPI 3.1 docs
- **Orchestration**: Docker Compose (5 services, 2 networks, 3 volumes)
- **Restart Policy**: `unless-stopped` on every service
- **Default Ports**: `8443` (HTTPS), `8080` (HTTP redirect), `5555` (Prisma Studio, dev only)

## 🔧 Requirements

- Linux or macOS host
- Docker Engine 24.x or later
- Docker Compose plugin v2.x or later
- `make`
- OpenSSL (used by `make setup` to generate the self-signed certificate)
- A modern browser (Chromium, Firefox or Safari) to accept the self-signed certificate

No local Node.js installation is needed — everything runs inside Docker.

## 👥 Team

| Login | Role |
|-------|------|
| **ravazque** | Tech Lead / Backend Lead — architecture, Nuxt 4 server, auth, Stripe, GDPR, public `/api/v1`, mailing, healthchecks |
| **marcoga2** | Frontend Lead / UX — pages, SSR, VimeoPlayer, design system, multilanguage UI, notifications |
| **mvassall** | Database Architect / Auth Engineer — Prisma schema, Google OAuth, 2FA TOTP, hybrid key strategy |
| **dsoriano** | CMS Lead — Directus 11 integration, collection structure, dual-write calendar, CMS onboarding |

---

> [!NOTE]
> ft_transcendence is the capstone of the 42 Common Core. This implementation goes beyond the academic scope by being built for a real client, with production-grade concerns: TLS, WAF, idempotent payment processing, GDPR compliance and a documented public API.
