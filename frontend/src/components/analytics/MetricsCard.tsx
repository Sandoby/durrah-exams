import type { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
        isPositive: boolean;
    };
    color?: 'indigo' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
    isLoading?: boolean;
}

export function MetricsCard({
    title,
    value,
    icon: Icon,
    trend,
    color = 'indigo',
    isLoading = false
}: MetricsCardProps) {

    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </p>
                    {isLoading ? (
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {value}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>

            {trend && !isLoading && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${trend.isPositive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                        {trend.label}
                    </span>
                </div>
            )}
        </div>
    );
}
