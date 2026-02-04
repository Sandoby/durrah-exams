import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function FeynmanNotepad() {
    const [topic, setTopic] = useState('');
    const [explanation, setExplanation] = useState('');

    // Simple logic to detect "complexity" or potential jargon
    const complexityAnalysis = useMemo(() => {
        if (!explanation.trim()) return { score: 0, jargon: [], longSentences: 0 };

        const sentences = explanation.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = explanation.toLowerCase().match(/\b\w+\b/g) || [];

        // List of common academic/complex words that might be "jargon" for a 12yo
        const complexWords = [
            'mitochondria', 'metabolism', 'photosynthesis', 'paradigm', 'juxtaposition',
            'quantum', 'oscillation', 'correlation', 'synergy', 'efficiency',
            'infrastructure', 'implementation', 'utilize', 'facilitate', 'methodology'
        ];

        const foundJargon = Array.from(new Set(words.filter(w => complexWords.includes(w))));
        const longSentences = sentences.filter(s => s.split(' ').length > 20).length;

        // Score calculation (0-100, where 100 is "Simple")
        let baseScore = 100;
        baseScore -= foundJargon.length * 10;
        baseScore -= longSentences * 15;

        return {
            score: Math.max(0, baseScore),
            jargon: foundJargon,
            longSentences
        };
    }, [explanation]);

    useEffect(() => {
        if (complexityAnalysis.score > 0) {
            const best = parseInt(localStorage.getItem('sz_feynman_best_score') || '0');
            if (complexityAnalysis.score > best) {
                localStorage.setItem('sz_feynman_best_score', complexityAnalysis.score.toString());
            }
            localStorage.setItem('sz_last_active', new Date().toISOString());
        }
    }, [complexityAnalysis.score]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">Feynman Notepad</h3>
                            <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mt-0.5">Teach it simply</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2 mb-2 block">The Concept</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. How a battery works..."
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Your Simple Explanation</label>
                            <textarea
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                placeholder="Explain it as if you were talking to a 12-year-old child..."
                                className="w-full h-80 px-6 py-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-none focus:ring-2 focus:ring-indigo-500 resize-none font-serif text-lg leading-relaxed"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-500/20">
                    <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Simplicity Score
                    </h4>

                    <div className="relative h-32 w-32 mx-auto mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" className="fill-none stroke-white/10" strokeWidth="6" />
                            <motion.circle
                                cx="64" cy="64" r="58"
                                className="fill-none stroke-white"
                                strokeWidth="6"
                                strokeLinecap="round"
                                initial={{ strokeDasharray: "364 364", strokeDashoffset: 364 }}
                                animate={{ strokeDashoffset: 364 - (complexityAnalysis.score / 100) * 364 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
                            {complexityAnalysis.score}%
                        </div>
                    </div>

                    <p className="text-center text-sm opacity-80 leading-relaxed">
                        Aim for 90%+. High scores mean a 12-year-old could likely understand you.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-2">Analysis Results</h4>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            {complexityAnalysis.jargon.length > 0 ? (
                                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <p className="text-sm font-bold">Complex Jargon</p>
                                <p className="text-xs text-gray-500">
                                    {complexityAnalysis.jargon.length > 0
                                        ? `Found words: ${complexityAnalysis.jargon.join(', ')}`
                                        : 'No complex jargon detected.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            {complexityAnalysis.longSentences > 0 ? (
                                <Info className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <p className="text-sm font-bold">Sentence Length</p>
                                <p className="text-xs text-gray-500">
                                    {complexityAnalysis.longSentences > 0
                                        ? `Found ${complexityAnalysis.longSentences} very long sentences.`
                                        : 'All sentences are punchy and clear.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <p className="text-[11px] font-medium leading-relaxed opacity-60">
                            <strong>Tip:</strong> If you can't explain it simply, you don't understand it well enough. — Albert Einstein
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
