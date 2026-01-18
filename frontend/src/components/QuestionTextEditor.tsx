import { useMemo, useRef } from 'react';
import { Bold, Italic, Underline, Code2, Quote, List, ListOrdered, Sigma } from 'lucide-react';
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
        { label: 'Code', icon: Code2, wrap: ['`', '`'], placeholder: 'code' },
        { label: 'Quote', icon: Quote, wrap: ['> ', ''], placeholder: 'quote' },
        { label: 'Bullets', icon: List, wrap: ['- ', ''], placeholder: 'list item' },
        { label: 'Numbered', icon: ListOrdered, wrap: ['1. ', ''], placeholder: 'numbered item' },
        { label: 'Math', icon: Sigma, wrap: ['$$', '$$'], placeholder: 'a^2 + b^2 = c^2' },
    ]), []);

    const applyWrap = (prefix: string, suffix: string, placeholderText: string) => {
        const el = textareaRef.current;
        const current = value || '';

        if (!el) {
            onChange(current + prefix + placeholderText + suffix);
            return;
        }

        const { selectionStart, selectionEnd } = el;
        const selected = current.slice(selectionStart, selectionEnd) || placeholderText;
        const next = current.slice(0, selectionStart) + prefix + selected + suffix + current.slice(selectionEnd);

        onChange(next);

        // Restore selection inside the newly inserted snippet for smoother typing.
        const cursorStart = selectionStart + prefix.length;
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
                        onClick={() => applyWrap(action.wrap[0], action.wrap[1], action.placeholder)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                        <action.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{action.label}</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium min-h-[140px]"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>Supports bold, italics, bullets, and math via $$..$$.</span>
                        <span>{value?.length || 0} chars</span>
                    </div>
                </div>

                {showPreview && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
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
