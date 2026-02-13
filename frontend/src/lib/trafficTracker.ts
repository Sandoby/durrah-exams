import { supabase } from './supabase';
import { canTrackAnalytics } from './cookieConsent';

// ============================================================
// Traffic Tracking Service
// Tracks page views, sessions, UTM params, device info, etc.
// ============================================================

const SESSION_KEY = 'durrah_traffic_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const GEO_CACHE_KEY = 'durrah_traffic_geo_cache';
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const GEO_EMPTY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SESSION_HEARTBEAT_MS = 30 * 1000; // 30 seconds

interface SessionData {
    id: string;
    startedAt: number;
    lastActivity: number;
    pageCount: number;
    totalDurationSeconds: number;
}

interface GeoCacheData {
    country: string | null;
    city: string | null;
    resolved: boolean;
    timestamp: number;
}

// Generate a unique session ID
function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Get or create session
function getSession(): SessionData {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            const session: SessionData = JSON.parse(stored);
            // Check if session expired
            if (Date.now() - session.lastActivity < SESSION_TIMEOUT) {
                return session;
            }
        }
    } catch {
        // ignore parse errors
    }

const newSession: SessionData = {
        id: generateSessionId(),
        startedAt: Date.now(),
        lastActivity: Date.now(),
        pageCount: 0,
        totalDurationSeconds: 0,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    return newSession;
}

function updateSession(session: SessionData): void {
    session.lastActivity = Date.now();
    session.pageCount += 1;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getCachedGeo(): { country: string | null; city: string | null } | null {
    try {
        const raw = localStorage.getItem(GEO_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GeoCacheData;
        const ttl = parsed.resolved ? GEO_CACHE_TTL : GEO_EMPTY_CACHE_TTL;
        if (Date.now() - parsed.timestamp > ttl) {
            localStorage.removeItem(GEO_CACHE_KEY);
            return null;
        }
        return { country: parsed.country, city: parsed.city };
    } catch {
        return null;
    }
}

function setCachedGeo(country: string | null, city: string | null) {
    try {
        const payload: GeoCacheData = {
            country,
            city,
            resolved: Boolean(country || city),
            timestamp: Date.now(),
        };
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // no-op
    }
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function getGeoInfo(): Promise<{ country: string | null; city: string | null }> {
    const cached = getCachedGeo();
    if (cached) return cached;

    let country: string | null = null;
    let city: string | null = null;

    const providers = [
        async () => {
            const payload = await fetchJsonWithTimeout('https://ipapi.co/json/');
            if (!payload || payload.error) return null;
            return { country: payload.country_name || payload.country || null, city: payload.city || null };
        },
        async () => {
            const payload = await fetchJsonWithTimeout('https://ipwho.is/');
            if (!payload || payload.success === false) return null;
            return { country: payload.country || null, city: payload.city || null };
        },
        async () => {
            const payload = await fetchJsonWithTimeout('https://ipwhois.app/json/');
            if (!payload || payload.success === false) return null;
            return { country: payload.country || null, city: payload.city || null };
        },
    ];

    for (const provider of providers) {
        const geo = await provider();
        if (geo?.country || geo?.city) {
            country = geo.country;
            city = geo.city;
            break;
        }
    }

    setCachedGeo(country, city);
    return { country, city };
}

function addSessionDuration(session: SessionData, durationSeconds: number): void {
    session.totalDurationSeconds += durationSeconds;
    session.lastActivity = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Parse user agent for device/browser/OS info
function getDeviceInfo() {
    const ua = navigator.userAgent;

    // Device type
    let deviceType = 'desktop';
    if (/Mobi|Android/i.test(ua)) {
        deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
    } else if (/iPad/i.test(ua)) {
        deviceType = 'tablet';
    }

    // Browser
    let browser = 'Unknown';
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
    else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
    else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'IE';

    // OS
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('CrOS')) os = 'ChromeOS';

    return { deviceType, browser, os };
}

// Extract UTM parameters from current URL
function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        utm_term: params.get('utm_term') || null,
        utm_content: params.get('utm_content') || null,
    };
}

// Clean referrer - remove own domain
function getCleanReferrer(): string | null {
    const referrer = document.referrer;
    if (!referrer) return null;

    try {
        const refUrl = new URL(referrer);
        // If referrer is our own site, treat as null (internal navigation)
        if (refUrl.hostname === window.location.hostname) return null;
        return referrer;
    } catch {
        return referrer;
    }
}

// Track a page view
let pageEnterTime = 0;
let currentPagePath = '';
let unloadTrackingInitialized = false;
let heartbeatIntervalId: number | null = null;

export async function trackPageView(path: string): Promise<void> {
    if (!canTrackAnalytics()) return;

    // Avoid tracking admin pages themselves to prevent noise
    if (path.startsWith('/admin')) return;

    // Flush previous page duration
    if (currentPagePath && pageEnterTime > 0) {
        const duration = Math.round((Date.now() - pageEnterTime) / 1000);
        if (duration > 0 && duration < 3600) {
            // Update previous page view duration (fire and forget)
            updatePreviousPageDuration(currentPagePath, duration);
            const durationSession = getSession();
            addSessionDuration(durationSession, duration);
        }
    }

    pageEnterTime = Date.now();
    currentPagePath = path;

    const session = getSession();
    const isFirstPage = session.pageCount === 0;
    updateSession(session);

    const { deviceType, browser, os } = getDeviceInfo();
    const geo = await getGeoInfo();
    const utmParams = getUTMParams();
    const referrer = isFirstPage ? getCleanReferrer() : null;

    // Get current user ID if authenticated
    let userId: string | null = null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
    } catch {
        // not authenticated
    }

    const pageViewData = {
        session_id: session.id,
        user_id: userId,
        path,
        page_title: document.title,
        referrer,
        ...utmParams,
        device_type: deviceType,
        browser,
        os,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        language: navigator.language?.split('-')[0] || null,
        country: geo.country,
        city: geo.city,
        is_bounce: session.pageCount <= 1,
    };

    try {
        await supabase.from('page_views').insert(pageViewData);
    } catch (err) {
        console.error('[Traffic] Failed to record page view:', err);
    }

    // Upsert session
    const sessionData = {
        id: session.id,
        user_id: userId,
        first_page: isFirstPage ? path : undefined,
        last_page: path,
        referrer: isFirstPage ? referrer : undefined,
        utm_source: isFirstPage ? utmParams.utm_source : undefined,
        utm_medium: isFirstPage ? utmParams.utm_medium : undefined,
        utm_campaign: isFirstPage ? utmParams.utm_campaign : undefined,
        device_type: deviceType,
        browser,
        os,
        language: navigator.language?.split('-')[0] || null,
        country: geo.country,
        city: geo.city,
        page_count: session.pageCount,
        is_bounce: session.pageCount <= 1,
        ended_at: new Date().toISOString(),
    };

    try {
        if (isFirstPage) {
            await supabase.from('traffic_sessions').insert({
                ...sessionData,
                started_at: new Date(session.startedAt).toISOString(),
            });
        } else {
            // Update existing session
            await supabase
                .from('traffic_sessions')
                .update({
                    last_page: path,
                    page_count: session.pageCount,
                    is_bounce: false,
                    ended_at: new Date().toISOString(),
                    user_id: userId,
                    total_duration_seconds: session.totalDurationSeconds,
                })
                .eq('id', session.id);
        }
    } catch (err) {
        console.error('[Traffic] Failed to update session:', err);
    }
}

