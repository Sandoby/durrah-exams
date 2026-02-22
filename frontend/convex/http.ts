import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * HTTP Routes for Convex
 * 
 * Subscription webhook is the ONLY path that changes subscription state.
 * All transitions go through transition_subscription() Supabase RPC.
 */

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Content-Type": "application/json",
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE VERIFICATION (Dodo HMAC-SHA256)
// ─────────────────────────────────────────────────────────────────────────────

/** Verify Dodo webhook signature: HMAC-SHA256 over "webhookId.webhookTimestamp.rawBody" */
async function verifyDodoSignature(
  secret: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  rawBody: string,
  headerSignature: string | null
): Promise<boolean> {
  if (!secret || !webhookId || !webhookTimestamp || !headerSignature) return false;

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const message = new TextEncoder().encode(signedContent);

  // Parse sig header: supports "v1,<sig>" and "v1=<sig>" and plain "<sig>"
  const tokens = headerSignature.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
  const expectedSigs = new Set<string>();
  for (const token of tokens) {
    if (token.startsWith("v1=") || token.startsWith("v1,")) {
      expectedSigs.add(token.slice(3));
    } else if (!token.startsWith("t=")) {
      expectedSigs.add(token);
    }
  }
  if (expectedSigs.size === 0) return false;

  const secretClean = secret.replace(/^\s*whsec_/, "").trim();

  // Try base64-decoded key first (standard Dodo format), then raw bytes
  const candidateKeys: Uint8Array[] = [];
  try {
    const decoded = Buffer.from(secretClean, "base64");
    if (decoded.length > 0) candidateKeys.push(new Uint8Array(decoded));
  } catch {}
  candidateKeys.push(new TextEncoder().encode(secretClean));

  for (const keyBytes of candidateKeys) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes as unknown as BufferSource,
        { name: "HMAC", hash: "SHA-256" } as HmacImportParams,
        false,
        ["sign"]
      );
      const sigBytes = await crypto.subtle.sign("HMAC", cryptoKey, message);
      const sigBase64 = Buffer.from(new Uint8Array(sigBytes)).toString("base64");
      const sigHex = Buffer.from(new Uint8Array(sigBytes)).toString("hex");

      for (const expected of expectedSigs) {
        if (sigBase64 === expected || sigHex === expected) return true;
      }
    } catch {}
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function getSupabaseUser(authHeader: string) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data?.id as string | undefined, email: data?.email as string | undefined };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DODO WEBHOOK
// POST /dodoWebhook
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/dodoWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.DODO_WEBHOOK_SECRET;
    const signature = request.headers.get("webhook-signature");
    const webhookId = request.headers.get("webhook-id");
    const webhookTimestamp = request.headers.get("webhook-timestamp");
    const rawBody = await request.text();

    // ── 1. Verify signature ────────────────────────────────────
    if (secret) {
      const valid = await verifyDodoSignature(secret, webhookId, webhookTimestamp, rawBody, signature);
      if (!valid) {
        console.error("[Webhook] Invalid signature", { webhookId });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
      }
    }

    // ── 2. Deduplicate ─────────────────────────────────────────
    if (webhookId) {
      const dup = await ctx.runQuery(internal.webhookHelpers.isWebhookProcessed, {
        webhookId,
        provider: "dodo",
      });
      if (dup.processed) {
        console.log("[Webhook] Duplicate, ignoring", { webhookId });
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const eventType = String(body?.type || "").toLowerCase();
    const data = body?.data || {};
    const metadata = data?.metadata || body?.metadata || {};

    const subscriptionId = data?.subscription_id || data?.id;
    const customerId = data?.customer_id || data?.customer?.customer_id || data?.customer?.id;
    const customerEmail = data?.customer?.email || data?.email;
    const nextBillingDate = data?.next_billing_date;
    const billingCycle = metadata?.billingCycle;
    const userId = metadata?.userId;

    console.log(`[Webhook] ${eventType}`, { webhookId, subscriptionId, email: customerEmail, userId });

    // ── 3. Route event to handler ──────────────────────────────
    let resolvedUserId: string | undefined = userId as string | undefined;

    try {
      if (eventType === "subscription.active") {
        // PRIMARY activation event — use webhook payload data directly
        const result = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail: customerEmail,
          status: "active",
          plan: "Professional",
          dodoCustomerId: customerId,
          dodoSubscriptionId: subscriptionId,
          endDate: nextBillingDate,
          billingCycle,
          eventType,
        });

        if (!result?.success && !result?.skipped) {
          console.error(`[Webhook] Activation FAILED for ${userId || customerEmail}:`, result?.error);
          // Return 500 so Dodo retries
          return new Response(JSON.stringify({ error: result?.error || "Activation failed" }), { status: 500 });
        }

        if (result?.userId) resolvedUserId = result.userId as string;

        // Record initial payment
        if (data?.total_amount || data?.amount) {
          const uid = resolvedUserId || userId;
          if (uid) {
            await ctx.runAction(internal.dodoPayments.recordPayment, {
              userId: uid,
              userEmail: customerEmail,
              amount: data.total_amount || data.amount,
              currency: data.currency || "USD",
              status: "completed",
              merchantReference: data.payment_id || subscriptionId || data.id,
              subscriptionId,
            });
          }
        }

      } else if (eventType === "subscription.renewed") {
        // Renewal — extend end date + record payment + send email
        const result = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail: customerEmail,
          status: "active",
          dodoCustomerId: customerId,
          dodoSubscriptionId: subscriptionId,
          endDate: nextBillingDate,
          billingCycle,
          eventType,
        });

        if (result?.userId) resolvedUserId = result.userId as string;

        if ((data?.amount || data?.total_amount) && resolvedUserId) {
          await ctx.runAction(internal.dodoPayments.recordPayment, {
            userId: resolvedUserId,
            userEmail: customerEmail,
            amount: data.amount || data.total_amount,
            currency: data.currency || "USD",
            status: "completed",
            merchantReference: data.payment_id || data.id,
            subscriptionId,
          });
        }

        // Send renewal email
        if (customerEmail) {
          await ctx.runAction(internal.dodoPayments.dispatchPaymentEmail, {
            email: customerEmail,
            type: "subscription_renewed",
            data: {
              userName: data?.customer?.name || customerEmail.split("@")[0],
              nextBillingDate,
              planName: billingCycle === "yearly" ? "Professional (Yearly)" : "Professional (Monthly)",
              amount: data?.amount,
              currency: data?.currency || "USD",
            },
          });
        }

      } else if (eventType === "subscription.updated") {
        // Only cancel if Dodo says the subscription is truly done
        // (cancelled_at set, or ended_at/end_at in the past, or status explicitly cancelled)
        const now = new Date();
        const cancelledAt = data?.cancelled_at || data?.subscription?.cancelled_at;
        const endedAt = data?.ended_at || data?.subscription?.ended_at;
        const liveStatus = String(data?.status || data?.subscription?.status || "").toLowerCase();

        const trulyEnded =
          !!cancelledAt ||
          (endedAt && new Date(endedAt) <= now) ||
          liveStatus === "cancelled" ||
          liveStatus === "canceled";

        // cancel_at_period_end = still active today → treat as active
        const effectiveStatus = trulyEnded ? "cancelled" : "active";

        console.log(`[Webhook] subscription.updated effectiveStatus=${effectiveStatus}`, {
          cancel_at_period_end: data?.cancel_at_period_end,
          cancelled_at: cancelledAt,
          ended_at: endedAt,
          liveStatus,
        });

        const result = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail: customerEmail,
          status: effectiveStatus,
          dodoCustomerId: customerId,
          dodoSubscriptionId: subscriptionId,
          endDate: nextBillingDate,
          billingCycle,
          eventType,
        });
        if (result?.userId) resolvedUserId = result.userId as string;

      } else if (
        eventType === "subscription.on_hold" ||
        eventType === "subscription.failed" ||
        eventType === "subscription.payment_failed"
      ) {
        const result = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail: customerEmail,
          status: "payment_failed",
          dodoCustomerId: customerId,
          dodoSubscriptionId: subscriptionId,
          eventType,
        });
        if (result?.userId) resolvedUserId = result.userId as string;

        // Send payment failed email
        if (customerEmail) {
          await ctx.runAction(internal.dodoPayments.dispatchPaymentEmail, {
            email: customerEmail,
            type: "payment_failed",
            data: {
              reason: data?.decline_reason || data?.failure_reason || "Payment declined",
            },
          });
        }

      } else if (
        eventType === "subscription.cancelled" ||
        eventType === "subscription.canceled"
      ) {
        const result = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail: customerEmail,
          status: "cancelled",
          dodoCustomerId: customerId,
          dodoSubscriptionId: subscriptionId,
          eventType,
        });
        if (result?.userId) resolvedUserId = result.userId as string;

      } else {
        // Unknown event — log but return 200 (don't retry unknown events)
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
      }
    } catch (handlerErr: any) {
      console.error("[Webhook] Handler error:", handlerErr);
      return new Response(JSON.stringify({ error: handlerErr.message }), { status: 500 });
    }

    // ── 4. Record webhook as processed ────────────────────────
    if (webhookId) {
      await ctx.runMutation(internal.webhookHelpers.recordWebhookProcessed, {
        webhookId,
        eventType,
        provider: "dodo",
        userId: resolvedUserId,
        subscriptionId,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE DODO CHECKOUT
// POST /createDodoPayment
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/createDodoPayment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authUser = await getSupabaseUser(request.headers.get("Authorization") || "");
      if (!authUser?.id || !authUser.email) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const body = await request.json();
      const { userName, billingCycle, returnUrl } = body;

      const result = await ctx.runAction(internal.dodoPayments.createCheckout, {
        userId: authUser.id,
        userEmail: authUser.email,
        userName: userName || authUser.email.split("@")[0],
        billingCycle: billingCycle || "monthly",
        returnUrl: returnUrl || "https://tutors.durrahsystem.tech/payment-callback?provider=dodo",
      });

      return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
    } catch (error: any) {
      console.error("[createDodoPayment] Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// DODO PORTAL SESSION
// POST /dodoPortalSession
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/dodoPortalSession",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authUser = await getSupabaseUser(request.headers.get("Authorization") || "");
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: "Server config missing" }), { status: 500, headers: corsHeaders });
      }

      // Look up dodo_customer_id from profile
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${authUser.id}&select=dodo_customer_id,email&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      let dodoCustomerId: string | undefined;
      if (profileRes.ok) {
        const profiles = await profileRes.json();
        dodoCustomerId = profiles?.[0]?.dodo_customer_id;
      }

      // Try direct portal
      if (dodoCustomerId) {
        try {
          const portal = await ctx.runAction(internal.dodoPayments.createPortal, { dodoCustomerId });
          if (portal?.portal_url) {
            return new Response(JSON.stringify(portal), { status: 200, headers: corsHeaders });
          }
        } catch (e) {
          console.warn("[portal] Direct portal failed, attempting resolution:", e);
        }
      }

      // Auto-resolve customer id and retry
      const resolved = await ctx.runAction(internal.dodoPayments.resolveAndLinkCustomer, {
        userId: authUser.id,
        userEmail: authUser.email,
      });
      if (resolved?.success && resolved?.dodoCustomerId) {
        try {
          const portal = await ctx.runAction(internal.dodoPayments.createPortal, {
            dodoCustomerId: resolved.dodoCustomerId as string,
          });
          if (portal?.portal_url) {
            return new Response(JSON.stringify(portal), { status: 200, headers: corsHeaders });
          }
        } catch (e) {
          console.warn("[portal] Resolved portal also failed:", e);
        }
      }

      return new Response(JSON.stringify({
        error: "No Dodo customer linked to your account yet",
        code: "DODO_CUSTOMER_NOT_LINKED",
      }), { status: 404, headers: corsHeaders });
    } catch (error: any) {
      console.error("[dodoPortalSession] Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY DODO PAYMENT
// POST /verifyDodoPayment
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/verifyDodoPayment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authUser = await getSupabaseUser(request.headers.get("Authorization") || "");
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const body = await request.json();
      const { orderId, userId } = body;

      if (userId && userId !== authUser.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId" }), { status: 400, headers: corsHeaders });
      }

      const result = await ctx.runAction(internal.dodoPayments.verifyPayment, {
        orderId,
        userId: authUser.id,
      });

      return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC DODO SUBSCRIPTION (on-demand)
// POST /syncDodoSubscription
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/syncDodoSubscription",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authUser = await getSupabaseUser(request.headers.get("Authorization") || "");
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const result = await ctx.runAction(internal.dodoPayments.syncSubscriptionFromProvider, {
        userId: authUser.id,
        userEmail: authUser.email,
      });

      return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  }),
});

