import { createPortal } from 'react-dom';
import TradeCalculationControls from './TradeCalculationControls';
import { tradeNotional, futuresSpec, futuresGrossPnl, matchingFeeTemplate, estimateTradeFee, type FeeTemplate } from '../utils/tradeCalculation';
import CsvImportPage from './CsvImportPage';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Plus, Search, Trash2, Edit2,
    X, Check, ChevronRight, ChevronLeft, AlertTriangle,
    ShieldCheck, Smile, Meh, Frown, Zap, Flame, Clock,
    Calendar, TrendingUp, TrendingDown, Briefcase, Image as ImageIcon,
    FileText, BookCheck, Hourglass, Power, Share2, FileUp, ListFilter,
    AlertOctagon, Info, Sparkles, ChevronDown, LayoutGrid, List, BookOpen,
    Upload, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useLanguage } from '../LanguageContext';
import { useUser } from './UserContext';
import { useTour } from './TourContext';
import { Trade, TradeStatus, Direction, DailyPlan, ChecklistItem, RiskSettings, Strategy, TradingAccount, TagCategoryDefinition } from '../types';
import TradeReviewModal from './TradeReviewModal';
import TradeScreenshotPicker from './common/TradeScreenshotPicker';
import { displayTradePnl, tradePnlBreakdown, type PnlInputMode } from '../utils/tradePnl';
import { JOURNAL_INSTRUMENTS } from '../utils/chartSymbols';
import { defaultJournalAccount, validateFirstTrade } from '../utils/firstTrade';
import RiskReferenceNotice from './common/RiskReferenceNotice';
import { getJournalRiskAdvisories, exceedsTradeRiskReference } from '../utils/journalRiskAdvisories';

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative ml-1.5 inline-flex">
        <Info className="w-3 h-3 text-slate-400 cursor-help hover:text-indigo-500 transition-colors dark:text-slate-400" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center leading-snug">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

const ReportRangeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-hidden="true">
        <rect x="2.7" y="4" width="14.6" height="13.7" rx="3.8" fill="#d8d0f2" />
        <path d="M2.7 7.6h14.6v-0.2c0-1.9-1.5-3.4-3.4-3.4H6.1C4.2 4 2.7 5.5 2.7 7.4v0.2Z" fill="#8674d6" />
        <rect x="5.5" y="2.8" width="1.9" height="3.9" rx="0.95" fill="#6f55d8" />
        <rect x="12.6" y="2.8" width="1.9" height="3.9" rx="0.95" fill="#6f55d8" />
        <rect x="5.8" y="10.2" width="2.2" height="1.9" rx="0.65" fill="#6f55d8" opacity="0.92" />
        <rect x="8.9" y="10.2" width="2.2" height="1.9" rx="0.65" fill="#6f55d8" opacity="0.7" />
        <rect x="12" y="10.2" width="2.2" height="1.9" rx="0.65" fill="#6f55d8" opacity="0.7" />
        <rect x="5.8" y="13.4" width="2.2" height="1.9" rx="0.65" fill="#6f55d8" opacity="0.55" />
        <rect x="8.9" y="13.4" width="2.2" height="1.9" rx="0.65" fill="#6f55d8" opacity="0.55" />
    </svg>
);

const ReportAccountIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-hidden="true">
        <path d="M3.6 7.6c0-1.4 1.1-2.5 2.5-2.5h7.6c1.4 0 2.5 1.1 2.5 2.5v0.5h-2.1c-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2h2.1v0.5c0 1.4-1.1 2.5-2.5 2.5H6.1c-1.4 0-2.5-1.1-2.5-2.5V7.6Z" fill="#d8d0f2" />
        <path d="M6.5 5.2 12 2.8c1-0.4 2.1 0.3 2.1 1.4v1H6.5Z" fill="#b8ace8" />
        <path d="M10.9 11.3c0-1.2 1-2.2 2.2-2.2h2.9c0.8 0 1.4 0.6 1.4 1.4v1.7c0 0.8-0.6 1.4-1.4 1.4h-2.9c-1.2 0-2.2-1-2.2-2.3Z" fill="#8674d6" />
        <circle cx="13.5" cy="11.4" r="0.85" fill="#f8f6ff" />
    </svg>
);

// Helper for date ranges
const getRange = (period: 'today' | 'week' | 'month' | 'last30') => {
    const end = new Date();
    const start = new Date();
    if (period === 'today') {
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
    } else if (period === 'week') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0,0,0,0);
    } else if (period === 'month') {
        start.setDate(1);
        start.setHours(0,0,0,0);
    } else if (period === 'last30') {
        start.setDate(start.getDate() - 30);
        start.setHours(0,0,0,0);
    }
    return { start, end };
};

interface JournalProps {
  trades: Trade[];
  plans: DailyPlan[];
  onAddTrade: (trade: Trade) => void | Promise<Trade | void>;
  onUpdateTrade: (trade: Trade) => Promise<void>;
  onDeleteTrade: (id: string) => void;
  onBatchDeleteTrades?: (ids: string[]) => Promise<void>;
  checklist: ChecklistItem[];
  onUpdateChecklist: (checklist: ChecklistItem[]) => void;
  onImportTrades?: (trades: Trade[]) => void | Promise<void>;
  onShare: (trade: Trade) => void;
  riskSettings?: RiskSettings;
  onSavePlan?: (plan: DailyPlan) => void | Promise<void>;
  autoOpen?: boolean;
  onResetAutoOpen?: () => void;
  strategies: Strategy[];
  tagCategories: TagCategoryDefinition[];
  onSaveTagCategories: (categories: TagCategoryDefinition[]) => Promise<void> | void;
  onManageTags: () => void;
  onNavigateToNote?: (noteId: string) => void;
  onCreateNoteIntent?: (date: string, tradeIds: string[]) => void;
  feeTemplates?: FeeTemplate[];
  defaultAccountId?: string;
  onCreateAccount?: () => void;
  isDataLoading?: boolean;
  dataLoadError?: string;
  onRetryData?: () => void;
  onViewRiskRules?: () => void;
  tradingAccounts?: TradingAccount[];
  initialAccountId?: string;
  initialReviewTradeId?: string | null;
  onResetReviewTradeId?: () => void;
}

const initialFormState: Partial<Trade> = {
    symbol: '',
    direction: Direction.LONG,
    entryDate: '',
    exitDate: '',
    quantity: 1,
    leverage: 1,
    setup: '',
    notes: '',
    reviewNotes: '',
    images: [],
    mistakes: []
};

type FilterOperator = 'is' | 'isNot' | 'contains' | 'gt' | 'lt';
type FilterField = 'symbol' | 'setup' | 'status' | 'pnl' | 'direction';

interface FilterRule {
    id: string;
    field: FilterField;
    operator: FilterOperator;
    value: string;
}

const FIELD_LABELS_EN: Record<FilterField, string> = {
    symbol: 'Symbol',
    setup: 'Strategy',
    status: 'Result',
    pnl: 'PnL ($)',
    direction: 'Direction'
};
const FIELD_LABELS_CN: Record<FilterField, string> = {
    symbol: '交易对',
    setup: '策略',
    status: '结果',
    pnl: '净盈亏 ($)',
    direction: '方向'
};

const getChecklistPreference = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('tg_enable_checklist') !== 'false';
};

