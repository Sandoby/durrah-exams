import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, email, data } = await req.json()
    
    let subject = ''
    let html = ''

    switch (type) {
      case 'payment_success':
        subject = '✅ Payment Successful - Durrah for Tutors'
        html = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Payment Successful!</h1>
                </div>
                <div class="content">
                  <p>Dear ${data.userName || 'Valued Customer'},</p>
                  <p>Thank you for subscribing to Durrah for Tutors! Your payment has been processed successfully.</p>
                  
                  <div class="details">
                    <h3>Payment Details</h3>
                    <div class="details-row">
                      <span><strong>Plan:</strong></span>
                      <span>${data.plan}</span>
                    </div>
                    <div class="details-row">
                      <span><strong>Amount:</strong></span>
                      <span>${data.currency} ${data.amount}</span>
                    </div>
                    <div class="details-row">
                      <span><strong>Order ID:</strong></span>
                      <span>${data.orderId}</span>
                    </div>
                    <div class="details-row">
                      <span><strong>Date:</strong></span>
                      <span>${new Date(data.date).toLocaleDateString()}</span>
                    </div>
                    <div class="details-row">
                      <span><strong>Subscription Valid Until:</strong></span>
                      <span>${new Date(data.subscriptionEndDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p style="text-align: center;">
                    <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
                  </p>

                  <p>Your subscription is now active and you can access all premium features.</p>
                  
                  <p>If you have any questions, please don't hesitate to contact our support team.</p>
                  
                  <p>Best regards,<br>The Durrah Team</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</p>
                  <p>This is an automated email. Please do not reply.</p>
                </div>
              </div>
            </body>
          </html>
        `
        break

      case 'payment_failed':
        subject = '❌ Payment Failed - Durrah for Tutors'
        html = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Payment Could Not Be Processed</h1>
                </div>
                <div class="content">
                  <p>Dear ${data.userName || 'Customer'},</p>
                  <p>We were unable to process your payment for Durrah for Tutors subscription.</p>
                  
                  <p><strong>Reason:</strong> ${data.reason || 'Payment was declined'}</p>
                  
                  <p>Please try again or use a different payment method.</p>

                  <p style="text-align: center;">
                    <a href="${data.checkoutUrl}" class="button">Try Again</a>
                  </p>

                  <p>If you continue to experience issues, please contact your bank or our support team.</p>
                  
                  <p>Best regards,<br>The Durrah Team</p>
                </div>
              </div>
            </body>
          </html>
        `
        break

      case 'subscription_expiring':
        subject = '⏰ Your Subscription Expires Soon - Durrah for Tutors'
        html = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⏰ Subscription Expiring Soon</h1>
                </div>
                <div class="content">
                  <p>Dear ${data.userName || 'Valued Customer'},</p>
                  <p>Your Durrah for Tutors subscription will expire on <strong>${new Date(data.expiryDate).toLocaleDateString()}</strong>.</p>
                  
                  <p>Renew now to continue enjoying:</p>
                  <ul>
                    <li>Unlimited exams and students</li>
                    <li>Advanced anti-cheating measures</li>
                    <li>AI-powered question extraction</li>
                    <li>Priority support</li>
                  </ul>

                  <p style="text-align: center;">
                    <a href="${data.renewUrl}" class="button">Renew Subscription</a>
                  </p>

                  <p>Best regards,<br>The Durrah Team</p>
                </div>
              </div>
            </body>
          </html>
        `
        break
    }

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Durrah for Tutors <noreply@durrahsystem.tech>',
        to: [email],
        subject: subject,
        html: html,
      }),
    })

    if (res.ok) {
      const responseData = await res.json()
      return new Response(JSON.stringify({ success: true, data: responseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      const error = await res.text()
      throw new Error(error)
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
