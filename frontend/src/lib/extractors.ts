// Enhanced question extraction utilities (no AI)
// Supports TXT, PDF (via pdfjs-dist), DOCX (via mammoth)

import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// Lazy imports to avoid bundling weight unless used
const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist');
  // Use local bundled worker to avoid CDN fetch issues
  // pdfjs-dist v4 ships ESM worker at build/pdf.worker.mjs
  // Vite resolves new URL relative to module
  // @ts-ignore
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  // @ts-ignore set worker src for browser
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
};

const loadMammoth = async () => import('mammoth');

export type ExtractedQuestion = {
  type: 'multiple_choice' | 'multiple_select' | 'true_false' | 'numeric' | 'dropdown';
  question_text: string;
  options?: string[];
  correct_answer?: string | string[];
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
};

export async function readFileText(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  if (ext === 'txt') {
    return await file.text();
  }
  if (ext === 'pdf') {
    return await extractTextFromPDF(file);
  }
  if (ext === 'docx' || ext === 'doc') {
    return await extractTextFromDOCX(file);
  }
  // Fallback to plain text read
  return await file.text();
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf: PDFDocumentProxy = await pdfjs.getDocument({ data: arrayBuffer }).promise as unknown as PDFDocumentProxy;
  let text = '';
  const numPages = pdf.numPages;
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => (typeof it.str === 'string' ? it.str : '')).join(' ');
    text += `\n${pageText}\n`;
  }
  return normalizeWhitespace(text);
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return normalizeWhitespace(value || '');
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\r/g, ' ').replace(/\t/g, ' ').replace(/\u00A0/g, ' ').replace(/ +/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

// ENHANCED Core parser: attempts to detect common exam formats with improved intelligence
export function extractQuestionsFromText(raw: string): ExtractedQuestion[] {
  const text = normalizeForSegmentation(raw);
  const blocks = splitIntoQuestionBlocks(text);
  const results: ExtractedQuestion[] = [];

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block);
    if (parsed) results.push(parsed);
  }

  // Post-process: filter obviously empty, dedupe options, ensure points
  return results
    .filter(q => (q.question_text || '').length > 5)
    .map(q => ({
      ...q,
      options: q.options ? dedupeOptions(q.options) : q.options,
      points: q.points || 1,
    }));
}

function normalizeForSegmentation(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\u00A0]+/g, ' ')
    .replace(/\f/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Keep double newlines for better segmentation
    .trim();
}

// ENHANCED: Better question block detection
function splitIntoQuestionBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];

  // IMPROVED: More comprehensive question start detection
  const startsQuestion = (line: string) => {
    const l = line.trim();
    if (!l) return false;

    return (
      // English patterns
      /^(Q|Question|Ques)[\s\.:#]*\d+/i.test(l) ||
      /^\d+[\.\)\:\-]\s+/.test(l) ||
      /^\(\d+\)\s+/.test(l) ||
      /^\[\d+\]\s+/.test(l) ||
      /^\d+\s*\-\s+/.test(l) ||

      // Arabic patterns
      /^(سؤال|س)[\s\.:#]*\d+/i.test(l) ||
      /^[\u0660-\u0669]+[\.\)\:\-]\s+/.test(l) || // Arabic numerals

      // Common exam patterns
      /^(Problem|Exercise|Task)\s*\d+/i.test(l)
    );
  };

  for (const line of lines) {
    if (startsQuestion(line) && current.length) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n'));

  // Merge short trailing lines into previous block
  return blocks
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => b.replace(/\n\s*(?:\-|•|○|●)\s*/g, '\n- ')); // Normalize bullet points
}

