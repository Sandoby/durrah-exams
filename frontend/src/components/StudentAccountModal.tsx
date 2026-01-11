import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, UserCog, GraduationCap, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface StudentAccountModalProps {
    isOpen: boolean;
    userEmail: string;
    userId: string;
    onClose: () => void;
    onConverted: () => void;
}

/**
 * Modal shown when a student account tries to login on the tutor pages.
 * Offers options to convert to tutor or go to student portal.
 */
export function StudentAccountModal({
    isOpen,
    userEmail,
    userId,
    onClose,
    onConverted
}: StudentAccountModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isConverting, setIsConverting] = useState(false);

    if (!isOpen) return null;

    const handleConvertToTutor = async () => {
        setIsConverting(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'tutor' })
                .eq('id', userId);

            if (error) throw error;

            toast.success(t('auth.messages.accountConverted', 'Account converted to Tutor! You can now create exams.'));
            onConverted();
        } catch (error: any) {
            console.error('Error converting account:', error);
            toast.error(t('auth.messages.conversionFailed', 'Failed to convert account. Please try again.'));
        } finally {
            setIsConverting(false);
        }
    };

    const handleGoToStudentPortal = async () => {
        // Sign out and redirect to student portal
        await supabase.auth.signOut();
        navigate('/student-portal');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">
                                {t('auth.studentAccount.title', 'Student Account Detected')}
                            </h2>
                            <p className="text-amber-100 text-sm mt-1">
                                {userEmail}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        {t('auth.studentAccount.description', 'This account was created as a Student account. Student accounts are for taking exams only.')}
                    </p>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            {t('auth.studentAccount.tutorInfo', 'To create and manage exams, you need a Tutor account. You can convert this account or use a different email.')}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                        <button
                            onClick={handleConvertToTutor}
                            disabled={isConverting}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                        >
                            <UserCog className="h-5 w-5" />
                            {isConverting
                                ? t('auth.studentAccount.converting', 'Converting...')
                                : t('auth.studentAccount.convertToTutor', 'Convert to Tutor Account')
                            }
                            {!isConverting && <ArrowRight className="h-4 w-4" />}
                        </button>

                        <button
                            onClick={handleGoToStudentPortal}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
                        >
                            <GraduationCap className="h-5 w-5" />
                            {t('auth.studentAccount.goToPortal', 'Go to Student Portal')}
                        </button>
                    </div>

                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                        {t('auth.studentAccount.note', 'Converting to Tutor will allow you to create exams and access all tutor features.')}
                    </p>
                </div>
            </div>
        </div>
    );
}
