import { useExamStore } from '../store';
import { EditorNavbar } from '../components/EditorNavbar';

export function PreviewMode() {
    const { exam } = useExamStore();

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
            <EditorNavbar />

            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto py-12 px-6">
                    <header className="mb-12 text-center">
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">{exam.title || 'Untitled Exam'}</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{exam.description || 'No description provided.'}</p>
                    </header>

                    <div className="space-y-8">
                        {exam.questions.map((q, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div
                                            className="text-lg font-bold text-gray-800 dark:text-gray-200 prose prose-slate dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: q.question_text }}
                                        />
                                        <span className="flex-shrink-0 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-full text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800">
                                            {q.points} PTS
                                        </span>
                                    </div>

                                    {q.media_url && (
                                        <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                                            <img src={q.media_url} alt="Question attachment" className="w-full h-auto max-h-[400px] object-contain bg-gray-50 dark:bg-gray-800" />
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {['multiple_choice', 'multiple_select', 'dropdown'].includes(q.type) && q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer group hover:bg-teal-50/50 dark:hover:bg-teal-900/10">
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-teal-400 dark:group-hover:border-teal-600 transition-colors" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{opt}</span>
                                            </div>
                                        ))}
                                        {q.type === 'text_entry' && (
                                            <textarea
                                                placeholder="Type your answer here..."
                                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-medium outline-none h-32"
                                            />
                                        )}
                                        {q.type === 'true_false' && (
                                            <div className="flex gap-4">
                                                {['True', 'False'].map((val) => (
                                                    <div key={val} className="flex-1 flex items-center justify-center p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors cursor-pointer font-bold text-gray-700 dark:text-gray-300">
                                                        {val}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <footer className="mt-12 text-center pb-24">
                        <button className="px-12 py-4 bg-teal-600 text-white rounded-2xl font-black shadow-xl shadow-teal-200 dark:shadow-none hover:bg-teal-700 hover:scale-105 transition-all">
                            Submit Exam
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    );
}
