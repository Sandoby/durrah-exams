import { Float, GradientTexture, ContactShadows, RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';

type PremiumMaterialProps = {
    colors?: [string, string, string];
    roughness?: number;
    metalness?: number;
};

const PremiumMaterial = ({
    colors = ['#d5e4ff', '#b9d2ff', '#eef5ff'],
    roughness = 0.32,
    metalness = 0.1
}: PremiumMaterialProps) => (
    <meshStandardMaterial
        metalness={metalness}
        roughness={roughness}
        envMapIntensity={0.65}
        emissive="#ffffff"
        emissiveIntensity={0.05}
    >
        <GradientTexture stops={[0, 0.5, 1]} colors={colors} size={1024} />
    </meshStandardMaterial>
);

const ParallaxGroup = ({ children }: { children: ReactNode }) => {
    const group = useRef<THREE.Group>(null);
    const { mouse } = useThree();

    useFrame(() => {
        if (!group.current) return;
        const max = THREE.MathUtils.degToRad(5.5);
        const targetX = THREE.MathUtils.clamp(mouse.y, -1, 1) * max;
        const targetY = THREE.MathUtils.clamp(mouse.x, -1, 1) * max;

        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.08);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.08);
    });

    return <group ref={group}>{children}</group>;
};

const Blob = () => {
    const mesh = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!mesh.current) return;
        const t = state.clock.elapsedTime * 0.28;
        mesh.current.position.y = Math.sin(t) * 0.18;
        mesh.current.position.x = Math.cos(t * 0.72) * 0.14;
        mesh.current.rotation.y += 0.0018;
    });

    return (
        <mesh ref={mesh} scale={[2.75, 2.45, 2.9]} castShadow receiveShadow>
            <icosahedronGeometry args={[1.45, 5]} />
            <PremiumMaterial colors={['#d9e7ff', '#b7cdfc', '#f5f8ff']} roughness={0.36} metalness={0.12} />
        </mesh>
    );
};

const Paper = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1
}: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}) => (
    <Float speed={0.38} rotationIntensity={0.18} floatIntensity={0.26}>
        <RoundedBox
            args={[1.6 * scale, 2.25 * scale, 0.04]}
            position={position}
            rotation={rotation}
            radius={0.14 * scale}
            smoothness={8}
            castShadow
            receiveShadow
        >
            <PremiumMaterial colors={['#f9fbff', '#e9f1ff', '#ffffff']} roughness={0.28} metalness={0.06} />
        </RoundedBox>
    </Float>
);

const ProgressRing = () => {
    const ring = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!ring.current) return;
        ring.current.rotation.z = state.clock.elapsedTime * 0.18;
    });

    return (
        <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} position={[2.2, 0.3, -0.35]} castShadow>
            <torusGeometry args={[0.72, 0.08, 64, 140, Math.PI * 1.75]} />
            <PremiumMaterial colors={['#b0cbff', '#c8dcff', '#e1ebff']} roughness={0.22} metalness={0.08} />
        </mesh>
    );
};

const Checkmark = () => (
    <mesh position={[-2.1, -0.35, 0.32]} rotation={[0, 0, -0.35]} castShadow>
        <tubeGeometry
            args={[
                new THREE.CatmullRomCurve3([
                    new THREE.Vector3(-0.4, 0.05, 0),
                    new THREE.Vector3(-0.15, -0.25, 0),
                    new THREE.Vector3(0.35, 0.34, 0)
                ]),
                42,
                0.055,
                10,
                false
            ]}
        />
        <PremiumMaterial colors={['#9fc1ff', '#c1d7ff', '#e4efff']} roughness={0.22} metalness={0.08} />
    </mesh>
);

const TimerDisc = () => (
    <mesh position={[0.1, 1.9, -0.45]} rotation={[Math.PI / 2.25, 0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.1, 64, 1]} />
        <PremiumMaterial colors={['#dbe8ff', '#c7daff', '#f2f6ff']} roughness={0.28} metalness={0.08} />
        <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.024, 0.5, 0.07]} />
            <PremiumMaterial colors={['#8fb5ff', '#b4d0ff', '#e1ecff']} roughness={0.24} metalness={0.1} />
        </mesh>
    </mesh>
);

const BaseGlow = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
        <cylinderGeometry args={[4.8, 4.8, 0.01, 64]} />
        <meshBasicMaterial color="#e6efff" transparent opacity={0.45} />
    </mesh>
);

const HeroScene = () => {
    const { size } = useThree();
    const isMobile = size.width < 768;

    const elements = useMemo(() => {
        if (isMobile) {
            return (
                <>
                    <Blob />
                    <Paper position={[0.5, -0.45, -0.35]} rotation={[0.08, 0.24, -0.06]} scale={0.92} />
                    <ProgressRing />
                </>
            );
        }

        return (
            <>
                <Blob />
                <Paper position={[0.72, -0.52, -0.32]} rotation={[0.12, 0.3, -0.08]} />
                <Paper position={[-0.95, 0.36, -0.52]} rotation={[-0.14, -0.22, 0.12]} scale={0.84} />
                <ProgressRing />
                <Checkmark />
                <TimerDisc />
            </>
        );
    }, [isMobile]);

    return (
        <>
            <ParallaxGroup>
                {elements}
                <BaseGlow />
            </ParallaxGroup>
            <ContactShadows
                opacity={0.25}
                width={12}
                height={12}
                blur={3.4}
                far={14}
                resolution={256}
                color="#9bb4d9"
            />
        </>
    );
};

export default HeroScene;
