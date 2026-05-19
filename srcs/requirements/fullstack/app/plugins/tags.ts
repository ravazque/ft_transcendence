// Pre-loads the editorial content (tagged_info) on SSR so the first
// render already has every Directus-managed text/URL, with no fallback
// flash on hydration.
export default defineNuxtPlugin(async () => {
  const { fetchTags } = useTags()
  await fetchTags()
})
