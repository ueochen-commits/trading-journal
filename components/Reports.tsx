
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DailyPlan, Notification, Trade, TradeStatus, Direction, Report, TradingAccount } from '../types';
import { useLanguage } from '../LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ComposedChart, Line, ReferenceLine, Legend, LineChart, Customized
} from 'recharts';
import { Calendar as CalendarIcon, Clock, Calculator, Activity, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Sparkles, FileText, Loader2, Bot, Lock, CalendarCheck, Hourglass, TrendingDown, Star, Info, ChevronDown, ChevronLeft, ChevronRight, Download, Trash2, Eye, History, MoreVertical, Settings, GripVertical, X, Search, Check } from 'lucide-react';
import FeatureGate from './FeatureGate';
import { generatePeriodicReport } from '../services/geminiService';
import { supabase, saveReport, fetchReports, deleteReport } from '../supabaseClient';

interface ReportsProps {
  trades: Trade[];
  accountSize?: number;
  plans?: DailyPlan[];
  isDataLoading?: boolean;
  onPushNotification?: (notification: Notification) => void;
  onSavePlan?: (plan: DailyPlan) => void;
  disciplineHistory?: any[];
  riskSettings?: any;
  tradingAccounts?: TradingAccount[];
  selectedAccountId?: string;
  onAccountChange?: (accountId: string) => void;
}

const SUMMARY_LAYOUT_STORAGE_KEY = 'tg_reports_summary_metric_layout_v1';
const ALL_SUMMARY_METRIC_IDS = [
  'avgTradingDaysDuration',
  'avgHoldTime',
  'longestTradeDuration',
  'maxTradingDaysDuration',
  'avgDailyNetPnl',
  'avgDailyWinLoss',
  'avgLoss',
  'avgMaxTradeLoss',
  'avgMaxTradeProfit',
  'avgNetTradePnl',
  'avgTradeWinLoss',
  'avgWin',
  'dailyNetPnl',
  'largestLosingTrade',
  'largestProfitableTrade',
  'netPnl',
  'profitFactor',
  'tradeExpectancy',
  'avgDailyNetDrawdown',
  'avgPlannedR',
  'avgRealizedR',
  'breakevenDays',
  'breakevenTrades',
  'losingDays',
  'maxDailyNetDrawdown',
  'avgDailyVolume',
  'dailyNetDrawdown',
  'loggedDays',
  'longBreakevenTrades',
  'longLosingTrades',
  'longOpenTrades',
  'longTrades',
  'longWinningTrades',
  'lossTrades',
  'netAccountBalance',
  'openTrades',
  'shortBreakevenTrades',
  'shortLosingTrades',
  'shortOpenTrades',
  'shortTrades',
  'shortWinningTrades',
  'tradeCount',
  'volume',
  'winTrades',
  'avgDailyWinPct',
  'longWinPct',
  'maxConsecutiveLosingDays',
  'maxConsecutiveLosses',
  'maxConsecutiveWinningDays',
  'maxConsecutiveWins',
  'sharpeRatio',
  'shortWinPct',
  'sortinoRatio',
  'winPct',
  'winningDays',
] as const;
const DEFAULT_SUMMARY_METRIC_IDS = [
  'netPnl',
  'winPct',
  'avgDailyWinPct',
  'profitFactor',
  'tradeExpectancy',
  'avgDailyWinLoss',
  'avgTradeWinLoss',
  'avgHoldTime',
  'avgNetTradePnl',
  'avgDailyNetPnl',
  'avgPlannedR',
  'avgRealizedR',
  'avgDailyVolume',
  'loggedDays',
  'maxDailyNetDrawdown',
  'avgDailyNetDrawdown',
] as const;
const REPORT_CHART_Y_TICK_COUNT = 5;

type SummaryMetricId = typeof ALL_SUMMARY_METRIC_IDS[number];
type ChartMetricVisual = 'line' | 'area' | 'bar';
type ChartSide = 'left' | 'right';
type ChartMetricSlot = 'primary' | 'secondary' | 'tertiary';
type PnlDisplayMode = 'net' | 'gross';
type ChartStyleSettings = Record<ChartSide, {
  primary?: {
    visual?: ChartMetricVisual;
    color?: string;
  };
  secondary?: {
    visual?: ChartMetricVisual;
    color?: string;
  };
  tertiary?: {
    visual?: ChartMetricVisual;
    color?: string;
  };
}>;

const getDefaultSummaryLayout = () => [...DEFAULT_SUMMARY_METRIC_IDS];

const normalizeSummaryLayout = (ids: unknown): SummaryMetricId[] => {
  if (!Array.isArray(ids)) return getDefaultSummaryLayout();

  const allowedIds = new Set<string>(ALL_SUMMARY_METRIC_IDS);
  const normalized = ids.filter((id): id is SummaryMetricId => typeof id === 'string' && allowedIds.has(id));
  const deduped = Array.from(new Set(normalized));

  return deduped.length > 0 ? deduped : getDefaultSummaryLayout();
};

const getRange = (period: 'today' | 'week' | 'month' | 'last30') => {
    const end = new Date();
    const start = new Date();
    if (period === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'last30') {
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }
    return { start, end };
};

