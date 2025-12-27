import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Async HMAC-SHA256 verification
async function verifyHmacSHA256(message: string, key: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(key)
    const messageData = encoder.encode(message)

    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { hash: 'SHA-256', name: 'HMAC' },
      false,
      ['sign']
    )

    const sig = await crypto.subtle.sign('HMAC', importedKey, messageData)
    const expectedSignature = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return signature === expectedSignature
  } catch (error) {
    console.error('HMAC verification error:', error)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('Received PaySky webhook:', payload)

    // Verify PaySky signature
    const payskySecretKey = Deno.env.get('PAYSKY_SECRET_KEY')
    const signature = payload.Signature

    if (signature && payskySecretKey) {
      const dataToSign = `${payload.MerchantReference}${payload.Amount}${payload.SystemReference}`
      const isValid = await verifyHmacSHA256(dataToSign, payskySecretKey, signature)

      if (!isValid) {
        console.error('Invalid PaySky signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { MerchantReference, Success, Message } = payload

    // Update payment record
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: Success ? 'completed' : 'failed',
        paysky_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_reference', MerchantReference)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      throw updateError
    }

    // If payment successful, activate subscription
    if (Success) {
      const { data: payment } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('merchant_reference', MerchantReference)
        .single()

      if (payment) {
        const endDate = new Date()
        const isYearly = payment.plan?.includes('yearly')
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
        }

        // Send success email notification
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
                orderId: MerchantReference,
                date: new Date().toISOString(),
                subscriptionEndDate: endDate.toISOString(),
                dashboardUrl: `https://tutors.durrahsystem.tech/dashboard`
              }
            }
          })
        } catch (emailError) {
          console.warn('Failed to send email:', emailError)
        }
        console.log('✅ Subscription activated for:', payment.user_email)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
