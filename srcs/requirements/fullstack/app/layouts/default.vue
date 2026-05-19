<template>
  <div class="min-h-screen flex flex-col bg-brand-cream text-brand-grey-dark transition-colors duration-300 overflow-x-hidden">
    <UHeader
      :toggle="false"
      :ui="{
        root: 'bg-brand-orange border-none shadow-[0_8px_0_0] shadow-brand-green py-2 fixed w-full top-0 z-50 transition-all',
        container: 'max-w-full px-6 lg:px-[112px]'
      }"
    >
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2 mr-4 lg:mr-8">
          <img src="/white_logo.svg" class="h-8 lg:h-10 w-auto" alt="Logo" />
        </NuxtLink>

        <!-- Mobile-only nav cluster. On lg+ the same buttons live in
             the #default slot so they can animate between centered and
             left positions when the in-module progress bar appears. -->
        <NuxtLink
          v-if="!isHome && !isPrivacy"
          to="/"
          class="lg:hidden px-2 ml-2 py-1 text-sm font-medium transition-colors whitespace-nowrap text-brand-white hover:bg-brand-white hover:text-brand-orange"
        >
          {{ t('HEADER_HOME_TXT', 'Home') }}
        </NuxtLink>

        <NuxtLink
          v-if="!isHome && !isPrivacy"
          to="/modules"
          class="lg:hidden px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap"
          :class="activePath === '/modules' ? 'bg-brand-white text-brand-orange font-bold' : 'text-brand-white hover:bg-brand-white hover:text-brand-orange'"
        >
          {{ t('MODULE_LIST_TITLE', 'Modules') }}
        </NuxtLink>
      </template>

      <template #default>
        <nav v-if="isHome || isPrivacy" class="hidden lg:flex items-center gap-x-1 justify-center w-full">
          <NuxtLink
            v-for="link in homeNavigation"
            :key="link.label"
            :to="link.to"
            class="px-4 py-1 text-sm font-medium transition-colors whitespace-nowrap rounded-none flex-shrink-0 text-brand-white hover:bg-brand-white hover:text-brand-orange"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Off-home overlay. Anchored to the fixed header so absolute
             children can position across the full width of the
             container, not just inside the #default slot.
               · No progress: cluster sits centred over the header.
               · Progress active: cluster slides left until it lands
                 right next to the logo, while the progress bar fades
                 in centred.
             pointer-events-none on the wrapper lets clicks reach the
             lang switcher / user button living in #right; the cluster
             and progress restore pointer-events on themselves. -->
        <div
          v-if="!isHome && !isPrivacy"
          class="hidden lg:block absolute inset-x-0 inset-y-0 px-6 lg:px-[112px] pointer-events-none"
        >
          <div class="relative w-full h-full">
            <div
              class="absolute top-1/2 flex gap-1 nav-cluster pointer-events-auto"
              :class="[
                isInModule ? 'nav-cluster--shifted' : 'nav-cluster--centered',
                hydrated ? 'nav-cluster--animated' : '',
              ]"
            >
              <NuxtLink
                to="/"
                class="px-4 py-1 text-sm font-medium transition-colors whitespace-nowrap text-brand-white hover:bg-brand-white hover:text-brand-orange"
              >
                {{ t('HEADER_HOME_TXT', 'Home') }}
              </NuxtLink>
              <NuxtLink
                to="/modules"
                class="px-4 py-1 text-sm font-medium transition-colors whitespace-nowrap"
                :class="activePath === '/modules' ? 'bg-brand-white text-brand-orange font-bold' : 'text-brand-white hover:bg-brand-white hover:text-brand-orange'"
              >
                {{ t('MODULE_LIST_TITLE', 'Modules') }}
              </NuxtLink>
            </div>

            <transition name="header-progress" :css="hydrated">
              <div
                v-if="headerProgress"
                class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 text-brand-white pointer-events-auto"
              >
                <span class="text-xs uppercase tracking-widest font-bold">
                  {{ t('HEADER_PROGRESS_TXT', 'Progress') }}
                </span>
                <div class="relative flex items-center" style="width: 16rem;">
                  <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-white/40"></div>
                  <div
                    class="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-white transition-all"
                    :style="{ width: headerLineWidth }"
                  ></div>
                  <div
                    v-for="n in headerProgress.total"
                    :key="n"
                    class="header-diamond relative z-10"
                    :class="n <= headerProgress.current ? 'header-diamond--done' : 'header-diamond--pending'"
                    :style="headerDiamondStyle(n)"
                  >
                    <span class="header-diamond-inner"></span>
                  </div>
                </div>
                <span class="font-mono text-xs">
                  {{ headerProgress.current }}/{{ headerProgress.total }}
                </span>
              </div>
            </transition>
          </div>
        </div>
      </template>

      <template #right>
        <div v-if="isHome || isPrivacy" class="flex items-center gap-3 lg:gap-4 text-brand-white text-sm whitespace-nowrap">
          <LangSwitcher />
          <NuxtLink
            v-if="isAuthenticated"
            to="/profile"
            class="flex items-center gap-2 text-brand-white hover:bg-brand-white hover:text-brand-orange px-3 py-1"
          >
            <span class="hidden sm:inline">{{ user?.username }}</span>
            <UAvatar
              :src="avatarFor(user)"
              size="xs"
              class="ring-2 ring-brand-white !rounded-full overflow-hidden"
              :ui="{ root: '!rounded-full overflow-hidden', image: 'object-cover rounded-full' }"
            />
          </NuxtLink>
          <UButton
            v-else
            icon="i-heroicons-user"
            :label="t('HEADER_LOGIN_TXT', 'Sign in')"
            color="neutral"
            variant="ghost"
            class="text-brand-white hover:bg-brand-white hover:text-brand-orange"
            @click="openLogin"
          />
        </div>

        <div
          v-if="!isHome && !isPrivacy"
          class="mr-2 sm:mr-10 md:mr-18 lg:mr-28 flex items-center gap-3"
        >
          <LangSwitcher />
          <button
            type="button"
            class="flex items-center gap-2 px-2 lg:px-4 py-1 text-sm font-medium transition-colors whitespace-nowrap"
            :class="activePath === '/profile' ? 'bg-brand-white text-brand-orange font-bold' : 'text-brand-white hover:bg-brand-white hover:text-brand-orange'"
            @click="goProfileOrLogin"
          >
            <span class="hidden sm:inline">{{ isAuthenticated ? user?.username : t('HEADER_LOGIN_TXT', 'Sign in') }}</span>
            <UAvatar
              :src="avatarFor(user)"
              size="xs"
              class="ring-2 ring-brand-white"
              :ui="{ root: 'rounded-full overflow-hidden', image: 'object-cover' }"
            />
          </button>
        </div>
      </template>
    </UHeader>

    <UModal v-model:open="isLoginModalOpen" :ui="{ content: 'sm:max-w-md rounded-none border-none p-0 overflow-hidden' }">
      <template #content>
        <div class="bg-brand-white p-8 lg:p-12 flex flex-col items-center w-full">
          <!-- Step 1: credentials -->
          <template v-if="step === 'credentials'">
            <h2 class="text-5xl font-serif text-brand-black mb-2 text-center">
              {{ mode === 'login' ? t('MODAL_LOGIN_TITLE', 'Sign in') : t('MODAL_REGISTER_TITLE', 'Create account') }}
            </h2>
            <p class="text-sm text-brand-grey-dark mb-8 text-center">
              {{ mode === 'login' ? t('MODAL_LOGIN_SUBTITLE', 'Access your progress and classes.') : t('MODAL_REGISTER_SUBTITLE', 'Join us to access the modules.') }}
            </p>

            <a
              v-if="googleOAuthEnabled"
              href="/api/auth/google"
              class="w-full inline-flex items-center justify-center gap-3 py-3 rounded-full border border-brand-grey-light bg-brand-white text-brand-black shadow-sm hover:bg-brand-cream mb-6 font-medium transition-colors"
            >
              <UIcon name="i-lucide-chrome" class="w-5 h-5" />
              {{ mode === 'login' ? t('MODAL_GOOGLE_LOGIN_TXT', 'Continue with Google') : t('MODAL_GOOGLE_REGISTER_TXT', 'Sign up with Google') }}
            </a>

            <div v-if="googleOAuthEnabled" class="flex items-center w-full gap-4 mb-6">
              <div class="flex-1 h-px bg-brand-grey-light"></div>
              <span class="text-sm text-brand-grey-dark uppercase tracking-widest font-semibold">{{ t('MODAL_DIVIDER_OR', 'or') }}</span>
              <div class="flex-1 h-px bg-brand-grey-light"></div>
            </div>

            <form class="w-full space-y-5" @submit.prevent="onCredentialsSubmit">
              <div v-if="mode === 'register'" class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('MODAL_USERNAME_LABEL', 'Username') }}</label>
                <UInput
                  v-model="form.username"
                  :placeholder="t('MODAL_USERNAME_PLACEHOLDER', 'Your username')"
                  size="lg"
                  autocomplete="username"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                  required
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('MODAL_EMAIL_LABEL', 'Email') }}</label>
                <UInput
                  v-model="form.email"
                  type="email"
                  :placeholder="t('MODAL_LOGIN_EMAIL_INPUT_TXT', 'you@email.com')"
                  size="lg"
                  autocomplete="email"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                  required
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('MODAL_PASSWORD_LABEL', 'Password') }}</label>
                <UInput
                  v-model="form.password"
                  type="password"
                  :placeholder="mode === 'login' ? t('MODAL_LOGIN_PASSWORD_INPUT_TXT', '••••••••') : t('MODAL_REGISTER_PASSWORD_INPUT_TXT', '••••••••')"
                  size="lg"
                  :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                  required
                />
                <p v-if="mode === 'register'" class="text-xs text-brand-grey-dark">{{ t('MODAL_PASSWORD_HINT', 'At least 8 characters.') }}</p>
              </div>

              <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

              <UButton
                type="submit"
                :label="mode === 'login' ? t('MODAL_LOGIN_BUTTON_TXT', 'Sign in') : t('MODAL_REGISTER_BUTTON_TXT', 'Create account')"
                block
                size="lg"
                :loading="submitting"
                class="font-bold uppercase tracking-widest py-4 rounded-full justify-center"
              />
            </form>

            <div class="mt-5 flex flex-col items-center gap-1 text-xs text-brand-grey-dark text-center">
              <p>
                {{ mode === 'login' ? t('MODAL_SWITCH_TO_REGISTER_PROMPT', "Don't have an account?") : t('MODAL_SWITCH_TO_LOGIN_PROMPT', 'Already have an account?') }}
                <button
                  type="button"
                  class="underline hover:text-brand-orange ml-1 font-semibold"
                  @click="toggleMode"
                >
                  {{ mode === 'login' ? t('MODAL_REGISTER_TITLE', 'Create account') : t('MODAL_LOGIN_TITLE', 'Sign in') }}
                </button>
              </p>
              <button
                v-if="mode === 'login'"
                type="button"
                class="underline hover:text-brand-orange"
                @click="goRecovery"
              >
                {{ t('MODAL_FORGOT_PASSWORD_TXT', 'Forgot your password?') }}
              </button>
              <NuxtLink to="/privacy" class="mt-3 underline hover:text-brand-orange" @click="isLoginModalOpen = false">
                {{ mode === 'login' ? t('MODAL_LOGIN_AGREEMENT_TXT', 'By signing in, you agree to our Terms.') : t('MODAL_REGISTER_AGREEMENT_TXT', 'By signing up, you agree to our Terms.') }}
              </NuxtLink>
            </div>
          </template>

          <!-- Recovery: single panel with email + code in the same view -->
          <template v-else-if="step === 'recovery_request'">
            <h2 class="text-5xl font-serif text-brand-black mb-2 text-center">
              {{ t('MODAL_RECOVERY_TITLE', 'Recover your password') }}
            </h2>
            <p class="text-sm text-brand-grey-dark mb-8 text-center">
              {{ t('MODAL_RECOVERY_INTRO', 'Enter your account email. We will send you a 6-digit code.') }}
            </p>
            <form class="w-full space-y-5" @submit.prevent="onRecoveryStep">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('MODAL_EMAIL_LABEL', 'Email') }}</label>
                <div class="flex gap-2">
                  <UInput
                    v-model="recoveryEmail"
                    type="email"
                    size="lg"
                    autocomplete="email"
                    class="flex-1"
                    :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                    :disabled="emailLocked"
                    required
                  />
                  <UButton
                    v-if="challenge && recoveryEmailCooldownSec === 0"
                    type="button"
                    :label="t('MODAL_RECOVERY_CHANGE_EMAIL_TXT', 'Change')"
                    size="lg"
                    variant="outline"
                    color="neutral"
                    class="justify-center"
                    @click="unlockEmail"
                  />
                </div>
                <p v-if="recoveryEmailCooldownSec > 0" class="text-xs text-brand-grey-dark">
                  {{ emailCooldownLabel }}
                </p>
              </div>

              <div v-if="challenge" class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black text-center">{{ t('MODAL_VERIFY_CODE_LABEL', 'Code') }}</label>
                <UInput
                  v-model="codeInput"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  size="lg"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard text-center font-mono text-2xl tracking-widest' }"
                  placeholder="••••••"
                  required
                />
                <p class="text-xs text-brand-grey-dark text-center">
                  {{ t('MODAL_VERIFY_HINT', 'Expires in 10 minutes. Check spam too.') }}
                </p>
              </div>

              <p v-if="errorMsg" class="text-sm text-red-600 text-center">{{ errorMsg }}</p>
              <p v-if="resendMsg" class="text-sm text-brand-green text-center">{{ resendMsg }}</p>

              <UButton
                type="submit"
                :label="recoveryStepButtonLabel"
                block
                size="lg"
                :loading="submitting"
                class="font-bold uppercase tracking-widest py-4 rounded-full justify-center"
              />
            </form>

            <div v-if="challenge" class="mt-6 flex flex-col items-center gap-2 text-xs text-brand-grey-dark">
              <button
                type="button"
                class="underline hover:text-brand-orange disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="resending || resendCooldownSec > 0"
                @click="onResend"
              >
                {{ resendButtonLabel }}
              </button>
              <button type="button" class="underline hover:text-brand-orange" @click="backToCredentials">
                {{ t('MODAL_BACK_BUTTON_TXT', 'Back') }}
              </button>
            </div>
            <p v-else class="mt-6 text-xs text-center">
              <button type="button" class="underline text-brand-grey-dark hover:text-brand-orange" @click="backToCredentials">
                {{ t('MODAL_BACK_BUTTON_TXT', 'Back') }}
              </button>
            </p>
          </template>

          <!-- Recovery final: new password only (email + code already validated above) -->
          <template v-else-if="step === 'recovery_new_password'">
            <h2 class="text-5xl font-serif text-brand-black mb-2 text-center">
              {{ t('MODAL_RECOVERY_RESET_TITLE', 'New password') }}
            </h2>
            <p class="text-sm text-brand-grey-dark mb-6 text-center">
              {{ t('MODAL_RECOVERY_RESET_INTRO', 'Enter your new password twice to finish.') }}
            </p>
            <form class="w-full space-y-5" @submit.prevent="onRecoveryFinalize">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('PWD_NEW_LABEL', 'New password') }}</label>
                <UInput
                  v-model="recoveryNew"
                  type="password"
                  size="lg"
                  autocomplete="new-password"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                  required
                />
                <p class="text-xs text-brand-grey-dark">{{ t('MODAL_PASSWORD_HINT', 'At least 8 characters.') }}</p>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('PWD_CONFIRM_LABEL', 'Confirm new') }}</label>
                <UInput
                  v-model="recoveryConfirm"
                  type="password"
                  size="lg"
                  autocomplete="new-password"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                  required
                />
              </div>
              <p v-if="errorMsg" class="text-sm text-red-600 text-center">{{ errorMsg }}</p>
              <UButton
                type="submit"
                :label="t('MODAL_RECOVERY_CONFIRM_BUTTON', 'Change password')"
                block
                size="lg"
                :loading="submitting"
                class="font-bold uppercase tracking-widest py-4 rounded-full justify-center"
              />
            </form>
            <p class="mt-6 text-xs text-center">
              <button type="button" class="underline text-brand-grey-dark hover:text-brand-orange" @click="backToCredentials">
                {{ t('MODAL_BACK_BUTTON_TXT', 'Back') }}
              </button>
            </p>
          </template>

          <!-- Step 2: emailed code -->
          <template v-else>
            <h2 class="text-5xl font-serif text-brand-black mb-2 text-center">
              {{ mode === 'login' ? t('MODAL_VERIFY_LOGIN_TITLE', 'Verify the code') : t('MODAL_VERIFY_REGISTER_TITLE', 'Activate your account') }}
            </h2>
            <p class="text-sm text-brand-grey-dark mb-2 text-center">
              {{ t('MODAL_VERIFY_SENT_TXT', 'We sent you a 6-digit code to') }}
            </p>
            <p class="text-sm font-semibold text-brand-black mb-8 text-center break-all">{{ challenge?.email }}</p>

            <form class="w-full space-y-5" @submit.prevent="onCodeSubmit">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-widest text-brand-black text-center">{{ t('MODAL_VERIFY_CODE_LABEL', 'Code') }}</label>
                <UInput
                  v-model="codeInput"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  size="lg"
                  :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard text-center font-mono text-2xl tracking-widest' }"
                  placeholder="••••••"
                  required
                />
                <p class="text-xs text-brand-grey-dark text-center">{{ t('MODAL_VERIFY_HINT', 'Expires in 10 minutes. Check spam too.') }}</p>
              </div>

              <p v-if="errorMsg" class="text-sm text-red-600 text-center">{{ errorMsg }}</p>
              <p v-if="resendMsg" class="text-sm text-brand-green text-center">{{ resendMsg }}</p>

              <UButton
                type="submit"
                :label="t('MODAL_VERIFY_BUTTON_TXT', 'Verify')"
                block
                size="lg"
                :loading="submitting"
                class="font-bold uppercase tracking-widest py-4 rounded-full justify-center"
              />
            </form>

            <div class="mt-6 flex flex-col items-center gap-2 text-xs text-brand-grey-dark">
              <button
                type="button"
                class="underline hover:text-brand-orange disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="resending || resendCooldownSec > 0"
                @click="onResend"
              >
                {{ resendButtonLabel }}
              </button>
              <button
                type="button"
                class="underline hover:text-brand-orange"
                @click="backToCredentials"
              >
                {{ t('MODAL_BACK_BUTTON_TXT', 'Back') }}
              </button>
            </div>
          </template>
        </div>
      </template>
    </UModal>

    <main class="flex-1 flex flex-col pt-16 lg:pt-20">
      <slot />
    </main>

    <AppFooter class="mt-auto" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const {
  user,
  isAuthenticated,
  startLogin,
  verifyLogin,
  startRegister,
  verifyRegister,
  resendCode,
  startRecovery,
  verifyRecoveryCode,
  finalizeRecovery,
  modalOpen,
} = useAuth()
const { t } = useTags()
const moduleProgress = useModuleProgress()

