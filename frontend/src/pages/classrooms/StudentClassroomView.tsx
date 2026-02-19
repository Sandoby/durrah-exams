import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, FileText, BarChart2, Users, Loader2, Clock } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Classroom } from '../../types/classroom';

interface EnrolledClassroom extends Classroom {
  enrollment_status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

interface ClassroomExam {
  id: string;
  exam_id: string;
  assigned_at: string;
  due_date: string | null;
  exam: {
    id: string;
    title: string;
    description: string;
    created_at: string;
  };
}

type Tab = 'exams' | 'results' | 'students';

export default function StudentClassroomView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('exams');
  const [classroom, setClassroom] = useState<EnrolledClassroom | null>(null);
  const [exams, setExams] = useState<ClassroomExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassroom();
    loadExams();
  }, [id, user]);

  const loadClassroom = async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('classroom_students')
      .select(`
        status,
        enrolled_at,
        classroom:classrooms(*)
      `)
      .eq('classroom_id', id)
      .eq('student_id', user.id)
      .single();

    if (!error && data && data.classroom) {
      const classroomData = Array.isArray(data.classroom) ? data.classroom[0] : data.classroom;
      setClassroom({
        ...classroomData,
        enrollment_status: data.status,
        joined_at: data.enrolled_at,
      } as EnrolledClassroom);
    } else {
      // Not enrolled or not found
      navigate('/my/classrooms');
    }

    setLoading(false);
  };

  const loadExams = async () => {
    if (!id) return;

    const { data } = await supabase
      .from('classroom_exams')
      .select(`
        id,
        exam_id,
        assigned_at,
        due_date,
        exam:exams(id, title, description, created_at)
      `)
      .eq('classroom_id', id)
      .order('assigned_at', { ascending: false });

    if (data) {
      const mappedExams = data.map((item: any) => ({
        id: item.id,
        exam_id: item.exam_id,
        assigned_at: item.assigned_at,
        due_date: item.due_date,
        exam: Array.isArray(item.exam) && item.exam.length > 0 ? item.exam[0] : item.exam,
      }));
      setExams(mappedExams);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!classroom) {
    return null;
  }

  const isPending = classroom.enrollment_status === 'pending';
  const isSuspended = classroom.enrollment_status === 'suspended';

  const tabs = [
    { id: 'exams' as Tab, label: 'Exams', icon: FileText, badge: exams.length },
    { id: 'results' as Tab, label: 'My Results', icon: BarChart2 },
    ...(classroom.settings?.show_student_list_to_students
      ? [{ id: 'students' as Tab, label: 'Students', icon: Users }]
      : []),
  ];

  return (
    <>
      <Helmet>
        <title>{classroom.name} | Durrah Tutors</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Top Row */}
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/my/classrooms"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="hidden sm:block">
                <Logo />
              </div>
            </div>

            {/* Classroom Header */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md"
                style={{ backgroundColor: classroom.color }}
              >
                {classroom.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {classroom.name}
                  </h1>
                  {isPending && (
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                      Pending
                    </span>
                  )}
                  {isSuspended && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                      Suspended
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {classroom.subject && <span>{classroom.subject}</span>}
                  {classroom.grade_level && <span>• {classroom.grade_level}</span>}
                  {classroom.academic_year && <span>• {classroom.academic_year}</span>}
                </div>
                {classroom.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {classroom.description}
                  </p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isPending || isSuspended}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isPending ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Waiting for Approval
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your tutor will review your request shortly
              </p>
            </div>
          ) : isSuspended ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="text-red-500 mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Access Suspended
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please contact your tutor for more information
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'exams' && (
                <div className="space-y-4">
                  {exams.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No exams assigned yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Your tutor hasn't assigned any exams to this classroom
                      </p>
                    </div>
                  ) : (
                    exams.map((classroomExam) => (
                      <Link
                        key={classroomExam.id}
                        to={`/exam/${classroomExam.exam_id}`}
                        onClick={() => {
                          // Allow student portal access to classroom exams
                          sessionStorage.setItem('durrah_exam_portal_access', 'true');
                        }}
                        className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-1 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {classroomExam.exam.title}
                            </h3>
                            {classroomExam.exam.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {classroomExam.exam.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Assigned{' '}
                                  {new Date(classroomExam.assigned_at).toLocaleDateString()}
                                </span>
                              </div>
                              {classroomExam.due_date && (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  Due {new Date(classroomExam.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'results' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Results Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    View your exam results and progress here
                  </p>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Student List Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    See who else is in this classroom
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
