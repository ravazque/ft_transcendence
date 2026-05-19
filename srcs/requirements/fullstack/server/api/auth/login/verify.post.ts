import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { signSession, setSessionCookie } from '../../../utils/auth'
import { rateLimit } from '../../../utils/rate-limit'
import { consumeChallenge } from '../../../utils/auth-challenge'

const bodySchema = z.object({
  challengeId: z.string().min(10).max(64),
  code: z.string().regex(/^\d{6}$/, 'Código de 6 dígitos requerido.'),
})

// POST /api/auth/login/verify — step 2 of the two-step login flow.
//
// Consumes the challenge produced by /api/auth/login. On success
// fetches the user and issues the session JWT cookie. Friendly Spanish
// messages, no leakage of which step failed.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:login:verify', limit: 20, windowSec: 900 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Datos no válidos.' })
  }

  const outcome = await consumeChallenge(parsed.data.challengeId, parsed.data.code, 'login')
  if (!outcome.ok) {
    const map: Record<string, { code: number; message: string }> = {
      not_found: {
        code: 410,
        message: 'El código ha caducado. Vuelve a iniciar sesión.',
      },
      too_many_attempts: {
        code: 429,
        message: 'Demasiados intentos. Vuelve a iniciar sesión.',
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

  if (outcome.payload.kind !== 'login') {
    throw createError({ statusCode: 400, statusMessage: 'Reto inválido.' })
  }

  const user = await prisma.user.findUnique({
    where: { id: outcome.payload.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      avatar: true,
      emailVerified: true,
    },
  })
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión no válida.' })
  }

  const token = signSession({ sub: user.id, email: user.email, role: user.role })
  setSessionCookie(event, token)

  return { user }
})
