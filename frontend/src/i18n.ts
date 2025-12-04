import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import countryLanguageDetector from './lib/countryLanguageDetector';

import enTranslation from './locales/en/translation.json';
import arTranslation from './locales/ar/translation.json';
import frTranslation from './locales/fr/translation.json';
import esTranslation from './locales/es/translation.json';

const languageDetector = new LanguageDetector();
languageDetector.addDetector(countryLanguageDetector);

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslation },
            ar: { translation: arTranslation },
            fr: { translation: frTranslation },
            es: { translation: esTranslation },
        },
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'countryDetector', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
        react: {
            useSuspense: false,
        }
    });

export default i18n;
