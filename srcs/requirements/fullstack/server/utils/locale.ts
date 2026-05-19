import type { H3Event } from 'h3'

// Supported locales — aligned with the Locale enum in the Prisma
// schema. English is the default (international audience); Spanish
// and French are the manual translations maintained by the admin
// from Directus.
const SUPPORTED = ['en_en', 'es_es', 'fr_fr'] as const
export type AppLocale = (typeof SUPPORTED)[number]
export const DEFAULT_LOCALE: AppLocale = 'en_en'

function normalize(value: string | undefined | null): AppLocale | null {
  if (!value) return null
  const v = value.trim().toLowerCase().replace('-', '_')
  if ((SUPPORTED as readonly string[]).includes(v)) return v as AppLocale
  // Accept bare language codes from the Accept-Language header.
  if (v.startsWith('en')) return 'en_en'
  if (v.startsWith('es')) return 'es_es'
  if (v.startsWith('fr')) return 'fr_fr'
  return null
}

// Locale resolution order:
// 1. Query string ?locale=
// 2. Cookie 'yoga_locale' (set by the EN|ES header button)
// 3. The browser's Accept-Language header
// 4. Default en_en
export function resolveLocale(event: H3Event): AppLocale {
  const q = getQuery(event)
  const fromQuery = normalize(typeof q.locale === 'string' ? q.locale : null)
  if (fromQuery) return fromQuery

  const fromCookie = normalize(getCookie(event, 'yoga_locale'))
  if (fromCookie) return fromCookie

  const accept = getRequestHeader(event, 'accept-language')
  if (accept) {
    for (const part of accept.split(',')) {
      const tag = part.split(';')[0]?.trim()
      const n = normalize(tag)
      if (n) return n
    }
  }

  return DEFAULT_LOCALE
}
