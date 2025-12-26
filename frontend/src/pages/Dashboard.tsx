import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Share2, BarChart3, FileText, Settings, Crown, Menu, X, TrendingUp, Lock, BookOpen } from 'lucide-react';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ExamResults } from '../components/ExamResults';
import { ChatWidget } from '../components/ChatWidget';
import { CardSkeleton } from '../components/skeletons';
import Joyride, { STATUS } from 'react-joyride';
import type { Step, CallBackProps } from 'react-joyride';
import { useDemoTour } from '../hooks/useDemoTour';

interface Exam {
    id: string;
    title: string;
    description: string;
    created_at: string;
    is_active: boolean;
    quiz_code?: string | null;
    settings?: {
        child_mode_enabled?: boolean;
        [key: string]: any;
    };
}

export default function Dashboard() {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedExamForResults, setSelectedExamForResults] = useState<Exam | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [runTour, setRunTour] = useState(false);
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    const [startDemoTour, setStartDemoTour] = useState(false);
    const [kidsShareModal, setKidsShareModal] = useState<{ url: string; code: string; title?: string } | null>(null);
    const [shareModal, setShareModal] = useState<{ id?: string; url: string; code: string; title?: string; directUrl?: string } | null>(null);

    useDemoTour(new URLSearchParams(window.location.search).get('showSharing') === 'true' ? 'share-monitor' : new URLSearchParams(window.location.search).get('showAnalytics') === 'true' ? 'view-analytics' : null, startDemoTour && isDemo);

    const [tourSteps] = useState<Step[]>([
        {
            target: 'body',
            content: t('dashboard.tour.welcome', 'Welcome to Durrah for Tutors! Let\'s learn how to use your dashboard.'),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tour="question-bank"]',
            content: t('dashboard.tour.questionBank', 'Start by managing your question bank - create and organize reusable questions here'),
            disableBeacon: true,
        },
        {
            target: '[data-tour="create-exam"]',
            content: t('dashboard.tour.createExam', 'Click here to create a new exam with custom questions and settings'),
            disableBeacon: true,
        },
        {
            target: '[data-tour="exam-card"]',
            content: t('dashboard.tour.examCard', 'Once you create exams, they\'ll appear here. Each card shows your exam details'),
            placement: 'top',
        },
        {
            target: '[data-tour="copy-link"]',
            content: t('dashboard.tour.copyLink', 'Share this link with your students to take the exam'),
            placement: 'top',
        },
        {
            target: '[data-tour="results"]',
            content: t('dashboard.tour.results', 'View all student submissions and download results'),
            placement: 'top',
        },
        {
            target: '[data-tour="settings"]',
            content: t('dashboard.tour.settings', 'Access your profile settings and subscription details here'),
            disableBeacon: true,
        },
        {
            target: 'body',
            content: t('dashboard.tour.completion', 'You\'re all set! Start creating exams and adding questions. Need help? Visit our support center.'),
            placement: 'center',
            disableBeacon: true,
        },
    ]);

    useEffect(() => {
        const demoMode = new URLSearchParams(window.location.search).get('demo') === 'true';

        if (demoMode) {
            // Load demo data without fetching from DB
            setExams([
                {
                    id: 'demo-1',
                    title: '📐 Mathematics Quiz',
                    description: 'Algebra, geometry, and trigonometry assessment for Grade 10',
                    created_at: new Date().toISOString(),
                    is_active: true,
                },
                {
                    id: 'demo-2',
                    title: '🧬 Science Mid-Term',
                    description: 'Biology and Chemistry topics for Grade 9 semester evaluation',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    is_active: true,
                },
                {
                    id: 'demo-3',
                    title: '📚 English Literature',
                    description: 'Poetry, prose, and comprehension test for advanced learners',
                    created_at: new Date(Date.now() - 172800000).toISOString(),
                    is_active: true,
                }
            ]);
            setProfile({ subscription_status: 'active' });
            setIsLoading(false);
            // Start demo tour after short delay to ensure DOM is ready
            setTimeout(() => setStartDemoTour(true), 1000);
        } else if (user) {
            fetchExams();
            fetchProfile();
            checkFirstVisit();
        }
    }, [user]);

    const checkFirstVisit = () => {
        const hasSeenTour = localStorage.getItem(`dashboard_tour_${user?.id}`);
        if (!hasSeenTour) {
            // Delay tour start to ensure DOM is ready and elements are mounted
            setTimeout(() => setRunTour(true), 1500);
        }
    };

    const handleTourCallback = (data: CallBackProps) => {
        const { status, type } = data;

        // Continue tour even if step target is not found
        if (type === 'tour:start') {
            console.log('Tour started');
        }

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRunTour(false);
            localStorage.setItem(`dashboard_tour_${user?.id}`, 'true');
        }
    };

    const startTour = () => {
        setRunTour(true);
    };

    const fetchProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('subscription_status, subscription_plan, subscription_end_date')
                .eq('id', user?.id)
                .single();
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchExams = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('tutor_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setExams(data || []);
        } catch (error: any) {
            toast.error('Failed to fetch exams');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateExam = (e: React.MouseEvent) => {
        // Check if user is on free plan and has reached limit
        if (profile?.subscription_status !== 'active' && exams.length >= 3) {
            e.preventDefault();
            toast.error(t('dashboard.upgradeLimit'));
            return;
        }
        // If check passes, navigate
        navigate('/exam/new');
    };

    const downloadExamPDF = async (examId: string) => {
        try {
            const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
            if (examError || !exam) throw examError || new Error('Exam not found');
            const { data: questions, error: qErr } = await supabase.from('questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true });
            if (qErr) throw qErr;

            const escapeHtml = (str: any) => {
                if (str === null || str === undefined) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };

            const html = `
                <!doctype html>
                <html>
                <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width,initial-scale=1" />
                  <title>${escapeHtml(exam.title)}</title>
                  <style>
                    @page { size: A4; margin: 20mm }
                    html,body{height:100%;}
                    body{font-family: 'Times New Roman', Times, serif; color:#111; line-height:1.45;}
                    .container{max-width:800px;margin:0 auto;color:#111}
                    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
                    .title{font-size:26px;font-weight:700}
                    .meta{font-size:12px;text-align:right}
                    .desc{margin:12px 0 18px;font-size:14px}
                    hr{border:none;border-top:1px solid #ddd;margin:12px 0}
                    .question{page-break-inside:avoid;margin-bottom:18px}
                    .q-title{font-size:15px;margin-bottom:8px}
                    .points{font-size:12px;color:#333;margin-left:8px}
                    .options{margin-left:22px;margin-top:6px}
                    .option{margin:6px 0;display:flex;align-items:flex-start}
                    .opt-letter{width:22px;display:inline-block;text-align:center;margin-right:8px;font-weight:600}
                    .opt-text{flex:1}
                    .answer-lines{margin-left:22px;margin-top:8px}
                    .answer-line{border-bottom:1px dashed #444;height:28px;margin:10px 0}
                    .long-answer{height:120px;border:1px solid #ddd;padding:8px;margin-top:8px}
                    .footer-note{font-size:12px;color:#666;margin-top:16px}
                    @media print{body{font-size:12pt}.no-print{display:none}.container{max-width:100%;margin:0}}
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div>
                        <div class="title">${escapeHtml(exam.title)}</div>
                        <div style="font-size:13px;margin-top:6px">${escapeHtml(exam.description || '')}</div>
                      </div>
                      <div class="meta">
                        <div>Date: ${new Date().toLocaleDateString()}</div>
                      </div>
                    </div>
                    <hr />

                    <div style="margin-bottom:18px">
                      <strong>Student Info (fill before starting):</strong>
                      <div style="margin-left:14px;margin-top:8px">
                        ${(exam.required_fields || ['name', 'email']).map((f: string) => {
                const labels: Record<string, string> = { name: 'Full Name', email: 'Email', student_id: 'Student ID', phone: 'Phone' };
                return `<div style="margin-top:12px"><strong>${labels[f] || f}:</strong> ____________________________________________</div>`;
            }).join('')}
                      </div>
                    </div>

                    ${questions.map((q: any, i: number) => {
                const qText = escapeHtml(q.question_text || '');
                const pts = q.points || 0;
                let bodyHtml = '';
                if (Array.isArray(q.options) && q.options.length) {
                    bodyHtml += `<div class="options">`;
                    q.options.forEach((opt: string, oi: number) => {
                        bodyHtml += `<div class="option"><div class="opt-letter">${String.fromCharCode(65 + oi)}</div><div class="opt-text">${escapeHtml(opt)}</div></div>`;
                    });
                    bodyHtml += `</div>`;
                }

                if (q.type === 'short_answer') {
                    bodyHtml += `<div class="answer-lines">${Array.from({ length: 6 }).map(() => '<div class="answer-line"></div>').join('')}</div>`;
                } else if (q.type === 'numeric') {
                    bodyHtml += `<div class="answer-lines"><div class="answer-line" style="width:40%"></div></div>`;
                } else if (q.type === 'multiple_select') {
                    if (!(Array.isArray(q.options) && q.options.length)) {
                        bodyHtml += `<div class="answer-lines"><div class="answer-line"></div></div>`;
                    }
                } else {
                    if (!Array.isArray(q.options) || !q.options.length) {
                        bodyHtml += `<div class="answer-lines"><div class="answer-line"></div></div>`;
                    }
                }

                return `
                          <div class="question">
                            <div class="q-title"><strong>${i + 1}. ${qText}</strong> <span class="points">(${pts} pts)</span></div>
                            ${bodyHtml}
                          </div>
                        `;
            }).join('')}

                    <div class="footer-note">This printout is for administering the exam on paper. Students should write legibly and include their name on each page.</div>
                  </div>
                </body>
                </html>
                `;

            const w = window.open('', '_blank');
            if (!w) {
                toast.error('Popup blocked. Allow popups to download PDF.');
                return;
            }
            w.document.open();
            w.document.write(html);
            w.document.close();
            w.focus();
            setTimeout(() => w.print(), 600);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to prepare printable exam');
        }
    };

    const copyExamLink = (examId: string) => {
        const exam = exams.find(e => e.id === examId);
        // Kids Mode: open modal with portal link + code
        if (exam?.settings?.child_mode_enabled && exam.quiz_code) {
            const kidsUrl = `${window.location.origin}/kids`;
            setKidsShareModal({ url: kidsUrl, code: exam.quiz_code, title: exam.title });
            return;
        }
        // Normal mode: always open modal with student portal link + code (even if code missing)
        const portalUrl = `${window.location.origin}/student-portal`;
        const directUrl = `${window.location.origin}/exam/${examId}`;
        setShareModal({ url: portalUrl, code: exam?.quiz_code || '', title: exam?.title, directUrl });
        if (!exam?.quiz_code) {
            toast.error('No exam code set for this exam. Please add a code in the exam editor.');
        }
        return;
    };

    const copyValue = (value: string, message = 'Copied!') => {
        try {
            navigator.clipboard.writeText(value);
            toast.success(message);
        } catch (e) {
            const input = document.createElement('textarea');
            input.value = value;
            document.body.appendChild(input);
            input.select();
            try { document.execCommand('copy'); toast.success(message); } catch { toast.error('Failed to copy'); }
            document.body.removeChild(input);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('dashboard.deleteConfirm'))) return;

        try {
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', id)
                .eq('tutor_id', user?.id);

            if (error) throw error;

            toast.success(t('dashboard.deleteSuccess'));
            setExams(prev => prev.filter(exam => exam.id !== id));
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to delete exam');
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center">
                                <Logo />
                            </div>
                        </div>
                    </div>
                </nav>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8 animate-pulse">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden">
            {/* Animated background blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-purple-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

            <style>{`
                @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
            {/* Interactive Tutorial Tour */}
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                disableScrolling
                scrollToFirstStep
                scrollOffset={100}
                callback={handleTourCallback}
                styles={{
                    options: {
                        primaryColor: '#6366f1',
                        zIndex: 10000,
                    },
                    tooltip: {
                        fontSize: 16,
                    },
                    buttonNext: {
                        fontSize: 14,
                        padding: '8px 16px',
                    },
                    buttonBack: {
                        fontSize: 14,
                        padding: '8px 16px',
                    },
                }}
                locale={{
                    back: t('tour.back', 'Back'),
                    close: t('tour.close', 'Close'),
                    last: t('tour.last', 'Finish'),
                    next: t('tour.next', 'Next'),
                    skip: t('tour.skip', 'Skip Tour'),
                }}
            />

            <nav className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex justify-between h-16 px-6">
                        <div className="flex items-center gap-3">
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-3">
                            <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>
                            <button
                                onClick={startTour}
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                title={t('dashboard.tour.startTour', 'Tutorial')}
                            >
                                <svg className="h-4 w-4 lg:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden lg:inline">{t('dashboard.tour.startTour', 'Tutorial')}</span>
                            </button>
                            {profile?.subscription_status !== 'active' && (
                                <Link
                                    to="/checkout"
                                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all"
                                >
                                    <Crown className="h-4 w-4 lg:mr-2" />
                                    <span className="hidden lg:inline">{t('settings.subscription.upgrade')}</span>
                                </Link>
                            )}
                            <Link
                                to="/settings"
                                data-tour="settings"
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Settings className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('settings.title')}</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <LogOut className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('nav.logout', 'Logout')}</span>
                            </button>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                {user?.user_metadata?.full_name || user?.email}
                            </div>
                            <button
                                onClick={() => { startTour(); setIsMobileMenuOpen(false); }}
                                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t('dashboard.tour.startTour', 'Tutorial')}
                            </button>
                            {profile?.subscription_status !== 'active' && (
                                <Link
                                    to="/checkout"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <Crown className="h-5 w-5 mr-3" />
                                    {t('settings.subscription.upgrade')}
                                </Link>
                            )}
                            <Link
                                to="/settings"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Settings className="h-5 w-5 mr-3" />
                                {t('settings.title')}
                            </Link>
                            <button
                                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <LogOut className="h-5 w-5 mr-3" />
                                {t('nav.logout', 'Logout')}
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {new URLSearchParams(window.location.search).get('demo') === 'true' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 sm:px-6 lg:px-8 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Demo Mode - Explore and try features. Sign up when ready to save your work!</span>
                        </div>
                        <Link to="/demo" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Demo</Link>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold">
                                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">{t('dashboard.title')}</span>
                            </h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage and monitor your exams</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Link
                                to="/question-bank"
                                data-tour="question-bank"
                                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all w-full sm:w-auto"
                            >
                                <BookOpen className="h-5 w-5 mr-2" />
                                {t('dashboard.questionBank')}
                            </Link>
                            <button
                                onClick={handleCreateExam}
                                data-tour="create-exam"
                                className="group relative inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                            >
                                <span className="relative z-10 flex items-center">
                                    <Plus className="h-5 w-5 mr-2" />
                                    {t('dashboard.createExam')}
                                </span>
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </button>
                        </div>
                    </div>

                    {exams.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
                            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6">
                                <FileText className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.noExams.title')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('dashboard.noExams.desc')}</p>
                            <button
                                onClick={handleCreateExam}
                                className="group relative inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
                            >
                                <span className="relative z-10 flex items-center">
                                    <Plus className="h-5 w-5 mr-2" />
                                    {t('dashboard.noExams.button')}
                                </span>
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-6 mb-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {exams.map((exam, index) => (
                                <div key={exam.id} data-tour={index === 0 ? "exam-card" : undefined} className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                    {exam.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                    {exam.description}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'}`}>
                                                {exam.is_active ? t('dashboard.status.active') : t('dashboard.status.inactive')}
                                            </span>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(exam.created_at).toLocaleDateString()}
                                                </span>
                                                {exam.quiz_code && (
                                                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                                        {exam.quiz_code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* Share Button */}
                                                <button
                                                    onClick={() => copyExamLink(exam.id)}
                                                    data-tour={index === 0 ? "copy-link" : undefined}
                                                    className="group relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 transition-all duration-200"
                                                    title="Share exam"
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Share
                                                    </span>
                                                </button>

                                                {/* Print Button */}
                                                <button
                                                    onClick={() => downloadExamPDF(exam.id)}
                                                    className="group relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 transition-all duration-200"
                                                    title="Download PDF"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Print
                                                    </span>
                                                </button>

                                                {/* Results Button */}
                                                <button
                                                    onClick={() => setSelectedExamForResults(exam)}
                                                    data-tour={index === 0 ? "results" : undefined}
                                                    className="group relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 transition-all duration-200"
                                                    title="View results"
                                                >
                                                    <BarChart3 className="h-4 w-4" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Results
                                                    </span>
                                                </button>

                                                {/* Analytics Button */}
                                                <button
                                                    onClick={() => {
                                                        if (profile?.subscription_status === 'active') {
                                                            navigate(`/exam/${exam.id}/analytics`);
                                                        } else {
                                                            toast.error(t('dashboard.actions.analyticsLocked'));
                                                            navigate('/checkout');
                                                        }
                                                    }}
                                                    className={`group relative p-2 rounded-lg transition-all duration-200 ${profile?.subscription_status === 'active'
                                                            ? 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500'
                                                            : 'text-gray-300 cursor-not-allowed'
                                                        }`}
                                                    title={profile?.subscription_status === 'active' ? 'Advanced analytics' : 'Upgrade for analytics'}
                                                >
                                                    {profile?.subscription_status === 'active' ? (
                                                        <TrendingUp className="h-4 w-4" />
                                                    ) : (
                                                        <Lock className="h-4 w-4" />
                                                    )}
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        {profile?.subscription_status === 'active' ? 'Analytics' : 'Locked'}
                                                    </span>
                                                </button>

                                                {/* Separator */}
                                                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                                {/* Edit Button */}
                                                <Link
                                                    to={`/exam/${exam.id}/edit`}
                                                    className="group relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-indigo-500 hover:to-violet-500 transition-all duration-200"
                                                    title="Edit exam"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Edit
                                                    </span>
                                                </Link>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(exam.id)}
                                                    className="group relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 transition-all duration-200"
                                                    title="Delete exam"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Delete
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Kids Share Modal */}
            {kidsShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">Kids Mode Sharing</p>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{kidsShareModal.title || 'Kids Exam'}</h3>
                            </div>
                            <button
                                onClick={() => setKidsShareModal(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Student Portal Link</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={kidsShareModal.url}
                                        className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-100"
                                    />
                                    <button
                                        onClick={() => copyValue(kidsShareModal.url, 'Student portal link copied')}
                                        className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Exam Access Code</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={kidsShareModal.code}
                                        className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-100"
                                    />
                                    <button
                                        onClick={() => copyValue(kidsShareModal.code, 'Exam code copied')}
                                        className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <div className="text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded px-2 py-1 mb-1">
                                    <b>Note:</b> Make sure all your students have signed up and have their accounts ready before the exam. Share both the portal link and the code with them.
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyValue(`Page: ${kidsShareModal.url}\nCode: ${kidsShareModal.code}`, 'Kids info copied')}
                                        className="px-3 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                                    >
                                        Copy Both
                                    </button>
                                    <button
                                        onClick={() => setKidsShareModal(null)}
                                        className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Normal Exam Share Modal */}
            {shareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">Exam Sharing</p>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{shareModal.title || 'Exam'}</h3>
                            </div>
                            <button
                                onClick={() => setShareModal(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Student Portal Link</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={shareModal.url}
                                        className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-100"
                                    />
                                    <button
                                        onClick={() => copyValue(shareModal.url, 'Student portal link copied')}
                                        className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Exam Access Code</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={shareModal.code}
                                        className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-100"
                                    />
                                    <button
                                        onClick={() => copyValue(shareModal.code, 'Exam code copied')}
                                        className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                        disabled={!shareModal.code}
                                    >
                                        Copy
                                    </button>
                                </div>
                                {!shareModal.code && (
                                    <div className="text-xs text-red-700 bg-red-100 border border-red-300 rounded px-2 py-1 mt-2">
                                        <b>Warning:</b> No exam code set for this exam. Please add a code in the exam editor.
                                    </div>
                                )}
                            </div>
                            {shareModal.directUrl && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Direct Exam Link (Bypasses Portal)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            readOnly
                                            value={shareModal.directUrl}
                                            className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-100"
                                        />
                                        <button
                                            onClick={() => copyValue(shareModal.directUrl!, 'Direct exam link copied')}
                                            className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-2 pt-2">
                                <div className="text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded px-2 py-1 mb-1">
                                    <b>Note:</b> Share this portal link and code with your students. They will enter the code at the portal to access the exam. Make sure students are registered and ready before the exam.
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyValue(`Portal: ${shareModal.url}\nCode: ${shareModal.code}\nDirect: ${shareModal.directUrl}`, 'All exam info copied')}
                                        className="px-3 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                                        disabled={!shareModal.code}
                                    >
                                        Copy All
                                    </button>
                                    <button
                                        onClick={() => setShareModal(null)}
                                        className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {selectedExamForResults && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Results: {selectedExamForResults.title}
                            </h2>
                            <button
                                onClick={() => setSelectedExamForResults(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <ExamResults examId={selectedExamForResults.id} examTitle={selectedExamForResults.title} />
                        </div>
                    </div>
                </div>
            )}
            <ChatWidget />
        </div>
    );
}