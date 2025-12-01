// Reusable Table Skeleton Component
interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="grid gap-4 animate-pulse" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {Array.from({ length: columns }).map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="px-6 py-4 animate-pulse">
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <div key={colIndex} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
