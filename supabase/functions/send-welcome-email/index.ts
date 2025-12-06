import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOGO_URL = 'https://durrah-clinic-managment.web.app/logo.jpeg'
const HERO_ILLUSTRATION = 'https://tutors.durrahsystem.tech/illustrations/techny-standardized-test-as-method-of-assessment.png'

type EmailType = 'welcome' | 'subscription_reminder_7d' | 'subscription_reminder_3d' | 'subscription_expired' | 'subscription_expired_3d'

interface EmailRequest {
  userId: string
  email: string
  name?: string
  emailType?: EmailType
}

const getEmailTemplate = (type: EmailType, name: string, expiryDate?: string) => {
  const templates: Record<EmailType, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to Durrah for Tutors',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            :root {
              --brand-primary: #1d4ed8;
              --brand-dark: #0f172a;
              --brand-muted: #475569;
              --surface: #ffffff;
              --surface-soft: #f8fafc;
              --border: #e2e8f0;
              --accent: #0ea5e9;
            }
            body { margin:0; padding:0; background: var(--surface-soft); font-family: 'Segoe UI', Arial, sans-serif; color: var(--brand-dark); }
            .outer { padding: 24px; }
            .card { max-width: 640px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); overflow: hidden; }
            .top { padding: 28px 32px; background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: #fff; display: flex; align-items: center; gap: 16px; }
            .logo { width: 56px; height: 56px; border-radius: 12px; background: rgba(255,255,255,0.1); display: grid; place-items: center; position: relative; }
            .logo img { width: 44px; height: 44px; object-fit: contain; display: block; }
            .fallback { display: none; width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #1d4ed8, #0ea5e9); color: #fff; font-weight: 800; font-size: 20px; letter-spacing: 0.5px; align-items: center; justify-content: center; }
            .headline { margin: 0; font-size: 24px; font-weight: 700; }
            .subhead { margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.82); }
            .body { padding: 32px; background: var(--surface); }
            .hero { margin: 0 auto 20px; background: #f1f5f9; border: 1px solid var(--border); border-radius: 14px; padding: 12px; text-align: center; }
            .hero img { width: 100%; max-width: 520px; display: block; margin: 0 auto; border-radius: 10px; }
            h2 { margin: 0 0 12px; font-size: 20px; color: var(--brand-dark); }
            p { margin: 0 0 12px; color: var(--brand-muted); }
            ul { padding-left: 18px; margin: 12px 0 16px; color: var(--brand-dark); }
            li { margin-bottom: 8px; }
            .pill { display: inline-block; padding: 6px 12px; background: #e0f2fe; color: #075985; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.2px; }
            .cta { display: inline-block; margin: 18px 0 4px; padding: 14px 28px; background: var(--brand-primary); color: #fff; text-decoration: none; font-weight: 700; border-radius: 12px; box-shadow: 0 10px 20px rgba(29,78,216,0.18); }
            .cta:hover { background: #1e40af; }
            .footer { padding: 20px 32px 28px; background: var(--surface-soft); color: var(--brand-muted); font-size: 13px; text-align: center; border-top: 1px solid var(--border); }
            .meta { margin-top: 6px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="outer">
            <div class="card">
              <div class="top">
                <div class="logo">
                  <img
                    src="${LOGO_URL}"
                    alt="Durrah for Tutors"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                  />
                  <div class="fallback" aria-hidden="true">D</div>
                </div>
                <div>
                  <p class="pill">Durrah for Tutors</p>
                  <h1 class="headline">Welcome aboard, ${name || 'Tutor'}!</h1>
                  <p class="subhead">All your exams, insights, and integrity tools in one clean workspace.</p>
                </div>
              </div>
              <div class="body">
                <div class="hero">
                  <img src="${HERO_ILLUSTRATION}" alt="Illustration of a tutor preparing exams" />
                </div>
                <h2>Let’s set you up for success</h2>
                <p>Thanks for choosing Durrah for Tutors. You now have a focused, professional toolkit to create, manage, and monitor exams with confidence.</p>
                <ul>
                  <li><strong>Create in minutes:</strong> Build exams with AI-assisted question creation.</li>
                  <li><strong>Protect integrity:</strong> Anti-cheating controls and proctoring signals.</li>
                  <li><strong>See what matters:</strong> Real-time analytics for performance and engagement.</li>
                  <li><strong>Stay supported:</strong> Dedicated help when you need it.</li>
                </ul>
                <a href="https://tutors.durrahsystem.tech/dashboard" class="cta">Open your dashboard</a>
                <p style="margin-top:16px; color:#0f172a; font-weight:600;">Tip: Pin the dashboard link for quick access during exam days.</p>
              </div>
              <div class="footer">
                <div>Durrah for Tutors — built for educators who value clarity and control.</div>
                <div class="meta">© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_reminder_7d: {
      subject: '⏰ Your Durrah for Tutors subscription expires in 7 days',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
            .email-wrapper { background-color: #f1f5f9; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(120deg, #eab308 0%, #f59e0b 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { width: 120px; height: auto; margin-bottom: 20px; background: rgba(255, 255, 255, 0.2); padding: 10px; border-radius: 8px; }
            .logo-fallback { width: 60px; height: 60px; background: white; color: #eab308; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { margin: 16px 0; font-size: 16px; }
            .content ul { margin: 20px 0; padding-left: 20px; }
            .content li { margin: 10px 0; font-size: 16px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; }
            .footer { text-align: center; padding: 30px; background-color: #f8fafc; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="Durrah for Tutors" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
                <div class="logo-fallback" style="display: none;">D</div>
                <h1>Subscription Expiring Soon ⏰</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Your Durrah for Tutors subscription will expire on <strong>${expiryDate}</strong> (in 7 days).</p>
                <p>Don't lose access to your exams and student data. Renew now to continue enjoying:</p>
                <ul>
                  <li>Unlimited exam creation</li>
                  <li>AI-powered question extraction</li>
                  <li>Advanced analytics</li>
                  <li>Priority support</li>
                </ul>
                <a href="https://tutors.durrahsystem.tech/settings" class="button">Renew Subscription</a>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_reminder_3d: {
      subject: '🚨 Last chance! Your Durrah for Tutors subscription expires in 3 days',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
            .email-wrapper { background-color: #f1f5f9; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(120deg, #f97316 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { width: 120px; height: auto; margin-bottom: 20px; background: rgba(255, 255, 255, 0.2); padding: 10px; border-radius: 8px; }
            .logo-fallback { width: 60px; height: 60px; background: white; color: #f97316; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { margin: 16px 0; font-size: 16px; }
            .urgent-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(120deg, #dc2626 0%, #f97316 100%); color: white; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; }
            .footer { text-align: center; padding: 30px; background-color: #f8fafc; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="Durrah for Tutors" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
                <div class="logo-fallback" style="display: none;">D</div>
                <h1>Urgent: 3 Days Left! 🚨</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <div class="urgent-box">
                  <p style="margin: 0; font-weight: 600;">Your subscription expires on <strong>${expiryDate}</strong> - that's only 3 days away!</p>
                </div>
                <p>Act now to avoid losing access to your exams and student data.</p>
                <a href="https://tutors.durrahsystem.tech/settings" class="button">Renew Now</a>
                <p>Questions? Contact our support team for assistance.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_expired: {
      subject: '⚠️ Your Durrah for Tutors subscription has expired',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
            .email-wrapper { background-color: #f1f5f9; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(120deg, #dc2626 0%, #991b1b 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { width: 120px; height: auto; margin-bottom: 20px; background: rgba(255, 255, 255, 0.2); padding: 10px; border-radius: 8px; }
            .logo-fallback { width: 60px; height: 60px; background: white; color: #dc2626; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { margin: 16px 0; font-size: 16px; }
            .info-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; }
            .footer { text-align: center; padding: 30px; background-color: #f8fafc; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="Durrah for Tutors" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
                <div class="logo-fallback" style="display: none;">D</div>
                <h1>Subscription Expired ⚠️</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Your Durrah for Tutors subscription expired on <strong>${expiryDate}</strong>.</p>
                <div class="info-box">
                  <p style="margin: 0;">Your exams and data are still safe, but you won't be able to create new exams or access analytics until you renew.</p>
                </div>
                <a href="https://tutors.durrahsystem.tech/settings" class="button">Renew Subscription</a>
                <p>Need help? Our support team is here for you.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_expired_3d: {
      subject: '💔 We miss you! Reactivate your Durrah for Tutors account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
            .email-wrapper { background-color: #f1f5f9; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { width: 120px; height: auto; margin-bottom: 20px; background: rgba(255, 255, 255, 0.2); padding: 10px; border-radius: 8px; }
            .logo-fallback { width: 60px; height: 60px; background: white; color: #1d4ed8; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { margin: 16px 0; font-size: 16px; }
            .highlight-box { background: linear-gradient(120deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #1d4ed8; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; }
            .footer { text-align: center; padding: 30px; background-color: #f8fafc; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="Durrah for Tutors" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
                <div class="logo-fallback" style="display: none;">D</div>
                <h1>We Miss You! 💔</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>It's been 3 days since your subscription expired. We'd love to have you back!</p>
                <div class="highlight-box">
                  <p style="margin: 0; font-weight: 600;">Your exams are waiting for you. Reactivate now and pick up right where you left off.</p>
                </div>
                <a href="https://tutors.durrahsystem.tech/settings" class="button">Reactivate Account</a>
                <p>Have feedback or questions? We'd love to hear from you.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  return templates[type] || templates.welcome
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email, name, emailType = 'welcome' }: EmailRequest = await req.json()

    if (!userId || !email) {
      throw new Error('userId and email are required')
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user profile for subscription info if needed
    let expiryDate = undefined
    if (emailType !== 'welcome') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_expires_at')
        .eq('id', userId)
        .single()

      if (profile?.subscription_expires_at) {
        expiryDate = new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }

    const template = getEmailTemplate(emailType, name || email.split('@')[0], expiryDate)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Durrah for Tutors <noreply@durrahsystem.tech>',
        to: [email],
        subject: template.subject,
        html: template.html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`)
    }

    // Log the email in database
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_type: emailType,
      recipient_email: email,
      status: 'sent',
    })

    // Update last_reminder_sent_at if it's a subscription reminder
    if (emailType.startsWith('subscription_')) {
      await supabase
        .from('profiles')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', userId)
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending email:', error)

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
