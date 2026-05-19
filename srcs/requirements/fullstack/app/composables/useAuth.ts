// Global client-side authentication state.
//
// The server keeps the session via the HttpOnly cookie `yoga_session`.
// Here we cache the /api/auth/me response so the header, the login
// modal and the profile page share the same user without a re-fetch
// on every navigation.
//
// Two-step flow: login/register do NOT return the user directly. They
// return a challengeId that the client exchanges for the real session
// by submitting the 6-digit code emailed to the user. This composable
// exposes both steps separately:
//
//   startLogin / startRegister    → step 1
//   verifyLogin / verifyRegister  → step 2 (returns the AuthUser)
//   resendCode                    → resends the code without restarting

export interface AuthUser {
  id: string
  email: string
  username: string
  role: 'admin' | 'editor' | 'user'
  avatar: string | null
  emailVerified: boolean
  createdAt: string
}

export interface AuthChallenge {
  challengeId: string
  email: string
  expiresAt: string
  resendAvailableAt: string
}

interface StartResponse {
  requiresVerification: true
  challengeId: string
  email: string
  expiresAt: string
  resendAvailableAt: string
}

interface ResendResponse {
  ok: true
  resendAvailableAt: string
}

interface VerifyResponse {
  user: AuthUser
}

function toChallenge(data: StartResponse): AuthChallenge {
  return {
    challengeId: data.challengeId,
    email: data.email,
    expiresAt: data.expiresAt,
    resendAvailableAt: data.resendAvailableAt,
  }
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth.user', () => null)
  const fetched = useState<boolean>('auth.fetched', () => false)
  const loading = useState<boolean>('auth.loading', () => false)

  async function fetchMe(force = false): Promise<AuthUser | null> {
    if (!force && fetched.value) return user.value
    loading.value = true
    try {
      // On SSR the browser cookie does not reach $fetch automatically;
      // we forward it manually so /api/auth/me sees the session.
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ user: AuthUser }>('/api/auth/me', {
        credentials: 'include',
        headers,
      }).catch(() => null)
      user.value = data?.user ?? null
    } finally {
      fetched.value = true
      loading.value = false
    }
    return user.value
  }

  async function startLogin(email: string, password: string): Promise<AuthChallenge> {
    const data = await $fetch<StartResponse>('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: { email, password },
    })
    return toChallenge(data)
  }

  async function verifyLogin(challengeId: string, code: string): Promise<AuthUser> {
    const data = await $fetch<VerifyResponse>('/api/auth/login/verify', {
      method: 'POST',
      credentials: 'include',
      body: { challengeId, code },
    })
    user.value = data.user
    fetched.value = true
    return data.user
  }

  async function startRegister(email: string, username: string, password: string): Promise<AuthChallenge> {
    const data = await $fetch<StartResponse>('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      body: { email, username, password },
    })
    return toChallenge(data)
  }

  async function verifyRegister(challengeId: string, code: string): Promise<AuthUser> {
    const data = await $fetch<VerifyResponse>('/api/auth/register/verify', {
      method: 'POST',
      credentials: 'include',
      body: { challengeId, code },
    })
    user.value = data.user
    fetched.value = true
    return data.user
  }

  async function resendCode(challengeId: string, email: string): Promise<string> {
    const data = await $fetch<ResendResponse>('/api/auth/resend-code', {
      method: 'POST',
      credentials: 'include',
      body: { challengeId, email },
    })
    return data.resendAvailableAt
  }

  async function startRecovery(email: string): Promise<AuthChallenge> {
    const data = await $fetch<StartResponse>('/api/auth/password-recovery', {
      method: 'POST',
      credentials: 'include',
      body: { email },
    })
    return toChallenge(data)
  }

  // Intermediate step: validates the code and obtains a ticket that
  // authorises the password change on the next screen.
  async function verifyRecoveryCode(challengeId: string, code: string): Promise<{ ticket: string; expiresAt: string }> {
    return await $fetch<{ ticket: string; expiresAt: string }>(
      '/api/auth/password-recovery/verify-code',
      {
        method: 'POST',
        credentials: 'include',
        body: { challengeId, code },
      },
    )
  }

  // Final step: changes the password using the ticket and signs in.
  async function finalizeRecovery(
    ticket: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<AuthUser> {
    const data = await $fetch<VerifyResponse>('/api/auth/password-recovery/verify', {
      method: 'POST',
      credentials: 'include',
      body: { ticket, newPassword, confirmPassword },
    })
    user.value = data.user
    fetched.value = true
    return data.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    user.value = null
  }

  // Shared state used to open the login modal from any page. The
  // layout watches this flag.
  const modalOpen = useState<boolean>('auth.modal', () => false)
  function openLoginModal() {
    modalOpen.value = true
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated: computed(() => !!user.value),
    modalOpen,
    openLoginModal,
    fetchMe,
    startLogin,
    verifyLogin,
    startRegister,
    verifyRegister,
    resendCode,
    startRecovery,
    verifyRecoveryCode,
    finalizeRecovery,
    logout,
  }
}
