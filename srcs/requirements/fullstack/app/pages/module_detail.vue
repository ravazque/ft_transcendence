<template>
  <div class="py-16 px-6">
    <div class="max-w-4xl mx-auto flex flex-col gap-12 items-center">

      <UButton
        :label="backTarget.label"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-left"
        class="self-start -ml-3"
        @click="onBack"
      />

      <h2 class="text-5xl text-center font-serif text-brand-black mb-2">
        {{ data?.module.title || t('MODULE_DETAIL_LOADING_TXT', 'Loading…') }}
      </h2>

      <div v-if="error" class="text-red-600">{{ t('MODULE_DETAIL_ERROR_TXT', 'Could not load the module.') }}</div>

      <!-- Full Access: behaves as the index of the programme, not as
           a module with its own classes. We list every module in the
           catalogue so the user can jump to any of them. -->
      <template v-if="data?.module.isFullCourse">
        <p class="text-brand-grey-dark max-w-2xl text-center -mt-6">
          {{ data.module.description ?? t('BUNDLE_INDEX_INTRO', 'Pick the module you want to start. All of them are unlocked with your Full Access.') }}
        </p>
        <div v-if="bundleModulesPending" class="text-brand-grey-dark">{{ t('PROFILE_LOADING', 'Loading…') }}</div>
        <div v-else-if="!bundleProgramModules.length" class="text-brand-grey-dark text-center">
          {{ t('BUNDLE_INDEX_EMPTY', 'No modules available yet. Come back soon.') }}
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full mt-4">
          <UPageCard
            v-for="m in bundleProgramModules"
            :key="m.id"
            :title="m.title"
            :description="m.description ?? ''"
            class="hover:scale-[1.02] transition-transform cursor-pointer"
            :ui="{ root: 'shadow-[0.35rem_0.35rem_0_0_var(--color-brand-teal)] bg-brand-white' }"
            @click="navigateTo(`/module_detail?slug=${m.slug}`)"
          >
            <template #default>
              <img
                :src="m.cover || '/sample.jpg'"
                class="w-full aspect-video object-cover"
                :alt="m.title"
              />
            </template>
          </UPageCard>
        </div>
      </template>

      <!-- Regular module: diamond progress bar + info panels for the
           "active" lesson and the "last completed" one. The bar is
           sequential: marking N also marks 1..N-1, unmarking N also
           unmarks N+1..total. Clicking a diamond → toggleLevel. -->
      <template v-else>
        <div
          v-if="lessons.length"
          class="w-full max-w-3xl mx-auto mb-2 px-4 hidden sm:block"
        >
          <div class="relative flex items-center justify-between">
            <!-- Base line + colored line up to the last completed step -->
            <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-grey-light"></div>
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-orange transition-all"
              :style="{ width: progressLineWidth }"
            ></div>
            <button
              v-for="lesson in lessons"
              :key="lesson.id"
              type="button"
              class="diamond-step group relative z-10"
              :class="stepClass(lesson)"
              :disabled="lesson.isLocked && !data?.module.hasAccess"
              :aria-label="lesson.title"
              @click="onStepClick(lesson)"
              @mouseenter="hoveredLevel = lesson.level"
              @mouseleave="hoveredLevel = null"
            >
              <span class="diamond-step-inner"></span>
            </button>
          </div>
        </div>

        <!-- Info for the hovered lesson + the last completed one.
             Full border (4 sides) + brutalist shadow. When the focus
             lesson changes, the content slides in from the side so
             the transition does not feel abrupt. -->
        <div
          class="hidden sm:grid w-full max-w-3xl mx-auto px-4 grid-cols-1 md:grid-cols-2 gap-3 min-h-[6rem]"
        >
          <!-- Left panel: the active lesson or the one being hovered -->
          <div
            v-if="focusLesson"
            class="info-card border-2 border-brand-orange bg-brand-white shadow-[0.35rem_0.35rem_0_0_var(--color-brand-orange)] overflow-hidden"
          >
            <transition :name="focusTransitionName" mode="out-in">
              <div :key="focusLesson.level" class="px-4 py-3">
                <p class="text-[0.65rem] uppercase tracking-widest font-bold text-brand-orange mb-1">
                  {{ focusBadge }}
                </p>
                <p class="text-sm font-semibold text-brand-black leading-snug">
                  {{ focusLesson.level }}. {{ focusLesson.title }}
                </p>
                <p v-if="focusLesson.description" class="text-xs text-brand-grey-dark mt-1 leading-relaxed">
                  {{ focusLesson.description }}
                </p>
              </div>
            </transition>
          </div>
          <!-- Right panel: last completed lesson (when different from
               the active one). The whole panel slides in from above
               with a fade — nicer than just popping in. -->
          <transition name="panel-drop">
            <div
              v-if="lastCompletedLesson && lastCompletedLesson.level !== focusLesson?.level"
              class="info-card border-2 border-brand-green bg-brand-white shadow-[0.35rem_0.35rem_0_0_var(--color-brand-green)] overflow-hidden"
            >
              <transition name="info-fade" mode="out-in">
                <div :key="lastCompletedLesson.level" class="px-4 py-3">
                  <p class="text-[0.65rem] uppercase tracking-widest font-bold text-brand-green mb-1">
                    {{ t('MODULE_DETAIL_LAST_COMPLETED_BADGE', 'Last completed') }}
                  </p>
                  <p class="text-sm font-semibold text-brand-black leading-snug">
                    {{ lastCompletedLesson.level }}. {{ lastCompletedLesson.title }}
                  </p>
                  <p v-if="lastCompletedLesson.description" class="text-xs text-brand-grey-dark mt-1 leading-relaxed">
                    {{ lastCompletedLesson.description }}
                  </p>
                </div>
              </transition>
            </div>
          </transition>
        </div>

        <div class="flex flex-col gap-12 w-full mt-10">
          <UPageCTA
            v-for="(lesson, index) in lessons"
            :key="lesson.id"
            :title="`${lesson.level}. ${lesson.title}`"
            :description="lesson.description ?? ''"
            orientation="horizontal"
            :ui="{
              wrapper: (index % 2 !== 0) ? 'lg:order-last' : '',
              container: lesson.isLocked ? '' : 'cursor-pointer'
            }"
            :variant="!lesson.isLocked ? 'completed' : 'outline'"
            class="transition-colors overflow-hidden h-full"
            @click="onLessonClick(lesson)"
          >
            <img
              :src="lesson.cover || '/sample.jpg'"
              class="w-full h-full object-cover min-h-75"
              alt=""
            />
            <template v-if="lesson.isLocked" #footer>
              <div class="flex gap-2 items-center text-brand-grey-dark text-sm">
                <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
                {{ t('LESSON_LOCKED_TXT', 'Locked — buy the module to access it') }}
              </div>
            </template>
          </UPageCTA>
        </div>

        <div v-if="data && !data.module.hasAccess" class="w-full mt-8 p-8 bg-brand-yellow text-center">
          <p class="text-brand-black text-base mb-4">
            {{ t('MODULE_DETAIL_UNLOCK_PREFIX', 'Unlock every lesson of this module for') }} {{ data.module.priceLabel }}.
          </p>
          <UButton
            :label="t('MODULE_DETAIL_BUY_BUTTON_TXT', 'Buy module')"
            :loading="checkoutLoading"
            @click="startCheckout"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ApiClass {
  id: number
  level: number
  title: string
  cover: string | null
  description: string | null
  isLocked: boolean
}
interface ApiModule {
  id: number
  slug: string
  title: string
  cover: string | null
  description: string | null
  longDescription: string | null
  keyConcepts: string | null
  isFullCourse: boolean
  priceCents: number
  priceLabel: string
  hasAccess: boolean
}

