import { renderHtmlLayout, escapeHtml, siteUrl, pickLocale, type EmailLocale } from './layout'

interface PurchaseConfirmationPayload {
  username: string
  moduleTitle: string
  totalCents: number
  currency: string
  invoicePdfUrl?: string | null
  receiptUrl?: string | null
  locale?: string | null
}

interface BuiltEmail {
  subject: string
  html: string
  text: string
}

const COPY: Record<EmailLocale, {
  subject: (moduleTitle: string) => string
  title: string
  intro: (name: string, moduleTitle: string) => string
  amountLabel: string
  invoiceLabel: string
  receiptLabel: string
  cta: string
  footer: string
  preheader: (moduleTitle: string) => string
}> = {
  en_en: {
    subject: (moduleTitle) => `Purchase confirmation — ${moduleTitle}`,
    title: 'Purchase confirmed',
    intro: (name, moduleTitle) =>
      `Hi ${name}, we received your payment for "${moduleTitle}". You can now access the content.`,
    amountLabel: 'Amount paid',
    invoiceLabel: 'Invoice (PDF)',
    receiptLabel: 'Receipt',
    cta: 'Go to module',
    footer: 'Keep this email for your records. If you have any questions, just reply to this message.',
    preheader: (moduleTitle) => `Your access to ${moduleTitle} is now active.`,
  },
  es_es: {
    subject: (moduleTitle) => `Confirmación de compra — ${moduleTitle}`,
    title: 'Compra confirmada',
    intro: (name, moduleTitle) =>
      `Hola ${name}, hemos recibido tu pago para "${moduleTitle}". Ya puedes acceder al contenido.`,
    amountLabel: 'Importe pagado',
    invoiceLabel: 'Factura (PDF)',
    receiptLabel: 'Recibo',
    cta: 'Ir al módulo',
    footer: 'Conserva este correo a efectos fiscales. Si tienes cualquier duda, responde a este mensaje.',
    preheader: (moduleTitle) => `Tu acceso a ${moduleTitle} está activo.`,
  },
  fr_fr: {
    subject: (moduleTitle) => `Confirmation d'achat — ${moduleTitle}`,
    title: 'Achat confirmé',
    intro: (name, moduleTitle) =>
      `Bonjour ${name}, ton paiement pour « ${moduleTitle} » a bien été reçu. L'accès au contenu est ouvert.`,
    amountLabel: 'Montant payé',
    invoiceLabel: 'Facture (PDF)',
    receiptLabel: 'Reçu',
    cta: 'Accéder au module',
    footer: 'Conserve ce message pour tes archives. En cas de question, réponds simplement à cet email.',
    preheader: (moduleTitle) => `Ton accès à ${moduleTitle} est actif.`,
  },
}

function formatAmount(totalCents: number, currency: string, locale: EmailLocale): string {
  const intlLocale = locale === 'es_es' ? 'es-ES' : locale === 'fr_fr' ? 'fr-FR' : 'en-IE'
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
  }).format(totalCents / 100)
}

export function buildPurchaseConfirmation(payload: PurchaseConfirmationPayload): BuiltEmail {
  const locale = pickLocale(payload.locale ?? null)
  const copy = COPY[locale]
  const ctaUrl = `${siteUrl()}/modules`
  const amount = formatAmount(payload.totalCents, payload.currency, locale)

  const links: string[] = []
  if (payload.invoicePdfUrl) {
    links.push(
      `<li style="margin:0 0 6px;font-size:14px;line-height:1.5;">` +
        `<a href="${escapeHtml(payload.invoicePdfUrl)}" style="color:#d97706;">${escapeHtml(copy.invoiceLabel)}</a>` +
      `</li>`,
    )
  }
  if (payload.receiptUrl) {
    links.push(
      `<li style="margin:0 0 6px;font-size:14px;line-height:1.5;">` +
        `<a href="${escapeHtml(payload.receiptUrl)}" style="color:#d97706;">${escapeHtml(copy.receiptLabel)}</a>` +
      `</li>`,
    )
  }

  const linksHtml = links.length
    ? `<ul style="margin:0 0 16px;padding-left:20px;">${links.join('')}</ul>`
    : ''

  const detailsHtml =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;width:40%;">${escapeHtml(copy.amountLabel)}</td>
        <td style="padding:8px 0;font-size:14px;color:#1f2937;font-weight:600;">${escapeHtml(amount)}</td>
      </tr>
    </table>`

  const html = renderHtmlLayout({
    title: copy.title,
    intro: copy.intro(payload.username, payload.moduleTitle),
    bodyHtml: detailsHtml + linksHtml,
    ctaLabel: copy.cta,
    ctaUrl,
    footer: copy.footer,
    preheader: copy.preheader(payload.moduleTitle),
  })

  const textLines = [
    copy.intro(payload.username, payload.moduleTitle),
    '',
    `${copy.amountLabel}: ${amount}`,
  ]
  if (payload.invoicePdfUrl) textLines.push(`${copy.invoiceLabel}: ${payload.invoicePdfUrl}`)
  if (payload.receiptUrl) textLines.push(`${copy.receiptLabel}: ${payload.receiptUrl}`)
  textLines.push('', `${copy.cta}: ${ctaUrl}`, '', copy.footer, '')

  return { subject: copy.subject(payload.moduleTitle), html, text: textLines.join('\n') }
}
