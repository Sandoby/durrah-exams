import { useState } from 'react';
import {
  X, Plus, Type, Link as LinkIcon, Image as ImageIcon, Square,
  AlignLeft, AlignCenter, AlignRight, Heading1, MessageSquareQuote,
  List, Share2, Video, AlertTriangle
} from 'lucide-react';

export interface EmailBlock {
  id: string;
  type: 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'heading' | 'quote' | 'list' | 'social' | 'video' | 'alert';
  content?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonStyle?: 'solid' | 'outline' | 'rounded' | 'pill';
  imageUrl?: string;
  imageWidth?: string;
  dividerColor?: string;
  spacerHeight?: string;
  padding?: string;
  headingLevel?: '1' | '2' | '3';
  listItems?: string[];
  listStyle?: 'bullet' | 'number' | 'check';
  socialLinks?: { platform: string; url: string; }[];
  videoUrl?: string;
  alertType?: 'info' | 'success' | 'warning' | 'error';
  backgroundColor?: string;
}

interface EmailBuilderProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
}

export function EmailVisualBuilder({ blocks, onChange, accentColor, onAccentColorChange }: EmailBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}`,
      type,
      alignment: 'left',
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#424245',
      padding: '10px 0',
      ...(type === 'text' && { content: 'Enter your text here...', fontWeight: 'normal' }),
      ...(type === 'heading' && {
        content: 'Your Heading Here',
        headingLevel: '2',
        fontSize: '24px',
        fontWeight: '700',
        alignment: 'left'
      }),
      ...(type === 'quote' && {
        content: 'Your testimonial or quote goes here...',
        fontSize: '16px',
        fontWeight: 'normal',
        alignment: 'left',
        backgroundColor: '#f8f9fa'
      }),
      ...(type === 'list' && {
        listItems: ['First item', 'Second item', 'Third item'],
        listStyle: 'bullet',
        fontSize: '15px'
      }),
      ...(type === 'social' && {
        socialLinks: [
          { platform: 'Facebook', url: 'https://facebook.com' },
          { platform: 'Twitter', url: 'https://twitter.com' },
          { platform: 'Instagram', url: 'https://instagram.com' }
        ],
        alignment: 'center'
      }),
      ...(type === 'video' && {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        alignment: 'center'
      }),
      ...(type === 'alert' && {
        content: 'Important message here...',
        alertType: 'info',
        fontSize: '14px'
      }),
      ...(type === 'button' && {
        buttonText: 'Click Here',
        buttonUrl: 'https://durrahtutors.com',
        buttonColor: accentColor,
        buttonTextColor: '#ffffff',
        buttonStyle: 'solid',
        alignment: 'center'
      }),
      ...(type === 'image' && { imageUrl: '', imageWidth: '100%', alignment: 'center' }),
      ...(type === 'divider' && { dividerColor: '#e8e8ed' }),
      ...(type === 'spacer' && { spacerHeight: '20px' })
    };

    onChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onChange(blocks.map(block => block.id === id ? { ...block, ...updates } : block));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter(block => block.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const presetColors = ['#4b47d6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#000000'];

  return (
    <div className="space-y-4">
      {/* Accent Color Picker */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Theme Accent Color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => onAccentColorChange(e.target.value)}
            className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
          />
          <div className="flex gap-2 flex-wrap">
            {presetColors.map(color => (
              <button
                key={color}
                onClick={() => onAccentColorChange(color)}
                className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                style={{ background: color }}
              />
            ))}
          </div>
          <span className="ml-auto text-sm font-mono text-gray-600 dark:text-gray-400">{accentColor}</span>
        </div>
      </div>

      {/* Add Block Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Add Content Block
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <button
            onClick={() => addBlock('heading')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <Heading1 className="w-4 h-4" />
            Heading
          </button>
          <button
            onClick={() => addBlock('text')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <Type className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => addBlock('button')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <LinkIcon className="w-4 h-4" />
            Button
          </button>
          <button
            onClick={() => addBlock('image')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
          <button
            onClick={() => addBlock('list')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => addBlock('quote')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <MessageSquareQuote className="w-4 h-4" />
            Quote
          </button>
          <button
            onClick={() => addBlock('alert')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            Alert
          </button>
          <button
            onClick={() => addBlock('video')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <Video className="w-4 h-4" />
            Video
          </button>
          <button
            onClick={() => addBlock('social')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <Share2 className="w-4 h-4" />
            Social
          </button>
          <button
            onClick={() => addBlock('divider')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <Square className="w-4 h-4" />
            Divider
          </button>
          <button
            onClick={() => addBlock('spacer')}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Spacer
          </button>
        </div>
      </div>

      {/* Block List and Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Block List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 max-h-[600px] overflow-y-auto">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Email Content Blocks ({blocks.length})
          </label>
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedBlockId === block.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {block.type === 'text' && <Type className="w-4 h-4 text-gray-500" />}
                    {block.type === 'heading' && <Heading1 className="w-4 h-4 text-gray-500" />}
                    {block.type === 'button' && <LinkIcon className="w-4 h-4 text-gray-500" />}
                    {block.type === 'image' && <ImageIcon className="w-4 h-4 text-gray-500" />}
                    {block.type === 'quote' && <MessageSquareQuote className="w-4 h-4 text-gray-500" />}
                    {block.type === 'list' && <List className="w-4 h-4 text-gray-500" />}
                    {block.type === 'social' && <Share2 className="w-4 h-4 text-gray-500" />}
                    {block.type === 'video' && <Video className="w-4 h-4 text-gray-500" />}
                    {block.type === 'alert' && <AlertTriangle className="w-4 h-4 text-gray-500" />}
                    {block.type === 'divider' && <Square className="w-4 h-4 text-gray-500" />}
                    {block.type === 'spacer' && <Plus className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {block.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                      disabled={index === blocks.length - 1}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {block.type === 'text' && block.content}
                  {block.type === 'heading' && block.content}
                  {block.type === 'button' && `${block.buttonText} → ${block.buttonUrl}`}
                  {block.type === 'image' && block.imageUrl}
                  {block.type === 'quote' && block.content}
                  {block.type === 'list' && `${(block.listItems || []).length} items`}
                  {block.type === 'social' && `${(block.socialLinks || []).length} links`}
                  {block.type === 'video' && block.videoUrl}
                  {block.type === 'alert' && `${block.alertType}: ${block.content}`}
                  {block.type === 'divider' && 'Horizontal line'}
                  {block.type === 'spacer' && `Height: ${block.spacerHeight}`}
                </div>
              </div>
            ))}
            {blocks.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
                No content blocks yet. Add some using the buttons above!
              </div>
            )}
          </div>
        </div>

        {/* Block Editor */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 max-h-[600px] overflow-y-auto">
          {selectedBlock ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                  Edit {selectedBlock.type}
                </h3>
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text Block Editor */}
              {selectedBlock.type === 'text' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Text Content
                    </label>
                    <textarea
                      value={selectedBlock.content || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedBlock.fontFamily || 'Arial, sans-serif'}
                      onChange={(e) => updateBlock(selectedBlock.id, { fontFamily: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Helvetica, sans-serif">Helvetica</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="Tahoma, sans-serif">Tahoma</option>
                      <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                      <option value="Impact, sans-serif">Impact</option>
                      <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Font Size
                      </label>
                      <select
                        value={selectedBlock.fontSize}
                        onChange={(e) => updateBlock(selectedBlock.id, { fontSize: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      >
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="15px">15px</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                        <option value="24px">24px</option>
                        <option value="28px">28px</option>
                        <option value="32px">32px</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Font Weight
                      </label>
                      <select
                        value={selectedBlock.fontWeight}
                        onChange={(e) => updateBlock(selectedBlock.id, { fontWeight: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      >
                        <option value="normal">Normal</option>
                        <option value="600">Semi-Bold</option>
                        <option value="700">Bold</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={selectedBlock.color}
                      onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                      className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alignment
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'left' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'left'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'center' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'center'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'right' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'right'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignRight className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Button Block Editor */}
              {selectedBlock.type === 'button' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.buttonText || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { buttonText: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Button URL
                    </label>
                    <input
                      type="url"
                      value={selectedBlock.buttonUrl || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { buttonUrl: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Button Color
                      </label>
                      <input
                        type="color"
                        value={selectedBlock.buttonColor}
                        onChange={(e) => updateBlock(selectedBlock.id, { buttonColor: e.target.value })}
                        className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={selectedBlock.buttonTextColor}
                        onChange={(e) => updateBlock(selectedBlock.id, { buttonTextColor: e.target.value })}
                        className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Button Style
                    </label>
                    <select
                      value={selectedBlock.buttonStyle}
                      onChange={(e) => updateBlock(selectedBlock.id, { buttonStyle: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <option value="solid">Solid</option>
                      <option value="outline">Outline</option>
                      <option value="rounded">Rounded</option>
                      <option value="pill">Pill</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alignment
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'left' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'left'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'center' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'center'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'right' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'right'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignRight className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Image Block Editor */}
              {selectedBlock.type === 'image' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={selectedBlock.imageUrl || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image Width
                    </label>
                    <select
                      value={selectedBlock.imageWidth}
                      onChange={(e) => updateBlock(selectedBlock.id, { imageWidth: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <option value="100%">Full Width (100%)</option>
                      <option value="75%">75%</option>
                      <option value="50%">50%</option>
                      <option value="300px">300px</option>
                      <option value="200px">200px</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alignment
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'left' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'left'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'center' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'center'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'right' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'right'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignRight className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Divider Block Editor */}
              {selectedBlock.type === 'divider' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Divider Color
                  </label>
                  <input
                    type="color"
                    value={selectedBlock.dividerColor}
                    onChange={(e) => updateBlock(selectedBlock.id, { dividerColor: e.target.value })}
                    className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                  />
                </div>
              )}

              {/* Spacer Block Editor */}
              {selectedBlock.type === 'spacer' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spacer Height
                  </label>
                  <select
                    value={selectedBlock.spacerHeight}
                    onChange={(e) => updateBlock(selectedBlock.id, { spacerHeight: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="10px">10px (Small)</option>
                    <option value="20px">20px (Medium)</option>
                    <option value="30px">30px (Large)</option>
                    <option value="40px">40px (Extra Large)</option>
                    <option value="60px">60px (Huge)</option>
                  </select>
                </div>
              )}

              {/* Heading Block Editor */}
              {selectedBlock.type === 'heading' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Heading Text
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.content || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Heading Level
                      </label>
                      <select
                        value={selectedBlock.headingLevel || '2'}
                        onChange={(e) => updateBlock(selectedBlock.id, { headingLevel: e.target.value as '1' | '2' | '3' })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      >
                        <option value="1">H1 (Large)</option>
                        <option value="2">H2 (Medium)</option>
                        <option value="3">H3 (Small)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Font Size
                      </label>
                      <select
                        value={selectedBlock.fontSize}
                        onChange={(e) => updateBlock(selectedBlock.id, { fontSize: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      >
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                        <option value="24px">24px</option>
                        <option value="28px">28px</option>
                        <option value="32px">32px</option>
                        <option value="36px">36px</option>
                        <option value="40px">40px</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={selectedBlock.color}
                      onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                      className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alignment
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'left' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'left'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'center' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'center'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'right' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'right'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignRight className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Quote Block Editor */}
              {selectedBlock.type === 'quote' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quote Content
                    </label>
                    <textarea
                      value={selectedBlock.content || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={selectedBlock.color}
                        onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                        className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={selectedBlock.backgroundColor || '#f8f9fa'}
                        onChange={(e) => updateBlock(selectedBlock.id, { backgroundColor: e.target.value })}
                        className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* List Block Editor */}
              {selectedBlock.type === 'list' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      List Style
                    </label>
                    <select
                      value={selectedBlock.listStyle || 'bullet'}
                      onChange={(e) => updateBlock(selectedBlock.id, { listStyle: e.target.value as 'bullet' | 'number' | 'check' })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <option value="bullet">Bullet Points</option>
                      <option value="number">Numbered List</option>
                      <option value="check">Checkmarks</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      List Items (one per line)
                    </label>
                    <textarea
                      value={(selectedBlock.listItems || []).join('\n')}
                      onChange={(e) => updateBlock(selectedBlock.id, { listItems: e.target.value.split('\n').filter(Boolean) })}
                      rows={5}
                      placeholder="First item&#10;Second item&#10;Third item"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}

              {/* Social Links Block Editor */}
              {selectedBlock.type === 'social' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Social Links
                    </label>
                    <div className="space-y-2">
                      {(selectedBlock.socialLinks || []).map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={link.platform}
                            onChange={(e) => {
                              const newLinks = [...(selectedBlock.socialLinks || [])];
                              newLinks[idx].platform = e.target.value;
                              updateBlock(selectedBlock.id, { socialLinks: newLinks });
                            }}
                            placeholder="Platform"
                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => {
                              const newLinks = [...(selectedBlock.socialLinks || [])];
                              newLinks[idx].url = e.target.value;
                              updateBlock(selectedBlock.id, { socialLinks: newLinks });
                            }}
                            placeholder="URL"
                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => {
                              const newLinks = (selectedBlock.socialLinks || []).filter((_, i) => i !== idx);
                              updateBlock(selectedBlock.id, { socialLinks: newLinks });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newLinks = [...(selectedBlock.socialLinks || []), { platform: 'Platform', url: 'https://' }];
                          updateBlock(selectedBlock.id, { socialLinks: newLinks });
                        }}
                        className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Add Social Link
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Video Block Editor */}
              {selectedBlock.type === 'video' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Video URL (YouTube, Vimeo, etc.)
                    </label>
                    <input
                      type="url"
                      value={selectedBlock.videoUrl || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alignment
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'left' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'left'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'center' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'center'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => updateBlock(selectedBlock.id, { alignment: 'right' })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                          selectedBlock.alignment === 'right'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <AlignRight className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Alert Block Editor */}
              {selectedBlock.type === 'alert' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alert Type
                    </label>
                    <select
                      value={selectedBlock.alertType || 'info'}
                      onChange={(e) => updateBlock(selectedBlock.id, { alertType: e.target.value as 'info' | 'success' | 'warning' | 'error' })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="success">Success (Green)</option>
                      <option value="warning">Warning (Yellow)</option>
                      <option value="error">Error (Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alert Message
                    </label>
                    <textarea
                      value={selectedBlock.content || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-gray-400 dark:text-gray-600 mb-2">
                <Type className="w-12 h-12 mx-auto mb-3 opacity-50" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a content block to edit its properties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to convert blocks to HTML
export function blocksToHtml(blocks: EmailBlock[]): string {
  return blocks.map(block => {
    const alignmentStyle = `text-align: ${block.alignment || 'left'};`;
    const fontFamilyStyle = block.fontFamily ? `font-family:${block.fontFamily};` : '';

    switch (block.type) {
      case 'text':
        return `<p style="font-size:${block.fontSize};font-weight:${block.fontWeight};color:${block.color};${fontFamilyStyle}${alignmentStyle}margin:${block.padding || '10px 0'};">${block.content || ''}</p>`;

      case 'heading':
        const headingTag = `h${block.headingLevel || '2'}`;
        return `<${headingTag} style="font-size:${block.fontSize};font-weight:${block.fontWeight};color:${block.color};${alignmentStyle}margin:${block.padding || '16px 0 12px 0'};">${block.content || ''}</${headingTag}>`;

      case 'quote':
        return `<div style="background:${block.backgroundColor || '#f8f9fa'};border-left:4px solid ${block.color};padding:16px 20px;margin:${block.padding || '16px 0'};border-radius:8px;"><p style="font-size:${block.fontSize};font-style:italic;color:${block.color};margin:0;${alignmentStyle}">"${block.content || ''}"</p></div>`;

      case 'list':
        const listTag = block.listStyle === 'number' ? 'ol' : 'ul';
        const listItems = (block.listItems || []).map(item => {
          if (block.listStyle === 'check') {
            return `<li style="list-style:none;margin-bottom:8px;"><span style="color:#10b981;margin-right:8px;">✓</span>${item}</li>`;
          }
          return `<li style="margin-bottom:8px;">${item}</li>`;
        }).join('');
        return `<${listTag} style="font-size:${block.fontSize};color:${block.color};margin:${block.padding || '12px 0'};padding-left:24px;">${listItems}</${listTag}>`;

      case 'social':
        const socialIcons = (block.socialLinks || []).map(link => {
          const platformLower = link.platform.toLowerCase();
          let bgColor = '#6b7280';
          if (platformLower.includes('facebook')) bgColor = '#1877f2';
          else if (platformLower.includes('twitter') || platformLower.includes('x')) bgColor = '#1da1f2';
          else if (platformLower.includes('instagram')) bgColor= '#e4405f';
          else if (platformLower.includes('linkedin')) bgColor = '#0a66c2';
          else if (platformLower.includes('youtube')) bgColor = '#ff0000';

          return `<a href="${link.url}" style="display:inline-block;width:40px;height:40px;background:${bgColor};color:white;text-decoration:none;border-radius:50%;text-align:center;line-height:40px;margin:0 6px;font-weight:600;font-size:14px;">${link.platform.charAt(0).toUpperCase()}</a>`;
        }).join('');
        return `<div style="${alignmentStyle}margin:${block.padding || '20px 0'};">${socialIcons}</div>`;

      case 'video':
        const getEmbedUrl = (url: string) => {
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.includes('youtu.be')
              ? url.split('youtu.be/')[1]?.split('?')[0]
              : url.split('v=')[1]?.split('&')[0];
            return `https://www.youtube.com/embed/${videoId}`;
          }
          if (url.includes('vimeo.com')) {
            const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
            return `https://player.vimeo.com/video/${videoId}`;
          }
          return url;
        };

        const embedUrl = getEmbedUrl(block.videoUrl || '');
        return `<div style="${alignmentStyle}margin:${block.padding || '20px 0'};"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:12px;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;

      case 'alert':
        const alertColors = {
          info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
          success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
          warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
          error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }
        };
        const alertStyle = alertColors[block.alertType || 'info'];
        return `<div style="background:${alertStyle.bg};border-left:4px solid ${alertStyle.border};padding:14px 18px;margin:${block.padding || '16px 0'};border-radius:8px;"><p style="font-size:${block.fontSize};color:${alertStyle.text};margin:0;font-weight:600;">${block.content || ''}</p></div>`;

      case 'button':
        const buttonStyles = {
          solid: `background:${block.buttonColor};color:${block.buttonTextColor};border:none;`,
          outline: `background:transparent;color:${block.buttonColor};border:2px solid ${block.buttonColor};`,
          rounded: `background:${block.buttonColor};color:${block.buttonTextColor};border:none;border-radius:8px;`,
          pill: `background:${block.buttonColor};color:${block.buttonTextColor};border:none;border-radius:999px;`
        };
        return `<div style="${alignmentStyle}margin:${block.padding || '20px 0'};"><a href="${block.buttonUrl}" style="display:inline-block;padding:12px 24px;text-decoration:none;font-weight:600;font-size:14px;${buttonStyles[block.buttonStyle || 'solid']}">${block.buttonText}</a></div>`;

      case 'image':
        return `<div style="${alignmentStyle}margin:${block.padding || '10px 0'};"><img src="${block.imageUrl}" style="max-width:${block.imageWidth};height:auto;border-radius:8px;" alt="Email image" /></div>`;

      case 'divider':
        return `<div style="margin:${block.padding || '20px 0'};"><hr style="border:none;border-top:2px solid ${block.dividerColor};margin:0;" /></div>`;

      case 'spacer':
        return `<div style="height:${block.spacerHeight};"></div>`;

      default:
        return '';
    }
  }).join('');
}
