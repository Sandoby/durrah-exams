import { useState, useEffect } from 'react';
import { useSoundEffects } from './useSoundEffects';
import { useHaptics } from './useHaptics';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string; // lucide icon name
    unlockedAt: number | null;
}

interface StudyProgress {
    xp: number;
    level: number;
    streak: number;
    lastActive: string | null; // ISO date string
    achievements: Achievement[];
    dailyXp: number;
    lastXpDate: string | null;
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];

const INITIAL_ACHIEVEMENTS: Achievement[] = [
    { id: 'first_step', title: 'First Step', description: 'Complete your first study session', icon: 'Footprints', unlockedAt: null },
    { id: 'focus_novice', title: 'Focus Novice', description: 'Complete 5 Pomodoro sessions', icon: 'Clock', unlockedAt: null },
    { id: 'card_shark', title: 'Card Shark', description: 'Review 50 flashcards', icon: 'Layers', unlockedAt: null },
    { id: 'streak_week', title: 'Streak Week', description: 'maintain a 7-day streak', icon: 'Flame', unlockedAt: null },
    { id: 'night_owl', title: 'Night Owl', description: 'Study after 10 PM', icon: 'Moon', unlockedAt: null },
    { id: 'early_bird', title: 'Early Bird', description: 'Study before 7 AM', icon: 'Sun', unlockedAt: null },
];

export const useStudyProgress = () => {
    const [progress, setProgress] = useState<StudyProgress>({
        xp: 0,
        level: 1,
        streak: 0,
        lastActive: null,
        achievements: INITIAL_ACHIEVEMENTS,
        dailyXp: 0,
        lastXpDate: null
    });

    const { playSound } = useSoundEffects();
    const { notificationSuccess } = useHaptics();

    useEffect(() => {
        const saved = localStorage.getItem('sz_progress');
        if (saved) {
            setProgress(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('sz_progress', JSON.stringify(progress));
    }, [progress]);

    const calculateLevel = (xp: number) => {
        let level = 1;
        for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
            if (xp >= LEVEL_THRESHOLDS[i]) {
                level = i + 1;
            } else {
                break;
            }
        }
        return level;
    };

    const awardXp = (amount: number, _reason: string) => {
        setProgress(prev => {
            const newXp = prev.xp + amount;
            const newLevel = calculateLevel(newXp);
            const today = new Date().toISOString().split('T')[0];

            // Handle massive XP gains (level up)
            if (newLevel > prev.level) {
                playSound('levelup');
                notificationSuccess();
                // Here you would typically trigger a UI modal or toast
            }

            // Streak Logic
            let newStreak = prev.streak;
            const lastActiveDate = prev.lastActive ? prev.lastActive.split('T')[0] : null;

            if (lastActiveDate !== today) {
                // New day
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastActiveDate === yesterdayStr) {
                    newStreak += 1;
                    playSound('streak');
                } else if (lastActiveDate && lastActiveDate < yesterdayStr) {
                    newStreak = 1; // Reset streak if missed a day
                } else if (!lastActiveDate) {
                    newStreak = 1; // First day
                }
            }

            // Daily XP Reset
            const newDailyXp = prev.lastXpDate === today ? prev.dailyXp + amount : amount;

            return {
                ...prev,
                xp: newXp,
                level: newLevel,
                streak: newStreak,
                lastActive: new Date().toISOString(),
                dailyXp: newDailyXp,
                lastXpDate: today
            };
        });
    };

    const unlockAchievement = (id: string) => {
        setProgress(prev => {
            const exists = prev.achievements.find(a => a.id === id);
            if (exists && exists.unlockedAt) return prev; // Already unlocked

            const updatedAchievements = prev.achievements.map(a =>
                a.id === id ? { ...a, unlockedAt: Date.now() } : a
            );

            playSound('success');
            notificationSuccess();

            return {
                ...prev,
                achievements: updatedAchievements
            };
        });
    };

    const getLevelProgress = () => {
        const currentLevelXp = LEVEL_THRESHOLDS[progress.level - 1];
        const nextLevelXp = LEVEL_THRESHOLDS[progress.level] || (currentLevelXp + 1000); // Fallback for max level
        const progressInLevel = progress.xp - currentLevelXp;
        const levelSpan = nextLevelXp - currentLevelXp;

        return Math.min(100, Math.max(0, (progressInLevel / levelSpan) * 100));
    };

    return {
        progress,
        awardXp,
        unlockAchievement,
        getLevelProgress
    };
};
