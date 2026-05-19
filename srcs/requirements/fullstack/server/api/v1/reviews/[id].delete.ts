import { prisma } from '../../../utils/prisma'
import { requireApiKey } from '../../../utils/api-key'
import { rateLimit } from '../../../utils/rate-limit'

// DELETE /api/v1/reviews/:id
//
// Removes a curated homepage review. Requires a valid X-API-Key.
export default defineEventHandler(async (event) => {
  requireApiKey(event)
  await rateLimit(event, { key: 'v1:reviews:write', limit: 30, windowSec: 60 })

  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid review id' })
  }

  try {
    await prisma.homeReview.delete({ where: { id } })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Review not found' })
  }

  setResponseStatus(event, 204)
  return null
})
