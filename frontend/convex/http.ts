import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * HTTP Routes for Convex
 * 
 * These endpoints can be called from external services like Supabase Edge Functions
 * or directly from the frontend for payment processing.
 */

const http = httpRouter();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
};

// Constant-time comparison for signatures
function timingSafeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

// Verify Dodo webhook signature (HMAC-SHA256 over "webhookId.webhookTimestamp.rawBody")
async function verifyDodoSignature(
  secretRaw: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  rawBody: string,
  headerSignature: string | null
) {
  if (!secretRaw || !webhookId || !webhookTimestamp || !headerSignature) return false;

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const message = new TextEncoder().encode(signedContent);

  // Parse signature header variants:
  // - "v1,<sig>"
  // - "t=<ts>,v1=<sig>"
  // - "<sig>"
  const tokens = headerSignature
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const expectedSignatures = new Set<string>();
  for (const token of tokens) {
    if (token.startsWith('v1=')) {
      expectedSignatures.add(token.slice(3));
    } else if (token.startsWith('v1,')) {
      expectedSignatures.add(token.slice(3));
    } else if (!token.startsWith('t=')) {
      expectedSignatures.add(token);
    }
  }
  if (expectedSignatures.size === 0) return false;

  const secretNoPrefix = secretRaw.replace(/^\s*whsec_/, '').trim();
  const candidateKeys: Uint8Array[] = [];

  // Candidate key 1: base64-decoded secret (common Dodo format).
  try {
    const decoded = Buffer.from(secretNoPrefix, 'base64');
    if (decoded.length > 0) {
      candidateKeys.push(new Uint8Array(decoded));
    }
  } catch {
    // ignore
  }

  // Candidate key 2: raw secret bytes without prefix.
  candidateKeys.push(new TextEncoder().encode(secretNoPrefix));
  // Candidate key 3: raw secret bytes with prefix preserved.
  candidateKeys.push(new TextEncoder().encode(secretRaw.trim()));

  for (const keyBytes of candidateKeys) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes as unknown as BufferSource,
        { name: 'HMAC', hash: 'SHA-256' } as HmacImportParams,
        false,
        ['sign']
      );
      const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, message);
      const computedSigBase64 = Buffer.from(new Uint8Array(signatureBytes)).toString('base64');
      const computedSigHex = Buffer.from(new Uint8Array(signatureBytes)).toString('hex');

      for (const expectedSig of expectedSignatures) {
        if (timingSafeEqual(computedSigBase64, expectedSig) || timingSafeEqual(computedSigHex, expectedSig)) {
          return true;
        }
      }
    } catch {
      // try next key strategy
    }
  }

  return false;
}

// Resolve Supabase user from Authorization header (Bearer <access_token>)
async function getSupabaseUser(authHeader: string) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data?.id as string | undefined, email: data?.email as string | undefined };
  } catch {
    return null;
  }
}

