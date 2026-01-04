// helper: get user session or attempt background anonymous sign-in (non-blocking)
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Loader2, Save, Flag, LayoutGrid, Moon, Calculator as CalcIcon, Star, Eye, AlertCircle, Settings, Type, X, Wrench, StickyNote, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ViolationModal } from '../components/ViolationModal';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Calculator } from '../components/Calculator';
import Latex from 'react-latex-next';
import { useConvexProctoring } from '../hooks/useConvexProctoring';
import { useExamProgress } from '../hooks/useExamProgress';
import { 
    Confetti, 
    QuestionSkeleton, 
    SuccessCheck, 
    ShakeWrapper, 
    SlideTransition,
    useScreenReaderAnnounce,
    useImagePreloader,
    useDyslexiaFont 
} from '../components/ExamAnimations';

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
    is_active?: boolean;
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
    const { user, loading } = useAuth();
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const submissionId = searchParams.get('submission');
    const isReviewMode = !!submissionId;
    
    // Supabase-based exam progress (for authenticated users)
    const {
        progress: savedProgress,
        isLoading: progressLoading,
        hasExistingProgress,
        isAuthenticated,
        studentInfo,
        updateAnswers: updateProgressAnswers,
        updateFlaggedQuestions: updateProgressFlagged,
        updateCurrentQuestion: updateProgressCurrentQuestion,
        updateTimeRemaining: updateProgressTimeRemaining,
        updateViolations: updateProgressViolations,
        updateScratchpad: updateProgressScratchpad,
        updateConfidenceLevels: updateProgressConfidence,
        startExam: startProgressExam,
        markSubmitted: markProgressSubmitted,
        forceSave: forceSaveProgress,
    } = useExamProgress({
        examId: id || '',
        enabled: !!user && !isReviewMode,
        autoSaveInterval: 3000,
    });
    
    // Check if exam was accessed via portal (code entry)
    useEffect(() => {
        // Allow review mode and submission view
        if (window.location.search.includes('submission=')) return;
        // Wait for auth to load
        if (loading) return;
        // Only check for normal exams (not kids mode)
        const portalFlag = sessionStorage.getItem('durrah_exam_portal_access');
        if (!portalFlag && !user) {
            // Not accessed via portal and not logged in, redirect
            navigate('/student-portal');
        }
        // If logged in or portalFlag, allow access
    }, [loading, user, navigate]);
    
    const [exam, setExam] = useState<Exam | null>(null);
    // Initialize studentData from authenticated user if available
    const [studentData, setStudentData] = useState<Record<string, string>>(() => {
        // Will be populated by effect when user loads
        return {};
    });
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
    const [showAccessMenu, setShowAccessMenu] = useState(false);
    const [showToolsMenu, setShowToolsMenu] = useState(false);
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
    
    // Initialize student data from authenticated user
    useEffect(() => {
        if (user && studentInfo) {
            setStudentData(prev => ({
                ...prev,
                name: studentInfo.name || prev.name || '',
                email: studentInfo.email || prev.email || '',
                student_id: studentInfo.id || prev.student_id || '',
            }));
        }
    }, [user, studentInfo]);
    
    // Flag to track if we just restored progress (to prevent immediate re-sync)
    const justRestoredRef = useRef(false);
    // Flag to track if we've already shown the restore toast (prevent duplicates)
    const hasShownRestoreToastRef = useRef(false);
    
    // Restore progress from Supabase for authenticated users
    useEffect(() => {
        if (!progressLoading && savedProgress && hasExistingProgress && isAuthenticated) {
            // Check if there's actually meaningful progress to restore
            const hasAnswers = savedProgress.answers && Object.keys(savedProgress.answers).length > 0;
            const hasStarted = !!savedProgress.started_at;
            const hasMeaningfulProgress = hasAnswers || hasStarted;
            
            // Skip if no meaningful progress
            if (!hasMeaningfulProgress) return;
            
            // Mark that we're restoring to prevent immediate re-sync
            justRestoredRef.current = true;
            
            // Restore answers
            if (hasAnswers) {
                setAnswers(savedProgress.answers);
            }
            // Restore flagged questions
            if (savedProgress.flagged_questions?.length > 0) {
                setFlaggedQuestions(new Set(savedProgress.flagged_questions));
            }
            // Restore current question
            if (savedProgress.current_question_index !== undefined && savedProgress.current_question_index > 0) {
                setCurrentQuestionIndex(savedProgress.current_question_index);
            }
            // Restore time remaining
            if (savedProgress.time_remaining_seconds !== null && savedProgress.time_remaining_seconds > 0) {
                setTimeLeft(savedProgress.time_remaining_seconds);
            }
            // Restore violations
            if (savedProgress.violations?.length > 0) {
                setViolations(savedProgress.violations);
            }
            // Restore scratchpad
            if (savedProgress.scratchpad_content) {
                setScratchpadContent(savedProgress.scratchpad_content);
            }
            // Restore confidence levels
            if (savedProgress.confidence_levels && Object.keys(savedProgress.confidence_levels).length > 0) {
                setConfidenceLevels(savedProgress.confidence_levels as Record<string, 'low' | 'medium' | 'high'>);
            }
            // Check if already started
            if (hasStarted && savedProgress.started_at) {
                setStarted(true);
                setStartedAt(new Date(savedProgress.started_at).getTime());
                setHasPreviousSession(true);
                
                // Only show toast once per session and if we have actual answers
                if (!hasShownRestoreToastRef.current && hasAnswers) {
                    hasShownRestoreToastRef.current = true;
                    toast.success(t('examView.progressRestored', 'Your progress has been restored'), {
                        duration: 3000,
                        icon: '💾'
                    });
                }
            }
            // Check if already submitted
            if (savedProgress.status === 'submitted' || savedProgress.status === 'auto_submitted') {
                setSubmitted(true);
            }
            
            // Clear the flag after a short delay
            setTimeout(() => {
                justRestoredRef.current = false;
            }, 3000);
        }
    }, [progressLoading, savedProgress, hasExistingProgress, isAuthenticated, t]);
    const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);

    // Feature 1: Progress tracking
    const [progressPercentage, setProgressPercentage] = useState(0);

    const formatTimeLeft = (seconds: number | null) => {
        if (seconds === null || seconds === undefined) return '--:--';
        if (seconds < 0) seconds = 0;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Feature 2: Keyboard shortcuts
    const [keyboardShortcutsEnabled] = useState(true);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

    // Feature 3: Timer warnings
    const [showTimerWarning, setShowTimerWarning] = useState(false);
    const [warningLevel, setWarningLevel] = useState<'yellow' | 'orange' | 'red'>('yellow');
    const [hasShownWarning, setHasShownWarning] = useState({
        fiveMin: false,
        oneMin: false,
        thirtySec: false
    });

    // Feature 4: Scratchpad
    const [showScratchpad, setShowScratchpad] = useState(false);
    const [scratchpadContent, setScratchpadContent] = useState('');
    const [isScratchpadMinimized, setIsScratchpadMinimized] = useState(false);

    // Feature 6: Confidence levels
    const [confidenceLevels, setConfidenceLevels] = useState<Record<string, 'low' | 'medium' | 'high'>>({});

    // Feature 7: Mobile swipe gestures
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

    // Feature 8: Text-to-speech
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechRate] = useState(1.0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Feature 9: Answer change tracking
    const [answerChanges, setAnswerChanges] = useState<Record<string, {
        changes: number;
        history: Array<{ answer: any; timestamp: number }>;
    }>>({});

    // Anti-cheat: temporary blur/lock during copy/print attempts
    const [blurQuestionsUntil, setBlurQuestionsUntil] = useState<number>(0);

    // Feature 10: Session timeout
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const [inactivityCountdown, setInactivityCountdown] = useState(60);
    const lastActivityRef = useRef(Date.now());
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Network/Connection tracking for robust timer
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
    const lastServerSyncRef = useRef<number>(Date.now());
    const timerPausedAtRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);

    // ============================================
    // ANIMATION & ACCESSIBILITY STATE
    // ============================================
    // Show confetti when exam is submitted successfully
    const [showConfetti, setShowConfetti] = useState(false);
    // Show success checkmark animation when answer is selected
    const [showSuccessAnimation, setShowSuccessAnimation] = useState<string | null>(null);
    // Shake validation errors
    const [shakeSubmitButton, setShakeSubmitButton] = useState(false);
    // Loading state for questions
    const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
    // Question slide direction
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'up' | 'down'>('right');
    // Dyslexia-friendly font
    const { isDyslexiaFont: dyslexiaFont, toggleDyslexiaFont } = useDyslexiaFont();
    // Screen reader announcements
    const announce = useScreenReaderAnnounce();
    // Preload question images
    const questionImages = exam?.questions?.map(q => q.media_url).filter((url): url is string => !!url) || [];
    useImagePreloader(questionImages);

    // Generate a stable student ID for proctoring
    const proctoringStudentId = useRef(
        studentData.email || studentData.student_id || `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    
    // Convex Proctoring Integration with answer backup and server-side timer
    const {
        startSession: startProctoringSession,
        syncAnswers: syncAnswersToConvex,
        updateProgress: updateProctoringProgress,
        logViolation: logConvexViolation,
        endSession: endProctoringSession,
        serverTimeRemaining,
        savedAnswers: _convexSavedAnswers, // Used in callbacks
        isResumedSession: _isResumedSession, // Used in callbacks
        sessionStatus,
        enabled: proctoringEnabled,
        isConnected: proctoringConnected,
        lastHeartbeat: _lastProctoringHeartbeat,
    } = useConvexProctoring({
        examId: id || '',
        studentId: proctoringStudentId.current,
        studentName: studentData.name || 'Anonymous',
        studentEmail: studentData.email,
        totalQuestions: exam?.questions?.length || 0,
        timeLimitSeconds: exam?.settings?.time_limit_minutes ? exam.settings.time_limit_minutes * 60 : undefined,
        studentData: studentData, // Full form data for auto-submit
        heartbeatInterval: 10000,
        answerSyncDebounce: 2000,
        onHeartbeatError: (error) => {
            console.warn('Proctoring heartbeat error:', error);
        },
        onAutoSubmitted: (savedAnswers) => {
            // Handle auto-submit notification from server
            console.log('🔔 Exam was auto-submitted by server with answers:', savedAnswers);
            toast.success(t('examView.autoSubmitted'), { duration: 5000 });
            setSubmitted(true);
        },
        onSessionRecovered: (data) => {
            // Handle session recovery - restore answers from Convex
            console.log('🔄 Session recovered from Convex:', data);
            if (data.savedAnswers && Object.keys(data.savedAnswers).length > 0) {
                setAnswers(prev => ({
                    ...prev,
                    ...data.savedAnswers
                }));
                toast.success(t('examView.sessionRecovered'), { 
                    duration: 4000,
                    icon: '💾'
                });
            }
        },
    });

    // Update proctoring student ID when student data changes
    useEffect(() => {
        if (studentData.email || studentData.student_id) {
            proctoringStudentId.current = studentData.email || studentData.student_id || proctoringStudentId.current;
        }
    }, [studentData.email, studentData.student_id]);

    // Update proctoring progress and sync answers to Convex when answers change
    useEffect(() => {
        if (started && exam && proctoringEnabled) {
            const answeredCount = Object.keys(answers).filter(qId => {
                const ans = answers[qId]?.answer;
                return ans !== undefined && ans !== '' && (!Array.isArray(ans) || ans.length > 0);
            }).length;
            
            updateProctoringProgress(currentQuestionIndex, answeredCount, timeLeft ?? undefined);
            
            // Sync answers to Convex (debounced in the hook)
            if (Object.keys(answers).length > 0) {
                syncAnswersToConvex(answers, currentQuestionIndex, answeredCount).catch(err => {
                    console.warn('Failed to sync answers to Convex:', err);
                });
            }
        }
    }, [answers, currentQuestionIndex, timeLeft, started, exam, proctoringEnabled, updateProctoringProgress, syncAnswersToConvex]);

    // Use server-side timer when available (more accurate/tamper-proof)
    useEffect(() => {
        if (proctoringEnabled && serverTimeRemaining !== null && serverTimeRemaining !== undefined) {
            // Only update if significantly different (more than 3 seconds) to avoid jitter
            if (timeLeft === null || Math.abs((timeLeft || 0) - serverTimeRemaining) > 3) {
                setTimeLeft(serverTimeRemaining);
            }
        }
    }, [serverTimeRemaining, proctoringEnabled, timeLeft]);

    // Handle auto-submitted status from Convex
    useEffect(() => {
        if (sessionStatus === 'auto_submitted' && !submitted) {
            setSubmitted(true);
            toast.success(t('examView.autoSubmittedByServer'), { 
                duration: 6000,
                icon: '⏰'
            });
        }
    }, [sessionStatus, submitted, t]);
    
    // Network status monitoring for robust timer
    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            setConnectionQuality('good');
            reconnectAttemptsRef.current = 0;
            
            if (started && !submitted) {
                // Calculate time elapsed while offline
                const offlineDuration = timerPausedAtRef.current 
                    ? Math.floor((Date.now() - timerPausedAtRef.current) / 1000)
                    : 0;
                
                console.log(`🌐 Back online after ${offlineDuration}s offline`);
                
                // Adjust timer if we were offline (subtract elapsed time)
                if (offlineDuration > 0) {
                    setTimeLeft(prev => {
                        if (prev !== null && prev > 0) {
                            return Math.max(0, prev - offlineDuration);
                        }
                        return prev;
                    });
                }
                
                timerPausedAtRef.current = null;
                
                // Attempt to resync with Convex
                if (proctoringEnabled) {
                    try {
                        // Restart proctoring session to reactivate status
                        const sessionResult = await startProctoringSession();
                        if (sessionResult?.time_remaining_seconds !== null && sessionResult?.time_remaining_seconds !== undefined) {
                            // Use server time as authoritative
                            setTimeLeft(sessionResult.time_remaining_seconds);
                            lastServerSyncRef.current = Date.now();
                        }
                        toast.success(t('examView.connectionRestored', 'Connection restored'), {
                            duration: 2000,
                            icon: '🌐'
                        });
                    } catch (err) {
                        console.warn('Failed to resync proctoring session:', err);
                    }
                }
                
                // Also sync to Supabase if authenticated
                if (isAuthenticated) {
                    setTimeLeft(prev => {
                        if (prev !== null) {
                            updateProgressTimeRemaining(prev);
                        }
                        return prev;
                    });
                    forceSaveProgress().catch(console.warn);
                }
            }
        };
        
        const handleOffline = () => {
            setIsOnline(false);
            setConnectionQuality('poor');
            
            if (started && !submitted) {
                // Record when we went offline to calculate duration
                timerPausedAtRef.current = Date.now();
                
                console.log('⚠️ Network offline, timer continues locally');
                toast.error(t('examView.connectionLost', 'Connection lost - your progress is being saved locally'), {
                    duration: 3000,
                    icon: '📡'
                });
            }
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check connection quality periodically
        const connectionCheck = setInterval(() => {
            if (navigator.onLine && started && !submitted) {
                const timeSinceSync = Date.now() - lastServerSyncRef.current;
                if (timeSinceSync > 30000) { // 30s without server sync
                    setConnectionQuality('fair');
                }
                if (timeSinceSync > 60000) { // 60s without server sync
                    setConnectionQuality('poor');
                }
            }
        }, 10000);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(connectionCheck);
        };
    }, [started, submitted, proctoringEnabled, isAuthenticated, startProctoringSession, updateProgressTimeRemaining, forceSaveProgress, t]);
    
    // Update server sync timestamp when we receive server time
    useEffect(() => {
        if (serverTimeRemaining !== null && serverTimeRemaining !== undefined) {
            lastServerSyncRef.current = Date.now();
            setConnectionQuality('good');
        }
    }, [serverTimeRemaining]);

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

        // Restore any saved session state first
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
                // Restore new feature states
                if (parsed.confidenceLevels) {
                    setConfidenceLevels(parsed.confidenceLevels);
                }
                if (parsed.scratchpadContent) {
                    setScratchpadContent(parsed.scratchpadContent);
                }
                setHasPreviousSession(true);
                setHasPreviousSession(true);
            } catch (e) {
                console.error('Failed to restore session', e);
            }
        }

        // Check if already submitted on this device; verify on server that submission still exists
        const submittedFlag = localStorage.getItem(`durrah_exam_${id}_submitted`);
        const savedScore = localStorage.getItem(`durrah_exam_${id}_score`);

        const verifySubmissionStillExists = async () => {
            if (!submittedFlag) return;

            // Use email/student_id from restored state if available
            const identifier = (savedState ? JSON.parse(savedState)?.studentData?.email : null) || studentData.email || studentData.student_id;
            const savedScoreObj = savedScore ? (() => { try { return JSON.parse(savedScore); } catch { return null; } })() : null;
            const savedSubmissionId = savedScoreObj?.submission_id;

            const clearLocalSubmission = () => {
                localStorage.removeItem(`durrah_exam_${id}_submitted`);
                localStorage.removeItem(`durrah_exam_${id}_score`);
                setSubmitted(false);
                setScore(null);
            };

            // Prefer checking by submission_id if we have it; fallback to identifier lookup
            if (savedSubmissionId) {
                const { data, error } = await supabase
                    .from('submissions')
                    .select('id')
                    .eq('id', savedSubmissionId)
                    .maybeSingle();

                if (!error && !data) {
                    clearLocalSubmission();
                    return;
                }
            }

            if (!identifier) {
                // No identifier and no confirmed submission record — allow retake
                if (!savedSubmissionId) {
                    clearLocalSubmission();
                    return;
                }
                // We had a submission id and it still exists; keep submitted state
                setSubmitted(true);
                if (savedScoreObj) setScore(savedScoreObj);
                return;
            }

            const { data, error } = await supabase
                .from('submissions')
                .select('id')
                .eq('exam_id', id)
                .eq('student_email', identifier)
                .maybeSingle();

            if (!error && !data) {
                clearLocalSubmission();
            } else {
                setSubmitted(true);
                if (savedScoreObj) setScore(savedScoreObj);
            }
        };

        verifySubmissionStillExists();
    }, [id]);

    // Save state to localStorage whenever it changes (fallback for non-authenticated)
    // Use a ref to prevent infinite loops when syncing to Supabase
    const lastSyncedRef = useRef<string>('');
    
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
                lastUpdated: Date.now(),
                confidenceLevels,
                scratchpadContent
            };
            
            // Save to localStorage as fallback
            localStorage.setItem(`durrah_exam_${id}_state`, JSON.stringify(stateToSave));
        }
    }, [id, studentData, answers, violations, timeLeft, started, startedAt, submitted, flaggedQuestions, confidenceLevels, scratchpadContent]);
    
    // Separate effect for Supabase sync to avoid infinite loops
    useEffect(() => {
        // Skip if we just restored progress (prevent immediate re-sync)
        if (justRestoredRef.current) return;
        if (!id || submitted || !isAuthenticated || !started) return;
        
        // Create a hash of current state to avoid duplicate syncs
        const stateHash = JSON.stringify({
            answers: Object.keys(answers).length,
            flagged: flaggedQuestions.size,
            question: currentQuestionIndex,
            time: timeLeft,
            violations: violations.length,
        });
        
        // Skip if nothing changed
        if (stateHash === lastSyncedRef.current) return;
        lastSyncedRef.current = stateHash;
        
        // Debounce the sync
        const syncTimeout = setTimeout(() => {
            // Double-check we're not in restore mode
            if (justRestoredRef.current) return;
            
            updateProgressAnswers(answers);
            updateProgressFlagged(Array.from(flaggedQuestions));
            updateProgressCurrentQuestion(currentQuestionIndex);
            if (timeLeft !== null) {
                updateProgressTimeRemaining(timeLeft);
            }
            updateProgressViolations(violations);
            updateProgressConfidence(confidenceLevels);
            updateProgressScratchpad(scratchpadContent);
        }, 2000); // 2 second debounce
        
        return () => clearTimeout(syncTimeout);
    }, [id, submitted, isAuthenticated, started, answers, flaggedQuestions, currentQuestionIndex, timeLeft, violations, confidenceLevels, scratchpadContent, updateProgressAnswers, updateProgressFlagged, updateProgressCurrentQuestion, updateProgressTimeRemaining, updateProgressViolations, updateProgressConfidence, updateProgressScratchpad]);

    // Feature 1: Calculate progress percentage
    useEffect(() => {
        const answeredCount = Object.keys(answers).filter(id => {
            const answer = answers[id]?.answer;
            return answer !== undefined && answer !== '' && 
                   (!Array.isArray(answer) || answer.length > 0);
        }).length;
        
        const percentage = exam ? (answeredCount / exam.questions.length) * 100 : 0;
        setProgressPercentage(percentage);
    }, [answers, exam]);

    // Feature 3: Timer warnings
    useEffect(() => {
        if (timeLeft === null) return;

        // 5 minutes warning
        if (timeLeft <= 300 && timeLeft > 60 && !hasShownWarning.fiveMin) {
            setWarningLevel('yellow');
            setShowTimerWarning(true);
            setHasShownWarning(prev => ({ ...prev, fiveMin: true }));
            toast('⏰ 5 minutes remaining!', { icon: '⚠️', duration: 4000 });
        }
        
        // 1 minute warning
        if (timeLeft <= 60 && timeLeft > 30 && !hasShownWarning.oneMin) {
            setWarningLevel('orange');
            setShowTimerWarning(true);
            setHasShownWarning(prev => ({ ...prev, oneMin: true }));
            toast.error('⏰ 1 minute remaining!', { duration: 4000 });
        }
        
        // 30 seconds critical
        if (timeLeft <= 30 && !hasShownWarning.thirtySec) {
            setWarningLevel('red');
            setShowTimerWarning(true);
            setHasShownWarning(prev => ({ ...prev, thirtySec: true }));
            toast.error('⏰ 30 seconds left!', { duration: 4000 });
        }
        
        // Hide warning after 5 seconds
        if (showTimerWarning) {
            const timer = setTimeout(() => setShowTimerWarning(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, hasShownWarning, showTimerWarning]);

    // Feature 4: Load scratchpad from localStorage
    useEffect(() => {
        if (id) {
            const saved = localStorage.getItem(`durrah_exam_${id}_scratchpad`);
            if (saved) setScratchpadContent(saved);
        }
    }, [id]);

    // Feature 4: Auto-save scratchpad
    useEffect(() => {
        if (id && scratchpadContent) {
            const timer = setTimeout(() => {
                localStorage.setItem(`durrah_exam_${id}_scratchpad`, scratchpadContent);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [scratchpadContent, id]);

    // Feature 8: Cleanup text-to-speech on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Feature 10: Session timeout / inactivity tracking
    useEffect(() => {
        if (!started) return;

        const updateActivity = () => {
            lastActivityRef.current = Date.now();
            setShowInactivityWarning(false);
            setInactivityCountdown(60);
        };

        // Track user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, updateActivity);
        });

        // Check for inactivity every 30 seconds
        const checkInterval = setInterval(() => {
            const inactiveTime = Date.now() - lastActivityRef.current;
            const inactiveMinutes = inactiveTime / (1000 * 60);

            // Show warning after 15 minutes of inactivity
            if (inactiveMinutes >= 15 && !showInactivityWarning) {
                setShowInactivityWarning(true);
                
                // Start countdown
                let countdown = 60;
                setInactivityCountdown(countdown);
                
                inactivityTimerRef.current = setInterval(() => {
                    countdown -= 1;
                    setInactivityCountdown(countdown);
                    
                    if (countdown <= 0) {
                        // Auto-save and notify
                        toast.success('Progress saved due to inactivity', { duration: 5000 });
                        setShowInactivityWarning(false);
                        if (inactivityTimerRef.current) {
                            clearInterval(inactivityTimerRef.current);
                        }
                    }
                }, 1000);
            }
        }, 30000); // Check every 30 seconds

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity);
            });
            clearInterval(checkInterval);
            if (inactivityTimerRef.current) {
                clearInterval(inactivityTimerRef.current);
            }
        };
    }, [started, showInactivityWarning]);

    const fetchExam = async () => {
        try {
            // Securely fetch exam data (exclude correct_answer for security)
            const { data: examData, error } = await supabase.from('exams').select('*').eq('id', id).single();
            if (error) throw error;
            // If kids mode, skip portal check
            if (examData.settings?.child_mode_enabled) {
                sessionStorage.setItem('durrah_exam_portal_access', '1');
            }

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
            // If not kids mode, clear portal flag after loading
            if (!examData.settings?.child_mode_enabled) {
                sessionStorage.removeItem('durrah_exam_portal_access');
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

    const logViolation = useCallback((type: string, detail?: string) => {
        const violation: Violation = { type, timestamp: new Date().toISOString() };
        
        // Log to Convex proctoring system (real-time for tutors)
        if (proctoringEnabled) {
            logConvexViolation(type, detail);
        }
        
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
    }, [proctoringEnabled, logConvexViolation, exam?.settings.max_violations, t]);

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
                setBlurQuestionsUntil(Date.now() + 4000);
            }
        };

        const handlePaste = (e: ClipboardEvent) => {
            if (exam.settings.disable_copy_paste) {
                e.preventDefault();
                logViolation('paste_attempt');
                setBlurQuestionsUntil(Date.now() + 4000);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (exam.settings.disable_copy_paste) {
                const key = e.key.toLowerCase();
                if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(key)) {
                    e.preventDefault();
                    logViolation('keyboard_shortcut');
                    setBlurQuestionsUntil(Date.now() + 4000);
                }
                if ((e.ctrlKey || e.metaKey) && key === 'p') {
                    e.preventDefault();
                    logViolation('print_attempt');
                    setBlurQuestionsUntil(Date.now() + 4000);
                }
            }
        };

        const handleBeforePrint = () => {
            logViolation('print_detected');
            setBlurQuestionsUntil(Date.now() + 4000);
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
        window.addEventListener('beforeprint', handleBeforePrint);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('beforeprint', handleBeforePrint);
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

        // Initialize timer if not already set but exam has a limit
        if ((timeLeft === null || timeLeft === undefined) && exam?.settings?.time_limit_minutes) {
            setTimeLeft(exam.settings.time_limit_minutes * 60);
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
        
        // Start Convex proctoring session for real-time monitoring and server-side timer
        if (proctoringEnabled) {
            try {
                const sessionResult = await startProctoringSession();
                
                if (sessionResult) {
                    console.log('📡 Proctoring session started:', sessionResult);
                    
                    // If session was resumed, restore state
                    if (sessionResult.is_resume) {
                        console.log('🔄 Resuming previous session');
                        
                        // Restore saved answers from Convex
                        if (sessionResult.saved_answers && Object.keys(sessionResult.saved_answers).length > 0) {
                            setAnswers(prev => ({
                                ...prev,
                                ...sessionResult.saved_answers
                            }));
                            toast.success(t('examView.answersRestored'), { 
                                duration: 3000,
                                icon: '💾'
                            });
                        }
                        
                        // Use server time (tamper-proof)
                        if (sessionResult.time_remaining_seconds !== null) {
                            setTimeLeft(sessionResult.time_remaining_seconds);
                        }
                    } else {
                        // New session - use server start time if available
                        if (sessionResult.time_remaining_seconds !== null) {
                            setTimeLeft(sessionResult.time_remaining_seconds);
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to start proctoring session:', err);
            }
        }
        
        // For authenticated users, record exam start in Supabase
        if (isAuthenticated) {
            const timeLimitSeconds = exam?.settings?.time_limit_minutes 
                ? exam.settings.time_limit_minutes * 60 
                : undefined;
            startProgressExam(timeLimitSeconds).catch(err => {
                console.warn('Failed to record exam start in Supabase:', err);
            });
        }
        
        setStarted(true);
        setStartedAt(Date.now());
    };

    // Feature 2: Toggle flag helper
    const toggleFlag = (questionId: string) => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
                toast.success('Flag removed', { icon: '🏳️', duration: 1500 });
            } else {
                newSet.add(questionId);
                toast.success('Question flagged', { icon: '🚩', duration: 1500 });
            }
            return newSet;
        });
    };

    // Feature 2: Keyboard navigation handler
    useEffect(() => {
        if (!keyboardShortcutsEnabled || !started || isReviewMode) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            // Don't trigger if typing in input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            const currentQuestion = exam?.questions[currentQuestionIndex];
            
            switch(e.key) {
                case 'ArrowLeft':
                    if (viewMode === 'single' && currentQuestionIndex > 0) {
                        e.preventDefault();
                        setCurrentQuestionIndex(prev => prev - 1);
                    }
                    break;
                    
                case 'ArrowRight':
                    if (viewMode === 'single' && currentQuestionIndex < (exam?.questions.length || 0) - 1) {
                        e.preventDefault();
                        setCurrentQuestionIndex(prev => prev + 1);
                    }
                    break;
                    
                case ' ':
                    if (currentQuestion) {
                        e.preventDefault();
                        toggleFlag(currentQuestion.id);
                    }
                    break;
                    
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toast.success('Progress saved!', { icon: '💾', duration: 1500 });
                    }
                    break;
                    
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleSubmitWithCheck();
                    }
                    break;
                    
                case 'g':
                case 'G':
                    e.preventDefault();
                    setShowQuestionGrid(prev => !prev);
                    break;
                    
                case 'Escape':
                    setShowQuestionGrid(false);
                    setShowAccessMenu(false);
                    setShowKeyboardHelp(false);
                    break;
                    
                case '1':
                case '2':
                case '3':
                case '4':
                    if (currentQuestion?.type === 'multiple_choice' && currentQuestion.options) {
                        const index = parseInt(e.key) - 1;
                        if (index < currentQuestion.options.length) {
                            e.preventDefault();
                            handleAnswerUpdate(currentQuestion.id, currentQuestion.options[index]);
                        }
                    }
                    break;
                    
                case '?':
                    e.preventDefault();
                    setShowKeyboardHelp(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [keyboardShortcutsEnabled, started, currentQuestionIndex, viewMode, exam, answers, isReviewMode]);

    // Feature 7: Mobile swipe gesture handlers
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
        
        if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
            if (distanceX > 0) {
                // Swipe left - next question
                if (currentQuestionIndex < (exam?.questions.length || 0) - 1) {
                    setSwipeDirection('left');
                    setTimeout(() => {
                        setCurrentQuestionIndex(prev => prev + 1);
                        setSwipeDirection(null);
                    }, 150);
                }
            } else {
                // Swipe right - previous question
                if (currentQuestionIndex > 0) {
                    setSwipeDirection('right');
                    setTimeout(() => {
                        setCurrentQuestionIndex(prev => prev - 1);
                        setSwipeDirection(null);
                    }, 150);
                }
            }
        }
    };

    // Feature 8: Text-to-speech function
    const speakQuestion = (text: string) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        if (isSpeaking) {
            setIsSpeaking(false);
            return;
        }

        // Strip LaTeX and HTML
        const cleanText = text
            .replace(/\$\$.*?\$\$/g, ' mathematical expression ')
            .replace(/\$.*?\$/g, ' formula ')
            .replace(/<[^>]*>/g, '')
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = speechRate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            toast.error('Speech synthesis not available');
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    // Feature 9: Enhanced answer update with change tracking + success animation
    const handleAnswerUpdate = (questionId: string, newAnswer: any) => {
        const previousAnswer = answers[questionId]?.answer;
        
        // Track answer changes (only if previously set and different)
        if (previousAnswer !== undefined && previousAnswer !== newAnswer) {
            setAnswerChanges(prev => ({
                ...prev,
                [questionId]: {
                    changes: (prev[questionId]?.changes || 0) + 1,
                    history: [
                        ...(prev[questionId]?.history || []),
                        {
                            answer: newAnswer,
                            timestamp: Date.now()
                        }
                    ]
                }
            }));
        }

        // Show success animation
        setShowSuccessAnimation(questionId);
        setTimeout(() => setShowSuccessAnimation(null), 600);
        
        // Announce for screen readers
        announce(`Answer selected for question ${currentQuestionIndex + 1}`);

        // Update answer
        setAnswers(prev => ({
            ...prev,
            [questionId]: { answer: newAnswer }
        }));
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
            // Shake the submit button to indicate error
            setShakeSubmitButton(true);
            setTimeout(() => setShakeSubmitButton(false), 500);
            
            // Announce for screen readers
            announce(`${unanswered.length} questions unanswered. Please review before submitting.`);
            
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

            // Prepare metadata with confidence levels and answer changes
            const answerMetadata = answersPayload.map((a: any) => ({
                question_id: a.question_id,
                answer: a.answer,
                confidence: confidenceLevels[a.question_id] || null,
                changes: answerChanges[a.question_id]?.changes || 0,
                revision_history: answerChanges[a.question_id]?.history || []
            }));

            const confidenceStats = {
                low: Object.values(confidenceLevels).filter(c => c === 'low').length,
                medium: Object.values(confidenceLevels).filter(c => c === 'medium').length,
                high: Object.values(confidenceLevels).filter(c => c === 'high').length,
            };

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
                time_taken: timeTakenSeconds,
                metadata: {
                    answer_metadata: answerMetadata,
                    confidence_stats: confidenceStats,
                    total_answer_changes: Object.values(answerChanges).reduce((sum, item) => sum + item.changes, 0)
                }
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
                
                // Show confetti animation on successful submission
                setShowConfetti(true);
                
                // Announce for screen readers
                announce(`Exam submitted successfully! Your score is ${result.percentage.toFixed(1)} percent.`);
                
                // End Convex proctoring session with submission result
                if (proctoringEnabled) {
                    endProctoringSession('submitted', {
                        score: result.score,
                        max_score: result.max_score,
                        percentage: result.percentage,
                        submission_id: result.submission_id,
                        submitted_at: new Date().toISOString(),
                    }).catch(err => {
                        console.warn('Failed to end proctoring session:', err);
                    });
                }

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
                
                // Mark as submitted in Supabase for authenticated users
                if (isAuthenticated) {
                    try {
                        await forceSaveProgress(); // Ensure final state is saved
                        await markProgressSubmitted();
                    } catch (err) {
                        console.warn('Failed to mark progress as submitted in Supabase:', err);
                    }
                }

                // Exit fullscreen if active
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }

                toast.success(t('examView.success.submitted'), {
                    duration: 5000,
                    icon: '✅'
                });
                // Notify StudentPortal to refresh previous exams
                window.dispatchEvent(new Event('durrah_exam_submitted'));
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
            setSlideDirection('left'); // Slide left when going forward
            setIsLoadingQuestion(true);
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1);
                setIsLoadingQuestion(false);
            }, 100);
            // Scroll to top of question container
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToPrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setSlideDirection('right'); // Slide right when going back
            setIsLoadingQuestion(true);
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev - 1);
                setIsLoadingQuestion(false);
            }, 100);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const jumpToQuestion = (index: number) => {
        if (!exam) return;
        if (index >= 0 && index < exam.questions.length) {
            // Determine direction based on navigation
            setSlideDirection(index > currentQuestionIndex ? 'left' : 'right');
            setIsLoadingQuestion(true);
            
            // Announce for screen readers
            announce(`Navigating to question ${index + 1} of ${exam.questions.length}`);
            
            setTimeout(() => {
                setCurrentQuestionIndex(index);
                setIsLoadingQuestion(false);
            }, 100);
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
    const isBlurActive = blurQuestionsUntil > Date.now();


    if (!exam) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    // Block access if exam is not active
    if (exam.is_active === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                    <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">{t('examView.inactive.title', 'Exam Not Available')}</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{t('examView.inactive.message', 'This exam is currently deactivated by the tutor. Please check back later or contact your tutor for more information.')}</p>
                </div>
            </div>
        );
    }

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
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative overflow-hidden">
                {/* Confetti Animation */}
                {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
                
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full mb-8 animate-scale-pop relative z-10">
                    <div className="animate-success-pop">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white animate-fade-in">{t('examView.submitted.title')}</h2>
                    {showResults && score ? (
                        <div className="mt-4 animate-slide-in-up">
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{score.percentage.toFixed(1)}%</p>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{score.score} / {score.max_score} points</p>
                        </div>
                    ) : (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md animate-slide-in-up">
                            <p>{t('examView.submitted.message')}</p>
                            <p className="text-sm mt-2">{t('examView.submitted.resultsPending')}</p>
                        </div>
                    )}
                    <p className="mt-4 text-sm text-gray-500 animate-fade-in">{t('examView.submitted.recorded')}</p>

                    {/* View Answers Button */}
                    {/* View Answers Button */}
                    {exam?.settings.show_detailed_results && (
                        <div className="mt-6 flex justify-center animate-slide-in-up">
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
                                            <Latex>{question.question_text}</Latex>
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
                                                                    {option ? <Latex>{option}</Latex> : ''}
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
        <div ref={containerRef} className={`min-h-screen p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 ${dyslexiaFont ? 'dyslexia-font' : ''}`}>
            {/* Screen Reader Announcer */}
            <announce.Announcer />
            
            {/* Watermark Overlay */}
            {started && (
                <div className={`fixed inset-0 pointer-events-none z-50 overflow-hidden select-none flex flex-wrap content-center justify-center gap-24 rotate-[-15deg] transition-opacity duration-300 ${highContrast ? 'opacity-[0.08]' : 'opacity-[0.03]'}`}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="text-4xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {studentData.name || 'Student'} <br />
                            <span className="text-xl">{studentData.email || studentData.student_id || ''}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className={`max-w-4xl mx-auto ${!isZenMode ? 'pt-44 sm:pt-48' : 'pt-24'} pb-28 sm:pb-16 ${highContrast ? 'contrast-150 saturate-200 brightness-110' : ''}`}>
                <div
                    className="max-w-3xl mx-auto transition-all duration-300"
                    style={{ fontSize: fontSize === 'normal' ? '1rem' : fontSize === 'large' ? '1.25rem' : '1.5rem' } as React.CSSProperties}
                >
                    {/* Header - Hidden in Zen Mode unless hovered or essential */}
                    {!isZenMode && (
                        <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200/50 dark:border-gray-700/50">
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
                                                <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${progressPercentage}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    Time remaining: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatTimeLeft(timeLeft)}</span>
                                                    {proctoringEnabled && (
                                                        <span className={`inline-flex items-center ml-1 ${
                                                            !isOnline || !proctoringConnected ? 'text-red-500' : 
                                                            connectionQuality === 'poor' ? 'text-yellow-500' : 
                                                            'text-green-500'
                                                        }`} title={
                                                            !isOnline ? 'Offline - timer running locally' :
                                                            !proctoringConnected ? 'Reconnecting...' :
                                                            connectionQuality === 'poor' ? 'Poor connection' :
                                                            'Connected to server'
                                                        }>
                                                            {!isOnline || !proctoringConnected ? (
                                                                <Wifi className="w-3 h-3 animate-pulse" />
                                                            ) : connectionQuality === 'poor' ? (
                                                                <Wifi className="w-3 h-3" />
                                                            ) : (
                                                                <Wifi className="w-3 h-3" />
                                                            )}
                                                        </span>
                                                    )}
                                                </span>
                                                <span>Violations: <span className="font-semibold text-gray-800 dark:text-gray-200">{violations.length}/{exam?.settings.max_violations || 3}</span></span>
                                            </div>
                                            {progressPercentage === 100 && (
                                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                    ✓ All questions answered!
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                        {/* Questions Render Logic */}
                        {viewMode === 'list' ? (
                            // List View (Original)
                            <div className="space-y-6">
                                {exam.questions.map((question, index) => (
                                    <div id={`question-${index}`} key={question.id} className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 ${exam.settings.disable_copy_paste ? 'select-none' : ''} ${isBlurActive ? 'blur-sm pointer-events-none' : ''}`}>
                                        {/* Question Content (Same as before) */}
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-base sm:text-[1.15em] font-bold text-gray-900 dark:text-white leading-tight">
                                                <span className="mr-2 text-indigo-600 dark:text-indigo-400">Q{index + 1}.</span>
                                                <Latex>{question.question_text}</Latex>
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
                                                {question.media_type === 'image' && (
                                                    <div className="relative inline-block">
                                                        <img src={question.media_url} alt="Question media" className="max-h-96 rounded-lg mx-auto" />
                                                        <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm sm:text-base font-semibold pointer-events-none select-none">
                                                            {(studentData.name || 'Student')} • {(studentData.email || studentData.student_id || '')}
                                                        </div>
                                                    </div>
                                                )}
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
                                                    <label htmlFor={`q${question.id}-o${optIndex}`} className="ml-3 block text-sm sm:text-[1em] text-gray-700 dark:text-gray-300">
                                                        <Latex>{option}</Latex>
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
                                                    <label htmlFor={`q${question.id}-o${optIndex}`} className="ml-3 block text-[1em] text-gray-700 dark:text-gray-300">
                                                        {option}
                                                    </label>
                                                </div>
                                            ))}

                                            {question.type === 'short_answer' && (
                                                <textarea
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-[1em]"
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
                            <div 
                                className="space-y-6"
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                            >
                                {/* Show skeleton while loading question */}
                                {isLoadingQuestion ? (
                                    <QuestionSkeleton />
                                ) : exam.questions[currentQuestionIndex] && (() => {
                                    const question = exam.questions[currentQuestionIndex];
                                    return (
                                        <SlideTransition 
                                            key={`question-${currentQuestionIndex}`} 
                                            direction={slideDirection}
                                            className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 min-h-[50vh] transition-transform duration-150 ${exam.settings.disable_copy_paste ? 'select-none' : ''} ${isBlurActive ? 'blur-sm pointer-events-none' : ''} ${
                                                swipeDirection === 'left' ? '-translate-x-4 opacity-75' : swipeDirection === 'right' ? 'translate-x-4 opacity-75' : ''
                                            }`}
                                        >
                                            {/* Success Animation Overlay */}
                                            {showSuccessAnimation === question.id && (
                                                <div className="absolute top-4 right-4 z-10">
                                                    <SuccessCheck />
                                                </div>
                                            )}
                                            
                                            {/* Feature 8: Read Aloud Button */}
                                            <div className="flex items-center justify-between mb-4 gap-2">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                                    Question {currentQuestionIndex + 1} of {exam.questions.length}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFlag(question.id)}
                                                        className={`p-2 rounded-full border transition-colors ${flaggedQuestions.has(question.id)
                                                            ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200'
                                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                                                        }`}
                                                        aria-label={flaggedQuestions.has(question.id) ? 'Unflag question' : 'Flag question'}
                                                    >
                                                        <Flag size={18} fill={flaggedQuestions.has(question.id) ? 'currentColor' : 'none'} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => speakQuestion(question.question_text)}
                                                        className={`
                                                            flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium
                                                            transition-all duration-200 hover:scale-105
                                                            ${isSpeaking
                                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                                : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                                            }
                                                        `}
                                                    >
                                                        {isSpeaking ? (
                                                            <>
                                                                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                                Stop
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
                                                                </svg>
                                                                Read Aloud
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h3 className="text-base sm:text-[1.1em] font-bold text-gray-900 dark:text-white leading-relaxed">
                                                    <Latex>{question.question_text}</Latex>
                                                </h3>
                                            </div>

                                            {question.media_url && (
                                                <div className="mb-6">
                                                    {question.media_type === 'image' && (
                                                        <div className="relative inline-block">
                                                            <img src={question.media_url} alt="Question media" className="max-h-96 rounded-lg shadow-md" />
                                                            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm sm:text-base font-semibold pointer-events-none select-none">
                                                                {(studentData.name || 'Student')} • {(studentData.email || studentData.student_id || '')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {/* Render options based on type - Simplified for Single View */}
                                                {question.type === 'multiple_choice' && question.options?.map((option, optIndex) => (
                                                    <label key={optIndex} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${answers[question.id]?.answer === option ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg ring-2 ring-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                        <input
                                                            type="radio"
                                                            name={`question-${question.id}`}
                                                            value={option}
                                                            checked={answers[question.id]?.answer === option}
                                                            onChange={() => handleAnswerUpdate(question.id, option)}
                                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        />
                                                        <span className="ml-3 text-[1.1em] text-gray-900 dark:text-white"><Latex>{option}</Latex></span>
                                                    </label>
                                                ))}

                                                {question.type === 'true_false' && ['True', 'False'].map((option, optIndex) => (
                                                    <label key={optIndex} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${String(answers[question.id]?.answer) === option ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg ring-2 ring-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                        <input
                                                            type="radio"
                                                            name={`question-${question.id}`}
                                                            value={option}
                                                            checked={String(answers[question.id]?.answer) === option}
                                                            onChange={() => handleAnswerUpdate(question.id, option)}
                                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        />
                                                        <span className="ml-3 text-[1.1em] text-gray-900 dark:text-white">{option}</span>
                                                    </label>
                                                ))}


                                                {question.type === 'short_answer' && (
                                                    <textarea
                                                        className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-[1.1em]"
                                                        rows={6}
                                                        value={answers[question.id]?.answer || ''}
                                                        onChange={(e) => handleAnswerUpdate(question.id, e.target.value)}
                                                        placeholder="Type your answer here..."
                                                    />
                                                )}
                                            </div>

                                            {/* Feature 6: Confidence Level Selector */}
                                            {answers[question.id]?.answer && (
                                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                                                        How confident are you about this answer?
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {[
                                                            { level: 'low', label: 'Not Sure', icon: '😕', color: 'red' },
                                                            { level: 'medium', label: 'Somewhat', icon: '🤔', color: 'yellow' },
                                                            { level: 'high', label: 'Very Sure', icon: '😊', color: 'green' }
                                                        ].map(({ level, label, icon, color }) => (
                                                            <button
                                                                key={level}
                                                                type="button"
                                                                onClick={() => setConfidenceLevels(prev => ({
                                                                    ...prev,
                                                                    [question.id]: level as 'low' | 'medium' | 'high'
                                                                }))}
                                                                className={`
                                                                    flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 
                                                                    transition-all duration-200 hover:scale-105
                                                                    ${confidenceLevels[question.id] === level
                                                                        ? color === 'red' 
                                                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 shadow-md' 
                                                                            : color === 'yellow'
                                                                                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 shadow-md'
                                                                                : 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-md'
                                                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                                                                    }
                                                                `}
                                                            >
                                                                <span className="text-base mr-1">{icon}</span>
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Feature 9: Answer Change Indicator */}
                                            {answerChanges[question.id]?.changes > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Changed {answerChanges[question.id].changes} time{answerChanges[question.id].changes !== 1 ? 's' : ''}
                                                </div>
                                            )}

                                            {/* Navigation Buttons */}
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6 sm:mt-8 pt-5 border-t dark:border-gray-700">
                                                <button
                                                    type="button"
                                                    onClick={goToPrevQuestion}
                                                    disabled={currentQuestionIndex === 0}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium w-full sm:w-auto text-center ${currentQuestionIndex === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
                                                    >
                                                        Next Question
                                                    </button>
                                                ) : (
                                                    <ShakeWrapper shake={shakeSubmitButton}>
                                                        <button
                                                            type="button"
                                                            onClick={handleSubmitWithCheck}
                                                            disabled={isSubmitting}
                                                            className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 w-full sm:w-auto"
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
                                                    </ShakeWrapper>
                                                )}
                                            </div>
                                        </SlideTransition>
                                    );
                                })()}
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <div className="flex justify-end pt-4">
                                <ShakeWrapper shake={shakeSubmitButton}>
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
                                </ShakeWrapper>
                            </div>
                        )}
                    </form>
                </div>

                    {/* Floating Toolbar */}
                <div className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col items-end gap-2 z-50 transition-all duration-300 ${isZenMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
                    {showAccessMenu && (
                        <div className="mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 min-w-[240px] animate-in fade-in slide-in-from-bottom-4 duration-200">
                            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Settings size={16} /> {t('examView.accessibility.settings')}
                                </h3>
                                <button onClick={() => setShowAccessMenu(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Font Size */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Type size={14} /> {t('examView.accessibility.fontSize')}
                                    </label>
                                    <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                                        {(['normal', 'large', 'xlarge'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => {
                                                    setFontSize(size);
                                                }}
                                                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${fontSize === size
                                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                    }`}
                                            >
                                                {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dyslexia-Friendly Font */}
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Type size={14} /> Dyslexia Font
                                    </label>
                                    <button
                                        onClick={toggleDyslexiaFont}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${dyslexiaFont ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        aria-label="Toggle dyslexia-friendly font"
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dyslexiaFont ? (t('common.dir') === 'rtl' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* High Contrast */}
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Moon size={14} /> High Contrast
                                    </label>
                                    <button
                                        onClick={() => setHighContrast(!highContrast)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${highContrast ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        aria-label="Toggle high contrast mode"
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highContrast ? (t('common.dir') === 'rtl' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showToolsMenu && (
                        <div className="mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 min-w-[220px] animate-in fade-in slide-in-from-bottom-4 duration-200">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tools</h3>
                                <button onClick={() => setShowToolsMenu(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={() => { setShowScratchpad(true); setIsScratchpadMinimized(false); setShowToolsMenu(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <span className="flex items-center gap-2"><StickyNote size={16} /> Scratchpad</span>
                                    {showScratchpad && !isScratchpadMinimized && <span className="text-indigo-500 text-xs font-bold">Open</span>}
                                </button>
                                <button
                                    onClick={() => { setShowCalculator(true); setShowToolsMenu(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <span className="flex items-center gap-2"><CalcIcon size={16} /> Calculator</span>
                                    {showCalculator && <span className="text-indigo-500 text-xs font-bold">Open</span>}
                                </button>
                                <button
                                    onClick={() => { setShowAccessMenu(true); setShowToolsMenu(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <span className="flex items-center gap-2"><Settings size={16} /> Accessibility</span>
                                </button>
                                <button
                                    onClick={() => { setShowKeyboardHelp(true); setShowToolsMenu(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <span className="flex items-center gap-2">⌨️ Keyboard Shortcuts</span>
                                </button>
                                <button
                                    onClick={() => { setIsZenMode(prev => !prev); setShowToolsMenu(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <span className="flex items-center gap-2">{isZenMode ? 'Exit Zen' : 'Enter Zen'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setShowQuestionGrid(!showQuestionGrid)}
                            className="p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                            title="Question Map"
                        >
                            <LayoutGrid size={24} />
                        </button>
                        <button
                            onClick={() => setShowToolsMenu(!showToolsMenu)}
                            className={`p-3 rounded-full shadow-lg transition-all ${showToolsMenu ? 'bg-indigo-600 text-white' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:scale-110 active:scale-95'}`}
                            title="Tools"
                        >
                            <Wrench size={22} />
                        </button>
                    </div>
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
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{idx + 1}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFlag(q.id);
                                            }}
                                            className={`p-1 rounded-full ${flaggedQuestions.has(q.id) ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'}`}
                                            aria-label={flaggedQuestions.has(q.id) ? 'Unflag question' : 'Flag question'}
                                        >
                                            <Flag size={12} fill={flaggedQuestions.has(q.id) ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
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

                {/* Feature 2: Keyboard Help Modal */}
                {showKeyboardHelp && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    ⌨️ Keyboard Shortcuts
                                </h3>
                                <button 
                                    onClick={() => setShowKeyboardHelp(false)}
                                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { keys: ['←', '→'], desc: 'Navigate questions' },
                                        { keys: ['Space'], desc: 'Flag question' },
                                        { keys: ['Ctrl', 'S'], desc: 'Save progress' },
                                        { keys: ['Ctrl', 'Enter'], desc: 'Submit exam' },
                                        { keys: ['1-4'], desc: 'Select option A-D' },
                                        { keys: ['G'], desc: 'Question grid' },
                                        { keys: ['Esc'], desc: 'Close modals' },
                                        { keys: ['?'], desc: 'Show this help' },
                                    ].map((shortcut, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.desc}</span>
                                            <div className="flex gap-1">
                                                {shortcut.keys.map(key => (
                                                    <kbd 
                                                        key={key}
                                                        className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                                                    >
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feature 3: Timer Warning */}
                {timeLeft !== null && timeLeft <= 300 && (
                    <div className={`fixed top-4 right-4 z-40 transition-all duration-300 ${
                        showTimerWarning ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                    }`}>
                        <div className={`
                            px-4 py-3 rounded-lg shadow-xl border-2 backdrop-blur-sm
                            ${warningLevel === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 text-yellow-800 dark:text-yellow-200' : ''}
                            ${warningLevel === 'orange' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 text-orange-800 dark:text-orange-200 animate-pulse' : ''}
                            ${warningLevel === 'red' ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200 animate-pulse' : ''}
                        `}>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className={`w-5 h-5 ${
                                    warningLevel === 'red' ? 'animate-bounce' : ''
                                }`} />
                                <div>
                                    <p className="font-bold text-sm">
                                        {timeLeft > 60 ? `${Math.floor(timeLeft / 60)} minutes` : `${timeLeft} seconds`} remaining
                                    </p>
                                    {warningLevel === 'red' && (
                                        <p className="text-xs mt-1">Please submit your exam!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feature 4: Scratchpad Panel */}
                {showScratchpad && !isScratchpadMinimized && (
                    <div 
                        className="fixed bottom-24 sm:bottom-20 right-3 left-3 sm:left-auto sm:right-6 w-full max-w-[360px] sm:w-80 h-[280px] sm:h-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-indigo-200 dark:border-indigo-700 flex flex-col z-40 overflow-hidden"
                        style={{ maxWidth: 'calc(100vw - 1.5rem)', maxHeight: 'calc(100vh - 12rem)' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 flex items-center justify-between cursor-move">
                            <div className="flex items-center gap-2 text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <h3 className="font-medium text-sm">Scratchpad</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsScratchpadMinimized(true)}
                                    className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
                                    aria-label="Minimize"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Clear all scratchpad content?')) {
                                            setScratchpadContent('');
                                            localStorage.removeItem(`durrah_exam_${id}_scratchpad`);
                                        }
                                    }}
                                    className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
                                    aria-label="Clear"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setShowScratchpad(false)}
                                    className="text-white hover:bg-white/20 rounded p-0.5 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-3">
                            <textarea
                                value={scratchpadContent}
                                onChange={(e) => setScratchpadContent(e.target.value)}
                                placeholder="Notes & calculations...&#10;Auto-saved!"
                                className="w-full h-full resize-none bg-yellow-50 dark:bg-gray-900 border border-dashed border-yellow-300 dark:border-yellow-700 rounded p-2 focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 font-mono text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400"
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Auto-saved
                            </span>
                            <span>{scratchpadContent.length} characters</span>
                        </div>
                    </div>
                )}

                {/* Minimized scratchpad indicator */}
                {isScratchpadMinimized && (
                    <button
                        onClick={() => setIsScratchpadMinimized(false)}
                        className="fixed bottom-24 right-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-lg hover:scale-105 transition-transform z-40 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                        </svg>
                        Scratchpad
                        {scratchpadContent && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
                    </button>
                )}

                {/* Feature 10: Inactivity Warning Modal */}
                {showInactivityWarning && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white rounded-full p-2">
                                        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Are You Still There?</h3>
                                </div>
                            </div>

                            <div className="p-6 text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-24 h-24 transform -rotate-90">
                                            <circle 
                                                cx="48" 
                                                cy="48" 
                                                r="44" 
                                                stroke="currentColor" 
                                                strokeWidth="6" 
                                                fill="none" 
                                                className="text-gray-200 dark:text-gray-700" 
                                            />
                                            <circle 
                                                cx="48" 
                                                cy="48" 
                                                r="44" 
                                                stroke="currentColor" 
                                                strokeWidth="6" 
                                                fill="none" 
                                                strokeDasharray={`${2 * Math.PI * 44}`}
                                                strokeDashoffset={`${2 * Math.PI * 44 * (1 - inactivityCountdown / 60)}`}
                                                className="text-orange-500 transition-all duration-1000" 
                                                strokeLinecap="round" 
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl font-bold text-orange-600 dark:text-orange-500">
                                                {inactivityCountdown}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        You've been inactive for 15 minutes
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Your progress will be saved automatically in {inactivityCountdown} seconds
                                    </p>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        💡 Don't worry! Your answers are being saved automatically.
                                    </p>
                                </div>
                            </div>

                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        lastActivityRef.current = Date.now();
                                        setShowInactivityWarning(false);
                                        if (inactivityTimerRef.current) {
                                            clearInterval(inactivityTimerRef.current);
                                        }
                                        toast.success("Welcome back! Session extended.");
                                    }}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105"
                                >
                                    I'm Still Here
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
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 60}`} strokeDashoffset={`${2 * Math.PI * 60 * (1 - autoSubmitCountdown / 5)}`} className="text-red-500 transition-all duration-1000" strokeLinecap="round" />
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
                                        <div key={dot} className={`w-2 h-2 rounded-full transition-all duration-300 ${dot > autoSubmitCountdown ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
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

                <div className="mt-8 text-center pb-8" dir="ltr">
                    <div className="inline-flex items-center justify-center space-x-2 text-gray-400 dark:text-gray-500">
                        <span className="text-sm">Powered by</span>
                        <Logo size="sm" showText={true} className="opacity-75 grayscale hover:grayscale-0 transition-all duration-300" />
                    </div>
                </div>
            </div>
        </div >
    );
}
