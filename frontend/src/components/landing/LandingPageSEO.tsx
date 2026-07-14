import { Seo } from '../Seo';
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

    const organizationSchema = {
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
            "url": "https://durrahtutors.com/og-cover.png"
        },
        "description": "Create secure, professional online exams with advanced anti-cheating features, auto-grading, and comprehensive analytics for educators worldwide.",
        "foundingDate": "2024",
        "sameAs": ["https://durrahtutors.com", "https://web.facebook.com/profile.php?id=61584207453651"]
    };

    const softwareApplicationSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Durrah for Tutors",
        "applicationCategory": "EducationApplication",
        "operatingSystem": "Web Browser",
        "offers": [
            {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "priceValidUntil": "2026-12-31",
                "availability": "https://schema.org/InStock",
                "name": "14-Day Free Trial",
                "description": "Full premium access for 14 days. No credit card required. Available for all new users.",
                "eligibleCustomerType": "New Users Only"
            }
        ],
        "description": "Professional online exam platform with anti-cheating features, live proctoring, auto-grading, and advanced analytics. Try the 14-day free trial.",
        "screenshot": "https://durrahtutors.com/og-cover.png",
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
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f.answer
            }
        }))
    };

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://durrahtutors.com/#website",
        "name": "Durrah for Tutors",
        "url": "https://durrahtutors.com/",
        "description": "Create professional online exams with anti-cheating features, auto-grading, live proctoring, and advanced analytics. Join thousands of educators worldwide.",
        "inLanguage": i18n.language === 'ar' ? 'ar' : 'en',
        "publisher": {
            "@id": "https://durrahtutors.com/#organization"
        }
    };

    const jsonLds = [organizationSchema, softwareApplicationSchema, faqSchema, websiteSchema];

    return (
        <Seo
            title={t('landing.seo.title', 'Online Exam Maker for Tutors – Create & Auto-Grade Exams Free | Durrah')}
            description={t('landing.seo.description', 'Create professional, secure online exams in minutes with smart anti-cheating, auto-grading, and real-time proctoring. Sign up free for a 14-day premium trial.')}
            keywords={t('landing.seo.keywords', 'online exam platform, create online exams, anti-cheating exam software, quiz maker for teachers, proctored exams, auto grading, educator tools, secure online testing, digital assessment platform, exam creator software')}
            jsonLd={jsonLds}
        />
    );
}
