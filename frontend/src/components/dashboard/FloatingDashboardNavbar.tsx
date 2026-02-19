import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    LogOut, Settings, Menu, X, Crown, ArrowLeft, Users 
} from 'lucide-react';
import { Logo } from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { NotificationCenter } from '../NotificationCenter';
import { hasActiveAccess } from '../../lib/subscriptionUtils';

interface FloatingNavbarProps {
    title?: string;
    showBack?: boolean;
    backPath?: string;
    actions?: React.ReactNode;
}

export function FloatingDashboardNavbar({ title, showBack, backPath, actions }: FloatingNavbarProps) {
    const { t } = useTranslation();
    const { user, signOut, subscriptionStatus } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
            <div className="max-w-7xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-800/50 transition-all duration-300">
                <div className="flex justify-between h-16 px-6">
                    <div className="flex items-center gap-4">
                        {/* Back Button or Logo */}
                        {showBack ? (
                            <button 
                                onClick={() => backPath ? navigate(backPath) : navigate(-1)}
                                className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-400 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        ) : (
                            <Logo className="h-9 w-9" showText={false} />
                        )}

                        <div className="flex flex-col">
                            {title ? (
                                <span className="text-xl font-bold text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                    {title}
                                </span>
                            ) : (
                                <>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">Durrah</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-3">
                        {/* Custom Actions */}
                        {actions && (
                            <div className="flex items-center mr-4 border-r border-gray-200 dark:border-slate-700 pr-4">
                                {actions}
                            </div>
                        )}

                        <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px] font-medium">
                            {user?.user_metadata?.full_name || user?.email}
                        </span>

                        {!hasActiveAccess(subscriptionStatus) && (
                            <Link
                                to="/checkout"
                                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-md transition-all"
                            >
                                <Crown className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('settings.subscription.upgrade')}</span>
                            </Link>
                        )}

                        <Link
                            to="/settings"
                            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-400 transition-colors"
                            title={t('settings.title')}
                        >
                            <Settings className="h-5 w-5" />
                        </Link>

                        <NotificationCenter />
                        
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            title={t('nav.logout', 'Logout')}
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden gap-2">
                        {actions && (
                            <div className="flex items-center">
                                {actions}
                            </div>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none"
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-2 max-w-7xl mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        <div className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-t-xl">
                            {user?.user_metadata?.full_name || user?.email}
                        </div>
                        
                        <Link
                            to="/dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center px-3 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Users className="h-5 w-5 mr-3 text-gray-400" />
                            {t('nav.dashboard', 'Dashboard')}
                        </Link>

                        {!hasActiveAccess(subscriptionStatus) && (
                            <Link
                                to="/checkout"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center px-3 py-3 rounded-xl text-base font-medium text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                            >
                                <Crown className="h-5 w-5 mr-3" />
                                {t('settings.subscription.upgrade')}
                            </Link>
                        )}

                        <Link
                            to="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center px-3 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Settings className="h-5 w-5 mr-3 text-gray-400" />
                            {t('settings.title')}
                        </Link>

                        <button
                            onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                            className="flex items-center w-full px-3 py-3 rounded-xl text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            {t('nav.logout', 'Logout')}
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
