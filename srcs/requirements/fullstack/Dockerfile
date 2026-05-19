# Fullstack: Nuxt 4 (SSR + API server routes) on Node 22 LTS
#
# Single container serving both frontend (SSR) and backend (server routes).
# Prisma handles database access. argon2 requires native compilation tools.
#
# Build strategy: everything is installed and copied as the unprivileged
# `node` user from the start, so we never have to run a recursive chown
# over node_modules (~50k files) — a recursive chown on a networked FS
# like the one in the 42 cluster takes ~20 minutes.
FROM node:22-bookworm-slim

# curl: Docker healthcheck
# openssl: required by Prisma
# python3, make, g++: native compilation for argon2 bindings
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app

USER node

COPY --chown=node:node package.json package-lock.json* ./

RUN npm install

COPY --chown=node:node . .

RUN npx prisma generate

EXPOSE 3000

# `entrypoint.sh` runs `prisma db push` only on first boot (empty volume).
# This avoids the data-loss abort on container restart caused by `db push`
# wanting to drop Directus's `directus_*` tables — they live in the same
# `public` schema by design.
# For production use: prisma migrate deploy.
CMD ["sh", "entrypoint.sh"]