// ENHANCED: Smarter question block parsing
function parseQuestionBlock(block: string): ExtractedQuestion | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // Remove leading question marker
  const first = lines[0]
    .replace(/^(Q|Question|Ques)[\s\.:#]*\d+[\.\)\:\-]?\s*/i, '')
    .replace(/^\d+[\.\)\:\-]\s+/, '')
    .replace(/^\(\d+\)\s+/, '')
    .replace(/^\[\d+\]\s+/, '')
    .replace(/^(سؤال|س)[\s\.:#]*\d+[\.\)\:\-]?\s*/i, '')
    .replace(/^(Problem|Exercise|Task)\s*\d+[\.\)\:\-]?\s*/i, '')
    .trim();

  let questionText = first;
  let optionLines: string[] = [];
  let restText = '';
  let answerLine: string | null = null;

  // IMPROVED: Better option and answer detection
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];

    if (isAnswerLine(ln)) {
      answerLine = ln;
    } else if (isOptionLine(ln)) {
      optionLines.push(ln);
    } else if (optionLines.length === 0 && questionText) {
      // Continuation of question text
      questionText += ' ' + ln;
    } else {
      restText += (restText ? ' ' : '') + ln;
    }
  }

  // IMPROVED: Better type detection
  // True/False detection
  if (optionLines.length === 0 && /\b(True|False|صح|خطأ|T\/F)\b/i.test(block)) {
    const correctAnswer = extractTrueFalseAnswer(block, answerLine);
    return {
      type: 'true_false',
      question_text: questionText || block,
      correct_answer: correctAnswer,
      points: 1,
    };
  }

  // Numeric detection
  if (optionLines.length === 0) {
    const numericHint = /\b\d+[\+\-\*\/÷×]\d+|=\s*\?|calculate|compute|find\s+the\s+(value|number|result)/i.test(block);
    if (numericHint) {
      const numAnswer = extractNumericAnswer(block, answerLine);
      return {
        type: 'numeric',
        question_text: questionText || block,
        correct_answer: numAnswer,
        points: 1,
      };
    }

    // Default to dropdown for short answer
    return {
      type: 'dropdown',
      question_text: questionText || block,
      points: 1,
    };
  }

  // IMPROVED: Clean and validate options
  const options = optionLines.map(cleanOptionText).filter(Boolean);

  if (options.length < 2) {
    // Not enough options, treat as dropdown
    return {
      type: 'dropdown',
      question_text: questionText,
      points: 1,
    };
  }

  // Detect multiple_select if lines have multiple correct markers
  const isMulti = optionLines.some(l => /\[✓\]|\(✓\)|\[x\]|\(x\)|\bصح\b|correct/i.test(l));
  const type: ExtractedQuestion['type'] = isMulti ? 'multiple_select' : 'multiple_choice';

  const q: ExtractedQuestion = {
    type,
    question_text: questionText,
    options,
    points: 1,
  };

  // IMPROVED: Better answer extraction
  if (answerLine || isMulti) {
    const correctAnswers = extractCorrectAnswers(answerLine, options, optionLines, isMulti);
    if (correctAnswers) {
      q.correct_answer = correctAnswers;
    }
  }

  return q;
}

// ENHANCED: More comprehensive option line detection
function isOptionLine(line: string): boolean {
  const l = line.trim();
  return (
    // English patterns
    /^([A-Ea-e]|[1-5])[\)\.\:\-]\s+/.test(l) ||
    /^\([A-Ea-e]\)\s+/.test(l) ||
    /^\[[A-Ea-e]\]\s+/.test(l) ||
    /^[-•○●]\s+/.test(l) ||

    // Arabic patterns
    /^\([أبجدهـ]\)\s+/.test(l) ||
    /^[أبجدهـ][\)\.\:\-]\s+/.test(l) ||

    // Numbered options
    /^\d+[\)\.\:\-]\s+/.test(l)
  );
}

// ENHANCED: Better option text cleaning
function cleanOptionText(line: string): string {
  return line
    .replace(/^\([A-Ea-e]\)\s+/, '')
    .replace(/^\[[A-Ea-e]\]\s+/, '')
    .replace(/^([A-Ea-e]|[1-5])[\)\.\:\-]\s+/, '')
    .replace(/^[-•○●]\s+/, '')
    .replace(/^\([أبجدهـ]\)\s+/, '')
    .replace(/^[أبجدهـ][\)\.\:\-]\s+/, '')
    .replace(/^\d+[\)\.\:\-]\s+/, '')
    .replace(/\[✓\]|\(✓\)|\[x\]|\(x\)/g, '') // Remove check marks
    .trim();
}

