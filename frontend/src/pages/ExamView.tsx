// ExamView.tsx – cleaned up imports, added missing state, typed callbacks, and fixed submission handling
import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Clock, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ViolationModal } from '../components/ViolationModal';
// import { Logo } from '../components/Logo'; // not used currently

// Utility: Fisher‑Yates shuffle for randomizing arrays
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
        show_student_answers?: boolean;
        show_results_immediately?: boolean;
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
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [started, setStarted] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState<{ score: number; max_score: number; percentage: number } | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [violations, setViolations] = useState<any[]>([]);
    const [showViolationModal, setShowViolationModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [violationMessage, setViolationMessage] = useState({ title: '', message: '' });

    const isSubmittingRef = useRef(false);

    // ---------------------------------------------------------------------------
    // Fetch exam + questions, apply randomization if enabled
    // ---------------------------------------------------------------------------
    const fetchExam = async () => {
        if (!id) return;
        try {
            const { data: examData, error } = await supabase.from('exams').select('*').eq('id', id).single();
            if (error) throw error;
            const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', id);

            const settings = examData.settings || {};
            const normalized: any = { ...settings };
            if (!normalized.start_time && settings.start_date) normalized.start_time = settings.start_date;
            if (!normalized.end_time && settings.end_date) normalized.end_time = settings.end_date;

            // Randomize if flag is set
            let questions: Question[] = qData || [];
            if (normalized.randomize_questions) {
                questions = shuffleArray(questions);
                questions = questions.map((q) => {
                    if (Array.isArray(q.options)) {
                        return { ...q, options: shuffleArray(q.options) };
                    }
                    return q;
                });
            }

            setExam({ ...examData, questions, settings: normalized });

            // Availability checks
            const now = new Date();
            let start: Date | null = null;
            let end: Date | null = null;
            if (normalized.start_time) {
                const d = new Date(normalized.start_time);
                if (!isNaN(d.getTime())) start = d;
            }
            if (normalized.end_time) {
                const d = new Date(normalized.end_time);
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

            // Initialise timer if needed and no saved state
            if (normalized.time_limit_minutes && !localStorage.getItem(`durrah_exam_${id}_state`)) {
                setTimeLeft(normalized.time_limit_minutes * 60);
            }
        } catch (e: any) {
            console.error(e);
            toast.error('Failed to load exam');
            navigate('/dashboard');
        }
    };

    useEffect(() => {
        fetchExam();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ---------------------------------------------------------------------------
    // Timer handling
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!started || timeLeft === null) return;
        if (timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((t: number | null) => (t && t > 0 ? t - 1 : 0)), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !submitted && !isSubmittingRef.current) {
            handleSubmit();
        }
    }, [started, timeLeft, submitted]);

    // ---------------------------------------------------------------------------
    // Helper: calculate score
    // ---------------------------------------------------------------------------
    const calculateScore = () => {
        if (!exam) return { score: 0, max_score: 0, percentage: 0 };
        let total = 0;
        let earned = 0;
        exam.questions.forEach((q) => {
            if (q.type === 'short_answer') return;
            total += q.points || 0;
            const studentAns = answers[q.id];
            if (studentAns === undefined || studentAns === null) return;
            const correct = q.correct_answer;
            const norm = (v: any) => (Array.isArray(v) ? v.map(String).sort().join('|') : String(v).trim().toLowerCase());
            if (norm(studentAns) === norm(correct)) earned += q.points || 0;
        });
        const perc = total ? (earned / total) * 100 : 0;
        return { score: earned, max_score: total, percentage: perc };
    };

    // ---------------------------------------------------------------------------
    // Submission handling
    // ---------------------------------------------------------------------------
    const handleSubmit = async () => {
        if (!exam || isSubmittingRef.current || submitted) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            const submissionPayload = {
                exam_id: exam.id,
                student_data: studentData,
            };
            const { data: subData, error: subErr } = await supabase.from('submissions').insert(submissionPayload).single();
            if (subErr) throw subErr;
            const submissionId = (subData as any)?.id; // currently unused but kept for future reference

            const answersPayload = Object.entries(answers).map(([question_id, answer]) => ({
                submission_id: submissionId,
                question_id,
                answer: Array.isArray(answer) ? JSON.stringify(answer) : answer,
            }));
            const { error: ansErr } = await supabase.from('submission_answers').insert(answersPayload);
            if (ansErr) throw ansErr;

            const sc = calculateScore();
            setScore(sc);
            setSubmitted(true);
            localStorage.setItem(`durrah_exam_${exam.id}_submitted`, 'true');
            localStorage.setItem(`durrah_exam_${exam.id}_score`, JSON.stringify(sc));
            toast.success('Exam submitted successfully');
        } catch (e: any) {
            console.error(e);
            toast.error('Submission failed, will retry later');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    // ---------------------------------------------------------------------------
    // UI helpers
    // ---------------------------------------------------------------------------
    const startExam = () => {
        const required = exam?.required_fields || ['name', 'email'];
        const missing = required.filter((f) => !studentData[f]);
        if (missing.length) {
            toast.error(`Please fill required fields: ${missing.join(', ')}`);
            return;
        }
        if (!isAvailable) {
            toast.error(availabilityMessage || 'Exam not available');
            return;
        }
        if (exam?.settings.require_fullscreen) {
            document.documentElement.requestFullscreen().catch(() => console.warn('Fullscreen not supported'));
        }
        setStarted(true);
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    if (!exam) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    // After submission – detailed review if enabled
    if (submitted) {
        if (exam.settings.show_student_answers) {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Exam Review</h2>
                        {exam.questions.map((q, idx) => {
                            const studentAns = answers[q.id];
                            const correctAns = q.correct_answer;
                            const isCorrect = (() => {
                                const norm = (v: any) => (Array.isArray(v) ? v.map(String).sort().join('|') : String(v).trim().toLowerCase());
                                return norm(studentAns) === norm(correctAns);
                            })();
                            return (
                                <div key={q.id} className="mb-6 border-b pb-4">
                                    <p className="font-medium text-gray-900 dark:text-white">{idx + 1}. {q.question_text}</p>
                                    <p className="mt-1 text-sm">
                                        Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{String(studentAns) || '—'}</span>
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Correct answer: <span className="font-medium">{Array.isArray(correctAns) ? (correctAns as string[]).join(', ') : String(correctAns)}</span>
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Result: <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                    </p>
                                </div>
                            );
                        })}
                        <div className="mt-8 text-center">
                            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        // Simple summary view
        return (
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
    }

    // Not started – show start screen
    if (!started) {
        const required = exam.required_fields || ['name', 'email'];
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 w-full max-w-lg">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{exam.title}</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">{exam.description}</p>
                    {required.map((field) => (
                        <div key={field} className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                            <input
                                type="text"
                                value={studentData[field] || ''}
                                onChange={(e) => setStudentData({ ...studentData, [field]: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                    ))}
                    <button
                        onClick={startExam}
                        disabled={!isAvailable}
                        className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                        {isAvailable ? 'Start Exam' : availabilityMessage || 'Unavailable'}
                    </button>
                </div>
            </div>
        );
    }

    // Exam in progress – render questions
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{exam.title}</h2>
                {exam.settings.time_limit_minutes && timeLeft !== null && (
                    <div className="flex items-center mb-4 text-gray-800 dark:text-gray-200">
                        <Clock className="h-5 w-5 mr-1" />
                        <span>Time left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                    </div>
                )}
                {exam.questions.map((q: Question, idx: number) => (
                    <div key={q.id} className="mb-6">
                        <p className="font-medium text-gray-900 dark:text-white mb-2">{idx + 1}. {q.question_text}</p>
                        {q.type === 'multiple_choice' && q.options && (
                            <div className="space-y-2">
                                {q.options.map((opt) => (
                                    <label key={opt} className="flex items-center">
                                        <input
                                            type="radio"
                                            name={q.id}
                                            value={opt}
                                            checked={answers[q.id] === opt}
                                            onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                                            className="mr-2"
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        )}
                        {q.type === 'multiple_select' && q.options && (
                            <div className="space-y-2">
                                {q.options.map((opt) => (
                                    <label key={opt} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name={q.id}
                                            value={opt}
                                            checked={Array.isArray(answers[q.id]) && answers[q.id].includes(opt)}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                                if (e.target.checked) {
                                                    setAnswers({ ...answers, [q.id]: [...prev, opt] });
                                                } else {
                                                    setAnswers({ ...answers, [q.id]: prev.filter((v: string) => v !== opt) });
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        )}
                        {q.type === 'short_answer' && (
                            <textarea
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                rows={3}
                            />
                        )}
                    </div>
                ))}
                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> : <Save className="h-4 w-4 mr-1" />}
                        Submit Exam
                    </button>
                </div>
            </div>
            {/* Violation modal (kept simple) */}
            {showViolationModal && (
                <ViolationModal
                    isOpen={showViolationModal}
                    onClose={() => setShowViolationModal(false)}
                    title={violationMessage.title}
                    message={violationMessage.message}
                />
            )}
        </div>
    );
}
