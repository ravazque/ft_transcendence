import { z } from 'zod'
import { rateLimit } from '../../../utils/rate-limit'
import { consumeChallenge, createRecoveryTicket } from '../../../utils/auth-challenge'

const bodySchema = z.object({
  challengeId: z.string().min(10).max(64),
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'),
})

// POST /api/auth/password-recovery/verify-code
//
// Intermediate step of the password-recovery flow:
//   1. POST /password-recovery     → emails the code
//   2. POST /password-recovery/verify-code  (← this one)
//      Validates the code and, on success, issues an ephemeral
//      `ticket` (10 min) that the next screen exchanges for the
//      password change. The original challenge is consumed here
//      (one-shot).
//   3. POST /password-recovery/verify  { ticket, newPassword, confirm }
//      Changes the password using the ticket.
//
// Splitting it this way lets the "New password" screen skip asking
// for the code again — email and code are handled on the previous
// panel and, once validated, the user only enters the new password.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:recovery:verify-code', limit: 20, windowSec: 900 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0]?.message || 'Datos no válidos.',
    })
  }

  const outcome = await consumeChallenge(parsed.data.challengeId, parsed.data.code, 'recovery')
  if (!outcome.ok) {
    const map: Record<string, { code: number; message: string }> = {
      not_found: {
        code: 410,
        message: 'El código ha caducado. Vuelve a iniciar la recuperación.',
      },
      too_many_attempts: {
        code: 429,
        message: 'Has agotado los intentos. Pide un nuevo código.',
      },
      wrong_code: {
        code: 401,
        message:
          typeof outcome.remaining === 'number'
            ? `Código incorrecto. Te quedan ${outcome.remaining} intento${outcome.remaining === 1 ? '' : 's'}.`
            : 'Código incorrecto.',
      },
    }
    const m = map[outcome.reason]
    throw createError({ statusCode: m.code, statusMessage: m.message })
  }

  if (outcome.payload.kind !== 'recovery') {
    throw createError({ statusCode: 400, statusMessage: 'Reto inválido.' })
  }

  const ticket = await createRecoveryTicket(outcome.payload.userId)
  return ticket
})
