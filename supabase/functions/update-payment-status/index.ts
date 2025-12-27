import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge function to manually update payment status
 * Since payment providers don't support webhooks, payment confirmations
 * are sent to your admin email or shown in provider dashboard
 * 
 * You can:
 * 1. Call this function manually with orderId and status
 * 2. Set up a cron job to verify pending payments with provider APIs
 * 3. Build an admin panel to mark payments as successful
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId, status, paymentMethod, providerData } = await req.json()

    // Validate input
    if (!orderId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['completed', 'failed', 'cancelled'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be: completed, failed, or cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Updating payment status: ${orderId} -> ${status}`)

    // Fetch payment record
    const { data: payment, error: fetchError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('merchant_reference', orderId)
      .single()

    if (fetchError) {
      console.error('Payment not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update payment status
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status,
        kashier_response: providerData || {},
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_reference', orderId)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If payment successful, activate subscription
    if (status === 'completed') {
      const endDate = new Date()
      const isYearly = payment.plan?.toLowerCase().includes('yearly')
      if (isYearly) {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          subscription_plan: payment.plan?.includes('pro') ? 'Professional' : 'Starter',
          subscription_status: 'active',
          subscription_end_date: endDate.toISOString(),
        })
        .eq('email', payment.user_email)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      } else {
        console.log('✅ Subscription activated for:', payment.user_email)
      }

      // Send success email
      try {
        await supabaseClient.functions.invoke('send-payment-email', {
          body: {
            type: 'payment_success',
            email: payment.user_email,
            data: {
              userName: payment.user_email,
              plan: payment.plan,
              amount: payment.amount,
              currency: payment.currency,
              orderId,
              dashboardUrl: `https://tutors.durrahsystem.tech/dashboard`,
              date: new Date().toISOString(),
              subscriptionEndDate: endDate.toISOString()
            }
          }
        })
      } catch (emailError) {
        console.warn('Failed to send email:', emailError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment ${orderId} updated to ${status}`,
        payment: {
          merchant_reference: orderId,
          status,
          amount: payment.amount,
          user_email: payment.user_email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