// Public config flags — used to hide UI for features that are not
// wired up in this environment (e.g. Google OAuth without
// GOOGLE_CLIENT_ID). The endpoint is cached for the lifetime of the
// app via useState since the values do not change at runtime.
interface AppConfig {
  googleOAuthEnabled: boolean
  stripeEnabled: boolean
  vimeoEnabled: boolean
  mailEnabled: boolean
}
const { data: appConfig } = await useFetch<AppConfig>('/api/config', {
  key: 'app.config',
  default: () => ({
    googleOAuthEnabled: false,
    stripeEnabled: false,
    vimeoEnabled: false,
    mailEnabled: false,
  }),
})
const googleOAuthEnabled = computed(() => appConfig.value?.googleOAuthEnabled ?? false)

// True for /module_detail and /lesson. Computed from `route.path`
// alone so the value is identical on SSR and on the client — this
// drives the nav cluster's position (shifted vs centred) so the
// position is correct on the first paint, before any localStorage
// data is hydrated. Without this, reloading inside a module (e.g.
// after a locale change) would render the cluster centred during
// SSR and then animate it left once `headerProgress` populates.
const isInModule = computed(
  () => route.path === '/module_detail' || route.path === '/lesson',
)

// Suppresses header animations during the first paint of the page so
// any state that materialises during hydration (progress data from
// localStorage, for instance) does NOT trigger a visible transition.
// Flipped to true after the first frame; subsequent genuine state
// changes animate as expected.
const hydrated = ref(false)
onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      hydrated.value = true
    })
  })
})

