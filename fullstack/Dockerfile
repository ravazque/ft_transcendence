# Fullstack: Nuxt 4 (SSR + API server routes) on Node 22 LTS
#
# Single container serving both frontend (SSR) and backend (server routes).
# Prisma handles database access. argon2 requires native compilation tools.
FROM node:22-bookworm-slim

# curl: Docker healthcheck
# openssl: required by Prisma
# python3, make, g++: native compilation for argon2 bindings
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

# db push syncs schema directly (dev). For production use: prisma migrate deploy
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
