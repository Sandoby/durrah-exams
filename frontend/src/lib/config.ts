// Global configuration for the application

export const config = {
    // OpenAI API Configuration
    openai: {
        apiKey: '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',
        model: 'gpt-4o-mini',
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
 * Get the OpenAI API key from localStorage or use default
 */
export const getOpenAIKey = (): string => {
    const saved = localStorage.getItem(config.storage.aiApiKey);
    return saved || config.openai.apiKey;
};

/**
 * Save OpenAI API key to localStorage
 */
export const setOpenAIKey = (key: string): void => {
    localStorage.setItem(config.storage.aiApiKey, key);
};
