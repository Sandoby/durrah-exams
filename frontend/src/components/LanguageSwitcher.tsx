import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'ar', name: 'العربية', flag: '🇪🇬' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }
    ];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        // Explicitly save to localStorage to ensure persistence
        localStorage.setItem('i18nextLng', lng);
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <div className="relative z-[100]" ref={dropdownRef} style={{ pointerEvents: 'auto' }}>
            <button
                type="button"
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                style={{ pointerEvents: 'auto', zIndex: 101 }}
            >
                <Globe className="h-5 w-5" />
                <span className="uppercase">{i18n.language.split('-')[0]}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-100 dark:border-gray-700 z-[200] animate-in fade-in zoom-in-95 duration-100" style={{ pointerEvents: 'auto' }}>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            tabIndex={0}
                            onClick={() => changeLanguage(lang.code)}
                            className={`block w-full text-left px-4 py-2 text-sm ${i18n.language.startsWith(lang.code)
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <span className="mr-2">{lang.flag}</span>
                            {lang.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