// Progress bar shown in the header while inside a module
// (module_detail) or a lesson. Reads the slug from the query string
// and the state from the composable; `level` is kept in sync from
// lesson.vue and from clicks on the diamonds inside module_detail.
const headerProgress = computed(() => {
  if (route.path !== '/module_detail' && route.path !== '/lesson') return null
  const slug = String(route.query.slug ?? route.query.module ?? '')
  if (!slug) return null
  const p = moduleProgress.getProgress(slug)
  if (!p || p.totalLevels === 0) return null
  return {
    current: p.level,
    total: p.totalLevels,
    percent: Math.round((p.level / p.totalLevels) * 100),
  }
})

const headerLineWidth = computed(() => {
  const hp = headerProgress.value
  if (!hp || hp.total <= 1 || hp.current <= 0) return '0%'
  const capped = Math.min(hp.current, hp.total)
  return `${(capped - 1) * (100 / (hp.total - 1))}%`
})

// Distributes the diamonds across the full width of the header bar.
// Absolute positioning via `left: X%` so the first one sits at the
// start and the last one at the end, mirroring the big bar.
function headerDiamondStyle(n: number): Record<string, string> {
  const total = headerProgress.value?.total ?? 1
  if (total <= 1) return { left: '0%' }
  const left = ((n - 1) / (total - 1)) * 100
  return {
    position: 'absolute',
    left: `${left}%`,
    transform: 'translateX(-50%)',
  }
}

