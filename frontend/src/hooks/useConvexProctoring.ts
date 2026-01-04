import { useEffect, useRef, useCallback, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CONVEX_FEATURES } from '../main';

/**
 * useConvexProctoring
 * 
 * Hook for real-time exam proctoring with answer backup:
 * - Starts a session when student begins exam
 * - Syncs answers in real-time to Convex (backup)
 * - Server-side timer (authoritative)
 * - Session recovery on reconnect
 * - Auto-submit on server when time expires
 * 
 * Usage:
 * const { 
 *   startSession, 
 *   syncAnswers,
 *   logViolation, 
 *   endSession,
 *   serverTimeRemaining,
 *   savedAnswers,
 *   isResumedSession,
 * } = useConvexProctoring({
 *   examId: 'exam-123',
 *   studentId: 'user-456',
 *   studentName: 'John Doe',
 *   totalQuestions: 20,
 *   timeLimitSeconds: 3600,
 *   studentData: { name: 'John', grade: '10', ... },
 * });
 */

interface UseConvexProctoringOptions {
  examId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  totalQuestions: number;
  timeLimitSeconds?: number;
  studentData?: Record<string, unknown>;
  enabled?: boolean;
  heartbeatInterval?: number; // ms, default 10000
  answerSyncDebounce?: number; // ms, default 2000
  onHeartbeatError?: (error: Error) => void;
  onAutoSubmitted?: (savedAnswers: Record<string, unknown>) => void;
  onSessionRecovered?: (data: { savedAnswers: Record<string, unknown>; timeRemaining: number }) => void;
}

interface SessionStartResult {
  session_id: string;
  is_resume: boolean;
  saved_answers: Record<string, unknown>;
  time_remaining_seconds: number | null;
  server_started_at: number | null;
  violations: Array<{ type: string; timestamp: number; detail?: string }>;
  answered_count: number;
  current_question: number;
}

