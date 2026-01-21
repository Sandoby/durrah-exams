import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OwlMascot } from './OwlMascot';

interface HeroMascotProps {
    className?: string;
}

export function HeroMascot({ className = "" }: HeroMascotProps) {
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = [
        "Welcome, Tutor! 👋",
        "Auto Grading is here! ⚡",
        "Create Secure Exams 🔒",
        "Trusted by 10k+ 🎓"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex flex-col items-center relative group ${className}`}>
            {/* Message Badge - Sleek Glass Design */}
            <div className="absolute -top-14 lg:-top-12 left-1/2 -translate-x-1/2 lg:left-auto lg:right-[-4rem] lg:translate-x-0 z-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={messageIndex}
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="relative whitespace-nowrap"
                    >
                        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-900 dark:text-white px-4 py-2 rounded-full shadow-lg border border-indigo-100/50 dark:border-indigo-900/50 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs md:text-sm font-bold tracking-tight">
                                {messages[messageIndex]}
                            </span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Static Mascot with subtle hover interaction */}
            <motion.div
                whileHover={{ scale: 1.02, rotate: 2 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative z-10 cursor-pointer filter drop-shadow-xl"
            >
                <OwlMascot
                    variant="guide"
                    className="h-32 w-32 md:h-40 md:w-40 object-contain"
                    alt="Durrah Guide"
                    width={160}
                    height={160}
                    loading="eager"
                />
            </motion.div>
        </div>
    );
}
