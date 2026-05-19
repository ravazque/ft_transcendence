import { readSessionCookie, verifySession } from '../utils/auth'

// Runs on every request. Populates event.context.auth when a valid session
// cookie is present. Authorization itself is enforced by individual handlers
// via requireAuth/requireRole — this middleware never rejects requests.
export default defineEventHandler((event) => {
  const token = readSessionCookie(event)
  if (!token) return
  const payload = verifySession(token)
  if (!payload) return
  event.context.auth = payload
})
