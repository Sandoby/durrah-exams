import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

export default function NotFound() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isRTL = i18n.language === 'ar';

    return (
        <div
            className="min-h-screen bg-white dark:bg-[#000000] flex flex-col justify-between font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 relative"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Top Logo (Centered & Large) */}
            <div className="w-full flex items-center justify-center z-10 pt-16">
                <div className="w-48 sm:w-64">
                    <Logo />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full px-4 sm:px-6 z-10 animate-in fade-in duration-1000 slide-in-from-bottom-4">

                <h1 className="text-[10rem] leading-none sm:text-[14rem] font-semibold tracking-tighter text-blue-800 dark:text-blue-600 mb-2">
                    404
                </h1>

                <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 mt-4 mb-3">
                    {t('notFound.title', 'Page Not Found')}
                </h2>

                <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-10 font-normal">
                    {t('notFound.subtitle', "The page you're looking for doesn't exist or has been moved.")}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
                    <button
                        onClick={() => navigate(user ? '/dashboard' : '/')}
                        className="w-full sm:w-auto flex items-center justify-center px-10 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full font-medium text-[15px] hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors duration-200"
                    >
                        {user ? t('nav.goToDashboard', 'Go to Dashboard') : t('notFound.goHome', 'Go to Homepage')}
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto flex items-center justify-center px-10 py-4 bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-white rounded-full font-medium text-[15px] hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors duration-200"
                    >
                        {t('notFound.goBack', 'Go Back')}
                    </button>
                </div>
            </div>

            {/* Footer Links */}
            <div className="w-full flex justify-center items-center gap-8 pb-12 pt-8 z-10 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <Link to="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                    {t('footer.legal.privacy', 'Privacy Policy')}
                </Link>
                <Link to="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                    {t('footer.legal.terms', 'Terms of Service')}
                </Link>
            </div>

            {/* Subtle background glow/noise (Apple style refined backdrop) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-zinc-50 dark:bg-zinc-900/20 rounded-full blur-3xl opacity-50 mix-blend-multiply dark:mix-blend-screen" />
            </div>
        </div>
    );
}
