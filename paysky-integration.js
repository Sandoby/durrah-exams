// PAYSKY Payment Gateway Integration
import { db, collection, addDoc, updateDoc, doc, query, where, getDocs, serverTimestamp } from './firebase.js';

class PaySkyIntegration {
    constructor() {
        this.MID = '10527302281'; // Node# from your account
        this.TID = '14261833'; // Terminal ID from your account
        this.SecretKey = '7e68887d8388946f828c489da7f818db';
        this.isInitialized = false;
        this.scriptLoaded = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load CryptoJS if not already loaded
            await this.loadCryptoJS();
            
            // Load PAYSKY Lightbox script
            await this.loadPaySkyScript();
            
            this.isInitialized = true;
            console.log('✅ PAYSKY integration initialized successfully');
        } catch (error) {
            console.error('❌ PAYSKY initialization failed:', error);
            throw error;
        }
    }

    async loadCryptoJS() {
        return new Promise((resolve, reject) => {
            if (window.CryptoJS) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
            script.onload = () => {
                console.log('✅ CryptoJS loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load CryptoJS');
                reject(new Error('Failed to load CryptoJS'));
            };
            document.head.appendChild(script);
        });
    }

    async loadPaySkyScript() {
        return new Promise((resolve, reject) => {
            // Check if Lightbox is already loaded
            if (window.Lightbox && window.Lightbox.Checkout) {
                this.scriptLoaded = true;
                console.log('✅ PAYSKY Lightbox already loaded');
                resolve();
                return;
            }
            
            // Check if script is already being loaded
            if (document.querySelector('script[src*="paysky.io"]')) {
                console.log('⏳ PAYSKY script already loading, waiting...');
                // Wait for the existing script to load
                const checkInterval = setInterval(() => {
                    if (window.Lightbox && window.Lightbox.Checkout) {
                        clearInterval(checkInterval);
                        this.scriptLoaded = true;
                        console.log('✅ PAYSKY Lightbox loaded from existing script');
                        resolve();
                    }
                }, 100);
                
                // Timeout after 10 seconds
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
                // Wait a bit more for the script to fully initialize
                setTimeout(() => {
                    if (window.Lightbox && window.Lightbox.Checkout) {
                        this.scriptLoaded = true;
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

    generateSecureHash(amount, merchantRef, trxDateTime) {
        try {
            const hashing = `Amount=${amount}&DateTimeLocalTrxn=${trxDateTime}&MerchantId=${this.MID}&MerchantReference=${merchantRef}&TerminalId=${this.TID}`;
            console.log('🔐 Generating hash for:', hashing);
            console.log('🔐 Hash components:', {
                Amount: amount,
                DateTimeLocalTrxn: trxDateTime,
                MerchantId: this.MID,
                MerchantReference: merchantRef,
                TerminalId: this.TID
            });
            
            const secretKeyWordArray = CryptoJS.enc.Hex.parse(this.SecretKey);
            const hmac = CryptoJS.HmacSHA256(hashing, secretKeyWordArray);
            const hmacHex = hmac.toString(CryptoJS.enc.Hex);
            const secureHash = hmacHex.toUpperCase();
            
            console.log('🔐 Generated secure hash:', secureHash);
            return secureHash;
        } catch (error) {
            console.error('❌ Error generating secure hash:', error);
            throw error;
        }
    }

    async processPayment(plan, clinicId) {
        try {
            console.log('🚀 Starting PAYSKY payment process...', { plan, clinicId });
            
            // Try to initialize with retry
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await this.initialize();
                    break;
                } catch (error) {
                    retryCount++;
                    console.warn(`⚠️ PAYSKY initialization attempt ${retryCount} failed:`, error.message);
                    
                    if (retryCount >= maxRetries) {
                        throw new Error(`PAYSKY initialization failed after ${maxRetries} attempts: ${error.message}`);
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
            
            // Final check
            if (!window.Lightbox || !window.Lightbox.Checkout) {
                throw new Error('PAYSKY Lightbox not available after initialization');
            }

            const planDetails = this.getPlanDetails(plan);
            const amountInEGP = planDetails.price;
            
            // Check if plan has a valid price (PAYSKY doesn't allow 0 EGP transactions)
            if (amountInEGP <= 0) {
                throw new Error('Cannot process payment for free plan. PAYSKY requires a minimum amount.');
            }
            
            const amount = Math.round(amountInEGP * 100); // Convert EGP to piasters (1 EGP = 100 piasters)
            const merchantRef = `DURRAH_${clinicId}_${Date.now()}`;
            const trxDateTime = new Date().toGMTString();
            const secureHash = this.generateSecureHash(amount, merchantRef, trxDateTime);

            console.log('💳 PAYSKY payment parameters:', {
                MID: this.MID,
                TID: this.TID,
                AmountInEGP: amountInEGP,
                AmountInPiasters: amount,
                AmountType: typeof amount,
                AmountString: amount.toString(),
                MerchantRef: merchantRef,
                DateTime: trxDateTime,
                Hash: secureHash.substring(0, 10) + '...'
            });
            
            // Debug: Check if amount is correct (in piasters)
            const expectedPiasters = {
                400: 40000,   // 400 EGP = 40,000 piasters
                4000: 400000, // 4000 EGP = 400,000 piasters
                1: 100,      // 1 EGP = 100 piasters
                0.01: 1      // 0.01 EGP = 1 piaster
            };
            
            if (!Object.values(expectedPiasters).includes(amount)) {
                console.warn('⚠️ Unexpected amount value:', { amountInEGP, amountInPiasters: amount });
            }
            
            // Check if amount needs to be in a specific format for PAYSKY
            console.log('🔍 Amount format check:', {
                original: amount,
                asString: amount.toString(),
                asNumber: Number(amount),
                isInteger: Number.isInteger(amount)
            });

            // Define global variables that PAYSKY Lightbox expects
            window.isPayOnDelivery = false;
            window.TransactionType = 'SALE';

            // Configure PAYSKY Lightbox (following exact sample format)
            Lightbox.Checkout.configure = {
                MID: this.MID,
                TID: this.TID,
                AmountTrxn: amount,
                SecureHash: secureHash,
                MerchantReference: merchantRef,
                TrxDateTime: trxDateTime,
                completeCallback: (data) => this.handlePaymentSuccess(data, plan, clinicId, merchantRef),
                errorCallback: (error) => this.handlePaymentError(error, clinicId, merchantRef),
                cancelCallback: () => this.handlePaymentCancel(clinicId, merchantRef)
            };

            // Simple approach - just configure and show (like the working test)
            console.log('✅ PAYSKY configured successfully');

            // Create payment record
            const paymentId = await this.createPaymentRecord(plan, clinicId, merchantRef, amount);
            console.log('📝 Payment record created:', paymentId);

            // Show PAYSKY Lightbox
            console.log('🎨 Showing PAYSKY Lightbox...');
            Lightbox.Checkout.showLightbox();
            
        } catch (error) {
            console.error('❌ PAYSKY payment error:', error);
            this.showError('Payment initialization failed: ' + error.message);
        }
    }

    getPlanDetails(plan) {
        const plans = {
            'MONTHLY': { name: 'Monthly Premium', price: 400, description: 'Monthly subscription' },
            'ANNUAL': { name: 'Annual Premium', price: 4000, description: 'Annual subscription' },
            'TEST': { name: 'Test Payment', price: 1, description: 'Test payment for debugging' },
            'MINIMAL': { name: 'Minimal Test', price: 0.01, description: 'Minimal test payment (1 piaster)' }
        };
        return plans[plan] || plans['MONTHLY'];
    }

    async createPaymentRecord(plan, clinicId, merchantRef, amount) {
        try {
            // Check for pending coupon
            const pendingCoupon = localStorage.getItem('pendingCoupon');
            let couponInfo = null;
            
            if (pendingCoupon) {
                try {
                    couponInfo = JSON.parse(pendingCoupon);
                } catch (e) {
                    console.warn('Invalid coupon data in localStorage');
                }
            }
            
            const paymentData = {
                clinicId: clinicId,
                plan: plan,
                amount: amount,
                currency: 'EGP',
                merchantReference: merchantRef,
                status: 'pending',
                paymentMethod: 'paysky',
                createdAt: serverTimestamp(),
                couponInfo: couponInfo // Store coupon information
            };
            
            const paymentRef = await addDoc(collection(db, 'payments'), paymentData);
            console.log('✅ Payment record created:', paymentRef.id);
            return paymentRef.id;
        } catch (error) {
            console.error('❌ Error creating payment record:', error);
            throw error;
        }
    }

    async handlePaymentSuccess(data, plan, clinicId, merchantRef) {
        try {
            console.log('🎉 Payment successful!', data);
            
            // Update payment record
            await this.updatePaymentRecord(merchantRef, 'completed', data);
            
            // Generate license automatically
            const licenseCode = await this.generateAndActivateLicense(plan, clinicId, merchantRef);
            
            // Show success message
            this.showPaymentSuccess(plan, licenseCode);
            
            // Refresh subscription status after delay
            setTimeout(() => {
                console.log('🔄 Refreshing page...');
                window.location.reload();
            }, 5000);
            
        } catch (error) {
            console.error('❌ Payment success handling error:', error);
            this.showError('Payment successful but activation failed. Please contact support with reference: ' + merchantRef);
        }
    }

    async handlePaymentError(error, clinicId, merchantRef) {
        console.error('❌ Payment error:', error);
        this.showError('Payment failed: ' + error);
        
        // Update payment record
        await this.updatePaymentRecord(merchantRef, 'failed', { error: error });
    }

    async handlePaymentCancel(clinicId, merchantRef) {
        console.log('⚠️ Payment cancelled by user');
        this.showInfo('Payment cancelled');
        
        // Update payment record
        await this.updatePaymentRecord(merchantRef, 'cancelled', { reason: 'user_cancelled' });
    }

    async updatePaymentRecord(merchantRef, status, data) {
        try {
            const paymentsRef = collection(db, 'payments');
            const q = query(paymentsRef, where('merchantReference', '==', merchantRef));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const paymentDoc = querySnapshot.docs[0];
                const updateData = {
                    status: status,
                    payskyResponse: data,
                    updatedAt: serverTimestamp()
                };
                
                if (status === 'completed') {
                    updateData.completedAt = serverTimestamp();
                } else if (status === 'failed') {
                    updateData.failedAt = serverTimestamp();
                }
                
                await updateDoc(paymentDoc.ref, updateData);
                console.log('✅ Payment record updated:', status);
            }
        } catch (error) {
            console.error('❌ Error updating payment record:', error);
        }
    }

    async generateAndActivateLicense(plan, clinicId, merchantRef) {
        try {
            console.log('🔑 Generating license for payment...');
            
            // Generate unique license code
            const licenseCode = this.generateLicenseCode();
            console.log('🔑 Generated license code:', licenseCode);
            
            // Create license in database
            const licenseData = {
                code: licenseCode,
                plan: plan,
                status: 'unused',
                createdBy: 'paysky-payment',
                createdAt: serverTimestamp(),
                clinicId: clinicId,
                merchantReference: merchantRef,
                isActive: true,
                autoGenerated: true
            };
            
            await addDoc(collection(db, 'licenses'), licenseData);
            console.log('✅ License created in database');
            
            // Activate subscription immediately
            await this.activateSubscription(licenseCode, plan, clinicId);
            console.log('✅ Subscription activated');
            
            return licenseCode;
        } catch (error) {
            console.error('❌ Error generating license:', error);
            throw error;
        }
    }

    generateLicenseCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            if (i > 0 && i % 4 === 0) result += '-';
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async activateSubscription(licenseCode, plan, clinicId) {
        try {
            const clinicRef = doc(db, 'clinics', clinicId);
            const now = new Date();
            const endDate = new Date(now.getTime() + (plan === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000);
            
            // Check for pending coupon
            const pendingCoupon = localStorage.getItem('pendingCoupon');
            let couponInfo = null;
            
            if (pendingCoupon) {
                try {
                    couponInfo = JSON.parse(pendingCoupon);
                    // Clear the pending coupon after use
                    localStorage.removeItem('pendingCoupon');
                } catch (e) {
                    console.warn('Invalid coupon data in localStorage');
                }
            }
            
            const subscriptionData = {
                plan: plan,
                status: 'active',
                startDate: serverTimestamp(),
                endDate: endDate,
                licenseCode: licenseCode,
                paymentMethod: 'paysky',
                activatedAt: serverTimestamp()
            };
            
            // Add coupon information if available
            if (couponInfo) {
                subscriptionData.couponCode = couponInfo.code;
                subscriptionData.couponType = couponInfo.type;
                subscriptionData.originalPrice = couponInfo.originalPrice;
                subscriptionData.finalPrice = couponInfo.finalPrice;
                subscriptionData.discountPercentage = couponInfo.discountPercentage;
            }
            
            await updateDoc(clinicRef, {
                subscription: subscriptionData,
                trialStatus: 'completed' // Mark trial as completed
            });
            
            console.log('✅ Subscription activated successfully');
        } catch (error) {
            console.error('❌ Error activating subscription:', error);
            throw error;
        }
    }

    showPaymentSuccess(plan, licenseCode) {
        // Remove any existing success modals
        const existingModal = document.getElementById('payskySuccessModal');
        if (existingModal) {
            existingModal.remove();
        }

        const successModal = document.createElement('div');
        successModal.id = 'payskySuccessModal';
        successModal.className = 'modal fade show';
        successModal.style.display = 'block';
        successModal.style.zIndex = '9999';
        successModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-check-circle me-2"></i>
                            Payment Successful!
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="alert alert-success">
                            <h6>🎉 Subscription Activated Successfully!</h6>
                            <p class="mb-2">Your ${plan} subscription is now active.</p>
                            <p class="mb-0"><strong>License Code:</strong> <code class="bg-light p-2 rounded">${licenseCode}</code></p>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-body">
                                        <h6>✅ What's Included</h6>
                                        <ul class="list-unstyled">
                                            <li><i class="bi bi-check text-success"></i> Unlimited doctors</li>
                                            <li><i class="bi bi-check text-success"></i> All premium features</li>
                                            <li><i class="bi bi-check text-success"></i> Patient portal management</li>
                                            <li><i class="bi bi-check text-success"></i> Backup & restore system</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-body">
                                        <h6>📧 Next Steps</h6>
                                        <p>You will receive a confirmation email with your license details.</p>
                                        <p>Your subscription is active immediately!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary btn-lg" onclick="window.location.reload()">
                            <i class="bi bi-arrow-right me-2"></i>
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(successModal);
        
        // Auto-close after 15 seconds
        setTimeout(() => {
            if (successModal.parentNode) {
                successModal.remove();
            }
        }, 15000);
    }

    showError(message) {
        // Use existing toast function if available
        if (typeof toast === 'function') {
            toast(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }

    showInfo(message) {
        // Use existing toast function if available
        if (typeof toast === 'function') {
            toast(message, 'info');
        } else {
            alert(message);
        }
    }
}

// Initialize PAYSKY integration
const paySkyIntegration = new PaySkyIntegration();

// Export for use in other modules
export { paySkyIntegration };

// Global function for payment modal
window.payWithPaySky = async function(plan) {
    try {
        const clinicId = localStorage.getItem('clinicId');
        if (!clinicId) {
            paySkyIntegration.showError('No clinic ID found. Please refresh the page.');
            return;
        }
        
        // Show loading state
        const payBtn = event.target;
        const originalText = payBtn.innerHTML;
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
        
        // Process payment with PAYSKY
        await paySkyIntegration.processPayment(plan, clinicId);
        
        // Reset button state after a delay
        setTimeout(() => {
            payBtn.disabled = false;
            payBtn.innerHTML = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('PAYSKY payment error:', error);
        paySkyIntegration.showError('Payment initialization failed. Please try again.');
        
        // Reset button state
        const payBtn = event.target;
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="bi bi-credit-card me-2"></i>Pay Now with PAYSKY';
    }
};

// Test payment function with 0.01 EGP for debugging (minimal charge)
window.testPaySkyWithMinimal = async function() {
    try {
        const clinicId = localStorage.getItem('clinicId');
        if (!clinicId) {
            paySkyIntegration.showError('No clinic ID found. Please refresh the page.');
            return;
        }
        
        console.log('🧪 Testing PAYSKY with 0.01 EGP (1 piaster)...');
        await paySkyIntegration.processPayment('MINIMAL', clinicId);
        
    } catch (error) {
        console.error('PAYSKY test payment error:', error);
        paySkyIntegration.showError('Test payment failed: ' + error.message);
    }
};

// Test payment function with 1 EGP for debugging
window.testPaySkyWith1EGP = async function() {
    try {
        const clinicId = localStorage.getItem('clinicId');
        if (!clinicId) {
            paySkyIntegration.showError('No clinic ID found. Please refresh the page.');
            return;
        }
        
        console.log('🧪 Testing PAYSKY with 1 EGP...');
        await paySkyIntegration.processPayment('TEST', clinicId);
        
    } catch (error) {
        console.error('PAYSKY test payment error:', error);
        paySkyIntegration.showError('Test payment failed: ' + error.message);
    }
};

// Simple test function that matches PAYSKY sample exactly
window.testPaySkySimple = function() {
    try {
        console.log('🧪 Testing PAYSKY with simple configuration...');
        
        // Initialize PAYSKY if not already done
        if (!window.Lightbox) {
            paySkyIntegration.showError('PAYSKY Lightbox not loaded. Please wait and try again.');
            return;
        }
        
        // Simple configuration matching the sample
        const AmountTrxn = "1";  // Test with 1 piaster (0.01 EGP - minimal charge)
        const MID = "53857";
        const TID = "29096795";
        const MerchantReference = "DURRAH_SIMPLE_" + Date.now();
        const Secret = "7e68887d8388946f828c489da7f818db";
        const TrxDateTime = new Date().toGMTString();
        
        console.log('🔧 Simple test configuration:', {
            AmountTrxn, MID, TID, MerchantReference, TrxDateTime
        });
        
        // Generate hash
        const hashing = `Amount=${AmountTrxn}&DateTimeLocalTrxn=${TrxDateTime}&MerchantId=${MID}&MerchantReference=${MerchantReference}&TerminalId=${TID}`;
        console.log('🔐 Hash string:', hashing);
        
        const secretKeyWordArray = CryptoJS.enc.Hex.parse(Secret);
        const hmac = CryptoJS.HmacSHA256(hashing, secretKeyWordArray);
        const hmacHex = hmac.toString(CryptoJS.enc.Hex);
        const SecureHash = hmacHex.toUpperCase();
        
        console.log('🔐 Generated hash:', SecureHash);
        
        // Configure exactly like the sample
        Lightbox.Checkout.configure = {
            MID: MID,
            TID: TID,
            AmountTrxn: AmountTrxn,
            SecureHash: SecureHash,
            MerchantReference: MerchantReference,
            TrxDateTime: TrxDateTime,
            completeCallback: function (data) {
                console.log('✅ Simple test completed successfully!');
                console.log('Payment data:', data);
                alert('✅ Simple test successful! Check console for details.');
            },
            errorCallback: function (error) {
                console.error('❌ Simple test error:', error);
                alert('❌ Simple test failed: ' + error);
            },
            cancelCallback: function () {
                console.log('⚠️ Simple test cancelled');
                alert('⚠️ Simple test cancelled');
            }
        };
        
        console.log('🎨 Showing PAYSKY Lightbox with simple config...');
        Lightbox.Checkout.showLightbox();
        
    } catch (error) {
        console.error('❌ Simple test error:', error);
        alert('❌ Simple test failed: ' + error.message);
    }
};

// Test function without 3DS (for debugging 3DS issues)
window.testPaySkyNo3DS = function() {
    try {
        console.log('🧪 Testing PAYSKY WITHOUT 3DS...');
        
        if (!window.Lightbox) {
            paySkyIntegration.showError('PAYSKY Lightbox not loaded. Please wait and try again.');
            return;
        }
        
        const AmountTrxn = "100";  // 1 EGP in piasters
        const MID = "53857";
        const TID = "29096795";
        const MerchantReference = "DURRAH_NO3DS_" + Date.now();
        const Secret = "7e68887d8388946f828c489da7f818db";
        const TrxDateTime = new Date().toGMTString();
        
        const hashing = `Amount=${AmountTrxn}&DateTimeLocalTrxn=${TrxDateTime}&MerchantId=${MID}&MerchantReference=${MerchantReference}&TerminalId=${TID}`;
        const secretKeyWordArray = CryptoJS.enc.Hex.parse(Secret);
        const hmac = CryptoJS.HmacSHA256(hashing, secretKeyWordArray);
        const hmacHex = hmac.toString(CryptoJS.enc.Hex);
        const SecureHash = hmacHex.toUpperCase();
        
        console.log('🔧 No-3DS test configuration:', {
            AmountTrxn, MID, TID, MerchantReference, TrxDateTime, SecureHash
        });
        
        Lightbox.Checkout.configure = {
            MID: MID,
            TID: TID,
            AmountTrxn: AmountTrxn,
            SecureHash: SecureHash,
            MerchantReference: MerchantReference,
            TrxDateTime: TrxDateTime,
            // Explicitly disable 3DS
            ThreeDSecure: false,
            completeCallback: function (data) {
                console.log('✅ No-3DS test completed successfully!');
                console.log('Payment data:', data);
                alert('✅ No-3DS test successful! Check console for details.');
            },
            errorCallback: function (error) {
                console.error('❌ No-3DS test error:', error);
                alert('❌ No-3DS test failed: ' + error);
            },
            cancelCallback: function () {
                console.log('⚠️ No-3DS test cancelled');
                alert('⚠️ No-3DS test cancelled');
            }
        };
        
        console.log('🎨 Showing PAYSKY Lightbox WITHOUT 3DS...');
        Lightbox.Checkout.showLightbox();
        
    } catch (error) {
        console.error('❌ No-3DS test error:', error);
        alert('❌ No-3DS test failed: ' + error.message);
    }
};

// Export global instance
window.paySkyIntegration = paySkyIntegration;

// Initialize PAYSKY when the page loads
document.addEventListener('DOMContentLoaded', () => {
    paySkyIntegration.initialize().catch(error => {
        console.error('Failed to initialize PAYSKY:', error);
    });
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded, initialize immediately
    paySkyIntegration.initialize().catch(error => {
        console.error('Failed to initialize PAYSKY (immediate):', error);
    });
}

// Export for module usage (already exported above)
