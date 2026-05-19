import { prisma } from '../../../utils/prisma'
import { userHasModuleAccess } from '../../../utils/access'
import { fetchVimeoEmbedHtml } from '../../../utils/vimeo'

// GET /api/classes/:id/embed
//
// Serves the Vimeo iframe HTML for a premium class. The class video is
// gated by ownership:
//
//   - Level 1 lessons are public previews — no auth required.
//   - Other levels require an active purchase of the parent module
//     (or the Acceso Total bundle), enforced by userHasModuleAccess.
//
// Returns { embed: '<iframe …>' } on success, or 401/403 when the
// caller has no access. Classes without vimeo_video_id fall back to
// the legacy videoUrl; if neither is set, the endpoint 404s.
export default defineEventHandler(async (event) => {
  const idRaw = getRouterParam(event, 'id')
  const classId = Number(idRaw)
  if (!Number.isInteger(classId) || classId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid class ID' })
  }

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      moduleLevel: true,
      vimeoVideoId: true,
      videoUrl: true,
      module: { select: { id: true, published: true } },
    },
  })

  if (!klass || !klass.module.published) {
    throw createError({ statusCode: 404, statusMessage: 'Class not found' })
  }

  const userId = event.context.auth?.sub ?? null
  const isPreview = klass.moduleLevel === 1
  const hasAccess = isPreview || (await userHasModuleAccess(userId, klass.module.id))

  if (!hasAccess) {
    throw createError({
      statusCode: userId ? 403 : 401,
      statusMessage: userId ? 'Module not purchased' : 'Unauthorized',
    })
  }

  if (klass.vimeoVideoId) {
    const embed = await fetchVimeoEmbedHtml(klass.vimeoVideoId)
    return { source: 'vimeo' as const, embed }
  }

  // Seed/demo data uses example.com placeholders that no media-src
  // policy should allow. Treat them as "no video yet" so the player
  // renders the coming-soon state instead of triggering a CSP block.
  if (klass.videoUrl && !isPlaceholderVideoUrl(klass.videoUrl)) {
    return { source: 'legacy' as const, videoUrl: klass.videoUrl }
  }

  return { source: 'placeholder' as const }
})

function isPlaceholderVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'example.com' || host.endsWith('.example.com')
      || host === 'example.org' || host.endsWith('.example.org')
      || host === 'example.net' || host.endsWith('.example.net')
  } catch {
    return false
  }
}
