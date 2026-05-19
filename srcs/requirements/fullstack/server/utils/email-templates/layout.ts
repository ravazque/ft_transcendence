// Minimal HTML wrapper shared by every transactional email. Keeps the
// styling inline (mail clients strip <style>) and avoids external
// assets — no images, no fonts, no JS. Plain colour palette aligned
// with the brand tokens defined in app/app.config.ts.

interface LayoutInput {
  title: string
  intro: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  footer: string
  preheader?: string
}

const BRAND_ORANGE = '#d97706'
const BRAND_INK = '#1f2937'
const BRAND_MUTED = '#6b7280'
const BRAND_BG = '#f9fafb'

export function renderHtmlLayout(input: LayoutInput): string {
  const { title, intro, bodyHtml, ctaLabel, ctaUrl, footer, preheader } = input

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin:32px 0;text-align:center;">
          <a href="${ctaUrl}"
             style="display:inline-block;padding:14px 28px;background:${BRAND_ORANGE};
                    color:#ffffff;text-decoration:none;border-radius:6px;
                    font-weight:600;font-size:15px;">${escapeHtml(ctaLabel)}</a>
         </p>`
      : ''

  const preheaderBlock = preheader
    ? `<span style="display:none;font-size:1px;color:${BRAND_BG};">${escapeHtml(preheader)}</span>`
    : ''

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND_INK};">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND_BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:32px 40px 16px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND_INK};">${escapeHtml(title)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND_INK};">${escapeHtml(intro)}</p>
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND_MUTED};">${escapeHtml(footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Resolves the public origin used in email links. Mirrors the same
// fallback the checkout endpoint uses.
export function siteUrl(): string {
  return process.env.SITE_URL || 'https://localhost:8443'
}

export type EmailLocale = 'en_en' | 'es_es' | 'fr_fr'

export function pickLocale(input: string | null | undefined): EmailLocale {
  if (input === 'fr_fr') return 'fr_fr'
  if (input === 'es_es') return 'es_es'
  return 'en_en'
}
