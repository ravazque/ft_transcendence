<template>
  <div class="py-16 px-6 lg:px-28">
    <div class="max-w-4xl mx-auto flex flex-col gap-10">
      <UButton
        label="Volver al módulo"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-left"
        :to="`/module_detail?slug=${moduleSlug}`"
        class="self-start -ml-3"
      />

      <div v-if="pending" class="text-brand-grey-dark">Cargando lección…</div>
      <div v-else-if="error || !data" class="text-red-600">No se ha podido cargar la lección.</div>

      <template v-else>
        <header>
          <p class="text-brand-orange font-semibold mb-2 uppercase tracking-wider text-xs">
            {{ data.module.title }} • Lección {{ data.class.level }}
          </p>
          <h1 class="text-brand-black mb-6">{{ data.class.title }}</h1>
          <p v-if="data.class.description" class="text-brand-grey-dark text-base max-w-[70ch] leading-relaxed">
            {{ data.class.description }}
          </p>
        </header>

        <!-- Player: purchase-gated through /api/classes/:id/embed.
             VimeoPlayer handles both the Vimeo embed and the mp4
             fallback. -->
        <div
          v-if="!data.class.isLocked"
          class="shadow-[1rem_1rem_0_0_var(--color-brand-green)]"
        >
          <VimeoPlayer :class-id="data.class.id" />
        </div>
        <div
          v-else
          class="w-full aspect-video bg-brand-grey-light/30 flex items-center justify-center text-brand-grey-dark p-8 text-center"
        >
          <div>
            <p class="mb-4">Esta lección está bloqueada.</p>
            <UButton
              label="Comprar módulo"
              :loading="checkoutLoading"
              @click="startCheckout"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-4">
          <div class="lg:col-span-2 space-y-8">
            <section v-if="data.class.content">
              <h3 class="text-brand-black mb-4">Sobre esta práctica</h3>
              <p class="whitespace-pre-line">{{ data.class.content }}</p>
            </section>

            <section
              v-if="data.class.keyConcepts"
              class="p-8 bg-brand-white border-none shadow-[0.5rem_0.5rem_0_0_var(--color-brand-mustard)] ring-0"
            >
              <h4 class="text-brand-black mb-4 flex items-center gap-2">
                <UIcon name="i-heroicons-light-bulb" class="text-brand-orange" />
                Conceptos clave
              </h4>
              <p class="text-brand-grey-dark m-0 italic leading-relaxed whitespace-pre-line">
                {{ data.class.keyConcepts }}
              </p>
            </section>
          </div>

          <aside class="space-y-8">
            <div v-if="data.class.resources.length" class="p-6 border border-brand-grey-light">
              <h5 class="uppercase text-xs tracking-widest text-brand-brown mb-4">Recursos</h5>
              <ul class="space-y-3">
                <li v-for="r in data.class.resources" :key="r.id" class="flex gap-3 text-sm items-start">
                  <UIcon :name="resourceIcon(r.type)" class="text-brand-green shrink-0 w-5 h-5 mt-0.5" />
                  <a
                    v-if="r.type === 'external_url' || r.type === 'pdf'"
                    :href="r.contents"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-brand-orange underline"
                  >{{ r.contents }}</a>
                  <span v-else>{{ r.contents }}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <!-- Lesson-to-lesson navigation -->
        <nav class="flex flex-col sm:flex-row justify-between items-center mt-12 pt-10 border-t border-brand-grey-light gap-6">
          <UButton
            label="Lección anterior"
            variant="outline"
            color="neutral"
            icon="i-heroicons-arrow-left"
            :disabled="level <= 1"
            class="w-full sm:w-auto px-8"
            @click="goTo(level - 1)"
          />

          <div class="flex items-center gap-2 order-first sm:order-none">
            <span class="text-xs font-semibold text-brand-grey-dark uppercase tracking-widest">Progreso</span>
            <div class="w-32 h-2 bg-brand-grey-light rounded-full overflow-hidden">
              <div class="h-full bg-brand-green" :style="{ width: `${(level / Math.max(data.totalLessons, 1)) * 100}%` }" />
            </div>
          </div>

          <UButton
            label="Siguiente lección"
            variant="solid"
            color="primary"
            trailing-icon="i-heroicons-arrow-right"
            :disabled="level >= data.totalLessons"
            class="w-full sm:w-auto px-8"
            @click="goTo(level + 1)"
          />
        </nav>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ApiResource {
  id: number
  type: 'external_url' | 'bibliography_entry' | 'aditional_note' | 'pdf'
  contents: string
}
interface ApiClassDetail {
  module: { id: number; slug: string; title: string }
  class: {
    id: number
    level: number
    title: string
    cover: string | null
    description: string | null
    content: string | null
    keyConcepts: string | null
    vimeoVideoId: string | null
    videoUrl: string | null
    resources: ApiResource[]
    isLocked: boolean
  }
  totalLessons: number
}

const route = useRoute()
const router = useRouter()
const progress = useModuleProgress()

const moduleSlug = computed(() => String(route.query.module ?? ''))
const level = computed(() => Math.max(1, Number(route.query.level ?? 1)))

const { data, pending, error } = await useFetch<ApiClassDetail>(
  () => `/api/modules/${encodeURIComponent(moduleSlug.value)}/classes/${level.value}`,
  { credentials: 'include', watch: [moduleSlug, level] },
)

// When a lesson is loaded with access, we pin the module progress to
// the current level. That means completed = [1..level]: navigating
// to lesson N "marks" 1..N as done; going back to lesson 1 lowers
// progress to 1 and unmarks the rest. Explicit UX decision so the
// header bar always reflects "where I am".
watch(
  data,
  (d) => {
    if (!d || d.class.isLocked) return
    progress.setLevel(d.module.slug, d.class.level, d.totalLessons)
  },
  { immediate: true },
)

const checkoutLoading = ref(false)

function resourceIcon(type: ApiResource['type']) {
  switch (type) {
    case 'pdf': return 'i-heroicons-document-text'
    case 'external_url': return 'i-heroicons-link'
    case 'bibliography_entry': return 'i-heroicons-book-open'
    default: return 'i-heroicons-pencil-square'
  }
}

function goTo(next: number) {
  router.push(`/lesson?module=${moduleSlug.value}&level=${next}`)
}

async function startCheckout() {
  checkoutLoading.value = true
  try {
    const res = await $fetch<{ url: string }>('/api/checkout/session', {
      method: 'POST',
      credentials: 'include',
      body: { moduleSlug: moduleSlug.value },
    })
    if (res?.url) window.location.href = res.url
  } catch (err: any) {
    if (err?.statusCode === 401) await navigateTo('/login')
    else console.error('Checkout error', err)
  } finally {
    checkoutLoading.value = false
  }
}
</script>
