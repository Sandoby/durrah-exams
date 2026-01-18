import { useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import katex from 'katex';
import 'react-quill/dist/quill.snow.css';
import 'katex/dist/katex.min.css';

interface QuestionTextEditorProps {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    showPreview?: boolean;
}

export function QuestionTextEditor({ value, onChange, placeholder }: QuestionTextEditorProps) {
    useEffect(() => {
        (window as any).katex = katex;
    }, []);

    const modules = useMemo(() => ({
        toolbar: {
            container: '#question-editor-toolbar',
        },
        history: {
            delay: 400,
            maxStack: 200,
            userOnly: true,
        },
    }), []);

    const formats = useMemo(() => [
        'header', 'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'script', 'list', 'bullet', 'indent', 'align',
        'blockquote', 'code-block', 'link', 'image', 'formula'
    ], []);

    return (
        <div className="space-y-3">
            <div
                id="question-editor-toolbar"
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 flex flex-wrap items-center gap-2 shadow-sm"
            >
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mr-1">Format</span>
                <select className="ql-header" defaultValue="" aria-label="Heading">
                    <option value="1">H1</option>
                    <option value="2">H2</option>
                    <option value="3">H3</option>
                    <option value="">P</option>
                </select>
                <span className="ql-formats">
                    <button className="ql-bold" aria-label="Bold" />
                    <button className="ql-italic" aria-label="Italic" />
                    <button className="ql-underline" aria-label="Underline" />
                    <button className="ql-strike" aria-label="Strike" />
                </span>
                <span className="ql-formats">
                    <button className="ql-script" value="sub" aria-label="Subscript" />
                    <button className="ql-script" value="super" aria-label="Superscript" />
                </span>
                <span className="ql-formats">
                    <select className="ql-color" aria-label="Color" />
                    <select className="ql-background" aria-label="Background" />
                </span>
                <span className="ql-formats">
                    <button className="ql-list" value="ordered" aria-label="Ordered list" />
                    <button className="ql-list" value="bullet" aria-label="Bullet list" />
                    <button className="ql-indent" value="-1" aria-label="Indent -1" />
                    <button className="ql-indent" value="+1" aria-label="Indent +1" />
                </span>
                <span className="ql-formats">
                    <select className="ql-align" defaultValue="" aria-label="Align" />
                </span>
                <span className="ql-formats">
                    <button className="ql-blockquote" aria-label="Quote" />
                    <button className="ql-code-block" aria-label="Code block" />
                </span>
                <span className="ql-formats">
                    <button className="ql-link" aria-label="Link" />
                    <button className="ql-image" aria-label="Image" />
                    <button className="ql-formula" aria-label="Math" />
                </span>
                <span className="ql-formats">
                    <button className="ql-clean" aria-label="Clear formatting" />
                </span>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900">
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    modules={modules}
                    formats={formats}
                    className="bg-white dark:bg-gray-900 question-quill"
                />
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Rich text with math (formula), images, links, lists, code, and alignment.</span>
                <span>{value?.length || 0} chars</span>
            </div>
        </div>
    );
}
