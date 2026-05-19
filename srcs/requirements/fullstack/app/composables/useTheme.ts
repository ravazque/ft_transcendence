// Shared theme composable — single source of truth for dark/light mode.
//
// Why preference instead of value:
//   colorMode.value reflects the *resolved* mode (e.g. 'dark' after system
//   detection). During SSR, value is always the fallback ('dark') and stays
//   that way until the client hydrates. Using value as the toggle source
//   caused the first few clicks to appear broken because the computed was
//   reading a stale pre-hydration state.
//
//   colorMode.preference is the *user-set* choice ('dark' | 'light' | 'system').
//   It is consistent between SSR and client from the first render, so the
//   toggle icon and the actual theme always agree.
export function useTheme() {
  const colorMode = useColorMode()

  const isDark = computed(
    () =>
      colorMode.preference === 'dark' ||
      (colorMode.preference === 'system' && colorMode.value === 'dark'),
  )

  function toggle() {
    colorMode.preference = isDark.value ? 'light' : 'dark'
  }

  return { isDark, toggle }
}
