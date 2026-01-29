import { useEffect, useRef, useState } from 'react';

interface UseParallaxOptions {
  speed?: number; // 0.1 to 1, lower = slower
  direction?: 'vertical' | 'horizontal';
  disabled?: boolean;
}

/**
 * Hook for parallax scrolling effects
 * Respects prefers-reduced-motion for accessibility
 */
export function useParallax(options: UseParallaxOptions = {}) {
  const { speed = 0.5, direction = 'vertical', disabled = false } = options;
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + scrolled;
          const elementHeight = rect.height;
          
          // Only apply parallax when element is in viewport
          if (scrolled + window.innerHeight > elementTop && scrolled < elementTop + elementHeight) {
            const yPos = (scrolled - elementTop) * speed;
            setOffset(yPos);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, direction, disabled]);

  const transform = direction === 'vertical' 
    ? `translate3d(0, ${offset}px, 0)` 
    : `translate3d(${offset}px, 0, 0)`;

  return { ref, offset, transform };
}