interface CatalogItem {
  id: number
  slug: string
  title: string
  cover: string | null
  description: string | null
  isFullCourse: boolean
}

const route = useRoute()
const router = useRouter()
const { t } = useTags()
const { isAuthenticated, openLoginModal } = useAuth()
const progress = useModuleProgress()

const moduleSlug = computed(() => String(route.query.slug ?? ''))

const { data, error } = await useFetch<{ module: ApiModule; classes: ApiClass[] }>(
  () => `/api/modules/${encodeURIComponent(moduleSlug.value)}`,
  { credentials: 'include', watch: [moduleSlug] },
)

// Catalogue fetched only when on the bundle (Full Access) — used to
// list the programme modules as a navigable index.
const isBundleView = computed(() => data.value?.module.isFullCourse === true)
const { data: catalogData, pending: bundleModulesPending } = await useFetch<{ items: CatalogItem[] }>(
  '/api/modules',
  { credentials: 'include', server: true },
)
const bundleProgramModules = computed<CatalogItem[]>(() => {
  if (!isBundleView.value) return []
  return (catalogData.value?.items ?? []).filter((m) => !m.isFullCourse)
})

const lessons = computed(() => data.value?.classes ?? [])
const totalLevels = computed(() => lessons.value.length)

// Ensures the localStorage entry exists and keeps totalLevels fresh.
// Without prior info the progress starts at 0 (no diamond marked);
// the header bar stays at 0/N until the user does something.
watch(
  [moduleSlug, totalLevels],
  ([slug, total]) => {
    if (slug && total > 0) progress.ensure(slug, total)
  },
  { immediate: true },
)

