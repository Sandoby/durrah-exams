// Global configuration for the application

export const config = {
    // Groq API Configuration (Free & Fast AI)
    groq: {
        apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
    },

    // Google Gemini API (Free & Smart AI)
    gemini: {
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        model: 'gemini-1.5-flash',
        temperature: 0.3,
    },

    // LocalStorage keys
    storage: {
        aiApiKey: 'durrah_ai_api_key',
        geminiApiKey: 'durrah_gemini_api_key',
        theme: 'durrah_theme',
        language: 'durrah_language',
    },
};

/**
 * Get the AI API key (Gemini preferred, then Groq)
 */
export const getAIKey = (provider: 'gemini' | 'groq' = 'gemini'): string => {
    if (provider === 'gemini') {
        const saved = localStorage.getItem(config.storage.geminiApiKey);
        return saved || config.gemini.apiKey;
    }
    const saved = localStorage.getItem(config.storage.aiApiKey);
    return saved || config.groq.apiKey;
};

/**
 * Save AI API key to localStorage
 */
export const setAIKey = (key: string, provider: 'gemini' | 'groq' = 'gemini'): void => {
    if (provider === 'gemini') {
        localStorage.setItem(config.storage.geminiApiKey, key);
    } else {
        localStorage.setItem(config.storage.aiApiKey, key);
    }
};

// Keep old names for backwards compatibility
export const getOpenAIKey = getAIKey;
export const setOpenAIKey = setAIKey;
