import { RefreshCw } from 'lucide-react';
import { InviteCodeDisplay } from '../components/InviteCodeDisplay';
import { ActivityFeed } from '../components/ActivityFeed';
import type { Classroom, ClassroomStats } from '../../../types/classroom';

interface Activity {
  id: string;
  type: 'enrollment' | 'exam_assigned';
  timestamp: string;
  data: {
    studentName?: string;
    status?: string;
    method?: string;
    examTitle?: string;
  };
}

interface OverviewTabProps {
  classroom: Classroom;
  stats: ClassroomStats | null;
  activities: Activity[];
  loadingActivities: boolean;
  regenerating: boolean;
  onRegenerate: () => void;
}

export function OverviewTab({
  classroom,
  stats,
  activities,
  loadingActivities,
  regenerating,
  onRegenerate,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Invite Code */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Code</h2>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>
        <InviteCodeDisplay code={classroom.invite_code} classroomName={classroom.name} />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.total_students}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Students</div>
            {stats.pending_students > 0 && (
              <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                {stats.pending_students} pending approval
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.active_students}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Students</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.total_exams}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Assigned Exams</div>
          </div>
        </div>
      )}

      {/* Description empty-state prompt */}
      {!classroom.description && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
          Add a description in <span className="font-semibold">Settings</span> to help students understand what this classroom is about.
        </div>
      )}

      {/* Activity Feed */}
      <ActivityFeed activities={activities} loading={loadingActivities} />
    </div>
  );
}
