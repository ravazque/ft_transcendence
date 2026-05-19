import { renderHtmlLayout, escapeHtml, siteUrl, pickLocale, type EmailLocale } from './layout'

interface VerifyEmailPayload {
  username: string
  token: string
  locale?: string | null
}

interface BuiltEmail {
  subject: string
  html: string
  text: string
}

const COPY: Record<EmailLocale, {
  subject: string
  title: string
  intro: (name: string) => string
  body: string
  cta: string
  footer: string
  preheader: string
}> = {
  en_en: {
    subject: 'Confirm your email — Yoga with Marco',
    title: 'Confirm your email',
    intro: (name) =>
      `Hi ${name}, thanks for creating your account. One last step: confirm your email address to activate full access.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">The link expires in 24 hours. If you did not sign up, ignore this message.</p>',
    cta: 'Confirm email',
    footer: 'If the button does not work, copy and paste the link into your browser.',
    preheader: 'Activate your account to start learning.',
  },
  es_es: {
    subject: 'Confirma tu email — Yoga con Marco',
    title: 'Confirma tu email',
    intro: (name) =>
      `Hola ${name}, gracias por crear tu cuenta. Solo falta un paso: confirma tu dirección de correo para activar el acceso completo.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">El enlace caduca en 24 horas. Si no has sido tú, ignora este mensaje.</p>',
    cta: 'Confirmar email',
    footer: 'Si el botón no funciona, copia y pega el enlace en tu navegador.',
    preheader: 'Activa tu cuenta para empezar a aprender.',
  },
  fr_fr: {
    subject: 'Confirme ton adresse email — Yoga avec Marco',
    title: 'Confirme ton email',
    intro: (name) =>
      `Bonjour ${name}, merci pour ton inscription. Il ne reste qu'une étape : confirmer ton adresse pour activer ton compte.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Ce lien expire dans 24 heures. Si tu n\'es pas à l\'origine de cette inscription, ignore ce message.</p>',
    cta: 'Confirmer mon email',
    footer: 'Si le bouton ne fonctionne pas, copie le lien et colle-le dans ton navigateur.',
    preheader: 'Active ton compte pour commencer.',
  },
}

export function buildVerifyEmail(payload: VerifyEmailPayload): BuiltEmail {
  const locale = pickLocale(payload.locale ?? null)
  const copy = COPY[locale]
  const ctaUrl = `${siteUrl()}/auth/verify?token=${encodeURIComponent(payload.token)}`

  const html = renderHtmlLayout({
    title: copy.title,
    intro: copy.intro(payload.username),
    bodyHtml: `${copy.body}<p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;word-break:break-all;">${escapeHtml(ctaUrl)}</p>`,
    ctaLabel: copy.cta,
    ctaUrl,
    footer: copy.footer,
    preheader: copy.preheader,
  })

  const text =
    `${copy.intro(payload.username)}\n\n` +
    `${copy.cta}: ${ctaUrl}\n\n` +
    `${copy.footer}\n`

  return { subject: copy.subject, html, text }
}
