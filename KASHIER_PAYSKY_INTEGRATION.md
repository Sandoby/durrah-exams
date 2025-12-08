# Kashier & PaySky Payment Integration Guide

## Overview
Durrah now supports **dual payment providers**: **PaySky** (existing) and **Kashier** (new), allowing users to choose their preferred payment method during checkout with **instant subscription activation**.

## Payment Providers Configuration

### PaySky (Existing)
- **API Base URL**: `https://cube.paysky.io:6006`
- **Credentials** (stored in environment):
  - `VITE_PAYSKY_MID`: Merchant ID (Node#)
  - `VITE_PAYSKY_TID`: Terminal ID
  - `VITE_PAYSKY_SECRET_KEY`: Secret key for secure hash generation
- **Payment Flow**: Real-time lightbox integration
- **File**: `frontend/src/lib/paysky.ts`

### Kashier (New)
- **API Base URL**: `https://api.kashier.io`
- **Credentials** (store securely):
  - `VITE_KASHIER_API_KEY`: `af01074c-fe16-4daf-a235-c36fea074d52`
  - `VITE_KASHIER_SECRET_KEY`: (keep secure on server)
  - `VITE_KASHIER_MERCHANT_ID`: Your merchant ID
- **Payment Flow**: Order creation → Redirect → Webhook callback
- **File**: `frontend/src/lib/kashier.ts`

## Implementation Details

### 1. Kashier Integration Class (`frontend/src/lib/kashier.ts`)

#### Key Methods:

**`initialize()`** - Load Kashier SDK
```typescript
await kashierIntegration.initialize();
```

**`pay(params)`** - Initiate payment
```typescript
const result = await kashierIntegration.pay({
  amount: 200,           // EGP amount
  planId: 'pro',
  userId: 'user-123',
  userEmail: 'user@example.com',
  billingCycle: 'monthly'
});
```

**Payment Flow**:
1. Create order on Kashier API
2. Store payment metadata in localStorage
3. Redirect user to Kashier payment page
4. User completes payment
5. Kashier redirects to `/payment-callback`
6. Callback verifies payment status
7. Subscription activated instantly
8. Redirect to `/dashboard`

**`updateUserProfile()`** - Activate subscription immediately
```typescript
await kashierIntegration.updateUserProfile(userId, planId, billingCycle);
```

Updates in `profiles` table:
- `subscription_plan`: Plan name
- `subscription_status`: 'active'
- `subscription_end_date`: Calculated expiry

### 2. Checkout Flow Updates (`frontend/src/pages/Checkout.tsx`)

#### New Features:
- **Payment Provider Selection**: Radio buttons to choose PaySky or Kashier
- **Conditional UI**: Only shows for paid plans (>0 EGP)
- **Instant Activation**: Free plans activate immediately
- **Coupon Integration**: Works with both providers

#### Code Example:
```tsx
const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'paysky' | 'kashier'>('paysky');

// In handlePayment:
if (selectedPaymentProvider === 'kashier') {
  result = await kashierIntegration.pay({ ... });
} else {
  result = await paySkyIntegration.pay({ ... });
}
```

### 3. Payment Callback Handler (`frontend/src/pages/PaymentCallback.tsx`)

**Purpose**: Handle Kashier redirect after payment

**Query Parameters**:
- `order_id`: Order ID from Kashier
- `status`: Payment status ('success', 'completed', etc.)

**Flow**:
1. Verify order with Kashier API
2. Check order status
3. If successful:
   - Update payment record
   - Activate subscription
   - Record coupon usage
   - Redirect to dashboard
4. If failed:
   - Show error message
   - Redirect to checkout

**Environment Variables for Kashier**:
```env
VITE_KASHIER_API_KEY=af01074c-fe16-4daf-a235-c36fea074d52
VITE_KASHIER_SECRET_KEY=your_secret_key
VITE_KASHIER_MERCHANT_ID=your_merchant_id
```

## Instant Subscription Activation

### For Free Plans
✅ Instant activation in checkout
- No payment processing
- Direct database update
- Toast notification
- Immediate redirect to dashboard

### For Paid Plans (PaySky)
✅ Instant activation on payment success
- Update `profiles` table immediately after payment
- Toast notification: "Subscription activated instantly!"
- Redirect to dashboard
- No manual approval needed

### For Paid Plans (Kashier)
✅ Instant activation via webhook callback
- After user redirects from Kashier payment page
- PaymentCallback verifies order status
- Calls `updateUserProfile()` immediately
- Toast notification + redirect to dashboard

## Database Changes

### payments table
Columns for tracking payments:
```sql
- plan: VARCHAR (plan ID)
- amount: DECIMAL (payment amount in EGP)
- currency: VARCHAR (always 'EGP')
- merchant_reference: VARCHAR (order/transaction ID)
- status: VARCHAR ('pending', 'completed', 'failed', 'cancelled')
- payment_method: VARCHAR ('paysky', 'kashier')
- user_email: VARCHAR
- kashier_response: JSONB (webhook payload)
- paysky_response: JSONB (payment data)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### profiles table
Updated fields:
```sql
- subscription_plan: VARCHAR (plan name)
- subscription_status: VARCHAR ('active', 'inactive')
- subscription_end_date: TIMESTAMP (expiry date)
```

## Webhook Handling

### Kashier Webhook
**Endpoint**: `/api/webhook/kashier` (backend implementation required)

**Payload**:
```json
{
  "order_id": "DURRAH_user123_1701234567",
  "status": "completed",
  "amount": 20000,
  "currency": "EGP",
  "transaction_id": "kashier_txn_123",
  "timestamp": "2024-12-08T10:30:00Z"
}
```

**Backend Implementation** (Node.js/Express example):
```typescript
app.post('/api/webhook/kashier', async (req, res) => {
  const { order_id, status, amount } = req.body;
  
  // Verify signature
  const isValid = kashierIntegration.verifyWebhookSignature(req.body, req.headers['x-signature']);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Update payment status
  if (status === 'completed') {
    // Update Supabase payment record
    // Activate subscription if not already active
  }
  
  res.json({ success: true });
});
```

## Environment Setup

### 1. Add to `.env.local` (Development)
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# PaySky
VITE_PAYSKY_MID=10527302281
VITE_PAYSKY_TID=14261833
VITE_PAYSKY_SECRET_KEY=7e68...

# Kashier
VITE_KASHIER_API_KEY=af01...
VITE_KASHIER_SECRET_KEY=your_secret
VITE_KASHIER_MERCHANT_ID=your_id
```

### 2. Update Production Env (Vercel/Netlify)
```
Settings → Environment Variables → Add all VITE_* keys
```

## Testing Payment Flow

### Test Kashier Payment
1. Go to `/checkout`
2. Select plan and billing cycle
3. Choose "Kashier" as payment method
4. Click "Proceed"
5. You'll be redirected to Kashier payment page
6. Use test card credentials
7. After payment, redirected to `/payment-callback`
8. Verify subscription activation in dashboard

### Test PaySky Payment
1. Go to `/checkout`
2. Select plan
3. Choose "PaySky" (default)
4. Click "Proceed"
5. PaySky lightbox appears
6. Complete payment
7. Instant redirect to dashboard

## Coupon Integration

Both payment providers fully support coupons:
- Applied before payment provider selection
- Works with both PaySky and Kashier
- Discount applied to final amount
- Coupon usage recorded after payment success

## Security Considerations

### API Keys
- Store **VITE_KASHIER_API_KEY** in environment (public, safe for client)
- **VITE_KASHIER_SECRET_KEY** should be server-only (don't expose)
- PaySky MID/TID can be in environment (merchant IDs are public)
- Secret keys never in client code

### Payment Verification
- Always verify webhook signatures on backend
- Never trust order status from URL parameters alone
- Verify with Kashier API before activating subscription
- Rate limit webhook endpoints

### Data Protection
- Use HTTPS only for payment flows
- Don't log sensitive payment data
- Encrypt subscription tokens
- Implement proper RLS on payment records

## Files Modified

```
frontend/src/
├── lib/
│   ├── kashier.ts (NEW)          - Kashier integration class
│   └── paysky.ts (UPDATED)       - No changes needed
├── pages/
│   ├── Checkout.tsx (UPDATED)    - Added payment provider selection
│   └── PaymentCallback.tsx (NEW) - Kashier webhook handler
├── App.tsx (UPDATED)             - Added /payment-callback route
└── .env.example (UPDATED)        - Added Kashier environment vars
```

## Rollback Plan

If issues occur with Kashier:
1. Remove `selectedPaymentProvider` state
2. Remove payment provider selection UI
3. Keep both integrations active
4. Default to PaySky only
5. Kashier automatically disabled

## Next Steps

1. ✅ Kashier integration complete
2. ⏳ Add server-side webhook handler for payment verification
3. ⏳ Implement rate limiting on webhooks
4. ⏳ Add payment history/receipts
5. ⏳ Implement refund handling

## Support

For issues or questions:
- Check Kashier docs: https://kashier.io/docs
- Check PaySky docs: https://paysky.io/docs
- Review payment records in Supabase
- Check browser console for errors
