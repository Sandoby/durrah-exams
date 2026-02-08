import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResetRequest {
  resetToken: string
  newPassword: string
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
    const { resetToken, newPassword }: ResetRequest = await req.json()

    // Get IP and User-Agent for audit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Validate input
    if (!resetToken || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reset token and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password strength (minimum 6 characters)
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate reset token
    const { data: token, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('reset_token', resetToken)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !token) {
      await logAudit(supabase, 'unknown', 'password_reset', ipAddress, userAgent, false, 'Invalid or expired reset token')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired reset token. Please start over.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email = token.email

    // Get user ID from email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

    if (userError || !userData) {
      await logAudit(supabase, email, 'password_reset', ipAddress, userAgent, false, 'Failed to list users')
      throw new Error('Failed to retrieve user')
    }

    const user = userData.users.find((u) => u.email === email)

    if (!user) {
      await logAudit(supabase, email, 'password_reset', ipAddress, userAgent, false, 'User not found')
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      console.error('Error updating password:', updateError)
      await logAudit(supabase, email, 'password_reset', ipAddress, userAgent, false, updateError.message)
      throw new Error('Failed to update password')
    }

    // Mark reset token as used
    await supabase
      .from('password_reset_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', token.id)

    // Sign out all existing sessions (security best practice)
    // Note: This signs out the user from all devices for security
    try {
      await supabase.auth.admin.signOut(user.id)
    } catch (signOutError) {
      console.warn('Could not sign out user sessions:', signOutError)
      // Continue even if signout fails
    }

    // Log successful password reset
    await logAudit(supabase, email, 'password_reset', ipAddress, userAgent, true)

    console.log(`Password reset successfully for ${email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully. Please log in with your new password.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in reset-password-with-token:', error)

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to reset password. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
