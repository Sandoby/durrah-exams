import { config, getAIKey } from './config';
import { GoogleGenAI } from "@google/genai";

/**
 * Configure AI Client
 */
const getClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

/**
 * Helper to generate content with fallback
 */
const generateWithGemini = async (prompt: string, apiKey: string, temperature: number = 0.3): Promise<string> => {
    const ai = getClient(apiKey);
    console.log(`Debug: Using Gemini Key starting with: ${apiKey.substring(0, 6)}...`);

    // Models to try in order
    const models = ["gemini-3-flash-preview", "gemini-2.0-flash-exp", config.gemini.model];

    let lastError: any = null;

    for (const modelName of models) {
        try {
            console.log(`Attempting generation with ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                config: {
                    temperature,
                    responseMimeType: "application/json",
                },
                contents: [{ parts: [{ text: prompt }] }],
            });

            // Try to extract text using multiple methods
            const text = (response as any).text ||
                (typeof (response as any).text === 'function' ? (response as any).text() : null) ||
                response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (typeof text === 'string' && text.trim()) {
                console.log(`Successfully generated content using ${modelName}`);
                return text;
            }
            throw new Error(`Empty or invalid response from ${modelName}`);
        } catch (error: any) {
            lastError = error;
            const statusCode = error.status || (error.message?.includes('404') ? 404 : error.message?.includes('429') ? 429 : null);
            console.warn(`${modelName} failed with status: ${statusCode || 'unknown'}. Error: ${error.message}`);

            if (modelName === config.gemini.model) break;
        }
    }

    throw new Error(`AI generation failed after trying all models. Last error: ${lastError?.message || 'Unknown error'}`);
}


/**
 * Extract questions from document content using Google Gemini AI
 */
export const extractQuestionsWithGemini = async (content: string): Promise<any[]> => {
    const apiKey = getAIKey('gemini');

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const prompt = `Extract all exam questions from the following text and return them as a JSON array. 
IMPORTANT: Return ONLY the JSON array, no other text or explanation. 
If the text is in Arabic, keep the questions and options in Arabic.

The JSON should be an array of objects with exactly these fields:
- type: "multiple_choice", "multiple_select", "true_false", "dropdown", "numeric", or "short_answer"
- question_text: the text of the question
- options: array of strings (required for multiple_choice, multiple_select, dropdown)
- correct_answer: the correct answer (string for single answer, array for multiple answers)
- points: number (default 1)
- difficulty: "easy", "medium", or "hard"
- category: subject area
- tags: array of strings

Text to analyze:
${content}`;

    try {
        const responseText = await generateWithGemini(prompt, apiKey, config.gemini.temperature);

        // Clean markdown if present
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/```\n?/g, '');
        }

        const questions = JSON.parse(cleanJson);
        return Array.isArray(questions) ? questions : [questions];
    } catch (error: any) {
        console.error('Gemini extraction error:', error);
        throw new Error(error.message || 'Failed to extract questions with Gemini');
    }
};

/**
 * Extract questions from document content using AI (Gemini preferred)
 */
export const extractQuestionsWithAI = async (content: string): Promise<any[]> => {
    try {
        return await extractQuestionsWithGemini(content);
    } catch (geminiError) {
        console.warn('Gemini failed, falling back to Groq:', geminiError);
        try {
            return await extractQuestionsWithGroq(content);
        } catch (groqError) {
            throw new Error('AI extraction failed on all providers');
        }
    }
};

/**
 * Extract questions from document content using Groq AI (Legacy/Fallback)
 */
export const extractQuestionsWithGroq = async (content: string): Promise<any[]> => {
    const apiKey = getAIKey('groq');

    if (!apiKey) {
        throw new Error('Groq AI API key not configured');
    }

    const prompt = `Extract all exam questions from the following text and return them as a JSON array. Each question should be an object with these fields:
- type: "multiple_choice", "multiple_select", "true_false", "dropdown", "numeric", or "short_answer"
- question_text: the question text
- options: array of option strings (for multiple_choice, multiple_select, dropdown)
- correct_answer: the correct answer (string for single answer, array for multiple answers)
- points: number of points (default 1)
- difficulty: "easy", "medium", or "hard"
- category: subject/topic category
- tags: array of relevant tags

Text to analyze:
${content}

Return ONLY the JSON array, no other text.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: config.groq.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that extracts exam questions from documents and formats them as JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to extract questions');
        }

        const data = await response.json();
        const responseContent = data.choices[0]?.message?.content;

        if (!responseContent) {
            throw new Error('No content returned from AI');
        }

        // Parse JSON from response
        let jsonStr = responseContent.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
        }

        const questions = JSON.parse(jsonStr);
        return Array.isArray(questions) ? questions : [questions];
    } catch (error: any) {
        console.error('Groq extraction error:', error);
        throw new Error(error.message || 'Failed to extract questions with Groq');
    }
};

/**
 * Generate exam questions using AI based on a topic
 */
export const generateQuestionsWithAI = async (
    topic: string,
    count: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    type?: string
): Promise<any[]> => {
    const geminiKey = getAIKey('gemini');

    // We'll prefer Gemini for generation too
    if (geminiKey) {
        return generateQuestionsWithGemini(topic, count, difficulty, type);
    }

    // Fallback logic could go here, but let's stick to implementing Gemini first
    throw new Error('Gemini API key not configured for generation');
};

/**
 * Generate exam questions using Gemini
 */
export const generateQuestionsWithGemini = async (
    topic: string,
    count: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    type?: string
): Promise<any[]> => {
    const apiKey = getAIKey('gemini');

    if (!apiKey) throw new Error('Gemini API key not configured');

    const typeFilter = type ? `All questions should be of type: ${type}` : 'Use a variety of question types (multiple_choice, true_false, etc.)';

    const prompt = `Generate ${count} exam questions about "${topic}" with ${difficulty} difficulty level. ${typeFilter}

Return a JSON array where each question has:
- type: "multiple_choice", "multiple_select", "true_false", "dropdown", "numeric", or "short_answer"
- question_text: the question text
- options: array of option strings (for multiple_choice, multiple_select, dropdown) - at least 4 options
- correct_answer: the correct answer
- points: number of points (1-5 based on difficulty)
- difficulty: "${difficulty}"
- category: "${topic}"
- tags: array of 2-3 relevant tags

Return ONLY the JSON array, no other text.`;

    try {
        const responseText = await generateWithGemini(prompt, apiKey, 0.7);

        // Clean markdown if present
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/```\n?/g, '');
        }

        const questions = JSON.parse(cleanJson);
        return Array.isArray(questions) ? questions : [questions];
    } catch (error: any) {
        console.error('Gemini generation error:', error);
        throw new Error('Failed to generate questions with AI');
    }
};
/**
 * Read file content as text
 */
export const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve(content);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};
