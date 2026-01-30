import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, RotateCcw, CheckCircle2, Circle,
    Plus, X, Volume2, ArrowLeft,
    Zap, Brain, Maximize2, Minimize2, Sliders, CloudRain, Waves
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
    type: 'white' | 'pink' | 'brown';
    icon: any;
    description: string;
}

// --- Constants ---
const DEFAULT_TIMES: Record<TimerMode, number> = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
};

const MODE_LABELS: Record<TimerMode, string> = {
    focus: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
};

// Fully Generative Sounds (Reliable)
const SOUNDS: Sound[] = [
    { id: 'rain', name: 'Rain', type: 'pink', icon: CloudRain, description: 'Pink Noise' }, // Pink noise sounds like rain
    { id: 'white', name: 'Focus', type: 'white', icon: Zap, description: 'White Noise' },
    { id: 'river', name: 'River', type: 'brown', icon: Waves, description: 'Brown Noise' }, // Brown noise sounds like a waterfall/river
];

export default function StudyZone() {
    const navigate = useNavigate();

    // --- State ---
    const [mode, setMode] = useState<TimerMode>('focus');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMES.focus * 60);
    const [customDuration, setCustomDuration] = useState(DEFAULT_TIMES.focus);
    const [isActive, setIsActive] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);

    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');

    const [activeSound, setActiveSound] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);

    // Audio Context Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // --- Timer Logic ---
    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            setIsFocusMode(false);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification("Time's up!", { body: `${MODE_LABELS[mode]} completed.` });
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode]);

    useEffect(() => {
        setCustomDuration(DEFAULT_TIMES[mode]);
        setTimeLeft(DEFAULT_TIMES[mode] * 60);
        setIsActive(false);
    }, [mode]);

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const minutes = parseInt(e.target.value);
        setCustomDuration(minutes);
        setTimeLeft(minutes * 60);
        setIsActive(false);
    };

    // --- Generative Audio Logic ---
    useEffect(() => {
        // Cleanup previous sound
        stopAudio();

        if (activeSound) {
            const soundIdx = SOUNDS.findIndex(s => s.id === activeSound);
            if (soundIdx !== -1) {
                playNoise(SOUNDS[soundIdx].type);
            }
        }

        return () => stopAudio();
    }, [activeSound]);

    useEffect(() => {
        if (gainNodeRef.current) {
            // Apply volume with a smoother curve
            gainNodeRef.current.gain.setTargetAtTime(volume * 0.15, audioContextRef.current?.currentTime || 0, 0.1);
        }
    }, [volume]);

    const stopAudio = () => {
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch (e) { }
            sourceNodeRef.current = null;
        }
    };

    const playNoise = (type: 'white' | 'pink' | 'brown') => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
        }

        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Resume context if suspended (browser policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const bufferSize = ctx.sampleRate * 2; // 2 seconds loops
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11; // compensate gain
                b6 = white * 0.115926;
            }
        } else if (type === 'brown') {
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5; // compensate gain
            }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const gain = ctx.createGain();
        gain.gain.value = volume * 0.15; // Base volume scaling

        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();

        sourceNodeRef.current = noise;
        gainNodeRef.current = gain;
    };


    // --- Handlers ---
    const toggleTimer = () => {
        if (!isActive) {
            setIsActive(true);
            setIsFocusMode(true);
        } else {
            setIsActive(false);
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(customDuration * 60);
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
    };

    // UI Calculations
    const totalTime = customDuration * 60;
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const strokeDasharray = 2 * Math.PI * 120;
    const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

    return (
        <div className={`
            min-h-screen font-sans transition-all duration-700
            ${isFocusMode
                ? 'bg-gray-950 text-gray-100 selection:bg-indigo-900'
                : 'bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 selection:bg-indigo-100 dark:selection:bg-indigo-900'
            }
        `}>
            <Helmet>
                <title>{isActive ? `${formatTime(timeLeft)} - Focus` : 'Study Zone'}</title>
            </Helmet>

            <motion.nav
                initial={{ opacity: 1, y: 0 }}
                animate={{
                    opacity: isFocusMode ? 0 : 1,
                    y: isFocusMode ? -50 : 0
                }}
                className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none"
            >
                <div className="pointer-events-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 opacity-70" />
                    </button>
                </div>

                <div className={`pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border transition-all ${isFocusMode ? 'bg-black/50 border-white/20' : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-gray-800/50'}`}>
                    <Brain className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium opacity-80">Study Zone</span>
                </div>

                <div className="w-10" />
            </motion.nav>

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


            <main className={`
                container mx-auto px-4 min-h-screen flex flex-col items-center justify-center transition-all duration-700
                ${isFocusMode ? 'gap-0' : 'lg:flex-row gap-12 pt-20 pb-10'}
            `}>

                <motion.div
                    layout
                    className={`flex-1 w-full flex flex-col items-center transition-all duration-700 ${isFocusMode ? 'max-w-2xl scale-110' : 'max-w-lg'}`}
                >

                    <motion.div
                        animate={{ opacity: isFocusMode ? 0 : 1, height: isFocusMode ? 0 : 'auto', marginBottom: isFocusMode ? 0 : 48 }}
                        className="w-full flex flex-col items-center overflow-hidden"
                    >
                        <div className="flex p-1 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-full mb-8 relative">
                            <motion.div
                                layoutId="activePill"
                                className="absolute top-1 bottom-1 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                                style={{
                                    left: mode === 'focus' ? '4px' : mode === 'shortBreak' ? '33%' : '66%',
                                    width: '32%',
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                            {(Object.keys(DEFAULT_TIMES) as TimerMode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors ${mode === m ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    {MODE_LABELS[m]}
                                </button>
                            ))}
                        </div>

                        <div className="w-full max-w-xs flex items-center gap-4 px-4">
                            <Sliders className="w-4 h-4 text-gray-400" />
                            <input
                                type="range"
                                min="1"
                                max="120"
                                value={customDuration}
                                onChange={handleDurationChange}
                                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-500"
                            />
                            <span className="text-sm font-mono w-12 text-right opacity-60">{customDuration}m</span>
                        </div>
                    </motion.div>

                    <div className="relative mb-8 group">
                        <div className={`absolute inset-0 bg-gradient-to-tr ${mode === 'focus' ? 'from-indigo-500/20 to-purple-500/20' :
                            mode === 'shortBreak' ? 'from-emerald-500/20 to-teal-500/20' :
                                'from-blue-500/20 to-cyan-500/20'
                            } rounded-full blur-3xl transform transition-all duration-1000 ${isFocusMode ? 'scale-110 opacity-40' : 'scale-90 opacity-100 group-hover:scale-100'}`} />

                        <div className="relative w-80 h-80 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                                <circle
                                    cx="160" cy="160" r="120"
                                    className={`fill-none stroke-current ${isFocusMode ? 'text-white/10' : 'text-gray-200 dark:text-gray-800'}`}
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="160" cy="160" r="120"
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

                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.div
                                    key={timeLeft}
                                    initial={{ opacity: 0.5, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`text-7xl font-light tracking-tighter font-mono tabular-nums ${isFocusMode ? 'text-white' : ''}`}
                                >
                                    {formatTime(timeLeft)}
                                </motion.div>
                                <p className={`mt-2 text-sm uppercase tracking-widest font-semibold opacity-60 ${isFocusMode ? 'text-white/60' : 'text-gray-500'}`}>
                                    {isActive ? 'Running' : 'Paused'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <motion.div
                        layout
                        className="flex gap-6 z-10"
                    >
                        <button
                            onClick={toggleTimer}
                            className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-all hover:scale-105 active:scale-95 ${isActive
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-500/30'
                                }`}
                        >
                            {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>

                        <AnimatePresence>
                            {!isFocusMode && (
                                <motion.button
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 64, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    onClick={resetTimer}
                                    className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-gray-700 overflow-hidden"
                                >
                                    <RotateCcw className="w-6 h-6 flex-shrink-0" />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {!isActive && !isFocusMode && (
                            <button
                                onClick={() => setIsFocusMode(true)}
                                className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                                title="Enter Focus Mode"
                            >
                                <Maximize2 className="w-6 h-6" />
                            </button>
                        )}
                    </motion.div>

                </motion.div>

                <AnimatePresence>
                    {!isFocusMode && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, position: 'absolute' }}
                            className="flex-1 w-full max-w-md space-y-6"
                        >
                            {/* Generative Sound Control */}
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
                                <p className="text-xs text-gray-400 mb-3 -mt-2">Generative audio for flow state.</p>

                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {SOUNDS.map((sound) => (
                                        <button
                                            key={sound.id}
                                            onClick={() => setActiveSound(activeSound === sound.id ? null : sound.id)}
                                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${activeSound === sound.id
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30'
                                                : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-xl ${activeSound === sound.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                }`}>
                                                <sound.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium whitespace-nowrap">{sound.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>

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
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

