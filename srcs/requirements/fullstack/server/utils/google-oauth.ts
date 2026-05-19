import type { H3Event } from 'h3'
import crypto from 'node:crypto'

// ── Google OAuth 2.0 ──
//
// We implement the classic Authorization Code (redirect) flow instead
// of Google Identity Services / FedCM. Reason: GIS depends on third-
// party cookies and FedCM, mechanisms Brave blocks aggressively and
// Firefox only supports experimentally. The top-level redirect flow
// works on every modern browser without depending on cross-site
// cookies.

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

const STATE_COOKIE = 'yoga_oauth_state'
const STATE_MAX_AGE_SEC = 10 * 60

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getGoogleConfig(): GoogleConfig | null {
  const cfg = useRuntimeConfig()
  const clientId = cfg.google?.clientId || ''
  const clientSecret = cfg.google?.clientSecret || ''
  const redirectUri = cfg.google?.redirectUri || ''
  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function buildAuthorizationUrl(cfg: GoogleConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // prompt=select_account forces the account picker on every
    // attempt, preventing a user signed into multiple Google accounts
    // from accidentally entering with the wrong one.
    prompt: 'select_account',
    access_type: 'online',
    include_granted_scopes: 'true',
  })
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`
}

export function setStateCookie(event: H3Event, state: string) {
  setCookie(event, STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: STATE_MAX_AGE_SEC,
  })
}

export function readStateCookie(event: H3Event): string | undefined {
  return getCookie(event, STATE_COOKIE)
}

export function clearStateCookie(event: H3Event) {
  deleteCookie(event, STATE_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth/google',
  })
}

export function generateState(): string {
  return crypto.randomBytes(24).toString('hex')
}

export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: 'Bearer'
  id_token?: string
}

export async function exchangeCodeForTokens(
  cfg: GoogleConfig,
  code: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
  })
  return await $fetch<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
}

export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  locale?: string
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  return await $fetch<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
