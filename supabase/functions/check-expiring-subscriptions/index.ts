import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      skipped: 0
    }

    for (const profile of profiles) {
      results.processed++

      if (!profile.subscription_end_date) continue;

      const expiryDate = new Date(profile.subscription_end_date)
      const lastReminder = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null
      const daysSinceLastReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24) : 999

      // 1. Check for Status Update (Deactivation)
      // If expired and still marked as active, deactivate it
      console.log(`[${profile.email}] Expiry: ${expiryDate.toISOString()}, Status: ${profile.subscription_status}, Now: ${now.toISOString()}, Expired: ${expiryDate <= now}`)

      if (expiryDate <= now && profile.subscription_status === 'active') {
        console.log(`[${profile.email}] Attempting deactivation (ID: ${profile.id})...`)

        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ subscription_status: 'expired' })
          .eq('id', profile.id)
          .select()

        if (!updateError) {
          results.status_updated++
          console.log(`✅ [${profile.email}] Deactivated successfully:`, updateData)
        } else {
          results.failed++
          console.error(`❌ [${profile.email}] Deactivation failed:`, JSON.stringify(updateError))
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
      if (!emailType || !profile.email_notifications_enabled || daysSinceLastReminder < 0.95) {
        results.skipped++
        continue
      }

      // Send email
      try {
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
        }
      } catch (error) {
        results.failed++
        console.error(`Error sending email to ${profile.email}:`, error)
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
