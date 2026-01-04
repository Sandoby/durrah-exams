import { useState, useMemo } from 'react';
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
  Search
} from 'lucide-react';

interface ProctorDashboardProps {
  examId: string;
  examTitle?: string;
}

/**
 * ProctorDashboard
 * 
 * Real-time dashboard for tutors to monitor student progress during exams.
 * Shows:
 * - Active/disconnected/submitted counts
 * - Per-student progress and violations
 * - Alerts for high-violation students
 * - Live updates via Convex subscriptions
 */

// Type for session from Convex
interface ExamSession {
  _id: string;
  student_name: string;
  student_email?: string;
  status: 'active' | 'disconnected' | 'submitted' | 'expired';
  total_questions: number;
  answered_count: number;
  time_remaining_seconds?: number;
  violations_count: number;
  violations: Array<{ type: string; timestamp: number }>;
  last_heartbeat: number;
}

export function ProctorDashboard({ examId, examTitle }: ProctorDashboardProps) {
  const { sessions, stats, alerts, isLoading, enabled } = useProctorDashboard(examId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disconnected' | 'submitted'>('all');
  const [showAlerts, setShowAlerts] = useState(false);

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

  if (!enabled) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              Live Proctoring Disabled
            </h3>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Enable VITE_USE_CONVEX_PROCTORING to use this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="h-6 w-6 text-indigo-600" />
            Live Proctoring
          </h2>
          {examTitle && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{examTitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total"
          value={stats.total}
          color="indigo"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Active"
          value={stats.active}
          color="green"
          highlight={stats.active > 0}
        />
        <StatCard
          icon={<WifiOff className="h-5 w-5" />}
          label="Disconnected"
          value={stats.disconnected}
          color="yellow"
          highlight={stats.disconnected > 0}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Submitted"
          value={stats.submitted}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Violations"
          value={stats.total_violations}
          color="red"
          highlight={stats.total_violations > 0}
        />
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div 
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 cursor-pointer"
          onClick={() => setShowAlerts(!showAlerts)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">
                {alerts.length} student{alerts.length > 1 ? 's' : ''} with 2+ violations
              </span>
            </div>
            <span className="text-sm text-red-600">{showAlerts ? 'Hide' : 'Show'}</span>
          </div>
          
          {showAlerts && (
            <div className="mt-4 space-y-2">
              {(alerts as ExamSession[]).map((session: ExamSession) => (
                <div 
                  key={session._id} 
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3"
                >
                  <div>
                    <span className="font-medium">{session.student_name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {session.violations_count} violations
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {session.violations.slice(-3).map((v: { type: string; timestamp: number }, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                        {v.type}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disconnected">Disconnected</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Left
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Violations
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No sessions found
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session: ExamSession) => (
                  <SessionRow key={session._id} session={session} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Average Progress */}
      <div className="text-center text-sm text-gray-500">
        Average progress: <span className="font-medium">{stats.avg_progress}%</span>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: 'indigo' | 'green' | 'yellow' | 'red' | 'blue';
  highlight?: boolean;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className={`rounded-xl p-4 ${colorClasses[color]} ${highlight ? 'ring-2 ring-offset-2 ring-' + color + '-500' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// Session Row Component
function SessionRow({ session }: { session: ExamSession }) {
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
    : '-';

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${session.violations_count >= 2 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {session.student_name}
          </div>
          {session.student_email && (
            <div className="text-xs text-gray-500">{session.student_email}</div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[session.status as keyof typeof statusColors]}`}>
          {session.status === 'active' && (
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
          )}
          {session.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500">
            {session.answered_count}/{session.total_questions}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          <span>{timeLeftText}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`font-medium ${session.violations_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {session.violations_count}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {lastSeenText}
      </td>
    </tr>
  );
}
