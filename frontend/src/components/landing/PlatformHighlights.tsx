import { motion } from 'framer-motion';
import { DeviceMobile, GlobeHemisphereWest, Lightning, ShieldCheck } from '@phosphor-icons/react';

export function PlatformHighlights() {
    return (
        <div className="w-full py-12 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
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
                            className="flex flex-col items-center md:items-start text-center md:text-left"
                        >
                            <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                                <stat.icon weight="duotone" className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</span>
                            </div>
                            <div className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200">
                                {stat.value}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
