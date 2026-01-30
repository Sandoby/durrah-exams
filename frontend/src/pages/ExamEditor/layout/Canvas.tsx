import { useExamStore } from '../store';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImageUploader } from '../../../components/ImageUploader';
import { Trash2, Plus, CheckCircle2 } from 'lucide-react';

export function Canvas() {
    const { exam, selectedQuestionIndex, updateQuestion } = useExamStore();

    if (selectedQuestionIndex === null) {
        return (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
                <div className="max-w-xs space-y-4">
                    <p className="text-gray-400 font-medium">Select a question to start editing or add a new one.</p>
                </div>
            </div>
        );
    }

    const question = exam.questions[selectedQuestionIndex];

    const updateOption = (optionIndex: number, value: string) => {
        const newOptions = [...question.options];
        newOptions[optionIndex] = value;
        updateQuestion(selectedQuestionIndex, { options: newOptions });
    };

    const addOption = () => {
        updateQuestion(selectedQuestionIndex, { options: [...question.options, ''] });
    };

    const removeOption = (optionIndex: number) => {
        const newOptions = question.options.filter((_, i) => i !== optionIndex);
        updateQuestion(selectedQuestionIndex, { options: newOptions });
    };

    const toggleCorrectAnswer = (optionValue: string) => {
        if (question.type === 'multiple_select') {
            const current = (question.correct_answer as string[]) || [];
            const next = current.includes(optionValue)
                ? current.filter(v => v !== optionValue)
                : [...current, optionValue];
            updateQuestion(selectedQuestionIndex, { correct_answer: next });
        } else {
            updateQuestion(selectedQuestionIndex, { correct_answer: optionValue });
        }
    };

    return (
        <div className="p-8 pb-32 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Question Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-gray-900 bg-gray-100 dark:bg-gray-800 px-4 py-1 rounded-2xl border border-gray-200 dark:border-gray-700">
                            Question {selectedQuestionIndex + 1}
                        </span>
                    </h2>
                </div>

                <RichTextEditor
                    value={question.question_text}
                    onChange={(val) => updateQuestion(selectedQuestionIndex, { question_text: val })}
                />
            </div>

            {/* Media Upload */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 ml-1">Attachment</h3>
                <div className="max-w-md bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] p-4 transition-all hover:border-gray-300 dark:hover:border-gray-700">
                    <ImageUploader
                        value={question.media_url || ''}
                        onChange={(url) => updateQuestion(selectedQuestionIndex, { media_url: url, media_type: 'image' })}
                        userId="editor" // Placeholder
                        quality={0.4} // Significant compression (approx 75% reduction)
                        maxDimension={1200}
                    />
                </div>
            </div>

            {/* Options List */}
            {['multiple_choice', 'multiple_select', 'dropdown'].includes(question.type) && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between ml-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Options</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Mark the correct answer</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {question.options.map((option, idx) => (
                            <div key={idx} className="group relative flex items-center gap-4">
                                <button
                                    onClick={() => toggleCorrectAnswer(option)}
                                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${(question.type === 'multiple_select' ? (question.correct_answer as string[])?.includes(option) : question.correct_answer === option)
                                        ? 'bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-200'
                                        : 'bg-white border-gray-200 text-transparent hover:border-gray-400'
                                        }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>

                                <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-2xl flex items-center shadow-sm group-hover:shadow-md transition-shadow">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${idx + 1}`}
                                        className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
                                    />
                                    {question.options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(idx)}
                                            className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addOption}
                        className="flex items-center gap-2 text-gray-600 font-bold text-xs hover:text-black transition-colors ml-12"
                    >
                        <Plus className="w-4 h-4" />
                        Add another option
                    </button>
                </div>
            )}
        </div>
    );
}
