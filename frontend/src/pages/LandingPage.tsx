import { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrency } from '../hooks/useCurrency';
import { LandingPageSEO } from '../components/landing/LandingPageSEO';
import { HeroSection } from '../components/landing/HeroSection';
import { PlatformHighlights } from '../components/landing/PlatformHighlights';
import { Navbar } from '../components/landing/Navbar';
import '../styles/landing-animations.css';

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
    // Force language detection on mount (for main landing page)
    useEffect(() => {
        void import('../lib/countryLanguageDetector')
            .then(mod => mod.default.lookup())
            .catch(() => undefined);
    }, []);

    const { price: monthlyPrice, currency: currencyCode, isLoading: isCurrencyLoading } = useCurrency(5);
    const { price: yearlyPrice } = useCurrency(50);


    return (
        <div className="min-h-screen bg-white dark:bg-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
            <LandingPageSEO />

            <Navbar />

            <HeroSection registrationUrl={registrationUrl} />

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

            <Suspense fallback={null}>
                <InteractiveHowTo />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <MobileAppSection />
            </Suspense>

            <Suspense fallback={<div className="py-24" />}>
                <Footer />
            </Suspense>
        </div>
    );
}
