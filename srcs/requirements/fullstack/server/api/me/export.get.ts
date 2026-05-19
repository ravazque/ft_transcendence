import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'

// GET /api/me/export
//
// GDPR export (GDPR Art. 20 — right to data portability). Returns the
// user's personal data as JSON with `Content-Disposition: attachment`
// so the browser saves it as a file.
//
// Invoices (`orders`) are included so the user keeps the fiscal trail,
// but the original `customer_snapshot` (which may contain card or
// address data captured by Stripe) is dropped and reduced to
// accounting fields (amounts, VAT, country, date).
//
// The password hash and TOTP secrets NEVER leave the backend.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  await rateLimit(event, { key: 'me:export', limit: 3, windowSec: 3600 })

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatar: true,
      preferredLocale: true,
      role: true,
      emailVerified: true,
      totpEnabled: true,
      stripeCustomerId: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado.' })
  }

  // The GDPR export is locale-independent — we return the purchase as
  // it happened (module locale at payment time) so the fiscal trail is
  // exact.
  const [purchases, orders, comments, reviews] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId: auth.sub },
      select: {
        id: true,
        moduleId: true,
        moduleLevel: true,
        createdAt: true,
        module: { select: { slug: true, title: true, locale: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      where: { userId: auth.sub },
      select: {
        id: true,
        status: true,
        currency: true,
        subtotalCents: true,
        vatCents: true,
        discountCents: true,
        totalCents: true,
        vatCountry: true,
        promotionCode: true,
        stripeInvoiceId: true,
        stripeInvoicePdfUrl: true,
        stripeReceiptUrl: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userComment.findMany({
      where: { userId: auth.sub },
      select: { classId: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userReview.findMany({
      where: { userId: auth.sub },
      select: { id: true, locale: true, rating: true, content: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const payload = {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    user,
    purchases: purchases.map((p) => ({
      id: p.id,
      moduleId: p.moduleId,
      moduleSlug: p.module.slug,
      moduleTitle: p.module.title,
      moduleLocale: p.module.locale,
      moduleLevel: p.moduleLevel,
      purchasedAt: p.createdAt,
    })),
    orders,
    comments,
    reviews,
  }

  const filename = `yoga-export-${user.username}-${new Date().toISOString().slice(0, 10)}.json`
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return payload
})
