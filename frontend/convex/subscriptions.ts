import { internalMutation, internalQuery, internalAction, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { DatabaseWriter } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Convex Subscription State Machine
 *
 * This is the SINGLE SOURCE OF TRUTH for all subscription state.
 * All state changes go through performTransition() — webhook handlers,
 * crons, and on-login sync all call the same path.
 *
 * After every transition, a sync action is scheduled to push the
 * new state to Supabase profiles (for backward-compatible frontend reads).
 */

// ─────────────────────────────────────────────────────────────────────────────
// STATE MACHINE RULES
// ─────────────────────────────────────────────────────────────────────────────

function isValidTransition(from: string | null | undefined, to: string): boolean {
  const f = from || "none";

  switch (f) {
    case "none":
    case "":
      return ["active", "trialing", "pending"].includes(to);

    case "pending":
      return ["active", "cancelled", "on_hold"].includes(to);

    case "trialing":
      return ["active", "expired", "cancelled"].includes(to);

    case "active":
      return ["active", "cancelled", "expired", "on_hold", "payment_failed"].includes(to);

    case "on_hold":
      return ["active", "cancelled", "expired"].includes(to);

    case "payment_failed":
      return ["active", "cancelled", "expired"].includes(to);

    case "cancelled":
      return ["active", "trialing", "expired", "pending"].includes(to);

    case "expired":
      return ["active", "trialing", "pending"].includes(to);

    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TRANSITION LOGIC
// Called by the transition mutation AND by cron handlers (same ctx.db)
// ─────────────────────────────────────────────────────────────────────────────

interface TransitionArgs {
  userId: string;
  newStatus: string;
  endDate?: number | null;          // unix ms
  plan?: string;
  billingCycle?: string;
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  email?: string;
  trialEndsAt?: number | null;
  trialGraceEndsAt?: number | null;
  trialActivated?: boolean;
}

interface TransitionResult {
  success: boolean;
  oldStatus?: string | null;
  newStatus?: string;
  oldEndDate?: number | null;
  newEndDate?: number | null;
  skipped?: boolean;
  reason?: string;
  error?: string;
  subscriptionId?: Id<"subscriptions">;
}

export async function performTransition(
  db: DatabaseWriter,
  scheduler: { runAfter: (delay: number, fn: any, args: any) => Promise<any> },
  args: TransitionArgs
): Promise<TransitionResult> {
  // ── Get or create subscription record ──────────────────────────
  let sub = await db
    .query("subscriptions")
    .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
    .first();

  const oldStatus = sub?.status ?? null;
  const oldEndDate = sub?.end_date ?? null;

  // ── Idempotent check ───────────────────────────────────────────
  if (
    oldStatus === args.newStatus &&
    (args.endDate == null || oldEndDate === args.endDate) &&
    args.newStatus !== "active" // always allow active→active (renewals)
  ) {
    return {
      success: true,
      oldStatus,
      newStatus: args.newStatus,
      skipped: true,
      reason: "idempotent",
      subscriptionId: sub?._id,
    };
  }

  // ── Validate transition ────────────────────────────────────────
  if (!isValidTransition(oldStatus, args.newStatus)) {
    // Audit the rejection
    await db.insert("subscriptionAuditLog", {
      user_id: args.userId,
      action: "rejected_transition",
      old_status: oldStatus ?? undefined,
      new_status: args.newStatus,
      source: args.source || "webhook",
      metadata: {
        ...(args.metadata || {}),
        reason: "invalid_transition",
      },
      created_at: Date.now(),
    });

    return {
      success: false,
      error: `Invalid transition: ${oldStatus || "none"} → ${args.newStatus}`,
      oldStatus,
      newStatus: args.newStatus,
    };
  }

  // ── Resolve final end date ─────────────────────────────────────
  let newEndDate: number | null | undefined;

  if (args.newStatus === "active") {
    if (args.endDate != null) {
      newEndDate = Math.max(args.endDate, oldEndDate ?? Date.now());
    } else {
      newEndDate = oldEndDate;
    }
  } else if (["cancelled", "expired"].includes(args.newStatus)) {
    newEndDate = args.endDate ?? oldEndDate;
  } else if (["on_hold", "payment_failed"].includes(args.newStatus)) {
    // On hold: keep current end date — user retains access until resolved
    newEndDate = oldEndDate;
  } else if (args.newStatus === "pending") {
    newEndDate = args.endDate;
  } else {
    newEndDate = args.endDate;
  }

  // ── Upsert subscription record ─────────────────────────────────
  const now = Date.now();
  const updateFields: Record<string, unknown> = {
    status: args.newStatus,
    end_date: newEndDate ?? undefined,
    plan: args.plan || sub?.plan || "Professional",
    updated_at: now,
  };

  if (args.billingCycle) updateFields.billing_cycle = args.billingCycle;
  if (args.dodoCustomerId) updateFields.dodo_customer_id = args.dodoCustomerId;
  if (args.dodoSubscriptionId) updateFields.dodo_subscription_id = args.dodoSubscriptionId;
  if (args.email) updateFields.email = args.email;
  if (args.trialEndsAt !== undefined) updateFields.trial_ends_at = args.trialEndsAt ?? undefined;
  if (args.trialGraceEndsAt !== undefined) updateFields.trial_grace_ends_at = args.trialGraceEndsAt ?? undefined;
  if (args.trialActivated !== undefined) updateFields.trial_activated = args.trialActivated;

  let subscriptionId: Id<"subscriptions">;

  if (sub) {
    await db.patch(sub._id, updateFields);
    subscriptionId = sub._id;
  } else {
    subscriptionId = await db.insert("subscriptions", {
      user_id: args.userId,
      email: args.email,
      status: args.newStatus,
      plan: args.plan || "Professional",
      billing_cycle: args.billingCycle,
      end_date: newEndDate ?? undefined,
      dodo_customer_id: args.dodoCustomerId,
      dodo_subscription_id: args.dodoSubscriptionId,
      trial_ends_at: args.trialEndsAt ?? undefined,
      trial_grace_ends_at: args.trialGraceEndsAt ?? undefined,
      trial_activated: args.trialActivated,
      updated_at: now,
      created_at: now,
    });
  }

  // ── Audit log ──────────────────────────────────────────────────
  await db.insert("subscriptionAuditLog", {
    user_id: args.userId,
    action: args.newStatus,
    old_status: oldStatus ?? undefined,
    new_status: args.newStatus,
    old_end_date: oldEndDate ?? undefined,
    new_end_date: newEndDate ?? undefined,
    plan: args.plan || "Professional",
    billing_cycle: args.billingCycle,
    source: args.source || "webhook",
    dodo_subscription_id: args.dodoSubscriptionId,
    dodo_customer_id: args.dodoCustomerId,
    metadata: args.metadata,
    created_at: now,
  });

  // ── Schedule Supabase sync ─────────────────────────────────────
  // This ensures backward compatibility with frontend reads from profiles
  await scheduler.runAfter(0, internal.subscriptions.syncToSupabase, {
    userId: args.userId,
    status: args.newStatus,
    endDate: newEndDate ?? undefined,
    plan: args.plan || "Professional",
    billingCycle: args.billingCycle,
    dodoCustomerId: args.dodoCustomerId,
    dodoSubscriptionId: args.dodoSubscriptionId,
  });

  return {
    success: true,
    oldStatus,
    newStatus: args.newStatus,
    oldEndDate,
    newEndDate,
    subscriptionId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED MUTATION — primary entry point for state transitions
// ─────────────────────────────────────────────────────────────────────────────

export const transition = internalMutation({
  args: {
    userId:              v.string(),
    newStatus:           v.string(),
    endDate:             v.optional(v.number()),
    plan:                v.optional(v.string()),
    billingCycle:        v.optional(v.string()),
    dodoCustomerId:      v.optional(v.string()),
    dodoSubscriptionId:  v.optional(v.string()),
    source:              v.optional(v.string()),
    metadata:            v.optional(v.any()),
    email:               v.optional(v.string()),
    trialEndsAt:         v.optional(v.number()),
    trialGraceEndsAt:    v.optional(v.number()),
    trialActivated:      v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return performTransition(ctx.db, ctx.scheduler, {
      userId: args.userId,
      newStatus: args.newStatus,
      endDate: args.endDate,
      plan: args.plan,
      billingCycle: args.billingCycle,
      dodoCustomerId: args.dodoCustomerId,
      dodoSubscriptionId: args.dodoSubscriptionId,
      source: args.source,
      metadata: args.metadata as Record<string, unknown> | undefined,
      email: args.email,
      trialEndsAt: args.trialEndsAt,
      trialGraceEndsAt: args.trialGraceEndsAt,
      trialActivated: args.trialActivated,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/** Get subscription by user_id (internal — for backend use) */
export const getByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .first();
  },
});

/** Get subscription by dodo_customer_id (internal — for user resolution) */
export const getByDodoCustomerId = internalQuery({
  args: { dodoCustomerId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_dodo_customer_id", (q) => q.eq("dodo_customer_id", args.dodoCustomerId))
      .first();
  },
});

/** Get subscription by email (internal — for user resolution) */
export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

/** Frontend query — get current user's subscription */
export const getUserSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .first();

    if (!sub) return null;

    return {
      status: sub.status,
      plan: sub.plan,
      billingCycle: sub.billing_cycle,
      endDate: sub.end_date,
      dodoCustomerId: sub.dodo_customer_id,
      trialEndsAt: sub.trial_ends_at,
      trialActivated: sub.trial_activated,
      updatedAt: sub.updated_at,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE SYNC ACTION
// Pushes subscription state to the Supabase profiles table
// so existing frontend reads (AuthContext, Settings, etc.) keep working
// ─────────────────────────────────────────────────────────────────────────────

export const syncToSupabase = internalAction({
  args: {
    userId:              v.string(),
    status:              v.string(),
    endDate:             v.optional(v.number()),
    plan:                v.optional(v.string()),
    billingCycle:        v.optional(v.string()),
    dodoCustomerId:      v.optional(v.string()),
    dodoSubscriptionId:  v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("[syncToSupabase] Missing Supabase config");
      return;
    }

    const patch: Record<string, unknown> = {
      subscription_status: args.status,
      updated_at: new Date().toISOString(),
    };

    if (args.endDate != null) {
      patch.subscription_end_date = new Date(args.endDate).toISOString();
    }
    if (args.plan) patch.subscription_plan = args.plan;
    if (args.billingCycle) patch.billing_cycle = args.billingCycle;
    if (args.dodoCustomerId) patch.dodo_customer_id = args.dodoCustomerId;
    if (args.dodoSubscriptionId) patch.dodo_subscription_id = args.dodoSubscriptionId;

    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(patch),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error(`[syncToSupabase] Failed for ${args.userId}: ${res.status} ${err}`);
      }
    } catch (e) {
      console.error("[syncToSupabase] Error:", e);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION: Seed Convex from Supabase
// Run once after deployment to populate Convex subscriptions table
// ─────────────────────────────────────────────────────────────────────────────

export const seedFromSupabase = internalAction({
  args: {},
  handler: async (ctx) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { error: "Missing Supabase config" };
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,email,subscription_status,subscription_plan,subscription_end_date,billing_cycle,dodo_customer_id,dodo_subscription_id,trial_ends_at,trial_grace_ends_at,trial_activated,email_notifications_enabled,last_reminder_sent_at&subscription_status=not.is.null`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!res.ok) {
      return { error: `Supabase fetch failed: ${res.status}` };
    }

    const profiles = await res.json();
    let created = 0;
    let skipped = 0;

    for (const p of profiles) {
      // Check if already exists in Convex
      const existing = await ctx.runQuery(internal.subscriptions.getByUserId, {
        userId: p.id,
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create Convex subscription record
      await ctx.runMutation(internal.subscriptions.createDirect, {
        userId: p.id,
        email: p.email || undefined,
        status: p.subscription_status,
        plan: p.subscription_plan || "Professional",
        billingCycle: p.billing_cycle || undefined,
        endDate: p.subscription_end_date
          ? new Date(p.subscription_end_date).getTime()
          : undefined,
        dodoCustomerId: p.dodo_customer_id || undefined,
        dodoSubscriptionId: p.dodo_subscription_id || undefined,
        trialEndsAt: p.trial_ends_at
          ? new Date(p.trial_ends_at).getTime()
          : undefined,
        trialGraceEndsAt: p.trial_grace_ends_at
          ? new Date(p.trial_grace_ends_at).getTime()
          : undefined,
        trialActivated: p.trial_activated || false,
        emailNotificationsEnabled: p.email_notifications_enabled ?? true,
        lastReminderSentAt: p.last_reminder_sent_at
          ? new Date(p.last_reminder_sent_at).getTime()
          : undefined,
      });

      created++;
    }

    console.log(`[seedFromSupabase] Created ${created}, skipped ${skipped} (already exist)`);
    return { success: true, created, skipped, total: profiles.length };
  },
});

/** Direct insert — used by seedFromSupabase migration only */
export const createDirect = internalMutation({
  args: {
    userId:              v.string(),
    email:               v.optional(v.string()),
    status:              v.string(),
    plan:                v.optional(v.string()),
    billingCycle:        v.optional(v.string()),
    endDate:             v.optional(v.number()),
    dodoCustomerId:      v.optional(v.string()),
    dodoSubscriptionId:  v.optional(v.string()),
    trialEndsAt:         v.optional(v.number()),
    trialGraceEndsAt:    v.optional(v.number()),
    trialActivated:      v.optional(v.boolean()),
    emailNotificationsEnabled: v.optional(v.boolean()),
    lastReminderSentAt:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("subscriptions", {
      user_id: args.userId,
      email: args.email,
      status: args.status,
      plan: args.plan || "Professional",
      billing_cycle: args.billingCycle,
      end_date: args.endDate,
      dodo_customer_id: args.dodoCustomerId,
      dodo_subscription_id: args.dodoSubscriptionId,
      trial_ends_at: args.trialEndsAt,
      trial_grace_ends_at: args.trialGraceEndsAt,
      trial_activated: args.trialActivated,
      email_notifications_enabled: args.emailNotificationsEnabled ?? true,
      last_reminder_sent_at: args.lastReminderSentAt,
      updated_at: now,
      created_at: now,
    });
  },
});

/** Update last_reminder_sent_at for a subscription */
export const updateReminderSent = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      last_reminder_sent_at: Date.now(),
    });
  },
});

/** Patch dodo_customer_id on an existing subscription record. */
export const patchCustomerId = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    dodoCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      dodo_customer_id: args.dodoCustomerId,
      updated_at: Date.now(),
    });
  },
});
