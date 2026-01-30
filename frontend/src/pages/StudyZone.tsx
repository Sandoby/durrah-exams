import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, RotateCcw, CheckCircle2, Circle,
    Plus, X, Volume2, ArrowLeft,
    Zap, Brain
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// --- Types ---
type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

interface Sound {
    id: string;
    name: string;
    src: string; // URL to audio file
    icon: any;
}

// --- Constants ---
const MODES: Record<TimerMode, { label: string; minutes: number; color: string }> = {
    focus: { label: 'Focus', minutes: 25, color: 'text-indigo-500' },
    shortBreak: { label: 'Short Break', minutes: 5, color: 'text-emerald-500' },
    longBreak: { label: 'Long Break', minutes: 15, color: 'text-blue-500' },
};

const SOUNDS: Sound[] = [
    { id: 'rain', name: 'Soft Rain', icon: CloudRainIcon, src: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c8c2e64673.mp3' }, // Placeholder URLs - ideally these should be local assets or reliable CDN
    { id: 'white', name: 'White Noise', icon: Zap, src: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447e769f.mp3' },
    { id: 'birds', name: 'Forest', icon: LeafIcon, src: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_346487e671.mp3' },
];

function CloudRainIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M16 14v6" />
            <path d="M8 14v6" />
            <path d="M12 16v6" />
        </svg>
    )
}

function LeafIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.77 10.3-8 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
    )
}

export default function StudyZone() {
    const navigate = useNavigate();

    // --- State ---
    const [mode, setMode] = useState<TimerMode>('focus');
    const [timeLeft, setTimeLeft] = useState(MODES.focus.minutes * 60);
    const [isActive, setIsActive] = useState(false);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [activeSound, setActiveSound] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);

    // Audio Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- Timer Logic ---
    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play alarm or notification here
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification("Time's up!", { body: `${MODES[mode].label} completed.` });
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode]);

    useEffect(() => {
        setTimeLeft(MODES[mode].minutes * 60);
        setIsActive(false);
    }, [mode]);

    // --- Audio Logic ---
    useEffect(() => {
        if (activeSound) {
            const sound = SOUNDS.find(s => s.id === activeSound);
            if (sound) {
                if (!audioRef.current) {
                    audioRef.current = new Audio(sound.src);
                    audioRef.current.loop = true;
                } else {
                    audioRef.current.src = sound.src;
                }
                audioRef.current.volume = volume;
                audioRef.current.play().catch(e => console.log("Audio play failed", e));
            }
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        }
    }, [activeSound]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // --- Handlers ---
    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(MODES[mode].minutes * 60);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const addTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        setTodos([...todos, { id: crypto.randomUUID(), text: newTodo, completed: false }]);
        setNewTodo('');
    };

    const toggleTodo = (id: string) => {
        setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const removeTodo = (id: string) => {
        setTodos(todos.filter(t => t.id !== id));
    }

    // Calculate Progress for Circle
    const totalTime = MODES[mode].minutes * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    const strokeDasharray = 2 * Math.PI * 120; // Radius 120
    const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-300">
            <Helmet>
                <title>Study Zone | Focus & Flow</title>
            </Helmet>

            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 opacity-70" />
                </button>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50">
                    <Brain className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium opacity-80">Study Zone</span>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </nav>

            <main className="container mx-auto px-4 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-12 pt-20 pb-10">

                {/* Left Column: Timer */}
                <div className="flex-1 w-full max-w-lg flex flex-col items-center">

                    {/* Mode Switcher */}
                    <div className="flex p-1 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-full mb-12 relative">
                        {/* Active Pill Background */}
                        <motion.div
                            layoutId="activePill"
                            className="absolute top-1 bottom-1 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                            style={{
                                left: mode === 'focus' ? '4px' : mode === 'shortBreak' ? '33%' : '66%',
                                width: '32%', // Approximate
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        {(Object.keys(MODES) as TimerMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors ${mode === m ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {MODES[m].label}
                            </button>
                        ))}
                    </div>

                    {/* Timer Circle */}
                    <div className="relative mb-12 group">
                        {/* Gradient Glow */}
                        <div className={`absolute inset-0 bg-gradient-to-tr ${mode === 'focus' ? 'from-indigo-500/20 to-purple-500/20' :
                            mode === 'shortBreak' ? 'from-emerald-500/20 to-teal-500/20' :
                                'from-blue-500/20 to-cyan-500/20'
                            } rounded-full blur-3xl transform scale-90 group-hover:scale-100 transition-transform duration-700`} />

                        {/* SVG Timer */}
                        <div className="relative w-80 h-80 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
                                {/* Track */}
                                <circle
                                    cx="160"
                                    cy="160"
                                    r="120"
                                    className="stroke-gray-200 dark:stroke-gray-800 fill-none"
                                    strokeWidth="8"
                                />
                                {/* Progress */}
                                <circle
                                    cx="160"
                                    cy="160"
                                    r="120"
                                    className={`fill-none transition-all duration-1000 ease-linear ${mode === 'focus' ? 'stroke-indigo-500' :
                                        mode === 'shortBreak' ? 'stroke-emerald-500' :
                                            'stroke-blue-500'
                                        }`}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                />
                            </svg>

                            {/* Time Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.div
                                    key={timeLeft}
                                    initial={{ opacity: 0.5, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-7xl font-light tracking-tighter font-mono tabular-nums"
                                >
                                    {formatTime(timeLeft)}
                                </motion.div>
                                <p className="mt-2 text-sm text-gray-500 uppercase tracking-widest font-semibold opacity-60">
                                    {isActive ? 'Running' : 'Paused'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-6">
                        <button
                            onClick={toggleTimer}
                            className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-all hover:scale-105 active:scale-95 ${isActive
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-500/30'
                                }`}
                        >
                            {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>

                        <button
                            onClick={resetTimer}
                            className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </button>
                    </div>

                </div>

                {/* Right Column: Tools */}
                <div className="flex-1 w-full max-w-md space-y-6">

                    {/* Sound Scapes */}
                    <section className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Volume2 className="w-5 h-5 text-indigo-500" />
                                Ambience
                            </h3>
                            {activeSound && (
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-500"
                                />
                            )}
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {SOUNDS.map((sound) => (
                                <button
                                    key={sound.id}
                                    onClick={() => setActiveSound(activeSound === sound.id ? null : sound.id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${activeSound === sound.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30'
                                        : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl ${activeSound === sound.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                        }`}>
                                        <sound.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium opacity-80 whitespace-nowrap">{sound.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Micro-Tasks */}
                    <section className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Session Goals
                        </h3>

                        <form onSubmit={addTodo} className="relative mb-4">
                            <input
                                type="text"
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                placeholder="What are you working on?"
                                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-gray-400"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-2 p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            <AnimatePresence>
                                {todos.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-8 text-gray-400 text-sm"
                                    >
                                        No tasks yet. Set a goal for this session!
                                    </motion.div>
                                )}
                                {todos.map(todo => (
                                    <motion.div
                                        key={todo.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        <button
                                            onClick={() => toggleTodo(todo.id)}
                                            className={`flex-shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-500'}`}
                                        >
                                            {todo.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </button>
                                        <span className={`flex-1 text-sm ${todo.completed ? 'opacity-40 line-through' : ''}`}>
                                            {todo.text}
                                        </span>
                                        <button
                                            onClick={() => removeTodo(todo.id)}
                                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
