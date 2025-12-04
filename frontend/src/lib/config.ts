// Global configuration for the application

export const config = {
    // Groq API Configuration (Free & Fast AI)
    groq: {
        apiKey: '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',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
    },
    
    // LocalStorage keys
    storage: {
        aiApiKey: 'durrah_ai_api_key',
        theme: 'durrah_theme',
        language: 'durrah_language',
    },
};

/**
 * Get the Groq API key from localStorage or use default
 */
export const getAIKey = (): string => {
    const saved = localStorage.getItem(config.storage.aiApiKey);
    return saved || config.groq.apiKey;
};

/**
 * Save AI API key to localStorage
 */
export const setAIKey = (key: string): void => {
    localStorage.setItem(config.storage.aiApiKey, key);
};

// Keep old names for backwards compatibility
export const getOpenAIKey = getAIKey;
export const setOpenAIKey = setAIKey;
