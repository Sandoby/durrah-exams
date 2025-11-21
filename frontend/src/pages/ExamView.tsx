// helper: get user session or attempt background anonymous sign-in (non-blocking)
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ViolationModal } from '../components/ViolationModal';
import { Logo } from '../components/Logo';

// Helper to avoid hanging fetches (useful for mobile network/CORS issues)
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(input, { ...(init || {}), signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

async function getUserOrAnonymous() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        // Detect iOS/Safari that blocks session storage
        const isBlockedBrowser =
            typeof navigator !== 'undefined' &&
            /iphone|ipad|ipod|safari/i.test(navigator.userAgent) &&
            !/chrome/i.test(navigator.userAgent);

        if (!session && isBlockedBrowser) {
            // Attempt to sign in with the dedicated anonymous account for iOS/Safari
            // (this account must exist in Supabase Auth). This only runs on
            // detected iOS/Safari browsers and when there's no existing session.
            const anonEmail = 'anonymous@durrahsystem.tech';
            const anonPassword = 'durrah-2352206';
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email: anonEmail, password: anonPassword });
                if (error) {
                    console.warn('Anonymous signin failed', error);
                    return null;
                }
                return data?.user ?? null;
            } catch (e) {
                console.warn('Anonymous signin error', e);
                return null;
            }
        }

        return session?.user ?? null;
    } catch (e) {
        console.warn('getUserOrAnonymous outer error', e);
        return null;
    }
}

