import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Share2, FileText, BarChart3, Edit, Trash2, Power, Eye,
    MoreVertical, TrendingUp, Lock, Clock, Crown
} from 'lucide-react';
import { CONVEX_FEATURES } from '../../main';
import { PremiumFeatureModal } from './PremiumFeatureModal';
import { useState } from 'react';
import { hasActiveAccess } from '../../lib/subscriptionUtils';


interface Exam {
    id: string;
    title: string;
    description: string;
    created_at: string;
    is_active: boolean;
    quiz_code?: string | null;
    tutor_id?: string;
    proctoring_enabled?: boolean;
}

interface ImprovedExamCardProps {
    exam: Exam;
    index: number;
    profile: any;
    onToggleStatus: (id: string, currentStatus: boolean, e: React.MouseEvent) => void;
    onCopyLink: (id: string) => void;
    onDownloadPDF: (id: string) => void;
    onDelete: (id: string) => void;
    showTour?: boolean;
}

export function ImprovedExamCard({
    exam,
    index,
    profile,
    onToggleStatus,
    onCopyLink,
    onDownloadPDF,
    onDelete,
    showTour
}: ImprovedExamCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [premiumModal, setPremiumModal] = useState<{ isOpen: boolean; feature: 'analytics' | 'proctoring' }>({
        isOpen: false,
        feature: 'analytics'
    });


    return (
        <div
            data-tour={showTour && index === 0 ? "exam-card" : undefined}
            className="group bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
            {/* Status Indicator Stripe */}
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${exam.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />

            <div className="p-6 pl-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            {exam.is_active ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800 uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 uppercase tracking-wide">
                                    Inactive
                                </span>
                            )}
                            {exam.proctoring_enabled && CONVEX_FEATURES.proctoring && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-100 dark:border-teal-800 uppercase tracking-wide">
                                    <Eye className="w-3 h-3 mr-1" />
                                    Proctored
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {exam.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">
                            {exam.description}
                        </p>
                    </div>

                    {/* Quick Actions Menu */}
                    <div className="relative group/menu">
                        <button className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-20 overflow-hidden transform origin-top-right">
                            <button
                                onClick={(e) => onToggleStatus(exam.id, exam.is_active, e)}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <Power className="w-4 h-4" />
                                {exam.is_active ? t('dashboard.status.deactivate', 'Deactivate') : t('dashboard.status.activate', 'Activate')}
                            </button>
                            <button
                                onClick={() => onCopyLink(exam.id)}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                {t('dashboard.actions.copyLink', 'Share Link')}
                            </button>
                            <button
                                onClick={() => onDownloadPDF(exam.id)}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                {t('dashboard.actions.print', 'Print PDF')}
                            </button>
                            <Link
                                to={`/exam/${exam.id}/edit`}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                {t('dashboard.actions.edit', 'Edit Exam')}
                            </Link>
                            <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
                            <button
                                onClick={() => onDelete(exam.id)}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('dashboard.actions.delete', 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-4 mb-6 text-xs font-medium text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(exam.created_at).toLocaleDateString()}
                    </div>
                    {exam.quiz_code && (
                        <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                {exam.quiz_code}
                            </span>
                        </div>
                    )}
                </div>

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate(`/exam/${exam.id}/results`)}
                        data-tour={showTour && index === 0 ? "results" : undefined}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
                    >
                        <BarChart3 className="w-4 h-4" />
                        {t('dashboard.actions.results', 'Results')}
                    </button>

                    <button
                        onClick={() => {
                            if (hasActiveAccess(profile?.subscription_status)) {
                                navigate(`/exam/${exam.id}/analytics`);
                            } else {
                                setPremiumModal({ isOpen: true, feature: 'analytics' });
                            }
                        }}
                        className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${hasActiveAccess(profile?.subscription_status)
                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                            : 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 border-gray-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                            }`}
                    >
                        {!hasActiveAccess(profile?.subscription_status) && (
                            <div className="absolute -top-2.5 -right-1.5 z-20">
                                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
                                    <Crown className="w-2.5 h-2.5" />
                                    PRO
                                </div>
                            </div>
                        )}
                        {hasActiveAccess(profile?.subscription_status) ? (
                            <TrendingUp className="w-4 h-4" />
                        ) : (
                            <Lock className="w-4 h-4" />
                        )}
                        {t('dashboard.actions.analytics', 'Stats')}
                    </button>

                    {CONVEX_FEATURES.proctoring && (
                        <button
                            onClick={() => {
                                if (hasActiveAccess(profile?.subscription_status)) {
                                    navigate(`/exam/${exam.id}/proctor`);
                                } else {
                                    setPremiumModal({ isOpen: true, feature: 'proctoring' });
                                }
                            }}
                            className={`relative col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${hasActiveAccess(profile?.subscription_status)
                                ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30'
                                : 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 border-gray-100 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
                                }`}
                        >
                            {!hasActiveAccess(profile?.subscription_status) && (
                                <div className="absolute -top-2.5 -right-1.5 z-20">
                                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
                                        <Crown className="w-2.5 h-2.5" />
                                        PRO
                                    </div>
                                </div>
                            )}
                            {hasActiveAccess(profile?.subscription_status) ? (
                                <Eye className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            {t('dashboard.actions.proctor', 'Live Monitoring')}
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Feature Modal */}
            <PremiumFeatureModal
                isOpen={premiumModal.isOpen}
                onClose={() => setPremiumModal({ ...premiumModal, isOpen: false })}
                feature={premiumModal.feature}
            />
        </div>
    );
}
