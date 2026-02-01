import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, HelpCircle, BookOpen, Volume2, RefreshCw,
    CheckCircle2, ArrowRight, ArrowLeft, Info, AlertCircle, X
} from 'lucide-react';

type SQ3RPhase = 'survey' | 'question' | 'read' | 'recite' | 'review';

interface Section {
    id: string;
    title: string;
    question: string;
    answer: string;
}

const PHASES: { id: SQ3RPhase; label: string; icon: any; description: string }[] = [
    { id: 'survey', label: 'Survey', icon: Eye, description: 'Skim headers and graphics to get the big picture.' },
    { id: 'question', label: 'Question', icon: HelpCircle, description: 'Turn headers into questions to focus your mind.' },
    { id: 'read', label: 'Read', icon: BookOpen, description: 'Read actively to find answers to your questions.' },
    { id: 'recite', label: 'Recite', icon: Volume2, description: 'Answer your questions in your own words.' },
    { id: 'review', label: 'Review', icon: RefreshCw, description: "Consolidate what you've learned." }
];

export function SQ3RReader() {
    const [phase, setPhase] = useState<SQ3RPhase>('survey');
    const [sections, setSections] = useState<Section[]>([]);
    const [newTitle, setNewTitle] = useState('');

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('sz_sq3r_session');
        if (saved) {
            const data = JSON.parse(saved);
            setSections(data.sections || []);
            setPhase(data.phase || 'survey');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('sz_sq3r_session', JSON.stringify({ sections, phase }));
    }, [sections, phase]);

    const addSection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setSections([...sections, {
            id: crypto.randomUUID(),
            title: newTitle,
            question: '',
            answer: ''
        }]);
        setNewTitle('');
    };

    const updateSection = (id: string, field: keyof Section, value: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const nextPhase = () => {
        const currentIndex = PHASES.findIndex(p => p.id === phase);
        if (currentIndex < PHASES.length - 1) {
            setPhase(PHASES[currentIndex + 1].id);
        }
    };

    const prevPhase = () => {
        const currentIndex = PHASES.findIndex(p => p.id === phase);
        if (currentIndex > 0) {
            setPhase(PHASES[currentIndex - 1].id);
        }
    };

    const resetSession = () => {
        if (confirm('Start a new SQ3R session? This will clear current progress.')) {
            setSections([]);
            setPhase('survey');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl space-y-8"
        >
            {/* Header / Stepper */}
            <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">SQ3R Companion</h3>
                            <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mt-0.5">Scientific Reading Method</p>
                        </div>
                    </div>
                    <button onClick={resetSession} className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">New Session</button>
                </div>

                <div className="flex items-center justify-between relative px-2">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 z-0" />
                    {PHASES.map((p, i) => {
                        const Icon = p.icon;
                        const isActive = phase === p.id;
                        const isPast = PHASES.findIndex(curr => curr.id === phase) > i;

                        return (
                            <div key={p.id} className="relative z-10 flex flex-col items-center gap-2 group">
                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.2 : 1,
                                        backgroundColor: isActive ? '#4f46e5' : isPast ? '#10b981' : '#f3f4f6'
                                    }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive || isPast ? 'text-white' : 'text-gray-400 dark:bg-gray-800'
                                        }`}
                                >
                                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </motion.div>
                                <span className={`text-[10px] font-bold uppercase tracking-tighter absolute -bottom-6 whitespace-nowrap ${isActive ? 'text-indigo-600' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                    {p.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Study Panel */}
                <div className="lg:col-span-3">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={phase}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white dark:bg-gray-900 rounded-[40px] p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm min-h-[500px] flex flex-col"
                        >
                            <div className="mb-8">
                                <h4 className="text-2xl font-bold mb-2">{PHASES.find(p => p.id === phase)?.label} Phase</h4>
                                <p className="text-gray-500 leading-relaxed">{PHASES.find(p => p.id === phase)?.description}</p>
                            </div>

                            <div className="flex-1 space-y-8">
                                {phase === 'survey' && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30">
                                            <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-start gap-3">
                                                <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                                <span>Quickly look at headings, subheadings, and bold text. Add the main section titles here.</span>
                                            </p>
                                        </div>
                                        <form onSubmit={addSection} className="flex gap-3">
                                            <input
                                                value={newTitle}
                                                onChange={(e) => setNewTitle(e.target.value)}
                                                placeholder="Enter a section heading..."
                                                className="flex-1 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            />
                                            <button className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold">Add Heading</button>
                                        </form>
                                        <div className="space-y-2">
                                            {sections.map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                                    <span className="font-semibold">{s.title}</span>
                                                    <button onClick={() => setSections(sections.filter(sec => sec.id !== s.id))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {phase === 'question' && (
                                    <div className="space-y-6">
                                        {sections.map(s => (
                                            <div key={s.id} className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-indigo-500 ml-2">{s.title}</label>
                                                <input
                                                    value={s.question}
                                                    onChange={(e) => updateSection(s.id, 'question', e.target.value)}
                                                    placeholder="What do I want to learn from this section?"
                                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                                />
                                            </div>
                                        ))}
                                        {sections.length === 0 && <p className="text-center py-12 text-gray-400 italic">Go back to Survey and add some headings first!</p>}
                                    </div>
                                )}

                                {phase === 'read' && (
                                    <div className="space-y-8">
                                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/30">
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                                Read through your material. Focus on finding the answers to the questions you've written.
                                            </p>
                                        </div>
                                        <div className="space-y-6">
                                            {sections.map(s => (
                                                <div key={s.id} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50">
                                                    <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{s.title}</h5>
                                                    <p className="text-xl font-medium text-indigo-600 dark:text-indigo-400">{s.question || 'No question set'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {phase === 'recite' && (
                                    <div className="space-y-8">
                                        {sections.map(s => (
                                            <div key={s.id} className="space-y-4">
                                                <div className="ml-2">
                                                    <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400">{s.title}</h5>
                                                    <p className="text-lg font-bold">Q: {s.question}</p>
                                                </div>
                                                <textarea
                                                    value={s.answer}
                                                    onChange={(e) => updateSection(s.id, 'answer', e.target.value)}
                                                    placeholder="Explain the answer in your own words..."
                                                    className="w-full h-32 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 resize-none font-serif text-lg leading-relaxed"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {phase === 'review' && (
                                    <div className="space-y-8">
                                        <div className="p-8 bg-indigo-600 rounded-[32px] text-white shadow-2xl shadow-indigo-500/20">
                                            <h5 className="text-2xl font-bold mb-2">Great job!</h5>
                                            <p className="opacity-80 leading-relaxed">You've successfully processed the material using SQ3R. Review your notes below periodically to strengthen your memory.</p>
                                        </div>
                                        <div className="space-y-6">
                                            {sections.map(s => (
                                                <div key={s.id} className="space-y-2 p-6 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
                                                    <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400">{s.title}</h5>
                                                    <p className="font-bold text-indigo-600">{s.question}</p>
                                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{s.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 flex justify-between items-center">
                                <button
                                    onClick={prevPhase}
                                    disabled={phase === 'survey'}
                                    className="px-6 py-3 text-gray-500 font-bold disabled:opacity-0 transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-5 h-5" /> Back
                                </button>
                                <button
                                    onClick={nextPhase}
                                    disabled={phase === 'review' || (phase === 'survey' && sections.length === 0)}
                                    className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold shadow-xl flex items-center gap-2 disabled:opacity-30"
                                >
                                    {phase === 'recite' ? 'Finish Review' : 'Next Step'} <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Sidebar Tips */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-[32px] p-6 border border-amber-100 dark:border-amber-900/30">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <h5 className="font-bold text-amber-900 dark:text-amber-400">Phase Tip</h5>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-500/80 leading-relaxed">
                            {phase === 'survey' && "Don't spend more than 2-3 minutes here. It's just a scan."}
                            {phase === 'question' && "Focus on 'How?' and 'Why?' questions for deeper understanding."}
                            {phase === 'read' && "Highlighting is passive. Finding answers is active."}
                            {phase === 'recite' && "If you can't explain it without looking, read that bit again!"}
                            {phase === 'review' && "Check these notes again in 24 hours, then in 1 week."}
                        </p>
                    </div>

                    <div className="p-6 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Session Stats</h5>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="opacity-60">Headings</span>
                                <span className="font-bold">{sections.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="opacity-60">Completion</span>
                                <span className="font-bold text-indigo-600">{Math.round((PHASES.findIndex(p => p.id === phase) / (PHASES.length - 1)) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
