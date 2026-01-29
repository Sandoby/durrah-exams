import { motion } from 'framer-motion';
import { Chip, Button } from "@heroui/react";
import { ShieldCheck, Brain, ChartLineUp, Lightning, CheckCircle } from '@phosphor-icons/react';

const features = [
    {
        title: 'AI Proctoring',
        desc: 'Real-time face detection and behavior analysis to prevent cheating without invading privacy.',
        icon: Brain,
        color: 'from-blue-500 to-cyan-500',
    },
    {
        title: 'Secure Browser Lock',
        desc: 'Prevents copy-paste, tab switching, and screenshots during active exam sessions.',
        icon: ShieldCheck,
        color: 'from-green-500 to-emerald-500',
    },
    {
        title: 'Instant Analytics',
        desc: 'Get detailed insights on student performance, time spent, and question difficulty.',
        icon: ChartLineUp,
        color: 'from-purple-500 to-violet-500',
    },
    {
        title: 'Auto Grading',
        desc: 'AI-powered grading for objective questions with customizable rubrics for essays.',
        icon: Lightning,
        color: 'from-orange-500 to-amber-500',
    },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        className="group relative bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all duration-300"
    >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
            <feature.icon size={24} color="white" weight="fill" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>

        {/* Hover indicator */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <CheckCircle className="w-5 h-5 text-green-400" weight="fill" />
        </div>
    </motion.div>
);

export const FeaturesGrid = () => {
    return (
        <section className="py-24 px-4 relative" id="features">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <Chip
                        variant="flat"
                        color="primary"
                        className="mb-4"
                    >
                        Features
                    </Chip>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Everything You Need for{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                            Secure Assessments
                        </span>
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        From exam creation to result analysis, Durrah Exams provides a complete solution for modern online assessments.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={feature.title} feature={feature} index={index} />
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center"
                >
                    <Button
                        size="lg"
                        color="primary"
                        variant="shadow"
                        className="font-semibold"
                    >
                        Explore All Features
                    </Button>
                </motion.div>
            </div>
        </section>
    );
};
