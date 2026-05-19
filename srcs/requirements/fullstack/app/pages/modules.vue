<template>
  <div>
    <!-- Anonymous hero: sign-up required to see the full catalogue -->
    <div v-if="requiresLogin" class="flex flex-col items-center bg-brand-yellow py-20 px-6 text-center">
      <h1 class="text-5xl font-serif text-brand-black mb-4 max-w-2xl">{{ t('MODULES_GUEST_TITLE', 'Sign up to see the catalogue') }}</h1>
      <p class="text-brand-grey-dark mb-8 max-w-xl">
        {{ t('MODULES_GUEST_TXT', 'Modules are available for registered users. Create a free account to discover prices, lessons and buy access.') }}
      </p>
      <UButton :label="t('MODULES_GUEST_BUTTON_TXT', 'Create account')" color="primary" size="lg" class="px-8 justify-center" @click="openLoginModal" />
    </div>

    <!-- The user already has access to everything: we cover the three
         cases with the same panel — bundle purchased, 5 individual
         modules purchased, or individuals + bundle. -->
    <div
      v-else-if="hasAllAccess"
      class="flex flex-col items-center bg-brand-teal/15 py-16 px-6 gap-4 text-center"
    >
      <UIcon name="i-lucide-sparkles" class="w-10 h-10 text-brand-teal" />
      <h2 class="text-3xl lg:text-4xl font-serif text-brand-black max-w-2xl">
        {{ t('MODULES_BUNDLE_REDUNDANT_TITLE', 'You already have access to every module') }}
      </h2>
    </div>

    <!-- Full Access bundle: only visible to signed-in users -->
    <div v-else-if="bundle" class="flex flex-col items-center bg-brand-yellow py-20 px-6 gap-6">
      <UPricingPlan
        :title="bundle.title"
        :description="bundle.description ?? t('MODULES_BUNDLE_DEFAULT_DESC', 'Get access to every yoga and meditation module.')"
        :price="bundleDisplayPrice"
        orientation="horizontal"
        :features="bundleFeatures"
        :button="{
          label: bundle.purchased ? t('MODULES_BUNDLE_OWNED_TXT', 'You already have access') : t('MODULES_BUNDLE_BUY_TXT', 'Start now'),
          disabled: bundle.purchased,
          loading: bundleLoading,
          onClick: () => startCheckout(bundle.slug)
        }"
        :terms="t('MODULES_BUNDLE_TERMS_TXT', 'One-time purchase. Lifetime access.')"
      />

      <!-- Breakdown of the credit for individual modules already
           bought. The credit is PROPORTIONAL: we only subtract the
           share of the module that was included in the bundle
           (= price × factor). That way it never hits 0 unless you
           already own all 5. -->
      <div
        v-if="bundle.bundleCreditCents && bundle.bundleCreditCents > 0"
        class="max-w-2xl w-full bg-brand-white border border-brand-grey-light p-5"
      >
        <p class="text-sm font-bold uppercase tracking-widest text-brand-orange mb-3">
          {{ t('BUNDLE_CREDIT_TITLE', 'Credit for modules you already own') }}
        </p>
        <p class="text-sm text-brand-grey-dark mb-3 leading-relaxed">
          {{ bundleCreditIntroText }}
        </p>
        <ul class="text-sm text-brand-black space-y-1 mb-4">
          <li class="flex justify-between">
            <span>{{ t('BUNDLE_CREDIT_ORIGINAL', 'Original price') }}</span>
            <span>€{{ (bundle.bundleOriginalCents! / 100).toFixed(2) }}</span>
          </li>
          <li v-for="cm in bundle.bundleCreditModules" :key="cm.slug" class="flex justify-between text-brand-grey-dark">
            <span>– {{ cm.title }} <span class="opacity-70">(€{{ (cm.priceCents / 100).toFixed(2) }})</span></span>
            <span>−€{{ (cm.creditCents / 100).toFixed(2) }}</span>
          </li>
          <li class="flex justify-between font-bold text-brand-black border-t border-brand-grey-light pt-2 mt-2">
            <span>{{ t('BUNDLE_CREDIT_TOTAL', 'Total to pay') }}</span>
            <span>€{{ (bundle.bundleEffectiveCents! / 100).toFixed(2) }}</span>
          </li>
        </ul>
      </div>

      <p class="max-w-2xl text-xs text-brand-grey-dark italic text-center mt-2">
        {{ pricingExplainer }}
      </p>
    </div>

    <div class="py-16 px-6 lg:px-28">
      <h2 class="text-5xl font-serif text-brand-black mb-12 text-center">{{ t('MODULE_LIST_TITLE', 'Modules') }}</h2>

      <div v-if="pending" class="text-center text-brand-grey-dark">{{ t('MODULES_LOADING', 'Loading modules…') }}</div>
      <div v-else-if="error" class="text-center text-red-600">{{ t('MODULES_ERROR', 'Could not load the modules.') }}</div>
      <div v-else-if="!regularModules.length" class="text-center text-brand-grey-dark">
        {{ t('MODULES_EMPTY', 'No modules published yet. Come back soon.') }}
      </div>

      <div v-else class="flex flex-col gap-14 max-w-4xl mx-auto">
        <UPageCTA
          v-for="(module, index) in regularModules"
          :key="module.id"
          :title="module.title"
          :description="moduleDescription(module)"
          orientation="horizontal"
          :reverse="index % 2 === 0"
          :variant="module.purchased ? 'soft' : 'outline'"
          :class="[moduleClasses(module), 'card-hover stagger-fade']"
          :style="{ animationDelay: `${index * 60}ms` }"
        >
          <img
            :src="module.cover || '/sample.jpg'"
            class="w-full aspect-video object-cover"
            :class="module.locked && requiresLogin ? 'opacity-60' : ''"
            alt=""
          />
          <template #footer>
            <div class="flex gap-4 flex-wrap items-center">
              <span v-if="module.isNextStep" class="text-xs font-bold uppercase tracking-widest text-brand-orange">
                {{ t('MODULES_NEXT_STEP_BADGE', 'Next step') }}
              </span>
              <span v-else-if="module.purchased" class="text-xs font-bold uppercase tracking-widest text-brand-green">
                {{ t('MODULES_OWNED_BADGE', 'Yours') }}
              </span>
              <span v-else-if="module.locked && !requiresLogin" class="text-xs font-bold uppercase tracking-widest text-brand-grey-dark">
                {{ t('MODULES_LOCKED_BADGE', 'Locked') }}
              </span>
              <div class="flex gap-3 ml-auto">
                <UButton
                  v-if="!requiresLogin"
                  :label="primaryActionLabel(module)"
                  variant="solid"
                  :color="module.purchased ? 'neutral' : 'primary'"
                  class="justify-center"
                  @click="primaryAction(module)"
                />
                <UButton
                  v-if="!requiresLogin"
                  :label="t('MODULES_MORE_INFO_TXT', 'Learn more')"
                  trailing-icon="i-lucide-arrow-right"
                  variant="solid"
                  color="neutral"
                  class="justify-center"
                  @click="openModule(module)"
                />
                <UButton
                  v-else
                  :label="t('MODULES_REGISTER_BUTTON_TXT', 'Sign up')"
                  variant="solid"
                  color="primary"
                  class="justify-center"
                  @click="openLoginModal"
                />
              </div>
            </div>
          </template>
        </UPageCTA>
      </div>
    </div>

    <USlideover
      v-model:open="isOpen"
      :title="selectedModule?.title"
      description=""
    >
      <template #body>
        <div v-if="selectedModule" class="flex flex-col h-full">
          <p class="text-brand-grey-dark leading-relaxed">
            {{ selectedModule.longDescription || selectedModule.description }}
          </p>

          <div class="mt-6 flex items-baseline justify-between gap-4 border-t border-brand-grey-light pt-4">
            <span class="text-xs font-bold uppercase tracking-widest text-brand-grey-dark">
              {{ t('MODULES_SLIDEOVER_PRICE_LABEL', 'Price') }}
            </span>
            <span
              v-if="selectedModule.purchased"
              class="text-base font-bold uppercase tracking-widest text-brand-green"
            >
              {{ t('MODULES_SLIDEOVER_OWNED_TXT', 'Owned') }}
            </span>
            <span
              v-else
              class="font-serif text-3xl font-semibold text-brand-black"
            >
              {{ selectedModule.priceLabel ?? '' }}
            </span>
          </div>

          <div class="mt-auto pt-8">
            <UButton
              :label="selectedModule.purchased ? t('MODULES_SLIDEOVER_GO_TXT', 'Go to module') : t('MODULES_SLIDEOVER_BUY_TXT', 'Enrol in this module')"
              :loading="checkoutLoading === selectedModule.slug"
              variant="solid"
              color="primary"
              class="w-full justify-center"
              @click="onSlideoverAction"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
