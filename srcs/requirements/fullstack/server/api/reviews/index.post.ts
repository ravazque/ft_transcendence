import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { resolveLocale } from '../../utils/locale'

const bodySchema = z.object({
  content: z.string().trim().min(10, 'La reseña es demasiado corta.').max(600),
  rating: z.number().int().min(1).max(5).optional(),
})

// POST /api/reviews
//
// Creates or updates the user's review for their current locale. One
// review per (user, locale) — a second submission replaces the
// content (upsert) to prevent spam and duplicate reviews. Rate limit
// 5/h per IP to mitigate abuse.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  await rateLimit(event, { key: 'reviews:create', limit: 5, windowSec: 3600 })

  // Only users who have bought at least one module can leave a
  // review — prevents astroturfing from accounts created just to
  // write reviews.
  const purchaseCount = await prisma.purchase.count({ where: { userId: auth.sub } })
  if (purchaseCount === 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Necesitas haber comprado al menos un módulo para dejar reseña.',
    })
  }

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Datos no válidos.',
      data: parsed.error.flatten(),
    })
  }

  const locale = resolveLocale(event)

  const review = await prisma.userReview.upsert({
    where: { userId_locale: { userId: auth.sub, locale } },
    create: {
      userId: auth.sub,
      locale,
      content: parsed.data.content,
      rating: parsed.data.rating ?? null,
    },
    update: {
      content: parsed.data.content,
      rating: parsed.data.rating ?? null,
    },
    select: { id: true, content: true, rating: true, createdAt: true },
  })

  setResponseStatus(event, 201)
  return { review }
})
