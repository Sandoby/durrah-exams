# Dodo Inline Checkout - Debugging Guide

## 🔍 Issue: Loading Forever, Checkout Not Appearing

This guide will help identify why the Dodo inline checkout is showing a loading state but never displaying the payment form.

---

## 📝 What Was Added

I've added comprehensive console logging throughout the entire checkout flow to identify exactly where the process is failing.

### Files Modified:

1. **`frontend/src/pages/Checkout.tsx`**
   - Added detailed logging to Dodo payment handler (lines 306-368)
   - Added state change tracking (lines 47-54)
   - Enhanced error logging in catch block (lines 402-404)

2. **`frontend/src/components/checkout/DodoInlineCheckout.tsx`**
   - Added component render logging (lines 25-30)
   - Added mount/unmount lifecycle logging (lines 32-47)
   - Added checkoutUrl tracking (lines 50-54)

---

## 🧪 How to Test and Diagnose

### Step 1: Open Browser Console

1. Start your dev server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open `http://localhost:5173/checkout` in your browser

3. Open Developer Tools (F12) and go to Console tab

4. Clear the console to start fresh

### Step 2: Initiate Checkout

1. Select the "Pro" plan
2. Keep "Dodo Payments" selected
3. Click "Continue to Payment"
4. Watch the console logs carefully

### Step 3: Analyze Console Output

You should see logs in this sequence:

```
[Checkout] Inline checkout state changed: {...}
[Checkout] Starting Dodo payment flow
[Checkout] Convex URL: https://...
[Checkout] Site URL: https://...
[Checkout] Getting Supabase session...
[Checkout] Access token obtained: Yes
[Checkout] Request body: {...}
[Checkout] Making API call to create Dodo session...
[Checkout] Response status: 200
[Checkout] Response ok: true
[Checkout] Response data: {...}
[Checkout] Got checkout URL: https://checkout.dodopayments.com/session/cks_...
[Checkout] Setting inline checkout to true
[Checkout] State updated - inline checkout should now show
[Checkout] Inline checkout state changed: {showInlineCheckout: true, ...}
[DodoInlineCheckout] Component rendered with props: {...}
[DodoInlineCheckout] Mounting component
[DodoInlineCheckout] Checkout URL received: https://...
[Dodo SDK] Initializing with mode: test
✅ Dodo SDK initialized successfully
[Dodo Checkout] Opening inline checkout
✅ Checkout opened successfully
[Dodo Checkout Event] checkout.opened
[Dodo Checkout Event] checkout.form_ready
✅ Checkout form ready for user input
```

---

## 🚨 Possible Issues and Solutions

### Issue 1: API Call Fails Early

**Symptoms:**
```
[Checkout] Starting Dodo payment flow
[Checkout] Convex URL: undefined
❌ Payment system configuration missing
```

**Solution:**
- Check your `.env.local` file has `VITE_CONVEX_URL` set
- Restart dev server after adding environment variable

---

### Issue 2: No Access Token

**Symptoms:**
```
[Checkout] Access token obtained: No
❌ Please login again to continue
```

**Solution:**
- Logout and login again
- Check Supabase session hasn't expired
- Verify Supabase configuration is correct

---

### Issue 3: API Returns Error

**Symptoms:**
```
[Checkout] Response status: 400
[Checkout] Response ok: false
[Checkout] Response data: {error: "..."}
```

**Solution:**
- Check the error message in response data
- Verify backend Convex function `/createDodoPayment` is deployed
- Check backend has correct Dodo API key
- Verify product IDs are correct:
  - Monthly: `pdt_0NVdvPLWrAr1Rym66kXLP`
  - Yearly: `pdt_0NVdw6iZw42sQIdxctP55`

---

### Issue 4: No checkout_url in Response

**Symptoms:**
```
[Checkout] Response data: {success: true, session_id: "...", checkout_url: undefined}
```

**Solution:**
- This means the backend created a session but didn't return the URL
- Check backend `/createDodoPayment` function returns `checkout_url`
- Verify Dodo API is returning the URL in their response

---

### Issue 5: State Not Updating

**Symptoms:**
```
[Checkout] Setting inline checkout to true
[Checkout] State updated - inline checkout should now show
(No further logs - component doesn't render)
```

**Solution:**
- React state update issue
- Check for any console errors
- Verify `DodoInlineCheckout` component is imported correctly

---

### Issue 6: SDK Initialization Fails

**Symptoms:**
```
[Dodo SDK] Initializing with mode: test
❌ Failed to initialize Dodo SDK: ...
```

**Solution:**
- Check `dodopayments-checkout` package is installed:
  ```bash
  npm install dodopayments-checkout
  ```
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

### Issue 7: Checkout URL Not Opening

**Symptoms:**
```
[DodoInlineCheckout] Checkout URL received: https://...
[Dodo Checkout] Opening inline checkout
❌ Failed to open checkout: ...
```

**Solution:**
- Check the checkout URL is valid
- Verify the element ID exists: `dodo-inline-checkout-frame`
- Check for iframe blocking or CSP issues

---

## 📊 Full Diagnostic Checklist

When you run the test, provide me with:

1. **All console logs** from clicking "Continue to Payment" onwards
2. **Network tab** showing the `/createDodoPayment` request and response
3. **Any error messages** in red in the console
4. **Screenshot** of what you see (loading state, error, etc.)
5. **Environment variables** (hide sensitive values):
   ```
   VITE_CONVEX_URL=https://...cloud (Yes/No)
   VITE_DODO_MODE=test (or live)
   ```

---

## 🎯 Expected Success Flow

When working correctly, you should see:

1. Click "Continue to Payment"
2. Loading spinner for 1-2 seconds
3. Dodo checkout iframe appears with payment form
4. Form shows:
   - Email field
   - Country selector
   - ZIP code field
   - Payment method buttons (Card, PayPal, Apple Pay, etc.)
5. Real-time tax calculation as you enter address
6. "Pay" button at bottom

---

## 🔧 Quick Fixes to Try

### Fix 1: Environment Variables
```bash
# In frontend/.env.local
VITE_CONVEX_URL=https://your-convex-url.cloud
VITE_DODO_MODE=test
```

### Fix 2: Reinstall Dependencies
```bash
cd frontend
npm install dodopayments-checkout
```

### Fix 3: Clear Cache
```bash
# Clear browser cache and localStorage
# Then hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
```

### Fix 4: Check Backend
```bash
# Verify Convex deployment
npx convex deploy
```

---

## 📞 What to Report Back

Please provide:

1. **First log that appears** after clicking "Continue to Payment"
2. **Last log that appears** before it gets stuck
3. **Any ERROR logs** (marked with ❌ or in red)
4. **Response data** from `[Checkout] Response data: {...}`
5. **State values** from `[Checkout] Inline checkout state changed: {...}`

This will help me identify the exact point where the flow is breaking.

---

*Updated: Now with comprehensive debugging logs*
*Status: Ready for testing*
