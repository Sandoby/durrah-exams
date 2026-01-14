import { Users, BarChart3, Zap, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    trendUp?: boolean;
    color: 'indigo' | 'purple' | 'green' | 'amber';
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: StatCardProps) {
    const colorStyles = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorStyles[color]} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp
                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        </div>
    );
}

export function StatsOverview({ stats }: { stats: any }) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <StatCard
                title={t('dashboard.stats.totalExams', 'Total Exams')}
                value={stats.totalExams}
                icon={FileText}
                color="indigo"
            />
            <StatCard
                title={t('dashboard.stats.activeExams', 'Active Exams')}
                value={stats.activeExams}
                icon={Zap}
                color="purple"
            />
            <StatCard
                title={t('dashboard.stats.totalStudents', 'Students Reached')}
                value={stats.totalStudents}
                icon={Users}
                color="amber"
            />
            <StatCard
                title={t('dashboard.stats.avgScore', 'Avg. Score')}
                value={`${stats.avgScore}%`}
                icon={BarChart3}
                color="green"
            />
        </div>
    );
}
