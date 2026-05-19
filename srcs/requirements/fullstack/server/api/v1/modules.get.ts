import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'
import { rateLimit } from '../../utils/rate-limit'

// GET /api/v1/modules
//
// Returns the public catalogue for the resolved locale. Read-only,
// no API key required, rate-limited per IP.
//
// Query params:
//   locale  – override the resolved locale (en_en | es_es | fr_fr)
//   limit   – page size (1..50, default 20)
//   offset  – pagination offset (default 0)
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'v1:modules', limit: 60, windowSec: 60 })

  const locale = resolveLocale(event)
  const q = getQuery(event)
  const limit = Math.min(Math.max(Number(q.limit ?? 20) || 20, 1), 50)
  const offset = Math.max(Number(q.offset ?? 0) || 0, 0)

  const [items, total] = await Promise.all([
    prisma.module.findMany({
      where: { locale },
      orderBy: [{ isFullCourse: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        cover: true,
        price: true,
        isFullCourse: true,
      },
    }),
    prisma.module.count({ where: { locale } }),
  ])

  return { locale, total, limit, offset, items }
})