const Reports: React.FC<ReportsProps> = ({
  trades: allTrades,
  accountSize = 10000,
  plans = [],
  isDataLoading = false,
  onPushNotification,
  onSavePlan,
  disciplineHistory = [],
  riskSettings = null,
  tradingAccounts = [],
  selectedAccountId: externalAccountId = 'all',
  onAccountChange,
}) => {
  const { t, language } = useLanguage();
  
  // Helper: Format duration with localization
  const formatDuration = (ms: number) => {
      if (isNaN(ms) || ms === 0) return "N/A";
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (language === 'cn') {
          if (days > 0) return `${days}天 ${hours % 24}小时`;
          if (hours > 0) return `${hours}小时 ${minutes % 60}分`;
          return `${minutes}分钟`;
      }

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m`;
  };

  const [activeTab, setActiveTab] = useState<string>('performance');
  const [summaryTab, setSummaryTab] = useState<'summary' | 'days' | 'trades'>('summary');
  // Sub-filter for Detailed Tab
  const [detailedFilter, setDetailedFilter] = useState<string>('DAYS');
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>(getRange('last30'));
  const [activeDatePreset, setActiveDatePreset] = useState<string>('All Time');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const accountSwitcherRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  // State for Time Interval Selection
  const [timeInterval, setTimeInterval] = useState<string>('1 Hour');
  // Risk Tab Sub-filter
  const [riskFilter, setRiskFilter] = useState<'R-MULTIPLE' | 'POSITION SIZE'>('R-MULTIPLE');
  const [isSummaryEditing, setIsSummaryEditing] = useState(false);
  const [summaryMetricIds, setSummaryMetricIds] = useState<SummaryMetricId[]>(() => {
      try {
          const saved = localStorage.getItem(SUMMARY_LAYOUT_STORAGE_KEY);
          return saved ? normalizeSummaryLayout(JSON.parse(saved)) : getDefaultSummaryLayout();
      } catch {
          return getDefaultSummaryLayout();
      }
  });
  const [draftSummaryMetricIds, setDraftSummaryMetricIds] = useState<SummaryMetricId[]>(summaryMetricIds);
  const [draggedSummaryMetricId, setDraggedSummaryMetricId] = useState<SummaryMetricId | null>(null);
  const [isAddMetricMenuOpen, setIsAddMetricMenuOpen] = useState(false);
  const [metricPickerSearch, setMetricPickerSearch] = useState('');
  const [expandedMetricCategory, setExpandedMetricCategory] = useState<string | null>('time');
  const [showMetricDifference, setShowMetricDifference] = useState(false);
  const [leftChartMetricId, setLeftChartMetricId] = useState<SummaryMetricId>('netPnl');
  const [rightChartMetricId, setRightChartMetricId] = useState<SummaryMetricId>('avgDailyWinLoss');
  const [leftSecondaryChartMetricId, setLeftSecondaryChartMetricId] = useState<SummaryMetricId | null>(null);
  const [rightSecondaryChartMetricId, setRightSecondaryChartMetricId] = useState<SummaryMetricId | null>(null);
  const [leftTertiaryChartMetricId, setLeftTertiaryChartMetricId] = useState<SummaryMetricId | null>(null);
  const [rightTertiaryChartMetricId, setRightTertiaryChartMetricId] = useState<SummaryMetricId | null>(null);
  const [openChartMetricPicker, setOpenChartMetricPicker] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openChartStyleMenu, setOpenChartStyleMenu] = useState<ChartSide | null>(null);
  const [openChartVisualDropdown, setOpenChartVisualDropdown] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openChartColorDropdown, setOpenChartColorDropdown] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openChartTimeframeMenu, setOpenChartTimeframeMenu] = useState<ChartSide | null>(null);
  const [isPnlDisplayMenuOpen, setIsPnlDisplayMenuOpen] = useState(false);
  const [pnlDisplayMode, setPnlDisplayMode] = useState<PnlDisplayMode>('net');
  const [chartTimeframes, setChartTimeframes] = useState<Record<ChartSide, ChartTimeframe>>({ left: 'day', right: 'day' });
  const [chartStyleSettings, setChartStyleSettings] = useState<ChartStyleSettings>({ left: {}, right: {} });
  const [chartMetricPickerSearch, setChartMetricPickerSearch] = useState('');
  const [expandedChartMetricCategory, setExpandedChartMetricCategory] = useState<string | null>('profitability');
  
  // Calendar Report State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [previousReports, setPreviousReports] = useState<Report[]>([]);
  const accounts = tradingAccounts || [];
  const selectedAccountId = externalAccountId || 'all';
  const setSelectedAccountId = (accountId: string) => onAccountChange?.(accountId);
  const trades = useMemo(() => {
      return allTrades.filter(trade => {
          if (selectedAccountId !== 'all' && trade.accountId !== selectedAccountId) return false;
          const tradeTime = new Date(trade.entryDate).getTime();
          if (activeDatePreset === 'All Time' || activeDatePreset === '所有时间') return true;
          return tradeTime >= dateRange.start.getTime() && tradeTime <= dateRange.end.getTime();
      });
  }, [allTrades, selectedAccountId, activeDatePreset, dateRange]);

  useEffect(() => {
      const fetchUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              setCurrentUserId(user.id);
          }
      };
      fetchUser();
  }, []);

  useEffect(() => {
      if (!openChartStyleMenu) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest(`[data-chart-style-root="${openChartStyleMenu}"]`)) return;
          setOpenChartStyleMenu(null);
          setOpenChartVisualDropdown(null);
          setOpenChartColorDropdown(null);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openChartStyleMenu]);

  useEffect(() => {
      if (!openChartTimeframeMenu) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest(`[data-chart-timeframe-root="${openChartTimeframeMenu}"]`)) return;
          setOpenChartTimeframeMenu(null);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openChartTimeframeMenu]);

  useEffect(() => {
      if (!isPnlDisplayMenuOpen) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest('[data-pnl-display-menu]')) return;
          setIsPnlDisplayMenuOpen(false);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isPnlDisplayMenuOpen]);

  useEffect(() => {
      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target as Node;
          if (accountSwitcherRef.current && !accountSwitcherRef.current.contains(target)) {
              setIsAccountSwitcherOpen(false);
          }
          if (datePickerRef.current && !datePickerRef.current.contains(target)) {
              setIsDatePickerOpen(false);
          }
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
      if (!isReportMenuOpen) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest('[data-report-tab-menu]')) return;
          setIsReportMenuOpen(false);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isReportMenuOpen]);

  useEffect(() => {
      if (!openChartMetricPicker) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest('[data-chart-metric-picker-root]')) return;
          setOpenChartMetricPicker(null);
          setChartMetricPickerSearch('');
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openChartMetricPicker]);

  useEffect(() => {
      if (!currentUserId) return;

      // 初始加载
      loadReports(currentUserId);

      // 每 5 秒自动刷新报告列表（检查 pending 状态）
      const interval = setInterval(() => {
          loadReports(currentUserId, true);
      }, 5000);

      return () => clearInterval(interval);
  }, [currentUserId]);

  const getReportsSnapshot = (reports: Report[]) => reports
      .map(report => `${report.id}:${report.status}:${(report as any).updated_at || (report as any).created_at || ''}`)
      .join('|');

  const loadReports = async (userId: string, background = false) => {
      if (!background) setIsLoadingReports(true);
      try {
          const reports = await fetchReports(userId);
          const nextReportsSnapshot = getReportsSnapshot(reports);

          // 检测是否有报告从 pending 变为 completed（不再发送通知）
          if (previousReports.length > 0) {
              const newlyCompleted = reports.filter(r =>
                  r.status === 'completed' &&
                  previousReports.find(pr => pr.id === r.id && pr.status === 'pending')
              );
              // 通知已移除，仅用于检测状态变化
          }

          setPreviousReports(current =>
              getReportsSnapshot(current) === nextReportsSnapshot ? current : reports
          );
          setSavedReports(current =>
              getReportsSnapshot(current) === nextReportsSnapshot ? current : reports
          );

          // 自动显示最新的已完成报告
          if (!background && !reportResult && reports.length > 0) {
              const latestCompleted = reports.find(r => r.status === 'completed');
              if (latestCompleted) {
                  setReportResult(latestCompleted.content.html);
                  setViewingReport(latestCompleted);
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          if (!background) setIsLoadingReports(false);
      }
  };

  // --- 1. Daily Aggregation Logic ---
  const dailyData = useMemo(() => {
      const grouped: Record<string, number> = {};
      trades.forEach(t => {
          if (!t.entryDate) return;
          const date = new Date(t.entryDate).toLocaleDateString('en-CA'); 
          grouped[date] = (grouped[date] || 0) + (t.pnl - t.fees);
      });
      
      const sortedDates = Object.keys(grouped).sort();
      let currentEquity = accountSize;
      
      return sortedDates.map((date, index) => {
          const pnl = grouped[date];
          currentEquity += pnl;
          
          return {
              date,
              tradeNumber: index + 1,
              pnl,
              equity: currentEquity,
          };
      });
  }, [trades, accountSize]);

  // --- Calendar Data Preparation ---
  const calendarData = useMemo(() => {
      const data: Record<string, { pnl: number, count: number, wins: number }> = {};
      const yearTrades = trades.filter(t => new Date(t.entryDate).getFullYear() === calendarYear);
      
      yearTrades.forEach(t => {
          const date = new Date(t.entryDate).toLocaleDateString('en-CA'); // YYYY-MM-DD
          if (!data[date]) data[date] = { pnl: 0, count: 0, wins: 0 };
          const net = t.pnl - t.fees;
          data[date].pnl += net;
          data[date].count += 1;
          if (net > 0) data[date].wins += 1;
      });
      
      // Calculate Year Stats
      const totalPnl = yearTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
      const totalCount = yearTrades.length;
      const wins = yearTrades.filter(t => t.pnl > 0).length;
      const winRate = totalCount > 0 ? (wins / totalCount) * 100 : 0;
      const activeDays = Object.keys(data).length;

      return { dailyMap: data, stats: { totalPnl, totalCount, winRate, activeDays } };
  }, [trades, calendarYear]);

  // --- 2. Day of Week Statistics (For Detailed View - DAYS) ---
  const dayOfWeekStats = useMemo(() => {
      const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const daysCn = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const daysLabels = language === 'cn' ? daysCn : daysEn;

      const stats = daysLabels.map((day, i) => ({
          label: day, // Unified label key for charts
          day,
          count: 0,
          netPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          wins: 0,
          losses: 0
      }));

      trades.forEach(t => {
          const date = new Date(t.entryDate);
          const dayIndex = date.getDay(); // 0 = Sunday
          const s = stats[dayIndex];
          
          s.count++;
          s.netPnl += t.pnl;
          if (t.pnl > 0) {
              s.grossProfit += t.pnl;
              s.wins++;
          } else if (t.pnl < 0) {
              s.grossLoss += t.pnl; // is negative
              s.losses++;
          }
      });

      return stats.map(s => ({
          ...s,
          winRate: s.count > 0 ? (s.wins / s.count) * 100 : 0
      }));
  }, [trades, language]);

  // --- 3. Duration Statistics (For Detailed View - TRADE DURATION) ---
  const durationStats = useMemo(() => {
      // Define Buckets (ms)
      const buckets = [
          { label: language === 'cn' ? '1分钟以内' : 'Under 1 min', min: 0, max: 60 * 1000 },
          { label: language === 'cn' ? '1分 - 2分' : '1:00 to 1:59', min: 60 * 1000, max: 120 * 1000 },
          { label: language === 'cn' ? '2分 - 5分' : '2:00 to 4:59', min: 120 * 1000, max: 300 * 1000 },
          { label: language === 'cn' ? '5分 - 10分' : '5:00 to 9:59', min: 300 * 1000, max: 600 * 1000 },
          { label: language === 'cn' ? '10分 - 30分' : '10:00 to 29:59', min: 600 * 1000, max: 1800 * 1000 },
          { label: language === 'cn' ? '30分 - 1小时' : '30:00 to 59:59', min: 1800 * 1000, max: 3600 * 1000 },
          { label: language === 'cn' ? '1小时 - 2小时' : '1:00:00 to 1:59:59', min: 3600 * 1000, max: 7200 * 1000 },
          { label: language === 'cn' ? '2小时 - 4小时' : '2:00:00 to 3:59:59', min: 7200 * 1000, max: 14400 * 1000 },
          { label: language === 'cn' ? '4小时以上' : '4:00:00 and over', min: 14400 * 1000, max: Infinity },
      ];

      const stats = buckets.map(b => ({
          ...b,
          count: 0,
          netPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          wins: 0,
      }));

      trades.forEach(t => {
          if (!t.exitDate || t.status === TradeStatus.OPEN) return; // Skip open trades
          
          const duration = new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime();
          
          // Find matching bucket
          const bucket = stats.find(b => duration >= b.min && duration < b.max);
          
          if (bucket) {
              bucket.count++;
              bucket.netPnl += t.pnl;
              if (t.pnl > 0) {
                  bucket.grossProfit += t.pnl;
                  bucket.wins++;
              } else if (t.pnl < 0) {
                  bucket.grossLoss += t.pnl;
              }
          }
      });

      return stats.map(s => ({
          ...s,
          winRate: s.count > 0 ? (s.wins / s.count) * 100 : 0
      }));
  }, [trades, language]);

  // --- 4. Time of Day Statistics (For Detailed View - TIME) ---
  const timeStats = useMemo(() => {
      // Determine bucket size in minutes based on selection
      let bucketSize = 60; // Default 1 Hour
      if (timeInterval === '30 Minutes') bucketSize = 30;
      if (timeInterval === '15 Minutes') bucketSize = 15;
      if (timeInterval === '5 Minutes') bucketSize = 5;

      const totalBuckets = Math.ceil((24 * 60) / bucketSize);
      
      const buckets = Array.from({ length: totalBuckets }, (_, i) => {
          const totalMinutes = i * bucketSize;
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          const label = `${h}:${m.toString().padStart(2, '0')}`;
          
          return {
              label,
              count: 0,
              netPnl: 0,
              grossProfit: 0,
              grossLoss: 0,
              wins: 0
          };
      });

      trades.forEach(t => {
          const d = new Date(t.entryDate);
          const totalMinutes = d.getHours() * 60 + d.getMinutes();
          const bucketIndex = Math.floor(totalMinutes / bucketSize);
          
          if (buckets[bucketIndex]) {
              const b = buckets[bucketIndex];
              b.count++;
              b.netPnl += t.pnl;
              if (t.pnl > 0) {
                  b.grossProfit += t.pnl;
                  b.wins++;
              } else if (t.pnl < 0) {
                  b.grossLoss += t.pnl;
              }
          }
      });

      return buckets.map(b => ({
          ...b,
          winRate: b.count > 0 ? (b.wins / b.count) * 100 : 0
      }));
  }, [trades, timeInterval]); // Re-run when timeInterval changes

  type DetailedStatRow = {
      label: string;
      count: number;
      netPnl: number;
      grossProfit: number;
      grossLoss: number;
      wins: number;
      winRate: number;
  };

  const createDetailedStatRow = (label: string): DetailedStatRow => ({
      label,
      count: 0,
      netPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      wins: 0,
      winRate: 0,
  });

  const addTradeToDetailedRow = (row: DetailedStatRow, trade: Trade) => {
      const net = trade.pnl - trade.fees;
      row.count += 1;
      row.netPnl += net;
      if (net > 0) {
          row.grossProfit += net;
          row.wins += 1;
      } else if (net < 0) {
          row.grossLoss += net;
      }
  };

  const finalizeDetailedRows = (rows: DetailedStatRow[]) =>
      rows.map(row => ({
          ...row,
          netPnl: Number(row.netPnl.toFixed(2)),
          grossProfit: Number(row.grossProfit.toFixed(2)),
          grossLoss: Number(row.grossLoss.toFixed(2)),
          winRate: row.count > 0 ? (row.wins / row.count) * 100 : 0,
      }));

  const weekStats = useMemo(() => {
      const grouped = new Map<string, DetailedStatRow>();
      trades.forEach(trade => {
          if (!trade.entryDate) return;
          const date = new Date(trade.entryDate);
          if (Number.isNaN(date.getTime())) return;
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const label = weekStart.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', {
              month: 'short',
              day: '2-digit',
          });
          const key = weekStart.toLocaleDateString('en-CA');
          if (!grouped.has(key)) grouped.set(key, createDetailedStatRow(label));
          addTradeToDetailedRow(grouped.get(key)!, trade);
      });
      return finalizeDetailedRows(Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row));
  }, [trades, language]);

  const monthStats = useMemo(() => {
      const grouped = new Map<string, DetailedStatRow>();
      trades.forEach(trade => {
          if (!trade.entryDate) return;
          const date = new Date(trade.entryDate);
          if (Number.isNaN(date.getTime())) return;
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const label = date.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', {
              year: 'numeric',
              month: 'short',
          });
          if (!grouped.has(key)) grouped.set(key, createDetailedStatRow(label));
          addTradeToDetailedRow(grouped.get(key)!, trade);
      });
      return finalizeDetailedRows(Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row));
  }, [trades, language]);

  const symbolStats = useMemo(() => {
      const grouped = new Map<string, DetailedStatRow>();
      trades.forEach(trade => {
          const label = (trade.symbol || '').trim().toUpperCase() || (language === 'cn' ? '未知品种' : 'Unknown');
          if (!grouped.has(label)) grouped.set(label, createDetailedStatRow(label));
          addTradeToDetailedRow(grouped.get(label)!, trade);
      });
      return finalizeDetailedRows(Array.from(grouped.values()).sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl)));
  }, [trades, language]);

  const setupStats = useMemo(() => {
      const grouped = new Map<string, DetailedStatRow>();
      trades.forEach(trade => {
          const label = (trade.setup || '').trim() || (language === 'cn' ? '未填写策略' : 'No setup');
          if (!grouped.has(label)) grouped.set(label, createDetailedStatRow(label));
          addTradeToDetailedRow(grouped.get(label)!, trade);
      });
      return finalizeDetailedRows(Array.from(grouped.values()).sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl)));
  }, [trades, language]);

  const tagStats = useMemo(() => {
      const grouped = new Map<string, DetailedStatRow>();
      trades.forEach(trade => {
          const tags = Object.values(trade.customTags || {}).flat().filter(Boolean);
          const labels = tags.length > 0 ? tags : [language === 'cn' ? '未填写标签' : 'No tag'];
          labels.forEach(label => {
              if (!grouped.has(label)) grouped.set(label, createDetailedStatRow(label));
              addTradeToDetailedRow(grouped.get(label)!, trade);
          });
      });
      return finalizeDetailedRows(Array.from(grouped.values()).sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl)));
  }, [trades, language]);

  const winLossStats = useMemo(() => {
      const rows = {
          wins: createDetailedStatRow(language === 'cn' ? '盈利交易' : 'Winning trades'),
          losses: createDetailedStatRow(language === 'cn' ? '亏损交易' : 'Losing trades'),
          breakeven: createDetailedStatRow(language === 'cn' ? '打平交易' : 'Breakeven trades'),
      };
      trades.forEach(trade => {
          const net = trade.pnl - trade.fees;
          if (net > 0) addTradeToDetailedRow(rows.wins, trade);
          else if (net < 0) addTradeToDetailedRow(rows.losses, trade);
          else addTradeToDetailedRow(rows.breakeven, trade);
      });
      return finalizeDetailedRows([rows.wins, rows.losses, rows.breakeven]);
  }, [trades, language]);

  // --- 5. R-Multiple Statistics (For Risk View) ---
  const rMultipleStats = useMemo(() => {
      // Buckets Definition
      // Order matters for the chart display (top to bottom)
      const buckets = [
          { label: 'None', min: -Infinity, max: Infinity, isNone: true },
          { label: '+4R and more', min: 4, max: Infinity },
          { label: '+3R to 3.99R', min: 3, max: 4 },
          { label: '+2R to 2.99R', min: 2, max: 3 },
          { label: '+1R to 1.99R', min: 1, max: 2 },
          { label: '0R to 0.99R', min: 0, max: 1 },
          { label: '-0.99R to -0.01R', min: -1, max: 0 }, // Using slight offset for -0
          { label: '-1R to -1.99R', min: -2, max: -1 },
          { label: '-2R to -2.99R', min: -3, max: -2 },
          { label: '-3R to -3.99R', min: -4, max: -3 },
          { label: '-4R or less', min: -Infinity, max: -4 },
      ];

      const stats = buckets.map(b => ({
          ...b,
          count: 0,
          netPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          wins: 0,
      }));

      trades.forEach(t => {
          // Calculate R
          let r = 0;
          let isNone = false;

          // If riskAmount is undefined or 0, treat as "None" or special case
          if (!t.riskAmount || t.riskAmount <= 0) {
              isNone = true;
          } else {
              const netPnl = t.pnl;
              r = netPnl / t.riskAmount;
          }

          // Find Bucket
          let bucket;
          if (isNone) {
              bucket = stats.find(b => b.isNone);
          } else {
              // Exact match logic for ranges [min, max)
              bucket = stats.find(b => !b.isNone && r >= b.min && r < b.max);
          }

          if (bucket) {
              bucket.count++;
              const net = t.pnl;
              bucket.netPnl += net;
              if (net > 0) {
                  bucket.grossProfit += net;
                  bucket.wins++;
              } else {
                  bucket.grossLoss += net;
              }
          }
      });

      return stats.map(s => ({
          ...s,
          winRate: s.count > 0 ? (s.wins / s.count) * 100 : 0
      }));
  }, [trades]);

  // --- 6. Advanced Statistics Calculation ---
  const stats = useMemo(() => {
      if (trades.length === 0) return null;

      // Basic Filters
      const closedTrades = trades.filter(t => t.status !== TradeStatus.OPEN && t.exitDate);
      const openTrades = trades.filter(t => t.status === TradeStatus.OPEN || !t.exitDate);
      const wins = closedTrades.filter(t => t.pnl > 0);
      const losses = closedTrades.filter(t => t.pnl < 0);
      const breakevens = closedTrades.filter(t => t.pnl === 0);

      // Financials
      const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
      const grossLoss = losses.reduce((acc, t) => acc + t.pnl, 0); // Negative number
      const totalFees = trades.reduce((acc, t) => acc + t.fees, 0);
      const netPnl = grossProfit + grossLoss;
      const totalVolume = trades.reduce((acc, t) => acc + (t.quantity * t.entryPrice), 0); 

      // Averages
      const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
      const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0; 
      const avgTradePnl = closedTrades.length > 0 ? netPnl / closedTrades.length : 0;
      
      // Ratios
      const profitFactor = Math.abs(grossLoss) > 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 999 : 0;
      const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
      
      // Expectancy
      const winPctDec = wins.length / (closedTrades.length || 1);
      const lossPctDec = losses.length / (closedTrades.length || 1);
      const expectancy = (winPctDec * avgWin) + (lossPctDec * avgLoss);

      // Extremes
      const largestProfit = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
      const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

      // R-Multiples
      const tradesWithRisk = closedTrades.filter(t => t.riskAmount && t.riskAmount > 0);
      const totalR = tradesWithRisk.reduce((acc, t) => acc + (t.pnl / (t.riskAmount || 1)), 0);
      const avgRealizedR = tradesWithRisk.length > 0 ? totalR / tradesWithRisk.length : 0;
      const longTrades = trades.filter(t => t.direction === Direction.LONG);
      const shortTrades = trades.filter(t => t.direction === Direction.SHORT);
      const closedLongTrades = closedTrades.filter(t => t.direction === Direction.LONG);
      const closedShortTrades = closedTrades.filter(t => t.direction === Direction.SHORT);
      const longWins = closedLongTrades.filter(t => t.pnl > 0);
      const longLosses = closedLongTrades.filter(t => t.pnl < 0);
      const longBreakevens = closedLongTrades.filter(t => t.pnl === 0);
      const shortWins = closedShortTrades.filter(t => t.pnl > 0);
      const shortLosses = closedShortTrades.filter(t => t.pnl < 0);
      const shortBreakevens = closedShortTrades.filter(t => t.pnl === 0);
      const longOpenTrades = openTrades.filter(t => t.direction === Direction.LONG);
      const shortOpenTrades = openTrades.filter(t => t.direction === Direction.SHORT);
      const longWinRate = closedLongTrades.length > 0 ? (longWins.length / closedLongTrades.length) * 100 : 0;
      const shortWinRate = closedShortTrades.length > 0 ? (shortWins.length / closedShortTrades.length) * 100 : 0;

      // --- Sequence Calculations (Consecutive) ---
      let maxConWins = 0, curConWins = 0;
      let maxConLoss = 0, curConLoss = 0;
      
      const chronologicalTrades = [...closedTrades].sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
      
      chronologicalTrades.forEach(t => {
          if (t.pnl > 0) {
              curConWins++;
              curConLoss = 0;
              if (curConWins > maxConWins) maxConWins = curConWins;
          } else if (t.pnl < 0) {
              curConLoss++;
              curConWins = 0;
              if (curConLoss > maxConLoss) maxConLoss = curConLoss;
          }
      });

      // --- Time Calculations ---
      const getDuration = (t: Trade) => new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime();
      const avgHoldAll = closedTrades.length > 0 ? closedTrades.reduce((acc, t) => acc + getDuration(t), 0) / closedTrades.length : 0;
      const avgHoldWin = wins.length > 0 ? wins.reduce((acc, t) => acc + getDuration(t), 0) / wins.length : 0;
      const avgHoldLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + getDuration(t), 0) / losses.length : 0;
      const avgHoldScratch = breakevens.length > 0 ? breakevens.reduce((acc, t) => acc + getDuration(t), 0) / breakevens.length : 0;
      const closedDurations = closedTrades.map(getDuration).filter(duration => Number.isFinite(duration) && duration > 0);
      const longestTradeDuration = closedDurations.length > 0 ? Math.max(...closedDurations) : 0;

      // --- Daily Stats ---
      const dailyPnls = dailyData.map(d => d.pnl);
      const winningDays = dailyPnls.filter(p => p > 0).length;
      const losingDays = dailyPnls.filter(p => p < 0).length;
      const beDays = dailyPnls.filter(p => p === 0).length;
      const totalDays = dailyData.length;
      const avgDailyPnl = totalDays > 0 ? netPnl / totalDays : 0;
      const largestLosingDay = dailyPnls.length > 0 ? Math.min(...dailyPnls) : 0; 
      const maxTradingDaysDuration = totalDays > 0 ? totalDays * 24 * 60 * 60 * 1000 : 0;

      // Daily Consecutive
      let maxConWinDays = 0, curConWinDays = 0;
      let maxConLossDays = 0, curConLossDays = 0;
      dailyData.forEach(d => {
          if (d.pnl > 0) {
              curConWinDays++;
              curConLossDays = 0;
              if (curConWinDays > maxConWinDays) maxConWinDays = curConWinDays;
          } else if (d.pnl < 0) {
              curConLossDays++;
              curConWinDays = 0;
              if (curConLossDays > maxConLossDays) maxConLossDays = curConLossDays;
          }
      });

      // Monthly Grouping
      const monthlyGroup: Record<string, number> = {};
      dailyData.forEach(d => {
          const monthKey = d.date.substring(0, 7); // YYYY-MM
          monthlyGroup[monthKey] = (monthlyGroup[monthKey] || 0) + d.pnl;
      });
      const monthlyPnls = Object.values(monthlyGroup);
      const bestMonth = Math.max(...monthlyPnls, 0);
      const lowestMonth = Math.min(...monthlyPnls, 0);
      const avgMonth = monthlyPnls.length > 0 ? monthlyPnls.reduce((a,b) => a+b, 0) / monthlyPnls.length : 0;
      const meanDailyPnl = dailyPnls.length > 0 ? dailyPnls.reduce((a, b) => a + b, 0) / dailyPnls.length : 0;
      const variance = dailyPnls.length > 1 ? dailyPnls.reduce((acc, pnl) => acc + Math.pow(pnl - meanDailyPnl, 2), 0) / (dailyPnls.length - 1) : 0;
      const stdDev = Math.sqrt(variance);
      const downsidePnls = dailyPnls.filter(pnl => pnl < 0);
      const downsideDeviation = downsidePnls.length > 1
          ? Math.sqrt(downsidePnls.reduce((acc, pnl) => acc + Math.pow(pnl, 2), 0) / downsidePnls.length)
          : 0;
      const sharpeRatio = stdDev > 0 ? (meanDailyPnl / stdDev) * Math.sqrt(252) : 0;
      const sortinoRatio = downsideDeviation > 0 ? (meanDailyPnl / downsideDeviation) * Math.sqrt(252) : 0;

      return {
          totalTrades: trades.length,
          closedCount: closedTrades.length,
          openCount: openTrades.length,
          netPnl,
          grossProfit,
          grossLoss,
          totalFees,
          avgWin,
          avgLoss,
          avgTradePnl,
          profitFactor,
          winRate,
          expectancy,
          winCount: wins.length,
          lossCount: losses.length,
          beCount: breakevens.length,
          maxConWins,
          maxConLoss,
          avgHoldAll,
          avgHoldWin,
          avgHoldLoss,
          avgHoldScratch,
          longestTradeDuration,
          totalDays,
          winningDays,
          losingDays,
          beDays,
          avgDailyPnl,
          largestProfit,
          largestLoss,
          largestLosingDay,
          maxConWinDays,
          maxConLossDays,
          maxTradingDaysDuration,
          avgRealizedR,
          bestMonth,
          lowestMonth,
          avgMonth,
          totalVolume,
          longTradesCount: longTrades.length,
          shortTradesCount: shortTrades.length,
          longWinningTrades: longWins.length,
          longLosingTrades: longLosses.length,
          longBreakevenTrades: longBreakevens.length,
          longOpenTrades: longOpenTrades.length,
          shortWinningTrades: shortWins.length,
          shortLosingTrades: shortLosses.length,
          shortBreakevenTrades: shortBreakevens.length,
          shortOpenTrades: shortOpenTrades.length,
          longWinRate,
          shortWinRate,
          sharpeRatio,
          sortinoRatio
      };
  }, [trades, dailyData]);

  const performanceDailyData = useMemo(() => {
      const grouped: Record<string, {
          pnl: number;
          count: number;
          wins: number;
          losses: number;
          winPnl: number;
          lossPnl: number;
          volume: number;
          closedTradeCount: number;
          holdDurationTotal: number;
          longestTradeDuration: number;
      }> = {};

      trades.forEach(t => {
          if (!t.entryDate) return;
          const date = new Date(t.entryDate).toLocaleDateString('en-CA');
          if (!grouped[date]) {
              grouped[date] = {
                  pnl: 0,
                  count: 0,
                  wins: 0,
                  losses: 0,
                  winPnl: 0,
                  lossPnl: 0,
                  volume: 0,
                  closedTradeCount: 0,
                  holdDurationTotal: 0,
                  longestTradeDuration: 0,
              };
          }

          const net = t.pnl - t.fees;
          grouped[date].pnl += net;
          grouped[date].count += 1;
          grouped[date].volume += Math.abs((t.quantity || 0) * (t.entryPrice || 0));

          if (net > 0) {
              grouped[date].wins += 1;
              grouped[date].winPnl += net;
          } else if (net < 0) {
              grouped[date].losses += 1;
              grouped[date].lossPnl += net;
          }

          if (t.exitDate && t.status !== TradeStatus.OPEN) {
              const duration = new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime();
              if (Number.isFinite(duration) && duration > 0) {
                  grouped[date].closedTradeCount += 1;
                  grouped[date].holdDurationTotal += duration;
                  grouped[date].longestTradeDuration = Math.max(grouped[date].longestTradeDuration, duration);
              }
          }
      });

      let cumulativePnl = 0;
      const dayMs = 24 * 60 * 60 * 1000;
      return Object.entries(grouped)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, value]) => {
              cumulativePnl += value.pnl;
              const avgWin = value.wins > 0 ? value.winPnl / value.wins : 0;
              const avgLoss = value.losses > 0 ? value.lossPnl / value.losses : 0;
              const hasAvgDailyWinLoss = avgWin > 0 && avgLoss < 0;
              const avgDailyWinLoss = hasAvgDailyWinLoss ? Math.abs(avgWin / avgLoss) : 0;
              return {
                  date,
                  label: new Date(`${date}T00:00:00`).toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short', day: '2-digit' }),
                  pnl: Number(value.pnl.toFixed(2)),
                  cumulativePnl: Number(cumulativePnl.toFixed(2)),
                  count: value.count,
                  wins: value.wins,
                  losses: value.losses,
                  winPnl: value.winPnl,
                  lossPnl: value.lossPnl,
                  winRate: value.count > 0 ? (value.wins / value.count) * 100 : 0,
                  avgDailyWinLoss: Number(avgDailyWinLoss.toFixed(2)),
                  hasAvgDailyWinLoss,
                  volume: value.volume,
                  closedTradeCount: value.closedTradeCount,
                  holdDurationTotal: value.holdDurationTotal,
                  longestTradeDuration: value.longestTradeDuration,
                  loggedDayCount: 1,
                  periodDurationMs: dayMs,
              };
          });
  }, [trades, language]);

  const performancePnlDisplayData = useMemo(() => {
      const indexes = getEvenlySpacedIndexes(performanceDailyData.length, 9);
      return indexes.map(index => {
          const point = performanceDailyData[index];
          return {
              ...point,
              label: formatChartDateLabel(point.date),
          };
      });
  }, [performanceDailyData]);

  const performancePnlXAxisTicks = useMemo(() => {
      const indexes = getEvenlySpacedIndexes(performancePnlDisplayData.length, 6);
      return indexes.map(index => performancePnlDisplayData[index]?.label).filter(Boolean);
  }, [performancePnlDisplayData]);

  const isPnlTrendingDown = useMemo(() => {
      if (performancePnlDisplayData.length < 2) return false;
      const first = performancePnlDisplayData[0].cumulativePnl;
      const last = performancePnlDisplayData[performancePnlDisplayData.length - 1].cumulativePnl;
      return last < first;
  }, [performancePnlDisplayData]);

  const avgDailyWinLossDisplayData = useMemo(() => {
      const validDays = performanceDailyData.filter(day => day.hasAvgDailyWinLoss && day.avgDailyWinLoss > 0);
      const indexes = getEvenlySpacedIndexes(validDays.length, 5);
      return indexes.map(index => {
          const point = validDays[index];
          return {
              ...point,
              label: formatChartDateLabel(point.date),
          };
      });
  }, [performanceDailyData]);

  const avgDailyWinLossTicks = useMemo(() => {
      const indexSource = avgDailyWinLossDisplayData.length > 0 ? avgDailyWinLossDisplayData : performancePnlDisplayData;
      const indexes = getEvenlySpacedIndexes(indexSource.length, 6);
      return indexes.map(index => indexSource[index]?.label).filter(Boolean);
  }, [avgDailyWinLossDisplayData, performancePnlDisplayData]);

  type ChartMetricMode = 'cumulative' | 'daily';
  type ChartMetricFormat = 'money' | 'percent' | 'number' | 'duration';
  type ChartTimeframe = 'day' | 'week' | 'month';

  const chartMetricConfigs: Partial<Record<SummaryMetricId, {
      category: 'time' | 'profitability' | 'risk' | 'activity' | 'streaks';
      label: string;
      shortLabel: string;
      mode: ChartMetricMode;
      format: ChartMetricFormat;
      visual: ChartMetricVisual;
      color: string;
      getDailyValue: (day: typeof performanceDailyData[number]) => number;
      includeDay?: (day: typeof performanceDailyData[number]) => boolean;
  }>> = {
      avgTradingDaysDuration: { category: 'time', label: language === 'cn' ? '平均交易日跨度 - 累计' : 'Average trading days duration - cumulative', shortLabel: language === 'cn' ? '交易日跨度' : 'Trading days duration', mode: 'cumulative', format: 'duration', visual: 'area', color: '#6b55cf', getDailyValue: (day) => day.periodDurationMs },
      avgHoldTime: { category: 'time', label: language === 'cn' ? '平均持仓时间 - 累计' : 'Avg hold time - cumulative', shortLabel: language === 'cn' ? '平均持仓时间' : 'Avg hold time', mode: 'cumulative', format: 'duration', visual: 'area', color: '#6b55cf', getDailyValue: (day) => day.closedTradeCount > 0 ? day.holdDurationTotal / day.closedTradeCount : 0 },
      longestTradeDuration: { category: 'time', label: language === 'cn' ? '最长持仓时间 - 累计' : 'Longest trade duration - cumulative', shortLabel: language === 'cn' ? '最长持仓时间' : 'Longest trade duration', mode: 'cumulative', format: 'duration', visual: 'area', color: '#6b55cf', getDailyValue: (day) => day.longestTradeDuration },
      maxTradingDaysDuration: { category: 'time', label: language === 'cn' ? '最大交易日跨度 - 累计' : 'Max trading days duration - cumulative', shortLabel: language === 'cn' ? '最大交易日跨度' : 'Max trading days duration', mode: 'cumulative', format: 'duration', visual: 'area', color: '#6b55cf', getDailyValue: (day) => day.periodDurationMs },
      avgDailyNetPnl: { category: 'profitability', label: language === 'cn' ? '平均每日净盈亏 - 累计' : 'Avg daily net P&L - cumulative', shortLabel: language === 'cn' ? '平均每日净盈亏' : 'Avg daily net P&L', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.pnl },
      avgDailyWinLoss: { category: 'profitability', label: language === 'cn' ? '平均每日盈亏比 - 累计' : 'Avg daily win/loss - cumulative', shortLabel: language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss', mode: 'daily', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.avgDailyWinLoss, includeDay: (day) => day.hasAvgDailyWinLoss && day.avgDailyWinLoss > 0 },
      avgLoss: { category: 'profitability', label: language === 'cn' ? '平均亏损 - 累计' : 'Avg loss - cumulative', shortLabel: language === 'cn' ? '平均亏损' : 'Avg loss', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.losses > 0 ? day.lossPnl / day.losses : 0 },
      avgNetTradePnl: { category: 'profitability', label: language === 'cn' ? '平均单笔净盈亏 - 累计' : 'Avg net trade P&L - cumulative', shortLabel: language === 'cn' ? '平均单笔净盈亏' : 'Avg net trade P&L', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.count > 0 ? day.pnl / day.count : 0 },
      avgTradeWinLoss: { category: 'profitability', label: language === 'cn' ? '平均单笔盈亏比 - 累计' : 'Avg trade win/loss - cumulative', shortLabel: language === 'cn' ? '平均单笔盈亏比' : 'Avg trade win/loss', mode: 'daily', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.avgDailyWinLoss, includeDay: (day) => day.hasAvgDailyWinLoss && day.avgDailyWinLoss > 0 },
      avgWin: { category: 'profitability', label: language === 'cn' ? '平均盈利 - 累计' : 'Avg win - cumulative', shortLabel: language === 'cn' ? '平均盈利' : 'Avg win', mode: 'cumulative', format: 'money', visual: 'area', color: '#55c39e', getDailyValue: (day) => day.wins > 0 ? day.winPnl / day.wins : 0 },
      dailyNetPnl: { category: 'profitability', label: language === 'cn' ? '每日净盈亏' : 'Daily net P&L', shortLabel: language === 'cn' ? '每日净盈亏' : 'Daily net P&L', mode: 'daily', format: 'money', visual: 'bar', color: '#ff6468', getDailyValue: (day) => day.pnl },
      netPnl: { category: 'profitability', label: language === 'cn' ? '净盈亏 - 累计' : 'Net P&L - cumulative', shortLabel: language === 'cn' ? '净盈亏' : 'Net P&L', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.pnl },
      profitFactor: { category: 'profitability', label: language === 'cn' ? '盈利因子 - 累计' : 'Profit factor - cumulative', shortLabel: language === 'cn' ? '盈利因子' : 'Profit factor', mode: 'cumulative', format: 'number', visual: 'area', color: '#55c39e', getDailyValue: (day) => Math.abs(day.lossPnl) > 0 ? day.winPnl / Math.abs(day.lossPnl) : day.winPnl > 0 ? day.winPnl : 0 },
      tradeExpectancy: { category: 'profitability', label: language === 'cn' ? '交易期望值 - 累计' : 'Trade expectancy - cumulative', shortLabel: language === 'cn' ? '交易期望值' : 'Trade expectancy', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.count > 0 ? day.pnl / day.count : 0 },
      avgDailyNetDrawdown: { category: 'risk', label: language === 'cn' ? '平均每日净回撤' : 'Avg daily net drawdown', shortLabel: language === 'cn' ? '平均每日净回撤' : 'Avg daily net drawdown', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.pnl < 0 ? day.pnl : 0 },
      breakevenDays: { category: 'risk', label: language === 'cn' ? '打平天数 - 累计' : 'Breakeven days - cumulative', shortLabel: language === 'cn' ? '打平天数' : 'Breakeven days', mode: 'cumulative', format: 'number', visual: 'bar', color: '#9aa3ae', getDailyValue: (day) => day.pnl === 0 ? 1 : 0 },
      losingDays: { category: 'risk', label: language === 'cn' ? '亏损天数 - 累计' : 'Losing days - cumulative', shortLabel: language === 'cn' ? '亏损天数' : 'Losing days', mode: 'cumulative', format: 'number', visual: 'bar', color: '#ff6468', getDailyValue: (day) => day.pnl < 0 ? 1 : 0 },
      maxDailyNetDrawdown: { category: 'risk', label: language === 'cn' ? '最大单日净回撤 - 累计' : 'Max daily net drawdown - cumulative', shortLabel: language === 'cn' ? '最大单日净回撤' : 'Max daily net drawdown', mode: 'cumulative', format: 'money', visual: 'area', color: '#ff6468', getDailyValue: (day) => day.pnl < 0 ? day.pnl : 0 },
      avgDailyVolume: { category: 'activity', label: language === 'cn' ? '平均每日成交额 - 累计' : 'Avg daily volume - cumulative', shortLabel: language === 'cn' ? '平均每日成交额' : 'Avg daily volume', mode: 'cumulative', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.volume },
      loggedDays: { category: 'activity', label: language === 'cn' ? '记录天数 - 累计' : 'Logged days - cumulative', shortLabel: language === 'cn' ? '记录天数' : 'Logged days', mode: 'cumulative', format: 'number', visual: 'bar', color: '#6b55cf', getDailyValue: (day) => day.loggedDayCount },
      tradeCount: { category: 'activity', label: language === 'cn' ? '交易总数 - 累计' : 'Trade count - cumulative', shortLabel: language === 'cn' ? '交易总数' : 'Trade count', mode: 'cumulative', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.count },
      volume: { category: 'activity', label: language === 'cn' ? '成交额 - 累计' : 'Volume - cumulative', shortLabel: language === 'cn' ? '成交额' : 'Volume', mode: 'cumulative', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.volume },
      winTrades: { category: 'activity', label: language === 'cn' ? '盈利交易数 - 累计' : 'Win # of trades - cumulative', shortLabel: language === 'cn' ? '盈利交易数' : 'Win trades', mode: 'cumulative', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.wins },
      lossTrades: { category: 'activity', label: language === 'cn' ? '亏损交易数 - 累计' : 'Loss # of trades - cumulative', shortLabel: language === 'cn' ? '亏损交易数' : 'Loss trades', mode: 'cumulative', format: 'number', visual: 'bar', color: '#ff6468', getDailyValue: (day) => day.losses },
      avgDailyWinPct: { category: 'streaks', label: language === 'cn' ? '平均日胜率 - 累计' : 'Avg daily win % - cumulative', shortLabel: language === 'cn' ? '平均日胜率' : 'Avg daily win %', mode: 'daily', format: 'percent', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.winRate },
      winPct: { category: 'streaks', label: language === 'cn' ? '胜率 - 累计' : 'Win % - cumulative', shortLabel: language === 'cn' ? '胜率' : 'Win %', mode: 'cumulative', format: 'percent', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.winRate },
      winningDays: { category: 'streaks', label: language === 'cn' ? '盈利天数 - 累计' : 'Winning days - cumulative', shortLabel: language === 'cn' ? '盈利天数' : 'Winning days', mode: 'cumulative', format: 'number', visual: 'bar', color: '#55c39e', getDailyValue: (day) => day.pnl > 0 ? 1 : 0 },
  };

  const performanceSummary = useMemo(() => {
      const closedTrades = trades.filter(t => t.status !== TradeStatus.OPEN && t.exitDate);
      const tradesWithRisk = closedTrades.filter(t => t.riskAmount && t.riskAmount > 0);
      const totalPlannedR = tradesWithRisk.reduce((acc, t) => {
          const plannedTarget = typeof t.profitTarget === 'number' && typeof t.entryPrice === 'number' ? Math.abs(t.profitTarget - t.entryPrice) * (t.quantity || 0) : 0;
          return acc + (plannedTarget > 0 && t.riskAmount ? plannedTarget / t.riskAmount : 0);
      }, 0);
      const avgPlannedR = tradesWithRisk.length > 0 ? totalPlannedR / tradesWithRisk.length : null;
      const losingDays = performanceDailyData.filter(d => d.pnl < 0);
      const maxDailyNetDrawdown = losingDays.length ? Math.min(...losingDays.map(d => d.pnl)) : 0;
      const avgDailyNetDrawdown = losingDays.length ? losingDays.reduce((acc, d) => acc + d.pnl, 0) / losingDays.length : 0;
      const avgDailyWinPct = performanceDailyData.length > 0
          ? performanceDailyData.reduce((acc, d) => acc + d.winRate, 0) / performanceDailyData.length
          : 0;
      const avgTradeWinLoss = stats && stats.avgLoss < 0 ? Math.abs(stats.avgWin / stats.avgLoss) : stats && stats.avgWin > 0 ? stats.avgWin : 0;
      const validDailyWinLoss = performanceDailyData.filter(d => d.hasAvgDailyWinLoss && d.avgDailyWinLoss > 0);
      const avgDailyWinLoss = validDailyWinLoss.length > 0
          ? validDailyWinLoss.reduce((acc, d) => acc + d.avgDailyWinLoss, 0) / validDailyWinLoss.length
          : 0;

      return {
          avgPlannedR,
          maxDailyNetDrawdown,
          avgDailyNetDrawdown,
          avgDailyWinPct,
          avgTradeWinLoss,
          avgDailyWinLoss,
      };
  }, [trades, performanceDailyData, stats]);

  const daysSummary = useMemo(() => {
      const totalDays = performanceDailyData.length;
      const winningDays = performanceDailyData.filter(day => day.pnl > 0);
      const losingDays = performanceDailyData.filter(day => day.pnl < 0);
      const breakevenDays = performanceDailyData.filter(day => day.pnl === 0);
      const largestProfitableDay = winningDays.length > 0 ? winningDays.reduce((best, day) => day.pnl > best.pnl ? day : best, winningDays[0]) : null;
      const largestLosingDay = losingDays.length > 0 ? losingDays.reduce((worst, day) => day.pnl < worst.pnl ? day : worst, losingDays[0]) : null;
      const averageTradingDayDurationMs = totalDays > 0 ? 24 * 60 * 60 * 1000 : 0;

      return {
          totalDays,
          largestProfitableDay,
          largestLosingDay,
          averageTradingDayDurationMs,
          winDayPct: totalDays > 0 ? (winningDays.length / totalDays) * 100 : 0,
          lossDayPct: totalDays > 0 ? (losingDays.length / totalDays) * 100 : 0,
          breakevenDayPct: totalDays > 0 ? (breakevenDays.length / totalDays) * 100 : 0,
      };
  }, [performanceDailyData]);

  const tradesSummary = useMemo(() => {
      const closedTrades = trades.filter(trade => trade.status !== TradeStatus.OPEN && trade.exitDate);
      const winningTrades = closedTrades.filter(trade => trade.pnl > 0);
      const losingTrades = closedTrades.filter(trade => trade.pnl < 0);
      const breakevenTrades = closedTrades.filter(trade => trade.pnl === 0);
      const longestTradeDuration = closedTrades.length > 0
          ? Math.max(...closedTrades.map(trade => new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()).filter(duration => duration > 0), 0)
          : 0;

      return {
          totalClosed: closedTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          breakevenTrades: breakevenTrades.length,
          longestTradeDuration,
          winTradePct: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
          lossTradePct: closedTrades.length > 0 ? (losingTrades.length / closedTrades.length) * 100 : 0,
          breakevenTradePct: closedTrades.length > 0 ? (breakevenTrades.length / closedTrades.length) * 100 : 0,
      };
  }, [trades]);

  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerateReport = async (period: 'weekly' | 'monthly') => {
      if (!currentUserId) return;

      setIsGeneratingReport(true);
      try {
          const periodLabel = period === 'weekly'
              ? (language === 'cn' ? '周报' : 'Weekly Report')
              : (language === 'cn' ? '月报' : 'Monthly Report');
          const title = `${periodLabel} - ${new Date().toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US')}`;

          // 先创建 pending 状态的报告记录
          const newReport = await saveReport({
              user_id: currentUserId,
              report_type: period,
              title,
              status: 'pending',
              content: {
                  html: '',
                  period,
                  generated_at: new Date().toISOString(),
                  metadata: {
                      trades,
                      plans,
                      disciplineHistory,
                      riskSettings,
                      language
                  }
              }
          });

          // 立即刷新列表显示 pending 状态
          loadReports(currentUserId);

          // 后台异步生成报告
          fetch('/api/generate-report-background', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reportId: newReport.id })
          }).catch(err => console.error('Background generation failed:', err));

      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingReport(false);
      }
  };

  const handleViewReport = (report: Report) => {
      setViewingReport(report);
      setReportResult(report.content.html);
  };

  const handleDeleteReport = async (reportId: string) => {
      if (!confirm(language === 'cn' ? '确定删除此报告？' : 'Delete this report?')) return;
      try {
          await deleteReport(reportId);
          if (currentUserId) loadReports(currentUserId);
          if (viewingReport?.id === reportId) {
              setViewingReport(null);
              setReportResult(null);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleRetryReport = async (reportId: string) => {
      try {
          await fetch('/api/generate-report-background', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reportId })
          });
          if (currentUserId) loadReports(currentUserId);
      } catch (e) {
          console.error(e);
      }
  };

  const renderReportCard = (report: Report) => {
      const isPending = report.status === 'pending';
      const isFailed = report.status === 'failed';
      const isCompleted = report.status === 'completed';

      return (
          <div key={report.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-4 transition-all group ${
              isPending ? 'border-amber-300 dark:border-amber-700' :
              isFailed ? 'border-rose-300 dark:border-rose-700' :
              'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
          }`}>
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isPending ? 'bg-amber-100 dark:bg-amber-900/30' :
                          isFailed ? 'bg-rose-100 dark:bg-rose-900/30' :
                          report.report_type === 'weekly' ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}>
                          {isPending ? (
                              <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
                          ) : isFailed ? (
                              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                          ) : report.report_type === 'weekly' ? (
                              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          )}
                      </div>
                      <div className="flex-1">
                          <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{report.title}</h5>
                          <p className="text-xs text-slate-500 mt-0.5">
                              {isPending ? (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      {language === 'cn' ? '生成中...' : 'Generating...'}
                                  </span>
                              ) : isFailed ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                      {language === 'cn' ? '生成失败' : 'Generation failed'}
                                  </span>
                              ) : (
                                  new Date(report.created_at).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', {
                                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })
                              )}
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      {isCompleted && (
                          <>
                              <button
                                  onClick={() => handleViewReport(report)}
                                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                  title={language === 'cn' ? '查看' : 'View'}
                              >
                                  <Eye className="w-4 h-4" />
                              </button>
                              <button
                                  onClick={() => {
                                      setReportResult(report.content.html);
                                      setTimeout(handleDownloadPdf, 100);
                                  }}
                                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                  title={language === 'cn' ? '下载' : 'Download'}
                              >
                                  <Download className="w-4 h-4" />
                              </button>
                          </>
                      )}
                      {isFailed && (
                          <button
                              onClick={() => handleRetryReport(report.id)}
                              className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                              {language === 'cn' ? '重试' : 'Retry'}
                          </button>
                      )}
                      <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          title={language === 'cn' ? '删除' : 'Delete'}
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const handleDownloadPdf = () => {
      if (!reportRef.current) return;
      const htmlEl = document.documentElement;
      const wasDark = htmlEl.classList.contains('dark');
      if (wasDark) htmlEl.classList.remove('dark');

      const date = new Date().toISOString().split('T')[0];
      const reportHtml = reportRef.current.innerHTML;
      const blob = new Blob([
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TradeGrail_Performance_Report_${date}</title>` +
          `<style>@page{margin:15mm 18mm;size:A4}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>` +
          `</head><body>${reportHtml}</body></html>`
      ], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (!printWindow) { URL.revokeObjectURL(url); if (wasDark) htmlEl.classList.add('dark'); return; }
      printWindow.addEventListener('load', () => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => { printWindow.close(); URL.revokeObjectURL(url); if (wasDark) htmlEl.classList.add('dark'); }, 500);
      });
  };

  const DataRow = ({ label, value, colorClass = "text-slate-900 dark:text-white" }: { label: string, value: string | number, colorClass?: string }) => (
      <div className="flex justify-between items-center py-2.5 px-3 border-b border-slate-100 dark:border-slate-800 last:border-0 odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50 dark:even:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
          <span className={`text-sm font-bold font-mono ${colorClass}`}>{value}</span>
      </div>
  );

  const formatMoney = (value: number, compact = false) => {
      const abs = Math.abs(value);
      const formatted = compact && abs >= 1000
          ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
          : abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${value < 0 ? '-' : ''}$${formatted}`;
  };

  const formatSignedMoney = (value: number) => `${value >= 0 ? '' : '-'}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartCategoryLabels: Record<'time' | 'profitability' | 'risk' | 'activity' | 'streaks', string> = {
      time: language === 'cn' ? '时间分析' : 'Time Analysis',
      profitability: language === 'cn' ? '盈利能力' : 'Profitability',
      risk: language === 'cn' ? '风险与回撤' : 'Risk & Drawdown',
      activity: language === 'cn' ? '交易活动与成交量' : 'Trading Activity & Volume',
      streaks: language === 'cn' ? '连续性与稳定性' : 'Streaks & Consistency',
  };

  const chartMetricCategoryOrder: Array<'time' | 'profitability' | 'risk' | 'activity' | 'streaks'> = ['time', 'profitability', 'risk', 'activity', 'streaks'];
  const chartMetricOptions = (Object.entries(chartMetricConfigs) as Array<[SummaryMetricId, NonNullable<typeof chartMetricConfigs[SummaryMetricId]>]>)
      .filter(([, config]) => Boolean(config));
  const normalizedChartMetricPickerSearch = chartMetricPickerSearch.trim().toLowerCase();
  const visibleChartMetricCategories = chartMetricCategoryOrder
      .map(category => ({
          id: category,
          label: chartCategoryLabels[category],
          metrics: chartMetricOptions
              .filter(([, config]) => config.category === category)
              .filter(([, config]) => !normalizedChartMetricPickerSearch || config.label.toLowerCase().includes(normalizedChartMetricPickerSearch)),
      }))
      .filter(category => category.metrics.length > 0);

  const formatChartMetricValue = (value: number, format: ChartMetricFormat, compact = false) => {
      if (!Number.isFinite(value)) return '--';
      if (format === 'money') return formatMoney(value, compact);
      if (format === 'percent') return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
      if (format === 'duration') return compact ? formatCompactDuration(value) : formatDuration(value);
      return compact && Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(Math.abs(value) >= 10000 ? 0 : 1)}k` : Number(value.toFixed(value < 10 && value !== 0 ? 2 : 0)).toLocaleString();
  };

  const formatCompactDuration = (ms: number) => {
      if (isNaN(ms) || ms === 0) return 'N/A';
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (language === 'cn') {
          if (days > 0) return `${days}天${hours % 24}时`;
          if (hours > 0) return `${hours}时${minutes % 60}分`;
          return `${minutes}分`;
      }

      if (days > 0) return `${days}d${hours % 24}h`;
      if (hours > 0) return `${hours}h${minutes % 60}m`;
      return `${minutes}m`;
  };

  const getCompactDurationLabelLines = (ms: number) => {
      if (isNaN(ms) || ms === 0) return ['N/A'];
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (language === 'cn') {
          if (days > 0) return [`${days}天`, `${hours % 24}小时`];
          if (hours > 0) return [`${hours}小时`, `${minutes % 60}分`];
          return [`${minutes}分钟`];
      }

      if (days > 0) return [`${days}d`, `${hours % 24}h`];
      if (hours > 0) return [`${hours}h`, `${minutes % 60}m`];
      return [`${minutes}m`];
  };

  const ChartYAxisTick = ({
      x = 0,
      y = 0,
      payload,
      format,
      colors,
      orientation = 'left',
  }: {
      x?: number;
      y?: number;
      payload?: { value?: number };
      format: ChartMetricFormat;
      colors: string[];
      orientation?: 'left' | 'right';
  }) => {
      const value = Number(payload?.value ?? 0);
      const lines = format === 'duration'
          ? getCompactDurationLabelLines(value)
          : [formatChartMetricValue(value, format, true)];
      const textAnchor = orientation === 'right' ? 'start' : 'end';
      const firstLineOffset = lines.length > 1 ? -3 : 4;
      const dotY = y;
      const dotStartX = orientation === 'right' ? x - 10 : x + 8;
      const dotDirection = orientation === 'right' ? -1 : 1;
      const axisLabelColor = '#7c8490';

      return (
          <g>
              <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fill={axisLabelColor}
                  fontSize={11}
                  fontWeight={500}
                  dominantBaseline="middle"
              >
                  {lines.map((line, index) => (
                      <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? firstLineOffset : 13}>
                          {line}
                      </tspan>
                  ))}
              </text>
              {colors.map((color, index) => (
                  <circle
                      key={`${color}-${index}`}
                      cx={dotStartX + index * 7 * dotDirection}
                      cy={dotY}
                      r={2.4}
                      fill={color}
                  />
              ))}
          </g>
      );
  };

  const ReportChartHorizontalGrid = (props: any) => {
      const offset = props?.offset;
      if (!offset) return null;

      const lineCount = 5;
      const width = offset.width || 0;
      const height = offset.height || 0;
      if (width <= 0 || height <= 0) return null;

      return (
          <g aria-hidden="true">
              {Array.from({ length: lineCount }, (_, index) => {
                  const y = offset.top + (height * index) / (lineCount - 1);
                  return (
                      <line
                          key={`report-grid-${index}`}
                          x1={offset.left}
                          x2={offset.left + width}
                          y1={y}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeOpacity={0.82}
                          strokeDasharray="5 5"
                      />
                  );
              })}
          </g>
      );
  };

  const getChartPeriodStartDate = (date: string, timeframe: ChartTimeframe) => {
      const value = new Date(`${date}T00:00:00`);
      if (timeframe === 'week') {
          value.setDate(value.getDate() - value.getDay());
      } else if (timeframe === 'month') {
          value.setDate(1);
      }
      value.setHours(0, 0, 0, 0);
      return value.toLocaleDateString('en-CA');
  };

  const formatChartPeriodLabel = (date: string, timeframe: ChartTimeframe) => {
      const d = new Date(`${date}T00:00:00`);

      if (timeframe === 'month') {
          if (language === 'cn') return `${d.getMonth() + 1}月`;
          return d.toLocaleDateString('en-US', { month: 'short' });
      }

      if (timeframe === 'week') {
          const month = d.getMonth() + 1;
          const day = d.getDate();
          if (language === 'cn') return `${month}月${day}日周`;
          return `Wk ${formatChartDateLabel(date)}`;
      }

      if (language === 'cn') {
          return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
      }

      return formatChartDateLabel(date);
  };

  const getChartSourceData = (timeframe: ChartTimeframe) => {
      if (timeframe === 'day') {
          return performanceDailyData.map(day => ({
              ...day,
              label: formatChartPeriodLabel(day.date, timeframe),
          }));
      }

      const grouped = new Map<string, typeof performanceDailyData[number]>();

      performanceDailyData.forEach(day => {
          const periodDate = getChartPeriodStartDate(day.date, timeframe);
          const current = grouped.get(periodDate);

          if (!current) {
              grouped.set(periodDate, {
                  ...day,
                  date: periodDate,
                  label: formatChartPeriodLabel(periodDate, timeframe),
                  cumulativePnl: 0,
              });
              return;
          }

          grouped.set(periodDate, {
              ...current,
              pnl: current.pnl + day.pnl,
              count: current.count + day.count,
              wins: current.wins + day.wins,
              losses: current.losses + day.losses,
              winPnl: current.winPnl + day.winPnl,
              lossPnl: current.lossPnl + day.lossPnl,
              volume: current.volume + day.volume,
              closedTradeCount: current.closedTradeCount + day.closedTradeCount,
              holdDurationTotal: current.holdDurationTotal + day.holdDurationTotal,
              longestTradeDuration: Math.max(current.longestTradeDuration, day.longestTradeDuration),
              loggedDayCount: current.loggedDayCount + day.loggedDayCount,
              periodDurationMs: current.periodDurationMs + day.periodDurationMs,
          });
      });

      let cumulativePnl = 0;
      return Array.from(grouped.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(period => {
              cumulativePnl += period.pnl;
              const avgWin = period.wins > 0 ? period.winPnl / period.wins : 0;
              const avgLoss = period.losses > 0 ? period.lossPnl / period.losses : 0;
              const hasAvgDailyWinLoss = avgWin > 0 && avgLoss < 0;
              const avgDailyWinLoss = hasAvgDailyWinLoss ? Math.abs(avgWin / avgLoss) : 0;

              return {
                  ...period,
                  pnl: Number(period.pnl.toFixed(2)),
                  cumulativePnl: Number(cumulativePnl.toFixed(2)),
                  winRate: period.count > 0 ? (period.wins / period.count) * 100 : 0,
                  avgDailyWinLoss: Number(avgDailyWinLoss.toFixed(2)),
                  hasAvgDailyWinLoss,
              };
          });
  };

  const buildChartMetricData = (metricId: SummaryMetricId, timeframe: ChartTimeframe) => {
      const config = chartMetricConfigs[metricId] || chartMetricConfigs.netPnl!;
      const source = getChartSourceData(timeframe).filter(day => config.includeDay ? config.includeDay(day) : true);
      let cumulative = 0;
      let cumulativeCount = 0;
      let cumulativeWins = 0;
      let cumulativeLosses = 0;
      let cumulativeWinPnl = 0;
      let cumulativeLossPnl = 0;
      let cumulativeClosedTradeCount = 0;
      let cumulativeHoldDurationTotal = 0;
      let runningMin = 0;
      let runningMax = 0;

      const rows = source.map((day, index) => {
          const dailyValue = config.getDailyValue(day);
          cumulative += dailyValue;
          cumulativeCount += day.count;
          cumulativeWins += day.wins;
          cumulativeLosses += day.losses;
          cumulativeWinPnl += day.winPnl;
          cumulativeLossPnl += day.lossPnl;
          cumulativeClosedTradeCount += day.closedTradeCount;
          cumulativeHoldDurationTotal += day.holdDurationTotal;
          runningMin = Math.min(runningMin, dailyValue);
          runningMax = Math.max(runningMax, dailyValue);

          let value = dailyValue;
          if (config.mode === 'cumulative') {
              if (metricId === 'avgDailyNetPnl') value = cumulative / (index + 1);
              else if (metricId === 'avgLoss') value = cumulativeLosses > 0 ? cumulativeLossPnl / cumulativeLosses : 0;
              else if (metricId === 'avgWin') value = cumulativeWins > 0 ? cumulativeWinPnl / cumulativeWins : 0;
              else if (metricId === 'avgNetTradePnl' || metricId === 'tradeExpectancy') value = cumulativeCount > 0 ? cumulative / cumulativeCount : 0;
              else if (metricId === 'avgDailyNetDrawdown') {
                  const losingRows = source.slice(0, index + 1).filter(row => row.pnl < 0);
                  value = losingRows.length > 0 ? losingRows.reduce((acc, row) => acc + row.pnl, 0) / losingRows.length : 0;
              }
              else if (metricId === 'maxDailyNetDrawdown') value = runningMin;
              else if (metricId === 'profitFactor') value = Math.abs(cumulativeLossPnl) > 0 ? cumulativeWinPnl / Math.abs(cumulativeLossPnl) : cumulativeWinPnl > 0 ? cumulativeWinPnl : 0;
              else if (metricId === 'avgTradeWinLoss') {
                  const avgWin = cumulativeWins > 0 ? cumulativeWinPnl / cumulativeWins : 0;
                  const avgLoss = cumulativeLosses > 0 ? cumulativeLossPnl / cumulativeLosses : 0;
                  value = avgWin > 0 && avgLoss < 0 ? Math.abs(avgWin / avgLoss) : 0;
              }
              else if (metricId === 'winPct') value = cumulativeCount > 0 ? (cumulativeWins / cumulativeCount) * 100 : 0;
              else if (metricId === 'avgDailyWinPct') {
                  const currentRows = source.slice(0, index + 1);
                  value = currentRows.length > 0 ? currentRows.reduce((acc, row) => acc + row.winRate, 0) / currentRows.length : 0;
              }
              else if (metricId === 'avgTradingDaysDuration' || metricId === 'maxTradingDaysDuration') value = cumulative;
              else if (metricId === 'avgHoldTime') value = cumulativeClosedTradeCount > 0 ? cumulativeHoldDurationTotal / cumulativeClosedTradeCount : 0;
              else if (metricId === 'longestTradeDuration') value = runningMax;
              else value = cumulative;
          }

          return {
              ...day,
              label: formatChartPeriodLabel(day.date, timeframe),
              value: Number(value.toFixed(4)),
          };
      });

      return rows;
  };

  const getChartMetricDisplayData = (metricId: SummaryMetricId, visualOverride: ChartMetricVisual | undefined, timeframe: ChartTimeframe) => {
      const data = buildChartMetricData(metricId, timeframe);
      const targetCount = (visualOverride || chartMetricConfigs[metricId]?.visual) === 'bar' ? 7 : 9;
      const indexes = getEvenlySpacedIndexes(data.length, targetCount);
      return indexes.map(index => data[index]).filter(Boolean);
  };

  const leftChartConfig = chartMetricConfigs[leftChartMetricId] || chartMetricConfigs.netPnl!;
  const leftSecondaryChartConfig = leftSecondaryChartMetricId ? chartMetricConfigs[leftSecondaryChartMetricId] : null;
  const leftTertiaryChartConfig = leftTertiaryChartMetricId ? chartMetricConfigs[leftTertiaryChartMetricId] : null;
  const rightChartConfig = chartMetricConfigs[rightChartMetricId] || chartMetricConfigs.avgDailyWinLoss!;
  const rightSecondaryChartConfig = rightSecondaryChartMetricId ? chartMetricConfigs[rightSecondaryChartMetricId] : null;
  const rightTertiaryChartConfig = rightTertiaryChartMetricId ? chartMetricConfigs[rightTertiaryChartMetricId] : null;
  const getChartVisual = (side: ChartSide, slot: ChartMetricSlot, config: typeof leftChartConfig): ChartMetricVisual => chartStyleSettings[side][slot]?.visual || config.visual;
  const getChartColor = (side: ChartSide, slot: ChartMetricSlot, config: typeof leftChartConfig): string => chartStyleSettings[side][slot]?.color || config.color;
  const leftChartVisual = getChartVisual('left', 'primary', leftChartConfig);
  const leftSecondaryChartVisual = leftSecondaryChartConfig ? getChartVisual('left', 'secondary', leftSecondaryChartConfig) : null;
  const leftTertiaryChartVisual = leftTertiaryChartConfig ? getChartVisual('left', 'tertiary', leftTertiaryChartConfig) : null;
  const rightChartVisual = getChartVisual('right', 'primary', rightChartConfig);
  const rightSecondaryChartVisual = rightSecondaryChartConfig ? getChartVisual('right', 'secondary', rightSecondaryChartConfig) : null;
  const rightTertiaryChartVisual = rightTertiaryChartConfig ? getChartVisual('right', 'tertiary', rightTertiaryChartConfig) : null;
  const leftChartColor = getChartColor('left', 'primary', leftChartConfig);
  const leftSecondaryChartColor = leftSecondaryChartConfig ? getChartColor('left', 'secondary', leftSecondaryChartConfig) : '#55c39e';
  const leftTertiaryChartColor = leftTertiaryChartConfig ? getChartColor('left', 'tertiary', leftTertiaryChartConfig) : '#f59f00';
  const rightChartColor = getChartColor('right', 'primary', rightChartConfig);
  const rightSecondaryChartColor = rightSecondaryChartConfig ? getChartColor('right', 'secondary', rightSecondaryChartConfig) : '#55c39e';
  const rightTertiaryChartColor = rightTertiaryChartConfig ? getChartColor('right', 'tertiary', rightTertiaryChartConfig) : '#f59f00';

  const buildCombinedChartData = (
      primaryMetricId: SummaryMetricId,
      primaryVisual: ChartMetricVisual,
      secondaryMetricId: SummaryMetricId | null,
      secondaryVisual: ChartMetricVisual | null,
      tertiaryMetricId: SummaryMetricId | null,
      tertiaryVisual: ChartMetricVisual | null,
      timeframe: ChartTimeframe,
  ) => {
      const primaryRows = getChartMetricDisplayData(primaryMetricId, primaryVisual, timeframe);
      const secondaryRows = secondaryMetricId ? getChartMetricDisplayData(secondaryMetricId, secondaryVisual || undefined, timeframe) : [];
      const tertiaryRows = tertiaryMetricId ? getChartMetricDisplayData(tertiaryMetricId, tertiaryVisual || undefined, timeframe) : [];
      const rowMap = new Map<string, any>();

      primaryRows.forEach(row => {
          rowMap.set(row.date, { ...row, primaryValue: row.value });
      });

      secondaryRows.forEach(row => {
          const existing = rowMap.get(row.date) || { ...row };
          rowMap.set(row.date, {
              ...existing,
              date: row.date,
              label: row.label,
              secondaryValue: row.value,
          });
      });

      tertiaryRows.forEach(row => {
          const existing = rowMap.get(row.date) || { ...row };
          rowMap.set(row.date, {
              ...existing,
              date: row.date,
              label: row.label,
              tertiaryValue: row.value,
          });
      });

      return Array.from(rowMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const leftChartData = useMemo(
      () => buildCombinedChartData(leftChartMetricId, leftChartVisual, leftSecondaryChartMetricId, leftSecondaryChartVisual, leftTertiaryChartMetricId, leftTertiaryChartVisual, chartTimeframes.left),
      [leftChartMetricId, leftChartVisual, leftSecondaryChartMetricId, leftSecondaryChartVisual, leftTertiaryChartMetricId, leftTertiaryChartVisual, chartTimeframes.left, performanceDailyData]
  );
  const rightChartData = useMemo(
      () => buildCombinedChartData(rightChartMetricId, rightChartVisual, rightSecondaryChartMetricId, rightSecondaryChartVisual, rightTertiaryChartMetricId, rightTertiaryChartVisual, chartTimeframes.right),
      [rightChartMetricId, rightChartVisual, rightSecondaryChartMetricId, rightSecondaryChartVisual, rightTertiaryChartMetricId, rightTertiaryChartVisual, chartTimeframes.right, performanceDailyData]
  );
  const leftChartTicks = useMemo(
      () => getEvenlySpacedIndexes(leftChartData.length, 6).map(index => leftChartData[index]?.label).filter(Boolean),
      [leftChartData]
  );
  const rightChartTicks = useMemo(
      () => getEvenlySpacedIndexes(rightChartData.length, 6).map(index => rightChartData[index]?.label).filter(Boolean),
      [rightChartData]
  );
  const leftChartStyleMetrics = useMemo(() => [
      { slot: 'primary' as const, config: leftChartConfig, visual: leftChartVisual, color: leftChartColor },
      ...(leftSecondaryChartConfig && leftSecondaryChartVisual ? [{ slot: 'secondary' as const, config: leftSecondaryChartConfig, visual: leftSecondaryChartVisual, color: leftSecondaryChartColor }] : []),
      ...(leftTertiaryChartConfig && leftTertiaryChartVisual ? [{ slot: 'tertiary' as const, config: leftTertiaryChartConfig, visual: leftTertiaryChartVisual, color: leftTertiaryChartColor }] : []),
  ], [leftChartConfig, leftChartVisual, leftChartColor, leftSecondaryChartConfig, leftSecondaryChartVisual, leftSecondaryChartColor, leftTertiaryChartConfig, leftTertiaryChartVisual, leftTertiaryChartColor]);
  const rightChartStyleMetrics = useMemo(() => [
      { slot: 'primary' as const, config: rightChartConfig, visual: rightChartVisual, color: rightChartColor },
      ...(rightSecondaryChartConfig && rightSecondaryChartVisual ? [{ slot: 'secondary' as const, config: rightSecondaryChartConfig, visual: rightSecondaryChartVisual, color: rightSecondaryChartColor }] : []),
      ...(rightTertiaryChartConfig && rightTertiaryChartVisual ? [{ slot: 'tertiary' as const, config: rightTertiaryChartConfig, visual: rightTertiaryChartVisual, color: rightTertiaryChartColor }] : []),
  ], [rightChartConfig, rightChartVisual, rightChartColor, rightSecondaryChartConfig, rightSecondaryChartVisual, rightSecondaryChartColor, rightTertiaryChartConfig, rightTertiaryChartVisual, rightTertiaryChartColor]);
  const assignChartAxes = (metrics: typeof leftChartStyleMetrics) => {
      const axisByFormat = new Map<ChartMetricFormat, string>();
      let leftAxisCount = 0;
      let rightAxisCount = 0;

      return metrics.map((metric, index) => {
          const format = metric.config.format;
          const existingAxisId = axisByFormat.get(format);
          let axisId = existingAxisId;

          if (!axisId) {
              const orientation = index === 0 || leftAxisCount <= rightAxisCount ? 'left' : 'right';
              const axisIndex = orientation === 'left' ? leftAxisCount++ : rightAxisCount++;
              axisId = `${orientation}-${format}-${axisIndex}`;
              axisByFormat.set(format, axisId);
          }

          return {
              ...metric,
              dataKey: index === 0 ? 'primaryValue' as const : index === 1 ? 'secondaryValue' as const : 'tertiaryValue' as const,
              yAxisId: axisId,
          };
      });
  };

  const leftChartRenderMetrics = useMemo(() => assignChartAxes(leftChartStyleMetrics), [leftChartStyleMetrics]);
  const rightChartRenderMetrics = useMemo(() => assignChartAxes(rightChartStyleMetrics), [rightChartStyleMetrics]);
  const chartAnimationSignature = useMemo(() => {
      const getChartDataSignature = (data: typeof leftChartData) => data
          .map(row => `${row.date}:${row.primaryValue ?? ''}:${row.secondaryValue ?? ''}:${row.tertiaryValue ?? ''}`)
          .join('|');

      return [
          leftChartMetricId,
          leftSecondaryChartMetricId || 'none',
          leftTertiaryChartMetricId || 'none',
          leftChartVisual,
          leftSecondaryChartVisual || 'none',
          leftTertiaryChartVisual || 'none',
          leftChartColor,
          leftSecondaryChartColor,
          leftTertiaryChartColor,
          getChartDataSignature(leftChartData),
          rightChartMetricId,
          rightSecondaryChartMetricId || 'none',
          rightTertiaryChartMetricId || 'none',
          rightChartVisual,
          rightSecondaryChartVisual || 'none',
          rightTertiaryChartVisual || 'none',
          rightChartColor,
          rightSecondaryChartColor,
          rightTertiaryChartColor,
          getChartDataSignature(rightChartData),
      ].join('||');
  }, [
      leftChartMetricId,
      leftSecondaryChartMetricId,
      leftTertiaryChartMetricId,
      leftChartVisual,
      leftSecondaryChartVisual,
      leftTertiaryChartVisual,
      leftChartColor,
      leftSecondaryChartColor,
      leftTertiaryChartColor,
      leftChartData,
      rightChartMetricId,
      rightSecondaryChartMetricId,
      rightTertiaryChartMetricId,
      rightChartVisual,
      rightSecondaryChartVisual,
      rightTertiaryChartVisual,
      rightChartColor,
      rightSecondaryChartColor,
      rightTertiaryChartColor,
      rightChartData,
  ]);
  const previousChartAnimationSignatureRef = useRef<string | null>(null);
  const [shouldAnimateCharts, setShouldAnimateCharts] = useState(true);

  useEffect(() => {
      const hasChartChanged = previousChartAnimationSignatureRef.current !== chartAnimationSignature;
      previousChartAnimationSignatureRef.current = chartAnimationSignature;

      if (hasChartChanged) {
          setShouldAnimateCharts(true);
      }

      const timer = window.setTimeout(() => {
          setShouldAnimateCharts(false);
      }, 700);

      return () => window.clearTimeout(timer);
  }, [chartAnimationSignature]);

  function formatChartDateLabel(date: string) {
      const d = new Date(`${date}T00:00:00`);
      if (language === 'cn') {
          return `${d.getMonth() + 1}月${d.getDate()}日`;
      }

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  }

  function getEvenlySpacedIndexes(length: number, targetCount: number) {
      if (length <= 0) return [];
      if (length <= targetCount) return Array.from({ length }, (_, i) => i);

      const indexes = new Set<number>();
      for (let i = 0; i < targetCount; i++) {
          indexes.add(Math.round((i * (length - 1)) / (targetCount - 1)));
      }

      return Array.from(indexes).sort((a, b) => a - b);
  }

  const reportPanelClass = "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  const reportControlClass = "h-9 inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors";

  const ReportCardLoadingOverlay = ({ radius = 8 }: { radius?: number }) => {
      if (!isDataLoading) return null;
      return (
          <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 backdrop-blur-[1px] dark:bg-slate-900/95"
              style={{ borderRadius: radius, cursor: 'wait' }}
              aria-label="Loading report data"
          >
              <div className="h-8 w-8 rounded-full border-[3px] border-indigo-200 border-t-indigo-600 animate-spin" />
          </div>
      );
  };

  const chartStyleColors = ['#3d63dd', '#6b55cf', '#f59f00', '#55c39e', '#ff6468'];
  const chartVisualOptions: Array<{ id: ChartMetricVisual; label: string }> = [
      { id: 'line', label: language === 'cn' ? '线型图' : 'Line' },
      { id: 'area', label: language === 'cn' ? '面积图' : 'Area' },
      { id: 'bar', label: language === 'cn' ? '柱状图' : 'Column' },
  ];
  const chartTimeframeOptions: Array<{ id: ChartTimeframe; label: string }> = [
      { id: 'day', label: language === 'cn' ? '日' : 'Day' },
      { id: 'week', label: language === 'cn' ? '周' : 'Week' },
      { id: 'month', label: language === 'cn' ? '月' : 'Month' },
  ];

  const datePresets = [
      { id: 'All Time', label: language === 'cn' ? '所有时间' : 'All Time' },
      { id: 'Today', label: language === 'cn' ? '今天' : 'Today' },
      { id: 'Yesterday', label: language === 'cn' ? '昨天' : 'Yesterday' },
      { id: 'This Week', label: language === 'cn' ? '本周' : 'This Week' },
      { id: 'Last Month', label: language === 'cn' ? '上个月' : 'Last Month' },
      { id: 'Last 30 Days', label: language === 'cn' ? '最近30天' : 'Last 30 Days' },
      { id: 'This Quarter', label: language === 'cn' ? '本季度' : 'This Quarter' },
      { id: 'YTD', label: language === 'cn' ? '今年以来' : 'YTD' },
  ];

  const getActiveDatePresetLabel = () => {
      if (activeDatePreset === 'Custom') return language === 'cn' ? '自定义范围' : 'Custom range';
      return datePresets.find(preset => preset.id === activeDatePreset)?.label || activeDatePreset;
  };

  const getDateButtonValue = () => {
      if (activeDatePreset === 'All Time' || activeDatePreset === '所有时间') {
          return language === 'cn' ? '所有时间' : 'All Time';
      }

      return `${dateRange.start.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US')} - ${dateRange.end.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US')}`;
  };

  const handlePresetSelect = (preset: string) => {
      setActiveDatePreset(preset);
      let { start, end } = getRange('today');

      if (preset === 'All Time' || preset === '所有时间') {
          start = new Date(0);
          end = new Date(9999, 11, 31);
      } else if (preset === 'Yesterday') {
          start.setDate(start.getDate() - 1);
          end.setDate(end.getDate() - 1);
          end.setHours(23, 59, 59, 999);
      } else if (preset === 'This Week') {
          start.setDate(start.getDate() - start.getDay());
          start.setHours(0, 0, 0, 0);
      } else if (preset === 'Last Month') {
          start = new Date(start.getFullYear(), start.getMonth() - 1, 1);
          end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
      } else if (preset === 'Last 30 Days') {
          const range = getRange('last30');
          start = range.start;
          end = range.end;
      } else if (preset === 'This Quarter') {
          const now = new Date();
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
          start = new Date(now.getFullYear(), quarterStartMonth, 1);
          start.setHours(0, 0, 0, 0);
          end = new Date();
      } else if (preset === 'YTD') {
          const now = new Date();
          start = new Date(now.getFullYear(), 0, 1);
          start.setHours(0, 0, 0, 0);
          end = new Date();
      }

      setDateRange({ start, end });
      setIsDatePickerOpen(false);
  };

  const getDaysInMonth = (date: Date) => ({
      days: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      firstDay: new Date(date.getFullYear(), date.getMonth(), 1).getDay(),
  });

  const renderMiniCalendar = (baseDate: Date) => {
      const { days, firstDay } = getDaysInMonth(baseDate);
      const dayCells = [];

      for (let i = 0; i < firstDay; i++) {
          dayCells.push(<div key={`empty-${i}`} className="h-8 w-8" />);
      }

      for (let day = 1; day <= days; day++) {
          const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
          const isSelected = current >= dateRange.start && current <= dateRange.end;
          const isStart = current.toDateString() === dateRange.start.toDateString();
          const isEnd = current.toDateString() === dateRange.end.toDateString();

          dayCells.push(
              <button
                  key={day}
                  type="button"
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${
                      isStart || isEnd
                          ? 'bg-indigo-600 font-bold text-white'
                          : isSelected
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
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
                  {day}
              </button>
          );
      }

      return (
          <div className="w-full">
              <div className="mb-2 text-center text-sm font-bold text-slate-700 dark:text-slate-200">
                  {baseDate.toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short' })} {baseDate.getFullYear()}
              </div>
              <div className="grid grid-cols-7 justify-items-center gap-y-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <div key={`${day}-${index}`} className="text-[10px] font-bold text-slate-400">{day}</div>
                  ))}
                  {dayCells}
              </div>
          </div>
      );
  };

  const currentAccountName = selectedAccountId === 'all'
      ? (language === 'cn' ? '所有账户' : 'All Accounts')
      : accounts.find(account => account.id === selectedAccountId)?.name || (language === 'cn' ? '未知账户' : 'Unknown');

  const updateChartStyle = (side: ChartSide, slot: ChartMetricSlot, patch: NonNullable<ChartStyleSettings[ChartSide][ChartMetricSlot]>) => {
      setChartStyleSettings(current => ({
          ...current,
          [side]: {
              ...current[side],
              [slot]: {
                  ...current[side][slot],
                  ...patch,
              },
          },
      }));
  };

  const ChartStyleMenu = ({
      side,
      metrics,
  }: {
      side: ChartSide;
      metrics: Array<{
          slot: ChartMetricSlot;
          config: typeof leftChartConfig;
          visual: ChartMetricVisual;
          color: string;
      }>;
  }) => {
      const isOpen = openChartStyleMenu === side;

      return (
          <div
              className={`absolute left-0 top-full z-50 mt-[8px] w-[316px] origin-top-left overflow-visible rounded-[10px] border border-[#e2e6ec] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                  isOpen
                      ? 'max-h-[420px] scale-100 opacity-100'
                      : 'pointer-events-none max-h-0 scale-[0.96] opacity-0'
              }`}
          >
              <div className="space-y-[14px] p-[14px]">
                  {metrics.map((metric, index) => {
                      const visualDropdownOpen = openChartVisualDropdown?.side === side && openChartVisualDropdown.slot === metric.slot;
                      const colorDropdownOpen = openChartColorDropdown?.side === side && openChartColorDropdown.slot === metric.slot;

                      return (
                          <div key={metric.slot} className={index > 0 ? 'pt-[2px] dark:border-slate-800' : ''}>
                              <div className="mb-[9px] truncate text-[14px] font-bold text-[#2b3139] dark:text-slate-100">
                                  {metric.config.label}
                              </div>
                              <div className="flex items-center gap-[9px]">
                                  <div className="relative flex-shrink-0">
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setOpenChartColorDropdown(current => current?.side === side && current.slot === metric.slot ? null : { side, slot: metric.slot });
                                              setOpenChartVisualDropdown(null);
                                          }}
                                          className="flex h-[32px] w-[32px] flex-col overflow-hidden rounded-[6px] border border-[#dfe4ec] bg-white p-[4px] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35 dark:border-slate-700 dark:bg-slate-900"
                                          aria-expanded={colorDropdownOpen}
                                          aria-label={language === 'cn' ? '选择图表颜色' : 'Choose chart color'}
                                      >
                                          <span className="h-full rounded-[3px]" style={{ backgroundColor: metric.color }} />
                                      </button>
                                      <div
                                          className={`absolute left-0 top-full z-[70] mt-[6px] flex origin-top items-center gap-[8px] overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white px-[9px] py-[8px] shadow-[0_8px_22px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                              colorDropdownOpen ? 'max-h-[58px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                          }`}
                                      >
                                          {chartStyleColors.map(optionColor => {
                                              const selected = optionColor === metric.color;
                                              return (
                                                  <button
                                                      key={optionColor}
                                                      type="button"
                                                      onClick={() => {
                                                          updateChartStyle(side, metric.slot, { color: optionColor });
                                                          setOpenChartColorDropdown(null);
                                                      }}
                                                      className={`relative h-[26px] w-[26px] flex-shrink-0 rounded-[5px] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35 ${
                                                          selected ? 'shadow-[0_0_0_2px_rgba(255,255,255,1),0_0_0_4px_rgba(91,69,214,0.35)]' : ''
                                                      }`}
                                                      style={{ backgroundColor: optionColor }}
                                                      aria-label={language === 'cn' ? `切换颜色 ${optionColor}` : `Set chart color ${optionColor}`}
                                                  >
                                                      {selected && <CheckCircle2 className="absolute right-[2px] top-[2px] h-[12px] w-[12px] text-white drop-shadow" />}
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                                  <div className="relative flex-1">
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setOpenChartVisualDropdown(current => current?.side === side && current.slot === metric.slot ? null : { side, slot: metric.slot });
                                              setOpenChartColorDropdown(null);
                                          }}
                                          className="flex h-[32px] w-full items-center justify-between rounded-[6px] border border-[#dfe4ec] bg-white px-[10px] text-[14px] font-semibold text-[#20232a] transition-colors hover:border-[#c9d0dc] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                      >
                                          {chartVisualOptions.find(option => option.id === metric.visual)?.label}
                                          <ChevronDown className={`h-[15px] w-[15px] transition-transform ${visualDropdownOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div
                                          className={`absolute left-0 top-full z-[60] mt-[5px] w-[120px] origin-top overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white py-[5px] shadow-[0_8px_22px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                              visualDropdownOpen ? 'max-h-[160px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                          }`}
                                      >
                                          {chartVisualOptions.map(option => {
                                              const selected = option.id === metric.visual;
                                              return (
                                                  <button
                                                      key={option.id}
                                                      type="button"
                                                      onClick={() => {
                                                          updateChartStyle(side, metric.slot, { visual: option.id });
                                                          setOpenChartVisualDropdown(null);
                                                      }}
                                                      className={`block w-full px-[12px] py-[8px] text-left text-[14px] font-medium transition-colors ${
                                                          selected
                                                              ? 'bg-[#e8e4f4] text-[#2f255f]'
                                                              : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                      }`}
                                                  >
                                                      {option.label}
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}

                  <button
                      type="button"
                      onClick={() => {
                          setChartStyleSettings(current => ({ ...current, [side]: {} }));
                          setOpenChartVisualDropdown(null);
                          setOpenChartColorDropdown(null);
                      }}
                      className="mt-[11px] text-[13px] font-semibold text-[#6b55cf] transition-colors hover:text-[#4b35b8]"
                  >
                      {language === 'cn' ? '恢复默认' : 'Reset to default'}
                  </button>
              </div>
          </div>
      );
  };

  const renderMetricChart = ({
      side,
      data,
      ticks,
      metrics,
      animate,
  }: {
      side: ChartSide;
      data: any[];
      ticks: string[];
      metrics: Array<{
          slot: ChartMetricSlot;
          config: typeof leftChartConfig;
          visual: ChartMetricVisual;
          color: string;
          dataKey: 'primaryValue' | 'secondaryValue' | 'tertiaryValue';
          yAxisId: string;
      }>;
      animate: boolean;
  }) => {
      const primaryMetric = metrics[0];
      const hasDurationAxis = metrics.some(metric => metric.config.format === 'duration');
      const axisGroups = Array.from(metrics.reduce((groups, metric) => {
          const current = groups.get(metric.yAxisId) || {
              id: metric.yAxisId,
              format: metric.config.format,
              orientation: metric.yAxisId.startsWith('right') ? 'right' as const : 'left' as const,
              colors: [] as string[],
          };
          if (!current.colors.includes(metric.color)) {
              current.colors.push(metric.color);
          }
          groups.set(metric.yAxisId, current);
          return groups;
      }, new Map<string, { id: string; format: ChartMetricFormat; orientation: 'left' | 'right'; colors: string[] }>()).values());
      const leftAxisGroups = axisGroups.filter(axis => axis.orientation === 'left');
      const rightAxisGroups = axisGroups.filter(axis => axis.orientation === 'right');
      const getAxisWidth = (format: ChartMetricFormat) => format === 'duration' ? 74 : format === 'money' ? 56 : format === 'percent' ? 44 : 38;
      const getAxisPadding = (axisCount: number) => Math.max(0, axisCount - 1) * 3;
      const commonMargin = {
          top: hasDurationAxis ? 18 : 8,
          right: 18 + getAxisPadding(rightAxisGroups.length),
          left: 12 + getAxisPadding(leftAxisGroups.length),
          bottom: 42,
      };

      const xAxis = (
          <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fontSize: 12, fill: '#1f2933', fontWeight: 400 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              minTickGap={22}
              dy={15}
              padding={{ left: 18, right: 36 }}
          />
      );

      const legend = (
          <div className="absolute bottom-[6px] left-1/2 flex -translate-x-1/2 items-center gap-[20px] text-[14px] font-medium text-[#666b72]">
              {metrics.map(metric => (
                  <div key={metric.slot} className="flex items-center gap-[7px]">
                      <span className="h-[14px] w-[14px] rounded-full" style={{ backgroundColor: metric.color }} />
                      <span>{metric.config.shortLabel}</span>
                  </div>
              ))}
          </div>
      );

      const renderSeries = (metric: typeof metrics[number], gradientId: string) => {
          if (metric.visual === 'bar') {
              return (
                  <Bar
                      key={metric.slot}
                      yAxisId={metric.yAxisId}
                      dataKey={metric.dataKey}
                      fill={metric.color}
                      radius={[4, 4, 0, 0]}
                      barSize={metric.slot === 'primary' ? 30 : 22}
                      maxBarSize={36}
                      isAnimationActive={animate}
                      animationDuration={520}
                      animationEasing="ease-out"
                  />
              );
          }

          if (metric.visual === 'line') {
              return (
                  <Line
                      key={metric.slot}
                      yAxisId={metric.yAxisId}
                      type="monotone"
                      dataKey={metric.dataKey}
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={{ r: 2.4, fill: metric.color, stroke: metric.color, strokeWidth: 1 }}
                      isAnimationActive={animate}
                      animationDuration={560}
                      animationEasing="ease-out"
                      connectNulls
                      activeDot={{
                          r: 6,
                          fill: '#ffffff',
                          stroke: metric.color,
                          strokeWidth: 3,
                      }}
                  />
              );
          }

          return (
              <Area
                  key={metric.slot}
                  yAxisId={metric.yAxisId}
                  type="monotone"
                  dataKey={metric.dataKey}
                  stroke={metric.color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={{ r: 2.4, fill: metric.color, stroke: metric.color, strokeWidth: 1 }}
                  isAnimationActive={animate}
                  animationDuration={560}
                  animationEasing="ease-out"
                  connectNulls
                  activeDot={{
                      r: 6,
                      fill: '#ffffff',
                      stroke: metric.color,
                      strokeWidth: 3,
                  }}
              />
          );
      };

      return (
          <div className={`relative h-full ${animate ? 'animate-fade-in' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data} margin={commonMargin} barCategoryGap="48%">
                          <defs>
                              {metrics.map(metric => (
                                  <linearGradient key={metric.slot} id={`${side}-${metric.slot}ChartMetricFill`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={metric.color} stopOpacity={0.5} />
                                      <stop offset="45%" stopColor={metric.color} stopOpacity={0.16} />
                                      <stop offset="100%" stopColor={metric.color} stopOpacity={0.04} />
                                  </linearGradient>
                              ))}
                          </defs>
                          <Customized component={ReportChartHorizontalGrid} />
                          {xAxis}
                          {axisGroups.map(axis => (
                              <YAxis
                                  key={axis.id}
                                  yAxisId={axis.id}
                                  orientation={axis.orientation}
                                  axisLine={false}
                                  tickLine={false}
                                  width={getAxisWidth(axis.format)}
                                  tickMargin={axis.format === 'duration' ? 6 : 4}
                                  tick={<ChartYAxisTick format={axis.format} colors={axis.colors} orientation={axis.orientation} />}
                                  tickCount={REPORT_CHART_Y_TICK_COUNT}
                                  allowDataOverflow={false}
                              />
                          ))}
                          <Tooltip
                              cursor={{ stroke: primaryMetric.color, strokeWidth: 1, strokeDasharray: '3 3' }}
                              content={<GenericChartTooltip metrics={metrics} />}
                          />
                          {metrics.map(metric => renderSeries(metric, `${side}-${metric.slot}ChartMetricFill`))}
                  </ComposedChart>
              </ResponsiveContainer>
              {legend}
          </div>
      );
  };

  const leftChartContent = useMemo(() => {
      if (!isDataLoading && leftChartData.length === 0) {
          return (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                  {language === 'cn' ? '暂无交易数据' : 'No trade data yet'}
              </div>
          );
      }

      return renderMetricChart({
          side: 'left',
          data: leftChartData,
          ticks: leftChartTicks,
          animate: shouldAnimateCharts,
          metrics: leftChartRenderMetrics,
      });
  }, [isDataLoading, language, leftChartData, leftChartTicks, leftChartRenderMetrics, shouldAnimateCharts]);

  const rightChartContent = useMemo(() => {
      if (!isDataLoading && rightChartData.length === 0) {
          return (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                  {language === 'cn' ? '暂无可计算的数据' : 'No chartable data yet'}
              </div>
          );
      }

      return renderMetricChart({
          side: 'right',
          data: rightChartData,
          ticks: rightChartTicks,
          animate: shouldAnimateCharts,
          metrics: rightChartRenderMetrics,
      });
  }, [isDataLoading, language, rightChartData, rightChartTicks, rightChartRenderMetrics, shouldAnimateCharts]);

  const FilledChartStyleIcon = ({ className = '' }: { className?: string }) => (
      <span className={`inline-flex h-4 w-4 items-end justify-center gap-[2px] ${className}`} aria-hidden="true">
          <span className="h-[7px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-[12px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-[9px] w-[3px] rounded-[1px] bg-current" />
      </span>
  );

  const renderChartCard = ({
      title,
      metricLabel,
      metricColor,
      secondaryMetricLabel,
      secondaryMetricColor,
      tertiaryMetricLabel,
      tertiaryMetricColor,
      children,
      side,
      styleMetrics,
      metricPicker,
      secondaryMetricPicker,
      tertiaryMetricPicker,
      addMetricPicker,
      onMetricButtonClick,
      onSecondaryMetricButtonClick,
      onTertiaryMetricButtonClick,
      onAddMetricClick,
      onRemoveSecondaryMetric,
      onRemoveTertiaryMetric,
      accent = 'text-indigo-500',
      timeframeSide,
      featured = false,
      summaryValue,
      summaryTone = 'neutral',
  }: {
      title: string;
      metricLabel: string;
      metricColor?: string;
      secondaryMetricLabel?: string;
      secondaryMetricColor?: string;
      tertiaryMetricLabel?: string;
      tertiaryMetricColor?: string;
      children: React.ReactNode;
      side?: ChartSide;
      styleMetrics?: Array<{
          slot: ChartMetricSlot;
          config: typeof leftChartConfig;
          visual: ChartMetricVisual;
          color: string;
      }>;
      metricPicker?: React.ReactNode;
      secondaryMetricPicker?: React.ReactNode;
      tertiaryMetricPicker?: React.ReactNode;
      addMetricPicker?: React.ReactNode;
      onMetricButtonClick?: () => void;
      onSecondaryMetricButtonClick?: () => void;
      onTertiaryMetricButtonClick?: () => void;
      onAddMetricClick?: () => void;
      onRemoveSecondaryMetric?: () => void;
      onRemoveTertiaryMetric?: () => void;
      accent?: string;
      timeframeSide?: ChartSide;
      featured?: boolean;
      summaryValue?: string;
      summaryTone?: 'neutral' | 'good' | 'bad';
  }) => {
      const additionalMetrics = [
          {
              slot: 'secondary' as const,
              label: secondaryMetricLabel,
              color: secondaryMetricColor,
              picker: secondaryMetricPicker,
              onButtonClick: onSecondaryMetricButtonClick,
              onRemove: onRemoveSecondaryMetric,
          },
          {
              slot: 'tertiary' as const,
              label: tertiaryMetricLabel,
              color: tertiaryMetricColor,
              picker: tertiaryMetricPicker,
              onButtonClick: onTertiaryMetricButtonClick,
              onRemove: onRemoveTertiaryMetric,
          },
      ].filter(metric => Boolean(metric.label));
      const canAddMetric = 1 + additionalMetrics.length < 3;
      const hasMultipleMetrics = additionalMetrics.length > 0;
      const selectedTimeframe = timeframeSide ? chartTimeframes[timeframeSide] : 'day';
      const selectedTimeframeLabel = chartTimeframeOptions.find(option => option.id === selectedTimeframe)?.label || chartTimeframeOptions[0].label;
      const timeframeMenuOpen = timeframeSide ? openChartTimeframeMenu === timeframeSide : false;

      return (
      <div className={`${featured ? 'rounded-[8px] bg-white dark:bg-slate-900 shadow-none' : reportPanelClass} relative overflow-visible`}>
          <div className={`${featured ? 'min-h-[64px] px-[10px] py-[10px]' : 'min-h-14 px-4 py-3 border-b border-slate-100 dark:border-slate-800'} flex flex-wrap items-start justify-between gap-[10px] bg-white dark:bg-slate-900`}>
              <div className={`${featured ? 'gap-[10px]' : 'gap-3'} flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center`}>
                  <div className="relative" data-chart-style-root={side}>
                      <button
                          type="button"
                          onClick={() => {
                              if (!side) return;
                              setOpenChartStyleMenu(current => current === side ? null : side);
                              setOpenChartMetricPicker(null);
                              setOpenChartVisualDropdown(null);
                              setOpenChartColorDropdown(null);
                          }}
                          className={`${featured ? 'h-[32px] w-[32px] rounded-[7px] border-[#dfe4ec] bg-white text-[#5f636b] hover:border-[#c9d0dc]' : 'w-8 h-8 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'} border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35`}
                          aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                      >
                          <FilledChartStyleIcon className={accent} />
                      </button>
                      {side && styleMetrics?.length && (
                          <ChartStyleMenu
                              side={side}
                              metrics={styleMetrics}
                          />
                      )}
                  </div>
                  <div className={`relative min-w-[150px] max-w-full ${hasMultipleMetrics ? 'flex-[1_1_170px]' : 'w-[min(252px,calc(100vw-132px))] flex-none'}`} data-chart-metric-picker-root>
                      <button
                          type="button"
                          onClick={() => {
                              onMetricButtonClick?.();
                              setOpenChartStyleMenu(null);
                              setOpenChartVisualDropdown(null);
                              setOpenChartColorDropdown(null);
                          }}
                          className={`${featured ? 'relative h-[32px] w-full overflow-hidden rounded-[7px] border-[#dfe4ec] bg-white pl-[18px] pr-[10px] text-[13px] font-medium text-[#20232a]' : 'h-8 w-full min-w-0 border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border transition-colors`}
                      >
                          {featured && (
                              <span className="pointer-events-none absolute left-0 top-0 h-full w-[5px]">
                                  <span
                                      className="absolute left-0 top-0 h-full w-[4px] rounded-l-[7px]"
                                      style={{ backgroundColor: metricColor || '#5b45d6' }}
                                  />
                              </span>
                          )}
                          <span className="truncate">{metricLabel}</span>
                          <ChevronDown className={`${featured ? 'h-[15px] w-[15px] text-[#111827]' : 'w-3.5 h-3.5 text-slate-400'} flex-shrink-0`} />
                      </button>
                      {metricPicker}
                  </div>
                  {additionalMetrics.map(metric => (
                      <div key={metric.slot} className="group/metric relative flex min-w-[150px] flex-[1_1_170px] max-w-full items-center" data-chart-metric-picker-root>
                          <button
                              type="button"
                              onClick={() => {
                                  metric.onButtonClick?.();
                                  setOpenChartStyleMenu(null);
                                  setOpenChartVisualDropdown(null);
                                  setOpenChartColorDropdown(null);
                              }}
                              className={`${featured ? 'relative h-[32px] min-w-0 flex-1 overflow-hidden rounded-[7px] border-[#dfe4ec] bg-white pl-[18px] pr-[10px] text-[13px] font-medium text-[#20232a] hover:border-[#c9d0dc]' : 'h-8 min-w-0 flex-1 border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border transition-colors`}
                          >
                              {featured && (
                                  <span className="pointer-events-none absolute left-0 top-0 h-full w-[5px]">
                                      <span
                                          className="absolute left-0 top-0 h-full w-[4px] rounded-l-[7px]"
                                          style={{ backgroundColor: metric.color || metricColor || '#5b45d6' }}
                                      />
                                  </span>
                              )}
                              <span className="truncate">{metric.label}</span>
                              <ChevronDown className={`${featured ? 'h-[15px] w-[15px] text-[#111827]' : 'w-3.5 h-3.5 text-slate-400'} flex-shrink-0`} />
                          </button>
                          <button
                              type="button"
                              onClick={(event) => {
                                  event.stopPropagation();
                                  metric.onRemove?.();
                                  setOpenChartColorDropdown(null);
                              }}
                              className="pointer-events-none ml-0 inline-flex h-[22px] w-0 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dfe4ec] bg-white text-[#858d99] opacity-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[width,margin,opacity,background-color,color,border-color] duration-150 ease-out hover:border-[#ccd3de] hover:bg-[#f5f6f8] hover:text-[#2f3742] group-hover/metric:pointer-events-auto group-hover/metric:ml-[6px] group-hover/metric:w-[22px] group-hover/metric:opacity-100 focus-visible:pointer-events-auto focus-visible:ml-[6px] focus-visible:w-[22px] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                              aria-label={language === 'cn' ? '移除指标' : 'Remove metric'}
                          >
                              <X className="h-[13px] w-[13px]" />
                          </button>
                          {metric.picker}
                      </div>
                  ))}
                  {canAddMetric && (
                      <div className="relative inline-flex" data-chart-metric-picker-root>
                          <button
                              type="button"
                              onClick={() => {
                                  onAddMetricClick?.();
                                  setOpenChartStyleMenu(null);
                                  setOpenChartVisualDropdown(null);
                                  setOpenChartColorDropdown(null);
                              }}
                              className={`${featured ? 'rounded-[7px] px-[12px] py-[7px] text-[14px] font-semibold text-[#5b45b6] transition-colors hover:bg-[#ebe7f8]' : 'text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'}`}
                          >
                              + {language === 'cn' ? '添加指标' : 'Add metric'}
                          </button>
                          {addMetricPicker}
                      </div>
                  )}
              </div>
              <div className={`${featured ? 'gap-[8px]' : 'gap-2'} flex flex-shrink-0 items-center`}>
                  {timeframeSide && (
                      <div className="relative" data-chart-timeframe-root={timeframeSide}>
                          <button
                              type="button"
                              onClick={() => {
                                  setOpenChartTimeframeMenu(current => current === timeframeSide ? null : timeframeSide);
                                  setOpenChartMetricPicker(null);
                                  setOpenChartStyleMenu(null);
                                  setOpenChartVisualDropdown(null);
                                  setOpenChartColorDropdown(null);
                              }}
                              className={`${featured ? 'h-[32px] w-[84px] sm:w-[100px] rounded-[7px] border-[#dfe4ec] px-[12px] text-[14px] font-medium text-[#1f2933] hover:border-[#c9d0dc]' : 'h-8 border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border bg-white dark:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5dae3]/80`}
                              aria-expanded={timeframeMenuOpen}
                              aria-label={language === 'cn' ? '选择图表时间粒度' : 'Choose chart timeframe'}
                          >
                              {selectedTimeframeLabel}
                              <ChevronDown className={`${featured ? 'h-[15px] w-[15px] text-[#111827] transition-transform' : 'w-3.5 h-3.5 text-slate-400 transition-transform'} ${timeframeMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <div
                              className={`absolute right-0 top-full z-[70] mt-[6px] w-[96px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                  timeframeMenuOpen ? 'max-h-[148px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                              }`}
                          >
                              {chartTimeframeOptions.map(option => {
                                  const selected = option.id === selectedTimeframe;
                                  return (
                                      <button
                                          key={option.id}
                                          type="button"
                                          onClick={() => {
                                              setChartTimeframes(current => ({ ...current, [timeframeSide]: option.id }));
                                              setOpenChartTimeframeMenu(null);
                                          }}
                                          className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[14px] font-medium transition-colors ${
                                              selected
                                                  ? 'bg-[#e8e4f4] text-[#2f255f]'
                                                  : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                          }`}
                                      >
                                          {option.label}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  )}
                  <button className={`${featured ? 'h-[32px] w-[36px] rounded-[7px] border-[#dfe4ec] text-[#5f636b]' : 'h-8 w-8 rounded-md border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-center border bg-white dark:bg-slate-900 transition-colors`}>
                      <MoreVertical className={`${featured ? 'h-[18px] w-[18px]' : 'w-4 h-4'}`} />
                  </button>
              </div>
          </div>
          <div className={`${featured ? 'px-[2px] pb-[12px]' : 'px-4 pt-4'}`}>
              {!featured && (
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100">{title}</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{language === 'cn' ? '当前筛选范围' : 'Current filter range'}</p>
                    </div>
                    {summaryValue && (
                      <div className="text-right">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Net</div>
                          <div className={`text-sm font-semibold tabular-nums ${summaryTone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : summaryTone === 'bad' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                              {summaryValue}
                          </div>
                      </div>
                    )}
                </div>
              )}
              <div className={`${featured ? 'h-[392px]' : 'h-[330px]'}`}>
                  {children}
              </div>
          </div>
          <ReportCardLoadingOverlay radius={featured ? 8 : 12} />
      </div>
      );
  };

  const PnlTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;
      const value = Number(payload[0]?.value || 0);
      const tone = value >= 0 ? 'text-emerald-500' : 'text-rose-500';

      return (
          <div className="rounded-[4px] border border-slate-300 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.24)]">
              <div className="text-[12px] font-bold text-[#20232a]">{label}</div>
              <div className="mt-1 flex items-center gap-2">
                  <span className={`h-[6px] w-[6px] rounded-full ${value >= 0 ? 'bg-emerald-500' : 'bg-[#ff6468]'}`} />
                  <span className="text-[12px] text-[#3f4650]">{language === 'cn' ? '净盈亏 - 累计' : 'Net P&L - cumulative'}: {formatSignedMoney(value)}</span>
              </div>
          </div>
      );
  };

  const WinLossTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;
      const value = Number(payload[0]?.value || 0);

      return (
          <div className="rounded-[4px] border border-slate-300 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.18)]">
              <div className="text-[12px] font-bold text-[#20232a]">{label}</div>
              <div className="mt-1 flex items-center gap-2">
                  <span className="h-[6px] w-[6px] rounded-full bg-[#55c39e]" />
                  <span className="text-[12px] text-[#3f4650]">{language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss'}: {value.toFixed(2)}</span>
              </div>
          </div>
      );
  };

  function GenericChartTooltip({ active, payload, label, config, color: overrideColor, metrics }: any) {
      if (!active || !payload?.length) return null;

      const tooltipMetrics = metrics || (config ? [{
          config,
          color: overrideColor || config.color || '#55c39e',
          dataKey: 'value',
      }] : []);
      const rows = tooltipMetrics
          .map((metric: any) => {
              const payloadItem = payload.find((item: any) => item.dataKey === metric.dataKey);
              if (!payloadItem || payloadItem.value === undefined || payloadItem.value === null) return null;

              return {
                  key: metric.dataKey,
                  color: metric.color,
                  label: metric.config.label || metric.config.shortLabel,
                  value: formatChartMetricValue(Number(payloadItem.value || 0), metric.config.format),
              };
          })
          .filter(Boolean);

      if (rows.length === 0) return null;

      const rawDate = payload[0]?.payload?.date;
      const title = typeof rawDate === 'string' && rawDate
          ? rawDate
          : label;

      return (
          <div className="min-w-[230px] max-w-[380px] rounded-[4px] border border-[#cfd6df] bg-white px-[10px] py-[8px] shadow-[0_2px_8px_rgba(15,23,42,0.24)]">
              <div className="text-[12px] font-bold leading-[16px] text-[#20232a]">{title}</div>
              <div className="mt-[5px] space-y-[3px]">
                  {rows.map((row: any) => (
                      <div key={row.key} className="flex items-start gap-[6px]">
                          <span className="mt-[6px] h-[5px] w-[5px] flex-shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="text-[12px] leading-[16px] text-[#303844]">
                              {row.label}: {row.value}
                          </span>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const ChartMetricPicker = ({ side, slot, selectedMetricId, excludedMetricIds = [] }: { side: ChartSide; slot: ChartMetricSlot; selectedMetricId: SummaryMetricId | null; excludedMetricIds?: SummaryMetricId[] }) => {
      if (openChartMetricPicker?.side !== side || openChartMetricPicker.slot !== slot) return null;

      const handleSelectMetric = (metricId: SummaryMetricId) => {
          if (side === 'left') {
              if (slot === 'primary') {
                  setLeftChartMetricId(metricId);
                  if (leftSecondaryChartMetricId === metricId) setLeftSecondaryChartMetricId(null);
                  if (leftTertiaryChartMetricId === metricId) setLeftTertiaryChartMetricId(null);
              } else if (slot === 'secondary') {
                  setLeftSecondaryChartMetricId(metricId);
                  if (leftTertiaryChartMetricId === metricId) setLeftTertiaryChartMetricId(null);
              } else {
                  setLeftTertiaryChartMetricId(metricId);
              }
          } else {
              if (slot === 'primary') {
                  setRightChartMetricId(metricId);
                  if (rightSecondaryChartMetricId === metricId) setRightSecondaryChartMetricId(null);
                  if (rightTertiaryChartMetricId === metricId) setRightTertiaryChartMetricId(null);
              } else if (slot === 'secondary') {
                  setRightSecondaryChartMetricId(metricId);
                  if (rightTertiaryChartMetricId === metricId) setRightTertiaryChartMetricId(null);
              } else {
                  setRightTertiaryChartMetricId(metricId);
              }
          }

          setOpenChartMetricPicker(null);
          setOpenChartVisualDropdown(null);
          setOpenChartColorDropdown(null);
          setChartMetricPickerSearch('');
      };

      return (
          <div className="absolute left-0 top-full z-50 mt-[8px] flex max-h-[440px] w-[clamp(260px,100%,420px)] min-w-full origin-top-left flex-col overflow-hidden rounded-[10px] border border-[#e2e6ec] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
              <div className="p-[12px] pb-[8px]">
                  <div className="relative">
                      <Search className="pointer-events-none absolute left-[10px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#8b95a1]" />
                      <input
                          value={chartMetricPickerSearch}
                          onChange={(event) => setChartMetricPickerSearch(event.target.value)}
                          placeholder={language === 'cn' ? '搜索' : 'Search'}
                          className="h-[38px] w-full rounded-[7px] border border-[#d9dee6] bg-white pl-[33px] pr-[10px] text-[14px] font-medium text-[#303844] outline-none transition-colors placeholder:text-[#6f7782] focus:border-[#6b55cf] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                  </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-[12px] pb-[10px]">
                  {visibleChartMetricCategories.map(category => {
                      const isExpanded = expandedChartMetricCategory === category.id;
                      return (
                          <div key={category.id}>
                              <button
                                  type="button"
                                  onClick={() => setExpandedChartMetricCategory(isExpanded ? null : category.id)}
                                  className={`flex w-full items-center justify-between py-[10px] text-left text-[14px] font-semibold transition-colors ${isExpanded ? 'text-[#5b45d6]' : 'text-[#26303b] hover:text-[#5b45d6] dark:text-slate-200'}`}
                              >
                                  {category.label}
                                  <ChevronDown className={`h-[17px] w-[17px] transition-transform ${isExpanded ? 'rotate-180 text-[#5b45d6]' : 'text-[#727b86]'}`} />
                              </button>
                              <div
                                  className={`overflow-hidden transition-[max-height,padding,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                      isExpanded ? 'mt-[2px] max-h-[620px] pb-[6px]' : 'mt-0 max-h-0 pb-0'
                                  }`}
                              >
                                  <div
                                      className={`space-y-[1px] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                          isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                                      }`}
                                  >
                                      {category.metrics
                                          .filter(([metricId]) => !excludedMetricIds.includes(metricId))
                                          .map(([metricId, config]) => {
                                          const isSelected = metricId === selectedMetricId;
                                          return (
                                              <button
                                                  key={metricId}
                                                  type="button"
                                                  onClick={() => handleSelectMetric(metricId)}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[14px] font-medium leading-[1.45] transition-colors ${isSelected ? 'bg-[#ebe7f8] text-[#2f255f]' : 'text-[#26303b] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'}`}
                                              >
                                                  {config.label}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const SummaryMetric = ({ label, value, tooltip, tone = 'neutral', isEditing = false, onRemove, draggableProps, tooltipPlacement = 'center' }: { label: string; value: string | number; tooltip: string; tone?: 'neutral' | 'good' | 'bad' | 'accent'; isEditing?: boolean; onRemove?: () => void; draggableProps?: React.HTMLAttributes<HTMLDivElement>; tooltipPlacement?: 'start' | 'center' | 'end' }) => {
      const toneClass = tone === 'good'
          ? 'text-emerald-600 dark:text-emerald-400'
          : tone === 'bad'
          ? 'text-rose-600 dark:text-rose-400'
          : tone === 'accent'
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-slate-800 dark:text-slate-100';
      const { className: draggableClassName = '', ...dragAttributes } = draggableProps || {};
      const tooltipPositionClass = tooltipPlacement === 'start'
          ? 'left-0 translate-x-0'
          : tooltipPlacement === 'end'
          ? 'right-0 translate-x-0'
          : 'left-1/2 -translate-x-1/2';

      return (
          <div
              className={`group/summary-metric relative min-h-[64px] transition-all ${
                  isEditing
                      ? 'rounded-[6px] border border-dashed border-[#dfe3ea] bg-white px-[14px] py-[11px] shadow-[0_1px_0_rgba(15,23,42,0.03)] hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900/80'
                      : ''
              } ${draggableClassName}`}
              {...dragAttributes}
          >
              {isEditing && (
                  <>
                      <div className="absolute left-[9px] top-[12px] text-[#9aa3ae]">
                          <GripVertical className="h-[15px] w-[15px]" />
                      </div>
                      <button
                          type="button"
                          onClick={onRemove}
                          className="absolute -right-[8px] -top-[8px] inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#111317] text-white shadow-[0_2px_6px_rgba(15,23,42,0.22)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                          aria-label={language === 'cn' ? `移除${label}` : `Remove ${label}`}
                      >
                          <X className="h-[12px] w-[12px]" />
                      </button>
                  </>
              )}

              <div className={isEditing ? 'pl-[22px]' : ''}>
                  <div className="flex items-center gap-1 text-[13px] font-medium leading-none text-[#5f6875] dark:text-slate-400">
                      {label}
                      {!isEditing && (
                          <span className="group/metric-info relative inline-flex">
                              <button
                                  type="button"
                                  className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full text-[#7b8490] outline-none transition-colors hover:text-[#4f5662] focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                  aria-label={tooltip}
                              >
                                  <Info className="h-[14px] w-[14px]" />
                              </button>
                              <span className={`pointer-events-none absolute bottom-full z-50 mb-[9px] hidden w-[min(286px,calc(100vw-32px))] rounded-[3px] bg-[#262626] px-[12px] py-[10px] text-left text-[13px] font-semibold leading-[1.5] text-white shadow-[0_8px_22px_rgba(15,23,42,0.24)] group-hover/metric-info:block group-focus-within/metric-info:block ${tooltipPositionClass}`}>
                                  {tooltip}
                              </span>
                          </span>
                      )}
                  </div>
                  <div className={`mt-[7px] text-[22px] font-semibold leading-none tabular-nums ${toneClass}`}>
                      {value}
                  </div>
              </div>
          </div>
      );
  };

  const ReportTabMark = ({ type, active }: { type: string; active: boolean }) => {
      const stroke = active ? 'bg-[#6f55d8]' : 'bg-[#858c98] group-hover:bg-[#636b77]';
      const border = active ? 'border-[#6f55d8]' : 'border-[#858c98] group-hover:border-[#636b77]';
      const softFill = active ? 'bg-[#6f55d8]/10' : 'bg-transparent group-hover:bg-[#eef1f5]';
      const iconBase = `relative inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[7px] transition-colors ${softFill}`;

      if (type === 'performance') {
          return (
              <span className={iconBase} aria-hidden="true">
                  <span className={`absolute left-[4px] top-[8px] h-[6px] w-[2.2px] rounded-full ${stroke}`} />
                  <span className={`absolute left-[8px] top-[5px] h-[9px] w-[2.2px] rounded-full ${stroke}`} />
                  <span className={`absolute left-[12px] top-[10px] h-[4px] w-[2.2px] rounded-full ${stroke}`} />
              </span>
          );
      }

      if (type === 'overview') {
          return (
              <span className={iconBase} aria-hidden="true">
                  <span className={`absolute h-[12px] w-[12px] rounded-full border-[1.7px] ${border}`} />
                  <span className={`absolute h-[12px] w-[1.6px] rounded-full ${stroke}`} />
                  <span className={`absolute h-[1.6px] w-[12px] rounded-full ${stroke}`} />
              </span>
          );
      }

      if (type === 'detailed') {
          return (
              <span className={iconBase} aria-hidden="true">
                  <span className={`absolute left-[4px] top-[3px] h-[12px] w-[10px] rounded-[3px] border-[1.6px] ${border}`} />
                  <span className={`absolute left-[6px] top-[7px] h-[1.6px] w-[6px] rounded-full ${stroke}`} />
                  <span className={`absolute left-[6px] top-[10.5px] h-[1.6px] w-[5px] rounded-full ${stroke}`} />
              </span>
          );
      }

      if (type === 'compare') {
          return (
              <span className={iconBase} aria-hidden="true">
                  <span className={`absolute left-[4px] top-[5px] h-[2px] w-[9px] rounded-full ${stroke}`} />
                  <span className={`absolute right-[3px] top-[3px] h-[5px] w-[5px] rotate-45 rounded-[1px] border-r-[1.6px] border-t-[1.6px] ${border}`} />
                  <span className={`absolute bottom-[5px] right-[4px] h-[2px] w-[9px] rounded-full ${stroke}`} />
                  <span className={`absolute bottom-[3px] left-[3px] h-[5px] w-[5px] -rotate-[135deg] rounded-[1px] border-r-[1.6px] border-t-[1.6px] ${border}`} />
              </span>
          );
      }

      if (type === 'calendar') {
          return (
              <span className={iconBase} aria-hidden="true">
                  <span className={`absolute h-[13px] w-[13px] rounded-[4px] border-[1.6px] ${border}`} />
                  <span className={`absolute top-[7px] h-[1.6px] w-[13px] rounded-full ${stroke}`} />
                  <span className={`absolute left-[5px] top-[10px] h-[2.3px] w-[2.3px] rounded-full ${stroke}`} />
                  <span className={`absolute right-[5px] top-[10px] h-[2.3px] w-[2.3px] rounded-full ${stroke}`} />
              </span>
          );
      }

      return (
          <span className={iconBase} aria-hidden="true">
              <span className={`absolute left-[4px] top-[4px] h-[10px] w-[10px] rounded-[3px] border-[1.6px] ${border}`} />
              <span className={`absolute left-[7px] top-[7px] h-[4px] w-[4px] rounded-[1.5px] ${stroke}`} />
          </span>
      );
  };

  const REPORT_TABS = [
      { id: 'performance', label: language === 'cn' ? '表现' : 'Performance', isNew: true },
      { id: 'overview', label: language === 'cn' ? '概览' : 'Overview' },
      { id: 'detailed', label: language === 'cn' ? '详细报表' : 'Reports', hasMenu: true },
      { id: 'compare', label: language === 'cn' ? '对比' : 'Compare' },
      { id: 'calendar', label: language === 'cn' ? '日历' : 'Calendar' },
      { id: 'ai', label: language === 'cn' ? '复盘洞察' : 'Recaps & Insights' },
  ];

  const detailedFilterOptions = [
      { id: 'DAYS', label: language === 'cn' ? t.reports.filters.days : 'Day & Time' },
      { id: 'WEEKS', label: t.reports.filters.weeks },
      { id: 'MONTHS', label: t.reports.filters.months },
      { id: 'TIME', label: t.reports.filters.time },
      { id: 'SYMBOLS', label: language === 'cn' ? '交易品种' : 'Symbols' },
      { id: 'RISK', label: language === 'cn' ? '风险' : 'Risk' },
      { id: 'SETUPS', label: language === 'cn' ? t.reports.filters.setups : 'Strategies' },
      { id: 'TAGS', label: language === 'cn' ? t.reports.filters.tags : 'Tags' },
      { id: 'TRADE DURATION', label: language === 'cn' ? t.reports.filters.duration : 'Options: Days till expiration' },
      { id: 'WINS_LOSSES', label: language === 'cn' ? '盈亏结果' : 'Wins vs Losses' },
  ];

  const reportMenuOptions = [
      { id: 'DAYS', label: 'Day & Time' },
      { id: 'SYMBOLS', label: 'Symbols' },
      { id: 'RISK', label: 'Risk' },
      { id: 'SETUPS', label: 'Strategies' },
      { id: 'TAGS', label: 'Tags' },
      { id: 'TRADE DURATION', label: 'Options: Days till expiration' },
      { id: 'WINS_LOSSES', label: 'Wins vs Losses' },
  ];

  const selectDetailedReport = (filterId: string) => {
      setDetailedFilter(filterId);
      setActiveTab('detailed');
      setIsReportMenuOpen(false);
  };

  const getDetailedFilterLabel = (filterId: string) =>
      detailedFilterOptions.find(option => option.id === filterId)?.label || filterId;

  // Helper to determine active data and configuration for Detailed View
  const getDetailedData = () => {
      if (detailedFilter === 'TIME') {
          // Calculate interval for X-axis labels to avoid crowding
          // 30 mins = 48 bars, 15 mins = 96 bars, 5 mins = 288 bars
          // We want labels roughly every hour
          let xInterval = 0; 
          let size = 12;

          if (timeInterval === '30 Minutes') { xInterval = 1; size = 10; } // Label every 2nd tick (1 hr)
          else if (timeInterval === '15 Minutes') { xInterval = 3; size = 6; } // Label every 4th tick (1 hr)
          else if (timeInterval === '5 Minutes') { xInterval = 11; size = 3; } // Label every 12th tick (1 hr)
          else { xInterval = 0; size = 16; } // 1 Hour

          return { 
              data: timeStats, 
              title: `${t.reports.charts.distTitle} ${t.reports.filters.time} (${timeInterval})`, 
              pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.time} (${timeInterval})`,
              layout: 'horizontal' as const, 
              barSize: size,
              xInterval: xInterval
          };
      }
      if (detailedFilter === 'WEEKS') {
          return {
              data: weekStats,
              title: `${t.reports.charts.distTitle} ${t.reports.filters.weeks}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.weeks}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'MONTHS') {
          return {
              data: monthStats,
              title: `${t.reports.charts.distTitle} ${t.reports.filters.months}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.months}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'SYMBOLS') {
          return {
              data: symbolStats,
              title: `${t.reports.charts.distTitle} ${language === 'cn' ? '交易品种' : 'Symbols'}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${language === 'cn' ? '交易品种' : 'Symbols'}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'RISK') {
          return {
              data: rMultipleStats,
              title: `${t.reports.charts.distTitle} ${language === 'cn' ? '风险' : 'Risk'}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${language === 'cn' ? '风险' : 'Risk'}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'SETUPS') {
          return {
              data: setupStats,
              title: `${t.reports.charts.distTitle} ${t.reports.filters.setups}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.setups}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'TAGS') {
          return {
              data: tagStats,
              title: `${t.reports.charts.distTitle} ${t.reports.filters.tags}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.tags}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'WINS_LOSSES') {
          return {
              data: winLossStats,
              title: `${t.reports.charts.distTitle} ${language === 'cn' ? '盈亏结果' : 'Wins vs Losses'}`,
              pnlTitle: `${t.reports.charts.perfTitle} ${language === 'cn' ? '盈亏结果' : 'Wins vs Losses'}`,
              layout: 'vertical' as const,
              barSize: 18,
              xInterval: 0
          };
      }
      if (detailedFilter === 'TRADE DURATION') {
          return { 
              data: durationStats, 
              title: `${t.reports.charts.distTitle} ${t.reports.filters.duration}`, 
              pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.duration}`,
              layout: 'vertical' as const, 
              barSize: 20,
              xInterval: 0
          };
      }
      // Default to DAYS
      return { 
          data: dayOfWeekStats, 
          title: `${t.reports.charts.distTitle} ${t.reports.filters.days}`, 
          pnlTitle: `${t.reports.charts.perfTitle} ${t.reports.filters.days}`,
          layout: 'vertical' as const,
          barSize: 20,
          xInterval: 0
      };
  };

  const { data: detailedChartData, title: distChartTitle, pnlTitle: pnlChartTitle, layout: chartLayout, barSize, xInterval } = getDetailedData();

  // --- CALENDAR RENDER HELPERS ---
  const renderMonthGrid = (monthIndex: number) => {
      const year = calendarYear;
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const firstDay = new Date(year, monthIndex, 1).getDay(); // 0 = Sun
      
      const days = [];
      // Empty cells for offset
      for(let i=0; i<firstDay; i++) {
          days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
      }
      // Days
      for(let d=1; d<=daysInMonth; d++) {
          const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayData = calendarData.dailyMap[dateKey];
          
          let bgColor = 'bg-slate-100 dark:bg-slate-800/50';
          let textColor = 'text-slate-400 dark:text-slate-500';
          
          if (dayData) {
              if (dayData.pnl > 0) {
                  bgColor = 'bg-emerald-500 text-white shadow-sm';
                  textColor = 'text-white';
              } else if (dayData.pnl < 0) {
                  bgColor = 'bg-rose-500 text-white shadow-sm';
                  textColor = 'text-white';
              } else {
                  // Break even or trade exists but 0 pnl
                  bgColor = 'bg-slate-400 dark:bg-slate-600 text-white';
                  textColor = 'text-white';
              }
          }

          days.push(
              <div 
                key={d} 
                className={`aspect-square rounded-[3px] flex items-center justify-center text-[9px] font-bold cursor-default group relative ${bgColor} ${textColor}`}
              >
                  {d}
                  {/* Tooltip */}
                  {dayData && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                          <div className={`font-mono ${dayData.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {dayData.pnl >= 0 ? '+' : ''}${dayData.pnl.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">{dayData.count} trades</div>
                      </div>
                  )}
              </div>
          );
      }
      return days;
  };

  const summaryMetricDefinitions = stats ? [
      { id: 'avgTradingDaysDuration' as const, label: language === 'cn' ? '平均交易日跨度' : 'Average trading days duration - cumulative', tooltip: language === 'cn' ? '从第一笔交易日到最后一笔交易日的平均日跨度。' : 'Average elapsed calendar time across logged trading days.', value: stats.totalDays > 0 ? formatDuration(stats.totalDays * 24 * 60 * 60 * 1000) : '--', tone: 'neutral' as const },
      { id: 'avgHoldTime' as const, label: language === 'cn' ? '平均持仓时间' : 'Avg hold time - cumulative', tooltip: language === 'cn' ? '所有已平仓交易从开仓到平仓的平均持仓时长。' : 'The average time between entry and exit across closed trades.', value: formatDuration(stats.avgHoldAll), tone: 'neutral' as const },
      { id: 'longestTradeDuration' as const, label: language === 'cn' ? '最长持仓时间' : 'Longest trade duration - cumulative', tooltip: language === 'cn' ? '所选范围内已平仓交易的最长持仓时长。' : 'The longest duration among closed trades in the selected range.', value: formatDuration(stats.longestTradeDuration), tone: 'neutral' as const },
      { id: 'maxTradingDaysDuration' as const, label: language === 'cn' ? '最大交易日跨度' : 'Max trading days duration - cumulative', tooltip: language === 'cn' ? '有交易记录天数换算的最大交易日跨度。' : 'The maximum logged trading-day duration represented in the selected range.', value: formatDuration(stats.maxTradingDaysDuration), tone: 'neutral' as const },
      { id: 'avgDailyNetPnl' as const, label: language === 'cn' ? '平均每日净盈亏' : 'Avg daily net P&L - cumulative', tooltip: language === 'cn' ? '每个有交易日的平均净盈亏。' : 'The average net P&L per logged trading day.', value: formatSignedMoney(stats.avgDailyPnl), tone: stats.avgDailyPnl >= 0 ? 'good' as const : 'bad' as const },
      { id: 'avgDailyWinLoss' as const, label: language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss - cumulative', tooltip: language === 'cn' ? '有有效盈利和亏损记录的交易日中，平均盈利日结果与平均亏损日结果的比例。' : 'The average ratio between winning and losing results on days with valid win/loss data.', value: performanceSummary.avgDailyWinLoss.toFixed(2), tone: 'neutral' as const },
      { id: 'avgLoss' as const, label: language === 'cn' ? '平均亏损' : 'Avg loss - cumulative', tooltip: language === 'cn' ? '所有亏损交易的平均亏损金额。' : 'The average P&L of losing trades.', value: formatSignedMoney(stats.avgLoss), tone: 'bad' as const },
      { id: 'avgMaxTradeLoss' as const, label: language === 'cn' ? '平均最大单笔亏损' : 'Avg max trade loss - cumulative', tooltip: language === 'cn' ? '当前以最大单笔亏损作为最大亏损指标。' : 'The largest losing trade in the selected range.', value: formatSignedMoney(stats.largestLoss), tone: 'bad' as const },
      { id: 'avgMaxTradeProfit' as const, label: language === 'cn' ? '平均最大单笔盈利' : 'Avg max trade profit - cumulative', tooltip: language === 'cn' ? '当前以最大单笔盈利作为最大盈利指标。' : 'The largest profitable trade in the selected range.', value: formatSignedMoney(stats.largestProfit), tone: 'good' as const },
      { id: 'avgNetTradePnl' as const, label: language === 'cn' ? '平均单笔净盈亏' : 'Avg net trade P&L - cumulative', tooltip: language === 'cn' ? '每笔已平仓交易的平均净盈亏。' : 'The average net P&L per closed trade.', value: formatSignedMoney(stats.avgTradePnl), tone: stats.avgTradePnl >= 0 ? 'good' as const : 'bad' as const },
      { id: 'avgTradeWinLoss' as const, label: language === 'cn' ? '平均单笔盈亏比' : 'Avg trade win/loss - cumulative', tooltip: language === 'cn' ? '平均盈利交易金额与平均亏损交易金额的比例。' : 'The ratio between the average winning trade and the average losing trade.', value: performanceSummary.avgTradeWinLoss.toFixed(2), tone: 'neutral' as const },
      { id: 'avgWin' as const, label: language === 'cn' ? '平均盈利' : 'Avg win - cumulative', tooltip: language === 'cn' ? '所有盈利交易的平均盈利金额。' : 'The average P&L of winning trades.', value: formatSignedMoney(stats.avgWin), tone: 'good' as const },
      { id: 'dailyNetPnl' as const, label: language === 'cn' ? '每日净盈亏' : 'Daily net P&L', tooltip: language === 'cn' ? '当前所选范围内所有已平仓交易的净盈亏。' : 'The net P&L for the selected range.', value: formatSignedMoney(stats.netPnl), tone: stats.netPnl >= 0 ? 'good' as const : 'bad' as const },
      { id: 'largestLosingTrade' as const, label: language === 'cn' ? '最大亏损交易' : 'Largest losing trade - cumulative', tooltip: language === 'cn' ? '所选范围内亏损金额最大的单笔交易。' : 'The largest losing trade in the selected range.', value: formatSignedMoney(stats.largestLoss), tone: 'bad' as const },
      { id: 'largestProfitableTrade' as const, label: language === 'cn' ? '最大盈利交易' : 'Largest profitable trade - cumulative', tooltip: language === 'cn' ? '所选范围内盈利金额最大的单笔交易。' : 'The largest profitable trade in the selected range.', value: formatSignedMoney(stats.largestProfit), tone: 'good' as const },
      { id: 'netPnl' as const, label: language === 'cn' ? '净盈亏' : 'Net P&L - cumulative', tooltip: language === 'cn' ? '所选日期范围内，所有已平仓交易的已实现净盈亏，已扣除手续费。' : 'The total realized Profit and Loss (P/L) on all closed positions, for the date range selected.', value: formatSignedMoney(stats.netPnl), tone: stats.netPnl >= 0 ? 'good' as const : 'bad' as const },
      { id: 'profitFactor' as const, label: language === 'cn' ? '盈利因子' : 'Profit factor - cumulative', tooltip: language === 'cn' ? '总盈利除以总亏损的绝对值，用来衡量盈利覆盖亏损的能力。' : 'Gross profit divided by absolute gross loss. It shows how much profit is generated for each dollar lost.', value: stats.profitFactor >= 999 ? '999+' : stats.profitFactor.toFixed(2), tone: stats.profitFactor >= 1 ? 'good' as const : 'bad' as const },
      { id: 'tradeExpectancy' as const, label: language === 'cn' ? '交易期望值' : 'Trade expectancy - cumulative', tooltip: language === 'cn' ? '每笔已平仓交易的平均预期净盈亏。' : 'The average expected net P&L per closed trade.', value: formatSignedMoney(stats.expectancy), tone: stats.expectancy >= 0 ? 'good' as const : 'bad' as const },
      { id: 'avgDailyNetDrawdown' as const, label: language === 'cn' ? '平均每日净回撤' : 'Avg daily net drawdown', tooltip: language === 'cn' ? '所有亏损交易日的平均净亏损金额。' : 'The average net loss across losing trading days.', value: formatSignedMoney(performanceSummary.avgDailyNetDrawdown), tone: performanceSummary.avgDailyNetDrawdown < 0 ? 'bad' as const : 'neutral' as const },
      { id: 'avgPlannedR' as const, label: language === 'cn' ? '平均计划 R 倍数' : 'Avg. planned r-multiple - cumulative', tooltip: language === 'cn' ? '交易计划中目标收益相对初始风险的平均 R 倍数。' : 'The average planned reward multiple relative to initial risk.', value: performanceSummary.avgPlannedR === null ? '--' : `${performanceSummary.avgPlannedR.toFixed(2)}R`, tone: 'neutral' as const },
      { id: 'avgRealizedR' as const, label: language === 'cn' ? '平均实现 R 倍数' : 'Avg. realized r-multiple - cumulative', tooltip: language === 'cn' ? '实际净盈亏相对初始风险的平均 R 倍数。' : 'The average realized return multiple relative to initial risk.', value: `${stats.avgRealizedR.toFixed(2)}R`, tone: stats.avgRealizedR >= 0 ? 'good' as const : 'bad' as const },
      { id: 'breakevenDays' as const, label: language === 'cn' ? '打平天数' : 'Breakeven days - cumulative', tooltip: language === 'cn' ? '净盈亏等于 0 的交易日数量。' : 'The number of logged days with zero net P&L.', value: stats.beDays, tone: 'neutral' as const },
      { id: 'breakevenTrades' as const, label: language === 'cn' ? '打平交易数' : 'Breakeven trades - cumulative', tooltip: language === 'cn' ? '已平仓交易中盈亏为 0 的交易数量。' : 'The number of closed trades with zero P&L.', value: stats.beCount, tone: 'neutral' as const },
      { id: 'losingDays' as const, label: language === 'cn' ? '亏损天数' : 'Losing days - cumulative', tooltip: language === 'cn' ? '净盈亏小于 0 的交易日数量。' : 'The number of logged days with negative net P&L.', value: stats.losingDays, tone: 'bad' as const },
      { id: 'maxDailyNetDrawdown' as const, label: language === 'cn' ? '最大单日净回撤' : 'Max daily net drawdown - cumulative', tooltip: language === 'cn' ? '所选日期范围内净亏损最大的单个交易日。' : 'The largest single-day net loss in the selected range.', value: formatSignedMoney(performanceSummary.maxDailyNetDrawdown), tone: 'bad' as const },
      { id: 'avgDailyVolume' as const, label: language === 'cn' ? '平均每日成交额' : 'Avg daily volume - cumulative', tooltip: language === 'cn' ? '所选日期范围内，每个有交易日的平均成交金额。' : 'The average traded notional volume per logged trading day.', value: (stats.totalVolume / (stats.totalDays || 1)).toFixed(2), tone: 'neutral' as const },
      { id: 'dailyNetDrawdown' as const, label: language === 'cn' ? '每日净回撤' : 'Daily net drawdown - cumulative', tooltip: language === 'cn' ? '当前以最大单日净回撤表示每日净回撤风险。' : 'The largest daily net drawdown in the selected range.', value: formatSignedMoney(performanceSummary.maxDailyNetDrawdown), tone: 'bad' as const },
      { id: 'loggedDays' as const, label: language === 'cn' ? '记录天数' : 'Logged days - cumulative', tooltip: language === 'cn' ? '所选日期范围内有交易记录的天数。' : 'The number of days with logged trades in the selected range.', value: stats.totalDays, tone: 'neutral' as const },
      { id: 'longBreakevenTrades' as const, label: language === 'cn' ? '多头打平交易数' : 'Longs # of breakeven trades - cumulative', tooltip: language === 'cn' ? '做多方向中盈亏为 0 的已平仓交易数量。' : 'Closed long trades with zero P&L.', value: stats.longBreakevenTrades, tone: 'neutral' as const },
      { id: 'longLosingTrades' as const, label: language === 'cn' ? '多头亏损交易数' : 'Longs # of losing trades - cumulative', tooltip: language === 'cn' ? '做多方向中亏损的已平仓交易数量。' : 'Closed long trades with negative P&L.', value: stats.longLosingTrades, tone: 'bad' as const },
      { id: 'longOpenTrades' as const, label: language === 'cn' ? '多头持仓交易数' : 'Longs # of open trades - cumulative', tooltip: language === 'cn' ? '当前做多方向未平仓交易数量。' : 'Open long trades in the selected range.', value: stats.longOpenTrades, tone: 'neutral' as const },
      { id: 'longTrades' as const, label: language === 'cn' ? '多头交易数' : 'Longs # of trades - cumulative', tooltip: language === 'cn' ? '做多方向交易总数。' : 'The total number of long trades.', value: stats.longTradesCount, tone: 'neutral' as const },
      { id: 'longWinningTrades' as const, label: language === 'cn' ? '多头盈利交易数' : 'Longs # of winning trades - cumulative', tooltip: language === 'cn' ? '做多方向中盈利的已平仓交易数量。' : 'Closed long trades with positive P&L.', value: stats.longWinningTrades, tone: 'good' as const },
      { id: 'lossTrades' as const, label: language === 'cn' ? '亏损交易数' : 'Loss # of trades - cumulative', tooltip: language === 'cn' ? '已平仓交易中亏损交易数量。' : 'The number of losing closed trades.', value: stats.lossCount, tone: 'bad' as const },
      { id: 'netAccountBalance' as const, label: language === 'cn' ? '账户净值' : 'Net account balance', tooltip: language === 'cn' ? '账户初始规模加当前累计净盈亏。' : 'Account size plus cumulative net P&L.', value: formatSignedMoney(accountSize + stats.netPnl), tone: accountSize + stats.netPnl >= accountSize ? 'good' as const : 'bad' as const },
      { id: 'openTrades' as const, label: language === 'cn' ? '未平仓交易数' : 'Open trades - cumulative', tooltip: language === 'cn' ? '当前未平仓交易数量。' : 'The number of open trades.', value: stats.openCount, tone: 'neutral' as const },
      { id: 'shortBreakevenTrades' as const, label: language === 'cn' ? '空头打平交易数' : 'Shorts # of breakeven trades - cumulative', tooltip: language === 'cn' ? '做空方向中盈亏为 0 的已平仓交易数量。' : 'Closed short trades with zero P&L.', value: stats.shortBreakevenTrades, tone: 'neutral' as const },
      { id: 'shortLosingTrades' as const, label: language === 'cn' ? '空头亏损交易数' : 'Shorts # of losing trades - cumulative', tooltip: language === 'cn' ? '做空方向中亏损的已平仓交易数量。' : 'Closed short trades with negative P&L.', value: stats.shortLosingTrades, tone: 'bad' as const },
      { id: 'shortOpenTrades' as const, label: language === 'cn' ? '空头持仓交易数' : 'Shorts # of open trades - cumulative', tooltip: language === 'cn' ? '当前做空方向未平仓交易数量。' : 'Open short trades in the selected range.', value: stats.shortOpenTrades, tone: 'neutral' as const },
      { id: 'shortTrades' as const, label: language === 'cn' ? '空头交易数' : 'Shorts # of trades - cumulative', tooltip: language === 'cn' ? '做空方向交易总数。' : 'The total number of short trades.', value: stats.shortTradesCount, tone: 'neutral' as const },
      { id: 'shortWinningTrades' as const, label: language === 'cn' ? '空头盈利交易数' : 'Shorts # of winning trades - cumulative', tooltip: language === 'cn' ? '做空方向中盈利的已平仓交易数量。' : 'Closed short trades with positive P&L.', value: stats.shortWinningTrades, tone: 'good' as const },
      { id: 'tradeCount' as const, label: language === 'cn' ? '交易总数' : 'Trade count - cumulative', tooltip: language === 'cn' ? '所选范围内的交易总数，包括未平仓交易。' : 'The total number of trades in the selected range.', value: stats.totalTrades, tone: 'neutral' as const },
      { id: 'volume' as const, label: language === 'cn' ? '成交额' : 'Volume - cumulative', tooltip: language === 'cn' ? '所选范围内的累计成交金额。' : 'The cumulative traded notional volume.', value: stats.totalVolume.toFixed(2), tone: 'neutral' as const },
      { id: 'winTrades' as const, label: language === 'cn' ? '盈利交易数' : 'Win # of trades - cumulative', tooltip: language === 'cn' ? '已平仓交易中盈利交易数量。' : 'The number of winning closed trades.', value: stats.winCount, tone: 'good' as const },
      { id: 'avgDailyWinPct' as const, label: language === 'cn' ? '平均日胜率' : 'Avg daily win % - cumulative', tooltip: language === 'cn' ? '所选日期范围内，每个有交易日的平均胜率。' : 'The average win percentage across logged trading days in the selected range.', value: `${performanceSummary.avgDailyWinPct.toFixed(2)}%`, tone: 'neutral' as const },
      { id: 'longWinPct' as const, label: language === 'cn' ? '多头胜率' : 'Longs win % - cumulative', tooltip: language === 'cn' ? '做多方向已平仓交易中的盈利比例。' : 'The win percentage for closed long trades.', value: `${stats.longWinRate.toFixed(2)}%`, tone: 'neutral' as const },
      { id: 'maxConsecutiveLosingDays' as const, label: language === 'cn' ? '最大连续亏损天数' : 'Max consecutive losing days - cumulative', tooltip: language === 'cn' ? '所选范围内最长连续亏损交易日数量。' : 'The longest streak of losing trading days.', value: stats.maxConLossDays, tone: 'bad' as const },
      { id: 'maxConsecutiveLosses' as const, label: language === 'cn' ? '最大连续亏损交易' : 'Max consecutive losses - cumulative', tooltip: language === 'cn' ? '所选范围内最长连续亏损交易数量。' : 'The longest streak of losing trades.', value: stats.maxConLoss, tone: 'bad' as const },
      { id: 'maxConsecutiveWinningDays' as const, label: language === 'cn' ? '最大连续盈利天数' : 'Max consecutive winning days - cumulative', tooltip: language === 'cn' ? '所选范围内最长连续盈利交易日数量。' : 'The longest streak of winning trading days.', value: stats.maxConWinDays, tone: 'good' as const },
      { id: 'maxConsecutiveWins' as const, label: language === 'cn' ? '最大连续盈利交易' : 'Max consecutive wins - cumulative', tooltip: language === 'cn' ? '所选范围内最长连续盈利交易数量。' : 'The longest streak of winning trades.', value: stats.maxConWins, tone: 'good' as const },
      { id: 'sharpeRatio' as const, label: language === 'cn' ? '夏普比率' : 'Sharpe ratio - cumulative', tooltip: language === 'cn' ? '基于日净盈亏均值和波动率估算的年化夏普比率，不代表投资建议。' : 'Annualized Sharpe ratio estimated from daily net P&L mean and volatility.', value: stats.sharpeRatio.toFixed(2), tone: stats.sharpeRatio >= 0 ? 'good' as const : 'bad' as const },
      { id: 'shortWinPct' as const, label: language === 'cn' ? '空头胜率' : 'Shorts win % - cumulative', tooltip: language === 'cn' ? '做空方向已平仓交易中的盈利比例。' : 'The win percentage for closed short trades.', value: `${stats.shortWinRate.toFixed(2)}%`, tone: 'neutral' as const },
      { id: 'sortinoRatio' as const, label: language === 'cn' ? '索提诺比率' : 'Sortino ratio - cumulative', tooltip: language === 'cn' ? '基于日净盈亏和下行波动估算的索提诺比率，不代表投资建议。' : 'Sortino ratio estimated from daily net P&L and downside deviation.', value: stats.sortinoRatio.toFixed(2), tone: stats.sortinoRatio >= 0 ? 'good' as const : 'bad' as const },
      { id: 'winPct' as const, label: language === 'cn' ? '胜率' : 'Win % - cumulative', tooltip: language === 'cn' ? '已平仓交易中盈利交易所占比例。' : 'The percentage of closed trades that finished profitable.', value: `${stats.winRate.toFixed(2)}%`, tone: 'neutral' as const },
      { id: 'winningDays' as const, label: language === 'cn' ? '盈利天数' : 'Winning days - cumulative', tooltip: language === 'cn' ? '净盈亏大于 0 的交易日数量。' : 'The number of logged days with positive net P&L.', value: stats.winningDays, tone: 'good' as const },
  ] : [];

  const summaryMetricById = useMemo(() => {
      return new Map(summaryMetricDefinitions.map(metric => [metric.id, metric]));
  }, [summaryMetricDefinitions]);

  const visibleSummaryMetricIds = isSummaryEditing ? draftSummaryMetricIds : summaryMetricIds;
  const summaryMetrics = visibleSummaryMetricIds
      .map(id => summaryMetricById.get(id))
      .filter(Boolean) as typeof summaryMetricDefinitions;
  const hiddenSummaryMetrics = ALL_SUMMARY_METRIC_IDS
      .filter(id => !draftSummaryMetricIds.includes(id))
      .map(id => summaryMetricById.get(id))
      .filter(Boolean) as typeof summaryMetricDefinitions;
  const metricCategories = [
      {
          id: 'time',
          label: language === 'cn' ? '时间分析' : 'Time Analysis',
          metricIds: ['avgTradingDaysDuration', 'avgHoldTime', 'longestTradeDuration', 'maxTradingDaysDuration'] as SummaryMetricId[],
      },
      {
          id: 'profitability',
          label: language === 'cn' ? '盈利能力' : 'Profitability',
          metricIds: ['avgDailyNetPnl', 'avgDailyWinLoss', 'avgLoss', 'avgMaxTradeLoss', 'avgMaxTradeProfit', 'avgNetTradePnl', 'avgTradeWinLoss', 'avgWin', 'dailyNetPnl', 'largestLosingTrade', 'largestProfitableTrade', 'netPnl', 'profitFactor', 'tradeExpectancy'] as SummaryMetricId[],
      },
      {
          id: 'risk',
          label: language === 'cn' ? '风险与回撤' : 'Risk & Drawdown',
          metricIds: ['avgDailyNetDrawdown', 'avgPlannedR', 'avgRealizedR', 'breakevenDays', 'breakevenTrades', 'losingDays', 'maxDailyNetDrawdown'] as SummaryMetricId[],
      },
      {
          id: 'activity',
          label: language === 'cn' ? '交易活动与成交量' : 'Trading Activity & Volume',
          metricIds: ['avgDailyVolume', 'dailyNetDrawdown', 'loggedDays', 'longBreakevenTrades', 'longLosingTrades', 'longOpenTrades', 'longTrades', 'longWinningTrades', 'lossTrades', 'netAccountBalance', 'openTrades', 'shortBreakevenTrades', 'shortLosingTrades', 'shortOpenTrades', 'shortTrades', 'shortWinningTrades', 'tradeCount', 'volume', 'winTrades'] as SummaryMetricId[],
      },
      {
          id: 'streaks',
          label: language === 'cn' ? '连续性与稳定性' : 'Streaks & Consistency',
          metricIds: ['avgDailyWinPct', 'longWinPct', 'maxConsecutiveLosingDays', 'maxConsecutiveLosses', 'maxConsecutiveWinningDays', 'maxConsecutiveWins', 'sharpeRatio', 'shortWinPct', 'sortinoRatio', 'winPct', 'winningDays'] as SummaryMetricId[],
      },
  ];
  const normalizedMetricPickerSearch = metricPickerSearch.trim().toLowerCase();
  const visibleMetricCategories = metricCategories
      .map(category => ({
          ...category,
          metrics: category.metricIds
              .map(id => summaryMetricById.get(id))
              .filter(Boolean)
              .filter(metric => !normalizedMetricPickerSearch || metric!.label.toLowerCase().includes(normalizedMetricPickerSearch)) as typeof summaryMetricDefinitions,
      }))
      .filter(category => category.metrics.length > 0);

  const summaryMetricColumns = useMemo(() => {
      return [0, 1, 2, 3].map(columnIndex => summaryMetrics.slice(columnIndex * 4, columnIndex * 4 + 4));
  }, [summaryMetrics]);
  const addMetricColumnIndex = isSummaryEditing && hiddenSummaryMetrics.length > 0
      ? summaryMetricColumns.findIndex(column => column.length < 4)
      : -1;

  const startSummaryEditing = () => {
      setDraftSummaryMetricIds(summaryMetricIds);
      setIsAddMetricMenuOpen(false);
      setIsSummaryEditing(true);
  };

  const cancelSummaryEditing = () => {
      setDraftSummaryMetricIds(summaryMetricIds);
      setIsAddMetricMenuOpen(false);
      setDraggedSummaryMetricId(null);
      setIsSummaryEditing(false);
  };

  const saveSummaryLayout = () => {
      const normalized = normalizeSummaryLayout(draftSummaryMetricIds);
      setSummaryMetricIds(normalized);
      localStorage.setItem(SUMMARY_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
      setIsAddMetricMenuOpen(false);
      setIsSummaryEditing(false);
  };

  const resetSummaryLayout = () => {
      const defaultLayout = getDefaultSummaryLayout();
      setDraftSummaryMetricIds(defaultLayout);
      setSummaryMetricIds(defaultLayout);
      localStorage.removeItem(SUMMARY_LAYOUT_STORAGE_KEY);
      setIsAddMetricMenuOpen(false);
      setIsSummaryEditing(false);
  };

  const removeSummaryMetric = (id: SummaryMetricId) => {
      setDraftSummaryMetricIds(current => current.length <= 1 ? current : current.filter(metricId => metricId !== id));
  };

  const addSummaryMetric = (id: SummaryMetricId) => {
      setDraftSummaryMetricIds(current => current.includes(id) ? current : [...current, id]);
      setIsAddMetricMenuOpen(false);
  };

  const moveSummaryMetric = (targetId: SummaryMetricId) => {
      if (!draggedSummaryMetricId || draggedSummaryMetricId === targetId) return;

      setDraftSummaryMetricIds(current => {
          const fromIndex = current.indexOf(draggedSummaryMetricId);
          const toIndex = current.indexOf(targetId);
          if (fromIndex === -1 || toIndex === -1) return current;

          const next = [...current];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return next;
      });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {t.reports.title}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="relative z-40" ref={datePickerRef}>
                    <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(current => !current)}
                        className="flex min-h-[58px] min-w-[220px] items-center justify-between gap-3 rounded-lg border border-[#d9e1ec] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all hover:border-[#c5cfdd] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#64748B" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9Z" />
                            </svg>
                            <div className="min-w-0 text-left">
                                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                    {getActiveDatePresetLabel()}
                                </p>
                                <p className="truncate text-[14px] font-semibold leading-none text-slate-800 dark:text-white">
                                    {getDateButtonValue()}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`absolute right-0 top-full mt-2 flex w-[640px] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
                        isDatePickerOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'
                    }`}>
                        <div className="flex-1 border-r border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                        className="flex min-h-[58px] min-w-[200px] items-center justify-between gap-3 rounded-lg border border-[#d9e1ec] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all hover:border-[#c5cfdd] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#64748B" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V5Zm16 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h16Zm-4 5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1Z" />
                            </svg>
                            <div className="min-w-0 flex-1 text-left">
                                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Trading Account</p>
                                <p className="max-w-[130px] truncate text-[14px] font-semibold leading-none text-slate-800 dark:text-white">
                                    {currentAccountName}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isAccountSwitcherOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`absolute right-0 top-full mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
                        isAccountSwitcherOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'
                    }`}>
                        <div className="space-y-1 p-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedAccountId('all');
                                    setIsAccountSwitcherOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                    selectedAccountId === 'all'
                                        ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                            >
                                {language === 'cn' ? '所有账户' : 'All Accounts'}
                                {selectedAccountId === 'all' && <Check className="h-4 w-4" />}
                            </button>
                            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                            {accounts.map(account => (
                                <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedAccountId(account.id);
                                        setIsAccountSwitcherOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                        selectedAccountId === account.id
                                            ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${account.isReal ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="truncate">{account.name}</span>
                                    </span>
                                    {selectedAccountId === account.id && <Check className="h-4 w-4 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Navigation Bar */}
        <div className="relative z-30 -mx-4 flex min-h-[56px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#dfe5ec] bg-white/70 px-4 dark:border-slate-800 dark:bg-slate-900/60 md:-mx-8 md:px-8">
            <div className="flex min-h-[56px] max-w-full flex-wrap items-center gap-x-[27px] gap-y-0 pr-3">
                {REPORT_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const isReportMenuTab = tab.id === 'detailed';
                    const isMenuHighlighted = isReportMenuTab && isReportMenuOpen;
                    return (
                        <div key={tab.id} className="relative" data-report-tab-menu={isReportMenuTab ? true : undefined}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isReportMenuTab) {
                                        setIsReportMenuOpen(current => !current);
                                    } else {
                                        setActiveTab(tab.id);
                                        setIsReportMenuOpen(false);
                                    }
                                }}
                                aria-haspopup={isReportMenuTab ? 'menu' : undefined}
                                aria-expanded={isReportMenuTab ? isReportMenuOpen : undefined}
                                className={`group relative inline-flex h-[56px] items-center gap-[7px] whitespace-nowrap border-b-[2px] px-[2px] text-[14px] font-medium tracking-[-0.01em] transition-colors ${
                                    isActive
                                        ? 'border-[#6f55d8] text-[#6f55d8] dark:text-indigo-400'
                                        : isMenuHighlighted
                                            ? 'border-transparent text-[#6f55d8] dark:text-indigo-400'
                                            : 'border-transparent text-[#707783] hover:text-[#3e4652] dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <ReportTabMark type={tab.id} active={isActive || isMenuHighlighted} />
                                <span className="leading-none">{tab.label}</span>
                                {tab.isNew && (
                                    <span className="ml-[1px] rounded-[3px] bg-[#e7e9f0] px-[6px] py-[3px] text-[10px] font-bold leading-none text-[#4f5664]">
                                        NEW
                                    </span>
                                )}
                                {tab.hasMenu && (
                                    <ChevronDown className={`h-[12px] w-[12px] transition-transform duration-200 ${isReportMenuOpen ? 'rotate-180' : ''} ${isActive || isMenuHighlighted ? 'text-[#6f55d8]' : 'text-[#7f8792]'}`} />
                                )}
                            </button>
                            {isReportMenuTab && (
                                <div
                                    className={`absolute left-[-2px] top-[40px] z-40 w-[180px] origin-top-left overflow-hidden rounded-[10px] border border-[#dedfe4] bg-white py-[7px] shadow-[0_1px_2px_rgba(20,24,36,0.08),0_8px_18px_rgba(20,24,36,0.10)] transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                        isReportMenuOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
                                    }`}
                                    role="menu"
                                >
                                    {reportMenuOptions.map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => selectDetailedReport(option.id)}
                                            className="flex min-h-[36px] w-full items-center px-[12px] py-[8px] text-left text-[13px] font-normal leading-[1.25] text-[#202936] transition-colors hover:bg-[#f7f7f8] dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <span className="min-w-0 truncate">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <button className="group hidden shrink-0 items-center gap-[7px] text-[14px] font-medium tracking-[-0.01em] text-[#707783] transition-colors hover:text-[#3e4652] xl:inline-flex">
                <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center rounded-[7px] transition-colors group-hover:bg-[#eef1f5]" aria-hidden="true">
                    <span className="absolute left-[4px] top-[4px] h-[10px] w-[4px] rounded-l-[2px] border border-[#858c98] transition-colors group-hover:border-[#636b77]" />
                    <span className="absolute right-[4px] top-[4px] h-[10px] w-[4px] rounded-r-[2px] border border-[#858c98] transition-colors group-hover:border-[#636b77]" />
                    <span className="absolute left-[8.5px] top-[5px] h-[8px] w-[1.5px] rounded-full bg-[#858c98] transition-colors group-hover:bg-[#636b77]" />
                </span>
                {language === 'cn' ? '阅读指南' : 'Read guide'}
            </button>
        </div>
      </div>

      {/* --- PERFORMANCE TAB --- */}
      {activeTab === 'performance' && (
          <div className="space-y-5 animate-fade-in">
              <div className="flex justify-end gap-2">
                  <div className="relative" data-pnl-display-menu>
                      <button
                          type="button"
                          onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                          className={`${reportControlClass} min-w-[106px] justify-between`}
                          aria-expanded={isPnlDisplayMenuOpen}
                          aria-label={language === 'cn' ? '选择盈亏显示口径' : 'Choose P&L display mode'}
                      >
                          <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <div
                          className={`absolute right-0 top-full z-[80] mt-[6px] w-[128px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                              isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                          }`}
                      >
                          {([
                              { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                              { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                          ]).map(option => {
                              const selected = pnlDisplayMode === option.id;
                              return (
                                  <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => {
                                          setPnlDisplayMode(option.id);
                                          setIsPnlDisplayMenuOpen(false);
                                      }}
                                      className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                          selected
                                              ? 'bg-[#e8e4f4] text-[#303044]'
                                              : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                      {option.label}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
                  <button className={reportControlClass}>
                      <Download className="w-4 h-4" />
                      {language === 'cn' ? '导出 PDF' : 'Export PDF'}
                  </button>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-[10px]">
                  {renderChartCard({
                      title: leftChartConfig.label,
                      metricLabel: leftChartConfig.label,
                      metricColor: leftChartColor,
                      secondaryMetricLabel: leftSecondaryChartConfig?.label,
                      secondaryMetricColor: leftSecondaryChartColor,
                      tertiaryMetricLabel: leftTertiaryChartConfig?.label,
                      tertiaryMetricColor: leftTertiaryChartColor,
                      side: 'left',
                      styleMetrics: leftChartStyleMetrics,
                      metricPicker: <ChartMetricPicker side="left" slot="primary" selectedMetricId={leftChartMetricId} excludedMetricIds={[leftSecondaryChartMetricId, leftTertiaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      secondaryMetricPicker: <ChartMetricPicker side="left" slot="secondary" selectedMetricId={leftSecondaryChartMetricId} excludedMetricIds={[leftChartMetricId, leftTertiaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      tertiaryMetricPicker: <ChartMetricPicker side="left" slot="tertiary" selectedMetricId={leftTertiaryChartMetricId} excludedMetricIds={[leftChartMetricId, leftSecondaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      addMetricPicker: <ChartMetricPicker side="left" slot={leftSecondaryChartMetricId ? 'tertiary' : 'secondary'} selectedMetricId={leftSecondaryChartMetricId ? leftTertiaryChartMetricId : leftSecondaryChartMetricId} excludedMetricIds={[leftChartMetricId, leftSecondaryChartMetricId, leftTertiaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      onMetricButtonClick: () => setOpenChartMetricPicker(current => current?.side === 'left' && current.slot === 'primary' ? null : { side: 'left', slot: 'primary' }),
                      onSecondaryMetricButtonClick: () => setOpenChartMetricPicker(current => current?.side === 'left' && current.slot === 'secondary' ? null : { side: 'left', slot: 'secondary' }),
                      onTertiaryMetricButtonClick: () => setOpenChartMetricPicker(current => current?.side === 'left' && current.slot === 'tertiary' ? null : { side: 'left', slot: 'tertiary' }),
                      onAddMetricClick: () => {
                          const nextSlot = leftSecondaryChartMetricId ? 'tertiary' : 'secondary';
                          setOpenChartMetricPicker(current => current?.side === 'left' && current.slot === nextSlot ? null : { side: 'left', slot: nextSlot });
                      },
                      onRemoveSecondaryMetric: () => {
                          setLeftSecondaryChartMetricId(leftTertiaryChartMetricId);
                          setLeftTertiaryChartMetricId(null);
                          setOpenChartMetricPicker(null);
                          setOpenChartVisualDropdown(null);
                          setOpenChartColorDropdown(null);
                          setChartStyleSettings(current => ({ ...current, left: { ...current.left, secondary: current.left.tertiary, tertiary: undefined } }));
                      },
                      onRemoveTertiaryMetric: () => {
                          setLeftTertiaryChartMetricId(null);
                          setOpenChartMetricPicker(null);
                          setOpenChartVisualDropdown(null);
                          setOpenChartColorDropdown(null);
                          setChartStyleSettings(current => ({ ...current, left: { ...current.left, tertiary: undefined } }));
                      },
                      accent: 'text-[#5f636b]',
                      timeframeSide: 'left',
                      featured: true,
                      children: leftChartContent,
                  })}

                  {renderChartCard({
                      title: rightChartConfig.label,
                      metricLabel: rightChartConfig.label,
                      metricColor: rightChartColor,
                      secondaryMetricLabel: rightSecondaryChartConfig?.label,
                      secondaryMetricColor: rightSecondaryChartColor,
                      tertiaryMetricLabel: rightTertiaryChartConfig?.label,
                      tertiaryMetricColor: rightTertiaryChartColor,
                      side: 'right',
                      styleMetrics: rightChartStyleMetrics,
                      metricPicker: <ChartMetricPicker side="right" slot="primary" selectedMetricId={rightChartMetricId} excludedMetricIds={[rightSecondaryChartMetricId, rightTertiaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      secondaryMetricPicker: <ChartMetricPicker side="right" slot="secondary" selectedMetricId={rightSecondaryChartMetricId} excludedMetricIds={[rightChartMetricId, rightTertiaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      tertiaryMetricPicker: <ChartMetricPicker side="right" slot="tertiary" selectedMetricId={rightTertiaryChartMetricId} excludedMetricIds={[rightChartMetricId, rightSecondaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      addMetricPicker: <ChartMetricPicker side="right" slot={rightSecondaryChartMetricId ? 'tertiary' : 'secondary'} selectedMetricId={rightSecondaryChartMetricId ? rightTertiaryChartMetricId : rightSecondaryChartMetricId} excludedMetricIds={[rightChartMetricId, rightSecondaryChartMetricId, rightTertiaryChartMetricId].filter(Boolean) as SummaryMetricId[]} />,
                      onMetricButtonClick: () => setOpenChartMetricPicker(current => current?.side === 'right' && current.slot === 'primary' ? null : { side: 'right', slot: 'primary' }),
                      onSecondaryMetricButtonClick: () => setOpenChartMetricPicker(current => current?.side === 'right' && current.slot === 'secondary' ? null : { side: 'right', slot: 'secondary' }),
                      onTertiaryMetricButtonClick: () => setOpenChartMetricPicker(current => current?.side === 'right' && current.slot === 'tertiary' ? null : { side: 'right', slot: 'tertiary' }),
                      onAddMetricClick: () => {
                          const nextSlot = rightSecondaryChartMetricId ? 'tertiary' : 'secondary';
                          setOpenChartMetricPicker(current => current?.side === 'right' && current.slot === nextSlot ? null : { side: 'right', slot: nextSlot });
                      },
                      onRemoveSecondaryMetric: () => {
                          setRightSecondaryChartMetricId(rightTertiaryChartMetricId);
                          setRightTertiaryChartMetricId(null);
                          setOpenChartMetricPicker(null);
                          setOpenChartVisualDropdown(null);
                          setOpenChartColorDropdown(null);
                          setChartStyleSettings(current => ({ ...current, right: { ...current.right, secondary: current.right.tertiary, tertiary: undefined } }));
                      },
                      onRemoveTertiaryMetric: () => {
                          setRightTertiaryChartMetricId(null);
                          setOpenChartMetricPicker(null);
                          setOpenChartVisualDropdown(null);
                          setOpenChartColorDropdown(null);
                          setChartStyleSettings(current => ({ ...current, right: { ...current.right, tertiary: undefined } }));
                      },
                      accent: 'text-emerald-500',
                      timeframeSide: 'right',
                      featured: true,
                      children: rightChartContent,
                  })}
              </div>

              <div className="relative rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                  <div className="h-[52px] px-4 flex items-center justify-between border-b border-[#e2e6ec] dark:border-slate-800">
                      <div className="flex items-center gap-[34px]">
                          {[
                              { id: 'summary' as const, label: language === 'cn' ? '汇总' : 'Summary' },
                              { id: 'days' as const, label: language === 'cn' ? '天' : 'Days' },
                              { id: 'trades' as const, label: language === 'cn' ? '交易' : 'Trades' },
                          ].map(tab => (
                              <button
                                  key={tab.id}
                                  onClick={() => setSummaryTab(tab.id)}
                                  className={`h-[52px] border-b-2 text-[14px] font-semibold transition-colors ${summaryTab === tab.id ? 'border-[#5b45d6] text-[#5b45d6] dark:text-indigo-400' : 'border-transparent text-[#5f6875] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                              >
                                  {tab.label}
                              </button>
                          ))}
                      </div>
                      {isSummaryEditing ? (
                          <div className="flex items-center gap-[8px]">
                              <button
                                  type="button"
                                  onClick={resetSummaryLayout}
                                  className="h-[32px] px-[10px] text-[13px] font-semibold text-[#6b55cf] transition-colors hover:text-[#4b35b8]"
                              >
                                  {language === 'cn' ? '恢复默认' : 'Reset to default'}
                              </button>
                              <button
                                  type="button"
                                  onClick={cancelSummaryEditing}
                                  className="h-[32px] rounded-[7px] border border-[#dfe4ec] bg-white px-[13px] text-[13px] font-semibold text-[#1f2933] transition-colors hover:border-[#c9d0dc] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              >
                                  {language === 'cn' ? '取消' : 'Cancel'}
                              </button>
                              <button
                                  type="button"
                                  onClick={saveSummaryLayout}
                                  className="h-[32px] rounded-[7px] bg-[#5b45d6] px-[14px] text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(91,69,214,0.22)] transition-colors hover:bg-[#4e3ac4]"
                              >
                                  {language === 'cn' ? '保存' : 'Save'}
                              </button>
                          </div>
                      ) : (
                          <button
                              type="button"
                              onClick={() => {
                                  if (summaryTab !== 'summary') setSummaryTab('summary');
                                  startSummaryEditing();
                              }}
                              className="h-[32px] w-[32px] inline-flex items-center justify-center rounded-[7px] border border-[#dfe4ec] bg-white text-[#1f2933] transition-colors hover:border-[#c9d0dc] hover:text-[#5b45d6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              aria-label={language === 'cn' ? '编辑摘要模块' : 'Edit summary modules'}
                          >
                              <Settings className="h-[17px] w-[17px]" />
                          </button>
                      )}
                  </div>

                  {summaryTab === 'summary' && (
                      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 px-4 py-[14px] ${isSummaryEditing ? 'gap-x-[16px]' : ''}`}>
                          {summaryMetricColumns.map((column, columnIndex) => {
                              const shouldShowAddNew = columnIndex === addMetricColumnIndex;

                              return (
                                  <div
                                      key={columnIndex}
                                      className={`grid grid-cols-1 py-0 md:px-4 xl:min-h-[304px] xl:border-l xl:border-[#e2e6ec] first:xl:border-l-0 first:xl:pl-0 last:xl:pr-0 dark:xl:border-slate-800 ${isSummaryEditing ? 'gap-[14px] md:px-0 xl:border-l-0' : 'gap-[30px]'}`}
                                  >
                                      {column.map(metric => (
                                          <SummaryMetric
                                              key={metric.id}
                                              label={metric.label}
                                              value={metric.value}
                                              tooltip={metric.tooltip}
                                              tone={metric.tone}
                                              isEditing={isSummaryEditing}
                                              onRemove={() => removeSummaryMetric(metric.id)}
                                              tooltipPlacement={columnIndex === 0 ? 'start' : columnIndex === 3 ? 'end' : 'center'}
                                              draggableProps={isSummaryEditing ? {
                                                  draggable: true,
                                                  onDragStart: () => setDraggedSummaryMetricId(metric.id),
                                                  onDragOver: (event) => {
                                                      event.preventDefault();
                                                      moveSummaryMetric(metric.id);
                                                  },
                                                  onDragEnd: () => setDraggedSummaryMetricId(null),
                                                  className: draggedSummaryMetricId === metric.id ? 'opacity-55 cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
                                              } : undefined}
                                          />
                                      ))}

                                      {shouldShowAddNew && (
                                          <div className="relative">
                                              <button
                                                  type="button"
                                                  onClick={() => setIsAddMetricMenuOpen(open => !open)}
                                                  className="flex min-h-[64px] w-full items-center justify-center gap-[4px] rounded-[6px] border border-dashed border-[#dfe3ea] bg-white px-[14px] py-[11px] text-[15px] font-semibold text-[#20232a] transition-colors hover:border-[#cbd3df] hover:bg-[#fafbfc] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
                                              >
                                                  {language === 'cn' ? '新增模块' : 'Add new'}
                                                  <ChevronDown className="h-[15px] w-[15px] text-[#6b55cf]" />
                                              </button>

                                              {isAddMetricMenuOpen && (
                                                  <div className="absolute bottom-full right-[-18px] z-40 mb-[10px] flex max-h-[420px] w-[320px] flex-col overflow-hidden rounded-[10px] border border-[#e2e6ec] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900 xl:right-0">
                                                      <div className="p-[12px] pb-[8px]">
                                                          <div className="relative">
                                                              <Search className="pointer-events-none absolute left-[10px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#8b95a1]" />
                                                              <input
                                                                  value={metricPickerSearch}
                                                                  onChange={(event) => setMetricPickerSearch(event.target.value)}
                                                                  placeholder={language === 'cn' ? '搜索' : 'Search'}
                                                                  className="h-[38px] w-full rounded-[7px] border border-[#d9dee6] bg-white pl-[33px] pr-[10px] text-[14px] font-medium text-[#303844] outline-none transition-colors placeholder:text-[#6f7782] focus:border-[#6b55cf] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                              />
                                                          </div>
                                                      </div>

                                                      <div className="min-h-0 flex-1 overflow-y-auto px-[12px] pb-[8px]">
                                                          {visibleMetricCategories.length > 0 ? visibleMetricCategories.map(category => {
                                                              const isExpanded = expandedMetricCategory === category.id;

                                                              return (
                                                                  <div key={category.id}>
                                                                      <button
                                                                          type="button"
                                                                          onClick={() => setExpandedMetricCategory(isExpanded ? null : category.id)}
                                                                          className={`flex w-full items-center justify-between py-[10px] text-left text-[14px] font-semibold transition-colors ${isExpanded ? 'text-[#5b45d6]' : 'text-[#26303b] hover:text-[#5b45d6] dark:text-slate-200'}`}
                                                                      >
                                                                          {category.label}
                                                                          <ChevronDown className={`h-[17px] w-[17px] transition-transform ${isExpanded ? 'rotate-180 text-[#5b45d6]' : 'text-[#727b86]'}`} />
                                                                      </button>

                                                                      <div className={`overflow-hidden transition-[max-height,padding] duration-200 ease-out ${isExpanded ? 'max-h-[520px] pb-[6px]' : 'max-h-0 pb-0'}`}>
                                                                          <div className="space-y-[1px]">
                                                                          {category.metrics.map(metric => {
                                                                              const isSelected = draftSummaryMetricIds.includes(metric.id);
                                                                              const isFull = draftSummaryMetricIds.length >= 16;
                                                                              const isDisabled = isSelected || isFull;

                                                                              return (
                                                                                  <button
                                                                                      key={metric.id}
                                                                                      type="button"
                                                                                      disabled={isDisabled}
                                                                                      onClick={() => addSummaryMetric(metric.id)}
                                                                                      className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[14px] font-medium leading-[1.45] transition-colors ${
                                                                                          isDisabled
                                                                                              ? 'cursor-not-allowed text-[#b4bac2]'
                                                                                              : 'text-[#26303b] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                                                      }`}
                                                                                  >
                                                                                      {metric.label}
                                                                                  </button>
                                                                              );
                                                                          })}
                                                                          </div>
                                                                      </div>
                                                                  </div>
                                                              );
                                                          }) : (
                                                              <div className="px-[4px] py-[18px] text-[13px] font-medium text-[#69717b] dark:text-slate-400">
                                                                  {language === 'cn' ? '没有匹配的指标' : 'No matching metrics'}
                                                              </div>
                                                          )}
                                                      </div>

                                                      <div className="border-t border-[#e5e7eb] px-[14px] py-[12px]">
                                                          <label className="flex cursor-pointer items-center gap-[12px] text-[14px] font-semibold text-[#20232a] dark:text-slate-100">
                                                              <button
                                                                  type="button"
                                                                  onClick={() => setShowMetricDifference(value => !value)}
                                                                  className={`relative h-[26px] w-[46px] flex-shrink-0 rounded-full transition-colors duration-200 ${showMetricDifference ? 'bg-[#5b45d6]' : 'bg-[#e2e4e8]'}`}
                                                                  aria-pressed={showMetricDifference}
                                                              >
                                                                  <span className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${showMetricDifference ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                                                              </button>
                                                              <span className="min-w-0 whitespace-nowrap">{language === 'cn' ? '显示差值' : 'Show difference'}</span>
                                                          </label>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {summaryTab === 'days' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 px-4 py-[14px]">
                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[132px] xl:border-l xl:border-[#e2e6ec] first:xl:border-l-0 first:xl:pl-0 dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '平均日胜率' : 'Avg daily win %'}
                                  value={`${performanceSummary.avgDailyWinPct.toFixed(2)}% (${stats.winningDays}/${stats.totalDays || 0})`}
                                  tooltip={language === 'cn' ? '盈利交易日数量占所有有交易记录日期的比例，括号内为盈利日/总交易日。' : 'Winning logged days as a percentage of all logged days. The count shows winning days over total days.'}
                                  tone="neutral"
                                  tooltipPlacement="start"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '最大亏损日' : 'Largest losing day'}
                                  value={daysSummary.largestLosingDay ? formatSignedMoney(daysSummary.largestLosingDay.pnl) : '--'}
                                  tooltip={language === 'cn' ? '所选范围内净亏损最大的交易日。' : 'The logged day with the largest net loss in the selected range.'}
                                  tone="bad"
                                  tooltipPlacement="start"
                              />
                          </div>

                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[132px] xl:border-l xl:border-[#e2e6ec] dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss'}
                                  value={performanceSummary.avgDailyWinLoss.toFixed(2)}
                                  tooltip={language === 'cn' ? '盈利日平均收益与亏损日平均亏损的比例。' : 'The ratio between average winning-day result and average losing-day result.'}
                                  tone="neutral"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '平均交易日跨度' : 'Average trading days duration'}
                                  value={formatDuration(daysSummary.averageTradingDayDurationMs)}
                                  tooltip={language === 'cn' ? '按有交易记录的自然日计算。单日维度下，一个交易日按 24 小时计。' : 'Calculated from logged calendar trading days. One logged day is treated as a 24-hour day.'}
                                  tone="neutral"
                              />
                          </div>

                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[132px] xl:border-l xl:border-[#e2e6ec] dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '最大盈利日' : 'Largest profitable day'}
                                  value={daysSummary.largestProfitableDay ? formatSignedMoney(daysSummary.largestProfitableDay.pnl) : '--'}
                                  tooltip={language === 'cn' ? '所选范围内净盈利最大的交易日。' : 'The logged day with the largest net profit in the selected range.'}
                                  tone="good"
                              />
                              <div className="min-h-[64px]">
                                  <div className="flex items-center gap-1 text-[13px] font-medium leading-none text-[#5f6875] dark:text-slate-400">
                                      {language === 'cn' ? '盈亏日分布' : 'Win/loss day mix'}
                                      <span className="group/metric-info relative inline-flex">
                                          <button
                                              type="button"
                                              className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full text-[#7b8490] outline-none transition-colors hover:text-[#4f5662] focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '盈利日、打平日与亏损日的真实占比，用来替代专有评分。' : 'The real distribution of winning, breakeven, and losing days. Used instead of a proprietary score.'}
                                          >
                                              <Info className="h-[14px] w-[14px]" />
                                          </button>
                                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-[9px] hidden w-[286px] -translate-x-1/2 rounded-[3px] bg-[#262626] px-[12px] py-[10px] text-left text-[13px] font-semibold leading-[1.5] text-white shadow-[0_8px_22px_rgba(15,23,42,0.24)] group-hover/metric-info:block group-focus-within/metric-info:block">
                                              {language === 'cn' ? '盈利日、打平日与亏损日的真实占比，用来替代无法计算的专有评分。' : 'The real distribution of winning, breakeven, and losing days, replacing proprietary scores we do not calculate.'}
                                          </span>
                                      </span>
                                  </div>
                                  <div className="mt-[17px] flex h-[8px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                      <div className="bg-[#ff6468]" style={{ width: `${daysSummary.lossDayPct}%` }} />
                                      <div className="bg-[#d6dae1]" style={{ width: `${daysSummary.breakevenDayPct}%` }} />
                                      <div className="bg-[#55c39e]" style={{ width: `${daysSummary.winDayPct}%` }} />
                                  </div>
                                  <div className="mt-[9px] flex items-center justify-between text-[11px] font-semibold text-[#7b8490]">
                                      <span>{daysSummary.lossDayPct.toFixed(0)}%</span>
                                      <span>{daysSummary.winDayPct.toFixed(0)}%</span>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[132px] xl:border-l xl:border-[#e2e6ec] last:xl:pr-0 dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '平均每日净盈亏' : 'Avg daily net P&L'}
                                  value={formatSignedMoney(stats.avgDailyPnl)}
                                  tooltip={language === 'cn' ? '每个有交易日的平均净盈亏。' : 'The average net P&L per logged trading day.'}
                                  tone={stats.avgDailyPnl >= 0 ? 'good' : 'bad'}
                                  tooltipPlacement="end"
                              />
                          </div>
                      </div>
                  )}

                  {summaryTab === 'trades' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 px-4 py-[14px]">
                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[220px] xl:border-l xl:border-[#e2e6ec] first:xl:border-l-0 first:xl:pl-0 dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '胜率' : 'Win %'}
                                  value={`${stats.winRate.toFixed(2)}%`}
                                  tooltip={language === 'cn' ? '已平仓交易中盈利交易的比例。' : 'The percentage of closed trades that finished profitable.'}
                                  tone="neutral"
                                  tooltipPlacement="start"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '多头胜率' : 'Longs win %'}
                                  value={`${stats.longWinRate.toFixed(2)}%`}
                                  tooltip={language === 'cn' ? '做多方向已平仓交易中的盈利比例。' : 'The win percentage for closed long trades.'}
                                  tone="neutral"
                                  tooltipPlacement="start"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '平均单笔净盈亏' : 'Avg net trade P&L'}
                                  value={formatSignedMoney(stats.avgTradePnl)}
                                  tooltip={language === 'cn' ? '每笔已平仓交易的平均净盈亏。' : 'The average net P&L per closed trade.'}
                                  tone={stats.avgTradePnl >= 0 ? 'good' : 'bad'}
                                  tooltipPlacement="start"
                              />
                          </div>

                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[220px] xl:border-l xl:border-[#e2e6ec] dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '平均单笔盈亏比' : 'Avg trade win/loss'}
                                  value={performanceSummary.avgTradeWinLoss.toFixed(2)}
                                  tooltip={language === 'cn' ? '平均盈利交易金额与平均亏损交易金额的比例。' : 'The ratio between the average winning trade and the average losing trade.'}
                                  tone="neutral"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '交易期望值' : 'Trade expectancy'}
                                  value={formatSignedMoney(stats.expectancy)}
                                  tooltip={language === 'cn' ? '每笔已平仓交易的平均预期净盈亏。' : 'The average expected net P&L per closed trade.'}
                                  tone={stats.expectancy >= 0 ? 'good' : 'bad'}
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '平均交易日跨度' : 'Average trading days duration'}
                                  value={formatDuration(daysSummary.averageTradingDayDurationMs)}
                                  tooltip={language === 'cn' ? '按有交易记录的自然日计算。单日维度下，一个交易日按 24 小时计。' : 'Calculated from logged calendar trading days. One logged day is treated as a 24-hour day.'}
                                  tone="neutral"
                              />
                          </div>

                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[220px] xl:border-l xl:border-[#e2e6ec] dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '最大盈利交易' : 'Largest profitable trade'}
                                  value={formatSignedMoney(stats.largestProfit)}
                                  tooltip={language === 'cn' ? '所选范围内盈利金额最大的单笔交易。' : 'The largest profitable trade in the selected range.'}
                                  tone="good"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '最大亏损交易' : 'Largest losing trade'}
                                  value={formatSignedMoney(stats.largestLoss)}
                                  tooltip={language === 'cn' ? '所选范围内亏损金额最大的单笔交易。' : 'The largest losing trade in the selected range.'}
                                  tone="bad"
                              />
                              <div className="min-h-[64px]">
                                  <div className="flex items-center gap-1 text-[13px] font-medium leading-none text-[#5f6875] dark:text-slate-400">
                                      {language === 'cn' ? '交易盈亏分布' : 'Trade win/loss mix'}
                                      <span className="group/metric-info relative inline-flex">
                                          <button
                                              type="button"
                                              className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full text-[#7b8490] outline-none transition-colors hover:text-[#4f5662] focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '盈利、打平、亏损交易占比，用真实交易结果替代专有评分。' : 'Winning, breakeven, and losing trade mix using real trade outcomes.'}
                                          >
                                              <Info className="h-[14px] w-[14px]" />
                                          </button>
                                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-[9px] hidden w-[286px] -translate-x-1/2 rounded-[3px] bg-[#262626] px-[12px] py-[10px] text-left text-[13px] font-semibold leading-[1.5] text-white shadow-[0_8px_22px_rgba(15,23,42,0.24)] group-hover/metric-info:block group-focus-within/metric-info:block">
                                              {language === 'cn' ? '盈利、打平、亏损交易占比。这里用真实交易结果替代无法计算的专有评分。' : 'Winning, breakeven, and losing trade distribution, replacing proprietary scores we do not calculate.'}
                                          </span>
                                      </span>
                                  </div>
                                  <div className="mt-[17px] flex h-[8px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                      <div className="bg-[#ff6468]" style={{ width: `${tradesSummary.lossTradePct}%` }} />
                                      <div className="bg-[#d6dae1]" style={{ width: `${tradesSummary.breakevenTradePct}%` }} />
                                      <div className="bg-[#55c39e]" style={{ width: `${tradesSummary.winTradePct}%` }} />
                                  </div>
                                  <div className="mt-[9px] flex items-center justify-between text-[11px] font-semibold text-[#7b8490]">
                                      <span>{tradesSummary.lossTradePct.toFixed(0)}%</span>
                                      <span>{tradesSummary.winTradePct.toFixed(0)}%</span>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 gap-[30px] py-0 md:px-4 xl:min-h-[220px] xl:border-l xl:border-[#e2e6ec] last:xl:pr-0 dark:xl:border-slate-800">
                              <SummaryMetric
                                  label={language === 'cn' ? '最长持仓时间' : 'Longest trade duration'}
                                  value={formatDuration(tradesSummary.longestTradeDuration)}
                                  tooltip={language === 'cn' ? '所选范围内已平仓交易的最长持仓时长。' : 'The longest duration among closed trades in the selected range.'}
                                  tone="neutral"
                                  tooltipPlacement="end"
                              />
                              <SummaryMetric
                                  label={language === 'cn' ? '空头胜率' : 'Shorts win %'}
                                  value={`${stats.shortWinRate.toFixed(2)}%`}
                                  tooltip={language === 'cn' ? '做空方向已平仓交易中的盈利比例。' : 'The win percentage for closed short trades.'}
                                  tone="neutral"
                                  tooltipPlacement="end"
                              />
                          </div>
                      </div>
                  )}
                  <ReportCardLoadingOverlay radius={8} />
              </div>
          </div>
      )}

      {/* --- OVERVIEW TAB --- */}
      {stats && activeTab === 'overview' && (
        <div className="space-y-[14px] animate-fade-in">
            <div className="flex items-center gap-[10px]">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#73808e]">
                    {language === 'cn' ? '盈亏显示' : 'P&L showing'}
                </span>
                <div className="relative" data-pnl-display-menu>
                    <button
                        type="button"
                        onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                        className="inline-flex h-[36px] min-w-[104px] items-center justify-between gap-[12px] rounded-[6px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-[#cbd3df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5dae3]/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        aria-expanded={isPnlDisplayMenuOpen}
                        aria-label={language === 'cn' ? '选择盈亏显示口径' : 'Choose P&L display mode'}
                    >
                        <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                        <ChevronDown className={`h-[14px] w-[14px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div
                        className={`absolute left-0 top-full z-[80] mt-[6px] w-[128px] origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                            isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                        }`}
                    >
                        {([
                            { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                            { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                        ]).map(option => {
                            const selected = pnlDisplayMode === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        setPnlDisplayMode(option.id);
                                        setIsPnlDisplayMenuOpen(false);
                                    }}
                                    className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                        selected
                                            ? 'bg-[#e8e4f4] text-[#303044]'
                                            : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <section className="relative overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                <div className="px-[18px] pb-[20px] pt-[18px]">
                    <div className="flex items-center gap-[6px]">
                        <h3 className="text-[15px] font-bold uppercase leading-none text-[#20232a] dark:text-slate-100">
                            {language === 'cn' ? '你的统计' : 'Your stats'}
                        </h3>
                        <Info className="h-[13px] w-[13px] fill-[#6b55cf] text-[#6b55cf]" />
                    </div>
                    <div className="mt-[7px] text-[13px] font-bold uppercase leading-none text-[#7a818b]">
                        {language === 'cn' ? '（全部日期）' : '(All dates)'}
                    </div>

                    <div className="mt-[28px] grid max-w-[640px] grid-cols-1 gap-[26px] sm:grid-cols-3">
                        {[
                            {
                                label: language === 'cn' ? '最佳月份' : 'Best month',
                                value: formatSignedMoney(stats.bestMonth),
                                detail: language === 'cn' ? '按月份汇总' : 'per month',
                            },
                            {
                                label: language === 'cn' ? '最差月份' : 'Lowest month',
                                value: formatSignedMoney(stats.lowestMonth),
                                detail: language === 'cn' ? '按月份汇总' : 'per month',
                            },
                            {
                                label: language === 'cn' ? '平均值' : 'Average',
                                value: formatSignedMoney(stats.avgMonth),
                                detail: language === 'cn' ? '每月' : 'per Month',
                            },
                        ].map(item => (
                            <div key={item.label}>
                                <div className="text-[13px] font-bold leading-none text-[#3f454d] dark:text-slate-300">{item.label}</div>
                                <div className="mt-[8px] text-[19px] font-bold leading-none text-[#20232a] tabular-nums dark:text-slate-100">{item.value}</div>
                                <div className="mt-[5px] text-[13px] font-semibold leading-none text-[#7b828c]">{item.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-[44px] border-t border-[#e2e5ea] px-[18px] pb-[20px] lg:grid-cols-2">
                    {[
                        [
                            [language === 'cn' ? '总盈亏' : 'Total P&L', formatSignedMoney(stats.netPnl)],
                            [language === 'cn' ? '平均每日成交额' : 'Average daily volume', (stats.totalVolume / (stats.totalDays || 1)).toFixed(2)],
                            [language === 'cn' ? '平均盈利交易' : 'Average winning trade', formatSignedMoney(stats.avgWin)],
                            [language === 'cn' ? '平均亏损交易' : 'Average losing trade', formatSignedMoney(stats.avgLoss)],
                            [language === 'cn' ? '交易总数' : 'Total number of trades', stats.totalTrades],
                            [language === 'cn' ? '盈利交易数量' : 'Number of winning trades', stats.winCount],
                            [language === 'cn' ? '亏损交易数量' : 'Number of losing trades', stats.lossCount],
                            [language === 'cn' ? '打平交易数量' : 'Number of break even trades', stats.beCount],
                            [language === 'cn' ? '最大连续盈利' : 'Max consecutive wins', stats.maxConWins],
                            [language === 'cn' ? '最大连续亏损' : 'Max consecutive losses', stats.maxConLoss],
                            [language === 'cn' ? '总佣金' : 'Total commissions', formatSignedMoney(0)],
                            [language === 'cn' ? '总费用' : 'Total fees', formatSignedMoney(stats.totalFees)],
                            [language === 'cn' ? '总隔夜费' : 'Total swap', formatSignedMoney(0)],
                            [language === 'cn' ? '最大盈利' : 'Largest profit', formatSignedMoney(stats.largestProfit)],
                            [language === 'cn' ? '最大亏损' : 'Largest loss', formatSignedMoney(stats.largestLoss)],
                            [language === 'cn' ? '平均持仓时间（全部交易）' : 'Average hold time (All trades)', formatDuration(stats.avgHoldAll)],
                            [language === 'cn' ? '平均持仓时间（盈利交易）' : 'Average hold time (Winning trades)', formatDuration(stats.avgHoldWin)],
                            [language === 'cn' ? '平均持仓时间（亏损交易）' : 'Average hold time (Losing trades)', formatDuration(stats.avgHoldLoss)],
                            [language === 'cn' ? '平均持仓时间（打平交易）' : 'Average hold time (Scratch trades)', formatDuration(stats.avgHoldScratch)],
                            [language === 'cn' ? '平均单笔盈亏' : 'Average trade P&L', formatSignedMoney(stats.avgTradePnl)],
                            [language === 'cn' ? '盈利因子' : 'Profit factor', stats.profitFactor >= 999 ? '999+' : stats.profitFactor.toFixed(2)],
                        ],
                        [
                            [language === 'cn' ? '未平仓交易' : 'Open trades', stats.openCount],
                            [language === 'cn' ? '总交易日' : 'Total trading days', stats.totalDays],
                            [language === 'cn' ? '盈利天数' : 'Winning days', stats.winningDays],
                            [language === 'cn' ? '亏损天数' : 'Losing days', stats.losingDays],
                            [language === 'cn' ? '打平天数' : 'Breakeven days', stats.beDays],
                            [language === 'cn' ? '记录天数' : 'Logged days', stats.totalDays],
                            [language === 'cn' ? '最大连续盈利天数' : 'Max consecutive winning days', stats.maxConWinDays],
                            [language === 'cn' ? '最大连续亏损天数' : 'Max consecutive losing days', stats.maxConLossDays],
                            [language === 'cn' ? '平均每日盈亏' : 'Average daily P&L', formatSignedMoney(stats.avgDailyPnl)],
                            [language === 'cn' ? '平均盈利日盈亏' : 'Average winning day P&L', daysSummary.largestProfitableDay ? formatSignedMoney(daysSummary.largestProfitableDay.pnl) : '--'],
                            [language === 'cn' ? '平均亏损日盈亏' : 'Average losing day P&L', daysSummary.largestLosingDay ? formatSignedMoney(daysSummary.largestLosingDay.pnl) : '--'],
                            [language === 'cn' ? '最大盈利日（盈利）' : 'Largest profitable day (Profits)', daysSummary.largestProfitableDay ? formatSignedMoney(daysSummary.largestProfitableDay.pnl) : '--'],
                            [language === 'cn' ? '最大亏损日（亏损）' : 'Largest losing day (Losses)', formatSignedMoney(stats.largestLosingDay)],
                            [language === 'cn' ? '平均计划 R 倍数' : 'Average planned R-Multiple', performanceSummary.avgPlannedR === null ? '0R' : `${performanceSummary.avgPlannedR.toFixed(2)}R`],
                            [language === 'cn' ? '平均实现 R 倍数' : 'Average realized R-Multiple', `${stats.avgRealizedR.toFixed(2)}R`],
                            [language === 'cn' ? '交易期望值' : 'Trade expectancy', formatSignedMoney(stats.expectancy)],
                            [language === 'cn' ? '最大回撤' : 'Max drawdown', formatSignedMoney(stats.netPnl)],
                            [language === 'cn' ? '最大回撤 %' : 'Max drawdown, %', '0'],
                            [language === 'cn' ? '平均回撤' : 'Average drawdown', formatSignedMoney(performanceSummary.avgDailyNetDrawdown)],
                            [language === 'cn' ? '平均回撤 %' : 'Average drawdown, %', '0'],
                        ],
                    ].map((column, columnIndex) => (
                        <div key={columnIndex} className="pt-[8px]">
                            {column.map(([label, value]) => (
                                <div key={String(label)} className="flex min-h-[30px] items-center justify-between border-b border-[#e6e8ec] px-[4px] text-[13px] font-semibold leading-none last:border-b-0">
                                    <span className="text-[#737a83]">{label}</span>
                                    <span className="text-right text-[#737a83] tabular-nums">{value}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <ReportCardLoadingOverlay radius={8} />
            </section>

            <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
                <section className="relative overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                    <div className="flex h-[58px] items-center justify-between border-b border-[#e6e8ec] px-[18px]">
                        <div className="flex items-center gap-[13px]">
                            <h3 className="text-[15px] font-bold uppercase text-[#20232a] dark:text-slate-100">
                                {language === 'cn' ? '每日净累计盈亏' : 'Daily net cumulative P&L'}
                            </h3>
                            <span className="text-[13px] font-bold uppercase text-[#7b828c]">{language === 'cn' ? '（全部日期）' : '(All dates)'}</span>
                        </div>
                        <Info className="h-[13px] w-[13px] fill-[#6b55cf] text-[#6b55cf]" />
                    </div>
                    <div className="h-[330px] px-[18px] pb-[22px] pt-[22px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performancePnlDisplayData} margin={{ top: 8, right: 18, left: 16, bottom: 24 }}>
                                <defs>
                                    <linearGradient id="overviewCumulativePnlFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isPnlTrendingDown ? '#ff6468' : '#6b55cf'} stopOpacity={0.36} />
                                        <stop offset="62%" stopColor={isPnlTrendingDown ? '#ff6468' : '#6b55cf'} stopOpacity={0.14} />
                                        <stop offset="100%" stopColor={isPnlTrendingDown ? '#ff6468' : '#6b55cf'} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe5eb" strokeOpacity={0.82} />
                                <XAxis dataKey="label" ticks={performancePnlXAxisTicks} interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 600 }} dy={16} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 600 }} tickFormatter={(value) => formatMoney(Number(value), true)} width={58} />
                                <Tooltip content={<PnlTooltip />} cursor={{ stroke: '#9aa3ae', strokeDasharray: '3 3' }} />
                                <ReferenceLine y={0} stroke="#dfe5eb" strokeDasharray="3 3" />
                                <Area type="monotone" dataKey="cumulativePnl" stroke="#7b68d9" strokeWidth={1.8} fill="url(#overviewCumulativePnlFill)" dot={false} activeDot={{ r: 4, fill: '#fff', stroke: '#7b68d9', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <ReportCardLoadingOverlay radius={8} />
                </section>

                <section className="relative overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                    <div className="flex h-[58px] items-center border-b border-[#e6e8ec] px-[18px]">
                        <div className="flex items-center gap-[13px]">
                            <h3 className="text-[15px] font-bold uppercase text-[#20232a] dark:text-slate-100">
                                {language === 'cn' ? '每日净盈亏' : 'Net daily P&L'}
                            </h3>
                            <span className="text-[13px] font-bold uppercase text-[#7b828c]">{language === 'cn' ? '（全部日期）' : '(All dates)'}</span>
                        </div>
                    </div>
                    <div className="h-[330px] px-[18px] pb-[22px] pt-[22px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performancePnlDisplayData} margin={{ top: 8, right: 18, left: 16, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe5eb" strokeOpacity={0.82} />
                                <XAxis dataKey="label" ticks={performancePnlXAxisTicks} interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 600 }} dy={16} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 600 }} tickFormatter={(value) => formatMoney(Number(value), true)} width={58} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<PnlTooltip />} />
                                <ReferenceLine y={0} stroke="#dfe5eb" strokeDasharray="3 3" />
                                <Bar dataKey="pnl" barSize={24} radius={[2, 2, 0, 0]}>
                                    {performancePnlDisplayData.map((entry, index) => (
                                        <Cell key={`overview-pnl-cell-${index}`} fill={entry.pnl >= 0 ? '#55c39e' : '#f15f63'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <ReportCardLoadingOverlay radius={8} />
                </section>
            </div>
        </div>
      )}

      {/* --- DETAILED TAB --- */}
      {activeTab === 'detailed' && (
          <div className="space-y-6 animate-fade-in">
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase px-3 whitespace-nowrap">
                          {t.reports.filters.label}
                      </div>
                      {detailedFilterOptions.map((filter, i) => (
                          <button 
                            key={filter.id} 
                            onClick={() => setDetailedFilter(filter.id)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${detailedFilter === filter.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                              {filter.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Time Interval Selector - Placed here above charts */}
              {detailedFilter === 'TIME' && (
                  <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.reports.filters.timeInterval}</span>
                      <div className="relative group z-30">
                          <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors shadow-sm">
                              {timeInterval}
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>
                          <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 hidden group-hover:block animate-fade-in-up origin-top-left">
                              {['1 Hour', '30 Minutes', '15 Minutes', '5 Minutes'].map(opt => (
                                  <div 
                                    key={opt} 
                                    onClick={() => setTimeInterval(opt)}
                                    className={`px-3 py-2 text-xs font-medium rounded-lg cursor-pointer ${timeInterval === opt ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                  >
                                      {opt}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* Dynamic Charts based on Filter */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distribution Chart */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{distChartTitle}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{t.reports.charts.allDates}</p>
                          </div>
                          <div className="flex gap-2">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <Info className="w-4 h-4 text-slate-400" />
                          </div>
                      </div>
                      <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              {/* 
                                  Conditional Chart Type: 
                                  layout="vertical" means Y-axis is category (Horizontal Bars). 
                                  layout="horizontal" means X-axis is category (Vertical Bars).
                              */}
                              <BarChart 
                                data={detailedChartData} 
                                layout={chartLayout}
                                margin={chartLayout === 'horizontal' ? { top: 5, right: 0, left: 0, bottom: 0 } : { top: 5, right: 30, left: 20, bottom: 20 }}
                              >
                                  <CartesianGrid strokeDasharray="3 3" vertical={chartLayout === 'horizontal'} horizontal={chartLayout === 'vertical'} stroke="#e2e8f0" opacity={0.3} />
                                  
                                  {chartLayout === 'horizontal' ? (
                                      <>
                                        <XAxis dataKey="label" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} interval={xInterval} />
                                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                      </>
                                  ) : (
                                      <>
                                        <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="label" type="category" width={90} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                                      </>
                                  )}
                                  
                                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }} />
                                  <Bar dataKey="count" fill="#6366f1" radius={chartLayout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]} barSize={barSize} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Performance Chart */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{pnlChartTitle}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{t.reports.charts.allDates}</p>
                          </div>
                          <div className="flex gap-2">
                              <Star className="w-4 h-4 text-slate-300 hover:text-amber-400 transition-colors" />
                              <Info className="w-4 h-4 text-slate-400" />
                          </div>
                      </div>
                      <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={detailedChartData} 
                                layout={chartLayout}
                                margin={chartLayout === 'horizontal' ? { top: 5, right: 0, left: 0, bottom: 0 } : { top: 5, right: 30, left: 20, bottom: 20 }}
                              >
                                  <CartesianGrid strokeDasharray="3 3" vertical={chartLayout === 'horizontal'} horizontal={chartLayout === 'vertical'} stroke="#e2e8f0" opacity={0.3} />
                                  
                                  {chartLayout === 'horizontal' ? (
                                      <>
                                        <XAxis dataKey="label" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} interval={xInterval} />
                                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                        <ReferenceLine y={0} stroke="#94a3b8" />
                                      </>
                                  ) : (
                                      <>
                                        <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                        <YAxis dataKey="label" type="category" width={90} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                                        <ReferenceLine x={0} stroke="#94a3b8" />
                                      </>
                                  )}

                                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }} formatter={(val: number) => [`$${val.toFixed(2)}`, 'Net P&L']} />
                                  
                                  <Bar dataKey="netPnl" radius={chartLayout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]} barSize={barSize}>
                                      {detailedChartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.netPnl >= 0 ? '#10b981' : '#f43f5e'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* Summary Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm">{t.reports.table.summary}</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                  <th className="px-6 py-4">{getDetailedFilterLabel(detailedFilter)}</th>
                                  <th className="px-6 py-4 text-right">{t.reports.table.netProfits}</th>
                                  <th className="px-6 py-4 w-48 text-center">{t.reports.table.winPct}</th>
                                  <th className="px-6 py-4 text-right text-emerald-500">{t.reports.table.totalProfits}</th>
                                  <th className="px-6 py-4 text-right text-rose-500">{t.reports.table.totalLoss}</th>
                                  <th className="px-6 py-4 text-right">{t.reports.table.trades}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {detailedChartData.map((row) => (
                                  <tr key={row.label} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{row.label}</td>
                                      <td className={`px-6 py-4 text-right font-mono font-bold ${row.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                          ${row.netPnl.toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                                  <div className="h-full bg-emerald-500" style={{ width: `${row.winRate}%` }}></div>
                                                  <div className="h-full bg-rose-500" style={{ width: `${100 - row.winRate}%` }}></div>
                                              </div>
                                              <span className="text-xs font-mono w-8 text-right">{row.winRate.toFixed(0)}%</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-emerald-500">${row.grossProfit.toFixed(2)}</td>
                                      <td className="px-6 py-4 text-right font-mono text-rose-500">${Math.abs(row.grossLoss).toFixed(2)}</td>
                                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">{row.count}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- RISK TAB --- */}
      {activeTab === 'risk' && (
          <div className="space-y-6 animate-fade-in">
              {/* Header with P&L Toggle (Static for now) & Filter Bar */}
              <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">P&L SHOWING</span>
                      <button className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors shadow-sm">
                          NET P&L <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase px-3">
                          {t.reports.filters.label}
                      </div>
                      <button 
                        onClick={() => setRiskFilter('R-MULTIPLE')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${riskFilter === 'R-MULTIPLE' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                          R-MULTIPLE
                      </button>
                      <button 
                        onClick={() => setRiskFilter('POSITION SIZE')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${riskFilter === 'POSITION SIZE' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                          POSITION SIZE
                      </button>
                  </div>
              </div>

              {/* R-MULTIPLE Charts */}
              {riskFilter === 'R-MULTIPLE' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Distribution Chart */}
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{t.reports.charts.distTitle} R-Multiple</h3>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{t.reports.charts.allDates}</p>
                              </div>
                              <div className="flex gap-2">
                                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                  <Info className="w-4 h-4 text-slate-400" />
                              </div>
                          </div>
                          <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart 
                                    data={rMultipleStats} 
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                                  >
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                      <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                      <YAxis dataKey="label" type="category" width={100} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }} />
                                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Performance Chart */}
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{t.reports.charts.perfTitle} R-Multiple</h3>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{t.reports.charts.allDates}</p>
                              </div>
                              <div className="flex gap-2">
                                  <Star className="w-4 h-4 text-slate-300 hover:text-amber-400 transition-colors" />
                                  <Info className="w-4 h-4 text-slate-400" />
                              </div>
                          </div>
                          <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart 
                                    data={rMultipleStats} 
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                                  >
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                      <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                      <YAxis dataKey="label" type="category" width={100} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                                      <ReferenceLine x={0} stroke="#94a3b8" />
                                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }} formatter={(val: number) => [`$${val.toFixed(2)}`, 'Net P&L']} />
                                      
                                      <Bar dataKey="netPnl" radius={[0, 4, 4, 0]} barSize={20}>
                                          {rMultipleStats.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.netPnl >= 0 ? '#10b981' : '#f43f5e'} />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              )}

              {/* Summary Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm">{t.reports.table.summary}</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                  <th className="px-6 py-4">R-Multiple</th>
                                  <th className="px-6 py-4 text-right">{t.reports.table.netProfits}</th>
                                  <th className="px-6 py-4 w-48 text-center">{t.reports.table.winPct}</th>
                                  <th className="px-6 py-4 text-right text-emerald-500">{t.reports.table.totalProfits}</th>
                                  <th className="px-6 py-4 text-right text-rose-500">{t.reports.table.totalLoss}</th>
                                  <th className="px-6 py-4 text-right">{t.reports.table.trades}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {rMultipleStats.map((row) => (
                                  <tr key={row.label} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{row.label}</td>
                                      <td className={`px-6 py-4 text-right font-mono font-bold ${row.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                          ${row.netPnl.toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                                  <div className="h-full bg-emerald-500" style={{ width: `${row.winRate}%` }}></div>
                                                  <div className="h-full bg-rose-500" style={{ width: `${100 - row.winRate}%` }}></div>
                                              </div>
                                              <span className="text-xs font-mono w-8 text-right">{row.winRate.toFixed(0)}%</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-emerald-500">${row.grossProfit.toFixed(2)}</td>
                                      <td className="px-6 py-4 text-right font-mono text-rose-500">${Math.abs(row.grossLoss).toFixed(2)}</td>
                                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">{row.count}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- CALENDAR TAB --- */}
      {activeTab === 'calendar' && (
          <div className="space-y-6 animate-fade-in">
              {/* Header Controls */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-4">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                          <button onClick={() => setCalendarYear(y => y - 1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm">
                              <ChevronLeft className="w-4 h-4 text-slate-500" />
                          </button>
                          <span className="px-4 font-bold text-slate-900 dark:text-white text-lg">{calendarYear}</span>
                          <button onClick={() => setCalendarYear(y => y + 1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm">
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                          </button>
                      </div>
                      
                      <div className="h-8 w-px bg-slate-200 dark:border-slate-700"></div>

                      <div className="flex gap-6 text-sm">
                          <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t.reports.calendar.totalPnl}</p>
                              <p className={`font-mono font-bold ${calendarData.stats.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {calendarData.stats.totalPnl >= 0 ? '+' : ''}${calendarData.stats.totalPnl.toFixed(2)}
                              </p>
                          </div>
                          <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t.reports.calendar.winRate}</p>
                              <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {calendarData.stats.winRate.toFixed(1)}%
                              </p>
                          </div>
                          <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t.reports.calendar.activeDays}</p>
                              <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {calendarData.stats.activeDays}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Year Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => (
                      <div key={monthIndex} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-sm uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                              {new Date(calendarYear, monthIndex).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'long' })}
                          </h3>
                          <div className="grid grid-cols-7 gap-1">
                              {t.reports.calendar.weekdays.map(d => (
                                  <div key={d} className="text-[9px] text-center text-slate-400 font-bold py-1">{d.slice(0, 3)}</div> // Slice for shorter headers if needed
                              ))}
                              {renderMonthGrid(monthIndex)}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- AI Reports Tab --- */}
      {activeTab === 'ai' && (
          <div className="h-full">
              <FeatureGate tier="pro">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[1100px]">
                      {/* Header */}
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <Sparkles className="w-5 h-5 text-indigo-500" />
                                  {language === 'cn' ? '智能分析中心' : 'Intelligent Analysis Center'}
                              </h3>
                              <p className="text-sm text-slate-500 mt-1">
                                  {language === 'cn' 
                                    ? '基于您最近的交易日记，生成深度复盘报告。' 
                                    : 'Generate deep dive reports based on your recent journal entries.'}
                              </p>
                          </div>
                          <div className="flex gap-3">
                              <button 
                                onClick={() => handleGenerateReport('weekly')}
                                disabled={isGeneratingReport}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:shadow-md"
                              >
                                  {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin"/> : <CalendarIcon className="w-4 h-4 text-indigo-500"/>}
                                  {language === 'cn' ? '生成周报' : 'Weekly Report'}
                              </button>
                              <button 
                                onClick={() => handleGenerateReport('monthly')}
                                disabled={isGeneratingReport}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                              >
                                  {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
                                  {language === 'cn' ? '生成月报' : 'Monthly Report'}
                              </button>
                          </div>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/30 space-y-8">
                          {/* Pending Reports - Always show at top if any */}
                          {savedReports.filter(r => r.status === 'pending').length > 0 && (
                              <div className="max-w-4xl mx-auto">
                                  <div className="flex items-center gap-2 mb-4">
                                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                      <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                          {language === 'cn' ? '生成中' : 'Generating'}
                                      </h4>
                                  </div>
                                  <div className="grid gap-3">
                                      {savedReports.filter(r => r.status === 'pending').map(report => renderReportCard(report))}
                                  </div>
                              </div>
                          )}

                          {/* Current Report Display */}
                          {isGeneratingReport ? (
                              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
                                  <div className="relative">
                                      <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin"></div>
                                      <div className="absolute inset-0 flex items-center justify-center">
                                          <Bot className="w-6 h-6 text-indigo-600" />
                                      </div>
                                  </div>
                                  <p className="animate-pulse font-medium">
                                      {language === 'cn' ? 'AI 正在阅读您的交易笔记并生成报告...' : 'AI is analyzing your journals...'}
                                  </p>
                              </div>
                          ) : reportResult ? (
                              <div className="max-w-4xl mx-auto">
                                  <div className="flex justify-end mb-3">
                                      <button
                                          onClick={handleDownloadPdf}
                                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                      >
                                          <Download className="w-4 h-4" />
                                          {language === 'cn' ? '下载 PDF' : 'Download PDF'}
                                      </button>
                                  </div>
                                  <div ref={reportRef} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg animate-fade-in-up overflow-hidden">
                                      <div className="h-1.5 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700" />
                                      <div className="p-10 md:p-14">
                                          <div dangerouslySetInnerHTML={{ __html: reportResult }} />
                                      </div>
                                  </div>
                              </div>
                          ) : savedReports.filter(r => r.status === 'pending').length === 0 && (
                              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                  <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                      <Bot className="w-8 h-8 text-slate-400" />
                                  </div>
                                  <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                                      {language === 'cn' ? '准备好生成您的第一份智能报告了吗？' : 'Ready to generate your first intelligent report?'}
                                  </p>
                                  <p className="text-sm">
                                      {language === 'cn' ? '点击上方按钮开始分析。' : 'Click a button above to start analysis.'}
                                  </p>
                              </div>
                          )}

                          {/* Report History - Completed and Failed reports */}
                          {savedReports.filter(r => r.status !== 'pending').length > 0 && (
                              <div className="max-w-4xl mx-auto">
                                  <div className="flex items-center gap-2 mb-4">
                                      <History className="w-5 h-5 text-slate-500" />
                                      <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                          {language === 'cn' ? '历史报告' : 'Report History'}
                                      </h4>
                                      <span className="text-sm text-slate-400">({savedReports.filter(r => r.status !== 'pending').length})</span>
                                  </div>
                                  <div className="grid gap-3">
                                      {savedReports.filter(r => r.status !== 'pending').map(report => renderReportCard(report))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </FeatureGate>
          </div>
      )}

      {/* Placeholders for tabs not yet fully implemented */}
      {['options', 'wins_losses', 'compare'].includes(activeTab) && (
           <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed text-slate-400">
               <Activity className="w-16 h-16 mb-4 opacity-20" />
               <p className="font-medium">This report view is coming soon.</p>
               <p className="text-sm mt-2 opacity-60">We are building this feature.</p>
           </div>
       )}
    </div>
  );
};

export default Reports;