// CORS preflight
http.route({ path: "/verifyDodoPayment",    method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/createDodoPayment",    method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/dodoPortalSession",    method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/syncDodoSubscription", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD / EXAM ROUTES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/pushScore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.CONVEX_WEBHOOK_SECRET;
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    try {
      const body = await request.json();
      const { quiz_code, exam_id, nickname, score, max_score, percentage } = body;
      if (!quiz_code || !exam_id || !nickname || score === undefined || !max_score) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
      }
      const entryId = await ctx.runMutation(api.leaderboard.pushScore, {
        quiz_code, exam_id, nickname,
        student_id: body.student_id,
        avatar: body.avatar,
        score, max_score,
        percentage: percentage ?? Math.round((score / max_score) * 100),
        time_taken_seconds: body.time_taken_seconds,
      });
      return new Response(JSON.stringify({ success: true, entryId }), { status: 200 });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
    }
  }),
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => new Response(
    JSON.stringify({ status: "ok", timestamp: Date.now(), service: "durrah-exams-convex" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )),
});

http.route({
  path: "/pendingAutoSubmits",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const sessions = await ctx.runQuery(api.sessionsQueries.getPendingAutoSubmits, {});
      return new Response(JSON.stringify({ success: true, sessions, count: sessions.length }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
    }
  }),
});

http.route({
  path: "/markSynced",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { session_id, supabase_submission_id, score, max_score, percentage } = body;
      if (!session_id) {
        return new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400 });
      }
      await ctx.runMutation(api.sessions.markSyncedToSupabase, {
        session_id, supabase_submission_id, score, max_score, percentage,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch {
      return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
    }
  }),
});

export default http;
