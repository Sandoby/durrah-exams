import { useState, useMemo, useEffect } from 'react';
import { useProctorDashboard } from '../hooks/useConvexProctoring';
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
  ArrowUpRight
} from 'lucide-react';

interface ProctorDashboardProps {
  examId: string;
  examTitle?: string;
}

/**
 * ProctorDashboard - Premium Edition
 * 
 * Real-time dashboard for tutors to monitor student progress during exams.
 * Features modern glassmorphism design, smooth animations, and professional aesthetics.
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

export function ProctorDashboard({ examId, examTitle }: ProctorDashboardProps) {
  const { sessions, stats, alerts, isLoading, enabled } = useProctorDashboard(examId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disconnected' | 'submitted'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedAlerts, setExpandedAlerts] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<ExamSession | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastViolationCount, setLastViolationCount] = useState(0);

  // Play sound on new violations
  useEffect(() => {
    if (soundEnabled && stats.total_violations > lastViolationCount) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleS46h9NHB+PxJ4i9/+f6/++YyPfqTf7/////////////////');
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

  if (!enabled) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-700/30 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200/20 via-transparent to-transparent"></div>
        <div className="relative flex items-center gap-5">
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
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-indigo-900"></div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
          <Eye className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-indigo-500" />
        </div>
        <p className="mt-6 text-slate-600 dark:text-slate-400 font-medium">Initializing proctoring...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
              <Eye className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                Live Proctoring
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/90 rounded-full text-xs font-semibold shadow-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  LIVE
                </span>
              </h2>
              {examTitle && (
                <p className="text-indigo-200 text-sm mt-1 truncate max-w-md">{examTitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl backdrop-blur-sm border transition-all ${soundEnabled
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/10 border-white/10 text-white/60 hover:bg-white/15'
                }`}
              title={soundEnabled ? 'Mute notifications' : 'Enable sound'}
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* View mode toggle */}
            <div className="hidden sm:flex bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Auto-refresh indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <RefreshCw className="h-3.5 w-3.5 text-white/60 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-xs text-white/80 font-medium hidden sm:inline">Auto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Premium glassmorphism */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Students"
          value={stats.total}
          gradient="from-slate-500 to-slate-600"
          bgGradient="from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Active Now"
          value={stats.active}
          gradient="from-emerald-500 to-green-600"
          bgGradient="from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30"
          pulse={stats.active > 0}
        />
        <StatCard
          icon={<WifiOff className="h-5 w-5" />}
          label="Disconnected"
          value={stats.disconnected}
          gradient="from-amber-500 to-orange-600"
          bgGradient="from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
          alert={stats.disconnected > 0}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Submitted"
          value={stats.submitted}
          gradient="from-blue-500 to-indigo-600"
          bgGradient="from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Violations"
          value={stats.total_violations}
          gradient="from-red-500 to-rose-600"
          bgGradient="from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30"
          alert={stats.total_violations > 0}
        />
      </div>

      {/* Alerts Banner - Premium */}
      {alerts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-red-200 dark:border-red-800/50 bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 dark:from-red-950/30 dark:via-rose-950/30 dark:to-orange-950/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-red-200/30 via-transparent to-transparent dark:from-red-500/10"></div>

          <button
            onClick={() => setExpandedAlerts(!expandedAlerts)}
            className="relative w-full p-4 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg shadow-red-500/30 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-white" />
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
            <div className="relative px-4 pb-4 space-y-2">
              {(alerts as ExamSession[]).map((session: ExamSession) => (
                <div
                  key={session._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900/80 rounded-xl p-4 shadow-sm border border-red-100 dark:border-red-900/50 cursor-pointer hover:shadow-md hover:border-red-200 dark:hover:border-red-800 transition-all gap-3"
                  onClick={() => setSelectedStudent(session)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${session.violations_count >= 3
                        ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
                      }`}>
                      {session.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{session.student_name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${session.violations_count >= 3
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                          }`}>
                          {session.violations_count} violation{session.violations_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{session.status}</span>
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

      {/* Search & Filters - Premium */}
      <div className="flex flex-col gap-4 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 text-slate-500 flex-shrink-0">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">Filter:</span>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 min-w-max">
            {(['all', 'active', 'disconnected', 'submitted'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${statusFilter === status
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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

      {/* Sessions Grid/List */}
      {sortedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
            <Users className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Students Found</h3>
          <p className="text-slate-500 mt-1.5 text-center max-w-sm">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Violations</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <span>Average Progress: <span className="font-bold text-indigo-600">{stats.avg_progress}%</span></span>
        </div>
        <span className="hidden sm:block w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Sessions: <span className="font-bold text-slate-700 dark:text-slate-300">{stats.total}</span></span>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          session={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}

// Premium Stat Card Component
function StatCard({
  icon,
  label,
  value,
  gradient,
  bgGradient,
  pulse = false,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  bgGradient: string;
  pulse?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${bgGradient} border border-slate-200/50 dark:border-slate-700/50 transition-all hover:shadow-lg hover:scale-[1.02]`}>
      {alert && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent animate-pulse"></div>
      )}

      {pulse && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      )}

      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-3`}>
        <div className="text-white">{icon}</div>
      </div>

      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

// Premium Student Card (Grid View)
function StudentCard({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  const progress = session.total_questions > 0
    ? Math.round((session.answered_count / session.total_questions) * 100)
    : 0;

  const timeSinceHeartbeat = Date.now() - session.last_heartbeat;
  const isRecentlyActive = timeSinceHeartbeat < 30000;

  const statusConfig = {
    active: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
      avatar: 'from-emerald-500 to-green-600',
    },
    disconnected: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/50',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
      avatar: 'from-amber-500 to-orange-600',
    },
    submitted: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800/50',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
      avatar: 'from-blue-500 to-indigo-600',
    },
    expired: {
      bg: 'bg-slate-50 dark:bg-slate-900/50',
      border: 'border-slate-200 dark:border-slate-700',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      avatar: 'from-slate-400 to-slate-500',
    },
  };

  const config = statusConfig[session.status];
  const hasViolations = session.violations_count >= 2;

  const timeLeftText = session.time_remaining_seconds
    ? `${Math.floor(session.time_remaining_seconds / 60)}:${(session.time_remaining_seconds % 60).toString().padStart(2, '0')}`
    : '--:--';

  return (
    <div
      onClick={onClick}
      className={`relative group overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border ${hasViolations ? 'border-red-200 dark:border-red-800/50' : config.border
        } p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1`}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

      {/* Status indicator dot */}
      {session.status === 'active' && isRecentlyActive && (
        <span className="absolute top-4 right-4 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      )}

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white bg-gradient-to-br ${hasViolations ? 'from-red-500 to-rose-600' : config.avatar
          } shadow-lg`}>
          {session.student_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white truncate pr-6">
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
      <div className="relative mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="relative grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Timer className="h-4 w-4" />
          <span className="font-medium">{timeLeftText}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${session.violations_count > 0 ? 'text-red-600' : 'text-slate-500'}`}>
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">{session.violations_count}</span>
        </div>
      </div>

      {/* Recent violations */}
      {session.violations_count > 0 && (
        <div className="relative mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              <span className="text-xs px-2 py-1 text-slate-500 font-medium">
                +{session.violations.length - 2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* View details arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="h-4 w-4 text-indigo-500" />
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
    expired: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
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
      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${session.violations_count >= 2 ? 'bg-red-50/30 dark:bg-red-950/10' : ''
        }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br ${session.violations_count >= 2 ? 'from-red-500 to-rose-600' :
              session.status === 'active' ? 'from-emerald-500 to-green-600' :
                session.status === 'submitted' ? 'from-blue-500 to-indigo-600' : 'from-slate-400 to-slate-500'
            }`}>
            {session.student_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{session.student_name}</div>
            {session.student_email && (
              <div className="text-xs text-slate-500">{session.student_email}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[session.status]}`}>
          {session.status === 'active' && (
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          )}
          <span className="capitalize">{session.status}</span>
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          {timeLeftText}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`font-bold text-lg ${session.violations_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
          {session.violations_count}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">
        {lastSeenText}
      </td>
    </tr>
  );
}

// Premium Student Detail Modal
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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-3">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-lg ${session.violations_count >= 2
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30'
                  : session.status === 'active'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                }`}>
                {session.student_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{session.student_name}</h3>
                {session.student_email && (
                  <p className="text-sm text-slate-500">{session.student_email}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <XCircle className="h-6 w-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Time Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <div className="text-sm text-slate-500 mb-1">Status</div>
              <div className={`font-bold capitalize ${session.status === 'active' ? 'text-emerald-600' :
                  session.status === 'disconnected' ? 'text-amber-600' :
                    session.status === 'submitted' ? 'text-blue-600' : 'text-slate-600'
                }`}>
                {session.status}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <div className="text-sm text-slate-500 mb-1">Time Left</div>
              <div className="font-bold text-slate-900 dark:text-white">{timeLeftText}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Progress</span>
              <span className="font-bold text-slate-900 dark:text-white">{progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {session.answered_count} of {session.total_questions} questions completed
            </div>
          </div>

          {/* Device Info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              {isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              Device Information
            </h4>
            <div className="space-y-2 text-sm">
              {session.screen_resolution && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Screen</span>
                  <span className="font-medium text-slate-900 dark:text-white">{session.screen_resolution}</span>
                </div>
              )}
              {session.network_quality && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Network</span>
                  <span className={`font-medium capitalize ${session.network_quality === 'good' ? 'text-emerald-600' :
                      session.network_quality === 'fair' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                    {session.network_quality}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Device Type</span>
                <span className="font-medium text-slate-900 dark:text-white">{isMobile ? 'Mobile' : 'Desktop'}</span>
              </div>
            </div>
          </div>

          {/* Violations */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${session.violations_count > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              Violations ({session.violations_count})
            </h4>
            {session.violations.length === 0 ? (
              <div className="text-slate-500 text-sm p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
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
