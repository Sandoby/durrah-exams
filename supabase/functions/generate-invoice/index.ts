import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { paymentId } = await req.json()

    // Fetch payment details
    const { data: payment, error } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      throw new Error('Payment not found')
    }

    // Generate HTML invoice
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company-logo { font-size: 32px; font-weight: bold; color: #667eea; }
            .invoice-title { font-size: 36px; color: #333; margin: 0; }
            .details-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .details-table td { padding: 12px; border-bottom: 1px solid #eee; }
            .details-table td:first-child { font-weight: bold; width: 200px; color: #666; }
            .amount-table { width: 100%; border-collapse: collapse; margin: 30px 0; background: #f9f9f9; }
            .amount-table th, .amount-table td { padding: 15px; text-align: left; }
            .amount-table th { background: #667eea; color: white; }
            .total-row { font-size: 20px; font-weight: bold; background: white; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div>
                <div class="company-logo">Durrah for Tutors</div>
                <p>Smart Village, Giza, Egypt<br>
                support@durrahsystem.tech<br>
                www.durrahsystem.tech</p>
              </div>
              <div style="text-align: right;">
                <h1 class="invoice-title">INVOICE</h1>
                <p><strong>Invoice #:</strong> ${payment.merchant_reference}<br>
                <strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}<br>
                <strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">${payment.status.toUpperCase()}</span></p>
              </div>
            </div>

            <h3 style="margin-bottom: 10px;">Bill To:</h3>
            <p style="margin: 0; color: #666;">${payment.user_email}</p>

            <table class="details-table">
              <tr>
                <td>Payment Method</td>
                <td>${payment.payment_method.toUpperCase()}</td>
              </tr>
              <tr>
                <td>Transaction ID</td>
                <td>${payment.merchant_reference}</td>
              </tr>
              <tr>
                <td>Payment Date</td>
                <td>${new Date(payment.created_at).toLocaleString()}</td>
              </tr>
            </table>

            <table class="amount-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${payment.plan} Subscription</td>
                  <td style="text-align: right;">${payment.currency} ${payment.amount.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td>Total</td>
                  <td style="text-align: right;">${payment.currency} ${payment.amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h4 style="margin: 0 0 10px 0; color: #0369a1;">What's Included:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                <li>Unlimited exam creation and student management</li>
                <li>Advanced anti-cheating measures</li>
                <li>AI-powered question extraction</li>
                <li>Real-time analytics and reporting</li>
                <li>Priority customer support</li>
              </ul>
            </div>

            <div class="footer">
              <p>Thank you for your business!</p>
              <p>This invoice was automatically generated by Durrah for Tutors.<br>
              For questions about this invoice, contact support@durrahsystem.tech</p>
              <p>© ${new Date().getFullYear()} Durrah for Tutors. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // For now, return HTML (in production, you'd convert to PDF using puppeteer or similar)
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
