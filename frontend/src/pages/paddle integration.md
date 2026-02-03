Paddle Payment Integration Plan
Goal
Integrate Paddle Billing as the primary global payment provider, replacing/augmenting the current Dodo Payments integration. Paddle handles global credit card and PayPal payments, subscription management, recurring billing, invoicing, and sales tax.

Current Payment Architecture
Provider	Region	Backend	Status
Dodo Payments	Global	Convex HTTP Actions	Active
PaySky	Egypt	Supabase Edge Functions	Active
Kashier	Egypt	Supabase Edge Functions	Active
Key Files:
Checkout.tsx
 - Plan selection & payment initiation
PaymentCallback.tsx
 - Payment result handling
Settings.tsx
 - Subscription management UI
kashier.ts
 - Reference payment library
User Review Required
IMPORTANT

Before implementation, please confirm:

Replace or Add? Should Paddle replace Dodo entirely, or should both be available?
Sandbox/Live Keys: Provide VITE_PADDLE_CLIENT_TOKEN and VITE_PADDLE_ENVIRONMENT (sandbox or production).
Product IDs: Provide Paddle Price IDs for pro-monthly and pro-yearly plans.
Webhook Secret: Provide the Paddle webhook secret for signature verification.
Proposed Changes
1. Frontend: New Paddle Library
[NEW] frontend/src/lib/paddle.ts
A new integration class modeled after 
kashier.ts
:

// Key responsibilities:
// 1. Initialize Paddle.js with client token
// 2. Open Paddle checkout overlay
// 3. Handle checkout events (success, cancel)
// 4. Store/retrieve payment metadata in localStorage
export class PaddleIntegration {
  private clientToken: string;
  private environment: 'sandbox' | 'production';
  
  async initialize(): Promise<void>;
  async openCheckout(params: PaddleCheckoutParams): Promise<void>;
  async updateUserProfile(userId: string, subscriptionId: string): Promise<void>;
}
export const paddleIntegration = new PaddleIntegration();
2. Frontend: Modify Checkout Page
[MODIFY] 
frontend/src/pages/Checkout.tsx
Add 'paddle' to selectedPaymentProvider state type
Add Paddle pricing config alongside Dodo
Add Paddle as a payment option button in the UI
Call paddleIntegration.openCheckout() when Paddle is selected
- const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'paysky' | 'kashier' | 'dodo'>('dodo');
+ const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'paysky' | 'kashier' | 'dodo' | 'paddle'>('paddle');
3. Frontend: Update Payment Callback
[MODIFY] 
frontend/src/pages/PaymentCallback.tsx
Handle provider=paddle query param
Poll/verify subscription status via Supabase profile check
Extract subscriptionId from URL params (Paddle's success redirect)
4. Frontend: Add Paddle.js Script
[MODIFY] 
frontend/index.html
Add Paddle.js script before closing </body> tag:

<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
5. Backend: Supabase Edge Function Webhook
[NEW] supabase/functions/paddle-webhook/index.ts
Handle Paddle webhook events:

subscription.created → Activate subscription
subscription.updated → Update subscription details
subscription.canceled → Deactivate subscription
// Key logic:
// 1. Verify HMAC-SHA256 signature from Paddle-Signature header
// 2. Parse event type and data
// 3. Update `profiles` table with:
//    - subscription_status
//    - subscription_plan
//    - subscription_end_date
//    - paddle_subscription_id (new column)
//    - paddle_customer_id (new column)
6. Database: Update Profiles Table
[MODIFY] Supabase profiles table
Add new columns for Paddle integration:

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;
7. Environment Variables
[MODIFY] 
frontend/.env
VITE_PADDLE_CLIENT_TOKEN=your_client_token_here
VITE_PADDLE_ENVIRONMENT=sandbox  # or production
VITE_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxx
VITE_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxx
Supabase Secrets (for webhook)
supabase secrets set PADDLE_WEBHOOK_SECRET=your_webhook_secret
Verification Plan
Automated Tests
# Build verification
npm run build
# Type checking
npx tsc --noEmit
Manual Verification
Sandbox Checkout Flow: Test full checkout using Paddle sandbox cards.
Webhook Event: Use Paddle dashboard to simulate subscription.created and verify profile update.
Subscription Portal: Verify "Manage Subscription" button in Settings opens Paddle customer portal.
Cancellation Flow: Cancel subscription, verify subscription.canceled webhook updates profile.
Implementation Order
 Add Paddle.js to 
index.html
 Create frontend/src/lib/paddle.ts
 Update 
Checkout.tsx
 with Paddle provider
 Update 
PaymentCallback.tsx
 for Paddle
 Add profile columns via SQL migration
 Create supabase/functions/paddle-webhook/
 Deploy webhook and configure in Paddle Dashboard
 Update Settings page for Paddle portal link
 End-to-end testing