// Update duration for the previous page view
async function updatePreviousPageDuration(path: string, duration: number): Promise<void> {
    try {
        const session = getSession();
        const { data: latestPageView } = await supabase
            .from('page_views')
            .select('id')
            .eq('session_id', session.id)
            .eq('path', path)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!latestPageView?.id) {
            return;
        }

        await supabase
            .from('page_views')
            .update({ duration_seconds: duration, is_bounce: false })
            .eq('id', latestPageView.id);

        await supabase
            .from('traffic_sessions')
            .update({
                total_duration_seconds: session.totalDurationSeconds + duration,
                ended_at: new Date().toISOString(),
            })
            .eq('id', session.id);
    } catch {
        // silent fail - duration tracking is best-effort
    }
}

// Handle page unload - update final duration
export function setupUnloadTracking(): void {
    if (unloadTrackingInitialized) return;
    unloadTrackingInitialized = true;

    const touchSession = async () => {
        if (!canTrackAnalytics()) return;
        if (!currentPagePath) return;
        try {
            const session = getSession();
            await supabase
                .from('traffic_sessions')
                .update({
                    ended_at: new Date().toISOString(),
                    last_page: currentPagePath,
                    page_count: session.pageCount,
                })
                .eq('id', session.id);
        } catch {
            // silent fail - realtime freshness is best-effort
        }
    };

    const startHeartbeat = () => {
        if (heartbeatIntervalId !== null) return;
        heartbeatIntervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                touchSession();
            }
        }, SESSION_HEARTBEAT_MS);
    };

    const handler = () => {
        if (!canTrackAnalytics()) return;
        if (currentPagePath && pageEnterTime > 0) {
            const duration = Math.round((Date.now() - pageEnterTime) / 1000);
            if (duration > 0 && duration < 3600) {
                updatePreviousPageDuration(currentPagePath, duration);
            }
        }
        touchSession();
    };

    startHeartbeat();
    window.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            handler();
        }
    });
}

export function createTrackedPath(pathname: string, search: string): string {
    void search;
    const cleanedPath = pathname
        .split('?')[0]
        .replace(/\/+$/, '');
    return cleanedPath || '/';
}

export async function trackTrafficEvent({
    eventName,
    category,
    value,
    metadata,
    path,
}: {
    eventName: string;
    category?: string;
    value?: number;
    metadata?: Record<string, unknown>;
    path?: string;
}): Promise<void> {
    if (!canTrackAnalytics()) return;

    try {
        const session = getSession();
        let userId: string | null = null;
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id || null;

        await supabase.from('traffic_events').insert({
            session_id: session.id,
            user_id: userId,
            path: path || currentPagePath || window.location.pathname,
            event_name: eventName,
            event_category: category || null,
            event_value: typeof value === 'number' ? value : null,
            metadata: metadata || {},
        });
    } catch (error) {
        console.error('[Traffic] Failed to record event:', error);
    }
}