const Journal: React.FC<JournalProps> = ({
    trades, plans, onAddTrade, onUpdateTrade, onDeleteTrade, onBatchDeleteTrades,
    checklist, onUpdateChecklist, onImportTrades, onShare,
    riskSettings, onSavePlan, autoOpen, onResetAutoOpen, strategies,
    tagCategories, onSaveTagCategories, onManageTags,
    onNavigateToNote, onCreateNoteIntent, onViewRiskRules, tradingAccounts, initialAccountId,
    initialReviewTradeId, onResetReviewTradeId, feeTemplates = [], defaultAccountId, onCreateAccount, isDataLoading, dataLoadError, onRetryData
}) => {
  const { t, language } = useLanguage();
  const { user, openPricing, currencySymbol, userTimezone } = useUser();
  const { registerStepAction, unregisterStepAction } = useTour();

  const accounts = tradingAccounts || [];

  // Basic States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'checklist' | 'form'>('checklist');
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [formData, setFormData] = useState<any>(initialFormState);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvAccountId, setCsvAccountId] = useState('');
  const [useFutures, setUseFutures] = useState(false);
  const [useFeeTemplate, setUseFeeTemplate] = useState(true);
  const [pnlInputMode, setPnlInputMode] = useState<PnlInputMode>('net');
  const tradeDialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isModalOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    tradeDialogRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [isModalOpen]);

  
  const formAccount = accounts.find(account => account.id === formData.accountId);
  const contract = futuresSpec(formData.symbol || '');
  const feeTemplate = matchingFeeTemplate(feeTemplates, formAccount, formData.symbol || '');
  const completedTrade = Boolean(formData.exitDate || Number(formData.exitPrice));
  const templateFee = feeTemplate ? estimateTradeFee(feeTemplate, Number(formData.quantity || 1), completedTrade) : null;
  const automaticFee = useFeeTemplate && templateFee !== null;
  const effectiveFees = automaticFee ? templateFee! : useFeeTemplate ? 0 : Number(formData.fees || 0);
  let calculation: ReturnType<typeof futuresGrossPnl> | null = null;
  let calculationError = '';
  if (useFutures) {
    try {
      if (formAccount?.currency !== 'USD') throw new Error(language === 'cn' ? '合约计算以 USD 计价，请选择 USD 账户，或按券商结单手动填写盈亏。' : 'Select a USD account, or enter broker-reported P&L manually.');
      calculation = futuresGrossPnl({ symbol: formData.symbol || '', entryPrice: Number(formData.entryPrice), exitPrice: Number(formData.exitPrice), quantity: Number(formData.quantity || 1), direction: formData.direction });
    } catch (error) { calculationError = (error as Error).message; }
  }
  const effectivePnl = useFutures ? calculation?.gross ?? 0 : Number(formData.pnl || 0);

  // Dashboard-style filtering states
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || 'all');
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>(getRange('last30'));
  const [activeDatePreset, setActiveDatePreset] = useState<string>('All Time');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const accountSwitcherRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Checklist Session State
  const [sessionChecklist, setSessionChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [preTradeMood, setPreTradeMood] = useState<string | null>(null);
  const [isChecklistEnabled, setIsChecklistEnabled] = useState<boolean>(() => getChecklistPreference());

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [reviewTrade, setReviewTrade] = useState<Trade | null>(null);

  useEffect(() => {
    if (initialAccountId && initialAccountId !== 'all') setSelectedAccountId(initialAccountId);
    if (!editingTradeId) setFormData((previous: any) => {
      if (accounts.some(account => account.id === previous.accountId)) return previous;
      return { ...previous, accountId: defaultJournalAccount(accounts, initialAccountId, defaultAccountId) };
    });
  }, [tradingAccounts, initialAccountId, defaultAccountId, editingTradeId]);

  // Auto-open review modal when navigating from Dashboard
  useEffect(() => {
    if (initialReviewTradeId) {
      const target = trades.find(t => t.id === initialReviewTradeId);
      if (target) setReviewTrade(target);
      onResetReviewTradeId?.();
    }
  }, [initialReviewTradeId]);
  const [highlightedTradeId, setHighlightedTradeId] = useState<string | null>(null);
  const [newMistake, setNewMistake] = useState('');
  const [showMistakeSuggestions, setShowMistakeSuggestions] = useState(false);

  const MISTAKE_PRESETS = [
    { group: '交易错误', tags: ['踏空', '追高', '止损太宽', '止损太窄', '仓位过重', '过早离场', '过晚离场', '逆势交易', '没有等待确认', '重复入场'] },
    { group: '心理错误', tags: ['FOMO 恐慌追涨', '报复性交易', '过度自信', '犹豫不决', '情绪化操作', '贪婪持仓', '恐惧止损', '不遵守计划', '频繁操作', '赌博心态'] },
  ];
  
  // Persistent View Mode State
  const [viewMode, setViewMode] = useState<'list' | 'gallery' | 'daily'>(() => {
    const saved = localStorage.getItem('tg_journal_view_mode');
    return (saved as 'list' | 'gallery' | 'daily') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('tg_journal_view_mode', viewMode);
  }, [viewMode]);
  
  // Expanded days state for Daily Journal View
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Filtering
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [showDuration, setShowDuration] = useState(false);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  // Refs
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const entryDateWrapperRef = useRef<HTMLDivElement>(null);
  const exitDateWrapperRef = useRef<HTMLDivElement>(null);

  // --- Click Outside logic ---
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (accountSwitcherRef.current && !accountSwitcherRef.current.contains(event.target as Node)) {
              setIsAccountSwitcherOpen(false);
          }
          if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
              setIsDatePickerOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preset Handler
  const handlePresetSelect = (preset: string) => {
      setActiveDatePreset(preset);
      const { start, end } = getRange('today');
      let newStart = start;
      let newEnd = end;

      if (preset === 'All Time') {
          newStart = new Date(0); // Epoch
          newEnd = new Date(9999, 11, 31); // Far future
      } else if (preset === 'Yesterday') {
          newStart.setDate(newStart.getDate() - 1);
          newEnd.setDate(newEnd.getDate() - 1);
          newEnd.setHours(23,59,59,999);
      } else if (preset === 'This Week') {
          const day = newStart.getDay();
          newStart.setDate(newStart.getDate() - day);
          newStart.setHours(0,0,0,0);
      } else if (preset === 'Last Month') {
          newStart = new Date(newStart.getFullYear(), newStart.getMonth() - 1, 1);
          newEnd = new Date(newStart.getFullYear(), newStart.getMonth(), 0);
          newEnd.setHours(23,59,59,999);
      } else if (preset === 'Last 30 Days') {
          const r = getRange('last30');
          newStart = r.start;
          newEnd = r.end;
      }
      setDateRange({ start: newStart, end: newEnd });
      setIsDatePickerOpen(false);
  };

  const renderMiniCalendar = (baseDate: Date) => {
      const { days, firstDay } = getDaysInMonth(baseDate);
      const monthName = baseDate.toLocaleString('default', { month: 'short' });
      
      const dayCells = [];
      for(let i = 0; i < firstDay; i++) {
          dayCells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
      }
      for(let d = 1; d <= days; d++) {
          const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), d);
          const isSelected = current >= dateRange.start && current <= dateRange.end;
          const isStart = current.toDateString() === dateRange.start.toDateString();
          const isEnd = current.toDateString() === dateRange.end.toDateString();
          dayCells.push(
              <div 
                  key={d} 
                  className={`w-8 h-8 flex items-center justify-center text-xs cursor-pointer rounded-full transition-all ${isStart || isEnd ? 'bg-indigo-600 text-white font-bold' : isSelected ? 'bg-indigo-100 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40' : 'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                  onClick={() => {
                      if (dateRange.start.toDateString() === dateRange.end.toDateString()) {
                          if (current < dateRange.start) setDateRange({ start: current, end: dateRange.end });
                          else setDateRange({ start: dateRange.start, end: current });
                      } else {
                          setDateRange({ start: current, end: current });
                      }
                      setActiveDatePreset('Custom');
                  }}
              >
                  {d}
              </div>
          );
      }
      return (
          <div className="w-full">
              <div className="text-center font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">{monthName} {baseDate.getFullYear()}</div>
              <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                  {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] text-slate-400 font-bold dark:text-slate-400">{d}</div>)}
                  {dayCells}
              </div>
          </div>
      );
  };

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      return { days, firstDay, year, month };
  };

  // --- Effects ---
  // Initializing Flatpickr logic
  useEffect(() => {
    if (isModalOpen && modalStep === 'form') {
        // ✅ 防御性检查：确保 flatpickr 已加载
        if (typeof window.flatpickr !== 'function') {
            console.warn('Flatpickr not loaded yet, skipping initialization');
            return;
        }

        const fpConfig = { enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, allowInput: true, disableMobile: "true", wrap: true };
        let entryFp: any;
        let exitFp: any;
        if (entryDateWrapperRef.current) {
            // @ts-ignore
            entryFp = window.flatpickr(entryDateWrapperRef.current, { ...fpConfig, defaultDate: formData.entryDate, onChange: (selectedDates: Date[], dateStr: string) => { setFormData((prev: any) => ({ ...prev, entryDate: dateStr })); } });
        }
        if (exitDateWrapperRef.current) {
            // @ts-ignore
            exitFp = window.flatpickr(exitDateWrapperRef.current, { ...fpConfig, defaultDate: formData.exitDate, onChange: (selectedDates: Date[], dateStr: string) => { setFormData((prev: any) => ({ ...prev, exitDate: dateStr })); } });
        }
        return () => {
            if (entryFp) entryFp.destroy();
            if (exitFp) exitFp.destroy();
        };
    }
  }, [isModalOpen, modalStep, editingTradeId]);

  useEffect(() => {
      if (autoOpen) {
          handleOpenNewModal();
          if (onResetAutoOpen) onResetAutoOpen();
      }
  }, [autoOpen]);

  // Register tour step actions so the tour can open modals/panels automatically
  useEffect(() => {
      registerStepAction('journalAddBtn', () => {
          setIsModalOpen(false);
          setShowReviewPanel(false);
      });
      registerStepAction('journalViewModes', () => {
          setIsModalOpen(false);
          setShowReviewPanel(false);
      });
      registerStepAction('journalToolbar', () => {
          setIsModalOpen(false);
          setShowReviewPanel(false);
      });
      registerStepAction('journalActions', () => {
          setIsModalOpen(false);
          setShowReviewPanel(false);
      });
      registerStepAction('journalChecklist', () => {
          setFormData({ ...initialFormState });
          setEditingTradeId(null);
          setSessionChecklist(checklist.map(i => ({ ...i, isCompleted: false })));
          const enabled = getChecklistPreference();
          setIsChecklistEnabled(enabled);
          setModalStep(enabled ? 'checklist' : 'form');
          setUseFutures(false); setUseFeeTemplate(true);
          setIsModalOpen(true);
      });
      registerStepAction('journalForm', () => {
          setIsModalOpen(true);
          setModalStep('form');
          setShowReviewPanel(false);
      });
      registerStepAction('journalRequired', () => {
          setIsModalOpen(true);
          setModalStep('form');
          setShowReviewPanel(false);
      });
      registerStepAction('journalStrategy', () => {
          setIsModalOpen(true);
          setModalStep('form');
          setShowReviewPanel(false);
      });
      registerStepAction('journalReview', () => {
          setIsModalOpen(true);
          setModalStep('form');
          setShowReviewPanel(true);
      });
      registerStepAction('journalMistakes', () => {
          setIsModalOpen(true);
          setModalStep('form');
          setShowReviewPanel(true);
      });
      registerStepAction('__close__', () => {
          setIsModalOpen(false);
          setShowReviewPanel(false);
      });
      return () => {
          ['journalAddBtn', 'journalChecklist', 'journalForm', 'journalRequired', 'journalStrategy', 'journalReview', 'journalMistakes', 'journalViewModes', 'journalToolbar', 'journalActions', '__close__'].forEach(key => unregisterStepAction(key));
      };
  }, [checklist]);

  // --- Handlers ---
  const handleOpenNewModal = () => {
      setSaveError('');
      setPnlInputMode('net');
      setFormData({ ...initialFormState, entryDate: getLocalNowStr(), fees: '', accountId: defaultJournalAccount(accounts, initialAccountId && initialAccountId !== 'all' ? initialAccountId : selectedAccountId, defaultAccountId) });
      setEditingTradeId(null);
      setSessionChecklist(checklist.map(i => ({...i, isCompleted: false})));
      const enabled = getChecklistPreference();
      setIsChecklistEnabled(enabled);
      setModalStep(enabled ? 'checklist' : 'form');
      setUseFutures(false); setUseFeeTemplate(true);
      setIsModalOpen(true);
  };

  const handleInlineChecklistToggle = () => {
      const next = !isChecklistEnabled;
      if (typeof window !== 'undefined') {
          localStorage.setItem('tg_enable_checklist', String(next));
      }
      setIsChecklistEnabled(next);
      setModalStep(next ? 'checklist' : 'form');
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
  };

  const addFilterRule = () => { setFilterRules([...filterRules, { id: Date.now().toString(), field: 'symbol', operator: 'contains', value: '' }]); };
  const removeFilterRule = (id: string) => { setFilterRules(filterRules.filter(r => r.id !== id)); };
  const updateFilterRule = (id: string, updates: Partial<FilterRule>) => { setFilterRules(filterRules.map(r => r.id === id ? { ...r, ...updates } : r)); };
  const clearFilters = () => { setFilterRules([]); setSearchTerm(''); };

  const getOptionsForField = (field: FilterField) => {
      const uniqueValues = new Set<string>();
      trades.forEach(t => {
          if (field === 'symbol') uniqueValues.add(t.symbol);
          if (field === 'setup') uniqueValues.add(t.setup);
          if (field === 'status') uniqueValues.add(t.status);
          if (field === 'direction') uniqueValues.add(t.direction);
      });
      return Array.from(uniqueValues);
  };

  const filteredTrades = useMemo(() => {
      return trades.filter(t => {
          // 1. Account Filter
          if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false;

          // 2. Date Range Filter
          const tDate = new Date(t.entryDate).getTime();
          if (activeDatePreset !== 'All Time' && activeDatePreset !== '所有时间') {
               if (tDate < dateRange.start.getTime() || tDate > dateRange.end.getTime()) return false;
          }

          // 3. Search Term
          if (searchTerm) {
              const lower = searchTerm.toLowerCase();
              const matchesSearch = t.symbol.toLowerCase().includes(lower) || t.setup.toLowerCase().includes(lower) || t.notes.toLowerCase().includes(lower) || t.mistakes?.some(m => m.toLowerCase().includes(lower));
              if (!matchesSearch) return false;
          }

          // 4. Advanced Filter Rules
          if (filterRules.length > 0) {
              return filterRules.every(rule => {
                  let val: any;
                  if (rule.field === 'pnl') val = t.pnl;
                  else val = t[rule.field as keyof Trade];
                  if (rule.field === 'pnl') {
                      const numVal = Number(rule.value);
                      if (isNaN(numVal)) return true;
                      if (rule.operator === 'gt') return val > numVal;
                      if (rule.operator === 'lt') return val < numVal;
                      return val == numVal;
                  } else {
                      const strVal = String(val).toLowerCase();
                      const ruleVal = rule.value.toLowerCase();
                      if (rule.operator === 'is') return strVal === ruleVal;
                      if (rule.operator === 'isNot') return strVal !== ruleVal;
                      if (rule.operator === 'contains') return strVal.includes(ruleVal);
                  }
                  return true;
              });
          }
          return true;
      }).sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [trades, searchTerm, filterRules, selectedAccountId, dateRange, activeDatePreset]);

  // Helpers
  const getDurationInMs = (start: string, end?: string) => { if (!end) return 0; return new Date(end).getTime() - new Date(start).getTime(); };
  const formatDuration = (start: string, end?: string) => { if (!end) return 'Open'; const ms = new Date(end).getTime() - new Date(start).getTime(); const minutes = Math.floor(ms / 60000); const hours = Math.floor(minutes / 60); if (hours > 0) return `${hours}h ${minutes % 60}m`; return `${minutes}m`; };
  const maxDuration = useMemo(() => { return Math.max(...trades.map(t => getDurationInMs(t.entryDate, t.exitDate)), 1000 * 60 * 60); }, [trades]);
  const uniqueSymbols = Array.from(new Set([...JOURNAL_INSTRUMENTS.map(instrument => instrument.symbol), ...trades.map(t => t.symbol)]));

  const handleRowClick = (trade: Trade) => {
      setSaveError('');
      setPnlInputMode('net');
      setFormData({ ...trade, entryDate: trade.entryDate.slice(0, 16).replace('T', ' '), exitDate: trade.exitDate ? trade.exitDate.slice(0, 16).replace('T', ' ') : '', leverage: trade.leverage || 1, riskAmount: trade.riskAmount || 0, images: trade.images || [], mistakes: trade.mistakes || [] });
      setEditingTradeId(trade.id);
      setModalStep('form');
      setShowReviewPanel(false);
      setUseFutures(false); setUseFeeTemplate(false);
      setIsModalOpen(true);
  };

  const getLocalNowStr = () => { const now = new Date(); const pad = (n: number) => String(n).padStart(2, '0'); return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`; };
  const handleSetTimeNow = (field: 'entryDate' | 'exitDate') => { setFormData((prev: any) => ({ ...prev, [field]: getLocalNowStr() })); };

  const handleQuickClose = (e: React.MouseEvent, trade: Trade) => {
      e.stopPropagation();
      const now = new Date().toISOString();
      const updatedTrade = { ...trade, exitDate: now, status: trade.pnl > 0 ? TradeStatus.WIN : trade.pnl < 0 ? TradeStatus.LOSS : TradeStatus.BE };
      onUpdateTrade(updatedTrade);
      setToastMessage(language === 'cn' ? "交易已平仓" : "Trade Closed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  };

  const handleInlinePnlChange = (e: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>, trade: Trade) => {
      const val = e.target.value;
      if (val === '' || val === '-') return; 
      const newPnl = parseFloat(val);
      if (isNaN(newPnl)) return;
      const newStatus = trade.status === TradeStatus.OPEN ? TradeStatus.OPEN : newPnl > 0 ? TradeStatus.WIN : newPnl < 0 ? TradeStatus.LOSS : TradeStatus.BE;
      onUpdateTrade({ ...trade, pnl: newPnl, status: newStatus }).catch(() => {
        e.target.value = trade.pnl.toFixed(2);
        setToastType('error'); setToastMessage(language === 'cn' ? '盈亏未能保存，请重试。' : 'P&L could not be saved. Please retry.'); setShowToast(true);
      });
  };

  const handleToggleChecklist = (id: string) => { setSessionChecklist(prev => prev.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item)); };
  const handleAddChecklistItem = () => { if (!newItemText.trim()) return; const newItem: ChecklistItem = { id: Date.now().toString(), text: newItemText, isCompleted: true }; const newGlobalList = [...checklist, { ...newItem, isCompleted: false }]; onUpdateChecklist(newGlobalList); setSessionChecklist([...sessionChecklist, newItem]); setNewItemText(''); };
  const handleDeleteChecklistItem = (id: string) => { const newGlobalList = checklist.filter(item => item.id !== id); onUpdateChecklist(newGlobalList); setSessionChecklist(prev => prev.filter(item => item.id !== id)); };

  const handleProceed = () => {
      if (preTradeMood) {
          const moodObj = MOODS.find(m => m.id === preTradeMood);
          const moodLabel = moodObj ? moodObj.label : preTradeMood;
          setFormData((prev: any) => ({ ...prev, notes: `[${t.journal.preTrade.moodTitle}: ${moodLabel}]\n${prev.notes || ''}` }));
      }
      setModalStep('form');
  };

  const handleAddMistake = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && newMistake.trim()) { e.preventDefault(); setFormData((prev: any) => ({ ...prev, mistakes: [...(prev.mistakes || []), newMistake.trim()] })); setNewMistake(''); } };
  const addMistakeTag = (tag: string) => { if (!formData.mistakes?.includes(tag)) { setFormData((prev: any) => ({ ...prev, mistakes: [...(prev.mistakes || []), tag] })); } };
  const removeMistake = (idx: number) => { setFormData((prev: any) => ({ ...prev, mistakes: prev.mistakes?.filter((_: any, i: number) => i !== idx) })); };

  const [savingTrade, setSavingTrade] = useState(false);
  const [processingScreenshots, setProcessingScreenshots] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savePending = useRef(false);
  const saveTradeToState = async () => {
        if (savePending.current || processingScreenshots) return;
        // Validate required fields
        const errors: Record<string, boolean> = {};
        if (!formData.symbol?.trim()) errors.symbol = true;
        if (!formData.entryDate?.trim()) errors.entryDate = true;
        if (!formData.entryPrice && formData.entryPrice !== 0) errors.entryPrice = true;
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSaveError(language === 'cn' ? '请填写交易品种、开仓时间和开仓价格。' : 'Enter a symbol, entry time and entry price.');
            return;
        }
        setFormErrors({});
        if (isDataLoading || dataLoadError) { setSaveError(dataLoadError || (language === 'cn' ? '账户数据仍在加载，请稍候再保存。' : 'Account data is loading. Please try again shortly.')); return; }
        if (useFutures && calculationError) { setSaveError(calculationError); return; }
        const validationError = validateFirstTrade({ ...formData, pnl: effectivePnl, fees: effectiveFees }, accounts);
        if (validationError) { setSaveError(language === 'cn' ? validationError : 'Check the account, symbol, dates and numeric fields. Prices, quantity and leverage must be positive.'); return; }
        const isOpenTrade = !formData.exitDate && !Number(formData.exitPrice);
        if (!isOpenTrade && !useFutures && (formData.pnl === '' || formData.pnl == null)) { setSaveError(language === 'cn' ? '请填写这笔平仓交易的盈亏；盈亏为零请填 0，也可以使用合约计算。' : 'Enter P&L for this closed trade, including 0 for breakeven, or use the contract calculator.'); return; }
        const inputPnl = effectivePnl;
        const feesAmount = effectiveFees;
        let finalPnl: number;
        try { finalPnl = tradePnlBreakdown(inputPnl, feesAmount, pnlInputMode).net; }
        catch (error) { setSaveError(language === 'cn' ? (error as Error).message : 'Enter a valid P&L and non-negative total fees.'); return; }
        let status = TradeStatus.WIN;
        if (isOpenTrade) status = TradeStatus.OPEN;
        else status = finalPnl > 0 ? TradeStatus.WIN : (finalPnl < 0 ? TradeStatus.LOSS : TradeStatus.BE);
        const tradeId = editingTradeId || Date.now().toString();
        const tradeData: Trade = { id: tradeId, symbol: formData.symbol!.trim().toUpperCase(), entryDate: formData.entryDate!, exitDate: formData.exitDate || '', entryPrice: Number(formData.entryPrice) || 0, exitPrice: Number(formData.exitPrice) || 0, quantity: Number(formData.quantity) || 1, direction: formData.direction!, status: status, pnl: finalPnl, leverage: Number(formData.leverage) || 1, riskAmount: Number(formData.riskAmount) || 0, setup: formData.setup || '', notes: formData.notes || '', reviewNotes: formData.reviewNotes || '', fees: feesAmount, images: formData.images || [], mistakes: formData.mistakes || [], rating: formData.rating, compliance: formData.compliance, executionGrade: formData.executionGrade, accountId: formData.accountId, profitTarget: formData.profitTarget, stopLoss: formData.stopLoss, customTags: formData.customTags || {} };
        savePending.current = true;
        setSavingTrade(true);
        setSaveError('');
        try {
        let savedId = tradeId;
        if (editingTradeId) await onUpdateTrade(tradeData);
        else {
          const saved = await onAddTrade(tradeData);
          if (saved) savedId = saved.id;
        }
        let noteWarning = false;
        if (formData.reviewNotes && onSavePlan && tradeData.entryDate) {
            const existingReview = plans.find(plan => !plan.isDeleted && plan.title.startsWith('Review:') && plan.linkedTradeIds?.length === 1 && plan.linkedTradeIds[0] === savedId);
            const planId = existingReview?.id || `review-${savedId}`;
            const tradeDate = new Date(tradeData.entryDate.replace(' ', 'T')).toISOString().slice(0, 10);
            const newPlan: DailyPlan = { id: planId, date: tradeDate, title: `Review: ${tradeData.symbol} - ${tradeDate}`, folder: 'daily-journal', content: formData.reviewNotes, focusTickers: [tradeData.symbol], linkedTradeIds: [savedId] };
            try { await onSavePlan(newPlan); } catch { noteWarning = true; }
        }
        handleCloseModal(); setFormData(initialFormState); setEditingTradeId(null); setToastType('success'); setToastMessage(noteWarning ? (language === 'cn' ? '交易已保存，笔记同步失败；复盘文字已保留在交易中。' : 'Trade saved; notebook sync failed. Review text is kept in the trade.') : isOpenTrade ? (language === 'cn' ? '已保存为持仓交易' : 'Trade saved as OPEN position!') : t.journal.saveSuccess); setShowToast(true); setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : (language === 'cn' ? '保存失败，请重试' : 'Save failed. Please retry.'));
        } finally { savePending.current = false; setSavingTrade(false); }
  };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); await saveTradeToState(); };

  const completedCount = sessionChecklist.filter(i => i.isCompleted).length;
  const totalCount = sessionChecklist.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isFormOpenTrade = !formData.exitDate && !Number(formData.exitPrice);

  const MOODS = [
      { id: 'calm', label: t.journal.preTrade.moods.calm, icon: Smile, color: 'text-emerald-500' },
      { id: 'excited', label: t.journal.preTrade.moods.excited, icon: Zap, color: 'text-yellow-500', isRisky: true },
      { id: 'anxious', label: t.journal.preTrade.moods.anxious, icon: Meh, color: 'text-blue-500', isRisky: true },
      { id: 'angry', label: t.journal.preTrade.moods.angry, icon: Flame, color: 'text-rose-500', isRisky: true },
      { id: 'bored', label: t.journal.preTrade.moods.bored, icon: Frown, color: 'text-slate-500 dark:text-slate-400' },
  ];
  const selectedMoodObj = MOODS.find(m => m.id === preTradeMood);
  const isRiskyMood = selectedMoodObj?.isRisky;
  const currentAccountName = selectedAccountId === 'all' ? (language === 'cn' ? '所有账户' : 'All Accounts') : accounts.find(a => a.id === selectedAccountId)?.name || 'Unknown';
  const riskAdvisories = getJournalRiskAdvisories(trades, riskSettings, accounts, selectedAccountId, new Date(), userTimezone);
  const tradeRiskExceeded = exceedsTradeRiskReference(Number(formData.riskAmount || 0), riskSettings);



  const activeReviewTrade = reviewTrade ? trades.find(t => t.id === reviewTrade.id) || reviewTrade : null;

  // --- Daily Journal Aggregation Logic ---
  const groupedDailyTrades = useMemo(() => {
    const map: Record<string, { trades: Trade[], netPnl: number, grossPnl: number, fees: number, volume: number, dateKey: string }> = {};
    
    filteredTrades.forEach(t => {
      const dObj = new Date(t.entryDate);
      const dateKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
      const displayDate = dObj.toDateString();
      
      if (!map[displayDate]) {
        map[displayDate] = { trades: [], netPnl: 0, grossPnl: 0, fees: 0, volume: 0, dateKey };
      }
      map[displayDate].trades.push(t);
      const net = t.pnl;
      map[displayDate].netPnl += net;
      map[displayDate].grossPnl += displayTradePnl(t, 'gross');
      map[displayDate].fees += t.fees;
      map[displayDate].volume += (tradeNotional(t));
    });

    return Object.entries(map).map(([date, data]) => {
      const winners = data.trades.filter(t => t.pnl > 0).length;
      const losers = data.trades.filter(t => t.pnl < 0).length;
      const total = data.trades.length;
      const winRate = total > 0 ? (winners / total) * 100 : 0;
      
      const winnerPnl = data.trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
      const loserPnl = Math.abs(data.trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
      const profitFactor = loserPnl === 0 ? (winnerPnl > 0 ? 999 : 0) : winnerPnl / loserPnl;

      // Construct simple equity curve data for the chart
      let runningPnl = 0;
      const equityCurve = data.trades.sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).map((t, idx) => {
          runningPnl += t.pnl;
          return { name: idx, pnl: runningPnl };
      });

      return {
        date,
        dateKey: data.dateKey,
        trades: data.trades,
        tradesCount: total,
        winners,
        losers,
        winRate,
        netPnl: data.netPnl,
        grossPnl: data.grossPnl,
        commissions: data.fees,
        volume: data.volume,
        profitFactor,
        equityCurve
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTrades]);

  // Handler for expanding/collapsing days
  const toggleDayExpanded = (date: string) => {
    setExpandedDays(prev => {
        const next = new Set(prev);
        if (next.has(date)) next.delete(date);
        else next.add(date);
        return next;
    });
  };

  const getGradeColor = (grade?: string) => {
      if (!grade || grade === '-') return 'text-slate-400 dark:text-slate-400';
      if (grade.startsWith('A')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      if (grade.startsWith('B')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      if (grade.startsWith('C') || grade.startsWith('D')) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      return 'text-slate-400 dark:text-slate-400';
  };

  // --- Batch Selection Handlers ---
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTrades.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTrades.map(t => t.id)));
    }
  };

  const handleBatchDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    setSelectedIds(new Set());
    if (onBatchDeleteTrades) {
      await onBatchDeleteTrades(idsToDelete);
    } else {
      idsToDelete.forEach(id => onDeleteTrade(id));
    }
  };

  // Clear selection when viewMode or filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [viewMode, selectedAccountId, activeDatePreset]);

  // --- SMART NAVIGATION HANDLER ---
  const handleDailyNoteAction = (e: React.MouseEvent, day: any) => {
      e.stopPropagation();
      const existingNote = plans.find(p => p.date === day.dateKey && p.folder === 'daily-journal' && !p.isDeleted);
      
      if (existingNote) {
          // Scenario A: View Existing
          onNavigateToNote?.(existingNote.id);
      } else {
          // Scenario B: Auto-Create Intent
          onCreateNoteIntent?.(day.dateKey, day.trades.map((t: Trade) => t.id));
      }
  };

  if (activeReviewTrade) {
      return (
          <div className="absolute inset-0 z-40 bg-white dark:bg-slate-950">
              <TradeReviewModal
                  trade={activeReviewTrade}
                  allTrades={filteredTrades}
                  isOpen={true}
                  onClose={() => setReviewTrade(null)}
                  onUpdateTrade={onUpdateTrade}
                  strategies={strategies}
                  tagCategories={tagCategories}
                  onSaveTagCategories={onSaveTagCategories}
                  onManageTags={onManageTags}
                  tradingAccounts={tradingAccounts}
                  onSavePlan={onSavePlan}
                  plans={plans}
              />
          </div>
      );
  }

  const datePresets = [
      { id: 'All Time', label: language === 'cn' ? '所有时间' : 'All Time' },
      { id: 'Today', label: language === 'cn' ? '今天' : 'Today' },
      { id: 'Yesterday', label: language === 'cn' ? '昨天' : 'Yesterday' },
      { id: 'This Week', label: language === 'cn' ? '本周' : 'This Week' },
      { id: 'Last Month', label: language === 'cn' ? '上个月' : 'Last Month' },
      { id: 'Last 30 Days', label: language === 'cn' ? '最近30天' : 'Last 30 Days' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.journal.title}</h2>
        <div className="flex items-center gap-3">
            <div id="journal-view-toggle" className="tg-module flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400'}`} title="List View"><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-white dark:bg-slate-700 shadow text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400'}`} title="Gallery View"><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('daily')} className={`p-2 rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white dark:bg-slate-700 shadow text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400'}`} title="Daily Journal View"><BookOpen className="w-4 h-4" /></button>
            </div>
            <div className="relative">

                <button onClick={() => { if (user.tier === 'free') openPricing(); else { setCsvAccountId(defaultJournalAccount(accounts, selectedAccountId, defaultAccountId)); setShowCsvPreview(true); } }} className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-medium text-sm relative overflow-hidden group"><FileUp className="w-4 h-4 mr-2" />Import CSV{user.tier === 'free' && <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-lg">PRO</span></div>}</button>
            </div>
            <button id="journal-add-btn" onClick={handleOpenNewModal} className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 font-medium"><Plus className="w-4 h-4 mr-2" />{t.journal.addTrade}</button>
        </div>
      </div>

      <RiskReferenceNotice settings={riskSettings} language={language} currencySymbol={currencySymbol} onViewRules={onViewRiskRules} />
      {riskAdvisories.length > 0 && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">{language === 'cn' ? '当日风险提醒（不影响记录）' : 'Today’s risk reminder — recording remains available'}</p>
          {riskAdvisories.map(advisory => <p key={advisory.kind} className="mt-1">{advisory.kind === 'daily_loss'
            ? (language === 'cn' ? `当前账户范围内，当日已平仓净亏损 ${currencySymbol}${advisory.value.toFixed(2)}，达到参考值 ${currencySymbol}${advisory.limit}。` : `Closed trades in this account scope have a net loss of ${currencySymbol}${advisory.value.toFixed(2)}, reaching the ${currencySymbol}${advisory.limit} reference.`)
            : (language === 'cn' ? `当前账户范围内，当日已连续亏损 ${advisory.value} 笔，达到 ${advisory.limit} 笔的参考值。` : `Today’s loss streak in this account scope is ${advisory.value}, reaching the ${advisory.limit}-trade reference.`)}</p>)}
          <p className="mt-1">{language === 'cn' ? '建议评估是否继续开新仓；已有交易仍可正常添加、补录和修改。演示账户不参与此提醒。' : 'Consider reviewing new positions. Existing trades can still be recorded and edited. Demo accounts are excluded.'}</p>
        </div>
      )}

       {showToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-100 animate-fade-in">
              <div className={`${toastType === 'error' ? 'bg-rose-600 border-rose-500/50' : 'bg-emerald-600 border-emerald-500/50'} text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md`}>
                  {toastType === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span className="font-medium text-sm shadow-sm">{toastMessage}</span>
              </div>
          </div>
       )}

      {/* ── Journal Stat Cards ─────────────────────────────────────────── */}
      {(() => {
        const wins = filteredTrades.filter(t => t.pnl > 0);
        const losses = filteredTrades.filter(t => t.pnl < 0);
        const breakEvens = filteredTrades.filter(t => t.pnl === 0);
        const totalPnl = filteredTrades.reduce((s, t) => s + t.pnl, 0);
        const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
        const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
        const winRate = filteredTrades.length > 0 ? wins.length / filteredTrades.length : 0;
        const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
        const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
        const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

        // Cumulative PnL sparkline data
        const sorted = [...filteredTrades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
        let cum = 0;
        const cumPoints = sorted.map(t => { cum += t.pnl; return cum; });
        const sparkColor = totalPnl >= 0 ? '#1D9E75' : '#E24B4A';
        const sparkGradId = `jsc-grad-${totalPnl >= 0 ? 'g' : 'r'}`;

        // SVG sparkline path
        let sparkPath = '', sparkArea = '';
        if (cumPoints.length > 1) {
          const minV = Math.min(...cumPoints, 0);
          const maxV = Math.max(...cumPoints, 0);
          const range = maxV - minV || 1;
          const W = 300, H = 52;
          const pts = cumPoints.map((v, i) => [
            (i / (cumPoints.length - 1)) * W,
            H - ((v - minV) / range) * (H - 4) - 2,
          ]);
          sparkPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          sparkArea = `${sparkPath} L${W},${H} L0,${H} Z`;
        }

        // Profit factor ring
        const pfCirc = 2 * Math.PI * 24;
        const pfFill = Math.min(profitFactor === Infinity ? 1 : profitFactor / 3, 1);
        const pfGreen = pfFill * pfCirc;

        // Win rate semicircle
        const arcLen = Math.PI * 38; // half-circle circumference r=38
        const winArc = (wins.length / (filteredTrades.length || 1)) * arcLen;
        const beArc = (breakEvens.length / (filteredTrades.length || 1)) * arcLen;
        const lossArc = (losses.length / (filteredTrades.length || 1)) * arcLen;

        const cardStyle: React.CSSProperties = {
          background: 'var(--bg-primary, #fff)',
          border: '0.5px solid var(--border-tertiary, #e8e8f0)',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 110,
        };
        const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary, #6b7280)', fontWeight: 400, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 };
        const infoIcon = <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border-secondary, #d1d5db)', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #9ca3af)', flexShrink: 0 }}>i</span>;
        const contentPad: React.CSSProperties = { padding: '18px 20px 0 20px' };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>

            {/* Card 1: Net Cumulative P&L */}
            <div style={cardStyle} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-[var(--tg-border)]">
              <div style={contentPad}>
                <div style={labelStyle} className="text-slate-500 dark:text-slate-400">
                  Net Cumulative P&L
                  <span style={{ background: 'var(--bg-tertiary, #f3f4f6)', color: 'var(--text-secondary, #6b7280)', padding: '1px 6px', borderRadius: 20, fontSize: 10 }} className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {filteredTrades.length}
                  </span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: totalPnl >= 0 ? 'var(--tg-positive, #0F6E56)' : 'var(--tg-negative, #A32D2D)', paddingBottom: 10 }}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                </div>
              </div>
              <div style={{ marginTop: 'auto', height: 52, flexShrink: 0 }}>
                {cumPoints.length > 1 ? (
                  <svg width="100%" height="52" viewBox="0 0 300 52" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={sparkGradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={sparkColor} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={sparkArea} fill={`url(#${sparkGradId})`} />
                    <path d={sparkPath} fill="none" stroke={sparkColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--tg-muted, #9ca3af)' }}>--</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Profit Factor */}
            <div style={cardStyle} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-[var(--tg-border)]">
              <div style={{ ...contentPad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingBottom: 18 }}>
                <div>
                  <div style={labelStyle} className="text-slate-500 dark:text-slate-400">Profit Factor {infoIcon}</div>
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-primary, #111827)' }} className="text-slate-900 dark:text-white">
                    {profitFactor === Infinity ? '∞' : profitFactor === 0 ? '--' : profitFactor.toFixed(2)}
                  </div>
                </div>
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0, marginRight: 4 }}>
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#E24B4A" strokeWidth="6" />
                  {pfFill > 0 && (
                    <circle cx="32" cy="32" r="24" fill="none" stroke="#1D9E75" strokeWidth="6"
                      strokeDasharray={`${pfGreen} ${pfCirc - pfGreen}`}
                      strokeDashoffset={pfCirc / 4}
                      strokeLinecap="butt"
                      transform="rotate(-90 32 32)"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Card 3: Trade Win % */}
            <div style={cardStyle} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-[var(--tg-border)]">
              <div style={{ ...contentPad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingBottom: 18 }}>
                <div>
                  <div style={labelStyle} className="text-slate-500 dark:text-slate-400">Trade Win % {infoIcon}</div>
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-primary, #111827)' }} className="text-slate-900 dark:text-white">
                    {filteredTrades.length === 0 ? '--' : `${(winRate * 100).toFixed(2)}%`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <svg width="88" height="52" viewBox="0 0 88 52">
                    {/* Track */}
                    <path d="M6,48 A38,38 0 0,1 82,48" fill="none" stroke="var(--tg-track, #e5e7eb)" strokeWidth="7" strokeLinecap="round" />
                    {/* Win segment */}
                    {wins.length > 0 && (
                      <path d="M6,48 A38,38 0 0,1 82,48" fill="none" stroke="#1D9E75" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${winArc} ${arcLen}`} strokeDashoffset="0" />
                    )}
                    {/* BE segment */}
                    {breakEvens.length > 0 && (
                      <path d="M6,48 A38,38 0 0,1 82,48" fill="none" stroke="#7F77DD" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${beArc} ${arcLen}`} strokeDashoffset={-winArc} />
                    )}
                    {/* Loss segment */}
                    {losses.length > 0 && (
                      <path d="M6,48 A38,38 0 0,1 82,48" fill="none" stroke="#E24B4A" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${lossArc} ${arcLen}`} strokeDashoffset={-(winArc + beArc)} />
                    )}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: 88, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--tg-positive, #1D9E75)', fontWeight: 600 }}>{wins.length}</span>
                    <span style={{ fontSize: 11, color: 'var(--tg-accent, #7F77DD)', fontWeight: 600 }}>{breakEvens.length}</span>
                    <span style={{ fontSize: 11, color: 'var(--tg-negative, #E24B4A)', fontWeight: 600 }}>{losses.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Avg Win/Loss */}
            <div style={cardStyle} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-[var(--tg-border)]">
              <div style={contentPad}>
                <div style={labelStyle} className="text-slate-500 dark:text-slate-400">Avg Win/Loss Trade {infoIcon}</div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-primary, #111827)', paddingBottom: 12 }} className="text-slate-900 dark:text-white">
                  {rrRatio === 0 ? '--' : rrRatio.toFixed(2)}
                </div>
              </div>
              <div style={{ marginTop: 'auto', padding: '0 20px 18px 20px' }}>
                {(avgWin > 0 || avgLoss > 0) ? (
                  <>
                    <div style={{ width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ background: '#1D9E75', width: `${avgWin / (avgWin + avgLoss) * 100}%` }} />
                      <div style={{ background: '#E24B4A', flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--tg-positive, #1D9E75)' }}>${avgWin.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: 'var(--tg-negative, #E24B4A)' }}>-${avgLoss.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--tg-surface-muted, #e5e7eb)' }} />
                )}
              </div>
            </div>

          </div>
        );
      })()}
      {/* ── End Journal Stat Cards ─────────────────────────────────────── */}

      <div id="journal-toolbar" className="flex flex-col gap-4">
          <div className="tg-module flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-[var(--tg-border)] shadow-sm transition-colors">
            <div className="relative flex-1 min-w-[300px] max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 dark:text-slate-400" />
                <input type="text" placeholder={t.journal.searchPlaceholder} className="w-full bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-200 pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-colors text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
            
            <button onClick={() => setShowDuration(!showDuration)} className={`p-2.5 flex items-center gap-2 rounded-xl transition-colors ${showDuration ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} title={t.journal.showDuration}><Clock className="w-5 h-5" /><span className="text-sm font-medium hidden lg:inline">{t.journal.showDuration}</span></button>

            <button onClick={() => setShowFilterPanel(!showFilterPanel)} className={`p-2.5 flex items-center gap-2 rounded-xl transition-colors ${showFilterPanel || filterRules.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><ListFilter className="w-5 h-5" /><span className="text-sm font-medium hidden lg:inline">{language === 'cn' ? '过滤' : 'Filters'}</span>{filterRules.length > 0 && <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">{filterRules.length}</span>}</button>
            
            <div className="flex-1"></div>

            <div className="flex flex-wrap gap-3">
                <div className="relative z-40" ref={datePickerRef}>
                    <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(current => !current)}
                        className="flex min-h-[58px] min-w-[220px] items-center justify-between gap-3 rounded-lg border border-[#d9e1ec] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all hover:border-[#c5cfdd] hover:bg-slate-50 dark:border-[var(--tg-border)] dark:bg-slate-900 dark:hover:bg-slate-800/70 dark:hover:border-[var(--tg-border)]"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <ReportRangeIcon />
                            <div className="min-w-0 flex-1 text-left">
                                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">
                                    {(datePresets.find(p => p.id === activeDatePreset)?.label || activeDatePreset).toUpperCase()}
                                </p>
                                <p className="truncate text-[14px] font-semibold leading-none text-slate-800 dark:text-white">
                                    {activeDatePreset === 'All Time' ? (language === 'cn' ? '所有时间' : 'All Time') : (
                                        <>{dateRange.start.toLocaleDateString()} <span className="mx-1 text-slate-400 dark:text-slate-400">→</span> {dateRange.end.toLocaleDateString()}</>
                                    )}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform  dark:text-slate-400 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`absolute right-0 top-full mt-2 flex w-[640px] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-[var(--tg-border)] dark:bg-slate-900 ${
                        isDatePickerOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'
                    }`}>
                        <div className="flex-1 border-r border-slate-100 bg-white p-6 dark:border-[var(--tg-border)] dark:bg-slate-900">
                            <div className="mb-4 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="flex gap-8">
                                    {renderMiniCalendar(viewDate)}
                                    {renderMiniCalendar(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex w-48 flex-col gap-1 bg-slate-50 p-2 dark:bg-slate-950">
                            {datePresets.map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handlePresetSelect(preset.id)}
                                    className={`rounded-lg px-4 py-2.5 text-left text-xs font-bold transition-colors ${
                                        activeDatePreset === preset.id
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-40" ref={accountSwitcherRef}>
                    <button
                        type="button"
                        onClick={() => setIsAccountSwitcherOpen(current => !current)}
                        className="flex min-h-[58px] min-w-[200px] items-center justify-between gap-3 rounded-lg border border-[#d9e1ec] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all hover:border-[#c5cfdd] hover:bg-slate-50 dark:border-[var(--tg-border)] dark:bg-slate-900 dark:hover:bg-slate-800/70 dark:hover:border-[var(--tg-border)]"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <ReportAccountIcon />
                            <div className="min-w-0 flex-1 text-left">
                                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">Trading Account</p>
                                <p className="max-w-[130px] truncate text-[14px] font-semibold leading-none text-slate-800 dark:text-white">{currentAccountName}</p>
                            </div>
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform  dark:text-slate-400 ${isAccountSwitcherOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`absolute right-0 top-full mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-[var(--tg-border)] dark:bg-slate-900 ${
                        isAccountSwitcherOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'
                    }`}>
                        <div className="space-y-1 p-2">
                            <button
                                type="button"
                                onClick={() => { setSelectedAccountId('all'); setIsAccountSwitcherOpen(false); }}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${selectedAccountId === 'all' ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                            >
                                {language === 'cn' ? '所有账户' : 'All Accounts'}
                                {selectedAccountId === 'all' && <Check className="h-4 w-4" />}
                            </button>
                            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                            {accounts.map(acc => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => { setSelectedAccountId(acc.id); setIsAccountSwitcherOpen(false); }}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${selectedAccountId === acc.id ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${acc.isReal ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="truncate">{acc.name}</span>
                                    </span>
                                    {selectedAccountId === acc.id && <Check className="h-4 w-4 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {(filterRules.length > 0 || searchTerm) && <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-rose-500 underline decoration-dashed whitespace-nowrap dark:text-slate-400">{language === 'cn' ? '清除' : 'Clear'}</button>}
          </div>

          {showFilterPanel && (
              <div className="tg-module bg-white dark:bg-slate-900 border border-slate-200 dark:border-[var(--tg-border)] rounded-2xl p-6 shadow-xl animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                       <div className="flex items-center gap-3"><span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{language === 'cn' ? '且' : 'AND'}</span><div className="h-px w-12 bg-slate-200 dark:bg-slate-700"></div><span className="text-slate-400 text-sm italic dark:text-slate-400">{language === 'cn' ? '所有条件都必须满足' : 'All conditions must be met'}</span></div>
                       <button onClick={addFilterRule} className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> {language === 'cn' ? '添加条件' : 'Add Rule'}</button>
                  </div>
                  <div className="space-y-3">
                      {filterRules.map((rule) => (
                          <div key={rule.id} className="flex flex-col md:flex-row gap-3 items-center group">
                              <div className="w-full md:w-32"><select className="w-full text-sm rounded-lg px-3 py-2.5 outline-none border transition-colors cursor-pointer font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-[var(--tg-border)] text-slate-800 dark:text-slate-200" value={rule.field} onChange={(e) => updateFilterRule(rule.id, { field: e.target.value as FilterField, value: '' })}>{Object.entries(language === 'cn' ? FIELD_LABELS_CN : FIELD_LABELS_EN).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
                              <div className="w-full md:w-36"><select className="w-full text-sm rounded-lg px-3 py-2.5 outline-none border transition-colors cursor-pointer font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-[var(--tg-border)] text-slate-800 dark:text-slate-200" value={rule.operator} onChange={(e) => updateFilterRule(rule.id, { operator: e.target.value as FilterOperator })}><option value="is">{language === 'cn' ? '等于' : 'Is'}</option><option value="isNot">{language === 'cn' ? '不等于' : 'Is Not'}</option><option value="contains">{language === 'cn' ? '包含' : 'Contains'}</option><option value="gt">{language === 'cn' ? '大于' : 'Greater than'}</option><option value="lt">{language === 'cn' ? '小于' : 'Less than'}</option></select></div>
                              <div className="flex-1 w-full"><select className="w-full text-sm rounded-lg px-3 py-2.5 outline-none border transition-colors cursor-pointer font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-[var(--tg-border)] text-slate-800 dark:text-slate-200" value={rule.value} onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}><option value="">{language === 'cn' ? '选择值...' : 'Select Value...'}</option>{getOptionsForField(rule.field).map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></div>
                              <button onClick={() => removeFilterRule(rule.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors dark:text-slate-400"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      ))}
                      {filterRules.length === 0 && <p className="text-slate-400 dark:text-slate-400 text-sm text-center py-2">{language === 'cn' ? '点击"添加条件"开始过滤' : 'Click "Add Rule" to start filtering'}</p>}
                  </div>
              </div>
          )}
      </div>

      {viewMode === 'list' ? (
          <div id="journal-list" className="tg-module bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-[var(--tg-border)] overflow-hidden shadow-sm transition-colors animate-fade-in relative">
            {isSelecting && (
              <div className="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl mx-3 mt-3 px-4 py-3 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3">
                  <div
                    onClick={handleSelectAll}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                      selectedIds.size === filteredTrades.length && filteredTrades.length > 0
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-indigo-300 dark:border-indigo-500 hover:border-indigo-500'
                    }`}
                  >
                    {selectedIds.size === filteredTrades.length && filteredTrades.length > 0 && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {language === 'cn' ? `已选 ${selectedIds.size} 条` : `${selectedIds.size} selected`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {language === 'cn' ? '批量删除' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-all dark:text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 uppercase font-semibold text-xs tracking-wider border-b border-slate-100 dark:border-[var(--tg-border)]">
                  <tr>
                    <th className="w-10 pl-4 pr-1 py-5">
                      {isSelecting && (
                        <div
                          onClick={handleSelectAll}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            selectedIds.size === filteredTrades.length && filteredTrades.length > 0
                              ? 'bg-indigo-500 border-indigo-500'
                              : 'border-slate-300 dark:border-[var(--tg-border)] hover:border-indigo-400'
                          }`}
                        >
                          {selectedIds.size === filteredTrades.length && filteredTrades.length > 0 && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                      )}
                    </th>
                    <th className="px-4 py-5">{t.journal.date}</th>
                    <th className="px-6 py-5">{t.journal.symbol}</th>
                    <th className="px-6 py-5">{t.journal.direction}</th>
                    <th className="px-6 py-5">{t.journal.setup}</th>
                    <th className="px-6 py-5 text-right whitespace-nowrap">{language === 'cn' ? '开仓价格' : 'Entry Price'}</th>
                    <th className="px-6 py-5 text-right whitespace-nowrap">{language === 'cn' ? '平仓价格' : 'Exit Price'}</th>
                    <th className="px-6 py-5 text-center whitespace-nowrap">{language === 'cn' ? '执行评分等级' : 'Execution Grade'}</th>
                    {showDuration && <th className="px-6 py-5 w-48">{t.journal.duration}</th>}
                    <th className="px-6 py-5 text-center">{t.journal.screenshot}</th>
                    <th className="px-6 py-5 text-right w-40">{t.journal.pnl}</th>
                    <th className="px-6 py-5 text-center">{t.journal.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTrades.map((trade) => {
                    const hasReview = !!trade.reviewNotes;
                    const isTradeOpen = !trade.exitDate || trade.status === TradeStatus.OPEN;
                    return (
                    <tr key={trade.id} ref={(el) => { if (el) rowRefs.current.set(trade.id, el); else rowRefs.current.delete(trade.id); }} onClick={() => handleRowClick(trade)} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all group cursor-pointer ${selectedIds.has(trade.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''} ${highlightedTradeId === trade.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 animate-pulse' : ''}`}>
                      <td className="w-10 pl-4 pr-1 py-4" onClick={(e) => e.stopPropagation()}>
                        <div
                          onClick={() => handleToggleSelect(trade.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            selectedIds.has(trade.id)
                              ? 'bg-indigo-500 border-indigo-500 opacity-100'
                              : 'border-slate-300 dark:border-[var(--tg-border)] hover:border-indigo-400'
                          } ${isSelecting || selectedIds.has(trade.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          {selectedIds.has(trade.id) && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-medium">{new Date(trade.entryDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4"><div className="flex flex-col"><div className="flex items-center gap-2"><span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs w-fit">{trade.symbol}</span>{hasReview ? <div className="text-[10px] text-emerald-500 flex items-center gap-0.5" title={t.journal.reviewed}><BookCheck className="w-3 h-3" /></div> : <div className="text-[10px] text-amber-500 flex items-center gap-0.5" title={t.journal.pendingReview}><Hourglass className="w-3 h-3" /></div>}</div></div></td>
                      <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-sm text-xs font-medium whitespace-nowrap ${trade.direction === Direction.LONG ? 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400'}`}>{trade.direction === Direction.LONG ? t.journal.long : t.journal.short}</span></td>
                      <td className="px-6 py-4"><div className="text-slate-700 dark:text-slate-300">{trade.setup}</div></td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {trade.exitPrice > 0 ? trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 }) : '--'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border transition-all ${getGradeColor(trade.executionGrade)}`}>
                            {trade.executionGrade || '-'}
                        </span>
                      </td>
                      {showDuration && <td className="px-6 py-4">{(() => { const durationMs = getDurationInMs(trade.entryDate, trade.exitDate); const isTradeOpen = !trade.exitDate || trade.status === TradeStatus.OPEN; const percentage = Math.max(2, Math.min(100, (durationMs / maxDuration) * 100)); return (<div className="flex flex-col justify-center h-full w-full"><span className={`text-[10px] font-mono mb-1 ${isTradeOpen ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{formatDuration(trade.entryDate, trade.exitDate)}</span><div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1"><div className={`h-full rounded-full transition-all duration-500 ${isTradeOpen ? 'bg-amber-50 animate-pulse dark:bg-amber-950/40' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div></div></div>); })()}</td>}
                      <td className="px-6 py-4 text-center">{trade.images && trade.images.length > 0 ? <ImageIcon className="w-5 h-5 mx-auto text-slate-400 dark:text-slate-400" /> : <span className="text-slate-300 dark:text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 text-right relative"><div className="flex items-center justify-end gap-2"><div className="flex justify-end" onClick={e => e.stopPropagation()}><div className={`relative flex items-center px-3 py-1.5 rounded-lg border transition-all duration-200 group/pnl ${trade.pnl > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20' : trade.pnl < 0 ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-[var(--tg-border)]'} hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm hover:scale-105`}><span className={`text-[10px] mr-1 select-none font-medium ${trade.pnl >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>$</span><input type="text" defaultValue={isTradeOpen && trade.pnl === 0 ? '' : trade.pnl.toFixed(2)} placeholder="--" className={`w-20 text-right bg-transparent border-none outline-none font-mono font-bold text-sm transition-colors p-0 focus:ring-0 cursor-text ${trade.pnl > 0 ? 'text-emerald-600 dark:text-emerald-400 placeholder:text-emerald-300' : trade.pnl < 0 ? 'text-rose-600 dark:text-rose-400 placeholder:text-rose-300' : 'text-slate-600 dark:text-slate-400 placeholder:text-slate-400'}`} onBlur={(e) => handleInlinePnlChange(e, trade)} onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }} onClick={(e) => (e.target as HTMLInputElement).select()} /><div className="absolute -right-2 -top-2 opacity-0 group-hover/pnl:opacity-100 transition-all duration-200 pointer-events-none scale-75 group-hover/pnl:scale-100"><div className="bg-indigo-500 text-white p-1 rounded-full shadow-sm"><Edit2 className="w-2 h-2" /></div></div></div></div></div></td>
                      <td className="px-6 py-4 text-center"><div className="flex justify-center gap-1 items-center"><button onClick={(e) => { e.stopPropagation(); setReviewTrade(trade); }} className={`p-2 rounded-lg flex items-center gap-1 transition-all ${hasReview ? 'text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={hasReview ? (language === 'cn' ? "已复盘 - 点击查看" : "Reviewed - View") : (language === 'cn' ? "未复盘 - 点击添加" : "Not Reviewed - Add")}>{hasReview ? <BookCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</button>{isTradeOpen && <button onClick={(e) => handleQuickClose(e, trade)} className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg flex items-center gap-1 dark:text-slate-400" title="Close Position (Set Exit Time)"><Power className="w-4 h-4" /></button>}<button onClick={(e) => { e.stopPropagation(); onShare(trade); }} className="text-slate-300 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title={language === 'cn' ? '导出分享图片' : 'Export share image'}><Share2 className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); onDeleteTrade(trade.id); }} className="text-slate-300 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
      ) : viewMode === 'gallery' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredTrades.map((trade) => {
                  const hasImage = trade.images && trade.images.length > 0;
                  const isWin = trade.pnl >= 0;
                  return (<div key={trade.id} onClick={() => handleRowClick(trade)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-[var(--tg-border)] overflow-hidden cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-lg group flex flex-col h-[320px]"><div className="p-3 border-b border-slate-100 dark:border-[var(--tg-border)] flex justify-between items-center bg-white dark:bg-slate-900 z-10"><div className="flex items-center gap-2"><span className="font-bold text-slate-900 dark:text-white text-sm">{trade.symbol}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${trade.direction === Direction.LONG ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>{trade.direction}</span></div><span className="text-xs text-slate-400 dark:text-slate-400">{trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : '--'}</span></div><div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden group-hover:opacity-90 transition-opacity">{hasImage ? <img src={trade.images![0]} alt="Trade Chart" className="w-full h-full object-cover" onError={(e) => console.log('Image load error:', e)} /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-400"><div className="w-full h-1/2 flex items-end justify-center gap-1 opacity-20"><div className="w-4 h-12 bg-current rounded-t"></div><div className="w-4 h-20 bg-current rounded-t"></div><div className="w-4 h-16 bg-current rounded-t"></div><div className="w-4 h-24 bg-current rounded-t"></div><div className="w-4 h-10 bg-current rounded-t"></div></div><p className="text-xs font-medium mt-2">No Chart</p></div>}<div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow-sm ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`}>{isWin ? 'WIN' : 'LOSS'}</div></div><div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-[var(--tg-border)]"><div className="flex justify-between items-end mb-2"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 dark:text-slate-400">Net P&L</p><p className={`text-2xl font-black font-mono leading-none ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>{isWin ? '+' : ''}${trade.pnl.toFixed(2)}</p></div><div className="text-right">{trade.setup && <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded mb-1 max-w-[100px] truncate">{trade.setup}</span>}</div></div><div className="flex items-center gap-2 mt-3">{trade.reviewNotes ? <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded"><BookCheck className="w-3 h-3" /> Reviewed</span> : <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium border border-slate-200 dark:border-[var(--tg-border)] px-2 py-1 rounded dark:text-slate-400">No Review</span>}{trade.mistakes && trade.mistakes.length > 0 && <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded truncate max-w-[120px]"><AlertTriangle className="w-3 h-3" /> {trade.mistakes[0]}</span>}</div></div></div>);
              })}
          </div>
      ) : (
          /* DAILY JOURNAL VIEW MODE */
          <div className="space-y-4 animate-fade-in pb-10">
              {groupedDailyTrades.map((day, idx) => {
                  const isExpanded = expandedDays.has(day.date);
                  const formattedCardDate = language === 'cn'
                      ? new Date(day.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
                      : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });

                  // Logic for Add/View Note Button (Smart Navigation)
                  const existingNote = plans.find(p => p.date === day.dateKey && p.folder === 'daily-journal' && !p.isDeleted);

                  return (
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-[var(--tg-border)] shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg">
                      {/* Card Header */}
                      <div 
                        className="px-6 py-5 border-b border-slate-100 dark:border-[var(--tg-border)] flex justify-between items-center cursor-pointer select-none group"
                        onClick={() => toggleDayExpanded(day.date)}
                      >
                          <div className="flex items-center gap-4">
                              <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 dark:text-slate-400" />
                              </div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                  {formattedCardDate}
                              </h3>
                              <div className="flex items-baseline gap-2 ml-4">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest dark:text-slate-400">{t.journal.daily.netPnl}</span>
                                  <span className={`text-2xl font-black font-mono tracking-tighter ${day.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      ${day.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                              </div>
                          </div>

                          {/* SMART BUTTON: Add vs View */}
                          <button 
                            onClick={(e) => handleDailyNoteAction(e, day)}
                            className={`px-5 py-2 transition-all rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transform active:scale-95 ${
                                existingNote 
                                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-transparent' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 shadow-indigo-500/20'
                            }`}
                          >
                            {existingNote ? (
                                <>
                                    <FileText className="w-3.5 h-3.5" />
                                    {language === 'cn' ? '查看笔记' : 'View Note'}
                                </>
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5" />
                                    {language === 'cn' ? '添加笔记' : 'Add Note'}
                                </>
                            )}
                          </button>
                      </div>

                      {/* Card Body - Top Visuals */}
                      <div className="flex flex-col md:flex-row h-48 border-b border-slate-100 dark:border-[var(--tg-border)]">
                          {/* Body - Left: Area Chart */}
                          <div className="md:w-1/3 h-full border-r border-slate-100 dark:border-[var(--tg-border)] relative bg-slate-50/30 dark:bg-slate-900/20">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={day.equityCurve} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                                      <defs>
                                          <linearGradient id={`colorPnl-${idx}`} x1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor={day.netPnl >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.2}/>
                                              <stop offset="95%" stopColor={day.netPnl >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                                          </linearGradient>
                                      </defs>
                                      <Area 
                                        type="monotone" 
                                        dataKey="pnl" 
                                        stroke={day.netPnl >= 0 ? "#10b981" : "#f43f5e"} 
                                        fillOpacity={1} 
                                        fill={`url(#colorPnl-${idx})`} 
                                        strokeWidth={2}
                                      />
                                      <XAxis dataKey="name" hide />
                                      <YAxis hide domain={['auto', 'auto']} />
                                      <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '0.5rem', fontSize: '10px' }}
                                        formatter={(val: number) => [`$${val.toFixed(2)}`, 'PnL']}
                                      />
                                  </AreaChart>
                              </ResponsiveContainer>
                              {/* Overlay Label for Chart */}
                              <div className="absolute top-3 left-4 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-50 dark:text-slate-400">{t.journal.daily.intradayCurve}</div>
                          </div>

                          {/* Body - Right: Stats Grid */}
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 p-5 gap-y-4">
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.totalTrades}</span>
                                  <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">{day.tradesCount}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.winners}</span>
                                  <span className="text-lg font-bold text-emerald-500 font-mono">{day.winners}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.winRate}</span>
                                  <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">{day.winRate.toFixed(1)}%</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.losers}</span>
                                  <span className="text-lg font-bold text-rose-500 font-mono">{day.losers}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.grossPnl}</span>
                                  <span className={`text-lg font-bold font-mono ${day.grossPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${day.grossPnl.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.commissions}</span>
                                  <span className="text-lg font-bold text-rose-400 font-mono">${day.commissions.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.volume}</span>
                                  <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">${(day.volume / 1000).toFixed(1)}K</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 dark:text-slate-400">{t.journal.daily.profitFactor}</span>
                                  <span className="text-lg font-bold text-indigo-400 font-mono">{day.profitFactor.toFixed(2)}</span>
                              </div>
                          </div>
                      </div>

                      {/* --- Expanded Table Section --- */}
                      {isExpanded && (
                          <div className="bg-slate-50 dark:bg-[#020617] border-t border-slate-100 dark:border-[var(--tg-border)] animate-fade-in-up transition-colors">
                              <div className="p-0 overflow-x-auto">
                                  <table className="w-full text-left text-sm">
                                      <thead className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-[var(--tg-border)] dark:text-slate-400">
                                          <tr>
                                              <th className="px-6 py-4">Open Time</th>
                                              <th className="px-6 py-4">Ticker</th>
                                              <th className="px-6 py-4">Side</th>
                                              <th className="px-6 py-4 text-right">Entry Price</th>
                                              <th className="px-6 py-4 text-right">Exit Price</th>
                                              <th className="px-6 py-4 text-center">Grade</th>
                                              <th className="px-6 py-4 text-right">Volume</th>
                                              <th className="px-6 py-4 text-right">Net P&L</th>
                                              <th className="px-6 py-4 text-right">Duration</th>
                                              <th className="px-6 py-4 text-right">Setup</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                          {day.trades.sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).map(trade => {
                                              const netPnl = trade.pnl;
                                              return (
                                                  <tr key={trade.id} onClick={(e) => { e.stopPropagation(); handleRowClick(trade); }} className="hover:bg-slate-200/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                                                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                                                          {trade.entryDate ? new Date(trade.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'}
                                                      </td>
                                                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                          {trade.symbol}
                                                      </td>
                                                      <td className="px-6 py-4">
                                                          <span className={`font-black text-[10px] ${trade.direction === Direction.LONG ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                              {trade.direction === Direction.LONG ? 'LONG' : 'SHORT'}
                                                          </span>
                                                      </td>
                                                      <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                                                          {trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}
                                                      </td>
                                                      <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                                                          {trade.exitPrice > 0 ? trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 }) : '--'}
                                                      </td>
                                                      <td className="px-6 py-4 text-center">
                                                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black border ${getGradeColor(trade.executionGrade)}`}>
                                                              {trade.executionGrade || '-'}
                                                          </span>
                                                      </td>
                                                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                                          {trade.quantity}
                                                      </td>
                                                      <td className={`px-6 py-4 text-right font-mono font-bold ${netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                          {netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}
                                                      </td>
                                                      <td className="px-6 py-4 text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                          {formatDuration(trade.entryDate, trade.exitDate)}
                                                      </td>
                                                      <td className="px-6 py-4 text-right">
                                                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black rounded uppercase">
                                                              {trade.setup}
                                                          </span>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                              <div className="p-4 border-t border-slate-200 dark:border-[var(--tg-border)] flex justify-center bg-white dark:bg-transparent">
                                  <button 
                                    onClick={() => toggleDayExpanded(day.date)}
                                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:slate-300 uppercase tracking-widest flex items-center gap-1 transition-colors dark:text-slate-400 dark:hover:text-indigo-300"
                                  >
                                      {t.journal.daily.closeDetails} <ChevronDown className="w-3 h-3 rotate-180" />
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
                  );
              })}
          </div>
      )}

      {showCsvPreview && <div className="fixed inset-0 z-[10000] overflow-y-auto bg-white dark:bg-slate-950">
        <CsvImportPage exchangeName="自定义" accountSelector={<div className="mx-4 mt-4 w-[min(90vw,600px)] rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--tg-border)] dark:bg-slate-900">
          <label htmlFor="csv-account" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'cn' ? '导入到交易账户' : 'Import to account'}</label>
          <select id="csv-account" value={csvAccountId} onChange={e => setCsvAccountId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-[var(--tg-border)] dark:bg-slate-800 dark:text-white">
            <option value="">{language === 'cn' ? '请选择归属账户' : 'Choose an account'}</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}{account.type === 'demo' ? ' (Demo)' : ''}</option>)}
          </select>
          {!csvAccountId && <p role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-300">{language === 'cn' ? '确认导入前请选择账户；自己的交易请选择个人账户，演示练习请选择 Demo。' : 'Choose your personal account, or Demo for practice, before importing.'}</p>}
        </div>} onClose={() => setShowCsvPreview(false)} onBack={() => setShowCsvPreview(false)} onImportComplete={async imported => {
          if (!accounts.some(account => account.id === csvAccountId)) throw new Error(language === 'cn' ? '请先在上方选择导入归属账户。' : 'Select an account above before importing.');
          await onImportTrades?.(imported.map(trade => ({ ...trade, accountId: csvAccountId })));
        }} />
      </div>}
      {/* Modal section (Checklist and Log Trade Form) */}
      {isModalOpen && createPortal(
        <div ref={tradeDialogRef} role="dialog" aria-modal="true" aria-label={t.journal.modalTitle} tabIndex={-1}
          onKeyDown={event => {
            if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="dialog"]') !== event.currentTarget) return;
            if (event.key === 'Escape' && !savingTrade) { event.preventDefault(); handleCloseModal(); }
            if (event.key !== 'Tab') return;
            const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')).filter(element => element.getClientRects().length > 0);
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }} className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className={`tg-module bg-white dark:bg-slate-900 rounded-2xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-[var(--tg-border)] flex flex-col transition-all duration-300 ${modalStep === 'checklist' && !editingTradeId ? 'max-w-md max-h-[90vh]' : showReviewPanel ? 'max-w-6xl h-[calc(100dvh-32px)] max-h-[980px]' : 'max-w-4xl h-[calc(100dvh-32px)] max-h-[980px]'}`}>
                {modalStep === 'checklist' && !editingTradeId ? (
                    <div id="tour-checklist-modal" className="p-8 max-w-lg mx-auto w-full">
                        <div className="mb-6">
                            <div className="flex items-center justify-between gap-4 mb-1">
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.journal.preTrade.title}</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                                        {language === 'cn' ? '启用检查清单' : 'Enable Checklist'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleInlineChecklistToggle}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isChecklistEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        title={language === 'cn' ? (isChecklistEnabled ? '关闭' : '启用') : (isChecklistEnabled ? 'Turn Off' : 'Turn On')}
                                        aria-pressed={isChecklistEnabled}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform  dark:bg-slate-900 ${isChecklistEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors ml-1 dark:text-slate-400"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t.journal.preTrade.subtitle}</p>
                        </div>
                        <div className="space-y-3 mb-8">{sessionChecklist.map(item => (<div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${item.isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-[var(--tg-border)] hover:border-slate-300 dark:hover:border-slate-600'}`}><div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggleChecklist(item.id)}><div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${item.isCompleted ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400'}`}><Check className="w-4 h-4" strokeWidth={3} /></div><span className={`font-medium text-sm ${item.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{item.text}</span></div><button onClick={(e) => { e.stopPropagation(); handleDeleteChecklistItem(item.id); }} className="text-slate-300 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div>))}{sessionChecklist.length === 0 && (<div className="rounded-xl border border-dashed border-slate-200 dark:border-[var(--tg-border)] p-4 text-xs text-slate-400 dark:text-slate-400 space-y-1.5"><p className="font-semibold text-slate-500 dark:text-slate-400 mb-2">{language === 'cn' ? '示例检查条件（点击下方添加）：' : 'Example conditions (add yours below):'}</p>{(language === 'cn' ? ['心态平稳，无情绪化冲动', '处于有效交易时段', '符合当前市场环境', '满足个人交易系统入场条件'] : ['Mindset is calm, no emotional impulse', 'Currently in a valid trading session', 'Market environment matches my system', 'Entry criteria fully met']).map(ex => (<p key={ex} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border border-slate-300 dark:border-[var(--tg-border)] flex-shrink-0 inline-block" />{ex}</p>))}</div>)}<div className="relative mt-4"><input type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder={t.journal.preTrade.addItem} className="w-full bg-transparent border-b border-slate-200 dark:border-[var(--tg-border)] py-3 text-sm outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600 font-medium pr-8 text-slate-700 dark:text-slate-200" onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()} /><button onClick={handleAddChecklistItem} className="absolute right-0 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"><Plus className="w-5 h-5" /></button></div></div>
                        <div className="mb-4"><h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">CURRENT MOOD</h4><div className="flex justify-between gap-3">{MOODS.map(m => { const isSelected = preTradeMood === m.id; return (<button key={m.id} onClick={() => setPreTradeMood(m.id)} className={`flex flex-col items-center justify-center w-full aspect-square rounded-2xl transition-all border-2 ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-white shadow-sm' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400'}`}><m.icon className={`w-6 h-6 mb-2 ${isSelected ? m.color : 'text-slate-400 dark:text-slate-400'}`} /><span className={`text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>{m.label}</span></button>) })}</div></div>
                        <div className="mt-6 h-12 flex items-center justify-center">{preTradeMood ? (<div className={`w-full px-4 py-3 rounded-xl border flex items-center gap-3 animate-fade-in ${isRiskyMood ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'}`}><div className={`p-1 rounded-full border shadow-sm ${isRiskyMood ? 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900/50' : 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/50'}`}>{isRiskyMood ? <ShieldCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}</div><span className="font-medium text-sm truncate">{isRiskyMood ? t.journal.preTrade.moodWarning : (language === 'cn' ? "心态良好，祝交易顺利。" : "Mindset optimal. Good luck.")}</span></div>) : (<div className="text-slate-400 text-sm italic flex items-center gap-2 dark:text-slate-400"><Sparkles className="w-4 h-4 opacity-50" />{language === 'cn' ? "请选择当前情绪状态..." : "Please select your current mood..."}</div>)}</div>
                        <div className="flex items-center justify-between pt-6 mt-2 border-t border-slate-100 dark:border-[var(--tg-border)]"><span className="text-slate-400 font-medium text-sm dark:text-slate-400">{t.journal.preTrade.progress}: {Math.round(progressPercent)}%</span><button onClick={handleProceed} className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 transform active:scale-95 ${isRiskyMood ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}>{isRiskyMood ? <>{t.journal.preTrade.proceedRisky} <ChevronRight className="w-4 h-4" /></> : <>{t.journal.preTrade.proceed} <ChevronRight className="w-4 h-4" /></>}</button></div>
                    </div>
                ) : (
                    <div id="tour-form-modal" className="tg-module flex min-h-0 flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 pt-5 pb-0"><div className="flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><div><h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{t.journal.modalTitle}</h3><p className="text-xs text-slate-400 mt-1 dark:text-slate-400">{t.journal.modalSubtitle}</p></div></div><div className="flex items-center gap-4"><button type="button" onClick={() => setShowReviewPanel(!showReviewPanel)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${showReviewPanel ? 'bg-indigo-600 dark:bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-400'}`}><BookCheck className="w-3.5 h-3.5" />{t.journal.reviewTab}</button></div></div>
                        <div className="px-6 pt-3"><RiskReferenceNotice settings={riskSettings} language={language} currencySymbol={currencySymbol} />
                  {tradeRiskExceeded && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">{language === 'cn' ? `本笔风险金额超过 ${currencySymbol}${riskSettings?.maxTradeRisk} 的参考值，仍可正常保存这笔记录。` : `This trade exceeds the ${currencySymbol}${riskSettings?.maxTradeRisk} risk reference. You can still save it.`}</p>}
                </div><form onSubmit={handleSubmit} className="flex-1 min-h-0 flex overflow-hidden"><div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="tg-module rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="trade-account">{language === 'cn' ? '交易归属账户' : 'Trading account'}</label>
                    <select id="trade-account" value={formData.accountId || ''} onChange={event => setFormData((previous: any) => ({ ...previous, accountId: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 dark:border-[var(--tg-border)] dark:bg-slate-800 dark:text-slate-100">
                      <option value="">{isDataLoading ? (language === 'cn' ? '账户加载中…' : 'Loading accounts…') : (language === 'cn' ? '请选择账户' : 'Select an account')}</option>
                      {accounts.map(account => <option key={account.id} value={account.id}>{account.name}{account.type === 'demo' ? (language === 'cn' ? '（演示练习）' : ' (Demo practice)') : ''}</option>)}
                    </select>
                    {accounts.some(account => account.id === formData.accountId && account.type === 'demo') && <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">{language === 'cn' ? '这笔交易将保存在演示账户。记录自己的交易，请创建或选择自己的账户。' : 'This trade will be saved to the demo account. Create or select your own account for personal trades.'}</p>}
                    {!accounts.some(account => account.type !== 'demo') && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{language === 'cn' ? '演示数据用于体验，不计入免费额度。支持任意平台，也可不关联经纪商。' : 'Demo data does not use your free allowance. Any broker or platform is supported.'}</p>}
                    {onCreateAccount && <button type="button" disabled={savingTrade || isDataLoading} onClick={onCreateAccount} className="mt-3 text-sm font-semibold text-indigo-600 disabled:opacity-50 dark:text-indigo-300">{language === 'cn' ? '创建自己的交易账户' : 'Create your trading account'}</button>}
                    {(dataLoadError || isDataLoading) && <p role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-300">{dataLoadError || (language === 'cn' ? '账户数据仍在加载，完成后即可保存。' : 'Loading account data before saving.')}{dataLoadError && <button type="button" onClick={onRetryData} className="ml-2 underline">{language === 'cn' ? '重试' : 'Retry'}</button>}</p>}
                  </div>
                  <div className="flex flex-col md:flex-row gap-6"><div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between dark:text-slate-400">{t.journal.asset}{formErrors.symbol && <span className="text-rose-500 normal-case">{language === 'cn' ? '请填写交易对' : 'Required'}</span>}</label><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 dark:text-slate-400" /><input type="text" list="symbol-options" value={formData.symbol} onChange={e => { setFormData({...formData, symbol: e.target.value.toUpperCase()}); setFormErrors(prev => ({...prev, symbol: false})); }} className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl pl-12 pr-4 h-14 text-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${formErrors.symbol ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-[var(--tg-border)]'}`} placeholder={language === 'cn' ? '例如 BTC' : 'BTC'} /><datalist id="symbol-options">{uniqueSymbols.map(s => <option key={s} value={s}>{JOURNAL_INSTRUMENTS.find(instrument => instrument.symbol === s)?.name || s}</option>)}</datalist></div></div><div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block dark:text-slate-400">{t.journal.directionLabel}</label><div className="tg-module grid grid-cols-2 gap-0 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 h-14"><button type="button" onClick={() => setFormData({...formData, direction: Direction.LONG})} className={`rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${formData.direction === Direction.LONG ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400'}`}><TrendingUp className="w-5 h-5" /> {t.journal.long}</button><button type="button" onClick={() => setFormData({...formData, direction: Direction.SHORT})} className={`rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${formData.direction === Direction.SHORT ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400'}`}><TrendingDown className="w-5 h-5" /> {t.journal.short}</button></div></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="relative"><div className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-indigo-500 uppercase tracking-wider z-10">{t.journal.openTimeLabel}</div>{formErrors.entryDate && <div className="absolute -top-2 right-3 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-rose-500 z-10">{language === 'cn' ? '请填写开仓时间' : 'Required'}</div>}<div ref={entryDateWrapperRef} className={`bg-white dark:bg-slate-900 border rounded-xl p-3 flex items-center ${formErrors.entryDate ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-[var(--tg-border)]'}`}><Calendar className="w-4 h-4 text-indigo-400 mr-3" /><input data-input type="text" value={formData.entryDate} onChange={e => { setFormData({...formData, entryDate: e.target.value}); setFormErrors(prev => ({...prev, entryDate: false})); }} className="w-full bg-transparent border-none text-sm font-medium text-slate-900 dark:text-white outline-none" placeholder="Select Date & Time" /><Clock className="w-4 h-4 text-indigo-400 ml-auto" /></div></div><div className="relative"><div className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10 dark:text-slate-400">{t.journal.closeTimeLabel}</div><div ref={exitDateWrapperRef} className="tg-module bg-white dark:bg-slate-900 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl p-3 flex items-center"><Calendar className="w-4 h-4 text-slate-400 mr-3 dark:text-slate-400" /><input data-input type="text" value={formData.exitDate} onChange={e => setFormData({...formData, exitDate: e.target.value})} className="w-full bg-transparent border-none text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-300" placeholder={language === 'cn' ? '可选' : 'Optional'} /><button type="button" onClick={() => handleSetTimeNow('exitDate')} className="hover:text-indigo-500 ml-auto text-slate-400 dark:text-slate-400"><Clock className="w-4 h-4" /></button></div></div></div><div><div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3 dark:text-slate-400"><Zap className="w-3 h-3" /> {t.journal.executionData}</div><div className="grid grid-cols-3 gap-4"><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 flex items-center justify-between dark:text-slate-400">{t.journal.entryLabel}{formErrors.entryPrice && <span className="text-rose-500">{language === 'cn' ? '请填写开仓价格' : 'Required'}</span>}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs dark:text-slate-400">$</span><input type="number" step="any" placeholder={t.journal.entryPrice} value={formData.entryPrice ?? ''} onChange={e => { setFormData({...formData, entryPrice: e.target.value}); setFormErrors(prev => ({...prev, entryPrice: false})); }} className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white ${formErrors.entryPrice ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-[var(--tg-border)]'}`} /></div></div><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block dark:text-slate-400">{t.journal.exitLabel}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs dark:text-slate-400">$</span><input type="number" step="any" placeholder={t.journal.exitPrice} value={formData.exitPrice ?? ''} onChange={e => setFormData({...formData, exitPrice: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block dark:text-slate-400">{t.journal.sizeLabel}</label><input type="number" step="any" placeholder={language === 'cn' ? '仓位数量' : 'Qty'} value={formData.quantity ?? ''} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div></div><div><div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3 dark:text-slate-400"><ShieldCheck className="w-3 h-3" /> {t.journal.riskManagement}</div><div className="grid grid-cols-3 gap-4"><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block dark:text-slate-400">{t.journal.leverageLabel}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs dark:text-slate-400">#</span><input type="number" placeholder="1" value={formData.leverage ?? ''} onChange={e => setFormData({...formData, leverage: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div><div><label className="text-[10px] text-amber-500 font-bold ml-1 mb-1 block flex items-center gap-1">{language === 'cn' ? '风险金额 ($)' : t.journal.riskAmountLabel} <InfoTooltip text={language === 'cn' ? '本次交易你愿意承受的最大亏损金额（即止损金额），用于计算风险回报比' : 'Stop Loss Amount'} /></label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500"><AlertTriangle className="w-3 h-3" /></span><input type="number" placeholder={language === 'cn' ? '风险金额 ($)' : 'Risk $'} value={formData.riskAmount ?? ''} onChange={e => setFormData({...formData, riskAmount: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 rounded-xl pl-8 pr-10 py-3 text-sm font-medium outline-none focus:border-amber-500 placeholder:text-amber-300 text-slate-900 dark:text-white" /></div></div><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block dark:text-slate-400">{language === 'cn' ? '本笔总手续费' : 'Total trade fees'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs dark:text-slate-400">$</span><input type="number" min="0" step="any" placeholder={language === 'cn' ? '开仓 + 平仓合计' : 'Total opening + closing fees'} readOnly={automaticFee} value={automaticFee ? templateFee! : useFeeTemplate ? '' : formData.fees ?? ''} onChange={e => { setUseFeeTemplate(false); setFormData({...formData, fees: e.target.value}); }} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div></div></div><div className="tg-module rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <TradeCalculationControls language={language} editing={Boolean(editingTradeId)} currency={formAccount?.currency}
                    spec={contract} calculation={calculation} calculationError={calculationError} automatic={useFutures}
                    onAutomatic={enabled => { setUseFutures(enabled); if (enabled) setPnlInputMode('gross'); else if (calculation && !calculationError) setFormData((previous: any) => ({ ...previous, pnl: calculation!.gross })); }}
                    template={feeTemplate} templateFee={templateFee} useTemplate={useFeeTemplate}
                    onUseTemplate={enabled => { if (!enabled && templateFee !== null) setFormData((previous: any) => ({ ...previous, fees: templateFee })); setUseFeeTemplate(enabled); }} />
                  <label htmlFor="pnl-input-mode" className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">{language === 'cn' ? '盈亏录入口径' : 'P&L input basis'}</label>
                  <select id="pnl-input-mode" disabled={useFutures} value={pnlInputMode} onChange={event => setPnlInputMode(event.target.value as PnlInputMode)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 dark:border-[var(--tg-border)] dark:bg-slate-800 dark:text-slate-100">
                    <option value="net">{language === 'cn' ? '已扣费净盈亏（不会再次扣费）' : 'Net P&L — fees already deducted'}</option>
                    <option value="gross">{language === 'cn' ? '未扣费毛盈亏（减去本笔总手续费）' : 'Gross P&L — subtract total trade fees'}</option>
                  </select>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{language === 'cn' ? '手续费填写这笔交易开仓和平仓的合计金额，不是每手或单边费率。切换口径会改变下方金额的解释，请核对计算明细。' : 'Fees are the total opening and closing fees for this trade, not a per-contract or per-side rate. Check the breakdown when changing basis.'}</p>
                  {(!useFutures || !calculationError) && Number.isFinite(Number(formData.pnl || 0)) && Number.isFinite(Number(formData.fees || 0)) && Number(formData.fees || 0) >= 0 && (() => {
                    const breakdown = tradePnlBreakdown(effectivePnl, effectiveFees, pnlInputMode);
                    return <p aria-live="polite" className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">{language === 'cn' ? '毛盈亏' : 'Gross'} ${breakdown.gross.toFixed(2)} − {language === 'cn' ? '手续费' : 'Fees'} ${breakdown.fees.toFixed(2)} = {language === 'cn' ? '净盈亏' : 'Net'} ${breakdown.net.toFixed(2)}</p>;
                  })()}
                  {(!automaticFee && (useFeeTemplate || formData.fees === '' || formData.fees == null)) && <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">{language === 'cn' ? '手续费未填写，当前按 0 试算和统计；可在保存前或编辑时补充。' : 'Fees are unspecified; calculations use 0 until you enter a total fee.'}</p>}
                  {editingTradeId && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{language === 'cn' ? '现有记录默认按已保存的净盈亏展示，不自动重新扣费。' : 'Existing records use their saved net P&L without deducting fees again.'}</p>}
                </div><div className="flex flex-col gap-6 sm:h-40 sm:flex-row"><div className="tg-module min-h-[160px] flex-1 bg-sky-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-sky-100 dark:border-[var(--tg-border)] flex flex-col justify-between relative group"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'cn' ? (pnlInputMode === 'net' ? '已扣费净盈亏' : '未扣费毛盈亏') : (pnlInputMode === 'net' ? 'Net P&L after fees' : 'Gross P&L before fees')}</p><div className="flex items-baseline gap-1 absolute bottom-6 left-6 right-6"><input type="number" step="any" readOnly={useFutures} value={useFutures ? calculation?.gross ?? '' : formData.pnl ?? ''} onChange={e => setFormData({...formData, pnl: e.target.value})} placeholder="0.00" className={`w-full bg-transparent border-none outline-none text-5xl font-black font-mono tracking-tighter placeholder:text-slate-200 dark:placeholder:text-slate-700 pr-14 ${Number(formData.pnl) > 0 ? 'text-emerald-500' : Number(formData.pnl) < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`} /></div><span className="text-slate-400 text-xl font-bold absolute bottom-8 right-6 pointer-events-none dark:text-slate-400">$</span></div><div className="w-full sm:w-5/12 flex flex-col gap-3"><div id="tour-strategy-select" className="relative h-12"><Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none dark:text-slate-400" /><select value={formData.setup} onChange={e => setFormData({...formData, setup: e.target.value})} className="w-full h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl pl-10 pr-8 text-sm outline-none focus:border-indigo-500 appearance-none text-slate-900 dark:text-white cursor-pointer"><option value="">{t.journal.selectStrategy}</option>{strategies.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}</select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-400" /></div></div><TradeScreenshotPicker images={formData.images || []} tier={user.tier} language={language} onChange={images => setFormData(prev => ({ ...prev, images }))} onBusyChange={setProcessingScreenshots} /></div></div></div>{/* Right side review panel */}<div id="tour-review-panel" className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${showReviewPanel ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}><div className="w-[400px] h-full flex flex-col border-l border-slate-200 dark:border-[var(--tg-border)]"><div className="px-6 pt-5 pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><BookCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><div><h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">{t.journal.reviewTab}</h4><p className="text-xs text-slate-400 mt-1 dark:text-slate-400">{language === 'cn' ? '记录你的交易思考' : 'Capture your trade insights'}</p></div></div><button type="button" onClick={() => setShowReviewPanel(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors dark:text-slate-400"><X className="w-5 h-5" /></button></div></div><div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6"><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 dark:text-slate-400"><FileText className="w-3 h-3" /> {t.journal.notes}</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl p-3 text-sm outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white" placeholder={language === 'cn' ? '执行笔记、入场前的想法...' : 'Execution notes, pre-trade thoughts...'}></textarea></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 dark:text-slate-400"><BookCheck className="w-3 h-3" /> {t.journal.reviewNotes}</label><textarea value={formData.reviewNotes} onChange={e => setFormData({...formData, reviewNotes: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl p-3 text-sm outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white" placeholder={language === 'cn' ? '交易后分析、经验教训...' : 'Post-trade analysis, lessons learned...'}></textarea></div><div id="tour-mistakes-section"><label className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2 dark:text-slate-400"><AlertOctagon className="w-3 h-3" /> {t.journal.mistakes}</label><div className="flex flex-wrap gap-2 mb-3">{formData.mistakes?.map((m: any, i: number) => (<span key={i} className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded text-xs border border-rose-100 dark:border-rose-800 flex items-center gap-1">{m}<button type="button" onClick={() => removeMistake(i)}><X className="w-3 h-3" /></button></span>)) }</div><div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowMistakeSuggestions(false); }}><div className="flex gap-2"><input type="text" value={newMistake} onChange={e => setNewMistake(e.target.value)} onKeyDown={handleAddMistake} onFocus={() => setShowMistakeSuggestions(true)} placeholder={t.journal.mistakesPlaceholder} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[var(--tg-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /><button type="button" onClick={() => setShowMistakeSuggestions(v => !v)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors dark:hover:bg-indigo-950/40"><Plus className="w-5 h-5" /></button></div>{showMistakeSuggestions && (<div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-[var(--tg-border)] rounded-xl shadow-2xl z-50 p-3 space-y-3 max-h-64 overflow-y-auto">{MISTAKE_PRESETS.map(group => (<div key={group.group}><p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 dark:text-slate-400">{group.group}</p><div className="flex flex-wrap gap-1.5">{group.tags.map(tag => (<button key={tag} type="button" onMouseDown={(e) => { e.preventDefault(); addMistakeTag(tag); }} className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${formData.mistakes?.includes(tag) ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[var(--tg-border)] hover:border-rose-400 hover:text-rose-500'}`}>{tag}</button>))}</div></div>))}</div>)}</div></div></div></div></div></form>
                        {saveError && <p role="alert" className="mx-6 mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{saveError}</p>}<div className="p-6 border-t border-slate-100 dark:border-[var(--tg-border)] bg-white dark:bg-slate-900 flex flex-wrap gap-3 justify-between items-center">{isFormOpenTrade ? (<div className="flex items-center gap-2 text-amber-500 text-xs font-bold animate-pulse"><AlertTriangle className="w-4 h-4" /> {t.journal.openPositionStatus}</div>) : (<div></div>)}<div className="flex gap-3"><button type="button" onClick={handleCloseModal} className="px-6 py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold transition-colors text-sm dark:text-slate-400">{t.journal.cancel}</button><button type="button" disabled={savingTrade || processingScreenshots} onClick={handleSubmit} className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 flex items-center gap-2 text-sm"><Check className="w-4 h-4" /> {savingTrade ? (language === 'cn' ? '保存中…' : 'Saving…') : t.journal.save}</button></div></div>
                    </div>
                )}
            </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Journal;
