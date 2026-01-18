import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Loader2, Sparkles, FileText, CheckCircle2, AlertCircle, Trash2, Plus } from 'lucide-react';
import { readFileText } from '../lib/extractors';
import { extractQuestionsWithAI } from '../lib/ai-utils';

interface AIQuestionGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddQuestions: (questions: any[]) => void;
    bankName: string;
}

export const AIQuestionGeneratorModal: React.FC<AIQuestionGeneratorModalProps> = ({
    isOpen,
    onClose,
    onAddQuestions,
    bankName
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) {
            setError(t('questionBank.ai.noFile', 'Please select a file first'));
            return;
        }

        setIsProcessing(true);
        setStep('processing');
        setError(null);

        try {
            // Step 1: Extract text from file
            const text = await readFileText(file);
            if (!text || text.trim().length < 50) {
                throw new Error(t('questionBank.ai.tooShort', 'The document doesn\'t contain enough text to generate questions.'));
            }

            // Step 2: Extract questions using AI
            const questions = await extractQuestionsWithAI(text);

            if (!questions || questions.length === 0) {
                throw new Error(t('questionBank.ai.noQuestionsFound', 'No questions could be extracted from this document.'));
            }

            setGeneratedQuestions(questions);
            setStep('preview');
        } catch (err: any) {
            console.error('AI Processing Error:', err);
            setError(err.message || t('questionBank.ai.error', 'Failed to process document. Please try again.'));
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    };


    const handleFinalize = () => {
        onAddQuestions(generatedQuestions);
        onClose();
        // Reset state
        setStep('upload');
        setFile(null);
        setGeneratedQuestions([]);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                                {t('questionBank.ai.title', 'AI Question Generator')}
                            </h2>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {t('questionBank.ai.subtitle', 'Generating for library:')} <span className="text-indigo-600 font-bold">{bankName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-full max-w-lg">
                                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-[2rem] cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-bold underline text-indigo-600">{t('questionBank.ai.clickToUpload', 'Click to upload')}</span> {t('questionBank.ai.dragDrop', 'or drag and drop')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                                            PDF, Word (DOCX), or Text (TXT)
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange} />
                                </label>

                                {file && (
                                    <div className="mt-6 flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                            <FileText className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-sm font-bold">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleProcess}
                                    disabled={!file || isProcessing}
                                    className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    {t('questionBank.ai.extractButton', 'Start Question Extraction')}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="relative mb-8">
                                <div className="w-24 h-24 border-4 border-indigo-100 dark:border-indigo-900 rounded-full animate-spin border-t-indigo-600" />
                                <Sparkles className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                                {t('questionBank.ai.reading', 'Working our AI Magic...')}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs font-medium">
                                {t('questionBank.ai.processingInfo', 'We are reading your document and crafting the perfect exam questions for you.')}
                            </p>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    {t('questionBank.ai.success', 'Extraction Complete!')}
                                </h3>
                                <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                                    {generatedQuestions.length} {t('questionBank.questions', 'Questions')}
                                </span>
                            </div>

                            <div className="grid gap-4">
                                {generatedQuestions.map((q, idx) => (
                                    <div key={idx} className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-[1.5rem] hover:border-indigo-500/30 transition-all shadow-sm">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                                        {q.type}
                                                    </span>
                                                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                                        {q.difficulty}
                                                    </span>
                                                </div>
                                                <p className="text-gray-900 dark:text-white font-bold text-lg mb-4 leading-tight">{q.question_text}</p>

                                                {q.options && q.options.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {q.options.map((opt: string, i: number) => (
                                                            <div key={i} className={`p-3 rounded-xl border text-sm font-medium ${(Array.isArray(q.correct_answer) ? q.correct_answer.includes(opt) : q.correct_answer === opt)
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                                                                }`}>
                                                                <span className="inline-block w-5 h-5 rounded-md bg-white dark:bg-gray-800 border border-inherit text-center text-[10px] leading-5 mr-2 font-bold uppercase">
                                                                    {String.fromCharCode(65 + i)}
                                                                </span>
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleRemoveQuestion(idx)}
                                                    className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={() => {
                            if (step === 'preview') setStep('upload');
                            else onClose();
                        }}
                        className="px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        {step === 'preview' ? t('common.back', 'Back') : t('common.cancel', 'Cancel')}
                    </button>

                    {step === 'preview' && (
                        <button
                            onClick={handleFinalize}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            {t('questionBank.ai.addToBank', 'Add to My Bank')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
