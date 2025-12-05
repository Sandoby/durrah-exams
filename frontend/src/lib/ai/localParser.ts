// Local question parsing with confidence scoring
import type { ExtractedQuestion } from '../extractors';

export interface ParsedQuestion {
  type: ExtractedQuestion['type'];
  question_text: string;
  options?: string[];
  correct_answer?: string | string[];
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  confidence: number;
  detectedFormat: string;
}

export interface ParseResult {
  questions: ExtractedQuestion[];
  totalConfidence: number;
  successRate: number;
}

interface ConfidenceAnalysis {
  canUseDirect: number; // Questions with confidence > 80%
  shouldUseAI: number; // Questions with confidence 50-80%
  needsReview: number; // Questions with confidence < 50%
}

// Regex patterns for different question formats
const PATTERNS = {
  // Multiple choice patterns
  mcq: /^[a-d]\)\s*.+|^[a-d]\]\s*.+|^\([a-d]\)\s*.+|^[A-D]\.\s*.+/m,
  mcqIndicator: /[a-d]\)|[a-d]\]|\([a-d]\)|[A-D]\./,

  // True/False detection
  trueFalse: /\b(True|False|T\s*\|\s*F|Yes|No)\b/i,

  // Fill in blank
  fillBlank: /_____|_+|fill\s*in|blank|\.{3,}|\[\s*\]/i,

  // Difficulty levels
  difficulty: /\b(easy|hard|medium|difficult|simple|complex|challenging)\b/i,

  // Points/marks
  points: /\b(\d+)\s*(point|mark|pt|pts|score|mark)/i,

  // Category/Subject
  category: /\b(math|english|science|history|geography|physics|chemistry|biology|computer|language|art)\b/i,

  // Tags
  tags: /\b(vocab|vocab|grammar|spelling|comprehension|calculation|analysis|synthesis|application)\b/i,

  // Question indicator
  questionStart: /^(Q:|Question:|Q\d+:|What|Which|How|Why|Define|Explain|List|Name|State|Identify|Calculate|Solve|Describe|Discuss|Compare)\b/im,
};

export function parseQuestionsLocally(text: string): ParseResult {
  if (!text || text.trim().length === 0) {
    return { questions: [], totalConfidence: 0, successRate: 0 };
  }

  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const questions: ParsedQuestion[] = [];
  let currentBlock = '';

  // Parse blocks separated by double newlines or question markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (PATTERNS.questionStart.test(line) || currentBlock.length > 500) {
      if (currentBlock.trim()) {
        const parsed = parseQuestionBlock(currentBlock);
        if (parsed && parsed.question_text.length > 10) {
          questions.push(parsed);
        }
      }
      currentBlock = line;
    } else {
      currentBlock += '\n' + line;
    }
  }

  // Don't forget last block
  if (currentBlock.trim()) {
    const parsed = parseQuestionBlock(currentBlock);
    if (parsed && parsed.question_text.length > 10) {
      questions.push(parsed);
    }
  }

  // Calculate overall confidence
  const confidenceScores = questions.map((q) => q.confidence);
  const totalConfidence =
    confidenceScores.length > 0 ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) : 0;

  // Convert to ExtractedQuestion format (remove confidence field)
  const extractedQuestions: ExtractedQuestion[] = questions.map((q) => ({
    type: q.type,
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    points: q.points,
    difficulty: q.difficulty,
    category: q.category,
    tags: q.tags,
  }));

  return {
    questions: extractedQuestions,
    totalConfidence,
    successRate: questions.length > 0 ? (confidenceScores.filter((c) => c > 60).length / questions.length) * 100 : 0,
  };
}

function parseQuestionBlock(text: string): ParsedQuestion | null {
  let confidence = 0;
  let detectedFormat = 'unknown';

  // Extract base question (first 2 lines)
  const lines = text.split('\n').filter((l) => l.trim());
  const question_text = lines.slice(0, Math.min(3, lines.length)).join(' ').trim();

  if (!question_text || question_text.length < 5) {
    return null;
  }

  // Detect format
  const isMCQ = PATTERNS.mcq.test(text);
  const isTrueFalse = PATTERNS.trueFalse.test(text) && !isMCQ;
  const isFillBlank = PATTERNS.fillBlank.test(text);

  let type: ExtractedQuestion['type'] = 'multiple_choice';
  if (isTrueFalse) {
    type = 'true_false';
    detectedFormat = 'true_false';
    confidence += 30;
  } else if (isFillBlank) {
    type = 'dropdown';
    detectedFormat = 'fill_blank';
    confidence += 20;
  } else if (isMCQ) {
    type = 'multiple_choice';
    detectedFormat = 'multiple_choice';
    confidence += 30;
  } else {
    type = 'multiple_choice';
    confidence += 10;
  }

  // Extract options
  const options: string[] = [];
  if (isMCQ || !isTrueFalse) {
    const optionLines = text.split('\n');
    for (const line of optionLines) {
      const match = line.match(/^[a-d]\)\s*(.+)/i) || line.match(/^[a-d]\]\s*(.+)/i) || line.match(/^\([a-d]\)\s*(.+)/i);
      if (match && match[1]) {
        options.push(match[1].trim());
      }
    }
  }

  if (options.length > 0) {
    confidence += 15;
  }

  // Extract difficulty
  const diffMatch = text.match(PATTERNS.difficulty);
  let difficulty: 'easy' | 'medium' | 'hard' | undefined;
  if (diffMatch) {
    const diff = diffMatch[0].toLowerCase();
    if (diff.includes('easy') || diff.includes('simple')) difficulty = 'easy';
    else if (diff.includes('hard') || diff.includes('difficult') || diff.includes('complex')) difficulty = 'hard';
    else difficulty = 'medium';
    confidence += 15;
  }

  // Extract points
  const pointsMatch = text.match(PATTERNS.points);
  const points = pointsMatch ? Math.max(1, Math.min(100, parseInt(pointsMatch[1], 10))) : 1;
  if (pointsMatch) confidence += 10;

  // Extract category
  const categoryMatch = text.match(PATTERNS.category);
  const category = categoryMatch ? categoryMatch[0] : undefined;
  if (categoryMatch) confidence += 10;

  // Extract tags
  const tags: string[] = [];
  let tagMatch;
  const tagRegex = new RegExp(PATTERNS.tags, 'gi');
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (tagMatch[0]) tags.push(tagMatch[0].toLowerCase());
  }
  if (tags.length > 0) confidence += 5;

  // Extract correct answer (heuristic)
  let correct_answer: string | string[] | undefined;
  if (isTrueFalse) {
    const trueMatch = text.match(/\b(True|T)\b/);
    const falseMatch = text.match(/\b(False|F)\b/);
    if (trueMatch || falseMatch) {
      correct_answer = trueMatch ? 'true' : 'false';
    }
  } else if (options.length > 0) {
    // Default to first option as placeholder
    correct_answer = options[0];
  }

  // Normalize confidence (0-100)
  confidence = Math.max(0, Math.min(100, confidence));

  return {
    type,
    question_text,
    options: options.length > 0 ? options : undefined,
    correct_answer,
    points,
    difficulty,
    category,
    tags,
    confidence,
    detectedFormat,
  };
}

export function calculateBatchConfidence(questions: ParsedQuestion[]): ConfidenceAnalysis {
  return {
    canUseDirect: questions.filter((q) => q.confidence > 80).length,
    shouldUseAI: questions.filter((q) => q.confidence >= 50 && q.confidence <= 80).length,
    needsReview: questions.filter((q) => q.confidence < 50).length,
  };
}
