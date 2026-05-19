import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'

// GET /api/tags
// Returns the editorial content editable from Directus (the
// `tagged_info` table) already shaped as a { TAG: value } map for the
// resolved locale. The front end consumes it via useTags() and applies
// a fallback on the client when a tag disappears from the DB.
//
// Public endpoint — tags are texts/URLs that are visible on the web.
// Never mix them with secrets (Stripe keys, JWT, etc.); those live
// in environment variables, not in `tagged_info`.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)

  const rows = await prisma.taggedInfo.findMany({
    where: { locale },
    select: { tag: true, value: true },
  })

  const items: Record<string, string> = {}
  for (const r of rows) items[r.tag] = r.value

  return { locale, items }
})