const currentLevel = computed(() => progress.getProgress(moduleSlug.value)?.level ?? 0)

const progressLineWidth = computed(() => {
  const total = totalLevels.value
  if (total <= 1 || currentLevel.value <= 0) return '0%'
  // Orange line from the first diamond to the last marked one
  // (level). It is a contiguous range thanks to the [1..N] rule.
  const cappedLevel = Math.min(currentLevel.value, total)
  return `${(cappedLevel - 1) * (100 / (total - 1))}%`
})

function isLessonCompleted(level: number): boolean {
  return currentLevel.value >= level
}

function stepClass(lesson: ApiClass): string {
  const done = isLessonCompleted(lesson.level)
  const locked = lesson.isLocked && !data.value?.module.hasAccess
  if (locked) return 'diamond-step--locked'
  return done ? 'diamond-step--done' : 'diamond-step--pending'
}

function onStepClick(lesson: ApiClass) {
  if (lesson.isLocked && !data.value?.module.hasAccess) return
  progress.toggleLevel(moduleSlug.value, lesson.level, totalLevels.value)
}

// "Back" button: never returns to another module page, to avoid the
// loop the user reported when bouncing between the Full Access bundle
// and one of its child modules. The rules are:
//   · On the bundle (Full Access): always /modules.
//   · On a regular module: walk the history right-to-left, skip every
//     /lesson and /module_detail entry (any slug), and stop at the
//     first "safe" page. If we find /profile, label says "Back to
//     profile"; otherwise "Back to modules" pointing at /modules.
// This is sequenced when possible (e.g. profile → module → back to
// profile) and falls back to a fixed, signposted destination.
const navHistory = useState<string[]>('nav.history', () => [])
const isBundleModule = computed(() => data.value?.module.isFullCourse === true)

interface BackTarget { to: string; label: string }

const backTarget = computed<BackTarget>(() => {
  if (isBundleModule.value) {
    return {
      to: '/modules',
      label: t('MODULE_DETAIL_BACK_TO_MODULES_TXT', 'Back to modules'),
    }
  }
  for (let i = navHistory.value.length - 1; i >= 0; i--) {
    const entry = navHistory.value[i]!
    const path = entry.split('?')[0] ?? entry
    if (path === '/lesson' || path === '/module_detail') continue
    if (path === '/profile') {
      return {
        to: entry,
        label: t('MODULE_DETAIL_BACK_TO_PROFILE_TXT', 'Back to profile'),
      }
    }
    if (path === '/modules') {
      return {
        to: entry,
        label: t('MODULE_DETAIL_BACK_TO_MODULES_TXT', 'Back to modules'),
      }
    }
    return {
      to: entry,
      label: t('MODULE_DETAIL_BACK_TXT', 'Back'),
    }
  }
  return {
    to: '/modules',
    label: t('MODULE_DETAIL_BACK_TO_MODULES_TXT', 'Back to modules'),
  }
})

