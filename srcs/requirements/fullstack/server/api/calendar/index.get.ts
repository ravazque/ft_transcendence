import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Calendar events for the requested range (inclusive). The front end
// passes the Monday and Sunday of the week being viewed. If no range
// is provided, returns the whole table (useful for Directus).
//
// Editable from Directus (collection `calendar_events`) and from the
// admin POST/PATCH/DELETE endpoints of this same resource.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Rango de fechas inválido.' })
  }

  const where: { locale: typeof locale; date?: { gte?: Date; lte?: Date } } = { locale }
  if (parsed.data.from || parsed.data.to) {
    where.date = {}
    if (parsed.data.from) where.date.gte = new Date(parsed.data.from)
    if (parsed.data.to) where.date.lte = new Date(parsed.data.to)
  }

  const items = await prisma.calendarEvent.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      title: true,
      kind: true,
      location: true,
    },
  })
  return { items }
})
