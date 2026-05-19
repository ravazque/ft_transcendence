import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'
import { rateLimit } from '../../utils/rate-limit'

// GET /api/v1/reviews
//
// Curated homepage reviews for the resolved locale. Open to anyone,
// rate-limited per IP.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'v1:reviews:list', limit: 120, windowSec: 60 })

  const locale = resolveLocale(event)
  const items = await prisma.homeReview.findMany({
    where: { locale },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, title: true, imageUrl: true, description: true },
  })

  return { locale, total: items.length, items }
})
