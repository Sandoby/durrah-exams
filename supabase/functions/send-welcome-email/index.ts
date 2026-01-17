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

type EmailType = 'welcome' | 'subscription_reminder_7d' | 'subscription_reminder_3d' | 'subscription_expired' | 'subscription_expired_3d' | 'password_reset' | 'email_verification'

interface EmailRequest {
  userId?: string
  email: string
  name?: string
  emailType?: EmailType
  resetToken?: string
  verificationToken?: string
}

const getEmailTemplate = (type: EmailType, name: string, expiryDate?: string, resetUrl?: string) => {
  const logoUrl = 'https://tutors.durrahsystem.tech/Picture1.png'
  const MasterLayout = (title: string, subtitle: string, content: string, ctaText?: string, ctaUrl?: string, accentColor: string = '#6366f1') => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 0; background-color: #f9fbfc; color: #1a202c;
            }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f9fbfc; padding: 60px 0; }
            .container {
              max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; 
              overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .header { padding: 40px 0; text-align: center; border-bottom: 1px solid #f1f5f9; }
            .logo-img { width: 44px; height: 44px; vertical-align: middle; display: inline-block; }
            .logo-text { font-size: 20px; font-weight: 700; color: #6366f1; margin-left: 8px; display: inline-block; vertical-align: middle; }
            .logo-text span { color: #64748b; font-weight: 300; margin-left: 4px; }
            
            .content { padding: 48px; }
            .badge {
              display: inline-block; padding: 4px 12px; background: #f1f5f9; color: ${accentColor}; 
              border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px;
            }
            .title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
            .main-text { color: #475569; line-height: 1.7; font-size: 16px; margin-bottom: 32px; }
            
            .btn-container { text-align: left; margin: 32px 0; }
            .btn {
              background: #6366f1; color: #ffffff !important; padding: 14px 32px; border-radius: 8px;
              text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;
            }
            
            .footer { padding-bottom: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="${logoUrl}" class="logo-img" alt="Durrah Logo">
                <div class="logo-text">Durrah<span>for Tutors</span></div>
              </div>
              <div class="content">
                <div class="badge" style="color: ${accentColor};">${subtitle}</div>
                <h1 class="title">${title}</h1>
                <div class="main-text">${content}</div>
                ${ctaText ? `
                  <div class="btn-container">
                    <a href="${ctaUrl}" class="btn">${ctaText}</a>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Durrah Systems. All rights reserved.</p>
              <p>The standard for professional tutor management.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  const templates: Record<EmailType, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to Durrah for Tutors',
      html: MasterLayout(
        'Welcome to the future of tutoring',
        'REGISTRATION SUCCESSFUL',
        `We're excited to help you take your tutoring practice to the next level. Your account is now active and you can start creating secure, high-quality exams immediately.`,
        'Get Started',
        'https://durrahtutors.com/dashboard'
      )
    },
    subscription_reminder_7d: {
      subject: 'Subscription Reminder: 7 days remaining',
      html: MasterLayout(
        'Your subscription is expiring soon',
        '7 DAYS LEFT',
        `This is a friendly reminder that your subscription will expire on <strong>${expiryDate}</strong>. Renew today to keep your dashboard and student data accessible.`,
        'Renew Subscription',
        'https://durrahtutors.com/settings',
        '#eab308'
      )
    },
    subscription_reminder_3d: {
      subject: 'Urgent: 3 days until subscription expires',
      html: MasterLayout(
        'Action required to stay active',
        '3 DAYS LEFT',
        `Your subscription expires on <strong>${expiryDate}</strong>. Don't let your exams go offline—renew now to maintain full access to all features.`,
        'Renew Now',
        'https://durrahtutors.com/settings',
        '#f97316'
      )
    },
    subscription_expired: {
      subject: 'Alert: Your access has expired',
      html: MasterLayout(
        'Access to your dashboard has expired',
        'EXPIRED',
        `Your subscription expired on <strong>${expiryDate}</strong>. Your data is safely stored, but you will need to renew to continue using the platform.`,
        'Reactivate Now',
        'https://durrahtutors.com/settings',
        '#ef4444'
      )
    },
    subscription_expired_3d: {
      subject: 'We miss you at Durrah for Tutors',
      html: MasterLayout(
        'Come back to the platform',
        'WE MISS YOU',
        `It's been a few days since your subscription ended. Your exams and data are waiting for you—reactivate now to continue your journey.`,
        'Return to Dashboard',
        'https://durrahtutors.com/settings',
        '#4f46e5'
      )
    },
    password_reset: {
      subject: 'Security: Password Reset Request',
      html: MasterLayout(
        'Reset your account password',
        'SECURITY',
        `We received a request to reset your password. If you didn't request this, you can safely ignore this email. Otherwise, use the button below to proceed.`,
        'Reset Password',
        resetUrl || '#',
        '#6366f1'
      )
    },
    email_verification: {
      subject: 'Action Required: Verify your email',
      html: MasterLayout(
        'Confirm your email address',
        'VERIFICATION',
        `Thanks for joining! Please verify your email to unlock all features of the Durrah for Tutors platform.`,
        'Verify Email',
        resetUrl || '#',
        '#10b981'
      )
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
    const { userId, email, name, emailType = 'welcome', resetToken, verificationToken }: EmailRequest = await req.json()

    if (!email) {
      throw new Error('email is required')
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user profile for subscription info if needed
    let expiryDate = undefined
    let resetUrl = undefined

    // Handle password reset and email verification URLs
    if (emailType === 'password_reset' && resetToken) {
      resetUrl = `https://durrahtutors.com/update-password?token=${resetToken}`
    } else if (emailType === 'email_verification' && verificationToken) {
      resetUrl = `https://durrahtutors.com/verify-email?token=${verificationToken}`
    }

    if (emailType !== 'welcome' && emailType !== 'password_reset' && emailType !== 'email_verification' && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_end_date')
        .eq('id', userId)
        .single()

      if (profile?.subscription_end_date) {
        expiryDate = new Date(profile.subscription_end_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }

    const template = getEmailTemplate(emailType, name || email.split('@')[0], expiryDate, resetUrl)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Durrah for Tutors <info@durrahtutors.com>',
        to: [email],
        subject: template.subject,
        html: template.html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`)
    }

    // Log the email in database (only if userId exists)
    if (userId) {
      await supabase.from('email_logs').insert({
        user_id: userId,
        email_type: emailType,
        recipient_email: email,
        status: 'sent',
      })
    }

    // Update last_reminder_sent_at if it's a subscription reminder
    if (emailType.startsWith('subscription_') && userId) {
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
