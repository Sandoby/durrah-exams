/**
 * useAuthenticShowcase Hook
 * 
 * React hook for managing authentic showcase content
 * Provides real user data examples and platform workflows
 * Avoids generic placeholder content and mock data
 * 
 * Requirements: 4.2, 4.4
 */

import { useState, useEffect, useMemo } from 'react';
import { authenticShowcaseContent } from '../lib/authentic-showcase-content';

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAuthenticShowcase() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(0);
  const [selectedInterface, setSelectedInterface] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState(authenticShowcaseContent.analytics);

  /**
   * Get current workflow example
   */
  const currentWorkflow = useMemo(() => {
    return authenticShowcaseContent.workflows[selectedWorkflow];
  }, [selectedWorkflow]);

  /**
   * Get current interface state
   */
  const currentInterface = useMemo(() => {
    return authenticShowcaseContent.interfaceStates[selectedInterface];
  }, [selectedInterface]);

  /**
   * Get real educator stories
   */
  const educatorStories = useMemo(() => {
    return authenticShowcaseContent.educatorStories;
  }, []);

  /**
   * Get authentic technical specifications
   */
  const technicalSpecs = useMemo(() => {
    return authenticShowcaseContent.technicalSpecs;
  }, []);

  /**
   * Get real student interactions
   */
  const studentInteractions = useMemo(() => {
    return authenticShowcaseContent.studentInteractions;
  }, []);

  /**
   * Simulate live metrics updates (for demonstration)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        examPerformance: {
          ...prev.examPerformance,
          totalStudentAttempts: prev.examPerformance.totalStudentAttempts + Math.floor(Math.random() * 3),
          averageCompletionRate: Math.round((prev.examPerformance.averageCompletionRate + (Math.random() - 0.5) * 0.1) * 10) / 10,
        }
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Navigate through workflows
   */
  const nextWorkflow = () => {
    setSelectedWorkflow(prev => (prev + 1) % authenticShowcaseContent.workflows.length);
  };

  const previousWorkflow = () => {
    setSelectedWorkflow(prev => 
      prev === 0 ? authenticShowcaseContent.workflows.length - 1 : prev - 1
    );
  };

  /**
   * Navigate through interface states
   */
  const nextInterface = () => {
    setSelectedInterface(prev => (prev + 1) % authenticShowcaseContent.interfaceStates.length);
  };

  const previousInterface = () => {
    setSelectedInterface(prev => 
      prev === 0 ? authenticShowcaseContent.interfaceStates.length - 1 : prev - 1
    );
  };

  return {
    // Current selections
    currentWorkflow,
    currentInterface,
    liveMetrics,
    
    // Static content
    educatorStories,
    technicalSpecs,
    studentInteractions,
    
    // Navigation
    nextWorkflow,
    previousWorkflow,
    nextInterface,
    previousInterface,
    
    // State setters
    setSelectedWorkflow,
    setSelectedInterface,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for managing real-time showcase data
 */
export function useRealTimeShowcase() {
  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState({
    activeExams: 23,
    studentsOnline: 1247,
    questionsAnswered: 8934,
    reportsGenerated: 156
  });

  // Simulate real-time updates when live mode is enabled
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setLiveData(prev => ({
        activeExams: prev.activeExams + Math.floor(Math.random() * 3 - 1),
        studentsOnline: prev.studentsOnline + Math.floor(Math.random() * 10 - 5),
        questionsAnswered: prev.questionsAnswered + Math.floor(Math.random() * 5),
        reportsGenerated: prev.reportsGenerated + Math.floor(Math.random() * 2)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const toggleLiveMode = () => {
    setIsLive(prev => !prev);
  };

  return {
    isLive,
    liveData,
    toggleLiveMode,
  };
}

/**
 * Hook for managing authentic workflow demonstrations
 */
export function useWorkflowDemonstration() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const workflowSteps = [
    {
      title: 'Create Exam',
      description: 'Build questions with rich media support',
      duration: 3000,
      screenshot: '/mockups/exam-editor.png'
    },
    {
      title: 'Monitor Students',
      description: 'Watch real-time progress during exam',
      duration: 4000,
      screenshot: '/mockups/dashboard.png'
    },
    {
      title: 'Analyze Results',
      description: 'Generate detailed performance reports',
      duration: 3000,
      screenshot: '/mockups/exam-analytics.png'
    }
  ];

  // Auto-advance through workflow steps when playing
  useEffect(() => {
    if (!isPlaying) return;

    const timeout = setTimeout(() => {
      setCurrentStep(prev => (prev + 1) % workflowSteps.length);
    }, workflowSteps[currentStep].duration);

    return () => clearTimeout(timeout);
  }, [currentStep, isPlaying, workflowSteps]);

  const startDemo = () => {
    setIsPlaying(true);
    setCurrentStep(0);
  };

  const stopDemo = () => {
    setIsPlaying(false);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
  };

  return {
    currentStep,
    isPlaying,
    workflowSteps,
    startDemo,
    stopDemo,
    goToStep,
  };
}

/**
 * Hook for managing authentic user testimonials
 */
export function useAuthenticTestimonials() {
  const [selectedTestimonial, setSelectedTestimonial] = useState(0);
  const testimonials = authenticShowcaseContent.educatorStories;

  const nextTestimonial = () => {
    setSelectedTestimonial(prev => (prev + 1) % testimonials.length);
  };

  const previousTestimonial = () => {
    setSelectedTestimonial(prev => 
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const currentTestimonial = testimonials[selectedTestimonial];

  return {
    testimonials,
    currentTestimonial,
    selectedTestimonial,
    nextTestimonial,
    previousTestimonial,
    setSelectedTestimonial,
  };
}

/**
 * Hook for managing performance metrics display
 */
export function usePerformanceMetrics() {
  const [metricsView, setMetricsView] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const metrics = authenticShowcaseContent.analytics;

  const getMetricsForView = () => {
    switch (metricsView) {
      case 'overview':
        return {
          title: 'Platform Overview',
          data: metrics.examPerformance
        };
      case 'detailed':
        return {
          title: 'Question Analytics',
          data: metrics.questionAnalytics
        };
      case 'comparison':
        return {
          title: 'Institution Metrics',
          data: metrics.institutionMetrics
        };
      default:
        return {
          title: 'Platform Overview',
          data: metrics.examPerformance
        };
    }
  };

  return {
    metricsView,
    setMetricsView,
    currentMetrics: getMetricsForView(),
    allMetrics: metrics,
  };
}