export interface UnifiedEmailTemplateInput {
  preheader?: string
  eyebrow?: string
  title: string
  bodyHtml: string
  ctaText?: string
  ctaUrl?: string
  accentColor?: string
  footerNote?: string
  siteUrl?: string
  logoUrl?: string
}

const DEFAULT_SITE_URL = 'https://durrahtutors.com'
const DEFAULT_LOGO_URL = `${DEFAULT_SITE_URL}/apple-touch-icon.png`

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export const renderUnifiedEmailTemplate = (input: UnifiedEmailTemplateInput): string => {
  const year = new Date().getFullYear()
  const siteUrl = (input.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '')
  const logoUrl = input.logoUrl || DEFAULT_LOGO_URL
  const accentColor = input.accentColor || '#4b47d6'
  const preheader = input.preheader || input.title
  const eyebrow = input.eyebrow
    ? `<div style="display:inline-block;padding:5px 12px;border-radius:999px;background:#f4f5fb;color:${accentColor};font-size:12px;line-height:16px;font-weight:600;margin-bottom:14px;">${input.eyebrow}</div>`
    : ''
  const cta = input.ctaText && input.ctaUrl
    ? `<div style="margin-top:24px;">
         <a href="${input.ctaUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;line-height:18px;">${input.ctaText}</a>
       </div>`
    : ''
  const footerNote = input.footerNote || 'This is an automated message. Please do not reply.'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${preheader}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;">
      <tr>
        <td align="center" style="padding:30px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
            <tr>
              <td style="padding:0 0 14px 0;background:#e5e7f0;border-radius:14px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#e5e7f0;border-radius:14px;">
                  <tr>
                    <td valign="middle" style="padding:14px 0 14px 18px;width:72px;">
                      <img src="${logoUrl}" width="52" height="52" alt="Durrah Tutors" style="display:block;border:0;outline:none;text-decoration:none;border-radius:12px;" />
                    </td>
                    <td valign="middle" style="padding:14px 18px 14px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      <span style="font-size:34px;line-height:1.05;font-weight:700;letter-spacing:-0.4px;color:#4b47d6;">Durrah</span>
                      <span style="display:inline-block;margin-left:4px;font-size:34px;line-height:1.05;font-weight:400;letter-spacing:-0.2px;color:#8892ae;">for Tutors</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border-radius:18px;padding:28px 24px;border:1px solid #e8e8ed;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
                      ${eyebrow}
                      <div style="font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.2px;margin:0 0 10px 0;">
                        ${input.title}
                      </div>
                      <div style="font-size:15px;line-height:22px;color:#424245;margin:0;">
                        ${input.bodyHtml}
                      </div>
                      ${cta}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#6e6e73;text-align:center;">
                <div style="font-size:12px;line-height:18px;">${footerNote}</div>
                <div style="font-size:12px;line-height:18px;margin-top:8px;">
                  <a href="${siteUrl}" style="color:#0066cc;text-decoration:none;">Website</a>
                  <span style="color:#c7c7cc;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                  <a href="${siteUrl}/privacy" style="color:#0066cc;text-decoration:none;">Privacy</a>
                </div>
                <div style="font-size:12px;line-height:18px;margin-top:10px;color:#8e8e93;">
                  &copy; ${year} Durrah for Tutors. All rights reserved.
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
