// Global configuration for the application

export const config = {
    // Current Active Provider
    activeProvider: 'openrouter' as 'groq' | 'openrouter',

    // OpenRouter Configuration (Better for users - Truly Free Models)
    openrouter: {
        apiKey: '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',
        model: 'meta-llama/llama-3-8b-instruct:free',
        baseUrl: 'https://openrouter.ai/api/v1',
    },

    // Groq API Configuration (Free & Fast AI)
    groq: {
        apiKey: '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',
        model: 'llama-3.3-70b-versatile',
        baseUrl: 'https://api.groq.com/openai/v1',
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
