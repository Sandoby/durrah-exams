import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { renderUnifiedEmailTemplate } from '../_shared/email-template.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = 'https://durrahtutors.com'
const EMAIL_LOGO_URL = `${SITE_URL}/apple-touch-icon.png`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PaymentEmailType = 'payment_success' | 'payment_failed' | 'subscription_expiring'

const createPaymentTemplate = (type: PaymentEmailType, data: Record<string, unknown>) => {
  switch (type) {
    case 'payment_success': {
      const subject = 'Invoice & Payment Confirmation: Durrah for Tutors'
      const bodyHtml = `
        <div style="margin-bottom:14px;">Hello ${String(data.userName || 'Tutor')}, your payment has been processed and your account is ready.</div>
        <div style="background:#f8fafc;border:1px solid #e8e8ed;border-radius:12px;padding:16px;margin:16px 0;">
          <div style="margin-bottom:8px;"><strong>Invoice ID:</strong> ${String(data.orderId || '-')}</div>
          <div style="margin-bottom:8px;"><strong>Date:</strong> ${data.date ? new Date(String(data.date)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString()}</div>
          <div style="margin-bottom:8px;"><strong>Service:</strong> ${String(data.plan || '-')}</div>
          <div style="margin-bottom:8px;"><strong>Valid Until:</strong> ${data.subscriptionEndDate ? new Date(String(data.subscriptionEndDate)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active'}</div>
          <div><strong>Amount Paid:</strong> ${String(data.currency || 'EGP')} ${String(data.amount || '-')}</div>
        </div>
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Payment successful',
          eyebrow: 'PAYMENT',
          title: 'Payment successful',
          bodyHtml,
          ctaText: 'Go to Dashboard',
          ctaUrl: String(data.dashboardUrl || `${SITE_URL}/dashboard`),
          accentColor: '#4b47d6',
          siteUrl: SITE_URL,
          logoUrl: EMAIL_LOGO_URL,
        }),
      }
    }

    case 'payment_failed': {
      const subject = 'Payment Failed - Durrah for Tutors'
      const bodyHtml = `
        <div style="margin-bottom:14px;">Dear ${String(data.userName || 'Customer')}, we were unable to process your subscription payment.</div>
        <div style="margin-bottom:14px;"><strong>Reason:</strong> ${String(data.reason || 'Payment was declined')}</div>
        <div>Please try again or use a different payment method.</div>
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Payment failed',
          eyebrow: 'PAYMENT',
          title: 'Payment could not be processed',
          bodyHtml,
          ctaText: 'Try Again',
          ctaUrl: String(data.checkoutUrl || `${SITE_URL}/settings`),
          accentColor: '#dc2626',
          siteUrl: SITE_URL,
          logoUrl: EMAIL_LOGO_URL,
        }),
      }
    }

    case 'subscription_expiring':
    default: {
      const subject = 'Your Subscription Expires Soon - Durrah for Tutors'
      const bodyHtml = `
        <div style="margin-bottom:14px;">Dear ${String(data.userName || 'Customer')}, your subscription will expire on <strong>${data.expiryDate ? new Date(String(data.expiryDate)).toLocaleDateString() : '-'}</strong>.</div>
        <div style="margin-bottom:10px;">Renew now to keep access to all features:</div>
        <ul style="padding-left:20px;margin:0;">
          <li>Unlimited exams and students</li>
          <li>Advanced anti-cheating tools</li>
          <li>AI-powered question extraction</li>
          <li>Priority support</li>
        </ul>
      `
      return {
        subject,
        html: renderUnifiedEmailTemplate({
          preheader: 'Subscription expiring soon',
          eyebrow: 'SUBSCRIPTION',
          title: 'Subscription expiring soon',
          bodyHtml,
          ctaText: 'Renew Subscription',
          ctaUrl: String(data.renewUrl || `${SITE_URL}/settings`),
          accentColor: '#f59e0b',
          siteUrl: SITE_URL,
          logoUrl: EMAIL_LOGO_URL,
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

    if (!['payment_success', 'payment_failed', 'subscription_expiring'].includes(emailType)) {
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
        from: 'Durrah for Tutors <support@durrahtutors.com>',
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
