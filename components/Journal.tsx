import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Trash2, Edit2, 
    X, Check, ChevronRight, AlertTriangle, 
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
import { Trade, TradeStatus, Direction, DailyPlan, ChecklistItem, RiskSettings, Strategy } from '../types';
import { MOCK_ACCOUNTS } from '../constants';
import TradeReviewModal from './TradeReviewModal';

// Helper to compress image
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative ml-1.5 inline-flex">
        <Info className="w-3 h-3 text-slate-400 cursor-help hover:text-indigo-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center leading-snug">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
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
  onAddTrade: (trade: Trade) => void;
  onUpdateTrade: (trade: Trade) => Promise<void>;
  onDeleteTrade: (id: string) => void;
  checklist: ChecklistItem[];
  onUpdateChecklist: (checklist: ChecklistItem[]) => void;
  onImportTrades?: (trades: Trade[]) => void;
  onShare: (trade: Trade) => void;
  riskSettings?: RiskSettings;
  onSavePlan?: (plan: DailyPlan) => void;
  autoOpen?: boolean;
  onResetAutoOpen?: () => void;
  strategies: Strategy[];
  onNavigateToNote?: (noteId: string) => void;
  onCreateNoteIntent?: (date: string, tradeIds: string[]) => void;
}

const initialFormState: Partial<Trade> = {
    symbol: '',
    direction: Direction.LONG,
    entryDate: '',
    exitDate: '',
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
    pnl: '盈亏 ($)',
    direction: '方向'
};

