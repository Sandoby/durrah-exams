// Enhanced question parser with confidence scoring
import type { ExtractedQuestion } from './index';

export interface ParsedQuestion {
  question: ExtractedQuestion;
  confidence: number; // 0-100
  rawText: string;
  detectedFormat: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  totalConfidence: number; // Average confidence
  successRate: number; // Percentage of high-confidence extractions
}

// Regex patterns for different question formats
const PATTERNS = {
  // MCQ with letters: a) b) c) d)
  mcqLetters: /^([a-d])\)\s*(.+)$/gm,
  // MCQ with numbers: 1) 2) 3) 4)
  mcqNumbers: /^(\d+)\)\s*(.+)$/gm,
  // MCQ with bullets: • or -
  mcqBullets: /^[\s•-]\s*(.+)$/gm,
  // True/False indicator
  trueFalse: /^(true|false|yes|no)[\s:]?$/im,
  // Fill in blank
  fillBlank: /_{2,}|_+|\[blank\]|\[_+\]/gim,
  // Answer indicator: Answer: A or Correct: C
  answerKey: /(?:answer|correct|key|solution)[\s:]+([a-d\d])/im,
  // Difficulty: Easy/Medium/Hard or 1-5
  difficulty: /difficulty[\s:]+([1-5]|easy|medium|hard)/im,
  // Points: 5 pts or Points: 5
  points: /(?:points|pts)[\s:]*(\d+)/im,
  // Category: [Biology] or Category: Math
  category: /\[([^\]]+)\]|category[\s:]+([^,\n]+)/im,
  // Tags: #tag1 #tag2 or tags: tag1, tag2
  tags: /#([a-z0-9_]+)|tags[\s:]+([^,\n]+(?:,[^,\n]+)*)/gim,
  // Question number: 1. or Q1. or Question 1.
  questionNumber: /^(?:q|question)[\s]*(\d+)[.)]/im,
};

export function parseQuestionsLocally(text: string): ParseResult {
  const lines = text.split('\n');
  const questions: ParsedQuestion[] = [];
  let currentQuestion = '';
  let currentOptions: string[] = [];
  let currentMetadata: Record<string, any> = {};

  // Split by question indicators
  const questionBlocks = splitIntoQuestionBlocks(text);

  for (const block of questionBlocks) {
    const parsed = parseQuestionBlock(block);
    if (parsed) {
      questions.push(parsed);
    }
  }

  const totalConfidence =
    questions.length > 0
      ? questions.reduce((sum, q) => sum + q.confidence, 0) / questions.length
      : 0;

  const successRate =
    questions.length > 0
      ? (questions.filter((q) => q.confidence > 70).length / questions.length) * 100
      : 0;

  return {
    questions,
    totalConfidence: Math.round(totalConfidence),
    successRate: Math.round(successRate),
  };
}

function splitIntoQuestionBlocks(text: string): string[] {
  // Split by question numbers: 1. 2. 3. or Q1. Q2. Q3.
  const blocks = text.split(/(?=^(?:\d+|Q\d+)[.)\s])/m).filter((b) => b.trim());
  return blocks;
}

