import { Link } from 'react-router-dom';
import {
    Users,
    Hash,
    Calendar,
    Archive,
    BookOpen,
    Clock,
    ChevronRight,
    ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Classroom, EnrolledClassroom } from '../../../types/classroom';

interface PremiumClassCardProps {
    classroom: Classroom | EnrolledClassroom;
    role: 'tutor' | 'student';
    linkTo: string;
}

export function PremiumClassCard({ classroom, role, linkTo }: PremiumClassCardProps) {
    // Type guards or checks
    const isTutor = role === 'tutor';
    const isStudent = role === 'student';

    const tutorClassroom = classroom as Classroom;
    const studentClassroom = classroom as EnrolledClassroom;

    const isArchived = isTutor && tutorClassroom.is_archived;
    const isPending = isStudent && studentClassroom.enrollment_status === 'pending';
    const isSuspended = isStudent && studentClassroom.enrollment_status === 'suspended';

    const themeColor = classroom.color || '#4f46e5';

    // For students, if pending/suspended, adjust visual state
    const isDisabled = isPending || isSuspended;

    const CardContent = (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={!isDisabled ? { y: -6, scale: 1.01 } : {}}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`
        relative h-full flex flex-col group
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl 
        border border-gray-100/50 dark:border-slate-800/50
        shadow-sm hover:shadow-2xl hover:shadow-${themeColor}/10 
        transition-all duration-500 overflow-hidden
        ${isArchived ? 'opacity-60 grayscale' : ''}
        ${isDisabled ? 'opacity-70 grayscale-[30%]' : ''}
      `}
        >
            {/* Dynamic Hover Gradient Background */}
            <div
                className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: `linear-gradient(120deg, transparent, ${themeColor}15, transparent)`
                }}
            />

            {/* Top Decorator Bar (instead of a full header, a subtle sweeping glow) */}
            <div
                className="absolute top-0 left-0 w-full h-1.5 opacity-80"
                style={{
                    background: `linear-gradient(90deg, ${themeColor}, ${themeColor}80)`
                }}
            />

            {/* Top right floating blurred blob */}
            <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none"
                style={{ backgroundColor: themeColor }}
            />

            <div className="p-6 flex-1 flex flex-col relative z-10">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                        {/* Subject & Grade Badge Row */}
                        <div className="flex items-center gap-2 mb-3">
                            <span
                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider uppercase border"
                                style={{
                                    backgroundColor: `${themeColor}10`,
                                    color: themeColor,
                                    borderColor: `${themeColor}20`
                                }}
                            >
                                {classroom.subject || 'General'}
                            </span>
                            {classroom.grade_level && (
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                                    {classroom.grade_level}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text transition-colors line-clamp-1"
                            style={{ backgroundImage: `linear-gradient(90deg, ${themeColor}, ${themeColor}80)` }}>
                            {classroom.name}
                        </h3>

                        {/* Tutor Name (Student View) */}
                        {isStudent && studentClassroom.tutor_name && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <BookOpen className="w-4 h-4" />
                                <span>{studentClassroom.tutor_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Icons / Status Indicators */}
                    <div className="flex-shrink-0">
                        {isArchived ? (
                            <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-2xl text-gray-500 shadow-inner">
                                <Archive className="w-5 h-5" />
                            </div>
                        ) : isPending ? (
                            <div className="px-3 py-1.5 bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-orange-200/50 dark:border-orange-800/50">
                                <Clock className="w-3.5 h-3.5" />
                                Pending
                            </div>
                        ) : isSuspended ? (
                            <div className="p-2 bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                                <ShieldAlert className="w-4 h-4" />
                            </div>
                        ) : (
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                                style={{ backgroundColor: themeColor, color: 'white', boxShadow: `0 10px 25px -5px ${themeColor}60` }}
                            >
                                <span className="text-xl font-black">{classroom.name.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                {classroom.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed flex-1">
                        {classroom.description}
                    </p>
                )}

                {/* Footer Metrics Bento */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {isTutor && (
                            <>
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700/50 transition-colors group-hover:border-gray-200 dark:group-hover:border-slate-600">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span>{tutorClassroom.student_count || 0}</span>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700/50 transition-colors group-hover:border-gray-200 dark:group-hover:border-slate-600">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                    <span className="font-mono tracking-wider">{tutorClassroom.invite_code}</span>
                                </div>
                            </>
                        )}
                        {isStudent && classroom.academic_year && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl">
                                <Calendar className="w-3.5 h-3.5" />
                                {classroom.academic_year}
                            </div>
                        )}
                    </div>

                    {/* Action indicator */}
                    {!isDisabled && (
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                        >
                            <ChevronRight className="w-4 h-4 stroke-[3]" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    if (isDisabled) {
        return <div className="h-full block cursor-not-allowed">{CardContent}</div>;
    }

    return (
        <Link to={linkTo} className="block h-full outline-none">
            {CardContent}
        </Link>
    );
}
