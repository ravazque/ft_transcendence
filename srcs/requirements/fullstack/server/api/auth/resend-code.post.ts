import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { rateLimit } from '../../utils/rate-limit'
import { refreshChallengeCode, getChallengeMeta } from '../../utils/auth-challenge'
import { sendMail } from '../../utils/mailer'
import { resolveLocale } from '../../utils/locale'

const bodySchema = z.object({
  challengeId: z.string().min(10).max(64),
  email: z.string().trim().toLowerCase().email().max(254),
})

// POST /api/auth/resend-code
//
// Re-issues a fresh code for an existing challenge (login, register or
// recovery). Used by the verify modal when the user does not receive
// the email. The attempt counter is preserved, so this is NOT a
// brute-force escape hatch.
//
// Two limits:
//   - Per IP: 10 / 15 min. Loose ceiling: blocks bulk automation, not
//     real users.
//   - Per challenge: a strict 60s cooldown between resends. Enforced
//     inside refreshChallengeCode. We return the missing seconds so
//     the client can show a countdown.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:resend', limit: 10, windowSec: 900 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Datos no válidos.' })
  }

  const meta = await getChallengeMeta(parsed.data.challengeId)
  if (!meta) {
    throw createError({
      statusCode: 410,
      statusMessage: 'El código ha caducado. Vuelve a iniciar el proceso.',
    })
  }

  const outcome = await refreshChallengeCode(parsed.data.challengeId)
  if (!outcome.ok) {
    if (outcome.reason === 'cooldown') {
      setHeader(event, 'Retry-After', String(outcome.retryAfterSec))
      throw createError({
        statusCode: 429,
        statusMessage: `Espera ${outcome.retryAfterSec} segundo${outcome.retryAfterSec === 1 ? '' : 's'} para reenviar el código.`,
        data: { retryAfterSec: outcome.retryAfterSec },
      })
    }
    throw createError({
      statusCode: 410,
      statusMessage: 'El código ha caducado. Vuelve a iniciar el proceso.',
    })
  }

  let username: string | null = null
  if (meta.kind === 'login' || meta.kind === 'recovery') {
    const u = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { username: true, preferredLocale: true },
    })
    username = u?.username ?? null
  }

  const locale = resolveLocale(event)
  const mail = buildAuthCode({
    username,
    code: outcome.code,
    purpose: meta.kind,
    locale,
  })
  await sendMail({ to: parsed.data.email, ...mail })

  return {
    ok: true,
    resendAvailableAt: outcome.resendAvailableAt,
  }
})
