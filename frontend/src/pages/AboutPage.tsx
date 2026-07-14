import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo';
import { Logo } from '../components/Logo';
import {
    Target, Sparkles, Users, Globe, Shield, Zap,
    GraduationCap, Heart, ArrowRight, CheckCircle2,
    BookOpen, TrendingUp, Award, Mail
} from 'lucide-react';

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps { value: string; label: string }
function StatCard({ value, label }: StatCardProps) {
    return (
        <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 text-center hover:border-indigo-500/40 transition-all duration-300">
                <div className="text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    {value}
                </div>
                <div className="text-slate-300 text-sm font-medium">{label}</div>
            </div>
        </div>
    );
}

// ─── Value card ───────────────────────────────────────────────────────────────
interface ValueCardProps { icon: any; title: string; desc: string; color: string }
function ValueCard({ icon: Icon, title, desc, color }: ValueCardProps) {
    return (
        <div className="group relative">
            <div className={`absolute inset-0 ${color} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-all duration-500`} />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-7 hover:border-white/20 transition-all duration-300 h-full">
                <div className={`inline-flex p-3 rounded-xl ${color.replace('bg-', 'bg-').replace('/20', '/15')} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

// ─── Team card ────────────────────────────────────────────────────────────────
interface TeamCardProps { name: string; role: string; bio: string; initials: string; gradient: string }
function TeamCard({ name, role, bio, initials, gradient }: TeamCardProps) {
    return (
        <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-7 hover:border-indigo-500/30 transition-all duration-300 h-full">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 text-white font-black text-xl shadow-lg`}>
                    {initials}
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
                <p className="text-indigo-400 text-sm font-semibold mb-3">{role}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{bio}</p>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AboutPage() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    const stats = [
        { value: t('about.stats.tutors.value', '10,000+'), label: t('about.stats.tutors.label', 'Active Tutors') },
        { value: t('about.stats.exams.value', '500K+'), label: t('about.stats.exams.label', 'Exams Created') },
        { value: t('about.stats.countries.value', '50+'), label: t('about.stats.countries.label', 'Countries') },
        { value: t('about.stats.satisfaction.value', '98%'), label: t('about.stats.satisfaction.label', 'Satisfaction Rate') },
    ];

    const values = [
        {
            icon: GraduationCap,
            title: t('about.values.education.title', 'Education First'),
            desc: t('about.values.education.desc', 'Every decision we make is guided by what is best for learners and educators, not just business metrics.'),
            color: 'bg-indigo-500',
        },
        {
            icon: Shield,
            title: t('about.values.trust.title', 'Radical Trust'),
            desc: t('about.values.trust.desc', 'We earn trust through transparency, data privacy, and unwavering academic integrity tools.'),
            color: 'bg-emerald-500',
        },
        {
            icon: Zap,
            title: t('about.values.simplicity.title', 'Elegant Simplicity'),
            desc: t('about.values.simplicity.desc', 'Powerful tools should feel effortless. We obsess over usability so tutors focus on teaching.'),
            color: 'bg-amber-500',
        },
        {
            icon: Globe,
            title: t('about.values.global.title', 'Globally Inclusive'),
            desc: t('about.values.global.desc', 'Built for tutors worldwide with full Arabic RTL, multi-language support, and inclusive design.'),
            color: 'bg-purple-500',
        },
        {
            icon: Heart,
            title: t('about.values.passion.title', 'Passion for Impact'),
            desc: t('about.values.passion.desc', 'We believe quality education changes lives. We measure success by the difference we make.'),
            color: 'bg-rose-500',
        },
        {
            icon: TrendingUp,
            title: t('about.values.innovation.title', 'Continuous Innovation'),
            desc: t('about.values.innovation.desc', 'We listen to educators and ship meaningful improvements every week, not every quarter.'),
            color: 'bg-cyan-500',
        },
    ];

    const team = [
        {
            name: 'Ahmed Elsaid',
            role: t('about.team.ahmed.role', 'Founder & CEO'),
            bio: t('about.team.ahmed.bio', 'Former teacher turned engineer. Built Durrah after experiencing firsthand how broken exam tools were for educators in the Arab world.'),
            initials: 'AE',
            gradient: 'from-indigo-500 to-purple-600',
        },
    ];

    const milestones = [
        { year: '2023', text: t('about.milestones.m2023', 'Durrah is founded — a single developer, one clear mission: fix online exams for tutors.') },
        { year: '2024', text: t('about.milestones.m2024', 'Launched public beta. 1,000 tutors join in the first month. Anti-cheating AI goes live.') },
        { year: '2025', text: t('about.milestones.m2025', '10,000+ tutors across 50 countries. Arabic RTL, Kids Mode, and Classrooms shipped.') },
        { year: '2026', text: t('about.milestones.m2026', 'Expanding to schools and institutions. Mobile app, AI question generation, and more.') },
    ];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About Durrah for Tutors',
        url: 'https://durrahtutors.com/about',
        description: 'Learn about Durrah — the modern exam platform built for tutors worldwide.',
        publisher: {
            '@type': 'Organization',
            name: 'Durrah for Tutors',
            logo: 'https://durrahtutors.com/brand/logo.png',
            foundingDate: '2023',
            numberOfEmployees: { '@type': 'QuantitativeValue', value: 5 },
        },
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white" dir={isRtl ? 'rtl' : 'ltr'}>
            <Seo
                title={t('about.seo.title', 'About Durrah – Our Story, Mission & Team | Durrah for Tutors')}
                description={t('about.seo.desc', 'Discover the story behind Durrah — why we built the best exam platform for tutors and how our mission to empower educators drives everything we do.')}
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
                        <Link to="/pricing" className="hover:text-white transition-colors">{t('nav.pricing', 'Pricing')}</Link>
                        <Link to="/blog" className="hover:text-white transition-colors">{t('nav.blog', 'Blog')}</Link>
                        <Link to="/contact" className="hover:text-white transition-colors">{t('footer.links.contact', 'Contact')}</Link>
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
            <section className="relative py-24 md:py-32 overflow-hidden">
                {/* Ambient blobs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-4xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                        <Sparkles className="w-4 h-4" />
                        {t('about.hero.badge', 'Our Story')}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                        {t('about.hero.title', 'Built by an Educator,')}
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {t('about.hero.titleHighlight', 'For Educators')}
                        </span>
                    </h1>
                    <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
                        {t('about.hero.subtitle', 'We started with a frustration every tutor knows — exam tools built for IT departments, not teachers. Durrah changes that.')}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                        >
                            {t('hero.cta', 'Start Free Trial')}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 text-slate-300 hover:text-white border border-white/15 hover:border-white/30 font-semibold px-7 py-3.5 rounded-xl transition-all duration-200"
                        >
                            <Mail className="w-4 h-4" />
                            {t('about.hero.contactUs', 'Get in Touch')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats ──────────────────────────────────────────────────────── */}
            <section className="py-16 border-y border-white/8">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((s, i) => <StatCard key={i} {...s} />)}
                    </div>
                </div>
            </section>

            {/* ── Mission ────────────────────────────────────────────────────── */}
            <section className="py-24 max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-4">
                            <Target className="w-4 h-4" />
                            {t('about.mission.badge', 'Our Mission')}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                            {t('about.mission.title', 'Giving Every Tutor Superpowers')}
                        </h2>
                        <p className="text-slate-300 text-lg leading-relaxed mb-6">
                            {t('about.mission.p1', 'Education is the most leveraged profession in the world — one great tutor impacts thousands of students. Yet the tools tutors use are decades behind.')}
                        </p>
                        <p className="text-slate-400 leading-relaxed mb-8">
                            {t('about.mission.p2', 'Durrah was built to close that gap. We give independent tutors and small academies the same quality exam infrastructure that top universities pay millions for — at a price that makes sense for one person running a tutoring business.')}
                        </p>
                        <ul className="space-y-3">
                            {[
                                t('about.mission.point1', 'Auto-graded exams in minutes, not hours'),
                                t('about.mission.point2', 'AI anti-cheating that actually works'),
                                t('about.mission.point3', 'Real analytics that reveal student gaps'),
                                t('about.mission.point4', 'Works in Arabic, French, Spanish & English'),
                            ].map((point, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-300">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Visual side */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-3xl blur-2xl" />
                        <div className="relative bg-white/5 border border-white/10 rounded-3xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <BookOpen className="w-6 h-6 text-indigo-400" />
                                <span className="font-bold text-white">{t('about.mission.visionTitle', 'Our Vision')}</span>
                            </div>
                            <blockquote className="text-2xl font-black text-white leading-snug mb-6">
                                "{t('about.mission.quote', 'A world where every tutor, regardless of resources, can deliver a world-class learning experience.')}"
                            </blockquote>
                            <div className="border-t border-white/10 pt-6 grid grid-cols-2 gap-4">
                                {[
                                    { icon: Award, label: t('about.mission.v1', 'Exam Excellence') },
                                    { icon: Shield, label: t('about.mission.v2', 'Zero Cheating') },
                                    { icon: Globe, label: t('about.mission.v3', 'Global Reach') },
                                    { icon: Users, label: t('about.mission.v4', 'Community First') },
                                ].map(({ icon: Icon, label }, i) => (
                                    <div key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                                        <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Values ─────────────────────────────────────────────────────── */}
            <section className="py-24 bg-white/[0.02] border-y border-white/8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {t('about.values.title', 'What We Stand For')}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t('about.values.subtitle', 'The principles that guide every feature, every decision, and every interaction at Durrah.')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {values.map((v, i) => <ValueCard key={i} {...v} />)}
                    </div>
                </div>
            </section>

            {/* ── Timeline ───────────────────────────────────────────────────── */}
            <section className="py-24 max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black mb-4">
                        {t('about.timeline.title', 'Our Journey')}
                    </h2>
                    <p className="text-slate-400 text-lg">
                        {t('about.timeline.subtitle', 'From a frustration to a platform used by thousands.')}
                    </p>
                </div>
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />
                    <div className="space-y-10">
                        {milestones.map((m, i) => (
                            <div key={i} className="flex gap-8 items-start group">
                                <div className="flex-shrink-0 w-32 text-right">
                                    <span className="text-indigo-400 font-black text-2xl">{m.year}</span>
                                </div>
                                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-950 mt-1.5 relative z-10 group-hover:scale-125 transition-transform" />
                                <p className="text-slate-300 leading-relaxed pt-0.5">{m.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Team ───────────────────────────────────────────────────────── */}
            <section className="py-24 bg-white/[0.02] border-y border-white/8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {t('about.team.title', 'The People Behind Durrah')}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t('about.team.subtitle', 'A small, passionate team obsessed with making education better.')}
                        </p>
                    </div>
                    <div className="max-w-sm mx-auto">
                        {team.map((m, i) => <TeamCard key={i} {...m} />)}
                    </div>
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────────────── */}
            <section className="py-24 max-w-4xl mx-auto px-6 text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-3xl blur-2xl" />
                    <div className="relative bg-white/5 border border-white/10 rounded-3xl p-12">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {t('about.cta.title', 'Ready to Transform Your Teaching?')}
                        </h2>
                        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                            {t('about.cta.subtitle', 'Join 10,000+ tutors already using Durrah. Free forever for up to 3 exams.')}
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 text-lg"
                            >
                                {t('hero.cta', 'Start Free Trial')}
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/contact"
                                className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 text-lg"
                            >
                                <Mail className="w-5 h-5" />
                                {t('about.hero.contactUs', 'Get in Touch')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="border-t border-white/10 py-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <p>© 2026 Durrah for Tutors. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="hover:text-slate-300 transition-colors">{t('footer.legal.privacy', 'Privacy Policy')}</Link>
                        <Link to="/terms" className="hover:text-slate-300 transition-colors">{t('footer.legal.terms', 'Terms')}</Link>
                        <Link to="/contact" className="hover:text-slate-300 transition-colors">{t('footer.links.contact', 'Contact')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
