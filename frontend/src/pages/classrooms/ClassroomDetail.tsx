import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  FileText,
  Settings,
  Archive,
  Trash2,
  MoreVertical,
  Loader2,
  LayoutGrid,
  Clock,
  Bell,
  Clipboard,
  Zap,
} from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';
import { useAuth } from '../../context/AuthContext';
import { FloatingDashboardNavbar } from '../../components/dashboard/FloatingDashboardNavbar';
import { StudentRoster } from './components/StudentRoster';
import { EnrollmentModal } from './components/EnrollmentModal';
import { OverviewTab } from './tabs/OverviewTab';
import { ExamsTab } from './tabs/ExamsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { AnnouncementsTab } from './tabs/AnnouncementsTab';
import { AssignmentsTab } from './tabs/AssignmentsTab';
import { AdvancedFeaturesTab } from './tabs/AdvancedFeaturesTab';
import { supabase } from '../../lib/supabase';
import type { Classroom, ClassroomStats } from '../../types/classroom';

type Tab = 'overview' | 'roster' | 'exams' | 'announcements' | 'assignments' | 'advanced' | 'settings';

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

export default function ClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getClassroom, getClassroomStats, archiveClassroom, deleteClassroom, regenerateInviteCode } =
    useClassrooms();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [stats, setStats] = useState<ClassroomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [rosterKey, setRosterKey] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const isTutor = classroom?.tutor_id === profile?.id;

  const loadClassroom = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [data, statsData] = await Promise.all([getClassroom(id), getClassroomStats(id)]);
    setClassroom(data);
    setStats(statsData);
    setLoading(false);
  }, [id, getClassroom, getClassroomStats]);

  const loadActivities = useCallback(async () => {
    if (!id) return;
    setLoadingActivities(true);
    try {
      const [{ data: enrollments }, { data: examLinks }] = await Promise.all([
        supabase
          .from('classroom_students')
          .select(`id, enrolled_at, status, enrollment_method,
            student:profiles!student_id(full_name, email)`)
          .eq('classroom_id', id)
          .order('enrolled_at', { ascending: false })
          .limit(10),
        supabase
          .from('classroom_exams')
          .select(`id, added_at, exam:exams(title)`)
          .eq('classroom_id', id)
          .order('added_at', { ascending: false })
          .limit(10),
      ]);

      const combined: Activity[] = [];

      (enrollments || []).forEach((e: Record<string, unknown>) => {
        const student = Array.isArray(e.student)
          ? (e.student as Record<string, string>[])[0]
          : (e.student as Record<string, string>);
        combined.push({
          id: `enroll-${e.id as string}`,
          type: 'enrollment',
          timestamp: e.enrolled_at as string,
          data: {
            studentName: student?.full_name || student?.email || 'Unknown',
            status: e.status as string,
            method: e.enrollment_method as string,
          },
        });
      });

      (examLinks || []).forEach((l: Record<string, unknown>) => {
        const exam = Array.isArray(l.exam)
          ? (l.exam as Record<string, string>[])[0]
          : (l.exam as Record<string, string>);
        combined.push({
          id: `exam-${l.id as string}`,
          type: 'exam_assigned',
          timestamp: l.added_at as string,
          data: { examTitle: exam?.title || 'Untitled Exam' },
        });
      });

      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(combined.slice(0, 15));
    } catch {
      // non-critical — silently fail
    } finally {
      setLoadingActivities(false);
    }
  }, [id]);

  useEffect(() => {
    loadClassroom();
    loadActivities();
  }, [loadClassroom, loadActivities]);

  const refreshAll = useCallback(() => {
    loadClassroom();
    loadActivities();
  }, [loadClassroom, loadActivities]);

  const handleArchive = async () => {
    if (!id || !classroom) return;
    await archiveClassroom(id, !classroom.is_archived);
    loadClassroom();
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    const success = await deleteClassroom(id);
    if (success) navigate('/classrooms');
  };

  const handleRegenerateCode = async () => {
    if (!id) return;
    setRegenerating(true);
    const newCode = await regenerateInviteCode(id);
    if (newCode && classroom) {
      setClassroom({ ...classroom, invite_code: newCode });
    }
    setRegenerating(false);
  };

  // Archive/delete from navbar menu still use browser confirm here
  // (SettingsTab handles it via ConfirmationModal for the settings page)
  const handleNavbarArchive = async () => {
    if (!id || !classroom) return;
    if (!confirm(classroom.is_archived ? 'Unarchive this classroom?' : 'Archive this classroom?'))
      return;
    await archiveClassroom(id, !classroom.is_archived);
    loadClassroom();
    setMenuOpen(false);
  };

  const handleNavbarDelete = async () => {
    if (!id) return;
    if (!confirm('Permanently delete this classroom? This cannot be undone.')) return;
    const success = await deleteClassroom(id);
    if (success) navigate('/classrooms');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Classroom not found</p>
        <Link to="/classrooms" className="text-blue-600 hover:text-blue-700">
          ← Back to classrooms
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: LayoutGrid },
    { id: 'roster' as Tab, label: 'Students', icon: Users, badge: stats?.total_students },
    { id: 'exams' as Tab, label: 'Exams', icon: FileText, badge: stats?.total_exams },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Bell },
    { id: 'assignments' as Tab, label: 'Assignments', icon: Clipboard },
    { id: 'advanced' as Tab, label: 'Advanced', icon: Zap },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <Helmet>
        <title>{classroom.name} | Durrah Tutors</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <FloatingDashboardNavbar
          title={classroom.name}
          showBack={true}
          actions={
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 overflow-hidden">
                    <button
                      onClick={handleNavbarArchive}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      {classroom.is_archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      onClick={handleNavbarDelete}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 p-8 mb-8">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${classroom.color} 0%, transparent 100%)` }}
            />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-black/5 ring-4 ring-white dark:ring-slate-800"
                style={{ backgroundColor: classroom.color }}
              >
                {classroom.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {classroom.name}
                  </h1>
                  {classroom.is_archived && (
                    <span className="px-3 py-1 text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-slate-700">
                      Archived
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {classroom.subject && (
                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {classroom.subject}
                    </span>
                  )}
                  {classroom.grade_level && (
                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {classroom.grade_level}
                    </span>
                  )}
                  {classroom.academic_year && (
                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700/50">
                      <Clock className="w-3.5 h-3.5" />
                      {classroom.academic_year}
                    </span>
                  )}
                </div>

                {classroom.description && (
                  <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                    {classroom.description}
                  </p>
                )}
              </div>
            </div>

            {/* Tab Pills */}
            <div className="mt-8 flex items-center gap-1 bg-gray-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl w-fit backdrop-blur-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <tab.icon
                    className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : ''}`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'overview' && (
              <OverviewTab
                classroom={classroom}
                stats={stats}
                activities={activities}
                loadingActivities={loadingActivities}
                regenerating={regenerating}
                onRegenerate={handleRegenerateCode}
              />
            )}

            {activeTab === 'roster' && (
              <>
                <StudentRoster
                  key={rosterKey}
                  classroomId={id!}
                  classroomName={classroom.name}
                  onAddStudent={() => setShowEnrollModal(true)}
                />
                {showEnrollModal && (
                  <EnrollmentModal
                    classroomId={id!}
                    classroomName={classroom.name}
                    onClose={() => setShowEnrollModal(false)}
                    onSuccess={() => {
                      setRosterKey((k) => k + 1);
                      refreshAll();
                    }}
                  />
                )}
              </>
            )}

            {activeTab === 'exams' && (
              <ExamsTab classroomId={id!} onStatsChange={refreshAll} />
            )}

            {activeTab === 'announcements' && (
              <AnnouncementsTab classroomId={id!} isTutor={isTutor} />
            )}

            {activeTab === 'assignments' && (
              <AssignmentsTab classroomId={id!} isTutor={isTutor} />
            )}

            {activeTab === 'advanced' && (
              <AdvancedFeaturesTab classroomId={id!} isTutor={isTutor} />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                classroom={classroom}
                onRefresh={loadClassroom}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
