import { useState, useEffect } from 'react';
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
  RefreshCw,
  Plus,
  Link as LinkIcon,
  Unlink,
  Calendar,
  Clock,
} from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';
import { FloatingDashboardNavbar } from '../../components/dashboard/FloatingDashboardNavbar';
import { InviteCodeDisplay } from './components/InviteCodeDisplay';
import { StudentRoster } from './components/StudentRoster';
import { EnrollmentModal } from './components/EnrollmentModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import type { Classroom, ClassroomStats } from '../../types/classroom';

type Tab = 'overview' | 'roster' | 'exams' | 'settings';

export default function ClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getClassroom, getClassroomStats, archiveClassroom, deleteClassroom, regenerateInviteCode } = useClassrooms();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [stats, setStats] = useState<ClassroomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  // Exams tab state
  const [classroomExams, setClassroomExams] = useState<any[]>([]);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // Roster tab state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [rosterKey, setRosterKey] = useState(0);
  
  // Settings tab state
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Activity feed state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    loadClassroom();
    if (id) {
      loadActivities();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'exams' && id) {
      loadExams();
    } else if (activeTab === 'settings' && classroom) {
      setEditForm({
        name: classroom.name,
        subject: classroom.subject || '',
        grade_level: classroom.grade_level || '',
        description: classroom.description || '',
        color: classroom.color,
        academic_year: classroom.academic_year || '',
        settings: classroom.settings || {},
      });
    }
  }, [activeTab, id, classroom]);

  const loadClassroom = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getClassroom(id);
    const statsData = await getClassroomStats(id);
    setClassroom(data);
    setStats(statsData);
    setLoading(false);
  };

  const loadActivities = async () => {
    if (!id) return;
    setLoadingActivities(true);

    try {
      // Fetch recent enrollments
      const { data: enrollments } = await supabase
        .from('classroom_students')
        .select(`
          id,
          enrolled_at,
          status,
          enrollment_method,
          student:profiles!student_id (
            full_name,
            email
          )
        `)
        .eq('classroom_id', id)
        .order('enrolled_at', { ascending: false })
        .limit(10);

      // Fetch recent exam assignments
      const { data: examLinks } = await supabase
        .from('classroom_exams')
        .select(`
          id,
          added_at,
          exam:exams (
            title
          )
        `)
        .eq('classroom_id', id)
        .order('added_at', { ascending: false })
        .limit(10);

      // Combine and sort activities
      const allActivities: Array<{
        id: string;
        type: string;
        timestamp: string;
        data: any;
      }> = [];

      if (enrollments) {
        enrollments.forEach((enrollment: any) => {
          const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
          allActivities.push({
            id: `enroll-${enrollment.id}`,
            type: 'enrollment',
            timestamp: enrollment.enrolled_at,
            data: {
              studentName: student?.full_name || student?.email || 'Unknown',
              status: enrollment.status,
              method: enrollment.enrollment_method,
            },
          });
        });
      }

      if (examLinks) {
        examLinks.forEach((link: any) => {
          const exam = Array.isArray(link.exam) ? link.exam[0] : link.exam;
          allActivities.push({
            id: `exam-${link.id}`,
            type: 'exam_assigned',
            timestamp: link.added_at,
            data: {
              examTitle: exam?.title || 'Untitled Exam',
            },
          });
        });
      }

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 15)); // Show latest 15 activities
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadExams = async () => {
    if (!id || !user) return;
    setLoadingExams(true);

    try {
      // Load classroom exams
      const { data: linkedExams } = await supabase
        .from('classroom_exams')
        .select(`
          id,
          added_at,
          exam:exams (
            id,
            title,
            description,
            created_at
          )
        `)
        .eq('classroom_id', id);

      if (linkedExams) {
        setClassroomExams(linkedExams.map((item: any) => ({
          ...item,
          exam: Array.isArray(item.exam) ? item.exam[0] : item.exam
        })));
      }

      // Load available exams (tutor's exams not yet linked to this classroom)
      const { data: tutorExams, error: examsError } = await supabase
        .from('exams')
        .select('id, title, description, created_at')
        .eq('tutor_id', user.id)
        .order('created_at', { ascending: false });

      if (examsError) {
        console.error('Error fetching tutor exams:', examsError);
        throw examsError;
      }

      if (tutorExams) {
        const linkedExamIds = linkedExams?.map((le: any) => {
          const exam = Array.isArray(le.exam) ? le.exam[0] : le.exam;
          return exam?.id;
        }) || [];
        setAvailableExams(tutorExams.filter(exam => !linkedExamIds.includes(exam.id)));
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoadingExams(false);
    }
  };

  const linkExam = async (examId: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('classroom_exams')
        .insert({ classroom_id: id, exam_id: examId });

      if (error) throw error;
      
      toast.success('Exam linked to classroom');
      loadExams();
      loadClassroom(); // Refresh stats
      loadActivities(); // Refresh activity feed
      setShowLinkModal(false);
    } catch (error: any) {
      console.error('Error linking exam:', error);
      toast.error(error.message || 'Failed to link exam');
    }
  };

  const unlinkExam = async (linkId: string) => {
    if (!confirm('Remove this exam from the classroom?')) return;

    try {
      const { error } = await supabase
        .from('classroom_exams')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      
      toast.success('Exam removed from classroom');
      loadExams();
      loadClassroom(); // Refresh stats
      loadActivities(); // Refresh activity feed
    } catch (error: any) {
      console.error('Error unlinking exam:', error);
      toast.error(error.message || 'Failed to remove exam');
    }
  };

  const handleArchive = async () => {
    if (!id || !classroom) return;
    if (!confirm(classroom.is_archived ? 'Unarchive this classroom?' : 'Archive this classroom?')) return;
    
    await archiveClassroom(id, !classroom.is_archived);
    loadClassroom();
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('⚠️ Permanently delete this classroom? This cannot be undone.')) return;
    
    const success = await deleteClassroom(id);
    if (success) {
      navigate('/classrooms');
    }
  };

  const handleRegenerateCode = async () => {
    if (!id) return;
    if (!confirm('Generate a new invite code? The old code will stop working.')) return;
    
    setRegenerating(true);
    const newCode = await regenerateInviteCode(id);
    if (newCode && classroom) {
      setClassroom({ ...classroom, invite_code: newCode });
    }
    setRegenerating(false);
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
    { id: 'roster' as Tab, label: 'Students', icon: Users, badge: classroom.student_count },
    { id: 'exams' as Tab, label: 'Exams', icon: FileText, badge: stats?.total_exams },
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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 overflow-hidden">
                    <button
                      onClick={handleArchive}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      {classroom.is_archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      onClick={handleDelete}
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
          {/* Glassmorphic Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 p-8 mb-8">
            {/* Dynamic Gradient Background */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ 
                background: `linear-gradient(135deg, ${classroom.color} 0%, transparent 100%)` 
              }}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {classroom.subject}
                    </span>
                  )}
                  {classroom.grade_level && (
                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
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

            {/* Floating Pills Tabs */}
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
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                    }`}>
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
            <div className="space-y-6">
              {/* Invite Code */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invite Code
                  </h2>
                  <button
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
                <InviteCodeDisplay code={classroom.invite_code} classroomName={classroom.name} />
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.total_students}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
                    {stats.pending_students > 0 && (
                      <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                        {stats.pending_students} pending
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.active_students}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Students</div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.total_exams}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Assigned Exams</div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h2>
                
                {loadingActivities ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No activity yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {activity.type === 'enrollment' ? (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {activity.type === 'enrollment' ? (
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">
                                <span className="font-medium">{activity.data.studentName}</span>
                                {' '}
                                {activity.data.status === 'active' ? 'joined' : 
                                 activity.data.status === 'pending' ? 'requested to join' : 
                                 activity.data.status === 'suspended' ? 'was suspended from' : 'left'}
                                {' '}the classroom
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(activity.timestamp).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {activity.data.method && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    • via {activity.data.method.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">
                                Exam <span className="font-medium">{activity.data.examTitle}</span> was assigned
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(activity.timestamp).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                    setRosterKey(prev => prev + 1);
                    loadClassroom(); // Refresh stats
                    loadActivities(); // Refresh activity feed
                  }}
                />
              )}
            </>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Assigned Exams
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Link your exams to this classroom for students to access
                  </p>
                </div>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Link Exam
                </button>
              </div>

              {/* Linked Exams List */}
              {loadingExams ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : classroomExams.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No exams linked to this classroom yet
                    </p>
                    <button
                      onClick={() => setShowLinkModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Link Your First Exam
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {classroomExams.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {item.exam?.title || 'Untitled Exam'}
                            </h3>
                            {!item.exam?.is_published && (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                          {item.exam?.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {item.exam.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Created {new Date(item.exam?.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              <span>Linked {new Date(item.added_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            to={`/exams/${item.exam?.id}`}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="View Exam"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => unlinkExam(item.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove from Classroom"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Link Exam Modal */}
              {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Link Exam to Classroom
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Select an exam from your library to assign to this classroom
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {availableExams.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            No exams available to link
                          </p>
                          <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Create New Exam
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableExams.map((exam) => (
                            <button
                              key={exam.id}
                              onClick={() => linkExam(exam.id)}
                              className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                      {exam.title}
                                    </h4>
                                    {!exam.is_published && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded">
                                        Draft
                                      </span>
                                    )}
                                  </div>
                                  {exam.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                      {exam.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <LinkIcon className="w-5 h-5 text-blue-600" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setShowLinkModal(false)}
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Edit Classroom Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Classroom Information
                  </h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!id) return;
                  
                  setSaving(true);
                  try {
                    const { error } = await supabase
                      .from('classrooms')
                      .update({
                        name: editForm.name,
                        subject: editForm.subject,
                        grade_level: editForm.grade_level,
                        description: editForm.description,
                        color: editForm.color,
                        academic_year: editForm.academic_year,
                        settings: editForm.settings,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', id);

                    if (error) throw error;
                    
                    toast.success('Classroom updated successfully');
                    setIsEditing(false);
                    loadClassroom();
                  } catch (error: any) {
                    console.error('Error updating classroom:', error);
                    toast.error(error.message || 'Failed to update classroom');
                  } finally {
                    setSaving(false);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Classroom Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        disabled={!isEditing}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={editForm.subject || ''}
                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g., Mathematics"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Grade Level
                      </label>
                      <input
                        type="text"
                        value={editForm.grade_level || ''}
                        onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g., Grade 10"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={editForm.academic_year || ''}
                        onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g., 2024-2025"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Describe this classroom..."
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editForm.color || '#3B82F6'}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        disabled={!isEditing}
                        className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {editForm.color || '#3B82F6'}
                      </span>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          if (classroom) {
                            setEditForm({
                              name: classroom.name,
                              subject: classroom.subject || '',
                              grade_level: classroom.grade_level || '',
                              description: classroom.description || '',
                              color: classroom.color,
                              academic_year: classroom.academic_year || '',
                              settings: classroom.settings || {},
                            });
                          }
                        }}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Classroom Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Enrollment Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Auto-approve Students
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically approve student enrollment requests
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!id) return;
                        const newSettings = {
                          ...editForm.settings,
                          auto_approve_students: !editForm.settings?.auto_approve_students,
                        };
                        
                        const { error } = await supabase
                          .from('classrooms')
                          .update({ settings: newSettings })
                          .eq('id', id);
                        
                        if (!error) {
                          setEditForm({ ...editForm, settings: newSettings });
                          loadClassroom();
                          toast.success('Setting updated');
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editForm.settings?.auto_approve_students
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.settings?.auto_approve_students ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Show Student List
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Allow students to see other students in the classroom
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!id) return;
                        const newSettings = {
                          ...editForm.settings,
                          show_student_list_to_students: !editForm.settings?.show_student_list_to_students,
                        };
                        
                        const { error } = await supabase
                          .from('classrooms')
                          .update({ settings: newSettings })
                          .eq('id', id);
                        
                        if (!error) {
                          setEditForm({ ...editForm, settings: newSettings });
                          loadClassroom();
                          toast.success('Setting updated');
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editForm.settings?.show_student_list_to_students
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.settings?.show_student_list_to_students ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800 p-6">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">
                  Danger Zone
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {classroom?.is_archived ? 'Unarchive' : 'Archive'} Classroom
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {classroom?.is_archived 
                          ? 'Make this classroom active again'
                          : 'Hide this classroom and prevent new enrollments'
                        }
                      </div>
                    </div>
                    <button
                      onClick={handleArchive}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                    >
                      {classroom?.is_archived ? 'Unarchive' : 'Archive'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t-2 border-red-200 dark:border-red-800">
                    <div>
                      <div className="font-medium text-red-900 dark:text-red-300">
                        Delete Classroom
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Permanently delete this classroom and all its data
                      </div>
                    </div>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
