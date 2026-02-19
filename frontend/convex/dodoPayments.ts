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

    // If user still not found, try looking up by dodo_customer_id
    if (!userId && args.dodoCustomerId) {
        const custLookup = await fetch(
            `${supabaseUrl}/rest/v1/profiles?dodo_customer_id=eq.${encodeURIComponent(args.dodoCustomerId)}&select=id`,
            { headers: emailHeaders }
        );
        if (custLookup.ok) {
            const custUsers = await custLookup.json();
            if (custUsers?.[0]?.id) {
                userId = custUsers[0].id;
                console.log(`[AUTH] Successfully identified user via dodo_customer_id: ${userId}`);
            }
        }
    }

    if (!userId) {
        console.error('FAILED ACTIVATION: Could not identify user for Dodo event:', { 
            email: args.userEmail, 
            subId: args.subscriptionId,
            customerId: args.dodoCustomerId 
        });
        
        // Log failed activation for admin recovery
        try {
            await fetch(`${supabaseUrl}/rest/v1/failed_activations`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    dodo_subscription_id: args.subscriptionId,
                    dodo_customer_id: args.dodoCustomerId,
                    customer_email: args.userEmail,
                    event_type: args.eventType || 'unknown',
                    webhook_payload: args,
                    error_message: 'User identification failed - no userId, email match, or customer_id match',
                    status: 'pending_resolution'
                })
            });
            console.log('[FAILED_ACTIVATION] Logged to failed_activations table for admin recovery');
        } catch (e) {
            console.error('[FAILED_ACTIVATION] Could not log to failed_activations:', e);
        }
        
        return { success: false, error: 'User not identified - logged for recovery' };
    }

    // TRIAL PROTECTION: Check if user is currently on trial
    // If they are, only allow 'active' paid subscriptions to override (trial-to-paid conversion)
    // Prevent old cancelled/failed Dodo subscriptions from destroying active trials
    // BUT: Always allow explicit cancellation from the portal (subscription.cancelled event)
    try {
        const profileRes = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription_status,trial_activated,trial_ends_at,trial_grace_ends_at`,
            { headers: emailHeaders }
        );
        if (profileRes.ok) {
            const profiles = await profileRes.json();
            const profile = profiles?.[0];

            // If user is on active trial OR in grace period and Dodo status is cancelled/payment_failed
            // Skip the update to protect the trial/grace period
            // EXCEPTION: If eventType explicitly indicates a portal cancellation, allow it through
            const isTrialing = profile?.subscription_status === 'trialing' && profile?.trial_activated === true;
            const isInGracePeriod = profile?.subscription_status === 'expired' &&
                                    profile?.trial_activated === true &&
                                    profile?.trial_grace_ends_at &&
                                    new Date(profile.trial_grace_ends_at) > new Date();

            const isExplicitCancellation = args.status === 'cancelled' && (
                args.eventType === 'subscription.cancelled' || 
                args.eventType === 'subscription.canceled' ||
                args.eventType === 'subscription.updated' // portal cancel triggers updated event
            );

            if ((isTrialing || isInGracePeriod) && args.status !== 'active' && !isExplicitCancellation) {
                console.log(`[TRIAL-PROTECTION] Skipping ${args.status} Dodo update for user ${userId} - protecting active trial/grace period`);
                return { success: true, userId, skipped: true, reason: 'trial_protection' };
            } else if (isTrialing && args.status === 'active') {
                console.log(`[TRIAL-TO-PAID] User ${userId} converting from trial to paid subscription`);
            } else if (isExplicitCancellation && (isTrialing || isInGracePeriod)) {
                console.log(`[TRIAL-CANCEL] User ${userId} explicitly cancelled via portal during trial - allowing cancellation`);
            }
        }
    } catch (e) {
        console.warn('[TRIAL-PROTECTION] Check failed (proceeding):', e);
    }

    // Determine billing cycle with robust fallback chain
    let billingCycle = args.billingCycle;
    if (!billingCycle || billingCycle === 'monthly') {
        // Fallback 1: Check profile's stored billing_cycle
        try {
            const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=billing_cycle`, 
                { headers: emailHeaders });
            if (profileRes.ok) {
                const profiles = await profileRes.json();
                const storedCycle = profiles?.[0]?.billing_cycle;
                if (storedCycle) {
                    billingCycle = storedCycle;
                    console.log(`[BILLING_CYCLE] Using stored billing_cycle from profile: ${billingCycle}`);
                }
            }
        } catch (e) {
            console.warn('[BILLING_CYCLE] Could not fetch profile billing_cycle:', e);
        }
        
        // Fallback 2: Check if subscription product ID indicates yearly
        if ((!billingCycle || billingCycle === 'monthly') && args.subscriptionId) {
            const apiKey = process.env.DODO_PAYMENTS_API_KEY;
            if (apiKey) {
                try {
                    const isTest = apiKey.startsWith('test_');
                    const baseUrl = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
                    const subRes = await fetch(`${baseUrl}/subscriptions/${args.subscriptionId}`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    if (subRes.ok) {
                        const subData = await subRes.json();
                        const productId = subData?.product_id || subData?.product?.id;
                        // Yearly product ID
                        if (productId === 'pdt_0NVdw6iZw42sQIdxctP55') {
                            billingCycle = 'yearly';
                            console.log('[BILLING_CYCLE] Detected yearly subscription from product ID');
                        }
                    }
                } catch (e) {
                    console.warn('[BILLING_CYCLE] Could not fetch Dodo subscription for product check:', e);
                }
            }
        }
    }
    console.log(`[BILLING_CYCLE] Final resolved billing cycle: ${billingCycle}`);

    // Use the same RPC functions as the admin panel for consistent behavior
    if (args.status === 'active') {
        // For provider-driven updates, prefer exact period end from provider.
        // This prevents duplicated extensions from repeated webhook/sync events.
        if (args.nextBillingDate) {
            const targetEnd = new Date(args.nextBillingDate);
            
            // Idempotency check: fetch current end date
            let shouldUpdate = true;
            try {
                const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription_status,subscription_end_date`, 
                    { headers: emailHeaders });
                if (profileRes.ok) {
                    const profiles = await profileRes.json();
                    const profile = profiles?.[0];
                    if (profile?.subscription_status === 'active' && profile?.subscription_end_date) {
                        const currentEnd = new Date(profile.subscription_end_date);
                        const timeDiff = Math.abs(targetEnd.getTime() - currentEnd.getTime());
                        const oneHourMs = 3600000;
                        
                        if (timeDiff < oneHourMs) {
                            console.log(`[IDEMPOTENCY] Skipping update - end dates match within 1 hour. Current: ${profile.subscription_end_date}, Target: ${args.nextBillingDate}`);
                            shouldUpdate = false;
                        }
                    }
                }
            } catch (e) {
                console.warn('[IDEMPOTENCY] Check failed, proceeding with update:', e);
            }
            
            if (shouldUpdate) {
                const patchPayload: Record<string, any> = {
                    subscription_status: 'active',
                    subscription_end_date: args.nextBillingDate,
                    subscription_plan: 'Professional',
                    billing_cycle: billingCycle
                };
                if (args.dodoCustomerId) patchPayload.dodo_customer_id = args.dodoCustomerId;

                const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(patchPayload)
                });

                if (!patchRes.ok) {
                    const patchErr = await patchRes.text();
                    console.error(`[DB] Failed to sync active subscription state for user ${userId}: ${patchRes.status} ${patchErr}`);
                    return { success: false, error: 'Profile sync failed' };
                }
                console.log(`[DB] Successfully patched subscription for user ${userId} with nextBillingDate`);
            }

            return { success: true, userId, syncedByDate: true, skipped: !shouldUpdate };
        }

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
                    p_days: days,
                    p_reason: `Activated via Dodo Payments (${billingCycle})`,
                    p_metadata: {
                        source: 'dodo_webhook',
                        plan: 'Professional',
                        billing_cycle: billingCycle,
                        subscription_id: args.subscriptionId || null,
                        event_type: args.eventType || 'activation'
                    }
                })
            });

            if (!res.ok) {
                const errTxt = await res.text();
                console.error(`[DB] Supabase RPC extend_subscription failed for user ${userId}: ${res.status} ${errTxt}`);
                return { success: false, error: 'Database RPC failed' };
            }
            console.log(`[DB] Successfully activated subscription for user ${userId} via RPC`);

            // Update billing_cycle column
            try {
                await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ billing_cycle: billingCycle })
                });
            } catch (e) {
                console.warn('[DB] Failed to update billing_cycle (non-critical):', e);
            }

            // TRIAL-TO-PAID CONVERSION: Clear trial fields if user was on trial
            try {
                const { data: currentProfile } = await fetch(`${supabaseUrl}/rest/v1/profiles?select=subscription_status,trial_ends_at&id=eq.${userId}`, {
                    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
                }).then(r => r.json());

                if (currentProfile && currentProfile.length > 0 && currentProfile[0].subscription_status === 'trialing') {
                    console.log(`[DB] 🎉 Trial-to-paid conversion for user ${userId}`);
                    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({
                            trial_ends_at: null,
                            trial_grace_ends_at: null
                            // Keep trial_activated and trial_started_at for analytics
                        })
                    });
                }
            } catch (trialError) {
                console.warn('[DB] Trial conversion cleanup failed (non-critical):', trialError);
            }
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
            }
        }

        // Add success notification
        if (!args.silent) {
            try {
                await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        user_id: userId,
                        title: 'Subscription Activated! 💎',
                        message: `Welcome to the ${args.plan || 'Professional'} plan. Your premium features are now active.`,
                        type: 'success',
                        is_read: false
                    })
                });
            } catch (e) {
                console.error('[NOTIF] Failed to send success notification:', e);
            }
        }

        return { success: true, userId };
    } else if (args.status === 'cancelled') {
        // Immediate deactivation (aligned with AdminPanel "Deactivate")
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/cancel_subscription`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                p_user_id: userId,
                p_reason: 'Cancelled via Dodo',
                p_metadata: {
                    source: 'dodo_webhook',
                    subscription_id: args.subscriptionId || null,
                    event_type: args.eventType || 'cancellation'
                }
            })
        });

        if (!rpcRes.ok) {
            const rpcErr = await rpcRes.text();
            console.error(`[DB] Supabase RPC cancel_subscription failed for user ${userId}: ${rpcRes.status} ${rpcErr}`);
        }

        // Enforce final state for frontend/access control sync.
        const enforcePatch = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                subscription_status: 'cancelled'
            })
        });

        if (!enforcePatch.ok) {
            const enforceErr = await enforcePatch.text();
            console.error(`[DB] Failed to enforce profile status for user ${userId}: ${enforcePatch.status} ${enforceErr}`);
            if (!rpcRes.ok) {
                return { success: false, error: 'RPC and profile enforcement failed' };
            }
        }

        return { success: true, userId, status: 'cancelled' };
    } else if (args.status === 'payment_failed') {
        // Do NOT cancel on payment failure; mark status and notify
        const enforcePatch = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                subscription_status: 'payment_failed'
            })
        });

        if (!enforcePatch.ok) {
            const enforceErr = await enforcePatch.text();
            console.error(`[DB] Failed to set payment_failed status for user ${userId}: ${enforcePatch.status} ${enforceErr}`);
            return { success: false, error: 'Failed to mark payment_failed' };
        }

        try {
            await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: userId,
                    title: 'Payment Failed',
                    message: 'We were unable to process your subscription payment. Please update your payment method to avoid service interruption.',
                    type: 'error',
                    is_read: false
                })
            });
        } catch (e) {
            console.error('[NOTIF] Failed to send payment failure notification:', e);
        }

        return { success: true, userId, status: 'payment_failed' };
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
        eventType: v.optional(v.string()),
        silent: v.optional(v.boolean()),
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
        userEmail: v.optional(v.string()),
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
                user_email: args.userEmail,
                // Store in smallest currency unit to match Dodo responses
                amount: args.amount,
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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

        // Persist Dodo customer id early when available from checkout response
        const checkoutCustomerId =
            data?.customer_id ||
            data?.customer?.id ||
            data?.customer?.customer_id;

        if (checkoutCustomerId && supabaseUrl && supabaseKey) {
            try {
                const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ dodo_customer_id: checkoutCustomerId })
                });

                if (!patchRes.ok) {
                    const patchErr = await patchRes.text();
                    console.warn('[Checkout] Failed to persist dodo_customer_id:', patchRes.status, patchErr);
                }
            } catch (error) {
                console.warn('[Checkout] Error persisting dodo_customer_id:', error);
            }
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


