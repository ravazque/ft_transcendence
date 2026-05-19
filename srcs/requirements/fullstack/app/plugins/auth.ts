// Loads the authenticated user during SSR so the layout and pages
// get the right state on first render (avoids the anonymous → signed
// in UI flash on hydration).
export default defineNuxtPlugin(async () => {
  const { fetchMe } = useAuth()
  await fetchMe()
})
