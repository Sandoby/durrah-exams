import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Share2, BarChart3, FileText, Settings, Crown, Menu, X, TrendingUp, Lock, BookOpen, Copy, AlertTriangle, Power, Eye, Loader2, AlertCircle, Users } from 'lucide-react';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ChatWidget } from '../components/ChatWidget';
import { ConvexChatWidget } from '../components/ConvexChatWidget';
import { CardSkeleton } from '../components/skeletons';
import Joyride, { STATUS } from 'react-joyride';
import type { Step, CallBackProps } from 'react-joyride';
import { useDemoTour } from '../hooks/useDemoTour';
import { printerService } from '../lib/printer';
import { NotificationCenter } from '../components/NotificationCenter';

import { CONVEX_FEATURES } from '../main';
import { PremiumFeatureModal } from '../components/dashboard/PremiumFeatureModal';
import { hasActiveAccess } from '../lib/subscriptionUtils';
import { TrialBanner } from '../components/dashboard/TrialBanner';
import { TrialWelcomeModal } from '../components/dashboard/TrialWelcomeModal';
import { GracePeriodBanner } from '../components/dashboard/GracePeriodBanner';
import { PaymentFailedBanner } from '../components/dashboard/PaymentFailedBanner';


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

const getProductionOrigin = () => {
    const origin = window.location.origin;
    // Capcitor/Mobile fix: window.location.origin is often http://localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return 'https://tutors.durrahsystem.tech';
    }
    return origin;
};

