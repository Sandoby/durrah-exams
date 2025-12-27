import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const now = new Date()
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // Get all profiles with upcoming or past expiry dates
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_end_date, last_reminder_sent_at, email_notifications_enabled')
      .not('subscription_end_date', 'is', null)
      .eq('email_notifications_enabled', true)

    if (error) {
      throw error
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0
    }

    for (const profile of profiles) {
      results.processed++

      const expiryDate = new Date(profile.subscription_expires_at)
      const lastReminder = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null
      const daysSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24) : 999

      // Skip if we sent a reminder in the last 23 hours (to avoid duplicate daily emails)
      if (daysSinceLastReminder < 0.95) {
        results.skipped++
        continue
      }

      let emailType: string | null = null

      // Determine which email to send
      if (expiryDate <= threeDaysAgo) {
        // 3 days after expiry
        emailType = 'subscription_expired_3d'
      } else if (expiryDate <= now) {
        // Expired today or in past
        emailType = 'subscription_expired'
      } else if (expiryDate <= threeDaysFromNow) {
        // Expires in 3 days or less
        emailType = 'subscription_reminder_3d'
      } else if (expiryDate <= sevenDaysFromNow) {
        // Expires in 7 days or less
        emailType = 'subscription_reminder_7d'
      }

      // Send email if needed
      if (emailType && profile.email) {
        try {
          // Call the send-welcome-email function (it handles all email types)
          const response = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: profile.id,
              email: profile.email,
              name: profile.full_name,
              emailType: emailType,
            }),
          })

          if (response.ok) {
            results.sent++
            console.log(`Sent ${emailType} to ${profile.email}`)
          } else {
            results.failed++
            const errorData = await response.text()
            console.error(`Failed to send ${emailType} to ${profile.email}:`, errorData)

            // Log failed attempt
            await supabase.from('email_logs').insert({
              user_id: profile.id,
              email_type: emailType,
              recipient_email: profile.email,
              status: 'failed',
              error_message: errorData,
            })
          }
        } catch (error) {
          results.failed++
          console.error(`Error sending ${emailType} to ${profile.email}:`, error)

          // Log failed attempt
          await supabase.from('email_logs').insert({
            user_id: profile.id,
            email_type: emailType,
            recipient_email: profile.email,
            status: 'failed',
            error_message: error.message,
          })
        }
      } else {
        results.skipped++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        timestamp: now.toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cron job error:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
