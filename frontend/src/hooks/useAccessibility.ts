/**
 * useAccessibility Hook
 * 
 * React hook for accessibility features
 * - Reduced motion detection
 * - High contrast detection
 * - Screen reader announcements
 * - Focus management
 * 
 * Requirements: 8.3, 8.4, 8.5
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  prefersReducedMotion,
  prefersHighContrast,
  ScreenReaderAnnouncer,
  FocusTrap,
} from '../lib/accessibility-utils';

/**
 * Hook to detect user's motion preferences
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return reducedMotion;
}

/**
 * Hook to detect user's contrast preferences
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(prefersHighContrast());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setHighContrast(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return highContrast;
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReader() {
  const announcerRef = useRef<ScreenReaderAnnouncer | null>(null);

  useEffect(() => {
    announcerRef.current = new ScreenReaderAnnouncer();
    return () => {
      announcerRef.current?.destroy();
    };
  }, []);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announcerRef.current?.announce(message, priority);
    },
    []
  );

  return { announce };
}

/**
 * Hook for focus trap in modals/dialogs
 */
export function useFocusTrap(
  elementRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    if (isActive) {
      focusTrapRef.current = new FocusTrap(elementRef.current);
      focusTrapRef.current.activate();
    }

    return () => {
      focusTrapRef.current?.deactivate();
      focusTrapRef.current = null;
    };
  }, [elementRef, isActive]);
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    initialIndex?: number;
  } = {}
) {
  const [currentIndex, setCurrentIndex] = useState(options.initialIndex || 0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { orientation = 'both', loop = true } = options;
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex - 1;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex + 1;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            newIndex = currentIndex + 1;
          }
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      // Handle looping
      if (loop) {
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;
      } else {
        newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
      }

      // Focus new item
      if (items[newIndex]) {
        items[newIndex].focus();
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, items, options]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { currentIndex, setCurrentIndex };
}

/**
 * Hook to manage skip links
 */
export function useSkipLink(targetId: string) {
  useEffect(() => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';

    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink);
      }
    };
  }, [targetId]);
}

/**
 * Hook to detect if element is in viewport (for lazy loading)
 */
export function useInView(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isInView;
}
