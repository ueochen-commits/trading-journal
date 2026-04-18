
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DailyPlan, Trade } from '../types';
import {
  ChevronLeft, ChevronRight, X, Edit3, CheckCircle2, ArrowLeft, Save,
  Undo2, Redo2, Mic, MicOff, Bold, Italic, Underline as UnderlineIcon, Code2,
  Link as LinkIcon, Eraser, Type, Paintbrush, Plus, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus, ListTodo, CaseSensitive, Camera
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
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
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import FontSize from '../lib/tiptapFontSize';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

const TEXT_COLORS = ['#E24B4A','#EF9F27','#10b981','#3b82f6','#8b5cf6','#ec4899','#1a1a1a','#6b7280','#9ca3af','#ffffff'];
const BG_COLORS = ['#fef3c7','#fce7f3','#dbeafe','#d1fae5','#ede9fe','#fee2e2','#f3f4f6','#fef9c3','#ccfbf1','#ffffff'];
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
      ${active ? 'bg-[#f3f4f6] text-[#1a1a1a]' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
);

const ToolDivider = () => (
  <div className="w-px h-[14px] mx-1 bg-[rgba(0,0,0,0.08)]" />
);

const RDropdown = ({
  trigger, children, isOpen, onClose,
}: {
  trigger: React.ReactNode; children: React.ReactNode; isOpen: boolean; onClose: () => void;
}) => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useEffect(() => {
    if (isOpen && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, [isOpen]);
  return (
    <div ref={wrapRef} className="relative">
      {trigger}
      {isOpen && pos && (
        <>
          <div className="fixed inset-0 z-[10040]" onClick={onClose} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 10050 }} className="bg-white border border-[rgba(0,0,0,0.12)] rounded-md shadow-lg py-1 min-w-[140px]">
            {children}
          </div>
        </>
      )}
    </div>
  );
};

const RColorPicker = ({
  colors, isOpen, onClose, onSelect, onCustom, triggerRef,
}: {
  colors: string[]; isOpen: boolean; onClose: () => void;
  onSelect: (color: string) => void; onCustom: () => void;
  triggerRef: React.RefObject<HTMLDivElement>;
}) => {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, [isOpen, triggerRef]);
  if (!isOpen || !pos) return null;
  return (
    <>
      <div className="fixed inset-0 z-[10040]" onClick={onClose} />
      <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 10050 }} className="bg-white border border-[rgba(0,0,0,0.12)] rounded-md shadow-lg p-2 w-[180px]">
        <div className="grid grid-cols-5 gap-1.5 mb-2">
          {colors.map((c) => (
            <button key={c} type="button" onClick={() => { onSelect(c); onClose(); }}
              className="w-7 h-7 rounded-[4px] border border-[rgba(0,0,0,0.08)] hover:scale-110 transition-transform"
              style={{ backgroundColor: c }} title={c} aria-label={`颜色 ${c}`} />
          ))}
        </div>
        <button type="button" onClick={onCustom}
          className="w-full text-xs text-center py-1 text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
          自定义颜色...
        </button>
      </div>
    </>
  );
};

