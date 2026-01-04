import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ExamProgress {
  id?: string;
  exam_id: string;
  user_id: string;
  student_email: string;
  student_name?: string;
  answers: Record<string, any>;
  flagged_questions: string[];
  current_question_index: number;
  time_remaining_seconds: number | null;
  started_at: string | null;
  violations: Array<{ type: string; timestamp: string }>;
  scratchpad_content: string;
  confidence_levels: Record<string, string>;
  status: 'in_progress' | 'submitted' | 'expired' | 'auto_submitted';
}

interface UseExamProgressOptions {
  examId: string;
  enabled?: boolean;
  autoSaveInterval?: number; // ms, default 5000
}

/**
 * useExamProgress
 * 
 * Hook for managing exam progress with Supabase for authenticated students.
 * - Loads existing progress on mount
 * - Auto-saves progress periodically
 * - Syncs state to database
 */
export function useExamProgress(options: UseExamProgressOptions) {
  const { examId, enabled = true, autoSaveInterval = 5000 } = options;
  const { user } = useAuth();
  
  const [progress, setProgress] = useState<ExamProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingProgress, setHasExistingProgress] = useState(false);
  
  // Ref to track pending changes
  const pendingChangesRef = useRef<Partial<ExamProgress>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Load existing progress
  useEffect(() => {
    if (!enabled || !user?.id || !examId) {
      setIsLoading(false);
      return;
    }
    
    const loadProgress = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('exam_progress')
          .select('*')
          .eq('exam_id', examId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine
          throw fetchError;
        }
        
        if (data) {
          setProgress(data as ExamProgress);
          setHasExistingProgress(true);
        } else {
          // Initialize new progress
          setProgress({
            exam_id: examId,
            user_id: user.id,
            student_email: user.email || '',
            student_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            answers: {},
            flagged_questions: [],
            current_question_index: 0,
            time_remaining_seconds: null,
            started_at: null,
            violations: [],
            scratchpad_content: '',
            confidence_levels: {},
            status: 'in_progress',
          });
          setHasExistingProgress(false);
        }
      } catch (err: any) {
        console.error('Error loading exam progress:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProgress();
  }, [enabled, user?.id, examId]);
  
  // Save progress to database
  const saveProgress = useCallback(async (updates: Partial<ExamProgress>) => {
    if (!enabled || !user?.id || !examId) return;
    
    try {
      setIsSaving(true);
      
      const dataToSave = {
        exam_id: examId,
        user_id: user.id,
        student_email: user.email || '',
        student_name: user.user_metadata?.full_name || '',
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error: saveError } = await supabase
        .from('exam_progress')
        .upsert(dataToSave, {
          onConflict: 'exam_id,user_id',
        })
        .select()
        .single();
      
      if (saveError) throw saveError;
      
      setProgress(data as ExamProgress);
      setHasExistingProgress(true);
      pendingChangesRef.current = {};
      
      return data;
    } catch (err: any) {
      console.error('Error saving exam progress:', err);
      setError(err.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [enabled, user?.id, user?.email, user?.user_metadata?.full_name, examId]);
  
  // Debounced save
  const debouncedSave = useCallback((updates: Partial<ExamProgress>) => {
    // Merge with pending changes
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      ...updates,
    };
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      if (Object.keys(pendingChangesRef.current).length > 0) {
        saveProgress(pendingChangesRef.current);
      }
    }, autoSaveInterval);
  }, [saveProgress, autoSaveInterval]);
  
  // Update specific fields
  const updateAnswers = useCallback((answers: Record<string, any>) => {
    setProgress(prev => prev ? { ...prev, answers } : null);
    debouncedSave({ answers });
  }, [debouncedSave]);
  
  const updateFlaggedQuestions = useCallback((flagged: string[]) => {
    setProgress(prev => prev ? { ...prev, flagged_questions: flagged } : null);
    debouncedSave({ flagged_questions: flagged });
  }, [debouncedSave]);
  
  const updateCurrentQuestion = useCallback((index: number) => {
    setProgress(prev => prev ? { ...prev, current_question_index: index } : null);
    debouncedSave({ current_question_index: index });
  }, [debouncedSave]);
  
  const updateTimeRemaining = useCallback((seconds: number | null) => {
    setProgress(prev => prev ? { ...prev, time_remaining_seconds: seconds } : null);
    debouncedSave({ time_remaining_seconds: seconds });
  }, [debouncedSave]);
  
  const updateViolations = useCallback((violations: Array<{ type: string; timestamp: string }>) => {
    setProgress(prev => prev ? { ...prev, violations } : null);
    debouncedSave({ violations });
  }, [debouncedSave]);
  
  const updateScratchpad = useCallback((content: string) => {
    setProgress(prev => prev ? { ...prev, scratchpad_content: content } : null);
    debouncedSave({ scratchpad_content: content });
  }, [debouncedSave]);
  
  const updateConfidenceLevels = useCallback((levels: Record<string, string>) => {
    setProgress(prev => prev ? { ...prev, confidence_levels: levels } : null);
    debouncedSave({ confidence_levels: levels });
  }, [debouncedSave]);
  
  // Start exam (set started_at)
  const startExam = useCallback(async (timeLimitSeconds?: number) => {
    const startedAt = new Date().toISOString();
    setProgress(prev => prev ? { 
      ...prev, 
      started_at: startedAt,
      time_remaining_seconds: timeLimitSeconds ?? prev.time_remaining_seconds,
      status: 'in_progress'
    } : null);
    
    // Immediate save for start
    return saveProgress({
      started_at: startedAt,
      time_remaining_seconds: timeLimitSeconds,
      status: 'in_progress',
    });
  }, [saveProgress]);
  
  // Mark as submitted
  const markSubmitted = useCallback(async () => {
    setProgress(prev => prev ? { ...prev, status: 'submitted' } : null);
    return saveProgress({ status: 'submitted' });
  }, [saveProgress]);
  
  // Force save (for before submit)
  const forceSave = useCallback(async () => {
    // Clear any pending timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Save all current progress
    if (progress) {
      return saveProgress({
        answers: progress.answers,
        flagged_questions: progress.flagged_questions,
        current_question_index: progress.current_question_index,
        time_remaining_seconds: progress.time_remaining_seconds,
        violations: progress.violations,
        scratchpad_content: progress.scratchpad_content,
        confidence_levels: progress.confidence_levels,
      });
    }
    return null;
  }, [progress, saveProgress]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    progress,
    isLoading,
    isSaving,
    error,
    hasExistingProgress,
    isAuthenticated: !!user,
    studentInfo: user ? {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
    } : null,
    // Update functions
    updateAnswers,
    updateFlaggedQuestions,
    updateCurrentQuestion,
    updateTimeRemaining,
    updateViolations,
    updateScratchpad,
    updateConfidenceLevels,
    startExam,
    markSubmitted,
    forceSave,
    saveProgress,
  };
}
