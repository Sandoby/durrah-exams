import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RotateCcw, Brain, Minimize2,
    Lightbulb, BookOpen, Notebook, BarChart2,
    ArrowLeft, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';

// Import New Modular Components
import { StudyTimer } from '../components/study/Timer';
import { Blurter } from '../components/study/Blurter';
import { LeitnerFlashcards } from '../components/study/LeitnerFlashcards';
import { FeynmanNotepad } from '../components/study/FeynmanNotepad';
import { SQ3RReader } from '../components/study/SQ3RReader';
import { StudyDashboard } from '../components/study/StudyDashboard';

type ToolType = 'timer' | 'blurter' | 'flashcards' | 'sq3r' | 'feynman' | 'dashboard' | 'notes';

export default function StudyZone() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- State ---
    const [activeTool, setActiveTool] = useState<ToolType>('timer');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [notes, setNotes] = useState('');

    // --- Persistence ---
    useEffect(() => {
        const savedNotes = localStorage.getItem('sz_notes');
        if (savedNotes) setNotes(savedNotes);
    }, []);

    useEffect(() => {
        localStorage.setItem('sz_notes', notes);
    }, [notes]);

    return (
        <div className={`
            min-h-screen font-sans transition-all duration-700
            ${isFocusMode
                ? 'bg-gray-950 text-gray-100 selection:bg-indigo-900'
                : 'bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 selection:bg-indigo-100 dark:selection:bg-indigo-900'
            }
        `}>
            <Helmet>
                <title>Study Zone | Scientific Focus & Recall Suite</title>
                <meta name="description" content="A comprehensive suite of scientific study tools including Pomodoro, Active Recall (Blurting), Spaced Repetition (Leitner System), SQ3R, and Feynman Technique." />
                <meta name="keywords" content="study tools, pomodoro, active recall, flashcards, leitner system, feynman technique, sq3r, study dashboard" />
            </Helmet>

            {/* Navigation Bar */}
            <motion.nav
                initial={{ opacity: 1, y: 0 }}
                animate={{
                    opacity: isFocusMode ? 0 : 1,
                    y: isFocusMode ? -50 : 0
                }}
                className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none"
            >
                <div className="pointer-events-auto">
                    {user && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 opacity-70" />
                        </button>
                    )}
                </div>

                <div className={`pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border transition-all ${isFocusMode ? 'bg-black/50 border-white/20' : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-gray-800/50'}`}>
                    <Brain className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium opacity-80">Study Zone 2.0</span>
                </div>

                <div className="w-10" />
            </motion.nav>

            {/* Focus Mode Close Button */}
            <AnimatePresence>
                {isFocusMode && (
                    <motion.button
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 0.5, y: 0 }}
                        whileHover={{ opacity: 1, scale: 1.05 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={() => setIsFocusMode(false)}
                        className="fixed top-6 right-6 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 shadow-lg"
                        title="Exit Focus Mode"
                    >
                        <Minimize2 className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom Tool Dock */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: isFocusMode ? 100 : 0 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4"
            >
                <div className="flex items-center gap-1 p-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-x-auto no-scrollbar">
                    <NavButton active={activeTool === 'timer'} onClick={() => setActiveTool('timer')} icon={RotateCcw} label="Timer" />
                    <NavButton active={activeTool === 'blurter'} onClick={() => setActiveTool('blurter')} icon={Zap} label="Blurter" />
                    <NavButton active={activeTool === 'flashcards'} onClick={() => setActiveTool('flashcards')} icon={BookOpen} label="Cards" />
                    <NavButton active={activeTool === 'sq3r'} onClick={() => setActiveTool('sq3r')} icon={Lightbulb} label="SQ3R" />
                    <NavButton active={activeTool === 'feynman'} onClick={() => setActiveTool('feynman')} icon={Brain} label="Feynman" />
                    <NavButton active={activeTool === 'dashboard'} onClick={() => setActiveTool('dashboard')} icon={BarChart2} label="Stats" />
                    <NavButton active={activeTool === 'notes'} onClick={() => setActiveTool('notes')} icon={Notebook} label="Notes" />
                </div>
            </motion.div>

            {/* Main Content Area */}
            <main className={`
                container mx-auto px-4 min-h-screen flex flex-col items-center justify-center transition-all duration-700
                ${isFocusMode ? 'gap-0' : 'pt-28 pb-32'}
            `}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTool}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full flex justify-center"
                    >
                        {activeTool === 'timer' && (
                            <StudyTimer isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode} />
                        )}
                        {activeTool === 'blurter' && <Blurter />}
                        {activeTool === 'flashcards' && <LeitnerFlashcards />}
                        {activeTool === 'sq3r' && <SQ3RReader />}
                        {activeTool === 'feynman' && <FeynmanNotepad />}
                        {activeTool === 'dashboard' && <StudyDashboard />}
                        {activeTool === 'notes' && (
                            <div className="w-full max-w-4xl h-[600px] bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Notebook className="w-6 h-6 text-indigo-500" />
                                        Persistent Scratchpad
                                    </h3>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auto-saving to browser</span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Start writing your study notes here..."
                                    className="flex-1 w-full p-10 bg-transparent border-none focus:ring-0 resize-none font-serif text-xl leading-relaxed dark:text-gray-200 placeholder:opacity-30"
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

function NavButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden lg:inline">{label}</span>
        </button>
    );
}
