import { Clock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface ClassroomHeroHeaderProps {
    classroom: {
        name: string;
        description: string | null;
        subject: string | null;
        grade_level: string | null;
        academic_year: string | null;
        color: string;
        is_archived?: boolean;
        enrollment_status?: 'active' | 'pending' | 'suspended';
    };
    children?: React.ReactNode; // For Tabs or Actions
}

export function ClassroomHeroHeader({ classroom, children }: ClassroomHeroHeaderProps) {
    const themeColor = classroom.color || '#4f46e5';
    const isPending = classroom.enrollment_status === 'pending';
    const isSuspended = classroom.enrollment_status === 'suspended';

    return (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl shadow-2xl shadow-indigo-500/5 border border-white/50 dark:border-slate-800/50 p-8 sm:p-12 mb-8">
            {/* Immersive Sweeping Mesh Gradients */}
            <div
                className="absolute -top-32 -left-32 w-96 h-96 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 animate-blob pointer-events-none"
                style={{ backgroundColor: themeColor }}
            />
            <div
                className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-blob animation-delay-2000 pointer-events-none"
                style={{ backgroundColor: `${themeColor}80` }}
            />

            {/* Grid Pattern overlay for texture */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                {/* Dynamic Avatar */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl relative group overflow-hidden"
                    style={{ backgroundColor: themeColor, boxShadow: `0 20px 40px -10px ${themeColor}80` }}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-1000 ease-in-out" />
                    <span className="drop-shadow-lg">{classroom.name.charAt(0).toUpperCase()}</span>
                </motion.div>

                {/* Info Column */}
                <div className="flex-1 min-w-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-3 mb-3 flex-wrap"
                    >
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm line-clamp-2">
                            {classroom.name}
                        </h1>

                        {/* Status Badges */}
                        {classroom.is_archived && (
                            <span className="px-4 py-1.5 text-sm font-bold bg-gray-200/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-300 rounded-full border border-gray-300/50 dark:border-slate-600/50 backdrop-blur-md">
                                Archived
                            </span>
                        )}
                        {isPending && (
                            <span className="px-4 py-1.5 text-sm font-bold bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full border border-orange-200/50 dark:border-orange-800/50 flex items-center gap-1.5 backdrop-blur-md">
                                <Clock className="w-4 h-4" /> Pending
                            </span>
                        )}
                        {isSuspended && (
                            <span className="px-4 py-1.5 text-sm font-bold bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full border border-red-200/50 dark:border-red-800/50 flex items-center gap-1.5 backdrop-blur-md">
                                <ShieldAlert className="w-4 h-4" /> Suspended
                            </span>
                        )}
                    </motion.div>

                    {/* Badges */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap gap-2.5 text-sm text-gray-600 dark:text-gray-300 mb-5"
                    >
                        {classroom.subject && (
                            <span className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 dark:border-slate-700/50 shadow-sm font-medium">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
                                {classroom.subject}
                            </span>
                        )}
                        {classroom.grade_level && (
                            <span className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 dark:border-slate-700/50 shadow-sm font-medium">
                                {classroom.grade_level}
                            </span>
                        )}
                        {classroom.academic_year && (
                            <span className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 dark:border-slate-700/50 shadow-sm font-medium">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {classroom.academic_year}
                            </span>
                        )}
                    </motion.div>

                    {classroom.description && (
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed text-base sm:text-lg"
                        >
                            {classroom.description}
                        </motion.p>
                    )}
                </div>
            </div>

            {/* Render Tabs or any extra UI injected into the header bottom */}
            {children && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-10"
                >
                    {children}
                </motion.div>
            )}
        </div>
    );
}
