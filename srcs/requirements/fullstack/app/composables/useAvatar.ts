// Helpers to generate an inline SVG avatar from the username when the
// user has not uploaded a custom picture.
//
// The avatar is deterministic: the same name always produces the same
// background color (from the brand palette) and the same initial, so
// two sessions from the same user see it identical across devices.

// Brand-derived background palette — every entry contrasts with white
// text so the initial stays legible.
//
// The brand orange (#BB5420) is excluded on purpose because that is
// the header color: using it as the avatar background inside the
// header would make the avatar visually disappear.
const BRAND_BG_COLORS = [
  '#C78C12', // brand-mustard
  '#59612D', // brand-green
  '#7C6E3E', // brand-brown
  '#58A2A6', // brand-teal
  '#7A2E2E', // brand-danger-ink
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function initialOf(name: string | null | undefined): string {
  if (!name) return '?'
  const cleaned = name.trim()
  if (!cleaned) return '?'
  return cleaned.charAt(0).toUpperCase()
}

// Returns the background color assigned to this name. The palette
// has 6 colors → the distribution is stable and varied enough.
export function avatarColorFor(name: string | null | undefined): string {
  if (!name) return BRAND_BG_COLORS[0]!
  return BRAND_BG_COLORS[hashName(name) % BRAND_BG_COLORS.length]!
}

// Returns a data URL `data:image/svg+xml;…` with a background circle
// + the initial centered in white. Drops straight into the `src` of
// an `<img>` or the `:src` of Nuxt UI's UAvatar component.
export function avatarDataUrl(name: string | null | undefined): string {
  const initial = initialOf(name)
  const bg = avatarColorFor(name)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="48" fill="${bg}"/>` +
    `<text x="50%" y="55%" font-family="Georgia,serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(initial)}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Resolves the avatar src for a user: if they uploaded a picture,
// returns it as-is; otherwise generates the initial-based avatar.
export function avatarFor(input: { avatar?: string | null; username?: string | null; fullName?: string | null } | null | undefined): string {
  if (!input) return avatarDataUrl(null)
  if (input.avatar) return input.avatar
  return avatarDataUrl(input.username ?? input.fullName ?? null)
}
