import { useEffect, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

interface LottiePlayerProps {
    animationPath: string;
    className?: string;
    loop?: boolean;
    autoplay?: boolean;
}

export function LottiePlayer({ animationPath, className = '', loop = true, autoplay = true }: LottiePlayerProps) {
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [animationData, setAnimationData] = useState<any>(null);

    useEffect(() => {
        fetch(animationPath)
            .then(response => response.json())
            .then(data => setAnimationData(data))
            .catch(error => console.error('Error loading Lottie animation:', error));
    }, [animationPath]);

    if (!animationData) {
        return <div className={`${className} animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg`}></div>;
    }

    return (
        <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={loop}
            autoplay={autoplay}
            className={className}
        />
    );
}
