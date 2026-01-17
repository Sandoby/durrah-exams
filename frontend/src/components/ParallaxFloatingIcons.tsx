import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';
import {
    PencilCircle,
    Calculator,
    Flask,
    GlobeHemisphereWest,
    Atom,
    Brain,
    Exam,
    GraduationCap,
    ChartPieSlice,
    Books
} from '@phosphor-icons/react';

export function ParallaxFloatingIcons() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

    // Create varying speeds for depth effect
    const y1 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -200]), springConfig);
    const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -400]), springConfig);
    const y3 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -100]), springConfig);
    const rotate1 = useSpring(useTransform(scrollYProgress, [0, 1], [0, 45]), springConfig);
    const rotate2 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -45]), springConfig);

    const icons = [
        { Icon: PencilCircle, size: 48, top: '10%', left: '5%', color: 'text-blue-500', opacity: 0.1, y: y1 },
        { Icon: Calculator, size: 64, top: '20%', right: '8%', color: 'text-indigo-500', opacity: 0.08, y: y2 },
        { Icon: Flask, size: 56, top: '40%', left: '8%', color: 'text-purple-500', opacity: 0.09, y: y3 },
        { Icon: GlobeHemisphereWest, size: 80, top: '55%', right: '5%', color: 'text-sky-500', opacity: 0.07, y: y1 },
        { Icon: Atom, size: 40, top: '70%', left: '15%', color: 'text-amber-500', opacity: 0.1, y: y2 },
        { Icon: Brain, size: 72, top: '85%', right: '12%', color: 'text-pink-500', opacity: 0.08, y: y3 },
        { Icon: Exam, size: 52, top: '30%', left: '45%', color: 'text-slate-500', opacity: 0.05, y: y3 }, // Center-ish
        { Icon: GraduationCap, size: 96, top: '15%', right: '40%', color: 'text-emerald-500', opacity: 0.06, y: y1 },
        { Icon: ChartPieSlice, size: 44, top: '65%', left: '40%', color: 'text-red-400', opacity: 0.08, y: y2 },
        { Icon: Books, size: 60, top: '90%', left: '50%', color: 'text-cyan-500', opacity: 0.09, y: y1 },
    ];

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {icons.map((item, index) => (
                <motion.div
                    key={index}
                    style={{
                        position: 'absolute',
                        top: item.top,
                        left: item.left,
                        right: item.right,
                        y: item.y,
                        rotate: index % 2 === 0 ? rotate1 : rotate2
                    }}
                    className={`${item.color} filter blur-[1px]`}
                >
                    <item.Icon
                        weight="duotone"
                        size={item.size}
                        style={{ opacity: item.opacity }}
                    />
                </motion.div>
            ))}
        </div>
    );
}
