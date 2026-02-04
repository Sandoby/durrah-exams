import { useEffect, useState } from 'react';

interface ReadingProgressBarProps {
    color?: string;
}

export function ReadingProgressBar({ color }: ReadingProgressBarProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setProgress(Math.min(scrollPercent, 100));
        };

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        return () => window.removeEventListener('scroll', updateProgress);
    }, []);

    return (
        <div
            className="blog-reading-progress"
            style={{
                transform: `scaleX(${progress / 100})`,
                background: color || 'var(--blog-text-primary)'
            }}
        />
    );
}
