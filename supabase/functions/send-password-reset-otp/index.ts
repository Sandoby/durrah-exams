import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderUnifiedEmailTemplate } from '../_shared/email-template.ts'
import { SITE_URL, FROM_SECURITY } from '../_shared/email-constants.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_.com_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PUBLIC_SITE_URL = (Deno.env.get('PUBLIC_SITE_URL') || SITE_URL).replace(/\/+$/, '')

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

// Apple-like, email-client-friendly OTP template
const createOTPEmailTemplate = (otpCode: string): string => {
  const bodyHtml = `
    <div style="margin-bottom:20px;">
      We received a request to reset your password. Use this verification code to continue:
    </div>
    <div style="text-align:center;padding:8px 0 24px 0;">
      <div style="display:inline-block;background:#f5f5f7;border:1px solid #e8e8ed;border-radius:14px;padding:18px 24px;">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:36px;line-height:40px;font-weight:700;letter-spacing:12px;color:#1d1d1f;margin-left:8px;">
          ${otpCode}
        </div>
      </div>
      <div style="font-size:12px;line-height:18px;color:#8e8e93;margin-top:12px;">
        Expires in <strong style="color:#1d1d1f;font-weight:600;">15 minutes</strong> &middot; 3 attempts available
      </div>
    </div>
    <div style="height:1px;background:#e8e8ed;line-height:1px;font-size:1px;margin:0 0 16px 0;">&nbsp;</div>
    <div style="font-size:13px;line-height:18px;color:#8e8e93;">
      If you didn't request this, you can safely ignore this email. Your account remains secure.
    </div>
  `

  return renderUnifiedEmailTemplate({
    preheader: `Your verification code is ${otpCode}. It expires in 15 minutes.`,
    eyebrow: 'SECURITY',
    title: 'Verify your identity',
    bodyHtml,
    siteUrl: PUBLIC_SITE_URL,
  })
}

const createOTPEmailText = (otpCode: string): string =>
  `Durrah Tutors password reset\n\nYour verification code is: ${otpCode}\n\nThis code expires in 15 minutes. If you didn't request this, you can ignore this email.`

// Check rate limits
const checkRateLimit = async (
  supabase: any,
  email: string,
  ipAddress: string
): Promise<{ allowed: boolean; error?: string }> => {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  // Fetch email rate limit record (if any)
  const { data: emailLimit, error: emailFetchError } = await supabase
    .from('password_reset_rate_limits')
    .select('*')
    .eq('identifier', email)
    .eq('identifier_type', 'email')
    .single()

  if (emailFetchError && emailFetchError.code !== 'PGRST116') {
    throw new Error(`Failed to read email rate limit: ${emailFetchError.message}`)
  }

  if (emailLimit && emailLimit.window_start > hourAgo && emailLimit.request_count >= 3) {
    return { allowed: false, error: 'Too many requests for this email. Please try again later.' }
  }

  // Fetch IP rate limit record (if any)
  const { data: ipLimit, error: ipFetchError } = await supabase
    .from('password_reset_rate_limits')
    .select('*')
    .eq('identifier', ipAddress)
    .eq('identifier_type', 'ip')
    .single()

  if (ipFetchError && ipFetchError.code !== 'PGRST116') {
    throw new Error(`Failed to read IP rate limit: ${ipFetchError.message}`)
  }

  if (ipLimit && ipLimit.window_start > hourAgo && ipLimit.request_count >= 10) {
    return { allowed: false, error: 'Too many requests from this location. Please try again later.' }
  }

  // Update email rate limit or start a new 1-hour window
  if (emailLimit) {
    const isInWindow = emailLimit.window_start > hourAgo
    const { error: emailUpdateError } = await supabase
      .from('password_reset_rate_limits')
      .update({
        request_count: isInWindow ? emailLimit.request_count + 1 : 1,
        window_start: isInWindow ? emailLimit.window_start : now,
        last_request_at: now,
      })
      .eq('id', emailLimit.id)

    if (emailUpdateError) {
      throw new Error(`Failed to update email rate limit: ${emailUpdateError.message}`)
    }
  } else {
    const { error: emailInsertError } = await supabase
      .from('password_reset_rate_limits')
      .insert({
        identifier: email,
        identifier_type: 'email',
        request_count: 1,
        window_start: now,
        last_request_at: now,
      })

    if (emailInsertError) {
      throw new Error(`Failed to create email rate limit: ${emailInsertError.message}`)
    }
  }

  // Update IP rate limit or start a new 1-hour window
  if (ipLimit) {
    const isInWindow = ipLimit.window_start > hourAgo
    const { error: ipUpdateError } = await supabase
      .from('password_reset_rate_limits')
      .update({
        request_count: isInWindow ? ipLimit.request_count + 1 : 1,
        window_start: isInWindow ? ipLimit.window_start : now,
        last_request_at: now,
      })
      .eq('id', ipLimit.id)

    if (ipUpdateError) {
      throw new Error(`Failed to update IP rate limit: ${ipUpdateError.message}`)
    }
  } else {
    const { error: ipInsertError } = await supabase
      .from('password_reset_rate_limits')
      .insert({
        identifier: ipAddress,
        identifier_type: 'ip',
        request_count: 1,
        window_start: now,
        last_request_at: now,
      })

    if (ipInsertError) {
      throw new Error(`Failed to create IP rate limit: ${ipInsertError.message}`)
    }
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
        from: FROM_SECURITY,
        to: [email],
        subject: 'Your Durrah Tutors verification code',
        text: createOTPEmailText(otpCode),
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
