import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { requireAuth, verifyPassword, clearSessionCookie } from '../../utils/auth'
import { rateLimit } from '../../utils/rate-limit'
import { deleteAccountSchema } from '../../utils/validation'
import { sendMail } from '../../utils/mailer'

// DELETE /api/me
// GDPR Right To Be Forgotten. Wipes the user and their auth state
// (sessions, comments, purchases, pending registrations are removed by
// ON DELETE CASCADE on the FK). Paid orders are NOT deleted — they
// must be retained for fiscal obligations (10 years in France).
// Instead orders.user_id is nulled via ON DELETE SET NULL and
// customer_snapshot is blanked so no personal data remains attached.
//
// Stripe customer/subscriptions handling is intentionally out of scope
// for this first pass: a Stripe Customer keeps the historical invoice
// references for the merchant. When subscriptions land (recurring
// billing), this handler must call stripe.subscriptions.cancel before
// deleting the User.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  await rateLimit(event, { key: 'me:delete', limit: 3, windowSec: 3600 })

  const body = await readBody(event)
  const parsed = deleteAccountSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: parsed.error.flatten(),
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { id: true, email: true, username: true, password: true, preferredLocale: true },
  })
  if (!user) {
    clearSessionCookie(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const valid = await verifyPassword(user.password, parsed.data.password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Contraseña incorrecta.' })
  }

  await prisma.$transaction(async (tx) => {
    // Blank PII from historical orders before the FK is nulled.
    await tx.order.updateMany({
      where: { userId: user.id },
      data: { customerSnapshot: Prisma.JsonNull },
    })

    // Cascade deletes sessions, purchases, user_comments,
    // user_registrations and user_reviews. orders.user_id is nullified
    // by ON DELETE SET NULL.
    await tx.user.delete({ where: { id: user.id } })
  })

  // Fire-and-forget account-deleted email. Failure here must NOT
  // change the result of the deletion — the user row is already gone.
  try {
    const mail = buildAccountDeleted({
      username: user.username,
      locale: user.preferredLocale,
    })
    await sendMail({ to: user.email, ...mail })
  } catch (err) {
    console.warn('[me/delete] account-deleted email failed', err)
  }

  clearSessionCookie(event)
  setResponseStatus(event, 204)
  return null
})
