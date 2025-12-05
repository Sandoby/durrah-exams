// Local AI extraction using Ollama (free, runs on user's machine)
// No internet required, no API keys needed, completely private
import type { ExtractedQuestion } from '../extractors';

export interface OllamaResponse {
  response: string;
  done: boolean;
}

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'mistral'; // Fast, good quality, ~4GB download

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function extractWithOllama(
  text: string,
  maxQuestions: number = 50
): Promise<ExtractedQuestion[] | null> {
  try {
    // Check if Ollama is running
    const available = await isOllamaAvailable();
    if (!available) {
      console.warn('❌ Ollama not running. Start with: ollama run mistral');
      return null;
    }

    console.log('🤖 Using local Ollama model (mistral)...');

    // Clean and limit text
    const cleanedText = text
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .substring(0, 3000);

    const prompt = `Extract exactly ${maxQuestions} educational questions from this text.
Return ONLY a valid JSON array with this exact structure (no markdown):
[{"type":"multiple_choice","question_text":"...","options":["..."],"correct_answer":"...","points":1,"difficulty":"medium"}]

Supported types: multiple_choice, true_false, fill_blank, short_answer, dropdown
Difficulty: easy, medium, hard

Text:
${cleanedText}

Return ONLY JSON array, nothing else:`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        temperature: 0.1, // Low temperature for consistency
        num_predict: 2048,
      }),
    });

    if (!response.ok) {
      console.error('❌ Ollama error:', response.statusText);
      return null;
    }

    const data = (await response.json()) as OllamaResponse;
    let responseText = data.response;

    // Clean response - remove markdown code blocks
    if (responseText.includes('```json')) {
      responseText = responseText.split('```json')[1]?.split('```')[0] || responseText;
    } else if (responseText.includes('```')) {
      responseText = responseText.split('```')[1]?.split('```')[0] || responseText;
    }
    responseText = responseText.trim();

    // Parse JSON
    let questions: any[];
    try {
      questions = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Ollama response:', responseText.substring(0, 200));
      return null;
    }

    if (!Array.isArray(questions)) {
      console.error('❌ Invalid response format from Ollama');
      return null;
    }

    // Validate and normalize
    const results = questions
      .filter((q) => q && q.question_text)
      .map((q) => ({
        type: normalizeType(q.type) as any,
        question_text: sanitizeText(q.question_text),
        options: Array.isArray(q.options) ? q.options.map(sanitizeText) : [],
        correct_answer: q.correct_answer ? sanitizeText(q.correct_answer) : undefined,
        points: Math.max(1, Math.min(100, q.points || 1)),
        difficulty: normalizeDifficulty(q.difficulty) as any,
        category: q.category ? sanitizeText(q.category) : undefined,
        tags: Array.isArray(q.tags) ? q.tags.map(sanitizeText) : [],
      })) as ExtractedQuestion[];

    console.log(`✅ Extracted ${results.length} questions with local Ollama`);
    return results;
  } catch (error) {
    console.error('❌ Ollama extraction error:', error);
    return null;
  }
}

function normalizeType(
  type: string
): 'multiple_choice' | 'multiple_select' | 'true_false' | 'numeric' | 'dropdown' {
  const normalized = (type || '').toLowerCase().replace(/[_-\s]/g, '');

  if (normalized.includes('multiple') && normalized.includes('select')) return 'multiple_select';
  if (normalized.includes('multiple') || normalized.includes('choice')) return 'multiple_choice';
  if (normalized.includes('true') || normalized.includes('false')) return 'true_false';
  if (normalized.includes('numeric') || normalized.includes('number')) return 'numeric';
  if (normalized.includes('dropdown') || normalized.includes('select')) return 'dropdown';

  return 'multiple_choice';
}

function normalizeDifficulty(
  input?: string
): 'easy' | 'medium' | 'hard' | undefined {
  if (!input) return undefined;

  const lower = input.toLowerCase();
  if (lower.includes('easy')) return 'easy';
  if (lower.includes('hard')) return 'hard';
  if (lower.includes('medium')) return 'medium';

  return undefined;
}

function sanitizeText(text: any): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
    .replace(/[^\w\s\-.,!?()[\]'"]/g, (char) => {
      // Keep alphanumeric, spaces, and common punctuation
      const code = char.charCodeAt(0);
      if (code > 127) return ''; // Remove non-ASCII for now
      return char;
    })
    .trim()
    .substring(0, 1000); // Limit length
}

export async function getOllamaStatus(): Promise<{
  available: boolean;
  model: string;
  message: string;
}> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      return {
        available: false,
        model: OLLAMA_MODEL,
        message: '❌ Ollama not running. Download from https://ollama.ai',
      };
    }

    const data = (await response.json()) as { models: Array<{ name: string }> };
    const hasMistral = data.models?.some((m) => m.name.includes('mistral'));

    if (!hasMistral) {
      return {
        available: false,
        model: OLLAMA_MODEL,
        message: `⚠️  Ollama running but ${OLLAMA_MODEL} not installed. Run: ollama run ${OLLAMA_MODEL}`,
      };
    }

    return {
      available: true,
      model: OLLAMA_MODEL,
      message: `✅ Ollama ready with ${OLLAMA_MODEL}`,
    };
  } catch {
    return {
      available: false,
      model: OLLAMA_MODEL,
      message: '❌ Ollama not responding on localhost:11434',
    };
  }
}
