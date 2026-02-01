import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

type BlurterPhase = 'input' | 'memorize' | 'recall' | 'result';

export function Blurter() {
    const [phase, setPhase] = useState<BlurterPhase>('input');
    const [originalNotes, setOriginalNotes] = useState('');
    const [recalledText, setRecalledText] = useState('');
    const [timer, setTimer] = useState(60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (timer === 0 && phase === 'memorize') {
            startRecall();
        }
        return () => clearInterval(interval);
    }, [isActive, timer, phase]);

    const startMemorizing = () => {
        if (!originalNotes.trim()) return;
        setPhase('memorize');
        setTimer(60);
        setIsActive(true);
    };

    const startRecall = () => {
        setPhase('recall');
        setIsActive(false);
    };

    const finishRecall = () => {
        setPhase('result');
    };

    const resetBlurter = () => {
        setPhase('input');
        setRecalledText('');
        setOriginalNotes('');
    };

    // Simple keyword matching for "Score"
    const calculateScore = () => {
        const originalWords = new Set(originalNotes.toLowerCase().match(/\b\w+\b/g) || []);
        const recalledWords = new Set(recalledText.toLowerCase().match(/\b\w+\b/g) || []);

        if (originalWords.size === 0) return 0;

        let matches = 0;
        originalWords.forEach(word => {
            if (recalledWords.has(word)) matches++;
        });

        return Math.round((matches / originalWords.size) * 100);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-[32px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
        >
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">The Blurter</h3>
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Active Recall Tool</p>
                    </div>
                </div>

                {phase === 'memorize' && (
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-mono font-bold text-indigo-600">{timer}s</span>
                        <button onClick={startRecall} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold">Skip</button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                            <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Paste your study notes or a summary below.
                            </p>
                        </div>
                        <textarea
                            value={originalNotes}
                            onChange={(e) => setOriginalNotes(e.target.value)}
                            placeholder="Type or paste your notes here..."
                            className="w-full h-64 p-6 bg-gray-50 dark:bg-gray-800 border-none rounded-3xl resize-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-serif text-lg leading-relaxed"
                        />
                        <button
                            onClick={startMemorizing}
                            disabled={!originalNotes.trim()}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                        >
                            Start Memorizing <ArrowRight className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}

                {phase === 'memorize' && (
                    <motion.div key="memorize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50">
                            <p className="font-serif text-xl leading-relaxed whitespace-pre-wrap">{originalNotes}</p>
                        </div>
                        <p className="text-center text-sm font-medium text-gray-500">Read and memorize. The notes will hide when the timer ends.</p>
                    </motion.div>
                )}

                {phase === 'recall' && (
                    <motion.div key="recall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <textarea
                            value={recalledText}
                            onChange={(e) => setRecalledText(e.target.value)}
                            placeholder="Time to blurt! Recover everything you just read..."
                            autoFocus
                            className="w-full h-80 p-8 bg-indigo-50/30 dark:bg-indigo-900/10 border-2 border-indigo-200 dark:border-indigo-900/30 rounded-[32px] resize-none focus:ring-0 transition-all font-serif text-xl leading-relaxed outline-none"
                        />
                        <button
                            onClick={finishRecall}
                            className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" /> Finish & Compare
                        </button>
                    </motion.div>
                )}

                {phase === 'result' && (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-2">Original Notes</h4>
                                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl text-sm leading-relaxed opacity-60">
                                    {originalNotes}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 px-2">Your Recall</h4>
                                <div className="p-6 bg-white dark:bg-gray-950 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl text-sm leading-relaxed shadow-sm">
                                    {recalledText}
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-600 rounded-3xl p-8 text-white flex items-center justify-between shadow-2xl shadow-indigo-500/20">
                            <div>
                                <h4 className="text-3xl font-bold mb-1">Recall Score: {calculateScore()}%</h4>
                                <p className="opacity-80">Keyword overlap based on your notes.</p>
                            </div>
                            <button onClick={resetBlurter} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <RotateCcw className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
