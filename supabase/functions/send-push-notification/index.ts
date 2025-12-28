import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { title, body, targetUserId, data: extraData } = await req.json()
        console.log(`[Push] Starting push request. Title: ${title}, Target: ${targetUserId}`)

        const firebaseSecret = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
        if (!firebaseSecret) {
            console.error('[Push] CRITICAL: FIREBASE_SERVICE_ACCOUNT secret is missing!')
            return new Response(JSON.stringify({ error: 'Server configuration error (missing secret)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            })
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(firebaseSecret)
            console.log(`[Push] Service account parsed successfully for project: ${serviceAccount.project_id}`)
        } catch (e) {
            console.error('[Push] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message)
            return new Response(JSON.stringify({ error: 'Server configuration error (invalid secret JSON)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            })
        }

        // 1. Get Access Token using OAuth2 JWT Flow
        console.log('[Push] Generating OAuth2 token...')
        let accessToken;
        try {
            accessToken = await getAccessToken(serviceAccount)
            console.log('[Push] Access token generated successfully.')
        } catch (e) {
            console.error('[Push] CRITICAL: Failed to generate access token:', e.message)
            return new Response(JSON.stringify({ error: `Auth Error: ${e.message}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            })
        }

        // 2. Fetch target FCM Tokens from Supabase
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

        console.log(`[Push] Fetching FCM tokens for target: ${targetUserId}`)
        let fcmTokens: string[] = []

        if (targetUserId === 'all') {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens?select=token`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                }
            })
            const data = await res.json()
            fcmTokens = (data || []).map((t: any) => t.token)
        } else {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens?select=token&user_id=eq.${targetUserId}`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                }
            })
            const data = await res.json()
            fcmTokens = (data || []).map((t: any) => t.token)
        }

        console.log(`[Push] Found ${fcmTokens.length} tokens to target.`)

        if (fcmTokens.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No tokens found for target' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // 3. Send notifications via FCM v1 API
        const results = []
        for (const token of fcmTokens) {
            console.log(`[Push] Sending to token starting with: ${token.substring(0, 10)}...`)
            try {
                const fcmRes = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({
                            message: {
                                token: token,
                                notification: {
                                    title: title,
                                    body: body,
                                },
                                data: extraData || {},
                                android: {
                                    priority: "high",
                                    notification: {
                                        channel_id: "default",
                                        icon: "ic_stat_notification",
                                        color: "#4F46E5"
                                    }
                                }
                            },
                        }),
                    }
                )

                const fcmData = await fcmRes.json()
                if (fcmRes.ok) {
                    console.log(`[Push] Successfully sent to token. Name: ${fcmData.name}`)
                    results.push({ token: token.substring(0, 10) + '...', status: 'success' })
                } else {
                    console.error(`[Push] FCM Error:`, fcmData.error)
                    results.push({ token: token.substring(0, 10) + '...', status: 'error', error: fcmData.error })
                }
            } catch (e) {
                console.error(`[Push] Request Error for token:`, e.message)
                results.push({ token: token.substring(0, 10) + '...', status: 'error', error: e.message })
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err: any) {
        console.error('[Push] UNHANDLED EXCEPTION:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// Helper: JWT Signing for FCM v1
async function getAccessToken(serviceAccount: any) {
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 3600

    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat,
        exp,
        scope: 'https://www.googleapis.com/auth/cloud-platform'
    }

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const signatureBase = `${encodedHeader}.${encodedPayload}`

    // Import the private key
    const pem = serviceAccount.private_key
    const pemContents = pem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s+/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey.buffer,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(signatureBase)
    )

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')

    const jwt = `${signatureBase}.${encodedSignature}`

    // Exchange JWT for Access Token
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    })

    const data = await res.json()
    if (!res.ok) {
        throw new Error(`Google Auth API Error: ${JSON.stringify(data)}`)
    }

    return data.access_token
}
