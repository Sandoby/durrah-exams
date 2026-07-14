import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
    name: string;
    email: string;
    category: string;
    message: string;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    const [form, setForm] = useState<FormData>({
        name: '', email: '', category: 'general', message: ''
    });
    const [status, setStatus] = useState<FormStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const categories = [
        { value: 'general', label: t('contact.form.categories.general', 'General Question') },
        { value: 'billing', label: t('contact.form.categories.billing', 'Billing & Subscription') },
        { value: 'technical', label: t('contact.form.categories.technical', 'Technical Support') },
        { value: 'feature', label: t('contact.form.categories.feature', 'Feature Request') },
        { value: 'other', label: t('contact.form.categories.other', 'Other') },
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

        setStatus('submitting');
        setErrorMsg('');

        try {
            const { error: dbError } = await supabase
                .from('contact_messages')
                .insert([{
                    name: form.name.trim(),
                    email: form.email.trim(),
                    subject: form.category,
                    category: form.category,
                    message: form.message.trim(),
                    status: 'new',
                    created_at: new Date().toISOString(),
                }]);

            if (dbError) {
                throw new Error(dbError.message);
            }

            setStatus('success');
            setForm({ name: '', email: '', category: 'general', message: '' });
        } catch (err: any) {
            console.error('Contact submit error:', err);
            setErrorMsg(t('contact.form.errorFallback', 'Something went wrong. Please email us directly at info@durrahtutors.com'));
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div 
                className="relative w-full max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl text-zinc-900 dark:text-zinc-100 transition-all duration-300 animate-in zoom-in-95"
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {t('contact.hero.title', 'Contact Us')}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                        {t('contact.hero.subtitle', 'Send a direct message to our support team.')}
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">
                            {t('contact.form.successTitle', 'Message Sent!')}
                        </h4>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-xs mb-6">
                            {t('contact.form.successSubtitle', 'We\'ve received your message and will reply within 24 hours.')}
                        </p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {t('contact.form.sendAnother', 'Send another message')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1" htmlFor="modal-contact-name">
                                {t('contact.form.name', 'Full Name')} <span className="text-rose-400">*</span>
                            </label>
                            <input
                                id="modal-contact-name"
                                name="name"
                                type="text"
                                required
                                value={form.name}
                                onChange={handleChange}
                                placeholder={t('contact.form.namePlaceholder', 'Ahmed Elsaid')}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1" htmlFor="modal-contact-email">
                                {t('contact.form.email', 'Email Address')} <span className="text-rose-400">*</span>
                            </label>
                            <input
                                id="modal-contact-email"
                                name="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="ahmed@example.com"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1" htmlFor="modal-contact-category">
                                {t('contact.form.category', 'Topic')}
                            </label>
                            <select
                                id="modal-contact-category"
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="w-full bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs outline-none transition-all cursor-pointer"
                            >
                                {categories.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1" htmlFor="modal-contact-message">
                                {t('contact.form.message', 'Message')} <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                id="modal-contact-message"
                                name="message"
                                required
                                rows={4}
                                value={form.message}
                                onChange={handleChange}
                                placeholder={t('contact.form.messagePlaceholder', 'Tell us how we can help you...')}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-lg px-3 py-2 text-xs outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Error */}
                        {status === 'error' && (
                            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                <p className="text-rose-600 dark:text-rose-400 text-[11px]">{errorMsg}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={status === 'submitting' || !form.name || !form.email || !form.message}
                                className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'submitting' ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('contact.form.sending', 'Sending...')}
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        {t('contact.form.send', 'Send Message')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
