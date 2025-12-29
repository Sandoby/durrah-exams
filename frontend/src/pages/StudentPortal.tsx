import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { LogOut, BookOpen, Clock, Trophy, Search, User, ArrowRight, History, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

export default function StudentPortal() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [previousExams, setPreviousExams] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalExams: 0, avgScore: 0 });

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, exam_id, score, max_score, created_at, exam:exams(title, description)')
        .eq('student_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exams = data || [];
      setPreviousExams(exams);

      // Calculate stats
      if (exams.length > 0) {
        const total = exams.length;
        const totalPercentage = exams.reduce((acc: number, curr: any) => {
          const pct = curr.max_score ? (curr.score / curr.max_score) * 100 : 0;
          return acc + pct;
        }, 0);
        setStats({
          totalExams: total,
          avgScore: Math.round(totalPercentage / total)
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'register') {
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.name } },
        });
        if (error) throw error;

        if (authData.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            role: 'student',
            full_name: formData.name,
            email: formData.email
          });
          toast.success(t('studentPortal.regSuccess', 'Registration successful! Please check your email.'));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success(t('studentPortal.welcome', 'Welcome back!'));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCode = examCode.trim();
    if (!rawCode) return;

    setJoining(true);
    try {
      // Check if input is a valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCode);

      let examId = null;

      if (isUUID) {
        // If it looks like a UUID, check ID first
        const { data } = await supabase
          .from('exams')
          .select('id')
          .eq('id', rawCode)
          .maybeSingle();

        if (data) examId = data.id;
      }

      // If not a UUID or not found by ID, check quiz_code
      if (!examId) {
        // Normalize code: uppercase and remove spaces (matching backend logic)
        const normalizedCode = rawCode.toUpperCase().replace(/\s+/g, '');

        const { data } = await supabase
          .from('exams')
          .select('id')
          .eq('quiz_code', normalizedCode)
          .maybeSingle();

        if (data) examId = data.id;
      }

      if (examId) {
        // Set flag to allow access in ExamView
        sessionStorage.setItem('durrah_exam_portal_access', 'true');
        navigate(`/exam/${examId}`);
      } else {
        toast.error(t('studentPortal.notFound', 'Exam not found. Please check the code.'));
      }
    } catch (err: any) {
      console.error('Join exam error:', err);
      toast.error(t('studentPortal.error', 'An error occurred. Please try again.'));
    } finally {
      setJoining(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-gray-900 dark:to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
        {/* Mobile Back Button */}
        {Capacitor.isNativePlatform() && (
          <button
            onClick={() => {
              localStorage.removeItem('durrah_mobile_path');
              navigate('/mobile-welcome');
            }}
            className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all hover:scale-105"
            aria-label="Back to welcome"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Back</span>
          </button>
        )}

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {authMode === 'login' ? t('studentPortal.signIn', 'Sign in to Student Portal') : t('studentPortal.createAccount', 'Create Student Account')}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
            <form className="space-y-6" onSubmit={handleAuth}>
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.profile.fullName', 'Full Name')}</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white py-3"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.profile.email', 'Email address')}</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white py-3"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.password.new', 'Password')}
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                  {authMode === 'login' && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                      >
                        {t('auth.forgotPassword', 'Forgot password?')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-[1.02] transition-all"
              >
                {loading ? t('auth.processing', 'Processing...') : authMode === 'login' ? t('auth.signIn', 'Sign In') : t('auth.createAccount', 'Create Account')}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                    {authMode === 'login' ? t('auth.newToDurrah', 'New to Durrah?') : t('auth.alreadyHaveAccount', 'Already have an account?')}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="w-full flex justify-center py-3 px-4 border-2 border-indigo-100 dark:border-gray-600 rounded-full shadow-sm text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {authMode === 'login' ? t('studentPortal.createAccount', 'Create Student Account') : t('auth.signInInstead', 'Sign In instead')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo size="md" showText={false} />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {t('studentPortal.title', 'Student Portal')}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{user.user_metadata?.full_name || user.email}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Student</span>
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t('studentPortal.signOut', 'Sign Out')}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Stats & Search Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Join Exam Card */}
          <div className="md:col-span-2 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
              <BookOpen className="h-64 w-64" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">{t('studentPortal.joinExam', 'Join an Exam')}</h2>
              <p className="text-indigo-100 mb-6 max-w-lg">{t('studentPortal.joinDesc', 'Enter the Exam Code provided by your tutor to start a new assessment.')}</p>

              <form onSubmit={handleJoinExam} className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    placeholder={t('studentPortal.enterCode', 'Enter Exam Code or ID')}
                    className="block w-full pl-10 py-3 rounded-xl border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joining || !examCode.trim()}
                  className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center min-w-[120px]"
                >
                  {joining ? (
                    <span className="animate-pulse">{t('studentPortal.joining', 'Joining...')}</span>
                  ) : (
                    <>
                      {t('studentPortal.start', 'Start')} <ArrowRight className={`ml-2 h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              {t('studentPortal.performance', 'Your Performance')}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalExams}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{t('studentPortal.examsTaken', 'Exams Taken')}</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.avgScore}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{t('studentPortal.avgScore', 'Avg. Score')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <History className="h-5 w-5 mr-2 text-gray-500" />
              {t('studentPortal.recentActivity', 'Recent Activity')}
            </h3>
          </div>

          {previousExams.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{t('studentPortal.noExams', 'No exams found yet. Join your first exam above!')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {previousExams.map((exam) => (
                <div key={exam.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                        {exam.exam?.title || t('studentPortal.untitled', 'Untitled Exam')}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {exam.exam?.description || t('studentPortal.noDesc', 'No description')}
                      </p>
                      <div className="mt-2 text-xs text-gray-400 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(exam.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('Score')}</div>
                        <div className={`text-xl font-bold ${(exam.score / exam.max_score) >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                          {exam.score} <span className="text-sm text-gray-400 font-normal">/ {exam.max_score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
