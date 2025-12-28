import { supabase } from './supabase';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface KashierPayParams {
  amount: number;
  planId: string;
  userId: string;
  userEmail: string;
  billingCycle: 'monthly' | 'yearly';
}

interface PayResult {
  success: boolean;
  data?: any;
  error?: any;
}

export class KashierIntegration {
  private apiKey = import.meta.env.VITE_KASHIER_API_KEY || 'af01074c-fe16-4daf-a235-c36fea074d52';
  private merchantId = import.meta.env.VITE_KASHIER_MERCHANT_ID || 'MID-38682-577';
  private baseUrl = 'https://checkout.kashier.io';
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('✅ Kashier integration initialized successfully');
  }

  /**
   * Generate hash for Kashier order (HMAC-SHA256)
   */
  private generateOrderHash(orderId: string, amount: number, currency: string = 'EGP'): string {
    const path = `/?payment=${this.merchantId}.${orderId}.${amount}.${currency}`;
    const hash = CryptoJS.HmacSHA256(path, this.apiKey).toString();
    console.log('🔐 Generated order hash for:', { orderId, amount, currency });
    return hash;
  }

  /**
   * Store payment metadata with timeout and uniqueness
   */
  private storePaymentMetadata(orderId: string, metadata: any): string {
    try {
      const key = `kashier_payment_${orderId}`;
      const sessionKey = `${key}_session_${Date.now()}`;

      // Store with timestamp for cache busting
      const dataToStore = {
        ...metadata,
        storedAt: Date.now(),
        sessionId: sessionKey
      };

      localStorage.setItem(key, JSON.stringify(dataToStore));
      localStorage.setItem(sessionKey, JSON.stringify(dataToStore));

      console.log('✅ Payment metadata stored:', { key, sessionKey });
      return key;
    } catch (error) {
      console.error('❌ Error storing payment metadata:', error);
      throw error;
    }
  }

  /**
   * Retrieve payment metadata with fallback and timeout validation
   */
  private retrievePaymentMetadata(orderId: string): any {
    try {
      const key = `kashier_payment_${orderId}`;
      const data = localStorage.getItem(key);

      if (!data) {
        console.warn('⚠️ No payment metadata found for order:', orderId);
        return null;
      }

      const metadata = JSON.parse(data);
      const storedAt = metadata.storedAt || 0;
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      // Check if data is too old
      if (now - storedAt > maxAge) {
        console.warn('⚠️ Payment metadata expired, clearing');
        localStorage.removeItem(key);
        return null;
      }

      console.log('✅ Payment metadata retrieved:', metadata);
      return metadata;
    } catch (error) {
      console.error('❌ Error retrieving payment metadata:', error);
      return null;
    }
  }

  /**
   * Clear payment metadata safely
   */
  private clearPaymentMetadata(orderId: string): void {
    try {
      const key = `kashier_payment_${orderId}`;

      // Clear main key
      localStorage.removeItem(key);

      // Clear any session-based keys
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(`${key}_session_`)) {
          localStorage.removeItem(storageKey);
        }
      }

      console.log('✅ Payment metadata cleared:', key);
    } catch (error) {
      console.error('❌ Error clearing payment metadata:', error);
    }
  }

  /**
   * Main payment method - redirect to Kashier hosted checkout
   */
  async pay({
    amount,
    planId,
    userId,
    userEmail,
    billingCycle,
  }: KashierPayParams): Promise<PayResult> {
    try {
      console.log('🚀 Starting Kashier payment process...', { planId, amount });

      await this.initialize();

      // Generate unique order ID
      const orderId = `DURRAH_${userId.slice(0, 8)}_${Date.now()}`;

      // Create payment record first
      await this.createPaymentRecord(planId, amount, orderId, userEmail);

      // Generate hash for order
      const hash = this.generateOrderHash(orderId, amount, 'EGP');

      // Store payment metadata in localStorage for callback handling
      try {
        this.storePaymentMetadata(orderId, {
          userId,
          planId,
          billingCycle,
          userEmail,
          amount,
          createdAt: new Date().toISOString(),
        });
      } catch (storageError) {
        console.warn('⚠️ Failed to store metadata, continuing anyway:', storageError);
      }

      // Build Kashier hosted checkout URL
      const isNative = Capacitor.isNativePlatform();
      const callbackUrl = isNative
        ? 'durrah://payment-callback'
        : `${window.location.origin}/payment-callback?provider=kashier`;

      const metadata = encodeURIComponent(JSON.stringify({
        userId,
        planId,
        userEmail,
      }));

      const checkoutUrl = `${this.baseUrl}?` +
        `merchantId=${this.merchantId}` +
        `&orderId=${orderId}` +
        `&amount=${amount}` +
        `&currency=EGP` +
        `&hash=${hash}` +
        `&merchantRedirect=${encodeURIComponent(callbackUrl)}` +
        `&metaData=${metadata}` +
        `&display=en` +
        `&mode=live` +
        `&failureRedirect=true` +
        `&redirectMethod=get`;

      console.log('🔗 Initiating Kashier checkout...', { isNative });

      if (isNative) {
        // Use Capacitor Browser to open natively
        await Browser.open({ url: checkoutUrl, windowName: '_blank' });
      } else {
        // Redirect standard browser
        window.location.href = checkoutUrl;
      }

      return { success: true, data: { orderId, checkoutUrl } };
    } catch (error: any) {
      console.error('❌ Kashier payment error:', error);
      toast.error('Payment initialization failed: ' + error.message);
      return { success: false, error };
    }
  }

  /**
   * Update user subscription after successful payment
   */
  async updateUserProfile(
    userId: string,
    planName: string,
    billingCycle: 'monthly' | 'yearly'
  ) {
    try {
      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: planName === 'pro' ? 'Professional' : 'Starter',
          subscription_status: 'active',
          subscription_end_date: endDate.toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile subscription:', error);
      } else {
        console.log('✅ User profile subscription updated');
        toast.success('Subscription activated instantly!');
      }
    } catch (error) {
      console.error('Error updating profile subscription:', error);
    }
  }

  /**
   * Create payment record in database
   */
  async createPaymentRecord(
    plan: string,
    amount: number,
    orderId: string,
    userEmail: string
  ) {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          plan,
          amount,
          currency: 'EGP',
          merchant_reference: orderId,
          status: 'pending',
          payment_method: 'kashier',
          user_email: userEmail,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating payment record:', error);
      }
    } catch (error) {
      console.error('Error creating payment record:', error);
    }
  }

  /**
   * Update payment record status
   */
  async updatePaymentRecord(orderId: string, status: string, data: any = {}) {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status,
          kashier_response: data,
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_reference', orderId);

      if (error) {
        console.error('Error updating payment record:', error);
      } else {
        console.log('✅ Payment record updated:', status);
      }
    } catch (error) {
      console.error('Error updating payment record:', error);
    }
  }

  /**
   * Verify payment webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const hashInput = `${payload.order_id}${payload.amount}${this.apiKey}`;
      const expectedSignature = CryptoJS.SHA256(hashInput).toString();
      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle webhook response from Kashier
   */
  async handleWebhook(payload: any): Promise<boolean> {
    try {
      const { order_id, status } = payload;

      if (status === 'completed' || status === 'success') {
        // Update payment record
        await this.updatePaymentRecord(order_id, 'completed', payload);

        // Retrieve stored payment metadata with proper method
        const metadata = this.retrievePaymentMetadata(order_id);
        if (metadata) {
          const { userId, planId, billingCycle } = metadata;

          // Activate subscription instantly
          await this.updateUserProfile(userId, planId, billingCycle);

          // Clean up localStorage
          this.clearPaymentMetadata(order_id);
          localStorage.removeItem(`kashier_payment_${order_id}`);
        }

        console.log('✅ Payment processed successfully');
        return true;
      } else if (status === 'failed' || status === 'cancelled') {
        await this.updatePaymentRecord(order_id, status, payload);
        console.log('⚠️ Payment failed or cancelled');
        return false;
      }

      return false;
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      return false;
    }
  }

  /**
   * Public wrapper for retrieving payment metadata
   * Used by PaymentCallback component
   */
  public getPaymentMetadata(orderId: string): any {
    return this.retrievePaymentMetadata(orderId);
  }

  /**
   * Public wrapper for clearing payment metadata
   * Used by PaymentCallback component
   */
  public clearPaymentData(orderId: string): void {
    return this.clearPaymentMetadata(orderId);
  }
}

export const kashierIntegration = new KashierIntegration();
