import { prisma } from '../../../utils/prisma'
import { rateLimit } from '../../../utils/rate-limit'

// GET /api/v1/modules/:id
//
// Returns one module and its ordered class list. The :id is the
// numeric Prisma id; the locale comes from the module row itself so
// callers receive consistent content even when crossing locales.
export default defineEventHandler(async (event) => {
  await rateLimit(event, { key: 'v1:modules:detail', limit: 60, windowSec: 60 })

  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid module id' })
  }

  const mod = await prisma.module.findUnique({
    where: { id },
    select: {
      id: true,
      locale: true,
      slug: true,
      title: true,
      cover: true,
      shortDescription: true,
      fullDescription: true,
      price: true,
      isFullCourse: true,
      keyConcepts: true,
      classes: {
        orderBy: { moduleLevel: 'asc' },
        select: {
          id: true,
          moduleLevel: true,
          title: true,
          shortDescription: true,
          cover: true,
        },
      },
    },
  })

  if (!mod) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  return mod
})
