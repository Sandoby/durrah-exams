import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ticket, MessageSquare, Clock, CheckCircle, LogOut, LayoutDashboard } from 'lucide-react';
import { AgentChatInterface } from '../../components/support/AgentChatInterface';

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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shrink-0">
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

                    {/* Navigation Tabs */}
                    <div className="flex gap-6 mt-6">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'dashboard'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Live Chat
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'chat' ? (
                    <AgentChatInterface />
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Tickets</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.myTickets}</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Ticket className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Tickets</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.openTickets}</p>
                                    </div>
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved Today</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.resolvedToday}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Tickets */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Recent Tickets
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Ticket ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Subject
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                User
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Created
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {tickets.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                    No tickets found
                                                </td>
                                            </tr>
                                        ) : (
                                            tickets.map((ticket) => (
                                                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                                        #{ticket.ticket_number}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                        {ticket.subject}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                        {ticket.user_name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.is_open
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                            {ticket.is_open ? 'Open' : 'Closed'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(ticket.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
