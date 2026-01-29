# Implementation Examples

## Ready-to-Use Code Snippets for Modern Effects

### 1. Scroll Animation Hook (React)

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}
```

**Usage**:
```tsx
function AnimatedCard() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
  
  return (
    <div 
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      Card content
    </div>
  );
}
```

### 2. Parallax Component (React)

```typescript
import { useEffect, useRef } from 'react';

interface ParallaxProps {
  speed?: number; // 0.1 to 1, lower = slower
  children: React.ReactNode;
  className?: string;
}

export function Parallax({ speed = 0.5, children, className = '' }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + scrolled;
      const elementHeight = rect.height;
      
      // Only apply parallax when element is in viewport
      if (scrolled + window.innerHeight > elementTop && scrolled < elementTop + elementHeight) {
        const yPos = (scrolled - elementTop) * speed;
        element.style.transform = `translate3d(0, ${yPos}px, 0)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
```

### 3. Glassmorphic Card Component

```tsx
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover3D?: boolean;
}

export function GlassCard({ children, className = '', hover3D = true }: GlassCardProps) {
  return (
    <div 
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/10 backdrop-blur-md
        border border-white/20
        shadow-xl shadow-black/10
        transition-all duration-300
        ${hover3D ? 'hover:scale-105 hover:shadow-2xl hover:shadow-black/20' : ''}
        ${className}
      `}
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
```

### 4. Animated Counter Component

```tsx
import { useEffect, useState } from 'react';
import { useScrollAnimation } from './useScrollAnimation';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ 
  end, 
  duration = 2000, 
  suffix = '', 
  prefix = '' 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.5, triggerOnce: true });

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref} className="font-bold text-4xl">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
```

### 5. Magnetic Button Component

```tsx
import { useRef, useState } from 'react';

interface MagneticButtonProps {
  children: React.ReactNode;
  strength?: number; // 0 to 1
  radius?: number; // pixels
  className?: string;
  onClick?: () => void;
}

export function MagneticButton({ 
  children, 
  strength = 0.3, 
  radius = 100,
  className = '',
  onClick 
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
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
        y: deltaY * strength
      });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`
        relative transition-transform duration-200 ease-out
        ${className}
      `}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      {children}
    </button>
  );
}
```

### 6. Staggered Animation Container

```tsx
interface StaggeredContainerProps {
  children: React.ReactNode;
  staggerDelay?: number; // ms between each child
  className?: string;
}

export function StaggeredContainer({ 
  children, 
  staggerDelay = 100,
  className = '' 
}: StaggeredContainerProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          className={`transition-all duration-700 ${
            isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}
          style={{
            transitionDelay: isVisible ? `${index * staggerDelay}ms` : '0ms'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
```

### 7. Smooth Scroll Utility

```typescript
export function smoothScrollTo(targetId: string, offset: number = 0) {
  const element = document.getElementById(targetId);
  if (!element) return;

  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// Or with custom easing
export function smoothScrollToWithEasing(
  targetId: string, 
  duration: number = 1000,
  offset: number = 0
) {
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
```

### 8. Gradient Text Component

```tsx
interface GradientTextProps {
  children: React.ReactNode;
  gradient?: string;
  className?: string;
  animated?: boolean;
}

export function GradientText({ 
  children, 
  gradient = 'from-blue-600 via-purple-600 to-pink-600',
  className = '',
  animated = false
}: GradientTextProps) {
  return (
    <span 
      className={`
        bg-gradient-to-r ${gradient}
        bg-clip-text text-transparent
        ${animated ? 'animate-gradient-x' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Add to your Tailwind config for animated gradient:
// animation: {
//   'gradient-x': 'gradient-x 3s ease infinite',
// },
// keyframes: {
//   'gradient-x': {
//     '0%, 100%': { 'background-position': '0% 50%' },
//     '50%': { 'background-position': '100% 50%' },
//   },
// }
```

### 9. Scroll Progress Indicator

```tsx
import { useEffect, useState } from 'react';

export function ScrollProgressIndicator() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentProgress = (window.pageYOffset / totalHeight) * 100;
      setProgress(currentProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
      <div 
        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

### 10. Tailwind CSS Utilities for Modern Effects

Add these to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      // Glassmorphism utilities
      backdropBlur: {
        xs: '2px',
      },
      // Animation utilities
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'gradient-x': 'gradient-x 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
```

## Usage Tips

1. **Always test with `prefers-reduced-motion`** - Respect user preferences
2. **Use `will-change` sparingly** - Only on elements that will definitely animate
3. **Debounce scroll handlers** - Or use Intersection Observer instead
4. **Test on mobile devices** - Animations can be janky on lower-end devices
5. **Keep animations under 1 second** - Longer animations feel sluggish
6. **Use GPU-accelerated properties** - transform and opacity are your friends