const isLoginModalOpen = modalOpen
const mode = ref<'login' | 'register'>('login')
// Step persisted in useState so it survives closing the modal: if the
// user requested a code and closes the modal by mistake, reopening it
// resumes the same step with the same challengeId.
type Step = 'credentials' | 'code' | 'recovery_request' | 'recovery_new_password'
const step = useState<Step>('auth.modal.step', () => 'credentials')
const submitting = ref(false)
const resending = ref(false)
const errorMsg = ref<string | null>(null)
const resendMsg = ref<string | null>(null)
const form = reactive({ email: '', username: '', password: '' })
const codeInput = ref('')
const recoveryEmail = ref('')
const recoveryNew = ref('')
const recoveryConfirm = ref('')

interface Challenge {
  challengeId: string
  email: string
  expiresAt: string
  resendAvailableAt: string
  // 'code' = login/register, 'recovery_request' = recovery (code in same panel)
  step: 'code' | 'recovery_request'
  // Only meaningful when step === 'code'
  mode: 'login' | 'register'
  // Cooldown before the user can change the recovery challenge email
  // again. When a new challenge is issued we lock the email field for
  // this window to prevent abusing the account lookup.
  emailChangeAvailableAt?: string
}

// Ticket issued by /password-recovery/verify-code and consumed by
// /password-recovery/verify. Persisted in localStorage so the user
// can close and reopen the panel without losing progress.
interface RecoveryTicket {
  ticket: string
  expiresAt: string
}

