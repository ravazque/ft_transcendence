import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'
import { rateLimit } from '../../utils/rate-limit'

// GET /api/v1/faqs
//
// Localised FAQ list. Read-only, rate-limited per IP.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'v1:faqs', limit: 120, windowSec: 60 })

  const locale = resolveLocale(event)
  const items = await prisma.faq.findMany({
    where: { locale },
    orderBy: { id: 'asc' },
    select: { id: true, question: true, answer: true },
  })

  return { locale, total: items.length, items }
})
