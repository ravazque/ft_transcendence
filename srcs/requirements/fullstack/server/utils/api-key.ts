import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'

// Public API gate.
//
// Reads the X-API-Key header and compares it in constant time against
// the API_KEY environment variable. Returns:
//   - 503 when the server has no API_KEY configured (the public API
//     is opt-in and operators must explicitly enable it),
//   - 401 when the header is missing or does not match.
//
// Used by every /api/v1/* write endpoint. Reads remain open but are
// rate-limited per IP.

export function requireApiKey(event: H3Event): void {
  const expected = process.env.API_KEY
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Public API is disabled: API_KEY not configured on the server',
    })
  }

  const provided = getRequestHeader(event, 'x-api-key') ?? ''

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or missing API key' })
  }
}