interface CalendarViewProps {
  trades: Trade[];
  plans?: DailyPlan[];
  onSavePlan?: (plan: DailyPlan) => void;
  externalSelectedDay?: Date | null;
  onExternalClose?: () => void;
  onOpenTradeReview?: (tradeId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ trades, plans, onSavePlan, externalSelectedDay, onExternalClose, onOpenTradeReview }) => {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [currentView, setCurrentView] = useState<'transactions' | 'review'>('transactions');
  const [viewOpacity, setViewOpacity] = useState(1);
  const [reviewHtml, setReviewHtml] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Toolbar state for review editor
  const [reviewFontSize, setReviewFontSize] = useState(14);
  const [reviewOpenDropdown, setReviewOpenDropdown] = useState<string | null>(null);
  const [reviewTextColorOpen, setReviewTextColorOpen] = useState(false);
  const [reviewBgColorOpen, setReviewBgColorOpen] = useState(false);
  const [reviewInsertMenuOpen, setReviewInsertMenuOpen] = useState(false);
  const [reviewIsRecording, setReviewIsRecording] = useState(false);
  const [showTradePicker, setShowTradePicker] = useState(false);
  const reviewColorInputRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!calendarRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(calendarRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      const now = new Date();
      link.download = `calendar-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);
  const reviewBgColorInputRef = useRef<HTMLDivElement>(null);
  const reviewTextColorNativeRef = useRef<HTMLInputElement>(null);
  const reviewBgColorNativeRef = useRef<HTMLInputElement>(null);
  const reviewRecognitionRef = useRef<any>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const switchView = useCallback((target: 'transactions' | 'review') => {
    setViewOpacity(0);
    setTimeout(() => {
      setCurrentView(target);
      setViewOpacity(1);
    }, 150);
  }, []);

  const doSaveReview = useCallback((html: string) => {
    if (!selectedDay || !onSavePlan) return;
    setSaveStatus('saving');
    const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,'0')}-${String(selectedDay.getDate()).padStart(2,'0')}`;
    const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
    onSavePlan({
      id: existingPlan?.id ?? Date.now().toString(),
      date: dateKey,
      title: `Daily Review - ${dateKey}`,
      folder: 'daily-journal',
      content: html,
      focusTickers: existingPlan?.focusTickers ?? [],
      linkedTradeIds: existingPlan?.linkedTradeIds ?? [],
    });
    setSaveStatus('saved');
    setLastSavedAt(new Date());
  }, [selectedDay, plans, onSavePlan]);

  const reviewEditor = useEditor({
    extensions: [
      StarterKit.configure({ dropcursor: { color: '#B3BFFF', width: 3 } }), Underline, Link.configure({ openOnClick: false }),
      TextStyle, Color, Highlight.configure({ multicolor: true }),
      FontFamily, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: '今天的交易心得、市场观察、情绪状态...' }),
      TaskList, TaskItem.configure({ nested: true }), HorizontalRule, FontSize,
      GlobalDragHandle.configure({ dragHandleWidth: 30 }),
    ],
    content: reviewHtml,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setReviewHtml(html);
      setSaveStatus('unsaved');
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => doSaveReview(html), 2000);
    },
  });

  useEffect(() => {
    if (reviewEditor && selectedDay) {
      reviewEditor.commands.setContent(reviewHtml || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // 注入 + 按钮到 drag handle
  useEffect(() => {
    if (!reviewEditor) return;
    const parent = reviewEditor.view.dom.parentElement;
    if (!parent) return;
    const injectPlus = (handle: Element) => {
      if (handle.querySelector('.drag-plus-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'drag-plus-btn';
      btn.textContent = '+';
      btn.title = '插入新段落';
      btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      btn.addEventListener('dragstart', e => e.stopPropagation());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        reviewEditor.chain().focus().createParagraphNear().run();
      });
      handle.insertBefore(btn, handle.firstChild);
    };
    const observer = new MutationObserver(() => {
      const handle = parent.querySelector('.drag-handle');
      if (handle) injectPlus(handle);
    });
    observer.observe(parent, { childList: true });
    const existing = parent.querySelector('.drag-handle');
    if (existing) injectPlus(existing);
    return () => observer.disconnect();
  }, [reviewEditor]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentView === 'review') switchView('transactions');
        else setSelectedDay(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && currentView === 'review') {
        e.preventDefault();
        doSaveReview(reviewHtml);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentView, reviewHtml, selectedDay, doSaveReview, switchView]);

  const toggleReviewVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (reviewIsRecording && reviewRecognitionRef.current) {
      reviewRecognitionRef.current.stop(); setReviewIsRecording(false); return;
    }
    const rec = new SR();
    rec.lang = 'zh-CN'; rec.interimResults = false; rec.continuous = true;
    rec.onresult = (event: any) => {
      const text = Array.from(event.results as SpeechRecognitionResultList).map((r: SpeechRecognitionResult) => r[0].transcript).join('');
      reviewEditor?.chain().focus().insertContent(text).run();
    };
    rec.onerror = () => setReviewIsRecording(false);
    rec.onend = () => setReviewIsRecording(false);
    rec.start(); reviewRecognitionRef.current = rec; setReviewIsRecording(true);
  }, [reviewIsRecording, reviewEditor]);

  const applyReviewParagraphStyle = useCallback((value: string) => {
    if (!reviewEditor) return;
    switch (value) {
      case 'paragraph': reviewEditor.chain().focus().setParagraph().run(); break;
      case 'h1': reviewEditor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': reviewEditor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': reviewEditor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'blockquote': reviewEditor.chain().focus().toggleBlockquote().run(); break;
      case 'codeBlock': reviewEditor.chain().focus().toggleCodeBlock().run(); break;
    }
    setReviewOpenDropdown(null);
  }, [reviewEditor]);

  const applyReviewCase = useCallback((caseType: string) => {
    if (!reviewEditor) return;
    const { from, to } = reviewEditor.state.selection;
    const text = reviewEditor.state.doc.textBetween(from, to);
    if (!text) { setReviewOpenDropdown(null); return; }
    let transformed = text;
    switch (caseType) {
      case 'uppercase': transformed = text.toUpperCase(); break;
      case 'lowercase': transformed = text.toLowerCase(); break;
      case 'capitalize': transformed = text.replace(/\b\w/g, c => c.toUpperCase()); break;
      case 'sentence': transformed = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
    }
    reviewEditor.chain().focus().insertContentAt({ from, to }, transformed).run();
    setReviewOpenDropdown(null);
  }, [reviewEditor]);

  const handleReviewLink = useCallback(() => {
    if (!reviewEditor) return;
    const url = prompt('输入链接 URL:');
    if (url) reviewEditor.chain().focus().setLink({ href: url }).run();
  }, [reviewEditor]);

  const changeReviewFontSize = useCallback((delta: number) => {
    const next = Math.max(8, Math.min(72, reviewFontSize + delta));
    setReviewFontSize(next);
    reviewEditor?.chain().focus().setFontSize(`${next}px`).run();
  }, [reviewFontSize, reviewEditor]);

  // Month stats for toolbar pills
  const monthStats = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthTrades = trades.filter(tr => {
      const d = new Date(tr.entryDate);
      return d >= start && d <= end;
    });
    const totalPnl = monthTrades.reduce((acc, tr) => acc + (tr.pnl - tr.fees), 0);
    const tradingDaySet = new Set(monthTrades.map(tr => new Date(tr.entryDate).toDateString()));
    return { totalPnl, totalTrades: monthTrades.length, tradingDays: tradingDaySet.size };
  }, [currentDate, trades]);

  // Weekly stats per calendar row
  const weeklyStats = useMemo(() => {
    const totalCells = firstDayOfMonth + daysInMonth;
    const numWeeks = Math.ceil(totalCells / 7);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === currentDate.getFullYear() && now.getMonth() === currentDate.getMonth();
    const weeks: { pnl: number; count: number; tradingDays: number; isCurrent: boolean }[] = [];
    for (let w = 0; w < numWeeks; w++) {
      let weekPnl = 0; let weekCount = 0;
      const daySet = new Set<string>(); let containsToday = false;
      for (let col = 0; col < 7; col++) {
        const cellIndex = w * 7 + col;
        const day = cellIndex - firstDayOfMonth + 1;
        if (day < 1 || day > daysInMonth) continue;
        const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        if (isCurrentMonth && cellDate.toDateString() === now.toDateString()) containsToday = true;
        const dateStr = cellDate.toDateString();
        const dayTrades = trades.filter(tr => new Date(tr.entryDate).toDateString() === dateStr);
        weekPnl += dayTrades.reduce((acc, tr) => acc + (tr.pnl - tr.fees), 0);
        weekCount += dayTrades.length;
        if (dayTrades.length > 0) daySet.add(dateStr);
      }
      weeks.push({ pnl: weekPnl, count: weekCount, tradingDays: daySet.size, isCurrent: containsToday });
    }
    return weeks;
  }, [currentDate, trades, firstDayOfMonth, daysInMonth]);

  const getDayData = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    const daysTrades = trades.filter(tr => new Date(tr.entryDate).toDateString() === dateStr);
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dayPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
    if (daysTrades.length === 0 && !dayPlan) return null;
    const netPnl = daysTrades.reduce((acc, tr) => acc + (tr.pnl - tr.fees), 0);
    const count = daysTrades.length;
    const wins = daysTrades.filter(tr => tr.pnl > 0).length;
    const winRate = count > 0 ? (wins / count) * 100 : 0;
    return { netPnl, count, wins, winRate, hasReview: !!dayPlan, dateKey };
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
    setCurrentView('transactions');
    setReviewHtml(existingPlan ? existingPlan.content : '');
    setSaveStatus('saved');
    setSelectedDay(date);
  };

  // 外部注入日期（如从图表点击）→ 打开弹窗
  useEffect(() => {
    if (!externalSelectedDay) return;
    const date = externalSelectedDay;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
    setCurrentView('transactions');
    setReviewHtml(existingPlan ? existingPlan.content : '');
    setSaveStatus('saved');
    setSelectedDay(date);
  }, [externalSelectedDay]);

  // 弹窗关闭时通知外部
  useEffect(() => {
    if (!selectedDay) onExternalClose?.();
  }, [selectedDay]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDay) return [];
    return trades.filter(tr => new Date(tr.entryDate).toDateString() === selectedDay.toDateString());
  }, [selectedDay, trades]);

  const selectedDayStats = useMemo(() => {
    const count = selectedDayTrades.length;
    if (count === 0) return null;
    const pnl = selectedDayTrades.reduce((acc, tr) => acc + (tr.pnl - tr.fees), 0);
    const wins = selectedDayTrades.filter(tr => tr.pnl > 0).length;
    const losses = selectedDayTrades.filter(tr => tr.pnl <= 0).length;
    const winRate = (wins / count) * 100;
    const avgWin = wins > 0 ? selectedDayTrades.filter(tr => tr.pnl > 0).reduce((acc, tr) => acc + tr.pnl, 0) / wins : 0;
    const avgLoss = losses > 0 ? selectedDayTrades.filter(tr => tr.pnl <= 0).reduce((acc, tr) => acc + tr.pnl, 0) / losses : 0;
    return { pnl, count, wins, losses, winRate, avgWin, avgLoss };
  }, [selectedDayTrades]);

  const extendedDayStats = useMemo(() => {
    if (!selectedDayStats) return null;
    const grossWins = selectedDayTrades.filter(tr => tr.pnl > 0).reduce((acc, tr) => acc + tr.pnl, 0);
    const grossLosses = Math.abs(selectedDayTrades.filter(tr => tr.pnl <= 0).reduce((acc, tr) => acc + tr.pnl, 0));
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
    const totalFees = selectedDayTrades.reduce((acc, tr) => acc + tr.fees, 0);
    const grossPnl = selectedDayTrades.reduce((acc, tr) => acc + tr.pnl, 0);
    const volume = selectedDayTrades.reduce((acc, tr) => acc + (tr.entryPrice * tr.quantity), 0);
    return { profitFactor, totalFees, grossPnl, volume, grossWins, grossLosses };
  }, [selectedDayStats, selectedDayTrades]);

  const cumulativePnlData = useMemo(() => {
    if (!selectedDay) return [];
    const sorted = [...selectedDayTrades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    let cum = 0;
    return sorted.map((tr, i) => { cum += tr.pnl - tr.fees; return { i: i + 1, pnl: parseFloat(cum.toFixed(2)) }; });
  }, [selectedDay, selectedDayTrades]);

  const selectedDayHasReview = useMemo(() => {
    if (!selectedDay) return false;
    const yyyy = selectedDay.getFullYear();
    const mm = String(selectedDay.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDay.getDate()).padStart(2, '0');
    return !!plans?.find(p => p.date === `${yyyy}-${mm}-${dd}` && p.folder === 'daily-journal');
  }, [selectedDay, plans]);

  const modalDateLabel = useMemo(() => {
    if (!selectedDay) return '';
    const isCN = !!(t.calendar as any).weekSuffix;
    if (isCN) {
      const wd = ['周日','周一','周二','周三','周四','周五','周六'][selectedDay.getDay()];
      return `${selectedDay.getFullYear()}年${selectedDay.getMonth()+1}月${selectedDay.getDate()}日 ${wd}`;
    }
    return selectedDay.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }, [selectedDay, t.calendar]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const cal = t.calendar as any;

  const totalCells = firstDayOfMonth + daysInMonth;
  const totalRows = Math.ceil(totalCells / 7);
  const trailingBlanks = totalRows * 7 - totalCells;

  const renderPrevMonthBlanks = () => {
    const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    return Array.from({ length: firstDayOfMonth }, (_, i) => {
      const day = prevMonthDays - firstDayOfMonth + 1 + i;
      return (
        <div key={`prev-${i}`} className="rounded-[8px] relative" style={{ minHeight: 130, background: '#FAFAFA' }}>
          <span className="absolute text-[13px]" style={{ top: 12, right: 14, color: '#B0B5BD' }}>{day}</span>
        </div>
      );
    });
  };

  const renderNextMonthBlanks = () => {
    return Array.from({ length: trailingBlanks }, (_, i) => (
      <div key={`next-${i}`} className="rounded-[8px] relative" style={{ minHeight: 130, background: '#FAFAFA' }}>
        <span className="absolute text-[13px]" style={{ top: 12, right: 14, color: '#B0B5BD' }}>{i + 1}</span>
      </div>
    ));
  };

  const renderCurrentMonthDays = () => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const data = getDayData(d);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
      let bgStyle = '#F3F4F6';
      let textClass = 'text-[#9CA3AF]';
      let pnlTextClass = 'text-[#9CA3AF]';
      let borderClass = '';
      if (data && data.count > 0) {
        if (data.netPnl > 0) { bgStyle = '#DCFCE7'; textClass = 'text-[#15803D]'; pnlTextClass = 'text-[#15803D]'; }
        else if (data.netPnl < 0) { bgStyle = '#FEE2E2'; textClass = 'text-[#DC2626]'; pnlTextClass = 'text-[#DC2626]'; }
        else { bgStyle = '#FEF3C7'; textClass = 'text-[#92400E]'; pnlTextClass = 'text-[#92400E]'; }
      }
      if (isToday) borderClass = 'ring-2 ring-[#3B82F6] ring-inset';
      const iconColor = data && data.count > 0
        ? (data.netPnl > 0 ? '#15803D' : data.netPnl < 0 ? '#DC2626' : '#92400E')
        : '#64748B';
      const iconOpacity = data && data.count > 0 ? 0.55 : 0.45;
      return (
        <div key={d} onClick={() => handleDayClick(d)} role="button" tabIndex={0}
          className={`rounded-[8px] cursor-pointer relative ${borderClass}`}
          style={{ minHeight: 130, background: bgStyle, transition: 'all 150ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          {/* 左上角：复盘笔记图标 */}
          {data?.hasReview && (
            <div title="当日已写复盘" style={{ position: 'absolute', top: 10, left: 12, color: iconColor, opacity: iconOpacity, display: 'flex' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="14" y2="13"/>
                <line x1="8" y1="17" x2="12" y2="17"/>
              </svg>
            </div>
          )}
          <span className={`absolute text-[13px] font-medium ${textClass}`} style={{ top: 12, right: 14 }}>{d}</span>
          {data && data.count > 0 && (
            <>
              <div className="absolute flex flex-col items-end" style={{ bottom: 12, right: 14, lineHeight: 1.5 }}>
                <span className={`text-[15px] font-semibold ${pnlTextClass}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.netPnl >= 0 ? '+' : '\u2212'}${Math.abs(data.netPnl).toFixed(2)}
                </span>
                <span className="text-[12px] font-normal" style={{ color: '#6B7280' }}>{data.count} {cal.trades || 'trades'}</span>
                <span className="text-[12px] font-normal" style={{ color: '#9CA3AF' }}>{data.winRate.toFixed(1)}%</span>
              </div>
              <div className={`absolute rounded-full ${data.netPnl >= 0 ? 'bg-[#15803D]' : 'bg-[#DC2626]'}`}
                style={{ width: 5, height: 5, bottom: 6, right: 6 }} />
            </>
          )}
          {(!data || data.count === 0) && data?.hasReview && (
            <div className="absolute rounded-full bg-[#F97316]" style={{ width: 5, height: 5, bottom: 6, right: 6 }} />
          )}
        </div>
      );
    });
  };

  return (
    <div ref={calendarRef} className="space-y-4 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]" style={{ transition: 'all 150ms ease' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[16px] font-semibold text-[#111827] min-w-[120px] text-center">{monthName} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]" style={{ transition: 'all 150ms ease' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="ml-1 bg-white border border-[#E5E7EB] rounded-[8px] text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
            style={{ padding: '6px 10px', transition: 'all 150ms ease' }}>
            {cal.thisMonth || 'This month'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            title={cal.weekSuffix ? '截图保存' : 'Save screenshot'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#6366F1] hover:bg-[#F3F4F6] transition-all"
            style={{ flexShrink: 0 }}
          >
            <Camera className="w-4 h-4" />
          </button>
          <span className="text-[12px] text-[#9CA3AF] font-medium">{cal.monthlyStats || 'Monthly:'}</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-bold ${monthStats.totalPnl >= 0 ? 'bg-[#D4F4DD] text-[#15803D]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {monthStats.totalPnl >= 0 ? '+' : '\u2212'}${Math.abs(monthStats.totalPnl).toFixed(2)}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium bg-[#F3F4F6] text-[#374151]">
            {monthStats.tradingDays} {cal.tradingDays || 'days'}
          </span>
        </div>
      </div>

      {/* Calendar Grid + Weekly Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-7 mb-1.5 border-b border-[#F3F4F6] pb-2">
            {t.calendar.weekdays.map(day => (
              <div key={day} className="flex items-center justify-center">
                <span className="text-[13px] font-medium text-[#6B7280]">{day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ gap: 6 }}>
            {renderPrevMonthBlanks()}
            {renderCurrentMonthDays()}
            {renderNextMonthBlanks()}
          </div>
        </div>
        <div className="lg:w-[220px] flex flex-col gap-[6px]">
          <div style={{ height: 33 }} />
          {weeklyStats.map((week, i) => {
            const isPositive = week.pnl >= 0;
            const weekLabel = cal.weekSuffix ? `${cal.week}${i + 1}${cal.weekSuffix}` : `${cal.week} ${i + 1}`;
            return (
              <div key={i} className="rounded-[8px] border border-[#E5E7EB] flex-1 flex flex-col justify-center"
                style={{ minHeight: 130, padding: '12px 16px', background: week.isCurrent ? '#FAFAFA' : '#ffffff', transition: 'all 150ms ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = week.isCurrent ? '#FAFAFA' : '#ffffff'; }}>
                <span className="text-[12px] font-medium text-[#9CA3AF] mb-1">{weekLabel}</span>
                <span className={`text-[18px] font-bold mb-2 ${week.count === 0 ? 'text-[#111827]' : isPositive ? 'text-[#15803D]' : 'text-[#DC2626]'}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {week.count === 0 ? '$0.00' : `${isPositive ? '+' : '\u2212'}$${Math.abs(week.pnl).toFixed(2)}`}
                </span>
                <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280]">
                  {week.tradingDays} {cal.tradingDays || 'days'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Portal */}
      {selectedDay && createPortal(
        <div
          className="animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', padding: 24 }}
          onClick={() => { doSaveReview(reviewHtml); setSelectedDay(null); }}
        >
          <div
            className="animate-fade-in-up"
            style={{
              width: 'min(1040px, 92vw)',
              height: currentView === 'review' ? 'min(92vh, 1040px)' : undefined,
              maxHeight: 'min(92vh, 1040px)',
              background: '#FFFFFF', borderRadius: 16,
              boxShadow: '0 24px 72px rgba(15,23,42,0.14)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              WebkitFontSmoothing: 'antialiased',
              transition: 'height 200ms ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ opacity: viewOpacity, transition: 'opacity 150ms ease-out', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
              {currentView === 'transactions' ? (
                <>
                  {/* ── View A: Header ── */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 44px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 19, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.015em' }}>{modalDateLabel}</span>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 400, color: '#64748B' }}>Net P&L</span>
                      <span style={{ fontSize: 19, fontWeight: 500, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: selectedDayStats ? (selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626') : '#94A3B8' }}>
                        {selectedDayStats ? `${selectedDayStats.pnl >= 0 ? '+' : '\u2212'}$${Math.abs(selectedDayStats.pnl).toFixed(2)}` : '\u2014'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => switchView('review')}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontWeight: 500, color: '#334155', cursor: 'pointer', outline: 'none', transition: 'background 150ms', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                      >
                        <Edit3 style={{ width: 14, height: 14 }} />
                        {selectedDayHasReview ? (cal.weekSuffix ? '查看复盘' : 'View note') : (cal.weekSuffix ? '写复盘' : 'Add note')}
                        {selectedDayHasReview && (
                          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#6366F1', border: '2px solid #fff' }} />
                        )}
                      </button>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                        <img src="/lion-care.png" alt="logo" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '50%' }} />
                      </div>
                      <button
                        onClick={() => { doSaveReview(reviewHtml); setSelectedDay(null); }}
                        style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, color: '#64748B', cursor: 'pointer', outline: 'none', transition: 'background 150ms', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <X style={{ width: 17, height: 17 }} />
                      </button>
                    </div>
                  </div>
                  {/* ── View A: KPI + Chart ── */}
                  <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 40, alignItems: 'center', padding: '32px 44px' }}>
                    <div style={{ minWidth: 0 }}>
                      {selectedDayStats ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <AreaChart data={cumulativePnlData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="calPnlGreenGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34D399" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="calPnlRedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FB7185" stopOpacity={0} />
                                <stop offset="100%" stopColor="#FB7185" stopOpacity={0.4} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="i" axisLine={false} tickLine={false} tick={false} />
                            <YAxis axisLine={false} tickLine={false} tickCount={5} width={44} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Inter' } as any} tickFormatter={(v: number) => `${v < 0 ? '\u2212' : ''}$${Math.abs(v).toFixed(2)}`} />
                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, padding: '4px 10px' }} formatter={(v: any) => [`${v >= 0 ? '+' : ''}$${Number(v).toFixed(2)}`, 'P&L']} labelFormatter={(l: any) => `Trade ${l}`} />
                            <Area type="linear" dataKey="pnl" stroke={selectedDayStats.pnl >= 0 ? '#10B981' : '#F43F5E'} strokeWidth={1.5} strokeLinecap="round" fill={selectedDayStats.pnl >= 0 ? 'url(#calPnlGreenGrad)' : 'url(#calPnlRedGrad)'} fillOpacity={1} dot={false} activeDot={{ r: 3 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14 }}>当日无交易</div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 26, columnGap: 24 }}>
                      {[
                        { label: cal.weekSuffix ? '总交易' : 'Total Trades', value: selectedDayStats ? String(selectedDayStats.count) : '\u2014', color: '#0F172A' },
                        { label: cal.weekSuffix ? '毛盈亏' : 'Gross P&L', value: extendedDayStats ? `${extendedDayStats.grossPnl >= 0 ? '+' : '\u2212'}$${Math.abs(extendedDayStats.grossPnl).toFixed(2)}` : '\u2014', color: extendedDayStats ? (extendedDayStats.grossPnl >= 0 ? '#15803D' : '#DC2626') : '#94A3B8' },
                        { label: cal.weekSuffix ? '盈/亏笔数' : 'Winners / Losers', value: selectedDayStats ? `${selectedDayStats.wins} / ${selectedDayStats.losses}` : '\u2014', color: '#0F172A' },
                        { label: cal.weekSuffix ? '手续费' : 'Commissions', value: extendedDayStats ? `$${extendedDayStats.totalFees.toFixed(2)}` : '\u2014', color: '#0F172A' },
                        { label: cal.weekSuffix ? '胜率' : 'Win Rate', value: selectedDayStats ? `${selectedDayStats.winRate.toFixed(1)}%` : '\u2014', color: '#0F172A' },
                        { label: cal.weekSuffix ? '成交量' : 'Volume', value: extendedDayStats && extendedDayStats.volume > 0 ? extendedDayStats.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '\u2014', color: '#0F172A' },
                        { label: cal.weekSuffix ? '盈利因子' : 'Profit Factor', value: extendedDayStats ? (extendedDayStats.profitFactor === Infinity ? '\u221e' : extendedDayStats.profitFactor.toFixed(2)) : '\u2014', color: '#0F172A' },
                        { label: cal.weekSuffix ? '均盈 / 均亏' : 'Avg Win / Loss', value: null, color: '#0F172A', isAvgWinLoss: true },
                      ].map(kpi => (
                        <div key={kpi.label} style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 400, color: '#64748B', marginBottom: 8, letterSpacing: '-0.005em' }}>{kpi.label}</div>
                          {kpi.isAvgWinLoss ? (
                            <div style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em' }}>
                              {selectedDayStats ? (
                                <>
                                  <span style={{ color: '#15803D' }}>${selectedDayStats.avgWin.toFixed(2)}</span>
                                  <span style={{ color: '#94A3B8' }}> / </span>
                                  <span style={{ color: '#DC2626' }}>{'\u2212'}${Math.abs(selectedDayStats.avgLoss).toFixed(2)}</span>
                                </>
                              ) : <span style={{ color: '#94A3B8' }}>\u2014</span>}
                            </div>
                          ) : (
                            <div style={{ fontSize: 16, fontWeight: 500, color: kpi.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.015em' }}>{kpi.value}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* ── View A: Trade Table ── */}
                  {selectedDayTrades.length > 0 && (
                    <div style={{ borderTop: '1px solid #F1F5F9', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '13%' }} /><col style={{ width: '18%' }} /><col style={{ width: '10%' }} />
                          <col style={{ width: '15%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} /><col />
                        </colgroup>
                        <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
                          <tr>
                            {[
                              { label: cal.weekSuffix ? '开仓时间' : 'Time', align: 'left' },
                              { label: cal.weekSuffix ? '品种' : 'Symbol', align: 'left' },
                              { label: cal.weekSuffix ? '方向' : 'Direction', align: 'left' },
                              { label: cal.weekSuffix ? '数量' : 'Qty', align: 'right' },
                              { label: cal.weekSuffix ? '净 P&L' : 'Net P&L', align: 'right' },
                              { label: 'ROI%', align: 'right' },
                              { label: cal.weekSuffix ? '策略' : 'Strategy', align: 'left' },
                            ].map((col, ci) => (
                              <th key={col.label} style={{ padding: '12px 16px', textAlign: col.align as any, fontSize: 12.5, fontWeight: 500, color: '#475569', borderBottom: '1px solid #F1F5F9', paddingLeft: ci === 0 ? 44 : 16, paddingRight: ci === 6 ? 44 : 16 }}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDayTrades.map(trade => {
                            const netPnl = trade.pnl - trade.fees;
                            const costBasis = trade.entryPrice * trade.quantity;
                            const roi = costBasis > 0 ? (netPnl / costBasis) * 100 : null;
                            return (
                              <tr key={trade.id}
                                style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 100ms', cursor: onOpenTradeReview ? 'pointer' : 'default' }}
                                onClick={() => { if (onOpenTradeReview && trade.id) { doSaveReview(reviewHtml); setSelectedDay(null); onOpenTradeReview(trade.id); } }}
                                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFBFC'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}>
                                <td style={{ padding: '18px 16px 18px 44px', fontSize: 13.5, color: '#0F172A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                  {new Date(trade.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                </td>
                                <td style={{ padding: '18px 16px' }}>
                                  <span style={{ display: 'inline-block', padding: '3px 9px', background: '#EEF2FF', color: '#4338CA', borderRadius: 4, fontSize: 12.5, fontWeight: 500 }}>{trade.symbol}</span>
                                </td>
                                <td style={{ padding: '18px 16px', fontSize: 13.5, fontWeight: 500, color: '#0F172A' }}>{trade.direction}</td>
                                <td style={{ padding: '18px 16px', fontSize: 13.5, color: '#0F172A', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{trade.quantity.toLocaleString()}</td>
                                <td style={{ padding: '18px 16px', fontSize: 13.5, fontWeight: 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: netPnl >= 0 ? '#15803D' : '#DC2626' }}>
                                  {netPnl >= 0 ? '+' : '\u2212'}${Math.abs(netPnl).toFixed(2)}
                                </td>
                                <td style={{ padding: '18px 16px', fontSize: 13.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: roi !== null ? (roi >= 0 ? '#15803D' : '#DC2626') : '#94A3B8' }}>
                                  {roi !== null ? (roi >= 0 ? `${roi.toFixed(2)}%` : `(${Math.abs(roi).toFixed(2)}%)`) : '\u2014'}
                                </td>
                                <td style={{ padding: '18px 44px 18px 16px' }}>
                                  {trade.setup
                                    ? <span style={{ display: 'inline-block', padding: '3px 9px', background: '#F8FAFC', color: '#334155', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12.5, fontWeight: 500 }}>{trade.setup}</span>
                                    : <span style={{ color: '#CBD5E1', fontSize: 13.5, letterSpacing: '0.05em' }}>--</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* ── View A: Bottom Bar ── */}
                  <div style={{ flexShrink: 0, borderTop: '1px solid #F1F5F9', padding: '20px 44px 28px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      onClick={() => { doSaveReview(reviewHtml); setSelectedDay(null); }}
                      style={{ height: 40, padding: '0 22px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontWeight: 500, color: '#475569', cursor: 'pointer', outline: 'none', transition: 'background 150ms' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                    >
                      {cal.weekSuffix ? '关闭' : 'Close'}
                    </button>
                  </div>
                </>
              ) : (
                /* ── View B: Review Editor ── */
                <>
                  {/* B1: Top Nav Bar — 与 View A header 完全相同的容器结构 */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 44px 0' }}>
                    {/* 左侧：纯文字返回按钮 */}
                    <button
                      onClick={() => switchView('transactions')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: '#64748B', padding: 0, outline: 'none', transition: 'color 150ms', flexShrink: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#0F172A'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748B'; }}
                    >
                      <ArrowLeft style={{ width: 14, height: 14 }} />
                      {cal.weekSuffix ? '返回交易详情' : 'Back to trades'}
                    </button>
                    {/* 右侧：保存状态 + 保存按钮 + logo + X */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12.5, color: saveStatus === 'unsaved' ? '#6366F1' : '#94A3B8' }}>
                        {saveStatus === 'saving' ? '保存中...' : saveStatus === 'unsaved' ? '未保存' : lastSavedAt ? `已保存 · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '已保存'}
                      </span>
                      <button
                        onClick={() => doSaveReview(reviewHtml)}
                        disabled={saveStatus !== 'unsaved'}
                        style={{ height: 34, padding: '0 14px', background: saveStatus === 'unsaved' ? '#6366F1' : '#F1F5F9', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, color: saveStatus === 'unsaved' ? '#fff' : '#94A3B8', cursor: saveStatus === 'unsaved' ? 'pointer' : 'default', outline: 'none', transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                      >
                        <Save style={{ width: 13, height: 13 }} />
                        {cal.weekSuffix ? '保存' : 'Save'}
                      </button>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                        <img src="/lion-care.png" alt="logo" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '50%' }} />
                      </div>
                      <button
                        onClick={() => { doSaveReview(reviewHtml); setSelectedDay(null); }}
                        style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, color: '#64748B', cursor: 'pointer', outline: 'none', transition: 'background 150ms', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <X style={{ width: 17, height: 17 }} />
                      </button>
                    </div>
                  </div>
                  {/* B2: Data Context Strip */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, height: 64, padding: '0 44px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', marginTop: 24 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{modalDateLabel}</span>
                    <span style={{ width: 1, height: 16, background: '#CBD5E1' }} />
                    <span style={{ fontSize: 13, color: '#64748B' }}>Net P&L</span>
                    <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: selectedDayStats ? (selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626') : '#94A3B8' }}>
                      {selectedDayStats ? `${selectedDayStats.pnl >= 0 ? '+' : '\u2212'}$${Math.abs(selectedDayStats.pnl).toFixed(2)}` : '\u2014'}
                    </span>
                    <span style={{ width: 1, height: 16, background: '#CBD5E1' }} />
                    <span style={{ fontSize: 13, color: '#64748B' }}>{selectedDayStats?.count ?? 0} {cal.weekSuffix ? '笔' : 'trades'}</span>
                    <span style={{ width: 1, height: 16, background: '#CBD5E1' }} />
                    <span style={{ fontSize: 13, color: '#64748B' }}>{cal.weekSuffix ? '胜率' : 'Win'} {selectedDayStats ? `${selectedDayStats.winRate.toFixed(1)}%` : '\u2014'}</span>
                    {extendedDayStats && (
                      <>
                        <span style={{ width: 1, height: 16, background: '#CBD5E1' }} />
                        <span style={{ fontSize: 13, color: '#64748B' }}>{cal.weekSuffix ? '盈利因子' : 'PF'} {extendedDayStats.profitFactor === Infinity ? '\u221e' : extendedDayStats.profitFactor.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  {/* B3: Rich Text Toolbar */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 2, height: 48, padding: '0 28px', borderBottom: '1px solid #F1F5F9', background: '#FAFBFC', overflowX: 'auto' }}
                    onMouseDown={e => e.preventDefault()}>
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().undo().run()} title="撤销" ariaLabel="撤销" disabled={!reviewEditor?.can().undo()}>
                      <Undo2 className="w-3 h-3" />
                    </ToolBtn>
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().redo().run()} title="重做" ariaLabel="重做" disabled={!reviewEditor?.can().redo()}>
                      <Redo2 className="w-3 h-3" />
                    </ToolBtn>
                    <ToolBtn onClick={toggleReviewVoice} active={reviewIsRecording} title="语音输入" ariaLabel="语音输入">
                      {reviewIsRecording ? <MicOff className="w-3 h-3 text-red-500" /> : <Mic className="w-3 h-3" />}
                    </ToolBtn>
                    <ToolDivider />
                    <RDropdown isOpen={reviewOpenDropdown === 'paragraph'} onClose={() => setReviewOpenDropdown(null)}
                      trigger={
                        <button type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => setReviewOpenDropdown(reviewOpenDropdown === 'paragraph' ? null : 'paragraph')}
                          className="flex items-center gap-1 px-2 h-6 text-[12px] text-[#6b7280] hover:bg-[#f3f4f6] rounded-[6px] transition-colors" title="段落样式" aria-label="段落样式">
                          正文 <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                      }>
                      {PARAGRAPH_STYLES.map(s => (
                        <button key={s.value} type="button" onClick={() => applyReviewParagraphStyle(s.value)}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] transition-colors">{s.label}</button>
                      ))}
                    </RDropdown>
                    <RDropdown isOpen={reviewOpenDropdown === 'font'} onClose={() => setReviewOpenDropdown(null)}
                      trigger={
                        <button type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => setReviewOpenDropdown(reviewOpenDropdown === 'font' ? null : 'font')}
                          className="flex items-center gap-1 px-2 h-6 text-[12px] text-[#6b7280] hover:bg-[#f3f4f6] rounded-[6px] transition-colors" title="字体" aria-label="字体">
                          Arial <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                      }>
                      {FONT_OPTIONS.map(f => (
                        <button key={f.value || 'default'} type="button"
                          onClick={() => { reviewEditor?.chain().focus().setFontFamily(f.value || 'sans-serif').run(); setReviewOpenDropdown(null); }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] transition-colors" style={{ fontFamily: f.value || 'inherit' }}>{f.label}</button>
                      ))}
                    </RDropdown>
                    <div className="flex items-center">
                      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => changeReviewFontSize(-1)}
                        className="w-5 h-6 flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] rounded-l-[4px] transition-colors text-[11px]" title="减小字号" aria-label="减小字号">−</button>
                      <input type="number" value={reviewFontSize}
                        onChange={e => { const v = Math.max(8, Math.min(72, parseInt(e.target.value) || 14)); setReviewFontSize(v); reviewEditor?.chain().focus().setFontSize(`${v}px`).run(); }}
                        className="w-8 h-6 text-center text-[12px] border-x border-[rgba(0,0,0,0.12)] bg-transparent text-[#1a1a1a] outline-none" min={8} max={72} aria-label="字号" />
                      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => changeReviewFontSize(1)}
                        className="w-5 h-6 flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] rounded-r-[4px] transition-colors text-[11px]" title="增大字号" aria-label="增大字号">+</button>
                    </div>
                    <ToolDivider />
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().toggleBold().run()} active={reviewEditor?.isActive('bold')} title="加粗" ariaLabel="加粗">
                      <Bold className="w-3 h-3" strokeWidth={2.5} />
                    </ToolBtn>
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().toggleItalic().run()} active={reviewEditor?.isActive('italic')} title="斜体" ariaLabel="斜体">
                      <Italic className="w-3 h-3" />
                    </ToolBtn>
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().toggleUnderline().run()} active={reviewEditor?.isActive('underline')} title="下划线" ariaLabel="下划线">
                      <UnderlineIcon className="w-3 h-3" />
                    </ToolBtn>
                    <ToolDivider />
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().toggleCode().run()} active={reviewEditor?.isActive('code')} title="行内代码" ariaLabel="行内代码">
                      <Code2 className="w-3 h-3" />
                    </ToolBtn>
                    <ToolBtn onClick={handleReviewLink} title="插入链接" ariaLabel="插入链接">
                      <LinkIcon className="w-3 h-3" />
                    </ToolBtn>
                    <ToolBtn onClick={() => reviewEditor?.chain().focus().unsetAllMarks().clearNodes().run()} title="清除格式" ariaLabel="清除格式">
                      <Eraser className="w-3 h-3" />
                    </ToolBtn>
                    <ToolDivider />
                    <div className="relative" ref={reviewColorInputRef as any}>
                      <ToolBtn onClick={() => setReviewTextColorOpen(!reviewTextColorOpen)} title="文字颜色" ariaLabel="文字颜色">
                        <div className="flex flex-col items-center"><Type className="w-3 h-3" /><div className="w-3 h-[3px] rounded-sm bg-[#E24B4A] mt-px" /></div>
                      </ToolBtn>
                      <RColorPicker colors={TEXT_COLORS} isOpen={reviewTextColorOpen} onClose={() => setReviewTextColorOpen(false)}
                        onSelect={c => reviewEditor?.chain().focus().setColor(c).run()}
                        onCustom={() => { reviewTextColorNativeRef.current?.click(); setReviewTextColorOpen(false); }}
                        triggerRef={reviewColorInputRef as any} />
                      <input ref={reviewTextColorNativeRef} type="color" className="hidden" onChange={e => reviewEditor?.chain().focus().setColor(e.target.value).run()} />
                    </div>
                    <div className="relative" ref={reviewBgColorInputRef as any}>
                      <ToolBtn onClick={() => setReviewBgColorOpen(!reviewBgColorOpen)} title="背景色" ariaLabel="背景色">
                        <div className="flex flex-col items-center"><Paintbrush className="w-3 h-3" /><div className="w-3 h-[3px] rounded-sm bg-[#EF9F27] mt-px" /></div>
                      </ToolBtn>
                      <RColorPicker colors={BG_COLORS} isOpen={reviewBgColorOpen} onClose={() => setReviewBgColorOpen(false)}
                        onSelect={c => reviewEditor?.chain().focus().toggleHighlight({ color: c }).run()}
                        onCustom={() => { reviewBgColorNativeRef.current?.click(); setReviewBgColorOpen(false); }}
                        triggerRef={reviewBgColorInputRef as any} />
                      <input ref={reviewBgColorNativeRef} type="color" className="hidden" onChange={e => reviewEditor?.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
                    </div>
                    <div className="relative">
                      <ToolBtn onClick={() => setReviewInsertMenuOpen(!reviewInsertMenuOpen)} title="插入" ariaLabel="插入">
                        <Plus className="w-3 h-3" />
                      </ToolBtn>
                      {reviewInsertMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-[10040]" onClick={() => setReviewInsertMenuOpen(false)} />
                          <div className="absolute top-full left-0 mt-1 z-[10050] bg-white border border-[rgba(0,0,0,0.12)] rounded-md shadow-lg py-1 min-w-[160px]">
                            <button type="button" onClick={() => { reviewEditor?.chain().focus().setHorizontalRule().run(); setReviewInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] flex items-center gap-2"><Minus className="w-3 h-3" /> 插入分隔线</button>
                            <button type="button" onClick={() => { reviewEditor?.chain().focus().toggleTaskList().run(); setReviewInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] flex items-center gap-2"><ListTodo className="w-3 h-3" /> 插入待办列表</button>
                            <button type="button" onClick={() => { setShowTradePicker(true); setReviewInsertMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] flex items-center gap-2"><Plus className="w-3 h-3" /> 引用交易</button>
                          </div>
                        </>
                      )}
                    </div>
                    <ToolDivider />
                    <RDropdown isOpen={reviewOpenDropdown === 'align'} onClose={() => setReviewOpenDropdown(null)}
                      trigger={
                        <button type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => setReviewOpenDropdown(reviewOpenDropdown === 'align' ? null : 'align')}
                          className="flex items-center gap-1 px-1.5 h-6 text-[12px] text-[#6b7280] hover:bg-[#f3f4f6] rounded-[4px] transition-colors" title="对齐" aria-label="对齐">
                          <AlignLeft className="w-3 h-3" /> <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                      }>
                      {ALIGN_OPTIONS.map(o => (
                        <button key={o.value} type="button" onClick={() => { reviewEditor?.chain().focus().setTextAlign(o.value).run(); setReviewOpenDropdown(null); }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] transition-colors flex items-center gap-2">
                          <o.icon className="w-3 h-3" /> {o.label}
                        </button>
                      ))}
                    </RDropdown>
                    <RDropdown isOpen={reviewOpenDropdown === 'case'} onClose={() => setReviewOpenDropdown(null)}
                      trigger={
                        <button type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => setReviewOpenDropdown(reviewOpenDropdown === 'case' ? null : 'case')}
                          className="flex items-center gap-1 px-1.5 h-6 text-[12px] text-[#6b7280] hover:bg-[#f3f4f6] rounded-[4px] transition-colors" title="大小写" aria-label="大小写">
                          <CaseSensitive className="w-3.5 h-3.5" /> <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                      }>
                      {CASE_OPTIONS.map(o => (
                        <button key={o.value} type="button" onClick={() => applyReviewCase(o.value)}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-[#1a1a1a] hover:bg-[#f3f4f6] transition-colors">{o.label}</button>
                      ))}
                    </RDropdown>
                  </div>
                  {/* B4: Editor Area */}
                  <div className="notes-panel-editor" style={{ padding: '32px 64px', overflowY: 'auto', flex: '1 1 auto', minHeight: 480, minWidth: 0 }}>
                    <EditorContent editor={reviewEditor} />
                  </div>
                  {/* B5: Status Bar */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, padding: '0 44px', background: '#FAFBFC', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>
                        {reviewHtml.replace(/<[^>]*>/g, '').length} {cal.weekSuffix ? '字' : 'chars'}
                      </span>
                      <span style={{ width: 1, height: 10, background: '#E2E8F0' }} />
                      {saveStatus === 'saving' && <span style={{ fontSize: 12, color: '#10B981' }}>自动保存中...</span>}
                      {saveStatus === 'saved' && lastSavedAt && <span style={{ fontSize: 12, color: '#94A3B8' }}>已保存 · {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      {saveStatus === 'unsaved' && <span style={{ fontSize: 12, color: '#6366F1' }}>未保存</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {[['⌘B', '加粗'], ['⌘I', '斜体'], ['⌘K', '链接'], ['⌘S', '保存']].map(([key, label]) => (
                        <span key={key} style={{ fontSize: 11, color: '#CBD5E1' }}><kbd style={{ fontFamily: 'inherit' }}>{key}</kbd> {label}</span>
                      ))}
                    </div>
                  </div>
                  {/* Trade Picker Overlay */}
                  {showTradePicker && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
                      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 480, maxHeight: 400, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{cal.weekSuffix ? '选择要引用的交易' : 'Select a trade to quote'}</span>
                          <button onClick={() => setShowTradePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X style={{ width: 16, height: 16 }} /></button>
                        </div>
                        {selectedDayTrades.length === 0 ? (
                          <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>{cal.weekSuffix ? '当日无交易' : 'No trades today'}</p>
                        ) : selectedDayTrades.map(trade => {
                          const netPnl = trade.pnl - trade.fees;
                          return (
                            <div key={trade.id}
                              onClick={() => {
                                const html = `<div style="display:inline-flex;align-items:center;gap:8px;padding:4px 10px;background:#EEF2FF;border-radius:6px;font-size:12px;font-weight:500;color:#4338CA;margin:0 2px">${trade.symbol} ${trade.direction} ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}</div>`;
                                reviewEditor?.chain().focus().insertContent(html).run();
                                setShowTradePicker(false);
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 100ms', marginBottom: 4 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{trade.symbol} · {trade.direction}</span>
                              <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: netPnl >= 0 ? '#15803D' : '#DC2626' }}>
                                {netPnl >= 0 ? '+' : '\u2212'}${Math.abs(netPnl).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* Toast */}
      {showToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-[60]">
          <CheckCircle2 style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{(t.calendar as any).modal?.saveSuccess || '已保存'}</span>
        </div>
      )}
    </div>
  );
};

export default CalendarView;