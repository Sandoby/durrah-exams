# Modern Effects Implementation Guide

## Quick Reference for Modern Landing Page Effects

### 1. Glassmorphism Effect
**What it is**: Frosted glass appearance with backdrop blur
**CSS Implementation**:
```css
.glassmorphic {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}
```
**Use cases**: Header, cards, modals, overlays

### 2. Gradient Text Effect
**What it is**: Text with gradient color fill
**CSS Implementation**:
```css
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```
**Use cases**: Headlines, CTAs, important text

### 3. Parallax Scrolling
**What it is**: Background moves slower than foreground creating depth
**Implementation**: Use transform: translateY() based on scroll position
```javascript
const parallaxSpeed = 0.5;
element.style.transform = `translateY(${scrollY * parallaxSpeed}px)`;
```
**Use cases**: Hero backgrounds, section backgrounds, images

### 4. Scroll-Triggered Animations
**What it is**: Elements animate when they enter viewport
**Implementation**: Use Intersection Observer API
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
    }
  });
});
```
**Use cases**: Cards, sections, images, text blocks

### 5. 3D Card Tilt Effect
**What it is**: Cards tilt in 3D based on mouse position
**CSS Implementation**:
```css
.card-3d {
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}
.card-3d:hover {
  transform: perspective(1000px) rotateX(5deg) rotateY(5deg);
}
```
**Use cases**: Feature cards, testimonial cards, product cards

### 6. Magnetic Button Effect
**What it is**: Button follows cursor when nearby
**Implementation**: Calculate distance and apply transform
```javascript
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance < magneticRadius) {
  button.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px)`;
}
```
**Use cases**: Primary CTAs, important buttons

### 7. Staggered Entrance Animations
**What it is**: Elements appear one after another with delay
**CSS Implementation**:
```css
.stagger-item {
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
}
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 100ms; }
.stagger-item:nth-child(3) { animation-delay: 200ms; }
```
**Use cases**: Lists, grids, navigation items

### 8. Smooth Scroll Snap
**What it is**: Page snaps to sections when scrolling
**CSS Implementation**:
```css
.scroll-container {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}
.section {
  scroll-snap-align: start;
}
```
**Use cases**: Full-page sections, carousels

### 9. Animated Gradient Background
**What it is**: Gradient that shifts colors over time
**CSS Implementation**:
```css
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animated-gradient {
  background: linear-gradient(270deg, #667eea, #764ba2, #f093fb);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}
```
**Use cases**: Hero backgrounds, section backgrounds

### 10. Counter Animation
**What it is**: Numbers count up when entering viewport
**Implementation**: Animate from 0 to target value
```javascript
const animateCounter = (element, target, duration) => {
  let start = 0;
  const increment = target / (duration / 16);
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start);
    }
  }, 16);
};
```
**Use cases**: Statistics, metrics, testimonial counts

## Performance Best Practices

### GPU Acceleration
Use these CSS properties for smooth 60fps animations:
- `transform: translate()` instead of `left/top`
- `transform: scale()` instead of `width/height`
- `opacity` for fade effects
- `will-change: transform` for elements that will animate

### Intersection Observer
Use for scroll-triggered animations instead of scroll event listeners:
```javascript
const options = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};
const observer = new IntersectionObserver(callback, options);
```

### Reduced Motion Support
Always provide alternatives for users who prefer reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Animation Timing Guidelines

- **Micro-interactions**: 150-300ms (hover, click feedback)
- **Entrance animations**: 400-800ms (elements appearing)
- **Scroll animations**: 600-1000ms (parallax, reveals)
- **Continuous animations**: 3-15s (gradients, floating elements)

## Easing Functions

- **ease-out**: Fast start, slow end (good for entrances)
- **ease-in-out**: Smooth both ends (good for transitions)
- **cubic-bezier(0.4, 0, 0.2, 1)**: Material Design standard
- **cubic-bezier(0.34, 1.56, 0.64, 1)**: Bounce effect

## Tools & Libraries

### Recommended
- **Framer Motion**: React animation library with great DX
- **GSAP**: Professional animation library (if complex animations needed)
- **Intersection Observer API**: Native browser API for scroll detection
- **CSS Custom Properties**: For dynamic theming and animations

### Optional
- **Lottie**: For complex animated illustrations
- **Three.js**: For 3D effects (use sparingly for performance)
- **Particles.js**: For particle effects (optimize carefully)
