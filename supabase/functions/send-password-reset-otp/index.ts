import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_.com_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OTPRequest {
  email: string
}

// Generate cryptographically secure 6-digit OTP
const generateSecureOTP = (): string => {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 1000000).toString().padStart(6, '0')
}

// Professional clean white email template
const createOTPEmailTemplate = (otpCode: string): string => {
  // Base64 encoded logo - embedded directly in email
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-color: #f5f5f7;
            padding: 40px 20px;
          }

          .email-wrapper {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .header {
            background: #ffffff;
            padding: 40px 40px 32px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
          }

          .logo-container {
            display: inline-block;
            margin-bottom: 24px;
          }

          .logo {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: block;
          }

          .header-title {
            font-size: 14px;
            font-weight: 600;
            color: #86868b;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .header-subtitle {
            font-size: 28px;
            font-weight: 700;
            color: #1d1d1f;
            letter-spacing: -0.5px;
            line-height: 1.2;
          }

          .content {
            padding: 48px 40px;
            background: #ffffff;
          }

          .greeting {
            font-size: 16px;
            color: #1d1d1f;
            line-height: 1.6;
            margin-bottom: 32px;
          }

          .otp-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border: 2px solid #e8e8ed;
            border-radius: 12px;
            padding: 40px 32px;
            text-align: center;
            margin: 32px 0;
            position: relative;
          }

          .otp-label {
            font-size: 12px;
            font-weight: 600;
            color: #86868b;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 16px;
          }

          .otp-code-wrapper {
            background: #ffffff;
            border: 2px solid #e8e8ed;
            border-radius: 10px;
            padding: 20px 24px;
            display: inline-block;
            margin: 0 auto 16px;
          }

          .otp-code {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: 16px;
            color: #000000;
            font-family: 'Courier New', Consolas, monospace;
            line-height: 1;
            margin-left: 8px;
          }

          .otp-expiry {
            font-size: 14px;
            color: #86868b;
            font-weight: 500;
            margin-top: 16px;
          }

          .otp-expiry strong {
            color: #1d1d1f;
          }

          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e8e8ed, transparent);
            margin: 32px 0;
          }

          .info-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px 24px;
            margin: 24px 0;
          }

          .info-title {
            font-size: 14px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }

          .info-icon {
            width: 18px;
            height: 18px;
            margin-right: 8px;
            display: inline-block;
          }

          .info-text {
            font-size: 14px;
            color: #515154;
            line-height: 1.6;
            margin: 0;
          }

          .security-notice {
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
          }

          .security-notice-text {
            font-size: 13px;
            color: #78350f;
            line-height: 1.6;
            margin: 0;
          }

          .security-notice-text strong {
            color: #92400e;
            font-weight: 600;
          }

          .footer {
            background: #fafafa;
            padding: 32px 40px;
            text-align: center;
            border-top: 1px solid #f0f0f0;
          }

          .footer-text {
            font-size: 13px;
            color: #86868b;
            line-height: 1.6;
            margin-bottom: 12px;
          }

          .footer-links {
            font-size: 12px;
            color: #86868b;
            margin-top: 16px;
          }

          .footer-link {
            color: #0066cc;
            text-decoration: none;
            margin: 0 8px;
          }

          .footer-link:hover {
            text-decoration: underline;
          }

          .footer-copyright {
            font-size: 12px;
            color: #a1a1a6;
            margin-top: 16px;
          }

          /* Mobile responsive */
          @media only screen and (max-width: 600px) {
            body {
              padding: 20px 10px;
            }

            .email-wrapper {
              border-radius: 12px;
            }

            .header,
            .content,
            .footer {
              padding-left: 24px;
              padding-right: 24px;
            }

            .header-subtitle {
              font-size: 24px;
            }

            .otp-code {
              font-size: 36px;
              letter-spacing: 12px;
            }

            .otp-container {
              padding: 32px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <!-- Header -->
          <div class="header">
            <div class="logo-container">
              <img src="${logoBase64}" alt="Durrah" class="logo">
            </div>
            <div class="header-title">Password Reset</div>
            <div class="header-subtitle">Verify Your Identity</div>
          </div>

          <!-- Main Content -->
          <div class="content">
            <p class="greeting">
              Hello,
            </p>
            <p class="greeting">
              We received a request to reset your password. To continue, please use the verification code below:
            </p>

            <!-- OTP Code Section -->
            <div class="otp-container">
              <div class="otp-label">Verification Code</div>
              <div class="otp-code-wrapper">
                <div class="otp-code">${otpCode}</div>
              </div>
              <div class="otp-expiry">
                <strong>Expires in 15 minutes</strong> • 3 attempts available
              </div>
            </div>

            <div class="divider"></div>

            <!-- Instructions -->
            <div class="info-section">
              <div class="info-title">
                <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                How to use this code
              </div>
              <p class="info-text">
                Enter this 6-digit code on the password reset page to verify your identity and create a new password. The code is valid for 15 minutes.
              </p>
            </div>

            <!-- Security Notice -->
            <div class="security-notice">
              <p class="security-notice-text">
                <strong>Didn't request this?</strong> If you didn't initiate this password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This is an automated message from Durrah for Tutors.<br>
              Please do not reply to this email.
            </p>
            <div class="footer-links">
              <a href="https://durrahtutors.com" class="footer-link">Website</a>
              <a href="https://durrahtutors.com/support" class="footer-link">Support</a>
              <a href="https://durrahtutors.com/privacy" class="footer-link">Privacy</a>
            </div>
            <p class="footer-copyright">
              © ${new Date().getFullYear()} Durrah Systems. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Check rate limits
const checkRateLimit = async (
  supabase: any,
  email: string,
  ipAddress: string
): Promise<{ allowed: boolean; error?: string }> => {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Check email rate limit (3 requests/hour)
  const { data: emailLimit } = await supabase
    .from('password_reset_rate_limits')
    .select('*')
    .eq('identifier', email)
    .eq('identifier_type', 'email')
    .gt('window_start', hourAgo)
    .single()

  if (emailLimit && emailLimit.request_count >= 3) {
    return { allowed: false, error: 'Too many requests for this email. Please try again later.' }
  }

  // Check IP rate limit (10 requests/hour)
  const { data: ipLimit } = await supabase
    .from('password_reset_rate_limits')
    .select('*')
    .eq('identifier', ipAddress)
    .eq('identifier_type', 'ip')
    .gt('window_start', hourAgo)
    .single()

  if (ipLimit && ipLimit.request_count >= 10) {
    return { allowed: false, error: 'Too many requests from this location. Please try again later.' }
  }

  // Update or insert email rate limit
  if (emailLimit) {
    await supabase
      .from('password_reset_rate_limits')
      .update({
        request_count: emailLimit.request_count + 1,
        last_request_at: new Date().toISOString(),
      })
      .eq('id', emailLimit.id)
  } else {
    await supabase
      .from('password_reset_rate_limits')
      .insert({
        identifier: email,
        identifier_type: 'email',
        request_count: 1,
        window_start: new Date().toISOString(),
      })
  }

  // Update or insert IP rate limit
  if (ipLimit) {
    await supabase
      .from('password_reset_rate_limits')
      .update({
        request_count: ipLimit.request_count + 1,
        last_request_at: new Date().toISOString(),
      })
      .eq('id', ipLimit.id)
  } else {
    await supabase
      .from('password_reset_rate_limits')
      .insert({
        identifier: ipAddress,
        identifier_type: 'ip',
        request_count: 1,
        window_start: new Date().toISOString(),
      })
  }

  return { allowed: true }
}

// Log audit event
const logAudit = async (
  supabase: any,
  email: string,
  eventType: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  errorMessage?: string
) => {
  await supabase.from('password_reset_audit_log').insert({
    email,
    event_type: eventType,
    ip_address: ipAddress,
    user_agent: userAgent,
    success,
    error_message: errorMessage,
  })
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request
    const { email }: OTPRequest = await req.json()

    // Get IP and User-Agent for rate limiting and audit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Validate email
    if (!email || !email.includes('@')) {
      await logAudit(supabase, email, 'otp_requested', ipAddress, userAgent, false, 'Invalid email format')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(supabase, email, ipAddress)
    if (!rateLimitCheck.allowed) {
      await logAudit(supabase, email, 'otp_requested', ipAddress, userAgent, false, rateLimitCheck.error)
      return new Response(
        JSON.stringify({ success: false, error: rateLimitCheck.error }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists (prevent enumeration attack)
    const { data: user } = await supabase.auth.admin.listUsers()
    const userExists = user?.users?.some((u) => u.email === email)

    if (!userExists) {
      // Log but don't reveal user doesn't exist (security best practice)
      await logAudit(supabase, email, 'otp_requested', ipAddress, userAgent, false, 'User not found')
      // Return success to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: 'If the email exists, an OTP has been sent.', expiresIn: 900 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate OTP
    const otpCode = generateSecureOTP()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

    // Store OTP in database
    const { error: otpError } = await supabase.from('password_reset_otps').insert({
      email,
      otp_code: otpCode,
      expires_at: expiresAt,
      ip_address: ipAddress,
    })

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      await logAudit(supabase, email, 'otp_requested', ipAddress, userAgent, false, otpError.message)
      throw new Error('Failed to generate OTP')
    }

    // Send email via Resend
    const emailTemplate = createOTPEmailTemplate(otpCode)

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Durrah Security <security@durrahtutors.com>',
        to: [email],
        subject: 'Password Reset Code - Durrah Tutors',
        html: emailTemplate,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      const errorMsg = `Resend API error: ${JSON.stringify(resendData)}`
      await logAudit(supabase, email, 'otp_requested', ipAddress, userAgent, false, errorMsg)
      throw new Error(errorMsg)
    }

    // Log successful OTP request
    await logAudit(supabase, email, 'otp_requested', ipAddress, userAgent, true)

    console.log(`OTP sent successfully to ${email}, expires at ${expiresAt}`)

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully', expiresIn: 900 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in send-password-reset-otp:', error)

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
