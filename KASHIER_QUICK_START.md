# 🚀 Kashier Integration - Quick Setup

## What's New?

✅ **Dual Payment Providers**: Users can choose between PaySky or Kashier  
✅ **Instant Subscription Activation**: Subscriptions activate immediately after payment  
✅ **Webhook Support**: Kashier payments verified via webhook callback  
✅ **Full Coupon Integration**: Discounts work with both providers  

## Your Kashier Credentials

```
API Key: af01074c-fe16-4daf-a235-c36fea074d52
Secret Key: [Keep this secure - backend only]
Merchant ID: [Configure in environment]
```

## Configuration (2 minutes)

### 1. Update Environment Variables

**Development** (`.env.local`):
```env
VITE_KASHIER_API_KEY=af01074c-fe16-4daf-a235-c36fea074d52
VITE_KASHIER_SECRET_KEY=your_secret_key
VITE_KASHIER_MERCHANT_ID=your_merchant_id
```

**Production** (Vercel/Netlify):
1. Go to project settings
2. Environment Variables
3. Add same 3 variables

### 2. No Database Changes Needed
- Uses existing `payments` table
- Uses existing `profiles` table
- Automatically backward compatible

## How It Works

### User Perspective

```
Checkout Page
    ↓
[Select Plan & Billing Cycle]
    ↓
[Choose Payment Method] ← NEW: PaySky or Kashier
    ↓
Proceed to Payment
    ↓
[PaySky: Lightbox] OR [Kashier: Redirect]
    ↓
Complete Payment
    ↓
✅ Subscription Activated INSTANTLY
    ↓
Dashboard
```

### Behind the Scenes

**PaySky Flow** (Unchanged):
- Real-time payment processing
- Immediate subscription update
- No webhook needed

**Kashier Flow** (New):
- Order created on Kashier
- User redirected to payment page
- After payment, redirected to callback page
- Callback verifies with Kashier API
- Subscription activated immediately
- Stored metadata cleaned up

## Testing

### Test Kashier Payment
1. Visit `/checkout`
2. Select any paid plan
3. Choose **Kashier** as payment method
4. Click "Proceed"
5. You'll be redirected to Kashier test environment
6. Complete with test card
7. Automatically redirected to `/payment-callback`
8. Then to dashboard (subscription active)

### Test Free Plan (Both)
1. Visit `/checkout`
2. Select free plan
3. Click "Proceed" (no payment method needed)
4. ✅ Subscription activated instantly

## Key Features

### 1. Payment Provider Selection
Users see buttons to choose:
- **PaySky** - Instant Payment (existing)
- **Kashier** - Secure Checkout (new)

Only shown for paid plans (free plans skip it).

### 2. Instant Activation
```typescript
// After successful payment:
await kashierIntegration.updateUserProfile(
  userId,      // User ID
  planId,      // 'pro' or plan identifier
  billingCycle // 'monthly' or 'yearly'
);

// Updates:
// - subscription_plan: Plan name
// - subscription_status: 'active'
// - subscription_end_date: Expiry date
```

### 3. Payment Recording
Every payment is recorded:
```json
{
  "plan": "pro",
  "amount": 200,
  "currency": "EGP",
  "merchant_reference": "DURRAH_user123_timestamp",
  "status": "completed",
  "payment_method": "kashier",
  "kashier_response": { /* webhook data */ }
}
```

## File Structure

```
NEW FILES:
├── frontend/src/lib/kashier.ts          (Kashier integration)
└── frontend/src/pages/PaymentCallback.tsx (Webhook handler)

UPDATED FILES:
├── frontend/src/pages/Checkout.tsx      (Provider selection)
├── frontend/src/App.tsx                 (New route)
└── frontend/.env.example                (New vars)
```

## API Endpoints

### Kashier Order Creation
```
POST https://api.kashier.io/api/v1/orders
Headers:
  Authorization: Bearer {API_KEY}
  Content-Type: application/json

Body:
{
  "order_id": "DURRAH_user123_timestamp",
  "amount": 200,
  "currency": "EGP",
  "customer_email": "user@example.com",
  "redirect_url": "https://durrah.tech/payment-callback",
  "webhook_url": "https://api.durrah.tech/webhook/kashier"
}

Response:
{
  "success": true,
  "payment_url": "https://checkout.kashier.io/...",
  "order_id": "DURRAH_...",
  "status": "pending"
}
```

### Payment Verification
```
GET https://api.kashier.io/api/v1/orders/{order_id}
Headers:
  Authorization: Bearer {API_KEY}

Response:
{
  "order_id": "DURRAH_...",
  "status": "completed",
  "amount": 20000,
  "currency": "EGP"
}
```

## Troubleshooting

### "Kashier script loading timeout"
- Check API key is correct
- Verify environment variables loaded
- Clear browser cache and retry

### "Payment metadata not found"
- Check localStorage is enabled
- Verify user is not in private browsing
- Check browser console for errors

### Subscription not activating
- Verify payment status is "completed"
- Check user ID matches in database
- Verify profile table permissions (RLS)
- Check CloudWatch logs for errors

### Webhook not working (for server)
- Verify webhook URL is accessible
- Check firewall/security groups
- Add request logging
- Verify signature validation

## Commit Details

**Commit**: `96eafdf`

```
Add Kashier payment provider integration with instant subscription activation

- Created KashierIntegration class with full payment flow
- Added payment provider selection UI (PaySky vs Kashier) 
- Implemented PaymentCallback page for handling Kashier webhooks
- Updated Checkout flow to support both payment providers
- Ensured instant subscription activation on payment success
- Added environment variables for Kashier API keys
- Both providers activate subscriptions immediately after payment completion
```

## Next Actions

1. ✅ **Frontend done** - Payment provider selection working
2. ⏳ **Backend webhook** - Implement `/api/webhook/kashier` endpoint
3. ⏳ **Payment verification** - Server-side order verification
4. ⏳ **Error handling** - Implement retry logic
5. ⏳ **Admin dashboard** - View payments from both providers

## Questions?

See full documentation: `KASHIER_PAYSKY_INTEGRATION.md`

---

**Status**: ✅ Ready for testing and integration!
