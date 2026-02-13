import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CaretDown,
    Medal,
    X,
    Layout,
    List
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { Logo } from '../Logo';

export function Navbar() {
    const { t, i18n } = useTranslation();
    const { user, loading, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const isRTL = i18n.language === 'ar';
    const userDisplayLabel = user?.email ? user.email.split('@')[0] : '';
    const userInitial = userDisplayLabel ? userDisplayLabel.charAt(0).toUpperCase() : user?.email?.[0]?.toUpperCase();

    // Handle scroll for dynamic background
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navLinks = [
        { name: t('nav.features'), href: '#features' },
        { name: t('nav.pricing'), href: '#pricing' },
        { name: t('nav.testimonials'), href: '#testimonials' },
        { name: t('nav.blog', 'Blog'), href: '/blog', isInternal: true },
    ];

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                ? 'py-3 px-4 sm:px-6 lg:px-8'
                : 'py-6 px-4 sm:px-6 lg:px-8'
                }`}>
                <div className={`max-w-7xl mx-auto transition-all duration-500 rounded-2xl ${scrolled
                    ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg shadow-slate-200/20 dark:shadow-black/20'
                    : 'bg-white/20 dark:bg-slate-900/10 backdrop-blur-sm border border-transparent'
                    }`}>
                    <div className="px-6 py-2">
                        <div className="flex justify-between items-center">
                            {/* Logo */}
                            <Link to="/" className="flex items-center gap-2.5 group transition-transform hover:scale-105">
                                <Logo size="sm" showText={false} />
                                <div className="flex flex-col">
                                    <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Durrah</span>
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter leading-none">{t('common.forTutors')}</span>
                                </div>
                            </Link>

                            {/* Desktop Navigation */}
                            <div className="hidden lg:flex items-center gap-1">
                                {navLinks.map((link) => (
                                    link.isInternal ? (
                                        <Link
                                            key={link.name}
                                            to={link.href}
                                            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            {link.name}
                                        </Link>
                                    ) : (
                                        <a
                                            key={link.name}
                                            href={link.href}
                                            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            {link.name}
                                        </a>
                                    )
                                ))}

                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />

                                <LanguageSwitcher />

                                <div className="flex items-center gap-3 ml-4">
                                    {!loading && user ? (
                                        <div className="relative" ref={userDropdownRef}>
                                            <button
                                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                                className="group flex items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white/80 px-2.5 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                                            >
                                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-[11px] font-semibold text-white shadow-[0_8px_18px_-12px_rgba(79,70,229,0.85)]">
                                                    {userInitial}
                                                </div>
                                                <span className="max-w-[132px] truncate text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-100">
                                                    {userDisplayLabel || user.email}
                                                </span>
                                                <CaretDown weight="bold" className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-500 dark:group-hover:text-slate-300 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {userDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-2 z-[60]`}
                                                    >
                                                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
                                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">{t('nav.signedInAs', 'Account')}</p>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
                                                        </div>
                                                        <Link to="/dashboard" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                                <Layout weight="duotone" className="w-4 h-4" />
                                                            </div>
                                                            {t('nav.goToDashboard', 'Dashboard')}
                                                        </Link>
                                                        <Link to="/settings" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                                <Medal weight="duotone" className="w-4 h-4" />
                                                            </div>
                                                            {t('nav.settings', 'Settings')}
                                                        </Link>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2" />
                                                        <button
                                                            onClick={() => { setUserDropdownOpen(false); signOut(); }}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                                                                <X className="w-4 h-4" />
                                                            </div>
                                                            {t('nav.signOut', 'Sign Out')}
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <>
                                            <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors px-4 py-2">
                                                {t('nav.login')}
                                            </Link>
                                            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                                {t('nav.getStarted')}
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                                {mobileMenuOpen ? <X weight="bold" className="w-6 h-6" /> : <List weight="bold" className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[55]"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className={`fixed top-24 ${isRTL ? 'left-4' : 'right-4'} w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl z-[60] border border-slate-200 dark:border-slate-800 overflow-hidden font-sans`}
                        >
                            <div className="p-6">
                                <div className="space-y-1 mb-8">
                                    {navLinks.map((link) => (
                                        link.isInternal ? (
                                            <Link
                                                key={link.name}
                                                to={link.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block py-4 px-5 text-lg font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                            >
                                                {link.name}
                                            </Link>
                                        ) : (
                                            <a
                                                key={link.name}
                                                href={link.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block py-4 px-5 text-lg font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                            >
                                                {link.name}
                                            </a>
                                        )
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center justify-between mb-8 px-5">
                                        <span className="text-sm font-bold text-slate-400">{t('common.language', 'Language')}</span>
                                        <LanguageSwitcher />
                                    </div>

                                    {!loading && user ? (
                                        <div className="space-y-3">
                                            <div className="py-4 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[1.5rem] mb-4">
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5">{t('nav.signedInAs', 'Logged in as')}</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user.email}</p>
                                            </div>
                                            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20">
                                                <Layout weight="duotone" className="w-5 h-5" />
                                                {t('nav.goToDashboard', 'Go to Dashboard')}
                                            </Link>
                                            <button
                                                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                                                className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-bold border border-red-100 dark:border-red-900/10"
                                            >
                                                {t('nav.signOut', 'Sign Out')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center py-4 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 rounded-2xl">
                                                {t('nav.login')}
                                            </Link>
                                            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20">
                                                {t('nav.getStarted')}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
