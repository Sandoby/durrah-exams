import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Core Dodo Payments logic for Convex.
 * These internal actions handle interactions with Supabase and Dodo APIs.
 */

// ============================================
// INTERNAL: Update user subscription in Supabase
// ============================================
export const updateSubscription = internalAction({
    args: {
        userId: v.optional(v.string()), // Optional because we might need to look up by email
        userEmail: v.optional(v.string()),
        status: v.string(), // active, payment_failed, cancelled
        plan: v.optional(v.string()),
        dodoCustomerId: v.optional(v.string()),
        subscriptionId: v.optional(v.string()),
        nextBillingDate: v.optional(v.string()),
        billingCycle: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase environment variables');
            return { success: false, error: 'Internal configuration error' };
        }

        // Calculate subscription end date based on next billing or cycle if provided
        let endDate = args.nextBillingDate;
        if (!endDate && args.billingCycle) {
            const now = new Date();
            if (args.billingCycle === 'yearly') {
                now.setFullYear(now.getFullYear() + 1);
            } else {
                now.setMonth(now.getMonth() + 1);
            }
            endDate = now.toISOString();
        }

        // Build update payload for Supabase profiles table
        const updateData: Record<string, any> = {
            subscription_status: args.status,
        };

        if (args.plan) updateData.subscription_plan = args.plan;
        if (args.dodoCustomerId) updateData.dodo_customer_id = args.dodoCustomerId;
        if (endDate) updateData.subscription_end_date = endDate;

        // Identity verification/lookup
        let userId = args.userId;

        // If no userId, try to lookup by email
        if (!userId && args.userEmail) {
            console.log(`Looking up user by email: ${args.userEmail}`);
            const lookupRes = await fetch(
                `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(args.userEmail)}&select=id`,
                {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                }
            );

            if (lookupRes.ok) {
                const users = await lookupRes.json();
                if (users?.[0]?.id) {
                    userId = users[0].id;
                    console.log(`Found user ID: ${userId}`);
                }
            }
        }

        if (!userId) {
            console.error('COULD NOT IDENTIFY USER for Dodo event:', { email: args.userEmail, subId: args.subscriptionId });
            return { success: false, error: 'User not identified' };
        }

        console.log(`Updating Supabase profile for user ${userId} to status ${args.status}`);

        // Update Supabase profile
        const res = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData)
            }
        );

        if (!res.ok) {
            const errTxt = await res.text();
            console.error(`Failed to update Supabase profile: ${res.status} ${errTxt}`);
            return { success: false, error: 'Database update failed' };
        }

        return { success: true, userId };
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

        const res = await fetch(`${baseUrl}/subscriptions`, {
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
            throw new Error(data.message || 'Failed to create subscription checkout');
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

        console.log(`Creating portal session for Dodo customer: ${args.dodoCustomerId}`);

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
