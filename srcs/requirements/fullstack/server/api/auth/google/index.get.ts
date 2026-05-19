import {
  getGoogleConfig,
  generateState,
  setStateCookie,
  buildAuthorizationUrl,
} from '../../../utils/google-oauth'

// Google SSO entry point.
//
// Generates a cryptographic state (anti-CSRF), persists it in a
// short-lived HttpOnly cookie scoped to /api/auth/google and redirects
// the user to accounts.google.com. The cookie is validated in
// /callback.
//
// When the OAuth credentials are missing (dev environments without
// GOOGLE_CLIENT_ID), redirect back to the landing page with an error
// flag instead of throwing 503 — that way the browser does not show
// the default Nuxt error screen. /api/config exposes the same status
// so the front end can also hide the button proactively.
export default defineEventHandler(async (event) => {
  const cfg = getGoogleConfig()
  if (!cfg) {
    return await sendRedirect(event, '/?oauth=not_configured', 302)
  }

  const state = generateState()
  setStateCookie(event, state)

  const url = buildAuthorizationUrl(cfg, state)
  return await sendRedirect(event, url, 302)
})
