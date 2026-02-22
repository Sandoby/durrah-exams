import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Dodo Payments — Clean Subscription Backend
 *
 * Design principles:
 * 1. Single source of truth: ALL state changes go through transition_subscription() RPC
 * 2. State machine enforced at database level — invalid transitions are rejected + logged
 * 3. Idempotent: replaying the same event has no side effects
 * 4. No reconciliation cron — webhooks + on-login sync are sufficient
 * 5. No direct PATCH to profiles — only the RPC touches subscription columns
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

/** Single helper: call transition_subscription RPC */
async function callTransitionRPC(
  supabaseUrl: string,
  supabaseKey: string,
  params: {
    userId: string;
    newStatus: string;
    endDate?: string | null;
    plan?: string;
    billingCycle?: string;
    dodoCustomerId?: string;
    dodoSubscriptionId?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const headers = supabaseHeaders(supabaseKey);

  const body: Record<string, unknown> = {
    p_user_id: params.userId,
    p_new_status: params.newStatus,
    p_plan: params.plan || "Professional",
    p_source: params.source || "webhook",
    p_metadata: params.metadata || {},
  };

  if (params.endDate) body.p_end_date = params.endDate;
  if (params.billingCycle) body.p_billing_cycle = params.billingCycle;
  if (params.dodoCustomerId) body.p_dodo_customer_id = params.dodoCustomerId;
  if (params.dodoSubscriptionId) body.p_dodo_subscription_id = params.dodoSubscriptionId;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/transition_subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[RPC] transition_subscription failed: ${res.status} ${errText}`);
    return { success: false, error: `RPC failed: ${res.status} ${errText}` };
  }

  const result = await res.json();

  if (result?.success === false) {
    console.warn(`[RPC] transition_subscription rejected: ${result?.error}`, {
      userId: params.userId,
      newStatus: params.newStatus,
      oldStatus: result?.old_status,
    });
    return { success: false, error: result.error, result };
  }

  return { success: true, result };
}

/** Resolve userId by email */
async function resolveByEmail(
  supabaseUrl: string,
  supabaseKey: string,
  email: string
): Promise<string | undefined> {
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

/** Resolve userId by dodo_customer_id */
async function resolveByCustomerId(
  supabaseUrl: string,
  supabaseKey: string,
  customerId: string
): Promise<string | undefined> {
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
 * Always goes through transition_subscription() RPC — never direct PATCH.
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
  handler: async (_ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, error: "Config missing" };

    let userId = args.userId;

    // ── Resolve user ─────────────────────────────────────────────
    if (!userId && args.userEmail) {
      userId = await resolveByEmail(supabaseUrl, supabaseKey, args.userEmail);
    }
    if (!userId && args.dodoCustomerId) {
      userId = await resolveByCustomerId(supabaseUrl, supabaseKey, args.dodoCustomerId);
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
    if (args.status !== "active" && args.status !== "cancelled") {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription_status&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (res.ok) {
          const rows = await res.json();
          if (rows?.[0]?.subscription_status === "trialing") {
            console.log(`[TRIAL-PROTECTION] Skipping '${args.status}' for trialing user ${userId}`);
            return { success: true, skipped: true, reason: "trial_protection", userId };
          }
        }
      } catch {}
    }

    // ── Call state machine RPC ───────────────────────────────────
    const rpcResult = await callTransitionRPC(supabaseUrl, supabaseKey, {
      userId,
      newStatus: args.status,
      endDate: args.endDate,
      plan: args.plan || "Professional",
      billingCycle: args.billingCycle,
      dodoCustomerId: args.dodoCustomerId,
      dodoSubscriptionId: args.dodoSubscriptionId,
      source: "webhook",
      metadata: { event_type: args.eventType },
    });

    if (!rpcResult.success) {
      return { success: false, error: rpcResult.error, userId };
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

/** Create a Dodo Payments checkout session. */
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

    const res = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_cart: [{ product_id: productIds[args.billingCycle] || productIds.monthly, quantity: 1 }],
        customer: { email: args.userEmail, name: args.userName },
        metadata: { userId: args.userId, billingCycle: args.billingCycle, planId: "professional" },
        return_url: args.returnUrl,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[createCheckout] Dodo API error:", data);
      throw new Error(data.message || "Failed to create checkout session");
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

    return { checkout_url: data.payment_link || data.checkout_url };
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
  handler: async (_ctx, args) => {
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
      if (!userId && userEmail) userId = await resolveByEmail(supabaseUrl, supabaseKey, userEmail);
      if (!userId && dodoCustomerId) userId = await resolveByCustomerId(supabaseUrl, supabaseKey, dodoCustomerId);
      if (!userId) return { success: false, error: "Could not identify user" };

      const rpcResult = await callTransitionRPC(supabaseUrl, supabaseKey, {
        userId,
        newStatus: "active",
        endDate: nextBillingDate,
        plan: "Professional",
        billingCycle,
        dodoCustomerId,
        dodoSubscriptionId,
        source: "direct_verify",
        metadata: { orderId: args.orderId },
      });

      return { ...rpcResult, userId, providerStatus };
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
  handler: async (_ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!supabaseUrl || !supabaseKey || !apiKey) return { success: false, error: "Config missing" };

    const readHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    const baseUrl = getDodoBaseUrl(apiKey);

    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}&select=subscription_status,dodo_subscription_id,dodo_customer_id&limit=1`,
        { headers: readHeaders }
      );
      if (!profileRes.ok) return { success: false, error: "Profile fetch failed" };
      const profiles = await profileRes.json();
      const profile = profiles?.[0];
      if (!profile) return { success: false, error: "Profile not found" };

      // Skip sync for trialing users — trials are managed by cron only
      if (profile.subscription_status === "trialing") {
        return { success: true, skipped: true, reason: "trialing_user" };
      }

      // Find subscription ID
      let subscriptionId: string | undefined = profile.dodo_subscription_id;
      if (!subscriptionId) {
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

      let mappedStatus: "active" | "cancelled" | "payment_failed" | null = null;
      if (trulyEnded || statusRaw === "cancelled" || statusRaw === "canceled") {
        mappedStatus = "cancelled";
      } else if (statusRaw === "active") {
        mappedStatus = "active";
      } else if (["on_hold", "failed", "payment_failed", "past_due"].includes(statusRaw)) {
        mappedStatus = "payment_failed";
      } else {
        return { success: true, skipped: true, reason: "unknown_status", providerStatus: statusRaw };
      }

      const dodoCustomerId = sub?.customer?.id || sub?.customer?.customer_id || sub?.customer_id;

      console.log(`[sync] user=${args.userId} sub=${subscriptionId} raw=${statusRaw} mapped=${mappedStatus}`);

      const rpcResult = await callTransitionRPC(supabaseUrl, supabaseKey, {
        userId: args.userId,
        newStatus: mappedStatus,
        endDate: sub?.next_billing_date,
        plan: "Professional",
        billingCycle: sub?.metadata?.billingCycle,
        dodoCustomerId,
        dodoSubscriptionId: subscriptionId,
        source: "login_sync",
        metadata: { providerStatus: statusRaw },
      });

      return { ...rpcResult, providerStatus: statusRaw, subscriptionId };
    } catch (error: any) {
      return { success: false, error: error?.message || "sync failed" };
    }
  },
});

/** Resolve a user ID from email. */
export const resolveUserIdByEmail = internalAction({
  args: { userEmail: v.string() },
  handler: async (_ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, error: "Config missing" };
    const userId = await resolveByEmail(supabaseUrl, supabaseKey, args.userEmail);
    return { success: !!userId, userId };
  },
});

/** Resolve and persist dodo_customer_id for portal access recovery. */
export const resolveAndLinkCustomer = internalAction({
  args: {
    userId:    v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
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
