import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy, Flame, Clock,
    Calendar, Star, Zap, Notebook
} from 'lucide-react';

interface Stats {
    totalFocusMinutes: number;
    sessionsCompleted: number;
    cardsReviewed: number;
    streak: number;
    lastActive: string | null;
    blurterBest: number;
    feynmanBest: number;
    notesCount: number;
    sq3rProgress: number;
}

export function StudyDashboard() {
    const [stats, setStats] = useState<Stats>({
        totalFocusMinutes: 0,
        sessionsCompleted: 0,
        cardsReviewed: 0,
        streak: 0,
        lastActive: null,
        blurterBest: 0,
        feynmanBest: 0,
        notesCount: 0,
        sq3rProgress: 0
    });

    useEffect(() => {
        // Load stats from localStorage
        const focusMinutes = parseInt(localStorage.getItem('sz_total_focus_minutes') || '0');
        const sessions = parseInt(localStorage.getItem('sz_total_sessions') || '0');
        const cards = JSON.parse(localStorage.getItem('sz_leitner_cards') || '[]').length;
        const streak = parseInt(localStorage.getItem('sz_streak') || '0');
        const lastActive = localStorage.getItem('sz_last_active');
        const blurter = parseInt(localStorage.getItem('sz_blurter_best_score') || '0');
        const feynman = parseInt(localStorage.getItem('sz_feynman_best_score') || '0');
        const notes = (localStorage.getItem('sz_notes') || '').length;

        const sq3rData = JSON.parse(localStorage.getItem('sz_sq3r_session') || '{}');
        const sq3rPhases = ['survey', 'question', 'read', 'recite', 'review'];
        const currentPhaseIndex = sq3rPhases.indexOf(sq3rData.phase || 'survey');
        const sq3rProgress = Math.round((currentPhaseIndex / (sq3rPhases.length - 1)) * 100) || 0;

        setStats({
            totalFocusMinutes: focusMinutes,
            sessionsCompleted: sessions,
            cardsReviewed: cards,
            streak: streak,
            lastActive: lastActive,
            blurterBest: blurter,
            feynmanBest: feynman,
            notesCount: notes,
            sq3rProgress: sq3rProgress
        });
    }, []);

    // Heatmap data generation based on real activity
    const activity = JSON.parse(localStorage.getItem('sz_daily_activity') || '{}');
    const heatmapDays = Array.from({ length: 28 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (27 - i));
        const dateKey = date.toISOString().split('T')[0];
        const minutes = activity[dateKey] || 0;

        // Map minutes to intensity (0-4)
        let intensity = 0;
        if (minutes > 0 && minutes <= 15) intensity = 1;
        else if (minutes > 15 && minutes <= 45) intensity = 2;
        else if (minutes > 45 && minutes <= 90) intensity = 3;
        else if (minutes > 90) intensity = 4;

        return {
            day: i,
            date: dateKey,
            intensity
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl space-y-8"
        >
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Flame}
                    label="Active Recall"
                    value={`${stats.blurterBest}%`}
                    color="text-orange-500"
                    bg="bg-orange-50 dark:bg-orange-950/20"
                    trend="Best Blurter Score"
                />
                <StatCard
                    icon={Clock}
                    label="Focus Time"
                    value={`${Math.round(stats.totalFocusMinutes / 60)}h ${stats.totalFocusMinutes % 60}m`}
                    color="text-indigo-500"
                    bg="bg-indigo-50 dark:bg-indigo-950/20"
                    trend={`${stats.sessionsCompleted} Sessions total`}
                />
                <StatCard
                    icon={Star}
                    label="Feynman Score"
                    value={`${stats.feynmanBest}%`}
                    color="text-amber-500"
                    bg="bg-amber-50 dark:bg-amber-950/20"
                    trend="Teaching Simplicity"
                />
                <StatCard
                    icon={Zap}
                    label="SQ3R Depth"
                    value={`${stats.sq3rProgress}%`}
                    color="text-emerald-500"
                    bg="bg-emerald-50 dark:bg-emerald-950/20"
                    trend="Session progress"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Heatmap Section */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[40px] p-8 md:p-10 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                Consistency Map
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">Real-time study activity tracking.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-3 mb-8">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <span key={d} className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-tighter">{d}</span>
                        ))}
                        {heatmapDays.map(day => (
                            <motion.div
                                key={day.day}
                                whileHover={{ scale: 1.1 }}
                                className={`aspect-square rounded-lg transition-colors border border-black/5 dark:border-white/5 ${day.intensity === 0 || stats.sessionsCompleted < day.day ? 'bg-gray-50 dark:bg-gray-800' :
                                    day.intensity === 1 ? 'bg-indigo-100 dark:bg-indigo-900/20' :
                                        day.intensity === 2 ? 'bg-indigo-300 dark:bg-indigo-700/40' :
                                            day.intensity === 3 ? 'bg-indigo-500' : 'bg-indigo-700 dark:bg-indigo-400'
                                    }`}
                                title={`${day.intensity} units of focus`}
                            />
                        ))}
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-gray-950 rounded-2xl shadow-sm">
                                <Notebook className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Scratchpad Activity</p>
                                <p className="text-xs text-gray-500">{stats.notesCount} characters written in your persistent notes.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Achievements / Next Steps */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-xl shadow-indigo-500/20 h-full flex flex-col">
                        <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-300" />
                            Next Goal
                        </h4>

                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="relative w-32 h-32 mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" className="fill-none stroke-white/10" strokeWidth="8" />
                                    <circle
                                        cx="64" cy="64" r="58"
                                        className="fill-none stroke-white"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        style={{ strokeDasharray: '364', strokeDashoffset: `${364 - (Math.min(stats.totalFocusMinutes / 600, 1) * 364)}` }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Flame className="w-10 h-10 text-amber-300" />
                                </div>
                            </div>
                            <h5 className="font-bold text-xl mb-2">Focus Master</h5>
                            <p className="text-sm opacity-80 leading-relaxed px-4">Reach 10 hours of focused study time.</p>
                        </div>

                        <div className="mt-8 space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                                <span>Progress</span>
                                <span>{Math.round(stats.totalFocusMinutes / 60)}h / 10h</span>
                            </div>
                            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((stats.totalFocusMinutes / 600) * 100, 100)}%` }}
                                    className="h-full bg-white rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StatCard({ icon: Icon, label, value, color, bg, trend }: any) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
            <div className={`p-4 rounded-2xl w-fit mb-4 ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <h4 className="text-2xl font-bold tracking-tight mb-2">{value}</h4>
            <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/60">{trend}</p>
            </div>
        </div>
    );
}
