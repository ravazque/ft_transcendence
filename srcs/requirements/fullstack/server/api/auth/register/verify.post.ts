import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { signSession, setSessionCookie } from '../../../utils/auth'
import { rateLimit } from '../../../utils/rate-limit'
import { consumeChallenge } from '../../../utils/auth-challenge'

const bodySchema = z.object({
  challengeId: z.string().min(10).max(64),
  code: z.string().regex(/^\d{6}$/, 'Código de 6 dígitos requerido.'),
})

// POST /api/auth/register/verify — step 2 of the two-step register flow.
//
// Consumes the challenge created by /api/auth/register, creates the
// User row (email_verified = true since the code proves ownership of
// the address), and issues the session JWT cookie.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:register:verify', limit: 20, windowSec: 900 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Datos no válidos.' })
  }

  const outcome = await consumeChallenge(parsed.data.challengeId, parsed.data.code, 'register')
  if (!outcome.ok) {
    const map: Record<string, { code: number; message: string }> = {
      not_found: {
        code: 410,
        message: 'El código ha caducado. Vuelve a registrarte.',
      },
      too_many_attempts: {
        code: 429,
        message: 'Demasiados intentos. Vuelve a registrarte.',
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

  if (outcome.payload.kind !== 'register') {
    throw createError({ statusCode: 400, statusMessage: 'Reto inválido.' })
  }

  const { email, username, passwordHash, locale } = outcome.payload

  let user
  try {
    user = await prisma.user.create({
      data: {
        email,
        username,
        password: passwordHash,
        emailVerified: true,
        preferredLocale: locale,
      },
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Someone else claimed the email/username during the 10 min
      // verification window.
      throw createError({
        statusCode: 409,
        statusMessage: 'Ese correo o nombre de usuario ya está en uso.',
      })
    }
    throw err
  }

  const token = signSession({ sub: user.id, email: user.email, role: user.role })
  setSessionCookie(event, token)

  setResponseStatus(event, 201)
  return { user }
})
