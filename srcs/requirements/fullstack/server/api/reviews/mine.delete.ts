import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { resolveLocale } from '../../utils/locale'

// DELETE /api/reviews/mine
//
// Deletes the authenticated user's review for the current locale. If
// nothing exists to delete it still returns 204 (idempotent). The
// user can only have one review per locale, so there is no ambiguity
// — moderation of other users' reviews is handled from Directus
// (`published` flag or direct deletion).
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  await rateLimit(event, { key: 'reviews:delete', limit: 10, windowSec: 3600 })

  const locale = resolveLocale(event)

  await prisma.userReview.deleteMany({
    where: { userId: auth.sub, locale },
  })

  setResponseStatus(event, 204)
  return null
})
