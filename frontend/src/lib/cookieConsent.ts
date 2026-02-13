export type CookieConsent = {
    version: number;
    necessary: true;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    decidedAt: string;
};

const CONSENT_VERSION = 1;
const CONSENT_STORAGE_KEY = 'durrah_cookie_consent';
const CONSENT_COOKIE_KEY = 'durrah_cookie_consent';
const CONSENT_COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days

function parseConsent(raw: string | null): CookieConsent | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as CookieConsent;
        if (typeof parsed !== 'object' || parsed === null) return null;
        if (parsed.version !== CONSENT_VERSION) return null;
        return {
            version: CONSENT_VERSION,
            necessary: true,
            analytics: Boolean(parsed.analytics),
            marketing: Boolean(parsed.marketing),
            preferences: Boolean(parsed.preferences),
            decidedAt: parsed.decidedAt || new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const escapedName = name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function setConsentCookie(consent: CookieConsent): void {
    if (typeof document === 'undefined') return;
    const serialized = encodeURIComponent(JSON.stringify(consent));
    const securePart = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE_KEY}=${serialized}; Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${securePart}`;
}

export function getCookieConsent(): CookieConsent | null {
    if (typeof window === 'undefined') return null;

    const fromStorage = parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
    if (fromStorage) return fromStorage;

    const fromCookie = parseConsent(getCookie(CONSENT_COOKIE_KEY));
    if (fromCookie) {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fromCookie));
        return fromCookie;
    }

    return null;
}

export function hasCookieConsentDecision(): boolean {
    return getCookieConsent() !== null;
}

export function setCookieConsent(partial: {
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
}): CookieConsent {
    const consent: CookieConsent = {
        version: CONSENT_VERSION,
        necessary: true,
        analytics: partial.analytics,
        marketing: partial.marketing,
        preferences: partial.preferences,
        decidedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    }
    setConsentCookie(consent);
    window.dispatchEvent(new CustomEvent('durrah:cookie-consent-updated', { detail: consent }));
    return consent;
}

export function canTrackAnalytics(): boolean {
    const consent = getCookieConsent();
    return Boolean(consent?.analytics);
}
