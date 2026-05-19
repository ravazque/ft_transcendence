<template>
  <div>
  <!-- Single root node: pageTransition requires one so it can animate
       enter/leave. The comment lives INSIDE the wrapper on purpose —
       sibling comments at the root make Vue treat the component as
       multi-root and break <Transition>. -->
  <UPageHero
    :title="t('HOME_HERO_TITLE', 'aprende historia del yoga')"
    :description="t('HOME_HERO_TXT', 'esta es una descripcion de las descripciones te imaginas viajar en el timepo y hacer una cosa que se llame codere y joderles la idea a los de las apuestas')"
    :links="[{
      label: heroCtaLabel,
      icon: 'i-lucide-square-play',
      onClick: openLogin,
    }]"
  >
    <img
      src="/sample.jpg"
      alt="App screenshot"
      class="ring ring-default"
    />
  </UPageHero>

  <UPageSection
    id="metodo"
    :title="t('HOME_METHOD_TITLE', 'Cómo?')"
    :description="t('HOME_METHOD_TXT', 'hola hola hola hola ocs/getting-sta rted/t heme/design-system a hola hola hola ocs/getting-sta rted/t heme/design-system a hola hola hola ocs/getting-sta rted/t heme/design-system')"
  >
    <div class="flex flex-col md:flex-row gap-6 lg:gap-8">
      <UPageCard
        v-for="item in method_cards"
        :key="item.title"
        :title="item.title"
        :description="item.description"
        class="flex-1"
        :ui="{
          title: 'font-roboto text-base font-semibold text-brand-brown',
          description: 'text-brand-brown',
        }"
      >
        <template #icon>
          <UIcon :name="item.icon" class="w-8 h-8 text-brand-brown" />
        </template>
      </UPageCard>
    </div>
  </UPageSection>

  <UPageCTA
    :title="t('HOME_AD_TXT', 'Inicia sesión Para recibir un libro gratis')"
    orientation="horizontal"
    :reverse="true"
    class="bg-brand-mustard rounded-none shadow-none"
    :links="[{
      label: t('HOME_AD_BUTTON_TXT', 'Learn more'),
      trailingIcon: 'i-lucide-arrow-right',
      onClick: openLogin,
      class: 'px-6',
      color: 'neutral',
    }]"
    :ui="{
      wrapper: 'rounded-none',
      title: 'text-brand-white text-4xl font-serif max-w-md',
    }"
  >
    <img :src="t('HOME_AD_IMAGE_URL', '/sample.jpg')" class="h-64 w-auto" alt="hero img" />
  </UPageCTA>

  <UPageSection
    id="Marco"
    :title="t('HOME_AUTHOR_TITLE', 'quien es Marco')"
    :description="t('HOME_AUTHOR_TXT', 'Descubre el camino de Marco a través de los años, compartiendo la sabiduría del yoga con el mundo.')"
    orientation="horizontal"
    :links="[
      {
        label: t('HOME_AUTHOR_BUTTON_EMAIL_TXT', 'Email her'),
        icon: 'i-lucide-mail',
        to: t('HOME_AUTHOR_BUTTON_EMAIL_URL', 'https://mail.google.com/'),
        target: '_blank',
      },
      {
        label: t('HOME_AUTHOR_BUTTON_INSTAGRAM_TXT', 'Follow her'),
        to: t('HOME_AUTHOR_BUTTON_INSTAGRAM_URL', 'https://www.instagram.com/'),
        target: '_blank',
        trailingIcon: 'i-lucide-instagram',
        color: 'neutral',
      },
    ]"
  >
    <template #features>
      <UPageCard
        class="w-fit max-w-sm lg:max-w-md bg-transparent! shadow-none! ring-0! border-none! rounded-none"
      >
        <template #body>
          <UTimeline class="max-w-md" :items="MarcoTimeline" />
        </template>
      </UPageCard>
    </template>
    <img :src="t('HOME_AUTHOR_IMAGE_URL', '/sample.jpg')" class="h-92 w-auto" alt="">
  </UPageSection>

  <div id="resenas" class="flex flex-col p-6 lg:p-14 items-center gap-10">
    <h2 class="text-5xl font-serif text-center">{{ t('HOME_REVIEW_TITLE', 'Reseñas') }}</h2>

    <!-- Real listing from /api/reviews -->
    <div v-if="reviewsPending" class="text-brand-grey-dark">{{ t('REVIEWS_LOADING', 'Loading reviews…') }}</div>
    <p v-else-if="!reviewItems.length" class="text-brand-grey-dark italic">
      {{ t('REVIEWS_EMPTY', 'No reviews yet. Be the first to share your experience!') }}
    </p>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
      <UPageCard
        v-for="r in reviewItems"
        :key="r.id"
        :ui="{ description: 'review-text text-brand-grey-dark font-roboto text-base' }"
        :description="r.content"
      >
        <div class="flex items-center gap-4">
          <UAvatar
            :alt="r.user.displayName"
            :src="avatarFor({ avatar: r.user.avatar, username: r.user.username, fullName: r.user.displayName })"
          />
          <p class="font-semibold">{{ r.user.displayName }}</p>
        </div>
      </UPageCard>
    </div>

    <!-- Form: only for authenticated users with at least one
         purchase (prevents astroturfing). -->
    <div v-if="isAuthenticated && canReview" class="w-full max-w-2xl border border-brand-grey-light bg-brand-white p-6 mt-6">
      <h3 class="text-xl font-bold text-brand-black mb-3">
        {{ myReview ? t('REVIEWS_FORM_EDIT_TITLE', 'Edit your review') : t('REVIEWS_FORM_NEW_TITLE', 'Share your experience') }}
      </h3>
      <form class="flex flex-col gap-4" @submit.prevent="submitReview">
        <textarea
          v-model="reviewDraft"
          rows="4"
          maxlength="600"
          required
          class="w-full border border-brand-grey-light p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mustard"
          :placeholder="t('REVIEWS_FORM_PLACEHOLDER', 'What has this platform given you? (min. 10 characters)')"
        ></textarea>
        <div class="flex items-center justify-between text-xs text-brand-grey-dark">
          <span>{{ reviewDraft.length }} / 600</span>
          <span v-if="myReview" class="italic">{{ t('REVIEWS_FORM_REPLACE_NOTE', 'Your review will be replaced.') }}</span>
        </div>
        <p v-if="reviewError" class="text-sm text-red-600">{{ reviewError }}</p>
        <p v-if="reviewSuccess" class="text-sm text-brand-green">{{ reviewSuccess }}</p>
        <div class="flex flex-wrap gap-3 justify-end">
          <UButton
            v-if="myReview"
            type="button"
            :label="t('REVIEWS_FORM_DELETE_BUTTON', 'Delete review')"
            color="neutral"
            variant="outline"
            class="!text-brand-danger-ink !border-brand-danger justify-center"
            :loading="reviewDeleting"
            @click="deleteReview"
          />
          <UButton
            type="submit"
            :label="myReview ? t('REVIEWS_FORM_UPDATE_BUTTON', 'Update review') : t('REVIEWS_FORM_PUBLISH_BUTTON', 'Publish review')"
            :loading="reviewSubmitting"
            class="justify-center"
          />
        </div>
      </form>
    </div>
    <div v-else-if="!isAuthenticated" class="text-brand-grey-dark text-sm italic">
      <button class="underline hover:text-brand-orange" @click="openLogin">{{ t('REVIEWS_GUEST_SIGN_IN', 'Sign in') }}</button>
      {{ t('REVIEWS_GUEST_SUFFIX', 'to leave your review.') }}
    </div>
    <p v-else class="text-brand-grey-dark text-sm italic">
      {{ t('REVIEWS_REQUIRES_PURCHASE', 'Buy at least one module to share your experience.') }}
    </p>
  </div>

  <UPageSection
    id="directo"
    :title="t('LIVE_CLASSES_IMAGE_TITLE', 'clases en directo')"
    :description="t('LIVE_CLASSES_DESCRIPTION', 'Descubre el camino de Marco a través de los años, compartiendo la sabiduría del yoga con el mundo.')"
    orientation="horizontal"
    :reverse="true"
    :links="[{
      label: t('LIVE_CLASSES_BUTTON_TXT', 'See schedule'),
      trailingIcon: 'i-lucide-arrow-right',
      onClick: openCalendar,
    }]"
  >
    <img :src="t('LIVE_CLASSES_IMAGE_URL', '/sample.jpg')" alt="">
  </UPageSection>

  <div
    v-if="ownsEverything"
    class="flex flex-col items-center bg-brand-yellow py-20 lg:py-32 gap-6 px-6 text-center"
  >
    <UIcon name="i-lucide-sparkles" class="w-12 h-12 text-brand-orange" />
    <h2 class="text-4xl lg:text-5xl font-serif text-brand-black max-w-2xl">
      {{ t('PRICE_OWNS_ALL_TITLE', 'Ya tienes acceso a todo el programa') }}
    </h2>
    <p class="text-brand-grey-dark max-w-xl">
      {{ t('PRICE_OWNS_ALL_TXT', 'Disfruta de tus módulos cuando quieras. Gracias por confiar en Marco.') }}
    </p>
    <UButton
      :label="t('PRICE_OWNS_ALL_BUTTON_TXT', 'Ir a mis módulos')"
      color="primary"
      size="lg"
      class="px-8 justify-center"
      @click="navigateTo('/modules')"
    />
  </div>

  <div
    v-else-if="pricingPlans.length"
    class="flex flex-col lg:flex-row justify-center items-stretch bg-brand-yellow py-20 lg:py-32 gap-8 px-6"
  >
    <UPricingPlan
      v-for="(plan, index) in pricingPlans"
      :key="plan.slug + '-' + index"
      :title="plan.title"
      :description="plan.description"
      :price="plan.price"
      class="w-full lg:w-auto"
      :class="plan.isBundle ? '' : 'lg:scale-90 origin-center'"
      :features="plan.features"
      :button="{ label: plan.buttonLabel, onClick: () => handlePlanClick(plan) }"
      :terms="plan.terms"
    >
      <template v-if="plan.originalPrice" #price>
        <div class="flex items-baseline gap-3">
          <span class="text-brand-grey-dark text-2xl line-through">{{ plan.originalPrice }}</span>
          <span class="text-brand-black font-serif text-4xl font-semibold">{{ plan.price }}</span>
        </div>
      </template>
    </UPricingPlan>
  </div>

  <UPageSection
    id="clases"
    :title="t('FACE_TO_FACE_TITLE', 'clases de yoga')"
    :description="t('FACE_TO_FACE_DESCRIPTION', 'Descubre el camino de Marco a través de los años, compartiendo la sabiduría del yoga con el mundo.')"
    orientation="horizontal"
    :links="[{
      label: t('FACE_TO_FACE_BUTTON_TXT', 'See timetable'),
      trailingIcon: 'i-lucide-arrow-right',
      onClick: openCalendar,
    }]"
  >
    <img :src="t('FACE_TO_FACE_IMAGE_URL', '/sample.jpg')" alt="">
  </UPageSection>

  <CalendarModal v-model:open="calendarOpen" />

  <div id="faq" class="flex flex-col lg:flex-row w-full py-12 lg:py-20 px-6 lg:px-28 justify-between gap-10">
    <h2 class="text-5xl font-serif text-center lg:text-left mb-0">FAQ</h2>
    <ClientOnly>
      <UAccordion variant="ghost" size="lg" class="w-full lg:w-2/3" :items="faqItems" />
    </ClientOnly>
  </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useTags()
