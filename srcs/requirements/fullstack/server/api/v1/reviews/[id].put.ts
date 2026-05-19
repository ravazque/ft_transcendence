import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { requireApiKey } from '../../../utils/api-key'
import { rateLimit } from '../../../utils/rate-limit'

const SCHEMA = z.object({
  name: z.string().min(1).max(255).optional(),
  title: z.string().min(1).max(255).optional(),
  imageUrl: z.string().url().max(255).optional(),
  description: z.string().min(1).max(255).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Empty payload' })

// PUT /api/v1/reviews/:id
//
// Updates a curated homepage review. Requires a valid X-API-Key.
export default defineEventHandler(async (event) => {
  requireApiKey(event)
  await rateLimit(event, { key: 'v1:reviews:write', limit: 30, windowSec: 60 })

  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid review id' })
  }

  const body = await readBody(event)
  const parsed = SCHEMA.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload', data: parsed.error.flatten() })
  }

  try {
    const review = await prisma.homeReview.update({
      where: { id },
      data: parsed.data,
      select: { id: true, locale: true, name: true, title: true, imageUrl: true, description: true },
    })
    return review
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Review not found' })
  }
})
