import { Search, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchFilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterStatus: 'all' | 'active' | 'inactive';
    onFilterChange: (status: 'all' | 'active' | 'inactive') => void;
    viewMode: 'grid' | 'list';
    onViewChange: (mode: 'grid' | 'list') => void;
}

export function SearchFilterBar({
    searchQuery,
    onSearchChange,
    filterStatus,
    onFilterChange,
    viewMode,
    onViewChange
}: SearchFilterBarProps) {
    const { t } = useTranslation();

    return (
        <div className="sticky top-24 z-30 mb-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder={t('dashboard.searchPlaceholder', 'Search exams by title...')}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all placeholder:text-gray-400 text-gray-900 dark:text-white font-medium"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="hidden sm:inline-flex items-center h-5 px-2 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">CMD+K</kbd>
                    </div>
                </div>

                {/* Filters & View Toggle */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <div className="flex items-center bg-gray-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                        {(['all', 'active', 'inactive'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => onFilterChange(status)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterStatus === status
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {t(`dashboard.filter.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden sm:block" />

                    <div className="flex bg-gray-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                        <button
                            onClick={() => onViewChange('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onViewChange('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
