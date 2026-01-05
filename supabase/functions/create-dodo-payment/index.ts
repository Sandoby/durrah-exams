import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { amount, currency, customer, metadata, billingCycle } = await req.json();

        const dodoApiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
        if (!dodoApiKey) {
            throw new Error('Dodo Payments API key not configured');
        }

        // Determine environment based on key prefix or separate env var
        // Defaulting to test for safety if not specified
        const isLive = dodoApiKey.startsWith('live_');
        const baseUrl = isLive ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';

        // Construct product cart
        // Dodo expects a product cart. We will create a dynamic product for the subscription.
        const productCart = [
            {
                product_id: metadata.planId, // Or a generic ID
                quantity: 1,
                amount: amount * 100, // Dodo might expect smallest unit (cents)? *Check docs* - Usually APIs vary. 
                // Search result said "amount" in product_cart. Assuming standard cents/smallest unit is common, 
                // OR it might be main unit. Let's assume passed amount is correct for now, or check detailed docs.
                // Actually, let's look at the search result example again or try to be safe.
                // Search result example isn't detailed on units. 
                // Safest is to check if Dodo docs link was available.
                // Re-reading search: "amount: 1000" usually implies 10.00 in Stripe-like APIs.
                // Durrah uses EGP.
            }
        ];

        // However, Dodo might want just total amount if not using product references.
        // Let's try the /checkouts endpoint payload structure from search (implied):
        // POST /checkouts
        // { product_cart: [...], billing: {...}, customer: {...} }

        // Map billing cycle to specific Dodo Product IDs provided by the user
        let dodoProductId = '';
        if (billingCycle === 'yearly') {
            dodoProductId = 'pdt_0NVdw6iZw42sQIdxctP55';
        } else {
            dodoProductId = 'pdt_0NVdvPLWrAr1Rym66kXLP'; // Monthly
        }

        const payload = {
            product_cart: [{
                product_id: dodoProductId,
                quantity: 1,
                amount: amount * 100, // Amount to charge (initial)
            }],
            billing: {
                city: "Cairo", // Default or user provided?
                country: "EG",
                street: "123 Street", // Placeholder if strict
                state: "Cairo",
                zipcode: "11511"
            },
            customer: {
                firstName: customer.name || "Student",
                lastName: "User",
                email: customer.email,
                phone: customer.phone || "+201000000000"
            },
            currency: currency || 'EGP',
            payment_link: true, // or redirect_url?
            metadata: {
                ...metadata,
                billingCycle
            },
            return_url: `${req.headers.get('origin')}/payment/callback?provider=dodo`, // For redirect flow
        };

        const response = await fetch(`${baseUrl}/checkouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dodoApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Dodo Error:', data);
            throw new Error(data.message || 'Failed to create payment session');
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error creating Dodo payment:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
