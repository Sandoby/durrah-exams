import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Dodo Payments — Clean Subscription Backend
 *
 * Design principles:
 * 1. Single source of truth: ALL state changes go through Convex subscriptions.transition()
 * 2. State machine enforced in Convex mutation — invalid transitions are rejected + logged
 * 3. Idempotent: replaying the same event has no side effects
 * 4. No reconciliation cron — webhooks + on-login sync are sufficient
 * 5. No direct PATCH to Supabase profiles for subscription columns — only syncToSupabase does
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

function getDodoBaseUrl(apiKey: string) {
  return apiKey.startsWith("test_")
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

/** Resolve userId by email — try Convex first, then Supabase */
async function resolveByEmail(
  ctx: { runQuery: (fn: any, args: any) => Promise<any> },
  supabaseUrl: string,
  supabaseKey: string,
  email: string
): Promise<string | undefined> {
  // Try Convex subscriptions table
  try {
    const sub = await ctx.runQuery(internal.subscriptions.getByEmail, { email });
    if (sub?.user_id) return sub.user_id;
  } catch {}

  // Fall back to Supabase profiles
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) return undefined;
    const rows = await res.json();
    return rows?.[0]?.id as string | undefined;
  } catch {
    return undefined;
  }
}

/** Resolve userId by dodo_customer_id — try Convex first, then Supabase */
async function resolveByCustomerId(
  ctx: { runQuery: (fn: any, args: any) => Promise<any> },
  supabaseUrl: string,
  supabaseKey: string,
  customerId: string
): Promise<string | undefined> {
  // Try Convex subscriptions table
  try {
    const sub = await ctx.runQuery(internal.subscriptions.getByDodoCustomerId, { dodoCustomerId: customerId });
    if (sub?.user_id) return sub.user_id;
  } catch {}

  // Fall back to Supabase profiles
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?dodo_customer_id=eq.${encodeURIComponent(customerId)}&select=id&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) return undefined;
    const rows = await res.json();
    return rows?.[0]?.id as string | undefined;
  } catch {
    return undefined;
  }
}

/** Send in-app notification */
async function sendNotification(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  title: string,
  message: string,
  type: "success" | "error" | "warning" | "info"
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: "POST",
      headers: supabaseHeaders(supabaseKey),
      body: JSON.stringify({ user_id: userId, title, message, type, is_read: false }),
    });
  } catch (e) {
    console.warn("[NOTIF] Failed:", e);
  }
}

