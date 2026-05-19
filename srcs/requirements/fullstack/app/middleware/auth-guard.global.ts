// Global route guard.
//
// Only the landing (/) and the privacy & terms page (/privacy) are
// public. Any other page silently bounces anonymous visitors back to
// /. The auth plugin pre-loads the user during SSR, so by the time
// this middleware runs the cached state is ready.

const PUBLIC_ROUTES = new Set<string>(['/', '/privacy'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_ROUTES.has(to.path)) return

  const { user, fetchMe } = useAuth()
  if (user.value === null) await fetchMe()
  if (user.value) return

  return navigateTo('/', { replace: true })
})
