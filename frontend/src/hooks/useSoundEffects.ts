import { useState, useEffect, useRef, useCallback } from 'react';

type SoundType = 'success' | 'error' | 'click' | 'flip' | 'notification' | 'levelup' | 'streak' | 'swipe';

export const useSoundEffects = () => {
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Load settings from localStorage
        const savedVolume = localStorage.getItem('sz_sfx_volume');
        const savedMute = localStorage.getItem('sz_sfx_muted');
        if (savedVolume) setVolume(parseFloat(savedVolume));
        if (savedMute) setIsMuted(savedMute === 'true');
    }, []);

    useEffect(() => {
        localStorage.setItem('sz_sfx_volume', volume.toString());
        localStorage.setItem('sz_sfx_muted', isMuted.toString());
    }, [volume, isMuted]);

    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1) => {
        if (!audioContextRef.current || isMuted) return;
        const ctx = audioContextRef.current;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

        // Envelope
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(vol * volume, ctx.currentTime + startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
    };

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;
        initAudio();

        switch (type) {
            case 'click':
                playTone(800, 'sine', 0.05, 0, 0.3);
                break;
            case 'flip':
            case 'swipe':
                // Whoosh sound - noise buffer would be better but simple tone slide works
                if (!audioContextRef.current) return;
                const ctx = audioContextRef.current;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.2 * volume, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
                break;
            case 'success':
                // High nice chime
                playTone(880, 'sine', 0.1, 0, 0.4); // A5
                playTone(1108, 'sine', 0.3, 0.1, 0.4); // C#6
                break;
            case 'error':
                // Low thud
                playTone(150, 'triangle', 0.1, 0, 0.5);
                playTone(100, 'triangle', 0.2, 0.1, 0.5);
                break;
            case 'notification':
                playTone(523.25, 'sine', 0.1, 0, 0.5); // C5
                playTone(659.25, 'sine', 0.1, 0.1, 0.5); // E5
                break;
            case 'levelup':
                playTone(523.25, 'square', 0.1, 0, 0.2);
                playTone(659.25, 'square', 0.1, 0.1, 0.2);
                playTone(783.99, 'square', 0.1, 0.2, 0.2);
                playTone(1046.50, 'square', 0.4, 0.3, 0.2);
                break;
            case 'streak':
                playTone(440, 'sine', 0.1, 0, 0.3);
                playTone(880, 'sine', 0.2, 0.1, 0.3);
                break;
            default:
                break;
        }
    }, [volume, isMuted]);

    const toggleMute = () => setIsMuted(prev => !prev);

    return {
        playSound,
        volume,
        setVolume,
        isMuted,
        toggleMute
    };
};
