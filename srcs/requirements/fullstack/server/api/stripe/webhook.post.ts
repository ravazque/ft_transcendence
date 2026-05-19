import type Stripe from 'stripe'
import { prisma } from '../../utils/prisma'
import { getStripe } from '../../utils/stripe'

// POST /api/stripe/webhook
// Endpoint called by Stripe on account events. Verifies the signature
// using STRIPE_WEBHOOK_SECRET (mandatory in production) and processes:
//
//   - checkout.session.completed: creates Order + Purchase, marks paid.
//   - payment_intent.payment_failed: marks the Order as failed if any.
//
// IMPORTANT: Stripe requires the RAW (un-parsed) body to validate the
// signature. Nitro provides the raw body via readRawBody.
export default defineEventHandler(async (event) => {
  const signature = getRequestHeader(event, 'stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    throw createError({ statusCode: 400, statusMessage: 'Missing stripe signature/secret' })
  }

  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty body' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: `Webhook signature verification failed: ${(err as Error).message}`,
    })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(session)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = stripeEvent.data.object as Stripe.PaymentIntent
      await prisma.order
        .updateMany({
          where: { stripePaymentIntentId: pi.id, status: 'pending' },
          data: { status: 'failed' },
        })
        .catch(() => undefined)
      break
    }
    case 'invoice.payment_succeeded':
    case 'invoice.finalized': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      await handleInvoiceReady(invoice)
      break
    }
    default:
      // Ignore the rest of the events; Stripe still expects a 2xx.
      break
  }

  return { received: true }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const moduleIdRaw = session.metadata?.moduleId
  if (!userId || !moduleIdRaw) return

  const moduleId = Number(moduleIdRaw)
  if (!Number.isInteger(moduleId)) return

  // Idempotency: if we already processed this session, do not duplicate.
  const already = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: session.id },
    select: { id: true },
  })
  if (already) return

  const amountTotal = session.amount_total ?? 0
  const amountSubtotal = session.amount_subtotal ?? amountTotal
  const totalDetails = session.total_details
  const vatCents = totalDetails?.amount_tax ?? 0
  const discountCents = totalDetails?.amount_discount ?? 0
  const vatCountry = session.customer_details?.address?.country ?? null
  const invoiceId =
    typeof session.invoice === 'string' ? session.invoice : session.invoice?.id ?? null

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        status: 'paid',
        currency: (session.currency ?? 'eur').toUpperCase(),
        subtotalCents: amountSubtotal,
        vatCents,
        discountCents,
        totalCents: amountTotal,
        vatCountry,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        stripeInvoiceId: invoiceId,
        paidAt: new Date(),
        customerSnapshot: session.customer_details
          ? (session.customer_details as unknown as object)
          : undefined,
      },
    })

    await tx.purchase.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      create: {
        orderId: order.id,
        userId,
        moduleId,
        moduleLevel: 1,
      },
      update: {},
    })
  })
}

// Invoice events fire after the checkout session completes — the
// invoice gets finalised and (typically a moment later) paid. We pull
// the PDF and hosted invoice URLs off the invoice and attach them to
// the Order created from the checkout session. Matching is done by
// Stripe invoice ID (set in handleCheckoutCompleted) and falls back to
// payment_intent if needed.
async function handleInvoiceReady(invoice: Stripe.Invoice) {
  const invoiceId = invoice.id
  if (!invoiceId) return

  const paymentIntentId =
    typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent?.id ?? null

  const data = {
    stripeInvoiceId: invoiceId,
    stripeInvoicePdfUrl: invoice.invoice_pdf ?? null,
    stripeReceiptUrl: invoice.hosted_invoice_url ?? null,
  }

  // Prefer matching by invoice id so re-issued events are idempotent.
  const updatedByInvoice = await prisma.order.updateMany({
    where: { stripeInvoiceId: invoiceId },
    data,
  })

  if (updatedByInvoice.count > 0) return
  if (!paymentIntentId) return

  await prisma.order.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data,
  })
}