function onBack() {
  const target = backTarget.value
  // When the back target matches the immediate browser history entry
  // (the usual case: e.g. /modules → /module_detail → Back), use a
  // real router.back() so the browser restores the scroll position
  // of the destination page. Falling through to navigateTo would
  // push a fresh entry and Nuxt's default scrollBehavior would scroll
  // to the top of the destination — that is the "scrolls to top
  // after a beat" bug.
  const previous = navHistory.value[navHistory.value.length - 1]
  if (previous === target.to && import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  navigateTo(target.to)
}

// Left info panel: by default it shows the "current" lesson (level),
// but if the user hovers another diamond, that one wins. If the
// module has not been started yet (level=0), the current lesson is 1
// (first step).
const hoveredLevel = ref<number | null>(null)
const focusLesson = computed<ApiClass | null>(() => {
  const target = hoveredLevel.value
    ?? (currentLevel.value > 0 ? currentLevel.value : 1)
  return lessons.value.find((l) => l.level === target) ?? null
})

// Direction of the slide transition on the "focus" panel. Stepping
// up → new content enters from the right (info-slide-right).
// Stepping down → enters from the left. We remember the previous
// level to detect direction without complex hacks.
const lastFocusLevel = ref<number | null>(null)
const focusTransitionName = ref<'info-slide-right' | 'info-slide-left'>('info-slide-right')
watch(focusLesson, (next, prev) => {
  if (!next || !prev) return
  focusTransitionName.value = next.level >= prev.level ? 'info-slide-right' : 'info-slide-left'
  lastFocusLevel.value = next.level
})

const focusBadge = computed(() => {
  if (hoveredLevel.value !== null) {
    return isLessonCompleted(hoveredLevel.value)
      ? t('MODULE_DETAIL_HOVER_DONE_BADGE', 'Marked as done')
      : t('MODULE_DETAIL_HOVER_PENDING_BADGE', 'Click to mark as done')
  }
  if (currentLevel.value === 0) return t('MODULE_DETAIL_NEXT_BADGE', 'Next lesson')
  if (currentLevel.value >= totalLevels.value) return t('MODULE_DETAIL_COMPLETED_BADGE', 'Module completed')
  return t('MODULE_DETAIL_CURRENT_BADGE', 'You are here')
})

// Right panel: if the user has completed a lesson and is NOT
// currently "on" it, we show the last one done (level) so they have
// visual context of their path. If the left panel already shows
// that same lesson, we skip the duplicate.
const lastCompletedLesson = computed<ApiClass | null>(() => {
  if (currentLevel.value <= 0) return null
  return lessons.value.find((l) => l.level === currentLevel.value) ?? null
})

const checkoutLoading = ref(false)

function onLessonClick(lesson: ApiClass) {
  if (lesson.isLocked) return
  router.push(`/lesson?module=${moduleSlug.value}&level=${lesson.level}`)
}

async function startCheckout() {
  if (!isAuthenticated.value) {
    openLoginModal()
    return
  }
  checkoutLoading.value = true
  try {
    const res = await $fetch<{ url: string }>('/api/checkout/session', {
      method: 'POST',
      credentials: 'include',
      body: { moduleSlug: moduleSlug.value },
    })
    if (res?.url) window.location.href = res.url
  } catch (err: any) {
    if (err?.statusCode === 401) openLoginModal()
    else if (err?.statusCode === 503) alert(t('CHECKOUT_NOT_CONFIGURED', 'Payments are not configured yet. Contact support.'))
    else console.error('Checkout error', err)
  } finally {
    checkoutLoading.value = false
  }
}
</script>

<style scoped>
/* Diamond: 22px square rotated 45°. Background and border change
   based on state. The brutalist shadow matches the rest of the site. */
.diamond-step {
  width: 22px;
  height: 22px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.diamond-step:hover:not(:disabled) {
  transform: scale(1.18);
}
.diamond-step:disabled {
  cursor: not-allowed;
}
.diamond-step-inner {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(45deg);
  border: 2px solid var(--color-brand-orange);
  background: var(--color-brand-white);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.diamond-step--done .diamond-step-inner {
  background: var(--color-brand-orange);
  border-color: var(--color-brand-orange);
}
.diamond-step--pending .diamond-step-inner {
  background: var(--color-brand-white);
  border-color: var(--color-brand-orange);
}
.diamond-step--locked .diamond-step-inner {
  background: var(--color-brand-cream);
  border-color: var(--color-brand-grey-light);
  opacity: 0.6;
}

/* Info panel transitions. */

/* Horizontal slide: incoming content comes in from one side, outgoing
   leaves from the opposite side. Container height is kept stable
   thanks to `min-h-[6rem]` on the parent grid. */
.info-slide-right-enter-active,
.info-slide-right-leave-active,
.info-slide-left-enter-active,
.info-slide-left-leave-active {
  transition: transform 220ms ease, opacity 180ms ease;
}
.info-slide-right-enter-from {
  transform: translateX(40px);
  opacity: 0;
}
.info-slide-right-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}
.info-slide-left-enter-from {
  transform: translateX(-40px);
  opacity: 0;
}
.info-slide-left-leave-to {
  transform: translateX(40px);
  opacity: 0;
}

/* Appearance of the whole "last completed" panel (v-if): drops in
   from above with a fade. The exit lifts back up with a fade. */
.panel-drop-enter-active,
.panel-drop-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}
.panel-drop-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.panel-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Content swap inside the panel (when the completed level rises).
   Subtle fade. */
.info-fade-enter-active,
.info-fade-leave-active {
  transition: opacity 180ms ease;
}
.info-fade-enter-from,
.info-fade-leave-to {
  opacity: 0;
}
</style>
