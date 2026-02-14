import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Sliders, Maximize2, Volume2, CloudRain, Waves, Flame, Trees } from 'lucide-react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface Sound {
    id: string;
    name: string;
    icon: any;
    description: string;
}

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

const SOUNDS: Sound[] = [
    {
        id: 'rain',
        name: 'Rain',
        icon: CloudRain,
        description: 'Gentle Rain'
    },
    {
        id: 'waterfall',
        name: 'Waterfall',
        icon: Waves,
        description: 'Flowing Water'
    },
    {
        id: 'forest',
        name: 'Forest',
        icon: Trees,
        description: 'Nature Sounds'
    },
    {
        id: 'fire',
        name: 'Campfire',
        icon: Flame,
        description: 'Crackling Fire'
    },
];

export function StudyTimer({ isFocusMode, setIsFocusMode }: { isFocusMode: boolean, setIsFocusMode: (v: boolean) => void }) {
    const [mode, setMode] = useState<TimerMode>('focus');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMES.focus * 60);
    const [customDuration, setCustomDuration] = useState(DEFAULT_TIMES.focus);
    const [isActive, setIsActive] = useState(false);
    const [activeSound, setActiveSound] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);

    // Refs for audio
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            setIsFocusMode(false);

            // Save stats to localStorage
            const savedMinutes = parseInt(localStorage.getItem('sz_total_focus_minutes') || '0');
            const savedSessions = parseInt(localStorage.getItem('sz_total_sessions') || '0');
            localStorage.setItem('sz_total_focus_minutes', (savedMinutes + customDuration).toString());
            localStorage.setItem('sz_total_sessions', (savedSessions + 1).toString());
            localStorage.setItem('sz_last_active', new Date().toISOString());

            // Update daily activity heatmap data
            const today = new Date().toISOString().split('T')[0];
            const activity = JSON.parse(localStorage.getItem('sz_daily_activity') || '{}');
            activity[today] = (activity[today] || 0) + customDuration;
            localStorage.setItem('sz_daily_activity', JSON.stringify(activity));

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification("Time's up!", { body: `${MODE_LABELS[mode]} completed.` });
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, setIsFocusMode]);

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

    // Audio Logic
    useEffect(() => {
        if (activeSound) {
            // Stop any existing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            // Create new audio instance with local file
            const audio = new Audio(`/sounds/${activeSound}.mp3`);
            audio.loop = true;
            audio.volume = volume;
            audio.preload = 'auto';

            // Play audio
            audio.play().catch(err => {
                console.log('Audio play failed:', err);
            });

            audioRef.current = audio;
        } else {
            // Stop audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current = null;
            }
        }

        // Cleanup
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, [activeSound]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = ((customDuration * 60 - timeLeft) / (customDuration * 60)) * 100;
    const strokeDasharray = 2 * Math.PI * 120;
    const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

    return (
        <div className={`w-full flex flex-col items-center transition-all duration-700 ${isFocusMode ? 'gap-0' : 'lg:flex-row gap-12 justify-center'}`}>
            <motion.div layout className={`flex-1 w-full flex flex-col items-center transition-all duration-700 ${isFocusMode ? 'max-w-2xl scale-110' : 'max-w-lg'}`}>
                <motion.div animate={{ opacity: isFocusMode ? 0 : 1, height: isFocusMode ? 0 : 'auto', marginBottom: isFocusMode ? 0 : 48 }} className="w-full flex flex-col items-center overflow-hidden">
                    <div className="flex p-1 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-full mb-8 relative">
                        <motion.div
                            layoutId="activePill"
                            className="absolute top-1 bottom-1 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                            style={{
                                left: mode === 'focus' ? '4px' : mode === 'shortBreak' ? '33.3%' : '66.6%',
                                width: '30%',
                            }}
                        />
                        {(Object.keys(DEFAULT_TIMES) as TimerMode[]).map((m) => (
                            <button key={m} onClick={() => setMode(m)} className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors ${mode === m ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                {MODE_LABELS[m]}
                            </button>
                        ))}
                    </div>

                    <div className="w-full max-w-xs flex items-center gap-4 px-4">
                        <Sliders className="w-4 h-4 text-gray-400" />
                        <input type="range" min="1" max="120" value={customDuration} onChange={handleDurationChange} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-500" />
                        <span className="text-sm font-mono w-12 text-right opacity-60">{customDuration}m</span>
                    </div>
                </motion.div>

                <div className="relative mb-8 group">
                    <div className={`absolute inset-0 bg-gradient-to-tr ${mode === 'focus' ? 'from-indigo-500/20 to-purple-500/20' : mode === 'shortBreak' ? 'from-emerald-500/20 to-teal-500/20' : 'from-blue-500/20 to-cyan-500/20'} rounded-full blur-3xl transform transition-all duration-1000 ${isFocusMode ? 'scale-110 opacity-40' : 'scale-90 opacity-100 group-hover:scale-100'}`} />
                    <div className="relative w-80 h-80 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                            <circle cx="160" cy="160" r="120" className={`fill-none stroke-current ${isFocusMode ? 'text-white/10' : 'text-gray-200 dark:text-gray-800'}`} strokeWidth="8" />
                            <circle cx="160" cy="160" r="120" className={`fill-none transition-all duration-1000 ease-linear ${mode === 'focus' ? 'stroke-indigo-500' : mode === 'shortBreak' ? 'stroke-emerald-500' : 'stroke-blue-500'}`} strokeWidth="8" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.div key={timeLeft} initial={{ opacity: 0.5, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`text-7xl font-light tracking-tighter font-mono tabular-nums ${isFocusMode ? 'text-white' : ''}`}>
                                {formatTime(timeLeft)}
                            </motion.div>
                            <p className={`mt-2 text-sm uppercase tracking-widest font-semibold opacity-60 ${isFocusMode ? 'text-white/60' : 'text-gray-500'}`}>
                                {isActive ? 'Running' : 'Paused'}
                            </p>
                        </div>
                    </div>
                </div>

                <motion.div layout className="flex gap-6 z-10">
                    <button onClick={() => setIsActive(!isActive)} className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-500/30'}`}>
                        {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                    <AnimatePresence>
                        {!isFocusMode && (
                            <motion.button initial={{ width: 0, opacity: 0 }} animate={{ width: 64, opacity: 1 }} exit={{ width: 0, opacity: 0 }} onClick={() => { setIsActive(false); setTimeLeft(customDuration * 60); }} className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-gray-700 overflow-hidden">
                                <RotateCcw className="w-6 h-6 flex-shrink-0" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                    {!isActive && !isFocusMode && (
                        <button onClick={() => setIsFocusMode(true)} className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Maximize2 className="w-6 h-6" />
                        </button>
                    )}
                </motion.div>
            </motion.div>

            {!isFocusMode && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 w-full max-w-md space-y-6">
                    <section className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Volume2 className="w-5 h-5 text-indigo-500" />
                                Ambience
                            </h3>
                            {activeSound && (
                                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-500" />
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {SOUNDS.map((sound) => (
                                <button key={sound.id} onClick={() => setActiveSound(activeSound === sound.id ? null : sound.id)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${activeSound === sound.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    <div className={`p-3 rounded-xl transition-all ${activeSound === sound.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                        <sound.icon className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-sm font-medium block">{sound.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{sound.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                </motion.div>
            )}
        </div>
    );
}
