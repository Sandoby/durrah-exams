#!/bin/bash

# Dodo Webhook Testing & Debugging Tool
# Use this to test and debug webhook processing

echo "🔍 Dodo Webhook Debugging Tool"
echo "======================================"
echo ""

# Configuration
CONVEX_URL="${CONVEX_DEPLOYMENT:-}"
WEBHOOK_URL=""

if [ -n "$CONVEX_URL" ]; then
    WEBHOOK_URL="${CONVEX_URL/.cloud/.site}/dodoWebhook"
    echo "📍 Webhook URL: $WEBHOOK_URL"
else
    echo "⚠️  CONVEX_DEPLOYMENT not set"
    read -p "Enter your Convex webhook URL (https://...site/dodoWebhook): " WEBHOOK_URL
fi

echo ""
echo "Select a test scenario:"
echo "1) Test subscription.cancelled event"
echo "2) Test subscription.expired event"
echo "3) Test subscription.active event"
echo "4) Test subscription.payment_failed event"
echo "5) Check Convex logs for recent webhooks"
echo "6) Verify Dodo webhook configuration"
echo "7) Test user resolution (check if user can be found)"
echo ""
read -p "Choose option (1-7): " option

case $option in
    1)
        echo ""
        echo "🧪 Testing: subscription.cancelled"
        echo "-----------------------------------"
        read -p "Enter test user email: " USER_EMAIL
        read -p "Enter test user ID (Supabase UUID): " USER_ID
        read -p "Enter dodo_customer_id (or press Enter to skip): " DODO_CUSTOMER_ID

        PAYLOAD=$(cat <<EOF
{
  "type": "subscription.cancelled",
  "data": {
    "subscription_id": "sub_test_cancelled_$(date +%s)",
    "customer_id": "${DODO_CUSTOMER_ID:-cus_test_123}",
    "customer": {
      "email": "${USER_EMAIL}",
      "id": "${DODO_CUSTOMER_ID:-cus_test_123}"
    },
    "status": "cancelled",
    "metadata": {
      "userId": "${USER_ID}",
      "billingCycle": "monthly",
      "planId": "pro"
    }
  }
}
EOF
)

        echo ""
        echo "📤 Sending test webhook..."
        echo "Payload:"
        echo "$PAYLOAD" | jq '.'
        echo ""

        # Note: We can't generate a valid signature without the webhook secret
        # So this will fail signature verification if secret is configured
        echo "⚠️  Note: This test will fail signature verification"
        echo "    To test with valid signature, use Dodo Dashboard → Webhooks → Send Test Event"
        echo ""

        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -H "webhook-id: test_webhook_$(date +%s)" \
            -H "webhook-timestamp: $(date +%s)" \
            -d "$PAYLOAD")

        HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

        echo "Response Code: $HTTP_CODE"
        echo "Response Body:"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

        if [ "$HTTP_CODE" == "401" ]; then
            echo ""
            echo "❌ Signature verification failed (expected for test without secret)"
            echo "   To test properly, disable signature check temporarily or use Dodo dashboard"
        elif [ "$HTTP_CODE" == "200" ]; then
            echo ""
            echo "✅ Webhook processed successfully!"
            echo "   Check Convex logs for detailed processing"
        fi
        ;;

    5)
        echo ""
        echo "📋 Checking Convex Logs..."
        echo "-----------------------------------"
        echo ""
        echo "Go to: https://dashboard.convex.dev/<your-project>/logs"
        echo ""
        echo "Search for:"
        echo "  - '[Webhook] Processing cancellation event'"
        echo "  - '[DB] 🔴 DEACTIVATION REQUEST'"
        echo "  - '[DB] ✅ Direct profile update successful'"
        echo "  - '[AUTH] Successfully identified user via email'"
        echo ""
        echo "Common issues to look for:"
        echo "  1. 'Invalid Dodo webhook signature' → Check DODO_WEBHOOK_SECRET"
        echo "  2. 'COULD NOT IDENTIFY USER' → User resolution failed"
        echo "  3. 'Direct profile update failed' → Database permissions issue"
        echo "  4. No logs at all → Webhook not reaching server"
        ;;

    6)
        echo ""
        echo "🔧 Verifying Dodo Webhook Configuration..."
        echo "-----------------------------------"
        echo ""
        echo "1. Go to: https://dashboard.dodopayments.com/webhooks"
        echo ""
        echo "2. Verify webhook endpoint:"
        echo "   URL should be: $WEBHOOK_URL"
        echo ""
        echo "3. Verify subscribed events include:"
        echo "   ☐ subscription.active"
        echo "   ☐ subscription.cancelled"
        echo "   ☐ subscription.expired"
        echo "   ☐ subscription.failed"
        echo "   ☐ subscription.payment_failed"
        echo "   ☐ payment.succeeded"
        echo ""
        echo "4. Copy the Webhook Secret and add to Convex:"
        echo "   • Go to: Convex Dashboard → Settings → Environment Variables"
        echo "   • Add: DODO_WEBHOOK_SECRET=whsec_..."
        echo ""
        read -p "Press Enter when done..."
        ;;

    7)
        echo ""
        echo "🔎 Testing User Resolution..."
        echo "-----------------------------------"
        read -p "Enter user email to test: " TEST_EMAIL

        echo ""
        echo "Checking if user exists in Supabase..."
        echo "Run this SQL query in Supabase SQL Editor:"
        echo ""
        echo "SELECT id, email, subscription_status, dodo_customer_id"
        echo "FROM profiles"
        echo "WHERE email = '$TEST_EMAIL';"
        echo ""
        read -p "Copy the user ID from the result and press Enter..."
        read -p "User ID: " FOUND_USER_ID

        if [ -n "$FOUND_USER_ID" ]; then
            echo ""
            echo "✅ User found: $FOUND_USER_ID"
            echo ""
            echo "Now checking dodo_customer_id..."
            echo "Run this query:"
            echo ""
            echo "SELECT dodo_customer_id FROM profiles WHERE id = '$FOUND_USER_ID';"
            echo ""
            read -p "Does the user have a dodo_customer_id? (y/n): " HAS_DODO_ID

            if [ "$HAS_DODO_ID" == "n" ]; then
                echo ""
                echo "⚠️  User doesn't have dodo_customer_id set"
                echo "   This means webhook must have userId in metadata or use email fallback"
                echo ""
                echo "Recommendation:"
                echo "1. Ensure checkouts include metadata.userId"
                echo "2. Or link dodo_customer_id manually:"
                echo "   UPDATE profiles SET dodo_customer_id = 'cus_...' WHERE id = '$FOUND_USER_ID';"
            else
                echo ""
                echo "✅ User has dodo_customer_id - webhook should work!"
            fi
        else
            echo ""
            echo "❌ User not found in database"
            echo "   Webhook cannot deactivate non-existent users"
        fi
        ;;

    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "🔍 Additional Debugging Steps"
echo "======================================"
echo ""
echo "1. Check Convex Deployment:"
echo "   npx convex deploy"
echo ""
echo "2. Check Environment Variables:"
echo "   Convex Dashboard → Settings → Environment Variables"
echo "   Required: DODO_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Check Database Permissions:"
echo "   Supabase → Authentication → Policies"
echo "   Service role should have full access to profiles table"
echo ""
echo "4. Test Real Cancellation:"
echo "   a. Create test subscription in Dodo"
echo "   b. Note the user email and Supabase user ID"
echo "   c. Cancel subscription in Dodo customer portal"
echo "   d. Within 10 seconds, check:"
echo "      - Convex logs for webhook processing"
echo "      - Supabase profiles table for status change"
echo "      - Frontend for real-time update"
echo ""
echo "5. Manual Status Update (Emergency):"
echo "   If webhook fails, update manually:"
echo "   UPDATE profiles SET subscription_status = 'cancelled' WHERE email = 'user@example.com';"
echo ""
