
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

        // 1. Fetch Tokens
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

        // 2. Send via FCM (Legacy API for simplicity)
        const fcmKey = Deno.env.get('FIREBASE_SERVER_KEY');
        if (!fcmKey) {
            throw new Error('FIREBASE_SERVER_KEY is not set');
        }

        // Batch send if needed, but for now simple loop or multicast
        // FCM Legacy multicast supports up to 1000 tokens
        const chunks = [];
        const chunkSize = 1000;
        for (let i = 0; i < tokens.length; i += chunkSize) {
            chunks.push(tokens.slice(i, i + chunkSize));
        }

        const results = [];

        for (const chunk of chunks) {
            const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Authorization': `key=${fcmKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    registration_ids: chunk,
                    notification: {
                        title,
                        body,
                        sound: 'default'
                    },
                    data: {
                        targetUserId: targetUserId || 'broadcast'
                    },
                    priority: 'high'
                }),
            });

            const json = await response.json();
            results.push(json);
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
