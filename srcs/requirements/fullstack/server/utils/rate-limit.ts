import type { H3Event } from 'h3'
import { redis } from './redis'

interface RateLimitConfig {
  // Bucket name — combined with the client IP to form the Redis key.
  key: string
  // Max requests allowed inside the window.
  limit: number
  // Window length in seconds.
  windowSec: number
}

export async function rateLimit(event: H3Event, cfg: RateLimitConfig) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const redisKey = `ratelimit:${cfg.key}:${ip}`

  const count = await redis.incr(redisKey)
  if (count === 1) {
    await redis.expire(redisKey, cfg.windowSec)
  }

  if (count > cfg.limit) {
    const ttl = await redis.ttl(redisKey)
    const retryAfter = ttl > 0 ? ttl : cfg.windowSec
    setHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      statusMessage: friendlyRetryMessage(retryAfter),
      data: { retryAfter },
    })
  }
}

function friendlyRetryMessage(retryAfter: number): string {
  if (retryAfter <= 60) {
    return `Demasiados intentos. Vuelve a probar en ${retryAfter} segundos.`
  }
  const minutes = Math.ceil(retryAfter / 60)
  return `Demasiados intentos. Vuelve a probar en ${minutes} minuto${minutes === 1 ? '' : 's'}.`
}
