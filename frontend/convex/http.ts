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

      // Verify signature (Standard Webhooks format)
      if (secret && signature && webhookId && webhookTimestamp) {
        const secretValue = secret.startsWith('whsec_') ? secret.slice(6) : secret;
        const keyBytes = Uint8Array.from(atob(secretValue), c => c.charCodeAt(0));

        const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
        const message = new TextEncoder().encode(signedContent);

        const cryptoKey = await crypto.subtle.importKey(
          'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, message);

        // Convert to base64
        const computedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

        // Extract v1 signature from header (format: "v1,<sig1> v2,<sig2>" or just "v1,<sig>")
        const signatureParts = signature.split(' ');
        const v1Part = signatureParts.find(p => p.startsWith('v1,'));
        const expectedSig = v1Part ? v1Part.slice(3) : signature.split(',')[1] || signature;

        if (computedSig !== expectedSig) {
          console.error('Invalid Dodo webhook signature detail:', {
            received: expectedSig,
            computed: computedSig,
            webhookId
          });
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
        }
      } else if (secret) {
        console.warn('Webhook secret is set but signature headers are missing.');
      }

      const body = JSON.parse(rawBody);
      const eventType = body.type;
      const data = body.data;
      const metadata = data?.metadata || body.metadata || {};

      console.log(`Processing Dodo event: ${eventType}`, {
        id: data?.subscription_id || data?.payment_id,
        metadata: JSON.stringify(metadata)
      });

      const userId = metadata.userId;
      const userEmail = data?.customer?.email || data?.email;
      const dodoCustomerId = data?.customer?.customer_id || data?.customer_id;

      // Routing based on event type
      if (
        eventType === 'subscription.active' ||
        eventType === 'payment.succeeded' ||
        eventType === 'checkout.succeeded'
      ) {
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
        console.log(`[Webhook] updateSubscription result:`, res);

        // Record the payment
        if (data?.total_amount || data?.amount) {
          await ctx.runAction(internal.dodoPayments.recordPayment, {
            userId: userId || 'unknown',
            amount: data.total_amount || data.amount,
            currency: data.currency || 'USD',
            status: 'completed',
            merchantReference: data.payment_id || data.subscription_id || data.id,
            subscriptionId: data.subscription_id,
          });
        }
      } else if (eventType === 'subscription.renewed') {
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
      const body = await request.json();
      const { userId, userEmail, userName, billingCycle, returnUrl } = body;

      if (!userId || !userEmail) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const result = await ctx.runAction(internal.dodoPayments.createCheckout, {
        userId,
        userEmail,
        userName: userName || userEmail.split('@')[0],
        billingCycle: billingCycle || 'monthly',
        returnUrl: returnUrl || 'https://tutors.durrahsystem.tech/payment/callback?provider=dodo',
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
      const body = await request.json();
      const { dodoCustomerId } = body;

      if (!dodoCustomerId) {
        return new Response(JSON.stringify({ error: 'No Dodo customer ID provided' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const result = await ctx.runAction(internal.dodoPayments.createPortal, {
        dodoCustomerId
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

// OPTIONS routes for CORS preflight
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
