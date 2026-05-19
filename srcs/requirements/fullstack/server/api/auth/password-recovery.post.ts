import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { rateLimit } from '../../utils/rate-limit'
import { createChallenge } from '../../utils/auth-challenge'
import { sendMail } from '../../utils/mailer'
import { resolveLocale } from '../../utils/locale'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

// POST /api/auth/password-recovery
//
// Starts the password-recovery flow. Unlike login, recovery DOES
// reveal whether an account exists — a UX call aligned with services
// like GitHub: a user who forgot their password needs immediate
// feedback if they typed the wrong email, and the cost of enumerating
// accounts through this path is bounded by the per-IP rate limit
// (1/min).
//
// If the email exists: it creates a `recovery` challenge in Redis
// (10 min, 5 attempts) and emails a 6-digit code.
//
// Rate-limit: 1 / 60 s per IP. Aligned with the resend cooldown of the
// challenge itself — from the user's perspective the button frees up
// every minute regardless of whether they hit "new recovery" or
// "resend".
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:recovery:request', limit: 1, windowSec: 60 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Datos no válidos.' })
  }

  const { email } = parsed.data
  const locale = resolveLocale(event)

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true, preferredLocale: true },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No hay ninguna cuenta registrada con ese correo.',
    })
  }

  const challenge = await createChallenge({
    kind: 'recovery',
    userId: user.id,
    email: user.email,
  })
  const mail = buildAuthCode({
    username: user.username,
    code: challenge.code,
    purpose: 'recovery',
    locale: user.preferredLocale ?? locale,
  })
  try {
    await sendMail({ to: user.email, ...mail })
  } catch (err) {
    console.warn('[password-recovery] email failed', err)
  }
  return {
    requiresVerification: true,
    challengeId: challenge.challengeId,
    email: user.email,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  }
})
