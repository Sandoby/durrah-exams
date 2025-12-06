import { useState, useEffect } from 'react';
import {
    Users, CreditCard, Activity,
    DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MetricsCard } from './MetricsCard';
import { ActivityFeed } from './ActivityFeed';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export function AdminAnalyticsDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        totalExams: 0,
        activeUsers24h: 0,
        systemHealth: 'healthy'
    });
    const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Fetch key metrics
            const { data: platformStats } = await supabase
                .from('platform_stats')
                .select('*')
                .single();

            // Fetch user growth data
            const { data: growthData } = await supabase
                .from('user_growth_daily')
                .select('*')
                .order('date', { ascending: true })
                .limit(30);

            if (platformStats) {
                setStats({
                    totalUsers: platformStats.total_users,
                    activeSubscriptions: platformStats.active_subscriptions,
                    totalRevenue: platformStats.total_revenue || 0,
                    totalExams: platformStats.total_exams,
                    activeUsers24h: platformStats.active_users_24h,
                    systemHealth: 'healthy'
                });
            }

            if (growthData) {
                setUserGrowthData(growthData.map(d => ({
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    users: d.total_users,
                    active: d.active_users
                })));
            }

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="indigo"
                    isLoading={isLoading}
                    trend={{ value: 12, label: 'vs last month', isPositive: true }}
                />
                <MetricsCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon={CreditCard}
                    color="green"
                    isLoading={isLoading}
                    trend={{ value: 5, label: 'vs last month', isPositive: true }}
                />
                <MetricsCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="blue"
                    isLoading={isLoading}
                    trend={{ value: 8, label: 'vs last month', isPositive: true }}
                />
                <MetricsCard
                    title="Total Exams"
                    value={stats.totalExams}
                    icon={Activity}
                    color="orange"
                    isLoading={isLoading}
                    trend={{ value: 15, label: 'vs last month', isPositive: true }}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">User Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={userGrowthData}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip />
                            <Area type="monotone" dataKey="users" stroke="#4f46e5" fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userGrowthData.slice(-7)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="users" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Exam Creation Activity</h3>
                <ActivityFeed />
            </div>
        </div>
    );
}
