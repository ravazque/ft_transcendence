import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { hashPassword, signSession, setSessionCookie } from '../../../utils/auth'
import { rateLimit } from '../../../utils/rate-limit'
import { consumeRecoveryTicket } from '../../../utils/auth-challenge'
import { firstZodMessage } from '../../../utils/validation'

const bodySchema = z
  .object({
    ticket: z.string().min(10).max(64),
    newPassword: z
      .string({ required_error: 'Introduce una contraseña nueva.' })
      .min(8, 'La contraseña nueva debe tener al menos 8 caracteres.')
      .max(128, 'La contraseña nueva es demasiado larga.'),
    confirmPassword: z
      .string({ required_error: 'Confirma la contraseña nueva.' })
      .min(1, 'Confirma la contraseña nueva.')
      .max(128),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

// POST /api/auth/password-recovery/verify
//
// Final step of the recovery flow: exchanges the `ticket` issued by
// /verify-code and changes the password. After the change it issues
// the session cookie so the user is signed in straight away.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'auth:recovery:verify', limit: 20, windowSec: 900 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: firstZodMessage(parsed.error),
      data: parsed.error.flatten(),
    })
  }

  const userId = await consumeRecoveryTicket(parsed.data.ticket)
  if (!userId) {
    throw createError({
      statusCode: 410,
      statusMessage: 'La sesión de recuperación ha caducado. Vuelve a iniciar el proceso.',
    })
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
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

  const token = signSession({ sub: user.id, email: user.email, role: user.role })
  setSessionCookie(event, token)

  return { user }
})
