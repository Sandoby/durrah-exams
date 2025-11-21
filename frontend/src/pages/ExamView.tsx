// helper: get user session or attempt background anonymous sign-in (non-blocking)
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { ViolationModal } from '../components/ViolationModal';

interface Question {
  id?: string;
  type: string;
  question_text: string;
  options: string[];
  correct_answer: string | string[];
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
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMessage, setViolationMessage] = useState({ title: '', message: '' });

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<ExamForm>({
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

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  // ------------------- FETCH EXAM -------------------
  useEffect(() => {
    if (id) fetchExam();
  }, [id]);

  const fetchExam = async () => {
    try {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();
      if (examError) throw examError;

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', id)
        .order('created_at', { ascending: true });
      if (questionsError) throw questionsError;

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

      const mergedSettings = { ...defaultSettings, ...(exam.settings || {}) };

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

  // ------------------- ANONYMOUS LOGIN FOR iOS -------------------
  useEffect(() => {
    const ensureAnonymous = async () => {


const session = await supabase.auth.getSession();
      if (!session.data.session) {
        // login anonymously for Safari/iOS
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'anonymous@durrahsystem.tech',
          password: 'dummy-password-for-anonymous',
        });
        if (error) console.warn('Anonymous login failed:', error.message);
      }
    };
    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome/.test(ua))) {
      ensureAnonymous();
    }
  }, []);

  // ------------------- SUBMIT EXAM -------------------
  const onSubmit = async (data: ExamForm) => {
    setIsLoading(true);
    try {
      let examId = id;

      const examData = {
        title: data.title,
        description: data.description,
        settings: data.settings,
        required_fields: data.required_fields,
        tutor_id: user?.id ?? null,
        is_active: true,
      };

      if (id) {
        const { error } = await supabase.from('exams').update(examData).eq('id', id);
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

      // handle questions insert/update
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('exam_id', examId);

      const existingIds = existingQuestions?.map(q => q.id) || [];
      const formQuestionIds = data.questions.map(q => q.id).filter(Boolean);
      const idsToDelete = existingIds.filter(id => !formQuestionIds.includes(id));

      if (idsToDelete.length > 0) {
        await supabase.from('questions').delete().in('id', idsToDelete);
      }

      const newQuestions = data.questions.filter(q => !q.id);
      const existingQuestionsToUpdate = data.questions.filter(q => q.id);

      if (newQuestions.length > 0) {
        const questionsToInsert = newQuestions.map(q => ({
          exam_id: examId,
          type: q.type,
          question_text: q.question_text,
          options: q.type === 'multiple_choice' || q.type === 'multiple_select' ? q.options : [],
          correct_answer: q.correct_answer,
          points: q.points,
          randomize_options: q.randomize_options,
        }));
        const { error: insertError } = await supabase.from('questions').insert(questionsToInsert);
        if (insertError) throw insertError;
      }

      if (existingQuestionsToUpdate.length > 0) {
        for (const q of existingQuestionsToUpdate) {
          const { error: updateError } = await supabase
            .from('questions')
            .update({
              type: q.type,
              question_text: q.question_text,
              options: q.type === 'multiple_choice' || q.type === 'multiple_select' ? q.options : [],
              correct_answer: q.correct_answer,
              points: q.points,
              randomize_options: q.randomize_options,
            })
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

  // ------------------- RENDER QUESTIONS -------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{id ? 'Edit Exam' : 'Create New Exam'}</h1>
          </div>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            {isLoading ? 'Saving...' : 'Save Exam'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {fields.map((q, index) => (
          <div key={q.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative">
            <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
              <Trash2 className="h-5 w-5" />
            </button>

            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-1">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-800 font-bold">{index + 1}</span>
                </div>
                <div className="col-span-11 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question Type</label>
                      <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border" {...register(`questions.${index}.type`)}>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="multiple_select">Multiple Select</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
                      <input type="number" min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border" {...register(`questions.${index}.points`, { valueAsNumber: true })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question Text</label>
                    <textarea rows={2} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border" {...register(`questions.${index}.question_text`)} />
                  </div>

                  {/* MULTIPLE CHOICE */}
                  {watch(`questions.${index}.type`) === 'multiple_choice' && (
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input type="radio" value={watch(`questions.${index}.options.${optIndex}`)}
                            checked={watch(`questions.${index}.correct_answer`) === watch(`questions.${index}.options.${optIndex}`) && watch(`questions.${index}.options.${optIndex}`) !== ''}
                            onChange={() => setValue(`questions.${index}.correct_answer`, watch(`questions.${index}.options.${optIndex}`))}


className="h-4 w-4 text-indigo-600 border-gray-300"
                          />
                          <input type="text" required placeholder={`Option ${optIndex + 1}`} className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border" {...register(`questions.${index}.options.${optIndex}`)} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TRUE/FALSE */}
                  {watch(`questions.${index}.type`) === 'true_false' && (
                    <div className="space-x-4">
                      {['True', 'False'].map(val => (
                        <label key={val} className="inline-flex items-center space-x-2">
                          <input type="radio" value={val} className="form-radio text-indigo-600" {...register(`questions.${index}.correct_answer`)} />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* SHORT ANSWER */}
                  {watch(`questions.${index}.type`) === 'short_answer' && (
                    <input type="text" required className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border" {...register(`questions.${index}.correct_answer`)} />
                  )}

                  {/* MULTIPLE SELECT */}
                  {watch(`questions.${index}.type`) === 'multiple_select' && watch(`questions.${index}.options`)?.map((opt: string, optIndex: number) => (
                    <label key={opt} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer mb-2">
                      <input type="checkbox"
                        checked={Array.isArray(answers[q.id!]) ? (answers[q.id!] as string[]).includes(opt) : false}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const current: string[] = Array.isArray(answers[q.id!]) ? [...answers[q.id!]] : [];
                          if (e.target.checked) current.push(opt);
                          else {
                            const idx = current.indexOf(opt);
                            if (idx !== -1) current.splice(idx, 1);
                          }
                          setAnswers({ ...answers, [q.id!]: current });
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

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
