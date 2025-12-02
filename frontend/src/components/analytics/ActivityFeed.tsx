import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    UserPlus, CreditCard, MessageSquare, AlertCircle,
    CheckCircle, Clock, Activity
} from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'signup' | 'subscription' | 'ticket' | 'payment_failed' | 'exam_submission';
    title: string;
    description: string;
    created_at: string;
    metadata?: any;
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
        subscribeToActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const { data, error } = await supabase
                .from('user_activity')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Transform data to ActivityItem format
            const formattedActivities = (data || []).map(item => ({
                id: item.id,
                type: mapActivityType(item.action_type),
                title: formatActivityTitle(item.action_type),
                description: item.details?.description || 'User activity recorded',
                created_at: item.created_at,
                metadata: item.details
            }));

            setActivities(formattedActivities);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToActivities = () => {
        const channel = supabase
            .channel('admin_activity_feed')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_activity'
                },
                (payload) => {
                    const newItem = payload.new;
                    const activity: ActivityItem = {
                        id: newItem.id,
                        type: mapActivityType(newItem.action_type),
                        title: formatActivityTitle(newItem.action_type),
                        description: newItem.details?.description || 'New activity',
                        created_at: newItem.created_at,
                        metadata: newItem.details
                    };

                    setActivities(prev => [activity, ...prev].slice(0, 20));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const mapActivityType = (actionType: string): ActivityItem['type'] => {
        if (actionType.includes('login') || actionType.includes('signup')) return 'signup';
        if (actionType.includes('subscription')) return 'subscription';
        if (actionType.includes('ticket')) return 'ticket';
        if (actionType.includes('payment')) return 'payment_failed';
        return 'exam_submission';
    };

    const formatActivityTitle = (actionType: string): string => {
        return actionType.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'signup':
                return <UserPlus className="h-4 w-4 text-blue-500" />;
            case 'subscription':
                return <CreditCard className="h-4 w-4 text-green-500" />;
            case 'ticket':
                return <MessageSquare className="h-4 w-4 text-purple-500" />;
            case 'payment_failed':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'exam_submission':
                return <CheckCircle className="h-4 w-4 text-indigo-500" />;
            default:
                return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Live Activity</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    Live Activity
                </h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2">
                {activities.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        No recent activity
                    </p>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 last:border-0">
                            <div className="absolute -left-[9px] top-0 bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                                {getActivityIcon(item.type)}
                            </div>
                            <div className="mb-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.description}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                {new Date(item.created_at).toLocaleTimeString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