const { openLoginModal, isAuthenticated } = useAuth()

// Once the user is signed in, the marketing CTAs lose their meaning —
// route them to the catalogue so they can buy or continue a module.
function openLogin() {
  if (isAuthenticated.value) {
    navigateTo('/modules')
  } else {
    openLoginModal()
  }
}

// Hero CTA label flips to "Modules" when the user already owns
// everything — "Get started" / "Sign up" makes no sense for a
// customer with no remaining purchases. The click still goes through
// openLogin(), which already redirects authenticated users to /modules.
// We reuse MODULE_LIST_TITLE (already translated to Módulos/Modules in
// the seed) instead of introducing a new tag that would otherwise
// fall back to English until the admin set it.
const heroCtaLabel = computed(() =>
  ownsEverything.value
    ? t('MODULE_LIST_TITLE', 'Modules')
    : t('HOME_HERO_BUTTON_TXT', 'Get started'),
)

const calendarOpen = ref(false)
function openCalendar() {
  calendarOpen.value = true
}

const method_cards = computed(() => [
  {
    title: t('HOME_METHOD_CARD1_TITLE', 'hola'),
    description: t('HOME_METHOD_CARD1_TXT', 'otón redondeado con texto oc otón redondeado con texto oc'),
    icon: 'i-lucide-square-play',
  },
  {
    title: t('HOME_METHOD_CARD2_TITLE', 'hola'),
    description: t('HOME_METHOD_CARD2_TXT', 'otón redondeado con texto oc otón redondeado con texto oc'),
    icon: 'i-lucide-square-play',
  },
  {
    title: t('HOME_METHOD_CARD3_TITLE', 'hola'),
    description: t('HOME_METHOD_CARD3_TXT', 'otón redondeado con texto oc otón redondeado con texto oc'),
    icon: 'i-lucide-square-play',
  },
])

