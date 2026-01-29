/**
 * Performance Utilities for Core Web Vitals Optimization
 * 
 * Provides utilities for:
 * - Critical CSS inlining
 * - Progressive image loading
 * - Resource prioritization
 * - Performance monitoring
 * 
 * Requirements: 8.1, 8.2
 */

/**
 * Preload critical resources for faster initial render
 */
export function preloadCriticalResources() {
  // Preload critical fonts
  const fontPreloads = [
    { href: '/fonts/inter-var.woff2', type: 'font/woff2' },
  ];

  fontPreloads.forEach(({ href, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = type;
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Get optimized image URL based on device capabilities
 */
export function getOptimizedImageUrl(
  src: string,
  options: {
    width?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
    quality?: number;
  } = {}
): string {
  const { width, format = 'webp', quality: _quality = 80 } = options;

  // Check if browser supports modern formats






  // Return original if no optimization needed
  if (!width && !format) return src;

  // For now, return original URL
  // In production, this would integrate with image CDN/optimization service
  return src;
}

/**
 * Progressive image loader with blur-up effect
 */
export class ProgressiveImage {
  private img: HTMLImageElement;
  private placeholder: string;
  private fullSrc: string;
  private onLoad?: () => void;

  constructor(
    placeholder: string,
    fullSrc: string,
    onLoad?: () => void
  ) {
    this.placeholder = placeholder;
    this.fullSrc = fullSrc;
    this.onLoad = onLoad;
    this.img = new Image();
  }

  load(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Load placeholder first
      const placeholderImg = new Image();
      placeholderImg.src = this.placeholder;
      placeholderImg.onload = () => {
        resolve(this.placeholder);

        // Then load full image
        this.img.src = this.fullSrc;
        this.img.onload = () => {
          this.onLoad?.();
          resolve(this.fullSrc);
        };
        this.img.onerror = reject;
      };
      placeholderImg.onerror = reject;
    });
  }
}

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoader(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options,
  };

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, defaultOptions);
}

/**
 * Defer non-critical JavaScript execution
 */
export function deferExecution(
  callback: () => void,
  priority: 'idle' | 'animation' | 'timeout' = 'idle'
): () => void {
  let timeoutId: number | undefined;
  let cancelled = false;

  const execute = () => {
    if (!cancelled) callback();
  };

  if (priority === 'idle' && 'requestIdleCallback' in window) {
    const w = window as any;
    const id = w.requestIdleCallback(execute, { timeout: 2000 });
    return () => {
      cancelled = true;
      w.cancelIdleCallback(id);
    };
  }

  if (priority === 'animation') {
    const id = requestAnimationFrame(execute);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }

  timeoutId = window.setTimeout(execute, 0);
  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

/**
 * Monitor Core Web Vitals
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function reportWebVitals(onReport: (metric: WebVitalsMetric) => void) {
  // This would integrate with web-vitals library in production
  // For now, we'll use Performance Observer API

  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        if (lastEntry) {
          const value = lastEntry.renderTime || lastEntry.loadTime;
          onReport({
            name: 'LCP',
            value,
            rating: value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor',
            delta: value,
            id: `lcp-${Date.now()}`,
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const value = entry.processingStart - entry.startTime;
          onReport({
            name: 'FID',
            value,
            rating: value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor',
            delta: value,
            id: `fid-${Date.now()}`,
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        onReport({
          name: 'CLS',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          delta: clsValue,
          id: `cls-${Date.now()}`,
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }
  }
}

/**
 * Prefetch resources for faster navigation
 */
export function prefetchResource(url: string, as: 'script' | 'style' | 'image' | 'fetch' = 'fetch') {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = as;
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Critical CSS inlining helper
 */
export const criticalCSS = `
  /* Critical above-the-fold styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Prevent layout shift for images */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Loading skeleton styles */
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s ease-in-out infinite;
  }

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
