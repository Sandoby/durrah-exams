import { Link } from 'react-router-dom';
import { Users, Hash, Calendar, GraduationCap, Archive } from 'lucide-react';
import type { Classroom } from '../../../types/classroom';
import { motion } from 'framer-motion';

interface ClassroomCardProps {
  classroom: Classroom;
}

export function ClassroomCard({ classroom }: ClassroomCardProps) {
  const isArchived = classroom.is_archived;
  // Fallback color if undefined
  const themeColor = classroom.color || '#4f46e5';

  return (
    <Link to={`/classrooms/${classroom.id}`} className="block group h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className={`
          relative h-full flex flex-col
          bg-white dark:bg-slate-900 rounded-2xl 
          border border-gray-100 dark:border-slate-800
          shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 
          transition-all duration-300 overflow-hidden
          ${isArchived ? 'opacity-60 grayscale' : ''}
        `}
      >
        {/* Subtle Background Gradient Overlay */}
        <div 
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500"
          style={{ backgroundColor: themeColor }}
        />

        <div className="p-6 flex-1 flex flex-col">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
               {/* Subject Badge */}
               <div className="flex items-center gap-2 mb-3">
                 <span 
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide uppercase"
                    style={{ 
                      backgroundColor: `${themeColor}15`, 
                      color: themeColor 
                    }}
                 >
                    {classroom.subject || 'General'}
                 </span>
                 {classroom.grade_level && (
                   <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                     <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                     {classroom.grade_level}
                   </span>
                 )}
               </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 truncate pr-2">
                {classroom.name}
              </h3>
            </div>
            
            {isArchived ? (
               <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500">
                  <Archive className="w-5 h-5" />
               </div>
            ) : (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: `${themeColor}10` }}
                >
                  <GraduationCap className="w-5 h-5" style={{ color: themeColor }} />
                </div>
            )}
          </div>

          {/* Description */}
          {classroom.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed flex-1">
              {classroom.description}
            </p>
          )}

          {/* Footer Stats - Separator */}
          <div className="mt-auto pt-4 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400" title="Students Enrolled">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>{classroom.student_count || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400" title="Invite Code">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-mono">{classroom.invite_code}</span>
              </div>
            </div>
            
            {classroom.academic_year && (
               <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                 <Calendar className="w-3 h-3" />
                 {classroom.academic_year}
               </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
