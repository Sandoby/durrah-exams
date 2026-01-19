import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * HTTP Routes for Convex
 * 
 * These endpoints can be called from external services like Supabase Edge Functions
 * or directly from the frontend for payment processing.
 */

const http = httpRouter();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
};
// In-memory idempotency for webhook events (best-effort; add durable storage later)
const processedWebhookIds = new Map<string, number>();
const WEBHOOK_TTL_MS = 60 * 60 * 1000; // 1 hour

function isDuplicateWebhook(id?: string | null) {
  if (!id) return false;
  const now = Date.now();
  // Cleanup expired
  for (const [k, v] of processedWebhookIds) {
    if (now - v > WEBHOOK_TTL_MS) processedWebhookIds.delete(k);
  }
  const ts = processedWebhookIds.get(id);
  return !!(ts && now - ts < WEBHOOK_TTL_MS);
}

function rememberWebhookId(id?: string | null) {
  if (!id) return;
  processedWebhookIds.set(id, Date.now());
}

// Constant-time comparison for signatures
function timingSafeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

// Verify Dodo webhook signature (HMAC-SHA256 over "webhookId.webhookTimestamp.rawBody")
async function verifyDodoSignature(
  secretRaw: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  rawBody: string,
  headerSignature: string | null
) {
  if (!secretRaw || !webhookId || !webhookTimestamp || !headerSignature) return false;

  // Secrets may be provided as "whsec_<base64>" or raw base64
  const secretB64 = secretRaw.replace(/^\s*whsec_/, '').trim();

  let keyBytes: Uint8Array;
  try {
    keyBytes = new Uint8Array(Buffer.from(secretB64, 'base64'));
  } catch {
    return false;
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const message = new TextEncoder().encode(signedContent);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' } as HmacImportParams,
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, message);
  const computedSig = Buffer.from(new Uint8Array(signatureBytes)).toString('base64');

  // Header can be "v1,<sig1> v2,<sig2>" or a simple "<sig>"
  const parts = headerSignature.split(' ');
  const v1Part = parts.find((p) => p.startsWith('v1,')) || '';
  const expectedSig = v1Part ? v1Part.slice(3) : headerSignature.split(',')[1] || headerSignature;

  return timingSafeEqual(computedSig, expectedSig);
}

// Resolve Supabase user from Authorization header (Bearer <access_token>)
async function getSupabaseUser(authHeader: string) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data?.id as string | undefined, email: data?.email as string | undefined };
  } catch {
    return null;
  }
}

