import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'
import { computeBundlePricing, formatEuros } from '../../utils/pricing'

// GET /api/modules
//
// Progressive gating:
//
//  - Anonymous visitors get a stripped-down catalogue (no price, no full
//    description) with every module marked `locked` and a top-level
//    `requiresLogin: true` flag. The frontend uses this to show locked
//    cards plus a "register to see the full catalogue" CTA.
//
//  - Authenticated users get the full catalogue. Each item is marked
//    `purchased` (direct purchase or Full Access bundle owned) and
//    `locked` accordingly. The first module that is not yet purchased
//    receives `isNextStep: true` to highlight it as the suggested
//    "next step".
//
// `isFullCourse` modules (the bundle) are always returned at the top of
// the list — they are never marked `isNextStep`, only the regular
// modules drive that flag.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)
  const userId = event.context.auth?.sub ?? null

  const modules = await prisma.module.findMany({
    where: { locale, published: true },
    orderBy: [{ isFullCourse: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      cover: true,
      shortDescription: true,
      fullDescription: true,
      isFullCourse: true,
      price: true,
    },
  })

  if (!userId) {
    return {
      locale,
      requiresLogin: true,
      items: modules.map((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        cover: m.cover,
        description: m.shortDescription,
        isFullCourse: m.isFullCourse,
        locked: true,
        purchased: false,
        isNextStep: false,
      })),
    }
  }

  // Resolve access in one query to avoid N+1. Cross-locale: the
  // `Purchase` points to the moduleId of the translation that was
  // bought — for ownership to work in any language we resolve by
  // SLUG (stable across locales) instead of by id.
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    select: { module: { select: { slug: true, isFullCourse: true } } },
  })
  const ownedSlugs = new Set(purchases.map((p) => p.module.slug))
  const hasBundle = purchases.some((p) => p.module.isFullCourse)
  const regulars = modules.filter((m) => !m.isFullCourse)
  const bundleModule = modules.find((m) => m.isFullCourse)
  // Redundant bundle: the user owns EVERY individual module but did
  // not buy the bundle. Only this combination — a single unowned
  // module is enough for the bundle to still add value.
  const bundleRedundant = !hasBundle
    && regulars.length > 0
    && regulars.every((m) => ownedSlugs.has(m.slug))

  // Maximum allowed discount — editable from Directus via the
  // BUNDLE_MAX_DISCOUNT_PERCENT tag in tagged_info. If missing or not
  // a valid number, the helper falls back to the default (25 %).
  const maxDiscountTag = await prisma.taggedInfo.findUnique({
    where: { tag_locale: { tag: 'BUNDLE_MAX_DISCOUNT_PERCENT', locale } },
    select: { value: true },
  })
  const maxDiscountPercent = maxDiscountTag ? Number(maxDiscountTag.value) : undefined

  const ownedRegulars = regulars.filter((m) => ownedSlugs.has(m.slug))

  // Bundle price adjustment. See server/utils/pricing.ts for the full
  // formula (floor by max discount + credit proportional to the
  // discount factor).
  const bundlePricing = bundleModule
    ? computeBundlePricing({
        configuredCents: Math.round(Number(bundleModule.price) * 100),
        regularPricesCents: regulars.map((m) => Math.round(Number(m.price) * 100)),
        ownedRegularPricesCents: ownedRegulars.map((m) => Math.round(Number(m.price) * 100)),
        maxDiscountPercent,
      })
    : null

  // Per-module line in the credit breakdown: gross price and the
  // proportional contribution (price × factor). The front end shows
  // both.
  const bundleCreditModules = ownedRegulars.map((m) => {
    const priceCents = Math.round(Number(m.price) * 100)
    return {
      slug: m.slug,
      title: m.title,
      priceCents,
      creditCents: Math.round(priceCents * (bundlePricing?.factor ?? 1)),
    }
  })

  let nextStepAssigned = false

  return {
    locale,
    requiresLogin: false,
    bundleMaxDiscountPercent: bundlePricing?.maxDiscountPercent ?? null,
    items: modules.map((m) => {
      const purchased = hasBundle || ownedSlugs.has(m.slug)
      const locked = !purchased
      let isNextStep = false
      if (!nextStepAssigned && !purchased && !m.isFullCourse) {
        isNextStep = true
        nextStepAssigned = true
      }
      // Displayed price: the bundle uses the floor-adjusted
      // `listCents`; regular modules use their configured price as-is.
      const priceCents = m.isFullCourse && bundlePricing
        ? bundlePricing.listCents
        : Math.round(Number(m.price) * 100)
      const base = {
        id: m.id,
        slug: m.slug,
        title: m.title,
        cover: m.cover,
        description: m.shortDescription,
        longDescription: m.fullDescription,
        isFullCourse: m.isFullCourse,
        priceCents,
        priceLabel: formatEuros(priceCents),
        purchased,
        locked,
        // Kept for backwards compatibility with current frontend usage.
        completed: purchased,
        isNextStep,
        // Only meaningful on the bundle item.
        redundant: m.isFullCourse && bundleRedundant,
      }
      if (m.isFullCourse && bundlePricing && !purchased && bundlePricing.creditCents > 0) {
        return {
          ...base,
          bundleOriginalCents: bundlePricing.listCents,
          bundleCreditCents: bundlePricing.creditCents,
          bundleEffectiveCents: bundlePricing.payableCents,
          bundleEffectiveLabel: formatEuros(bundlePricing.payableCents),
          bundleCreditFactor: bundlePricing.factor,
          bundleCreditModules,
        }
      }
      return base
    }),
  }
})
