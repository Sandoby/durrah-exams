import { supabase } from './supabase';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';

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
  private baseUrl = 'https://api.kashier.io';
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load Kashier SDK if needed
      await this.loadKashierScript();
      this.isInitialized = true;
      console.log('✅ Kashier integration initialized successfully');
    } catch (error) {
      console.error('❌ Kashier initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load Kashier payment script
   */
  private loadKashierScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Kashier is already loaded
      if ((window as any).kashier) {
        console.log('✅ Kashier already loaded');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.kashier.io/kashier.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Kashier script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Kashier script');
        reject(new Error('Failed to load Kashier script'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Create order on Kashier API
   */
  private async createOrder(orderId: string, amount: number, userEmail: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          amount: amount,
          currency: 'EGP',
          customer_email: userEmail,
          redirect_url: `${window.location.origin}/checkout?payment=complete`,
          webhook_url: `${window.location.origin}/api/webhook/kashier`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kashier API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Kashier order created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating Kashier order:', error);
      throw error;
    }
  }

  /**
   * Main payment method - create payment intent and redirect
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
      const orderId = `DURRAH_${userId}_${Date.now()}`;

      // Create payment record first
      await this.createPaymentRecord(planId, amount, orderId, userEmail);

      // Create order on Kashier
      const orderResponse = await this.createOrder(orderId, amount, userEmail);

      if (!orderResponse.success || !orderResponse.payment_url) {
        throw new Error('Failed to create Kashier order');
      }

      // Store payment metadata in localStorage for webhook handling
      localStorage.setItem(
        `kashier_payment_${orderId}`,
        JSON.stringify({
          userId,
          planId,
          billingCycle,
          userEmail,
          amount,
          createdAt: new Date().toISOString(),
        })
      );

      // Redirect to Kashier payment page
      console.log('🔗 Redirecting to Kashier payment page...');
      window.location.href = orderResponse.payment_url;

      return { success: true, data: orderResponse };
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

        // Retrieve stored payment metadata
        const metadata = localStorage.getItem(`kashier_payment_${order_id}`);
        if (metadata) {
          const { userId, planId, billingCycle } = JSON.parse(metadata);

          // Activate subscription instantly
          await this.updateUserProfile(userId, planId, billingCycle);

          // Clean up localStorage
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
}

export const kashierIntegration = new KashierIntegration();
