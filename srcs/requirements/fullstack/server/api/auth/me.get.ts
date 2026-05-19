import { prisma } from '../../utils/prisma'
import { requireAuth, clearSessionCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      avatar: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  // Token is valid but the user no longer exists — drop the stale cookie.
  if (!user) {
    clearSessionCookie(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return { user }
})
