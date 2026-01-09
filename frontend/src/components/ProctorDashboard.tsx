import { useState, useMemo, useEffect } from 'react';
import { useProctorDashboard } from '../hooks/useConvexProctoring';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Shield,
  Search,
  LayoutGrid,
  List,
  Bell,
  Activity,
  XCircle,
  Monitor,
  Smartphone,
  WifiOff
} from 'lucide-react';

interface ProctorDashboardProps {
  examId: string;
  examTitle?: string;
}

interface ExamSession {
  _id: string;
  student_name: string;
  student_email?: string;
  status: 'active' | 'disconnected' | 'submitted' | 'expired';
  last_heartbeat: number;
  violation_count: number;
  violations: any[];
  current_question_index: number;
  total_questions: number;
  answered_count: number;
  time_remaining_seconds?: number;
  device_info?: {
    userAgent: string;
    screen: { width: number; height: number };
    type: 'mobile' | 'desktop' | 'tablet';
  };
  screen_resolution?: string;
  network_quality?: 'good' | 'fair' | 'poor';
  user_agent?: string;
  start_time: number;
}

export function ProctorDashboard({ examId, examTitle }: ProctorDashboardProps) {
  const { sessions, stats, alerts, isLoading, enabled } = useProctorDashboard(examId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disconnected' | 'submitted'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStudent, setSelectedStudent] = useState<ExamSession | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastViolationCount, setLastViolationCount] = useState(0);

  // Sound effect for new violations
  useEffect(() => {
    if (soundEnabled && alerts.length > lastViolationCount) {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    }
    setLastViolationCount(alerts.length);
  }, [alerts.length, soundEnabled, lastViolationCount]);

  const sortedSessions = useMemo(() => {
    let result = [...sessions];

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.student_name.toLowerCase().includes(q) ||
        s.student_email?.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Sort: Active violations first, then disconnected, then active
    return result.sort((a, b) => {
      if (b.violation_count !== a.violation_count) return b.violation_count - a.violation_count;
      if (a.status === 'disconnected' && b.status !== 'disconnected') return -1;
      if (b.status === 'disconnected' && a.status !== 'disconnected') return 1;
      return b.last_heartbeat - a.last_heartbeat;
    });
  }, [sessions, searchQuery, statusFilter]);

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-full shadow-sm mb-4 relative z-10">
          <WifiOff className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">Proctoring Not Active</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md relative z-10">
          Live proctoring is not enabled for this exam or the initialization failed. Please check the exam settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats & Controls */}
      <div className="flex flex-col gap-6">
        {/* Top Bar: Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Proctoring</h2>
              {examTitle && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[300px] truncate">{examTitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              LIVE
            </div>
          </div>
        </div>

        {/* Stats Grid - Clean Professional Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Students"
            value={stats.total}
            color="indigo"
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Active Now"
            value={stats.active}
            color="green"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Violations"
            value={stats.violations}
            color={stats.violations > 0 ? 'red' : 'green'}
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Submitted"
            value={stats.submitted}
            color="blue"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-md transition-all ${viewMode === mode
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                  {mode === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'active', 'disconnected', 'submitted'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${statusFilter === status
                      ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'border-transparent text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {sortedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">No students found matching your filters</p>
        </div>
      ) : viewMode === 'grid' ? (
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Violations</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
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

// ----------------------------------------------------------------------
// Sub-Components (Designed for "Good" Clean UI)
// ----------------------------------------------------------------------

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'indigo' | 'green' | 'red' | 'blue' | 'gray' }) {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800',
    gray: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-100 dark:border-gray-700'
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl border ${styles[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}


function StudentCard({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  // Helpers
  const isActive = session.status === 'active' && (Date.now() - session.last_heartbeat < 30000);
  const progress = Math.round((session.answered_count / session.total_questions) * 100) || 0;

  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 cursor-pointer
        ${session.violation_count > 0 ? 'border-amber-200 dark:border-amber-900/50' : 'border-gray-200 dark:border-slate-700'}
        hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700
      `}
    >
      {/* Active Indicator Strip */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
      )}

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          {/* Avatar Placeholder */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-50 dark:border-indigo-900/50">
              {session.student_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white leading-tight group-hover:text-indigo-600 transition-colors">
                {session.student_name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">{session.student_email || 'No email'}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${getStatusStyles(session.status, isActive)}`}>
            {session.status === 'active' && isActive ? 'Active' : session.status}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-medium">Progress</span>
            <span className="text-gray-900 dark:text-white font-bold">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Metrics Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700/50">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5" title="Device Type">
              {getDeviceIcon(session.device_info?.type)}
              <span className="hidden sm:inline capitalize">{session.device_info?.type || 'Unknown'}</span>
            </span>
            <span className="flex items-center gap-1.5" title="Time Elapsed">
              <Clock className="h-3.5 w-3.5" />
              {Math.floor((Date.now() - session.start_time) / 60000)}m
            </span>
          </div>

          {/* Violation Pill */}
          {session.violation_count > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              {session.violation_count} Flags
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
              <CheckCircle className="h-3.5 w-3.5" />
              Clean
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session, onClick }: { session: ExamSession; onClick: () => void }) {
  const isActive = session.status === 'active' && (Date.now() - session.last_heartbeat < 30000);
  const progress = Math.round((session.answered_count / session.total_questions) * 100) || 0;

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100 dark:border-indigo-800">
            {session.student_name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{session.student_name}</div>
            <div className="text-xs text-gray-500">{session.student_email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusStyles(session.status, isActive)}`}>
          {session.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="w-full max-w-[100px]">
          <div className="flex justify-between text-[10px] mb-1">
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-xs text-gray-500">
        {Math.floor((Date.now() - session.start_time) / 60000)} mins
      </td>
      <td className="px-6 py-4">
        {session.violation_count > 0 ? (
          <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded text-xs font-medium border border-amber-100 dark:border-amber-800">
            {session.violation_count} Issues
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-xs text-gray-500">
        {Math.floor((Date.now() - session.last_heartbeat) / 1000)}s ago
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------
// Utils / Styles
// ----------------------------------------------------------------------

function getStatusStyles(status: string, isActive: boolean) {
  if (status === 'disconnected') return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700';
  if (status === 'submitted') return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
  if (isActive) return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
  return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'; // Idle/Lagging
}

function getDeviceIcon(type?: string) {
  switch (type) {
    case 'mobile': return <Smartphone className="h-3.5 w-3.5" />;
    case 'tablet': return <Monitor className="h-3.5 w-3.5" />; // Use Monitor as Tablet icon approx
    default: return <Monitor className="h-3.5 w-3.5" />;
  }
}

function StudentDetailModal({ session, onClose }: { session: ExamSession; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-pop">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-start bg-gray-50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{session.student_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Session ID: <span className="font-mono text-xs">{session._id}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1 uppercase tracking-wide">Progress</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round((session.answered_count / session.total_questions) * 100)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">{session.answered_count} / {session.total_questions} answered</div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1 uppercase tracking-wide">Violations</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {session.violation_count}
                {session.violation_count > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="text-xs text-gray-500 mt-1">Detected flags</div>
            </div>
          </div>

          <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            Activity Log
          </h4>

          <div className="space-y-3">
            {session.violations && session.violations.length > 0 ? (
              session.violations.map((v: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{v.type}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{v.details || 'Suspicious activity detected'}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{new Date(v.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No violations recorded yet. Ideal session.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
