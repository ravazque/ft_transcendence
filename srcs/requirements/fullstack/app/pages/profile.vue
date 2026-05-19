<template>
  <div class="py-20 px-6 lg:px-28">
    <div v-if="!user" class="max-w-md mx-auto text-center py-20">
      <h1 class="text-4xl font-serif text-brand-black mb-4">{{ t('PROFILE_GUEST_TITLE', 'Restricted access') }}</h1>
      <p class="text-brand-grey-dark mb-8">{{ t('PROFILE_GUEST_TXT', 'Sign in to see your profile and your progress.') }}</p>
      <UButton :label="t('PROFILE_GUEST_BUTTON_TXT', 'Sign in')" class="justify-center" @click="openLoginModal" />
    </div>

    <div v-else class="max-w-4xl mx-auto flex flex-col gap-12">

      <div class="p-8 flex flex-col items-center text-center">
        <UAvatar
          :src="avatarFor(user)"
          size="2xl"
          class="w-32 h-32 mb-4 !rounded-full overflow-hidden"
          :alt="user.username"
          :ui="{ root: '!rounded-full overflow-hidden', image: 'object-cover rounded-full' }"
        />
        <h2 class="text-5xl font-serif text-brand-black mb-2">{{ user.username }}</h2>
        <p class="text-brand-grey-dark">{{ user.email }}</p>
        <p class="text-xs text-brand-grey-dark mt-2">{{ t('PROFILE_MEMBER_SINCE', 'Member since') }} {{ memberSince }}</p>
      </div>

      <div
        v-if="globalToast"
        class="border-l-4 px-4 py-3 text-sm"
        :class="globalToastClass"
        role="status"
      >
        {{ globalToast }}
      </div>

      <div class="bg-brand-white p-8 shadow-[0.5rem_0.5rem_0_0_var(--color-brand-mustard),1rem_1rem_0_0_var(--color-brand-green)]">
        <h3 class="text-4xl font-serif text-brand-black mb-6">{{ t('PROFILE_PROGRESS_TITLE', 'Module progress') }}</h3>
        <div v-if="purchasesPending" class="text-brand-grey-dark">{{ t('PROFILE_LOADING', 'Loading…') }}</div>
        <div v-else-if="!purchases.length" class="text-center py-8">
          <UIcon name="i-heroicons-academic-cap" class="w-12 h-12 text-brand-grey-light mx-auto mb-4" />
          <p class="text-brand-grey-dark mb-4">{{ t('PROFILE_NO_MODULES_TXT', 'You have not bought any module yet.') }}</p>
          <UButton :label="t('PROFILE_NO_MODULES_BUTTON_TXT', 'Explore modules')" to="/modules" class="justify-center" />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <UPageCard
            v-for="(p, index) in purchases"
            :key="p.id"
            :title="p.title"
            :description="cardDescription(p)"
            class="card-hover stagger-fade cursor-pointer"
            :style="{ animationDelay: `${index * 60}ms` }"
            :ui="{ root: p.isFullCourse
              ? 'bg-brand-teal/15 shadow-[0.35rem_0.35rem_0_0_var(--color-brand-teal)]'
              : 'shadow-[0.25rem_0.25rem_0_0_var(--color-brand-green)]' }"
            @click="navigateTo(`/module_detail?slug=${p.slug}`)"
          />
        </div>
      </div>

      <div v-if="!ownsEverything" class="bg-brand-yellow p-8 text-center border-2 border-brand-yellow">
        <h3 class="text-4xl font-serif text-brand-black mb-4">{{ t('PROFILE_UPSELL_TITLE', 'Unlock all the content!') }}</h3>
        <p class="text-brand-grey-dark mb-6">
          {{ t('PROFILE_UPSELL_TXT', 'Get unlimited access to all modules, live classes and premium resources.') }}
        </p>
        <UButton :label="t('PROFILE_UPSELL_BUTTON_TXT', 'See plans')" to="/modules" color="primary" size="lg" class="px-8 justify-center" />
      </div>
      <div v-else-if="hasBundle" class="bg-brand-teal p-8 text-center">
        <h3 class="text-4xl font-serif text-brand-white mb-2">{{ t('PROFILE_BUNDLE_TITLE', 'Full Access activated') }}</h3>
        <p class="text-brand-white mb-6">{{ t('PROFILE_BUNDLE_TXT', 'You own every module. Enjoy your lifetime access.') }}</p>
        <UButton :label="t('PROFILE_BUNDLE_BUTTON_TXT', 'Go to modules')" to="/modules" color="neutral" variant="solid" class="justify-center" />
      </div>
      <div v-else class="bg-brand-teal p-8 text-center">
        <h3 class="text-4xl font-serif text-brand-white mb-2">{{ t('PROFILE_ALL_OWNED_TITLE', 'Complete catalogue') }}</h3>
        <p class="text-brand-white mb-6">{{ t('PROFILE_ALL_OWNED_TXT', 'You own every individual module.') }}</p>
        <UButton :label="t('PROFILE_ALL_OWNED_BUTTON_TXT', 'Go to modules')" to="/modules" color="neutral" variant="solid" class="justify-center" />
      </div>

      <div class="border border-brand-grey-light bg-brand-white p-6">
        <h4 class="text-2xl font-bold text-brand-black mb-4">{{ t('PROFILE_ACCOUNT_TITLE', 'Your account') }}</h4>
        <p class="text-sm text-brand-grey-dark mb-4">
          {{ t('PROFILE_ACCOUNT_TXT', 'Change your password, download your data or sign out.') }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 flex-wrap">
          <UButton :label="t('PROFILE_LOGOUT_BUTTON_TXT', 'Sign out')" color="neutral" variant="outline" class="justify-center" @click="onLogout" />
          <UButton :label="t('PROFILE_PASSWORD_BUTTON_TXT', 'Change password')" color="primary" variant="solid" class="justify-center" @click="openPasswordModal" />
          <UButton
            :label="t('PROFILE_EXPORT_BUTTON_TXT', 'Download my data')"
            icon="i-lucide-download"
            variant="solid"
            class="!bg-brand-teal !text-brand-white hover:!bg-brand-green justify-center"
            :loading="exporting"
            @click="onExportData"
          />
        </div>
      </div>

      <div class="bg-brand-danger text-brand-white p-8 shadow-[0.5rem_0.5rem_0_0_var(--color-brand-danger-dark)]">
        <h4 class="text-3xl font-serif text-brand-white mb-3">{{ t('PROFILE_DELETE_TITLE', 'Delete account') }}</h4>
        <p class="text-brand-white mb-4 leading-relaxed">
          {{ t('PROFILE_DELETE_TXT_1', 'This action is irreversible. You will lose access to every module you bought.') }}
          <strong>{{ t('PROFILE_DELETE_NO_REFUND', 'No refunds') }}</strong>
          {{ t('PROFILE_DELETE_TXT_2', 'and the purchase is NOT restored even if you register again with the same email.') }}
        </p>
        <p class="text-brand-white text-sm mb-6">
          {{ t('PROFILE_DELETE_FISCAL_TXT', 'For tax reasons (10 years in France), invoices linked to your payments are kept anonymised — without any personal data attached.') }}
        </p>
        <UButton
          :label="t('PROFILE_DELETE_BUTTON_TXT', 'I want to delete my account')"
          class="!bg-brand-white !text-brand-danger-ink hover:!bg-brand-cream font-bold uppercase tracking-widest justify-center"
          @click="openDeleteModal"
        />
      </div>

    </div>

    <UModal v-model:open="passwordModalOpen" :ui="{ content: 'sm:max-w-md rounded-none border-none p-0 overflow-hidden' }">
      <template #content>
        <div class="bg-brand-white p-8 flex flex-col w-full">
          <h2 class="text-4xl font-serif text-brand-black mb-2">{{ t('PWD_MODAL_TITLE', 'Change password') }}</h2>
          <p class="text-sm text-brand-grey-dark mb-6">{{ t('PWD_MODAL_TXT', 'Enter your current password and the new one.') }}</p>
          <form class="space-y-5" @submit.prevent="onChangePassword">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('PWD_CURRENT_LABEL', 'Current password') }}</label>
              <UInput
                v-model="passwordForm.currentPassword"
                type="password"
                size="lg"
                autocomplete="current-password"
                :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                required
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-black">{{ t('PWD_NEW_LABEL', 'New password') }}</label>
              <UInput
                v-model="passwordForm.newPassword"
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
                v-model="passwordForm.confirm"
                type="password"
                size="lg"
                autocomplete="new-password"
                :ui="{ base: 'rounded-none border-brand-grey-light focus:ring-brand-mustard' }"
                required
              />
            </div>
            <p v-if="passwordError" class="text-sm text-brand-danger-ink text-center">{{ passwordError }}</p>
            <div class="flex gap-3 pt-2">
              <UButton type="button" :label="t('COMMON_CANCEL', 'Cancel')" color="neutral" variant="outline" class="flex-1 justify-center" @click="closePasswordModal" />
              <UButton type="submit" :label="t('COMMON_SAVE', 'Save')" color="primary" :loading="passwordSubmitting" class="flex-1 justify-center" />
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteModalOpen" :ui="{ content: 'sm:max-w-2xl rounded-none border-none p-0 overflow-hidden' }">
      <template #content>
        <div class="bg-brand-danger text-brand-white p-10 lg:p-12 flex flex-col w-full">
          <h2 class="text-4xl font-serif text-brand-white mb-4">{{ t('DELETE_MODAL_TITLE', 'Confirm deletion') }}</h2>
          <div class="bg-brand-danger-soft border border-brand-white/40 px-5 py-4 mb-6 text-sm leading-relaxed text-brand-white">
            <p class="mb-2">
              <strong class="uppercase tracking-widest text-brand-white">{{ t('DELETE_WARNING_HEADING', 'Important warning') }}</strong>
            </p>
            <p class="text-brand-white">
              {{ t('DELETE_WARNING_TXT_1', 'If you continue, you will lose access to the modules you purchased.') }}
              <strong>{{ t('PROFILE_DELETE_NO_REFUND', 'No refunds') }}</strong>
              {{ t('DELETE_WARNING_TXT_2', 'and the purchases will NOT be restored even if you register again with the same email.') }}
            </p>
          </div>
          <form class="space-y-5" @submit.prevent="onDeleteAccount">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-white">{{ t('PWD_CURRENT_LABEL', 'Current password') }}</label>
              <UInput
                v-model="deleteForm.password"
                type="password"
                size="lg"
                autocomplete="current-password"
                :ui="{ base: 'rounded-none border-brand-white/60 bg-brand-danger-soft text-brand-white placeholder:text-brand-white/70 focus:ring-brand-white' }"
                required
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-widest text-brand-white">
                {{ t('DELETE_CONFIRM_LABEL_PREFIX', 'Type') }} <span class="font-mono">DELETE</span> {{ t('DELETE_CONFIRM_LABEL_SUFFIX', 'to confirm') }}
              </label>
              <UInput
                v-model="deleteForm.confirm"
                size="lg"
                :ui="{ base: 'rounded-none border-brand-white/60 bg-brand-danger-soft text-brand-white placeholder:text-brand-white/70 focus:ring-brand-white font-mono' }"
                required
              />
            </div>
            <p v-if="deleteError" class="text-sm bg-brand-white text-brand-danger-ink px-3 py-2 text-center">{{ deleteError }}</p>
            <div class="flex gap-3 pt-2">
              <UButton
                type="button"
                :label="t('COMMON_CANCEL', 'Cancel')"
                class="flex-1 !bg-transparent !text-brand-white !border-brand-white/70 justify-center"
                variant="outline"
                @click="closeDeleteModal"
              />
              <UButton
                type="submit"
                :label="t('DELETE_ACCEPT_BUTTON_TXT', 'Accept, delete')"
                :loading="deleteSubmitting"
                class="flex-1 !bg-brand-white !text-brand-danger-ink hover:!bg-brand-cream font-bold uppercase tracking-widest justify-center"
              />
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface PurchaseItem {
  id: number
  moduleId: number
  slug: string
  title: string
  cover: string | null
  isFullCourse: boolean
  moduleLevel: number
  purchasedAt: string
  viaBundle?: boolean
}
interface PurchasesSummary {
  ownsBundle: boolean
  regularOwned: number
  regularTotal: number
  ownsEverything: boolean
}

