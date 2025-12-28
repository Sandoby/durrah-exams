
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import * as crypto from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to generate Google OAuth2 Access Token for FCM v1
async function getAccessToken(serviceAccount: any) {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const claim = btoa(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: serviceAccount.token_uri,
        exp: now + 3600,
        iat: now,
    }));

    const key = serviceAccount.private_key;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${claim}`);
    const signature = sign.sign(key, "base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const jwt = `${header}.${claim}.${signature}`;

    const res = await fetch(serviceAccount.token_uri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await res.json();
    return data.access_token;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { targetUserId, title, body } = await req.json();

        if (!title || !body) {
            return new Response(JSON.stringify({ error: 'Missing title or body' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 1. Fetch Service Account and Token
        const saString = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!saString) throw new Error('FIREBASE_SERVICE_ACCOUNT secret is missing');
        const serviceAccount = JSON.parse(saString);
        const accessToken = await getAccessToken(serviceAccount);

        // 2. Fetch User Tokens
        let query = supabaseClient
            .from('profiles')
            .select('fcm_token')
            .not('fcm_token', 'is', null);

        if (targetUserId && targetUserId !== 'all') {
            query = query.eq('id', targetUserId);
        }

        const { data: profiles, error: dbError } = await query;
        if (dbError) throw dbError;

        const tokens = profiles?.map(p => p.fcm_token).filter(t => t) || [];
        if (tokens.length === 0) {
            return new Response(JSON.stringify({ message: 'No devices to send to' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Send via FCM v1
        const results = [];
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

        for (const token of tokens) {
            const response = await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: { title, body },
                        data: { targetUserId: targetUserId || 'broadcast' },
                        android: { priority: 'high', notification: { sound: 'default' } }
                    }
                }),
            });

            const json = await response.json();
            results.push(json);
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