const TutorialTooltip = ({
    index,
    step,
    backProps,
    primaryProps,
    skipProps,
}: any) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-5 max-w-sm mx-4">
            <div className="space-y-3">
                <div className="flex justify-between items-start">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{index + 1}</span>
                    </div>
                    <button {...skipProps} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-medium transition-colors">
                        {skipProps.title}
                    </button>
                </div>

                <div>
                    <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {step.content}
                    </div>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                    {index > 0 && (
                        <button
                            {...backProps}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {backProps.title}
                        </button>
                    )}
                    <button
                        {...primaryProps}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        {primaryProps.title}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [profile, setProfile] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [runTour, setRunTour] = useState(false);
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    const [startDemoTour, setStartDemoTour] = useState(false);
    const [kidsShareModal, setKidsShareModal] = useState<{ url: string; code: string; title?: string } | null>(null);
    const [premiumModal, setPremiumModal] = useState<{ isOpen: boolean; feature: 'analytics' | 'proctoring' }>({
        isOpen: false,
        feature: 'analytics'
    });

    const [shareModal, setShareModal] = useState<{ id?: string; url: string; code: string; title?: string; directUrl?: string } | null>(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; title: string } | null>(null);
    const [showMockExam, setShowMockExam] = useState(false);

    useDemoTour(new URLSearchParams(window.location.search).get('showSharing') === 'true' ? 'share-monitor' : new URLSearchParams(window.location.search).get('showAnalytics') === 'true' ? 'view-analytics' : null, startDemoTour && isDemo);

    const tourSteps = useMemo<Step[]>(() => [
        {
            target: 'body',
            content: t('dashboard.tour.welcome'),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tour="question-bank"]',
            content: t('dashboard.tour.questionBank'),
            disableBeacon: true,
        },
        {
            target: '[data-tour="create-exam"]',
            content: t('dashboard.tour.createExam'),
            disableBeacon: true,
        },
        {
            target: '[data-tour="exam-card"]',
            content: t('dashboard.tour.examCard'),
            placement: 'top',
        },
        {
            target: '[data-tour="copy-link"]',
            content: t('dashboard.tour.copyLink'),
            placement: 'top',
        },
        {
            target: '[data-tour="results"]',
            content: t('dashboard.tour.results'),
            placement: 'top',
        },
        {
            target: '[data-tour="settings"]',
            content: t('dashboard.tour.settings'),
            disableBeacon: true,
        },
        {
            target: 'body',
            content: t('dashboard.tour.completion'),
            placement: 'center',
            disableBeacon: true,
        },
    ], [t]);

    useEffect(() => {
        console.log('Dashboard: Component Mounted', { userId: user?.id, isDemo });

        const demoMode = new URLSearchParams(window.location.search).get('demo') === 'true';

        if (demoMode) {
            // Load demo data
            setExams([
                {
                    id: 'demo-1',
                    title: '📐 Mathematics Quiz',
                    description: 'Algebra, geometry, and trigonometry assessment for Grade 10',
                    created_at: new Date().toISOString(),
                    is_active: true,
                }
            ]);
            setProfile({ subscription_status: 'active' });
            setIsLoading(false);
            setTimeout(() => setStartDemoTour(true), 1000);
        } else if (user) {
            console.log('Dashboard: Initializing for authenticated user...');
            fetchExams();
            fetchProfile();
        }

        return () => console.log('Dashboard: Component Unmounted');
    }, [user]);

    // Independent effect for the tour ensuring data is loaded
    useEffect(() => {
        if (!user || isLoading || isDemo) return;

        const hasSeenTour = localStorage.getItem(`dashboard_tour_${user?.id}`);
        if (!hasSeenTour) {
            // Delay tour start to ensure DOM is ready
            setTimeout(() => {
                if (exams.length === 0) setShowMockExam(true);
                setRunTour(true);
            }, 2000);
        }
    }, [user, isLoading, isDemo]);

    const handleTourCallback = (data: CallBackProps) => {
        const { status, type } = data;

        // Continue tour even if step target is not found
        if (type === 'tour:start') {
            console.log('Tour started');
        }

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRunTour(false);
            setShowMockExam(false);
            localStorage.setItem(`dashboard_tour_${user?.id}`, 'true');
        }
    };

    const startTour = () => {
        if (exams.length === 0) setShowMockExam(true);
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
        if (!hasActiveAccess(profile?.subscription_status) && exams.length >= 3) {
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
                const labels: Record<string, string> = {
                    name: t('dashboard.print.fullName', 'Full Name'),
                    email: t('dashboard.print.email', 'Email'),
                    student_id: t('dashboard.print.studentId', 'Student ID'),
                    phone: t('dashboard.print.phone', 'Phone')
                };
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

                    <div class="footer-note">${t('dashboard.print.footerNote', 'This printout is for administering the exam on paper. Students should write legibly and include their name on each page.')}</div>
                  </div>
                </body>
                </html>
                `;

            await printerService.printHtml(html);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to prepare printable exam');
        }
    };

    const copyExamLink = (examId: string) => {
        const exam = exams.find(e => e.id === examId);
        const origin = getProductionOrigin();
        // Kids Mode: open modal with portal link + code
        if (exam?.settings?.child_mode_enabled && exam.quiz_code) {
            const kidsUrl = `${origin}/kids`;
            setKidsShareModal({ url: kidsUrl, code: exam.quiz_code, title: exam.title });
            return;
        }
        // Normal mode: always open modal with student portal link + code (even if code missing)
        const portalUrl = `${origin}/student-portal`;
        const directUrl = `${origin}/exam/${examId}`;
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
        const exam = exams.find(e => e.id === id);
        if (exam) {
            setDeleteConfirmModal({ id, title: exam.title });
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirmModal) return;
        const id = deleteConfirmModal.id;

        try {
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', id)
                .eq('tutor_id', user?.id);

            if (error) throw error;

            toast.success(t('dashboard.deleteSuccess'));
            setExams(prev => prev.filter(exam => exam.id !== id));
            setDeleteConfirmModal(null);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to delete exam');
        }
    };

    const handleToggleStatus = async (examId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDemo) {
            toast.error(t('dashboard.demo.statusError', 'Cannot change status in demo mode'));
            return;
        }

        try {
            const { error } = await supabase
                .from('exams')
                .update({ is_active: !currentStatus })
                .eq('id', examId);

            if (error) throw error;

            setExams(prev => prev.map(ex =>
                ex.id === examId ? { ...ex, is_active: !currentStatus } : ex
            ));

            toast.success(currentStatus ? t('dashboard.status.deactivated', 'Exam Deactivated') : t('dashboard.status.activated', 'Exam Activated'));
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pt-24">
                <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="max-w-7xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-800/50">
                        <div className="flex justify-between h-16 px-6">
                            <div className="flex items-center gap-3">
                                <Logo className="h-9 w-9" showText={false} />
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">Durrah</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                                </div>
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
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 relative overflow-hidden pt-24">
            {/* Interactive Tutorial Tour */}
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress={false}
                showSkipButton
                disableScrolling={false}
                scrollToFirstStep
                scrollOffset={120}
                callback={handleTourCallback}
                tooltipComponent={TutorialTooltip}
                locale={{
                    back: t('tour.back', 'Back'),
                    close: t('tour.close', 'Close'),
                    last: t('tour.last', 'Finish'),
                    next: t('tour.next', 'Next'),
                    skip: t('tour.skip', 'Skip Tour'),
                }}
                styles={{
                    options: {
                        primaryColor: '#2563eb',
                        zIndex: 10000,
                        backgroundColor: '#ffffff',
                        arrowColor: '#ffffff',
                        textColor: '#1f2937',
                        overlayColor: 'rgba(0, 0, 0, 0.3)',
                    },
                    tooltip: {
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    },
                    buttonNext: {
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        padding: '8px 16px',
                        fontWeight: '600',
                    },
                    buttonBack: {
                        marginRight: '8px',
                        color: '#2563eb',
                        fontWeight: '600',
                    },
                    buttonSkip: {
                        color: '#9ca3af',
                    }
                }}
            />

            <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-7xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-800/50 transition-all duration-300">
                    <div className="flex justify-between h-16 px-6">
                        <div className="flex items-center gap-3">
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-gray-900 dark:text-white">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-3">
                            <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>

                            {!hasActiveAccess(profile?.subscription_status) && (
                                <Link
                                    to="/checkout"
                                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg transition-all"
                                >
                                    <Crown className="h-4 w-4 lg:mr-2" />
                                    <span className="hidden lg:inline">{t('settings.subscription.upgrade')}</span>
                                </Link>
                            )}
                            <button
                                onClick={startTour}
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <svg className="h-4 w-4 lg:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden lg:inline">{t('dashboard.tour.startTour', 'Tutorial')}</span>
                            </button>
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

                            <NotificationCenter />
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

                {isMobileMenuOpen && (
                    <div className="md:hidden mt-2 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
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
                            <Link
                                to="/classrooms"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Users className="h-5 w-5 mr-3" />
                                {t('nav.classrooms', 'Classrooms')}
                            </Link>
                            {!hasActiveAccess(profile?.subscription_status) && (
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
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('dashboard.demo.banner', 'Demo Mode - Explore and try features. Sign up when ready to save your work!')}</span>
                        </div>
                        <Link to="/demo" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{t('dashboard.demo.back', 'Back to Demo')}</Link>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                                {t('dashboard.title')}
                            </h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('dashboard.subTitle')}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Link
                                to="/classrooms"
                                data-tour="classrooms"
                                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md transition-all w-full sm:w-auto"
                            >
                                <Users className="h-5 w-5 mr-2" />
                                {t('nav.classrooms', 'Classrooms')}
                            </Link>
                            <Link
                                to="/question-bank"
                                data-tour="question-bank"
                                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md transition-all w-full sm:w-auto"
                            >
                                <BookOpen className="h-5 w-5 mr-2" />
                                {t('dashboard.questionBank')}
                            </Link>
                            <button
                                onClick={handleCreateExam}
                                data-tour="create-exam"
                                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t('dashboard.createExam')}
                            </button>
                        </div>
                    </div>

                    {profile?.subscription_status === 'payment_failed' && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-md mb-8">
                            <div className="h-16 w-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                                <AlertCircle className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                    {t('dashboard.paymentFailed.title', 'Payment Action Required')}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                                    {t('dashboard.paymentFailed.desc', 'Your last subscription payment was unsuccessful. To maintain your premium access and avoid service interruption, please update your payment method.')}
                                </p>
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <Link
                                    to="/settings"
                                    className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
                                >
                                    {t('dashboard.paymentFailed.manage', 'Manage Billing')}
                                </Link>
                                <Link
                                    to="/checkout"
                                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 hover:shadow-lg transition-all"
                                >
                                    {t('dashboard.paymentFailed.retry', 'Retry Payment')}
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Trial Banners */}
                    {profile?.subscription_status === 'trialing' && (
                        <div className="mb-6">
                            <TrialBanner
                                trialEndsAt={profile?.trial_ends_at}
                                subscriptionStatus={profile?.subscription_status}
                            />
                        </div>
                    )}

                    {profile?.subscription_status === 'expired' && (
                        <div className="mb-6">
                            <GracePeriodBanner
                                subscriptionStatus={profile?.subscription_status}
                                trialGraceEndsAt={profile?.trial_grace_ends_at}
                            />
                        </div>
                    )}

                    {profile?.subscription_status === 'payment_failed' && (
                        <div className="mb-6">
                            <PaymentFailedBanner subscriptionEndDate={profile?.subscription_end_date} />
                        </div>
                    )}

                    {!hasActiveAccess(profile?.subscription_status) && exams.length >= 3 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm mb-4">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                    {t('dashboard.overLimitWarning')}
                                </h4>
                                <Link
                                    to="/checkout"
                                    className="mt-2 inline-flex items-center text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100 transition-colors underline decoration-2 underline-offset-4"
                                >
                                    {t('settings.subscription.upgrade')}
                                </Link>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                        </div>
                    ) : exams.length === 0 && !showMockExam ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-200 dark:border-slate-800">
                            <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.noExams.title')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('dashboard.noExams.desc')}</p>
                            <button
                                onClick={handleCreateExam}
                                className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t('dashboard.noExams.button')}
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-6 mb-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {showMockExam && (
                                <div data-tour="exam-card" className="group bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-600 shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-[10px] font-bold uppercase rounded-bl-lg">Tutorial Card</div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                    {t('dashboard.tour.mockExam.title', '📐 Mathematics Quiz (Sample)')}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                    {t('dashboard.tour.mockExam.desc', 'Algebra, geometry, and trigonometry assessment for Grade 10')}
                                                </p>
                                            </div>
                                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                                                {t('dashboard.status.active')}
                                                <Power className="h-3 w-3 ml-1.5" />
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div data-tour="copy-link" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                    <Share2 className="h-4 w-4 text-green-600" />
                                                    <span className="text-[10px] font-bold text-green-700">{t('dashboard.actions.copyLink')}</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                    <span className="text-[10px] font-bold text-blue-700">{t('dashboard.actions.print')}</span>
                                                </div>
                                                <div data-tour="results" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                                    <BarChart3 className="h-4 w-4 text-orange-600" />
                                                    <span className="text-[10px] font-bold text-orange-700">{t('dashboard.actions.results')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {exams.map((exam, index) => (
                                <div key={exam.id} data-tour={index === 0 ? "exam-card" : undefined} className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
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
                                            <button
                                                onClick={(e) => handleToggleStatus(exam.id, exam.is_active, e)}
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-400 dark:bg-gray-600 text-white'} hover:shadow-md hover:scale-105 transition-all cursor-pointer`}
                                                title={exam.is_active ? t('dashboard.status.clickToDeactivate', "Click to Deactivate") : t('dashboard.status.clickToActivate', "Click to Activate")}
                                            >
                                                {exam.is_active ? t('dashboard.status.active') : t('dashboard.status.inactive')}
                                                <Power className="h-3 w-3 ml-1.5" />
                                            </button>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(exam.created_at).toLocaleDateString()}
                                                    </span>
                                                    {exam.quiz_code && (
                                                        <span className="px-2 py-0.5 text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">
                                                            {exam.quiz_code}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                                                {/* Share Button */}
                                                <button
                                                    onClick={() => copyExamLink(exam.id)}
                                                    data-tour={index === 0 ? "copy-link" : undefined}
                                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 hover:shadow-md transition-all duration-200"
                                                >
                                                    <Share2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">{t('dashboard.actions.copyLink', 'Share')}</span>
                                                </button>

                                                {/* Print Button */}
                                                <button
                                                    onClick={() => downloadExamPDF(exam.id)}
                                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-md transition-all duration-200"
                                                >
                                                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{t('dashboard.actions.print', 'Print')}</span>
                                                </button>

                                                {/* Results Button */}
                                                <button
                                                    onClick={() => navigate(`/exam/${exam.id}/results`)}
                                                    data-tour={index === 0 ? "results" : undefined}
                                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:shadow-md transition-all duration-200"
                                                >
                                                    <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">{t('dashboard.actions.results', 'Results')}</span>
                                                </button>

                                                {/* Analytics Button */}
                                                <button
                                                    onClick={() => {
                                                        if (hasActiveAccess(profile?.subscription_status)) {
                                                            navigate(`/exam/${exam.id}/analytics`);
                                                        } else {
                                                            setPremiumModal({ isOpen: true, feature: 'analytics' });
                                                        }
                                                    }}
                                                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${hasActiveAccess(profile?.subscription_status)
                                                        ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:shadow-md'
                                                        : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                                        }`}
                                                >
                                                    {!hasActiveAccess(profile?.subscription_status) && (
                                                        <div className="absolute -top-2.5 -right-1.5 z-20">
                                                            <div className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-white/20 flex items-center gap-1">
                                                                <Crown className="w-2.5 h-2.5" />
                                                                PRO
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasActiveAccess(profile?.subscription_status) ? (
                                                        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                    ) : (
                                                        <Lock className="h-5 w-5 text-gray-400" />
                                                    )}
                                                    <span className={`text-xs font-semibold ${hasActiveAccess(profile?.subscription_status)
                                                        ? 'text-purple-700 dark:text-purple-300'
                                                        : 'text-gray-500'
                                                        }`}>
                                                        {t('dashboard.actions.analytics', 'Stats')}
                                                    </span>
                                                </button>

                                                {/* Proctor Button - Convex Live Monitoring */}
                                                {CONVEX_FEATURES.proctoring && (
                                                    <button
                                                        onClick={() => {
                                                            if (hasActiveAccess(profile?.subscription_status)) {
                                                                navigate(`/exam/${exam.id}/proctor`);
                                                            } else {
                                                                setPremiumModal({ isOpen: true, feature: 'proctoring' });
                                                            }
                                                        }}
                                                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${hasActiveAccess(profile?.subscription_status)
                                                            ? 'bg-teal-500 border border-teal-400 hover:bg-teal-600 hover:shadow-md'
                                                            : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700'
                                                            }`}
                                                    >
                                                        {!hasActiveAccess(profile?.subscription_status) && (
                                                            <div className="absolute -top-2.5 -right-1.5 z-20">
                                                                <div className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-white/20 flex items-center gap-1">
                                                                    <Crown className="w-2.5 h-2.5" />
                                                                    PRO
                                                                </div>
                                                            </div>
                                                        )}
                                                        {hasActiveAccess(profile?.subscription_status) && (
                                                            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                                            </span>
                                                        )}
                                                        {hasActiveAccess(profile?.subscription_status) ? (
                                                            <Eye className="h-5 w-5 text-white" />
                                                        ) : (
                                                            <Lock className="h-5 w-5 text-gray-400" />
                                                        )}
                                                        <span className={`text-xs font-bold ${hasActiveAccess(profile?.subscription_status) ? 'text-white' : 'text-gray-500'}`}>
                                                            {t('dashboard.actions.proctor', 'Live')}
                                                        </span>
                                                    </button>
                                                )}

                                                {/* Edit Button */}
                                                <Link
                                                    to={`/exam/${exam.id}/edit`}
                                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:shadow-md transition-all duration-200"
                                                >
                                                    <Edit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{t('dashboard.actions.edit', 'Edit')}</span>
                                                </Link>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(exam.id)}
                                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:shadow-md transition-all duration-200"
                                                >
                                                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">{t('dashboard.actions.delete', 'Delete')}</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
                        <div className="relative px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{kidsShareModal.title || t('dashboard.modals.share.kidsTitle', 'Kids Exam')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('dashboard.modals.share.kidsSubtitle', 'Kids Mode • Single Question View')}</p>
                            </div>
                            <button
                                onClick={() => setKidsShareModal(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex gap-6 items-start">
                                {/* QR Code */}
                                <div className="flex-shrink-0">
                                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(kidsShareModal.url)}&color=1f2937`}
                                            alt="Exam QR Code"
                                            className="w-35 h-35 rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('dashboard.modals.share.portalLink', 'Student Portal Link')}</label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                value={kidsShareModal.url}
                                                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                                            />
                                            <button
                                                onClick={() => copyValue(kidsShareModal.url, t('dashboard.modals.share.linkCopied', 'Student portal link copied'))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                title="Copy Link"
                                            >
                                                <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('dashboard.modals.share.accessCode', 'Access Code')}</label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                value={kidsShareModal.code}
                                                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xl font-mono font-bold tracking-wider text-center text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                                            />
                                            <button
                                                onClick={() => copyValue(kidsShareModal.code, t('dashboard.modals.share.codeCopied', 'Access code copied'))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                title="Copy Code"
                                            >
                                                <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Note */}
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                        <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                            {t('dashboard.modals.share.tutorNote', '⚠️ Remind your students to have their accounts ready and be signed in before starting the exam!')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Redesigned Share Modal */}
            {shareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-100 dark:border-slate-800">
                        {/* Header */}
                        <div className="relative px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('dashboard.modals.share.title', 'Share Exam')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{shareModal.title}</p>
                            </div>
                            <button
                                onClick={() => setShareModal(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex gap-6 items-start">
                                {/* QR Code */}
                                <div className="flex-shrink-0">
                                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareModal.directUrl || shareModal.url)}&color=1f2937`}
                                            alt="QR Code"
                                            className="w-35 h-35 rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="flex-1 space-y-4">
                                    {/* Link Input */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('dashboard.modals.share.portalLink', 'Student Portal Link')}</label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                value={shareModal.url}
                                                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                                            />
                                            <button
                                                onClick={() => copyValue(shareModal.url, t('dashboard.modals.share.linkCopied', 'Link copied'))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Code Input */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('dashboard.modals.share.accessCode', 'Access Code')}</label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                value={shareModal.code || t('dashboard.modals.share.noCode', 'NO CODE')}
                                                className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xl font-mono font-bold tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10 ${shareModal.code ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}
                                            />
                                            {shareModal.code && (
                                                <button
                                                    onClick={() => copyValue(shareModal.code, t('dashboard.modals.share.codeCopied', 'Code copied'))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                const message = `Join my exam: ${shareModal.title}\n\nLink: ${shareModal.url}\nAccess Code: ${shareModal.code}\n\n⚠️ IMPORTANT: Make sure you are signed up and logged in before the exam starts to avoid losing time!`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                            }}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition-all font-medium shadow-sm hover:shadow-md"
                                            title="Share on WhatsApp"
                                        >
                                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                            <span className="text-sm">{t('dashboard.modals.share.whatsapp', 'WhatsApp')}</span>
                                        </button>
                                        <button
                                            onClick={() => copyValue(`Exam Link: ${shareModal.url}\nAccess Code: ${shareModal.code}`, 'All details copied')}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium shadow-sm hover:shadow-md"
                                            title="Copy All Details"
                                        >
                                            <Copy className="h-4 w-4" />
                                            <span className="text-sm">{t('dashboard.modals.share.copyAll', 'Copy All')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Note and Direct Link */}
                            <div className="mt-4 space-y-3">
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                        {t('dashboard.modals.share.tutorNote', '⚠️ Remind your students to create their accounts and sign in BEFORE the exam starts to avoid losing time!')}
                                    </p>
                                </div>

                                {shareModal.directUrl && (
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('dashboard.modals.share.directLink', 'Direct Link (No Code Required)')}</p>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                value={shareModal.directUrl}
                                                className="w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pr-10"
                                            />
                                            <button
                                                onClick={() => copyValue(shareModal.directUrl!, t('dashboard.modals.share.linkCopied', 'Direct link copied'))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                                <Copy className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-sm p-8 text-center border border-gray-100 dark:border-slate-800">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.modals.delete.title', 'Delete Exam?')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            {t('dashboard.modals.delete.desc', { title: deleteConfirmModal.title })}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmModal(null)}
                                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('dashboard.modals.delete.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-sm hover:shadow-md transition-all"
                            >
                                {t('dashboard.modals.delete.confirm', 'Yes, Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Chat Widget - Convex or Classic */}
            {CONVEX_FEATURES.chat ? (
                <ConvexChatWidget
                    userId={user?.id || 'anonymous'}
                    userName={user?.user_metadata?.full_name || user?.email || 'Tutor'}
                    userRole="tutor"
                />
            ) : (
                <ChatWidget />
            )}
            {/* Premium Feature Modal */}
            <PremiumFeatureModal
                isOpen={premiumModal.isOpen}
                onClose={() => setPremiumModal({ ...premiumModal, isOpen: false })}
                feature={premiumModal.feature}
            />
            {/* Trial Welcome Modal */}
            <TrialWelcomeModal />

        </div>
    );
}
