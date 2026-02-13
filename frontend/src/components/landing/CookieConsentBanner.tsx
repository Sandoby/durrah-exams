import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { getCookieConsent, hasCookieConsentDecision, setCookieConsent } from '../../lib/cookieConsent';

type Preferences = {
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
};

export function CookieConsentBanner() {
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
    const [hasDecision, setHasDecision] = useState(false);
    const [prefs, setPrefs] = useState<Preferences>({
        analytics: false,
        marketing: false,
        preferences: true,
    });

    useEffect(() => {
        const existing = getCookieConsent();
        if (existing) {
            setHasDecision(true);
            setPrefs({
                analytics: existing.analytics,
                marketing: existing.marketing,
                preferences: existing.preferences,
            });
            setIsOpen(false);
            return;
        }
        const decided = hasCookieConsentDecision();
        setHasDecision(decided);
        setIsOpen(!decided);
    }, []);

    const savePreferences = (next: Preferences) => {
        setCookieConsent(next);
        setHasDecision(true);
        setPrefs(next);
        setIsOpen(false);
        setIsCustomizeOpen(false);
    };

    if (!isOpen) {
        if (hasDecision) return null;
        return (
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setIsCustomizeOpen(true);
                }}
                className="fixed bottom-4 left-4 z-[70] rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
            >
                Cookie Settings
            </button>
        );
    }

    return (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4">
            <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            Your Privacy Choices
                        </h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            We use essential cookies to run the platform. Analytics and marketing cookies are optional and only enabled with your consent.
                            Read our <Link to="/privacy" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Privacy Policy</Link>.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close cookie banner"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {isCustomizeOpen && (
                    <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <PreferenceRow
                            label="Essential"
                            description="Authentication, security, and payment session integrity."
                            checked
                            disabled
                            onChange={() => undefined}
                        />
                        <PreferenceRow
                            label="Preferences"
                            description="Remember UI preferences such as language and display options."
                            checked={prefs.preferences}
                            onChange={(checked) => setPrefs((prev) => ({ ...prev, preferences: checked }))}
                        />
                        <PreferenceRow
                            label="Analytics"
                            description="Anonymous usage and traffic measurement to improve product quality."
                            checked={prefs.analytics}
                            onChange={(checked) => setPrefs((prev) => ({ ...prev, analytics: checked }))}
                        />
                        <PreferenceRow
                            label="Marketing"
                            description="Ad attribution and campaign measurement."
                            checked={prefs.marketing}
                            onChange={(checked) => setPrefs((prev) => ({ ...prev, marketing: checked }))}
                        />
                    </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => savePreferences({ analytics: false, marketing: false, preferences: true })}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Reject Non-Essential
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCustomizeOpen((prev) => !prev)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {isCustomizeOpen ? 'Hide Options' : 'Manage Preferences'}
                    </button>
                    <button
                        type="button"
                        onClick={() => savePreferences({ analytics: true, marketing: true, preferences: true })}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Accept All
                    </button>
                    {isCustomizeOpen && (
                        <button
                            type="button"
                            onClick={() => savePreferences(prefs)}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                        >
                            Save Choices
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function PreferenceRow({
    label,
    description,
    checked,
    disabled = false,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-80' : ''}`}>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-300">{description}</span>
            </span>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
            />
        </label>
    );
}
