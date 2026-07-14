import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID');
const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CapiEventRequest {
  eventName: string;
  hashedEmail?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  customData?: Record<string, any>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
      console.warn('[CAPI] META_PIXEL_ID or META_ACCESS_TOKEN not configured in environment secrets.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Meta Conversions API is not configured on the server.',
        }),
        {
          status: 200, // Return 200 to prevent client errors when ads are not active/configured
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      eventName,
      hashedEmail,
      clientUserAgent,
      fbp,
      fbc,
      eventSourceUrl,
      customData,
    }: CapiEventRequest = await req.json();

    if (!eventName) {
      return new Response(
        JSON.stringify({ success: false, error: 'eventName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve client IP from Cloudflare/Supabase/Standard proxy headers
    const clientIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '';

    // Prepare Conversions API Event payload
    const eventData = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl || 'https://durrahtutors.com/',
      user_data: {
        em: hashedEmail ? [hashedEmail] : [],
        client_ip_address: clientIp || undefined,
        client_user_agent: clientUserAgent || undefined,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
      },
      custom_data: customData || undefined,
    };

    console.log(`[CAPI] Sending event '${eventName}' to Meta Conversions API...`);

    // Post to Meta Conversions API
    const response = await fetch(`https://graph.facebook.com/v17.0/${META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [eventData],
        access_token: META_ACCESS_TOKEN,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[CAPI] Meta API returned an error:', result);
      return new Response(
        JSON.stringify({ success: false, error: 'Meta Conversions API request failed', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CAPI] Event '${eventName}' successfully sent to Meta.`);
    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAPI] Server error in meta-capi function:', error);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
