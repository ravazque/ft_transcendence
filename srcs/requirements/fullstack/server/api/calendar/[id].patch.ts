import { z } from 'zod'
import { CalendarEventKind } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth'
import { isWithinEditableWindow } from '../../utils/calendar-window'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  title: z.string().trim().min(1).max(255).optional(),
  kind: z.nativeEnum(CalendarEventKind).optional(),
  location: z.string().trim().max(255).nullable().optional(),
})

// PATCH /api/calendar/:id
// Updates an event. Admin/editor only. The event's current date and
// the new date (if it changes) must both be inside the editable
// window.
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'editor')

  const idRaw = getRouterParam(event, 'id')
  const id = Number(idRaw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })
  }

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0]?.message || 'Datos no válidos.',
    })
  }

  const existing = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado.' })
  }

  if (!isWithinEditableWindow(existing.date)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Este evento ya no está en la ventana editable.',
    })
  }

  const nextDate = parsed.data.date ? new Date(parsed.data.date) : existing.date
  if (parsed.data.date && !isWithinEditableWindow(nextDate)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Solo puedes mover eventos a la semana actual o la siguiente.',
    })
  }

  const nextStart = parsed.data.startTime ?? existing.startTime
  const nextEnd = parsed.data.endTime ?? existing.endTime
  if (nextStart >= nextEnd) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La hora de fin debe ser posterior a la de inicio.',
    })
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      date: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      title: parsed.data.title ?? existing.title,
      kind: parsed.data.kind ?? existing.kind,
      location: parsed.data.location !== undefined ? parsed.data.location : existing.location,
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
  return { item: updated }
})
