import { useState, useMemo, useEffect } from 'react';
import { useProctorDashboard } from '../hooks/useConvexProctoring';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Clock,
  Eye,
  Shield,
  TrendingUp,
  RefreshCw,
  Filter,
  Search,
  LayoutGrid,
  List,
  Bell,
  Activity,
  Timer,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wifi,
  Monitor,
  Smartphone,
  Zap,
  ArrowUpRight,
  ArrowLeft,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface ProctorDashboardProps {
  examId?: string;
  examTitle?: string;
}

/**
 * ProctorDashboard - Full Page Edition
 * 
 * Real-time dashboard for tutors to monitor student progress during exams.
 * Redesigned to match ExamAnalyticsDashboard aesthetics with clean card-based design.
 */

// Type for session from Convex
interface ExamSession {
  _id: string;
  student_name: string;
  student_email?: string;
  status: 'active' | 'disconnected' | 'submitted' | 'expired';
  total_questions: number;
  answered_count: number;
  current_question?: number;
  time_remaining_seconds?: number;
  violations_count: number;
  violations: Array<{ type: string; timestamp: number; detail?: string }>;
  last_heartbeat: number;
  started_at?: number;
  user_agent?: string;
  screen_resolution?: string;
  network_quality?: 'good' | 'fair' | 'poor';
}

// Violation type labels
const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: 'Tab Switch',
  copy_attempt: 'Copy Attempt',
  paste_attempt: 'Paste Attempt',
  right_click: 'Right Click',
  keyboard_shortcut: 'Shortcut',
  exit_fullscreen: 'Exit Fullscreen',
  print_attempt: 'Print Attempt',
  print_detected: 'Print Detected',
};

