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
        subject = 'Invoice & Payment Confirmation: Durrah for Tutors'
        const logoUrl = 'https://tutors.durrahsystem.tech/Picture1.png'
        html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                body { 
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0; padding: 0; background-color: #f9fbfc; color: #1a202c;
                }
                .wrapper { width: 100%; table-layout: fixed; background-color: #f9fbfc; padding: 60px 0; }
                .container {
                  max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; 
                  overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .header { padding: 40px 0; text-align: center; border-bottom: 1px solid #f1f5f9; }
                .logo-img { width: 44px; height: 44px; vertical-align: middle; display: inline-block; }
                .logo-text { font-size: 24px; font-weight: 700; color: #6366f1; margin-left: 10px; display: inline-block; vertical-align: middle; }
                .logo-text span { color: #64748b; font-weight: 300; margin-left: 4px; }
                
                .content { padding: 48px; }
                .title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px; text-align: center; }
                .text { color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 32px; text-align: center; }
                
                .invoice-box {
                  background: #f8fafc; border-radius: 8px; padding: 24px; border: 1px solid #f1f5f9; margin-bottom: 32px;
                }
                .invoice-item {
                  display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eef2f7; font-size: 14px;
                }
                .invoice-item:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
                .invoice-item.total { padding-top: 16px; margin-top: 12px; border-top: 2px solid #eef2f7; font-weight: 700; font-size: 16px; color: #6366f1; }
                .label { color: #64748b; font-weight: 500; }
                .value { color: #0f172a; }

                .action-container { text-align: center; margin-top: 32px; }
                .btn {
                  background: #6366f1; color: #ffffff !important; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;
                }
                
                .footer { padding-bottom: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <div class="header">
                    <img src="${logoUrl}" class="logo-img" alt="Durrah Logo">
                    <div class="logo-text">Durrah<span>for Tutors</span></div>
                  </div>
                  <div class="content">
                    <h1 class="title">Payment Successful</h1>
                    <p class="text">Hello ${data.userName || 'Tutor'}, your payment has been processed and your account is ready. You can find your invoice details below.</p>
                    
                    <div class="invoice-box">
                      <div class="invoice-item">
                        <span class="label">Invoice ID</span>
                        <span class="value">${data.orderId}</span>
                      </div>
                      <div class="invoice-item">
                        <span class="label">Date</span>
                        <span class="value">${data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString()}</span>
                      </div>
                      <div class="invoice-item">
                        <span class="label">Service</span>
                        <span class="value">${data.plan}</span>
                      </div>
                      <div class="invoice-item">
                        <span class="label">Valid Until</span>
                        <span class="value">${data.subscriptionEndDate ? new Date(data.subscriptionEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active'}</span>
                      </div>
                      <div class="invoice-item total">
                        <span class="label">Amount Paid</span>
                        <span class="value">${data.currency || 'EGP'} ${data.amount}</span>
                      </div>
                    </div>

                    <div class="action-container">
                      <a href="${data.dashboardUrl}" class="btn">Go to Dashboard</a>
                    </div>
                  </div>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Durrah Systems. All rights reserved.</p>
                  <p>Building the future of secure education.</p>
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
