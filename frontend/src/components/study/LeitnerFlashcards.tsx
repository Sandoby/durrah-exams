import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Trophy, Clock } from 'lucide-react';

interface Flashcard {
    id: string;
    front: string;
    back: string;
    box: number; // 1-5
    nextReview: number; // timestamp
}

const BOX_INTERVALS = [0, 1 * 60 * 1000, 1 * 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000, 14 * 24 * 60 * 60 * 1000];

export function LeitnerFlashcards() {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
    const [isReviewing, setIsReviewing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('sz_leitner_cards');
        if (saved) setCards(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('sz_leitner_cards', JSON.stringify(cards));
        updateReviewQueue();
    }, [cards]);

    const updateReviewQueue = () => {
        const now = Date.now();
        const due = cards.filter(c => c.nextReview <= now);
        setReviewQueue(due);
    };

    const addCard = (front: string, back: string) => {
        const newCard: Flashcard = {
            id: crypto.randomUUID(),
            front,
            back,
            box: 1,
            nextReview: Date.now()
        };
        setCards([...cards, newCard]);
    };

    const deleteCard = (id: string) => {
        setCards(cards.filter(c => c.id !== id));
    };

    const rateConfidence = (correct: boolean) => {
        const card = reviewQueue[currentIndex];
        const newBox = correct ? Math.min(card.box + 1, 5) : 1;
        const newNextReview = Date.now() + BOX_INTERVALS[newBox];

        setCards(prev => prev.map(c => c.id === card.id ? { ...c, box: newBox, nextReview: newNextReview } : c));
        localStorage.setItem('sz_last_active', new Date().toISOString());

        if (currentIndex < reviewQueue.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        } else {
            setIsReviewing(false);
            setCurrentIndex(0);
            setIsFlipped(false);
        }
    };

    return (
        <div className="w-full max-w-5xl space-y-8">
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">Smart Flashcards</h3>
                        <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mt-0.5">Leitner Spaced Repetition</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-2xl font-bold">{reviewQueue.length}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Due Today</p>
                    </div>
                    <button
                        onClick={() => { setIsReviewing(true); setCurrentIndex(0); setIsFlipped(false); }}
                        disabled={reviewQueue.length === 0}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-lg shadow-indigo-500/20"
                    >
                        Review Now
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Column 1: Add/List */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 px-2">New Card</h4>
                        <form onSubmit={(e: any) => {
                            e.preventDefault();
                            addCard(e.target.front.value, e.target.back.value);
                            e.target.reset();
                        }} className="space-y-3">
                            <textarea name="front" placeholder="Question..." required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl resize-none text-sm border-none focus:ring-2 focus:ring-indigo-500" h-20 />
                            <textarea name="back" placeholder="Answer..." required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl resize-none text-sm border-none focus:ring-2 focus:ring-indigo-500" h-20 />
                            <button className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm">Add to Box 1</button>
                        </form>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {cards.map(card => (
                            <div key={card.id} className="group p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between hover:border-indigo-200">
                                <div className="flex-1 truncate pr-4">
                                    <p className="text-sm font-medium truncate">{card.front}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${card.box === 1 ? 'bg-red-100 text-red-600' :
                                            card.box === 5 ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-indigo-100 text-indigo-600'
                                            }`}>Box {card.box}</span>
                                        {card.nextReview > Date.now() && <Clock className="w-3 h-3 text-gray-400" />}
                                    </div>
                                </div>
                                <button onClick={() => deleteCard(card.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Column 2: Review Area */}
                <div className="md:col-span-2">
                    <AnimatePresence mode="wait">
                        {isReviewing ? (
                            <motion.div key="review" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="space-y-8">
                                <div className="flex justify-between items-center text-sm font-bold text-gray-400 uppercase px-4">
                                    <span>Card {currentIndex + 1} of {reviewQueue.length}</span>
                                    <span>Box {reviewQueue[currentIndex].box}</span>
                                </div>

                                <motion.div
                                    className="relative aspect-[16/10] perspective-1000 cursor-pointer"
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    <motion.div
                                        className="w-full h-full relative preserve-3d"
                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                                    >
                                        {/* Front */}
                                        <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-900 rounded-[40px] border-4 border-indigo-50 shadow-2xl flex items-center justify-center p-12 text-center overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
                                            <p className="text-3xl font-medium leading-relaxed">{reviewQueue[currentIndex].front}</p>
                                            <span className="absolute bottom-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Click to reveal answer</span>
                                        </div>

                                        {/* Back */}
                                        <div className="absolute inset-0 backface-hidden bg-indigo-600 rounded-[40px] shadow-2xl flex items-center justify-center p-12 text-center text-white rotate-y-180 overflow-hidden">
                                            <p className="text-3xl font-medium leading-relaxed">{reviewQueue[currentIndex].back}</p>
                                            <span className="absolute bottom-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Rate your confidence below</span>
                                        </div>
                                    </motion.div>
                                </motion.div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); rateConfidence(false); }}
                                        className="flex-1 py-5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-3xl font-bold hover:bg-red-100 transition-all border border-red-100/50"
                                    >
                                        Forgot (Box 1)
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); rateConfidence(true); }}
                                        className="flex-1 py-5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-3xl font-bold hover:bg-emerald-100 transition-all border border-emerald-100/50"
                                    >
                                        Remembered (+1 Box)
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[400px] bg-gray-50/50 dark:bg-gray-900/30 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[40px] flex flex-col items-center justify-center text-center p-12">
                                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                                    <Trophy className="w-10 h-10" />
                                </div>
                                <h4 className="text-2xl font-bold mb-2">Daily Goal Reached</h4>
                                <p className="text-gray-500 max-w-xs">You've reviewed all cards due for today. Come back tomorrow or add new cards to your deck!</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
}
