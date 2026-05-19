import crypto from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { hashPassword, signSession, setSessionCookie } from '../../../utils/auth'
import {
  getGoogleConfig,
  readStateCookie,
  clearStateCookie,
  exchangeCodeForTokens,
  fetchUserInfo,
} from '../../../utils/google-oauth'

// Google SSO callback.
//
// Exchanges the `code` for tokens, fetches the user info, creates or
// reuses the account linked to that email and opens the session by
// issuing the app JWT in the `yoga_session` cookie. After that it
// redirects to the module catalogue.
export default defineEventHandler(async (event) => {
  const cfg = getGoogleConfig()
  if (!cfg) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Google OAuth no está configurado.',
    })
  }

  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const stateFromGoogle = typeof query.state === 'string' ? query.state : ''
  const errorFromGoogle = typeof query.error === 'string' ? query.error : ''

  if (errorFromGoogle) {
    clearStateCookie(event)
    throw createError({
      statusCode: 400,
      statusMessage: `Google denegó el inicio de sesión: ${errorFromGoogle}`,
    })
  }

  if (!code || !stateFromGoogle) {
    clearStateCookie(event)
    throw createError({ statusCode: 400, statusMessage: 'Respuesta de Google inválida.' })
  }

  const stateFromCookie = readStateCookie(event)
  clearStateCookie(event)
  if (!stateFromCookie || stateFromCookie !== stateFromGoogle) {
    throw createError({ statusCode: 400, statusMessage: 'State inválido (posible CSRF).' })
  }

  // ── Exchange code → tokens ──
  let tokens
  try {
    tokens = await exchangeCodeForTokens(cfg, code)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'No se ha podido validar el token con Google.' })
  }

  // ── userinfo ──
  let info
  try {
    info = await fetchUserInfo(tokens.access_token)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'No se ha podido leer el perfil de Google.' })
  }

  if (!info.email || !info.verified_email) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu cuenta de Google no tiene un email verificado.',
    })
  }

  const email = info.email.toLowerCase()

  // ── Reuse existing account if a user already exists for that email ──
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    const username = await generateUniqueUsername(email)
    const placeholderHash = await hashPassword(crypto.randomBytes(32).toString('hex'))

    try {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: placeholderHash,
          fullName: info.name ?? null,
          // avatar intentionally left null: the Google CDN URL
          // (lh3.googleusercontent.com/a/…) is brittle — it expires,
          // rejects unknown referers and depends on Google session
          // cookies. The frontend's avatarFor() falls back to a
          // deterministic colored-initial SVG, identical to the one
          // shown to email/password users.
          avatar: null,
          emailVerified: true,
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw createError({
          statusCode: 409,
          statusMessage: 'No se ha podido crear la cuenta: email o usuario en conflicto.',
        })
      }
      throw err
    }
  }

  // ── Open our own session ──
  const token = signSession({ sub: user.id, email: user.email, role: user.role })
  setSessionCookie(event, token)

  return await sendRedirect(event, '/modules', 302)
})

// Username generation: starts from the email prefix, normalised to
// the schema regex (alphanumeric + underscore) and truncated to the
// column limit (16 chars). On collision, append a short random suffix.
async function generateUniqueUsername(email: string): Promise<string> {
  const rawPrefix = email.split('@')[0] ?? 'user'
  const normalized = rawPrefix.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_')
  const base = normalized.length >= 3 ? normalized : `user_${normalized}`
  const baseTruncated = base.slice(0, 16)

  if (await isUsernameAvailable(baseTruncated)) {
    return baseTruncated
  }

  for (let i = 0; i < 6; i++) {
    const suffix = crypto.randomBytes(3).toString('hex')
    const candidate = `${base.slice(0, Math.max(3, 16 - suffix.length - 1))}_${suffix}`.slice(0, 16)
    if (await isUsernameAvailable(candidate)) {
      return candidate
    }
  }

  throw createError({ statusCode: 500, statusMessage: 'No se ha podido generar un username único.' })
}

async function isUsernameAvailable(candidate: string): Promise<boolean> {
  if (candidate.length < 3) return false
  const existing = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })
  return !existing
}
