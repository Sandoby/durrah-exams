// Simple notification sounds using Web Audio API

const createOscillator = (context: AudioContext, type: OscillatorType, freq: number) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, context.currentTime);
    return osc;
};

const createGain = (context: AudioContext, start: number, end: number, duration: number) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(start, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(end, context.currentTime + duration);
    return gain;
};

export function playIncomingMessageSound() {
    try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;

        const ctx = new Ctx();

        // Primary tone (Ding)
        const osc1 = createOscillator(ctx, 'sine', 880); // A5
        const gain1 = createGain(ctx, 0.1, 0.01, 0.5);

        // Harmonics for richness
        const osc2 = createOscillator(ctx, 'sine', 1760); // A6
        const gain2 = createGain(ctx, 0.05, 0.01, 0.3);

        osc1.connect(gain1);
        osc2.connect(gain2);

        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);

        osc1.start();
        osc2.start();

        osc1.stop(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);

    } catch (error) {
        console.error('Error playing incoming sound:', error);
    }
}

export function playSentMessageSound() {
    try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;

        const ctx = new Ctx();

        // Subtle Pop
        const osc = createOscillator(ctx, 'triangle', 400);
        const gain = createGain(ctx, 0.05, 0.01, 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);

    } catch (error) {
        console.error('Error playing sent sound:', error);
    }
}

// Deprecated: Alias for backward compatibility if needed, but prefer specific functions
export const playNotificationSound = playIncomingMessageSound;
