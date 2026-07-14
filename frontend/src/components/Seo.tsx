import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SeoProps {
    title: string;
    description: string;
    keywords?: string;
    canonical?: string;
    ogImage?: string;
    ogType?: 'website' | 'article' | 'book' | 'profile';
    jsonLd?: Record<string, any> | Record<string, any>[];
    noIndex?: boolean;
}

export function Seo({
    title,
    description,
    keywords,
    canonical,
    ogImage = 'https://durrahtutors.com/og-cover.png',
    ogType = 'website',
    jsonLd,
    noIndex = false
}: SeoProps) {
    const { i18n } = useTranslation();
    const location = useLocation();
    
    const siteUrl = 'https://durrahtutors.com';
    
    // Normalize path by removing /ar prefix if present, to calculate canonicals and alternates properly
    let path = location.pathname;
    const isArabicRoute = path.startsWith('/ar') && (path === '/ar' || path.startsWith('/ar/'));
    const baseSlug = isArabicRoute ? path.replace(/^\/ar/, '') : path;
    const cleanBaseSlug = baseSlug === '' ? '/' : baseSlug;

    // Set canonical URL: English URL is the canonical base, Arabic is alternative
    const derivedCanonical = canonical || `${siteUrl}${cleanBaseSlug === '/' ? '' : cleanBaseSlug}`;
    
    // Hreflang absolute alternates
    const hrefLangEn = `${siteUrl}${cleanBaseSlug === '/' ? '' : cleanBaseSlug}`;
    const hrefLangAr = `${siteUrl}/ar${cleanBaseSlug === '/' ? '' : cleanBaseSlug}`;
    
    const currentLang = i18n.language === 'ar' ? 'ar' : 'en';

    // ─── Build BreadcrumbList Schema ─────────────────────────────────────────
    let breadcrumbSchema: Record<string, any> | null = null;
    if (!noIndex) {
        const pathSegments = path.split('/').filter(Boolean);
        const itemListElement: any[] = [];
        
        const isAr = pathSegments[0] === 'ar';
        const homeUrl = isAr ? `${siteUrl}/ar` : siteUrl;
        const homeName = isAr ? 'الرئيسية' : 'Home';
        
        itemListElement.push({
            "@type": "ListItem",
            "position": 1,
            "name": homeName,
            "item": homeUrl
        });

        let currentPath = isAr ? '/ar' : '';
        let position = 2;

        const activeSegments = isAr ? pathSegments.slice(1) : pathSegments;

        activeSegments.forEach((segment, idx) => {
            currentPath += `/${segment}`;
            
            let name = segment;
            if (segment === 'blog') name = isAr ? 'المدونة' : 'Blog';
            else if (segment === 'pricing') name = isAr ? 'الأسعار' : 'Pricing';
            else if (segment === 'kids') name = isAr ? 'للأطفال' : 'Kids';
            else if (segment === 'demo') name = isAr ? 'تجربة الخدمة' : 'Demo';
            else if (segment === 'privacy') name = isAr ? 'سياسة الخصوصية' : 'Privacy';
            else if (segment === 'terms') name = isAr ? 'الشروط والأحكام' : 'Terms';
            else if (segment === 'refund-policy') name = isAr ? 'سياسة الاسترجاع' : 'Refund Policy';
            else if (idx === activeSegments.length - 1) {
                name = title.split(' | ')[0] || segment;
            } else {
                name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
            }

            itemListElement.push({
                "@type": "ListItem",
                "position": position,
                "name": name,
                "item": `${siteUrl}${currentPath}`
            });
            position++;
        });

        breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": itemListElement
        };
    }

    // Combine any user-supplied jsonLd with the automatic breadcrumb schema
    const allSchemas: Record<string, any>[] = [];
    if (breadcrumbSchema) {
        allSchemas.push(breadcrumbSchema);
    }
    if (jsonLd) {
        if (Array.isArray(jsonLd)) {
            allSchemas.push(...jsonLd);
        } else {
            allSchemas.push(jsonLd);
        }
    }

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            {noIndex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            )}
            
            <link rel="canonical" href={derivedCanonical} />

            {/* Hreflang for Multilingual SEO */}
            {!noIndex && (
                <>
                    <link rel="alternate" hrefLang="en" href={hrefLangEn} />
                    <link rel="alternate" hrefLang="ar" href={hrefLangAr} />
                    <link rel="alternate" hrefLang="x-default" href={hrefLangEn} />
                </>
            )}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={`${siteUrl}${path}`} />
            <meta property="og:site_name" content="Durrah for Tutors" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={title} />
            <meta property="og:locale" content={currentLang === 'ar' ? 'ar_SA' : 'en_US'} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@durrahsystem" />
            <meta name="twitter:creator" content="@durrahsystem" />
            <meta name="twitter:url" content={`${siteUrl}${path}`} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />
            <meta name="twitter:image:alt" content={title} />

            {/* Theme & Branding */}
            <meta name="theme-color" content="#6366f1" />
            <meta name="apple-mobile-web-app-title" content="Durrah for Tutors" />
            <meta name="application-name" content="Durrah for Tutors" />

            {/* Structured Data */}
            {allSchemas.map((ld, index) => (
                <script key={index} type="application/ld+json">
                    {JSON.stringify(ld)}
                </script>
            ))}
        </Helmet>
    );
}
