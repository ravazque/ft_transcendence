// Pricing logic for the "Full Access" bundle module.
//
// The bundle has THREE variables the team controls:
//
//   1) Prices of the 5 regular modules              — editable from Directus
//      (table `modules`, field `price` of each one)
//   2) Configured price of the bundle               — editable from Directus
//      (table `modules`, field `price` of the isFullCourse=true module)
//   3) Maximum allowed discount (percent)           — editable from Directus
//      (table `tagged_info`, tag `BUNDLE_MAX_DISCOUNT_PERCENT`, e.g. "25")
//      Accepted values: 0..90. Out of range → default (25).
//
// From that the server computes:
//
//   factor  = 1 − maxDiscountPercent / 100              ← e.g. 0.75
//   sum     = sum of prices of published regulars
//   floor   = sum * factor                              ← MIN price
//   ceiling = sum                                       ← MAX price (never above the sum)
//   list    = clamp(configured, floor, ceiling)         ← "list" price
//
//   credit  = Σ (price_owned_module * factor)           ← proportional to the discount
//   payable = list − credit                             ← what the user pays now
//
// PROPORTIONAL — key so the maths always add up:
//
//   The credit we give the user for each module they ALREADY own is
//   NOT the full price of the module: only the share that was
//   included in the bundle. That's why we multiply by `factor`. If
//   the max discount is 25 %, the bundle is worth 75 % of the sum;
//   per owned module we discount 75 % of its price.
//
//   Consequences:
//     - 0 modules owned: payable = floor = sum * factor
//     - k modules owned (1 ≤ k < 5): payable > 0 always.
//       Specifically: payable = factor * (sum − Σowned_price)
//                             = factor * sum_remaining
//     - 5 modules owned: payable = 0 → the caller marks it as
//       `redundant` and the UI shows "You already have access".
//
// When the user owns all 5 regulars (or the bundle), the caller
// decides whether to show the "you already have access" panel
// instead of trying to sell it.

export const DEFAULT_MAX_DISCOUNT_PERCENT = 25

export interface BundlePricingInput {
  configuredCents: number
  regularPricesCents: number[]
  ownedRegularPricesCents?: number[]
  // Override for the discount cap from Directus. Accepted values
  // 0..90; out of range falls back to the default.
  maxDiscountPercent?: number
}

export interface BundlePricingResult {
  sumCents: number
  floorCents: number
  ceilingCents: number          // max price (= sum)
  configuredCents: number
  listCents: number             // "list" price of the bundle
  creditCents: number           // proportional credit applied
  payableCents: number          // what the user pays NOW
  maxDiscountPercent: number    // the one actually applied
  factor: number                // 1 − maxDiscountPercent/100
  wasAdjustedByFloor: boolean   // true when configured < floor
  wasAdjustedByCeiling: boolean // true when configured > ceiling
}

function clampDiscountPercent(n: number | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_MAX_DISCOUNT_PERCENT
  if (n < 0 || n > 90) return DEFAULT_MAX_DISCOUNT_PERCENT
  return n
}

export function computeBundlePricing(input: BundlePricingInput): BundlePricingResult {
  const maxDiscountPercent = clampDiscountPercent(input.maxDiscountPercent)
  const factor = 1 - maxDiscountPercent / 100

  const sumCents = input.regularPricesCents.reduce((a, b) => a + b, 0)
  const floorCents = Math.round(sumCents * factor)
  const ceilingCents = sumCents

  // Clamp the configured price between the floor (max allowed
  // discount) and the ceiling (the sum — selling the bundle for
  // more than buying everything separately makes no sense).
  const clamped = Math.min(Math.max(input.configuredCents, floorCents), ceilingCents)
  const listCents = clamped

  // Proportional credit: we only discount the share "included in
  // the bundle" of each owned module's price, never the full price.
  const ownedSumCents = (input.ownedRegularPricesCents ?? []).reduce((a, b) => a + b, 0)
  const creditCents = Math.round(ownedSumCents * factor)
  const payableCents = Math.max(0, listCents - creditCents)

  return {
    sumCents,
    floorCents,
    ceilingCents,
    configuredCents: input.configuredCents,
    listCents,
    creditCents,
    payableCents,
    maxDiscountPercent,
    factor,
    wasAdjustedByFloor: input.configuredCents < floorCents,
    wasAdjustedByCeiling: input.configuredCents > ceilingCents,
  }
}

export function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}
