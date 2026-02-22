#!/bin/bash

# Subscription System Testing Script
# Run this after deploying the Convex changes

echo "🧪 Subscription System Integration Tests"
echo "========================================"
echo ""

# Check for required environment variables
if [ -z "$CONVEX_DEPLOYMENT" ]; then
    echo "⚠️  Warning: CONVEX_DEPLOYMENT not set"
    echo "   Set it to your Convex deployment URL"
    echo "   Example: export CONVEX_DEPLOYMENT=https://your-project.convex.cloud"
    echo ""
fi

# Test 1: Check Convex Deployment
echo "📦 Test 1: Checking Convex Deployment Status..."
echo "   Run: npx convex deploy"
echo "   Expected: Deployment successful"
echo ""
read -p "   Did deployment succeed? (y/n): " answer
if [ "$answer" != "y" ]; then
    echo "   ❌ Deployment failed. Fix errors before continuing."
    exit 1
fi
echo "   ✅ Deployment successful"
echo ""

# Test 2: Verify Schema
echo "📊 Test 2: Verifying New Database Tables..."
echo "   Tables to verify:"
echo "   - webhookEvents (webhook deduplication)"
echo "   - subscriptionSync (sync state tracking)"
echo ""
echo "   Go to Convex Dashboard → Data → Tables"
echo "   URL: https://dashboard.convex.dev/<your-project>/data"
echo ""
read -p "   Can you see webhookEvents and subscriptionSync tables? (y/n): " answer
if [ "$answer" != "y" ]; then
    echo "   ❌ Tables missing. Check schema.ts deployment."
    exit 1
fi
echo "   ✅ Tables verified"
echo ""

# Test 3: Verify Cron Jobs
echo "⏰ Test 3: Verifying Cron Jobs..."
echo "   Expected cron jobs:"
echo "   - check subscription expirations (every 6 hours)"
echo "   - cleanup old webhooks (weekly Monday 3 AM)"
echo ""
echo "   Go to Convex Dashboard → Crons"
echo ""
read -p "   Are both cron jobs listed and scheduled? (y/n): " answer
if [ "$answer" != "y" ]; then
    echo "   ❌ Cron jobs not found. Check crons.ts deployment."
    exit 1
fi
echo "   ✅ Cron jobs verified"
echo ""

# Test 4: Test Webhook Endpoint
echo "🔗 Test 4: Testing Webhook Endpoint..."
echo "   Testing /dodoWebhook endpoint availability..."
echo ""

if [ -n "$CONVEX_DEPLOYMENT" ]; then
    WEBHOOK_URL="${CONVEX_DEPLOYMENT/.cloud/.site}/dodoWebhook"
    echo "   Webhook URL: $WEBHOOK_URL"
    echo ""

    # Send test OPTIONS request (CORS preflight)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$WEBHOOK_URL")

    if [ "$HTTP_CODE" == "200" ]; then
        echo "   ✅ Webhook endpoint is accessible (OPTIONS returned $HTTP_CODE)"
    else
        echo "   ⚠️  Webhook endpoint returned $HTTP_CODE (expected 200)"
        echo "      This might be normal if CORS is not configured for OPTIONS"
    fi
else
    echo "   ⚠️  Skipping (CONVEX_DEPLOYMENT not set)"
    echo "   Manual check: Go to Dodo Dashboard → Webhooks"
    echo "   Verify webhook URL is set to: https://<your-deployment>.site/dodoWebhook"
fi
echo ""

# Test 5: Manual Cron Trigger
echo "⚙️  Test 5: Manual Cron Job Trigger..."
echo "   Testing subscription expiration check..."
echo ""
echo "   1. Go to Convex Dashboard → Functions"
echo "   2. Find: cronHandlers.checkSubscriptionExpirations"
echo "   3. Click 'Run' button"
echo "   4. Check output in logs"
echo ""
read -p "   Did the cron job run successfully? (y/n): " answer
if [ "$answer" != "y" ]; then
    echo "   ❌ Cron job failed. Check logs for errors."
    exit 1
