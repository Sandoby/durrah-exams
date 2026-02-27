import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import HeroScene from './HeroScene';

const Hero3DBackground = () => {
    const dpr = useMemo<[number, number]>(() => {
        if (typeof window === 'undefined') return [1, 1.5];
        return window.innerWidth < 768 ? [1, 1.25] : [1, 1.5];
    }, []);

    const eventSource = useMemo(
        () => (typeof document !== 'undefined' ? document.documentElement : undefined),
        []
    );

    return (
        <div className="hero-3d-wrapper">
            <Canvas
                shadows
                gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
                dpr={dpr}
                frameloop="always"
                eventSource={eventSource}
                eventPrefix="client"
                camera={{ position: [0, 0, 6], fov: 30 }}
                onCreated={({ gl }) => {
                    gl.setClearColor(0x000000, 0);
                }}
            >
                <ambientLight intensity={0.55} />
                <directionalLight
                    position={[2.6, 3.2, 4]}
                    intensity={1}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-radius={8}
                />
                <directionalLight position={[-3.5, -1.5, -2]} intensity={0.25} color="#c8dbff" />

                <Suspense fallback={null}>
                    <HeroScene />
                    <Environment preset="city" blur={0.85} />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default Hero3DBackground;
