import { supabase } from './supabase';
import { canTrackAnalytics, getCookieConsent } from './cookieConsent';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export function canTrackMarketing(): boolean {
  const consent = getCookieConsent();
  return Boolean(consent?.marketing);
}

// SHA-256 hashing utility using native web crypto API
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Track page views on client-side route changes
export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  const gaId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  if (gaId && gaId !== 'G-XXXX' && window.gtag && canTrackAnalytics()) {
    window.gtag('event', 'page_view', { page_path: path });
  }

  // Meta Pixel
  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  if (pixelId && pixelId !== 'XXXX' && window.fbq && canTrackMarketing()) {
    window.fbq('track', 'PageView');
  }
}

// Track registration complete event
export async function trackSignup(email?: string) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (window.gtag && canTrackAnalytics()) {
    window.gtag('event', 'sign_up', { method: email ? 'email' : 'oauth' });
  }

  // Meta Pixel
  if (window.fbq && canTrackMarketing()) {
    window.fbq('track', 'CompleteRegistration');
  }

  // Meta Conversions API (CAPI)
  if (canTrackMarketing()) {
    try {
      let hashedEmail = '';
      if (email) {
        hashedEmail = await sha256(email);
      } else {
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          hashedEmail = await sha256(data.user.email);
        }
      }

      const fbp = getCookie('_fbp');
      const fbc = getCookie('_fbc');

      await supabase.functions.invoke('meta-capi', {
        body: {
          eventName: 'CompleteRegistration',
          hashedEmail,
          clientUserAgent: navigator.userAgent,
          fbp,
          fbc,
          eventSourceUrl: window.location.href,
        },
      });
    } catch (err) {
      console.error('[Analytics] Failed to send CompleteRegistration to Meta CAPI:', err);
    }
  }
}

// Track exam created event
export function trackExamCreated() {
  if (typeof window === 'undefined') return;

  if (window.gtag && canTrackAnalytics()) {
    window.gtag('event', 'create_exam', { event_category: 'engagement' });
  }

  if (window.fbq && canTrackMarketing()) {
    window.fbq('trackCustom', 'CreateExam');
  }
}

// Track trial start event (typically when creating the first exam)
export function trackTrialStart() {
  if (typeof window === 'undefined') return;

  if (window.gtag && canTrackAnalytics()) {
    window.gtag('event', 'start_trial', { event_category: 'engagement' });
  }

  if (window.fbq && canTrackMarketing()) {
    window.fbq('trackCustom', 'StartTrial');
  }
}

// Track subscription/purchase event
export async function trackPurchase(value: number, currency: string, orderId: string, email?: string) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (window.gtag && canTrackAnalytics()) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value: value,
      currency: currency,
    });
  }

  // Meta Pixel
  if (window.fbq && canTrackMarketing()) {
    window.fbq('track', 'Purchase', {
      value: value,
      currency: currency,
    });
  }

  // Meta Conversions API (CAPI)
  if (canTrackMarketing()) {
    try {
      let hashedEmail = '';
      if (email) {
        hashedEmail = await sha256(email);
      } else {
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          hashedEmail = await sha256(data.user.email);
        }
      }

      const fbp = getCookie('_fbp');
      const fbc = getCookie('_fbc');

      await supabase.functions.invoke('meta-capi', {
        body: {
          eventName: 'Purchase',
          hashedEmail,
          clientUserAgent: navigator.userAgent,
          fbp,
          fbc,
          eventSourceUrl: window.location.href,
          customData: {
            value,
            currency,
            transaction_id: orderId,
          },
        },
      });
    } catch (err) {
      console.error('[Analytics] Failed to send Purchase to Meta CAPI:', err);
    }
  }
}

// Track interactive demo scenario engagement
export function trackLead(scenarioId: string) {
  if (typeof window === 'undefined') return;

  if (window.gtag && canTrackAnalytics()) {
    window.gtag('event', 'generate_lead', { event_category: 'engagement', scenario: scenarioId });
  }

  if (window.fbq && canTrackMarketing()) {
    window.fbq('track', 'Lead', { content_name: scenarioId });
  }
}
