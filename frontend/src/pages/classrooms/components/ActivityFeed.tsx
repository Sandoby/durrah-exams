import { Users, FileText, Clock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

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

interface ActivityFeedProps {
  activities: Activity[];
  loading: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recent Activity
      </h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No activity yet. Share the invite code to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {activity.type === 'enrollment' ? (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {activity.type === 'enrollment' ? (
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.data.studentName}</span>
                      {' '}
                      {activity.data.status === 'active'
                        ? 'joined'
                        : activity.data.status === 'pending'
                        ? 'requested to join'
                        : activity.data.status === 'suspended'
                        ? 'was suspended from'
                        : 'left'}
                      {' '}the classroom
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {activity.data.method && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          • via {activity.data.method.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      Exam <span className="font-medium">{activity.data.examTitle}</span> was assigned
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