/** Send transactional email */
async function sendEmail(
  supabaseUrl: string,
  supabaseKey: string,
  email: string,
  type: string,
  data: Record<string, unknown>
) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ type, email, data }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[EMAIL] ${type} failed: ${res.status} ${err}`);
    }
  } catch (e) {
    console.warn(`[EMAIL] Error sending ${type}:`, e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core subscription state transition.
 * Called by webhook handler and syncSubscriptionFromProvider.
 * Always goes through Convex subscriptions.transition() mutation.
 */
export const updateSubscription = internalAction({
  args: {
    userId:           v.optional(v.string()),
    userEmail:        v.optional(v.string()),
    status:           v.string(),
    plan:             v.optional(v.string()),
    dodoCustomerId:   v.optional(v.string()),
    dodoSubscriptionId: v.optional(v.string()),
    endDate:          v.optional(v.string()),
    billingCycle:     v.optional(v.string()),
    eventType:        v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, error: "Config missing" };

    let userId = args.userId;

    // ── Resolve user ─────────────────────────────────────────────
    if (!userId && args.userEmail) {
      userId = await resolveByEmail(ctx, supabaseUrl, supabaseKey, args.userEmail);
    }
    if (!userId && args.dodoCustomerId) {
      userId = await resolveByCustomerId(ctx, supabaseUrl, supabaseKey, args.dodoCustomerId);
    }

    if (!userId) {
      console.error("[updateSubscription] Could not resolve userId", {
        email: args.userEmail,
        customerId: args.dodoCustomerId,
      });
      try {
        await fetch(`${supabaseUrl}/rest/v1/failed_activations`, {
          method: "POST",
          headers: supabaseHeaders(supabaseKey),
          body: JSON.stringify({
            dodo_subscription_id: args.dodoSubscriptionId,
            dodo_customer_id: args.dodoCustomerId,
            customer_email: args.userEmail,
            event_type: args.eventType || "unknown",
            webhook_payload: args,
            error_message: "User identification failed",
            status: "pending_resolution",
          }),
        });
      } catch {}
      return { success: false, error: "User not identified — logged for recovery" };
    }

    // ── Trial protection ────────────────────────────────────────
    // Don't let non-activation webhooks interrupt an active trial
    if (args.status !== "active" && args.status !== "cancelled") {
      try {
        const sub = await ctx.runQuery(internal.subscriptions.getByUserId, { userId });
        if (sub?.status === "trialing") {
          console.log(`[TRIAL-PROTECTION] Skipping '${args.status}' for trialing user ${userId}`);
          return { success: true, skipped: true, reason: "trial_protection", userId };
        }
      } catch {
        // Fallback: check Supabase if no Convex record yet
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription_status&limit=1`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
          );
          if (res.ok) {
            const rows = await res.json();
            if (rows?.[0]?.subscription_status === "trialing") {
              console.log(`[TRIAL-PROTECTION] Skipping '${args.status}' for trialing user ${userId} (Supabase)`);
              return { success: true, skipped: true, reason: "trial_protection", userId };
            }
          }
        } catch {}
      }
    }

    // ── Call Convex state machine ────────────────────────────────
    const endDateMs = args.endDate ? new Date(args.endDate).getTime() : undefined;

    const result = await ctx.runMutation(internal.subscriptions.transition, {
      userId,
      newStatus: args.status,
      endDate: endDateMs,
      plan: args.plan || "Professional",
      billingCycle: args.billingCycle,
      dodoCustomerId: args.dodoCustomerId,
      dodoSubscriptionId: args.dodoSubscriptionId,
      source: "webhook",
      metadata: { event_type: args.eventType },
      email: args.userEmail,
    });

    if (!result.success) {
      return { success: false, error: result.error, userId };
    }

    console.log(`[updateSubscription] ✓ ${args.status} for user ${userId} (${args.eventType})`);

    // ── Notifications ────────────────────────────────────────────
    if (args.status === "active") {
      await sendNotification(supabaseUrl, supabaseKey, userId,
        "Subscription Activated! 💎",
        `Welcome to the ${args.plan || "Professional"} plan. Your premium features are now active.`,
        "success");
    } else if (args.status === "cancelled") {
      await sendNotification(supabaseUrl, supabaseKey, userId,
        "Subscription Cancelled",
        "Your subscription has been cancelled. You can reactivate anytime from the pricing page.",
        "warning");
    } else if (args.status === "on_hold") {
      await sendNotification(supabaseUrl, supabaseKey, userId,
        "Subscription On Hold ⚠️",
        "Your subscription is on hold due to a payment issue. Please update your payment method in the Customer Portal to reactivate.",
        "error");
    } else if (args.status === "payment_failed") {
      await sendNotification(supabaseUrl, supabaseKey, userId,
        "Payment Failed",
        "We were unable to process your payment. Please update your payment method.",
        "error");
    }

    return { success: true, userId };
  },
});

/** Record a completed payment in the payments table. */
export const recordPayment = internalAction({
  args: {
    userId:            v.string(),
    userEmail:         v.optional(v.string()),
    amount:            v.number(),
    currency:          v.string(),
    status:            v.string(),
    merchantReference: v.string(),
    subscriptionId:    v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    try {
      await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: "POST",
        headers: supabaseHeaders(supabaseKey),
        body: JSON.stringify({
          user_id: args.userId,
          user_email: args.userEmail,
          amount: args.amount,
          currency: args.currency,
          status: args.status,
          merchant_reference: args.merchantReference,
          provider: "dodo",
          metadata: { subscriptionId: args.subscriptionId },
        }),
      });
    } catch (e) {
      console.error("[recordPayment] Error:", e);
    }
  },
});

