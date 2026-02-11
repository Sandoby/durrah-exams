import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderUnifiedEmailTemplate } from '../_shared/email-template.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const SITE_URL = 'https://durrahtutors.com'
const EMAIL_LOGO_URL = `${SITE_URL}/apple-touch-icon.png`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailType =
  | 'welcome'
  | 'subscription_reminder_7d'
  | 'subscription_reminder_3d'
  | 'subscription_expired'
  | 'subscription_expired_3d'
  | 'password_reset'
  | 'email_verification'

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

const getEmailTemplate = (type: string | null, expiryDate?: string) => {
  const emailType = (type || 'welcome') as EmailType

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
    password_reset: { subject: '', html: '' },
    email_verification: { subject: '', html: '' },
  }

  return templates[emailType] || templates.welcome
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const now = new Date()
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_end_date, subscription_status, last_reminder_sent_at, email_notifications_enabled')
      .not('subscription_end_date', 'is', null)

    if (error) {
      throw error
    }

    const results = {
      processed: 0,
      sent: 0,
      status_updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const profile of profiles) {
      results.processed++

      if (!profile.subscription_end_date) continue

      const expiryDate = new Date(profile.subscription_end_date)
      const lastReminder = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null
      const daysSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24) : 999

      if (expiryDate <= now && profile.subscription_status === 'active') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ subscription_status: 'expired' })
          .eq('id', profile.id)

        if (!updateError) {
          results.status_updated++
        } else {
          results.failed++
          results.errors.push(`Failed to deactivate ${profile.email}: ${JSON.stringify(updateError)}`)
        }
      }

      let emailType: string | null = null
      if (expiryDate <= threeDaysAgo) {
        emailType = 'subscription_expired_3d'
      } else if (expiryDate <= now) {
        emailType = 'subscription_expired'
      } else if (expiryDate <= threeDaysFromNow) {
        emailType = 'subscription_reminder_3d'
      } else if (expiryDate <= sevenDaysFromNow) {
        emailType = 'subscription_reminder_7d'
      }

      if (!emailType || !profile.email_notifications_enabled || daysSinceLastReminder < 0.95) {
        results.skipped++
        continue
      }

      try {
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

        const expiryStr = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        const template = getEmailTemplate(emailType, expiryStr)

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Durrah for Tutors <info@durrahtutors.com>',
            to: [profile.email],
            subject: template.subject,
            html: template.html,
          }),
        })

        if (resendResponse.ok) {
          results.sent++

          await supabase
            .from('profiles')
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .eq('id', profile.id)

          await supabase.from('email_logs').insert({
            user_id: profile.id,
            email_type: emailType,
            recipient_email: profile.email,
            status: 'sent',
          })
        } else {
          results.failed++
          const errorData = await resendResponse.text()
          results.errors.push(`Failed to send ${emailType} to ${profile.email}. Status: ${resendResponse.status}. Body: ${errorData}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Error sending email to ${profile.email}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