// Real reviews ────────────────────────────────────────────────
// Pulled from /api/reviews (user_reviews table). The previous
// hardcoded list was removed when the feature went to production.
interface ApiReview {
  id: number
  content: string
  rating: number | null
  createdAt: string
  user: { username: string; displayName: string; avatar: string | null }
}
const {
  data: reviewsData,
  pending: reviewsPending,
  refresh: refreshReviews,
} = await useFetch<{ items: ApiReview[] }>('/api/reviews', {
  credentials: 'include',
  default: () => ({ items: [] }),
})
const reviewItems = computed(() => reviewsData.value?.items ?? [])

const reviewDraft = ref('')
const reviewError = ref<string | null>(null)
const reviewSuccess = ref<string | null>(null)
const reviewSubmitting = ref(false)
const myReview = ref<{ id: number; content: string } | null>(null)

const canReview = ref(false)
async function refreshCanReview() {
  if (!isAuthenticated.value) {
    canReview.value = false
    return
  }
  try {
    const data = await $fetch<{ summary: { regularOwned: number; ownsBundle: boolean } }>(
      '/api/me/purchases',
      { credentials: 'include' },
    )
    canReview.value = (data.summary?.regularOwned ?? 0) > 0 || !!data.summary?.ownsBundle
  } catch {
    canReview.value = false
  }
}

