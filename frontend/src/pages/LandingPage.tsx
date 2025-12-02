import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    Check, Zap, Shield, Globe, Users, MessageCircle, ArrowRight, Star,
    Layout, TrendingUp, Award, Sparkles, Play
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrency } from '../hooks/useCurrency';
import { LottiePlayer } from '../components/LottiePlayer';
import { useState, useEffect } from 'react';

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const registrationUrl = 'https://tutors.durrahsystem.tech/register';
    const isRTL = i18n.language === 'ar';
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const [stats, setStats] = useState({ users: 0, exams: 0, success: 0, countries: 0 });

    // Dynamic currency conversion
    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(200);
    const { price: yearlyPrice } = useCurrency(2000);

    // Animated stats counter
    useEffect(() => {
        const targets = { users: 1250, exams: 15000, success: 98, countries: 45 };
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;

        let step = 0;
        const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            setStats({
                users: Math.floor(targets.users * progress),
                exams: Math.floor(targets.exams * progress),
                success: Math.floor(targets.success * progress),
                countries: Math.floor(targets.countries * progress)
            });
            if (step >= steps) clearInterval(timer);
        }, interval);

        return () => clearInterval(timer);
    }, []);

    // Testimonial carousel
    const testimonials = [
        {
            name: t('testimonials.t1.name'),
            role: t('testimonials.t1.role'),
            content: t('testimonials.t1.content'),
            rating: 5
        },
        {
            name: t('testimonials.t2.name'),
            role: t('testimonials.t2.role'),
            content: t('testimonials.t2.content'),
            rating: 5
        },
        {
            name: t('testimonials.t3.name'),
            role: t('testimonials.t3.role'),
            content: t('testimonials.t3.content'),
            rating: 5
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [testimonials.length]);

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-100 dark:from-gray-900 dark:via-indigo-950 dark:to-blue-950" dir={isRTL ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{t('hero.title')} {t('hero.titleHighlight')} | Durrah</title>
                <meta name="description" content={t('hero.subtitle')} />
                <link rel="canonical" href="https://tutors.durrahsystem.tech/" />
            </Helmet>

            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl z-50 border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <Logo className="h-10 w-10" showText={false} />
                            <div>
                                <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-700 bg-clip-text text-transparent">
                                    Durrah
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">for Tutors</span>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-blue-400 transition font-medium">{t('nav.features')}</a>
                            <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-blue-400 transition font-medium">{t('nav.pricing')}</a>
                            <a href="#testimonials" className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-blue-400 transition font-medium">{t('nav.testimonials')}</a>
                            <LanguageSwitcher />
                            <Link to="/login" className="text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-blue-400 transition font-medium">{t('nav.login')}</Link>
                            <Link to="/register" className="bg-gradient-to-r from-violet-600 to-blue-700 text-white px-6 py-2.5 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold">
                                {t('nav.getStarted')}
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center px-4 py-2 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-6">
                                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 mr-2" />
                                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Trusted by 1,250+ Tutors Worldwide</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                                {t('hero.title')}
                                <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent mt-2">
                                    {t('hero.titleHighlight')}
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                {t('hero.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <a href={registrationUrl} target="_blank" rel="noreferrer" className="group bg-gradient-to-r from-violet-600 to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center">
                                    {t('hero.cta')}
                                    <ArrowRight className={`ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                                </a>
                                <button className="group bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-full text-lg font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-violet-600 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-300 flex items-center justify-center">
                                    <Play className="h-5 w-5 mr-2" />
                                    Watch Demo
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center">
                                    <Check className="h-5 w-5 text-violet-500 mr-2" /> {t('hero.features.noCreditCard')}
                                </div>
                                <div className="flex items-center">
                                    <Check className="h-5 w-5 text-violet-500 mr-2" /> {t('hero.features.freeExams')}
                                </div>
                                <div className="flex items-center">
                                    <Check className="h-5 w-5 text-violet-500 mr-2" /> {t('hero.features.cancelAnytime')}
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-blue-600 rounded-3xl blur-3xl opacity-20"></div>
                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                <LottiePlayer
                                    animationPath="/illustrations/bendy-young-man-studying-something-and-watching-a-video.json"
                                    className="w-full h-auto"
                                />
                                <LottiePlayer
                                    animationPath="/illustrations/dizzy-student-doing-homework-at-desk.json"
                                    className="w-full h-auto"
                                />
                                <LottiePlayer
                                    animationPath="/illustrations/juicy-boy-is-tired-of-doing-homework.json"
                                    className="w-full h-auto"
                                />
                                <LottiePlayer
                                    animationPath="/illustrations/juicy-woman-focused-on-online-learning.json"
                                    className="w-full h-auto"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Problem-Solution Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                        >
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-8 border-2 border-red-200 dark:border-red-800">
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">The Problem</h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-3 text-2xl">✗</span>
                                        <span className="text-gray-700 dark:text-gray-300">Time-consuming manual exam creation and grading</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-3 text-2xl">✗</span>
                                        <span className="text-gray-700 dark:text-gray-300">Difficulty preventing cheating in online exams</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-3 text-2xl">✗</span>
                                        <span className="text-gray-700 dark:text-gray-300">Limited analytics and student insights</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-3 text-2xl">✗</span>
                                        <span className="text-gray-700 dark:text-gray-300">Complex platforms with steep learning curves</span>
                                    </li>
                                </ul>
                                <LottiePlayer
                                    animationPath="/illustrations/juicy-boy-is-tired-of-doing-homework.json"
                                    className="w-64 h-64 mx-auto mt-6"
                                />
                            </div>
                        </motion.div>
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-3xl p-8 border-2 border-violet-200 dark:border-violet-800">
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Solution</h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <span className="text-violet-600 mr-3 text-2xl">✓</span>
                                        <span className="text-gray-700 dark:text-gray-300">Create exams in minutes with AI assistance</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-violet-600 mr-3 text-2xl">✓</span>
                                        <span className="text-gray-700 dark:text-gray-300">Advanced anti-cheating with browser lockdown</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-violet-600 mr-3 text-2xl">✓</span>
                                        <span className="text-gray-700 dark:text-gray-300">Comprehensive analytics and performance tracking</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-violet-600 mr-3 text-2xl">✓</span>
                                        <span className="text-gray-700 dark:text-gray-300">Intuitive interface, ready in 5 minutes</span>
                                    </li>
                                </ul>
                                <LottiePlayer
                                    animationPath="/illustrations/juicy-woman-focused-on-online-learning.json"
                                    className="w-64 h-64 mx-auto mt-6"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('features.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t('features.subtitle')}</p>
                    </motion.div>

                    {/* Feature 1: Fast Creation */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                        >
                            <div className="rounded-3xl p-8 border bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-violet-100 dark:border-gray-700 shadow-xl">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                                    <Zap className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('features.fastCreation.title')}</h3>
                                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">{t('features.fastCreation.desc')}</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Drag-and-drop question builder
                                    </li>
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Question bank with 1000+ templates
                                    </li>
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Bulk import from Excel/CSV
                                    </li>
                                </ul>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <img
                                src="/illustrations/techny-standardized-test-as-method-of-assessment.png"
                                alt="Fast Exam Creation"
                                className="w-full h-auto rounded-2xl shadow-2xl"
                            />
                        </motion.div>
                    </div>

                    {/* Feature 2: Anti-Cheating */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="order-2 lg:order-1"
                        >
                            <img
                                src="/illustrations/blue-shield-with-lock-and-coins-online-payment-security-financial-protection-and-privacy.png"
                                alt="Security and Anti-Cheating"
                                className="w-full h-auto rounded-2xl shadow-2xl"
                            />
                        </motion.div>
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            className="order-1 lg:order-2"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <div className="rounded-3xl p-8 border bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-violet-100 dark:border-gray-700 shadow-xl">
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('features.antiCheating.title')}</h3>
                                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">{t('features.antiCheating.desc')}</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Browser lockdown mode
                                    </li>
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Question randomization
                                    </li>
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Time limits and monitoring
                                    </li>
                                </ul>
                            </div>
                        </motion.div>
                    </div>

                    {/* Feature 3: Global Access */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                                <Globe className="h-8 w-8 text-white" />
                            </div>
                            <div className="rounded-3xl p-8 border bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-violet-100 dark:border-gray-700 shadow-xl">
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('features.globalAccess.title')}</h3>
                                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">{t('features.globalAccess.desc')}</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Multi-language support (Arabic, English, French)
                                    </li>
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        RTL support for Arabic
                                    </li>
                                    <li className="flex items-center text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-violet-500 mr-3" />
                                        Works on any device, anywhere
                                    </li>
                                </ul>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <img
                                src="/illustrations/folks-woman-focused-on-online-learning2.png"
                                alt="Global Access"
                                className="w-full h-auto rounded-2xl shadow-2xl"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-indigo-950/50 dark:to-blue-950/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">Get started in 3 simple steps</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { number: '1', title: 'Sign Up Free', desc: 'Create your account in under 2 minutes', icon: Users },
                            { number: '2', title: 'Create Your Exam', desc: 'Use our intuitive builder or import questions', icon: Layout },
                            { number: '3', title: 'Share & Monitor', desc: 'Send to students and track results in real-time', icon: TrendingUp }
                        ].map((step, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: index * 0.2 }}
                                className="relative"
                            >
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow">
                                    <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-r from-violet-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                        {step.number}
                                    </div>
                                    <step.icon className="h-12 w-12 text-violet-600 dark:text-blue-400 mb-4 mt-4" />
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <img
                            src="/illustrations/folks-boy-is-sitting-on-a-chair-and-writing.png"
                            alt="Student Taking Exam"
                            className="w-64 h-auto mx-auto"
                        />
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-violet-600 to-blue-700 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <LottiePlayer
                        animationPath="/illustrations/dizzy-student-doing-homework-at-desk.json"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { value: stats.users, label: 'Active Tutors', suffix: '+' },
                            { value: stats.exams, label: 'Exams Created', suffix: '+' },
                            { value: stats.success, label: 'Success Rate', suffix: '%' },
                            { value: stats.countries, label: 'Countries', suffix: '+' }
                        ].map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.5 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                                    {stat.value.toLocaleString()}{stat.suffix}
                                </div>
                                <div className="text-violet-100 text-lg">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('pricing.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('pricing.subtitle')}</p>
                    </motion.div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Starter Plan */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 dark:border-gray-700"
                        >
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                            <div className="mb-6"><span className="text-5xl font-bold text-gray-900 dark:text-white">{t('pricing.starter.price')}</span></div>
                            <ul className="space-y-4 mb-8">
                                {(t('pricing.starter.features', { returnObjects: true }) as string[]).map((feature, i) => (
                                    <li key={i} className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{feature}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">{t('pricing.starter.cta')}</a>
                        </motion.div>

                        {/* Professional Plan */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-3xl shadow-2xl p-8 relative overflow-hidden transform hover:scale-105 transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 rounded-bl-xl font-bold text-sm">{t('pricing.professional.badge')}</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.professional.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-white">
                                    {isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}
                                </span>
                                <span className="text-violet-100">{t('pricing.professional.period')}</span>
                                <span className="ml-3 inline-block bg-white/20 text-white text-xs px-2 py-1 rounded-full">Save 20% yearly</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {(t('pricing.professional.features', { returnObjects: true }) as string[]).map((feature, i) => (
                                    <li key={i} className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-violet-50">{feature}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-violet-600 py-3 rounded-xl font-semibold hover:bg-violet-50 transition shadow-lg">{t('pricing.professional.cta')}</a>
                        </motion.div>

                        {/* Yearly Plan */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl shadow-2xl p-8 relative overflow-hidden hover:shadow-3xl transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 bg-white/90 text-indigo-700 px-4 py-1 rounded-bl-xl font-bold text-sm">{t('pricing.yearly.badge')}</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.yearly.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-white">
                                    {isCurrencyLoading ? '...' : `${currencyCode} ${yearlyPrice}`}
                                </span>
                                <span className="text-indigo-100">{t('pricing.yearly.period')}</span>
                                <span className="ml-3 inline-block bg-white/20 text-white text-xs px-2 py-1 rounded-full">Best value</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {(t('pricing.yearly.features', { returnObjects: true }) as string[]).map((feature, i) => (
                                    <li key={i} className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-indigo-50">{feature}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-indigo-700 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition shadow-lg">{t('pricing.yearly.cta')}</a>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('testimonials.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('testimonials.subtitle')}</p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">4.9/5 from 500+ reviews</span>
                        </div>
                    </motion.div>

                    <div className="relative max-w-4xl mx-auto">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl shadow-2xl p-12 border border-violet-100 dark:border-gray-700">
                            <div className="flex mb-6">
                                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            <p className="text-2xl text-gray-700 dark:text-gray-300 mb-8 italic leading-relaxed">
                                "{testimonials[currentTestimonial].content}"
                            </p>
                            <div className="flex items-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-600 to-blue-700 flex items-center justify-center text-white font-bold text-2xl mr-4">
                                    {testimonials[currentTestimonial].name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-xl text-gray-900 dark:text-white">{testimonials[currentTestimonial].name}</div>
                                    <div className="text-gray-500 dark:text-gray-400">{testimonials[currentTestimonial].role}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-8 gap-2">
                            {testimonials.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentTestimonial(index)}
                                    className={`w-3 h-3 rounded-full transition-all ${index === currentTestimonial
                                        ? 'bg-violet-600 w-8'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-center mt-4 gap-6">
                            <button onClick={() => setCurrentTestimonial((currentTestimonial - 1 + testimonials.length) % testimonials.length)} className="px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-600">Prev</button>
                            <button onClick={() => setCurrentTestimonial((currentTestimonial + 1) % testimonials.length)} className="px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-600">Next</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-800 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <img
                        src="/illustrations/create-an-illustrated-character-or-minimal-scene-f_02.12.2025.webp"
                        alt="Background"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('ctaSection.title')}</h2>
                        <p className="text-xl text-indigo-100 mb-8">{t('ctaSection.subtitle')}</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center bg-white text-violet-700 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300">
                                {t('ctaSection.cta')}
                                <ArrowRight className={`ml-2 h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                            </a>
                            <button className="inline-flex items-center bg-transparent border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-violet-700 transition-all duration-300">
                                <MessageCircle className="h-5 w-5 mr-2" />
                                Contact Sales
                            </button>
                        </div>
                        <p className="text-violet-100 mt-6 text-sm">
                            <Award className="inline h-5 w-5 mr-2" />
                            Join 1,250+ tutors who started this month
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <Logo className="h-8 w-8" showText={false} />
                                <span className="text-xl font-bold text-white">Durrah</span>
                                <span className="text-lg text-gray-400">for Tutors</span>
                            </div>
                            <p className="text-gray-400">{t('footer.desc')}</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-4">{t('footer.product')}</h3>
                            <ul className="space-y-2">
                                <li><a href="#features" className="hover:text-white transition">{t('footer.features')}</a></li>
                                <li><Link to="/register" className="hover:text-white transition">{t('footer.signup')}</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                        <p>{t('footer.copyright')}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
