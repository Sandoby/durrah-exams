import { SITE_URL, BRAND_NAME, SUPPORT_EMAIL } from './email-constants.ts'

export interface UnifiedEmailTemplateInput {
  /** Hidden preview text shown in inbox list */
  preheader?: string
  /** Small uppercase label above the title (e.g. "SECURITY", "PAYMENT") */
  eyebrow?: string
  /** Main heading */
  title: string
  /** Rich HTML body content */
  bodyHtml: string
  /** CTA button label */
  ctaText?: string
  /** CTA button URL */
  ctaUrl?: string
  /** Accent color for eyebrow + CTA — default is charcoal #1d1d1f */
  accentColor?: string
  /** Optional secondary text below CTA */
  secondaryText?: string
  /** Footer note override */
  footerNote?: string
  /** Site URL override */
  siteUrl?: string
}

/** Render a key-value detail card (invoice summary, order info, etc.) */
export const renderDetailCard = (
  items: { label: string; value: string }[],
): string => {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:10px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;font-weight:500;color:#6e6e73;border-bottom:1px solid #f0f0f2;white-space:nowrap;vertical-align:top;">${item.label}</td>
          <td style="padding:10px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#1d1d1f;border-bottom:1px solid #f0f0f2;text-align:right;vertical-align:top;">${item.value}</td>
        </tr>`,
    )
    .join('')

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f9fb;border:1px solid #e8e8ed;border-radius:12px;margin:20px 0 4px 0;overflow:hidden;">
    ${rows}
  </table>`
}

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export const renderUnifiedEmailTemplate = (input: UnifiedEmailTemplateInput): string => {
  const year = new Date().getFullYear()
  const siteUrl = (input.siteUrl || SITE_URL).replace(/\/+$/, '')
  const accentColor = input.accentColor || '#1d1d1f'
  const preheader = input.preheader || input.title
  const fontStack = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

  // ── Eyebrow pill ────────────────────────────────────────────────
  const eyebrow = input.eyebrow
    ? `<div style="display:inline-block;padding:4px 10px;border-radius:6px;background:#f0f0f2;color:${accentColor};font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:16px;">${input.eyebrow}</div>`
    : ''

  // ── CTA button ──────────────────────────────────────────────────
  const cta =
    input.ctaText && input.ctaUrl
      ? `<div style="margin:28px 0 0 0;">
           <!--[if mso]>
           <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${input.ctaUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="25%" strokecolor="${accentColor}" fillcolor="${accentColor}">
           <w:anchorlock/>
           <center style="color:#ffffff;font-family:${fontStack};font-size:15px;font-weight:600;">
             ${input.ctaText} &rarr;
           </center>
           </v:roundrect>
           <![endif]-->
           <!--[if !mso]><!-->
           <a href="${input.ctaUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;line-height:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);font-family:${fontStack};">${input.ctaText} &rarr;</a>
           <!--<![endif]-->
         </div>`
      : ''

  // ── Secondary text ──────────────────────────────────────────────
  const secondaryText = input.secondaryText
    ? `<div style="margin-top:16px;font-size:13px;line-height:18px;color:#8e8e93;">${input.secondaryText}</div>`
    : ''

  const footerNote = input.footerNote || 'This is an automated message. Please do not reply.'

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${input.title}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media (prefers-color-scheme: dark) {
        .email-bg { background-color: #1c1c1e !important; }
        .email-card { background-color: #2c2c2e !important; border-color: #3a3a3c !important; }
        .email-header { background-color: #252527 !important; border-color: #3a3a3c !important; }
        .email-title { color: #f5f5f7 !important; }
        .email-body { color: #a1a1a6 !important; }
        .email-eyebrow { background-color: #3a3a3c !important; }
        .email-footer { color: #6e6e73 !important; }
        .email-detail-card { background-color: #252527 !important; border-color: #3a3a3c !important; }
        .email-detail-label { color: #8e8e93 !important; }
        .email-detail-value { color: #f5f5f7 !important; border-color: #3a3a3c !important; }
        .email-detail-border { border-color: #3a3a3c !important; }
        .email-brand { color: #a1a1a6 !important; }
        .email-divider { background-color: #3a3a3c !important; }
        a { color: #6e9dff !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f7;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;" class="email-bg">
    <!-- Preheader (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${preheader}&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;" class="email-bg">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px;max-width:560px;">

            <!-- ═══ Header: Brand name only, centered ═══ -->
            <tr>
              <td align="center" style="padding:0 0 16px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f9fb;border:1px solid #ebebed;border-radius:16px;" class="email-header">
                  <tr>
                    <td align="center" style="padding:22px 24px;font-family:${fontStack};">
                      <span style="font-size:22px;line-height:1.1;font-weight:700;letter-spacing:-0.5px;color:#1d1d1f;" class="email-title">Durrah</span><span style="font-size:22px;line-height:1.1;font-weight:400;letter-spacing:-0.2px;color:#8e8e93;margin-left:5px;" class="email-brand"> for Tutors</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ═══ Content Card ═══ -->
            <tr>
              <td>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;border:1px solid #e8e8ed;" class="email-card">
                  <tr>
                    <td style="padding:32px 28px;font-family:${fontStack};">
                      ${eyebrow}
                      <div style="font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.3px;color:#1d1d1f;margin:0 0 12px 0;" class="email-title">
                        ${input.title}
                      </div>
                      <div style="font-size:15px;line-height:24px;color:#424245;margin:0;" class="email-body">
                        ${input.bodyHtml}
                      </div>
                      ${cta}
                      ${secondaryText}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ═══ Footer ═══ -->
            <tr>
              <td style="padding:20px 8px 0 8px;font-family:${fontStack};text-align:center;" class="email-footer">
                <!-- Divider -->
                <div style="height:1px;background:#e8e8ed;margin:0 0 18px 0;" class="email-divider"></div>
                <div style="font-size:12px;line-height:18px;color:#8e8e93;">${footerNote}</div>
                <div style="font-size:12px;line-height:18px;margin-top:10px;color:#8e8e93;">
                  <a href="${siteUrl}" style="color:#8e8e93;text-decoration:underline;">Website</a>
                  <span style="color:#c7c7cc;">&ensp;&middot;&ensp;</span>
                  <a href="${siteUrl}/privacy" style="color:#8e8e93;text-decoration:underline;">Privacy</a>
                  <span style="color:#c7c7cc;">&ensp;&middot;&ensp;</span>
                  <a href="mailto:${SUPPORT_EMAIL}" style="color:#8e8e93;text-decoration:underline;">Support</a>
                </div>
                <div style="font-size:11px;line-height:16px;margin-top:12px;color:#aeaeb2;">
                  &copy; ${year} ${BRAND_NAME}. All rights reserved.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
