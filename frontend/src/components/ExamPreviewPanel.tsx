import { Eye, Clock, AlertTriangle } from 'lucide-react';
import Latex from 'react-latex-next';

interface Question {
    id?: string;
    type: string;
    question_text: string;
    options: string[];
    points: number;
}

interface ExamForm {
    title: string;
    description: string;
    questions: Question[];
    settings: any;
}

export function ExamPreviewPanel({ data }: { data: ExamForm }) {
    return (
        <div className="hidden xl:block w-full">
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Live Preview</h3>
                    </div>
                    <p className="text-xs text-gray-500">This is how students will see the exam.</p>
                </div>

                <div className="p-4 space-y-6">
                    {/* Header Preview */}
                    <div className="space-y-2">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">
                            {data.title || 'Untitled Exam'}
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                            {data.description || 'No description provided.'}
                        </p>

                        <div className="flex gap-2 text-xs">
                            {data.settings.time_limit_minutes && (
                                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                    <Clock className="w-3 h-3" />
                                    <span>{data.settings.time_limit_minutes}m</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{data.settings.max_violations} violations</span>
                            </div>
                        </div>
                    </div>

                    {/* Questions Preview */}
                    <div className="space-y-4">
                        {data.questions.map((q, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Q{i + 1}</span>
                                    <span className="text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{q.points}pts</span>
                                </div>

                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 break-words">
                                    <Latex>{q.question_text || 'Enter question text...'}</Latex>
                                </p>

                                <div className="space-y-2">
                                    {['multiple_choice', 'multiple_select', 'true_false'].includes(q.type) && (
                                        <div className="space-y-1.5">
                                            {q.type === 'true_false' ? (
                                                ['True', 'False'].map((opt) => (
                                                    <div key={opt} className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-70">
                                                        <div className="w-3 h-3 rounded-full border border-gray-300"></div>
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">{opt}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                q.options?.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-70">
                                                        <div className={`w-3 h-3 ${q.type === 'multiple_select' ? 'rounded' : 'rounded-full'} border border-gray-300`}></div>
                                                        <span className="text-xs text-gray-600 dark:text-gray-400"><Latex>{opt || `Option ${optIndex + 1}`}</Latex></span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {q.type === 'short_answer' && (
                                        <div className="h-8 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 w-full"></div>
                                    )}

                                    {q.type === 'numeric' && (
                                        <div className="h-8 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 w-32"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
