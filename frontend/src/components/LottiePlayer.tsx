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
    // Render the web component via React.createElement to bypass JSX intrinsic typing
    return React.createElement('lottie-player', { class: className, style, ...rest });
}
