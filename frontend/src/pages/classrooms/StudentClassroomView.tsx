import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  FileText,
  BarChart2,
  Users,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { EnrolledClassroom, ClassroomExam } from '../../types/classroom';

interface ExamResult {
  id: string;
  exam_id: string;
  exam_title: string;
  score: number;
  max_score: number;
  percentage: number;
  time_taken: number;
  submitted_at: string;
}

interface ClassmateProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  grade_level: string | null;
}

type Tab = 'exams' | 'results' | 'students';

export default function StudentClassroomView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('exams');
  const [classroom, setClassroom] = useState<EnrolledClassroom | null>(null);
  const [exams, setExams] = useState<ClassroomExam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [classmates, setClassmates] = useState<ClassmateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingClassmates, setLoadingClassmates] = useState(false);

  const loadClassroom = useCallback(async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('classroom_students')
      .select(`
        status,
        enrolled_at,
        classroom:classrooms(
          *,
          tutor:profiles!tutor_id(full_name)
        )
      `)
      .eq('classroom_id', id)
      .eq('student_id', user.id)
      .single();

    if (!error && data && data.classroom) {
      const classroomData = Array.isArray(data.classroom) ? data.classroom[0] : data.classroom;
      const tutorData = classroomData.tutor;
      const tutor = Array.isArray(tutorData) ? tutorData[0] : tutorData;
      setClassroom({
        ...classroomData,
        enrollment_status: data.status,
        joined_at: data.enrolled_at,
        tutor_name: tutor?.full_name || undefined,
      } as EnrolledClassroom);
    } else {
      navigate('/my/classrooms');
    }

    setLoading(false);
  }, [user, id, navigate]);

  const loadExams = useCallback(async () => {
    if (!id) return;

    const { data } = await supabase
      .from('classroom_exams')
      .select(`
        id,
        exam_id,
        added_at,
        assigned_at,
        due_date,
        instructions,
        exam:exams(id, title, description, created_at)
      `)
      .eq('classroom_id', id)
      .order('assigned_at', { ascending: false });

    if (data) {
      const mapped = data.map((item: Record<string, unknown>) => ({
        ...(item as object),
        exam: Array.isArray(item.exam) && (item.exam as unknown[]).length > 0
          ? (item.exam as unknown[])[0]
          : item.exam,
      })) as ClassroomExam[];
      setExams(mapped);
    }
  }, [id]);

  const loadResults = useCallback(async () => {
    if (!id || !user) return;
    setLoadingResults(true);

    const { data } = await supabase
      .from('submissions')
      .select(`
        id,
        exam_id,
        score,
        max_score,
        percentage,
        time_taken,
        created_at,
        exam:exams!exam_id(title)
      `)
      .eq('classroom_id', id)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const mapped = data.map((item: Record<string, unknown>) => {
        const examData = item.exam;
        const exam = Array.isArray(examData) ? (examData as { title: string }[])[0] : examData as { title: string } | null;
        return {
          id: item.id as string,
          exam_id: item.exam_id as string,
          exam_title: exam?.title || 'Untitled Exam',
          score: (item.score as number) ?? 0,
          max_score: (item.max_score as number) ?? 0,
          percentage: (item.percentage as number) ?? 0,
          time_taken: (item.time_taken as number) ?? 0,
          submitted_at: item.created_at as string,
        } as ExamResult;
      });
      setResults(mapped);
    }

    setLoadingResults(false);
  }, [id, user]);

  const loadClassmates = useCallback(async () => {
    if (!id || !user) return;
    setLoadingClassmates(true);

    const { data } = await supabase
      .from('classroom_students')
      .select(`
        student_id,
        profile:profiles!student_id(id, full_name, avatar_url, grade_level)
      `)
      .eq('classroom_id', id)
      .eq('status', 'active')
      .neq('student_id', user.id);

    if (data) {
      const mapped = data
        .map((item: Record<string, unknown>) => {
          const p = Array.isArray(item.profile)
            ? (item.profile as ClassmateProfile[])[0]
            : (item.profile as ClassmateProfile | null);
          return p;
        })
        .filter((p): p is ClassmateProfile => Boolean(p));
      setClassmates(mapped);
    }

    setLoadingClassmates(false);
  }, [id, user]);

  useEffect(() => {
    loadClassroom();
    loadExams();
  }, [loadClassroom, loadExams]);

  useEffect(() => {
    if (activeTab === 'results') loadResults();
    if (activeTab === 'students') loadClassmates();
  }, [activeTab, loadResults, loadClassmates]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!classroom) return null;

  const isPending = classroom.enrollment_status === 'pending';
  const isSuspended = classroom.enrollment_status === 'suspended';

  const tabs = [
    { id: 'exams' as Tab, label: 'Exams', icon: FileText, badge: exams.length },
    { id: 'results' as Tab, label: 'My Results', icon: BarChart2, badge: results.length || undefined },
    ...(classroom.settings?.show_student_list_to_students
      ? [{ id: 'students' as Tab, label: 'Students', icon: Users, badge: undefined as number | undefined }]
      : []),
  ];

  const avgScore = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;

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
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md flex-shrink-0"
                style={{ backgroundColor: classroom.color }}
              >
                {classroom.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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
                  {classroom.tutor_name && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {classroom.tutor_name}
                    </span>
                  )}
                  {classroom.subject && <span>• {classroom.subject}</span>}
                  {classroom.grade_level && <span>• {classroom.grade_level}</span>}
                  {classroom.academic_year && <span>• {classroom.academic_year}</span>}
                </div>
                {classroom.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
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
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Access Suspended
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please contact your tutor for more information
              </p>
            </div>
          ) : (
            <>
              {/* ── EXAMS TAB ─────────────────────────────── */}
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
                          sessionStorage.setItem('durrah_exam_portal_access', 'true');
                        }}
                        className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-1 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {classroomExam.exam?.title}
                            </h3>
                            {classroomExam.exam?.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {classroomExam.exam.description}
                              </p>
                            )}
                            {classroomExam.instructions && (
                              <p className="text-sm text-blue-600 dark:text-blue-400 mb-3 italic">
                                {classroomExam.instructions}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Assigned{' '}
                                  {new Date(classroomExam.assigned_at || classroomExam.added_at).toLocaleDateString()}
                                </span>
                              </div>
                              {classroomExam.due_date && (
                                <span
                                  className={`font-medium ${
                                    new Date(classroomExam.due_date) < new Date()
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-orange-600 dark:text-orange-400'
                                  }`}
                                >
                                  Due {new Date(classroomExam.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {/* ── RESULTS TAB ───────────────────────────── */}
              {activeTab === 'results' && (
                <div className="space-y-6">
                  {loadingResults ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                      <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No results yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Complete an exam to see your results here
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary card */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-center">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {results.length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Exams Completed
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-center">
                          <div
                            className={`text-3xl font-bold ${
                              avgScore >= 60
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {avgScore}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Average Score
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-center">
                          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {Math.max(...results.map((r) => r.percentage))}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Best Score
                          </div>
                        </div>
                      </div>

                      {/* Results list */}
                      <div className="space-y-3">
                        {results.map((result) => (
                          <div
                            key={result.id}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {result.exam_title}
                                </h4>
                                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                                  {result.time_taken > 0 && (
                                    <span>• {Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div
                                  className={`text-2xl font-bold ${
                                    result.percentage >= 60
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {result.percentage}%
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {result.score}/{result.max_score}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {result.percentage >= 60 ? (
                                  <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : (
                                  <XCircle className="w-6 h-6 text-red-500" />
                                )}
                              </div>
                            </div>

                            {/* Score bar */}
                            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  result.percentage >= 60 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(result.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── STUDENTS TAB ──────────────────────────── */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  {loadingClassmates ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : classmates.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No other students yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        You're the only one here so far
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {classmates.length} Student{classmates.length !== 1 ? 's' : ''}
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {classmates.map((classmate) => (
                          <div
                            key={classmate.id}
                            className="p-4 flex items-center gap-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {classmate.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {classmate.full_name || 'Student'}
                              </div>
                              {classmate.grade_level && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Grade {classmate.grade_level}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Trophy easter egg for high avgScore */}
      {avgScore >= 90 && activeTab === 'results' && (
        <div className="fixed bottom-6 right-6 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-lg">
          <Trophy className="w-5 h-5 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Top performer! Keep it up!
          </span>
        </div>
      )}
    </>
  );
}
