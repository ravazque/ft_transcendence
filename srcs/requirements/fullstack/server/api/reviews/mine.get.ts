import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { resolveLocale } from '../../utils/locale'

// GET /api/reviews/mine
// Returns the current user's review for their locale (if any). The
// front end uses it to pre-fill the textarea when the user wants to
// edit their review.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const locale = resolveLocale(event)

  const review = await prisma.userReview.findUnique({
    where: { userId_locale: { userId: auth.sub, locale } },
    select: { id: true, content: true, rating: true, createdAt: true, updatedAt: true },
  })

  return { review }
})
