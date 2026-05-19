import { renderHtmlLayout, escapeHtml, siteUrl, pickLocale, type EmailLocale } from './layout'

interface PasswordResetPayload {
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
    subject: 'Reset your password — Yoga with Marco',
    title: 'Reset your password',
    intro: (name) =>
      `Hi ${name}, we received a request to change the password for your account.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">The link expires in 60 minutes. If you did not request this change, ignore this message — your current password is still valid.</p>',
    cta: 'Set a new password',
    footer: 'If the button does not work, copy and paste the link into your browser.',
    preheader: 'Reset your password in under a minute.',
  },
  es_es: {
    subject: 'Recuperar contraseña — Yoga con Marco',
    title: 'Restablecer tu contraseña',
    intro: (name) =>
      `Hola ${name}, recibimos una solicitud para cambiar la contraseña de tu cuenta.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">El enlace caduca en 60 minutos. Si no has solicitado el cambio, ignora este mensaje — tu contraseña actual sigue siendo válida.</p>',
    cta: 'Crear contraseña nueva',
    footer: 'Si el botón no funciona, copia y pega el enlace en tu navegador.',
    preheader: 'Restablece tu contraseña en menos de un minuto.',
  },
  fr_fr: {
    subject: 'Réinitialise ton mot de passe — Yoga avec Marco',
    title: 'Réinitialise ton mot de passe',
    intro: (name) =>
      `Bonjour ${name}, nous avons reçu une demande de réinitialisation du mot de passe de ton compte.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Ce lien expire dans 60 minutes. Si tu n\'es pas à l\'origine de cette demande, ignore ce message — ton mot de passe actuel reste valide.</p>',
    cta: 'Choisir un nouveau mot de passe',
    footer: 'Si le bouton ne fonctionne pas, copie le lien et colle-le dans ton navigateur.',
    preheader: 'Réinitialise ton mot de passe en moins d\'une minute.',
  },
}

export function buildPasswordReset(payload: PasswordResetPayload): BuiltEmail {
  const locale = pickLocale(payload.locale ?? null)
  const copy = COPY[locale]
  const ctaUrl = `${siteUrl()}/auth/reset?token=${encodeURIComponent(payload.token)}`

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
