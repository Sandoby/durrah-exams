import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { glassmorphism } from '../../lib/modern-design-utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'medium' | 'strong' | 'dark';
  hover3D?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = '',
  variant = 'light',
  hover3D = true,
  onClick,
}: GlassCardProps) {
  const glassClass = glassmorphism[variant];

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        ${glassClass}
        shadow-xl shadow-black/5
        transition-all duration-300
        ${hover3D ? 'hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/10' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={hover3D ? { y: -4 } : undefined}
      onClick={onClick}
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
