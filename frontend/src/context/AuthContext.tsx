import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

type UserRole = 'admin' | 'agent' | 'tutor' | 'student' | null;
type SubscriptionStatus = 'active' | 'trialing' | 'on_hold' | 'payment_failed' | 'cancelled' | 'expired' | 'pending' | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    subscriptionStatus: SubscriptionStatus;
    subscriptionEndDate: string | null;
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
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const profileChannelRef = useRef<any>(null);

    const isRateLimitError = (error: any) => {
        const status = error?.status;
        const message = String(error?.message || '').toLowerCase();
        return status === 429 || message.includes('too many requests');
    };

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, subscription_status, subscription_end_date, trial_ends_at')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                setRole('tutor'); // Default to tutor if error
                setSubscriptionStatus(null);
                setSubscriptionEndDate(null);
                setTrialEndsAt(null);
                return;
            }
            setRole(data?.role || 'tutor');
            setSubscriptionStatus(data?.subscription_status || null);
            setSubscriptionEndDate(data?.subscription_end_date || null);
            setTrialEndsAt(data?.trial_ends_at || null);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setRole('tutor'); // Default to tutor if error
            setSubscriptionStatus(null);
            setSubscriptionEndDate(null);
            setTrialEndsAt(null);
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
                    const nextEndDate = payload?.new?.subscription_end_date as string | undefined;
                    if (typeof nextStatus !== 'undefined') {
                        setSubscriptionStatus(prevStatus => {
                            // Show toast when subscription expires while the app is open
                            if (nextStatus === 'expired' && prevStatus !== 'expired' && prevStatus !== null) {
                                toast.error('Your subscription has expired. Renew to keep access.', {
                                    duration: 8000,
                                    id: 'subscription-expired',
                                });
                            }
                            // Show toast when payment succeeds after a failed payment
                            if (nextStatus === 'active' && (prevStatus === 'payment_failed' || prevStatus === 'on_hold')) {
                                toast.success('Payment successful! Your subscription has been renewed.', {
                                    duration: 6000,
                                    id: 'subscription-renewed',
                                });
                            }
                            // Show warning toast when payment fails
                            if ((nextStatus === 'payment_failed' || nextStatus === 'on_hold') && prevStatus !== 'payment_failed' && prevStatus !== 'on_hold') {
                                toast.error('Your latest payment failed. Please update your payment method in the Customer Portal to avoid losing access.', {
                                    duration: 10000,
                                    id: 'payment-failed',
                                });
                            }
                            return nextStatus ?? null;
                        });
                    }
                    if (typeof nextRole !== 'undefined') {
                        setRole(nextRole ?? 'tutor');
                    }
                    if (typeof nextTrialEndsAt !== 'undefined') {
                        setTrialEndsAt(nextTrialEndsAt ?? null);
                    }
                    if (typeof nextEndDate !== 'undefined') {
                        setSubscriptionEndDate(nextEndDate ?? null);
                    }
                }
            )
            .subscribe();

        profileChannelRef.current = channel;
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

        const handleAuthRateLimited = () => {
            toast.error('Too many authentication attempts. Please wait a minute and sign in again.', {
                id: 'auth-rate-limit',
                duration: 7000,
            });
        };

        window.addEventListener('durrah:auth-rate-limited', handleAuthRateLimited as EventListener);

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
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    if (!isMounted) return;

                    if (error) {
                        if (isRateLimitError(error)) {
                            console.warn('Supabase auth refresh is rate-limited. Clearing local auth state.');
                            handleAuthRateLimited();
                            await supabase.auth.signOut({ scope: 'local' });
                        } else {
                            console.error('Error getting auth session:', error);
                        }

                        setSession(null);
                        setUser(null);
                        setRole(null);
                        setSubscriptionStatus(null);
                        setSubscriptionEndDate(null);
                        setTrialEndsAt(null);
                        setLoading(false);
                        clearTimeout(loadingTimeout);
                        return;
                    }

                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        // Block initial render until profile is loaded to avoid transient subscription UI flicker.
                        await fetchUserProfile(session.user.id);
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
                // Keep subscription state in sync before children render subscription-gated UI.
                await fetchUserProfile(session.user.id);
                setupProfileRealtime(session.user.id);
            } else {
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

        // The Supabase JS client automatically handles background token refreshes.
        // We do not need to manually call refreshSession, as it causes 429 Too Many Requests.

        return () => {
            isMounted = false;
            clearTimeout(loadingTimeout);
            window.removeEventListener('durrah:auth-rate-limited', handleAuthRateLimited as EventListener);
            if (profileChannelRef.current) {
                supabase.removeChannel(profileChannelRef.current);
                profileChannelRef.current = null;
            }
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
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
        setSubscriptionEndDate(null);
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
        <AuthContext.Provider value={{ user, session, role, subscriptionStatus, subscriptionEndDate, trialEndsAt, isTrialing, loading, signOut }}>
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
