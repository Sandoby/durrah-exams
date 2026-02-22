import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderUnifiedEmailTemplate } from '../_shared/email-template.ts'
import { SITE_URL } from '../_shared/email-constants.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_SECURITY_API_KEY = Deno.env.get('RESEND_.com_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CampaignEmailRequest {
  email: string
  senderEmail: string
  subject: string
  bodyHtml: string
  accentColor?: string
  apiKey: 'main' | 'security'
  userId?: string
}

const generateEmailHtml = (subject: string, bodyHtml: string, _accentColor: string) => {
  return renderUnifiedEmailTemplate({
    preheader: subject,
    title: subject,
    bodyHtml,
    accentColor: '#1d1d1f',
    siteUrl: SITE_URL,
    footerNote: 'You are receiving this because you are a Durrah for Tutors user.',
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      email,
      senderEmail,
      subject,
      bodyHtml,
      accentColor = '#4b47d6',
      apiKey = 'main',
      userId
    }: CampaignEmailRequest = await req.json()

    if (!email) {
      throw new Error('Recipient email is required')
    }

    if (!senderEmail) {
      throw new Error('Sender email is required')
    }

    if (!subject) {
      throw new Error('Email subject is required')
    }

    if (!bodyHtml) {
      throw new Error('Email body is required')
    }

    // Validate sender email domain
    if (!senderEmail.endsWith('@durrahtutors.com')) {
      throw new Error('Sender email must be from @durrahtutors.com domain')
    }

    // Select the appropriate API key
    const resendApiKey = apiKey === 'security' ? RESEND_SECURITY_API_KEY : RESEND_API_KEY

    if (!resendApiKey) {
      throw new Error(`${apiKey === 'security' ? 'Security' : 'Main'} API key is not configured`)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Generate the email HTML
    const emailHtml = generateEmailHtml(subject, bodyHtml, accentColor)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Durrah for Tutors <${senderEmail}>`,
        to: [email],
        subject: subject,
        html: emailHtml,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`)
    }

    // Log email send
    if (userId) {
      await supabase.from('email_logs').insert({
        user_id: userId,
        email_type: 'campaign',
        recipient_email: email,
        status: 'sent',
        metadata: {
          subject,
          sender: senderEmail,
          api_key_used: apiKey,
          resend_id: resendData.id
        }
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        message: 'Campaign email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending campaign email:', error)

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