async function loadMyReview() {
  if (!isAuthenticated.value) {
    myReview.value = null
    reviewDraft.value = ''
    return
  }
  try {
    const r = await $fetch<{ review: { id: number; content: string } | null }>(
      '/api/reviews/mine',
      { credentials: 'include' },
    )
    if (r.review) {
      myReview.value = r.review
      reviewDraft.value = r.review.content
    } else {
      myReview.value = null
      reviewDraft.value = ''
    }
  } catch {
    // If the endpoint fails (not signed in, etc.) we leave it empty.
    myReview.value = null
  }
}

onMounted(() => {
  loadMyReview()
  refreshCanReview()
})
watch(isAuthenticated, () => {
  loadMyReview()
  refreshCanReview()
})

const reviewDeleting = ref(false)
async function deleteReview() {
  if (!myReview.value) return
  if (!confirm(t('REVIEWS_DELETE_CONFIRM', 'Delete your review?'))) return
  reviewDeleting.value = true
  reviewError.value = null
  reviewSuccess.value = null
  try {
    await $fetch('/api/reviews/mine', { method: 'DELETE', credentials: 'include' })
    reviewSuccess.value = t('REVIEWS_DELETE_SUCCESS', 'Review deleted.')
    reviewDraft.value = ''
    myReview.value = null
    await refreshReviews()
  } catch (err) {
    reviewError.value = (err as { statusMessage?: string }).statusMessage
      || t('REVIEWS_DELETE_ERROR', 'Could not delete the review.')
  } finally {
    reviewDeleting.value = false
  }
}

