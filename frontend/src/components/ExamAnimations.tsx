import { useState, useEffect, useRef } from 'react';

// ============================================
// CONFETTI COMPONENT
// ============================================
interface ConfettiProps {
  active?: boolean;
  duration?: number;
  onComplete?: () => void;
}

export function Confetti({ active = true, duration = 3000, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    color: string;
    delay: number;
    size: number;
  }>>([]);

  useEffect(() => {
    if (active) {
      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        size: Math.random() * 8 + 4,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            animationDelay: `${particle.delay}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// SKELETON LOADER COMPONENT
// ============================================
export function QuestionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
      
      {/* Question text */}
      <div className="space-y-2 mb-6">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
      
      {/* Options */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="ml-3 h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUCCESS ANIMATION (CHECKMARK)
// ============================================
interface SuccessCheckProps {
  show?: boolean;
  onComplete?: () => void;
}

export function SuccessCheck({ show = true, onComplete }: SuccessCheckProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="animate-success-pop">
      <svg className="w-8 h-8 text-green-500" viewBox="0 0 52 52">
        <circle
          className="animate-success-circle"
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="animate-success-check"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27l7 7 16-16"
        />
      </svg>
    </div>
  );
}

// ============================================
// SHAKE ANIMATION WRAPPER
// ============================================
interface ShakeWrapperProps {
  shake: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ShakeWrapper({ shake, children, className = '' }: ShakeWrapperProps) {
  return (
    <div className={`${shake ? 'animate-shake' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// SCREEN READER ANNOUNCER
// ============================================
export function useScreenReaderAnnounce() {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = (message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Clear first to ensure re-announcement
    setAnnouncement('');
    timeoutRef.current = setTimeout(() => setAnnouncement(message), 50);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return a function that renders the announcer and announces
  const AnnounceComponent = () => (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );

  return Object.assign(announce, { Announcer: AnnounceComponent });
}

// ============================================
// SLIDE TRANSITION WRAPPER
// ============================================
interface SlideTransitionProps {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  children: React.ReactNode;
  className?: string;
}

export function SlideTransition({ direction, children, className = '' }: SlideTransitionProps) {
  const getTransformClass = () => {
    switch (direction) {
      case 'left':
        return 'animate-slide-in-left';
      case 'right':
        return 'animate-slide-in-right';
      case 'up':
        return 'animate-slide-in-up';
      case 'down':
        return 'animate-slide-in-down';
      default:
        return '';
    }
  };

  return (
    <div className={`${getTransformClass()} ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// FOCUS RING COMPONENT
// ============================================
export function FocusRing({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// IMAGE PRELOADER HOOK
// ============================================
export function useImagePreloader(imageUrls: (string | null | undefined)[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const urlsToLoad = imageUrls.filter((url): url is string => !!url && !loadedImages.has(url));
    
    if (urlsToLoad.length === 0) return;

    setIsLoading(true);
    
    const promises = urlsToLoad.map((url) => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
      });
    });

    Promise.allSettled(promises).then((results) => {
      const newLoaded = new Set(loadedImages);
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          newLoaded.add(result.value);
        }
      });
      setLoadedImages(newLoaded);
      setIsLoading(false);
    });
  }, [imageUrls]);

  return { loadedImages, isLoading };
}

// ============================================
// DYSLEXIA FRIENDLY FONT TOGGLE
// ============================================
export function useDyslexiaFont() {
  const [isDyslexiaFont, setIsDyslexiaFont] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('durrah_dyslexia_font') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('durrah_dyslexia_font', String(isDyslexiaFont));
    
    if (isDyslexiaFont) {
      document.documentElement.classList.add('dyslexia-font');
    } else {
      document.documentElement.classList.remove('dyslexia-font');
    }
  }, [isDyslexiaFont]);

  return { isDyslexiaFont, setIsDyslexiaFont, toggleDyslexiaFont: () => setIsDyslexiaFont(prev => !prev) };
}
