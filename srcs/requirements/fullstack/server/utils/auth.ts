import argon2 from 'argon2'
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { H3Event } from 'h3'
import type { UserRole } from '@prisma/client'

// ── Password hashing ──
// argon2id with parameters tuned for interactive logins on commodity hardware.
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export const hashPassword = (plain: string) => argon2.hash(plain, HASH_OPTIONS)
export const verifyPassword = (hash: string, plain: string) => argon2.verify(hash, plain)

// ── JWT ──
export interface SessionPayload {
  sub: string
  email: string
  role: UserRole
}

function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return s
}

const signOptions = (): SignOptions => ({
  expiresIn: (process.env.JWT_EXPIRATION || '24h') as SignOptions['expiresIn'],
  algorithm: 'HS256',
})

export const signSession = (payload: SessionPayload) =>
  jwt.sign(payload, getSecret(), signOptions())

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] })
    if (typeof decoded === 'string') return null
    const { sub, email, role } = decoded as jwt.JwtPayload & Partial<SessionPayload>
    if (!sub || !email || !role) return null
    return { sub, email, role }
  } catch {
    return null
  }
}

// ── Session cookie ──
//
// SameSite=Lax: required for OAuth flows (Google) where the browser
// returns from accounts.google.com to the app's callback. With Strict,
// the session cookie was not sent on the navigation right after the
// redirect, leaving the user "unauthenticated" just after a social
// sign-in. Lax keeps CSRF protection on POSTs (the sensitive methods)
// while allowing the top-level redirect flow we use for OAuth.
export const SESSION_COOKIE = 'yoga_session'
export const SESSION_MAX_AGE_SEC = 24 * 60 * 60

const cookieBase = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_MAX_AGE_SEC })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, cookieBase)
}

export function readSessionCookie(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE)
}

// ── Request-scoped auth context ──
declare module 'h3' {
  interface H3EventContext {
    auth?: SessionPayload
  }
}

export function requireAuth(event: H3Event): SessionPayload {
  const auth = event.context.auth
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return auth
}

export function requireRole(event: H3Event, ...allowed: UserRole[]): SessionPayload {
  const auth = requireAuth(event)
  if (!allowed.includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return auth
}