async function submitReview() {
  reviewError.value = null
  reviewSuccess.value = null
  if (reviewDraft.value.trim().length < 10) {
    reviewError.value = t('REVIEWS_ERROR_TOO_SHORT', 'Review must be at least 10 characters.')
    return
  }
  reviewSubmitting.value = true
  try {
    await $fetch('/api/reviews', {
      method: 'POST',
      credentials: 'include',
      body: { content: reviewDraft.value.trim() },
    })
    reviewSuccess.value = myReview.value
      ? t('REVIEWS_SUCCESS_UPDATED', 'Review updated.')
      : t('REVIEWS_SUCCESS_PUBLISHED', 'Thanks for your review!')
    await refreshReviews()
    await loadMyReview()
  } catch (err) {
    reviewError.value = (err as { statusMessage?: string; data?: { statusMessage?: string } }).statusMessage
      || (err as { data?: { statusMessage?: string } }).data?.statusMessage
      || t('REVIEWS_ERROR_GENERIC', 'Could not publish the review.')
  } finally {
    reviewSubmitting.value = false
  }
}

interface ApiMilestone { id: number; milestoneDate: string; title: string; description: string }
const { data: milestonesData } = await useFetch<{ items: ApiMilestone[] }>(
  '/api/career-milestones',
  { credentials: 'include', default: () => ({ items: [] }) },
)
const milestoneIcons = ['i-lucide-globe', 'i-lucide-home', 'i-lucide-monitor', 'i-lucide-sparkles']
const MarcoTimeline = computed(() =>
  (milestonesData.value?.items ?? []).map((m, idx) => ({
    title: m.title,
    description: m.description,
    date: new Date(m.milestoneDate).getFullYear().toString(),
    icon: milestoneIcons[idx % milestoneIcons.length],
  })),
)

// Dynamic pricing plans: the real catalogue lives in /modules. Here
// we show two marketing cards:
//
//   - Card A: the "Full Access" bundle (always, unless the user
//     already owns it).
//   - Card B: the "next recommended module" — the first module not
//     yet purchased in catalogue order. If the user is not signed
//     in, this is simply the first (introductory) module.
//
// When the user owns the bundle or has bought every module we show
// no card at all.
interface HomeModule {
  id: number
  slug: string
  title: string
  description: string | null
  isFullCourse: boolean
  priceLabel?: string
  purchased: boolean
  isNextStep: boolean
  bundleOriginalCents?: number
  bundleEffectiveCents?: number
  bundleEffectiveLabel?: string
}
const { data: modulesCatalog } = await useFetch<{ items: HomeModule[] }>(
  '/api/modules',
  { credentials: 'include' },
)

interface PricingPlanCard {
  slug: string
  title: string
  description: string
  price: string
  originalPrice?: string
  features: { title: string; icon: string }[]
  buttonLabel: string
  terms: string
  isBundle: boolean
}

// The user "owns everything" if they bought the bundle, or if they
// bought every individual module in the catalogue (edge case but
// possible). Only authenticated users can match — an anonymous
// visitor never owns anything.
const ownsEverything = computed(() => {
  if (!isAuthenticated.value) return false
  const items = modulesCatalog.value?.items ?? []
  if (!items.length) return false
  const bundle = items.find((m) => m.isFullCourse)
  if (bundle?.purchased) return true
  const regulars = items.filter((m) => !m.isFullCourse)
  return regulars.length > 0 && regulars.every((m) => m.purchased)
})