function parseQuestionBlock(block: string): ParsedQuestion | null {
  if (!block.trim()) return null;

  let confidence = 0;
  const metadata: Record<string, any> = {};
  let detectedFormat = 'unknown';

  // Extract metadata
  const difficultyMatch = block.match(PATTERNS.difficulty);
  if (difficultyMatch) {
    metadata.difficulty = normalizeDifficulty(difficultyMatch[1]);
    confidence += 15;
  }

  const pointsMatch = block.match(PATTERNS.points);
  if (pointsMatch) {
    metadata.points = parseInt(pointsMatch[1]);
    confidence += 10;
  } else {
    metadata.points = 1; // Default
  }

  const categoryMatch = block.match(PATTERNS.category);
  if (categoryMatch) {
    metadata.category = (categoryMatch[1] || categoryMatch[2]).trim();
    confidence += 10;
  }

  const tagsMatch = [...block.matchAll(PATTERNS.tags)];
  if (tagsMatch.length > 0) {
    metadata.tags = tagsMatch.map((m) => (m[1] || m[2]).toLowerCase()).filter(Boolean);
    confidence += 5;
  }

  // Detect question type and extract question text + options
  const answerMatch = block.match(PATTERNS.answerKey);
  const answer = answerMatch ? answerMatch[1].toUpperCase() : null;

  // Check for MCQ
  const mcqLettersMatch = [...block.matchAll(PATTERNS.mcqLetters)];
  const mcqNumbersMatch = [...block.matchAll(PATTERNS.mcqNumbers)];

  if (mcqLettersMatch.length >= 2) {
    detectedFormat = 'multiple_choice';
    const { question, options, confidence: mcqConfidence } = extractMCQLetters(
      block,
      mcqLettersMatch
    );
    metadata.question_text = question;
    metadata.options = options;
    if (answer) {
      const answerIdx = answer.charCodeAt(0) - 65; // A=0, B=1, etc
      metadata.correct_answer = options[answerIdx] || answer;
    }
    confidence += mcqConfidence;
  } else if (mcqNumbersMatch.length >= 2) {
    detectedFormat = 'multiple_choice';
    const { question, options, confidence: mcqConfidence } = extractMCQNumbers(
      block,
      mcqNumbersMatch
    );
    metadata.question_text = question;
    metadata.options = options;
    if (answer) {
      const answerIdx = parseInt(answer) - 1;
      metadata.correct_answer = options[answerIdx] || answer;
    }
    confidence += mcqConfidence;
  }

  // Check for True/False
  if (!metadata.question_text) {
    const lines = block.split('\n');
    const tfLine = lines.find((l) => /true|false|yes|no/i.test(l));
    if (tfLine) {
      detectedFormat = 'true_false';
      metadata.question_text = lines[0].replace(/^\d+[.)]\s*/, '').trim();
      metadata.options = ['True', 'False'];
      if (answer) {
        metadata.correct_answer = answer.toLowerCase() === 't' ? 'True' : 'False';
      }
      confidence += 25;
    }
  }

  // Check for Fill in the Blank
  if (!metadata.question_text && block.match(PATTERNS.fillBlank)) {
    detectedFormat = 'fill_blank';
    metadata.question_text = block.split('\n')[0].replace(/^\d+[.)]\s*/, '').trim();
    confidence += 20;
  }

  // Extract question text if not already done
  if (!metadata.question_text) {
    const lines = block.split('\n');
    const firstNonEmpty = lines.find((l) => l.trim());
    metadata.question_text = firstNonEmpty
      ?.replace(/^\d+[.)]\s*/, '')
      .replace(/^Q\d+[.)]\s*/i, '')
      .trim() || '';
    confidence += 10;
  }

  // Validate
  if (!metadata.question_text || metadata.question_text.length < 5) {
    return null;
  }

  // Cap confidence at 100
  confidence = Math.min(confidence, 100);

  const question: ExtractedQuestion = {
    type: detectedFormat as any,
    question_text: metadata.question_text,
    options: metadata.options,
    correct_answer: metadata.correct_answer,
    points: metadata.points || 1,
    difficulty: metadata.difficulty,
    category: metadata.category,
    tags: metadata.tags,
  };

  return {
    question,
    confidence,
    rawText: block.trim(),
    detectedFormat,
  };
}

function extractMCQLetters(
  block: string,
  matches: RegExpExecArray[]
): { question: string; options: string[]; confidence: number } {
  const lines = block.split('\n');
  const questionLine = lines[0].replace(/^\d+[.)]\s*/, '').trim();

  const options = matches.map((m) => m[2].trim());
  const confidence = 30 + Math.min(options.length * 5, 20); // More options = higher confidence

  return {
    question: questionLine,
    options,
    confidence,
  };
}

function extractMCQNumbers(
  block: string,
  matches: RegExpExecArray[]
): { question: string; options: string[]; confidence: number } {
  const lines = block.split('\n');
  const questionLine = lines[0].replace(/^\d+[.)]\s*/, '').trim();

  const options = matches.map((m) => m[2].trim());
  const confidence = 25 + Math.min(options.length * 5, 20);

  return {
    question: questionLine,
    options,
    confidence,
  };
}

function normalizeDifficulty(input: string): 'easy' | 'medium' | 'hard' {
  const lower = input.toLowerCase();
  if (lower.includes('easy') || lower === '1') return 'easy';
  if (lower.includes('hard') || lower === '5') return 'hard';
  return 'medium';
}

// Calculate overall confidence for a batch
export function calculateBatchConfidence(results: ParseResult): {
  canUseDirect: boolean; // true if confidence > 80%
  shouldUseAI: boolean; // true if 50-80%
  needsReview: boolean; // true if < 50%
} {
  return {
    canUseDirect: results.totalConfidence > 80,
    shouldUseAI: results.totalConfidence >= 50 && results.totalConfidence <= 80,
    needsReview: results.totalConfidence < 50,
  };
}
