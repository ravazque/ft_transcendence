import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { registerSchema, firstZodMessage } from '../../utils/validation'
import { createChallenge } from '../../utils/auth-challenge'
import { sendMail } from '../../utils/mailer'
import { resolveLocale } from '../../utils/locale'

// POST /api/auth/register — step 1 of the two-step register flow.
//
// Validates the form, checks that email/username are free, hashes
// the password, and stashes the whole payload in a Redis challenge
// (10 min TTL). The user row is NOT created yet — the row appears
// only after the user verifies the code at /api/auth/register/verify.
// This way an interrupted signup leaves no orphan row behind.
//
// Friendly Spanish error messages, generic uniqueness wording so we
// don't reveal which field clashes (defence in depth against account
// enumeration).
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:register', limit: 5, windowSec: 3600 })

  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: firstZodMessage(parsed.error),
      data: parsed.error.flatten(),
    })
  }

  const { email, username, password } = parsed.data

  // Conflict check before we burn an Argon2 cycle.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ese correo o nombre de usuario ya está en uso.',
    })
  }

  const passwordHash = await hashPassword(password)
  const locale = resolveLocale(event)

  const challenge = await createChallenge({
    kind: 'register',
    email,
    username,
    passwordHash,
    locale,
  })

  const mail = buildAuthCode({
    username,
    code: challenge.code,
    purpose: 'register',
    locale,
  })
  await sendMail({ to: email, ...mail })

  setResponseStatus(event, 202)
  return {
    requiresVerification: true,
    challengeId: challenge.challengeId,
    email,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
  }
})