const { t } = useTags()

interface ModuleItem {
  id: number
  slug: string
  title: string
  cover: string | null
  description: string | null
  longDescription?: string | null
  isFullCourse: boolean
  priceCents?: number
  priceLabel?: string
  purchased: boolean
  locked: boolean
  completed?: boolean
  isNextStep: boolean
  redundant?: boolean
  bundleOriginalCents?: number
  bundleCreditCents?: number
  bundleEffectiveCents?: number
  bundleEffectiveLabel?: string
  bundleCreditFactor?: number
  bundleCreditModules?: { slug: string; title: string; priceCents: number; creditCents: number }[]
}

interface ModulesResponse {
  locale: string
  requiresLogin: boolean
  bundleMaxDiscountPercent?: number | null
  items: ModuleItem[]
}

const { isAuthenticated, openLoginModal } = useAuth()

const { data, pending, error } = await useFetch<ModulesResponse>('/api/modules', {
  credentials: 'include',
})

const requiresLogin = computed(() => data.value?.requiresLogin ?? !isAuthenticated.value)
const bundle = computed(() => data.value?.items.find((m) => m.isFullCourse) ?? null)
const regularModules = computed(() => data.value?.items.filter((m) => !m.isFullCourse) ?? [])

// "Has all access" covers the three cases where there is nothing
// left to sell to the user:
//   - Bought the bundle (purchased=true on the bundle item).
//   - Owns the 5 individual modules (bundle.redundant=true from the back).
//   - Owns the bundle AND earlier individual modules (falls into case 1).
const hasAllAccess = computed(() => {
  if (!bundle.value) return false
  return bundle.value.purchased || !!bundle.value.redundant
})

