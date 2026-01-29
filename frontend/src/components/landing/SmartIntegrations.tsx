import { useState } from 'react';
import { List, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Custom Framer Motion Mobile Menu Component ---
export const MobileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden p-2 text-white hover:text-blue-400 transition-colors z-50 relative"
                aria-label="Open Menu"
            >
                <List size={28} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999]"
                        />

                        {/* Drawer Content */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 z-[1000] shadow-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-lg font-semibold text-white">Menu</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 p-6 flex flex-col gap-4">
                                {[
                                    { label: 'Features', href: '#features' },
                                    { label: 'Pricing', href: '#pricing' },
                                    { label: 'Testimonials', href: '#testimonials' },
                                    { label: 'Blog', href: '/blog' },
                                ].map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className="text-lg text-slate-300 hover:text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-all"
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </div>

                            <div className="p-6 border-t border-slate-800 space-y-3">
                                <a href="/login" className="block">
                                    <button className="w-full py-3 rounded-xl border border-slate-700 text-white hover:bg-slate-800 transition-colors font-medium">
                                        Log In
                                    </button>
                                </a>
                                <a href="/register" className="block">
                                    <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
                                        Start Free Trial
                                    </button>
                                </a>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

// Removed RoadmapTimeline - using simpler approach
export const RoadmapTimeline = () => null;
