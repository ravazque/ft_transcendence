import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth'
import { isWithinEditableWindow } from '../../utils/calendar-window'

// DELETE /api/calendar/:id
// Deletes an event. Admin/editor only and only if the event's date
// falls inside the editable window.
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'editor')

  const idRaw = getRouterParam(event, 'id')
  const id = Number(idRaw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })
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

  await prisma.calendarEvent.delete({ where: { id } })
  setResponseStatus(event, 204)
  return null
})
