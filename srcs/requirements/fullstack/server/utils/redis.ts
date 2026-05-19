import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis?: Redis }

function createRedis() {
  return new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  })
}

export const redis = globalForRedis.redis ?? createRedis()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