const { t } = useTags()
const { user, openLoginModal, logout, fetchMe } = useAuth()

const { data: purchasesData, pending: purchasesPending } = await useFetch<{ items: PurchaseItem[]; summary: PurchasesSummary }>(
  '/api/me/purchases',
  { credentials: 'include' },
)

const purchases = computed(() => purchasesData.value?.items ?? [])

function cardDescription(p: PurchaseItem): string {
  if (p.isFullCourse) return t('PROFILE_BUNDLE_BADGE', 'Full Access plan')
  if (p.viaBundle) return t('PROFILE_VIA_BUNDLE_BADGE', 'Included with Full Access')
  return t('PROFILE_MODULE_BADGE', 'Individual module')
}
const summary = computed<PurchasesSummary>(() => purchasesData.value?.summary ?? {
  ownsBundle: false, regularOwned: 0, regularTotal: 0, ownsEverything: false,
})
const hasBundle = computed(() => summary.value.ownsBundle)
const ownsEverything = computed(() => summary.value.ownsEverything)

const memberSince = computed(() => {
  if (!user.value?.createdAt) return ''
  return new Date(user.value.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })
})

const globalToast = ref<string | null>(null)
const globalToastVariant = ref<'success' | 'error'>('success')
const globalToastClass = computed(() =>
  globalToastVariant.value === 'success'
    ? 'border-brand-green bg-brand-green/10 text-brand-black'
    : 'border-red-600 bg-red-50 text-red-700',
)
function showToast(message: string, variant: 'success' | 'error' = 'success', timeoutMs = 4000) {
  globalToast.value = message
  globalToastVariant.value = variant
  setTimeout(() => {
    if (globalToast.value === message) globalToast.value = null
  }, timeoutMs)
}

