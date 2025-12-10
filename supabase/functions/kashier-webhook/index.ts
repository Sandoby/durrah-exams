import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('Received Kashier webhook:', payload)

    // Extract signature from headers
    const signature = req.headers.get('x-kashier-signature')
    const kashierApiKey = Deno.env.get('KASHIER_API_KEY')

    // Verify signature
    if (signature && kashierApiKey) {
      const {
        paymentStatus,
        cardDataToken,
        maskedCard,
        merchantOrderId,
        orderId,
        cardBrand,
        orderReference,
        transactionId,
        amount,
        currency
      } = payload

      const queryString = 
        `&paymentStatus=${paymentStatus}` +
        `&cardDataToken=${cardDataToken || ''}` +
        `&maskedCard=${maskedCard || ''}` +
        `&merchantOrderId=${merchantOrderId}` +
        `&orderId=${orderId}` +
        `&cardBrand=${cardBrand || ''}` +
        `&orderReference=${orderReference}` +
        `&transactionId=${transactionId}` +
        `&amount=${amount}` +
        `&currency=${currency}`

      const finalUrl = queryString.substr(1)
      const hmac = new Hmac('sha256', kashierApiKey)
      const expectedSignature = hmac.update(finalUrl).toString()

      if (signature !== expectedSignature) {
        console.error('Invalid signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { merchantOrderId, paymentStatus, amount, currency } = payload

    // Update payment record
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: paymentStatus === 'SUCCESS' ? 'completed' : 'failed',
        kashier_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_reference', merchantOrderId)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      throw updateError
    }

    // If payment successful, activate subscription
    if (paymentStatus === 'SUCCESS') {
      // Get payment record to find user
      const { data: payment } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('merchant_reference', merchantOrderId)
        .single()

      if (payment) {
        // Calculate subscription end date
        const endDate = new Date()
        const isYearly = payment.plan?.includes('yearly')
        if (isYearly) {
          endDate.setFullYear(endDate.getFullYear() + 1)
        } else {
          endDate.setMonth(endDate.getMonth() + 1)
        }

        // Update user profile
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
        }

        // TODO: Send success email notification
        console.log('✅ Subscription activated for:', payment.user_email)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
