import { z } from 'zod'
import { CalendarEventKind } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth'
import { resolveLocale } from '../../utils/locale'
import { isWithinEditableWindow } from '../../utils/calendar-window'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato YYYY-MM-DD requerida.'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora de inicio HH:MM requerida.'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora de fin HH:MM requerida.'),
  title: z.string().trim().min(1, 'Falta el título.').max(255),
  kind: z.nativeEnum(CalendarEventKind),
  location: z.string().trim().max(255).nullable().optional(),
})

// POST /api/calendar
// Creates an event in the request's locale. Admin/editor only; the
// event must fall inside the editable window (this week or the next).
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'editor')

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0]?.message || 'Datos no válidos.',
    })
  }

  if (parsed.data.startTime >= parsed.data.endTime) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La hora de fin debe ser posterior a la de inicio.',
    })
  }

  const date = new Date(parsed.data.date)
  if (!isWithinEditableWindow(date)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Solo puedes editar la semana actual o la siguiente.',
    })
  }

  const locale = resolveLocale(event)
  const created = await prisma.calendarEvent.create({
    data: {
      locale,
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      title: parsed.data.title,
      kind: parsed.data.kind,
      location: parsed.data.location ?? null,
    },
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
  setResponseStatus(event, 201)
  return { item: created }
})
