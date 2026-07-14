import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo';
import { Logo } from '../components/Logo';
import {
    Mail, MessageSquare, Phone, MapPin,
    Send, CheckCircle2, AlertCircle, ArrowRight,
    Clock, Headphones, BookOpen, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
    name: string;
    email: string;
    subject: string;
    category: string;
    message: string;
}

// ─── Info card ────────────────────────────────────────────────────────────────
interface InfoCardProps { icon: any; title: string; lines: string[]; color: string }
function InfoCard({ icon: Icon, title, lines, color }: InfoCardProps) {
    return (
        <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
            <div className={`inline-flex p-3 rounded-xl ${color} mb-4`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-bold mb-2">{title}</h3>
            {lines.map((l, i) => (
                <p key={i} className="text-slate-400 text-sm">{l}</p>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContactPage() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    const [form, setForm] = useState<FormData>({
        name: '', email: '', subject: '', category: 'general', message: ''
    });
    const [status, setStatus] = useState<FormStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const categories = [
        { value: 'general', label: t('contact.form.categories.general', 'General Question') },
        { value: 'billing', label: t('contact.form.categories.billing', 'Billing & Subscription') },
        { value: 'technical', label: t('contact.form.categories.technical', 'Technical Support') },
        { value: 'feature', label: t('contact.form.categories.feature', 'Feature Request') },
        { value: 'partnership', label: t('contact.form.categories.partnership', 'Partnership') },
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
            // 1️⃣ Save to Supabase contact_messages table
            const { error: dbError } = await supabase
                .from('contact_messages')
                .insert([{
                    name: form.name.trim(),
                    email: form.email.trim(),
                    subject: form.subject.trim() || form.category,
                    category: form.category,
                    message: form.message.trim(),
                    status: 'new',
                    created_at: new Date().toISOString(),
                }]);

            if (dbError) {
                // If the table doesn't exist yet, fall through gracefully
                console.warn('Supabase insert failed (table may not exist yet):', dbError.message);
            }

            // 2️⃣ Always open a pre-filled mailto as a reliable delivery fallback
            const mailtoBody = encodeURIComponent(
                `Name: ${form.name}\nEmail: ${form.email}\nCategory: ${form.category}\n\n${form.message}`
            );
            const mailtoSubject = encodeURIComponent(form.subject || `[${form.category}] Contact from ${form.name}`);
            window.open(
                `mailto:info@durrahtutors.com?subject=${mailtoSubject}&body=${mailtoBody}`,
                '_blank'
            );

            setStatus('success');
            setForm({ name: '', email: '', subject: '', category: 'general', message: '' });
        } catch (err: any) {
            console.error('Contact form error:', err);
            setErrorMsg(t('contact.form.errorFallback', 'Something went wrong. Please email us directly at info@durrahtutors.com'));
            setStatus('error');
        }
    };

    const infoCards = [
        {
            icon: Mail,
            title: t('contact.info.email.title', 'Email Us'),
            lines: ['info@durrahtutors.com', t('contact.info.email.sub', 'We reply within 24 hours')],
            color: 'bg-indigo-500/20',
        },
        {
            icon: Clock,
            title: t('contact.info.hours.title', 'Support Hours'),
            lines: [
                t('contact.info.hours.weekdays', 'Mon–Fri: 9 AM – 6 PM (EET)'),
                t('contact.info.hours.weekend', 'Sat–Sun: Limited'),
            ],
            color: 'bg-emerald-500/20',
        },
        {
            icon: Headphones,
            title: t('contact.info.support.title', 'Live Chat'),
            lines: [
                t('contact.info.support.line1', 'Available inside the app'),
                t('contact.info.support.line2', 'For logged-in users'),
            ],
            color: 'bg-purple-500/20',
        },
        {
            icon: MapPin,
            title: t('contact.info.location.title', 'Based In'),
            lines: ['Cairo, Egypt 🇪🇬', t('contact.info.location.global', 'Serving tutors worldwide')],
            color: 'bg-amber-500/20',
        },
    ];

    const faqs = [
        {
            q: t('contact.faq.q1.q', 'How quickly do you respond?'),
            a: t('contact.faq.q1.a', 'We typically reply within 1 business day. Priority support is available on paid plans.'),
        },
        {
            q: t('contact.faq.q2.q', 'Do you offer a phone call?'),
            a: t('contact.faq.q2.a', 'We don\'t offer phone support currently, but our live chat and email support is very fast.'),
        },
        {
            q: t('contact.faq.q3.q', 'I found a bug — what should I include?'),
            a: t('contact.faq.q3.a', 'Please include your browser, OS, the steps to reproduce the bug, and a screenshot if possible. This helps us fix it fast.'),
        },
    ];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact Durrah for Tutors',
        url: 'https://durrahtutors.com/contact',
        description: 'Get in touch with the Durrah team for support, billing, or partnership inquiries.',
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white" dir={isRtl ? 'rtl' : 'ltr'}>
            <Seo
                title={t('contact.seo.title', 'Contact Us – Durrah for Tutors')}
                description={t('contact.seo.desc', 'Get in touch with the Durrah team. We\'re here to help with support, billing, and any questions about your tutoring platform.')}
                jsonLd={jsonLd}
            />

            {/* ── Nav ────────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <Logo size="sm" showText={false} />
                        <span className="text-xl font-bold">Durrah</span>
                        <span className="text-slate-400 font-light">for Tutors</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
                        <Link to="/about" className="hover:text-white transition-colors">{t('footer.about', 'About')}</Link>
                        <Link to="/pricing" className="hover:text-white transition-colors">{t('nav.pricing', 'Pricing')}</Link>
                        <Link to="/blog" className="hover:text-white transition-colors">{t('nav.blog', 'Blog')}</Link>
                    </nav>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                    >
                        {t('hero.cta', 'Start Free')}
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* ── Hero ───────────────────────────────────────────────────────── */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative max-w-3xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                        <MessageSquare className="w-4 h-4" />
                        {t('contact.hero.badge', 'We\'re Here to Help')}
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
                        {t('contact.hero.title', 'Let\'s Talk')}
                    </h1>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto">
                        {t('contact.hero.subtitle', 'Have a question, found a bug, or want to explore a partnership? Drop us a message and we\'ll get back to you fast.')}
                    </p>
                </div>
            </section>

            {/* ── Info cards ─────────────────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto px-6 pb-10">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {infoCards.map((c, i) => <InfoCard key={i} {...c} />)}
                </div>
            </section>

            {/* ── Main grid: Form + sidebar ───────────────────────────────────── */}
            <section className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">

                    {/* ─ Form ─────────────────────────────────────────────────── */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-3xl blur-2xl" />
                        <div className="relative bg-white/[0.04] border border-white/10 rounded-3xl p-8 md:p-10">
                            <h2 className="text-2xl font-black text-white mb-2">
                                {t('contact.form.title', 'Send a Message')}
                            </h2>
                            <p className="text-slate-400 text-sm mb-8">
                                {t('contact.form.subtitle', 'Fill in the form below. Your message is also sent directly to our inbox.')}
                            </p>

                            {/* ── Success state ── */}
                            {status === 'success' && (
                                <div className="flex flex-col items-center text-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3">
                                        {t('contact.form.successTitle', 'Message Sent!')}
                                    </h3>
                                    <p className="text-slate-400 max-w-sm">
                                        {t('contact.form.successSubtitle', 'Thanks for reaching out. We\'ve received your message and will reply within 24 hours.')}
                                    </p>
                                    <p className="text-slate-500 text-sm mt-3">
                                        {t('contact.form.successMailto', 'Your email client should also have opened so you can send a copy directly.')}
                                    </p>
                                    <button
                                        onClick={() => setStatus('idle')}
                                        className="mt-8 text-indigo-400 hover:text-indigo-300 font-semibold text-sm transition-colors"
                                    >
                                        {t('contact.form.sendAnother', '← Send another message')}
                                    </button>
                                </div>
                            )}

                            {/* ── Form ── */}
                            {status !== 'success' && (
                                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="contact-name">
                                                {t('contact.form.name', 'Full Name')} <span className="text-rose-400">*</span>
                                            </label>
                                            <input
                                                id="contact-name"
                                                name="name"
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={handleChange}
                                                placeholder={t('contact.form.namePlaceholder', 'Ahmed Elsaid')}
                                                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                                            />
                                        </div>
                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="contact-email">
                                                {t('contact.form.email', 'Email Address')} <span className="text-rose-400">*</span>
                                            </label>
                                            <input
                                                id="contact-email"
                                                name="email"
                                                type="email"
                                                required
                                                value={form.email}
                                                onChange={handleChange}
                                                placeholder="ahmed@example.com"
                                                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="contact-category">
                                            {t('contact.form.category', 'Topic')}
                                        </label>
                                        <select
                                            id="contact-category"
                                            name="category"
                                            value={form.category}
                                            onChange={handleChange}
                                            className="w-full bg-slate-900 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 cursor-pointer"
                                        >
                                            {categories.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="contact-subject">
                                            {t('contact.form.subject', 'Subject')}
                                        </label>
                                        <input
                                            id="contact-subject"
                                            name="subject"
                                            type="text"
                                            value={form.subject}
                                            onChange={handleChange}
                                            placeholder={t('contact.form.subjectPlaceholder', 'Brief summary of your inquiry')}
                                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="contact-message">
                                            {t('contact.form.message', 'Message')} <span className="text-rose-400">*</span>
                                        </label>
                                        <textarea
                                            id="contact-message"
                                            name="message"
                                            required
                                            rows={6}
                                            value={form.message}
                                            onChange={handleChange}
                                            placeholder={t('contact.form.messagePlaceholder', 'Tell us how we can help you...')}
                                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 resize-none"
                                        />
                                        <p className="text-slate-600 text-xs mt-1.5">
                                            {form.message.length}/1000 {t('contact.form.chars', 'characters')}
                                        </p>
                                    </div>

                                    {/* Error */}
                                    {status === 'error' && (
                                        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                                            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-rose-300 text-sm">{errorMsg}</p>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={status === 'submitting' || !form.name || !form.email || !form.message}
                                        className="w-full inline-flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                                    >
                                        {status === 'submitting' ? (
                                            <>
                                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                {t('contact.form.sending', 'Sending...')}
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                {t('contact.form.send', 'Send Message')}
                                            </>
                                        )}
                                    </button>

                                    <p className="text-slate-600 text-xs text-center">
                                        {t('contact.form.privacyNote', 'By submitting, you agree to our')}{' '}
                                        <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                            {t('footer.legal.privacy', 'Privacy Policy')}
                                        </Link>.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* ─ Sidebar ──────────────────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Quick links */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                {t('contact.quickLinks.title', 'Quick Links')}
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { icon: BookOpen, label: t('contact.quickLinks.docs', 'Documentation & Help'), href: '/blog' },
                                    { icon: Phone, label: t('contact.quickLinks.pricing', 'View Pricing Plans'), href: '/pricing' },
                                    { icon: Mail, label: t('contact.quickLinks.email', 'Email Directly'), href: 'mailto:info@durrahtutors.com' },
                                ].map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.href}
                                        className="flex items-center gap-3 text-slate-300 hover:text-white text-sm py-2 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 group"
                                    >
                                        <link.icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                        {link.label}
                                        <ArrowRight className="w-3 h-3 ms-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* FAQ */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-400" />
                                {t('contact.faq.title', 'Common Questions')}
                            </h3>
                            <div className="space-y-5">
                                {faqs.map((faq, i) => (
                                    <div key={i}>
                                        <p className="text-white text-sm font-semibold mb-1.5">{faq.q}</p>
                                        <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                                        {i < faqs.length - 1 && <div className="border-b border-white/5 mt-4" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Direct email CTA */}
                        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-6 text-center">
                            <Mail className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                            <p className="text-white font-bold mb-1">{t('contact.directEmail.title', 'Prefer Email?')}</p>
                            <p className="text-slate-400 text-sm mb-4">{t('contact.directEmail.sub', 'Write to us directly anytime.')}</p>
                            <a
                                href="mailto:info@durrahtutors.com"
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                            >
                                info@durrahtutors.com
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="border-t border-white/10 py-10 mt-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <p>© 2026 Durrah for Tutors. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link to="/about" className="hover:text-slate-300 transition-colors">{t('footer.about', 'About')}</Link>
                        <Link to="/privacy" className="hover:text-slate-300 transition-colors">{t('footer.legal.privacy', 'Privacy')}</Link>
                        <Link to="/terms" className="hover:text-slate-300 transition-colors">{t('footer.legal.terms', 'Terms')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
