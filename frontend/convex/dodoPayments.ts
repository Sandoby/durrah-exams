import { internalAction } from "./_generated/server";
import { v } from "convex/values";


// Core logic for updating subscription - extracted to avoid circular type issues
async function updateSubscriptionLogic(supabaseUrl: string, supabaseKey: string, args: any) {
    // Identity verification/lookup
    let userId = args.userId;

    // Use consistent headers
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    };

    // If no userId, try to lookup by email
    const emailHeaders = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    };

    if (!userId && args.userEmail) {
        const lookupRes = await fetch(
            `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(args.userEmail)}&select=id`,
            { headers: emailHeaders }
        );

        if (lookupRes.ok) {
            const users = await lookupRes.json();
            if (users?.[0]?.id) {
                userId = users[0].id;
                console.log(`[AUTH] Successfully identified user via email: ${userId}`);
            } else {
                console.warn(`[AUTH] No user found with email: ${args.userEmail}`);
            }
        } else {
            console.error(`[AUTH] Supabase email lookup failed: ${lookupRes.status}`);
        }
    } else if (userId) {
        console.log(`[AUTH] Proceeding with provided userId: ${userId}`);
    }

    if (!userId) {
        console.error('COULD NOT IDENTIFY USER for Dodo event:', { email: args.userEmail, subId: args.subscriptionId });
        return { success: false, error: 'User not identified' };
    }

    // Use the same RPC functions as the admin panel for consistent behavior
    if (args.status === 'active') {
        const days = args.billingCycle === 'yearly' ? 365 : 30;
        let shouldExtend = true;

        // Idempotency: Fetch current profile to check if already extended recently
        try {
            const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription_status,subscription_end_date`, { headers: emailHeaders });
            if (profileRes.ok) {
                const profiles = await profileRes.json();
                const profile = profiles?.[0];
                if (profile?.subscription_status === 'active' && profile?.subscription_end_date) {
                    const currentEnd = new Date(profile.subscription_end_date).getTime();
                    const now = new Date();
                    // Target date if we were to extend now
                    const targetDate = new Date();
                    targetDate.setDate(now.getDate() + days);

                    // If current end date is roughly equal to target (within 24 hours), it's likely a duplicate call
                    const timeDiff = Math.abs(currentEnd - targetDate.getTime());
                    const oneDayMs = 24 * 60 * 60 * 1000;

                    if (timeDiff < oneDayMs) {
                        console.log(`[DB] Subscription extension skipped via Idempotency Check. Current End: ${profile.subscription_end_date}`);
                        shouldExtend = false;
                    }
                }
            }
        } catch (e) {
            console.warn('[DB] Idempotency check error, proceeding with extension:', e);
        }

        if (shouldExtend) {
            // Activate/extend subscription using the admin RPC
            const res = await fetch(`${supabaseUrl}/rest/v1/rpc/extend_subscription`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    p_user_id: userId,
                    p_agent_id: null,
                    p_days: days,
                    p_plan: args.plan || 'Professional',
                    p_reason: 'Activated via Dodo Payments'
                })
            });

            if (!res.ok) {
                const errTxt = await res.text();
                console.error(`[DB] Supabase RPC extend_subscription failed for user ${userId}: ${res.status} ${errTxt}`);
                return { success: false, error: 'Database RPC failed' };
            }
            console.log(`[DB] Successfully activated subscription for user ${userId} via RPC`);
        }

        // ALWAYS update dodo_customer_id if it's there (Critical for Settings button)
        if (args.dodoCustomerId) {
            const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ dodo_customer_id: args.dodoCustomerId })
            });
            if (!patchRes.ok) {
                const patchErr = await patchRes.text();
                console.error(`[DB] Failed to update dodo_customer_id for user ${userId}: ${patchRes.status} ${patchErr}`);
            } else {
                console.log(`[DB] Successfully updated dodo_customer_id for user ${userId}`);
            }
        }

        // INSERT WEB NOTIFICATION: Success
        if (shouldExtend) {
            await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: userId,
                    title: 'Subscription Activated! 🎊',
                    message: `Your professional access is now active until ${args.nextBillingDate || 'the next billing cycle'}. Thank you for choosing Durrah!`,
                    type: 'success'
                })
            });
        }
        return { success: true, userId };
    } else if (args.status === 'cancelled' || args.status === 'payment_failed') {
        // Deactivate subscription using the admin RPC
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/cancel_subscription`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                p_user_id: userId,
                p_agent_id: null,
                p_reason: args.status === 'cancelled' ? 'Cancelled via Dodo' : 'Payment failed via Dodo'
            })
        });

        if (!res.ok) {
            const errTxt = await res.text();
            console.error(`[DB] Supabase RPC cancel_subscription failed for user ${userId}: ${res.status} ${errTxt}`);
            return { success: false, error: 'Database RPC failed' };
        }

        const result = await res.json();
        console.log(`[DB] Deactivated subscription for user ${userId} via RPC`);

        // INSERT WEB NOTIFICATION: Failure/Cancellation
        await fetch(`${supabaseUrl}/rest/v1/notifications`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: userId,
                title: args.status === 'cancelled' ? 'Subscription Cancelled' : 'Payment Action Required ⚠️',
                message: args.status === 'cancelled'
                    ? 'Your premium access has been cancelled. You will retain access until the end of your current period.'
                    : 'We were unable to process your subscription renewal. Please update your payment method in Settings to avoid losing access.',
                type: args.status === 'cancelled' ? 'info' : 'error'
            })
        });

        return { success: result?.success ?? true, userId };
    }

    return { success: false, error: 'Unknown status' };
}