// ============================================
// DODO WEBHOOK - Subscription Events
// POST /dodoWebhook
// ============================================
http.route({
  path: "/dodoWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const secret = process.env.DODO_WEBHOOK_SECRET;
      const signature = request.headers.get('webhook-signature');
      const webhookId = request.headers.get('webhook-id');
      const webhookTimestamp = request.headers.get('webhook-timestamp');
      const rawBody = await request.text();

      // Verify signature
      if (secret) {
        const ok = await verifyDodoSignature(secret, webhookId, webhookTimestamp, rawBody, signature);
        if (!ok) {
          console.error('Invalid Dodo webhook signature', { webhookId });
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
        }

        // Check for duplicate using persistent storage
        if (webhookId) {
          const duplicateCheck = await ctx.runQuery(internal.webhookHelpers.isWebhookProcessed, {
            webhookId,
            provider: 'dodo',
          });

          if (duplicateCheck.processed) {
            console.log('[Webhook] Duplicate delivery detected, ignoring', { webhookId });
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }

      const body = JSON.parse(rawBody);
      const eventType = body.type;
      const data = body.data;
      const metadata = data?.metadata || body.metadata || {};

      const evtTsRaw = body?.timestamp || data?.timestamp || null;
      const evtTs = evtTsRaw ? Date.parse(evtTsRaw) : null;
      const recvTs = Date.now();
      const deliveryLatencyMs = (evtTs && !isNaN(evtTs)) ? (recvTs - evtTs) : null;
      console.log(`Processing Dodo event: ${eventType}`, {
        webhookId,
        subscriptionId: data?.subscription_id || data?.payment_id,
        metadata: JSON.stringify(metadata),
        event_timestamp: evtTsRaw || null,
        received_at: new Date(recvTs).toISOString(),
        delivery_latency_ms: deliveryLatencyMs
      });

      let userId = metadata.userId;
      let resolvedUserId = userId as string | undefined;
      let userEmail = data?.customer?.email || data?.email;
      const subscriptionId = data?.subscription_id || data?.id;
      let resolvedDodoCustomerId = data?.customer_id || data?.customer?.customer_id || data?.customer?.id || data?.id;
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const resolveUserFromRecentDodoPayments = async (subId: string | undefined) => {
        if (!subId || !supabaseUrl || !supabaseKey) return undefined;
        const encodedSubId = encodeURIComponent(subId);

        // First: direct merchant reference match.
        const directRes = await fetch(
          `${supabaseUrl}/rest/v1/payments?provider=eq.dodo&merchant_reference=eq.${encodedSubId}&select=user_id&order=created_at.desc&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (directRes.ok) {
          const rows = await directRes.json();
          if (rows?.[0]?.user_id) return rows[0].user_id as string;
        }

        // Second: metadata.subscriptionId match.
        const metaRes = await fetch(
          `${supabaseUrl}/rest/v1/payments?provider=eq.dodo&metadata->>subscriptionId=eq.${encodedSubId}&select=user_id&order=created_at.desc&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (metaRes.ok) {
          const rows = await metaRes.json();
          if (rows?.[0]?.user_id) return rows[0].user_id as string;
        }

        return undefined;
      };

      // Ensure we can resolve the customer even when webhook payload omits customer fields.
      // This is important for cancellation events from portal actions.
      if (!resolvedDodoCustomerId && data?.subscription_id) {
        try {
          const apiKey = process.env.DODO_PAYMENTS_API_KEY;
          if (apiKey) {
            const isTest = apiKey.startsWith('test_');
            const baseUrl = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
            const subRes = await fetch(`${baseUrl}/subscriptions/${data.subscription_id}`, {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (subRes.ok) {
              const sub = await subRes.json();
              resolvedDodoCustomerId = sub?.customer?.id || sub?.customer?.customer_id || sub?.customer_id;
            } else {
              console.warn('[Webhook] Subscription lookup failed while resolving customer id:', subRes.status);
            }
          }
        } catch (error) {
          console.warn('[Webhook] Error resolving customer id from subscription:', error);
        }
      }

      // Fallback: If userId is missing from metadata, look up via dodo_customer_id in Supabase
      if (!userId && resolvedDodoCustomerId) {
        console.log(`[Webhook] No userId in metadata, attempting fallback lookup for customer: ${resolvedDodoCustomerId}`);
        if (supabaseUrl && supabaseKey) {
          try {
            const lookupRes = await fetch(
              `${supabaseUrl}/rest/v1/profiles?dodo_customer_id=eq.${encodeURIComponent(resolvedDodoCustomerId)}&select=id`,
              { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
            );
            if (lookupRes.ok) {
              const profiles = await lookupRes.json();
              if (profiles?.[0]?.id) {
                userId = profiles[0].id;
                console.log(`[Webhook] Found userId via dodo_customer_id: ${userId}`);
              } else {
                console.warn(`[Webhook] No user found with dodo_customer_id: ${resolvedDodoCustomerId}`);
              }
            } else {
              console.error(`[Webhook] Fallback lookup failed with status: ${lookupRes.status}`);
            }
          } catch (lookupErr) {
            console.error('[Webhook] Error during fallback lookup:', lookupErr);
          }
        }
      }

      // Fallback: If still unresolved, use email.
      if (!userId && userEmail) {
        try {
          const lookup = await ctx.runAction(internal.dodoPayments.resolveUserIdByEmail, { userEmail });
          if (lookup?.success && lookup?.userId) {
            userId = lookup.userId as string;
            resolvedUserId = userId;
            console.log(`[Webhook] Found userId via email: ${userId}`);
          }
        } catch (error) {
          console.warn('[Webhook] Email resolution failed:', error);
        }
      }

      // Fallback: If still unresolved, use recent Dodo payment/subscription records.
      if (!userId && subscriptionId) {
        try {
          const paymentMatchedUserId = await resolveUserFromRecentDodoPayments(subscriptionId);
          if (paymentMatchedUserId) {
            userId = paymentMatchedUserId;
            resolvedUserId = paymentMatchedUserId;
            console.log(`[Webhook] Found userId via Dodo payment history: ${paymentMatchedUserId}`);
          }
        } catch (error) {
          console.warn('[Webhook] Payment-history user resolution failed:', error);
        }
      }

      // Fetch the live subscription snapshot for subscription events to avoid stale/out-of-order webhook states.
      let liveSubscriptionStatus = '';
      let liveSubscriptionData: any = null;
      if (subscriptionId && (eventType || '').toLowerCase().startsWith('subscription.')) {
        try {
          const apiKey = process.env.DODO_PAYMENTS_API_KEY;
          if (apiKey) {
            const isTest = apiKey.startsWith('test_');
            const baseUrl = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
            const subRes = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
              headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (subRes.ok) {
              const sub = await subRes.json();
              liveSubscriptionData = sub;
              liveSubscriptionStatus = String(sub?.status || '').toLowerCase();
              const subCustomerId = sub?.customer?.id || sub?.customer?.customer_id || sub?.customer_id;
              const subEmail = sub?.customer?.email;
              if (!resolvedDodoCustomerId && subCustomerId) {
                resolvedDodoCustomerId = subCustomerId;
              }
              if (!userEmail && subEmail) {
                userEmail = subEmail;
              }
            }
          }
        } catch (error) {
          console.warn('[Webhook] Live subscription snapshot fetch failed:', error);
        }
      }

      const preNormalizedStatus = String(
        liveSubscriptionStatus ||
        data?.status ||
        data?.subscription_status ||
        data?.subscription?.status ||
        ''
      ).toLowerCase();
      const preIsFailedStatus =
        preNormalizedStatus === 'on_hold' ||
        preNormalizedStatus === 'failed' ||
        preNormalizedStatus === 'payment_failed' ||
        preNormalizedStatus === 'past_due';
      // IMPORTANT: cancel_at_period_end = true does NOT mean the subscription is
      // cancelled NOW — it means it will cancel at the end of the billing period
      // but remains ACTIVE today. Including it here would block legitimate
      // subscription.active activations for users who set cancel_at_period_end.
      const preIsCancelledStatus =
        preNormalizedStatus === 'cancelled' ||
        preNormalizedStatus === 'canceled' ||
        preNormalizedStatus === 'expired' ||
        preNormalizedStatus === 'inactive' ||
        !!liveSubscriptionData?.cancelled_at ||
        !!liveSubscriptionData?.ended_at ||
        !!liveSubscriptionData?.end_at;

      // Routing based on event type
      // Routing based on event type
      // Deduplication: ONLY subscription.active triggers the subscription update/extension logic
      // to prevents double-adding time when multiple events arrive for the same transaction.
      if (eventType === 'subscription.active' && !preIsFailedStatus && !preIsCancelledStatus) {
        // Activate or renew subscription
        const res = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'active',
          plan: metadata?.planId || 'Professional',
          dodoCustomerId: resolvedDodoCustomerId,
          subscriptionId: data?.subscription_id,
          nextBillingDate: data?.next_billing_date,
          billingCycle: metadata?.billingCycle,
          eventType: eventType,
        });
        console.log(`[Webhook] updateSubscription result (subscription.active):`, res);
        if (res?.success && 'userId' in res && res.userId) {
          resolvedUserId = res.userId as string;
          userId = res.userId as string;
        }

        // Return 500 on activation failure so Dodo retries the webhook
        if (!res?.success && !('skipped' in res && res.skipped)) {
          console.error(`[Webhook] Subscription activation FAILED for user ${userId || 'unknown'}: ${'error' in res ? res.error : 'Unknown error'}`);
          return new Response(
            JSON.stringify({ 
              error: ('error' in res ? res.error : null) || 'Subscription activation failed',
              logged: true 
            }), 
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      } else {
        console.log(`[Webhook] Skipping subscription update for ${eventType} to prevent double activation.`);
      }

      // Record the payment
      if (!resolvedUserId && userEmail) {
        try {
          const lookup = await ctx.runAction(internal.dodoPayments.resolveUserIdByEmail, {
            userEmail
          });
          if (lookup?.success && lookup?.userId) {
            resolvedUserId = lookup.userId as string;
          }
        } catch (e) {
          console.warn('[Webhook] Failed to resolve user by email for payment record:', e);
        }
      }

      if (
        (eventType === 'payment.succeeded' || eventType === 'subscription.active') &&
        (data?.total_amount || data?.amount)
      ) {
        if (resolvedUserId) {
          await ctx.runAction(internal.dodoPayments.recordPayment, {
            userId: resolvedUserId,
            userEmail,
            amount: data.total_amount || data.amount,
            currency: data.currency || 'USD',
            status: 'completed',
            merchantReference: data.payment_id || data.subscription_id || data.id,
            subscriptionId: data.subscription_id,
          });
        } else {
          console.warn('[Webhook] Skipping Dodo payment record because user could not be resolved', {
            eventType,
            paymentId: data.payment_id,
            subscriptionId: data.subscription_id,
            email: userEmail
          });
        }
      }
      const normalizedEvent = (eventType || '').toLowerCase();
      const normalizedPayloadStatus = String(
        liveSubscriptionStatus || data?.status || data?.subscription_status || data?.subscription?.status || ''
      ).toLowerCase();
      const normalizedLifecycleState = normalizedPayloadStatus || normalizedEvent;

      const isRenewedEvent = normalizedEvent === 'subscription.renewed';
      const isFailedEvent =
        normalizedEvent === 'subscription.on_hold' ||
        normalizedEvent === 'subscription.failed' ||
        normalizedEvent === 'subscription.payment_failed' ||
        normalizedPayloadStatus === 'on_hold' ||
        normalizedPayloadStatus === 'failed' ||
        normalizedPayloadStatus === 'payment_failed' ||
        normalizedPayloadStatus === 'past_due' ||
        normalizedLifecycleState.includes('past_due');
      const isCancelledEvent =
        normalizedEvent === 'subscription.cancelled' ||
        normalizedEvent === 'subscription.canceled' ||
        normalizedEvent.includes('cancel') ||
        normalizedPayloadStatus === 'cancelled' ||
        normalizedPayloadStatus === 'canceled' ||
        normalizedPayloadStatus === 'expired' ||
        normalizedPayloadStatus === 'inactive' ||
        normalizedLifecycleState.includes('cancel') ||
        normalizedLifecycleState.includes('expire') ||
        normalizedLifecycleState.includes('inactive');

      const isUpdatedEvent = normalizedEvent === 'subscription.updated';

      if (isRenewedEvent) {
        // Subscription renewed - just push the date and record payment
        const renewRes = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'active',
          nextBillingDate: data?.next_billing_date,
          billingCycle: metadata.billingCycle,
          dodoCustomerId: resolvedDodoCustomerId,
          subscriptionId: data?.subscription_id,
          eventType: 'subscription.renewed',
        });
        if (renewRes?.success && 'userId' in renewRes && renewRes.userId) {
          resolvedUserId = renewRes.userId as string;
        }

        if (data?.amount) {
          if (resolvedUserId) {
            await ctx.runAction(internal.dodoPayments.recordPayment, {
              userId: resolvedUserId,
              userEmail,
              amount: data.amount,
              currency: data.currency || 'USD',
              status: 'completed',
              merchantReference: data.payment_id,
              subscriptionId: data.subscription_id,
            });
          } else {
            console.warn('[Webhook] Skipping renewal payment record because user could not be resolved', {
              paymentId: data.payment_id,
              subscriptionId: data.subscription_id,
              email: userEmail
            });
          }
        }

        // Send renewal success email
        if (userEmail) {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                  'apikey': supabaseKey,
                },
                body: JSON.stringify({
                  type: 'subscription_renewed',
                  email: userEmail,
                  data: {
                    userName: data?.customer?.name || userEmail.split('@')[0],
                    nextBillingDate: data?.next_billing_date,
                    planName: metadata.billingCycle === 'yearly' ? 'Professional (Yearly)' : 'Professional (Monthly)',
                    amount: data?.amount,
                    currency: data?.currency || 'USD',
                  },
                }),
              });
              console.log(`[Webhook] Sent subscription_renewed email to ${userEmail}`);
            } catch (emailErr) {
              console.error(`[Webhook] Failed to send subscription_renewed email:`, emailErr);
            }
          }
        }
      } else if (isUpdatedEvent) {
        // Real-time sync: check if this update is actually a cancellation.
        // Dodo sends subscription.updated when cancel_at_period_end is set via portal.
        //
        // IMPORTANT: cancel_at_period_end = true means "will cancel at end of billing
        // period" — the subscription is STILL ACTIVE TODAY. Do NOT cancel immediately.
        // Only treat as cancelled when the subscription has genuinely ended (cancelled_at
        // or ended_at are set, or the live status is explicitly cancelled/canceled).
        const isUpdatedButCancelled =
          !!liveSubscriptionData?.cancelled_at ||
          !!liveSubscriptionData?.ended_at ||
          liveSubscriptionData?.status === 'cancelled' ||
          liveSubscriptionData?.status === 'canceled';

        const effectiveStatus = isUpdatedButCancelled ? 'cancelled' : 'active';
        console.log(`[Webhook] subscription.updated - live cancel flags:`, {
          cancel_at_period_end: liveSubscriptionData?.cancel_at_period_end,
          cancel_at_next_billing_date: liveSubscriptionData?.cancel_at_next_billing_date,
          cancelled_at: liveSubscriptionData?.cancelled_at,
          ended_at: liveSubscriptionData?.ended_at,
          effectiveStatus
        });

        const updRes = await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: effectiveStatus,
          plan: metadata?.planId || 'pro',
          dodoCustomerId: resolvedDodoCustomerId,
          subscriptionId: data?.subscription_id,
          nextBillingDate: data?.next_billing_date,
          billingCycle: metadata?.billingCycle,
          eventType: 'subscription.updated',
          silent: true
        });
        if (updRes?.success && 'userId' in updRes && updRes.userId) {
          resolvedUserId = updRes.userId as string;
        }

        // If cancelled via portal, also send notification
        if (isUpdatedButCancelled && resolvedUserId) {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: resolvedUserId,
                  title: 'Subscription Cancelled',
                  message: 'Your subscription has been cancelled. You can reactivate anytime from the pricing page.',
                  type: 'warning',
                  is_read: false
                })
              });
            } catch (e) {
              console.error('[Webhook] Failed to send portal cancellation notification:', e);
            }
          }
        }
      } else if (isFailedEvent) {
        await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'payment_failed',
          dodoCustomerId: resolvedDodoCustomerId,
          subscriptionId: data?.subscription_id,
          eventType: eventType,
        });

        // Send payment failed email
        if (userEmail && userId) {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            try {
              // Fetch profile to get subscription_end_date and other details
              const profileRes = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription_end_date,subscription_plan,dodo_checkout_url`,
                { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
              );
              if (profileRes.ok) {
                const profiles = await profileRes.json();
                const profile = profiles?.[0];
                if (profile) {
                  await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseKey}`,
                      'apikey': supabaseKey,
                    },
                    body: JSON.stringify({
                      type: 'payment_failed',
                      email: userEmail,
                      data: {
                        subscriptionEndDate: profile.subscription_end_date,
                        planName: profile.subscription_plan || 'Professional',
                        checkoutUrl: profile.dodo_checkout_url,
                        reason: data?.decline_reason || data?.failure_reason || 'Payment declined',
                      },
                    }),
                  });
                  console.log(`[Webhook] Sent payment_failed email to ${userEmail}`);
                }
              }
            } catch (emailErr) {
              console.error(`[Webhook] Failed to send payment_failed email:`, emailErr);
            }
          }
        }
      } else if (isCancelledEvent) {
        console.log(`[Webhook] Processing cancellation event: ${eventType}`, {
          userId,
          userEmail,
          subscriptionId: data?.subscription_id,
          dodoCustomerId: resolvedDodoCustomerId,
        });

        await ctx.runAction(internal.dodoPayments.updateSubscription, {
          userId,
          userEmail,
          status: 'cancelled',
          dodoCustomerId: resolvedDodoCustomerId,
          subscriptionId: data?.subscription_id,
          eventType: eventType,
        });

        // Add cancellation notification for user visibility
        if (resolvedUserId) {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: resolvedUserId,
                  title: 'Subscription Cancelled',
                  message: 'Your subscription has been cancelled. You can reactivate anytime from the checkout page.',
                  type: 'warning',
                  is_read: false
                })
              });
              console.log('[Webhook] Sent cancellation notification to user:', resolvedUserId);
            } catch (e) {
              console.error('[Webhook] Failed to send cancellation notification:', e);
            }
          }
        }
      }

      // Record webhook as processed in persistent storage
      if (webhookId) {
        await ctx.runMutation(internal.webhookHelpers.recordWebhookProcessed, {
          webhookId,
          eventType,
          provider: 'dodo',
          userId: resolvedUserId,
          subscriptionId: data?.subscription_id,
        });
      }

      // Update subscription sync state for monitoring
      if (resolvedUserId) {
        await ctx.runMutation(internal.webhookHelpers.updateSubscriptionSyncState, {
          userId: resolvedUserId,
          status: eventType === 'subscription.active' ? 'active'
            : isCancelledEvent ? 'cancelled'
              : isFailedEvent ? 'payment_failed'
                : 'unknown',
          dodoCustomerId: resolvedDodoCustomerId,
          syncSource: 'webhook',
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      console.error('Webhook error:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }),
});

// ============================================
// CREATE DODO CHECKOUT
// POST /createDodoPayment
// ============================================
http.route({
  path: "/createDodoPayment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const authUser = await getSupabaseUser(authHeader);
      if (!authUser?.id || !authUser.email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const body = await request.json();
      const { userName, billingCycle, returnUrl } = body;

      const result = await ctx.runAction(internal.dodoPayments.createCheckout, {
        userId: authUser.id,
        userEmail: authUser.email,
        userName: userName || authUser.email.split('@')[0],
        billingCycle: billingCycle || 'monthly',
        returnUrl: returnUrl || 'https://tutors.durrahsystem.tech/payment-callback?provider=dodo',
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('Create checkout error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// ============================================
// CREATE DODO PORTAL SESSION
// POST /dodoPortalSession
// ============================================
http.route({
  path: "/dodoPortalSession",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const authUser = await getSupabaseUser(authHeader);
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: corsHeaders
        });
      }

      let body: any = {};
      try {
        body = await request.json();
      } catch {}

      const providedId = body?.dodoCustomerId as string | undefined;
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
          status: 500,
          headers: corsHeaders
        });
      }

      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${authUser.id}&select=subscription_status,email,dodo_customer_id`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );

      let userDodoId: string | undefined;
      let subscriptionStatus: string | undefined;
      let profileEmail: string | undefined;
      if (profileRes.ok) {
        try {
          const profiles = await profileRes.json();
          subscriptionStatus = profiles?.[0]?.subscription_status as string | undefined;
          profileEmail = profiles?.[0]?.email as string | undefined;
          userDodoId = profiles?.[0]?.dodo_customer_id as string | undefined;
        } catch (e) {
          console.warn('[Portal] Failed to parse profile JSON:', e);
        }
      } else {
        console.warn(`[Portal] Profile lookup failed with status: ${profileRes.status}`);
      }

      if (providedId && userDodoId && providedId !== userDodoId) {
        return new Response(JSON.stringify({ error: 'Forbidden: customer mismatch' }), { status: 403, headers: corsHeaders });
      }

      const tryPortal = async (customerId: string | undefined) => {
        if (!customerId) return null;
        try {
          const portal = await ctx.runAction(internal.dodoPayments.createPortal, { dodoCustomerId: customerId });
          return portal;
        } catch (e) {
          console.warn('[Portal] Failed to create portal with candidate customer id:', customerId, e);
          return null;
        }
      };

      const directPortal = await tryPortal(providedId ?? userDodoId);
      if (directPortal?.portal_url) {
        return new Response(JSON.stringify(directPortal), {
          status: 200,
          headers: corsHeaders,
        });
      }

      let resolvedId: string | undefined;
      try {
        const resolved = await ctx.runAction(internal.dodoPayments.resolveAndLinkCustomer, {
          userId: authUser.id,
          userEmail: authUser.email || profileEmail
        });
        if (resolved?.success && resolved?.dodoCustomerId) {
          resolvedId = resolved.dodoCustomerId as string;
        }
      } catch (e) {
        console.warn('[Portal] Auto-resolve failed:', e);
      }

      const recoveredPortal = await tryPortal(resolvedId);
      if (recoveredPortal?.portal_url) {
        return new Response(JSON.stringify(recoveredPortal), {
          status: 200,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({
        error: 'No Dodo customer linked to your account yet',
        code: 'DODO_CUSTOMER_NOT_LINKED',
        subscriptionStatus: subscriptionStatus || null
      }), {
        status: 404,
        headers: corsHeaders
      });
    } catch (error: any) {
      console.error('Portal session error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// ============================================
// VERIFY DODO PAYMENT (Direct Check)
// POST /verifyDodoPayment
// Requires authentication
// ============================================
http.route({
  path: "/verifyDodoPayment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Require authentication
      const authHeader = request.headers.get('Authorization') || '';
      const authUser = await getSupabaseUser(authHeader);
      
      if (!authUser?.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - authentication required' }), 
          { status: 401, headers: corsHeaders }
        );
      }

      const body = await request.json();
      const { orderId, userId } = body;
      
      // Ensure requested userId matches authenticated user
      if (userId && userId !== authUser.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - cannot verify payment for another user' }), 
          { status: 403, headers: corsHeaders }
        );
      }

      // Use authenticated user's ID
      const verifiedUserId = authUser.id;

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing orderId' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      console.log(`[HTTP] Direct verification request for ${orderId} by user ${verifiedUserId}`);
      const result = await ctx.runAction(internal.dodoPayments.verifyPayment, {
        orderId,
        userId: verifiedUserId
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('Direct verification endpoint error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// ============================================
// SYNC DODO SUBSCRIPTION (Authenticated fallback)
// POST /syncDodoSubscription
// ============================================
http.route({
  path: "/syncDodoSubscription",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const authUser = await getSupabaseUser(authHeader);
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const result = await ctx.runAction(internal.dodoPayments.syncSubscriptionFromProvider, {
        userId: authUser.id,
        userEmail: authUser.email
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('Sync Dodo subscription error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders
      });
    }
  }),
});

// OPTIONS routes for CORS preflight
http.route({ path: "/verifyDodoPayment", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/createDodoPayment", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/dodoPortalSession", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });
http.route({ path: "/syncDodoSubscription", method: "OPTIONS", handler: httpAction(async () => new Response(null, { headers: corsHeaders })) });


// ============================================
// PUSH SCORE FROM GRADE-EXAM EDGE FUNCTION
// POST /pushScore
// ============================================
http.route({
  path: "/pushScore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify shared secret
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.CONVEX_WEBHOOK_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      // Validate required fields
      const { quiz_code, exam_id, nickname, score, max_score, percentage } = body;

      if (!quiz_code || !exam_id || !nickname || score === undefined || !max_score) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Call the mutation
      const entryId = await ctx.runMutation(api.leaderboard.pushScore, {
        quiz_code,
        exam_id,
        nickname,
        student_id: body.student_id,
        avatar: body.avatar,
        score,
        max_score,
        percentage: percentage ?? Math.round((score / max_score) * 100),
        time_taken_seconds: body.time_taken_seconds,
      });

      return new Response(JSON.stringify({ success: true, entryId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error pushing score:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================
// HEALTH CHECK
// GET /health
// ============================================
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({
      status: "ok",
      timestamp: Date.now(),
      service: "durrah-exams-convex"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================
// GET PENDING AUTO-SUBMITTED SESSIONS
// GET /pendingAutoSubmits
// Returns sessions that were auto-submitted by Convex and need to be synced to Supabase
// ============================================
http.route({
  path: "/pendingAutoSubmits",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      // Get all auto-submitted sessions that haven't been synced to Supabase yet
      const sessions = await ctx.runQuery(api.sessionsQueries.getPendingAutoSubmits, {});

      return new Response(JSON.stringify({
        success: true,
        sessions,
        count: sessions.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error getting pending auto-submits:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================
// MARK SESSION AS SYNCED TO SUPABASE
// POST /markSynced
// ============================================
http.route({
  path: "/markSynced",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { session_id, supabase_submission_id, score, max_score, percentage } = body;

      if (!session_id) {
        return new Response(JSON.stringify({ error: "Missing session_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await ctx.runMutation(api.sessions.markSyncedToSupabase, {
        session_id,
        supabase_submission_id,
        score,
        max_score,
        percentage,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error marking session as synced:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
