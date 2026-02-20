import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderUnifiedEmailTemplate } from '../_shared/email-template.ts'
import { SITE_URL, FROM_DEFAULT } from '../_shared/email-constants.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
  accentColor: string = '#1d1d1f',
  secondaryText?: string,
) =>
  renderUnifiedEmailTemplate({
    preheader: title,
    eyebrow: subtitle,
    title,
    bodyHtml: content,
    ctaText,
    ctaUrl,
    accentColor,
    secondaryText,
    siteUrl: SITE_URL,
  })

const getEmailTemplate = (type: EmailType, expiryDate?: string, resetUrl?: string) => {
  const templates: Record<EmailType, { subject: string; html: string }> = {
    welcome: {
      subject: 'Welcome to Durrah for Tutors',
      html: buildTemplate(
        'Welcome to the future of tutoring',
        'ACCOUNT CREATED',
        `Your account is now active. Start creating secure, high-quality exams and manage your students from a single dashboard.`,
        'Open Dashboard',
        `${SITE_URL}/dashboard`,
        '#1d1d1f',
        'This email was sent because you created an account on Durrah for Tutors.',
      ),
    },
    subscription_reminder_7d: {
      subject: 'Your subscription expires in 7 days',
      html: buildTemplate(
        'Your subscription is expiring soon',
        '7 DAYS REMAINING',
        `A friendly reminder: your subscription will expire on <strong>${expiryDate}</strong>. Renew today to keep uninterrupted access to your dashboard and student data.`,
        'Renew Subscription',
        `${SITE_URL}/settings`,
        '#1d1d1f',
      ),
    },
    subscription_reminder_3d: {
      subject: 'Action needed — 3 days until expiry',
      html: buildTemplate(
        'Your access expires in 3 days',
        '3 DAYS REMAINING',
        `Your subscription expires on <strong>${expiryDate}</strong>. Renew now to keep your exams live and your data accessible.`,
        'Renew Now',
        `${SITE_URL}/settings`,
        '#1d1d1f',
      ),
    },
    subscription_expired: {
      subject: 'Your subscription has expired',
      html: buildTemplate(
        'Your access has been paused',
        'EXPIRED',
        `Your subscription expired on <strong>${expiryDate}</strong>. Your data is safely stored and will be available the moment you reactivate.`,
        'Reactivate',
        `${SITE_URL}/settings`,
        '#1d1d1f',
      ),
    },
    subscription_expired_3d: {
      subject: 'We miss you — come back to Durrah',
      html: buildTemplate(
        'Your exams are waiting',
        'COME BACK',
        `It's been a few days since your subscription ended. Your data and exams remain safe. Renew to pick up right where you left off.`,
        'Return to Dashboard',
        `${SITE_URL}/settings`,
        '#1d1d1f',
      ),
    },
    password_reset: {
      subject: 'Reset your password',
      html: buildTemplate(
        'Reset your password',
        'SECURITY',
        `We received a request to reset your password. If you didn't make this request, you can safely ignore this email.`,
        'Reset Password',
        resetUrl || '#',
        '#1d1d1f',
        'This link expires in 1 hour. If you didn\'t request this, no action is needed.',
      ),
    },
    email_verification: {
      subject: 'Verify your email address',
      html: buildTemplate(
        'Confirm your email address',
        'VERIFICATION',
        `Verify your email to unlock all features of the Durrah for Tutors platform.`,
        'Verify Email',
        resetUrl || '#',
        '#1d1d1f',
        'If you didn\'t create an account, you can ignore this email.',
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
        from: FROM_DEFAULT,
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
