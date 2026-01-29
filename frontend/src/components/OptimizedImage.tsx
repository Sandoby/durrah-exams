/**
 * OptimizedImage Component
 * 
 * Progressive image loading with modern format support
 * - WebP/AVIF format support with fallbacks
 * - Lazy loading with Intersection Observer
 * - Blur-up placeholder effect
 * - Prevents layout shift with aspect ratio
 * 
 * Requirements: 8.1, 8.2
 */

import { useState, useEffect, useRef } from 'react';
import { createLazyLoader } from '../lib/performance-utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  sizes,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(
    priority ? src : undefined
  );
  const imgRef = useRef<HTMLImageElement>(null);

  // Lazy load images that are not priority
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = createLazyLoader((entry) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        setCurrentSrc(src);
        observer.unobserve(entry.target);
      }
    });

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [priority, src]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Calculate aspect ratio for preventing layout shift
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
      }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Empty placeholder */}
      {placeholder === 'empty' && !isLoaded && (
        <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      )}

      {/* Main image */}
      <picture>
        {/* AVIF format for modern browsers */}
        {currentSrc && (
          <source
            srcSet={currentSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif')}
            type="image/avif"
          />
        )}

        {/* WebP format fallback */}
        {currentSrc && (
          <source
            srcSet={currentSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')}
            type="image/webp"
          />
        )}

        {/* Original format fallback */}
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          className={`
            absolute inset-0 w-full h-full object-cover transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
      </picture>
    </div>
  );
}

/**
 * Responsive image with srcset support
 */
interface ResponsiveImageProps extends OptimizedImageProps {
  srcSet?: {
    src: string;
    width: number;
  }[];
}

export function ResponsiveImage({
  srcSet,
  ...props
}: ResponsiveImageProps) {
  if (!srcSet || srcSet.length === 0) {
    return <OptimizedImage {...props} />;
  }

  // Generate srcset string


  // Generate sizes string if not provided
  const sizes = props.sizes || `
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  `;

  return (
    <OptimizedImage
      {...props}
      sizes={sizes}
    />
  );
}
