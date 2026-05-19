<template>
  <div class="py-20 px-6 flex flex-col gap-12 items-center max-w-5xl w-[70%] mx-auto">
    <h2 class="text-5xl font-serif text-brand-black text-center lg:text-left">
      {{ t('FOOTER_PRIVACY_TITLE', 'Privacidad y Términos') }}
    </h2>
    <ClientOnly>
      <UAccordion
        v-if="privacyItems.length > 0"
        variant="ghost"
        size="lg"
        :items="privacyItems"
      />
      <p v-else class="text-brand-grey-dark text-center">
        {{ t('PRIVACY_EMPTY_TXT', 'No hay contenido disponible todavía.') }}
      </p>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
interface PrivacyItem {
  position: number
  title: string
  body: string
}

const { t } = useTags()

// SSR + CSR fetch. The endpoint resolves the locale server-side from
// the cookie, so the language switcher reload picks up the change
// automatically: switching to ES on /privacy re-runs this fetch in the
// new locale and renders the Spanish blocks.
const { data } = await useFetch<{ locale: string; items: PrivacyItem[] }>(
  '/api/privacy',
  { key: 'privacy.sections', default: () => ({ locale: 'en_en', items: [] }) },
)

const privacyItems = computed(() =>
  (data.value?.items ?? []).map((it, idx) => ({
    label: it.title,
    content: it.body,
    defaultOpen: idx === 0,
  })),
)
</script>
