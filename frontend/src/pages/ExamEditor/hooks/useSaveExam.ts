import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useExamStore } from '../store';

import toast from 'react-hot-toast';

export function useSaveExam() {
    const navigate = useNavigate();
    const { exam, setSaving } = useExamStore();
    const [isSaving, setIsSavingInternal] = useState(false);

    const saveExam = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('You must be logged in to save exams.');
            return;
        }

        // Basic Validation
        if (!exam.title.trim()) {
            toast.error('Please enter an exam title.');
            return;
        }

        setIsSavingInternal(true);
        setSaving(true);

        try {
            let examId = exam.id;

            // 1. Upsert Exam
            const examData = {
                title: exam.title,
                description: exam.description,
                settings: exam.settings,
                required_fields: exam.required_fields,
                tutor_id: user.id,
                is_active: true,
            };

            if (examId) {
                const { error } = await supabase
                    .from('exams')
                    .update(examData)
                    .eq('id', examId);
                if (error) throw error;
            } else {
                const { data: newExam, error } = await supabase
                    .from('exams')
                    .insert(examData)
                    .select()
                    .single();
                if (error) throw error;
                examId = newExam.id;
            }

            if (!examId) throw new Error('Failed to get exam ID');

            // 2. Handle Questions (Delete missing, Update existing, Insert new)
            const { data: existingDbQuestions } = await supabase
                .from('questions')
                .select('id')
                .eq('exam_id', examId);

            const existingDbIds = existingDbQuestions?.map(q => q.id) || [];
            const formQuestionIds = exam.questions.map(q => q.id).filter(Boolean) as string[];
            const idsToDelete = existingDbIds.filter(id => !formQuestionIds.includes(id));

            if (idsToDelete.length > 0) {
                await supabase.from('questions').delete().in('id', idsToDelete);
            }

            // Batch insert/update
            for (const q of exam.questions) {
                const questionData = {
                    exam_id: examId,
                    type: q.type,
                    question_text: q.question_text,
                    options: q.options,
                    points: q.points,
                    randomize_options: q.randomize_options,
                    media_url: q.media_url,
                    media_type: q.media_type,
                    correct_answer: q.correct_answer
                };

                if (q.id) {
                    await supabase.from('questions').update(questionData).eq('id', q.id);
                } else {
                    await supabase.from('questions').insert(questionData).select().single();
                }
            }

            toast.success('Exam saved successfully!');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save exam.');
        } finally {
            setIsSavingInternal(false);
            setSaving(false);
        }
    };

    return { saveExam, isSaving };
}
