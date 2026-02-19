import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Archive as ArchiveIcon, LayoutGrid, Filter } from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';
import { ClassroomCard } from './components/ClassroomCard';
import { Helmet } from 'react-helmet-async';
import { FloatingDashboardNavbar } from '../../components/dashboard/FloatingDashboardNavbar';

export default function ClassroomList() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived' | 'all'>('active');
  const { classrooms, isLoading } = useClassrooms(filterStatus === 'all' || filterStatus === 'archived');

  const filteredClassrooms = useMemo(() => {
    let results = classrooms;

    // Filter by status
    if (filterStatus === 'active') {
      results = results.filter((c) => !c.is_archived);
    } else if (filterStatus === 'archived') {
      results = results.filter((c) => c.is_archived);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.subject && c.subject.toLowerCase().includes(query)) ||
          (c.grade_level && c.grade_level.toLowerCase().includes(query)) ||
          c.invite_code.toLowerCase().includes(query)
      );
    }

    return results;
  }, [classrooms, searchQuery, filterStatus]);

  const activeClassrooms = filteredClassrooms.filter((c) => !c.is_archived);
  const archivedClassrooms = filteredClassrooms.filter((c) => c.is_archived);

  return (
    <>
      <Helmet>
        <title>{t('classrooms.title', 'My Classrooms')} | Durrah Tutors</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <FloatingDashboardNavbar 
          title={t('classrooms.title', 'My Classrooms')}
          showBack={true}
          backPath="/dashboard"
          actions={
            <Link
              to="/classrooms/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200 dark:shadow-none transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">
                {t('classrooms.createNew', 'New Classroom')}
              </span>
            </Link>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
          
          {/* Search & Filters Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-2 mb-8 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('dashboard.search', 'Search classrooms...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0"
              />
            </div>
            
            <div className="h-auto w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden sm:block" />

            <div className="relative min-w-[180px]">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-3 rounded-xl border-none bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer appearance-none"
                >
                  <option value="active">{t('classrooms.roster.filterActive', 'Active Classrooms')}</option>
                  <option value="archived">{t('classrooms.archive.archived', 'Archived')}</option>
                  <option value="all">{t('classrooms.roster.filterAll', 'All Classrooms')}</option>
                </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {t('common.loading', 'Loading your classrooms...')}
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && classrooms.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-6">
                <LayoutGrid className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('classrooms.empty.title', 'No classrooms yet')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                {t(
                  'classrooms.empty.description',
                  'Create your first classroom to organize students, assign exams, and track progress effectively.'
                )}
              </p>
              <Link
                to="/classrooms/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg hover:shadow-indigo-500/25 transition-all hover:-translate-y-1"
              >
                <Plus className="w-5 h-5" />
                {t('classrooms.empty.cta', 'Create First Classroom')}
              </Link>
            </div>
          )}

          {/* Active Classrooms Grid */}
          {!isLoading && activeClassrooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
              {activeClassrooms.map((classroom) => (
                <div key={classroom.id} className="h-full">
                   <ClassroomCard classroom={classroom} />
                </div>
              ))}
            </div>
          )}

          {/* Archived Section */}
          {!isLoading && archivedClassrooms.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
                   <ArchiveIcon className="w-5 h-5 text-gray-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('classrooms.archive.archived', 'Archived Classrooms')}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                {archivedClassrooms.map((classroom) => (
                  <div key={classroom.id} className="h-full">
                     <ClassroomCard classroom={classroom} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Search Results */}
          {!isLoading && filteredClassrooms.length === 0 && classrooms.length > 0 && (
            <div className="text-center py-20">
               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
                 <Search className="w-8 h-8 text-gray-400" />
               </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                No classrooms found
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
              <button 
                onClick={() => {setSearchQuery(''); setFilterStatus('all');}}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
