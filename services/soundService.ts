let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window !== 'undefined' && !audioContext && (window.AudioContext || (window as any).webkitAudioContext)) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
        }
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
};

const playBeep = (frequency: number, duration: number, volume: number, type: OscillatorType) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Мягкий старт (атака)
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);

    oscillator.start(ctx.currentTime);

    // Плавное затухание
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);
};

// ✅ Правильный ответ (два восходящих тона, похоже на колокольчик)
export const playCorrectSound = () => {
    playBeep(660, 0.12, 0.25, "sine");
    setTimeout(() => playBeep(990, 0.15, 0.25, "sine"), 130);
};

// ❌ Неправильный ответ (низкий «бум-бум»)
export const playIncorrectSound = () => {
    playBeep(180, 0.25, 0.2, "triangle");
    setTimeout(() => playBeep(140, 0.3, 0.2, "triangle"), 120);
};

// 🎮 Ретро-саунд (быстрая лесенка из square)
export const playRetroSound = () => {
    playBeep(440, 0.1, 0.2, "square");
    setTimeout(() => playBeep(660, 0.1, 0.2, "square"), 120);
    setTimeout(() => playBeep(880, 0.1, 0.2, "square"), 240);
};

// 🔔 Щелчок/пик
export const playClickSound = () => {
    playBeep(1200, 0.05, 0.15, "sine");
};
