import { motion } from 'framer-motion';
import { DeviceMobile, GlobeHemisphereWest, Lightning, ShieldCheck } from '@phosphor-icons/react';

export function PlatformHighlights() {
    return (
        <div className="w-full py-16 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "High Availability", value: "99.9% Uptime", icon: GlobeHemisphereWest, color: "text-indigo-500" },
                        { label: "Security", value: "SSL Encrypted", icon: ShieldCheck, color: "text-emerald-500" },
                        { label: "Global Reach", value: "Any Device", icon: DeviceMobile, color: "text-purple-500" },
                        { label: "Reporting", value: "Instant Result", icon: Lightning, color: "text-yellow-500" },
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.4)] p-5"
                        >
                            <div className={`h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${stat.color}`}>
                                <stat.icon weight="duotone" className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {stat.label}
                                </div>
                                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {stat.value}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
