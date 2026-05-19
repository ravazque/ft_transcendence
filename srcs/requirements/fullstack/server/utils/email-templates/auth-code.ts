import { renderHtmlLayout, pickLocale, type EmailLocale } from './layout'

interface AuthCodePayload {
  username: string | null
  code: string
  purpose: 'login' | 'register' | 'recovery'
  locale?: string | null
}

interface BuiltEmail {
  subject: string
  html: string
  text: string
}

interface LocaleCopy {
  login: { subject: string; title: string; intro: (name: string) => string }
  register: { subject: string; title: string; intro: (name: string) => string }
  recovery: { subject: string; title: string; intro: (name: string) => string }
  bodyLead: string
  footer: string
  preheader: string
  expires: string
}

const COPY: Record<EmailLocale, LocaleCopy> = {
  en_en: {
    login: {
      subject: 'Your sign-in code — Yoga with Marco',
      title: 'Confirm your sign-in',
      intro: (name) => `Hi ${name}, use this code to finish signing in.`,
    },
    register: {
      subject: 'Confirm your account — Yoga with Marco',
      title: 'Activate your account',
      intro: (name) => `Hi ${name}, thanks for signing up. Use this code to activate your account.`,
    },
    recovery: {
      subject: 'Reset your password — Yoga with Marco',
      title: 'Reset your password',
      intro: (name) => `Hi ${name}, use this code to set a new password.`,
    },
    bodyLead: 'Enter the code on the screen where it was requested. Single use.',
    footer: 'If this was not you, ignore this message — your account stays as it was.',
    preheader: 'Your one-time verification code.',
    expires: 'The code expires in 10 minutes.',
  },
  es_es: {
    login: {
      subject: 'Tu código para entrar — Yoga con Marco',
      title: 'Confirma tu inicio de sesión',
      intro: (name) => `Hola ${name}, usa este código para terminar de iniciar sesión.`,
    },
    register: {
      subject: 'Confirma tu cuenta — Yoga con Marco',
      title: 'Activa tu cuenta',
      intro: (name) => `Hola ${name}, gracias por registrarte. Usa este código para activar tu cuenta.`,
    },
    recovery: {
      subject: 'Recupera tu contraseña — Yoga con Marco',
      title: 'Recupera tu contraseña',
      intro: (name) => `Hola ${name}, usa este código para crear una nueva contraseña.`,
    },
    bodyLead: 'Introduce el código en la pantalla donde lo pediste. Es de un solo uso.',
    footer: 'Si no has sido tú, ignora este mensaje — la cuenta queda como estaba.',
    preheader: 'Tu código de verificación de un solo uso.',
    expires: 'El código caduca en 10 minutos.',
  },
  fr_fr: {
    login: {
      subject: 'Ton code de connexion — Yoga avec Marco',
      title: 'Confirme ta connexion',
      intro: (name) => `Bonjour ${name}, utilise ce code pour finir de te connecter.`,
    },
    register: {
      subject: 'Confirme ton compte — Yoga avec Marco',
      title: 'Active ton compte',
      intro: (name) => `Bonjour ${name}, merci pour ton inscription. Utilise ce code pour activer ton compte.`,
    },
    recovery: {
      subject: 'Récupère ton mot de passe — Yoga avec Marco',
      title: 'Récupère ton mot de passe',
      intro: (name) => `Bonjour ${name}, utilise ce code pour créer un nouveau mot de passe.`,
    },
    bodyLead: 'Saisis le code sur l\'écran où il t\'a été demandé. À usage unique.',
    footer: 'Si tu n\'es pas à l\'origine de cette demande, ignore ce message — rien ne change.',
    preheader: 'Ton code de vérification à usage unique.',
    expires: 'Le code expire dans 10 minutes.',
  },
}

export function buildAuthCode(payload: AuthCodePayload): BuiltEmail {
  const locale = pickLocale(payload.locale ?? null)
  const copy = COPY[locale]
  const variant = copy[payload.purpose]
  const fallbackName = locale === 'fr_fr' ? 'à toi' : locale === 'es_es' ? 'a ti' : 'there'
  const name = payload.username ?? fallbackName

  const bodyHtml =
    `<div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;padding:14px 28px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-family:'Menlo','Consolas','Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#1f2937;">${escapeText(payload.code)}</span>
    </div>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#1f2937;">${escapeText(copy.bodyLead)}</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">${escapeText(copy.expires)}</p>`

  const html = renderHtmlLayout({
    title: variant.title,
    intro: variant.intro(name),
    bodyHtml,
    footer: copy.footer,
    preheader: copy.preheader,
  })

  const codeLabel = locale === 'es_es' ? 'Código' : 'Code'
  const text =
    `${variant.intro(name)}\n\n` +
    `${codeLabel}: ${payload.code}\n\n` +
    `${copy.bodyLead}\n${copy.expires}\n\n${copy.footer}\n`

  return { subject: variant.subject, html, text }
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
