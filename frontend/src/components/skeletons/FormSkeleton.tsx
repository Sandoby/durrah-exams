// Reusable Form Skeleton Component
export function FormSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 space-y-6 animate-pulse">
            {/* Form Title */}
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Field 1 */}
                <div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>

                {/* Field 2 */}
                <div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>

                {/* Field 3 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </div>
                    <div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </div>
                </div>

                {/* Field 4 */}
                <div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-2"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
        </div>
    );
}
