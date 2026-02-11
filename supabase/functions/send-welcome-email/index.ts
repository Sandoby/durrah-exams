import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderUnifiedEmailTemplate } from '../_shared/email-template.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SITE_URL = 'https://durrahtutors.com'
const EMAIL_LOGO_URL = `${SITE_URL}/apple-touch-icon.png`

type EmailType =
  | 'welcome'
  | 'subscription_reminder_7d'
  | 'subscription_reminder_3d'
  | 'subscription_expired'
  | 'subscription_expired_3d'
  | 'password_reset'
  | 'email_verification'

interface EmailRequest {
  userId?: string
  email: string
  name?: string
  emailType?: EmailType
  resetToken?: string
  verificationToken?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const buildTemplate = (
  title: string,
  subtitle: string,
  content: string,
  ctaText?: string,
  ctaUrl?: string,
  accentColor: string = '#4b47d6',
) =>
  renderUnifiedEmailTemplate({
    preheader: title,
    eyebrow: subtitle,
    title,
    bodyHtml: content,
    ctaText,
    ctaUrl,
    accentColor,
    siteUrl: SITE_URL,
    logoUrl: EMAIL_LOGO_URL,
    footerNote: 'The standard for professional tutor management.',
  })

const getEmailTemplate = (type: EmailType, expiryDate?: string, resetUrl?: string) => {
  const templates: Record<EmailType, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to Durrah for Tutors',
      html: buildTemplate(
        'Welcome to the future of tutoring',
        'REGISTRATION SUCCESSFUL',
        `We're excited to help you take your tutoring practice to the next level. Your account is now active and you can start creating secure, high-quality exams immediately.`,
        'Get Started',
        `${SITE_URL}/dashboard`,
      ),
    },
    subscription_reminder_7d: {
      subject: 'Subscription Reminder: 7 days remaining',
      html: buildTemplate(
        'Your subscription is expiring soon',
        '7 DAYS LEFT',
        `This is a friendly reminder that your subscription will expire on <strong>${expiryDate}</strong>. Renew today to keep your dashboard and student data accessible.`,
        'Renew Subscription',
        `${SITE_URL}/settings`,
        '#eab308',
      ),
    },
    subscription_reminder_3d: {
      subject: 'Urgent: 3 days until subscription expires',
      html: buildTemplate(
        'Action required to stay active',
        '3 DAYS LEFT',
        `Your subscription expires on <strong>${expiryDate}</strong>. Don't let your exams go offline. Renew now to maintain full access to all features.`,
        'Renew Now',
        `${SITE_URL}/settings`,
        '#f97316',
      ),
    },
    subscription_expired: {
      subject: 'Alert: Your access has expired',
      html: buildTemplate(
        'Access to your dashboard has expired',
        'EXPIRED',
        `Your subscription expired on <strong>${expiryDate}</strong>. Your data is safely stored, but you will need to renew to continue using the platform.`,
        'Reactivate Now',
        `${SITE_URL}/settings`,
        '#ef4444',
      ),
    },
    subscription_expired_3d: {
      subject: 'We miss you at Durrah for Tutors',
      html: buildTemplate(
        'Come back to the platform',
        'WE MISS YOU',
        `It's been a few days since your subscription ended. Your exams and data are waiting for you. Reactivate now to continue your journey.`,
        'Return to Dashboard',
        `${SITE_URL}/settings`,
        '#4f46e5',
      ),
    },
    password_reset: {
      subject: 'Security: Password Reset Request',
      html: buildTemplate(
        'Reset your account password',
        'SECURITY',
        `We received a request to reset your password. If you didn't request this, you can safely ignore this email. Otherwise, use the button below to proceed.`,
        'Reset Password',
        resetUrl || '#',
      ),
    },
    email_verification: {
      subject: 'Action Required: Verify your email',
      html: buildTemplate(
        'Confirm your email address',
        'VERIFICATION',
        `Thanks for joining. Please verify your email to unlock all features of the Durrah for Tutors platform.`,
        'Verify Email',
        resetUrl || '#',
        '#10b981',
      ),
    },
  }

  return templates[type] || templates.welcome
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email, emailType = 'welcome', resetToken, verificationToken }: EmailRequest = await req.json()

    if (!email) {
      throw new Error('email is required')
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let expiryDate: string | undefined
    let resetUrl: string | undefined

    if (emailType === 'password_reset' && resetToken) {
      resetUrl = `${SITE_URL}/update-password?token=${resetToken}`
    } else if (emailType === 'email_verification' && verificationToken) {
      resetUrl = `${SITE_URL}/verify-email?token=${verificationToken}`
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
          day: 'numeric',
        })
      }
    }

    const template = getEmailTemplate(emailType, expiryDate, resetUrl)

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
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

    if (userId) {
      await supabase.from('email_logs').insert({
        user_id: userId,
        email_type: emailType,
        recipient_email: email,
        status: 'sent',
      })
    }

    if (emailType.startsWith('subscription_') && userId) {
      await supabase
        .from('profiles')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', userId)
    }

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending email:', error)

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