const STORAGE_KEY = 'auth.modal.challenge.v2'
const TICKET_STORAGE_KEY = 'auth.modal.recovery-ticket.v1'

// The challenge lives in useState so it survives closing the modal and
// is synced to localStorage so it survives a reload. The persistence
// has an automatic TTL: in onMounted we discard any challenge whose
// expiresAt has already passed.
const challenge = useState<Challenge | null>('auth.modal.challenge', () => null)
const recoveryTicket = useState<RecoveryTicket | null>('auth.modal.recovery-ticket', () => null)
// Email-change cooldown on the recovery panel (1 min). Starts when
// the back end accepts an email and issues a challenge — prevents an
// attacker from iterating emails to discover accounts.
const EMAIL_CHANGE_COOLDOWN_SEC = 60
const emailLocked = ref(false)

// Global tick every second so all counters (resend cooldown, code
// expiry) refresh without needing a per-component timer.
const now = ref(Date.now())
let tickHandle: ReturnType<typeof setInterval> | null = null

const resendCooldownSec = computed(() => {
  if (!challenge.value) return 0
  const target = Date.parse(challenge.value.resendAvailableAt)
  if (Number.isNaN(target)) return 0
  return Math.max(0, Math.ceil((target - now.value) / 1000))
})

const resendButtonLabel = computed(() => {
  if (resending.value) return t('MODAL_RESEND_LOADING_TXT', 'Resending…')
  if (resendCooldownSec.value > 0) {
    const sec = resendCooldownSec.value
    return t('MODAL_RESEND_COOLDOWN_TXT', `You can resend in ${sec}s`).replace('{seconds}', String(sec))
  }
  return t('MODAL_RESEND_BUTTON_TXT', 'Resend code')
})

