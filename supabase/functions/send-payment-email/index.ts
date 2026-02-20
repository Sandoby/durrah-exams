import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { renderUnifiedEmailTemplate, renderDetailCard } from '../_shared/email-template.ts'
import { SITE_URL, FROM_DEFAULT } from '../_shared/email-constants.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PaymentEmailType = 'payment_success' | 'payment_failed' | 'subscription_expiring' | 'subscription_renewed'

const createPaymentTemplate = (type: PaymentEmailType, data: Record<string, unknown>) => {
  switch (type) {
    case 'payment_success': {
      const subject = 'Payment confirmed'
      const detailCard = renderDetailCard([
        { label: 'Invoice', value: String(data.orderId || '-') },
        { label: 'Date', value: data.date ? new Date(String(data.date)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString() },
        { label: 'Plan', value: String(data.plan || '-') },
        { label: 'Valid Until', value: data.subscriptionEndDate ? new Date(String(data.subscriptionEndDate)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active' },
        { label: 'Amount', value: `${String(data.currency || 'EGP')} ${String(data.amount || '-')}` },
      ])
      const bodyHtml = `
        <div style="margin-bottom:16px;">Hello ${String(data.userName || 'there')}, your payment has been processed successfully.</div>
        ${detailCard}
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Your payment has been confirmed',
          eyebrow: 'PAYMENT CONFIRMED',
          title: 'Payment successful',
          bodyHtml,
          ctaText: 'Go to Dashboard',
          ctaUrl: String(data.dashboardUrl || `${SITE_URL}/dashboard`),
          accentColor: '#1d1d1f',
          secondaryText: 'A copy of this invoice is available in your dashboard.',
          siteUrl: SITE_URL,
        }),
      }
    }

    case 'payment_failed': {
      const subject = 'Payment could not be processed'
      const detailCard = renderDetailCard([
        { label: 'Reason', value: String(data.reason || 'Payment was declined') },
      ])
      const bodyHtml = `
        <div style="margin-bottom:16px;">We were unable to process your subscription payment.</div>
        ${detailCard}
        <div style="margin-top:16px;">Please try again or use a different payment method.</div>
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Payment could not be processed',
          eyebrow: 'PAYMENT FAILED',
          title: 'Payment could not be processed',
          bodyHtml,
          ctaText: 'Try Again',
          ctaUrl: String(data.checkoutUrl || `${SITE_URL}/settings`),
          accentColor: '#1d1d1f',
          secondaryText: 'Need help? Contact us at support@durrahtutors.com',
          siteUrl: SITE_URL,
        }),
      }
    }

    case 'subscription_expiring': {
      const subject = 'Your subscription expires soon'
      const bodyHtml = `
        <div style="margin-bottom:16px;">Your subscription will expire on <strong>${data.expiryDate ? new Date(String(data.expiryDate)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}</strong>.</div>
        <div style="margin-bottom:12px;">Renew now to keep access to all features:</div>
        <ul style="padding-left:20px;margin:0;color:#424245;">
          <li style="margin-bottom:6px;">Unlimited exams and students</li>
          <li style="margin-bottom:6px;">Advanced anti-cheating tools</li>
          <li style="margin-bottom:6px;">AI-powered question extraction</li>
          <li>Priority support</li>
        </ul>
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Your subscription is expiring soon',
          eyebrow: 'SUBSCRIPTION',
          title: 'Subscription expiring soon',
          bodyHtml,
          ctaText: 'Renew Subscription',
          ctaUrl: String(data.renewUrl || `${SITE_URL}/settings`),
          accentColor: '#1d1d1f',
          siteUrl: SITE_URL,
        }),
      }
    }

    case 'subscription_renewed':
    default: {
      const subject = 'Your subscription has been renewed'
      const detailCard = renderDetailCard([
        { label: 'Plan', value: String(data.planName || 'Professional') },
        { label: 'Renewed on', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
        { label: 'Valid Until', value: data.nextBillingDate ? new Date(String(data.nextBillingDate)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-' },
        { label: 'Amount', value: `${String(data.currency || 'EGP')} ${String(data.amount || '-')}` },
      ])
      const bodyHtml = `
        <div style="margin-bottom:16px;">Hello ${String(data.userName || 'there')}, your subscription has been successfully renewed.</div>
        ${detailCard}
        <div style="margin-top:16px;color:#424245;">Your premium features remain active. Thank you for being a valued member!</div>
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Your subscription has been renewed',
          eyebrow: 'SUBSCRIPTION RENEWED',
          title: 'Subscription renewed',
          bodyHtml,
          ctaText: 'Go to Dashboard',
          ctaUrl: String(data.dashboardUrl || `${SITE_URL}/dashboard`),
          accentColor: '#1d1d1f',
          secondaryText: 'Need help? Contact us at support@durrahtutors.com',
          siteUrl: SITE_URL,
        }),
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, email, data } = await req.json()
    const emailType = type as PaymentEmailType
    const payload = (data || {}) as Record<string, unknown>

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    if (!email) {
      throw new Error('email is required')
    }

    if (!['payment_success', 'payment_failed', 'subscription_expiring', 'subscription_renewed'].includes(emailType)) {
      throw new Error('Unsupported email type')
    }

    const emailMessage = createPaymentTemplate(emailType, payload)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_DEFAULT,
        to: [email],
        subject: emailMessage.subject,
        html: emailMessage.html,
      }),
    })

    if (res.ok) {
      const responseData = await res.json()
      return new Response(JSON.stringify({ success: true, data: responseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const errorText = await res.text()
    throw new Error(errorText)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
