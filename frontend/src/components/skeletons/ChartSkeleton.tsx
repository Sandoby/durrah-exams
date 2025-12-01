// Reusable Chart Skeleton Component
export function ChartSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
            {/* Chart Title */}
            <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>

            {/* Chart Area */}
            <div className="h-64 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex items-end justify-around p-4 gap-2">
                {/* Simulated bar chart */}
                {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
                    <div
                        key={i}
                        className="bg-gray-200 dark:bg-gray-700 rounded-t w-full transition-all"
                        style={{ height: `${height}%` }}
                    ></div>
                ))}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
            </div>
        </div>
    );
}
