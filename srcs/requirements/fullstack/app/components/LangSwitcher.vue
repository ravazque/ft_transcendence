<script setup lang="ts">
// Header language switcher. Collapsed it shows just the active locale
// label; expanded it lists EN → ES → FR in a fixed order with the
// active one highlighted. Picking a locale POSTs /api/locale to set
// the cookie (and persist `users.preferred_locale` if signed in) and
// reloads the page (locale is resolved server-side for every route).

type SupportedLocale = 'en_en' | 'es_es' | 'fr_fr'

interface LocaleMeta { code: SupportedLocale; label: string }
const ALL: LocaleMeta[] = [
  { code: 'en_en', label: 'EN' },
  { code: 'es_es', label: 'ES' },
  { code: 'fr_fr', label: 'FR' },
]

// useCookie() is SSR-safe: on the server it reads the cookie from the
// request headers, on the client it reads document.cookie. Using it as
// the seed for `current` avoids the EN flash that happened when the
// initial state defaulted to 'en_en' on SSR and was only corrected
// after onMounted re-read the cookie client-side.
const localeCookie = useCookie<string | null>('yoga_locale', {
  default: () => null,
  sameSite: 'lax',
  path: '/',
})

function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (value === 'en_en' || value === 'es_es' || value === 'fr_fr') return value
  return null
}

const current = useState<SupportedLocale>(
  'app.locale',
  () => normalizeLocale(localeCookie.value) ?? 'en_en',
)
const switching = ref<SupportedLocale | null>(null)
const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const fromCookie = normalizeLocale(localeCookie.value)
  if (fromCookie && fromCookie !== current.value) current.value = fromCookie
  document.addEventListener('click', handleOutsideClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(event: MouseEvent) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false
  }
}

const currentLabel = computed(() => ALL.find((l) => l.code === current.value)?.label ?? 'EN')

async function setLocale(target: SupportedLocale) {
  if (switching.value) return
  // Close the dropdown immediately — the "loading" feedback lives on
  // the disabled button itself, not on the open menu.
  open.value = false
  // If the user clicks the locale that is already active (can happen
  // after a partial hydration where `current` did not match the real
  // cookie), we do not bail early: we re-fire the navigation. That
  // way any weird state gets unblocked.
  if (current.value === target) {
    if (import.meta.client) window.location.reload()
    return
  }
  switching.value = target
  // Failsafe: if the back end takes too long or the reload does not
  // fire, release the state after 8s so the user can interact again.
  // Normally the reload will have triggered well before this.
  const failsafe = setTimeout(() => { switching.value = null }, 8000)
  try {
    await $fetch('/api/locale', {
      method: 'POST',
      credentials: 'include',
      body: { locale: target },
    })
    current.value = target
    // reload() always re-runs, even when the URL is the same;
    // location.assign(same_url) is a no-op on some browsers and
    // would leave the component stuck.
    if (import.meta.client) window.location.reload()
  } catch {
    clearTimeout(failsafe)
    switching.value = null
  }
}
</script>

<template>
  <div ref="rootEl" class="relative inline-flex select-none">
    <button
      type="button"
      class="flex items-center gap-1 px-2 py-1 text-xs font-bold tracking-widest text-brand-white hover:bg-brand-white/20 transition-colors uppercase"
      :aria-expanded="open"
      :aria-haspopup="true"
      @click="open = !open"
    >
      <span>{{ currentLabel }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="w-3 h-3 transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute right-0 top-full mt-1 min-w-[3.5rem] bg-brand-white shadow-[0.25rem_0.25rem_0_0_var(--color-brand-green)] z-50"
        role="menu"
      >
        <button
          v-for="loc in ALL"
          :key="loc.code"
          type="button"
          role="menuitem"
          :aria-current="loc.code === current ? 'true' : undefined"
          class="block w-full px-3 py-2 text-xs font-bold tracking-widest transition-colors uppercase text-center disabled:opacity-60"
          :class="loc.code === current
            ? 'bg-brand-orange text-brand-white cursor-default'
            : 'text-brand-black hover:bg-brand-cream'"
          :disabled="switching !== null || loc.code === current"
          @click="setLocale(loc.code)"
        >
          {{ loc.label }}
        </button>
      </div>
    </transition>
  </div>
</template>
