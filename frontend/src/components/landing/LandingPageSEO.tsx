import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

export function LandingPageSEO() {
    const { t, i18n } = useTranslation();

    const faqs = [
        {
            question: t('landing.faq.q0.question', 'How do I start the 14-day free trial?'),
            answer: t('landing.faq.q0.answer', 'Simply create a free account and your trial starts automatically! No credit card required. You\'ll get full premium access to all features including unlimited exams, live proctoring, and advanced analytics for 14 days.')
        },
        {
            question: t('landing.faq.q1.question', 'Is Durrah really safe for kids?'),
            answer: t('landing.faq.q1.answer', 'Yes! We prioritize safety with filtered content, secure nickname-only access options, and zero data selling.')
        },
        {
            question: t('landing.faq.q2.question', 'How does the anti-cheating system work?'),
            answer: t('landing.faq.q2.answer', 'Our system uses AI to detect tab switching, fullscreen escapes, and suspicious behavior patterns without intrusive software.')
        },
        {
            question: t('landing.faq.q3.question', 'Can I use Durrah for large school groups?'),
            answer: t('landing.faq.q3.answer', 'Absolutely. Our "Professional" and "Yearly" plans are designed for high-capacity testing with detailed analytics.')
        },
        {
            question: t('landing.faq.q4.question', 'Do students need an account?'),
            answer: t('landing.faq.q4.answer', 'Students can join exams with just a code and nickname, or use the Student Portal to track their long-term progress.')
        }
    ];

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{t('landing.seo.title', 'Durrah for Tutors | 14-Day Free Trial - Create Secure Online Exams')}</title>
            <meta name="description" content={t('landing.seo.description', 'Start your 14-day free trial today! No credit card required. Create professional exams with anti-cheating features, auto-grading, and live proctoring. Full premium access for new users.')} />
            <meta name="keywords" content={t('landing.seo.keywords', 'free trial exam software, 14 day free trial, online exam platform free trial, create online exams, anti-cheating exam software, no credit card trial, quiz maker for teachers, online assessment tool free, proctored exams, exam creator software, auto grading exams, free online testing platform, secure online testing, digital assessment platform, virtual exam software, remote proctoring, kids mode exams, educator tools, trial period exam software')} />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <meta name="author" content="Durrah System" />
            <meta name="language" content={i18n.language === 'ar' ? 'Arabic' : 'English'} />
            <link rel="canonical" href="https://durrahtutors.com/" />

            {/* Hreflang for Multilingual SEO */}
            <link rel="alternate" hrefLang="en" href="https://durrahtutors.com/" />
            <link rel="alternate" hrefLang="ar" href="https://durrahtutors.com/?lang=ar" />
            <link rel="alternate" hrefLang="es" href="https://durrahtutors.com/?lang=es" />
            <link rel="alternate" hrefLang="fr" href="https://durrahtutors.com/?lang=fr" />
            <link rel="alternate" hrefLang="x-default" href="https://durrahtutors.com/" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Durrah for Tutors" />
            <meta property="og:url" content="https://durrahtutors.com/" />
            <meta property="og:title" content={t('landing.seo.title', 'Durrah for Tutors | 14-Day Free Trial - Create Secure Online Exams')} />
            <meta property="og:description" content={t('landing.seo.description', 'Start your 14-day free trial today! No credit card required. Create professional exams with anti-cheating features, auto-grading, and live proctoring. Full premium access for new users.')} />
            <meta property="og:image" content="https://durrahtutors.com/og-image.png" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content="Durrah for Tutors - 14-Day Free Trial Available" />
            <meta property="og:locale" content={i18n.language === 'ar' ? 'ar_SA' : 'en_US'} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@durrahsystem" />
            <meta name="twitter:creator" content="@durrahsystem" />
            <meta name="twitter:url" content="https://durrahtutors.com/" />
            <meta name="twitter:title" content={t('landing.seo.title', 'Durrah for Tutors | 14-Day Free Trial - Create Secure Online Exams')} />
            <meta name="twitter:description" content={t('landing.seo.description', 'Start your 14-day free trial today! No credit card required. Create professional exams with anti-cheating features, auto-grading, and live proctoring. Full premium access for new users.')} />
            <meta name="twitter:image" content="https://durrahtutors.com/og-image.png" />
            <meta name="twitter:image:alt" content="Durrah for Tutors - 14-Day Free Trial Available" />

            <meta name="theme-color" content="#6366f1" />
            <meta name="apple-mobile-web-app-title" content="Durrah for Tutors" />
            <meta name="application-name" content="Durrah for Tutors" />

            {/* Structured Data */}
            <script type="application/ld+json">{`
                {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "@id": "https://durrahtutors.com/#organization",
                    "name": "Durrah for Tutors",
                    "alternateName": "Durrah System",
                    "url": "https://durrahtutors.com",
                    "logo": {
                        "@type": "ImageObject",
                        "@id": "https://durrahtutors.com/#logo",
                        "url": "https://durrahtutors.com/logo-google.png",
                        "contentUrl": "https://durrahtutors.com/logo-google.png",
                        "width": 512,
                        "height": 512,
                        "caption": "Durrah for Tutors Logo"
                    },
                    "brand": {
                        "@type": "Brand",
                        "name": "Durrah",
                        "logo": "https://durrahtutors.com/logo-google.png"
                    },
                    "image": {
                        "@type": "ImageObject",
                        "url": "https://durrahtutors.com/og-image.png"
                    },
                    "description": "Start your 14-day free trial today! Create professional exams with anti-cheating features, auto-grading, and live proctoring. No credit card required for new users.",
                    "foundingDate": "2024",
                    "sameAs": ["https://durrahtutors.com"]
                }
            `}</script>

            <script type="application/ld+json">{`
                {
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "Durrah for Tutors",
                    "applicationCategory": "EducationApplication",
                    "operatingSystem": "Web Browser",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD",
                        "priceValidUntil": "2026-12-31",
                        "availability": "https://schema.org/InStock",
                        "name": "14-Day Free Trial",
                        "description": "Full premium access for 14 days. No credit card required. Available for all new users.",
                        "eligibleCustomerType": "New Users Only"
                    },
                    "description": "Professional online exam platform with anti-cheating features, live proctoring, auto-grading, and advanced analytics. Start your 14-day free trial today with full premium access.",
                    "screenshot": "https://durrahtutors.com/og-image.png",
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "4.8",
                        "ratingCount": "250",
                        "bestRating": "5",
                        "worstRating": "1"
                    },
                    "author": {
                        "@id": "https://durrahtutors.com/#organization"
                    }
                }
            `}</script>

            <script type="application/ld+json">{`
                {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": ${JSON.stringify(faqs.map(f => ({
                "@type": "Question",
                "name": f.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": f.answer
                }
            })))}
                }
            `}</script>

            <script type="application/ld+json">{`
                {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "@id": "https://durrahtutors.com/#website",
                    "name": "Durrah for Tutors",
                    "url": "https://durrahtutors.com/",
                    "description": "Start your 14-day free trial today! Create professional exams with anti-cheating features, auto-grading, live proctoring, and advanced analytics. No credit card required for new users.",
                    "inLanguage": "${i18n.language === 'ar' ? 'ar' : 'en'}",
                    "publisher": {
                        "@id": "https://durrahtutors.com/#organization"
                    }
                }
            `}</script>
        </Helmet>
    );
}
