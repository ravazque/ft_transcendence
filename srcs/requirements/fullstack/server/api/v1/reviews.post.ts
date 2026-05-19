import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireApiKey } from '../../utils/api-key'
import { rateLimit } from '../../utils/rate-limit'

const SCHEMA = z.object({
  locale: z.enum(['en_en', 'es_es', 'fr_fr']),
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  imageUrl: z.string().url().max(255),
  description: z.string().min(1).max(255),
})

// POST /api/v1/reviews
//
// Creates a curated homepage review. Requires a valid X-API-Key
// header. Rate-limited per IP as a defensive measure even though
// the key already gates access.
export default defineEventHandler(async (event) => {
  requireApiKey(event)
  await rateLimit(event, { key: 'v1:reviews:write', limit: 30, windowSec: 60 })

  const body = await readBody(event)
  const parsed = SCHEMA.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload', data: parsed.error.flatten() })
  }

  const review = await prisma.homeReview.create({
    data: parsed.data,
    select: { id: true, locale: true, name: true, title: true, imageUrl: true, description: true },
  })

  setResponseStatus(event, 201)
  return review
})
