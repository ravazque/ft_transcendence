import { fetchVimeoEmbedHtml } from '../../../utils/vimeo'

// GET /api/videos/:id/embed
//
// Editorial Vimeo proxy. Returns the iframe HTML for a Vimeo video so
// the VIMEO_ACCESS_TOKEN stays on the server. Used for curated, public
// videos referenced from tagged_info (e.g. HOME_HERO_VIDEO_ID), not
// for premium class playback.
//
// Premium class playback goes through /api/classes/:classId/embed,
// which enforces userHasModuleAccess before delegating to the same
// underlying helper.
export default defineEventHandler(async (event) => {
  const videoId = getRouterParam(event, 'id')
  if (!videoId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing video ID' })
  }
  const embed = await fetchVimeoEmbedHtml(videoId)
  return { embed }
})
