import { Search, Filter, X } from 'lucide-react';

export interface UserFilters {
    searchTerm: string;
    subscriptionStatus: 'all' | 'active' | 'inactive' | 'expired';
    subscriptionPlan: 'all' | 'pro' | 'basic';
    dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
    customDateStart?: string;
    customDateEnd?: string;
    sortBy: 'created_at' | 'email' | 'subscription_end_date' | 'last_login';
    sortOrder: 'asc' | 'desc';
}

interface UserFiltersProps {
    filters: UserFilters;
    onFiltersChange: (filters: UserFilters) => void;
    totalResults: number;
}

export function UserFiltersComponent({ filters, onFiltersChange, totalResults }: UserFiltersProps) {
    const updateFilter = (key: keyof UserFilters, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({
            searchTerm: '',
            subscriptionStatus: 'all',
            subscriptionPlan: 'all',
            dateRange: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        });
    };

    const hasActiveFilters =
        filters.searchTerm !== '' ||
        filters.subscriptionStatus !== 'all' ||
        filters.subscriptionPlan !== 'all' ||
        filters.dateRange !== 'all';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                    <span className="text-sm text-gray-500">({totalResults} results)</span>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                    >
                        <X className="h-4 w-4" />
                        Clear all
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={filters.searchTerm}
                            onChange={(e) => updateFilter('searchTerm', e.target.value)}
                            placeholder="Search by email or name..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>
                </div>

                {/* Subscription Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                    </label>
                    <select
                        value={filters.subscriptionStatus}
                        onChange={(e) => updateFilter('subscriptionStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                {/* Plan Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Plan
                    </label>
                    <select
                        value={filters.subscriptionPlan}
                        onChange={(e) => updateFilter('subscriptionPlan', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="all">All Plans</option>
                        <option value="pro">Professional</option>
                        <option value="basic">Basic</option>
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sort By
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={filters.sortBy}
                            onChange={(e) => updateFilter('sortBy', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        >
                            <option value="created_at">Newest</option>
                            <option value="email">Email</option>
                            <option value="subscription_end_date">Expiring</option>
                        </select>
                        <button
                            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Range (if custom) */}
            {filters.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.customDateStart || ''}
                            onChange={(e) => updateFilter('customDateStart', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.customDateEnd || ''}
                            onChange={(e) => updateFilter('customDateEnd', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
