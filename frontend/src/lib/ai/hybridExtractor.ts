// Hybrid extraction orchestrator - combines local parsing with AI enhancement
import { parseQuestionsLocally } from './localParser';
import { enhanceWithGroqAI, enhanceWithHuggingFaceAI, mergeExtractions } from './groqExtractor';
import { extractWithOllama } from './ollamaExtractor';
import { extractQuestionsWithWebLLM, checkWebGPUSupport } from './webllmExtractor';
import type { ExtractedQuestion } from '../extractors';

export interface HybridExtractionResult {
  questions: ExtractedQuestion[];
  metadata: {
    totalExtracted: number;
    localConfidenceScore: number;
    usedAI: boolean;
    aiProvider?: 'groq' | 'huggingface' | 'ollama' | 'webllm' | 'none';
    processingTime: number;
    issues: string[];
  };
}

export async function extractQuestionsHybrid(
  text: string,
  options: {
    useAI?: boolean;
    preferLocal?: boolean; // Try Ollama first if available
    confidenceThreshold?: number;
    maxQuestions?: number;
  } = {}
): Promise<HybridExtractionResult> {
  const startTime = performance.now();
  const issues: string[] = [];

  const {
    useAI = true,
    preferLocal = true, // Prefer local Ollama over cloud APIs
    confidenceThreshold = 80,
    maxQuestions = 100,
  } = options;

  // Step 1: Local parsing - always do this first
  console.log('🔍 Starting local question parsing...');
  const localResult = parseQuestionsLocally(text);

  if (!localResult.questions || localResult.questions.length === 0) {
    issues.push('No questions detected in local parsing');
    return {
      questions: [],
      metadata: {
        totalExtracted: 0,
        localConfidenceScore: 0,
        usedAI: false,
        processingTime: performance.now() - startTime,
        issues,
      },
    };
  }

  console.log(`✅ Local parsing found ${localResult.questions.length} questions`);
  console.log(`📊 Local confidence: ${localResult.totalConfidence}%`);

  // Step 2: Check if we need AI enhancement
  let finalQuestions: ExtractedQuestion[] = localResult.questions;
  let usedAI = false;
  let aiProvider: 'groq' | 'huggingface' | 'ollama' | 'webllm' | 'none' = 'none';

  if (useAI && localResult.totalConfidence < confidenceThreshold) {
    console.log(`⚠️  Confidence ${localResult.totalConfidence}% below threshold ${confidenceThreshold}%`);
    console.log('🤖 Attempting AI enhancement...');

    let aiQuestions: ExtractedQuestion[] | null = null;

    // Step 2a: Try WebLLM first (browser-based, no server needed)
    if (preferLocal && (await checkWebGPUSupport())) {
      console.log('🌐 Trying browser-based WebLLM AI...');
      aiQuestions = await extractQuestionsWithWebLLM(text, maxQuestions);
      if (aiQuestions) {
        aiProvider = 'webllm';
        console.log('✅ WebLLM succeeded');
      }
    }

    // Step 2b: Try local Ollama if WebLLM failed
    if (!aiQuestions && preferLocal) {
      console.log('🏠 Trying local Ollama AI...');
      aiQuestions = await extractWithOllama(text, maxQuestions);
      if (aiQuestions) {
        aiProvider = 'ollama';
        console.log('✅ Local Ollama succeeded');
      }
    }

    // Step 2c: Try Groq if local options failed
    if (!aiQuestions) {
      console.log('☁️  Trying cloud Groq API...');
      aiQuestions = await enhanceWithGroqAI(text, maxQuestions);
      if (aiQuestions) {
        aiProvider = 'groq';
        console.log('✅ Groq succeeded');
      }
    }

    // Step 2d: Try Hugging Face fallback
    if (!aiQuestions) {
      console.log('☁️  Trying Hugging Face fallback...');
      aiQuestions = await enhanceWithHuggingFaceAI(text, maxQuestions);
      if (aiQuestions) {
        aiProvider = 'huggingface';
        console.log('✅ Hugging Face succeeded');
      } else {
        console.log('⚠️  All AI providers failed, using local results');
        issues.push('AI enhancement failed - using local parsing results');
      }
    }

    if (aiQuestions && aiQuestions.length > 0) {
      console.log(`✅ AI enhancement found ${aiQuestions.length} questions`);
      finalQuestions = mergeExtractions(localResult.questions, aiQuestions);
      usedAI = true;
    } else {
      console.log('ℹ️  AI returned no results, keeping local results');
      if (!issues.includes('AI enhancement failed - using local parsing results')) {
        issues.push('AI returned no valid questions');
      }
    }
  } else if (useAI && localResult.totalConfidence >= confidenceThreshold) {
    console.log(`✅ Confidence ${localResult.totalConfidence}% is sufficient, skipping AI`);
  } else if (!useAI) {
    console.log('ℹ️  Hybrid extraction disabled, using local parsing only');
  }

  // Step 3: Limit to maxQuestions
  if (finalQuestions.length > maxQuestions) {
    console.log(`📌 Limiting results to ${maxQuestions} questions`);
    finalQuestions = finalQuestions.slice(0, maxQuestions);
  }

  const processingTime = performance.now() - startTime;
  console.log(`⏱️  Total processing time: ${processingTime.toFixed(0)}ms`);

  return {
    questions: finalQuestions,
    metadata: {
      totalExtracted: finalQuestions.length,
      localConfidenceScore: localResult.totalConfidence,
      usedAI,
      aiProvider,
      processingTime,
      issues,
    },
  };
}

export function getConfidenceLevel(
  confidence: number
): 'high' | 'medium' | 'low' {
  if (confidence >= 80) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

export function getConfidenceColor(
  confidence: number
): string {
  const level = getConfidenceLevel(confidence);
  if (level === 'high') return '#22c55e'; // green
  if (level === 'medium') return '#f59e0b'; // amber
  return '#ef4444'; // red
}

export function formatConfidenceDisplay(confidence: number): string {
  return `${Math.round(confidence)}% confident`;
}
