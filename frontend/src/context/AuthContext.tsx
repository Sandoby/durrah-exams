import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'agent' | 'tutor' | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setRole(data?.role || 'tutor');
        } catch (error) {
            console.error('Error fetching user role:', error);
            setRole('tutor'); // Default to tutor if error
        }
    };

    const checkCustomAuth = () => {
        const isAgentAuth = sessionStorage.getItem('agent_authenticated') === 'true';
        if (isAgentAuth) {
            const agentRole = sessionStorage.getItem('agent_role') as UserRole;
            const agentId = sessionStorage.getItem('agent_id');
            const agentEmail = sessionStorage.getItem('agent_email');

            if (agentRole && agentId) {
                setRole(agentRole);
                // Create a mock user object for the context
                setUser({
                    id: agentId,
                    email: agentEmail || '',
                    app_metadata: {},
                    user_metadata: {},
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
        // Set a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            if (loading) {
                console.warn('Auth initialization timeout - proceeding anyway');
                setLoading(false);
            }
        }, 5000); // 5 second timeout

        // Check custom auth first
        if (checkCustomAuth()) {
            clearTimeout(loadingTimeout);
            return;
        }

        // Check active sessions and sets the user
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchUserRole(session.user.id);
            }

            setLoading(false);
            clearTimeout(loadingTimeout);
        }).catch((error) => {
            console.error('Error initializing auth:', error);
            setLoading(false);
            clearTimeout(loadingTimeout);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchUserRole(session.user.id);
            } else {
                // If signed out from Supabase, check if custom auth is active
                if (!checkCustomAuth()) {
                    setRole(null);
                }
            }

            setLoading(false);
        });

        return () => {
            clearTimeout(loadingTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem('agent_authenticated');
        sessionStorage.removeItem('agent_role');
        sessionStorage.removeItem('agent_id');
        sessionStorage.removeItem('agent_email');
        sessionStorage.removeItem('agent_name');
        setRole(null);
        setUser(null);
    };

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
        <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
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
