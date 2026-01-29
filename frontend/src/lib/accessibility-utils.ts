/**
 * Accessibility Utilities for WCAG 2.1 AA Compliance
 * 
 * Provides utilities for:
 * - Color contrast checking
 * - Focus management
 * - Screen reader announcements
 * - Keyboard navigation
 * 
 * Requirements: 8.3, 8.4, 8.5
 */

/**
 * Calculate relative luminance of a color
 * Used for WCAG contrast ratio calculations
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio from 1 to 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  level: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = level === 'large' ? 3 : 4.5;
  return ratio >= minRatio;
}

/**
 * Check if color combination meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  level: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = level === 'large' ? 4.5 : 7;
  return ratio >= minRatio;
}

/**
 * Focus trap for modal dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(element: HTMLElement) {
    this.element = element;
  }

  activate() {
    // Store current focus
    this.previousFocus = document.activeElement as HTMLElement;

    // Get all focusable elements
    this.focusableElements = Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Add keyboard listener
    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    // Remove keyboard listener
    document.removeEventListener('keydown', this.handleKeyDown);

    // Restore previous focus
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };
}

/**
 * Screen reader announcer
 */
export class ScreenReaderAnnouncer {
  private liveRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegion();
  }

  private createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    
    // Clear and set message
    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }

  destroy() {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
  }
}

/**
 * Keyboard navigation helper
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onNavigate?: (newIndex: number) => void;
  } = {}
): number {
  const { orientation = 'both', loop = true, onNavigate } = options;

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
      return currentIndex;
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
    onNavigate?.(newIndex);
  }

  return newIndex;
}

/**
 * Skip to content link helper
 */
export function createSkipLink(targetId: string, text: string = 'Skip to main content'): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  return skipLink;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Get accessible label for element
 */
export function getAccessibleLabel(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent || '';
  }

  // Check associated label
  if (element instanceof HTMLInputElement) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent || '';
  }

  // Fallback to text content
  return element.textContent || '';
}

/**
 * Validate form accessibility
 */
export function validateFormAccessibility(form: HTMLFormElement): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check all inputs have labels
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const label = getAccessibleLabel(input as HTMLElement);
    if (!label) {
      errors.push(`Input missing accessible label: ${(input as HTMLElement).outerHTML.substring(0, 50)}`);
    }
  });

  // Check required fields have aria-required
  const requiredInputs = form.querySelectorAll('[required]');
  requiredInputs.forEach((input) => {
    if (!input.hasAttribute('aria-required')) {
      errors.push(`Required input missing aria-required: ${(input as HTMLElement).outerHTML.substring(0, 50)}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
