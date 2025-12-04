import { getAIKey } from './config';

/**
 * Extract questions from document content using Groq AI
 */
export const extractQuestionsWithAI = async (content: string): Promise<any[]> => {
    const apiKey = getAIKey();
    
    if (!apiKey) {
        throw new Error('AI API key not configured');
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
                model: 'llama-3.3-70b-versatile',
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
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content returned from AI');
        }

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
        }

        const questions = JSON.parse(jsonStr);
        return Array.isArray(questions) ? questions : [questions];
    } catch (error: any) {
        console.error('AI extraction error:', error);
        throw new Error(error.message || 'Failed to extract questions with AI');
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
    const apiKey = getAIKey();
    
    if (!apiKey) {
        throw new Error('AI API key not configured');
    }

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
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educator that creates high-quality exam questions.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate questions');
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content returned from AI');
        }

        // Parse JSON from response
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
        }

        const questions = JSON.parse(jsonStr);
        return Array.isArray(questions) ? questions : [questions];
    } catch (error: any) {
        console.error('AI generation error:', error);
        throw new Error(error.message || 'Failed to generate questions with AI');
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
