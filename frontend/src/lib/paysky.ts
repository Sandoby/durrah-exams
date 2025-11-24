import { supabase } from './supabase';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';

// Define types for global Lightbox
declare global {
    interface Window {
        Lightbox: any;
        isPayOnDelivery: boolean;
        TransactionType: string;
    }
}

export class PaySkyIntegration {
    private MID = '10527302281';
    private TID = '14261833';
    private SecretKey = '7e68887d8388946f828c489da7f818db';
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.loadPaySkyScript();
            this.isInitialized = true;
            console.log('✅ PAYSKY integration initialized successfully');
        } catch (error) {
            console.error('❌ PAYSKY initialization failed:', error);
            throw error;
        }
    }

    async loadPaySkyScript() {
        return new Promise<void>((resolve, reject) => {
            // Check if Lightbox is already loaded
            if (window.Lightbox && window.Lightbox.Checkout) {
                console.log('✅ PAYSKY Lightbox already loaded');
                resolve();
                return;
            }

            // Check if script is already being loaded
            if (document.querySelector('script[src*="paysky.io"]')) {
                console.log('⏳ PAYSKY script already loading, waiting...');
                const checkInterval = setInterval(() => {
                    if (window.Lightbox && window.Lightbox.Checkout) {
                        clearInterval(checkInterval);
                        console.log('✅ PAYSKY Lightbox loaded from existing script');
                        resolve();
                    }
                }, 100);

                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error('PAYSKY script loading timeout'));
                }, 10000);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cube.paysky.io:6006/js/LightBox.js?v=1.2';
            script.async = true;
            script.onload = () => {
                setTimeout(() => {
                    if (window.Lightbox && window.Lightbox.Checkout) {
                        console.log('✅ PAYSKY Lightbox loaded successfully');
                        resolve();
                    } else {
                        console.error('❌ PAYSKY Lightbox loaded but not properly initialized');
                        reject(new Error('PAYSKY Lightbox not properly initialized'));
                    }
                }, 500);
            };
            script.onerror = () => {
                console.error('❌ Failed to load PAYSKY Lightbox');
                reject(new Error('Failed to load PAYSKY Lightbox'));
            };
            document.head.appendChild(script);
        });
    }

    generateSecureHash(amount: number, merchantRef: string, trxDateTime: string) {
        try {
            const hashing = `Amount=${amount}&DateTimeLocalTrxn=${trxDateTime}&MerchantId=${this.MID}&MerchantReference=${merchantRef}&TerminalId=${this.TID}`;

            const secretKeyWordArray = CryptoJS.enc.Hex.parse(this.SecretKey);
            const hmac = CryptoJS.HmacSHA256(hashing, secretKeyWordArray);
            const hmacHex = hmac.toString(CryptoJS.enc.Hex);
            const secureHash = hmacHex.toUpperCase();

            return secureHash;
        } catch (error) {
            console.error('❌ Error generating secure hash:', error);
            throw error;
        }
    }

    async processPayment(
        plan: string,
        amountInEGP: number,
        userEmail: string,
        userId: string,
        billingCycle: 'monthly' | 'yearly',
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ) {
        try {
            console.log('🚀 Starting PAYSKY payment process...', { plan, amountInEGP });

            await this.initialize();

            if (!window.Lightbox || !window.Lightbox.Checkout) {
                throw new Error('PAYSKY Lightbox not available after initialization');
            }

            // Convert EGP to piasters (1 EGP = 100 piasters)
            const amount = Math.round(amountInEGP * 100);
            const merchantRef = `DURRAH_${Date.now()}`;
            const trxDateTime = new Date().toUTCString();
            const secureHash = this.generateSecureHash(amount, merchantRef, trxDateTime);

            // Define global variables that PAYSKY Lightbox expects
            window.isPayOnDelivery = false;
            window.TransactionType = 'SALE';

            // Create payment record in Supabase
            await this.createPaymentRecord(plan, amountInEGP, merchantRef, userEmail);

            // Configure PAYSKY Lightbox
            window.Lightbox.Checkout.configure = {
                MID: this.MID,
                TID: this.TID,
                AmountTrxn: amount,
                SecureHash: secureHash,
                MerchantReference: merchantRef,
                TrxDateTime: trxDateTime,
                completeCallback: async (data: any) => {
                    console.log('🎉 Payment successful!', data);
                    await this.updatePaymentRecord(merchantRef, 'completed', data);
                    await this.updateUserProfile(userId, plan, billingCycle);
                    onSuccess(data);
                },
                errorCallback: async (error: any) => {
                    console.error('❌ Payment error:', error);
                    await this.updatePaymentRecord(merchantRef, 'failed', { error });
                    onError(error);
                },
                cancelCallback: async () => {
                    console.log('⚠️ Payment cancelled by user');
                    await this.updatePaymentRecord(merchantRef, 'cancelled', { reason: 'user_cancelled' });
                    toast('Payment cancelled');
                }
            };

            console.log('🎨 Showing PAYSKY Lightbox...');
            window.Lightbox.Checkout.showLightbox();

        } catch (error: any) {
            console.error('❌ PAYSKY payment error:', error);
            toast.error('Payment initialization failed: ' + error.message);
        }
    }

    async updateUserProfile(userId: string, planName: string, billingCycle: 'monthly' | 'yearly') {
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
                    subscription_plan: planName,
                    subscription_status: 'active',
                    subscription_end_date: endDate.toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('Error updating profile subscription:', error);
            } else {
                console.log('✅ User profile subscription updated');
            }
        } catch (error) {
            console.error('Error updating profile subscription:', error);
        }
    }

    async createPaymentRecord(plan: string, amount: number, merchantRef: string, userEmail: string) {
        try {
            const { error } = await supabase
                .from('payments')
                .insert({
                    plan,
                    amount,
                    currency: 'EGP',
                    merchant_reference: merchantRef,
                    status: 'pending',
                    payment_method: 'paysky',
                    user_email: userEmail,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error creating payment record:', error);
            }
        } catch (error) {
            console.error('Error creating payment record:', error);
        }
    }

    async updatePaymentRecord(merchantRef: string, status: string, data: any) {
        try {
            const { error } = await supabase
                .from('payments')
                .update({
                    status,
                    paysky_response: data,
                    updated_at: new Date().toISOString()
                })
                .eq('merchant_reference', merchantRef);

            if (error) {
                console.error('Error updating payment record:', error);
            }
        } catch (error) {
            console.error('Error updating payment record:', error);
        }
    }
}

export const paySkyIntegration = new PaySkyIntegration();