export function ProctorDashboard({ examId: propExamId, examTitle: propExamTitle }: ProctorDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { examId: paramExamId } = useParams();

  // Use prop or URL param for examId
  const examId = propExamId || paramExamId || '';
  const isFullPage = !propExamId && !!paramExamId;

  const { sessions, stats, alerts, isLoading, enabled } = useProctorDashboard(examId);

  const [examTitle, setExamTitle] = useState(propExamTitle || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disconnected' | 'submitted'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedAlerts, setExpandedAlerts] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<ExamSession | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastViolationCount, setLastViolationCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch exam title if not provided
  useEffect(() => {
    if (isFullPage && examId && !propExamTitle) {
      const fetchExamTitle = async () => {
        const { data } = await supabase
          .from('exams')
          .select('title')
          .eq('id', examId)
          .single();
        if (data) setExamTitle(data.title);
      };
      fetchExamTitle();
    }
  }, [examId, isFullPage, propExamTitle]);

  // Play sound on new violations
  useEffect(() => {
    if (soundEnabled && stats.total_violations > lastViolationCount) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleS46h9NHB+PxJ4i9/+f6/++YyPfqTf7////////////////');
      audio.volume = 0.3;
      audio.play().catch(() => { });
    }
    setLastViolationCount(stats.total_violations);
  }, [stats.total_violations, soundEnabled, lastViolationCount]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return (sessions as ExamSession[]).filter((session: ExamSession) => {
      if (statusFilter !== 'all' && session.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          session.student_name.toLowerCase().includes(query) ||
          session.student_email?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [sessions, statusFilter, searchQuery]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      if (a.status === 'active' && a.violations_count > 0 && !(b.status === 'active' && b.violations_count > 0)) return -1;
      if (b.status === 'active' && b.violations_count > 0 && !(a.status === 'active' && a.violations_count > 0)) return 1;
      const statusOrder = { active: 0, disconnected: 1, submitted: 2, expired: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.violations_count - a.violations_count;
    });
  }, [filteredSessions]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Disabled state
  if (!enabled) {
    return (
      <div className={`${isFullPage ? 'min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8' : ''}`}>
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-700/30 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 p-8 max-w-lg">
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0 p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/25">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">
                Live Proctoring Disabled
              </h3>
              <p className="text-amber-700 dark:text-amber-300 mt-1.5 text-sm leading-relaxed">
                Enable <code className="px-2 py-1 bg-amber-200/60 dark:bg-amber-800/50 rounded-md text-xs font-mono">VITE_USE_CONVEX_PROCTORING=true</code> to activate real-time monitoring.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isFullPage ? 'min-h-screen bg-gray-50 dark:bg-gray-900' : 'py-20'}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing proctoring...</p>
        </div>
      </div>
    );
  }

  const mainContent = (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {isFullPage && (
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-teal-800 to-teal-900 dark:from-white dark:via-teal-200 dark:to-teal-400">
              {examTitle || 'Live Proctoring'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Eye className="h-4 w-4 text-teal-500" />
              <span>Live Monitoring Dashboard</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500 rounded-full text-xs font-semibold text-white">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                LIVE
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${soundEnabled
              ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-600'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600'
              }`}
            title={soundEnabled ? 'Mute notifications' : 'Enable sound'}
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* View mode toggle */}
          <div className="hidden sm:flex bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <RefreshCw className="h-3.5 w-3.5 text-gray-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Auto-refresh</span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Clean Analytics Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          label="Total Students"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<Activity className="h-6 w-6" />}
          label="Active Now"
          value={stats.active}
          color="emerald"
          pulse={stats.active > 0}
        />
        <StatCard
          icon={<WifiOff className="h-6 w-6" />}
          label="Disconnected"
          value={stats.disconnected}
          color="amber"
          alert={stats.disconnected > 0}
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          label="Submitted"
          value={stats.submitted}
          color="indigo"
        />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Violations"
          value={stats.total_violations}
          color="red"
          alert={stats.total_violations > 0}
        />
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-800/50 mb-8 overflow-hidden">
          <button
            onClick={() => setExpandedAlerts(!expandedAlerts)}
            className="w-full p-4 flex items-center justify-between hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <span className="font-bold text-red-800 dark:text-red-200">
                  {alerts.length} Student{alerts.length > 1 ? 's' : ''} Need Attention
                </span>
                <p className="text-sm text-red-600 dark:text-red-400 hidden sm:block">
                  Click to {expandedAlerts ? 'collapse' : 'expand'} details
                </p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              {expandedAlerts ? (
                <ChevronUp className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
          </button>

          {expandedAlerts && (
            <div className="px-4 pb-4 space-y-2">
              {(alerts as ExamSession[]).map((session: ExamSession) => (
                <div
                  key={session._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-red-200 dark:hover:border-red-800 transition-all gap-3"
                  onClick={() => setSelectedStudent(session)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white ${session.violations_count >= 3
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                      }`}>
                      {session.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{session.student_name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${session.violations_count >= 3
                          ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                          }`}>
                          {session.violations_count} violation{session.violations_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{session.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-14 sm:ml-0">
                    {session.violations.slice(-3).map((v, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-medium"
                      >
                        {VIOLATION_LABELS[v.type] || v.type}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Filter:</span>
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 min-w-max">
              {(['all', 'active', 'disconnected', 'submitted'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${statusFilter === status
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-teal-600 dark:text-teal-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'active' && stats.active > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold">
                      {stats.active}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Grid/List */}
      {sortedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
            <Users className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Students Found</h3>
          <p className="text-gray-500 mt-1.5 text-center max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more results'
              : 'Waiting for students to start the exam...'}
          </p>
        </div>
      ) : viewMode === 'grid' || window.innerWidth < 640 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedSessions.map((session) => (
            <StudentCard
              key={session._id}
              session={session}
              onClick={() => setSelectedStudent(session)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Violations</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedSessions.map((session) => (
                  <SessionRow
                    key={session._id}
                    session={session}
                    onClick={() => setSelectedStudent(session)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-teal-500" />
          <span>Average Progress: <span className="font-bold text-teal-600">{stats.avg_progress}%</span></span>
        </div>
        <span className="hidden sm:block w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Sessions: <span className="font-bold text-gray-700 dark:text-gray-300">{stats.total}</span></span>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          session={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );

  // If used as a full page, wrap with page layout
  if (isFullPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 font-sans relative overflow-hidden pt-24">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
          <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-teal-500/5 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex justify-between h-16 px-6">
              <div className="flex items-center gap-3">
                <Logo className="h-9 w-9" showText={false} />
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Durrah</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-3">
                <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                  {user?.user_metadata?.full_name || user?.email}
                </span>

                <Link
                  to="/settings"
                  className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t('settings.title', 'Settings')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t('nav.logout', 'Logout')}</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mx-auto max-w-7xl">
              <div className="px-4 py-3 space-y-2">
                <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 font-medium">
                  {user?.user_metadata?.full_name || user?.email}
                </div>
                <Link
                  to="/settings"
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Settings className="h-5 w-5 mr-3" />
                  {t('settings.title', 'Settings')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  {t('nav.logout', 'Logout')}
                </button>
              </div>
            </div>
          )}
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {mainContent}
        </div>
      </div>
    );
  }

  // If used as embedded component (legacy modal content)
  return <div className="space-y-5">{mainContent}</div>;
}

// Clean Stat Card Component (matching Analytics style)
function StatCard({
  icon,
  label,
  value,
  color,
  pulse = false,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber' | 'indigo' | 'red';
  pulse?: boolean;
  alert?: boolean;
}) {
  const colorClasses = {
    blue: {
      icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-600',
      text: 'text-blue-600 dark:text-blue-400'
    },
    emerald: {
      icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-600',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    amber: {
      icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400'
    },
    indigo: {
      icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-600',
      text: 'text-indigo-600 dark:text-indigo-400'
    },
    red: {
      icon: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400'
    }
  };

  const styles = colorClasses[color];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-shadow">
      {alert && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent animate-pulse"></div>
      )}

      {pulse && (
        <span className="absolute top-4 right-4 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${styles.icon}`}>
          {icon}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
      </div>
    </div>
  );
}

// Student Card (Grid View)
function StudentCard({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  const progress = session.total_questions > 0
    ? Math.round((session.answered_count / session.total_questions) * 100)
    : 0;

  const timeSinceHeartbeat = Date.now() - session.last_heartbeat;
  const isRecentlyActive = timeSinceHeartbeat < 30000;

  const statusConfig = {
    active: {
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
      avatar: 'bg-emerald-500',
    },
    disconnected: {
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
      avatar: 'bg-amber-500',
    },
    submitted: {
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
      avatar: 'bg-blue-500',
    },
    expired: {
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      avatar: 'bg-gray-400',
    },
  };

  const config = statusConfig[session.status] || statusConfig.expired;
  const hasViolations = session.violations_count >= 2;

  const timeLeftText = session.time_remaining_seconds
    ? `${Math.floor(session.time_remaining_seconds / 60)}:${(session.time_remaining_seconds % 60).toString().padStart(2, '0')}`
    : '--:--';

  return (
    <div
      onClick={onClick}
      className={`relative group bg-white dark:bg-gray-800 rounded-2xl border ${hasViolations ? 'border-red-200 dark:border-red-800/50' : 'border-gray-100 dark:border-gray-700'
        } p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
    >
      {/* Status indicator dot */}
      {session.status === 'active' && isRecentlyActive && (
        <span className="absolute top-4 right-4 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white ${hasViolations ? 'bg-red-500' : config.avatar
          }`}>
          {session.student_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white truncate pr-6">
            {session.student_name}
          </h4>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${config.badge}`}>
            {session.status === 'active' && <Wifi className="h-3 w-3" />}
            {session.status === 'disconnected' && <WifiOff className="h-3 w-3" />}
            {session.status === 'submitted' && <CheckCircle className="h-3 w-3" />}
            <span className="capitalize">{session.status}</span>
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-500">Progress</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress >= 100
              ? 'bg-emerald-500'
              : 'bg-teal-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Timer className="h-4 w-4" />
          <span className="font-medium">{timeLeftText}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${session.violations_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">{session.violations_count}</span>
        </div>
      </div>

      {/* Recent violations */}
      {session.violations_count > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-1.5">
            {session.violations.slice(-2).map((v, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-medium"
              >
                {VIOLATION_LABELS[v.type] || v.type}
              </span>
            ))}
            {session.violations.length > 2 && (
              <span className="text-xs px-2 py-1 text-gray-500 font-medium">
                +{session.violations.length - 2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* View details arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="h-4 w-4 text-teal-500" />
      </div>
    </div>
  );
}

// Session Row (List View)
function SessionRow({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    disconnected: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  const progress = session.total_questions > 0
    ? Math.round((session.answered_count / session.total_questions) * 100)
    : 0;

  const timeSinceHeartbeat = Date.now() - session.last_heartbeat;
  const lastSeenText = timeSinceHeartbeat < 60000
    ? 'Just now'
    : `${Math.floor(timeSinceHeartbeat / 60000)}m ago`;

  const timeLeftText = session.time_remaining_seconds
    ? `${Math.floor(session.time_remaining_seconds / 60)}:${(session.time_remaining_seconds % 60).toString().padStart(2, '0')}`
    : '--:--';

  return (
    <tr
      onClick={onClick}
      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${session.violations_count >= 2 ? 'bg-red-50/30 dark:bg-red-950/10' : ''
        }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${session.violations_count >= 2 ? 'bg-red-500' :
            session.status === 'active' ? 'bg-emerald-500' :
              session.status === 'submitted' ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
            {session.student_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{session.student_name}</div>
            {session.student_email && (
              <div className="text-xs text-gray-500">{session.student_email}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[session.status as keyof typeof statusColors] || statusColors.expired}`}>
          {session.status === 'active' && (
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          )}
          <span className="capitalize">{session.status}</span>
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          {timeLeftText}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`font-bold text-lg ${session.violations_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {session.violations_count}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {lastSeenText}
      </td>
    </tr>
  );
}

// Student Detail Modal
function StudentDetailModal({ session, onClose }: { session: ExamSession; onClose: () => void }) {
  const progress = session.total_questions > 0
    ? Math.round((session.answered_count / session.total_questions) * 100)
    : 0;

  const timeLeftText = session.time_remaining_seconds
    ? `${Math.floor(session.time_remaining_seconds / 60)}:${(session.time_remaining_seconds % 60).toString().padStart(2, '0')}`
    : '--:--';

  const isMobile = session.user_agent?.toLowerCase().includes('mobile') ||
    session.user_agent?.toLowerCase().includes('android') ||
    session.user_agent?.toLowerCase().includes('iphone');

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white ${session.violations_count >= 2
                ? 'bg-red-500'
                : session.status === 'active'
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
                }`}>
                {session.student_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{session.student_name}</h3>
                {session.student_email && (
                  <p className="text-sm text-gray-500">{session.student_email}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <XCircle className="h-6 w-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Time Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <div className={`font-bold capitalize ${session.status === 'active' ? 'text-emerald-600' :
                session.status === 'disconnected' ? 'text-amber-600' :
                  session.status === 'submitted' ? 'text-blue-600' : 'text-gray-600'
                }`}>
                {session.status}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">Time Left</div>
              <div className="font-bold text-gray-900 dark:text-white">{timeLeftText}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {session.answered_count} of {session.total_questions} questions completed
            </div>
          </div>

          {/* Device Info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              {isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              Device Information
            </h4>
            <div className="space-y-2 text-sm">
              {session.screen_resolution && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Screen</span>
                  <span className="font-medium text-gray-900 dark:text-white">{session.screen_resolution}</span>
                </div>
              )}
              {session.network_quality && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Network</span>
                  <span className={`font-medium capitalize ${session.network_quality === 'good' ? 'text-emerald-600' :
                    session.network_quality === 'fair' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                    {session.network_quality}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Device Type</span>
                <span className="font-medium text-gray-900 dark:text-white">{isMobile ? 'Mobile' : 'Desktop'}</span>
              </div>
            </div>
          </div>

          {/* Violations */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${session.violations_count > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              Violations ({session.violations_count})
            </h4>
            {session.violations.length === 0 ? (
              <div className="text-gray-500 text-sm p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                ✓ No violations recorded
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.violations.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 rounded-xl p-3 border border-red-100 dark:border-red-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="font-medium text-sm text-red-700 dark:text-red-300">
                        {VIOLATION_LABELS[v.type] || v.type}
                      </span>
                    </div>
                    <span className="text-xs text-red-500 font-medium">
                      {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Safe area for mobile */}
        <div className="h-safe-area-inset-bottom sm:hidden" />
      </div>
    </div>
  );
}
