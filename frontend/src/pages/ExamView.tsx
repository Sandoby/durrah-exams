// helper: get user session or attempt background anonymous sign-in (non-blocking)
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, Loader2, Save, Flag, LayoutGrid, Settings, Sun, Moon, Calculator as CalcIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ViolationModal } from '../components/ViolationModal';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Calculator } from '../components/Calculator';

interface Question {
    id: string;
    type: string;
    question_text: string;
    options?: string[];
    points: number;
    correct_answer?: string | string[] | null;
    media_url?: string | null;
    media_type?: 'image' | 'audio' | 'video' | null;
}

interface Violation {
    type: string;
    timestamp: string;
}

interface Exam {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    required_fields?: string[];
    settings: {
        require_fullscreen: boolean;
        detect_tab_switch: boolean;
        disable_copy_paste: boolean;
        disable_right_click: boolean;
        max_violations: number;
        time_limit_minutes: number | null;
        randomize_questions?: boolean;
        show_results_immediately?: boolean;
        // optional scheduling fields (back-end and editor may use either naming)
        start_time?: string | null;
        end_time?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        // email whitelist
        restrict_by_email?: boolean;
        allowed_emails?: string[];
    };
}

export default function ExamView() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState<Exam | null>(null);
    const [studentData, setStudentData] = useState<Record<string, string>>({});
    const [started, setStarted] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [violations, setViolations] = useState<Violation[]>([]);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState<{ score: number; max_score: number; percentage: number } | null>(null);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const [violationMessage, setViolationMessage] = useState({ title: '', message: '' });
    const [hasPreviousSession, setHasPreviousSession] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
    const [showQuestionGrid, setShowQuestionGrid] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [highContrast, setHighContrast] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const isSubmittingRef = useRef(false);

    // Load exam data
    useEffect(() => {
        if (id) fetchExam();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Check for existing session and submitted status on mount
    useEffect(() => {
        if (!id) return;

        // Check if already submitted on this device
        const submittedFlag = localStorage.getItem(`durrah_exam_${id}_submitted`);
        if (submittedFlag) {
            setSubmitted(true);
            // Optionally try to load the score if we saved it
            const savedScore = localStorage.getItem(`durrah_exam_${id}_score`);
            if (savedScore) {
                setScore(JSON.parse(savedScore));
            }
            return;
        }

        // Check for active session to restore
        const savedState = localStorage.getItem(`durrah_exam_${id}_state`);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                setStudentData(parsed.studentData || {});
                setAnswers(parsed.answers || {});
                setViolations(parsed.violations || []);
                if (parsed.flaggedQuestions) {
                    setFlaggedQuestions(new Set(parsed.flaggedQuestions));
                }
                setStarted(parsed.started || false);
                if (parsed.timeLeft !== null && parsed.timeLeft !== undefined) {
                    setTimeLeft(parsed.timeLeft);
                }
                setHasPreviousSession(true);
                setHasPreviousSession(true);
                toast.success(t('examView.previousSession'));
            } catch (e) {
                console.error('Failed to restore session', e);
            }
        }
    }, [id]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!id || submitted) return;

        // Only save if we have started or have entered some data
        if (started || Object.keys(studentData).length > 0) {
            const stateToSave = {
                studentData,
                answers,
                violations,
                flaggedQuestions: Array.from(flaggedQuestions),
                timeLeft,
                started,
                lastUpdated: Date.now()
            };
            localStorage.setItem(`durrah_exam_${id}_state`, JSON.stringify(stateToSave));
        }
    }, [id, studentData, answers, violations, timeLeft, started, submitted, flaggedQuestions]);

    const fetchExam = async () => {
        try {
            // Securely fetch exam data (exclude correct_answer for security)
            const { data: examData, error } = await supabase.from('exams').select('*').eq('id', id).single();
            if (error) throw error;

            // Fetch questions WITHOUT correct_answer column
            const { data: qData, error: qError } = await supabase
                .from('questions')
                .select('id, type, question_text, options, points, randomize_options, exam_id, created_at, media_url, media_type')
                .eq('exam_id', id);

            if (qError) throw qError;

            const settings = examData.settings || {};
            const normalizedSettings: any = { ...settings };
            // support both naming conventions
            if (!normalizedSettings.start_time && settings.start_date) normalizedSettings.start_time = settings.start_date;
            if (!normalizedSettings.end_time && settings.end_date) normalizedSettings.end_time = settings.end_date;

            setExam({ ...examData, questions: qData || [], settings: normalizedSettings });

            // Apply Randomization if enabled
            let processedQuestions = [...(qData || [])];

            // 1. Randomize Questions Order
            if (normalizedSettings.randomize_questions) {
                for (let i = processedQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [processedQuestions[i], processedQuestions[j]] = [processedQuestions[j], processedQuestions[i]];
                }
            }

            // 2. Randomize Options for each question
            processedQuestions = processedQuestions.map(q => {
                if (q.randomize_options && q.options && q.options.length > 0) {
                    const shuffledOptions = [...q.options];
                    for (let i = shuffledOptions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
                    }
                    return { ...q, options: shuffledOptions };
                }
                return q;
            });

            setExam({ ...examData, questions: processedQuestions, settings: normalizedSettings });

            // Availability checks
            const now = new Date();
            let start: Date | null = null;
            let end: Date | null = null;
            if (normalizedSettings.start_time) {
                const d = new Date(normalizedSettings.start_time);
                if (!isNaN(d.getTime())) start = d;
            }
            if (normalizedSettings.end_time) {
                const d = new Date(normalizedSettings.end_time);
                if (!isNaN(d.getTime())) end = d;
            }

            if (start && now < start) {
                setIsAvailable(false);
                setAvailabilityMessage(`${t('examView.startsAt')} ${start.toLocaleString()}`);
            } else if (end && now > end) {
                setIsAvailable(false);
                setAvailabilityMessage(`${t('examView.endedAt')} ${end.toLocaleString()}`);
            } else {
                setIsAvailable(true);
                setAvailabilityMessage(null);
            }

            // Check email whitelist restriction
            if (normalizedSettings.restrict_by_email && normalizedSettings.allowed_emails) {
                // We'll validate the email when student enters it
                // For now, just ensure email is required
                if (!examData.required_fields?.includes('email')) {
                    examData.required_fields = [...(examData.required_fields || []), 'email'];
                }
            }

            // Only set initial time if not restored from session
            if (!localStorage.getItem(`durrah_exam_${id}_state`) && examData.settings?.time_limit_minutes) {
                setTimeLeft(examData.settings.time_limit_minutes * 60);
            }
        } catch (err: any) {
            console.error(err);
            toast.error(t('settings.profile.error'));
            navigate('/dashboard');
        }
    };

    useEffect(() => {
        if (!started || !exam) return;
        if (timeLeft !== null && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((p: number | null) => (p && p > 0 ? p - 1 : 0)), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !submitted && !isSubmitting) {
            handleSubmit();
        }
    }, [started, timeLeft, exam, submitted, isSubmitting]);

    const logViolation = (type: string) => {
        const violation: Violation = { type, timestamp: new Date().toISOString() };
        setViolations((prev) => {
            const newViolations = [...prev, violation];
            const violationCount = newViolations.length;
            const maxViolations = exam?.settings.max_violations || 3;
            const remaining = maxViolations - violationCount;

            if (remaining > 0) {
                if (remaining <= 1) {
                    // Critical warning
                    setViolationMessage({
                        title: t('examView.warnings.finalWarning'),
                        message: t('examView.warnings.finalMessage', { count: remaining })
                    });
                    setShowViolationModal(true);
                } else {
                    // Standard warning via toast
                    toast.error(t('examView.warnings.violationRecorded', { count: remaining }), {
                        icon: '⚠️',
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
                        },
                    });
                }
            } else {
                // Max violations reached
                setViolationMessage({
                    title: t('examView.warnings.maxReached'),
                    message: t('examView.warnings.maxMessage')
                });
                setShowViolationModal(true);
                handleSubmit();
            }

            return newViolations;
        });
    };

    useEffect(() => {
        if (!started || !exam) return;

        const handleVisibilityChange = () => {
            if (document.hidden && exam.settings.detect_tab_switch) {
                logViolation('tab_switch');
                if (violations.length < (exam.settings.max_violations || 3) - 1) {
                    setViolationMessage({ title: t('examView.warnings.tabSwitch'), message: t('examView.warnings.tabSwitchMessage') });
                    setShowViolationModal(true);
                }
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (exam.settings.disable_right_click) {
                e.preventDefault();
                logViolation('right_click');
            }
        };

        const handleCopy = (e: ClipboardEvent) => {
            if (exam.settings.disable_copy_paste) {
                e.preventDefault();
                logViolation('copy_attempt');
            }
        };

        const handlePaste = (e: ClipboardEvent) => {
            if (exam.settings.disable_copy_paste) {
                e.preventDefault();
                logViolation('paste_attempt');
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (exam.settings.disable_copy_paste) {
                if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    logViolation('keyboard_shortcut');
                }
            }
        };

        const handleFullscreenChange = () => {
            // Only enforce fullscreen exit logging on desktop
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

            if (!isMobile && exam.settings.require_fullscreen && !document.fullscreenElement && started && !submitted) {
                logViolation('exit_fullscreen');
                if (violations.length < (exam.settings.max_violations || 3) - 1) {
                    setViolationMessage({ title: t('examView.warnings.fullscreenExit'), message: t('examView.warnings.fullscreenExitMessage') });
                    setShowViolationModal(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [started, exam, violations.length, submitted]);

    const startExam = async () => {
        const required = exam?.required_fields || ['name', 'email'];
        const missing = required.filter((f: string) => !studentData[f]);
        if (missing.length) {
            toast.error(t('examView.fillRequired'));
            return;
        }

        // Check email whitelist if enabled
        if (exam?.settings.restrict_by_email && exam?.settings.allowed_emails) {
            const studentEmail = studentData.email?.toLowerCase().trim();
            const allowedEmails = exam.settings.allowed_emails.map(e => e.toLowerCase().trim());

            if (!studentEmail || !allowedEmails.includes(studentEmail)) {
                toast.error(t('examView.accessDenied'));
                return;
            }
        }

        // Prevent starting if exam not available
        if (!isAvailable) {
            toast.error(availabilityMessage || t('examView.notAvailable'));
            return;
        }
        if (exam?.settings.require_fullscreen) {
            // Attempt fullscreen for all devices, but don't block if it fails
            try {
                await document.documentElement.requestFullscreen();
            } catch (e) {
                // Silently fail or just log warning, but allow exam to start
                console.warn('Fullscreen request failed or not supported', e);
            }
        }
        setStarted(true);
    };



    const handleSubmit = async () => {
        // Prevent duplicate submissions
        if (!exam || isSubmittingRef.current || submitted) return;

        // Prevent submission if outside allowed window
        const settings = exam.settings || {};
        const startStr = settings.start_time || settings.start_date;
        const endStr = settings.end_time || settings.end_date;
        const now = new Date();

        if (startStr) {
            const startD = new Date(startStr);
            if (!isNaN(startD.getTime()) && now < startD) {
                toast.error(t('examView.errors.notOpen', { time: startD.toLocaleString() }));
                return;
            }
        }

        if (endStr) {
            const endD = new Date(endStr);
            if (!isNaN(endD.getTime()) && now > endD) {
                toast.error(t('examView.errors.alreadyEnded'));
                return;
            }
        }

        // Double check local storage to prevent race conditions
        if (localStorage.getItem(`durrah_exam_${id}_submitted`)) {
            toast.error(t('examView.errors.alreadySubmitted'));
            setSubmitted(true);
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            // Prepare student info
            const studentName = studentData.name || studentData.student_id || 'Anonymous';
            const studentEmail = studentData.email || `${studentData.student_id || 'student'}@example.com`;

            const browserInfo = {
                user_agent: navigator.userAgent,
                student_data: studentData,
                screen_width: window.screen.width,
                screen_height: window.screen.height,
                language: navigator.language
            };

            // Prepare answers for submission
            const answersPayload = Object.entries(answers).map(([question_id, answer]) => ({
                question_id,
                answer: Array.isArray(answer) ? answer : answer
            }));

            // Get Supabase credentials from environment
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase configuration missing');
            }

            // Call the Edge Function for server-side grading
            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/grade-exam`;

            const submissionData = {
                exam_id: id,
                student_data: {
                    name: studentName,
                    email: studentEmail,
                    ...studentData
                },
                answers: answersPayload,
                violations: violations,
                browser_info: browserInfo
            };

            const response = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify(submissionData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Error response:', errorData);
                throw new Error(errorData.error || `Server returned ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Set the score from server response
                setScore({
                    score: result.score,
                    max_score: result.max_score,
                    percentage: result.percentage
                });

                setSubmitted(true);

                // Mark as submitted in local storage
                localStorage.setItem(`durrah_exam_${id}_submitted`, 'true');
                localStorage.setItem(`durrah_exam_${id}_score`, JSON.stringify({
                    score: result.score,
                    max_score: result.max_score,
                    percentage: result.percentage
                }));

                // Clear temporary state
                localStorage.removeItem(`durrah_exam_${id}_state`);

                // Exit fullscreen if active
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }

                toast.success(t('examView.success.submitted'), {
                    duration: 5000,
                    icon: '✅'
                });
            } else {
                throw new Error(result.error || 'Submission failed');
            }

        } catch (err: any) {
            console.error('Submission error:', err);

            // Show user-friendly error message
            const errorMessage = err.message || 'Failed to submit exam';
            toast.error(t('examView.errors.submissionFailed', { error: errorMessage }), {
                duration: 7000,
                icon: '❌'
            });

            // Save to pending submissions for retry
            try {
                const pendingRaw = localStorage.getItem('durrah_pending_submissions');
                const pending = pendingRaw ? JSON.parse(pendingRaw) : [];

                const studentName = studentData.name || studentData.student_id || 'Anonymous';
                const studentEmail = studentData.email || `${studentData.student_id || 'student'}@example.com`;

                const submissionPayload = {
                    exam_id: id,
                    student_data: {
                        name: studentName,
                        email: studentEmail,
                        ...studentData
                    },
                    answers: Object.entries(answers).map(([question_id, answer]) => ({
                        question_id,
                        answer
                    })),
                    violations,
                    browser_info: {
                        user_agent: navigator.userAgent,
                        student_data: studentData
                    },
                    created_at: new Date().toISOString()
                };

                pending.push(submissionPayload);
                localStorage.setItem('durrah_pending_submissions', JSON.stringify(pending));

                toast(t('examView.errors.submissionSaved'), {
                    duration: 5000,
                    icon: '💾'
                });
            } catch (e) {
                console.error('Failed to save pending submission:', e);
            }
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    // Attempt to flush pending submissions saved locally (best-effort). Called on `online` event and on mount.
    const flushPendingSubmissions = async () => {
        try {
            const pendingRaw = localStorage.getItem('durrah_pending_submissions');
            if (!pendingRaw) return;
            const pending = JSON.parse(pendingRaw) as any[];
            if (!Array.isArray(pending) || pending.length === 0) return;

            const remaining: any[] = [];
            for (const item of pending) {
                try {
                    const { submissionPayload, answersPayload } = item;

                    // Direct Supabase flush (backend removed)
                    const { data: submission, error } = await supabase.from('submissions').insert(submissionPayload).select().single();

                    if (error || !submission) {
                        console.warn('Failed to flush pending submission to Supabase', error);
                        remaining.push(item);
                        continue;
                    }

                    if (answersPayload && answersPayload.length) {
                        const toInsert = answersPayload.map((a: any) => ({ ...a, submission_id: submission.id }));
                        const { error: ansErr } = await supabase.from('submission_answers').insert(toInsert);
                        if (ansErr) {
                            console.warn('Failed to insert answers for flushed submission', ansErr);
                        }
                    }
                } catch (e) {
                    console.error('Error flushing pending submission', e);
                    remaining.push(item);
                }
            }
            if (remaining.length > 0) localStorage.setItem('durrah_pending_submissions', JSON.stringify(remaining));
            else localStorage.removeItem('durrah_pending_submissions');
        } catch (e) {
            console.error('Failed to process pending submissions', e);
        }
    };

    useEffect(() => {
        // try flushing pending submissions when back online or when component mounts
        flushPendingSubmissions();
        window.addEventListener('online', flushPendingSubmissions);
        return () => window.removeEventListener('online', flushPendingSubmissions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!exam) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    if (submitted) {
        const showResults = exam?.settings.show_results_immediately !== false;

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">{t('examView.submitted.title')}</h2>
                    {showResults && score ? (
                        <div className="mt-4">
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{score.percentage.toFixed(1)}%</p>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{score.score} / {score.max_score} points</p>
                        </div>
                    ) : (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md">
                            <p>{t('examView.submitted.message')}</p>
                            <p className="text-sm mt-2">{t('examView.submitted.resultsPending')}</p>
                        </div>
                    )}
                    <p className="mt-4 text-sm text-gray-500">{t('examView.submitted.recorded')}</p>
                </div>
            </div>
        );
    }

    if (!started) return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-center mb-6 relative">
                    <Logo size="md" />
                    <div className="absolute right-0 top-0">
                        <LanguageSwitcher />
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{exam.title}</h1>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{exam.description}</p>

                {hasPreviousSession && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        {t('examView.previousSession')}
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    {(exam.required_fields || ['name', 'email']).map((field) => {
                        const fieldLabels: Record<string, string> = { name: t('examEditor.studentInfo.name'), email: t('examEditor.studentInfo.email'), student_id: t('examEditor.studentInfo.studentId'), phone: t('examEditor.studentInfo.phone') };
                        const fieldTypes: Record<string, string> = { name: 'text', email: 'email', student_id: 'text', phone: 'tel' };
                        return (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fieldLabels[field] || field}</label>
                                <input
                                    type={fieldTypes[field] || 'text'}
                                    value={studentData[field] || ''}
                                    onChange={(e) => setStudentData({ ...studentData, [field]: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder={`Enter your ${fieldLabels[field] || field}`}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md mb-6">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div className="flex">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <div className="ml-3">
                                <h3 className="text-sm font-bold text-red-900 dark:text-red-200">{t('examView.security.title')}</h3>
                                <ul className="mt-2 text-xs text-red-800 dark:text-red-300 list-disc list-inside space-y-1">
                                    {exam.settings.require_fullscreen && <li>{t('examView.security.fullscreen')}</li>}
                                    {exam.settings.detect_tab_switch && <li>{t('examView.security.tabSwitch')}</li>}
                                    {exam.settings.disable_copy_paste && <li>{t('examView.security.copyPaste')}</li>}
                                    <li>{t('examView.security.maxViolations')} {exam.settings.max_violations || 3}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* iPhone/Safari help modal or instructions */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md mb-6">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <div className="ml-3">
                            {/* iPhone/Safari help modal or instructions */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md mb-6">
                                <div className="flex">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                    <div className="ml-3">
                                        <h3 className="text-sm font-bold text-yellow-900 dark:text-yellow-200">{t('examView.iphoneHelp.title')}</h3>
                                        <ul className="mt-2 text-xs text-yellow-800 dark:text-yellow-300 list-disc list-inside space-y-1">
                                            <li>{t('examView.iphoneHelp.privateMode')}</li>
                                            <li>{t('examView.iphoneHelp.cookies')}</li>
                                            <li>{t('examView.iphoneHelp.tracking')}</li>
                                            <li>{t('examView.iphoneHelp.homeScreen')}</li>
                                            <li>{t('examView.iphoneHelp.error')}</li>
                                            <li>{t('examView.iphoneHelp.screenshot')}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={startExam}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {hasPreviousSession ? t('examView.resume') : t('examView.start')}
                </button>
            </div>
        </div>
    );

    return (
        <div ref={containerRef} className={`min-h-screen p-3 sm:p-6 bg-gray-50 dark:bg-gray-900`}>
            {/* Watermark Overlay */}
            {started && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.03] select-none flex flex-wrap content-center justify-center gap-24 rotate-[-15deg]">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="text-4xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {studentData.name || 'Student'} <br />
                            <span className="text-xl">{studentData.email || studentData.student_id || ''}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className={`max-w-4xl mx-auto ${highContrast ? 'contrast-125 saturate-150' : ''} ${fontSize === 'large' ? 'text-lg' : fontSize === 'xlarge' ? 'text-xl' : ''}`}>
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 sticky top-0 z-10">
                        <div className="flex flex-col gap-3">
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{exam.title}</h1>
                            <div className="flex flex-wrap items-center gap-2">
                                {timeLeft !== null && (
                                    <div className={`flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${timeLeft < 60 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                        <span className="font-mono font-bold">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                                    </div>
                                )}
                                <div className={`flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${violations.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    <span className="font-bold">{t('examView.violations')} {violations.length}/{exam.settings.max_violations || 3}</span>
                                </div>

                                <div className="relative">
                                    <LanguageSwitcher />
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        title="Accessibility Settings"
                                    >
                                        <Settings className="h-5 w-5" />
                                    </button>

                                    {showSettings && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('examView.accessibility.settings')}</h3>

                                            <div className="mb-4">
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">{t('examView.accessibility.fontSize')}</label>
                                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setFontSize('normal')}
                                                        className={`flex-1 py-1 text-xs rounded-md ${fontSize === 'normal' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                                                    >
                                                        A
                                                    </button>
                                                    <button
                                                        onClick={() => setFontSize('large')}
                                                        className={`flex-1 py-1 text-sm rounded-md ${fontSize === 'large' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                                                    >
                                                        A+
                                                    </button>
                                                    <button
                                                        onClick={() => setFontSize('xlarge')}
                                                        className={`flex-1 py-1 text-base rounded-md ${fontSize === 'xlarge' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                                                    >
                                                        A++
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Contrast</label>
                                                <button
                                                    onClick={() => setHighContrast(!highContrast)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${highContrast ? 'bg-yellow-50 border-yellow-300 text-yellow-900' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                                                >
                                                    <span className="text-sm">High Contrast</span>
                                                    {highContrast ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowCalculator(!showCalculator)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    title="Calculator"
                                >
                                    <CalcIcon className="h-5 w-5" />
                                </button>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="ml-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm font-medium flex items-center min-h-[36px] sm:min-h-[40px]"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                            <button
                                onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                                className="w-full mt-2 flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                {showQuestionGrid ? 'Hide Question Navigator' : 'Show Question Navigator'}
                            </button>

                            {showQuestionGrid && (
                                <div className="mt-3 grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                                    {exam.questions.map((q, i) => {
                                        const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                                        const isFlagged = flaggedQuestions.has(q.id);
                                        let bgClass = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
                                        if (isFlagged) bgClass = 'bg-yellow-100 text-yellow-800 border border-yellow-300';
                                        else if (isAnswered) bgClass = 'bg-green-100 text-green-800 border border-green-300';

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    setShowQuestionGrid(false);
                                                }}
                                                className={`p-2 rounded text-xs font-bold ${bgClass}`}
                                            >
                                                {i + 1}
                                                {isFlagged && <Flag className="h-2 w-2 ml-1 inline" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {exam.questions.map((q, i) => (
                            <div key={q.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
                                <div id={`question-${q.id}`} className="font-medium text-gray-900 dark:text-white mb-4 flex flex-col sm:flex-row">
                                    <span className="mr-2">{i + 1}.</span>
                                    <span className="flex-1">{q.question_text}</span>
                                    <div className="flex items-center mt-2 sm:mt-0 sm:ml-auto space-x-3">
                                        <button
                                            onClick={() => {
                                                const newFlags = new Set(flaggedQuestions);
                                                if (newFlags.has(q.id)) {
                                                    newFlags.delete(q.id);
                                                } else {
                                                    newFlags.add(q.id);
                                                }
                                                setFlaggedQuestions(newFlags);
                                            }}
                                            className={`p-1 rounded-full transition-colors ${flaggedQuestions.has(q.id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-gray-600'}`}
                                            title={flaggedQuestions.has(q.id) ? "Unflag" : "Flag for review"}
                                        >
                                            <Flag className={`h-5 w-5 ${flaggedQuestions.has(q.id) ? 'fill-current' : ''}`} />
                                        </button>
                                        <span className="text-sm text-gray-500">({q.points} pts)</span>
                                    </div>
                                </div>

                                {q.media_url && (
                                    <div className="mb-4 flex justify-center">
                                        {q.media_type === 'image' && (
                                            <img src={q.media_url} alt="Question Media" className="max-w-full max-h-96 rounded-lg object-contain" />
                                        )}
                                        {q.media_type === 'audio' && (
                                            <audio controls src={q.media_url} className="w-full max-w-md" />
                                        )}
                                        {q.media_type === 'video' && (
                                            <video controls src={q.media_url} className="max-w-full max-h-96 rounded-lg" />
                                        )}
                                    </div>
                                )}

                                {q.type === 'multiple_choice' && q.options?.map((opt) => (
                                    <label key={opt} className="flex items-start space-x-3 p-3 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer mb-2 min-h-[44px]">
                                        <input
                                            type="radio"
                                            name={q.id}
                                            value={opt}
                                            checked={answers[q.id] === opt}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            className="h-5 w-5 sm:h-4 sm:w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mt-0.5 flex-shrink-0"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300 text-base sm:text-sm">{opt}</span>
                                    </label>
                                ))}

                                {q.type === 'dropdown' && (
                                    <div>
                                        <select
                                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={answers[q.id] || ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {q.options?.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {q.type === 'numeric' && (
                                    <div>
                                        <input
                                            type="number"
                                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={answers[q.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                        />
                                    </div>
                                )}

                                {q.type === 'true_false' && ['True', 'False'].map((opt) => (
                                    <label key={opt} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer mb-2">
                                        <input
                                            type="radio"
                                            name={q.id}
                                            value={opt}
                                            checked={answers[q.id] === opt}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">{opt}</span>
                                    </label>
                                ))}

                                {q.type === 'short_answer' && (
                                    <textarea
                                        rows={4}
                                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Type your answer here..."
                                        value={answers[q.id] || ''}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                    />
                                )}

                                {q.type === 'multiple_select' && q.options?.map((opt: string) => (
                                    <label key={opt} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).includes(opt) : false}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const current: string[] = Array.isArray(answers[q.id]) ? [...answers[q.id]] : [];
                                                if (e.target.checked) {
                                                    current.push(opt);
                                                } else {
                                                    const idx = current.indexOf(opt);
                                                    if (idx !== -1) current.splice(idx, 1);
                                                }
                                                setAnswers({ ...answers, [q.id]: current });
                                            }}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>

                    {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

                    <ViolationModal
                        isOpen={showViolationModal}
                        onClose={() => setShowViolationModal(false)}
                        title={violationMessage.title}
                        message={violationMessage.message}
                        severity={violationMessage.title.includes('Final') || violationMessage.title.includes('Maximum') ? 'critical' : 'warning'}
                    />

                    <div className="mt-8 text-center pb-8">
                        <div className="inline-flex items-center justify-center space-x-2 text-gray-400 dark:text-gray-500">
                            <span className="text-sm">Powered by</span>
                            <Logo size="sm" showText={true} className="opacity-75 grayscale hover:grayscale-0 transition-all duration-300" />
                        </div>
                    </div>
                </div>

                {/* Mobile Sticky Submit Button */}
                <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-20">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-lg font-bold flex justify-center items-center shadow-md"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                        {isSubmitting ? 'Submitting Exam...' : 'Submit Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
}
