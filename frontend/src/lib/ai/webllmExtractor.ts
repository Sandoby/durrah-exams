// Browser-based AI using WebLLM - runs completely in the user's browser
// No server needed, no API keys, completely free, works offline!

import type { ExtractedQuestion } from '../extractors';

// @ts-ignore - WebLLM is loaded dynamically
declare global {
  interface Window {
    webllm: any;
  }
}

let engine: any = null;
let isInitializing = false;

const MODELS = {
  // Fast models for question extraction (recommended)
  'Phi-2': 'phi-2-q4f32_1',
  'Mistral-7B': 'mistral-7b-instruct-v0.2-q4f32_1',
  'TinyLlama': 'TinyLlama-1.1B-Chat-v1.0-q4f32_1',
};

const EXTRACTION_PROMPT = `Extract ALL educational questions from the provided text.
Return ONLY valid JSON array with this structure:
[{"type":"multiple_choice","question_text":"What is 2+2?","options":["3","4","5"],"correct_answer":"4","points":1,"difficulty":"easy"}]

Valid types: "multiple_choice", "true_false", "fill_blank", "short_answer"
Return ONLY JSON, no markdown, no explanation.`;

export async function initializeWebLLM(modelName: string = 'Phi-2'): Promise<boolean> {
  if (engine) {
    console.log('✅ WebLLM already initialized');
    return true;
  }

  if (isInitializing) {
    console.log('⏳ WebLLM initialization in progress...');
    return false;
  }

  try {
    isInitializing = true;
    console.log('🚀 Initializing WebLLM...');

    // Check if WebGPU is supported
    const adapter = await (navigator as any).gpu?.requestAdapter();
    if (!adapter) {
      console.warn('⚠️  WebGPU not supported in this browser');
      isInitializing = false;
      return false;
    }

    // Load WebLLM library
    if (!window.webllm) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@latest/dist/web-llm.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const { CreateMLCEngine } = window.webllm;
    
    // Select model
    const modelKey = modelName as keyof typeof MODELS;
    const modelId = MODELS[modelKey] || MODELS['Phi-2'];

    console.log(`📦 Loading model: ${modelName}...`);
    engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (progress: any) => {
        console.log(`⏳ Loading: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
    });

    console.log('✅ WebLLM initialized successfully');
    isInitializing = false;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize WebLLM:', error);
    console.log('💡 Make sure your browser supports WebGPU (Chrome 113+, Edge 113+, Opera 99+)');
    isInitializing = false;
    return false;
  }
}

export async function extractQuestionsWithWebLLM(
  text: string,
  maxQuestions: number = 50,
  onProgress?: (message: string) => void
): Promise<ExtractedQuestion[] | null> {
  try {
    if (!engine) {
      onProgress?.('🚀 Initializing local AI model...');
      const initialized = await initializeWebLLM('Phi-2');
      if (!initialized) {
        console.error('❌ Could not initialize WebLLM');
        return null;
      }
    }

    onProgress?.('🤖 Processing questions with local AI...');
    
    // Limit text to prevent timeout
    const limitedText = text.substring(0, 3000);

    // Clean text
    const cleanText = limitedText
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .trim();

    if (!cleanText) {
      console.error('Text is empty after cleaning');
      return null;
    }

    const prompt = `${EXTRACTION_PROMPT}

TEXT:
${cleanText}

Extract ${maxQuestions} questions maximum. Return ONLY valid JSON.`;

    console.log('📤 Sending to WebLLM model...');
    
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting educational questions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    
    if (!content) {
      console.error('No response from WebLLM');
      return null;
    }

    // Parse JSON response
    let jsonText = content;
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1]?.split('```')[0] || content;
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1]?.split('```')[0] || content;
    }
    jsonText = jsonText.trim();

    let questionsData: any[];
    try {
      questionsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse WebLLM response:', parseError);
      console.error('Response was:', jsonText.substring(0, 500));
      return null;
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      console.warn('No valid questions in response');
      return null;
    }

    // Validate and normalize
    const extracted: ExtractedQuestion[] = questionsData
      .filter((q) => q?.question_text && q.question_text.length > 5)
      .map((q) => ({
        type: normalizeType(q.type || 'multiple_choice'),
        question_text: (q.question_text || '').trim(),
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || undefined,
        points: Math.max(1, Math.min(100, q.points || 1)),
        difficulty: normalizeDifficulty(q.difficulty),
        category: q.category || undefined,
        tags: Array.isArray(q.tags) ? q.tags : [],
      }));

    onProgress?.(`✅ Extracted ${extracted.length} questions`);
    console.log(`✅ Successfully extracted ${extracted.length} questions with WebLLM`);
    
    return extracted;
  } catch (error) {
    console.error('Error calling WebLLM:', error);
    return null;
  }
}

function normalizeType(
  type: string
): 'multiple_choice' | 'multiple_select' | 'true_false' | 'numeric' | 'dropdown' {
  const normalized = type.toLowerCase().replace(/[_-\s]/g, '');

  if (normalized.includes('multiple') && normalized.includes('select')) return 'multiple_select';
  if (normalized.includes('multiple') || normalized.includes('choice')) return 'multiple_choice';
  if (normalized.includes('true') || normalized.includes('false')) return 'true_false';
  if (normalized.includes('numeric') || normalized.includes('number')) return 'numeric';
  if (normalized.includes('dropdown') || normalized.includes('select')) return 'dropdown';

  return 'multiple_choice';
}

function normalizeDifficulty(input?: string): 'easy' | 'medium' | 'hard' | undefined {
  if (!input) return undefined;

  const lower = input.toLowerCase();
  if (lower.includes('easy')) return 'easy';
  if (lower.includes('hard')) return 'hard';
  if (lower.includes('medium')) return 'medium';

  return undefined;
}

export async function checkWebGPUSupport(): Promise<boolean> {
  return !!((await (navigator as any).gpu?.requestAdapter()));
}

export async function unloadWebLLM(): Promise<void> {
  if (engine) {
    try {
      await engine.dispose();
      engine = null;
      console.log('✅ WebLLM unloaded');
    } catch (error) {
      console.error('Error unloading WebLLM:', error);
    }
  }
}