// ============================================
// DODO WEBHOOK - Subscription Events
// POST /dodoWebhook
// ============================================
http.route({
  path: "/dodoWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const secret = process.env.DODO_WEBHOOK_SECRET;
      const signature = request.headers.get('webhook-signature');
      const webhookId = request.headers.get('webhook-id');
      const webhookTimestamp = request.headers.get('webhook-timestamp');
      const rawBody = await request.text();

      // Verify signature and deduplicate
      if (secret) {
        const ok = await verifyDodoSignature(secret, webhookId, webhookTimestamp, rawBody, signature);
        if (!ok) {
          console.error('Invalid Dodo webhook signature', { webhookId });
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
        }
        if (isDuplicateWebhook(webhookId)) {
          console.log('[Webhook] Duplicate delivery detected, ignoring', { webhookId });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const body = JSON.parse(rawBody);
      const eventType = body.type;
      const data = body.data;
      const metadata = data?.metadata || body.metadata || {};

      console.log(`Processing Dodo event: ${eventType}`, {
        id: data?.subscription_id || data?.payment_id,
        metadata: JSON.stringify(metadata)
      });

      let userId = metadata.userId;
      const userEmail = data?.customer?.email || data?.email;
      const dodoCustomerId = data?.customer_id || data?.customer?.customer_id || data?.customer?.id || data?.id;

      // Fallback: If userId is missing from metadata, look up via dodo_customer_id in Supabase
      if (!userId && dodoCustomerId) {
        console.log(`[Webhook] No userId in metadata, attempting fallback lookup for customer: ${dodoCustomerId}`);
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
          try {
            const lookupRes = await fetch(
              `${supabaseUrl}/rest/v1/profiles?dodo_customer_id=eq.${encodeURIComponent(dodoCustomerId)}&select=id`,
              { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
            );
            if (lookupRes.ok) {
              const profiles = await lookupRes.json();
              if (profiles?.[0]?.id) {
                userId = profiles[0].id;
                console.log(`[Webhook] Found userId via dodo_customer_id: ${userId}`);
              } else {
                console.warn(`[Webhook] No user found with dodo_customer_id: ${dodoCustomerId}`);
              }
            } else {
              console.error(`[Webhook] Fallback lookup failed with status: ${lookupRes.status}`);
            }
          } catch (lookupErr) {
            console.error('[Webhook] Error during fallback lookup:', lookupErr);
          }
        }
      }

      // Routing based on event type
      // Routing based on event type
      // Deduplication: ONLY subscription.active triggers the subscription update/extension logic
      // to prevents double-adding time when multiple events arrive for the same transaction.
      if (eventType === 'subscription.active') {
        // Activate or renew subscription
        const res = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'active',
          plan: metadata.planId === 'pro' ? 'Professional' : 'Starter',
          dodoCustomerId,
          subscriptionId: data?.subscription_id,
          nextBillingDate: data?.next_billing_date,
          billingCycle: metadata.billingCycle,
        });
        console.log(`[Webhook] updateSubscription result (subscription.active):`, res);

        if (!res?.success) {
          console.error(`[Webhook] Subscription activation FAILED for user ${userId || 'unknown'}`);
        }
      } else {
        console.log(`[Webhook] Skipping subscription update for ${eventType} to prevent double activation.`);
      }

      // Record the payment
      if (
        (eventType === 'payment.succeeded' || eventType === 'subscription.active') &&
        (data?.total_amount || data?.amount)
      ) {
        await ctx.runAction(internal.dodoPayments.recordPayment, {
          userId: userId || 'unknown',
          amount: data.total_amount || data.amount,
          currency: data.currency || 'USD',
          status: 'completed',
          merchantReference: data.payment_id || data.subscription_id || data.id,
          subscriptionId: data.subscription_id,
        });
      }
      if (eventType === 'subscription.renewed') {
        // Subscription renewed - just push the date and record payment
        await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'active',
          nextBillingDate: data?.next_billing_date,
          billingCycle: metadata.billingCycle,
        });

        if (data?.amount) {
          await ctx.runAction(internal.dodoPayments.recordPayment, {
            userId: userId || 'unknown',
            amount: data.amount,
            currency: data.currency || 'USD',
            status: 'completed',
            merchantReference: data.payment_id,
            subscriptionId: data.subscription_id,
          });
        }
      } else if (eventType === 'subscription.on_hold' || eventType === 'subscription.failed') {
        await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'payment_failed',
        });
      } else if (eventType === 'subscription.cancelled') {
        await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'cancelled',
        });
      }

      rememberWebhookId(webhookId);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      console.error('Webhook error:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }),
});

