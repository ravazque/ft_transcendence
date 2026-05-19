import { redis } from './redis'

// Vimeo embed proxy helper.
//
// Fetches the OEmbed-compatible iframe HTML for a private Vimeo video
// using the VIMEO_ACCESS_TOKEN. The token never leaves the backend.
// The resulting HTML does not depend on the requesting user, only on
// the video — so we cache per videoId in Redis for one hour.
//
// Callers are responsible for authorising the user before invoking
// this helper. The class-level endpoint enforces userHasModuleAccess
// before requesting the embed; the editorial endpoint exposes it
// without auth for curated videos referenced from tagged_info.

const CACHE_PREFIX = 'vimeo:embed:'
const CACHE_TTL_SEC = 60 * 60

export async function fetchVimeoEmbedHtml(videoId: string): Promise<string> {
  if (!/^\d+$/.test(videoId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid video ID' })
  }

  const cached = await redis.get(CACHE_PREFIX + videoId)
  if (cached) return cached

  const token = process.env.VIMEO_ACCESS_TOKEN
  if (!token) {
    throw createError({ statusCode: 503, statusMessage: 'Vimeo token not configured' })
  }

  const res = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
  })

  if (!res.ok) {
    throw createError({
      statusCode: res.status,
      statusMessage: res.status === 404 ? 'Video not found' : 'Vimeo API error',
    })
  }

  const data = (await res.json()) as { embed?: { html?: string } }
  const html = data.embed?.html
  if (!html) {
    throw createError({ statusCode: 400, statusMessage: 'Video does not support embedding' })
  }

  await redis.set(CACHE_PREFIX + videoId, html, 'EX', CACHE_TTL_SEC)
  return html
}
