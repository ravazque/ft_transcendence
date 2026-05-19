import { renderHtmlLayout, pickLocale, type EmailLocale } from './layout'

interface AccountDeletedPayload {
  username: string
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
  footer: string
  preheader: string
}> = {
  en_en: {
    subject: 'Your account has been deleted — Yoga with Marco',
    title: 'Account deleted',
    intro: (name) =>
      `Hi ${name}, we confirm that your account has been permanently deleted.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">We have wiped your profile, passwords and active sessions. For French fiscal obligations, invoices from previous purchases are kept for 10 years with no personal data attached.</p><p style="margin:0;font-size:15px;line-height:1.6;">If you would like to come back, you can create a new account any time.</p>',
    footer: 'If you did not request this deletion, reply to this email immediately.',
    preheader: 'Confirmation of your account deletion.',
  },
  es_es: {
    subject: 'Tu cuenta ha sido eliminada — Yoga con Marco',
    title: 'Cuenta eliminada',
    intro: (name) =>
      `Hola ${name}, confirmamos que tu cuenta ha sido eliminada definitivamente.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hemos borrado tu perfil, contraseñas y sesiones activas. Por obligación fiscal en Francia se conservan las facturas de compras anteriores durante 10 años, ya sin datos personales asociados.</p><p style="margin:0;font-size:15px;line-height:1.6;">Si quieres volver con nosotros, puedes crear una cuenta nueva en cualquier momento.</p>',
    footer: 'Si no has sido tú quien solicitó este borrado, responde inmediatamente a este correo.',
    preheader: 'Confirmación del borrado de tu cuenta.',
  },
  fr_fr: {
    subject: 'Ton compte a été supprimé — Yoga avec Marco',
    title: 'Compte supprimé',
    intro: (name) =>
      `Bonjour ${name}, ton compte a bien été supprimé de notre plateforme.`,
    body: '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Nous avons effacé ton profil, ton mot de passe et tes sessions actives. Conformément à la loi française, les factures liées à tes achats antérieurs sont conservées dix ans, sans aucune donnée personnelle associée.</p><p style="margin:0;font-size:15px;line-height:1.6;">Si tu souhaites revenir, tu peux créer un nouveau compte à tout moment.</p>',
    footer: 'Si tu n\'es pas à l\'origine de cette suppression, réponds immédiatement à ce message.',
    preheader: 'Confirmation de la suppression de ton compte.',
  },
}

export function buildAccountDeleted(payload: AccountDeletedPayload): BuiltEmail {
  const locale = pickLocale(payload.locale ?? null)
  const copy = COPY[locale]

  const html = renderHtmlLayout({
    title: copy.title,
    intro: copy.intro(payload.username),
    bodyHtml: copy.body,
    footer: copy.footer,
    preheader: copy.preheader,
  })

  const text =
    `${copy.intro(payload.username)}\n\n` +
    'Hemos borrado tu perfil, contrasenas y sesiones. Las facturas de compras pagadas se conservan diez anos por obligacion fiscal.\n\n' +
    `${copy.footer}\n`

  return { subject: copy.subject, html, text }
}