// ============================================
// CREATE DODO CHECKOUT
// POST /createDodoPayment
// ============================================
http.route({
  path: "/createDodoPayment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const authUser = await getSupabaseUser(authHeader);
      if (!authUser?.id || !authUser.email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const body = await request.json();
      const { userName, billingCycle, returnUrl } = body;

      const result = await ctx.runAction(internal.dodoPayments.createCheckout, {
        userId: authUser.id,
        userEmail: authUser.email,
        userName: userName || authUser.email.split('@')[0],
        billingCycle: billingCycle || 'monthly',
        returnUrl: returnUrl || 'https://tutors.durrahsystem.tech/payment-callback?provider=dodo',
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('Create checkout error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// ============================================
// CREATE DODO PORTAL SESSION
// POST /dodoPortalSession
// ============================================
http.route({
  path: "/dodoPortalSession",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const authUser = await getSupabaseUser(authHeader);
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: corsHeaders
        });
      }

      // Accept empty body; server will resolve customer's Dodo ID from profile
      let body: any = {};
      try {
        body = await request.json();
      } catch {}

      const providedId = body?.dodoCustomerId as string | undefined;

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
          status: 500,
          headers: corsHeaders
        });
      }

      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${authUser.id}&select=dodo_customer_id`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });

      let userDodoId: string | undefined = undefined;
      if (profileRes.ok) {
        try {
          const profiles = await profileRes.json();
          userDodoId = profiles?.[0]?.dodo_customer_id as string | undefined;
        } catch (e) {
          console.warn('[Portal] Failed to parse profile response JSON:', e);
        }
      } else {
        console.warn(`[Portal] Profile lookup failed with status: ${profileRes.status}`);
        // Do not hard fail; if the client provided a customer id we can still proceed after verifying below
      }

      const effectiveId = (providedId ?? userDodoId) as string | undefined;

      if (!effectiveId) {
        return new Response(JSON.stringify({ error: 'No Dodo customer linked to your account yet' }), { status: 404, headers: corsHeaders });
      }

      // If both exist and mismatch, reject
      if (providedId && userDodoId && providedId !== userDodoId) {
        return new Response(JSON.stringify({ error: 'Forbidden: customer mismatch' }), { status: 403, headers: corsHeaders });
      }

      const result = await ctx.runAction(internal.dodoPayments.createPortal, {
        dodoCustomerId: effectiveId
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('Portal session error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// ============================================
// VERIFY DODO PAYMENT (Direct Check)
// POST /verifyDodoPayment
// ============================================
http.route({
  path: "/verifyDodoPayment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { orderId, userId } = body;

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing orderId' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      console.log(`[HTTP] Direct verification request for ${orderId}`);
      const result = await ctx.runAction(internal.dodoPayments.verifyPayment, {
        orderId,
        userId
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('Direct verification endpoint error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// OPTIONS routes for CORS preflight
http.route({ path: "/verifyDodoPayment", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/createDodoPayment", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/dodoPortalSession", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });


// ============================================
// PUSH SCORE FROM GRADE-EXAM EDGE FUNCTION
// POST /pushScore
// ============================================
http.route({
  path: "/pushScore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify shared secret
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.CONVEX_WEBHOOK_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      // Validate required fields
      const { quiz_code, exam_id, nickname, score, max_score, percentage } = body;

      if (!quiz_code || !exam_id || !nickname || score === undefined || !max_score) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Call the mutation
      const entryId = await ctx.runMutation(api.leaderboard.pushScore, {
        quiz_code,
        exam_id,
        nickname,
        student_id: body.student_id,
        avatar: body.avatar,
        score,
        max_score,
        percentage: percentage ?? Math.round((score / max_score) * 100),
        time_taken_seconds: body.time_taken_seconds,
      });

      return new Response(JSON.stringify({ success: true, entryId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error pushing score:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================
// HEALTH CHECK
// GET /health
// ============================================
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({
      status: "ok",
      timestamp: Date.now(),
      service: "durrah-exams-convex"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================
// GET PENDING AUTO-SUBMITTED SESSIONS
// GET /pendingAutoSubmits
// Returns sessions that were auto-submitted by Convex and need to be synced to Supabase
// ============================================
http.route({
  path: "/pendingAutoSubmits",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      // Get all auto-submitted sessions that haven't been synced to Supabase yet
      const sessions = await ctx.runQuery(api.sessionsQueries.getPendingAutoSubmits, {});

      return new Response(JSON.stringify({
        success: true,
        sessions,
        count: sessions.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error getting pending auto-submits:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================
// MARK SESSION AS SYNCED TO SUPABASE
// POST /markSynced
// ============================================
http.route({
  path: "/markSynced",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { session_id, supabase_submission_id, score, max_score, percentage } = body;

      if (!session_id) {
        return new Response(JSON.stringify({ error: "Missing session_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await ctx.runMutation(api.sessions.markSyncedToSupabase, {
        session_id,
        supabase_submission_id,
        score,
        max_score,
        percentage,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error marking session as synced:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
