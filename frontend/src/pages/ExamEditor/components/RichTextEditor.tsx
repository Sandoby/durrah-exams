import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, Code, Quote,
    Heading1, Heading2, Redo, Undo
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 dark:border-gray-800 bg-teal-50/30 dark:bg-teal-900/10">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('underline') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <UnderlineIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-teal-200 dark:bg-teal-800 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-teal-200 dark:bg-teal-800 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-teal-200 dark:bg-teal-800 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('codeBlock') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <Code className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('blockquote') ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' : 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20'}`}
            >
                <Quote className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button
                onClick={() => editor.chain().focus().undo().run()}
                className="p-1.5 rounded-md hover:teal-100/50 dark:hover:bg-teal-900/20 transition-colors"
                disabled={!editor.can().undo()}
            >
                <Undo className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                className="p-1.5 rounded-md hover:teal-100/50 dark:hover:bg-teal-900/20 transition-colors"
                disabled={!editor.can().redo()}
            >
                <Redo className="w-4 h-4" />
            </button>
        </div>
    );
};
const lowlight = createLowlight(all);

export function RichTextEditor({ value, onChange, placeholder = 'Start typing your question...' }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
            }),
            Image,
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update content when value prop changes from outside (e.g. question switch)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
            <MenuBar editor={editor} />
            <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert max-w-none min-h-[150px] outline-none editor-content"
            />
            <style dangerouslySetInnerHTML={{
                __html: `
                .tiptap {
                    min-height: 150px;
                    padding: 1rem;
                    outline: none !important;
                }
                .tiptap p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .editor-content .hljs-comment,
                .editor-content .hljs-quote { color: #616161; }
                .editor-content .hljs-variable,
                .editor-content .hljs-template-variable,
                .editor-content .hljs-attribute,
                .editor-content .hljs-tag,
                .editor-content .hljs-name,
                .editor-content .hljs-regexp,
                .editor-content .hljs-link,
                .editor-content .hljs-name,
                .editor-content .hljs-selector-id,
                .editor-content .hljs-selector-class { color: #f98181; }
                .editor-content .hljs-number,
                .editor-content .hljs-meta,
                .editor-content .hljs-built_in,
                .editor-content .hljs-builtin-name,
                .editor-content .hljs-literal,
                .editor-content .hljs-type,
                .editor-content .hljs-params { color: #fbbc88; }
                .editor-content .hljs-string,
                .editor-content .hljs-symbol,
                .editor-content .hljs-bullet,
                .editor-content .hljs-addition { color: #b5cea8; }
                .editor-content .hljs-keyword,
                .editor-content .hljs-selector-tag { color: #569cd6; }
                .editor-content .hljs-section,
                .editor-content .hljs-title,
                .editor-content .hljs-type,
                .editor-content .hljs-class .hljs-title { color: #dcdcdc; }
                .editor-content .hljs-emphasis { font-style: italic; }
                .editor-content .hljs-strong { font-weight: bold; }
                .editor-content pre {
                    background: #0d0d0d;
                    color: #fff;
                    font-family: 'JetBrainsMono', monospace;
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                }
                .editor-content code {
                    color: inherit;
                    padding: 0;
                    background: none;
                    font-size: 0.8rem;
                }
            `}} />
        </div>
    );
}
