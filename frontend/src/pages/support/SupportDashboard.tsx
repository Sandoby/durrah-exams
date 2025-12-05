import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ticket, MessageSquare, Clock, CheckCircle, LogOut } from 'lucide-react';

interface TicketSummary {
    id: string;
    ticket_number: string;
    subject: string;
    user_name: string;
    category: string;
    priority: string;
    is_open: boolean;
    created_at: string;
    assigned_to?: string;
}

export default function SupportDashboard() {
    const { user, signOut, role } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<TicketSummary[]>([]);
    const [stats, setStats] = useState({
        myTickets: 0,
        openTickets: 0,
        resolvedToday: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch agent info
            const { data: agentData } = await supabase
                .from('support_agents')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (agentData) {
                // Fetch tickets
                const { data: ticketsData } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (ticketsData) {
                    setTickets(ticketsData);
                    setStats({
                        myTickets: ticketsData.filter((t: TicketSummary) => t.assigned_to === agentData.id).length,
                        openTickets: ticketsData.filter((t: TicketSummary) => t.is_open).length,
                        resolvedToday: 0, // TODO: Calculate today's resolved tickets
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/agent-login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Support Dashboard
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Agent Portal
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {role === 'admin' && (
                                <Link
                                    to="/admin"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    Admin Panel
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        icon={<Ticket className="w-6 h-6" />}
                        label="My Tickets"
                        value={stats.myTickets}
                        color="indigo"
                    />
                    <StatCard
                        icon={<Clock className="w-6 h-6" />}
                        label="Open Tickets"
                        value={stats.openTickets}
                        color="orange"
                    />
                    <StatCard
                        icon={<CheckCircle className="w-6 h-6" />}
                        label="Resolved Today"
                        value={stats.resolvedToday}
                        color="green"
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link
                        to="/support/tickets"
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Ticket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    View Tickets
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Manage support tickets
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/support/chat"
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Live Chat
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Handle live chat sessions
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recent Tickets */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Recent Tickets
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {tickets.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No tickets yet</p>
                            </div>
                        ) : (
                            tickets.map((ticket) => (
                                <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                    {ticket.ticket_number}
                                                </span>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ticket.is_open
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {ticket.is_open ? 'Open' : 'Closed'}
                                                </span>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ticket.priority === 'high'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    : ticket.priority === 'medium'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                    }`}>
                                                    {ticket.priority}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                {ticket.subject}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {ticket.user_name || 'Anonymous'} • {ticket.category}
                                            </p>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(ticket.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
