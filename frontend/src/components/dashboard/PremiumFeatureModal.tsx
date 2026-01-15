import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Crown, TrendingUp, Eye, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PremiumFeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: 'analytics' | 'proctoring';
}

export function PremiumFeatureModal({ isOpen, onClose, feature }: PremiumFeatureModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const content = {
        analytics: {
            title: t('premiumModal.analytics.title', 'Advanced Exam Analytics'),
            desc: t('premiumModal.analytics.desc', 'Get deep insights into student performance, question difficulty, and time distribution.'),
            icon: TrendingUp,
            color: 'from-purple-500 to-pink-600',
            benefits: [
                t('premiumModal.analytics.benefit1', 'Detailed performance reports'),
                t('premiumModal.analytics.benefit2', 'Question-by-question analysis'),
                t('premiumModal.analytics.benefit3', 'Exportable data for records')
            ]
        },
        proctoring: {
            title: t('premiumModal.proctoring.title', 'Live AI Proctoring'),
            desc: t('premiumModal.proctoring.desc', 'Monitor your exams in real-time with AI-powered tab detection and anti-cheat measures.'),
            icon: Eye,
            color: 'from-teal-500 to-cyan-600',
            benefits: [
                t('premiumModal.proctoring.benefit1', 'Real-time student monitoring'),
                t('premiumModal.proctoring.benefit2', 'Instant violation alerts'),
                t('premiumModal.proctoring.benefit3', 'Secure browser enforcement')
            ]
        }
    };

    const activeContent = content[feature];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                {/* Header with Icon */}
                <div className={`bg-gradient-to-br ${activeContent.color} p-8 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-6">
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/30">
                            <activeContent.icon className="h-10 w-10 text-white" />
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30 mb-4">
                            <Crown className="w-3 h-3" />
                            Premium Feature
                        </div>
                        <h3 className="text-3xl font-black tracking-tight">{activeContent.title}</h3>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-black/10 rounded-full blur-3xl"></div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium text-center mb-8 leading-relaxed">
                        {activeContent.desc}
                    </p>

                    <div className="space-y-4 mb-10">
                        {activeContent.benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${activeContent.color} bg-opacity-10`}>
                                    <CheckCircle2 className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                navigate('/checkout');
                                onClose();
                            }}
                            className={`w-full py-5 px-6 bg-gradient-to-r ${activeContent.color} text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group`}
                        >
                            {t('premiumModal.upgradeBtn', 'Upgrade Now')}
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 px-6 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            {t('premiumModal.cancelBtn', 'Maybe Later')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