/** Create a Dodo Payments subscription. */
export const createCheckout = internalAction({
  args: {
    userId:       v.string(),
    userEmail:    v.string(),
    userName:     v.string(),
    billingCycle: v.string(),
    returnUrl:    v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY not configured");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const baseUrl = getDodoBaseUrl(apiKey);

    const productIds: Record<string, string> = {
      yearly:  "pdt_0NVdw6iZw42sQIdxctP55",
      monthly: "pdt_0NVdvPLWrAr1Rym66kXLP",
    };

    const productId = productIds[args.billingCycle] || productIds.monthly;

    const res = await fetch(`${baseUrl}/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        customer: { email: args.userEmail, name: args.userName },
        metadata: { userId: args.userId, billingCycle: args.billingCycle, planId: "professional" },
        return_url: args.returnUrl,
        quantity: 1,
      }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[createCheckout] Non-JSON response:", res.status, text);
      throw new Error(`Dodo API returned non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      console.error("[createCheckout] Dodo API error:", data);
      throw new Error(data.message || data.error || `Dodo API error: ${res.status}`);
    }

    // Persist dodo_customer_id early
    const checkoutCustomerId = data?.customer_id || data?.customer?.id || data?.customer?.customer_id;
    if (checkoutCustomerId && supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`, {
          method: "PATCH",
          headers: supabaseHeaders(supabaseKey),
          body: JSON.stringify({ dodo_customer_id: checkoutCustomerId }),
        });
      } catch {}
    }

    // Dodo returns payment_link for subscription checkout
    const checkoutUrl = data.payment_link || data.checkout_url || data.url;
    if (!checkoutUrl) {
      console.error("[createCheckout] No checkout URL in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No checkout URL returned from Dodo");
    }

    return { checkout_url: checkoutUrl };
  },
});

/** Create a Dodo billing portal session. */
export const createPortal = internalAction({
  args: { dodoCustomerId: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY not configured");
    const baseUrl = getDodoBaseUrl(apiKey);

    const res = await fetch(
      `${baseUrl}/customers/${args.dodoCustomerId}/customer-portal/session`,
      { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create portal session");
    return { portal_url: data.link || data.url };
  },
});

/**
 * Direct payment/subscription verification (fallback for missed webhooks).
 */
export const verifyPayment = internalAction({
  args: {
    orderId: v.string(),
    userId:  v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY not configured");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase config missing");
    const baseUrl = getDodoBaseUrl(apiKey);

    try {
      let providerStatus = "";
      let userEmail = "";
      let dodoCustomerId = "";
      let dodoSubscriptionId: string | undefined;
      let billingCycle = "monthly";
      let nextBillingDate: string | undefined;

      if (args.orderId.startsWith("sub_")) {
        const res = await fetch(`${baseUrl}/subscriptions/${args.orderId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          providerStatus = String(data.status || "").toLowerCase();
          userEmail = data.customer?.email ?? "";
          dodoCustomerId = data.customer?.id || data.customer?.customer_id || data.customer_id;
          billingCycle = data.metadata?.billingCycle || "monthly";
          nextBillingDate = data.next_billing_date;
          dodoSubscriptionId = args.orderId;
        }
      } else {
        const res = await fetch(`${baseUrl}/payments/${args.orderId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          providerStatus = data.status === "succeeded" ? "active" : data.status;
          userEmail = data.customer?.email ?? "";
          dodoCustomerId = data.customer?.id || data.customer?.customer_id || data.customer_id;
          billingCycle = data.metadata?.billingCycle || "monthly";
        }
      }

      if (providerStatus !== "active") {
        return { success: false, status: providerStatus, message: "Payment not yet active" };
      }

      let userId = args.userId;
      if (!userId && userEmail) userId = await resolveByEmail(ctx, supabaseUrl, supabaseKey, userEmail);
      if (!userId && dodoCustomerId) userId = await resolveByCustomerId(ctx, supabaseUrl, supabaseKey, dodoCustomerId);
      if (!userId) return { success: false, error: "Could not identify user" };

      const endDateMs = nextBillingDate ? new Date(nextBillingDate).getTime() : undefined;

      const result = await ctx.runMutation(internal.subscriptions.transition, {
        userId,
        newStatus: "active",
        endDate: endDateMs,
        plan: "Professional",
        billingCycle,
        dodoCustomerId,
        dodoSubscriptionId,
        source: "direct_verify",
        metadata: { orderId: args.orderId },
        email: userEmail || undefined,
      });

      return { ...result, userId, providerStatus };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

/**
 * On-demand sync from Dodo API.
 * Called on login; syncs only the current user's subscription.
 */
export const syncSubscriptionFromProvider = internalAction({
  args: {
    userId:    v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!supabaseUrl || !supabaseKey || !apiKey) return { success: false, error: "Config missing" };

    const baseUrl = getDodoBaseUrl(apiKey);

    try {
      // ── Get current state from Convex first, then fall back to Supabase ──
      let currentStatus: string | null = null;
      let subscriptionId: string | undefined;

      const convexSub = await ctx.runQuery(internal.subscriptions.getByUserId, { userId: args.userId });

      if (convexSub) {
        currentStatus = convexSub.status;
        subscriptionId = convexSub.dodo_subscription_id ?? undefined;
      } else {
        // Fall back to Supabase profiles if no Convex record yet
        const readHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
        const profileRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}&select=subscription_status,dodo_subscription_id,dodo_customer_id&limit=1`,
          { headers: readHeaders }
        );
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          const profile = profiles?.[0];
          if (profile) {
            currentStatus = profile.subscription_status;
            subscriptionId = profile.dodo_subscription_id;
          }
        }
      }
      // Skip sync for trialing users — trials are managed by cron only
      if (currentStatus === "trialing") {
        return { success: true, skipped: true, reason: "trialing_user" };
      }

      // Find subscription ID from payments if needed
      if (!subscriptionId) {
        const readHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
        const paymentsRes = await fetch(
          `${supabaseUrl}/rest/v1/payments?user_id=eq.${args.userId}&provider=eq.dodo&select=merchant_reference,metadata&order=created_at.desc&limit=20`,
          { headers: readHeaders }
        );
        if (paymentsRes.ok) {
          const payments = await paymentsRes.json();
          for (const p of Array.isArray(payments) ? payments : []) {
            let meta: any = {};
            try { meta = typeof p?.metadata === "string" ? JSON.parse(p.metadata) : p?.metadata || {}; } catch {}
            if (meta?.subscriptionId?.startsWith?.("sub_")) { subscriptionId = meta.subscriptionId; break; }
            if (p?.merchant_reference?.startsWith?.("sub_")) { subscriptionId = p.merchant_reference; break; }
          }
        }
      }
      if (!subscriptionId) return { success: true, noSubscriptionFound: true };

      const subRes = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!subRes.ok) return { success: false, error: `Dodo API: ${subRes.status}` };

      const sub = await subRes.json();
      const statusRaw = String(sub?.status || "").toLowerCase();

      const now = new Date();
      const trulyEnded =
        !!sub?.cancelled_at ||
        (sub?.ended_at && new Date(sub.ended_at) <= now) ||
        (sub?.end_at && new Date(sub.end_at) <= now);

      let mappedStatus: "active" | "cancelled" | "on_hold" | "payment_failed" | null = null;
      if (trulyEnded || statusRaw === "cancelled" || statusRaw === "canceled") {
        mappedStatus = "cancelled";
      } else if (statusRaw === "active") {
        mappedStatus = "active";
      } else if (statusRaw === "on_hold") {
        mappedStatus = "on_hold";
      } else if (["failed", "payment_failed", "past_due"].includes(statusRaw)) {
        mappedStatus = "payment_failed";
      } else if (statusRaw === "expired") {
        mappedStatus = "cancelled";
      } else if (statusRaw === "pending") {
        return { success: true, skipped: true, reason: "pending_subscription", providerStatus: statusRaw };
      } else {
        return { success: true, skipped: true, reason: "unknown_status", providerStatus: statusRaw };
      }

      const resolvedCustomerId = sub?.customer?.id || sub?.customer?.customer_id || sub?.customer_id;

      console.log(`[sync] user=${args.userId} sub=${subscriptionId} raw=${statusRaw} mapped=${mappedStatus}`);

      await ctx.runMutation(internal.subscriptions.transition, {
        userId: args.userId,
        newStatus: mappedStatus,
        endDate: sub?.next_billing_date ? new Date(sub.next_billing_date).getTime() : undefined,
        plan: "Professional",
        billingCycle: sub?.metadata?.billingCycle,
        dodoCustomerId: resolvedCustomerId,
        dodoSubscriptionId: subscriptionId,
        source: "login_sync",
        metadata: { providerStatus: statusRaw },
      });

      return { success: true, providerStatus: statusRaw, subscriptionId };
    } catch (error: any) {
      return { success: false, error: error?.message || "sync failed" };
    }
  },
});

