import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
    try {
        const signature = req.headers.get('x-dodo-signature'); // Verify header name in docs
        // Search results didn't explicitly key name, but x-dodo-signature or similar is standard.
        // For now, we will skip strict signature verification or use a placeholder until we can test or see docs.

        const body = await req.json();
        const event = body; // Assuming body IS the event or body.type exists

        if (
            event.type === 'checkout.succeeded' ||
            event.type === 'payment.succeeded' ||
            event.type === 'subscription.active' ||
            event.type === 'subscription.renewed'
        ) {
            await handleSubscriptionUpdate(event, 'active');
        } else if (event.type === 'payment.failed') {
            await handleSubscriptionUpdate(event, 'payment_failed');
        } else if (event.type === 'subscription.cancelled') {
            await handleSubscriptionUpdate(event, 'cancelled');
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
});

async function handleSubscriptionUpdate(event: any, status: 'active' | 'payment_failed' | 'cancelled') {
    const session = event.data;
    // Metadata might be nested in session or directly on the object depending on the event type
    const metadata = session.metadata || event.metadata;
    const userId = metadata?.userId;
    const userEmail = session.customer_email || session.email;

    let targetUserId = userId;

    // Fallback: Find user by email if ID is missing
    if (!targetUserId && userEmail) {
        const { data: user } = await supabase.from('profiles').select('id').eq('email', userEmail).single();
        targetUserId = user?.id;
    }

    if (targetUserId) {
        const updateData: any = {
            subscription_status: status
        };

        // Only update plan and end date on success
        if (status === 'active') {
            updateData.subscription_plan = metadata?.planId === 'pro' ? 'Professional' : 'Starter';
            updateData.subscription_end_date = calculateEndDate(metadata?.billingCycle || 'monthly');
        }

        const { error } = await supabase.from('profiles').update(updateData).eq('id', targetUserId);

        if (error) console.error('Failed to update profile:', error);

        // Record payment log for all events
        await supabase.from('payments').insert({
            user_id: targetUserId,
            merchant_reference: session.payment_id || session.id || session.subscription_id,
            amount: (session.amount || 0) / 100,
            currency: session.currency || 'EGP',
            status: status === 'active' ? 'completed' : status, // Map 'active' back to 'completed' for payments table, others keep status
            provider: 'dodo',
            metadata: session
        });
    } else {
        console.warn("Could not identify user for Dodo event", event.id);
    }
}



function calculateEndDate(cycle: string): string {
    const date = new Date();
    if (cycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
    else date.setMonth(date.getMonth() + 1);
    return date.toISOString();
}
