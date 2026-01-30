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
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('underline') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <UnderlineIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('codeBlock') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Code className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('blockquote') ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Quote className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button
                onClick={() => editor.chain().focus().undo().run()}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                disabled={!editor.can().undo()}
            >
                <Undo className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-gray-900/20 focus-within:border-gray-900 transition-all">
            <MenuBar editor={editor} />
            <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[150px] outline-none editor-content"
            />
            <style dangerouslySetInnerHTML={{
                __html: `
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