const recoveryEmailCooldownSec = computed(() => {
  if (!challenge.value?.emailChangeAvailableAt) return 0
  const target = Date.parse(challenge.value.emailChangeAvailableAt)
  if (Number.isNaN(target)) return 0
  return Math.max(0, Math.ceil((target - now.value) / 1000))
})

const emailCooldownLabel = computed(() => {
  const sec = recoveryEmailCooldownSec.value
  return t('MODAL_RECOVERY_EMAIL_COOLDOWN_TXT', `You can change the email in ${sec}s`)
    .replace('{seconds}', String(sec))
})

const recoveryStepButtonLabel = computed(() => {
  if (!challenge.value) return t('MODAL_RECOVERY_SEND_BUTTON', 'Send code')
  return t('MODAL_RECOVERY_VERIFY_BUTTON', 'Verify and continue')
})

function persistChallenge(ch: Challenge | null) {
  if (import.meta.server) return
  try {
    if (ch) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ch))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* localStorage can fail (private mode, quota) — the flow falls
       back to "memory only", which is acceptable. */
  }
}

function loadPersistedChallenge(): Challenge | null {
  if (import.meta.server) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Challenge
    if (!parsed?.expiresAt || Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function setChallenge(ch: Challenge | null) {
  challenge.value = ch
  persistChallenge(ch)
}

function persistRecoveryTicket(tk: RecoveryTicket | null) {
  if (import.meta.server) return
  try {
    if (tk) window.localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(tk))
    else window.localStorage.removeItem(TICKET_STORAGE_KEY)
  } catch { /* noop */ }
}

function loadPersistedTicket(): RecoveryTicket | null {
  if (import.meta.server) return null
  try {
    const raw = window.localStorage.getItem(TICKET_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RecoveryTicket
    if (!parsed?.expiresAt || Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(TICKET_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function setRecoveryTicket(tk: RecoveryTicket | null) {
  recoveryTicket.value = tk
  persistRecoveryTicket(tk)
}

function hasLiveTicket(): boolean {
  if (!recoveryTicket.value) return false
  const exp = Date.parse(recoveryTicket.value.expiresAt)
  if (Number.isNaN(exp)) return false
  return exp > Date.now()
}

const activePath = computed(() => route.path)
const isHome = computed(() => route.path === '/')
const isPrivacy = computed(() => route.path === '/privacy')

const homeNavigation = computed(() => [
  { label: t('HEADER_TXT_1', 'Method'), to: isHome.value ? '#metodo' : '/#metodo' },
  { label: t('HEADER_TXT_2', 'Marco'), to: isHome.value ? '#Marco' : '/#Marco' },
  { label: t('HEADER_TXT_3', 'Reviews'), to: isHome.value ? '#resenas' : '/#resenas' },
  { label: t('HEADER_TXT_4', 'Live classes'), to: isHome.value ? '#directo' : '/#directo' },
  { label: t('HEADER_TXT_5', 'Yoga classes'), to: isHome.value ? '#clases' : '/#clases' },
  { label: t('HEADER_FAQ_TXT', 'FAQ'), to: isHome.value ? '#faq' : '/#faq' },
])

function openLogin() {
  errorMsg.value = null
  resendMsg.value = null
  // If there is a live recovery ticket, go straight to "new password".
  // If there is a live challenge, go to its matching panel. Otherwise
  // default to the credentials form.
  if (hasLiveTicket()) {
    step.value = 'recovery_new_password'
  } else if (hasLiveChallenge() && challenge.value) {
    step.value = challenge.value.step
    if (challenge.value.step === 'code') mode.value = challenge.value.mode
    if (challenge.value.step === 'recovery_request') {
      recoveryEmail.value = challenge.value.email
      emailLocked.value = recoveryEmailCooldownSec.value > 0
    }
  } else {
    mode.value = 'login'
    step.value = 'credentials'
  }
  isLoginModalOpen.value = true
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMsg.value = null
}

function resetForm() {
  form.email = ''
  form.username = ''
  form.password = ''
  errorMsg.value = null
  codeInput.value = ''
  setChallenge(null)
  setRecoveryTicket(null)
  emailLocked.value = false
  resendMsg.value = null
  recoveryEmail.value = ''
  recoveryNew.value = ''
  recoveryConfirm.value = ''
}

// "Back" returns to the credentials step WITHOUT discarding the
// challenge. Rationale: a user who hit back may have done so by
// mistake; while the challenge is still alive (10 min), reopening
// the modal takes them back to the code panel. To actively discard
// it they start the flow again, which creates a new challenge and
// overwrites the persisted one.
function backToCredentials() {
  step.value = 'credentials'
  mode.value = 'login'
  errorMsg.value = null
  codeInput.value = ''
  resendMsg.value = null
  recoveryNew.value = ''
  recoveryConfirm.value = ''
}

function goRecovery() {
  errorMsg.value = null
  resendMsg.value = null
  // If a ticket is already alive, go straight to the new-password panel.
  if (hasLiveTicket()) {
    step.value = 'recovery_new_password'
    return
  }
  // If a recovery challenge is alive, reuse its email.
  if (hasLiveChallenge() && challenge.value?.step === 'recovery_request') {
    recoveryEmail.value = challenge.value.email
    emailLocked.value = recoveryEmailCooldownSec.value > 0
    step.value = 'recovery_request'
    return
  }
  step.value = 'recovery_request'
  recoveryEmail.value = form.email
  emailLocked.value = false
}

function unlockEmail() {
  emailLocked.value = false
  errorMsg.value = null
  resendMsg.value = null
}

// Submit handler for the unified email+code panel. Without an active
// challenge (first attempt or after the user changed the email), it
// requests a code. With a live challenge and a typed code, it verifies
// and moves to the "New password" panel. Backed by two distinct
// endpoints under the hood.
async function onRecoveryStep() {
  if (!challenge.value || !emailLocked.value) {
    // Phase A: request a code for this email
    if (!recoveryEmail.value.trim()) {
      errorMsg.value = t('MODAL_RECOVERY_EMAIL_REQUIRED', 'Enter your email.')
      return
    }
    submitting.value = true
    errorMsg.value = null
    resendMsg.value = null
    try {
      const ch = await startRecovery(recoveryEmail.value)
      setChallenge({
        challengeId: ch.challengeId,
        email: ch.email,
        expiresAt: ch.expiresAt,
        resendAvailableAt: ch.resendAvailableAt,
        emailChangeAvailableAt: new Date(Date.now() + EMAIL_CHANGE_COOLDOWN_SEC * 1000).toISOString(),
        step: 'recovery_request',
        mode: 'login',
      })
      emailLocked.value = true
      codeInput.value = ''
    } catch (err) {
      errorMsg.value = describeError(err, t('MODAL_RECOVERY_GENERIC_ERROR', 'Could not start recovery.'))
    } finally {
      submitting.value = false
    }
    return
  }

  // Phase B: validate code → ticket → new-password panel
  if (!/^\d{6}$/.test(codeInput.value)) {
    errorMsg.value = t('MODAL_VERIFY_CODE_INVALID', 'Enter the 6-digit code.')
    return
  }
  submitting.value = true
  errorMsg.value = null
  try {
    const t1 = await verifyRecoveryCode(challenge.value.challengeId, codeInput.value)
    setRecoveryTicket({ ticket: t1.ticket, expiresAt: t1.expiresAt })
    setChallenge(null)
    emailLocked.value = false
    codeInput.value = ''
    step.value = 'recovery_new_password'
  } catch (err) {
    errorMsg.value = describeError(err, t('MODAL_VERIFY_GENERIC_ERROR', 'Wrong code.'))
  } finally {
    submitting.value = false
  }
}

async function onRecoveryFinalize() {
  if (!hasLiveTicket() || !recoveryTicket.value) {
    errorMsg.value = t('MODAL_RECOVERY_TICKET_EXPIRED', 'Verification expired. Start again.')
    step.value = 'recovery_request'
    return
  }
  if (recoveryNew.value.length < 8) {
    errorMsg.value = t('PWD_ERROR_TOO_SHORT', 'The new password must have at least 8 characters.')
    return
  }
  if (recoveryNew.value !== recoveryConfirm.value) {
    errorMsg.value = t('PWD_ERROR_MISMATCH', 'The confirmation does not match.')
    return
  }
  submitting.value = true
  errorMsg.value = null
  try {
    await finalizeRecovery(recoveryTicket.value.ticket, recoveryNew.value, recoveryConfirm.value)
    isLoginModalOpen.value = false
    resetForm()
    await navigateTo('/modules')
  } catch (err) {
    errorMsg.value = describeError(err, t('MODAL_RECOVERY_FINALIZE_ERROR', 'Could not change the password.'))
  } finally {
    submitting.value = false
  }
}

function describeError(err: unknown, fallback: string): string {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string; message?: string }; message?: string }
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || e?.message || fallback
}

async function onCredentialsSubmit() {
  // If there is already a live challenge for this same (email, mode),
  // skip calling the back end again — the previous code is still
  // valid and the resend cooldown prevents spam. Jump straight to the
  // code panel.
  if (
    hasLiveChallenge()
    && challenge.value?.step === 'code'
    && challenge.value.mode === mode.value
    && challenge.value.email.toLowerCase() === form.email.trim().toLowerCase()
  ) {
    errorMsg.value = null
    step.value = 'code'
    return
  }

  submitting.value = true
  errorMsg.value = null
  try {
    const ch = mode.value === 'login'
      ? await startLogin(form.email, form.password)
      : await startRegister(form.email, form.username, form.password)
    setChallenge({
      challengeId: ch.challengeId,
      email: ch.email,
      expiresAt: ch.expiresAt,
      resendAvailableAt: ch.resendAvailableAt,
      step: 'code',
      mode: mode.value,
    })
    step.value = 'code'
  } catch (err) {
    errorMsg.value = describeError(
      err,
      mode.value === 'login'
        ? t('MODAL_LOGIN_GENERIC_ERROR', 'Could not sign in.')
        : t('MODAL_REGISTER_GENERIC_ERROR', 'Could not create account.'),
    )
  } finally {
    submitting.value = false
  }
}

async function onCodeSubmit() {
  if (!challenge.value) return
  submitting.value = true
  errorMsg.value = null
  resendMsg.value = null
  try {
    if (mode.value === 'login') {
      await verifyLogin(challenge.value.challengeId, codeInput.value)
    } else {
      await verifyRegister(challenge.value.challengeId, codeInput.value)
    }
    isLoginModalOpen.value = false
    resetForm()
    await navigateTo('/modules')
  } catch (err) {
    errorMsg.value = describeError(err, t('MODAL_VERIFY_GENERIC_ERROR', 'Wrong code.'))
  } finally {
    submitting.value = false
  }
}

async function onResend() {
  if (!challenge.value) return
  if (resendCooldownSec.value > 0) return
  resending.value = true
  resendMsg.value = null
  errorMsg.value = null
  try {
    const newAvailableAt = await resendCode(challenge.value.challengeId, challenge.value.email)
    // Reset the counter locally + extend expiry by 10 min (the back
    // end does the same).
    setChallenge({
      ...challenge.value,
      resendAvailableAt: newAvailableAt,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    resendMsg.value = t('MODAL_RESEND_OK_TXT', 'Code resent. Check your email.')
  } catch (err) {
    errorMsg.value = describeError(err, t('MODAL_RESEND_ERROR_TXT', 'Could not resend code.'))
  } finally {
    resending.value = false
  }
}

// When the modal closes, if a challenge or ticket is still alive we
// do NOT reset: the next time the user opens it they land back on
// the same step.
watch(isLoginModalOpen, (open) => {
  if (!open && !hasLiveChallenge() && !hasLiveTicket()) {
    step.value = 'credentials'
    resetForm()
  }
})

// Rehydration on mount: load any persisted challenge / ticket that is
// still alive (survives reloads and tab close/open). Expired ones are
// cleaned up.
onMounted(() => {
  const persistedTicket = loadPersistedTicket()
  if (persistedTicket) {
    recoveryTicket.value = persistedTicket
    step.value = 'recovery_new_password'
  } else {
    const persisted = loadPersistedChallenge()
    if (persisted) {
      challenge.value = persisted
      step.value = persisted.step
      if (persisted.step === 'code') mode.value = persisted.mode
      if (persisted.step === 'recovery_request') {
        recoveryEmail.value = persisted.email
        emailLocked.value = !!persisted.emailChangeAvailableAt
          && Date.parse(persisted.emailChangeAvailableAt) > Date.now()
      }
    } else if (!hasLiveChallenge()) {
      challenge.value = null
      if (step.value !== 'credentials') step.value = 'credentials'
    }
  }
  tickHandle = setInterval(() => { now.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  if (tickHandle) clearInterval(tickHandle)
})

function hasLiveChallenge(): boolean {
  if (!challenge.value) return false
  const exp = Date.parse(challenge.value.expiresAt)
  if (Number.isNaN(exp)) return false
  return exp > Date.now()
}

function goProfileOrLogin() {
  if (isAuthenticated.value) {
    navigateTo('/profile')
  } else {
    openLogin()
  }
}
</script>

<style scoped>
/* Small header diamond: same visual language as the module_detail bar
   but smaller (14px) so it fits between the logo and the right-hand
   elements without crowding them. The diamonds are NOT transparent —
   pending ones use the header orange as fill to cover the line that
   runs underneath them. */
.header-diamond {
  width: 14px;
  height: 14px;
}
.header-diamond-inner {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(45deg);
  border: 2px solid var(--color-brand-white);
  background: var(--color-brand-orange);
  transition: background 0.15s ease;
}
.header-diamond--done .header-diamond-inner {
  background: var(--color-brand-white);
}

/* Nav cluster animation. Both `left` and `transform` are transitioned
   so the cluster glides smoothly between the centre of the header and
   a position right next to the logo. The shifted offset (~9rem) covers
   the logo width (164×62 viewBox rendered at h-10 = ~106 px) plus the
   logo wrapper's right margin (mr-8 = 32 px).
   The transition only kicks in once the layout has marked itself as
   hydrated (`.nav-cluster--animated`). On first paint (SSR → hydrate,
   or full page reload after a locale change) the cluster snaps to the
   correct position without animating. */
.nav-cluster--centered {
  left: 50%;
  transform: translate(-50%, -50%);
}
.nav-cluster--shifted {
  left: 9rem;
  transform: translateY(-50%);
}
.nav-cluster--animated {
  transition: left 500ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .nav-cluster--animated {
    transition: none;
  }
}
</style>
