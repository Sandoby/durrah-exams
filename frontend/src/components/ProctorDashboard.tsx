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
  Smartphone
} from 'lucide-react';

interface ProctorDashboardProps {
  examId: string;
  examTitle?: string;
}

/**
 * ProctorDashboard
 * 
 * Real-time dashboard for tutors to monitor student progress during exams.
 * Features:
 * - Live stats with animated updates
 * - Grid/List view toggle
 * - Active/disconnected/submitted filtering
 * - Per-student progress and violations
 * - Alerts for high-violation students
 * - Sound notifications for violations
 * - Real-time updates via Convex subscriptions
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
      // Play a subtle notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleS46h9NHB+PxJ4i9/+f6/++YyPfqTf7//////////////////');
      audio.volume = 0.3;
      audio.play().catch(() => { });
    }
    setLastViolationCount(stats.total_violations);
  }, [stats.total_violations, soundEnabled, lastViolationCount]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return (sessions as ExamSession[]).filter((session: ExamSession) => {
      // Status filter
      if (statusFilter !== 'all' && session.status !== statusFilter) return false;

      // Search filter
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

  // Sort sessions: active first with violations, then by violations count
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      // Active with violations first
      if (a.status === 'active' && a.violations_count > 0 && !(b.status === 'active' && b.violations_count > 0)) return -1;
      if (b.status === 'active' && b.violations_count > 0 && !(a.status === 'active' && a.violations_count > 0)) return 1;

      // Then by status
      const statusOrder = { active: 0, disconnected: 1, submitted: 2, expired: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }

      // Then by violations
      return b.violations_count - a.violations_count;
    });
  }, [filteredSessions]);

  if (!enabled) {
    return (
      <div className="p-8 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
            <Shield className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Live Proctoring Disabled
            </h3>
            <p className="text-yellow-600 dark:text-yellow-400 mt-1">
              Enable <code className="px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 rounded text-sm">VITE_USE_CONVEX_PROCTORING=true</code> in your environment to use this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-pulse"></div>
          <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 animate-spin text-indigo-600" />
        </div>
        <p className="mt-4 text-gray-500 font-medium">Loading proctoring data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-gray-500" />
            Live Proctoring
          </h2>
          {examTitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{examTitle}</p>
          )}
        </div>

        {/* Status Indicator - Clean pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-green-700 dark:text-green-400 text-sm font-medium">Live</span>
        </div>
      </div>

      {/* Controls - Second Row on Mobile */}
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg transition-all ${soundEnabled
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
          title={soundEnabled ? 'Mute notifications' : 'Enable sound notifications'}
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* View mode toggle - Hidden on small mobile, auto grid */}
        <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-400'
              }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-400'
              }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Refresh indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Auto-updating</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total"
          value={stats.total}
          color="indigo"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Active"
          value={stats.active}
          color="green"
        />
        <StatCard
          icon={<WifiOff className="h-4 w-4" />}
          label="Offline"
          value={stats.disconnected}
          color="yellow"
        />
        <StatCard
          icon={<CheckCircle className="h-4 w-4" />}
          label="Submitted"
          value={stats.submitted}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Violations"
          value={stats.total_violations}
          color="red"
        />
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandedAlerts(!expandedAlerts)}
            className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/50 rounded-lg animate-pulse">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm sm:text-base text-red-800 dark:text-red-200">
                  {alerts.length} Student{alerts.length > 1 ? 's' : ''} Need Attention
                </span>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 hidden sm:block">
                  Students with 2 or more violations
                </p>
              </div>
            </div>
            {expandedAlerts ? (
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            )}
          </button>

          {expandedAlerts && (
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
              {(alerts as ExamSession[]).map((session: ExamSession) => (
                <div
                  key={session._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow gap-2 sm:gap-0"
                  onClick={() => setSelectedStudent(session)}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm sm:text-base ${session.violations_count >= 3 ? 'bg-red-500' : 'bg-orange-500'
                      }`}>
                      {session.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{session.student_name}</span>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${session.violations_count >= 3 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                          {session.violations_count} violations
                        </span>
                        <span className="capitalize">{session.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 max-w-full sm:max-w-xs ml-10 sm:ml-0">
                    {session.violations.slice(-3).map((v, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg"
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
      )
      }

      {/* Filters */}
      <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Status Filter - Scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 min-w-max">
            {(['all', 'active', 'disconnected', 'submitted'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${statusFilter === status
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status === 'active' && stats.active > 0 && (
                  <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs">
                    {stats.active}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions */}
      {
        sortedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-16 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-3 sm:mb-4">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300">No Students Found</h3>
            <p className="text-sm text-gray-500 mt-1 text-center">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Waiting for students to start the exam...'}
            </p>
          </div>
        ) : viewMode === 'grid' || window.innerWidth < 640 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {sortedSessions.map((session) => (
              <StudentCard
                key={session._id}
                session={session}
                onClick={() => setSelectedStudent(session)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
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
        )
      }

      {/* Footer Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500">
        <span>Average Progress: <span className="font-semibold text-indigo-600">{stats.avg_progress}%</span></span>
        <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></span>
        <span>Total Sessions: <span className="font-semibold">{stats.total}</span></span>
      </div>

      {/* Student Detail Modal */}
      {
        selectedStudent && (
          <StudentDetailModal
            session={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )
      }
    </div>
  );
}

// Stat Card Component - Clean Professional Design
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'indigo' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colorStyles = {
    indigo: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    green: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    yellow: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    red: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    blue: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  };

  const iconColors = {
    indigo: 'text-indigo-600 dark:text-indigo-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorStyles[color]}`}>
      <div className="flex items-center gap-3">
        <div className={iconColors[color]}>{icon}</div>
        <div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

// Student Card Component (Grid View)
function StudentCard({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  const progress = session.total_questions > 0
    ? Math.round((session.answered_count / session.total_questions) * 100)
    : 0;

  const timeSinceHeartbeat = Date.now() - session.last_heartbeat;
  const isRecentlyActive = timeSinceHeartbeat < 30000;

  const statusStyles = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    disconnected: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  const timeLeftText = session.time_remaining_seconds
    ? `${Math.floor(session.time_remaining_seconds / 60)}:${(session.time_remaining_seconds % 60).toString().padStart(2, '0')}`
    : '--:--';

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border ${session.violations_count >= 2 ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
        } p-3 sm:p-5 cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all group`}
    >
      {/* Status indicator */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
        {session.status === 'active' && isRecentlyActive && (
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-green-500"></span>
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg text-white ${session.violations_count >= 2 ? 'bg-gradient-to-br from-red-500 to-orange-500' :
          session.status === 'active' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
            session.status === 'submitted' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' :
              'bg-gradient-to-br from-gray-400 to-gray-500'
          }`}>
          {session.student_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate pr-6">
            {session.student_name}
          </h4>
          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[session.status]}`}>
            {session.status === 'active' && <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />}
            {session.status === 'disconnected' && <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />}
            {session.status === 'submitted' && <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />}
            <span className="capitalize">{session.status}</span>
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between text-xs sm:text-sm mb-1 sm:mb-1.5">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
        <div className="h-1.5 sm:h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
          <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{timeLeftText}</span>
        </div>
        <div className={`flex items-center gap-1.5 sm:gap-2 ${session.violations_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="font-medium">{session.violations_count}</span>
        </div>
      </div>

      {/* Recent violations */}
      {session.violations_count > 0 && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-1">
            {session.violations.slice(-2).map((v, i) => (
              <span
                key={i}
                className="text-xs px-1.5 sm:px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded"
              >
                {VIOLATION_LABELS[v.type] || v.type}
              </span>
            ))}
            {session.violations.length > 2 && (
              <span className="text-xs px-1.5 py-0.5 text-gray-500">
                +{session.violations.length - 2}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Session Row Component (List View)
function SessionRow({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    disconnected: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
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
      className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors ${session.violations_count >= 2 ? 'bg-red-50/50 dark:bg-red-900/10' : ''
        }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${session.violations_count >= 2 ? 'bg-red-500' :
            session.status === 'active' ? 'bg-green-500' :
              session.status === 'submitted' ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
            {session.student_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{session.student_name}</div>
            {session.student_email && (
              <div className="text-xs text-gray-500">{session.student_email}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[session.status]}`}>
          {session.status === 'active' && (
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
          )}
          {session.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          {timeLeftText}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`font-semibold ${session.violations_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl text-white ${session.violations_count >= 2 ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                session.status === 'active' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                  'bg-gradient-to-br from-blue-500 to-indigo-500'
                }`}>
                {session.student_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{session.student_name}</h3>
                {session.student_email && (
                  <p className="text-sm text-gray-500 truncate">{session.student_email}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Status & Progress */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Status</div>
              <div className={`font-semibold text-sm sm:text-base capitalize ${session.status === 'active' ? 'text-green-600' :
                session.status === 'disconnected' ? 'text-yellow-600' :
                  session.status === 'submitted' ? 'text-blue-600' : 'text-gray-600'
                }`}>
                {session.status}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Time Left</div>
              <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{timeLeftText}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-500">Progress</span>
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{progress}%</span>
            </div>
            <div className="h-2.5 sm:h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-xs sm:text-sm text-gray-500">
              {session.answered_count} of {session.total_questions} questions
            </div>
          </div>

          {/* Device Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 sm:p-4">
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
              {isMobile ? <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              Device Info
            </h4>
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              {session.screen_resolution && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Screen</span>
                  <span className="text-gray-900 dark:text-white">{session.screen_resolution}</span>
                </div>
              )}
              {session.network_quality && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Network</span>
                  <span className={`capitalize ${session.network_quality === 'good' ? 'text-green-600' :
                    session.network_quality === 'fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {session.network_quality}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Device</span>
                <span className="text-gray-900 dark:text-white">{isMobile ? 'Mobile' : 'Desktop'}</span>
              </div>
            </div>
          </div>

          {/* Violations */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
              <AlertTriangle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${session.violations_count > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              Violations ({session.violations_count})
            </h4>
            {session.violations.length === 0 ? (
              <p className="text-gray-500 text-xs sm:text-sm">No violations recorded</p>
            ) : (
              <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                {session.violations.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 sm:p-3"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                      <span className="font-medium text-xs sm:text-sm text-red-700 dark:text-red-300">
                        {VIOLATION_LABELS[v.type] || v.type}
                      </span>
                    </div>
                    <span className="text-xs text-red-500 flex-shrink-0 ml-2">
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
