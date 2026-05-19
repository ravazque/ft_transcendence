import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'

// GET /api/reviews
// Real reviews written by users. Public (consumed by the home page
// without a session). Returns the N most recent published reviews for
// the locale resolved from the request.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)
  const limit = Math.min(Number(getQuery(event).limit ?? 12), 50)

  const reviews = await prisma.userReview.findMany({
    where: { locale, published: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      content: true,
      rating: true,
      createdAt: true,
      user: {
        select: { username: true, avatar: true, fullName: true },
      },
    },
  })

  return {
    items: reviews.map((r) => ({
      id: r.id,
      content: r.content,
      rating: r.rating,
      createdAt: r.createdAt,
      user: {
        username: r.user.username,
        displayName: r.user.fullName ?? r.user.username,
        avatar: r.user.avatar,
      },
    })),
  }
})