interface Question {
    id: string;
    type: string;
    question_text: string;
    options?: string[];
    points: number;
    correct_answer?: string | string[] | null;
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
    };
}
export default function ExamView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState<Exam | null>(null);
    const [studentData, setStudentData] = useState<Record<string, string>>({});
    const [started, setStarted] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [violations, setViolations] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState<{ score: number; max_score: number; percentage: number } | null>(null);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const [violationMessage, setViolationMessage] = useState({ title: '', message: '' });
    const [hasPreviousSession, setHasPreviousSession] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
    // Removed unused warnedUnauth state

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
            // Optionally try to load the score if we saved it, or just show a generic "Already Submitted" message
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
                setStarted(parsed.started || false);
                if (parsed.timeLeft !== null && parsed.timeLeft !== undefined) {
                    setTimeLeft(parsed.timeLeft);
                }
                setHasPreviousSession(true);
                toast.success('Previous session restored');
            } catch (e) {
                console.error('Failed to restore session', e);
            }
        }
    }, [id]);

    // On mount, attempt a background anonymous signin on iOS/Safari so session is available before submit
    useEffect(() => {
        (async () => {
            try {
                await getUserOrAnonymous();
            } catch (e) {
                // ignore — this is best-effort
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!id || submitted) return;

        // Only save if we have started or have entered some data
        if (started || Object.keys(studentData).length > 0) {
            const stateToSave = {
                studentData,
                answers,
                violations,
                timeLeft,
                started,
                lastUpdated: Date.now()
            };
            localStorage.setItem(`durrah_exam_${id}_state`, JSON.stringify(stateToSave));
        }
    }, [id, studentData, answers, violations, timeLeft, started, submitted]);
  const fetchExam = async () => {
        try {
            const { data: examData, error } = await supabase.from('exams').select('*').eq('id', id).single();
            if (error) throw error;
            const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', id);
            const settings = examData.settings || {};
            const normalizedSettings: any = { ...settings };
            // support both naming conventions
            if (!normalizedSettings.start_time && settings.start_date) normalizedSettings.start_time = settings.start_date;
            if (!normalizedSettings.end_time && settings.end_date) normalizedSettings.end_time = settings.end_date;

            setExam({ ...examData, questions: qData || [], settings: normalizedSettings });

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
                setAvailabilityMessage(`Exam starts at ${start.toLocaleString()}`);
            } else if (end && now > end) {
                setIsAvailable(false);
                setAvailabilityMessage(`Exam ended at ${end.toLocaleString()}`);
            } else {
                setIsAvailable(true);
                setAvailabilityMessage(null);
            }

            // Only set initial time if not restored from session
            if (!localStorage.getItem(`durrah_exam_${id}_state`) && examData.settings?.time_limit_minutes) {
                setTimeLeft(examData.settings.time_limit_minutes * 60);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load exam');
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
        const violation = { type, timestamp: new Date().toISOString() };
        setViolations((prev: any[]) => {
            const newViolations = [...prev, violation];
            const violationCount = newViolations.length;
            const maxViolations = exam?.settings.max_violations || 3;
            const remaining = maxViolations - violationCount;
          if (remaining > 0) {
                if (remaining <= 1) {
                    // Critical warning
                    setViolationMessage({
                        title: 'Final Warning',
                        message: You have ${remaining} violation${remaining !== 1 ? 's' : ''} remaining before automatic submission.
                    });
                    setShowViolationModal(true);
                } else {
                    // Standard warning via toast
                    toast.error(`Violation recorded! ${remaining} remaining.`, {
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
                    title: 'Maximum Violations Reached',
                    message: 'Your exam will now be submitted automatically due to excessive violations.'
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
                    setViolationMessage({ title: 'Tab Switch Detected', message: 'You switched away from the exam.' });
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
            if (exam.settings.require_fullscreen && !document.fullscreenElement && started && !submitted) {
                logViolation('exit_fullscreen');
                if (violations.length < (exam.settings.max_violations || 3) - 1) {
                    setViolationMessage({ title: 'Fullscreen Exit Detected', message: 'Return to fullscreen immediately.' });
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
            toast.error('Please fill required fields');
            return;
        }
        // Prevent starting if exam not available
        if (!isAvailable) {
            toast.error(availabilityMessage || 'Exam is not available right now');
            return;
        }
        if (exam?.settings.require_fullscreen) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && typeof (window as any).MSStream === 'undefined';
            if (isIOS) {
                toast('iOS Safari does not support the Fullscreen API. Exam will start without fullscreen.', { icon: 'ℹ️' });
            } else {
                try {
                    await document.documentElement.requestFullscreen();
                } catch (e) {
                    toast.error('Fullscreen required to start exam');
                    return;
                }
            }
        }
        setStarted(true);
    };

    const calculateScore = () => {
        if (!exam) return { score: 0, max_score: 0, percentage: 0 };
        let total = 0;
        let earned = 0;
        exam.questions.forEach((q: Question) => {
            // skip auto-scoring for open-ended short_answer questions
            if (q.type === 'short_answer') return;
            total += q.points || 0;
            const studentAnswer = answers[q.id];
            if (!studentAnswer) return;

            // multiple_select: correct_answer is expected to be an array
            if (Array.isArray(q.correct_answer)) {
                let studentArr: string[] = [];
                if (Array.isArray(studentAnswer)) studentArr = studentAnswer as string[];
                else {
                    try { studentArr = JSON.parse(studentAnswer); } catch { studentArr = (String(studentAnswer)).split('||').filter(Boolean); }
                }
                const a = (q.correct_answer as string[]).map(s => String(s).trim()).sort();
                const b = studentArr.map(s => String(s).trim()).sort();
                if (a.length === b.length && a.every((val, idx) => val === b[idx])) {
                    earned += q.points || 0;
                }
            } else {
            }
        });
        return { score: earned, max_score: total, percentage: total ? (earned / total) * 100 : 0 };
    };

        const handleSubmit = async () => {
        // Prevent duplicate submissions
        if (!exam  isSubmittingRef.current  submitted) return;

        // Prevent submission if outside allowed window
        const settings = exam.settings || {};
        const startStr = settings.start_time || settings.start_date;
        const endStr = settings.end_time || settings.end_date;
        const now = new Date();
        if (startStr) {
            const startD = new Date(startStr);
            if (!isNaN(startD.getTime()) && now < startD) {
                toast.error(`Exam is not open yet. Starts at ${startD.toLocaleString()}`);
                return;
            }
        }
        if (endStr) {
            const endD = new Date(endStr);
            if (!isNaN(endD.getTime()) && now > endD) {
                toast.error('Exam has already ended');
                return;
            }
        }
          // Double check local storage to prevent race conditions or reload exploits
        if (localStorage.getItem(`durrah_exam_${id}_submitted`)) {
            toast.error('Exam already submitted from this device.');
            setSubmitted(true);
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        let currentUser: any = null;
        try {
            // Resolve current user, but don't let failures here block submission flow
            try {
                currentUser = await getUserOrAnonymous();
            } catch (e) {
                console.warn('getUserOrAnonymous failed, proceeding without user id', e);
                // continue without currentUser; backend will accept submissions without student_id
            }
            const grading = calculateScore();
            const studentName = studentData.name  studentData.student_id  'Anonymous';
            const studentEmail = studentData.email  `${studentData.student_id  'student'}@example.com`;

            const browserInfo = {
                user_agent: navigator.userAgent,
                student_data: studentData,
                screen_width: window.screen.width,
                screen_height: window.screen.height,
                language: navigator.language
            };

            // Prefer server-side submission first to avoid client-side auth/RLS issues (common on iOS/Safari)
            const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;
            const backendUrl = ${apiBase.replace(/\/$/, '')}/api/exams/${id}/submit;

            const backendBody = {
                exam_id: id,
                student_id: currentUser?.id,
                student_data: studentData,
                answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer: Array.isArray(answer) ? JSON.stringify(answer) : answer, time_spent_seconds: 0 })),
                violations,
                browser_info: browserInfo
            };

            // Try server-side submit first (more reliable on constrained mobile browsers)
            let backendSucceeded = false;
            let backendLastError: any = null;
            const maxAttempts = 2;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const resp = await fetchWithTimeout(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(backendBody)
                    }, 15000);
                    if (resp.ok) {
                        const json = await resp.json();
                        setScore({ score: json.score, max_score: json.max_score, percentage: json.percentage });
                        setSubmitted(true);
                        localStorage.setItem(`durrah_exam_${id}_submitted`, 'true');
                        localStorage.setItem(`durrah_exam_${id}_score`, JSON.stringify({ score: json.score, max_score: json.max_score, percentage: json.percentage }));
                        localStorage.removeItem(`durrah_exam_${id}_state`);
                        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                        backendSucceeded = true;
                        break;
                    } else {
                        const txt = await resp.text();
                        backendLastError = Status ${resp.status}: ${txt};
                        console.warn('Backend submit responded with non-OK', resp.status, txt);
                    }
                } catch (e) {
                    backendLastError = e;
                    console.warn('Backend submit failed (network/CORS?)', e);
                }

                // Exponential backoff before retrying
                if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
            }
          // If backend not available or failed after retries, fall back to Supabase client-side insertion
            if (!backendSucceeded) {
                console.warn('Backend did not accept submission, falling back to Supabase. Last backend error:', backendLastError);
            }

            const { data: submission, error } = await supabase.from('submissions').insert({
                exam_id: id,
                student_id: currentUser?.id,
                student_name: studentName,
                student_email: studentEmail,
                score: grading.score,
                max_score: grading.max_score,
                violations,
                browser_info: browserInfo
            }).select().single();

            if (error) {
                // error message is logged above; no need to assign errMsg
                console.warn('Supabase insert failed', error);
                // If Supabase failed due to RLS/permission, fall through to pending save handling below
                // Otherwise also fall through so we can attempt to persist locally rather than losing the submission
                // We don't throw here; outer catch will handle saving pending submissions locally
                throw error;
            }

            // Supabase insert succeeded; store answers in submission_answers
            const answersPayload = Object.entries(answers).map(([question_id, answer]) => {
                let toSend: any = answer;
                if (Array.isArray(answer)) toSend = JSON.stringify(answer);
                return ({ submission_id: submission.id, question_id, answer: toSend });
            });
            if (answersPayload.length) await supabase.from('submission_answers').insert(answersPayload);

            setScore(grading);
            setSubmitted(true);

            // Mark as submitted in local storage to prevent retakes
            localStorage.setItem(`durrah_exam_${id}_submitted`, 'true');
            localStorage.setItem(`durrah_exam_${id}_score`, JSON.stringify(grading));

            // Clear temporary state
            localStorage.removeItem(`durrah_exam_${id}_state`);
          if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        } catch (err: any) {
            console.error('Submission error', err);
            // Handle common RLS error message specially
            // error message is logged above; no need to assign msg
            // error message is logged above; no need to assign lower
            // Save pending submission to localStorage for later retry if backend+Supabase both failed
            try {
                    const pendingRaw = localStorage.getItem('durrah_pending_submissions');
                    const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
                    const grading = calculateScore();
                    const studentName = studentData.name  studentData.student_id  'Anonymous';
                    const studentEmail = studentData.email  `${studentData.student_id  'student'}@example.com`;
                    const browserInfo = {
                        user_agent: navigator.userAgent,
                        student_data: studentData,
                        screen_width: window.screen.width,
                        screen_height: window.screen.height,
                        language: navigator.language
                    };
                    const submissionPayload = {
                        exam_id: id,
                        student_id: currentUser?.id,
                        student_name: studentName,
                        student_email: studentEmail,
                        score: grading.score,
                        max_score: grading.max_score,
                        violations,
                        browser_info: browserInfo,
                        created_at: new Date().toISOString()
                    };
                    const answersPayload = Object.entries(answers).map(([question_id, answer]) => ({ submission_id: null, question_id, answer: Array.isArray(answer) ? JSON.stringify(answer) : answer }));
                    pending.push({ submissionPayload, answersPayload });
                    localStorage.setItem('durrah_pending_submissions', JSON.stringify(pending));
                    toast.success('Submission saved locally and will be retried when possible. If this keeps happening, please try from desktop and share console logs.');
                } catch (e) {
                    console.error('Failed to persist pending submission locally', e);
                    toast.error('Submission failed and could not be saved locally');
                }
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    // Attempt to flush pending submissions saved locally (best-effort). Called on online event and on mount.
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
                    // Try backend submit first
                    const apiBase = import.meta.env.VITE_API_BASE || '';
                    const backendUrl = ${apiBase}/api/exams/${submissionPayload.exam_id}/submit;
                    let flushed = false;
                    try {
                        const student_data = submissionPayload.browser_info?.student_data || { name: submissionPayload.student_name, email: submissionPayload.student_email };
                        const body = {
                            exam_id: submissionPayload.exam_id,
                            student_data,
                            answers: (answersPayload || []).map((a: any) => ({ question_id: a.question_id, answer: a.answer })),
                            violations: submissionPayload.violations || [],
                            browser_info: submissionPayload.browser_info || {}
                        };
                        const resp = await fetchWithTimeout(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 12000);
                        if (resp.ok) {
                            flushed = true;
                        } else {
                            console.warn('Backend flush responded non-OK', resp.status, await resp.text());
                        }
                    } catch (e) {
                        console.warn('Backend flush failed', e);
                    }

                    if (!flushed) {
                        // Fallback: try writing to Supabase directly
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
if (submitted) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Exam Submitted</h2>
                {score && (
                    <div className="mt-4">
                        <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{score.percentage.toFixed(1)}%</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{score.score} / {score.max_score} points</p>
                    </div>
                )}
                <p className="mt-4 text-sm text-gray-500">Your submission has been recorded.</p>
            </div>
        </div>
    );

    if (!started) return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-center mb-6">
                    <Logo size="md" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{exam.title}</h1>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{exam.description}</p>

                {hasPreviousSession && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Previous session found. Your progress has been restored.
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    {(exam.required_fields || ['name', 'email']).map((field) => {
                        const fieldLabels: Record<string, string> = { name: 'Full Name', email: 'Email Address', student_id: 'Student ID', phone: 'Phone Number' };
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
                            <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Exam Security Rules</h3>
                            <ul className="mt-2 text-xs text-red-800 dark:text-red-300 list-disc list-inside space-y-1">
                                {exam.settings.require_fullscreen && <li>Fullscreen mode required</li>}
                                {exam.settings.detect_tab_switch && <li>Tab switching is monitored</li>}
                                {exam.settings.disable_copy_paste && <li>Copy/Paste disabled</li>}
                                <li>Max violations: {exam.settings.max_violations || 3}</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* iPhone/Safari help modal or instructions */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md mb-6">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-yellow-900 dark:text-yellow-200">iPhone/Safari Submission Help</h3>
                            <ul className="mt-2 text-xs text-yellow-800 dark:text-yellow-300 list-disc list-inside space-y-1">
                                <li>Make sure Safari is <b>not</b> in Private Browsing mode.</li>
                                <li>Enable cookies: Settings &gt; Safari &gt; Block All Cookies (<b>disable</b>).</li>
                                <li>Disable “Prevent Cross-Site Tracking”: Settings &gt; Safari &gt; Prevent Cross-Site Tracking (<b>disable</b>).</li>
                                <li>Use “Add to Home Screen” for best reliability (Share &gt; Add to Home Screen).</li>
                                <li>If you see a submission error, try logging out and logging in again before submitting.</li>
                                <li>If it still fails, <b>take screenshots</b> of your answers before submitting and contact support/tutor.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <button
                    onClick={startExam}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {hasPreviousSession ? 'Resume Exam' : 'Start Exam'}
                </button>
            </div>
        </div>
    );
return (
        <div ref={containerRef} className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6 sticky top-4 z-10">
                    <div className="flex justify-between items-center">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-xs">{exam.title}</h1>
                        <div className="flex items-center space-x-3">
                            {timeLeft !== null && (
                                <div className={`flex items-center px-3 py-1 rounded-full ${timeLeft < 60 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span className="font-mono font-bold">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                                </div>
                            )}
                            <div className={`flex items-center px-3 py-1 rounded-full ${violations.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                <span className="font-bold text-sm">Violations: {violations.length}/{exam.settings.max_violations || 3}</span>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {exam.questions.map((q, i) => (
                        <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <div className="font-medium text-gray-900 dark:text-white mb-4 flex">
                                <span className="mr-2">{i + 1}.</span>
                                <span>{q.question_text}</span>
                                <span className="ml-auto text-sm text-gray-500">({q.points} pts)</span>
                            </div>

                            {q.type === 'multiple_choice' && q.options?.map((opt) => (
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
        </div>
    );
}
