// Groq API integration for AI-powered question enhancement
import type { ExtractedQuestion } from '../extractors';

export interface GroqError {
  error?: string;
  message?: string;
}

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt for question extraction
const SYSTEM_PROMPT = `You are an expert at parsing and extracting educational questions from text.
Your task is to parse questions and return them in valid JSON format.

For each question, extract:
1. type: one of "multiple_choice", "true_false", "fill_blank", "short_answer", "essay"
2. question_text: the full question
3. options: array of options (if multiple choice)
4. correct_answer: the correct answer or option
5. points: number of points (default 1)
6. difficulty: "easy", "medium", or "hard"
7. category: subject/category if identifiable
8. tags: array of relevant tags

Return ONLY valid JSON array, no markdown, no explanation.
Example: [{"type":"multiple_choice","question_text":"What is 2+2?","options":["3","4","5"],"correct_answer":"4","points":1,"difficulty":"easy"}]`;

export async function enhanceWithGroqAI(
  text: string,
  maxQuestions: number = 50
): Promise<ExtractedQuestion[] | null> {
  if (!GROQ_API_KEY) {
    console.warn('VITE_GROQ_API_KEY not set - skipping AI enhancement');
    return null;
  }

  try {
    // Limit text to reasonable size to avoid token limits
    const limitedText = text.substring(0, 8000);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768', // Fast model
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Extract and parse all questions from this text. Limit to ${maxQuestions} questions:\n\n${limitedText}`,
          },
        ],
        temperature: 0.3, // Lower temperature for consistency
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as GroqError;
      console.error('Groq API error:', error);
      return null;
    }

    const data = (await response.json()) as GroqResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in Groq response');
      return null;
    }

    // Parse JSON response
    const rawQuestions = JSON.parse(content) as Array<any>;

    // Validate and normalize questions
    return rawQuestions.map((q) => ({
      type: normalizeQuestionType(q.type),
      question_text: q.question_text?.trim() || '',
      options: q.options || [],
      correct_answer: q.correct_answer || undefined,
      points: q.points || 1,
      difficulty: normalizeDifficulty(q.difficulty),
      category: q.category || undefined,
      tags: q.tags || [],
    })) as ExtractedQuestion[];
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return null;
  }
}

// Fallback to Hugging Face if Groq fails
export async function enhanceWithHuggingFaceAI(
  text: string,
  _maxQuestions?: number
): Promise<ExtractedQuestion[] | null> {
  const hfToken = import.meta.env.VITE_HF_API_KEY;

  if (!hfToken) {
    console.warn('VITE_HF_API_KEY not set');
    return null;
  }

  try {
    const limitedText = text.substring(0, 8000);

    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        headers: { Authorization: `Bearer ${hfToken}` },
        method: 'POST',
        body: JSON.stringify({
          inputs: `${SYSTEM_PROMPT}\n\nExtract and parse all questions from this text. Return valid JSON array only:\n\n${limitedText}`,
          parameters: {
            max_new_tokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('HF API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const content = (data as any)[0]?.generated_text;

    if (!content) {
      return null;
    }

    // Extract JSON from response (it may have extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const rawQuestions = JSON.parse(jsonMatch[0]) as Array<any>;
    return rawQuestions.map((q) => ({
      type: normalizeQuestionType(q.type),
      question_text: q.question_text?.trim() || '',
      options: q.options || [],
      correct_answer: q.correct_answer || undefined,
      points: q.points || 1,
      difficulty: normalizeDifficulty(q.difficulty),
      category: q.category || undefined,
      tags: q.tags || [],
    })) as ExtractedQuestion[];
  } catch (error) {
    console.error('Error calling HF API:', error);
    return null;
  }
}

function normalizeQuestionType(
  type: string
): 'multiple_choice' | 'multiple_select' | 'true_false' | 'numeric' | 'dropdown' {
  const normalized = type.toLowerCase().replace(/[_-\s]/g, '');

  if (normalized.includes('multiple') && normalized.includes('select')) return 'multiple_select';
  if (normalized.includes('multiple') || normalized.includes('choice')) return 'multiple_choice';
  if (normalized.includes('true') || normalized.includes('false')) return 'true_false';
  if (normalized.includes('numeric') || normalized.includes('number')) return 'numeric';
  if (normalized.includes('dropdown') || normalized.includes('select')) return 'dropdown';

  return 'multiple_choice'; // Default
}

function normalizeDifficulty(
  input?: string
): 'easy' | 'medium' | 'hard' | undefined {
  if (!input) return undefined;

  const lower = input.toLowerCase();
  if (lower.includes('easy') || lower === '1') return 'easy';
  if (lower.includes('hard') || lower === '5') return 'hard';
  if (lower.includes('medium') || lower === '3') return 'medium';

  return undefined;
}

// Validate if question has required fields
export function isValidQuestion(q: any): boolean {
  return (
    q.question_text &&
    q.question_text.length > 5 &&
    q.type &&
    (q.type === 'essay' ||
      q.type === 'short_answer' ||
      (Array.isArray(q.options) && q.options.length > 0))
  );
}

// Merge local extraction with AI enhancement
export function mergeExtractions(
  localQuestions: ExtractedQuestion[],
  aiQuestions: ExtractedQuestion[] | null
): ExtractedQuestion[] {
  if (!aiQuestions) return localQuestions;

  // Use AI results if available and valid
  return aiQuestions.filter(isValidQuestion);
}
