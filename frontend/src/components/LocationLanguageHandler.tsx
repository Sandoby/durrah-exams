import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../hooks/useLocation';

export function LocationLanguageHandler() {
    const { i18n } = useTranslation();
    const { location, isLoading } = useLocation();

    useEffect(() => {
        // Only auto-detect if language is not already set in localStorage
        const savedLang = localStorage.getItem('i18nextLng');

        if (!savedLang && location && !isLoading) {
            const country = location.countryCode;
            let targetLang = 'en';

            // Arab countries
            const arabCountries = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'LB', 'JO', 'IQ', 'YE', 'SY', 'PS', 'SD', 'LY', 'DZ', 'MA', 'TN', 'MR', 'KM', 'DJ', 'SO'];

            // French speaking countries (partial list)
            const frenchCountries = ['FR', 'BE', 'CH', 'CA', 'MC', 'LU', 'SN', 'CI', 'CM', 'CD'];

            // Spanish speaking countries
            const spanishCountries = ['ES', 'MX', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'];

            if (arabCountries.includes(country)) {
                targetLang = 'ar';
            } else if (frenchCountries.includes(country)) {
                targetLang = 'fr';
            } else if (spanishCountries.includes(country)) {
                targetLang = 'es';
            }

            if (targetLang !== i18n.language) {
                console.log(`LocationLanguageHandler: Auto-detecting language: ${targetLang} (Current: ${i18n.language})`);
                i18n.changeLanguage(targetLang);
            }
        }
    }, [location, isLoading, i18n]);

    return null; // This component doesn't render anything
}