export function useConvexProctoring(options: UseConvexProctoringOptions) {
  const {
    examId,
    studentId,
    studentName,
    studentEmail,
    totalQuestions,
    timeLimitSeconds,
    studentData,
    enabled = CONVEX_FEATURES.proctoring,
    heartbeatInterval = 10000,
    answerSyncDebounce = 2000,
    onHeartbeatError,
    onAutoSubmitted,
    onSessionRecovered,
  } = options;

  // State
  const [serverTimeRemaining, setServerTimeRemaining] = useState<number | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, unknown>>({});
  const [isResumedSession, setIsResumedSession] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  // Mutations
  const startSessionMutation = useMutation(api.sessions.startSession);
  const syncAnswersMutation = useMutation(api.sessions.syncAnswers);
  const heartbeatMutation = useMutation(api.sessions.heartbeat);
  const logViolationMutation = useMutation(api.sessions.logViolation);
  const endSessionMutation = useMutation(api.sessions.endSession);

  // Server time query (for timer sync)
  const serverTimeData = useQuery(
    api.sessions.getServerTime,
    enabled && sessionStatus === 'active' ? { exam_id: examId, student_id: studentId } : 'skip'
  );

  // Refs for tracking state
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const pendingAnswersRef = useRef<Record<string, unknown>>({});

  // Current progress (updated by caller)
  const currentProgressRef = useRef({
    currentQuestion: 0,
    answeredCount: 0,
    timeRemaining: undefined as number | undefined,
  });

  // Update server time when query returns
  useEffect(() => {
    if (serverTimeData && serverTimeData.time_remaining_seconds !== null) {
      setServerTimeRemaining(serverTimeData.time_remaining_seconds);
      
      // Check if auto-submitted on server
      if (serverTimeData.status === 'auto_submitted' && serverTimeData.saved_answers) {
        onAutoSubmitted?.(serverTimeData.saved_answers as Record<string, unknown>);
        setSessionStatus('auto_submitted');
      }
    }
  }, [serverTimeData, onAutoSubmitted]);

  // Start session (returns saved state for recovery)
  const startSession = useCallback(async (): Promise<SessionStartResult | null> => {
    if (!enabled) return null;

    try {
      const result = await startSessionMutation({
        exam_id: examId,
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        student_data: studentData,
        total_questions: totalQuestions,
        time_limit_seconds: timeLimitSeconds,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
      }) as SessionStartResult;

      sessionIdRef.current = result.session_id;
      isActiveRef.current = true;
      setSessionStatus('active');

      // Handle session recovery
      if (result.is_resume && result.saved_answers) {
        setIsResumedSession(true);
        setSavedAnswers(result.saved_answers);
        onSessionRecovered?.({
          savedAnswers: result.saved_answers,
          timeRemaining: result.time_remaining_seconds ?? 0,
        });
      }

      // Set server time
      if (result.time_remaining_seconds !== null) {
        setServerTimeRemaining(result.time_remaining_seconds);
      }

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(async () => {
        if (!isActiveRef.current) return;

        try {
          await heartbeatMutation({
            exam_id: examId,
            student_id: studentId,
            current_question: currentProgressRef.current.currentQuestion,
            answered_count: currentProgressRef.current.answeredCount,
            time_remaining_seconds: currentProgressRef.current.timeRemaining,
            network_quality: navigator.onLine ? 'good' : 'poor',
          });
        } catch (error) {
          console.error('Heartbeat error:', error);
          onHeartbeatError?.(error as Error);
        }
      }, heartbeatInterval);

      return result;
    } catch (error) {
      console.error('Failed to start proctoring session:', error);
      return null;
    }
  }, [
    enabled,
    examId,
    studentId,
    studentName,
    studentEmail,
    studentData,
    totalQuestions,
    timeLimitSeconds,
    heartbeatInterval,
    startSessionMutation,
    heartbeatMutation,
    onHeartbeatError,
    onSessionRecovered,
  ]);

  // Sync answers to server (debounced)
  const syncAnswers = useCallback(async (
    answers: Record<string, unknown>,
    currentQuestion: number,
    answeredCount: number,
    immediate = false
  ): Promise<{ time_remaining_seconds?: number } | null> => {
    if (!enabled || !isActiveRef.current) return null;

    // Merge with pending answers
    pendingAnswersRef.current = {
      ...pendingAnswersRef.current,
      ...answers,
    };

    // Clear existing timeout
    if (answerSyncTimeoutRef.current) {
      clearTimeout(answerSyncTimeoutRef.current);
    }

    const doSync = async (): Promise<{ time_remaining_seconds?: number } | null> => {
      try {
        const result = await syncAnswersMutation({
          exam_id: examId,
          student_id: studentId,
          answers: pendingAnswersRef.current,
          current_question: currentQuestion,
          answered_count: answeredCount,
        });

        // Update local saved answers
        setSavedAnswers(prev => ({
          ...prev,
          ...pendingAnswersRef.current,
        }));

        // Update server time
        if (result.time_remaining_seconds !== undefined) {
          setServerTimeRemaining(result.time_remaining_seconds);
        }

        // Clear pending
        pendingAnswersRef.current = {};

        return { time_remaining_seconds: result.time_remaining_seconds };
      } catch (error) {
        console.error('Failed to sync answers:', error);
        return null;
      }
    };

    if (immediate) {
      return doSync();
    }

    // Debounced sync
    return new Promise((resolve) => {
      answerSyncTimeoutRef.current = setTimeout(async () => {
        const result = await doSync();
        resolve(result);
      }, answerSyncDebounce);
    });
  }, [enabled, examId, studentId, answerSyncDebounce, syncAnswersMutation]);

  // Update progress (call this when student answers questions)
  const updateProgress = useCallback((
    currentQuestion: number,
    answeredCount: number,
    timeRemaining?: number
  ) => {
    currentProgressRef.current = {
      currentQuestion,
      answeredCount,
      timeRemaining,
    };
  }, []);

  // Log violation
  const logViolation = useCallback(async (
    type: string,
    detail?: string
  ) => {
    if (!enabled || !isActiveRef.current) return null;

    try {
      const result = await logViolationMutation({
        exam_id: examId,
        student_id: studentId,
        type,
        detail,
      });
      return result;
    } catch (error) {
      console.error('Failed to log violation:', error);
      return null;
    }
  }, [enabled, examId, studentId, logViolationMutation]);

  // End session
  const endSession = useCallback(async (
    status: 'submitted' | 'expired' | 'auto_submitted' = 'submitted',
    submissionResult?: Record<string, unknown>
  ) => {
    if (!enabled) return null;

    // Sync any pending answers first
    if (Object.keys(pendingAnswersRef.current).length > 0) {
      await syncAnswers(
        pendingAnswersRef.current,
        currentProgressRef.current.currentQuestion,
        currentProgressRef.current.answeredCount,
        true // immediate
      );
    }

    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Clear answer sync timeout
    if (answerSyncTimeoutRef.current) {
      clearTimeout(answerSyncTimeoutRef.current);
      answerSyncTimeoutRef.current = null;
    }
    
    isActiveRef.current = false;
    setSessionStatus(status);

    try {
      const result = await endSessionMutation({
        exam_id: examId,
        student_id: studentId,
        status,
        submission_result: submissionResult,
      });
      sessionIdRef.current = null;
      return result;
    } catch (error) {
      console.error('Failed to end proctoring session:', error);
      return null;
    }
  }, [enabled, examId, studentId, endSessionMutation, syncAnswers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (answerSyncTimeoutRef.current) {
        clearTimeout(answerSyncTimeoutRef.current);
      }
    };
  }, []);

  return {
    startSession,
    syncAnswers,
    updateProgress,
    logViolation,
    endSession,
    isActive: isActiveRef.current,
    sessionId: sessionIdRef.current,
    serverTimeRemaining,
    savedAnswers,
    isResumedSession,
    sessionStatus,
    enabled,
  };
}

/**
 * useProctorDashboard
 * 
 * Hook for tutors to monitor all active sessions for an exam.
 * 
 * Usage:
 * const { sessions, stats, isLoading } = useProctorDashboard('exam-123');
 */
export function useProctorDashboard(examId: string, enabled = CONVEX_FEATURES.proctoring) {
  // Subscribe to all sessions for this exam - use "skip" for disabled
  const sessions = useQuery(
    api.sessionsQueries.getExamSessions,
    enabled ? { exam_id: examId } : 'skip'
  );

  // Get exam stats
  const stats = useQuery(
    api.sessionsQueries.getExamStats,
    enabled ? { exam_id: examId } : 'skip'
  );

  // Get sessions with violations (alerts)
  const alerts = useQuery(
    api.sessionsQueries.getSessionsWithViolations,
    enabled ? { exam_id: examId, min_violations: 2 } : 'skip'
  );

  return {
    sessions: sessions ?? [],
    stats: stats ?? {
      total: 0,
      active: 0,
      disconnected: 0,
      submitted: 0,
      expired: 0,
      auto_submitted: 0,
      total_violations: 0,
      avg_progress: 0,
    },
    alerts: alerts ?? [],
    isLoading: sessions === undefined,
    enabled,
  };
}
