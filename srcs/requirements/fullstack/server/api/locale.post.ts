import { z } from 'zod'
import { prisma } from '../utils/prisma'

const bodySchema = z.object({
  locale: z.enum(['en_en', 'es_es', 'fr_fr']),
})

// POST /api/locale
//
// Saves the visitor's chosen language in the `yoga_locale` cookie (1
// year, not HttpOnly so the front end can inspect it) and, when a
// session is active, also persists it in `users.preferred_locale` so
// the next fresh device starts in that language straight away.
//
// Every subsequent request goes through resolveLocale(), which reads
// the cookie as its second priority (right after the query string).
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Idioma no soportado.' })
  }

  setCookie(event, 'yoga_locale', parsed.data.locale, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  })

  const userId = event.context.auth?.sub
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredLocale: parsed.data.locale },
    }).catch(() => undefined)
  }

  return { ok: true, locale: parsed.data.locale }
})
