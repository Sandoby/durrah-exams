import React from 'react';

type LottieProps = {
    src?: string;
    background?: string;
    speed?: number | string;
    autoplay?: boolean;
    loop?: boolean;
    className?: string;
    style?: React.CSSProperties;
};

export function LottiePlayer(props: LottieProps) {
    const { className, style, ...rest } = props;

    React.useEffect(() => {
        const scriptId = 'lottie-player-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    // Render the web component via React.createElement to bypass JSX intrinsic typing
    return React.createElement('lottie-player', { class: className, style, ...rest });
}
