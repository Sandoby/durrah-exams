// helper: get user session or attempt background anonymous sign-in (non-blocking)
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Loader2, Save, Flag, LayoutGrid, Sun, Moon, Calculator as CalcIcon, Star, Eye, AlertCircle, X } from 'lucide-react';
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
        show_detailed_results?: boolean; // NEW
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
    const [searchParams] = useSearchParams();
    const submissionId = searchParams.get('submission');
    const isReviewMode = !!submissionId;
    const [exam, setExam] = useState<Exam | null>(null);
    const [studentData, setStudentData] = useState<Record<string, string>>({});
    const [started, setStarted] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [violations, setViolations] = useState<Violation[]>([]);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState<{ score: number; max_score: number; percentage: number; submission_id?: string } | null>(null);

    const [showViolationModal, setShowViolationModal] = useState(false);
    const [violationMessage, setViolationMessage] = useState({ title: '', message: '' });
    const [hasPreviousSession, setHasPreviousSession] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

    const [showQuestionGrid, setShowQuestionGrid] = useState(false);
    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [highContrast, setHighContrast] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [startedAt, setStartedAt] = useState<number | null>(null);

    // New State for View Modes
    const [viewMode, setViewMode] = useState<'list' | 'single'>('single'); // Default to single question per page
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isZenMode, setIsZenMode] = useState(false);

    // Review Mode State
    const [reviewData, setReviewData] = useState<{
        submission: any;
        submissionAnswers: any[];
    } | null>(null);


    const containerRef = useRef<HTMLDivElement>(null);
    const isSubmittingRef = useRef(false);
    
    const [showUnansweredModal, setShowUnansweredModal] = useState(false);
    const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
    const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false);
    const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);

    // Load exam data or review data
    useEffect(() => {
        if (id) {
            fetchExam();
            if (isReviewMode && submissionId) {
                fetchReviewData(submissionId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isReviewMode, submissionId]);

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
                const parsed = JSON.parse(savedScore);
                setScore(parsed);

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
                startedAt,
                lastUpdated: Date.now()
            };
            localStorage.setItem(`durrah_exam_${id}_state`, JSON.stringify(stateToSave));
        }
    }, [id, studentData, answers, violations, timeLeft, started, startedAt, submitted, flaggedQuestions]);

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

    // Fetch submission data for review mode
    const fetchReviewData = async (subId: string) => {
        try {
            // Fetch submission with answers
            const { data: submission, error: subError } = await supabase
                .from('submissions')
                .select('*')
                .eq('id', subId)
                .single();

            if (subError) throw subError;

            // Fetch submission answers
            const { data: submissionAnswers, error: answersError } = await supabase
                .from('submission_answers')
                .select('*')
                .eq('submission_id', subId);

            if (answersError) throw answersError;

            setReviewData({
                submission,
                submissionAnswers: submissionAnswers || []
            });

            // Also set the score for display
            setScore({
                score: submission.score,
                max_score: submission.max_score,
                percentage: submission.percentage
            });
        } catch (err: any) {
            console.error('Error fetching review data:', err);
            toast.error('Failed to load exam review');
            navigate('/dashboard');
        }
    };

    useEffect(() => {
        if (!started || !exam) return;
        if (timeLeft !== null && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((p: number | null) => (p && p > 0 ? p - 1 : 0)), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !submitted && !isSubmitting && !showAutoSubmitWarning) {
            setShowAutoSubmitWarning(true);
        }
    }, [started, timeLeft, exam, submitted, isSubmitting, showAutoSubmitWarning]);

    useEffect(() => {
        if (showAutoSubmitWarning && autoSubmitCountdown > 0) {
            const timer = setTimeout(() => {
                setAutoSubmitCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (showAutoSubmitWarning && autoSubmitCountdown === 0) {
            setShowAutoSubmitWarning(false);
            setAutoSubmitCountdown(5);
            handleSubmit();
        }
    }, [showAutoSubmitWarning, autoSubmitCountdown]);

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
        setStartedAt(Date.now());
    };

    const handleSubmitWithCheck = () => {
        if (!exam) return;
        
        const unanswered: number[] = [];
        exam.questions.forEach((q, index) => {
            const answerData = answers[q.id];
            if (!answerData || answerData.answer === undefined || answerData.answer === '' || 
                (Array.isArray(answerData.answer) && answerData.answer.length === 0)) {
                unanswered.push(index);
            }
        });
        
        if (unanswered.length > 0) {
            setUnansweredQuestions(unanswered);
            setShowUnansweredModal(true);
            return;
        }
        
        handleSubmit();
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

            // Prepare answers for submission using original question IDs from exam data
            // This ensures types (number/string) match exactly what the backend expects
            const answersPayload = (exam?.questions || []).map(q => {
                const answerData = answers[q.id];
                if (!answerData) return null;

                // IMPORTANT: The answers state stores objects like { answer: "value" }
                // We must extract the actual answer value to send to the backend
                const actualAnswer = answerData.answer;

                return {
                    question_id: q.id,
                    answer: actualAnswer
                };
            }).filter(Boolean);

            // If no answers matched (shouldn't happen), fallback to current method
            if (answersPayload.length === 0 && Object.keys(answers).length > 0) {
                Object.entries(answers).forEach(([key, val]) => {
                    // Handle potential wrapped answer here too
                    const actualVal = (val as any)?.answer !== undefined ? (val as any).answer : val;

                    answersPayload.push({
                        question_id: key,
                        answer: actualVal
                    });
                });
            }

            // Get Supabase credentials from environment
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase configuration missing');
            }

            // Call the Edge Function for server-side grading
            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/grade-exam`;

            const timeTakenSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : null;

            const submissionData = {
                exam_id: id,
                student_data: {
                    name: studentName,
                    email: studentEmail,
                    ...studentData
                },
                answers: answersPayload,
                violations: violations,
                browser_info: browserInfo,
                time_taken: timeTakenSeconds
            };

            const response = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers:
                {
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
            console.log('✅ Exam Grading Result:', result);

            if (result.debug_info) {
                console.log('🐛 Debug Info:', result.debug_info);
            }

            if (result.success) {
                // Check if submission_id is missing
                if (!result.submission_id) {
                    console.error('❌ Critical: Server returned success but NO submission_id!');
                    toast.error('Warning: Submission ID missing despite success');
                }

                // Set the score from server response
                setScore({
                    score: result.score,
                    max_score: result.max_score,
                    percentage: result.percentage,
                    submission_id: result.submission_id
                });

                setSubmitted(true);

                // Mark as submitted in local storage
                localStorage.setItem(`durrah_exam_${id}_submitted`, 'true');
                localStorage.setItem(`durrah_exam_${id}_score`, JSON.stringify({
                    score: result.score,
                    max_score: result.max_score,
                    percentage: result.percentage,
                    submission_id: result.submission_id // Saved for review mode
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
                    created_at: new Date().toISOString(),
                    time_taken: startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : null
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
                    const submissionPayload = item.submissionPayload || item;
                    const answersPayload = item.answersPayload || item.answersPayload;

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

    // Navigation for Single Question Mode
    const goToNextQuestion = () => {
        if (!exam) return;
        if (currentQuestionIndex < exam.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            // Scroll to top of question container
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToPrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const jumpToQuestion = (index: number) => {
        if (!exam) return;
        if (index >= 0 && index < exam.questions.length) {
            setCurrentQuestionIndex(index);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        // try flushing pending submissions when back online or when component mounts
        flushPendingSubmissions();
        window.addEventListener('online', flushPendingSubmissions);
        return () => window.removeEventListener('online', flushPendingSubmissions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const answeredCount = Object.keys(answers).filter(key => {
        const ans = answers[key];
        return ans && ans.answer !== undefined && ans.answer !== '' && 
               !(Array.isArray(ans.answer) && ans.answer.length === 0);
    }).length;
    const totalQuestions = exam?.questions.length || 0;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    if (!exam) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    // Initial loading for review data
    if (isReviewMode && !reviewData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Only show submitted screen if NOT in review mode
    if (submitted && !isReviewMode) {
        const showResults = exam?.settings.show_results_immediately !== false;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full mb-8">
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

                    {/* View Answers Button */}
                    {/* View Answers Button */}
                    {exam?.settings.show_detailed_results && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => {
                                    let subId = score?.submission_id;

                                    // Fallback: Try to read from localStorage if state is missing ID
                                    if (!subId) {
                                        try {
                                            const saved = localStorage.getItem(`durrah_exam_${id}_score`);
                                            if (saved) {
                                                const parsed = JSON.parse(saved);
                                                subId = parsed.submission_id;
                                                console.log('🔄 Recovered submission_id from storage:', subId);
                                            }
                                        } catch (e) {
                                            console.error('Failed to recover ID from storage', e);
                                        }
                                    }

                                    if (subId) {
                                        navigate(`/exam/${id}?submission=${subId}`);
                                    } else {
                                        console.error('Submission ID explicitly missing. Score state:', score);
                                        toast.error('Unable to load review. Please refresh the page.');
                                    }
                                }}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                                <Eye className="w-5 h-5" />
                                View Answers
                            </button>
                        </div>
                    )}
                </div>
            </div>


        );
    }

    // Review Mode - Show exam with answers
    if (isReviewMode && reviewData && exam) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{exam.title}</h1>
                        </div>
                        {score && (
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Your Score</p>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {score.percentage.toFixed(1)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Points</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {score.score} / {score.max_score}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                        {exam.questions.map((question, index) => {
                            const submissionAnswer = reviewData.submissionAnswers.find(
                                (a: any) => a.question_id === question.id
                            );
                            const isCorrect = submissionAnswer?.is_correct || false;
                            const studentAnswer = submissionAnswer?.answer;

                            return (
                                <div
                                    key={question.id}
                                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 overflow-hidden ${isCorrect
                                        ? 'border-green-300 dark:border-green-700'
                                        : 'border-red-300 dark:border-red-700'
                                        }`}
                                >
                                    {/* Question Header */}
                                    <div
                                        className={`px-6 py-4 border-l-4 ${isCorrect
                                            ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
                                            : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Question {index + 1}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCorrect
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                                        }`}
                                                >
                                                    {isCorrect ? 'Correct' : 'Incorrect'}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {question.points} {question.points === 1 ? 'point' : 'points'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Question Content */}
                                    <div className="px-6 py-5 space-y-4">
                                        {/* Question Text */}
                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                            {question.question_text}
                                        </p>

                                        {/* Options for multiple choice */}
                                        {(question.type === 'multiple_choice' || question.type === 'true_false') && question.options && (
                                            <div className="space-y-2">
                                                {question.options.map((option, optIndex) => {
                                                    const isStudentAnswer = studentAnswer === option;
                                                    const isCorrectAnswer = question.correct_answer === option;

                                                    return (
                                                        <div
                                                            key={optIndex}
                                                            className={`p-3 rounded-lg border-2 ${isStudentAnswer && isCorrect
                                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                                : isStudentAnswer && !isCorrect
                                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                                    : isCorrectAnswer && !isCorrect
                                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                                        : 'border-gray-200 dark:border-gray-700'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isStudentAnswer
                                                                        ? isCorrect
                                                                            ? 'border-green-500 bg-green-500'
                                                                            : 'border-red-500 bg-red-500'
                                                                        : isCorrectAnswer && !isCorrect
                                                                            ? 'border-indigo-500 bg-indigo-500'
                                                                            : 'border-gray-300'
                                                                        }`}
                                                                >
                                                                    {(isStudentAnswer || (isCorrectAnswer && !isCorrect)) && (
                                                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                                                    )}
                                                                </div>
                                                                <span
                                                                    className={`flex-1 ${isStudentAnswer || isCorrectAnswer
                                                                        ? 'font-medium'
                                                                        : ''
                                                                        } text-gray-900 dark:text-white`}
                                                                >
                                                                    {option}
                                                                </span>
                                                                {isStudentAnswer && (
                                                                    <span className="text-xs font-semibold">
                                                                        {isCorrect ? '✓ Your Answer' : '✗ Your Answer'}
                                                                    </span>
                                                                )}
                                                                {isCorrectAnswer && !isCorrect && !isStudentAnswer && (
                                                                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                                                        ✓ Correct Answer
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* For other question types, show answer boxes */}
                                        {question.type !== 'multiple_choice' && question.type !== 'true_false' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div
                                                    className={`p-4 rounded-lg border ${isCorrect
                                                        ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                                                        : 'border-red-200 bg-red-50 dark:bg-red-900/10'
                                                        }`}
                                                >
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                                        Your Answer
                                                    </p>
                                                    <p
                                                        className={`text-sm font-medium ${isCorrect
                                                            ? 'text-green-900 dark:text-green-100'
                                                            : 'text-red-900 dark:text-red-100'
                                                            }`}
                                                    >
                                                        {studentAnswer || 'No answer'}
                                                    </p>
                                                </div>
                                                {!isCorrect && question.correct_answer && (
                                                    <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/10">
                                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                                            Correct Answer
                                                        </p>
                                                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                                                            {String(question.correct_answer)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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

            <div className={`max-w-4xl mx-auto ${highContrast ? 'contrast-150 saturate-200 brightness-110' : ''}`}>
                <div className={`max-w-3xl mx-auto ${fontSize === 'large' ? 'text-lg' : fontSize === 'xlarge' ? 'text-xl' : ''}`}>
                    {/* Header - Hidden in Zen Mode unless hovered or essential */}
                    {!isZenMode && (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 sticky top-0 z-10">
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate max-w-[50%]">{exam.title}</h1>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setViewMode(prev => prev === 'list' ? 'single' : 'list')}
                                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400"
                                            title={viewMode === 'list' ? "Switch to One Question Per Page" : "Switch to List View"}
                                        >
                                            {viewMode === 'list' ? <LayoutGrid size={20} /> : <div className="flex items-center"><span className="text-xs font-bold mr-1">1/1</span></div>}
                                        </button>
                                        <button
                                            onClick={() => setIsZenMode(!isZenMode)}
                                            className={`p-2 ${isZenMode ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'} dark:text-gray-400`}
                                            title="Toggle Zen Mode"
                                        >
                                            {isZenMode ? <Star size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                {started && (
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                            <span>Progress: {answeredCount}/{totalQuestions} questions</span>
                                            <span className="font-semibold">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        {progress === 100 && (
                                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                ✓ All questions answered!
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                        {/* Questions Render Logic */}
                        {viewMode === 'list' ? (
                            // List View (Original)
                            <div className="space-y-6">
                                {exam.questions.map((question, index) => (
                                    <div key={question.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                        {/* Question Content (Same as before) */}
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                                <span className="mr-2 text-indigo-600 dark:text-indigo-400">Q{index + 1}.</span>
                                                {question.question_text}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newFlagged = new Set(flaggedQuestions);
                                                        if (newFlagged.has(question.id)) {
                                                            newFlagged.delete(question.id);
                                                        } else {
                                                            newFlagged.add(question.id);
                                                        }
                                                        setFlaggedQuestions(newFlagged);
                                                    }}
                                                    className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${flaggedQuestions.has(question.id) ? 'text-red-500' : 'text-gray-400'}`}
                                                >
                                                    <Flag size={20} fill={flaggedQuestions.has(question.id) ? "currentColor" : "none"} />
                                                </button>
                                                <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                    {question.points} {t('examEditor.points')}
                                                </span>
                                            </div>
                                        </div>

                                        {question.media_url && (
                                            <div className="mb-4">
                                                {question.media_type === 'image' && <img src={question.media_url} alt="Question media" className="max-h-96 rounded-lg mx-auto" />}
                                                {question.media_type === 'audio' && <audio src={question.media_url} controls className="w-full" />}
                                                {question.media_type === 'video' && <video src={question.media_url} controls className="w-full rounded-lg" />}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {/* Render options based on type */}
                                            {question.type === 'multiple_choice' && question.options?.map((option, optIndex) => (
                                                <div key={optIndex} className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name={`question-${question.id}`}
                                                        id={`q${question.id}-o${optIndex}`}
                                                        value={option}
                                                        checked={answers[question.id]?.answer === option}
                                                        onChange={() => setAnswers({ ...answers, [question.id]: { answer: option } })}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    />
                                                    <label htmlFor={`q${question.id}-o${optIndex}`} className="ml-3 block text-gray-700 dark:text-gray-300">
                                                        {option}
                                                    </label>
                                                </div>
                                            ))}

                                            {/* Other Types handling... reusing generic structure for brevity in update */}
                                            {question.type === 'true_false' && ['True', 'False'].map((option, optIndex) => (
                                                <div key={optIndex} className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name={`question-${question.id}`}
                                                        id={`q${question.id}-o${optIndex}`}
                                                        value={option}
                                                        checked={answers[question.id]?.answer === option}
                                                        onChange={() => setAnswers({ ...answers, [question.id]: { answer: option } })}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    />
                                                    <label htmlFor={`q${question.id}-o${optIndex}`} className="ml-3 block text-gray-700 dark:text-gray-300">
                                                        {option}
                                                    </label>
                                                </div>
                                            ))}

                                            {question.type === 'short_answer' && (
                                                <textarea
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    rows={3}
                                                    value={answers[question.id]?.answer || ''}
                                                    onChange={(e) => setAnswers({ ...answers, [question.id]: { answer: e.target.value } })}
                                                    placeholder="Type your answer here..."
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Debug Info - Comment this out later */}
                                <div className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                                    <p>Debug Info:</p>
                                    <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">{JSON.stringify({ answers, violations }, null, 2)}</pre>
                                </div>
                            </div>
                        ) : (
                            // Single Question Mode (Pagination)
                            <div className="space-y-6">
                                {exam.questions[currentQuestionIndex] && (() => {
                                    const question = exam.questions[currentQuestionIndex];
                                    return (
                                        <div key={question.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 min-h-[50vh]">
                                            <div className="mb-6">
                                                <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white leading-relaxed">
                                                    {question.question_text}
                                                </h3>
                                            </div>

                                            {question.media_url && (
                                                <div className="mb-6">
                                                    {question.media_type === 'image' && <img src={question.media_url} alt="Question media" className="max-h-96 rounded-lg shadow-md" />}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {/* Render options based on type - Simplified for Single View */}
                                                {question.type === 'multiple_choice' && question.options?.map((option, optIndex) => (
                                                    <label key={optIndex} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${answers[question.id]?.answer === option ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                        <input
                                                            type="radio"
                                                            name={`question-${question.id}`}
                                                            value={option}
                                                            checked={answers[question.id]?.answer === option}
                                                            onChange={() => setAnswers({ ...answers, [question.id]: { answer: option } })}
                                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        />
                                                        <span className="ml-3 text-lg text-gray-900 dark:text-white">{option}</span>
                                                    </label>
                                                ))}

                                                {question.type === 'true_false' && ['True', 'False'].map((option, optIndex) => (
                                                    <label key={optIndex} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${String(answers[question.id]?.answer) === option ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                        <input
                                                            type="radio"
                                                            name={`question-${question.id}`}
                                                            value={option}
                                                            checked={String(answers[question.id]?.answer) === option}
                                                            onChange={() => setAnswers({ ...answers, [question.id]: { answer: option } })}
                                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        />
                                                        <span className="ml-3 text-lg text-gray-900 dark:text-white">{option}</span>
                                                    </label>
                                                ))}


                                                {question.type === 'short_answer' && (
                                                    <textarea
                                                        className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                                        rows={6}
                                                        value={answers[question.id]?.answer || ''}
                                                        onChange={(e) => setAnswers({ ...answers, [question.id]: { answer: e.target.value } })}
                                                        placeholder="Type your answer here..."
                                                    />
                                                )}
                                            </div>

                                            {/* Navigation Buttons */}
                                            <div className="flex justify-between items-center mt-8 pt-6 border-t dark:border-gray-700">
                                                <button
                                                    type="button"
                                                    onClick={goToPrevQuestion}
                                                    disabled={currentQuestionIndex === 0}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium ${currentQuestionIndex === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                >
                                                    Previous
                                                </button>

                                                {/* Pagination Dots/Numbers simplified */}
                                                <div className="hidden sm:flex space-x-1">
                                                    {exam.questions.map((_, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => jumpToQuestion(idx)}
                                                            className={`h-2 w-2 rounded-full ${idx === currentQuestionIndex ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                        />
                                                    ))}
                                                </div>

                                                {currentQuestionIndex < exam.questions.length - 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={goToNextQuestion}
                                                        className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    >
                                                        Next Question
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleSubmitWithCheck}
                                                        disabled={isSubmitting}
                                                        className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                                                Submitting...
                                                            </>
                                                        ) : (
                                                            'Submit Exam'
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <div className="flex justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={handleSubmitWithCheck}
                                    disabled={isSubmitting}
                                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 w-full sm:w-auto"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                            Submitting...
                                        </>
                                    ) : (
                                        t('examView.submit')
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Floating Toolbar */}
                <div className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col gap-2 z-50 transition-opacity duration-300 ${isZenMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`p-2 sm:p-3 rounded-full shadow-lg transition-all ${showCalculator ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        title="Calculator"
                        aria-label="Toggle Calculator"
                    >
                        <CalcIcon size={20} className="sm:w-6 sm:h-6" />
                    </button>
                    <button
                        onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                        className="p-2 sm:p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        title="Question Map"
                        aria-label="Toggle Question Grid"
                    >
                        <LayoutGrid size={20} className="sm:w-6 sm:h-6" />
                    </button>
                    <button
                        onClick={() => {
                            const newSize = fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal';
                            setFontSize(newSize);
                            const sizeLabels = { normal: 'Normal', large: 'Large', xlarge: 'Extra Large' };
                            toast.success(`Font size: ${sizeLabels[newSize]}`, { duration: 1500, icon: '🔤' });
                        }}
                        className={`p-2 sm:p-3 rounded-full shadow-lg transition-all font-serif font-bold ${fontSize === 'normal' ? 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300' :
                            fontSize === 'large' ? 'bg-blue-100 text-blue-800 border-2 border-blue-400' :
                                'bg-purple-100 text-purple-800 border-2 border-purple-400'
                            } hover:bg-gray-50 dark:hover:bg-gray-700`}
                        title="Toggle Font Size"
                        aria-label={`Font Size: ${fontSize}`}
                    >
                        <span className="text-sm sm:text-base">Aa</span>
                    </button>
                    <button
                        onClick={() => {
                            setHighContrast(!highContrast);
                            toast.success(highContrast ? 'High Contrast Off' : 'High Contrast On', {
                                duration: 1500,
                                icon: highContrast ? '🌙' : '☀️'
                            });
                        }}
                        className={`p-2 sm:p-3 rounded-full shadow-lg transition-all ${highContrast ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        title="Toggle High Contrast"
                        aria-label={`High Contrast: ${highContrast ? 'On' : 'Off'}`}
                    >
                        {highContrast ? <Sun size={20} className="sm:w-6 sm:h-6" /> : <Moon size={20} className="sm:w-6 sm:h-6" />}
                    </button>
                </div>

                {/* Calculator Drawer */}
                {showCalculator && (
                    <div className="fixed bottom-16 sm:bottom-24 right-4 sm:right-6 z-50 animate-fade-in-up">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-1 border dark:border-gray-700">
                            <Calculator onClose={() => setShowCalculator(false)} />
                        </div>
                    </div>
                )}

                {/* Question Grid Drawer */}
                {showQuestionGrid && exam && (
                    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 p-4 sm:p-6 overflow-y-auto transform transition-transform duration-300">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Exam Overview</h3>
                            <button
                                onClick={() => setShowQuestionGrid(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl leading-none p-2"
                                aria-label="Close Question Grid"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-4 gap-2 sm:gap-3">
                            {exam.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => {
                                        jumpToQuestion(idx);
                                        setShowQuestionGrid(false);
                                        if (viewMode === 'list') {
                                            // Scroll to specific question in list
                                            const el = document.getElementById(`question-${idx}`); // Assuming we add ids to list items
                                            el?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-bold border-2 relative ${idx === currentQuestionIndex && viewMode === 'single'
                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                        : answers[q.id]
                                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : flaggedQuestions.has(q.id)
                                                ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                : 'border-gray-200 text-gray-600 hover:border-indigo-300 dark:border-gray-600 dark:text-gray-400'
                                        }`}
                                    aria-label={`Question ${idx + 1}${flaggedQuestions.has(q.id) ? ' (Flagged)' : ''}${answers[q.id] ? ' (Answered)' : ''}`}
                                >
                                    {flaggedQuestions.has(q.id) && <Flag size={8} className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 fill-red-500 text-red-500" />}
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                        <div className="mt-8 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><div className="w-4 h-4 border-2 border-green-500 bg-green-50 rounded"></div> Answered</div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><div className="w-4 h-4 border-2 border-red-500 bg-red-50 rounded"></div> Flagged</div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><div className="w-4 h-4 border-2 border-gray-200 rounded"></div> Not Attempted</div>
                        </div>
                    </div>
                )}

                <ViolationModal
                    isOpen={showViolationModal}
                    onClose={() => setShowViolationModal(false)}
                    title={violationMessage.title}
                    message={violationMessage.message}
                    severity={violationMessage.title.includes('Final') || violationMessage.title.includes('Maximum') ? 'critical' : 'warning'}
                />

                {showUnansweredModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white rounded-full p-2">
                                        <AlertCircle className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Unanswered Questions</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-gray-700 dark:text-gray-300">
                                    You have <strong className="text-orange-600 dark:text-orange-400">{unansweredQuestions.length}</strong> unanswered question{unansweredQuestions.length !== 1 ? 's' : ''}.
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Jump to question:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {unansweredQuestions.map((index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    jumpToQuestion(index);
                                                    setShowUnansweredModal(false);
                                                }}
                                                className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                                            >
                                                Q{index + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300">?? Submitting with unanswered questions will result in 0 points for those questions.</p>
                                </div>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button onClick={() => setShowUnansweredModal(false)} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    Review Questions
                                </button>
                                <button onClick={() => { setShowUnansweredModal(false); handleSubmit(); }} className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg">
                                    Submit Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showAutoSubmitWarning && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="bg-white rounded-full p-2 animate-pulse">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">? Time's Up!</h3>
                                </div>
                            </div>
                            <div className="p-8 text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700"/>
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 60}`} strokeDashoffset={`${2 * Math.PI * 60 * (1 - autoSubmitCountdown / 5)}`} className="text-red-500 transition-all duration-1000" strokeLinecap="round"/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-5xl font-bold text-red-600 dark:text-red-500">{autoSubmitCountdown}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">Your exam time has expired</p>
                                    <p className="text-gray-600 dark:text-gray-400">Submitting automatically in {autoSubmitCountdown} second{autoSubmitCountdown !== 1 ? 's' : ''}...</p>
                                </div>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((dot) => (
                                        <div key={dot} className={`w-2 h-2 rounded-full transition-all duration-300 ${dot > autoSubmitCountdown ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}/>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 pb-6">
                                <button onClick={() => { setShowAutoSubmitWarning(false); setAutoSubmitCountdown(5); handleSubmit(); }} className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105">
                                    Submit Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center pb-8">
                    <div className="inline-flex items-center justify-center space-x-2 text-gray-400 dark:text-gray-500">
                        <span className="text-sm">Powered by</span>
                        <Logo size="sm" showText={true} className="opacity-75 grayscale hover:grayscale-0 transition-all duration-300" />
                    </div>
                </div>
            </div>
        </div >
    );
}