export async function extractQuestionsFromFile(file: File): Promise<ExtractedQuestion[]> {
  const text = await readFileText(file);
  return extractQuestionsFromText(text);
}

function dedupeOptions(opts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of opts) {
    const k = o.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(o.trim());
  }
  return out;
}

// ENHANCED: Better answer line detection
function isAnswerLine(line: string): boolean {
  return (
    /^(answer|correct|solution|key|الإجابة|الصحيح|الحل)[\s\:\-]/i.test(line) ||
    /^(?:\*\s*)?answer\s*:\s*/i.test(line) ||
    /^\*?\s*[A-Ea-e]\s*$/.test(line.trim()) ||
    /^correct\s+answer\s*:\s*/i.test(line)
  );
}

// ENHANCED: Smarter answer extraction
function extractCorrectAnswers(
  answerLine: string | null,
  options: string[],
  optionLines: string[],
  isMulti: boolean
): string | string[] | undefined {
  const answers: string[] = [];

  // Check for marked options in the option lines themselves
  optionLines.forEach((line, idx) => {
    if (/\[✓\]|\(✓\)|\[x\]|\(x\)|\*\s*$/.test(line) && idx < options.length) {
      answers.push(options[idx]);
    }
  });

  if (answers.length > 0) {
    return isMulti ? answers : answers[0];
  }

  // Parse answer line if provided
  if (!answerLine) return undefined;

  const l = answerLine.trim();

  // Letter-based answers (A, B, C, D, E)
  const letterMatches = l.match(/\b([A-Ea-e])\b/g);
  if (letterMatches) {
    const indices = letterMatches.map(letter => {
      const map = { A: 0, B: 1, C: 2, D: 3, E: 4, a: 0, b: 1, c: 2, d: 3, e: 4 } as const;
      return (map as any)[letter];
    }).filter(idx => idx != null && idx < options.length);

    if (indices.length > 0) {
      const opts = indices.map(idx => options[idx]);
      return isMulti ? opts : opts[0];
    }
  }

  // Number-based answers (1, 2, 3, 4, 5)
  const numberMatches = l.match(/\b([1-5])\b/g);
  if (numberMatches) {
    const indices = numberMatches.map(num => parseInt(num, 10) - 1)
      .filter(idx => idx >= 0 && idx < options.length);

    if (indices.length > 0) {
      const opts = indices.map(idx => options[idx]);
      return isMulti ? opts : opts[0];
    }
  }

  // Arabic letter mapping: أ, ب, ج, د, هـ
  const arabicMatch = l.match(/[أبجدهـ]/g);
  if (arabicMatch) {
    const order = ['أ', 'ب', 'ج', 'د', 'هـ'];
    const indices = arabicMatch.map(char => order.indexOf(char))
      .filter(idx => idx >= 0 && idx < options.length);

    if (indices.length > 0) {
      const opts = indices.map(idx => options[idx]);
      return isMulti ? opts : opts[0];
    }
  }

  return undefined;
}

// NEW: Extract True/False answer
function extractTrueFalseAnswer(block: string, answerLine: string | null): string | undefined {
  const text = (answerLine || block).toLowerCase();

  if (/\btrue\b|صح/.test(text)) return 'True';
  if (/\bfalse\b|خطأ/.test(text)) return 'False';

  return undefined;
}

// NEW: Extract numeric answer
function extractNumericAnswer(block: string, answerLine: string | null): string | undefined {
  const text = answerLine || block;

  // Look for patterns like "= 42" or "answer: 42"
  const match = text.match(/(?:=|answer\s*:)\s*([\d\.]+)/i);
  if (match) return match[1];

  // Look for standalone numbers after "answer" keyword
  const ansMatch = text.match(/answer\s*:?\s*([\d\.]+)/i);
  if (ansMatch) return ansMatch[1];

  return undefined;
}
