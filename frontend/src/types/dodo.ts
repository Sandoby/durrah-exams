/**
 * TypeScript Types for Dodo Payments Inline Checkout Integration
 */

// Re-export Dodo SDK types for convenience
export type {
  CheckoutBreakdownData,
  CheckoutEvent,
  ThemeConfig,
  ThemeModeConfig,
} from 'dodopayments-checkout';

/**
 * Plan types available in Durrah Exams
 */
export type Plan = 'basic' | 'pro';

/**
 * Billing cycle options
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Payment provider types
 */
export type PaymentProvider = 'dodo' | 'paysky' | 'kashier';

/**
 * Payment status from verification
 */
export type PaymentStatus =
  | 'idle'
  | 'creating_session'
  | 'loading_checkout'
  | 'ready'
  | 'processing'
  | 'verifying'
  | 'succeeded'
  | 'failed';

/**
 * Subscription status from database
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'payment_failed'
  | 'cancelled'
  | 'expired';

/**
 * Dodo product IDs for different billing cycles
 */
export interface DodoProductIds {
  monthly: string;
  yearly: string;
}

/**
 * Checkout session response from backend
 */
export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId?: string;
  customerId?: string;
  error?: string;
}

/**
 * Payment verification response from backend
 */
export interface PaymentVerificationResponse {
  status: SubscriptionStatus;
  subscriptionId?: string;
  endDate?: string;
  error?: string;
}

/**
 * Pricing information for a plan
 */
export interface PlanPricing {
  monthly: number; // Amount in cents
  yearly: number; // Amount in cents
  currency: string;
  yearlyDiscount?: number; // Percentage
}

/**
 * Plan details for display
 */
export interface PlanDetails {
  id: Plan;
  name: string;
  description: string;
  features: string[];
  pricing: PlanPricing;
  isPopular?: boolean;
}

/**
 * Coupon information
 */
export interface CouponInfo {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isValid: boolean;
  error?: string;
}

/**
 * Order summary data to display
 */
export interface OrderSummaryData {
  plan: Plan;
  planName: string;
  billingCycle: BillingCycle;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  total: number | null;
  currency: string;
  couponCode?: string;
}

/**
 * Checkout error information
 */
export interface CheckoutError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Props for OrderSummary component
 */
export interface OrderSummaryProps {
  plan: Plan;
  billingCycle: BillingCycle;
  breakdown: import('dodopayments-checkout').CheckoutBreakdownData | null;
  couponCode?: string;
  loading?: boolean;
}

/**
 * Props for DodoInlineCheckout component
 */
export interface DodoInlineCheckoutProps {
  checkoutUrl: string;
  mode: 'test' | 'live';
  onBreakdownUpdate: (breakdown: import('dodopayments-checkout').CheckoutBreakdownData) => void;
  onStatusUpdate: (status: string) => void;
  onError: (error: CheckoutError) => void;
  onRedirectRequested?: (url: string) => void;
}

/**
 * Props for PlanSelector component
 */
export interface PlanSelectorProps {
  selectedPlan: Plan;
  onPlanChange: (plan: Plan) => void;
  disabled?: boolean;
  availablePlans?: PlanDetails[];
}

/**
 * Props for BillingCycleToggle component
 */
export interface BillingCycleToggleProps {
  cycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  disabled?: boolean;
  showDiscount?: boolean;
  discountPercentage?: number;
}

/**
 * Props for CouponInput component
 */
export interface CouponInputProps {
  onApplyCoupon: (code: string) => Promise<CouponInfo>;
  onRemoveCoupon: () => void;
  appliedCoupon?: CouponInfo;
  disabled?: boolean;
}

/**
 * useDodoCheckout hook return type
 */
export interface UseDodoCheckoutReturn {
  isReady: boolean;
  breakdown: import('dodopayments-checkout').CheckoutBreakdownData | null;
  error: CheckoutError | null;
}

/**
 * useDodoCheckout hook options
 */
export interface UseDodoCheckoutOptions {
  mode: 'test' | 'live';
  checkoutUrl: string;
  elementId: string;
  onBreakdownUpdate?: (breakdown: import('dodopayments-checkout').CheckoutBreakdownData) => void;
  onStatusUpdate?: (status: string) => void;
  onError?: (error: CheckoutError) => void;
  onRedirectRequested?: (url: string) => void;
  themeConfig?: import('dodopayments-checkout').ThemeConfig;
}

/**
 * usePaymentVerification hook options
 */
export interface UsePaymentVerificationOptions {
  userId: string;
  shouldVerify: boolean;
  onSuccess: () => void;
  onFailed: () => void;
  onTimeout?: () => void;
  maxAttempts?: number;
  pollInterval?: number; // in milliseconds
}

/**
 * usePaymentVerification hook return type
 */
export interface UsePaymentVerificationReturn {
  isVerifying: boolean;
  attempts: number;
  error: CheckoutError | null;
}

/**
 * Environment configuration
 */
export interface CheckoutEnvironmentConfig {
  mode: 'test' | 'live';
  convexUrl: string;
  appUrl: string;
  productIds: DodoProductIds;
}
