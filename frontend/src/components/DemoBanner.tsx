import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, LogOut } from 'lucide-react';

interface DemoBannerProps {
    scenario?: string;
}

export function DemoBanner({ scenario }: DemoBannerProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const exitDemo = () => {
        localStorage.removeItem('demoMode');
        localStorage.removeItem('demoScenario');
        navigate('/register');
    };

    return (
        <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 text-white shadow-xl border-b border-white/10"
        >
            <div className="max-w-7xl mx-auto px-4 py-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-indigo-600/20 px-3 py-1 rounded-md border border-indigo-500/30">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">{t('demo.mode', 'Sandbox Mode')}</span>
                        </div>
                        {scenario && (
                            <div className="h-4 w-px bg-white/10 hidden md:block" />
                        )}
                        {scenario && (
                            <span className="text-sm font-medium text-slate-400 hidden md:inline">
                                {t('demo.activeModule', 'Active Module')}: <span className="text-white font-semibold">{scenario}</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/demo"
                            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            {t('demo.hub', 'Hub')}
                        </Link>
                        <button
                            onClick={exitDemo}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-lg active:scale-95"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            {t('demo.exitAndSignUp', 'Commit & Sign Up')}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
