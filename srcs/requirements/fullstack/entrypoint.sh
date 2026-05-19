#!/bin/sh
# Fullstack container bootstrap.
#
# Applies the Prisma schema ONLY on the first boot (empty volume).
# On subsequent restarts, the schema is already present and `db push` is skipped to
# prevent Prisma from attempting to delete the `directus_*` tables that Directus
# creates in the same `public` schema — this would abort the
# container startup as soon as `make down` + `make up` was run (data loss).
#
# To apply actual schema changes in dev: `make prisma-migrate`
# (or `make shell-app` + `npx prisma db push` manually).

set -e

if node -e 'const{PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.$queryRaw`SELECT 1 FROM modules LIMIT 1`.then(()=>{p.$disconnect();process.exit(0)}).catch(()=>{p.$disconnect();process.exit(1)})' 2>/dev/null; then
  echo "[fullstack] schema present — skipping db push"
else
  echo "[fullstack] schema missing — applying with prisma db push"
  npx prisma db push
fi

exec npm run dev
