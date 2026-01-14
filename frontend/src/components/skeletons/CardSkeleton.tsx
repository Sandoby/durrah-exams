// Reusable Card Skeleton Component
export function CardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm animate-pulse relative overflow-hidden">
            {/* Left Stripe */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 dark:bg-slate-700" />

            <div className="p-6 pl-8">
                {/* Header Skeletons */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                        <div className="flex gap-2 mb-3">
                            <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                            <div className="h-5 w-20 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                        </div>
                        <div className="h-7 bg-gray-200 dark:bg-slate-700 rounded-xl w-3/4 mb-3"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6"></div>
                        </div>
                    </div>
                    <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
                </div>

                {/* Metadata Row Skeleton */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>

                {/* Actions Grid Skeleton */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
                    <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
}
