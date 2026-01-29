import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../../lib/modern-design-utils';

interface MagneticButtonProps {
  children: ReactNode;
  strength?: number;
  radius?: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function MagneticButton({
  children,
  strength = 0.3,
  radius = 100,
  className = '',
  onClick,
  disabled = false,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const reducedMotion = prefersReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || disabled) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < radius) {
      setPosition({
        x: deltaX * strength,
        y: deltaY * strength,
      });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={`
        relative
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
