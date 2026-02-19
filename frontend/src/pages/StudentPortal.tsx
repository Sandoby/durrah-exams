import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { OwlMascot } from '../components/OwlMascot';
import { LogOut, BookOpen, Clock, Trophy, Search, User, ArrowRight, History, ArrowLeft, Mail, Lock, Loader2, GraduationCap, Plus, Users, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Helmet } from 'react-helmet-async';

export default function StudentPortal() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [previousExams, setPreviousExams] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalExams: 0, avgScore: 0 });
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'classroom'>('dashboard');
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
  const [classroomExams, setClassroomExams] = useState<any[]>([]);
  const [loadingClassroomExams, setLoadingClassroomExams] = useState(false);

  useEffect(() => {
    if (user) {
      // Ensure user has student role when logging into student portal
      const ensureStudentRole = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || !profile.role) {
          await supabase.from('profiles').upsert({
            id: user.id,
            role: 'student',
            full_name: user.user_metadata?.full_name || '',
            email: user.email
          });
        }
      };

      ensureStudentRole();
      fetchStudentData();
      fetchClassrooms();
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

  const fetchClassrooms = async () => {
    if (!user) return;

    setLoadingClassrooms(true);
    try {
      const { data, error } = await supabase
        .from('classroom_students')
        .select(`
          status,
          enrolled_at,
          classroom:classrooms(
            id,
            name,
            subject,
            grade_level,
            color,
            student_count,
            tutor:profiles!tutor_id(full_name)
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      if (!error && data) {
        const enrolled = data.map((item: any) => ({
          ...item.classroom,
          joined_at: item.enrolled_at,
        }));
        setClassrooms(enrolled);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const fetchClassroomExams = async (classroomId: string) => {
    setLoadingClassroomExams(true);
    try {
      const { data, error } = await supabase
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
        .eq('classroom_id', classroomId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error loading classroom exams:', error);
        return;
      }

      if (data) {
        const exams = data.map((item: any) => ({
          ...item,
          exam: Array.isArray(item.exam) ? item.exam[0] : item.exam
        }));
        setClassroomExams(exams);
      }
    } catch (error) {
      console.error('Error loading classroom exams:', error);
    } finally {
      setLoadingClassroomExams(false);
    }
  };

  const handleClassroomClick = (classroom: any) => {
    setSelectedClassroom(classroom);
    setActiveView('classroom');
    fetchClassroomExams(classroom.id);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const isNative = Capacitor.isNativePlatform();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: isNative
            ? 'com.durrah.tutors://login-callback'
            : `${window.location.origin}/student-portal?type=student`,
          skipBrowserRedirect: isNative,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(t('auth.messages.loginError', 'Error connecting to Google'));
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    try {
      const isNative = Capacitor.isNativePlatform();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: isNative
            ? 'com.durrah.tutors://login-callback'
            : `${window.location.origin}/student-portal?type=student`,
          skipBrowserRedirect: isNative,
          scopes: 'openid profile email',
        },
      });
      if (error) throw error;
      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }
    } catch (error: any) {
      console.error('Microsoft login error:', error);
      toast.error(t('auth.messages.microsoftError', 'Error connecting to Microsoft'));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          toast.error(t('auth.validation.passwordMatch', "Passwords don't match"));
          setLoading(false);
          return;
        }
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
        <Helmet>
          <title>{t('studentPortal.seo.title', 'Student Portal - Take Your Exams | Durrah')}</title>
          <meta name="description" content={t('studentPortal.seo.description', 'Access your exams on Durrah. Log in or register to join exams using a code, view your results, and track your progress in a secure environment.')} />
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href="https://durrahtutors.com/student-portal" />

          {/* Open Graph */}
          <meta property="og:title" content={t('studentPortal.seo.title')} />
          <meta property="og:description" content={t('studentPortal.seo.description')} />
          <meta property="og:url" content="https://durrahtutors.com/student-portal" />
          <meta property="og:type" content="website" />
        </Helmet>
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
            {authMode === 'login' ? t('auth.login.title') : t('auth.register.title')}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
            <form className="space-y-6" onSubmit={handleAuth}>
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.register.nameLabel')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.login.emailLabel')}</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
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
                    {t('auth.login.passwordLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  {authMode === 'login' && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                      >
                        {t('auth.login.forgotPassword')}
                      </button>
                    </div>
                  )}
                </div>

                {authMode === 'register' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.register.confirmPasswordLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {t('common.loading')}
                  </>
                ) : (
                  authMode === 'login' ? t('auth.login.submit') : t('auth.register.submit')
                )}
              </button>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={loading}
                  className="relative w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  <svg className="absolute left-6 h-5 w-5" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  {authMode === 'login' ? t('auth.login.microsoftSignin', 'Sign in with Microsoft') : t('auth.register.microsoftSignup', 'Sign up with Microsoft')}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="relative w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  <svg className="absolute left-6 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {authMode === 'login' ? t('auth.login.googleSignin', 'Sign in with Google') : t('auth.register.googleSignup', 'Sign up with Google')}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                    {authMode === 'login' ? t('auth.login.noAccount') : t('auth.register.hasAccount')}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="w-full flex justify-center py-3 px-4 border-2 border-indigo-100 dark:border-gray-600 rounded-full shadow-sm text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {authMode === 'login' ? t('studentPortal.createAccount', 'Create Student Account') : t('auth.register.login')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24">
      <Helmet>
        <title>{t('studentPortal.seo.titleLogged', 'Student Dashboard - My Exams | Durrah')}</title>
        <meta name="description" content={t('studentPortal.seo.descriptionLogged', 'View your exam history, check your performance stats, and join new assessments in the Durrah student dashboard.')} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://durrahtutors.com/student-portal" />
      </Helmet>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
        <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex justify-between h-16 px-6">
            <div className="flex items-center gap-3">
              <Logo className="h-9 w-9" showText={false} />
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('studentPortal.title', 'Student Portal')}</span>
              </div>
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
        {activeView === 'classroom' && selectedClassroom && (
          <div className="mb-6">
            <button
              onClick={() => {
                setActiveView('dashboard');
                setSelectedClassroom(null);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        )}

        {activeView === 'classroom' && selectedClassroom ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Classroom Hero */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 sm:p-8 transition-all hover:shadow-md">
               <div 
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${selectedClassroom.color} 0%, transparent 100%)` }}
               />
               
               <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-800 transition-transform hover:scale-105"
                    style={{ backgroundColor: selectedClassroom.color }}
                  >
                    {selectedClassroom.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                     <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                       {selectedClassroom.name}
                     </h1>
                     <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="px-3 py-1 bg-gray-50 dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700 font-medium flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                           {selectedClassroom.subject}
                        </span>
                        {selectedClassroom.grade_level && (
                           <span className="px-3 py-1 bg-gray-50 dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700 font-medium">
                              {selectedClassroom.grade_level}
                           </span>
                        )}
                     </div>
                     
                     <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                           <Users className="w-4 h-4 text-gray-400" />
                           <span>{selectedClassroom.student_count || 0} students</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <GraduationCap className="w-4 h-4 text-gray-400" />
                           <span>Tutor: <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedClassroom.tutor?.full_name || 'Unknown'}</span></span>
                        </div>
                     </div>
                  </div>
               </div>

               {selectedClassroom.description && (
                 <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                   <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                     {selectedClassroom.description}
                   </p>
                 </div>
               )}
            </div>

            {/* Assigned Exams Section */}
            <div>
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                   <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Assigned Exams
                </h2>
              </div>

              {loadingClassroomExams ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : classroomExams.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                     <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                     No exams assigned yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                     Check back later for new assignments
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {classroomExams.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        sessionStorage.setItem('durrah_exam_portal_access', 'true');
                        navigate(`/exam/${item.exam.id}?classroomId=${selectedClassroom.id}`);
                      }}
                      className="group relative bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                         <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                           <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {item.exam?.title || 'Untitled Exam'}
                            </h3>
                            {!item.exam?.is_published && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-md">
                                Draft
                              </span>
                            )}
                          </div>
                          
                          {item.exam?.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                              {item.exam.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-500">
                             <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Assigned {new Date(item.added_at).toLocaleDateString()}</span>
                             </div>
                             {/* You could add status/grade here if available */}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
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


          {/* Study Zone Request */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => navigate('/study-zone')}>
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
              <Clock className="h-32 w-32" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Study Zone
                </h3>
                <p className="text-emerald-100 text-sm opacity-90">Focus with Pomodoro & Lo-Fi.</p>
              </div>
              <button className="mt-4 w-full py-2 bg-white/20 backdrop-blur-md rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
                Enter Zone <ArrowRight className="w-3 h-3" />
              </button>
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

        {/* My Classrooms Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-indigo-600" />
              {t('classrooms.myClassrooms', 'My Classrooms')}
            </h3>
            <button
              onClick={() => navigate('/join')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('classrooms.joinClassroom', 'Join Classroom')}</span>
            </button>
          </div>

          {loadingClassrooms ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <div className="mx-auto w-20 h-20 bg-gray-50 dark:bg-gray-900/60 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
                <GraduationCap className="h-10 w-10 text-gray-400" />
              </div>
              <p className="mb-4">{t('classrooms.noClassrooms', 'You haven\'t joined any classrooms yet')}</p>
              <button
                onClick={() => navigate('/join')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>{t('classrooms.joinFirst', 'Join Your First Classroom')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {classrooms.map((classroom: any) => (
                <div
                  key={classroom.id}
                  onClick={() => handleClassroomClick(classroom)}
                  className="p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all hover:shadow-lg group"
                  style={{ borderColor: classroom.color + '40' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: classroom.color }}
                    >
                      {classroom.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{classroom.student_count || 0}</span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {classroom.name}
                  </h4>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {classroom.subject} {classroom.grade_level && `• ${classroom.grade_level}`}
                  </p>

                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="font-medium">Tutor:</span> {classroom.tutor?.full_name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <div className="mx-auto w-20 h-20 bg-gray-50 dark:bg-gray-900/60 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
                <OwlMascot variant="guide" className="h-12 w-12" alt="Durrah Owl guide" loading="lazy" />
              </div>
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
        </>
        )}
      </main>
    </div>
  );
}
