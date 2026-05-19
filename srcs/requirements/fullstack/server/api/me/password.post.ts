import { prisma } from '../../utils/prisma'
import {
  hashPassword,
  verifyPassword,
  requireAuth,
  clearSessionCookie,
  signSession,
  setSessionCookie,
} from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { changePasswordSchema, firstZodMessage } from '../../utils/validation'

// POST /api/me/password
// Updates the authenticated user's password. Requires the current
// password as proof of identity. Rotates the session cookie afterwards
// so the previous JWT (still valid until expiry) is replaced — the
// user effectively stays logged in but the old token is gone from the
// browser. Other devices keep their JWT until expiry; full revocation
// requires the refresh-token rotation backlog (see roadmap §10).
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  await rateLimit(event, { key: 'me:password', limit: 5, windowSec: 3600 })

  const body = await readBody(event)
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: firstZodMessage(parsed.error),
      data: parsed.error.flatten(),
    })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { id: true, email: true, role: true, password: true },
  })
  if (!user) {
    clearSessionCookie(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const valid = await verifyPassword(user.password, currentPassword)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid current password' })
  }

  const newHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHash },
  })

  const token = signSession({ sub: user.id, email: user.email, role: user.role })
  setSessionCookie(event, token)

  setResponseStatus(event, 204)
  return null
})