// ============================================
// INTERNAL: Resolve and link Dodo customer id by inspecting recent Dodo payment/subscription
// ============================================
export const resolveAndLinkCustomer = internalAction({
    args: {
        userId: v.string(),
        userEmail: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;

        if (!supabaseUrl || !supabaseKey || !apiKey) {
            console.error('[ResolveCustomer] Missing configuration');
            return { success: false, error: 'Configuration missing' };
        }

        try {
            const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
            const baseUrl = apiKey.startsWith('test_') ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

            if (args.userEmail) {
                try {
                    const customerRes = await fetch(
                        `${baseUrl}/customers?email=${encodeURIComponent(args.userEmail)}`,
                        { headers: { Authorization: `Bearer ${apiKey}` } }
                    );
                    if (customerRes.ok) {
                        const customerData = await customerRes.json();
                        const directCustomerId =
                            customerData?.items?.[0]?.customer_id ||
                            customerData?.items?.[0]?.id;
                        if (directCustomerId) {
                            const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`, {
                                method: 'PATCH',
                                headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                                body: JSON.stringify({ dodo_customer_id: directCustomerId }),
                            });
                            if (!patchRes.ok) {
                                const txt = await patchRes.text();
                                console.warn('[ResolveCustomer] Could not persist dodo_customer_id (continuing):', patchRes.status, txt);
                            }
                            return { success: true, dodoCustomerId: directCustomerId };
                        }
                    }
                } catch (e) {
                    console.warn('[ResolveCustomer] Direct email customer lookup failed:', e);
                }
            }

            // Get the most recent Dodo payment entry for this user to extract subscriptionId
            // Fetch a few recent Dodo payments for this user and try to extract a subscription id
            const paymentsRes = await fetch(
                `${supabaseUrl}/rest/v1/payments?user_id=eq.${args.userId}&provider=eq.dodo&select=merchant_reference&order=created_at.desc&limit=20`,
                { headers }
            );

            let subscriptionId: string | undefined;
            const paymentCandidates: string[] = [];
            if (paymentsRes.ok) {
                const payments = await paymentsRes.json();
                if (Array.isArray(payments) && payments.length > 0) {
                    for (const p of payments) {
                        // metadata may be JSON or stringified JSON – handle both
                        let meta: any = {};
                        try {
                            meta = typeof p?.metadata === 'string' ? JSON.parse(p.metadata) : (p?.metadata || {});
                        } catch (e) {
                            console.warn('[ResolveCustomer] Failed to parse payments.metadata JSON:', e);
                        }
                        if (meta?.subscriptionId && typeof meta.subscriptionId === 'string') {
                            subscriptionId = meta.subscriptionId;
                        }
                        // Fallback: merchant_reference might itself be a subscription id
                        if (!subscriptionId && typeof p?.merchant_reference === 'string' && p.merchant_reference.startsWith('sub_')) {
                            subscriptionId = p.merchant_reference;
                        }
                        if (typeof p?.merchant_reference === 'string' && (p.merchant_reference.startsWith('pay_') || p.merchant_reference.startsWith('pmt_'))) {
                            paymentCandidates.push(p.merchant_reference);
                        }
                        if (subscriptionId) break;
                    }
                }
            } else {
                console.warn('[ResolveCustomer] Payments fetch failed:', paymentsRes.status);
            }

            if (!subscriptionId && args.userEmail) {
                const paymentsByEmailRes = await fetch(
                    `${supabaseUrl}/rest/v1/payments?provider=eq.dodo&select=merchant_reference&order=created_at.desc&limit=100`,
                    { headers }
                );

                if (paymentsByEmailRes.ok) {
                    const emailPayments = await paymentsByEmailRes.json();
                    if (Array.isArray(emailPayments) && emailPayments.length > 0) {
                        for (const p of emailPayments) {
                            let meta: any = {};
                            try {
                                meta = typeof p?.metadata === 'string' ? JSON.parse(p.metadata) : (p?.metadata || {});
                            } catch {}

                            if (!subscriptionId && typeof meta?.subscriptionId === 'string') {
                                subscriptionId = meta.subscriptionId;
                            }
                            if (!subscriptionId && typeof p?.merchant_reference === 'string' && p.merchant_reference.startsWith('sub_')) {
                                subscriptionId = p.merchant_reference;
                            }
                            if (typeof p?.merchant_reference === 'string' && (p.merchant_reference.startsWith('pay_') || p.merchant_reference.startsWith('pmt_'))) {
                                paymentCandidates.push(p.merchant_reference);
                            }
                            if (subscriptionId) break;
                        }
                    }
                }
            }

            if (!subscriptionId && paymentCandidates.length === 0) {
                console.warn('[ResolveCustomer] No recent Dodo subscription/payment found for user', args.userId, args.userEmail);
                return { success: false, error: 'No recent dodo payment' };
            }

            let dodoCustomerId: string | undefined;
            if (subscriptionId) {
                const subRes = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
                    headers: { Authorization: `Bearer ${apiKey}` }
                });
                if (subRes.ok) {
                    const sub = await subRes.json();
                    dodoCustomerId = sub?.customer?.id || sub?.customer?.customer_id || sub?.customer_id;
                } else {
                    const errTxt = await subRes.text();
                    console.warn('[ResolveCustomer] Dodo subscription lookup failed:', subRes.status, errTxt);
                }
            }
            if (!dodoCustomerId && paymentCandidates.length > 0) {
                for (const paymentId of [...new Set(paymentCandidates)]) {
                    const payRes = await fetch(`${baseUrl}/payments/${paymentId}`, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    if (!payRes.ok) continue;
                    const pay = await payRes.json();
                    dodoCustomerId = pay?.customer?.id || pay?.customer?.customer_id || pay?.customer_id;
                    if (dodoCustomerId) break;
                }
            }

            if (!dodoCustomerId) {
                console.warn('[ResolveCustomer] Could not resolve customer id from subscription/payment lookups');
                return { success: false, error: 'No customer id' };
            }

            // Patch profile to persist the customer id for future operations
            const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${args.userId}`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                body: JSON.stringify({ dodo_customer_id: dodoCustomerId }),
            });
            if (!patchRes.ok) {
                const txt = await patchRes.text();
                console.error('[ResolveCustomer] Failed to patch dodo_customer_id:', patchRes.status, txt);
                // Not fatal – we can still return the id
            }

            return { success: true, dodoCustomerId };
        } catch (e: any) {
            console.error('[ResolveCustomer] Error:', e);
            return { success: false, error: e?.message || 'error' };
        }
    }
});

export const resolveUserIdByEmail = internalAction({
    args: {
        userEmail: v.string(),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return { success: false, error: 'Configuration missing' };
        }

        try {
            const lookupRes = await fetch(
                `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(args.userEmail)}&select=id`,
                { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
            );
            if (!lookupRes.ok) {
                return { success: false, error: `Lookup failed: ${lookupRes.status}` };
            }
            const profiles = await lookupRes.json();
            const userId = profiles?.[0]?.id as string | undefined;
            return { success: !!userId, userId };
        } catch (error: any) {
            return { success: false, error: error?.message || 'Lookup error' };
        }
    }
});

export const syncSubscriptionFromProvider = internalAction({
    args: {
        userId: v.string(),
        userEmail: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;

        if (!supabaseUrl || !supabaseKey || !apiKey) {
            return { success: false, error: 'Configuration missing' };
        }

        const headers = {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
        };
        const baseUrl = apiKey.startsWith('test_') ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

        try {
            const paymentsRes = await fetch(
                `${supabaseUrl}/rest/v1/payments?user_id=eq.${args.userId}&provider=eq.dodo&select=merchant_reference,metadata&order=created_at.desc&limit=25`,
                { headers }
            );

            if (!paymentsRes.ok) {
                const err = await paymentsRes.text();
                return { success: false, error: `Payments lookup failed: ${paymentsRes.status} ${err}` };
            }

            const payments = await paymentsRes.json();
            let subscriptionId: string | undefined;
            for (const payment of (Array.isArray(payments) ? payments : [])) {
                let metadata: any = {};
                try {
                    metadata = typeof payment?.metadata === 'string'
                        ? JSON.parse(payment.metadata)
                        : (payment?.metadata || {});
                } catch {
                    metadata = {};
                }

                if (typeof metadata?.subscriptionId === 'string' && metadata.subscriptionId.startsWith('sub_')) {
                    subscriptionId = metadata.subscriptionId;
                    break;
                }
                if (typeof payment?.merchant_reference === 'string' && payment.merchant_reference.startsWith('sub_')) {
                    subscriptionId = payment.merchant_reference;
                    break;
                }
            }

            if (!subscriptionId) {
                return { success: true, noSubscriptionId: true };
            }

            const subRes = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (!subRes.ok) {
                const err = await subRes.text();
                return { success: false, error: `Dodo subscription lookup failed: ${subRes.status} ${err}` };
            }

            const subscription = await subRes.json();
            const statusRaw = String(subscription?.status || '').toLowerCase();
            const canceledByFlags =
                subscription?.cancel_at_period_end === true ||
                !!subscription?.cancelled_at ||
                !!subscription?.ended_at ||
                !!subscription?.end_at;
            const dodoCustomerId = subscription?.customer?.id || subscription?.customer?.customer_id || subscription?.customer_id;
            const nextBillingDate = subscription?.next_billing_date as string | undefined;

            let mappedStatus: 'active' | 'cancelled' | 'payment_failed';
            if (canceledByFlags) {
                mappedStatus = 'cancelled';
            } else if (statusRaw === 'active' || statusRaw === 'trialing') {
                mappedStatus = 'active';
            } else if (
                statusRaw === 'on_hold' ||
                statusRaw === 'failed' ||
                statusRaw === 'payment_failed' ||
                statusRaw === 'past_due'
            ) {
                mappedStatus = 'payment_failed';
            } else {
                mappedStatus = 'cancelled';
            }

            console.log(`[SYNC] Dodo subscription ${subscriptionId}: raw=${statusRaw}, cancelFlags=${canceledByFlags}, mapped=${mappedStatus}`);

            const syncResult = await updateSubscriptionLogic(supabaseUrl, supabaseKey, {
                userId: args.userId,
                userEmail: args.userEmail,
                status: mappedStatus,
                dodoCustomerId,
                subscriptionId,
                nextBillingDate,
                billingCycle: subscription?.metadata?.billingCycle,
                plan: 'Professional',
                silent: true,
                // Pass eventType so trial protection allows explicit cancellations from sync
                eventType: mappedStatus === 'cancelled' ? 'subscription.cancelled' : 'subscription.updated'
            });

            return { ...syncResult, providerStatus: statusRaw, subscriptionId };
        } catch (error: any) {
            return { success: false, error: error?.message || 'sync failed' };
        }
    }
});

export const reconcileSubscriptionsFromDodo = internalAction({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;

        if (!supabaseUrl || !supabaseKey || !apiKey) {
            return { success: false, error: 'Configuration missing' };
        }

        const limit = Math.max(1, Math.min(args.limit ?? 100, 300));
        const baseUrl = apiKey.startsWith('test_') ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

        try {
            const listRes = await fetch(`${baseUrl}/subscriptions?limit=${limit}`, {
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (!listRes.ok) {
                const err = await listRes.text();
                return { success: false, error: `Dodo list subscriptions failed: ${listRes.status} ${err}` };
            }

            const payload = await listRes.json();
            const items = Array.isArray(payload?.items) ? payload.items : [];

            let processed = 0;
            let synced = 0;
            let unresolved = 0;

            for (const subscription of items) {
                processed++;
                const statusRaw = String(subscription?.status || '').toLowerCase();
                const canceledByFlags =
                    subscription?.cancel_at_next_billing_date === true ||
                    subscription?.cancel_at_period_end === true ||
                    !!subscription?.cancelled_at ||
                    !!subscription?.ended_at ||
                    !!subscription?.end_at;

                let mappedStatus: 'active' | 'cancelled' | 'payment_failed';
                if (canceledByFlags || statusRaw === 'cancelled' || statusRaw === 'canceled') {
                    mappedStatus = 'cancelled';
                } else if (
                    statusRaw === 'on_hold' ||
                    statusRaw === 'failed' ||
                    statusRaw === 'payment_failed' ||
                    statusRaw === 'past_due'
                ) {
                    mappedStatus = 'payment_failed';
                } else {
                    mappedStatus = 'active';
                }

                const subId = subscription?.subscription_id as string | undefined;
                const customerId = subscription?.customer?.customer_id || subscription?.customer?.id || subscription?.customer_id;
                const customerEmail = subscription?.customer?.email as string | undefined;
                const metadataUserId = subscription?.metadata?.userId as string | undefined;
                const nextBillingDate = subscription?.next_billing_date as string | undefined;

                let resolvedUserId: string | undefined = metadataUserId;
                if (!resolvedUserId && customerId) {
                    const byCustomerRes = await fetch(
                        `${supabaseUrl}/rest/v1/profiles?dodo_customer_id=eq.${encodeURIComponent(customerId)}&select=id&limit=1`,
                        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
                    );
                    if (byCustomerRes.ok) {
                        const rows = await byCustomerRes.json();
                        resolvedUserId = rows?.[0]?.id as string | undefined;
                    }
                }

                if (!resolvedUserId && customerEmail) {
                    const byEmailRes = await fetch(
                        `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(customerEmail)}&select=id&limit=1`,
                        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
                    );
                    if (byEmailRes.ok) {
                        const rows = await byEmailRes.json();
                        resolvedUserId = rows?.[0]?.id as string | undefined;
                    }
                }

                if (!resolvedUserId) {
                    unresolved++;
                    continue;
                }

                const result = await updateSubscriptionLogic(supabaseUrl, supabaseKey, {
                    userId: resolvedUserId,
                    userEmail: customerEmail,
                    status: mappedStatus,
                    dodoCustomerId: customerId,
                    subscriptionId: subId,
                    nextBillingDate,
                    billingCycle: subscription?.metadata?.billingCycle,
                    plan: 'Professional',
                    silent: true,
                    // Pass eventType so trial protection allows cancellations from reconciliation
                    eventType: mappedStatus === 'cancelled' ? 'subscription.cancelled' : 'subscription.updated'
                });

                if (result?.success) {
                    synced++;
                }
            }

            return { success: true, processed, synced, unresolved };
        } catch (error: any) {
            return { success: false, error: error?.message || 'reconcile failed' };
        }
    }
});

