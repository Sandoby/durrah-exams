import { useMemo, useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, Code2, Quote, List, ListOrdered, Sigma, Link2, Heading2, Braces, Minus, Wand2, Highlighter, Image, Table2, Superscript, Subscript, AlignLeft } from 'lucide-react';
import Latex from 'react-latex-next';

interface QuestionTextEditorProps {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    showPreview?: boolean;
}

export function QuestionTextEditor({ value, onChange, placeholder, showPreview }: QuestionTextEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const actions = useMemo(() => ([
        { label: 'Bold', icon: Bold, wrap: ['**', '**'], placeholder: 'bold text' },
        { label: 'Italic', icon: Italic, wrap: ['_', '_'], placeholder: 'italic text' },
        { label: 'Underline', icon: Underline, wrap: ['<u>', '</u>'], placeholder: 'underline' },
        { label: 'Strike', icon: Strikethrough, wrap: ['~~', '~~'], placeholder: 'struck text' },
        { label: 'Highlight', icon: Highlighter, wrap: ['==', '=='], placeholder: 'key idea' },
        { label: 'Sup', icon: Superscript, wrap: ['^(', ')'], placeholder: 'n' },
        { label: 'Sub', icon: Subscript, wrap: ['_(', ')'], placeholder: 'i' },
        { label: 'Code', icon: Code2, wrap: ['`', '`'], placeholder: 'code' },
        { label: 'Code Block', icon: Braces, wrap: ['```\n', '\n```'], placeholder: 'code block', block: true },
        { label: 'Quote', icon: Quote, wrap: ['> ', ''], placeholder: 'quote', block: true },
        { label: 'Bullets', icon: List, wrap: ['- ', ''], placeholder: 'list item', block: true },
        { label: 'Numbered', icon: ListOrdered, wrap: ['1. ', ''], placeholder: 'numbered item', block: true },
        { label: 'Heading', icon: Heading2, wrap: ['## ', ''], placeholder: 'Section title', block: true },
        { label: 'Link', icon: Link2, wrap: ['[text](', ')'], placeholder: 'https://example.com' },
        { label: 'Divider', icon: Minus, wrap: ['\n---\n', ''], placeholder: '', block: true },
        { label: 'Math Inline', icon: Sigma, wrap: ['$', '$'], placeholder: 'a^2 + b^2' },
        { label: 'Math Block', icon: Sigma, wrap: ['$$\n', '\n$$'], placeholder: 'E = mc^2', block: true },
        { label: 'Image', icon: Image, wrap: ['![alt text](', ')'], placeholder: 'https://image-url' },
        { label: 'Table', icon: Table2, wrap: ['| Col1 | Col2 |\n| --- | --- |\n| ', ' | |'], placeholder: 'Item 1' , block: true},
        { label: 'Align', icon: AlignLeft, wrap: ['<p style="text-align:center">', '</p>'], placeholder: 'Centered text' , block: true},
    ]), []);

    const applyWrap = (prefix: string, suffix: string, placeholderText: string, block?: boolean) => {
        const el = textareaRef.current;
        const current = value || '';

        if (!el) {
            onChange(current + prefix + placeholderText + suffix);
            return;
        }

        const { selectionStart, selectionEnd } = el;
        const selected = current.slice(selectionStart, selectionEnd) || placeholderText;
        const needsLeadingNewline = block && selectionStart > 0 && current[selectionStart - 1] !== '\n';
        const prefixAdjusted = (needsLeadingNewline ? '\n' : '') + prefix;
        const next = current.slice(0, selectionStart) + prefixAdjusted + selected + suffix + current.slice(selectionEnd);

        onChange(next);

        // Restore selection inside the newly inserted snippet for smoother typing.
        const cursorStart = selectionStart + prefixAdjusted.length;
        const cursorEnd = cursorStart + selected.length;
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(cursorStart, cursorEnd);
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {actions.map(action => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => applyWrap(action.wrap[0], action.wrap[1], action.placeholder, action.block)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                        <action.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{action.label}</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:border-rose-200 hover:text-rose-600 dark:hover:border-rose-600 dark:hover:text-rose-300 transition-colors"
                >
                    <Wand2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Clear</span>
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                <div className="flex flex-col gap-2 xl:col-span-2">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium min-h-[240px]"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>Supports headings, lists, code, links, dividers, and math (inline $x^2$ or block $$...$$).</span>
                        <span>{value?.length || 0} chars</span>
                    </div>
                </div>

                {showPreview && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm xl:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Live Preview</span>
                            <span className="text-[11px] uppercase font-bold text-gray-400">Latex ready</span>
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            {value ? (
                                <Latex>{value}</Latex>
                            ) : (
                                <p className="text-sm text-gray-400">Start typing to see the preview.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
