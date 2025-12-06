import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  userId: string
  email: string
  name?: string
  emailType?: 'welcome' | 'subscription_reminder_7d' | 'subscription_reminder_3d' | 'subscription_expired' | 'subscription_expired_3d'
}

const getEmailTemplate = (type: string, name: string, expiryDate?: string) => {
  const templates = {
    welcome: {
      subject: '🎉 Welcome to Durrah Exams!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Durrah Exams! 🎓</h1>
            </div>
            <div class="content">
              <p>Hi ${name || 'there'},</p>
              <p>Thank you for joining Durrah Exams! We're excited to have you on board.</p>
              <p>With Durrah Exams, you can:</p>
              <ul>
                <li>✨ Create unlimited exams with our smart AI question extractor</li>
                <li>📊 Track student performance with detailed analytics</li>
                <li>🔒 Ensure exam integrity with anti-cheating features</li>
                <li>💬 Get instant support through our AI-powered chat</li>
              </ul>
              <p>Ready to create your first exam?</p>
              <a href="https://durrahsystem.tech/dashboard" class="button">Go to Dashboard</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy teaching! 📚</p>
            </div>
            <div class="footer">
              <p>Durrah Exams - Making exams easier for educators</p>
              <p>© ${new Date().getFullYear()} Durrah System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_reminder_7d: {
      subject: '⏰ Your Durrah Exams subscription expires in 7 days',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fbbf24; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Expiring Soon ⏰</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your Durrah Exams subscription will expire on <strong>${expiryDate}</strong> (in 7 days).</p>
              <p>Don't lose access to your exams and student data. Renew now to continue enjoying:</p>
              <ul>
                <li>Unlimited exam creation</li>
                <li>AI-powered question extraction</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
              </ul>
              <a href="https://durrahsystem.tech/settings" class="button">Renew Subscription</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Durrah System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_reminder_3d: {
      subject: '🚨 Last chance! Your subscription expires in 3 days',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f97316; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Urgent: 3 Days Left! 🚨</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your subscription expires on <strong>${expiryDate}</strong> - that's only 3 days away!</p>
              <p>Act now to avoid losing access to your exams and student data.</p>
              <a href="https://durrahsystem.tech/settings" class="button">Renew Now</a>
              <p>Questions? Contact our support team for assistance.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Durrah System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_expired: {
      subject: '⚠️ Your Durrah Exams subscription has expired',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Expired ⚠️</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your Durrah Exams subscription expired on <strong>${expiryDate}</strong>.</p>
              <p>Your exams and data are still safe, but you won't be able to create new exams or access analytics until you renew.</p>
              <a href="https://durrahsystem.tech/settings" class="button">Renew Subscription</a>
              <p>Need help? Our support team is here for you.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Durrah System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_expired_3d: {
      subject: '💔 We miss you! Reactivate your Durrah Exams account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>We Miss You! 💔</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>It's been 3 days since your subscription expired. We'd love to have you back!</p>
              <p>Your exams are waiting for you. Reactivate now and pick up right where you left off.</p>
              <a href="https://durrahsystem.tech/settings" class="button">Reactivate Account</a>
              <p>Have feedback or questions? We'd love to hear from you.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Durrah System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  return templates[type] || templates.welcome
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email, name, emailType = 'welcome' }: EmailRequest = await req.json()

    if (!userId || !email) {
      throw new Error('userId and email are required')
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user profile for subscription info if needed
    let expiryDate = undefined
    if (emailType !== 'welcome') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_expires_at')
        .eq('id', userId)
        .single()

      if (profile?.subscription_expires_at) {
        expiryDate = new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }

    const template = getEmailTemplate(emailType, name || email.split('@')[0], expiryDate)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Durrah Exams <noreply@durrahsystem.tech>',
        to: [email],
        subject: template.subject,
        html: template.html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`)
    }

    // Log the email in database
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_type: emailType,
      recipient_email: email,
      status: 'sent',
    })

    // Update last_reminder_sent_at if it's a subscription reminder
    if (emailType.startsWith('subscription_')) {
      await supabase
        .from('profiles')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', userId)
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
