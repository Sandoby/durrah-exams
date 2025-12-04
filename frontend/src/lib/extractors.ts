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
  return s.replace(/\r/g, ' ').replace(/\t/g, ' ').replace(/\u00A0/g, ' ').replace(/ +/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

// Core parser: attempts to detect common exam formats
export function extractQuestionsFromText(raw: string): ExtractedQuestion[] {
  const text = raw.replace(/\r/g, '\n').replace(/\n{2,}/g, '\n').trim();
  const blocks = splitIntoQuestionBlocks(text);
  const results: ExtractedQuestion[] = [];

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block);
    if (parsed) results.push(parsed);
  }

  return results;
}

function splitIntoQuestionBlocks(text: string): string[] {
  // Split by lines starting with number or Q:
  const lines = text.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];

  const startsQuestion = (line: string) => /^(Q\s*[:\.]\s*|\(?\d+\)?[\.:\-]\s+)/i.test(line.trim());

  for (const line of lines) {
    if (startsQuestion(line) && current.length) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks.map(b => b.trim()).filter(Boolean);
}

function parseQuestionBlock(block: string): ExtractedQuestion | null {
  // Identify options lines (A/B/C/D, 1/2/3, or dash bullets)
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // Remove leading marker like "Q1." or "1)"
  const first = lines[0].replace(/^(Q\s*[:\.]\s*|\(?\d+\)?[\.:\-]\s+)/i, '').trim();
  let questionText = first;
  let optionLines: string[] = [];
  let restText = '';

  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    if (isOptionLine(ln)) optionLines.push(ln); else restText += (restText ? ' ' : '') + ln;
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
  // Detect multiple_select if lines have multiple correct markers like "[✓]"
  const isMulti = optionLines.some(l => /\[\s*✓\s*\]|\(\s*✓\s*\)/.test(l));
  const type: ExtractedQuestion['type'] = isMulti ? 'multiple_select' : 'multiple_choice';

  return {
    type,
    question_text: questionText,
    options,
    points: 1,
  };
}

function isOptionLine(line: string): boolean {
  return (
    /^([A-Da-d]|\d+)[)\.\-]\s+/.test(line) || // A) Option, 1. Option
    /^[-•]\s+/.test(line) || // - bullet
    /^\([A-Da-d]\)\s+/.test(line) // (A) Option
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