/** Resolve a user ID from email. */
export const resolveUserIdByEmail = internalAction({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, error: "Config missing" };
    const userId = await resolveByEmail(ctx, supabaseUrl, supabaseKey, args.userEmail);
    return { success: !!userId, userId };
  },
});

/** Resolve and persist dodo_customer_id for portal access recovery. */
export const resolveAndLinkCustomer = internalAction({
  args: {
    userId:    v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!supabaseUrl || !supabaseKey || !apiKey) return { success: false, error: "Config missing" };

    const baseUrl = getDodoBaseUrl(apiKey);
    const readHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    try {
      // Strategy 1: Dodo email lookup
      if (args.userEmail) {
        const res = await fetch(
          `${baseUrl}/customers?email=${encodeURIComponent(args.userEmail)}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const customerId = data?.items?.[0]?.customer_id || data?.items?.[0]?.id;
          if (customerId) {
            // Write to Convex first
            const convexSub = await ctx.runQuery(internal.subscriptions.getByUserId, { userId: args.userId });
            if (convexSub) {
              await ctx.runMutation(internal.subscriptions.patchCustomerId, {
                subscriptionId: convexSub._id,
                dodoCustomerId: customerId,
              });
            }
            // Also sync to Supabase
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`, {
              method: "PATCH",
              headers: supabaseHeaders(supabaseKey),
              body: JSON.stringify({ dodo_customer_id: customerId }),
            });
            return { success: true, dodoCustomerId: customerId };
          }
        }
      }

      // Strategy 2: Payment history
      const paymentsRes = await fetch(
        `${supabaseUrl}/rest/v1/payments?user_id=eq.${args.userId}&provider=eq.dodo&select=merchant_reference,metadata&order=created_at.desc&limit=20`,
        { headers: readHeaders }
      );
      let subscriptionId: string | undefined;
      if (paymentsRes.ok) {
        const payments = await paymentsRes.json();
        for (const p of Array.isArray(payments) ? payments : []) {
          let meta: any = {};
          try { meta = typeof p?.metadata === "string" ? JSON.parse(p.metadata) : p?.metadata || {}; } catch {}
          if (meta?.subscriptionId?.startsWith?.("sub_")) { subscriptionId = meta.subscriptionId; break; }
          if (p?.merchant_reference?.startsWith?.("sub_")) { subscriptionId = p.merchant_reference; break; }
        }
      }
      if (!subscriptionId) return { success: false, error: "No Dodo subscription found" };

      const subRes = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!subRes.ok) return { success: false, error: "Dodo subscription lookup failed" };

      const sub = await subRes.json();
      const customerId = sub?.customer?.id || sub?.customer?.customer_id || sub?.customer_id;
      if (!customerId) return { success: false, error: "No customer ID in subscription" };

      // Write to Convex first
      const convexSub = await ctx.runQuery(internal.subscriptions.getByUserId, { userId: args.userId });
      if (convexSub) {
        await ctx.runMutation(internal.subscriptions.patchCustomerId, {
          subscriptionId: convexSub._id,
          dodoCustomerId: customerId,
        });
      }
      // Also sync to Supabase
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`, {
        method: "PATCH",
        headers: supabaseHeaders(supabaseKey),
        body: JSON.stringify({ dodo_customer_id: customerId }),
      });

      return { success: true, dodoCustomerId: customerId };
    } catch (e: any) {
      return { success: false, error: e?.message || "Error" };
    }
  },
});

/** Dispatch a payment/subscription email via Supabase edge function. */
export const dispatchPaymentEmail = internalAction({
  args: {
    email: v.string(),
    type:  v.string(),
    data:  v.any(),
  },
  handler: async (_ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    await sendEmail(supabaseUrl, supabaseKey, args.email, args.type, args.data);
  },
});
