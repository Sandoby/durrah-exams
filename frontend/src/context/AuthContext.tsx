import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'agent' | 'tutor' | 'student' | null;
type SubscriptionStatus = 'active' | 'trialing' | 'payment_failed' | 'cancelled' | 'expired' | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt: string | null;
    isTrialing: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(null);
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const profileChannelRef = useRef<any>(null);

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, subscription_status, trial_ends_at')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                setRole('tutor'); // Default to tutor if error
                setSubscriptionStatus(null);
                setTrialEndsAt(null);
                return;
            }
            setRole(data?.role || 'tutor');
            setSubscriptionStatus(data?.subscription_status || null);
            setTrialEndsAt(data?.trial_ends_at || null);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setRole('tutor'); // Default to tutor if error
            setSubscriptionStatus(null);
            setTrialEndsAt(null);
        }
    };

    const syncDodoSubscription = async () => {
        try {
            const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
            if (!convexUrl) return;
            const siteUrl = convexUrl.replace('.cloud', '.site');

            const { data } = await supabase.auth.getSession();
            const accessToken = data?.session?.access_token;
            if (!accessToken) return;

            await fetch(`${siteUrl}/syncDodoSubscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({})
            });
        } catch (error) {
            console.warn('Dodo subscription sync skipped:', error);
        }
    };

    const setupProfileRealtime = (userId: string) => {
        if (profileChannelRef.current) {
            supabase.removeChannel(profileChannelRef.current);
            profileChannelRef.current = null;
        }

        const channel = supabase
            .channel(`profile-sync-${userId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                (payload: any) => {
                    const nextStatus = payload?.new?.subscription_status as SubscriptionStatus | undefined;
                    const nextRole = payload?.new?.role as UserRole | undefined;
                    const nextTrialEndsAt = payload?.new?.trial_ends_at as string | undefined;
                    if (typeof nextStatus !== 'undefined') {
                        setSubscriptionStatus(nextStatus ?? null);
                    }
                    if (typeof nextRole !== 'undefined') {
                        setRole(nextRole ?? 'tutor');
                    }
                    if (typeof nextTrialEndsAt !== 'undefined') {
                        setTrialEndsAt(nextTrialEndsAt ?? null);
                    }
                }
            )
            .subscribe();

        profileChannelRef.current = channel;
    };

    const cacheSession = (sessionData: Session | null, userData: User | null) => {
        if (sessionData && userData) {
            localStorage.setItem('cached_session', JSON.stringify(sessionData));
            localStorage.setItem('cached_user', JSON.stringify(userData));
            localStorage.setItem('session_timestamp', Date.now().toString());
        } else {
            localStorage.removeItem('cached_session');
            localStorage.removeItem('cached_user');
            localStorage.removeItem('session_timestamp');
        }
    };

    const getCachedSession = () => {
        try {
            const cached = localStorage.getItem('cached_session');
            const user = localStorage.getItem('cached_user');
            const timestamp = localStorage.getItem('session_timestamp');

            if (cached && user && timestamp) {
                // Session valid for 60 days (extended from 30)
                const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
                if (parseInt(timestamp) > sixtyDaysAgo) {
                    return {
                        session: JSON.parse(cached),
                        user: JSON.parse(user)
                    };
                } else {
                    // Clean up expired cache
                    localStorage.removeItem('cached_session');
                    localStorage.removeItem('cached_user');
                    localStorage.removeItem('session_timestamp');
                }
            }
        } catch (error) {
            console.error('Error reading cached session:', error);
        }
        return null;
    };

    const checkCustomAuth = () => {
        const isAgentAuth = sessionStorage.getItem('agent_authenticated') === 'true';
        if (isAgentAuth) {
            const agentRole = sessionStorage.getItem('agent_role') as UserRole;
            const agentId = sessionStorage.getItem('agent_id');
            const agentEmail = sessionStorage.getItem('agent_email');

            if (agentRole && agentId) {
                setRole(agentRole);
                setSubscriptionStatus('active'); // Agents essentially have active access
                // Create a mock user object for the context
                setUser({
                    id: agentId,
                    email: agentEmail || '',
                    app_metadata: {},
                    user_metadata: { name: sessionStorage.getItem('agent_name') || '' },
                    aud: 'authenticated',
                    created_at: new Date().toISOString()
                } as User);
                setLoading(false);
                return true;
            }
        }
        return false;
    };

    useEffect(() => {
        let isMounted = true;

        // Set a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth initialization timeout - proceeding anyway');
                setLoading(false);
            }
        }, 10000);

        const initAuth = async () => {
            // Check custom auth first
            const hasCustomAuth = checkCustomAuth();

            if (!hasCustomAuth) {
                // Try to use cached session first
                const cachedData = getCachedSession();
                if (cachedData?.session && cachedData?.user) {
                    if (!isMounted) return;
                    setSession(cachedData.session);
                    setUser(cachedData.user);
                    // Fetch profile but don't block on it
                    fetchUserProfile(cachedData.user.id).catch(err => {
                        console.error('Profile fetch failed:', err);
                    });
                    syncDodoSubscription().catch(err => {
                        console.warn('Dodo sync failed:', err);
                    });
                    setupProfileRealtime(cachedData.user.id);
                    setLoading(false);
                    clearTimeout(loadingTimeout);
                    return;
                }

                // No cache, check active sessions
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!isMounted) return;

                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        // Cache the session
                        cacheSession(session, session.user);
                        // Fetch profile but don't block on it
                        fetchUserProfile(session.user.id).catch(err => {
                            console.error('Profile fetch failed:', err);
                        });
                        syncDodoSubscription().catch(err => {
                            console.warn('Dodo sync failed:', err);
                        });
                        setupProfileRealtime(session.user.id);
                    }

                    setLoading(false);
                    clearTimeout(loadingTimeout);
                } catch (error) {
                    if (!isMounted) return;
                    console.error('Error initializing auth:', error);
                    setLoading(false);
                    clearTimeout(loadingTimeout);
                }
            } else {
                clearTimeout(loadingTimeout);
            }
        };

        initAuth();

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Cache the session on auth state change
                cacheSession(session, session.user);
                // Fetch profile but don't block
                fetchUserProfile(session.user.id).catch(err => {
                    console.error('Profile fetch failed:', err);
                });
                syncDodoSubscription().catch(err => {
                    console.warn('Dodo sync failed:', err);
                });
                setupProfileRealtime(session.user.id);
            } else {
                // Clear cache on sign out
                cacheSession(null, null);
                if (profileChannelRef.current) {
                    supabase.removeChannel(profileChannelRef.current);
                    profileChannelRef.current = null;
                }
                // If signed out from Supabase, check if custom auth is active
                if (!checkCustomAuth()) {
                    setRole(null);
                    setSubscriptionStatus(null);
                    setTrialEndsAt(null);
                }
            }

            setLoading(false);
        });

        // Periodically refresh session to keep it alive (every 30 minutes)
        const refreshInterval = setInterval(async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    const { data, error } = await supabase.auth.refreshSession();
                    if (!error && data.session) {
                        cacheSession(data.session, data.session.user);
                    }
                }
            } catch (error) {
                console.error('Session refresh failed:', error);
            }
        }, 30 * 60 * 1000); // 30 minutes

        // Refresh session when user returns to the tab
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                try {
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    if (currentSession) {
                        const { data, error } = await supabase.auth.refreshSession();
                        if (!error && data.session) {
                            cacheSession(data.session, data.session.user);
                        }
                    }
                } catch (error) {
                    console.error('Session refresh on visibility change failed:', error);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            clearTimeout(loadingTimeout);
            clearInterval(refreshInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (profileChannelRef.current) {
                supabase.removeChannel(profileChannelRef.current);
                profileChannelRef.current = null;
            }
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        cacheSession(null, null);
        if (profileChannelRef.current) {
            supabase.removeChannel(profileChannelRef.current);
            profileChannelRef.current = null;
        }
        sessionStorage.removeItem('agent_authenticated');
        sessionStorage.removeItem('agent_role');
        sessionStorage.removeItem('agent_id');
        sessionStorage.removeItem('agent_email');
        sessionStorage.removeItem('agent_name');
        setRole(null);
        setSubscriptionStatus(null);
        setTrialEndsAt(null);
        setUser(null);
    };

    const isTrialing = subscriptionStatus === 'trialing';

    // Show loading spinner instead of blank screen
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, session, role, subscriptionStatus, trialEndsAt, isTrialing, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
