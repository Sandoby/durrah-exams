import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Check, Zap, Shield, Globe, Users, MessageCircle, ArrowRight, Star, Layout } from 'lucide-react';
import { Logo } from '../components/Logo';
import { LottiePlayer } from '../components/LottiePlayer';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrency } from '../hooks/useCurrency';

export default function LandingPage() {
    const { t, i18n } = useTranslation();
    const registrationUrl = 'https://tutors.durrahsystem.tech/register';
    const isRTL = i18n.language === 'ar';

    // Dynamic currency conversion
    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(200);
    const { price: yearlyPrice } = useCurrency(2000);

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-violet-200 dark:from-indigo-950 dark:to-violet-900" dir={isRTL ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{t('hero.title')} {t('hero.titleHighlight')} | Durrah</title>
                <meta name="description" content={t('hero.subtitle')} />
                <link rel="canonical" href="https://tutors.durrahsystem.tech/" />
                {/* LottieFiles Web Component */}
                <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
            </Helmet>

            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Logo className="h-8 w-8" showText={false} />
                            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                Durrah
                            </span>
                            <span className="text-lg text-gray-600 dark:text-gray-400">{t('nav.features')}</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">{t('nav.features')}</a>
                            <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">{t('nav.pricing')}</a>
                            <a href="#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">{t('nav.testimonials')}</a>
                            <LanguageSwitcher />
                            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">{t('nav.login')}</Link>
                            <Link to="/register" className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-2 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200">
                                {t('nav.getStarted')}
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center relative">
                        {/* Animated decorative elements */}
                        <div className="absolute top-10 left-10 animate-bounce opacity-20">
                            <svg className="w-16 h-16 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="absolute top-20 right-16 animate-pulse opacity-20">
                            <svg className="w-20 h-20 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                            </svg>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight transition-all duration-500 ease-in-out hover:scale-105">
                            {t('hero.title')}
                            <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                {t('hero.titleHighlight')}
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                            {t('hero.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="group bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center">
                                {t('hero.cta')}
                                <ArrowRight className={`ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                            </a>
                        </div>
                        {/* Hero animated illustrations */}
                        <div className="mt-10 max-w-4xl mx-auto relative">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                                <LottiePlayer src="/illustrations/bendy-young-man-studying-something-and-watching-a-video.json" background="transparent" speed={1} className="w-full h-48" autoplay loop />
                                <LottiePlayer src="/illustrations/juicy-woman-focused-on-online-learning.json" background="transparent" speed={1} className="w-full h-48" autoplay loop />
                                <LottiePlayer src="/illustrations/dizzy-student-doing-homework-at-desk.json" background="transparent" speed={1} className="w-full h-48" autoplay loop />
                            </div>
                            {/* Decorative floating animations */}
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute -top-10 -left-10 opacity-30">
                                    <LottiePlayer src="/illustrations/juicy-boy-is-tired-of-doing-homework.json" background="transparent" speed={0.7} className="w-40 h-40" autoplay loop />
                                </div>
                                <div className="absolute -bottom-12 -right-6 opacity-30">
                                    <LottiePlayer src="/illustrations/juicy-woman-focused-on-online-learning.json" background="transparent" speed={0.7} className="w-32 h-32" autoplay loop />
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                                <Check className="h-5 w-5 text-indigo-500 mr-2" /> {t('hero.features.noCreditCard')}
                            </div>
                            <div className="flex items-center">
                                <Check className="h-5 w-5 text-indigo-500 mr-2" /> {t('hero.features.freeExams')}
                            </div>
                            <div className="flex items-center">
                                <Check className="h-5 w-5 text-indigo-500 mr-2" /> {t('hero.features.cancelAnytime')}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Paper ظْ Online banner */}
            <section className="px-4 sm:px-6 lg:px-8 relative">
                {/* Floating animated icons */}
                <div className="absolute -top-6 left-1/4 animate-bounce opacity-30 hidden md:block">
                    <svg className="w-12 h-12 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                </div>
                <div className="absolute top-12 right-1/4 animate-pulse opacity-30 hidden md:block">
                    <svg className="w-10 h-10 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                    </svg>
                </div>
                <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    <div className="flex-1">
                        <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('hero.title')} ظ¤ {t('hero.titleHighlight')}
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                            Instead of paper exams, start using secure, accessible online exams. Save time, prevent cheating, and reach students anywhere.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 px-3 py-1 rounded-full text-sm hover:scale-105 transition-transform cursor-default"><Shield className="h-4 w-4 mr-2 animate-pulse"/>Secure</span>
                            <span className="inline-flex items-center bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 px-3 py-1 rounded-full text-sm hover:scale-105 transition-transform cursor-default"><Zap className="h-4 w-4 mr-2 animate-pulse"/>Fast</span>
                            <span className="inline-flex items-center bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 px-3 py-1 rounded-full text-sm hover:scale-105 transition-transform cursor-default"><Globe className="h-4 w-4 mr-2 animate-pulse"/>Global</span>
                        </div>
                    </div>
                    <div className="w-full md:w-80 relative">
                        <LottiePlayer src="/illustrations/bendy-young-man-studying-something-and-watching-a-video.json" background="transparent" speed={1} className="w-full h-60" autoplay loop />
                        {/* Undraw illustration as fallback/enhancement */}
                        <img src="https://illustrations.popsy.co/violet/remote-work.svg" alt="Online Learning" className="absolute inset-0 w-full h-full object-contain opacity-0 hover:opacity-20 transition-opacity duration-500" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('features.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t('features.subtitle')}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
                        {[
                            {
                                icon: Zap,
                                title: t('features.fastCreation.title'),
                                description: t('features.fastCreation.desc'),
                                gradient: 'from-yellow-400 to-orange-500'
                            },
                            {
                                icon: Shield,
                                title: t('features.antiCheating.title'),
                                description: t('features.antiCheating.desc'),
                                gradient: 'from-indigo-400 to-violet-500'
                            },
                            {
                                icon: Globe,
                                title: t('features.globalAccess.title'),
                                description: t('features.globalAccess.desc'),
                                gradient: 'from-pink-400 to-rose-500'
                            },
                            {
                                icon: Users,
                                title: t('features.unlimitedStudents.title'),
                                description: t('features.unlimitedStudents.desc'),
                                gradient: 'from-green-400 to-emerald-500'
                            },
                            {
                                icon: MessageCircle,
                                title: t('features.support.title'),
                                description: t('features.support.desc'),
                                gradient: 'from-blue-400 to-cyan-500'
                            },
                            {
                                icon: Layout,
                                title: t('features.interface.title'),
                                description: t('features.interface.desc'),
                                gradient: 'from-purple-400 to-fuchsia-500'
                            }
                        ].map((feature, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                                    <feature.icon className="h-7 w-7 text-white group-hover:animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                        {/* Ambient animation near features */}
                        <div className="pointer-events-none absolute -top-6 -right-6 opacity-20">
                            <LottiePlayer src="/illustrations/juicy-woman-focused-on-online-learning.json" background="transparent" speed={1} className="w-32 h-32" autoplay loop />
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-900/50 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('pricing.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('pricing.subtitle')}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transform hover:scale-105 transition-transform border border-gray-100 dark:border-gray-700">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pricing.starter.title')}</h3>
                            <div className="mb-6"><span className="text-5xl font-bold text-gray-900 dark:text-white">{t('pricing.starter.price')}</span></div>
                            <ul className="space-y-4 mb-8">
                                {(t('pricing.starter.features', { returnObjects: true }) as string[]).map((feature, i) => (
                                    <li key={i} className="flex items-start"><Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /><span className="text-gray-600 dark:text-gray-300">{feature}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">{t('pricing.starter.cta')}</a>
                        </div>
                        <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl shadow-2xl p-8 relative overflow-hidden transform hover:scale-105 transition-transform">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 rounded-bl-xl font-bold text-sm">{t('pricing.professional.badge')}</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.professional.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-white">
                                    {isCurrencyLoading ? '...' : `${currencyCode} ${monthlyPrice}`}
                                </span>
                                <span className="text-violet-100">{t('pricing.professional.period')}</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {(t('pricing.professional.features', { returnObjects: true }) as string[]).map((feature, i) => (
                                    <li key={i} className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-violet-50">{feature}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-violet-600 py-3 rounded-xl font-semibold hover:bg-violet-50 transition shadow-lg">{t('pricing.professional.cta')}</a>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-2xl shadow-2xl p-8 relative overflow-hidden transform hover:scale-105 transition-transform">
                            <div className="absolute top-0 right-0 bg-white/90 text-indigo-700 px-4 py-1 rounded-bl-xl font-bold text-sm">{t('pricing.yearly.badge')}</div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.yearly.title')}</h3>
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-white">
                                    {isCurrencyLoading ? '...' : `${currencyCode} ${yearlyPrice}`}
                                </span>
                                <span className="text-indigo-100">{t('pricing.yearly.period')}</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {(t('pricing.yearly.features', { returnObjects: true }) as string[]).map((feature, i) => (
                                    <li key={i} className="flex items-start"><Check className="h-6 w-6 text-white mr-3 flex-shrink-0" /><span className="text-indigo-50">{feature}</span></li>
                                ))}
                            </ul>
                            <a href={registrationUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-indigo-700 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition shadow-lg">{t('pricing.yearly.cta')}</a>
                        </div>
                    </div>
                </div>
                {/* Subtle animation background for pricing */}
                <div className="pointer-events-none absolute top-6 left-2 opacity-10">
                    <LottiePlayer src="/illustrations/dizzy-student-doing-homework-at-desk.json" background="transparent" speed={0.8} className="w-40 h-40" autoplay loop />
                </div>
                <div className="pointer-events-none absolute bottom-10 right-10 opacity-10 hidden lg:block">
                    <img src="https://illustrations.popsy.co/violet/success.svg" alt="Success" className="w-48 h-48 animate-pulse" />
                </div>
                <div className="pointer-events-none absolute top-1/2 left-10 opacity-10 hidden lg:block">
                    <svg className="w-16 h-16 text-indigo-300 animate-spin" style={{ animationDuration: '20s' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                    </svg>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{t('testimonials.title')}</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">{t('testimonials.subtitle')}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
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
                        ].map((testimonial, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="flex mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current group-hover:animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                                    ))}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">{testimonial.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="pointer-events-none absolute -bottom-6 right-6 opacity-10">
                    <LottiePlayer src="/illustrations/bendy-young-man-studying-something-and-watching-a-video.json" background="transparent" speed={0.8} className="w-36 h-36" autoplay loop />
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-violet-600 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 transition-all duration-500 ease-in-out hover:scale-105">{t('ctaSection.title')}</h2>
                    <p className="text-xl text-indigo-100 mb-8">{t('ctaSection.subtitle')}</p>
                    <a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-200">
                        {t('ctaSection.cta')}
                        <ArrowRight className={`ml-2 h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </a>
                </div>
                {/* CTA background animation */}
                <div className="pointer-events-none absolute -top-8 left-8 opacity-20">
                    <LottiePlayer src="/illustrations/juicy-boy-is-tired-of-doing-homework.json" background="transparent" speed={1} className="w-48 h-48" autoplay loop />
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 opacity-20 hidden md:block">
                    <img src="https://illustrations.popsy.co/white/rocket-launch.svg" alt="Launch" className="w-64 h-64" />
                </div>
                <div className="pointer-events-none absolute top-10 right-1/4 opacity-30 animate-bounce hidden md:block">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
                    </svg>
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
