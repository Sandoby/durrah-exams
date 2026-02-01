import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Sliders, Maximize2, Volume2, CloudRain, Zap, Waves } from 'lucide-react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface Sound {
    id: string;
    name: string;
    type: 'white' | 'pink' | 'brown';
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
    { id: 'rain', name: 'Rain', type: 'pink', icon: CloudRain, description: 'Pink Noise' },
    { id: 'white', name: 'Focus', type: 'white', icon: Zap, description: 'White Noise' },
    { id: 'river', name: 'River', type: 'brown', icon: Waves, description: 'Brown Noise' },
];

export function StudyTimer({ isFocusMode, setIsFocusMode }: { isFocusMode: boolean, setIsFocusMode: (v: boolean) => void }) {
    const [mode, setMode] = useState<TimerMode>('focus');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMES.focus * 60);
    const [customDuration, setCustomDuration] = useState(DEFAULT_TIMES.focus);
    const [isActive, setIsActive] = useState(false);
    const [activeSound, setActiveSound] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);

    // Refs for audio
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            setIsFocusMode(false);
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
        stopAudio();
        if (activeSound) {
            const sound = SOUNDS.find(s => s.id === activeSound);
            if (sound) playNoise(sound.type);
        }
        return () => stopAudio();
    }, [activeSound]);

    useEffect(() => {
        if (gainNodeRef.current) {
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
        if (ctx.state === 'suspended') ctx.resume();

        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
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
                data[i] *= 0.11;
                b6 = white * 0.115926;
            }
        } else if (type === 'brown') {
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5;
            }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = volume * 0.15;
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        sourceNodeRef.current = noise;
        gainNodeRef.current = gain;
    };

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
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {SOUNDS.map((sound) => (
                                <button key={sound.id} onClick={() => setActiveSound(activeSound === sound.id ? null : sound.id)} className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${activeSound === sound.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    <div className={`p-3 rounded-xl ${activeSound === sound.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                        <sound.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-medium whitespace-nowrap">{sound.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </motion.div>
            )}
        </div>
    );
}
