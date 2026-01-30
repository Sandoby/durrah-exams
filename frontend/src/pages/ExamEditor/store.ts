import { create } from 'zustand';
import type { ExamForm, Question } from './types';
import { defaultExam, defaultQuestion } from './types';

interface ExamEditorState {
    exam: ExamForm;
    selectedQuestionIndex: number | null;
    isLoading: boolean;
    isSaving: boolean;
    isPreviewMode: boolean;

    // Actions
    setPreviewMode: (preview: boolean) => void;
    setExam: (exam: ExamForm) => void;
    updateExam: (updates: Partial<ExamForm>) => void;
    updateSettings: (updates: Partial<ExamForm['settings']>) => void;

    // Question Actions
    setSelectedQuestion: (index: number | null) => void;
    addQuestion: (question?: Question) => void;
    updateQuestion: (index: number, updates: Partial<Question>) => void;
    removeQuestion: (index: number) => void;
    reorderQuestions: (startIndex: number, endIndex: number) => void;

    // Global State
    setLoading: (loading: boolean) => void;
    setSaving: (saving: boolean) => void;

    // Reset
    reset: () => void;
}

export const useExamStore = create<ExamEditorState>((set) => ({
    exam: defaultExam,
    selectedQuestionIndex: 0,
    isLoading: false,
    isSaving: false,
    isPreviewMode: false,

    setPreviewMode: (preview) => set({ isPreviewMode: preview }),
    setExam: (exam) => set({ exam }),

    updateExam: (updates) => set((state) => ({
        exam: { ...state.exam, ...updates }
    })),

    updateSettings: (updates) => set((state) => ({
        exam: {
            ...state.exam,
            settings: { ...state.exam.settings, ...updates }
        }
    })),

    setSelectedQuestion: (index) => set({ selectedQuestionIndex: index }),

    addQuestion: (question) => set((state) => {
        const newQuestion = question || { ...defaultQuestion };
        const newQuestions = [...state.exam.questions, newQuestion];
        return {
            exam: { ...state.exam, questions: newQuestions },
            selectedQuestionIndex: newQuestions.length - 1
        };
    }),

    updateQuestion: (index, updates) => set((state) => {
        const newQuestions = [...state.exam.questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        return {
            exam: { ...state.exam, questions: newQuestions }
        };
    }),

    removeQuestion: (index) => set((state) => {
        const newQuestions = state.exam.questions.filter((_, i) => i !== index);
        let nextSelected = state.selectedQuestionIndex;
        if (nextSelected === index) {
            nextSelected = newQuestions.length > 0 ? Math.max(0, index - 1) : null;
        } else if (nextSelected !== null && nextSelected > index) {
            nextSelected -= 1;
        }
        return {
            exam: { ...state.exam, questions: newQuestions },
            selectedQuestionIndex: nextSelected
        };
    }),

    reorderQuestions: (startIndex, endIndex) => set((state) => {
        const newQuestions = [...state.exam.questions];
        const [removed] = newQuestions.splice(startIndex, 1);
        newQuestions.splice(endIndex, 0, removed);

        // Update selected index if it was moved
        let nextSelected = state.selectedQuestionIndex;
        if (nextSelected === startIndex) {
            nextSelected = endIndex;
        } else if (nextSelected !== null) {
            if (nextSelected > startIndex && nextSelected <= endIndex) {
                nextSelected -= 1;
            } else if (nextSelected < startIndex && nextSelected >= endIndex) {
                nextSelected += 1;
            }
        }

        return {
            exam: { ...state.exam, questions: newQuestions },
            selectedQuestionIndex: nextSelected
        };
    }),

    setLoading: (loading) => set({ isLoading: loading }),
    setSaving: (saving) => set({ isSaving: saving }),

    reset: () => set({
        exam: defaultExam,
        selectedQuestionIndex: 0,
        isLoading: false,
        isSaving: false
    })
}));
