import { getGoogleConfig } from '../utils/google-oauth'

// GET /api/config
//
// Public configuration flags the front end uses to enable/disable
// optional integrations. Does NOT expose any secret — only booleans
// derived from whether the relevant env vars are populated.
//
// The front end checks these to avoid surfacing UI for features that
// would otherwise return a 503 (e.g. the "Continue with Google" button
// when GOOGLE_CLIENT_ID is empty in development).
export default defineEventHandler(() => {
  return {
    googleOAuthEnabled: getGoogleConfig() !== null,
    stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
    vimeoEnabled: Boolean(process.env.VIMEO_ACCESS_TOKEN),
    mailEnabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
  }
})
