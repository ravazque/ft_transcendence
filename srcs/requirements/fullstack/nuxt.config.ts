// Nuxt 4 — Fullstack configuration
// SSR enabled for SEO. Server routes handle the backend API.
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  ssr: true,

  devtools: { 
    enabled: true,
    // Disable the devtools floating panel from modifying the body/html padding
    timeline: { enabled: false }
  },

  modules: [
    '@nuxt/ui',
    'nuxt-security',
  ],

  // ── Icons ──
  // Without this, navigating between pages (without reloading) makes
  // the SPA request icons from api.iconify.design — which our CSP
  // blocks — so buttons/links rendered after hydration but not on SSR
  // would show empty gaps.
  //
  // `scan: true` walks the .vue files looking for literal `i-…`
  // references and pre-bundles every match.
  //
  // `icons: [...]` lists the dynamic ones explicitly (indexed icon
  // arrays, computed properties, concatenated strings) — the static
  // scanner cannot see them, so without this list they would be
  // missing and appear as gaps when navigating to the page that
  // needs them.
  icon: {
    // mode: 'svg' renders each icon as an inline <svg> at hydration,
    // without depending on the dynamic CSS Nuxt UI v4 uses by default.
    // With CSS, module masking requires an @import that the
    // nonce-protected CSP blocks when the page arrives via SPA
    // navigation, which used to leave gaps when alternating pages.
    mode: 'svg',
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      sizeLimitKb: 384,
      icons: [
        // home / nav / generic
        'lucide:chevron-down',
        'lucide:chrome',
        'lucide:square-play',
        'lucide:mail',
        'lucide:instagram',
        'lucide:arrow-right',
        'lucide:download',
        // pricing / bundle features
        'lucide:infinity',
        'lucide:life-buoy',
        'lucide:award',
        'lucide:play-circle',
        'lucide:file-text',
        'lucide:clock',
        // FAQs (rotation)
        'lucide:circle-help',
        'lucide:video',
        'lucide:sparkles',
        'lucide:credit-card',
        'lucide:shield-check',
        // milestones (rotation)
        'lucide:globe',
        'lucide:home',
        'lucide:monitor',
        // heroicons utilities
        'heroicons:user',
        'heroicons:academic-cap',
      ],
    },
  },

  // ── Security headers ──
  // CSP with automatic nonces — nuxt-security injects a unique nonce per request
  // into every <script> and <style> tag that Nuxt generates.
  // Other security headers (HSTS, X-Frame-Options, etc.) are managed by nginx —
  // disabled here to avoid duplicates reaching the browser.
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{{nonce}}'"],
        // CSP Level 3 explicit rule: if the directive contains a
        // 'nonce-...' or a hash, the browser IGNORES 'unsafe-inline'
        // (spec decision to force the safer option). Vue and Nuxt UI
        // inject nonceless inline styles for transitions, dynamic
        // shadows and reactive `style="..."`, so we need
        // 'unsafe-inline' as-is — without a nonce that would
        // cancel it. The nonce still protects script-src, which is
        // where injection risk matters.
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        // Vimeo embeds van por <iframe> contra player.vimeo.com.
        'frame-src': ["'self'", 'https://player.vimeo.com'],
        // Media local + blob (descargas en memoria) + Vimeo CDN.
        'media-src': ["'self'", 'blob:', 'data:', 'https://*.vimeocdn.com'],
        'connect-src': ["'self'", 'wss:', 'https://player.vimeo.com'],
        'frame-ancestors': ["'none'"],
      },
      xFrameOptions: false,
      xContentTypeOptions: false,
      referrerPolicy: false,
      strictTransportSecurity: false,
      permissionsPolicy: false,
    },
  },

  css: ['~/assets/css/main.css'],

  app: {
    // Global page fade. NO `mode: 'out-in'` on purpose: combined with
    // pages that use top-level `await useFetch` (profile, modules,
    // module_detail, lesson, index), out-in deadlocks the Suspense
    // that wraps each page — the <Transition> blocks the enter
    // waiting for the leave to finish, while the new page is
    // suspended on the await. Without out-in the two pages briefly
    // overlap during the fade, which is what we want visually. The
    // .page-* classes live in assets/css/main.css and respect
    // prefers-reduced-motion.
    pageTransition: { name: 'page' },
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/icon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto+Serif:ital,opsz,wght@0,8..144,100..900;1,8..144,100..900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap' }
      ]
    }
  },

  // ── Color mode ──
  // The design is always light (cream background, dark text). We force
  // preference + fallback to 'light' to prevent Nuxt UI from inverting
  // colours when the OS prefers dark, and to keep SSR and client
  // consistent from the first render.
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: '',
    storageKey: 'yoga-color-mode',
  },

  runtimeConfig: {
    // ── Database ──
    databaseUrl: process.env.DATABASE_URL || '',

    // ── Auth ──
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',

    // ── Redis ──
    redis: {
      host: process.env.REDIS_HOST || 'redis',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '',
    },

    // ── Directus CMS ──
    directus: {
      url: process.env.DIRECTUS_URL || 'http://directus:8055',
      key: process.env.DIRECTUS_KEY || '',
      secret: process.env.DIRECTUS_SECRET || '',
    },

    // ── Stripe ──
    // Server-side Stripe credentials. secretKey signs API calls; webhookSecret
    // verifies incoming events. Both stay on the server.
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },

    // ── Google OAuth ──
    // Credenciales del cliente OAuth 2.0 emitido por Google Cloud
    // Console. redirectUri debe coincidir EXACTAMENTE con la URI
    // autorizada en la consola (incluido el puerto y el protocolo).
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    },

    // ── SMTP / Mailing ──
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
      from: process.env.SMTP_FROM || '',
    },

    public: {
      apiBase: '/api',
      siteUrl: process.env.SITE_URL || 'https://localhost:8443',
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
    },
  },

  typescript: {
    strict: true,
  },

  // ── CORS ──
  // Restrict /api to the app's own origin. Same-origin SSR fetches and
  // browser-side calls from the Nuxt frontend pass through; any cross-origin
  // caller is rejected by the browser. Credentials enabled for cookie auth.
  nitro: {
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': process.env.SITE_URL || 'https://localhost',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '600',
          'Vary': 'Origin',
        },
      },
    },
  },
})
