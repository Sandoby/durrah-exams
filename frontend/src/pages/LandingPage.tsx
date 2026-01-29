import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrency } from '../hooks/useCurrency';
import { LandingPageSEO } from '../components/landing/LandingPageSEO';
import { HeroSection } from '../components/landing/HeroSection';
import { PlatformHighlights } from '../components/landing/PlatformHighlights';
import { Navbar } from '../components/landing/Navbar';

const FeaturesBento = lazy(() => import('../components/landing/FeaturesBento').then(mod => ({ default: mod.FeaturesBento })));
const PricingSection = lazy(() => import('../components/landing/PricingSection').then(mod => ({ default: mod.PricingSection })));
const FAQSection = lazy(() => import('../components/landing/FAQSection').then(mod => ({ default: mod.FAQSection })));
const CTASection = lazy(() => import('../components/landing/CTASection').then(mod => ({ default: mod.CTASection })));

const StudentPortalFeature = lazy(() => import('../components/landing/StudentPortalFeature').then(mod => ({ default: mod.StudentPortalFeature })));
const MobileAppSection = lazy(() => import('../components/landing/MobileAppSection').then(mod => ({ default: mod.MobileAppSection })));
const Footer = lazy(() => import('../components/landing/Footer').then(mod => ({ default: mod.Footer })));

const InteractiveHowTo = lazy(() =>
    import('../components/InteractiveHowTo').then(mod => ({ default: mod.InteractiveHowTo }))
);

export default function LandingPage() {
    const { i18n } = useTranslation();
    const registrationUrl = 'https://tutors.durrahsystem.tech/register';
    const isRTL = i18n.language === 'ar';
    const [showNonCriticalEffects, setShowNonCriticalEffects] = useState(false);

    // Force language detection on mount (for main landing page)
    useEffect(() => {
        void import('../lib/countryLanguageDetector')
            .then(mod => mod.default.lookup())
            .catch(() => undefined);
    }, []);

    // Defer non-critical visuals/components until after initial paint/idle time.
    useEffect(() => {
        let cancelled = false;
        const enable = () => {
            if (!cancelled) setShowNonCriticalEffects(true);
        };

        const w = window as unknown as {
            requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        if (typeof w.requestIdleCallback === 'function') {
            const id = w.requestIdleCallback(enable, { timeout: 1500 });
            return () => {
                cancelled = true;
                w.cancelIdleCallback?.(id);
            };
        }

        const id = window.setTimeout(enable, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(id);
        };
    }, []);



    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(5);
    const { price: yearlyPrice } = useCurrency(50);


    return (
        <div className="min-h-screen bg-white dark:bg-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
            <LandingPageSEO />

            <style>{`
                @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.5)); } 50% { filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.8)); } }
                @keyframes gradient { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
                .animate-blob { animation: blob 7s infinite; }
                .animate-float { animation: float 3s ease-in-out infinite; }
                .animate-glow { animation: glow 3s ease-in-out infinite; }
                .animate-gradient { background-size: 200% auto; animation: gradient 4s linear infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                .star-field { position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 10% 10%, white, transparent), radial-gradient(1px 1px at 25% 35%, white, transparent), radial-gradient(1.5px 1.5px at 45% 15%, white, transparent), radial-gradient(1px 1px at 65% 45%, white, transparent), radial-gradient(1px 1px at 85% 25%, white, transparent), radial-gradient(1px 1px at 15% 75%, white, transparent), radial-gradient(1.5px 1.5px at 35% 85%, white, transparent), radial-gradient(1px 1px at 55% 65%, white, transparent), radial-gradient(1px 1px at 75% 95%, white, transparent), radial-gradient(1px 1px at 95% 55%, white, transparent); background-size: 50% 50%; animation: twinkle 4s infinite ease-in-out; }
                .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
                .slant { transform: skewX(-20deg); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin 12s linear infinite; }
            `}</style>



            <Navbar />

            <HeroSection registrationUrl={registrationUrl} showNonCriticalEffects={showNonCriticalEffects} />

            <PlatformHighlights />

            <Suspense fallback={<div className="py-24" />}>
                <FeaturesBento />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <PricingSection
                    registrationUrl={registrationUrl}
                    isCurrencyLoading={isCurrencyLoading}
                    currencyCode={currencyCode || ''}
                    monthlyPrice={monthlyPrice || ''}
                    yearlyPrice={yearlyPrice || ''}
                />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <FAQSection />
            </Suspense>


            <Suspense fallback={<div className="py-24" />}>
                <CTASection registrationUrl={registrationUrl} />
            </Suspense>



            <Suspense fallback={<div className="py-24" />}>
                <StudentPortalFeature />
            </Suspense>

            {showNonCriticalEffects && (
                <Suspense fallback={null}>
                    <InteractiveHowTo />
                </Suspense>
            )}

            <Suspense fallback={<div className="py-24" />}>
                <MobileAppSection showNonCriticalEffects={showNonCriticalEffects} />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <Footer />
            </Suspense>
        </div>
    );
}