async function onLogout() {
  // Two-stage logout to avoid the "Restricted access" flash during the
  // page transition:
  //   1. Navigate to home while user.value is still set so the leaving
  //      profile page renders its authenticated content during the
  //      fade-out (Nuxt navigateTo resolves before the transition CSS
  //      finishes, so we cannot just await navigation).
  //   2. After the ~280 ms cross-fade has finished, clear the user
  //      state. By then the profile component is unmounted and the
  //      home page reacts to the change without animating again.
  await navigateTo('/')
  setTimeout(() => { logout() }, 350)
}

const passwordModalOpen = ref(false)
const passwordSubmitting = ref(false)
const passwordError = ref<string | null>(null)
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirm: '' })

function resetPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirm = ''
  passwordError.value = null
}
function openPasswordModal() {
  resetPasswordForm()
  passwordModalOpen.value = true
}
function closePasswordModal() {
  passwordModalOpen.value = false
  resetPasswordForm()
}

async function onChangePassword() {
  passwordError.value = null

  if (passwordForm.newPassword.length < 8) {
    passwordError.value = t('PWD_ERROR_TOO_SHORT', 'The new password must have at least 8 characters.')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirm) {
    passwordError.value = t('PWD_ERROR_MISMATCH', 'The confirmation does not match.')
    return
  }
  if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordError.value = t('PWD_ERROR_SAME', 'The new password must differ from the current one.')
    return
  }

  passwordSubmitting.value = true
  try {
    await $fetch('/api/me/password', {
      method: 'POST',
      credentials: 'include',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
    })
    closePasswordModal()
    showToast(t('PWD_SUCCESS_TXT', 'Password changed successfully.'), 'success')
  } catch (err) {
    const msg = (err as { statusMessage?: string; data?: { statusMessage?: string } }).statusMessage
      || (err as { data?: { statusMessage?: string } }).data?.statusMessage
      || t('PWD_ERROR_GENERIC', 'Could not update the password.')
    passwordError.value = msg
  } finally {
    passwordSubmitting.value = false
  }
}