const pricingPlans = computed<PricingPlanCard[]>(() => {
  const items = modulesCatalog.value?.items ?? []
  const bundle = items.find((m) => m.isFullCourse)
  // First unowned module in the catalogue, or the first one if no
  // one is signed in / nothing is purchased.
  const nextRegular =
    items.find((m) => !m.isFullCourse && m.isNextStep)
    || items.find((m) => !m.isFullCourse && !m.purchased)
    || items.find((m) => !m.isFullCourse)
    || null

  const cards: PricingPlanCard[] = []

  if (bundle && !bundle.purchased) {
    // If the API returned an effective price (because the user
    // already owns some modules), we show it as the main price with
    // the original struck-through next to it — no long breakdown.
    const hasCredit = !!bundle.bundleEffectiveLabel
      && bundle.bundleEffectiveCents !== bundle.bundleOriginalCents
    cards.push({
      slug: bundle.slug,
      title: bundle.title,
      description: bundle.description ?? t('PRICE_BUNDLE_DESC', 'Get unlimited access to the whole programme.'),
      price: hasCredit ? bundle.bundleEffectiveLabel! : (bundle.priceLabel ?? ''),
      originalPrice: hasCredit ? (bundle.priceLabel ?? '') : undefined,
      features: [
        { title: t('BUNDLE_FEATURE_UNLIMITED', 'Unlimited access to classes'), icon: 'i-lucide-infinity' },
        { title: t('BUNDLE_FEATURE_SUPPORT', 'Priority support'), icon: 'i-lucide-life-buoy' },
        { title: t('BUNDLE_FEATURE_CERT', 'Completion certificate'), icon: 'i-lucide-award' },
      ],
      buttonLabel: t('PRICE_BUNDLE_BUTTON_TXT', 'Get Full Access'),
      terms: t('MODULES_BUNDLE_TERMS_TXT', 'One-time purchase. Lifetime access.'),
      isBundle: true,
    })
  }

  if (nextRegular && !nextRegular.purchased) {
    cards.push({
      slug: nextRegular.slug,
      title: nextRegular.title,
      description: nextRegular.description ?? '',
      price: nextRegular.priceLabel ?? '',
      features: [
        { title: t('PRICE_MODULE_FEATURE_1', 'Self-paced lessons'), icon: 'i-lucide-play-circle' },
        { title: t('PRICE_MODULE_FEATURE_2', 'Downloadable resources'), icon: 'i-lucide-file-text' },
        { title: t('PRICE_MODULE_FEATURE_3', 'Lifetime access'), icon: 'i-lucide-clock' },
      ],
      buttonLabel: isAuthenticated.value
        ? t('PRICE_MODULE_BUTTON_OWN_TXT', 'Start this module')
        : t('PRICE_MODULE_BUTTON_TXT', 'Get started'),
      terms: t('PRICE_BUTTON_FOOTER', 'Invoices and receipts available.'),
      isBundle: false,
    })
  }

  return cards
})

function handlePlanClick(plan: PricingPlanCard) {
  if (!isAuthenticated.value) {
    openLogin()
    return
  }
  navigateTo('/modules')
}

interface ApiFaq { id: number; question: string; answer: string }
const { data: faqsData } = await useFetch<{ items: ApiFaq[] }>(
  '/api/faqs',
  { credentials: 'include', default: () => ({ items: [] }) },
)
const faqIcons = ['i-lucide-circle-help', 'i-lucide-video', 'i-lucide-sparkles', 'i-lucide-credit-card', 'i-lucide-shield-check']
const faqItems = computed(() =>
  (faqsData.value?.items ?? []).map((f, idx) => ({
    label: f.question,
    content: f.answer,
    icon: faqIcons[idx % faqIcons.length],
    defaultOpen: idx === 0,
  })),
)
</script>