const Journal: React.FC<JournalProps> = ({ 
    trades, plans, onAddTrade, onUpdateTrade, onDeleteTrade, 
    checklist, onUpdateChecklist, onImportTrades, onShare,
    riskSettings, onSavePlan, autoOpen, onResetAutoOpen, strategies,
    onNavigateToNote, onCreateNoteIntent
}) => {
  const { t, language } = useLanguage();
  const { user, openPricing } = useUser();
  const { registerStepAction, unregisterStepAction } = useTour();

  // Remembered fee rate from last trade
  const [lastFeeRate, setLastFeeRate] = useState<string>(() => localStorage.getItem('tg_last_fee_rate') || '');

  // Basic States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'checklist' | 'form'>('checklist');
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [formData, setFormData] = useState<any>(initialFormState);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [isManualPnl, setIsManualPnl] = useState(false);
  
  // Dashboard-style filtering states
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
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

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [reviewTrade, setReviewTrade] = useState<Trade | null>(null);
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

  // Risk Alerts
  const [stopTradingAlert, setStopTradingAlert] = useState<{ show: boolean, reason: string, value: number } | null>(null);
  const [highRiskConfirmation, setHighRiskConfirmation] = useState<{ show: boolean, amount: number } | null>(null);
  const [timeToMidnight, setTimeToMidnight] = useState('');

  // Filtering
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [showDuration, setShowDuration] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const entryDateInputRef = useRef<HTMLInputElement>(null);
  const exitDateInputRef = useRef<HTMLInputElement>(null);

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
                  className={`w-8 h-8 flex items-center justify-center text-xs cursor-pointer rounded-full transition-all ${isStart || isEnd ? 'bg-indigo-600 text-white font-bold' : isSelected ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}
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
              <div className="text-center font-bold text-sm mb-2 text-slate-700">{monthName} {baseDate.getFullYear()}</div>
              <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                  {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] text-slate-400 font-bold">{d}</div>)}
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
  useEffect(() => {
    const handleHandlePaste = async (event: ClipboardEvent) => {
        if (!isModalOpen || modalStep !== 'form') return;
        const items = event.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    try {
                        const base64 = await compressImage(file);
                        setFormData((prev: any) => ({ ...prev, images: [...(prev.images || []), base64] }));
                        setToastMessage(language === 'cn' ? "截图已粘贴" : "Screenshot Pasted");
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 2000);
                    } catch (error) { console.error("Paste image processing failed", error); }
                }
            }
        }
    };
    if (isModalOpen) window.addEventListener('paste', handleHandlePaste);
    return () => window.removeEventListener('paste', handleHandlePaste);
  }, [isModalOpen, modalStep, language]);

  // Initializing Flatpickr logic
  useEffect(() => {
    if (isModalOpen && modalStep === 'form') {
        const fpConfig = { enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, allowInput: true, disableMobile: "true" };
        let entryFp: any;
        let exitFp: any;
        if (entryDateInputRef.current) {
            // @ts-ignore
            entryFp = window.flatpickr(entryDateInputRef.current, { ...fpConfig, defaultDate: formData.entryDate, onChange: (selectedDates: Date[], dateStr: string) => { setFormData((prev: any) => ({ ...prev, entryDate: dateStr })); } });
        }
        if (exitDateInputRef.current) {
            // @ts-ignore
            exitFp = window.flatpickr(exitDateInputRef.current, { ...fpConfig, defaultDate: formData.exitDate, onChange: (selectedDates: Date[], dateStr: string) => { setFormData((prev: any) => ({ ...prev, exitDate: dateStr })); } });
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
      registerStepAction('journalChecklist', () => {
          setFormData({ ...initialFormState });
          setEditingTradeId(null);
          setSessionChecklist(checklist.map(i => ({ ...i, isCompleted: false })));
          const isChecklistEnabled = localStorage.getItem('tg_enable_checklist') !== 'false';
          setModalStep(isChecklistEnabled ? 'checklist' : 'form');
          setIsManualPnl(false);
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
          ['journalAddBtn', 'journalChecklist', 'journalForm', 'journalRequired', 'journalStrategy', 'journalReview', 'journalMistakes', '__close__'].forEach(key => unregisterStepAction(key));
      };
  }, [checklist]);

  // Risk Timer
  useEffect(() => {
      const updateTimer = () => {
          const now = new Date();
          const midnight = new Date();
          midnight.setHours(24, 0, 0, 0);
          const diff = midnight.getTime() - now.getTime();
          if (diff <= 0) setTimeToMidnight("00:00:00");
          else {
              const h = Math.floor(diff / (1000 * 60 * 60));
              const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((diff % (1000 * 60)) / 1000);
              setTimeToMidnight(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleOpenNewModal = () => {
      if (riskSettings) {
          const today = new Date().toDateString();
          const todaysTrades = trades.filter(t => t.entryDate && new Date(t.entryDate).toDateString() === today);
          const todayLoss = todaysTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
          if (todayLoss <= -Math.abs(riskSettings.maxDailyLoss)) {
              setStopTradingAlert({ show: true, reason: 'daily_loss', value: riskSettings.maxDailyLoss });
              return;
          }
          if (riskSettings.maxConsecutiveLosses) {
              const sortedTrades = [...trades].sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
              let consecutiveLosses = 0;
              for (const t of sortedTrades) {
                  if (t.status === TradeStatus.LOSS) consecutiveLosses++;
                  else break;
              }
              if (consecutiveLosses >= riskSettings.maxConsecutiveLosses) {
                   setStopTradingAlert({ show: true, reason: 'consecutive_loss', value: consecutiveLosses });
                   return;
              }
          }
      }
      setFormData({ ...initialFormState, entryDate: getLocalNowStr(), fees: lastFeeRate });
      setEditingTradeId(null);
      setSessionChecklist(checklist.map(i => ({...i, isCompleted: false})));
      const isChecklistEnabled = localStorage.getItem('tg_enable_checklist') !== 'false';
      setModalStep(isChecklistEnabled ? 'checklist' : 'form');
      setIsManualPnl(false);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setHighRiskConfirmation(null);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImportTrades) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          const lines = text.split('\n');
          const newTrades: Trade[] = [];
          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const cols = line.split(',');
              if (cols.length < 5) continue;
              const trade: Trade = {
                  id: `imp-${Date.now()}-${i}`,
                  entryDate: new Date(cols[0]).toISOString() || new Date().toISOString(),
                  symbol: cols[1]?.toUpperCase() || 'UNKNOWN',
                  direction: cols[2]?.toLowerCase().includes('buy') || cols[2]?.toLowerCase().includes('long') ? Direction.LONG : Direction.SHORT,
                  entryPrice: parseFloat(cols[3]) || 0,
                  quantity: parseFloat(cols[4]) || 0,
                  pnl: parseFloat(cols[5]) || 0,
                  status: (parseFloat(cols[5]) || 0) >= 0 ? TradeStatus.WIN : TradeStatus.LOSS,
                  exitDate: new Date().toISOString(), 
                  exitPrice: 0,
                  fees: 0,
                  setup: 'Imported',
                  notes: 'Imported via CSV',
              };
              newTrades.push(trade);
          }
          if (newTrades.length > 0) {
              onImportTrades(newTrades);
              setToastMessage(`Successfully imported ${newTrades.length} trades.`);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
          } else { alert("No valid trades found in CSV. Please check format."); }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol)));

  const handleRowClick = (trade: Trade) => {
      setFormData({ ...trade, entryDate: trade.entryDate.slice(0, 16).replace('T', ' '), exitDate: trade.exitDate ? trade.exitDate.slice(0, 16).replace('T', ' ') : '', leverage: trade.leverage || 1, riskAmount: trade.riskAmount || 0, images: trade.images || [], mistakes: trade.mistakes || [] });
      setEditingTradeId(trade.id);
      setModalStep('form');
      setShowReviewPanel(false);
      setIsManualPnl(true);
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
      let newExitPrice = trade.exitPrice;
      if (trade.quantity > 0) {
          const sign = trade.direction === Direction.LONG ? 1 : -1;
          newExitPrice = trade.entryPrice + (newPnl / trade.quantity) * sign;
      }
      const newStatus = newPnl > 0 ? TradeStatus.WIN : newPnl < 0 ? TradeStatus.LOSS : TradeStatus.BE;
      onUpdateTrade({ ...trade, pnl: newPnl, exitPrice: parseFloat(newExitPrice.toFixed(2)), status: newStatus });
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { try { const base64 = await compressImage(e.target.files[0]); setFormData((prev: any) => ({ ...prev, images: [...(prev.images || []), base64] })); } catch (error) { alert(t.journal.uploadFailed); } } };
  const removeImage = (index: number) => { setFormData((prev: any) => ({ ...prev, images: prev.images?.filter((_: any, i: number) => i !== index) })); };
  const handleAddMistake = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && newMistake.trim()) { e.preventDefault(); setFormData((prev: any) => ({ ...prev, mistakes: [...(prev.mistakes || []), newMistake.trim()] })); setNewMistake(''); } };
  const addMistakeTag = (tag: string) => { if (!formData.mistakes?.includes(tag)) { setFormData((prev: any) => ({ ...prev, mistakes: [...(prev.mistakes || []), tag] })); } };
  const removeMistake = (idx: number) => { setFormData((prev: any) => ({ ...prev, mistakes: prev.mistakes?.filter((_: any, i: number) => i !== idx) })); };

  const saveTradeToState = async () => {
        // Validate required fields
        const errors: Record<string, boolean> = {};
        if (!formData.symbol?.trim()) errors.symbol = true;
        if (!formData.entryDate?.trim()) errors.entryDate = true;
        if (!formData.entryPrice && formData.entryPrice !== 0) errors.entryPrice = true;
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});
        const isOpenTrade = !formData.exitDate && !formData.pnl;
        const finalPnl = Number(formData.pnl) || 0;
        const feesAmount = Number(formData.fees) || 0;
        // Remember fee amount for next trade
        if (feesAmount > 0) {
            localStorage.setItem('tg_last_fee_rate', String(feesAmount));
            setLastFeeRate(String(feesAmount));
        }
        let status = TradeStatus.WIN;
        if (isOpenTrade) status = TradeStatus.OPEN;
        else status = finalPnl > 0 ? TradeStatus.WIN : (finalPnl < 0 ? TradeStatus.LOSS : TradeStatus.BE);
        const tradeId = editingTradeId || Date.now().toString();
        const tradeData: Trade = { id: tradeId, symbol: formData.symbol!.toUpperCase(), entryDate: formData.entryDate!, exitDate: formData.exitDate || '', entryPrice: Number(formData.entryPrice) || 0, exitPrice: Number(formData.exitPrice) || 0, quantity: Number(formData.quantity) || 0, direction: formData.direction!, status: status, pnl: finalPnl, leverage: Number(formData.leverage) || 1, riskAmount: Number(formData.riskAmount) || 0, setup: formData.setup || '', notes: formData.notes || '', reviewNotes: formData.reviewNotes || '', fees: feesAmount, images: formData.images || [], mistakes: formData.mistakes || [], rating: formData.rating, compliance: formData.compliance, executionGrade: formData.executionGrade };
        if (editingTradeId) onUpdateTrade(tradeData);
        else onAddTrade(tradeData);
        if (formData.reviewNotes && onSavePlan && tradeData.entryDate) {
            const planId = `review-${tradeId}`;
            const tradeDate = new Date(tradeData.entryDate).toISOString().slice(0, 10);
            const newPlan: DailyPlan = { id: planId, date: tradeDate, title: `Review: ${tradeData.symbol} - ${tradeDate}`, folder: 'daily-journal', content: formData.reviewNotes, focusTickers: [tradeData.symbol], linkedTradeIds: [tradeId] };
            onSavePlan(newPlan);
        }
        handleCloseModal(); setFormData(initialFormState); setEditingTradeId(null); setToastType('success'); setToastMessage(isOpenTrade ? "Trade saved as OPEN position!" : t.journal.saveSuccess); setShowToast(true); setTimeout(() => setShowToast(false), 3000);
  }

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); const risk = Number(formData.riskAmount || 0); const maxRisk = riskSettings?.maxTradeRisk || Infinity; if (risk > maxRisk && !editingTradeId && !highRiskConfirmation) { setHighRiskConfirmation({ show: true, amount: risk }); return; } await saveTradeToState(); };
  const confirmHighRiskSave = async () => { setHighRiskConfirmation(null); await saveTradeToState(); };

  const completedCount = sessionChecklist.filter(i => i.isCompleted).length;
  const totalCount = sessionChecklist.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isFormOpenTrade = !formData.exitDate;

  const MOODS = [
      { id: 'calm', label: t.journal.preTrade.moods.calm, icon: Smile, color: 'text-emerald-500' },
      { id: 'excited', label: t.journal.preTrade.moods.excited, icon: Zap, color: 'text-yellow-500', isRisky: true },
      { id: 'anxious', label: t.journal.preTrade.moods.anxious, icon: Meh, color: 'text-blue-500', isRisky: true },
      { id: 'angry', label: t.journal.preTrade.moods.angry, icon: Flame, color: 'text-rose-500', isRisky: true },
      { id: 'bored', label: t.journal.preTrade.moods.bored, icon: Frown, color: 'text-slate-500' },
  ];
  const selectedMoodObj = MOODS.find(m => m.id === preTradeMood);
  const isRiskyMood = selectedMoodObj?.isRisky;
  const currentAccountName = selectedAccountId === 'all' ? (language === 'cn' ? '所有账户' : 'All Accounts') : MOCK_ACCOUNTS.find(a => a.id === selectedAccountId)?.name || 'Unknown';

  const getAlertMessage = () => {
      if (!stopTradingAlert) return '';
      if (stopTradingAlert.reason === 'consecutive_loss') return t.journal.consecutiveLossDesc.replace('{count}', stopTradingAlert.value.toString());
      if (stopTradingAlert.reason === 'daily_loss') return t.journal.dailyLossDesc.replace('${limit}', stopTradingAlert.value.toString());
      return '';
  };

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
      const net = t.pnl - t.fees;
      map[displayDate].netPnl += net;
      map[displayDate].grossPnl += t.pnl;
      map[displayDate].fees += t.fees;
      map[displayDate].volume += (t.quantity * t.entryPrice);
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
          runningPnl += (t.pnl - t.fees);
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
      if (!grade || grade === '-') return 'text-slate-400';
      if (grade.startsWith('A')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      if (grade.startsWith('B')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      if (grade.startsWith('C') || grade.startsWith('D')) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      return 'text-slate-400';
  };

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
                  onSavePlan={onSavePlan}
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
      {stopTradingAlert && stopTradingAlert.show && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="relative max-w-lg w-full bg-gradient-to-b from-rose-950 to-slate-900 border border-rose-50/30 rounded-3xl p-8 md:p-10 text-center shadow-[0_0_60px_rgba(225,29,72,0.2)] overflow-hidden">
                  <div className="relative z-10 mb-8 flex justify-center">
                      <div className="relative group cursor-default">
                          <div className="absolute inset-0 bg-rose-500 blur-xl opacity-30 animate-pulse"></div>
                          <div className="relative bg-gradient-to-br from-rose-500 to-rose-700 w-24 h-24 rounded-2xl rotate-3 flex items-center justify-center shadow-2xl border border-rose-400/30 group-hover:rotate-6 transition-transform duration-300">
                              <AlertOctagon className="w-12 h-12 text-white drop-shadow-md" />
                          </div>
                      </div>
                  </div>
                  <div className="relative z-10 space-y-8">
                      <div className="space-y-3">
                          <h2 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-sm">{t.journal.stopTradingTitle}</h2>
                          <p className="text-rose-200/90 font-medium text-lg leading-relaxed">{getAlertMessage()}</p>
                      </div>
                      <div className="bg-rose-950/50 border border-rose-500/20 rounded-2xl p-5 backdrop-blur-sm">
                          <p className="text-white font-bold text-xl mb-3">{t.journal.consecutiveLossAction}</p>
                          <div className="flex items-center justify-center gap-2 text-rose-300 text-sm bg-rose-900/30 py-1.5 px-3 rounded-full w-fit mx-auto border border-rose-500/10">
                              <Clock className="w-4 h-4" />
                              <span className="opacity-80">{t.journal.consecutiveLossReset}</span>
                              <span className="font-mono font-bold text-white tracking-wider">{timeToMidnight}</span>
                          </div>
                      </div>
                      <button onClick={() => setStopTradingAlert(null)} className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-rose-900/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-rose-400/20 flex items-center justify-center gap-2 group"><ShieldCheck className="w-5 h-5 opacity-80 group-hover:opacity-100" />{t.journal.consecutiveLossAck}</button>
                  </div>
              </div>
          </div>
      )}

      {highRiskConfirmation && highRiskConfirmation.show && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-8 text-center shadow-2xl">
                  <div className="flex justify-center mb-4">
                      <div className="bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-2xl flex items-center justify-center">
                          <AlertTriangle className="w-8 h-8 text-amber-500" />
                      </div>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                      {language === 'cn' ? '风险超出限额' : 'Risk Exceeds Limit'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                      {language === 'cn'
                          ? `您输入的风险金额 $${highRiskConfirmation.amount} 超过了您在"心态风控"中设定的单笔最大风险 $${riskSettings?.maxTradeRisk}。`
                          : `The risk amount $${highRiskConfirmation.amount} exceeds your max trade risk limit of $${riskSettings?.maxTradeRisk} set in Risk Management.`}
                  </p>
                  <p className="text-amber-500 font-semibold text-sm mb-6">
                      {language === 'cn' ? '确定要继续记录这笔交易吗？' : 'Are you sure you want to proceed?'}
                  </p>
                  <div className="flex gap-3">
                      <button
                          onClick={() => setHighRiskConfirmation(null)}
                          className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                          {language === 'cn' ? '取消' : 'Cancel'}
                      </button>
                      <button
                          onClick={confirmHighRiskSave}
                          className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                      >
                          {language === 'cn' ? '仍然记录' : 'Proceed Anyway'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.journal.title}</h2>
        <div className="flex items-center gap-3">
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="List View"><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-white dark:bg-slate-700 shadow text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Gallery View"><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('daily')} className={`p-2 rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white dark:bg-slate-700 shadow text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Daily Journal View"><BookOpen className="w-4 h-4" /></button>
            </div>
            <div className="relative">
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCSVUpload} />
                <button onClick={() => { if (user.tier === 'free') openPricing(); else fileInputRef.current?.click(); }} className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-medium text-sm relative overflow-hidden group"><FileUp className="w-4 h-4 mr-2" />Import CSV{user.tier === 'free' && <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-lg">PRO</span></div>}</button>
            </div>
            <button id="journal-add-btn" onClick={handleOpenNewModal} className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 font-medium"><Plus className="w-4 h-4 mr-2" />{t.journal.addTrade}</button>
        </div>
      </div>

       {showToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-100 animate-fade-in">
              <div className={`${toastType === 'error' ? 'bg-rose-600 border-rose-500/50' : 'bg-emerald-600 border-emerald-500/50'} text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md`}>
                  {toastType === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span className="font-medium text-sm shadow-sm">{toastMessage}</span>
              </div>
          </div>
       )}

      <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <div className="relative flex-1 min-w-[300px] max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder={t.journal.searchPlaceholder} className="w-full bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-200 pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-colors text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
            
            <button onClick={() => setShowDuration(!showDuration)} className={`p-2.5 flex items-center gap-2 rounded-xl transition-colors ${showDuration ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} title={t.journal.showDuration}><Clock className="w-5 h-5" /><span className="text-sm font-medium hidden lg:inline">{t.journal.showDuration}</span></button>

            <button onClick={() => setShowFilterPanel(!showFilterPanel)} className={`p-2.5 flex items-center gap-2 rounded-xl transition-colors ${showFilterPanel || filterRules.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><ListFilter className="w-5 h-5" /><span className="text-sm font-medium hidden lg:inline">{language === 'cn' ? '过滤' : 'Filters'}</span>{filterRules.length > 0 && <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">{filterRules.length}</span>}</button>
            
            <div className="flex-1"></div>

            <div className="flex flex-wrap gap-3">
                <div className="relative" ref={datePickerRef}>
                    <button 
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-indigo-300 transition-all min-w-[240px]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {(datePresets.find(p => p.id === activeDatePreset)?.label || activeDatePreset).toUpperCase()}
                                </p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none whitespace-nowrap">
                                    {activeDatePreset === 'All Time' ? (language === 'cn' ? '所有时间' : 'All Time') : (
                                        <>{dateRange.start.toLocaleDateString()} <span className="mx-0.5 text-slate-400">➞</span> {dateRange.end.toLocaleDateString()}</>
                                    )}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDatePickerOpen && (
                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex w-[640px] animate-fade-in-up z-50 origin-top-right">
                            <div className="flex-1 p-6 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div className="flex items-center justify-between mb-4">
                                     <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronRight className="w-4 h-4 rotate-180 text-slate-400" /></button>
                                     <div className="flex gap-8">
                                         {renderMiniCalendar(viewDate)}
                                         {renderMiniCalendar(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                     </div>
                                     <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                                </div>
                            </div>
                            <div className="w-48 bg-slate-50 dark:bg-slate-950 p-2 flex flex-col gap-1">
                                {datePresets.map(preset => (
                                    <button key={preset.id} onClick={() => handlePresetSelect(preset.id)} className={`text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${activeDatePreset === preset.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}>{preset.label}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={accountSwitcherRef}>
                    <button 
                        onClick={() => setIsAccountSwitcherOpen(!isAccountSwitcherOpen)}
                        className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-indigo-300 transition-all min-w-[200px]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ACCOUNT</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate max-w-[110px]">{currentAccountName}</p>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAccountSwitcherOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAccountSwitcherOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up z-50 origin-top-right">
                            <div className="p-2 space-y-1">
                                <button onClick={() => { setSelectedAccountId('all'); setIsAccountSwitcherOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedAccountId === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>All Accounts{selectedAccountId === 'all' && <Check className="w-4 h-4" />}</button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                                {MOCK_ACCOUNTS.map(acc => (
                                    <button key={acc.id} onClick={() => { setSelectedAccountId(acc.id); setIsAccountSwitcherOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedAccountId === acc.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${acc.isReal ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>{acc.name}</div>{selectedAccountId === acc.id && <Check className="w-4 h-4" />}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {(filterRules.length > 0 || searchTerm) && <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-rose-500 underline decoration-dashed whitespace-nowrap">{language === 'cn' ? '清除' : 'Clear'}</button>}
          </div>

          {showFilterPanel && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                       <div className="flex items-center gap-3"><span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{language === 'cn' ? '且' : 'AND'}</span><div className="h-px w-12 bg-slate-200 dark:bg-slate-700"></div><span className="text-slate-400 text-sm italic">{language === 'cn' ? '所有条件都必须满足' : 'All conditions must be met'}</span></div>
                       <button onClick={addFilterRule} className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> {language === 'cn' ? '添加条件' : 'Add Rule'}</button>
                  </div>
                  <div className="space-y-3">
                      {filterRules.map((rule) => (
                          <div key={rule.id} className="flex flex-col md:flex-row gap-3 items-center group">
                              <div className="w-full md:w-32"><select className="w-full text-sm rounded-lg px-3 py-2.5 outline-none border transition-colors cursor-pointer font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200" value={rule.field} onChange={(e) => updateFilterRule(rule.id, { field: e.target.value as FilterField, value: '' })}>{Object.entries(language === 'cn' ? FIELD_LABELS_CN : FIELD_LABELS_EN).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
                              <div className="w-full md:w-36"><select className="w-full text-sm rounded-lg px-3 py-2.5 outline-none border transition-colors cursor-pointer font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200" value={rule.operator} onChange={(e) => updateFilterRule(rule.id, { operator: e.target.value as FilterOperator })}><option value="is">{language === 'cn' ? '等于' : 'Is'}</option><option value="isNot">{language === 'cn' ? '不等于' : 'Is Not'}</option><option value="contains">{language === 'cn' ? '包含' : 'Contains'}</option><option value="gt">{language === 'cn' ? '大于' : 'Greater than'}</option><option value="lt">{language === 'cn' ? '小于' : 'Less than'}</option></select></div>
                              <div className="flex-1 w-full"><select className="w-full text-sm rounded-lg px-3 py-2.5 outline-none border transition-colors cursor-pointer font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200" value={rule.value} onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}><option value="">{language === 'cn' ? '选择值...' : 'Select Value...'}</option>{getOptionsForField(rule.field).map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></div>
                              <button onClick={() => removeFilterRule(rule.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      ))}
                      {filterRules.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-2">{language === 'cn' ? '点击"添加条件"开始过滤' : 'Click "Add Rule" to start filtering'}</p>}
                  </div>
              </div>
          )}
      </div>

      {viewMode === 'list' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-colors animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 uppercase font-semibold text-xs tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5">{t.journal.date}</th>
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
                    <tr key={trade.id} ref={(el) => { if (el) rowRefs.current.set(trade.id, el); else rowRefs.current.delete(trade.id); }} onClick={() => handleRowClick(trade)} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all group cursor-pointer ${highlightedTradeId === trade.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 animate-pulse' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{new Date(trade.entryDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4"><div className="flex flex-col"><div className="flex items-center gap-2"><span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs w-fit">{trade.symbol}</span>{hasReview ? <div className="text-[10px] text-emerald-500 flex items-center gap-0.5" title={t.journal.reviewed}><BookCheck className="w-3 h-3" /></div> : <div className="text-[10px] text-amber-500 flex items-center gap-0.5" title={t.journal.pendingReview}><Hourglass className="w-3 h-3" /></div>}</div></div></td>
                      <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${trade.direction === Direction.LONG ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'}`}>{trade.direction === Direction.LONG ? t.journal.long : t.journal.short}</span></td>
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
                      {showDuration && <td className="px-6 py-4">{(() => { const durationMs = getDurationInMs(trade.entryDate, trade.exitDate); const isTradeOpen = !trade.exitDate || trade.status === TradeStatus.OPEN; const percentage = Math.max(2, Math.min(100, (durationMs / maxDuration) * 100)); return (<div className="flex flex-col justify-center h-full w-full"><span className={`text-[10px] font-mono mb-1 ${isTradeOpen ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{formatDuration(trade.entryDate, trade.exitDate)}</span><div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1"><div className={`h-full rounded-full transition-all duration-500 ${isTradeOpen ? 'bg-amber-50 animate-pulse' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div></div></div>); })()}</td>}
                      <td className="px-6 py-4 text-center">{trade.images && trade.images.length > 0 ? <ImageIcon className="w-5 h-5 mx-auto text-slate-400" /> : <span className="text-slate-300 dark:text-slate-700">-</span>}</td>
                      <td className="px-6 py-4 text-right relative"><div className="flex items-center justify-end gap-2"><div className="flex justify-end" onClick={e => e.stopPropagation()}><div className={`relative flex items-center px-3 py-1.5 rounded-lg border transition-all duration-200 group/pnl ${(trade.pnl - trade.fees) > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20' : (trade.pnl - trade.fees) < 0 ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'} hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm hover:scale-105`}><span className={`text-[10px] mr-1 select-none font-medium ${(trade.pnl - trade.fees) >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>$</span><input type="text" defaultValue={isTradeOpen && trade.pnl === 0 ? '' : (trade.pnl - trade.fees).toFixed(2)} placeholder="--" className={`w-20 text-right bg-transparent border-none outline-none font-mono font-bold text-sm transition-colors p-0 focus:ring-0 cursor-text ${(trade.pnl - trade.fees) > 0 ? 'text-emerald-600 dark:text-emerald-400 placeholder:text-emerald-300' : (trade.pnl - trade.fees) < 0 ? 'text-rose-600 dark:text-rose-400 placeholder:text-rose-300' : 'text-slate-600 dark:text-slate-400 placeholder:text-slate-400'}`} onBlur={(e) => handleInlinePnlChange(e, trade)} onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }} onClick={(e) => (e.target as HTMLInputElement).select()} /><div className="absolute -right-2 -top-2 opacity-0 group-hover/pnl:opacity-100 transition-all duration-200 pointer-events-none scale-75 group-hover/pnl:scale-100"><div className="bg-indigo-500 text-white p-1 rounded-full shadow-sm"><Edit2 className="w-2 h-2" /></div></div></div></div></div></td>
                      <td className="px-6 py-4 text-center"><div className="flex justify-center gap-1 items-center"><button onClick={(e) => { e.stopPropagation(); setReviewTrade(trade); }} className={`p-2 rounded-lg flex items-center gap-1 transition-all ${hasReview ? 'text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={hasReview ? (language === 'cn' ? "已复盘 - 点击查看" : "Reviewed - View") : (language === 'cn' ? "未复盘 - 点击添加" : "Not Reviewed - Add")}>{hasReview ? <BookCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</button>{isTradeOpen && <button onClick={(e) => handleQuickClose(e, trade)} className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg flex items-center gap-1" title="Close Position (Set Exit Time)"><Power className="w-4 h-4" /></button>}<button onClick={(e) => { e.stopPropagation(); onShare(trade); }} className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Share to Plaza"><Share2 className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); onDeleteTrade(trade.id); }} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
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
                  console.log('Trade image:', trade.images);
                  return (<div key={trade.id} onClick={() => handleRowClick(trade)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-lg group flex flex-col h-[320px]"><div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10"><div className="flex items-center gap-2"><span className="font-bold text-slate-900 dark:text-white text-sm">{trade.symbol}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${trade.direction === Direction.LONG ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>{trade.direction}</span></div><span className="text-xs text-slate-400">{trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : '--'}</span></div><div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden group-hover:opacity-90 transition-opacity">{hasImage ? <img src={trade.images![0]} alt="Trade Chart" className="w-full h-full object-cover" onError={(e) => console.log('Image load error:', e)} /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700"><div className="w-full h-1/2 flex items-end justify-center gap-1 opacity-20"><div className="w-4 h-12 bg-current rounded-t"></div><div className="w-4 h-20 bg-current rounded-t"></div><div className="w-4 h-16 bg-current rounded-t"></div><div className="w-4 h-24 bg-current rounded-t"></div><div className="w-4 h-10 bg-current rounded-t"></div></div><p className="text-xs font-medium mt-2">No Chart</p></div>}<div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow-sm ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`}>{isWin ? 'WIN' : 'LOSS'}</div></div><div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"><div className="flex justify-between items-end mb-2"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Net P&L</p><p className={`text-2xl font-black font-mono leading-none ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>{isWin ? '+' : ''}${trade.pnl.toFixed(2)}</p></div><div className="text-right">{trade.setup && <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded mb-1 max-w-[100px] truncate">{trade.setup}</span>}</div></div><div className="flex items-center gap-2 mt-3">{trade.reviewNotes ? <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded"><BookCheck className="w-3 h-3" /> Reviewed</span> : <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">No Review</span>}{trade.mistakes && trade.mistakes.length > 0 && <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded truncate max-w-[120px]"><AlertTriangle className="w-3 h-3" /> {trade.mistakes[0]}</span>}</div></div></div>);
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
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg">
                      {/* Card Header */}
                      <div 
                        className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer select-none group"
                        onClick={() => toggleDayExpanded(day.date)}
                      >
                          <div className="flex items-center gap-4">
                              <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                              </div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                  {formattedCardDate}
                              </h3>
                              <div className="flex items-baseline gap-2 ml-4">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.journal.daily.netPnl}</span>
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
                      <div className="flex flex-col md:flex-row h-48 border-b border-slate-100 dark:border-slate-800/50">
                          {/* Body - Left: Area Chart */}
                          <div className="md:w-1/3 h-full border-r border-slate-100 dark:border-slate-800 relative bg-slate-50/30 dark:bg-slate-900/20">
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
                              <div className="absolute top-3 left-4 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-50">{t.journal.daily.intradayCurve}</div>
                          </div>

                          {/* Body - Right: Stats Grid */}
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 p-5 gap-y-4">
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.totalTrades}</span>
                                  <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">{day.tradesCount}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.winners}</span>
                                  <span className="text-lg font-bold text-emerald-500 font-mono">{day.winners}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.winRate}</span>
                                  <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">{day.winRate.toFixed(1)}%</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.losers}</span>
                                  <span className="text-lg font-bold text-rose-500 font-mono">{day.losers}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.grossPnl}</span>
                                  <span className={`text-lg font-bold font-mono ${day.grossPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${day.grossPnl.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.commissions}</span>
                                  <span className="text-lg font-bold text-rose-400 font-mono">${day.commissions.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.volume}</span>
                                  <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">${(day.volume / 1000).toFixed(1)}K</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.journal.daily.profitFactor}</span>
                                  <span className="text-lg font-bold text-indigo-400 font-mono">{day.profitFactor.toFixed(2)}</span>
                              </div>
                          </div>
                      </div>

                      {/* --- Expanded Table Section --- */}
                      {isExpanded && (
                          <div className="bg-slate-50 dark:bg-[#020617] border-t border-slate-100 dark:border-slate-800 animate-fade-in-up transition-colors">
                              <div className="p-0 overflow-x-auto">
                                  <table className="w-full text-left text-sm">
                                      <thead className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
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
                                              const netPnl = trade.pnl - trade.fees;
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
                              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-white dark:bg-transparent">
                                  <button 
                                    onClick={() => toggleDayExpanded(day.date)}
                                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:slate-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
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

      {/* Modal section (Checklist and Log Trade Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white dark:bg-slate-900 rounded-2xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ${modalStep === 'checklist' && !editingTradeId ? 'max-w-md max-h-[90vh]' : showReviewPanel ? 'max-w-6xl h-auto' : 'max-w-4xl h-auto'}`}>
                {modalStep === 'checklist' && !editingTradeId ? (
                    <div id="tour-checklist-modal" className="p-8 max-w-lg mx-auto w-full">
                        <div className="mb-6 relative">
                             <button onClick={handleCloseModal} className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            <div className="flex items-center gap-2.5 mb-1"><ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.journal.preTrade.title}</h2></div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t.journal.preTrade.subtitle}</p>
                        </div>
                        <div className="space-y-3 mb-8">{sessionChecklist.map(item => (<div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${item.isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}><div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggleChecklist(item.id)}><div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${item.isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}><Check className="w-4 h-4" strokeWidth={3} /></div><span className={`font-medium text-sm ${item.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{item.text}</span></div><button onClick={(e) => { e.stopPropagation(); handleDeleteChecklistItem(item.id); }} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1"><X className="w-4 h-4" /></button></div>))}<div className="relative mt-4"><input type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder={t.journal.preTrade.addItem} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 py-3 text-sm outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600 font-medium pr-8 text-slate-700 dark:text-slate-200" onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()} /><button onClick={handleAddChecklistItem} className="absolute right-0 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"><Plus className="w-5 h-5" /></button></div></div>
                        <div className="mb-4"><h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">CURRENT MOOD</h4><div className="flex justify-between gap-3">{MOODS.map(m => { const isSelected = preTradeMood === m.id; return (<button key={m.id} onClick={() => setPreTradeMood(m.id)} className={`flex flex-col items-center justify-center w-full aspect-square rounded-2xl transition-all border-2 ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-white shadow-sm' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><m.icon className={`w-6 h-6 mb-2 ${isSelected ? m.color : 'text-slate-400 dark:text-slate-600'}`} /><span className={`text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>{m.label}</span></button>) })}</div></div>
                        <div className="mt-6 h-12 flex items-center justify-center">{preTradeMood ? (<div className={`w-full px-4 py-3 rounded-xl border flex items-center gap-3 animate-fade-in ${isRiskyMood ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'}`}><div className={`p-1 rounded-full border shadow-sm ${isRiskyMood ? 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900/50' : 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/50'}`}>{isRiskyMood ? <ShieldCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}</div><span className="font-medium text-sm truncate">{isRiskyMood ? t.journal.preTrade.moodWarning : (language === 'cn' ? "心态良好，祝交易顺利。" : "Mindset optimal. Good luck.")}</span></div>) : (<div className="text-slate-400 text-sm italic flex items-center gap-2"><Sparkles className="w-4 h-4 opacity-50" />{language === 'cn' ? "请选择当前情绪状态..." : "Please select your current mood..."}</div>)}</div>
                        <div className="flex items-center justify-between pt-6 mt-2 border-t border-slate-100 dark:border-slate-800"><span className="text-slate-400 font-medium text-sm">{t.journal.preTrade.progress}: {Math.round(progressPercent)}%</span><button onClick={handleProceed} className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 transform active:scale-95 ${isRiskyMood ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}>{isRiskyMood ? <>{t.journal.preTrade.proceedRisky} <ChevronRight className="w-4 h-4" /></> : <>{t.journal.preTrade.proceed} <ChevronRight className="w-4 h-4" /></>}</button></div>
                    </div>
                ) : (
                    <div id="tour-form-modal" className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 pt-5 pb-0"><div className="flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><div><h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{t.journal.modalTitle}</h3><p className="text-xs text-slate-400 mt-1">{t.journal.modalSubtitle}</p></div></div><div className="flex items-center gap-4"><button type="button" onClick={() => setShowReviewPanel(!showReviewPanel)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${showReviewPanel ? 'bg-indigo-600 dark:bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><BookCheck className="w-3.5 h-3.5" />{t.journal.reviewTab}</button></div></div>
                        <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden"><div className="flex-1 overflow-y-auto p-6 space-y-6"><div className="flex flex-col md:flex-row gap-6"><div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">{t.journal.asset}{formErrors.symbol && <span className="text-rose-500 normal-case">{language === 'cn' ? '请填写交易对' : 'Required'}</span>}</label><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" /><input type="text" list="symbol-options" value={formData.symbol} onChange={e => { setFormData({...formData, symbol: e.target.value.toUpperCase()}); setFormErrors(prev => ({...prev, symbol: false})); }} className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl pl-12 pr-4 h-14 text-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 ${formErrors.symbol ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'}`} placeholder={language === 'cn' ? '例如 BTC' : 'BTC'} /><datalist id="symbol-options">{uniqueSymbols.map(s => <option key={s} value={s} />)}</datalist></div></div><div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{t.journal.directionLabel}</label><div className="grid grid-cols-2 gap-0 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 h-14"><button type="button" onClick={() => setFormData({...formData, direction: Direction.LONG})} className={`rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${formData.direction === Direction.LONG ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><TrendingUp className="w-5 h-5" /> {t.journal.long}</button><button type="button" onClick={() => setFormData({...formData, direction: Direction.SHORT})} className={`rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${formData.direction === Direction.SHORT ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><TrendingDown className="w-5 h-5" /> {t.journal.short}</button></div></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="relative"><div className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-indigo-500 uppercase tracking-wider z-10">{t.journal.openTimeLabel}</div>{formErrors.entryDate && <div className="absolute -top-2 right-3 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-rose-500 z-10">{language === 'cn' ? '请填写开仓时间' : 'Required'}</div>}<div className={`bg-white dark:bg-slate-900 border rounded-xl p-3 flex items-center ${formErrors.entryDate ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'}`}><Calendar className="w-4 h-4 text-indigo-400 mr-3" /><input ref={entryDateInputRef} type="text" value={formData.entryDate} onChange={e => { setFormData({...formData, entryDate: e.target.value}); setFormErrors(prev => ({...prev, entryDate: false})); }} className="w-full bg-transparent border-none text-sm font-medium text-slate-900 dark:text-white outline-none" placeholder="Select Date & Time" /><Clock className="w-4 h-4 text-indigo-400 ml-auto" /></div></div><div className="relative"><div className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">{t.journal.closeTimeLabel}</div><div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center"><Calendar className="w-4 h-4 text-slate-400 mr-3" /><input ref={exitDateInputRef} type="text" value={formData.exitDate} onChange={e => setFormData({...formData, exitDate: e.target.value})} className="w-full bg-transparent border-none text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-300" placeholder={language === 'cn' ? '可选' : 'Optional'} /><button type="button" onClick={() => handleSetTimeNow('exitDate')} className="hover:text-indigo-500 ml-auto text-slate-400"><Clock className="w-4 h-4" /></button></div></div></div><div><div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3"><Zap className="w-3 h-3" /> {t.journal.executionData}</div><div className="grid grid-cols-3 gap-4"><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 flex items-center justify-between">{t.journal.entryLabel}{formErrors.entryPrice && <span className="text-rose-500">{language === 'cn' ? '请填写开仓价格' : 'Required'}</span>}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input type="number" step="any" placeholder={t.journal.entryPrice} value={formData.entryPrice ?? ''} onChange={e => { setFormData({...formData, entryPrice: e.target.value}); setFormErrors(prev => ({...prev, entryPrice: false})); }} className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white ${formErrors.entryPrice ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'}`} /></div></div><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block">{t.journal.exitLabel}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input type="number" step="any" placeholder={t.journal.exitPrice} value={formData.exitPrice ?? ''} onChange={e => setFormData({...formData, exitPrice: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block">{t.journal.sizeLabel}</label><input type="number" step="any" placeholder={language === 'cn' ? '仓位数量' : 'Qty'} value={formData.quantity ?? ''} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div></div><div><div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3"><ShieldCheck className="w-3 h-3" /> {t.journal.riskManagement}</div><div className="grid grid-cols-3 gap-4"><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block">{t.journal.leverageLabel}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">#</span><input type="number" placeholder="1" value={formData.leverage ?? ''} onChange={e => setFormData({...formData, leverage: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div><div><label className="text-[10px] text-amber-500 font-bold ml-1 mb-1 block flex items-center gap-1">{language === 'cn' ? '风险金额 ($)' : t.journal.riskAmountLabel} <InfoTooltip text={language === 'cn' ? '本次交易你愿意承受的最大亏损金额（即止损金额），用于计算风险回报比' : 'Stop Loss Amount'} /></label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500"><AlertTriangle className="w-3 h-3" /></span><input type="number" placeholder={language === 'cn' ? '风险金额 ($)' : 'Risk $'} value={formData.riskAmount ?? ''} onChange={e => setFormData({...formData, riskAmount: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 rounded-xl pl-8 pr-10 py-3 text-sm font-medium outline-none focus:border-amber-500 placeholder:text-amber-300 text-slate-900 dark:text-white" /></div></div><div><label className="text-[10px] text-slate-400 font-bold ml-1 mb-1 block">{language === 'cn' ? '手续费' : t.journal.fees}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input type="number" step="any" placeholder={language === 'cn' ? '手续费' : 'Fees $'} value={formData.fees ?? ''} onChange={e => setFormData({...formData, fees: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-3 text-sm font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /></div></div></div></div><div className="flex gap-6 h-40"><div className="flex-1 bg-sky-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-sky-100 dark:border-slate-700 flex flex-col justify-between relative group"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.journal.netPnlLabel}</p><div className="flex items-baseline gap-1 absolute bottom-6 left-6 right-6"><input type="number" step="any" value={formData.pnl ?? ''} onChange={e => setFormData({...formData, pnl: e.target.value})} placeholder="0.00" className={`w-full bg-transparent border-none outline-none text-5xl font-black font-mono tracking-tighter placeholder:text-slate-200 dark:placeholder:text-slate-700 pr-14 ${Number(formData.pnl) > 0 ? 'text-emerald-500' : Number(formData.pnl) < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`} /></div><span className="text-slate-400 text-xl font-bold absolute bottom-8 right-6 pointer-events-none">$</span></div><div className="w-5/12 flex flex-col gap-3"><div id="tour-strategy-select" className="relative h-12"><Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /><select value={formData.setup} onChange={e => setFormData({...formData, setup: e.target.value})} className="w-full h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-8 text-sm outline-none focus:border-indigo-500 appearance-none text-slate-900 dark:text-white cursor-pointer"><option value="">{t.journal.selectStrategy}</option>{strategies.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}</select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-400" /></div></div><label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group relative overflow-hidden">{formData.images && formData.images.length > 0 ? (<><img src={formData.images[0]} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2"><span className="text-white text-[10px] font-bold">更换图片</span></div><button type="button" onClick={(e) => { e.preventDefault(); removeImage(0); }} className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-0.5 transition-colors z-10"><X className="w-3 h-3" /></button></>) : (<><div className="flex flex-col items-center justify-center"><Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 mb-1" /><p className="text-[10px] text-slate-400 font-bold uppercase">IMG</p><p className="text-[9px] text-slate-400 group-hover:text-indigo-400 transition-colors font-medium mt-1">{language === 'cn' ? '支持 Ctrl+V 粘贴' : 'Supports Ctrl+V Paste'}</p></div></>)}<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div></div></div>{/* Right side review panel */}<div id="tour-review-panel" className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${showReviewPanel ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}><div className="w-[400px] h-full flex flex-col border-l border-slate-200 dark:border-slate-800"><div className="px-6 pt-5 pb-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><BookCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><div><h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">{t.journal.reviewTab}</h4><p className="text-xs text-slate-400 mt-1">{language === 'cn' ? '记录你的交易思考' : 'Capture your trade insights'}</p></div></div><button type="button" onClick={() => setShowReviewPanel(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button></div></div><div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6"><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><FileText className="w-3 h-3" /> {t.journal.notes}</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white" placeholder={language === 'cn' ? '执行笔记、入场前的想法...' : 'Execution notes, pre-trade thoughts...'}></textarea></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><BookCheck className="w-3 h-3" /> {t.journal.reviewNotes}</label><textarea value={formData.reviewNotes} onChange={e => setFormData({...formData, reviewNotes: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white" placeholder={language === 'cn' ? '交易后分析、经验教训...' : 'Post-trade analysis, lessons learned...'}></textarea></div><div id="tour-mistakes-section"><label className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><AlertOctagon className="w-3 h-3" /> {t.journal.mistakes}</label><div className="flex flex-wrap gap-2 mb-3">{formData.mistakes?.map((m: any, i: number) => (<span key={i} className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded text-xs border border-rose-100 dark:border-rose-800 flex items-center gap-1">{m}<button type="button" onClick={() => removeMistake(i)}><X className="w-3 h-3" /></button></span>)) }</div><div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowMistakeSuggestions(false); }}><div className="flex gap-2"><input type="text" value={newMistake} onChange={e => setNewMistake(e.target.value)} onKeyDown={handleAddMistake} onFocus={() => setShowMistakeSuggestions(true)} placeholder={t.journal.mistakesPlaceholder} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white" /><button type="button" onClick={() => setShowMistakeSuggestions(v => !v)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors"><Plus className="w-5 h-5" /></button></div>{showMistakeSuggestions && (<div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-3 max-h-64 overflow-y-auto">{MISTAKE_PRESETS.map(group => (<div key={group.group}><p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">{group.group}</p><div className="flex flex-wrap gap-1.5">{group.tags.map(tag => (<button key={tag} type="button" onMouseDown={(e) => { e.preventDefault(); addMistakeTag(tag); }} className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${formData.mistakes?.includes(tag) ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-500'}`}>{tag}</button>))}</div></div>))}</div>)}</div></div></div></div></div></form>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">{isFormOpenTrade ? (<div className="flex items-center gap-2 text-amber-500 text-xs font-bold animate-pulse"><AlertTriangle className="w-4 h-4" /> {t.journal.openPositionStatus}</div>) : (<div></div>)}<div className="flex gap-3"><button type="button" onClick={handleCloseModal} className="px-6 py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold transition-colors text-sm">{t.journal.cancel}</button><button onClick={handleSubmit} className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 flex items-center gap-2 text-sm"><Check className="w-4 h-4" /> {t.journal.save}</button></div></div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Journal;