const deleteModalOpen = ref(false)
const deleteSubmitting = ref(false)
const deleteError = ref<string | null>(null)
const deleteForm = reactive({ password: '', confirm: '' })

function resetDeleteForm() {
  deleteForm.password = ''
  deleteForm.confirm = ''
  deleteError.value = null
}
function openDeleteModal() {
  resetDeleteForm()
  deleteModalOpen.value = true
}
function closeDeleteModal() {
  deleteModalOpen.value = false
  resetDeleteForm()
}

async function onDeleteAccount() {
  deleteError.value = null
  if (deleteForm.confirm !== 'DELETE') {
    deleteError.value = t('DELETE_ERROR_CONFIRM', 'Type DELETE in uppercase to confirm.')
    return
  }
  deleteSubmitting.value = true
  try {
    await $fetch('/api/me', {
      method: 'DELETE',
      credentials: 'include',
      body: { password: deleteForm.password, confirm: 'DELETE' },
    })
    // Same flash-avoidance pattern as onLogout: navigate first while
    // the user state is still cached, then refresh /api/auth/me after
    // the page transition has finished so the profile page does not
    // re-render its "Restricted access" placeholder during fade-out.
    await navigateTo('/')
    setTimeout(() => { fetchMe(true) }, 350)
  } catch (err) {
    const msg = (err as { statusMessage?: string; data?: { statusMessage?: string } }).statusMessage
      || (err as { data?: { statusMessage?: string } }).data?.statusMessage
      || t('DELETE_ERROR_GENERIC', 'Could not delete the account.')
    deleteError.value = msg
  } finally {
    deleteSubmitting.value = false
  }
}

const exporting = ref(false)
async function onExportData() {
  exporting.value = true
  try {
    const res = await fetch('/api/me/export', { credentials: 'include' })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const match = /filename="([^"]+)"/.exec(cd)
    const filename = match?.[1] ?? `yoga-export-${user.value?.username ?? 'me'}.json`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast(t('EXPORT_SUCCESS_TXT', 'Download ready.'), 'success')
  } catch (err) {
    showToast(t('EXPORT_ERROR_TXT', 'Could not prepare the download.'), 'error')
  } finally {
    exporting.value = false
  }
}
</script>
