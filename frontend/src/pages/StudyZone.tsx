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

// Import Modular Components
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

    useEffect(() => {
        const savedNotes = localStorage.getItem('sz_notes');
        if (savedNotes) setNotes(savedNotes);

        const lastActive = localStorage.getItem('sz_last_active');
        const streak = parseInt(localStorage.getItem('sz_streak') || '0');
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        if (lastActive) {
            const lastDate = lastActive.split('T')[0];
            const diffTime = Math.abs(now.getTime() - new Date(lastActive).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Studied yesterday, increment streak if it's a new day
                if (lastDate !== today) {
                    localStorage.setItem('sz_streak', (streak + 1).toString());
                }
            } else if (diffDays > 1) {
                // Missed a day or more, reset streak
                localStorage.setItem('sz_streak', '1');
            }
        } else {
            // First time studying
            localStorage.setItem('sz_streak', '1');
        }
        localStorage.setItem('sz_last_active', now.toISOString());
    }, []);

    useEffect(() => {
        localStorage.setItem('sz_notes', notes);
    }, [notes]);

    return (
        <motion.div
            animate={{
                backgroundColor: isFocusMode ? "#000000" : "#f3f4f6",
            }}
            transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
            className="min-h-screen relative font-[Outfit] overflow-hidden dark:bg-gray-900"
        >
            <Helmet>
                <title>Study Zone | Durrah Tutors</title>
                <meta name="theme-color" content={isFocusMode ? "#000000" : "#f3f4f6"} />
            </Helmet>

            {/* Focus Mode Immersive Blur Overlay */}
            <AnimatePresence>
                {isFocusMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="fixed inset-0 z-10 pointer-events-none backdrop-blur-[2px] bg-black/20"
                    />
                )}
            </AnimatePresence>

            {/* iOS-Style Glass Header */}
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: isFocusMode ? -100 : 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 inset-x-0 h-16 z-40 flex items-center justify-between px-4 sm:px-6
                          backdrop-blur-xl bg-white/70 dark:bg-gray-900/60 border-b border-white/20 dark:border-white/5"
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 opacity-70" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Study Zone
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Placeholder for future header actions */}
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs ring-2 ring-white dark:ring-gray-800 shadow-sm">
                        {user ? user.email?.charAt(0).toUpperCase() : 'G'}
                    </div>
                </div>
            </motion.header>

            {/* Focus Mode Overlay Controls */}
            <AnimatePresence>
                {isFocusMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-6 right-6 z-50 pointer-events-auto"
                    >
                        <button
                            onClick={() => setIsFocusMode(false)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/10 shadow-xl hover:bg-white/20 transition-all group"
                        >
                            <Minimize2 className="w-4 h-4 group-hover:scale-90 transition-transform" />
                            <span className="text-sm font-medium">Exit Focus</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <motion.main
                animate={{
                    paddingTop: isFocusMode ? 0 : "6rem",
                    paddingBottom: isFocusMode ? 0 : "8rem"
                }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className={`
                    relative z-20 w-full min-h-screen flex flex-col items-center px-4
                    ${isFocusMode ? 'justify-center' : ''}
                `}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTool}
                        initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                        transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                            mass: 0.8
                        }}
                        className={`w-full max-w-7xl mx-auto flex justify-center ${isFocusMode ? 'h-full items-center' : ''}`}
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
                            <div className="w-full max-w-3xl aspect-[3/4] md:aspect-[4/3] bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col relative group">
                                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                                <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl">
                                            <Notebook className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Scratchpad</h3>
                                            <p className="text-xs text-gray-500 font-medium">Auto-saves locally</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800">
                                        {notes.length} chars
                                    </span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Type your notes here..."
                                    className="flex-1 w-full p-8 md:p-10 bg-transparent border-none focus:ring-0 resize-none font-serif text-lg md:text-xl leading-8 text-gray-700 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-600 selection:bg-yellow-100 dark:selection:bg-yellow-900/30"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.main>

            {/* Floating Dock (iOS Style) */}
            <motion.div
                initial={{ y: 150 }}
                animate={{ y: isFocusMode ? 200 : 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-4xl z-50 flex justify-center"
            >
                <div className="glass-dock p-2 rounded-[24px] md:rounded-full flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar max-w-full shadow-2xl ring-1 ring-white/20">
                    <DockItem
                        active={activeTool === 'timer'}
                        onClick={() => setActiveTool('timer')}
                        icon={RotateCcw}
                        label="Timer"
                        activeColor="text-rose-500"
                    />
                    <div className="w-px h-8 bg-gray-300/30 dark:bg-gray-700/30 mx-1 hidden md:block" />

                    <DockItem
                        active={activeTool === 'blurter'}
                        onClick={() => setActiveTool('blurter')}
                        icon={Zap}
                        label="Blurter"
                        activeColor="text-orange-500"
                    />
                    <DockItem
                        active={activeTool === 'flashcards'}
                        onClick={() => setActiveTool('flashcards')}
                        icon={BookOpen}
                        label="Cards"
                        activeColor="text-emerald-500"
                    />
                    <DockItem
                        active={activeTool === 'sq3r'}
                        onClick={() => setActiveTool('sq3r')}
                        icon={Lightbulb}
                        label="SQ3R"
                        activeColor="text-sky-500"
                    />
                    <DockItem
                        active={activeTool === 'feynman'}
                        onClick={() => setActiveTool('feynman')}
                        icon={Brain}
                        label="Feynman"
                        activeColor="text-teal-500"
                    />

                    <div className="w-px h-8 bg-gray-300/30 dark:bg-gray-700/30 mx-1 hidden md:block" />

                    <DockItem
                        active={activeTool === 'notes'}
                        onClick={() => setActiveTool('notes')}
                        icon={Notebook}
                        label="Notes"
                        activeColor="text-amber-600"
                    />
                    <DockItem
                        active={activeTool === 'dashboard'}
                        onClick={() => setActiveTool('dashboard')}
                        icon={BarChart2}
                        label="Stats"
                        activeColor="text-blue-600"
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}

function DockItem({ active, onClick, icon: Icon, label, activeColor }: any) {
    return (
        <button
            onClick={onClick}
            className="group relative flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-2xl md:rounded-full transition-all duration-300 focus:outline-none"
        >
            {active && (
                <motion.div
                    layoutId="dockHighlight"
                    className="absolute inset-0 bg-gray-900/5 dark:bg-white/10 shadow-sm rounded-2xl md:rounded-full z-0 border border-black/5 dark:border-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}

            <div className={`relative z-10 flex flex-col items-center gap-1 transition-all duration-300 ${active ? '-translate-y-1' : ''}`}>
                <div className={`
                    p-2 rounded-xl transition-all duration-300
                    ${active
                        ? activeColor
                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100 group-hover:bg-black/5 dark:group-hover:bg-white/5'
                    }
                `}>
                    <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.05em] transition-all duration-300 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 absolute bottom-0'} ${active ? activeColor : 'text-gray-400'}`}>
                    {label}
                </span>
            </div>

            {!active && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
        </button>
    );
}
