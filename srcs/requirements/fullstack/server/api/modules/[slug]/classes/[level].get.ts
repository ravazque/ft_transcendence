import { prisma } from '../../../../utils/prisma'
import { resolveLocale } from '../../../../utils/locale'
import { userHasModuleAccess } from '../../../../utils/access'

// GET /api/modules/:slug/classes/:level
// Class detail. videoUrl and resources are only returned when the user
// has access to the module (direct purchase, bundle, or ADMIN/EDITOR
// role). The level-1 class is a public preview.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const levelRaw = getRouterParam(event, 'level')
  const level = Number(levelRaw)

  if (!slug || !Number.isInteger(level) || level < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid parameters' })
  }

  const locale = resolveLocale(event)
  const userId = event.context.auth?.sub ?? null

  const module = await prisma.module.findUnique({
    where: { locale_slug: { locale, slug } },
    select: { id: true, title: true, published: true },
  })

  if (!module || !module.published) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  const klass = await prisma.class.findUnique({
    where: { moduleId_moduleLevel_locale: { moduleId: module.id, moduleLevel: level, locale } },
    select: {
      id: true,
      moduleLevel: true,
      title: true,
      cover: true,
      shortDescription: true,
      fullDescription: true,
      keyConcepts: true,
      videoUrl: true,
      vimeoVideoId: true,
      resources: {
        select: {
          resource: { select: { id: true, type: true, contents: true } },
        },
      },
    },
  })

  if (!klass) {
    throw createError({ statusCode: 404, statusMessage: 'Class not found' })
  }

  const hasAccess = level === 1 ? true : await userHasModuleAccess(userId, module.id)

  const total = await prisma.class.count({ where: { moduleId: module.id, locale } })

  // Video sources: when the user has access we expose enough info for
  // the frontend to render the player. vimeoVideoId is preferred and
  // is rendered through /api/classes/:id/embed (which keeps the
  // VIMEO_ACCESS_TOKEN server-side). videoUrl is the legacy fallback.
  return {
    locale,
    module: { id: module.id, slug, title: module.title },
    class: {
      id: klass.id,
      level: klass.moduleLevel,
      title: klass.title,
      cover: klass.cover,
      description: klass.shortDescription,
      content: klass.fullDescription,
      keyConcepts: klass.keyConcepts,
      vimeoVideoId: hasAccess ? klass.vimeoVideoId : null,
      videoUrl: hasAccess ? klass.videoUrl : null,
      resources: hasAccess ? klass.resources.map((r) => r.resource) : [],
      isLocked: !hasAccess,
    },
    totalLessons: total,
  }
})
