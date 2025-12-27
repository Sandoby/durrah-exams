import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email Helper Functions
type EmailType = 'welcome' | 'subscription_reminder_7d' | 'subscription_reminder_3d' | 'subscription_expired' | 'subscription_expired_3d' | 'password_reset' | 'email_verification'

const getEmailTemplate = (type: string | null, name: string, expiryDate?: string) => {
  const emailType = (type || 'welcome') as EmailType
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
        'https://tutors.durrahsystem.tech/dashboard'
      )
    },
    subscription_reminder_7d: {
      subject: 'Subscription Reminder: 7 days remaining',
      html: MasterLayout(
        'Your subscription is expiring soon',
        '7 DAYS LEFT',
        `This is a friendly reminder that your subscription will expire on <strong>${expiryDate}</strong>. Renew today to keep your dashboard and student data accessible.`,
        'Renew Subscription',
        'https://tutors.durrahsystem.tech/settings',
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
        'https://tutors.durrahsystem.tech/settings',
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
        'https://tutors.durrahsystem.tech/settings',
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
        'https://tutors.durrahsystem.tech/settings',
        '#4f46e5'
      )
    },
    password_reset: { subject: '', html: '' },
    email_verification: { subject: '', html: '' }
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

    // Get all profiles with subscription end dates
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
      errors: [] as string[]
    }

    for (const profile of profiles) {
      results.processed++

      if (!profile.subscription_end_date) continue;

      const expiryDate = new Date(profile.subscription_end_date)
      const lastReminder = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null
      const daysSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24) : 999

      // 1. Check for Status Update (Deactivation)
      // If expired and still marked as active, deactivate it
      if (expiryDate <= now && profile.subscription_status === 'active') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ subscription_status: 'expired' })
          .eq('id', profile.id)

        if (!updateError) {
          results.status_updated++
          console.log(`Deactivated subscription for ${profile.email}`)
        } else {
          results.failed++
          const errorMsg = `Failed to deactivate ${profile.email}: ${JSON.stringify(updateError)}`
          console.error(errorMsg)
          results.errors.push(errorMsg)
        }
      }

      // 2. Determine which email to send (if any)
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

      // 3. Skip email if:
      // - No email type determined
      // - Notifications disabled
      // - Sent too recently (last 23 hours)
      // NOTE: For testing purposes, we might want to bypass the time check if needed, but for prod keep it.
      if (!emailType || !profile.email_notifications_enabled || daysSinceLastReminder < 0.95) {
        results.skipped++
        continue
      }

      // Send email directly
      try {
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

        // Fetch user name if not present in profile object (should be there from select)
        const name = profile.full_name || profile.email.split('@')[0]
        const expiryStr = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        const template = getEmailTemplate(emailType, name, expiryStr)

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Durrah for Tutors <noreply@durrahsystem.tech>',
            to: [profile.email],
            subject: template.subject,
            html: template.html,
          }),
        })

        if (resendResponse.ok) {
          results.sent++
          console.log(`Sent ${emailType} to ${profile.email}`)

          // Update last_reminder_sent_at
          await supabase
            .from('profiles')
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .eq('id', profile.id)

          // Log to email_logs
          await supabase.from('email_logs').insert({
            user_id: profile.id,
            email_type: emailType,
            recipient_email: profile.email,
            status: 'sent',
          })

        } else {
          results.failed++
          const errorData = await resendResponse.text()
          const errorMsg = `Failed to send ${emailType} to ${profile.email}. Status: ${resendResponse.status}. Body: ${errorData}`
          console.error(errorMsg)
          results.errors.push(errorMsg)
        }
      } catch (error) {
        results.failed++
        const errorMsg = `Error sending email to ${profile.email}: ${error instanceof Error ? error.message : String(error)}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cron job error:', error)

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
