import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'
import { userHasModuleAccess } from '../../utils/access'
import { computeBundlePricing, formatEuros } from '../../utils/pricing'

// GET /api/modules/:slug
// Module detail + summarised class list (no videoUrl). Flags
// lockedness per class: the first is free, the rest need access.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug' })

  const locale = resolveLocale(event)
  const userId = event.context.auth?.sub ?? null

  const module = await prisma.module.findUnique({
    where: { locale_slug: { locale, slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      cover: true,
      shortDescription: true,
      fullDescription: true,
      keyConcepts: true,
      isFullCourse: true,
      price: true,
      published: true,
      classes: {
        orderBy: { moduleLevel: 'asc' },
        where: { locale },
        select: {
          id: true,
          moduleLevel: true,
          title: true,
          cover: true,
          shortDescription: true,
        },
      },
    },
  })

  if (!module || !module.published) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  const hasAccess = await userHasModuleAccess(userId, module.id)

  // For the bundle we apply the same price adjustment as in the
  // catalogue (floor by maximum discount). The factor is read from
  // the BUNDLE_MAX_DISCOUNT_PERCENT tag in tagged_info. See
  // pricing.ts.
  let priceCents = Math.round(Number(module.price) * 100)
  if (module.isFullCourse) {
    const [regulars, discountTag] = await Promise.all([
      prisma.module.findMany({
        where: { locale, published: true, isFullCourse: false },
        select: { price: true },
      }),
      prisma.taggedInfo.findUnique({
        where: { tag_locale: { tag: 'BUNDLE_MAX_DISCOUNT_PERCENT', locale } },
        select: { value: true },
      }),
    ])
    const pricing = computeBundlePricing({
      configuredCents: priceCents,
      regularPricesCents: regulars.map((m) => Math.round(Number(m.price) * 100)),
      maxDiscountPercent: discountTag ? Number(discountTag.value) : undefined,
    })
    priceCents = pricing.listCents
  }

  return {
    locale,
    module: {
      id: module.id,
      slug: module.slug,
      title: module.title,
      cover: module.cover,
      description: module.shortDescription,
      longDescription: module.fullDescription,
      keyConcepts: module.keyConcepts,
      isFullCourse: module.isFullCourse,
      priceCents,
      priceLabel: formatEuros(priceCents),
      hasAccess,
    },
    classes: module.classes.map((c) => ({
      id: c.id,
      level: c.moduleLevel,
      title: c.title,
      cover: c.cover,
      description: c.shortDescription,
      // The first lesson is always unlocked as a preview.
      isLocked: !hasAccess && c.moduleLevel > 1,
    })),
  }
})
