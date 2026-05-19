import Stripe from 'stripe'
import { prisma } from './prisma'

// Lazy Stripe client. Initialised on the first call — that way the
// endpoints that do not need Stripe (health, auth, modules…) do not
// fail when STRIPE_SECRET_KEY is empty in development.
const globalForStripe = globalThis as unknown as { stripe?: Stripe }

export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Payments are not configured',
    })
  }
  // We do not pin apiVersion: we rely on the default of the installed
  // SDK to avoid mismatches between types and string literals.
  const client = new Stripe(key, { typescript: true })
  if (process.env.NODE_ENV !== 'production') {
    globalForStripe.stripe = client
  }
  return client
}

// Ensures the user has an associated Stripe Customer.
// If it does not exist, create it and persist the ID in the database.
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, stripeCustomerId: true },
  })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.fullName ?? undefined,
    metadata: { userId: user.id },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}
