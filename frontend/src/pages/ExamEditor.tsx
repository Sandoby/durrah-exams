import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Question {
    id?: string;
    type: string;
    question_text: string;
    options: string[];
    correct_answer?: string | string[];
    points: number;
    randomize_options: boolean;
}

interface ExamForm {
    title: string;
    description: string;
    required_fields: string[];
    questions: Question[];
    settings: {
        require_fullscreen: boolean;
        detect_tab_switch: boolean;
        disable_copy_paste: boolean;
        disable_right_click: boolean;
        max_violations: number;
        randomize_questions: boolean;
        show_results_immediately: boolean;
        time_limit_minutes: number | null;
        start_time: string | null;
        end_time: string | null;
    };
}

const defaultQuestion: Question = {
    type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
    randomize_options: true,
};

export default function ExamEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(!!id);

    const { register, control, handleSubmit, reset, watch, setValue, getValues } = useForm<ExamForm>({
        defaultValues: {
            title: '',
            description: '',
            required_fields: ['name', 'email'],
            questions: [defaultQuestion],
            settings: {
                require_fullscreen: true,
                detect_tab_switch: true,
                disable_copy_paste: true,
                disable_right_click: true,
                max_violations: 3,
                randomize_questions: true,
                show_results_immediately: false,
                time_limit_minutes: null,
                start_time: null,
                end_time: null,
            },
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'questions',
    });

    useEffect(() => {
        if (id && user) {
            fetchExam();
        }
    }, [id, user]);

    const fetchExam = async () => {
        try {
            // Fetch exam details
            const { data: exam, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .eq('tutor_id', user?.id)
                .single();

            if (examError) throw examError;

            // Fetch questions
            const { data: questions, error: questionsError } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', id)
                .order('created_at', { ascending: true });

            if (questionsError) throw questionsError;

            // Merge settings with defaults to ensure all fields exist
            const defaultSettings = {
                require_fullscreen: true,
                detect_tab_switch: true,
                disable_copy_paste: true,
                disable_right_click: true,
                max_violations: 3,
                randomize_questions: true,
                show_results_immediately: false,
                time_limit_minutes: null,
                start_time: null,
                end_time: null,
            };

            const mergedSettings = {
                ...defaultSettings,
                ...(exam.settings || {}),
            };

            reset({
                title: exam.title,
                description: exam.description,
                required_fields: exam.required_fields || ['name', 'email'],
                settings: mergedSettings,
                questions: questions || [defaultQuestion],
            });
        } catch (error: any) {
            console.error('Error fetching exam:', error);
            toast.error('Failed to load exam');
            navigate('/dashboard');
        } finally {
            setIsFetching(false);
        }
    };

    const onSubmit = async (data: ExamForm) => {
        if (!user) return;
        setIsLoading(true);
        try {
            let examId = id;

            // 1. Upsert Exam
            const examData = {
                title: data.title,
                description: data.description,
                settings: data.settings,
                required_fields: data.required_fields,
                tutor_id: user.id,
                is_active: true,
            };

            if (id) {
                const { error } = await supabase
                    .from('exams')
                    .update(examData)
                    .eq('id', id)
                    .eq('tutor_id', user.id);
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

            // 2. Handle Questions
            const { data: existingQuestions } = await supabase
                .from('questions')
                .select('id')
                .eq('exam_id', examId);

            const existingIds = existingQuestions?.map(q => q.id) || [];
            const formQuestionIds = data.questions.map(q => q.id).filter(Boolean);
            const idsToDelete = existingIds.filter(id => !formQuestionIds.includes(id));

            if (idsToDelete.length > 0) {
                await supabase
                    .from('questions')
                    .delete()
                    .in('id', idsToDelete);
            }

            const newQuestions = data.questions.filter(q => !q.id);
            const existingQuestionsToUpdate = data.questions.filter(q => q.id);

            if (newQuestions.length > 0) {
                const questionsToInsert = newQuestions.map(q => {
                    const base: any = {
                        exam_id: examId,
                        type: q.type,
                        question_text: q.question_text,
                        options: q.type === 'multiple_choice' || q.type === 'multiple_select' ? q.options : [],
                        points: q.points,
                        randomize_options: q.randomize_options
                    };
                    // only include correct_answer for auto-graded types
                    if (['multiple_choice','true_false','multiple_select','dropdown','numeric'].includes(q.type)) {
                        base.correct_answer = q.correct_answer || null;
                    }
                    return base;
                });

                const { error: insertError } = await supabase
                    .from('questions')
                    .insert(questionsToInsert);

                if (insertError) throw insertError;
            }

            if (existingQuestionsToUpdate.length > 0) {
                for (const q of existingQuestionsToUpdate) {
                    const updatePayload: any = {
                        type: q.type,
                        question_text: q.question_text,
                        options: q.type === 'multiple_choice' || q.type === 'multiple_select' ? q.options : [],
                        points: q.points,
                        randomize_options: q.randomize_options
                    };
                    if (['multiple_choice','true_false','multiple_select','dropdown','numeric'].includes(q.type)) {
                        updatePayload.correct_answer = q.correct_answer || null;
                    }

                    const { error: updateError } = await supabase
                        .from('questions')
                        .update(updatePayload)
                        .eq('id', q.id);

                    if (updateError) throw updateError;
                }
            }

            toast.success(id ? 'Exam updated successfully' : 'Exam created successfully');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Error saving exam:', error);
            toast.error(error.message || 'Failed to save exam');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {id ? 'Edit Exam' : 'Create New Exam'}
                            </h1>
                        </div>
                        <button
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-5 w-5 mr-2" />
                            )}
                            {isLoading ? 'Saving...' : 'Save Exam'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Basic Info */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                {...register('title')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <textarea
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                {...register('description')}
                            />
                        </div>
                    </div>
                </div>

                {/* Student Fields */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Student Information Fields</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select which fields students must provide before taking the exam</p>
                    <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={watch('required_fields')?.includes('name')}
                                onChange={(e) => {
                                    const current = watch('required_fields') || [];
                                    if (e.target.checked) {
                                        setValue('required_fields', [...current, 'name']);
                                    } else {
                                        setValue('required_fields', current.filter(f => f !== 'name'));
                                    }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Full Name</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={watch('required_fields')?.includes('email')}
                                onChange={(e) => {
                                    const current = watch('required_fields') || [];
                                    if (e.target.checked) {
                                        setValue('required_fields', [...current, 'email']);
                                    } else {
                                        setValue('required_fields', current.filter(f => f !== 'email'));
                                    }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Email Address</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={watch('required_fields')?.includes('student_id')}
                                onChange={(e) => {
                                    const current = watch('required_fields') || [];
                                    if (e.target.checked) {
                                        setValue('required_fields', [...current, 'student_id']);
                                    } else {
                                        setValue('required_fields', current.filter(f => f !== 'student_id'));
                                    }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Student ID</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={watch('required_fields')?.includes('phone')}
                                onChange={(e) => {
                                    const current = watch('required_fields') || [];
                                    if (e.target.checked) {
                                        setValue('required_fields', [...current, 'phone']);
                                    } else {
                                        setValue('required_fields', current.filter(f => f !== 'phone'));
                                    }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Phone Number</label>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Exam Settings</h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-8 sm:grid-cols-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                {...register('settings.require_fullscreen')}
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Require Fullscreen</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                {...register('settings.detect_tab_switch')}
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Detect Tab Switching</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                {...register('settings.disable_copy_paste')}
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Disable Copy/Paste</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                {...register('settings.show_results_immediately')}
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Show Results Immediately</label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Violations Allowed</label>
                            <input
                                type="number"
                                min="0"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                {...register('settings.max_violations', { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Limit (Minutes)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="No limit"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                {...register('settings.time_limit_minutes', { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                            <input
                                type="datetime-local"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                {...register('settings.start_time')}
                            />
                            <p className="mt-1 text-xs text-gray-500">When students can start taking the exam</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                            <input
                                type="datetime-local"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                {...register('settings.end_time')}
                            />
                            <p className="mt-1 text-xs text-gray-500">When the exam ends (no new submissions accepted)</p>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Questions</h3>
                        <button
                            type="button"
                            onClick={() => append(defaultQuestion)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                        </button>
                    </div>

                    {fields.map((field, index) => (
                        <div key={field.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative">
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>

                            <div className="space-y-4">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-1">
                                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <div className="col-span-11 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question Type</label>
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                    {...register(`questions.${index}.type`)}
                                                >
                                                    <option value="multiple_choice">Multiple Choice</option>
                                                                            <option value="multiple_select">Multiple Select (choose multiple)</option>
                                                                            <option value="dropdown">Dropdown (single choice)</option>
                                                                            <option value="numeric">Numeric (numeric answer)</option>
                                                    <option value="true_false">True/False</option>
                                                    <option value="short_answer">Short Answer</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                    {...register(`questions.${index}.points`, { valueAsNumber: true })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question Text</label>
                                            <textarea
                                                rows={2}
                                                required
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                {...register(`questions.${index}.question_text`)}
                                            />
                                        </div>

                                        {['multiple_choice','dropdown'].includes(watch(`questions.${index}.type`)) && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
                                                {(() => {
                                                    const values = getValues();
                                                    const opts = (values.questions?.[index]?.options ?? []) as string[];
                                                    const corr = (values.questions?.[index]?.correct_answer ?? '') as string;
                                                    return (
                                                        <>
                                                            {opts.map((optValue: string, optionIndex: number) => (
                                                                <div key={optionIndex} className="flex items-center space-x-2">
                                                                    <input
                                                                        type="radio"
                                                                        value={optValue}
                                                                        checked={corr === optValue && optValue !== ''}
                                                                        onChange={() => setValue(`questions.${index}.correct_answer`, optValue)}
                                                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        required
                                                                        placeholder={`Option ${optionIndex + 1}`}
                                                                        className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                                        {...register(`questions.${index}.options.${optionIndex}`)}
                                                                    />
                                                                    <button type="button" className="ml-2 text-sm text-red-600" onClick={() => {
                                                                        const v = getValues();
                                                                        const arr = (v.questions?.[index]?.options ?? []) as string[];
                                                                        const removed = arr.splice(optionIndex, 1);
                                                                        setValue(`questions.${index}.options`, arr);
                                                                        if ((v.questions?.[index]?.correct_answer ?? '') === removed[0]) setValue(`questions.${index}.correct_answer`, '');
                                                                    }}>Remove</button>
                                                                </div>
                                                            ))}
                                                            <div className="mt-2">
                                                                <button type="button" onClick={() => {
                                                                    const v = getValues();
                                                                    const arr = (v.questions?.[index]?.options ?? []) as string[];
                                                                    arr.push('');
                                                                    setValue(`questions.${index}.options`, arr);
                                                                }} className="inline-flex items-center px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50">Add Option</button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {watch(`questions.${index}.type`) === 'multiple_select' && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options (select one or more correct answers)</label>
                                                {(() => {
                                                    const v = getValues();
                                                    const opts = (v.questions?.[index]?.options ?? []) as string[];
                                                    const currentCorrect = (v.questions?.[index]?.correct_answer as string[]) ?? [];
                                                    return (
                                                        <>
                                                            {opts.map((optValue: string, optionIndex: number) => (
                                                                <div key={optionIndex} className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={optValue ? currentCorrect.includes(optValue) : false}
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                            const arr = [...currentCorrect];
                                                                            if (e.target.checked) {
                                                                                if (optValue && !arr.includes(optValue)) arr.push(optValue);
                                                                            } else {
                                                                                const idx = arr.indexOf(optValue);
                                                                                if (idx !== -1) arr.splice(idx, 1);
                                                                            }
                                                                            setValue(`questions.${index}.correct_answer`, arr);
                                                                        }}
                                                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        required
                                                                        placeholder={`Option ${optionIndex + 1}`}
                                                                        className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                                        {...register(`questions.${index}.options.${optionIndex}`)}
                                                                        onBlur={() => {
                                                                            const vals = getValues();
                                                                            const optsNow = (vals.questions?.[index]?.options ?? []) as string[];
                                                                            const newOpt = optsNow[optionIndex] ?? '';
                                                                            const corr = (vals.questions?.[index]?.correct_answer as string[]) ?? [];
                                                                            const updated = corr.map(a => (a === optValue ? newOpt : a)).filter(Boolean);
                                                                            setValue(`questions.${index}.correct_answer`, updated);
                                                                        }}
                                                                    />
                                                                    <button type="button" className="ml-2 text-sm text-red-600" onClick={() => {
                                                                        const vals2 = getValues();
                                                                        const arrOpts = (vals2.questions?.[index]?.options ?? []) as string[];
                                                                        const removed = arrOpts.splice(optionIndex, 1);
                                                                        setValue(`questions.${index}.options`, arrOpts);
                                                                        const corr = (vals2.questions?.[index]?.correct_answer as string[]) ?? [];
                                                                        const updatedCorr = corr.filter(c => !removed.includes(c));
                                                                        setValue(`questions.${index}.correct_answer`, updatedCorr);
                                                                    }}>Remove</button>
                                                                </div>
                                                            ))}
                                                            <div className="mt-2">
                                                                <button type="button" onClick={() => {
                                                                    const vals = getValues();
                                                                    const arr = (vals.questions?.[index]?.options ?? []) as string[];
                                                                    arr.push('');
                                                                    setValue(`questions.${index}.options`, arr);
                                                                }} className="inline-flex items-center px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50">Add Option</button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {watch(`questions.${index}.type`) === 'true_false' && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correct Answer</label>
                                                <div className="flex space-x-4">
                                                    <label className="inline-flex items-center">
                                                        <input
                                                            type="radio"
                                                            value="True"
                                                            className="form-radio text-indigo-600"
                                                            {...register(`questions.${index}.correct_answer`)}
                                                        />
                                                        <span className="ml-2">True</span>
                                                    </label>
                                                    <label className="inline-flex items-center">
                                                        <input
                                                            type="radio"
                                                            value="False"
                                                            className="form-radio text-indigo-600"
                                                            {...register(`questions.${index}.correct_answer`)}
                                                        />
                                                        <span className="ml-2">False</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {watch(`questions.${index}.type`) === 'numeric' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correct Numeric Answer (optional)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                    {...register(`questions.${index}.correct_answer`)}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Exact numeric match will be used for auto-grading.</p>
                                            </div>
                                        )}

                                        {watch(`questions.${index}.type`) === 'short_answer' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Short answer (students will type their response). This will not be auto-graded.</label>
                                                <p className="text-xs text-gray-500 mt-1">Tutors will review student responses manually; no correct answer required.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