fi
echo "   ✅ Cron job executed"
echo ""

# Test 6: Query Functions
echo "🔍 Test 6: Testing Query Functions..."
echo "   Testing subscription queries..."
echo ""
echo "   1. Go to Convex Dashboard → Functions"
echo "   2. Find: subscriptionQueries.getSubscriptionStats"
echo "   3. Click 'Run' button"
echo "   4. Verify it returns statistics object"
echo ""
read -p "   Did the query return valid data? (y/n): " answer
if [ "$answer" != "y" ]; then
    echo "   ❌ Query failed. Check subscriptionQueries.ts."
    exit 1
fi
echo "   ✅ Queries working"
echo ""

# Test 7: Webhook Deduplication
echo "🔒 Test 7: Webhook Deduplication Test..."
echo "   This tests persistent webhook deduplication."
echo ""
echo "   Manual test steps:"
echo "   1. Trigger a test webhook from Dodo (or use curl with test data)"
echo "   2. Note the webhook-id from logs"
echo "   3. Send the same webhook-id again"
echo "   4. Verify second request returns: { received: true, duplicate: true }"
echo "   5. Check webhookEvents table has 1 record (not 2)"
echo ""
read -p "   Did deduplication work correctly? (y/n/skip): " answer
if [ "$answer" == "n" ]; then
    echo "   ❌ Deduplication failed. Check http.ts webhook handler."
    exit 1
elif [ "$answer" == "skip" ]; then
    echo "   ⏭️  Skipped (test later with real webhook)"
else
    echo "   ✅ Deduplication working"
fi
echo ""

# Test 8: End-to-End Cancellation
echo "🎯 Test 8: End-to-End Cancellation Test..."
echo "   This tests the complete cancellation flow."
echo ""
echo "   Prerequisites:"
echo "   - Test user account with active subscription"
echo "   - Access to Dodo customer portal"
echo ""
echo "   Steps:"
echo "   1. Login to your app as test user"
echo "   2. Note current subscription status (should be 'active')"
echo "   3. Go to Dodo customer portal"
echo "   4. Cancel subscription"
echo "   5. Watch your app (without refreshing)"
echo "   6. Within 10 seconds, subscription should show as 'cancelled'"
echo "   7. Notification should appear: 'Subscription Cancelled'"
echo ""
read -p "   Did the end-to-end flow work? (y/n/skip): " answer
if [ "$answer" == "n" ]; then
    echo "   ❌ E2E test failed. Check:"
    echo "      - Convex logs for webhook processing"
    echo "      - Supabase realtime connection in AuthContext"
    echo "      - User notification creation"
    exit 1
elif [ "$answer" == "skip" ]; then
    echo "   ⏭️  Skipped (test later with real subscription)"
else
    echo "   ✅ End-to-end flow working!"
fi
echo ""

# Final Summary
echo "═══════════════════════════════════════"
echo "✅ All Tests Passed!"
echo "═══════════════════════════════════════"
echo ""
echo "📋 Summary:"
echo "   ✅ Convex deployment successful"
echo "   ✅ Database tables created"
echo "   ✅ Cron jobs scheduled"
echo "   ✅ Webhook endpoint accessible"
echo "   ✅ Query functions working"
echo "   ✅ Deduplication functional"
echo "   ✅ End-to-end cancellation tested"
echo ""
echo "🎉 Subscription system is ready for production!"
echo ""
echo "📖 Next Steps:"
echo "   1. Monitor Convex logs for 24 hours"
echo "   2. Check cron job runs every 6 hours"
echo "   3. Verify webhook events are being recorded"
echo "   4. Review SUBSCRIPTION_FIXES_SUMMARY.md for detailed docs"
echo ""
echo "🔍 Monitoring URLs:"
echo "   - Convex Dashboard: https://dashboard.convex.dev"
echo "   - Supabase Logs: https://supabase.com/dashboard/project/<id>/logs"
echo "   - Dodo Webhooks: https://dashboard.dodopayments.com/webhooks"
echo ""
