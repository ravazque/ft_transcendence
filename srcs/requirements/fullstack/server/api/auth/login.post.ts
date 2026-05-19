import { prisma } from '../../utils/prisma'
import { hashPassword, verifyPassword } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { loginSchema } from '../../utils/validation'
import { createChallenge } from '../../utils/auth-challenge'
import { sendMail } from '../../utils/mailer'
import { resolveLocale } from '../../utils/locale'

// POST /api/auth/login — step 1 of the two-step login flow.
//
// Validates credentials and, on success, creates a single-use code
// challenge stored in Redis (10 min TTL, 5 attempts). The code is
// emailed to the user. The endpoint returns the opaque `challengeId`
// the client uses to finalise login at /api/auth/login/verify.
//
// Failure modes return Spanish, user-friendly messages — without
// distinguishing "account does not exist" from "wrong password" to
// avoid account enumeration. Rate-limit is preserved (5/15 min per IP)
// but its 429 message is also friendly (see rate-limit.ts).
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:login', limit: 5, windowSec: 900 })

  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Datos no válidos.' })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // Burn an argon2 cycle when the user does not exist so the response
  // time does not leak account existence.
  if (!user) {
    await hashPassword(password)
    throw createError({
      statusCode: 401,
      statusMessage: 'Correo o contraseña incorrectos.',
    })
  }

  const valid = await verifyPassword(user.password, password)
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Correo o contraseña incorrectos.',
    })
  }

  const challenge = await createChallenge({ kind: 'login', userId: user.id })
  const locale = user.preferredLocale === 'fr_fr' ? 'fr_fr' : resolveLocale(event)
  const mail = buildAuthCode({
    username: user.username,
    code: challenge.code,
    purpose: 'login',
    locale,
  })
  // Mail failures must NOT prevent login — in dev SMTP is empty and the
  // code is read from container logs. In production the mailer throws
  // 503 which is bubbled up.
  await sendMail({ to: user.email, ...mail })

  return {
    requiresVerification: true,
    challengeId: challenge.challengeId,
    email: user.email,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  }
})
