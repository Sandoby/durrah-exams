import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CONVEX_FEATURES } from '../main';

/**
 * useConvexProctoring
 * 
 * Hook for real-time exam proctoring:
 * - Starts a session when student begins exam
 * - Sends heartbeats every 10 seconds
 * - Logs violations in real-time
 * - Ends session on submit
 * 
 * Usage:
 * const { startSession, logViolation, endSession, isActive } = useConvexProctoring({
 *   examId: 'exam-123',
 *   studentId: 'user-456',
 *   studentName: 'John Doe',
 *   totalQuestions: 20,
 *   enabled: true,
 * });
 */

interface UseConvexProctoringOptions {
  examId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  totalQuestions: number;
  enabled?: boolean;
  heartbeatInterval?: number; // ms, default 10000
  onHeartbeatError?: (error: Error) => void;
}

export function useConvexProctoring(options: UseConvexProctoringOptions) {
  const {
    examId,
    studentId,
    studentName,
    studentEmail,
    totalQuestions,
    enabled = CONVEX_FEATURES.proctoring,
    heartbeatInterval = 10000,
    onHeartbeatError,
  } = options;

  // Mutations
  const startSessionMutation = useMutation(api.sessions.startSession);
  const heartbeatMutation = useMutation(api.sessions.heartbeat);
  const logViolationMutation = useMutation(api.sessions.logViolation);
  const endSessionMutation = useMutation(api.sessions.endSession);

  // Refs for tracking state
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

  // Current progress (updated by caller)
  const currentProgressRef = useRef({
    currentQuestion: 0,
    answeredCount: 0,
    timeRemaining: undefined as number | undefined,
  });

  // Start session
  const startSession = useCallback(async () => {
    if (!enabled) return null;

    try {
      const sessionId = await startSessionMutation({
        exam_id: examId,
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        total_questions: totalQuestions,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
      });

      sessionIdRef.current = sessionId;
      isActiveRef.current = true;

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

      return sessionId;
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
    totalQuestions,
    heartbeatInterval,
    startSessionMutation,
    heartbeatMutation,
    onHeartbeatError,
  ]);

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
    status: 'submitted' | 'expired' = 'submitted'
  ) => {
    if (!enabled) return null;

    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    isActiveRef.current = false;

    try {
      const result = await endSessionMutation({
        exam_id: examId,
        student_id: studentId,
        status,
      });
      sessionIdRef.current = null;
      return result;
    } catch (error) {
      console.error('Failed to end proctoring session:', error);
      return null;
    }
  }, [enabled, examId, studentId, endSessionMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  return {
    startSession,
    updateProgress,
    logViolation,
    endSession,
    isActive: isActiveRef.current,
    sessionId: sessionIdRef.current,
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
      total_violations: 0,
      avg_progress: 0,
    },
    alerts: alerts ?? [],
    isLoading: sessions === undefined,
    enabled,
  };
}
