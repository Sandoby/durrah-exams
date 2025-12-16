// Map countries to preferred languages
const countryLanguageMap: Record<string, string> = {
    // Arabic-speaking countries
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'IQ': 'ar', 'JO': 'ar', 'KW': 'ar',
    'LB': 'ar', 'OM': 'ar', 'PS': 'ar', 'QA': 'ar', 'SY': 'ar', 'YE': 'ar',
    'BH': 'ar', 'DZ': 'ar', 'MA': 'ar', 'TN': 'ar', 'LY': 'ar', 'SD': 'ar', 'MR': 'ar',
    
    // French-speaking countries
    'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'CA': 'fr', 'LU': 'fr', 'MC': 'fr',
    'SN': 'fr', 'CI': 'fr', 'ML': 'fr', 'BF': 'fr', 'NE': 'fr', 'TD': 'fr',
    'GA': 'fr', 'CG': 'fr', 'CD': 'fr',
    
    // Spanish-speaking countries
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es',
    'CL': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es',
    'HN': 'es', 'PY': 'es', 'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es',
    'UY': 'es', 'GQ': 'es',
};

/**
 * Detect user's language based on their country
 * Uses IP geolocation API to get country code
 */
async function detectLanguageFromCountry(): Promise<string | null> {
    try {
        // Check cache first (valid for 7 days)
        const cachedCountry = localStorage.getItem('userCountry');
        const cachedTime = localStorage.getItem('userCountryTime');
        const cacheValid = cachedTime && (Date.now() - parseInt(cachedTime)) < 7 * 24 * 60 * 60 * 1000;
        
        if (cachedCountry && cacheValid) {
            return countryLanguageMap[cachedCountry] || null;
        }

        // Fetch country from IP geolocation API
        const response = await fetch('https://ipapi.co/json/', { 
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (!response.ok) return null;

        const data = await response.json();
        const countryCode = data.country_code;

        if (countryCode) {
            localStorage.setItem('userCountry', countryCode);
            localStorage.setItem('userCountryTime', Date.now().toString());
            return countryLanguageMap[countryCode] || null;
        }

        return null;
    } catch (error) {
        console.warn('Country detection failed:', error);
        return null;
    }
}

export default {
    name: 'countryDetector',
    
    lookup() {
        // Always try to detect and set the best language on first visit or if browser language changes
        detectLanguageFromCountry().then(lang => {
            const userSet = localStorage.getItem('i18nextLng');
            if (lang && (!userSet || userSet === 'en' || userSet === 'ar' || userSet === 'fr' || userSet === 'es')) {
                if (userSet !== lang) {
                    localStorage.setItem('i18nextLng', lang);
                    window.location.reload();
                }
            }
        });
        return undefined;
    },

    cacheUserLanguage() {
        // Not used
    }
};
