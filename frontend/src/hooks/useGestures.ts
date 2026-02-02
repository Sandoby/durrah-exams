import { useEffect, useRef } from 'react';

interface GestureHandlers {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onDoubleTap?: () => void;
    onShake?: () => void;
}

export const useGestures = (
    ref: React.RefObject<HTMLElement | null>,
    handlers: GestureHandlers
) => {
    const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const lastTap = useRef<number>(0);
    const lastShake = useRef<number>(0);

    // Shake detection thresholds
    const SHAKE_THRESHOLD = 15;
    const SHAKE_TIMEOUT = 1000;

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleTouchStart = (e: TouchEvent) => {
            touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStart.current) return;

            const touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY,
                time: Date.now()
            };

            const deltaX = touchEnd.x - touchStart.current.x;
            const deltaY = touchEnd.y - touchStart.current.y;
            const deltaTime = touchEnd.time - touchStart.current.time;

            // Swipe Detection (min 50px movement, max 500ms duration)
            if (deltaTime < 500) {
                if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX > 0 && handlers.onSwipeRight) handlers.onSwipeRight();
                    if (deltaX < 0 && handlers.onSwipeLeft) handlers.onSwipeLeft();
                } else if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
                    // Prevent default pull-to-refresh if swipe down handler exists
                    if (deltaY > 0 && handlers.onSwipeDown) {
                        // e.preventDefault(); // Optional: careful with blocking scrolling
                        handlers.onSwipeDown();
                    }
                    if (deltaY < 0 && handlers.onSwipeUp) handlers.onSwipeUp();
                }
            }

            // Double Tap Detection
            const currentTime = Date.now();
            const tapGap = currentTime - lastTap.current;
            if (tapGap < 300 && tapGap > 0 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                if (handlers.onDoubleTap) handlers.onDoubleTap();
            }
            lastTap.current = currentTime;

            touchStart.current = null;
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [ref, handlers]);

    // Shake Detection
    useEffect(() => {
        if (!handlers.onShake) return;

        let lastX = 0, lastY = 0, lastZ = 0;

        const handleMotion = (e: DeviceMotionEvent) => {
            const current = e.accelerationIncludingGravity;
            if (!current) return;

            const { x = 0, y = 0, z = 0 } = current;
            if (!x || !y || !z) return;

            const now = Date.now();
            if ((now - lastShake.current) > SHAKE_TIMEOUT) {
                const deltaX = Math.abs(lastX - x);
                const deltaY = Math.abs(lastY - y);
                const deltaZ = Math.abs(lastZ - z);

                if ((deltaX + deltaY + deltaZ) / 3 > SHAKE_THRESHOLD) {
                    handlers.onShake?.();
                    lastShake.current = now;
                }
            }

            lastX = x;
            lastY = y;
            lastZ = z;
        };

        // Check if DeviceMotionEvent is defined (desktop may not have it)
        if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
            // Request permission for iOS 13+ if needed (usually needs user gesture, handled separately)
            window.addEventListener('devicemotion', handleMotion, true);
        }

        return () => {
            if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
                window.removeEventListener('devicemotion', handleMotion, true);
            }
        };
    }, [handlers.onShake]);
};