// ============================================
// INTERNAL: Update Subscription Status (called by webhook)
// ============================================
export const updateSubscription = internalAction({
    args: {
        userId: v.optional(v.string()),
        userEmail: v.optional(v.string()),
        status: v.string(),
        plan: v.optional(v.string()),
        dodoCustomerId: v.optional(v.string()),
        subscriptionId: v.optional(v.string()),
        nextBillingDate: v.optional(v.string()), // Used for sync
        billingCycle: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
            return { success: false, error: 'Configuration missing' };
        }

        return await updateSubscriptionLogic(supabaseUrl, supabaseKey, args);
    }
});

// ============================================
// INTERNAL: Record payment in Supabase
// ============================================
export const recordPayment = internalAction({
    args: {
        userId: v.string(),
        amount: v.number(), // in cents
        currency: v.string(),
        status: v.string(),
        merchantReference: v.string(),
        subscriptionId: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) return;

        await fetch(`${supabaseUrl}/rest/v1/payments`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: args.userId,
                amount: args.amount / 100, // Convert from cents to main unit
                currency: args.currency,
                status: args.status,
                merchant_reference: args.merchantReference,
                provider: 'dodo',
                metadata: { subscriptionId: args.subscriptionId }
            })
        });
    }
});

// ============================================
// INTERNAL: Create Dodo Checkout Session
// ============================================
export const createCheckout = internalAction({
    args: {
        userId: v.string(),
        userEmail: v.string(),
        userName: v.string(),
        billingCycle: v.string(),
        returnUrl: v.string(),
    },
    handler: async (_ctx, args) => {
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY not configured');

        const isTest = apiKey.startsWith('test_');
        const baseUrl = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

        // Defined Product IDs for Durrah
        const productIds: Record<string, string> = {
            yearly: 'pdt_0NVdw6iZw42sQIdxctP55',
            monthly: 'pdt_0NVdvPLWrAr1Rym66kXLP',
        };

        const payload = {
            product_cart: [{
                product_id: productIds[args.billingCycle] || productIds.monthly,
                quantity: 1
            }],
            customer: {
                email: args.userEmail,
                name: args.userName,
            },
            metadata: {
                userId: args.userId,
                billingCycle: args.billingCycle,
                planId: 'pro'
            },
            return_url: args.returnUrl,
        };

        // Use /checkouts for the modern Dodo Payments API
        const res = await fetch(`${baseUrl}/checkouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('Dodo API Error:', data);
            throw new Error(data.message || 'Failed to create checkout session');
        }

        return { checkout_url: data.payment_link || data.checkout_url };
    }
});

// ============================================
// INTERNAL: Create Dodo Portal Session
// ============================================
export const createPortal = internalAction({
    args: { dodoCustomerId: v.string() },
    handler: async (_ctx, args) => {
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY not configured');

        const isTest = apiKey.startsWith('test_');
        const baseUrl = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

        const res = await fetch(
            `${baseUrl}/customers/${args.dodoCustomerId}/customer-portal/session`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await res.json();
        if (!res.ok) {
            console.error('Dodo Portal Error:', data);
            throw new Error(data.message || 'Failed to create portal session');
        }

        return { portal_url: data.link || data.url };
    }
});

// ============================================
// INTERNAL: Verify Dodo Payment/Subscription Status Directly
// ============================================
export const verifyPayment = internalAction({
    args: {
        orderId: v.string(), // paymentId or subscriptionId
        userId: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY not configured');

        const isTest = apiKey.startsWith('test_');
        const baseUrl = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

        let status = 'pending';
        let userEmail = '';
        let dodoCustomerId = '';
        let billingCycle = 'monthly';
        let nextBillingDate = undefined;

        console.log(`[DirectVerify] Starting verification for ID: ${args.orderId}`);

        try {
            // Try as subscription first
            if (args.orderId.startsWith('sub_')) {
                const res = await fetch(`${baseUrl}/subscriptions/${args.orderId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[DirectVerify] Dodo Subscription Response:', JSON.stringify(data, null, 2));
                    status = (data.status === 'active') ? 'active' : data.status;
                    userEmail = data.customer?.email;
                    // Robust extraction similar to webhook
                    dodoCustomerId = data.customer?.id || data.customer?.customer_id || data.customer_id;
                    billingCycle = data.metadata?.billingCycle || 'monthly';
                    nextBillingDate = data.next_billing_date;
                }
            } else {
                // Try as payment
                const res = await fetch(`${baseUrl}/payments/${args.orderId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[DirectVerify] Dodo Payment Response:', JSON.stringify(data, null, 2));
                    status = (data.status === 'succeeded') ? 'active' : data.status;
                    userEmail = data.customer?.email;
                    // Robust extraction similar to webhook
                    dodoCustomerId = data.customer?.id || data.customer?.customer_id || data.customer_id;
                    billingCycle = data.metadata?.billingCycle || 'monthly';
                }
            }

            if (status === 'active') {
                console.log(`[DirectVerify] ID ${args.orderId} is confirmed active. Triggering update...`);
                const supabaseUrl = process.env.SUPABASE_URL;
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                if (!supabaseUrl || !supabaseKey) throw new Error('Supabase config missing');

                return await updateSubscriptionLogic(supabaseUrl, supabaseKey, {
                    userId: args.userId,
                    userEmail,
                    status: 'active',
                    plan: 'Professional',
                    dodoCustomerId,
                    subscriptionId: args.orderId.startsWith('sub_') ? args.orderId : undefined,
                    nextBillingDate,
                    billingCycle
                });
            }

            return { success: false, status, message: 'Payment not yet active' };
        } catch (error: any) {
            console.error('[DirectVerify] Error:', error);
            return { success: false, error: error.message };
        }
    }
});