const pricingExplainer = computed(() => {
  const pct = data.value?.bundleMaxDiscountPercent ?? 25
  const tpl = t('BUNDLE_PRICING_EXPLAINER', 'Full Access never drops below {percent}% off the sum of the modules.')
  return tpl.replace('{percent}', String(pct))
})

// Copy explaining that the credit is proportional
// (price × (1 − maxDiscount/100)). Shown above the breakdown so the
// user understands why the subtraction is not the full module price.
const bundleCreditIntroText = computed(() => {
  const pct = data.value?.bundleMaxDiscountPercent ?? 25
  const paying = 100 - pct  // percentage of the price that is included
  const tpl = t(
    'BUNDLE_CREDIT_INTRO',
    'The credit is proportional: each module you already own takes {paying}% of its price off Full Access (the share that was actually included in the bundle).',
  )
  return tpl.replace('{paying}', String(paying)).replace('{discount}', String(pct))
})

const isOpen = ref(false)
const selectedModule = ref<ModuleItem | null>(null)
const checkoutLoading = ref<string | null>(null)
const bundleLoading = computed(() =>
  bundle.value ? checkoutLoading.value === bundle.value.slug : false,
)
const bundleDisplayPrice = computed(() => {
  if (!bundle.value) return ''
  return bundle.value.bundleEffectiveLabel ?? bundle.value.priceLabel ?? ''
})

function moduleDescription(module: ModuleItem): string {
  if (requiresLogin.value) return t('MODULES_LOCKED_DESC', 'Sign in or create an account to see details and price.')
  return module.description ?? ''
}

const bundleFeatures = computed(() => [
  { title: t('BUNDLE_FEATURE_UNLIMITED', 'Unlimited access to classes'), icon: 'i-lucide-infinity' },
  { title: t('BUNDLE_FEATURE_SUPPORT', 'Priority support'), icon: 'i-lucide-life-buoy' },
  { title: t('BUNDLE_FEATURE_CERT', 'Completion certificate'), icon: 'i-lucide-award' },
])

function moduleClasses(module: ModuleItem): string {
  if (module.purchased) return 'shadow-none bg-brand-white'
  if (module.isNextStep) return 'shadow-[0.5rem_0.5rem_0_0_var(--color-brand-orange),1rem_1rem_0_0_var(--color-brand-mustard)]'
  return ''
}

function primaryActionLabel(module: ModuleItem): string {
  if (module.purchased) return t('MODULES_PRIMARY_CONTINUE', 'Continue')
  if (module.isNextStep) return t('MODULES_PRIMARY_START_NOW', 'Start now')
  return t('MODULES_PRIMARY_BUY', 'Buy')
}

function primaryAction(module: ModuleItem) {
  if (module.purchased) {
    navigateTo(`/module_detail?slug=${module.slug}`)
  } else {
    startCheckout(module.slug)
  }
}

function openModule(module: ModuleItem) {
  selectedModule.value = module
  isOpen.value = true
}

function onSlideoverAction() {
  if (!selectedModule.value) return
  primaryAction(selectedModule.value)
}

async function startCheckout(slug: string) {
  if (!isAuthenticated.value) {
    openLoginModal()
    return
  }
  checkoutLoading.value = slug
  try {
    const res = await $fetch<{ url: string }>('/api/checkout/session', {
      method: 'POST',
      credentials: 'include',
      body: { moduleSlug: slug },
    })
    if (res?.url) window.location.href = res.url
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 401) {
      openLoginModal()
    } else if (status === 503) {
      alert(t('CHECKOUT_NOT_CONFIGURED', 'Payments are not configured yet. Contact support.'))
    } else {
      console.error('Checkout error', err)
    }
  } finally {
    checkoutLoading.value = null
  }
}
</script>
