/**
 * Modern Design Utilities
 * Provides utility functions and constants for modern visual effects
 */

// Glassmorphism presets
export const glassmorphism = {
  light: 'bg-white/10 backdrop-blur-md border border-white/20',
  medium: 'bg-white/20 backdrop-blur-lg border border-white/30',
  strong: 'bg-white/30 backdrop-blur-xl border border-white/40',
  dark: 'bg-black/10 backdrop-blur-md border border-black/20',
} as const;

// Modern gradient presets
export const gradients = {
  hero: 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600',
  card: 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10',
  text: 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent',
  button: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
  accent: 'bg-gradient-to-r from-purple-600 to-pink-600',
  mesh: 'bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500',
} as const;

// Shadow presets for depth
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  colored: 'shadow-lg shadow-purple-500/20',
  glow: 'shadow-2xl shadow-blue-500/30',
} as const;

// Animation duration presets
export const durations = {
  fast: 150,
  normal: 300,
  slow: 600,
  verySlow: 1000,
} as const;

// Easing functions
export const easings = {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Parallax speed presets
export const parallaxSpeeds = {
  slow: 0.3,
  medium: 0.5,
  fast: 0.8,
} as const;

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}

/**
 * Smooth scroll to element with custom easing
 */
export function smoothScrollTo(targetId: string, offset: number = 0, duration: number = 1000) {
  const element = document.getElementById(targetId);
  if (!element) return;

  const startPosition = window.pageYOffset;
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  const distance = targetPosition - startPosition;
  let startTime: number | null = null;

  function animation(currentTime: number) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    
    // Ease-in-out function
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    window.scrollTo(0, startPosition + distance * ease);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

/**
 * Generate staggered animation delays
 */
export function getStaggerDelay(index: number, baseDelay: number = 100): number {
  return prefersReducedMotion() ? 0 : index * baseDelay;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
