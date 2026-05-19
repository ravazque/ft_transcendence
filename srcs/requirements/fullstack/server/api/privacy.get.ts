import { prisma } from '../utils/prisma'
import { resolveLocale } from '../utils/locale'

// GET /api/privacy
// Returns the privacy & terms blocks for the resolved locale, ordered
// by `position`. Public endpoint — the content is editable by the
// admin from Directus and shown on /privacy.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)

  const rows = await prisma.privacySection.findMany({
    where: { locale },
    orderBy: { position: 'asc' },
    select: { position: true, title: true, body: true },
  })

  return { locale, items: rows }
})
