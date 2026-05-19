// Access to the editorial content managed from Directus.
//
// The `tagged_info` table stores (tag, value) pairs per locale. This
// composable fetches /api/tags once per SSR/CSR pass and exposes:
//
//   const { t, ready, refresh } = useTags()
//   t('HEADER_LOGIN_TXT', 'Login')   → string
//
// If the tag is not in the DB (Directus removed it or it has not
// been seeded yet), it returns the fallback passed as the 2nd
// argument. That way the front end never breaks on missing content.

export function useTags() {
  const items = useState<Record<string, string>>('tags.items', () => ({}))
  const fetched = useState<boolean>('tags.fetched', () => false)
  const loading = useState<boolean>('tags.loading', () => false)

  async function fetchTags(force = false) {
    if (!force && fetched.value) return items.value
    loading.value = true
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie', 'accept-language']) : undefined
      const data = await $fetch<{ locale: string; items: Record<string, string> }>('/api/tags', {
        headers,
      }).catch(() => null)
      items.value = data?.items ?? {}
    } finally {
      fetched.value = true
      loading.value = false
    }
    return items.value
  }

  function t(tag: string, fallback = ''): string {
    const v = items.value[tag]
    return v && v.length > 0 ? v : fallback
  }

  return {
    items,
    ready: computed(() => fetched.value),
    loading: computed(() => loading.value),
    t,
    fetchTags,
    refresh: () => fetchTags(true),
  }
}
