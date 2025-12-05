// Local question extraction utilities (no AI)
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
  return s
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters except newline
    .replace(/ +/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/**
 * Sanitize text to prevent encoding issues
 * Removes invalid Unicode sequences and control characters
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ') // Replace control chars with space
    .replace(/[\uFFFD]/g, '') // Remove replacement character
    .replace(/[^\w\s\-.,!?()[\]'"\n]/g, (char) => {
      // Keep alphanumeric, spaces, common punctuation, and newlines
      const code = char.charCodeAt(0);
      // Keep common extended ASCII and Unicode letters
      if (code >= 32 && code !== 127) return char;
      return '';
    })
    .replace(/ +/g, ' ') // Collapse spaces
    .trim();
}

// Core parser: attempts to detect common exam formats
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
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function splitIntoQuestionBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];

  // Start markers: English and Arabic numbering
  const startsQuestion = (line: string) => {
    const l = line.trim();
    return (
      /^(Q\s*[:\.]\s*)/i.test(l) ||
      /^(\(?\d+\)?[\.:\-]\s+)/.test(l) ||
      /^(سؤال)\s*\d+\s*[\.:\-]/i.test(l) || // Arabic "سؤال 1:"
      /^\d+\s*\-\s+/.test(l) // "1 - "
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
    .map(b => b.replace(/\n\s*(?:\-|•)\s*/g, '\n- '));
}

function parseQuestionBlock(block: string): ExtractedQuestion | null {
  // Identify options lines (A/B/C/D, 1/2/3, or dash bullets)
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // Remove leading marker like "Q1." or "1)"
  const first = lines[0]
    .replace(/^(Q\s*[:\.]\s*|\(?\d+\)?[\.:\-]\s+)/i, '')
    .replace(/^(سؤال)\s*\d+\s*[\.:\-]\s*/i, '')
    .trim();
  let questionText = first;
  let optionLines: string[] = [];
  let restText = '';

  // Gather potential answer key line
  let answerLine: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    if (isAnswerLine(ln)) answerLine = ln;
    else if (isOptionLine(ln)) optionLines.push(ln);
    else restText += (restText ? ' ' : '') + ln;
  }

  // If no options detected, try splitting by semicolons in restText
  if (optionLines.length === 0 && /\b(True|False)\b/i.test(block)) {
    // True/False
    return {
      type: 'true_false',
      question_text: questionText || block,
      correct_answer: undefined,
      points: 1,
    };
  }

  if (optionLines.length === 0) {
    // Numeric or short text; default numeric if it looks like a calculation
    const numericHint = /\b\d+[\+\-\*\/]\d+|=\s*\?/i.test(block);
    return {
      type: numericHint ? 'numeric' : 'dropdown',
      question_text: questionText || block,
      points: 1,
    };
  }

  const options = optionLines.map(cleanOptionText).filter(Boolean);
  // Detect multiple_select if lines have multiple correct markers like "[✓]" or Arabic "صح"
  const isMulti = optionLines.some(l => /\[\s*✓\s*\]|\(\s*✓\s*\)|\bصح\b/.test(l));
  const type: ExtractedQuestion['type'] = isMulti ? 'multiple_select' : 'multiple_choice';

  const q: ExtractedQuestion = {
    type,
    question_text: questionText,
    options,
    points: 1,
  };

  // Map answer line to correct_answer
  if (answerLine) {
    const idx = extractAnswerIndex(answerLine, options);
    if (idx !== null) q.correct_answer = isMulti ? [options[idx]] : options[idx];
  }
  return q;
}

function isOptionLine(line: string): boolean {
  return (
    /^([A-Da-d]|\d+)[)\.\-]\s+/.test(line) || // A) Option, 1. Option
    /^[-•]\s+/.test(line) || // - bullet
    /^\([A-Da-d]\)\s+/.test(line) || // (A) Option
    // Arabic option markers like (أ) (ب) (ج) (د)
    /^\([أبجده]\)\s+/.test(line)
  );
}

function cleanOptionText(line: string): string {
  return line
    .replace(/^\([A-Da-d]\)\s+/, '')
    .replace(/^([A-Da-d]|\d+)[)\.\-]\s+/, '')
    .replace(/^[-•]\s+/, '')
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

function isAnswerLine(line: string): boolean {
  return /^(answer|correct|الإجابة|الصحيح)\s*[:\-]/i.test(line) || /^(?:\*\s*)?\b[A-Da-d]\b$/.test(line.trim());
}

function extractAnswerIndex(line: string, options: string[]): number | null {
  const l = line.trim();
  // Formats: "Answer: A", "Correct: 2", Arabic "الإجابة: ب"
  const m1 = l.match(/\b([A-Da-d])\b/);
  if (m1) {
    const letter = m1[1].toUpperCase();
    const map = { A: 0, B: 1, C: 2, D: 3 } as const;
    const idx = (map as any)[letter];
    return idx != null && idx < options.length ? idx : null;
  }
  const m2 = l.match(/\b(\d+)\b/);
  if (m2) {
    const num = parseInt(m2[1], 10);
    const idx = num - 1;
    return idx >= 0 && idx < options.length ? idx : null;
  }
  // Arabic letter mapping: أ, ب, ج, د
  const m3 = l.match(/[أبجده]/);
  if (m3) {
    const order = ['أ', 'ب', 'ج', 'د', 'ه'];
    const idx = order.indexOf(m3[0]);
    return idx >= 0 && idx < options.length ? idx : null;
  }
  return null;
}
