import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyRequest {
  email: string
  otpCode: string
}

// Constant-time comparison to prevent timing attacks
const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
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
    const { email, otpCode }: VerifyRequest = await req.json()

    // Get IP and User-Agent for audit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Validate input
    if (!email || !otpCode) {
      await logAudit(supabase, email || 'unknown', 'otp_failed', ipAddress, userAgent, false, 'Missing email or OTP code')
      return new Response(
        JSON.stringify({ success: false, error: 'Email and OTP code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otpCode.trim())) {
      await logAudit(supabase, email, 'otp_failed', ipAddress, userAgent, false, 'Invalid OTP format')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find most recent active OTP for this email
    const { data: otp, error: fetchError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !otp) {
      await logAudit(supabase, email, 'otp_failed', ipAddress, userAgent, false, 'No active OTP found or expired')
      return new Response(
        JSON.stringify({ success: false, error: 'Code expired or invalid. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if maximum attempts exceeded
    if (otp.verification_attempts >= 3) {
      await logAudit(supabase, email, 'otp_failed', ipAddress, userAgent, false, 'Maximum attempts exceeded')
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum attempts exceeded. Please request a new code.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify OTP code (constant-time comparison for security)
    const isValid = constantTimeCompare(otp.otp_code, otpCode.trim())

    if (!isValid) {
      // Increment attempts
      const newAttempts = otp.verification_attempts + 1
      await supabase
        .from('password_reset_otps')
        .update({ verification_attempts: newAttempts })
        .eq('id', otp.id)

      const attemptsRemaining = 3 - newAttempts

      await logAudit(supabase, email, 'otp_failed', ipAddress, userAgent, false, `Invalid code, ${attemptsRemaining} attempts remaining`)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid code. Please try again.',
          attemptsRemaining,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // OTP is valid! Mark as verified
    await supabase
      .from('password_reset_otps')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otp.id)

    // Generate secure reset token (UUID v4)
    const resetToken = crypto.randomUUID()

    // Store reset token (30-minute expiry)
    const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { error: tokenError } = await supabase.from('password_reset_tokens').insert({
      email,
      reset_token: resetToken,
      otp_id: otp.id,
      expires_at: tokenExpiresAt,
    })

    if (tokenError) {
      console.error('Error creating reset token:', tokenError)
      await logAudit(supabase, email, 'otp_verified', ipAddress, userAgent, false, tokenError.message)
      throw new Error('Failed to generate reset token')
    }

    // Log successful verification
    await logAudit(supabase, email, 'otp_verified', ipAddress, userAgent, true)

    console.log(`OTP verified successfully for ${email}, reset token generated`)

    return new Response(
      JSON.stringify({
        success: true,
        resetToken,
        message: 'OTP verified successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in verify-password-reset-otp:', error)

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to verify OTP. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
