import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { getStripe, ensureStripeCustomer } from '../../utils/stripe'
import { requireAuth } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { resolveLocale } from '../../utils/locale'
import { computeBundlePricing } from '../../utils/pricing'

const bodySchema = z.object({
  moduleSlug: z.string().min(1).max(255),
  promotionCode: z.string().max(64).optional(),
})

// POST /api/checkout/session
// Creates a Stripe Checkout Session to buy a specific module (or the
// "Full Access" bundle when the module is flagged isFullCourse).
// Requires an authenticated session. Returns the Stripe hosted URL.
//
// Bundle pricing: when the user already owns some individual modules,
// the catalogue advertises a discounted bundle price (proportional
// credit, see server/utils/pricing.ts). The same discount must be
// honoured at checkout — we recompute the payable amount here and
// override the line item, ignoring `stripePriceId` for the bundle so
// the user is never charged the full list price.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  await rateLimit(event, { key: 'checkout:create', limit: 10, windowSec: 60 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
  }
  const { moduleSlug, promotionCode } = parsed.data
  const locale = resolveLocale(event)

  const module = await prisma.module.findUnique({
    where: { locale_slug: { locale, slug: moduleSlug } },
    select: {
      id: true,
      title: true,
      price: true,
      published: true,
      stripePriceId: true,
      isFullCourse: true,
    },
  })
  if (!module || !module.published) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  // Avoid duplicate purchases. Effective uniqueness is by SLUG (the
  // same module has one row per locale with a different id), so we
  // look up any purchase whose module shares this slug.
  const existing = await prisma.purchase.findFirst({
    where: { userId: auth.sub, module: { slug: moduleSlug } },
    select: { id: true },
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Module already purchased' })
  }

  // Compute the actual amount to charge. For regular modules it is
  // just `module.price`. For the bundle we look up the user's owned
  // individual modules and run the same pricing helper used by the
  // catalogue, so the Stripe checkout always matches the on-site
  // displayed price.
  let unitAmountCents = Math.round(Number(module.price) * 100)
  if (module.isFullCourse) {
    const [regulars, discountTag, userPurchases] = await Promise.all([
      prisma.module.findMany({
        where: { locale, published: true, isFullCourse: false },
        select: { slug: true, price: true },
      }),
      prisma.taggedInfo.findUnique({
        where: { tag_locale: { tag: 'BUNDLE_MAX_DISCOUNT_PERCENT', locale } },
        select: { value: true },
      }),
      prisma.purchase.findMany({
        where: { userId: auth.sub, module: { isFullCourse: false } },
        select: { module: { select: { slug: true } } },
      }),
    ])
    const ownedSlugs = new Set(userPurchases.map((p) => p.module.slug))
    const ownedRegulars = regulars.filter((m) => ownedSlugs.has(m.slug))
    const pricing = computeBundlePricing({
      configuredCents: unitAmountCents,
      regularPricesCents: regulars.map((m) => Math.round(Number(m.price) * 100)),
      ownedRegularPricesCents: ownedRegulars.map((m) => Math.round(Number(m.price) * 100)),
      maxDiscountPercent: discountTag ? Number(discountTag.value) : undefined,
    })
    // payableCents already accounts for floor + proportional credit.
    // We never reach 0 in practice (the catalogue gates the bundle
    // when the user owns everything via the `redundant` flag), but
    // Stripe refuses unit_amount < 1, so guard against it.
    unitAmountCents = Math.max(pricing.payableCents, 50)
  }

  const customerId = await ensureStripeCustomer(auth.sub)
  const siteUrl = process.env.SITE_URL || 'https://localhost'

  // Stripe Tax automatic mode: VAT is computed by Stripe based on the
  // billing address collected at checkout. Prices in the database are
  // tax-exclusive (tax_behavior: 'exclusive'); Stripe adds the right
  // VAT on top per customer country. The admin is registered in France
  // so French TVA applies by default; OSS rules apply to EU customers.
  //
  // We only honour a pre-created `stripePriceId` for regular modules.
  // The bundle always uses ad-hoc `price_data` because its effective
  // amount depends on what the user already owns and cannot be
  // represented by a static Stripe Price.
  const useStaticPrice = !module.isFullCourse && !!module.stripePriceId
  const lineItem: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem = useStaticPrice
    ? { price: module.stripePriceId!, quantity: 1 }
    : {
        price_data: {
          currency: 'eur',
          unit_amount: unitAmountCents,
          product_data: { name: module.title },
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [lineItem],
    automatic_tax: { enabled: true },
    customer_update: { address: 'auto', name: 'auto' },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `Compra de ${module.title}`,
        metadata: {
          moduleId: String(module.id),
          moduleSlug,
          userId: auth.sub,
        },
        rendering_options: { amount_tax_display: 'include_inclusive_tax' },
      },
    },
    success_url: `${siteUrl}/modules?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/modules?checkout=cancel`,
    allow_promotion_codes: !promotionCode,
    discounts: promotionCode ? [{ promotion_code: promotionCode }] : undefined,
    locale: locale === 'fr_fr' ? 'fr' : 'es',
    metadata: {
      userId: auth.sub,
      moduleId: String(module.id),
      moduleSlug,
      locale,
      effectiveAmountCents: String(unitAmountCents),
    },
  })

  return { url: session.url, sessionId: session.id }
})
