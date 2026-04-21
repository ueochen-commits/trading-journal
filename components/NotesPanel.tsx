import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import FontSize from '../lib/tiptapFontSize';
import { exportNoteToPdf, TradeMetadata } from '../lib/pdfExport';
import { useLanguage } from '../LanguageContext';
import {
  Maximize2, Minimize2, Undo2, Redo2, Mic, MicOff,
  Bold, Italic, Underline as UnderlineIcon, Code2, Link as LinkIcon, Eraser,
  Type, Paintbrush, Plus, ChevronDown, Download, Trash2, X,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Table as TableIcon, Minus, ListTodo,
  CaseSensitive
} from 'lucide-react';

// ─── Types ───
type SaveStatus = 'saved' | 'saving' | 'unsaved';
type NoteTab = 'trade-note' | 'daily-journal';

interface NotesPanelProps {
  symbol?: string;
  date?: string;
  tradeNoteContent: string;
  dailyJournalContent: string;
  onContentChange: (tab: NoteTab, content: string) => void;
  onSave: (tab: NoteTab, content: string) => void;
  tradeMetadata?: TradeMetadata;
  templates?: { id: string; name: string; content: string }[];
  onApplyTemplate?: (content: string) => void;
  onDeleteNote?: () => void;
}

// ─── Color Presets ───
const TEXT_COLORS = [
  '#E24B4A', '#EF9F27', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#1a1a1a', '#6b7280', '#9ca3af', '#ffffff',
];
const BG_COLORS = [
  '#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#ede9fe',
  '#fee2e2', '#f3f4f6', '#fef9c3', '#ccfbf1', '#ffffff',
];

// ─── Paragraph Styles ───
const PARAGRAPH_STYLES = [
  { label: '正文', value: 'paragraph' },
  { label: '标题 1', value: 'h1' },
  { label: '标题 2', value: 'h2' },
  { label: '标题 3', value: 'h3' },
  { label: '引用', value: 'blockquote' },
  { label: '代码块', value: 'codeBlock' },
];

const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier', value: 'Courier New' },
  { label: '系统默认', value: '' },
];

const CASE_OPTIONS = [
  { label: '全大写', value: 'uppercase' },
  { label: '全小写', value: 'lowercase' },
  { label: '首字母大写', value: 'capitalize' },
  { label: '句首大写', value: 'sentence' },
];

const ALIGN_OPTIONS = [
  { label: '左对齐', value: 'left', icon: AlignLeft },
  { label: '居中', value: 'center', icon: AlignCenter },
  { label: '右对齐', value: 'right', icon: AlignRight },
  { label: '两端对齐', value: 'justify', icon: AlignJustify },
];

// ─── Toolbar Icon Button ───
const ToolBtn = ({
  onClick, active, title, ariaLabel, children, disabled,
}: {
  onClick: () => void; active?: boolean; title: string; ariaLabel: string;
  children: React.ReactNode; disabled?: boolean;
}) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={ariaLabel}
    aria-pressed={active}
    className={`w-6 h-6 flex items-center justify-center rounded-[4px] transition-colors
      ${active
        ? 'bg-[#f3f4f6] dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-[#ededed]'
        : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a]'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
);

// ─── Toolbar Divider ───
const ToolDivider = () => (
  <div className="w-px h-[14px] mx-1 bg-[rgba(0,0,0,0.08)] dark:bg-[rgba(255,255,255,0.12)]" />
);

// ─── Dropdown Wrapper ───
const Dropdown = ({
  trigger, children, isOpen, onClose,
}: {
  trigger: React.ReactNode; children: React.ReactNode; isOpen: boolean; onClose: () => void;
}) => (
  <div className="relative">
    {trigger}
    {isOpen && (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.16)] rounded-md shadow-lg py-1 min-w-[140px]">
          {children}
        </div>
      </>
    )}
  </div>
);

// ─── Color Picker Popover ───
const ColorPicker = ({
  colors, isOpen, onClose, onSelect, onCustom,
}: {
  colors: string[]; isOpen: boolean; onClose: () => void;
  onSelect: (color: string) => void; onCustom: () => void;
}) => {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.16)] rounded-md shadow-lg p-2 w-[180px]">
        <div className="grid grid-cols-5 gap-1.5 mb-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onSelect(c); onClose(); }}
              className="w-7 h-7 rounded-[4px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.12)] hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
              aria-label={`颜色 ${c}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onCustom}
          className="w-full text-xs text-center py-1 text-[#6b7280] hover:text-[#1a1a1a] dark:hover:text-[#ededed] transition-colors"
        >
          自定义颜色...
        </button>
      </div>
    </>
  );
};

