import type { ReactNode } from 'react';
import { gradients } from '../../lib/modern-design-utils';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  gradient?: keyof typeof gradients | string;
}

export function GradientText({
  children,
  className = '',
  animated = false,
  gradient = 'text',
}: GradientTextProps) {
  const gradientClass = gradient in gradients
    ? gradients[gradient as keyof typeof gradients]
    : gradient;

  return (
    <span
      className={`
        ${gradientClass}
        ${animated ? 'bg-[length:200%_auto] animate-gradient-x' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
