// Nuxt 4 — Fullstack configuration
// SSR enabled for SEO. Server routes handle the backend API.
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  ssr: true,

  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    redisHost: process.env.REDIS_HOST || 'redis',
    redisPort: Number(process.env.REDIS_PORT) || 6379,
    directusUrl: process.env.DIRECTUS_URL || 'http://directus:8055',

    public: {
      apiBase: '/api',
    },
  },

  typescript: {
    strict: true,
  },

  nitro: {
    routeRules: {
      '/api/**': { cors: true },
    },
  },
})