// ─── Main Component ───
const NotesPanel: React.FC<NotesPanelProps> = ({
  symbol, date, tradeNoteContent, dailyJournalContent,
  onContentChange, onSave, tradeMetadata, templates = [],
  onApplyTemplate, onDeleteNote,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<NoteTab>('trade-note');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [fontSize, setFontSize] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const currentContent = activeTab === 'trade-note' ? tradeNoteContent : dailyJournalContent;

  // ─── TipTap Editor Setup ───
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: '为什么要做这笔交易? 是否遵循了交易规则? 记录情绪、形态与经验教训…',
      }),
      Image,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      TaskList, TaskItem.configure({ nested: true }),
      HorizontalRule,
      FontSize,
    ],
    content: currentContent,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onContentChange(activeTab, html);
      setSaveStatus('unsaved');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saving');
        onSave(activeTab, html);
        setTimeout(() => setSaveStatus('saved'), 600);
      }, 1500);
    },
  });

  // Sync content when tab changes
  useEffect(() => {
    if (editor && editor.getHTML() !== currentContent) {
      editor.commands.setContent(currentContent || '');
    }
  }, [activeTab, currentContent, editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // ─── Tab Switch ───
  const handleTabSwitch = useCallback((tab: NoteTab) => {
    if (tab === activeTab) return;
    // Save current before switching
    if (editor) {
      const html = editor.getHTML();
      onSave(activeTab, html);
    }
    setActiveTab(tab);
  }, [activeTab, editor, onSave]);

  // ─── Voice Input ───
  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('');
      editor?.chain().focus().insertContent(text).run();
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [isRecording, editor]);

  // ─── Font Size ───
  const changeFontSize = useCallback((delta: number) => {
    const next = Math.max(8, Math.min(72, fontSize + delta));
    setFontSize(next);
    editor?.chain().focus().setFontSize(`${next}px`).run();
  }, [fontSize, editor]);

  // ─── Paragraph Style ───
  const applyParagraphStyle = useCallback((value: string) => {
    if (!editor) return;
    switch (value) {
      case 'paragraph': editor.chain().focus().setParagraph().run(); break;
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'codeBlock': editor.chain().focus().toggleCodeBlock().run(); break;
    }
    setOpenDropdown(null);
  }, [editor]);

  // ─── Link ───
  const handleLink = useCallback(() => {
    if (!editor) return;
    const url = prompt(language === 'cn' ? '输入链接 URL:' : 'Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor, language]);

  // ─── Case Transform ───
  const applyCase = useCallback((caseType: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    if (!text) { setOpenDropdown(null); return; }
    let transformed = text;
    switch (caseType) {
      case 'uppercase': transformed = text.toUpperCase(); break;
      case 'lowercase': transformed = text.toLowerCase(); break;
      case 'capitalize': transformed = text.replace(/\b\w/g, c => c.toUpperCase()); break;
      case 'sentence': transformed = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
    }
    editor.chain().focus().insertContentAt({ from, to }, transformed).run();
    setOpenDropdown(null);
  }, [editor]);

  // ─── PDF Export ───
  const handleExport = useCallback(async () => {
    const editorEl = editorContainerRef.current?.querySelector('.tiptap') as HTMLElement;
    if (!editorEl || !tradeMetadata) return;
    setIsExporting(true);
    try {
      await exportNoteToPdf(editorEl, tradeMetadata);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [tradeMetadata]);

  // ─── Delete ───
  const handleDelete = useCallback(() => {
    if (!editor) return;
    editor.commands.clearContent();
    onContentChange(activeTab, '');
    onSave(activeTab, '');
    setSaveStatus('saved');
    setDeleteConfirmOpen(false);
    onDeleteNote?.();
  }, [editor, activeTab, onContentChange, onSave, onDeleteNote]);

  // ─── Fullscreen ───
  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  // ─── Image Upload ───
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor]);

  // ─── Escape fullscreen ───
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  if (!editor) return null;

  const dateLabel = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : '';
  const tagText = symbol ? `${symbol} · ${dateLabel}` : dateLabel;

  // ─── Render ───
  const panelContent = (
    <div
      ref={fullscreenRef}
      className={`flex flex-col bg-white dark:bg-[#0a0a0a] transition-colors ${
        isFullscreen ? 'fixed inset-0 z-[200]' : 'h-full'
      }`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif' }}
    >
      {/* ─── Layer 1: Title Bar ─── */}
      <div className="flex items-center justify-between px-6" style={{ height: '38px' }}>
        <div className="flex items-center gap-[10px]">
          <div className="w-1 h-4 bg-[#1a1a1a] dark:bg-[#ededed] rounded-sm" />
          <span className="text-[15px] font-medium text-[#1a1a1a] dark:text-[#ededed]">Notes</span>
          {tagText && (
            <span className="px-2 py-0.5 bg-[#f3f4f6] dark:bg-[#1a1a1a] rounded-[4px] text-[11px] text-[#9ca3af] dark:text-[#6b7280]">
              {tagText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-[#9ca3af] dark:text-[#6b7280]">
            {saveStatus === 'saving' ? '正在保存...' : saveStatus === 'unsaved' ? '未保存' : '已保存'}
          </span>
          {saveStatus === 'saved' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          )}
          {saveStatus === 'unsaved' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#EF9F27]" />
          )}
          {saveStatus === 'saving' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-pulse" />
          )}
        </div>
      </div>


      {/* ─── Layer 3: Separator ─── */}
      <div className="mx-6 border-t border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.12)]" style={{ borderTopWidth: '0.5px', marginBottom: '12px' }} />

      {/* ─── Layer 4: Rich Text Toolbar ─── */}
      <div
        className="flex items-center gap-0.5 flex-wrap px-6"
        style={{ marginBottom: '14px' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Group 1: History & Input */}
        <ToolBtn onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏'} ariaLabel={isFullscreen ? '退出全屏' : '全屏编辑'}>
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="撤销" ariaLabel="撤销" disabled={!editor.can().undo()}>
          <Undo2 className="w-3 h-3" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="重做" ariaLabel="重做" disabled={!editor.can().redo()}>
          <Redo2 className="w-3 h-3" />
        </ToolBtn>
        <ToolBtn onClick={toggleVoiceInput} active={isRecording} title="语音输入" ariaLabel="语音输入">
          {isRecording ? <MicOff className="w-3 h-3 text-red-500" /> : <Mic className="w-3 h-3" />}
        </ToolBtn>

        <ToolDivider />

        {/* Group 2: Paragraph & Font */}
        <Dropdown
          isOpen={openDropdown === 'paragraph'}
          onClose={() => setOpenDropdown(null)}
          trigger={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenDropdown(openDropdown === 'paragraph' ? null : 'paragraph')}
              className="flex items-center gap-1 px-2 h-6 text-[12px] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] rounded-[6px] transition-colors"
              title="段落样式"
              aria-label="段落样式"
            >
              正文 <ChevronDown className="w-2.5 h-2.5" />
            </button>
          }
        >
          {PARAGRAPH_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => applyParagraphStyle(s.value)}
              className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] transition-colors"
            >
              {s.label}
            </button>
          ))}
        </Dropdown>

        <Dropdown
          isOpen={openDropdown === 'font'}
          onClose={() => setOpenDropdown(null)}
          trigger={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenDropdown(openDropdown === 'font' ? null : 'font')}
              className="flex items-center gap-1 px-2 h-6 text-[12px] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] rounded-[6px] transition-colors"
              title="字体"
              aria-label="字体"
            >
              Arial <ChevronDown className="w-2.5 h-2.5" />
            </button>
          }
        >
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value || 'default'}
              type="button"
              onClick={() => { editor.chain().focus().setFontFamily(f.value || 'sans-serif').run(); setOpenDropdown(null); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] transition-colors"
              style={{ fontFamily: f.value || 'inherit' }}
            >
              {f.label}
            </button>
          ))}
        </Dropdown>

        {/* Font Size +/- */}
        <div className="flex items-center">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => changeFontSize(-1)}
            className="w-5 h-6 flex items-center justify-center text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] rounded-l-[4px] transition-colors text-[11px]"
            title="减小字号"
            aria-label="减小字号"
          >−</button>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => {
              const v = Math.max(8, Math.min(72, parseInt(e.target.value) || 14));
              setFontSize(v);
              editor.chain().focus().setFontSize(`${v}px`).run();
            }}
            className="w-8 h-6 text-center text-[12px] border-x border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.16)] bg-transparent text-[#1a1a1a] dark:text-[#ededed] outline-none rounded-none"
            style={{ fontFamily: 'ui-monospace, "SF Mono", Monaco, Consolas, monospace' }}
            min={8} max={72}
            aria-label="字号"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => changeFontSize(1)}
            className="w-5 h-6 flex items-center justify-center text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] rounded-r-[4px] transition-colors text-[11px]"
            title="增大字号"
            aria-label="增大字号"
          >+</button>
        </div>

        <ToolDivider />

        {/* Group 3: Text Style */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗" ariaLabel="加粗">
          <Bold className="w-3 h-3" strokeWidth={2.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体" ariaLabel="斜体">
          <Italic className="w-3 h-3" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线" ariaLabel="下划线">
          <UnderlineIcon className="w-3 h-3" />
        </ToolBtn>

        <ToolDivider />

        {/* Group 4: Insert & Clear */}
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="行内代码" ariaLabel="行内代码">
          <Code2 className="w-3 h-3" />
        </ToolBtn>
        <ToolBtn onClick={handleLink} title="插入链接" ariaLabel="插入链接">
          <LinkIcon className="w-3 h-3" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="清除格式" ariaLabel="清除格式">
          <Eraser className="w-3 h-3" />
        </ToolBtn>

        <ToolDivider />

        {/* Group 5: Colors */}
        <div className="relative">
          <ToolBtn onClick={() => setTextColorOpen(!textColorOpen)} title="文字颜色" ariaLabel="文字颜色">
            <div className="flex flex-col items-center">
              <Type className="w-3 h-3" />
              <div className="w-3 h-[3px] rounded-sm bg-[#E24B4A] mt-px" />
            </div>
          </ToolBtn>
          <ColorPicker
            colors={TEXT_COLORS}
            isOpen={textColorOpen}
            onClose={() => setTextColorOpen(false)}
            onSelect={(c) => editor.chain().focus().setColor(c).run()}
            onCustom={() => { colorInputRef.current?.click(); setTextColorOpen(false); }}
          />
          <input ref={colorInputRef} type="color" className="hidden" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
        </div>
        <div className="relative">
          <ToolBtn onClick={() => setBgColorOpen(!bgColorOpen)} title="背景色" ariaLabel="背景色">
            <div className="flex flex-col items-center">
              <Paintbrush className="w-3 h-3" />
              <div className="w-3 h-[3px] rounded-sm bg-[#EF9F27] mt-px" />
            </div>
          </ToolBtn>
          <ColorPicker
            colors={BG_COLORS}
            isOpen={bgColorOpen}
            onClose={() => setBgColorOpen(false)}
            onSelect={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
            onCustom={() => { bgColorInputRef.current?.click(); setBgColorOpen(false); }}
          />
          <input ref={bgColorInputRef} type="color" className="hidden" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
        </div>
        {/* More Insert */}
        <div className="relative">
          <ToolBtn onClick={() => setInsertMenuOpen(!insertMenuOpen)} title="更多插入" ariaLabel="更多插入">
            <Plus className="w-3 h-3" />
          </ToolBtn>
          {insertMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setInsertMenuOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.16)] rounded-md shadow-lg py-1 min-w-[150px]">
                <button type="button" onClick={() => { handleImageUpload(); setInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] flex items-center gap-2"><ImageIcon className="w-3 h-3" /> 插入图片</button>
                <button type="button" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] flex items-center gap-2"><TableIcon className="w-3 h-3" /> 插入表格</button>
                <button type="button" onClick={() => { editor.chain().focus().setHorizontalRule().run(); setInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] flex items-center gap-2"><Minus className="w-3 h-3" /> 插入分隔线</button>
                <button type="button" onClick={() => { editor.chain().focus().toggleTaskList().run(); setInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] flex items-center gap-2"><ListTodo className="w-3 h-3" /> 插入待办列表</button>
              </div>
            </>
          )}
        </div>

        <ToolDivider />

        {/* Group 6: Layout */}
        <Dropdown
          isOpen={openDropdown === 'case'}
          onClose={() => setOpenDropdown(null)}
          trigger={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenDropdown(openDropdown === 'case' ? null : 'case')}
              className="flex items-center gap-1 px-1.5 h-6 text-[12px] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] rounded-[4px] transition-colors"
              title="大小写" aria-label="大小写"
            >
              <CaseSensitive className="w-3.5 h-3.5" /> <ChevronDown className="w-2.5 h-2.5" />
            </button>
          }
        >
          {CASE_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => applyCase(o.value)} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] transition-colors">{o.label}</button>
          ))}
        </Dropdown>
        <Dropdown
          isOpen={openDropdown === 'align'}
          onClose={() => setOpenDropdown(null)}
          trigger={
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenDropdown(openDropdown === 'align' ? null : 'align')}
              className="flex items-center gap-1 px-1.5 h-6 text-[12px] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] rounded-[4px] transition-colors"
              title="对齐方式" aria-label="对齐方式"
            >
              <AlignLeft className="w-3 h-3" /> <ChevronDown className="w-2.5 h-2.5" />
            </button>
          }
        >
          {ALIGN_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => { editor.chain().focus().setTextAlign(o.value).run(); setOpenDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] transition-colors flex items-center gap-2"><o.icon className="w-3 h-3" /> {o.label}</button>
          ))}
        </Dropdown>

        <ToolDivider />

        {/* Group 7: File Operations */}
        <ToolBtn onClick={handleExport} disabled={isExporting} title="导出为 PDF" ariaLabel="导出为 PDF">
          <Download className="w-3 h-3" />
        </ToolBtn>
        <ToolBtn onClick={() => setDeleteConfirmOpen(true)} title="删除笔记" ariaLabel="删除笔记">
          <Trash2 className="w-3 h-3" />
        </ToolBtn>
      </div>

      {/* ─── Layer 5: Editor Area ─── */}
      <div
        ref={editorContainerRef}
        className={`flex-1 overflow-y-auto ${isFullscreen ? 'max-w-[800px] mx-auto w-full' : ''}`}
        style={{ padding: '4px 24px 20px 24px' }}
      >
        <EditorContent
          editor={editor}
          className="notes-panel-editor outline-none min-h-[200px] text-[15px] leading-[1.8] text-[#1a1a1a] dark:text-[#ededed]"
        />
      </div>

      {/* ─── Delete Confirm Modal ─── */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-sm w-full shadow-2xl border border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.16)]">
            <p className="text-[14px] text-[#1a1a1a] dark:text-[#ededed] mb-4 font-medium">
              确定清空当前笔记吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-[13px] text-[#6b7280] hover:text-[#1a1a1a] dark:hover:text-[#ededed] transition-colors rounded-[6px]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-[13px] bg-red-500 hover:bg-red-600 text-white rounded-[6px] transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Template Modal ─── */}
      {templateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl max-w-md w-full shadow-2xl border border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.16)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.12)]">
              <span className="text-[14px] font-medium text-[#1a1a1a] dark:text-[#ededed]">选择模板</span>
              <button type="button" onClick={() => setTemplateModalOpen(false)} aria-label="关闭">
                <X className="w-4 h-4 text-[#9ca3af] hover:text-[#1a1a1a] dark:hover:text-[#ededed] transition-colors" />
              </button>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-1">
              {templates.length === 0 && (
                <p className="text-[13px] text-[#9ca3af] text-center py-6">暂无模板</p>
              )}
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onApplyTemplate?.(tpl.content);
                    editor?.chain().focus().setContent(tpl.content).run();
                    setTemplateModalOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-[6px] text-[13px] text-[#1a1a1a] dark:text-[#ededed] hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] transition-colors"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Fullscreen Exit Button ─── */}
      {isFullscreen && (
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-[210] px-3 py-1.5 bg-[#f3f4f6] dark:bg-[#1a1a1a] text-[12px] text-[#6b7280] rounded-[6px] hover:bg-[#e5e7eb] dark:hover:bg-[#2a2a2a] transition-colors border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.12)]"
          aria-label="退出全屏"
        >
          退出全屏 (Esc)
        </button>
      )}
    </div>
  );

  return panelContent;
};

export default NotesPanel;
