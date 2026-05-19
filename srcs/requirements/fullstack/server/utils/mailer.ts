import nodemailer, { type Transporter } from 'nodemailer'

// Lazy nodemailer transporter. Mirrors the pattern used by stripe.ts /
// vimeo.ts: instantiated on first call so endpoints unrelated to email
// (auth, modules, checkout…) keep working when SMTP_HOST is empty.
//
// In production the absence of SMTP credentials should fail loudly so
// transactional flows (verify email, password reset, purchase receipt,
// account deleted) cannot silently drop messages. In development we
// log the message to stdout and skip the actual delivery so the dev
// loop runs without a real SMTP account.

const globalForMailer = globalThis as unknown as { mailer?: Transporter }

function buildTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
      : undefined,
  })
}

function getMailer(): Transporter | null {
  if (globalForMailer.mailer) return globalForMailer.mailer
  const transporter = buildTransporter()
  if (!transporter) return null
  if (process.env.NODE_ENV !== 'production') {
    globalForMailer.mailer = transporter
  } else {
    globalForMailer.mailer = transporter
  }
  return transporter
}

export interface SendMailInput {
  to: string
  subject: string
  html: string
  text: string
}

// Recipients on reserved / non-deliverable TLDs never reach a real
// mailbox. We catch them here and log to stdout regardless of whether
// SMTP is configured — this is the path used by the seeded QA accounts
// (`demo@yoga.local`, `tester_*@yoga.local`) so the dev can read their
// codes from `make logs-app` without burning real send attempts on
// dead-end addresses. Covers the IETF reserved TLDs (RFC 2606 + 6762):
// .local, .test, .example, .invalid, plus bare `localhost`.
const TEST_RECIPIENT_PATTERN =
  /@(?:[^@]*\.(?:local|test|example|invalid)|localhost)$/i

function isTestRecipient(to: string): boolean {
  return TEST_RECIPIENT_PATTERN.test(to.trim())
}

// Sends a transactional email. Behaviour by recipient + environment:
//
//   - Recipient on a reserved/test TLD (.local, .test, .example,
//     .invalid, localhost): always logged to stdout, no SMTP attempt.
//     Used by the seeded QA accounts.
//   - SMTP configured and reachable: delivers via nodemailer.
//   - SMTP missing OR transport error, NODE_ENV != production: logs the
//     full text body (which contains the auth code) to stdout and
//     returns OK. Lets the dev loop keep working without a real SMTP
//     account or when test credentials in .env.example have expired —
//     read the code with `make logs-app`.
//   - SMTP missing OR transport error, NODE_ENV = production: throws
//     so the caller decides whether to fail loud (login/recovery) or
//     just log (purchase confirmation, account deleted). A misconfigured
//     mailer in production must surface as a real error.
export async function sendMail(input: SendMailInput): Promise<void> {
  const transporter = getMailer()
  const from = process.env.SMTP_FROM || 'no-reply@yoga.local'
  const isDev = process.env.NODE_ENV !== 'production'

  if (isTestRecipient(input.to)) {
    logDevEmail(from, input, `test recipient ${input.to}`)
    return
  }

  if (!transporter) {
    if (!isDev) {
      throw createError({ statusCode: 503, statusMessage: 'Mailer is not configured' })
    }
    logDevEmail(from, input, 'SMTP_HOST is empty')
    return
  }

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
  } catch (err) {
    if (!isDev) throw err
    const reason = (err as { message?: string }).message ?? 'transport failed'
    logDevEmail(from, input, reason)
  }
}

// Prints the email body (which already contains the auth code in
// plain text) so it can be copied out of `make logs-app`. Marked with
// a loud prefix so the dev sees it in a stream of regular logs.
function logDevEmail(from: string, input: SendMailInput, reason: string): void {
  console.warn(
    `\n────────────────────────────────────────────────────────────────\n` +
      `[mailer:dev] No email was delivered (${reason}).\n` +
      `Falling back to stdout so the verification code is recoverable.\n` +
      `From    : ${from}\n` +
      `To      : ${input.to}\n` +
      `Subject : ${input.subject}\n` +
      `Body    :\n${input.text}\n` +
      `────────────────────────────────────────────────────────────────\n`,
  )
}
