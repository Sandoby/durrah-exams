import { GoogleAuth } from 'npm:google-auth-library'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function cleanPrivateKey(key: string): string {
    if (!key) return ""
    let cleaned = key.replace(/\\n/g, '\n').trim()
    const header = "-----BEGIN PRIVATE KEY-----"
    const footer = "-----END PRIVATE KEY-----"
    if (!cleaned.includes(header)) cleaned = header + '\n' + cleaned
    if (!cleaned.includes(footer)) cleaned = cleaned + '\n' + footer
    return cleaned
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const logs: string[] = []
    const log = (msg: string, ...args: any[]) => {
        const line = `[DirectFCM] ${msg} ${args.map(a => JSON.stringify(a)).join(' ')}`
        console.log(line)
        logs.push(line)
    }

    try {
        const { title, body, targetUserId, data: extraData } = await req.json()
        log(`Title: "${title}", Target: "${targetUserId}"`)

        let saString = (Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || "").trim()
        if (!saString) {
            log('ERROR: FIREBASE_SERVICE_ACCOUNT secret is empty')
            return new Response(JSON.stringify({ error: 'Secret missing', logs }), { status: 500, headers: corsHeaders })
        }

        // --- BUILETPROOF JSON PARSING ---
        let serviceAccount: any

        // 1. Check if it's already JSON
        if (saString.startsWith('{')) {
            try {
                serviceAccount = JSON.parse(saString)
            } catch (e) {
                log('Initial JSON parse failed, trying repair...')
            }
        }

        // 2. If not parsed, try Base64 (to bypass shell corruption)
        if (!serviceAccount) {
            try {
                log('Checking if secret is Base64 encoded...')
                const decoded = atob(saString)
                serviceAccount = JSON.parse(decoded)
                log('Base64 Decode successful.')
            } catch (e) {
                log('Not valid Base64 or Base64 content is not JSON.')
            }
        }

        // 3. Final fallback: String cleanup if shell added surrounding quotes
        if (!serviceAccount) {
            try {
                const repaired = saString.replace(/^['"]/, '').replace(/['"]$/, '')
                serviceAccount = JSON.parse(repaired)
                log('Repair (quote removal) successful.')
            } catch (e) {
                log('CRITICAL: All JSON parsing attempts failed.')
                log(`Secret Sample (first 20 chars): ${saString.substring(0, 20)}`)
                return new Response(JSON.stringify({ error: 'Secret JSON Corrupt', logs }), { status: 500, headers: corsHeaders })
            }
        }

        // Clean the private key
        serviceAccount.private_key = cleanPrivateKey(serviceAccount.private_key)

        log('Initializing official GoogleAuth library...')
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        })

        const client = await auth.getClient()
        const tokenResponse = await client.getAccessToken()
        const accessToken = tokenResponse.token

        if (!accessToken) throw new Error("Google library failed to return a token.")
        log('Access Token secured via Library.')

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

        let query = `${SUPABASE_URL}/rest/v1/profiles?select=id,email,fcm_token`
        if (targetUserId === 'tutors_only') {
            query += `&role=eq.tutor`
        } else if (targetUserId === 'students_only') {
            query += `&role=eq.student`
        } else if (targetUserId === 'subscribed_only') {
            query += `&subscription_status=eq.active`
        } else if (targetUserId === 'free_only') {
            // Get users where status is NOT active (null or something else)
            query += `&subscription_status=neq.active`
        } else if (targetUserId !== 'all') {
            query += `&id=eq.${targetUserId}`
        }

        const dbRes = await fetch(query, {
            headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        })

        const dbData = await dbRes.json()
        const usersWithTokens = (Array.isArray(dbData) ? dbData : [])
            .filter((r: any) => r.fcm_token && String(r.fcm_token).length > 20)

        log(`Devices to process: ${usersWithTokens.length}`)

        const results = []
        for (const user of usersWithTokens) {
            log(`Notifying ${user.email || 'user'}...`)

            const fcmPayload = {
                message: {
                    token: String(user.fcm_token).trim(),
                    notification: { title, body },
                    data: extraData || { click_action: "FLUTTER_NOTIFICATION_CLICK" },
                    android: {
                        priority: "high",
                        notification: {
                            channel_id: "default",
                            icon: "ic_stat_notification",
                            color: "#4F46E5",
                            click_action: "FLUTTER_NOTIFICATION_CLICK"
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                alert: { title, body },
                                sound: "default",
                                badge: 1
                            }
                        }
                    }
                }
            }

            try {
                const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(fcmPayload),
                })

                const fcmData = await fcmRes.json()
                log(`Google FCM Response:`, fcmData)
                results.push({ email: user.email, ok: fcmRes.ok, data: fcmData })
            } catch (e: any) {
                log(`Send error: ${e.message}`)
                results.push({ email: user.email, ok: false, error: e.message })
            }
        }

        return new Response(JSON.stringify({ success: true, results, logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err: any) {
        log(`CRITICAL CRASH: ${err.message}`)
        return new Response(JSON.stringify({ error: err.message, logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
