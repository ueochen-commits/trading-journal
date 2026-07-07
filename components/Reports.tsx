
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DailyPlan, Notification, Trade, TradeStatus, Direction, Report, TradingAccount, Strategy, TagCategoryDefinition } from '../types';
import { useLanguage } from '../LanguageContext';
import CalendarView from './CalendarView';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ComposedChart, Line, ReferenceLine, Legend, LineChart, PieChart, Pie
} from 'recharts';
import { Calendar as CalendarIcon, Clock, Calculator, Activity, AlertTriangle, Lightbulb, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Sparkles, FileText, Loader2, Bot, Lock, CalendarCheck, Hourglass, Star, Info, ChevronDown, ChevronLeft, ChevronRight, Download, Trash2, Eye, History, MoreVertical, Settings, GripVertical, X, Search, Check } from 'lucide-react';
import FeatureGate from './FeatureGate';
import { generatePeriodicReport } from '../services/geminiService';
import { userDataService } from '../services/userDataService';
import { supabase, saveReport, fetchReports, deleteReport } from '../supabaseClient';

interface ReportsProps {
  trades: Trade[];
  accountSize?: number;
  plans?: DailyPlan[];
  strategies?: Strategy[];
  tagCategories?: TagCategoryDefinition[];
  isDataLoading?: boolean;
  onPushNotification?: (notification: Notification) => void;
  onSavePlan?: (plan: DailyPlan) => void;
  disciplineHistory?: any[];
  riskSettings?: any;
  tradingAccounts?: TradingAccount[];
  selectedAccountId?: string;
  onAccountChange?: (accountId: string) => void;
  onOpenTradeReview?: (tradeId: string) => void;
}

const SUMMARY_LAYOUT_STORAGE_KEY = 'tg_reports_summary_metric_layout_v1';
const REPORT_PREFERENCES_STORAGE_KEY = 'tg_reports_preferences_v1';
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
const SUMMARY_METRIC_ID_SET = new Set<string>(ALL_SUMMARY_METRIC_IDS);
const CHART_TIMEFRAME_VALUES = ['day', 'week', 'month'] as const;
const PNL_DISPLAY_MODE_VALUES = ['net', 'gross'] as const;
const DAY_TIME_REPORT_VIEW_VALUES = ['DAYS', 'MONTHS', 'TIME', 'TRADE DURATION'] as const;
const SYMBOL_REPORT_VIEW_VALUES = ['SYMBOLS', 'INSTRUMENTS', 'PRICES'] as const;
const RISK_REPORT_VIEW_VALUES = ['VOLUMES', 'POSITION SIZES', 'R_MULTIPLES'] as const;
const DAY_TIME_CROSS_METRIC_VALUES = ['winRate', 'pnl', 'trades'] as const;
const DAY_TIME_SYMBOL_LIMIT_VALUES = [5, 10, 20, 'all'] as const;
const CHART_SIDES = ['left', 'right'] as const;
const CHART_SLOTS = ['primary', 'secondary', 'tertiary'] as const;
const REPORT_CHART_Y_TICK_COUNT = 5;

type SummaryMetricId = typeof ALL_SUMMARY_METRIC_IDS[number];
type ChartMetricVisual = 'line' | 'area' | 'bar';
type ChartSide = 'left' | 'right';
type ChartMetricSlot = 'primary' | 'secondary' | 'tertiary';
type ChartTimeframe = 'day' | 'week' | 'month';
type PnlDisplayMode = 'net' | 'gross';
type DayTimeReportView = 'DAYS' | 'MONTHS' | 'TIME' | 'TRADE DURATION';
type SymbolReportView = 'SYMBOLS' | 'INSTRUMENTS' | 'PRICES';
type RiskReportView = 'VOLUMES' | 'POSITION SIZES' | 'R_MULTIPLES';
type DayTimeMetricId = SummaryMetricId;
type DayTimeCrossMetric = 'winRate' | 'pnl' | 'trades';
type DayTimeSymbolLimit = 5 | 10 | 20 | 'all';
type DetailedReportPreferenceKey = 'DAYS' | 'SYMBOLS' | 'RISK' | 'SETUPS' | 'TAGS' | 'WINS_LOSSES';
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

type PersistedChartMetricSelection<TMetricId extends string> = {
  primary: TMetricId;
  secondary: TMetricId | null;
  tertiary: TMetricId | null;
};
type DetailedChartPreference = {
  charts: Record<ChartSide, PersistedChartMetricSelection<DayTimeMetricId>>;
  chartStyleSettings: ChartStyleSettings;
  crossMetric: DayTimeCrossMetric;
  symbolLimit: DayTimeSymbolLimit;
};
type DetailedChartPreferencesMap = Record<DetailedReportPreferenceKey, DetailedChartPreference>;
type ReportPreferences = {
  summaryMetricIds: SummaryMetricId[];
  pnlDisplayMode: PnlDisplayMode;
  chartTimeframes: Record<ChartSide, ChartTimeframe>;
  chartStyleSettings: ChartStyleSettings;
  performanceCharts: Record<ChartSide, PersistedChartMetricSelection<SummaryMetricId>>;
  dayTimeReportView: DayTimeReportView;
  symbolReportView: SymbolReportView;
  riskReportView: RiskReportView;
  detailedChartPreferences: DetailedChartPreferencesMap;
  dayTimeCharts: Record<ChartSide, PersistedChartMetricSelection<DayTimeMetricId>>;
  dayTimeChartStyleSettings: ChartStyleSettings;
  dayTimeCrossMetric: DayTimeCrossMetric;
  dayTimeSymbolLimit: DayTimeSymbolLimit;
  tagReportCategoryId: string;
};

type WinLossDetailChartPoint = {
  date: string;
  label: string;
  tooltipLabel: string;
  value: number;
};

type WinLossDetailSummary = {
  tradeCount: number;
  totalPnl: number;
  avgDailyVolume: number;
  avgWinningTrade: number | null;
  avgLosingTrade: number | null;
  numberOfWinningTrades: number;
  numberOfLosingTrades: number;
  totalCommissions: number;
  chartData: WinLossDetailChartPoint[];
};

type CompareGroupKey = 'left' | 'right';
type CompareSideFilter = 'all' | 'long' | 'short';
type ComparePnlFilter = 'all' | 'win' | 'loss';
type CompareMultiSelectField = 'symbols' | 'tags';
type CompareSelectField = 'side' | 'pnl';
type CompareCalendarField = 'startDate' | 'endDate';
type CompareGroupFilters = {
  symbols: string[];
  tags: string[];
  side: CompareSideFilter;
  pnl: ComparePnlFilter;
  startDate: string;
  endDate: string;
};
type CompareGroupSummary = WinLossDetailSummary & {
  matchedTradeCount: number;
  evaluatedTradeCount: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  winRate: number;
};

const createDefaultCompareGroupFilters = (): CompareGroupFilters => ({
  symbols: [],
  tags: [],
  side: 'all',
  pnl: 'all',
  startDate: '',
  endDate: '',
});

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const DETAILED_REPORT_PREFERENCE_KEYS: DetailedReportPreferenceKey[] = ['DAYS', 'SYMBOLS', 'RISK', 'SETUPS', 'TAGS', 'WINS_LOSSES'];

const createDefaultDetailedChartPreference = (): DetailedChartPreference => ({
  charts: {
      left: { primary: 'netPnl', secondary: 'tradeCount', tertiary: null },
      right: { primary: 'winPct', secondary: 'tradeCount', tertiary: null },
  },
  chartStyleSettings: { left: {}, right: {} },
  crossMetric: 'pnl',
  symbolLimit: 10,
});

const createDefaultDetailedChartPreferencesMap = (): DetailedChartPreferencesMap => ({
  DAYS: createDefaultDetailedChartPreference(),
  SYMBOLS: createDefaultDetailedChartPreference(),
  RISK: createDefaultDetailedChartPreference(),
  SETUPS: createDefaultDetailedChartPreference(),
  TAGS: createDefaultDetailedChartPreference(),
  WINS_LOSSES: createDefaultDetailedChartPreference(),
});

const DEFAULT_REPORT_PREFERENCES: ReportPreferences = {
  summaryMetricIds: getDefaultSummaryLayout(),
  pnlDisplayMode: 'net',
  chartTimeframes: { left: 'day', right: 'day' },
  chartStyleSettings: { left: {}, right: {} },
  performanceCharts: {
      left: { primary: 'netPnl', secondary: null, tertiary: null },
      right: { primary: 'avgDailyWinLoss', secondary: null, tertiary: null },
  },
  dayTimeReportView: 'DAYS',
  symbolReportView: 'SYMBOLS',
  riskReportView: 'VOLUMES',
  detailedChartPreferences: createDefaultDetailedChartPreferencesMap(),
  dayTimeCharts: createDefaultDetailedChartPreference().charts,
  dayTimeChartStyleSettings: createDefaultDetailedChartPreference().chartStyleSettings,
  dayTimeCrossMetric: createDefaultDetailedChartPreference().crossMetric,
  dayTimeSymbolLimit: createDefaultDetailedChartPreference().symbolLimit,
  tagReportCategoryId: 'mistakes',
};

const normalizeSummaryLayout = (ids: unknown): SummaryMetricId[] => {
  if (!Array.isArray(ids)) return getDefaultSummaryLayout();

  const normalized = ids.filter((id): id is SummaryMetricId => typeof id === 'string' && SUMMARY_METRIC_ID_SET.has(id));
  const deduped = Array.from(new Set(normalized));

  return deduped.length > 0 ? deduped : getDefaultSummaryLayout();
};

const normalizeMetricId = (value: unknown, fallback: SummaryMetricId): SummaryMetricId =>
  typeof value === 'string' && SUMMARY_METRIC_ID_SET.has(value) ? value as SummaryMetricId : fallback;

const normalizeOptionalMetricId = (value: unknown): SummaryMetricId | null =>
  typeof value === 'string' && SUMMARY_METRIC_ID_SET.has(value) ? value as SummaryMetricId : null;

const normalizeMetricSelection = <TMetricId extends SummaryMetricId>(
  value: unknown,
  defaults: PersistedChartMetricSelection<TMetricId>
): PersistedChartMetricSelection<TMetricId> => {
  const raw = value && typeof value === 'object' ? value as Partial<Record<ChartMetricSlot, unknown>> : {};
  const primary = normalizeMetricId(raw.primary, defaults.primary) as TMetricId;
  const normalized: PersistedChartMetricSelection<TMetricId> = {
      primary,
      secondary: null,
      tertiary: null,
  };

  const used = new Set<string>([primary]);
  const secondary = normalizeOptionalMetricId(raw.secondary);
  if (secondary && !used.has(secondary)) {
      normalized.secondary = secondary as TMetricId;
      used.add(secondary);
  }

  const tertiary = normalizeOptionalMetricId(raw.tertiary);
  if (tertiary && !used.has(tertiary)) {
      normalized.tertiary = tertiary as TMetricId;
  }

  return normalized;
};

const normalizeEnumValue = <TValue extends string | number>(
  value: unknown,
  allowedValues: readonly TValue[],
  fallback: TValue
): TValue => allowedValues.includes(value as TValue) ? value as TValue : fallback;

const normalizeChartStyleSettings = (value: unknown): ChartStyleSettings => {
  const source = value && typeof value === 'object' ? value as Partial<Record<ChartSide, Partial<Record<ChartMetricSlot, { visual?: unknown; color?: unknown }>>>> : {};
  const normalized = { left: {}, right: {} } as ChartStyleSettings;

  CHART_SIDES.forEach(side => {
      CHART_SLOTS.forEach(slot => {
          const slotValue = source[side]?.[slot];
          if (!slotValue || typeof slotValue !== 'object') return;

          const nextValue: { visual?: ChartMetricVisual; color?: string } = {};
          if (slotValue.visual === 'line' || slotValue.visual === 'area' || slotValue.visual === 'bar') {
              nextValue.visual = slotValue.visual;
          }
          if (typeof slotValue.color === 'string' && slotValue.color.trim().length > 0) {
              nextValue.color = slotValue.color;
          }

          if (nextValue.visual || nextValue.color) {
              normalized[side][slot] = nextValue;
          }
      });
  });

  return normalized;
};

const normalizeDetailedChartPreference = (
  value: unknown,
  fallback: DetailedChartPreference
): DetailedChartPreference => {
  const source = value && typeof value === 'object' ? value as Partial<Record<keyof DetailedChartPreference, unknown>> : {};

  return {
      charts: {
          left: normalizeMetricSelection(source.charts && (source.charts as any).left, fallback.charts.left),
          right: normalizeMetricSelection(source.charts && (source.charts as any).right, fallback.charts.right),
      },
      chartStyleSettings: normalizeChartStyleSettings(source.chartStyleSettings),
      crossMetric: normalizeEnumValue(source.crossMetric, DAY_TIME_CROSS_METRIC_VALUES, fallback.crossMetric),
      symbolLimit: normalizeEnumValue(source.symbolLimit, DAY_TIME_SYMBOL_LIMIT_VALUES, fallback.symbolLimit),
  };
};

const normalizeDetailedChartPreferencesMap = (value: unknown): DetailedChartPreferencesMap => {
  const source = value && typeof value === 'object' ? value as Partial<Record<DetailedReportPreferenceKey, unknown>> : {};
  const defaults = createDefaultDetailedChartPreferencesMap();
  const normalized = {} as DetailedChartPreferencesMap;

  DETAILED_REPORT_PREFERENCE_KEYS.forEach(key => {
      normalized[key] = normalizeDetailedChartPreference(source[key], defaults[key]);
  });

  return normalized;
};

const normalizeReportPreferences = (value: unknown): ReportPreferences => {
  const source = value && typeof value === 'object' ? value as Partial<Record<keyof ReportPreferences, unknown>> : {};
  const normalizedDetailedChartPreferences = normalizeDetailedChartPreferencesMap(source.detailedChartPreferences);
  const legacyDetailedChartPreference = normalizeDetailedChartPreference({
      charts: source.dayTimeCharts,
      chartStyleSettings: source.dayTimeChartStyleSettings,
      crossMetric: source.dayTimeCrossMetric,
      symbolLimit: source.dayTimeSymbolLimit,
  }, DEFAULT_REPORT_PREFERENCES.detailedChartPreferences.DAYS);
  const effectiveDetailedChartPreferences = source.detailedChartPreferences
      ? normalizedDetailedChartPreferences
      : {
          ...normalizedDetailedChartPreferences,
          DAYS: legacyDetailedChartPreference,
      };

  return {
      summaryMetricIds: normalizeSummaryLayout(source.summaryMetricIds),
      pnlDisplayMode: normalizeEnumValue(source.pnlDisplayMode, PNL_DISPLAY_MODE_VALUES, DEFAULT_REPORT_PREFERENCES.pnlDisplayMode),
      chartTimeframes: {
          left: normalizeEnumValue((source.chartTimeframes as any)?.left, CHART_TIMEFRAME_VALUES, DEFAULT_REPORT_PREFERENCES.chartTimeframes.left),
          right: normalizeEnumValue((source.chartTimeframes as any)?.right, CHART_TIMEFRAME_VALUES, DEFAULT_REPORT_PREFERENCES.chartTimeframes.right),
      },
      chartStyleSettings: normalizeChartStyleSettings(source.chartStyleSettings),
      performanceCharts: {
          left: normalizeMetricSelection(source.performanceCharts && (source.performanceCharts as any).left, DEFAULT_REPORT_PREFERENCES.performanceCharts.left),
          right: normalizeMetricSelection(source.performanceCharts && (source.performanceCharts as any).right, DEFAULT_REPORT_PREFERENCES.performanceCharts.right),
      },
      dayTimeReportView: normalizeEnumValue(source.dayTimeReportView, DAY_TIME_REPORT_VIEW_VALUES, DEFAULT_REPORT_PREFERENCES.dayTimeReportView),
      symbolReportView: normalizeEnumValue(source.symbolReportView, SYMBOL_REPORT_VIEW_VALUES, DEFAULT_REPORT_PREFERENCES.symbolReportView),
      riskReportView: normalizeEnumValue(source.riskReportView, RISK_REPORT_VIEW_VALUES, DEFAULT_REPORT_PREFERENCES.riskReportView),
      detailedChartPreferences: effectiveDetailedChartPreferences,
      dayTimeCharts: effectiveDetailedChartPreferences.DAYS.charts,
      dayTimeChartStyleSettings: effectiveDetailedChartPreferences.DAYS.chartStyleSettings,
      dayTimeCrossMetric: effectiveDetailedChartPreferences.DAYS.crossMetric,
      dayTimeSymbolLimit: effectiveDetailedChartPreferences.DAYS.symbolLimit,
      tagReportCategoryId: typeof source.tagReportCategoryId === 'string' && source.tagReportCategoryId.trim().length > 0
          ? source.tagReportCategoryId
          : DEFAULT_REPORT_PREFERENCES.tagReportCategoryId,
  };
};

const loadLocalReportPreferences = (): ReportPreferences | null => {
  try {
      const saved = localStorage.getItem(REPORT_PREFERENCES_STORAGE_KEY);
      return saved ? normalizeReportPreferences(JSON.parse(saved)) : null;
  } catch {
      localStorage.removeItem(REPORT_PREFERENCES_STORAGE_KEY);
      return null;
  }
};

const saveLocalReportPreferences = (preferences: ReportPreferences) => {
  localStorage.setItem(REPORT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};

const getSafeReportHtml = (report: Partial<Report> | null | undefined) => {
    const html = report?.content?.html;
    return typeof html === 'string' ? html : '';
};

class ReportsErrorBoundary extends React.Component<
    { children: React.ReactNode; language: 'cn' | 'en' },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[Reports] Render crash intercepted:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-[420px] items-center justify-center px-6 py-16">
                    <div className="w-full max-w-xl rounded-[16px] border border-[#e5e9f0] bg-white px-8 py-10 text-center shadow-[0_10px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-300">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h2 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100">
                            {this.props.language === 'cn' ? '报表页面加载失败' : 'Reports page failed to load'}
                        </h2>
                        <p className="mt-2 text-[14px] leading-6 text-slate-500 dark:text-slate-400">
                            {this.props.language === 'cn'
                                ? '我们已经拦截了这次异常。请刷新页面重试；如果问题持续存在，我会继续沿着这条报错链修掉。'
                                : 'We intercepted a render error. Refresh and try again; if it persists, we should keep tracing this crash path.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-5 inline-flex h-[40px] items-center justify-center rounded-[10px] bg-[#5f47c9] px-5 text-[14px] font-semibold text-white transition hover:bg-[#533bbd]"
                        >
                            {this.props.language === 'cn' ? '刷新页面' : 'Refresh page'}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const getNiceNumber = (range: number, round: boolean) => {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction = 1;

  if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
  } else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * Math.pow(10, exponent);
};

const getChartAxisTicks = (values: number[], tickCount = REPORT_CHART_Y_TICK_COUNT) => {
  const finiteValues = values.filter(value => Number.isFinite(value));
  if (finiteValues.length === 0) {
      return Array.from({ length: tickCount }, (_, index) => index);
  }

  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);
  if (min === max) {
      const padding = Math.abs(max) > 0 ? Math.abs(max) * 0.25 : 1;
      min -= padding;
      max += padding;
  }

  if (min >= 0) min = 0;
  if (max <= 0) max = 0;

  const niceRange = getNiceNumber(max - min, false);
  const step = getNiceNumber(niceRange / Math.max(1, tickCount - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];

  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
      ticks.push(Number(value.toFixed(8)));
  }

  if (ticks.length <= tickCount) return ticks;
  return Array.from({ length: tickCount }, (_, index) => {
      const value = niceMin + ((niceMax - niceMin) / (tickCount - 1)) * index;
      return Number(value.toFixed(8));
  });
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
  strategies = [],
  tagCategories = [],
  isDataLoading = false,
  onPushNotification,
  onSavePlan,
  disciplineHistory = [],
  riskSettings = null,
  tradingAccounts = [],
  selectedAccountId: externalAccountId = 'all',
  onAccountChange,
  onOpenTradeReview,
}) => {
  const { t, language } = useLanguage();
  const initialLocalReportPreferences = loadLocalReportPreferences() || DEFAULT_REPORT_PREFERENCES;
  
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
  const [detailedFilter, setDetailedFilter] = useState<string | null>(null);
  const [dayTimeReportView, setDayTimeReportView] = useState<DayTimeReportView>(initialLocalReportPreferences.dayTimeReportView);
  const [symbolReportView, setSymbolReportView] = useState<SymbolReportView>(initialLocalReportPreferences.symbolReportView);
  const [riskReportView, setRiskReportView] = useState<RiskReportView>(initialLocalReportPreferences.riskReportView);
  const [detailedChartPreferences, setDetailedChartPreferences] = useState<DetailedChartPreferencesMap>(initialLocalReportPreferences.detailedChartPreferences);
  const [tagReportCategoryId, setTagReportCategoryId] = useState<string>(initialLocalReportPreferences.tagReportCategoryId);
  const [isDayTimeSymbolLimitOpen, setIsDayTimeSymbolLimitOpen] = useState(false);
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
  const [summaryMetricIds, setSummaryMetricIds] = useState<SummaryMetricId[]>(() => loadLocalReportPreferences()?.summaryMetricIds || (() => {
      try {
          const saved = localStorage.getItem(SUMMARY_LAYOUT_STORAGE_KEY);
          return saved ? normalizeSummaryLayout(JSON.parse(saved)) : getDefaultSummaryLayout();
      } catch {
          localStorage.removeItem(SUMMARY_LAYOUT_STORAGE_KEY);
          return getDefaultSummaryLayout();
      }
  })());
  const [draftSummaryMetricIds, setDraftSummaryMetricIds] = useState<SummaryMetricId[]>(summaryMetricIds);
  const [draggedSummaryMetricId, setDraggedSummaryMetricId] = useState<SummaryMetricId | null>(null);
  const [isAddMetricMenuOpen, setIsAddMetricMenuOpen] = useState(false);
  const [metricPickerSearch, setMetricPickerSearch] = useState('');
  const [expandedMetricCategory, setExpandedMetricCategory] = useState<string | null>('time');
  const [showMetricDifference, setShowMetricDifference] = useState(false);
  const [leftChartMetricId, setLeftChartMetricId] = useState<SummaryMetricId>(initialLocalReportPreferences.performanceCharts.left.primary);
  const [rightChartMetricId, setRightChartMetricId] = useState<SummaryMetricId>(initialLocalReportPreferences.performanceCharts.right.primary);
  const [leftSecondaryChartMetricId, setLeftSecondaryChartMetricId] = useState<SummaryMetricId | null>(initialLocalReportPreferences.performanceCharts.left.secondary);
  const [rightSecondaryChartMetricId, setRightSecondaryChartMetricId] = useState<SummaryMetricId | null>(initialLocalReportPreferences.performanceCharts.right.secondary);
  const [leftTertiaryChartMetricId, setLeftTertiaryChartMetricId] = useState<SummaryMetricId | null>(initialLocalReportPreferences.performanceCharts.left.tertiary);
  const [rightTertiaryChartMetricId, setRightTertiaryChartMetricId] = useState<SummaryMetricId | null>(initialLocalReportPreferences.performanceCharts.right.tertiary);
  const [openChartMetricPicker, setOpenChartMetricPicker] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openChartStyleMenu, setOpenChartStyleMenu] = useState<ChartSide | null>(null);
  const [openChartVisualDropdown, setOpenChartVisualDropdown] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openChartColorDropdown, setOpenChartColorDropdown] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openDayTimeChartStyleMenu, setOpenDayTimeChartStyleMenu] = useState<ChartSide | null>(null);
  const [openDayTimeChartVisualDropdown, setOpenDayTimeChartVisualDropdown] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openDayTimeChartColorDropdown, setOpenDayTimeChartColorDropdown] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [openChartTimeframeMenu, setOpenChartTimeframeMenu] = useState<ChartSide | null>(null);
  const [isPnlDisplayMenuOpen, setIsPnlDisplayMenuOpen] = useState(false);
  const [pnlDisplayMode, setPnlDisplayMode] = useState<PnlDisplayMode>(initialLocalReportPreferences.pnlDisplayMode);
  const [chartTimeframes, setChartTimeframes] = useState<Record<ChartSide, ChartTimeframe>>(initialLocalReportPreferences.chartTimeframes);
  const [chartStyleSettings, setChartStyleSettings] = useState<ChartStyleSettings>(initialLocalReportPreferences.chartStyleSettings);
  const [chartMetricPickerSearch, setChartMetricPickerSearch] = useState('');
  const [expandedChartMetricCategory, setExpandedChartMetricCategory] = useState<string | null>('profitability');
  const [openDayTimeMetricPicker, setOpenDayTimeMetricPicker] = useState<{ side: ChartSide; slot: ChartMetricSlot } | null>(null);
  const [dayTimeMetricPickerSearch, setDayTimeMetricPickerSearch] = useState('');
  const [expandedDayTimeMetricCategory, setExpandedDayTimeMetricCategory] = useState<string | null>('time');
  const [hasHydratedReportPreferences, setHasHydratedReportPreferences] = useState(false);
  const lastSavedReportPreferencesRef = useRef<string | null>(null);
  const [compareDraftFilters, setCompareDraftFilters] = useState<Record<CompareGroupKey, CompareGroupFilters>>({
      left: createDefaultCompareGroupFilters(),
      right: createDefaultCompareGroupFilters(),
  });
  const [compareAppliedFilters, setCompareAppliedFilters] = useState<Record<CompareGroupKey, CompareGroupFilters>>({
      left: createDefaultCompareGroupFilters(),
      right: createDefaultCompareGroupFilters(),
  });
  const [compareHasGenerated, setCompareHasGenerated] = useState(false);
  const [activeCompareMultiSelect, setActiveCompareMultiSelect] = useState<{ group: CompareGroupKey; field: CompareMultiSelectField } | null>(null);
  const [compareSearch, setCompareSearch] = useState<Record<CompareGroupKey, Record<CompareMultiSelectField, string>>>({
      left: { symbols: '', tags: '' },
      right: { symbols: '', tags: '' },
  });
  const [activeCompareSelect, setActiveCompareSelect] = useState<{ group: CompareGroupKey; field: CompareSelectField } | null>(null);
  const [activeCompareCalendar, setActiveCompareCalendar] = useState<{ group: CompareGroupKey; field: CompareCalendarField } | null>(null);
  const [compareCalendarViewDate, setCompareCalendarViewDate] = useState<Record<CompareGroupKey, Date>>({
      left: new Date(),
      right: new Date(),
  });

  const getActiveDetailedPreferenceKey = (filter: string | null): DetailedReportPreferenceKey => {
      if (filter === 'SYMBOLS' || filter === 'RISK' || filter === 'SETUPS' || filter === 'TAGS' || filter === 'WINS_LOSSES') {
          return filter;
      }
      return 'DAYS';
  };

  const activeDetailedPreferenceKey = getActiveDetailedPreferenceKey(detailedFilter);
  const activeDetailedChartPreference = detailedChartPreferences[activeDetailedPreferenceKey] || DEFAULT_REPORT_PREFERENCES.detailedChartPreferences[activeDetailedPreferenceKey];
  const dayTimeLeftPrimaryMetric = activeDetailedChartPreference.charts.left.primary;
  const dayTimeLeftSecondaryMetric = activeDetailedChartPreference.charts.left.secondary;
  const dayTimeLeftTertiaryMetric = activeDetailedChartPreference.charts.left.tertiary;
  const dayTimeRightPrimaryMetric = activeDetailedChartPreference.charts.right.primary;
  const dayTimeRightSecondaryMetric = activeDetailedChartPreference.charts.right.secondary;
  const dayTimeRightTertiaryMetric = activeDetailedChartPreference.charts.right.tertiary;
  const dayTimeChartStyleSettings = activeDetailedChartPreference.chartStyleSettings;
  const dayTimeCrossMetric = activeDetailedChartPreference.crossMetric;
  const dayTimeSymbolLimit = activeDetailedChartPreference.symbolLimit;

  const updateActiveDetailedChartPreference = (
      updater: (current: DetailedChartPreference) => DetailedChartPreference
  ) => {
      setDetailedChartPreferences(current => {
          const currentPreference = current[activeDetailedPreferenceKey] || DEFAULT_REPORT_PREFERENCES.detailedChartPreferences[activeDetailedPreferenceKey];
          return {
              ...current,
              [activeDetailedPreferenceKey]: updater(currentPreference),
          };
      });
  };

  const setDayTimeChartStyleSettings = (
      value: ChartStyleSettings | ((current: ChartStyleSettings) => ChartStyleSettings)
  ) => {
      updateActiveDetailedChartPreference(current => ({
          ...current,
          chartStyleSettings: typeof value === 'function' ? value(current.chartStyleSettings) : value,
      }));
  };

  const setDayTimeCrossMetric = (
      value: DayTimeCrossMetric | ((current: DayTimeCrossMetric) => DayTimeCrossMetric)
  ) => {
      updateActiveDetailedChartPreference(current => ({
          ...current,
          crossMetric: typeof value === 'function' ? value(current.crossMetric) : value,
      }));
  };

  const setDayTimeSymbolLimit = (
      value: DayTimeSymbolLimit | ((current: DayTimeSymbolLimit) => DayTimeSymbolLimit)
  ) => {
      updateActiveDetailedChartPreference(current => ({
          ...current,
          symbolLimit: typeof value === 'function' ? value(current.symbolLimit) : value,
      }));
  };

  const setDayTimeMetricSelection = (
      side: ChartSide,
      updater: (
          current: PersistedChartMetricSelection<DayTimeMetricId>
      ) => PersistedChartMetricSelection<DayTimeMetricId>
  ) => {
      updateActiveDetailedChartPreference(current => ({
          ...current,
          charts: {
              ...current.charts,
              [side]: updater(current.charts[side]),
          },
      }));
  };

  const setDayTimeLeftPrimaryMetric = (metricId: DayTimeMetricId) => setDayTimeMetricSelection('left', current => ({ ...current, primary: metricId }));
  const setDayTimeLeftSecondaryMetric = (metricId: DayTimeMetricId | null) => setDayTimeMetricSelection('left', current => ({ ...current, secondary: metricId }));
  const setDayTimeLeftTertiaryMetric = (metricId: DayTimeMetricId | null) => setDayTimeMetricSelection('left', current => ({ ...current, tertiary: metricId }));
  const setDayTimeRightPrimaryMetric = (metricId: DayTimeMetricId) => setDayTimeMetricSelection('right', current => ({ ...current, primary: metricId }));
  const setDayTimeRightSecondaryMetric = (metricId: DayTimeMetricId | null) => setDayTimeMetricSelection('right', current => ({ ...current, secondary: metricId }));
  const setDayTimeRightTertiaryMetric = (metricId: DayTimeMetricId | null) => setDayTimeMetricSelection('right', current => ({ ...current, tertiary: metricId }));

  const getDisplayPnl = (trade: Trade) => {
      const grossPnl = Number(trade.pnl) || 0;
      const fees = Number(trade.fees) || 0;
      return pnlDisplayMode === 'net' ? grossPnl - fees : grossPnl;
  };

  const getTradeVolume = (trade: Trade) => Math.abs((Number(trade.quantity) || 0) * (Number(trade.entryPrice) || 0));

  const getNormalizedSymbol = (trade: Trade) => {
      return (trade.symbol || '').trim().toUpperCase() || (language === 'cn' ? '未知品种' : 'Unknown');
  };

  const getInstrumentLabel = (trade: Trade) => {
      const symbol = getNormalizedSymbol(trade);
      const quoteSuffixes = ['USDT', 'USDC', 'BUSD', 'USD', 'PERP', 'USDTPERP'];
      const matchedSuffix = quoteSuffixes.find(suffix => symbol.endsWith(suffix) && symbol.length > suffix.length + 1);
      if (!matchedSuffix) return symbol;
      return symbol.slice(0, -matchedSuffix.length) || symbol;
  };

  const strategyNameLookup = useMemo(() => {
      const lookup = new Map<string, string>();
      strategies.forEach(strategy => {
          const trimmedName = strategy.name?.trim();
          if (!trimmedName) return;
          lookup.set(trimmedName.toLowerCase(), trimmedName);
      });
      return lookup;
  }, [strategies]);

  const getStrategyLabel = (trade: Trade) => {
      const rawSetup = (trade.setup || '').trim();
      if (!rawSetup) return language === 'cn' ? '未填写策略' : 'No strategy';
      return strategyNameLookup.get(rawSetup.toLowerCase()) || rawSetup;
  };

  const getPriceBucket = (trade: Trade) => {
      const entryPrice = Number(trade.entryPrice) || 0;
      const priceBuckets = language === 'cn'
          ? [
              { key: 'lt-1', label: '低于 1', shortLabel: '<1', min: Number.NEGATIVE_INFINITY, max: 1 },
              { key: '1-5', label: '1 - 5', shortLabel: '1-5', min: 1, max: 5 },
              { key: '5-20', label: '5 - 20', shortLabel: '5-20', min: 5, max: 20 },
              { key: '20-100', label: '20 - 100', shortLabel: '20-100', min: 20, max: 100 },
              { key: '100-500', label: '100 - 500', shortLabel: '100-500', min: 100, max: 500 },
              { key: '500-plus', label: '500 以上', shortLabel: '500+', min: 500, max: Number.POSITIVE_INFINITY },
          ]
          : [
              { key: 'lt-1', label: 'Below 1', shortLabel: '<1', min: Number.NEGATIVE_INFINITY, max: 1 },
              { key: '1-5', label: '1 - 5', shortLabel: '1-5', min: 1, max: 5 },
              { key: '5-20', label: '5 - 20', shortLabel: '5-20', min: 5, max: 20 },
              { key: '20-100', label: '20 - 100', shortLabel: '20-100', min: 20, max: 100 },
              { key: '100-500', label: '100 - 500', shortLabel: '100-500', min: 100, max: 500 },
              { key: '500-plus', label: '500+', shortLabel: '500+', min: 500, max: Number.POSITIVE_INFINITY },
          ];

      return priceBuckets.find(bucket => entryPrice >= bucket.min && entryPrice < bucket.max) || priceBuckets[priceBuckets.length - 1];
  };
  
  // Calendar Report State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [reportCalendarSelectedDay, setReportCalendarSelectedDay] = useState<Date | null>(null);

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

  const normalizedTagCategories = useMemo(() => {
      const ordered = [...tagCategories];
      const knownIds = new Set(ordered.map(category => category.id));

      const discoveredCustomCategoryIds = new Set<string>();
      trades.forEach(trade => {
          Object.keys(trade.customTags || {}).forEach(categoryId => {
              if (categoryId) discoveredCustomCategoryIds.add(categoryId);
          });
      });

      if (!knownIds.has('mistakes')) {
          ordered.unshift({
              id: 'mistakes',
              label: language === 'cn' ? '交易错误' : 'Trade mistakes',
              options: [],
              type: 'multi',
              iconKey: 'tag',
              color: '#f59e0b',
          });
      }

      if (!knownIds.has('custom_tags') && !discoveredCustomCategoryIds.has('custom_tags')) {
          ordered.push({
              id: 'custom_tags',
              label: language === 'cn' ? '自定义标签' : 'Custom tags',
              options: [],
              type: 'multi',
              iconKey: 'tag',
              color: '#10b981',
          });
      }

      discoveredCustomCategoryIds.forEach(categoryId => {
          if (knownIds.has(categoryId)) return;
          ordered.push({
              id: categoryId,
              label: categoryId,
              options: [],
              type: 'multi',
              iconKey: 'tag',
              color: '#10b981',
          });
      });

      return ordered;
  }, [tagCategories, trades, language]);

  const availableTagReportCategories = useMemo(() => {
      return normalizedTagCategories.filter(category => category.id !== 'setup');
  }, [normalizedTagCategories]);

  const getSafeTagValues = (rawValue: unknown) => {
      if (Array.isArray(rawValue)) {
          return rawValue
              .map(value => typeof value === 'string' ? value.trim() : '')
              .filter(Boolean);
      }
      if (typeof rawValue === 'string') {
          const normalized = rawValue.trim();
          return normalized ? [normalized] : [];
      }
      return [] as string[];
  };

  const compareTagSuggestions = useMemo(() => {
      const emptyLabel = language === 'cn' ? '未填写标签' : 'No tag';
      const values = new Set<string>();

      trades.forEach(trade => {
          (trade.mistakes || []).forEach(value => {
              const normalized = value.trim();
              if (normalized) values.add(normalized);
          });

          Object.values(trade.customTags || {}).forEach(categoryValues => {
              getSafeTagValues(categoryValues).forEach(value => {
                  const normalized = value.trim();
                  if (normalized) values.add(normalized);
              });
          });
      });

      if (values.size === 0) {
          return [emptyLabel];
      }

      return Array.from(values).sort((a, b) => a.localeCompare(b, language === 'cn' ? 'zh-CN' : 'en-US'));
  }, [trades, language]);

  const compareSymbolSuggestions = useMemo(() => {
      const values = Array.from(new Set(trades.map(trade => getNormalizedSymbol(trade)).filter(Boolean)));
      return values.sort((a, b) => a.localeCompare(b, 'en-US'));
  }, [trades, language]);

  useEffect(() => {
      if (availableTagReportCategories.length === 0) return;
      const hasActive = availableTagReportCategories.some(category => category.id === tagReportCategoryId);
      if (!hasActive) {
          setTagReportCategoryId(availableTagReportCategories[0].id);
      }
  }, [availableTagReportCategories, tagReportCategoryId]);

  const activeTagReportCategory = useMemo(() => {
      return availableTagReportCategories.find(category => category.id === tagReportCategoryId) || availableTagReportCategories[0] || null;
  }, [availableTagReportCategories, tagReportCategoryId]);

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
      let isMounted = true;

      const applyPreferences = (preferences: ReportPreferences) => {
          setSummaryMetricIds(preferences.summaryMetricIds);
          setDraftSummaryMetricIds(preferences.summaryMetricIds);
          setPnlDisplayMode(preferences.pnlDisplayMode);
          setChartTimeframes(preferences.chartTimeframes);
          setChartStyleSettings(preferences.chartStyleSettings);
          setLeftChartMetricId(preferences.performanceCharts.left.primary);
          setLeftSecondaryChartMetricId(preferences.performanceCharts.left.secondary);
          setLeftTertiaryChartMetricId(preferences.performanceCharts.left.tertiary);
          setRightChartMetricId(preferences.performanceCharts.right.primary);
          setRightSecondaryChartMetricId(preferences.performanceCharts.right.secondary);
          setRightTertiaryChartMetricId(preferences.performanceCharts.right.tertiary);
          setDayTimeReportView(preferences.dayTimeReportView);
          setSymbolReportView(preferences.symbolReportView);
          setRiskReportView(preferences.riskReportView);
          setDetailedChartPreferences(preferences.detailedChartPreferences);
          setTagReportCategoryId(preferences.tagReportCategoryId);
      };

      const hydrateReportPreferences = async () => {
          const localPreferences = loadLocalReportPreferences();
          if (localPreferences && isMounted) {
              applyPreferences(localPreferences);
              lastSavedReportPreferencesRef.current = JSON.stringify(localPreferences);
          }

          const result = await userDataService.getReportPreferences();
          if (!isMounted) return;

          if (!result.error && result.data) {
              const normalized = normalizeReportPreferences(result.data);
              applyPreferences(normalized);
              saveLocalReportPreferences(normalized);
              localStorage.setItem(SUMMARY_LAYOUT_STORAGE_KEY, JSON.stringify(normalized.summaryMetricIds));
              lastSavedReportPreferencesRef.current = JSON.stringify(normalized);
          }

          setHasHydratedReportPreferences(true);
      };

      hydrateReportPreferences();

      return () => {
          isMounted = false;
      };
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
      if (!openDayTimeChartStyleMenu) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest(`[data-day-time-chart-style-root="${openDayTimeChartStyleMenu}"]`)) return;
          setOpenDayTimeChartStyleMenu(null);
          setOpenDayTimeChartVisualDropdown(null);
          setOpenDayTimeChartColorDropdown(null);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openDayTimeChartStyleMenu]);

  const reportPreferences = useMemo<ReportPreferences>(() => normalizeReportPreferences({
      summaryMetricIds,
      pnlDisplayMode,
      chartTimeframes,
      chartStyleSettings,
      performanceCharts: {
          left: {
              primary: leftChartMetricId,
              secondary: leftSecondaryChartMetricId,
              tertiary: leftTertiaryChartMetricId,
          },
          right: {
              primary: rightChartMetricId,
              secondary: rightSecondaryChartMetricId,
              tertiary: rightTertiaryChartMetricId,
          },
      },
      dayTimeReportView,
      symbolReportView,
      riskReportView,
      detailedChartPreferences,
      dayTimeCharts: detailedChartPreferences.DAYS.charts,
      dayTimeChartStyleSettings: detailedChartPreferences.DAYS.chartStyleSettings,
      dayTimeCrossMetric: detailedChartPreferences.DAYS.crossMetric,
      dayTimeSymbolLimit: detailedChartPreferences.DAYS.symbolLimit,
      tagReportCategoryId,
  }), [
      summaryMetricIds,
      pnlDisplayMode,
      chartTimeframes,
      chartStyleSettings,
      leftChartMetricId,
      leftSecondaryChartMetricId,
      leftTertiaryChartMetricId,
      rightChartMetricId,
      rightSecondaryChartMetricId,
      rightTertiaryChartMetricId,
      dayTimeReportView,
      symbolReportView,
      riskReportView,
      detailedChartPreferences,
      tagReportCategoryId,
  ]);

  useEffect(() => {
      if (!hasHydratedReportPreferences) return;

      const serialized = JSON.stringify(reportPreferences);
      if (serialized === lastSavedReportPreferencesRef.current) return;

      saveLocalReportPreferences(reportPreferences);
      localStorage.setItem(SUMMARY_LAYOUT_STORAGE_KEY, JSON.stringify(reportPreferences.summaryMetricIds));

      const timer = window.setTimeout(async () => {
          const result = await userDataService.saveReportPreferences(reportPreferences);
          if (!result.error) {
              lastSavedReportPreferencesRef.current = serialized;
          } else {
              console.error('[Reports] Failed to save report preferences:', result.error);
          }
      }, 500);

      return () => window.clearTimeout(timer);
  }, [hasHydratedReportPreferences, reportPreferences]);

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
      if (!isDayTimeSymbolLimitOpen) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest('[data-day-time-symbol-limit-menu]')) return;
          setIsDayTimeSymbolLimitOpen(false);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isDayTimeSymbolLimitOpen]);

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
      if (!openDayTimeMetricPicker) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (target instanceof Element && target.closest('[data-day-time-metric-picker-root]')) return;
          setOpenDayTimeMetricPicker(null);
          setDayTimeMetricPickerSearch('');
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openDayTimeMetricPicker]);

  useEffect(() => {
      if (!activeCompareMultiSelect && !activeCompareSelect && !activeCompareCalendar) return;

      const handlePointerDown = (event: PointerEvent) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest('[data-compare-field-root]')) return;
          setActiveCompareMultiSelect(null);
          setActiveCompareSelect(null);
          setActiveCompareCalendar(null);
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeCompareMultiSelect, activeCompareSelect, activeCompareCalendar]);

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
                  setReportResult(getSafeReportHtml(latestCompleted));
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
          grouped[date] = (grouped[date] || 0) + getDisplayPnl(t);
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
  }, [trades, accountSize, pnlDisplayMode]);

  // --- Calendar Data Preparation ---
  const calendarData = useMemo(() => {
      type CalendarDaySummary = {
          pnl: number;
          count: number;
          wins: number;
          losses: number;
          closedCount: number;
      };

      const dailyMap: Record<string, CalendarDaySummary> = {};
      const yearTrades = trades.filter(t => new Date(t.entryDate).getFullYear() === calendarYear);

      yearTrades.forEach(trade => {
          const date = new Date(trade.entryDate).toLocaleDateString('en-CA');
          if (!dailyMap[date]) {
              dailyMap[date] = { pnl: 0, count: 0, wins: 0, losses: 0, closedCount: 0 };
          }
          const day = dailyMap[date];
          const displayPnl = getDisplayPnl(trade);
          day.pnl += displayPnl;
          day.count += 1;
          if (trade.status !== TradeStatus.OPEN && trade.exitDate) {
              day.closedCount += 1;
          }
          if (displayPnl > 0) day.wins += 1;
          if (displayPnl < 0) day.losses += 1;
      });

      const yearClosedTrades = yearTrades.filter(t => t.status !== TradeStatus.OPEN && t.exitDate);
      const totalPnl = yearClosedTrades.reduce((acc, trade) => acc + getDisplayPnl(trade), 0);
      const totalCount = yearClosedTrades.length;
      const wins = yearClosedTrades.filter(trade => getDisplayPnl(trade) > 0).length;
      const losses = yearClosedTrades.filter(trade => getDisplayPnl(trade) < 0).length;
      const winRate = totalCount > 0 ? (wins / totalCount) * 100 : 0;
      const activeDays = Object.values(dailyMap).filter(day => day.count > 0).length;

      return {
          dailyMap,
          stats: {
              totalPnl,
              totalCount,
              winRate,
              activeDays,
              wins,
              losses,
          },
      };
  }, [trades, calendarYear, pnlDisplayMode]);

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

  const calendarMonthStart = useMemo(() => new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1), [calendarMonthDate]);
  const calendarMonthEnd = useMemo(() => new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 0), [calendarMonthDate]);

  useEffect(() => {
      if (calendarMonthDate.getFullYear() !== calendarYear) {
          setCalendarYear(calendarMonthDate.getFullYear());
      }
  }, [calendarMonthDate, calendarYear]);

  const calendarMonthLabel = useMemo(() => {
      return calendarMonthStart.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', {
          year: 'numeric',
          month: language === 'cn' ? 'long' : 'long',
      });
  }, [calendarMonthStart, language]);

  const calendarRangeLabel = useMemo(() => {
      const locale = language === 'cn' ? 'zh-CN' : 'en-US';
      const startLabel = calendarMonthStart.toLocaleDateString(locale, { month: 'short', day: '2-digit', year: 'numeric' });
      const endLabel = calendarMonthEnd.toLocaleDateString(locale, { month: 'short', day: '2-digit', year: 'numeric' });
      return language === 'cn'
          ? `（${startLabel} 至 ${endLabel}）`
          : `(FROM ${startLabel.toUpperCase()} TO ${endLabel.toUpperCase()})`;
  }, [calendarMonthStart, calendarMonthEnd, language]);

  const calendarWeekdayHeaders = useMemo(() => {
      return language === 'cn'
          ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [language]);

  const calendarMonthViewData = useMemo(() => {
      const monthTrades = trades.filter(trade => {
          const entry = new Date(trade.entryDate);
          return entry.getFullYear() === calendarMonthStart.getFullYear() && entry.getMonth() === calendarMonthStart.getMonth();
      });

      const dayMap = new Map<string, {
          dateKey: string;
          date: Date;
          pnl: number;
          count: number;
          wins: number;
          losses: number;
          hasOpenTrade: boolean;
      }>();

      monthTrades.forEach(trade => {
          const entry = new Date(trade.entryDate);
          if (Number.isNaN(entry.getTime())) return;
          const dateKey = entry.toLocaleDateString('en-CA');
          const existing = dayMap.get(dateKey) || {
              dateKey,
              date: new Date(entry.getFullYear(), entry.getMonth(), entry.getDate()),
              pnl: 0,
              count: 0,
              wins: 0,
              losses: 0,
              hasOpenTrade: false,
          };
          const displayPnl = getDisplayPnl(trade);
          existing.pnl += displayPnl;
          existing.count += 1;
          if (displayPnl > 0) existing.wins += 1;
          if (displayPnl < 0) existing.losses += 1;
          if (trade.status === TradeStatus.OPEN || !trade.exitDate) existing.hasOpenTrade = true;
          dayMap.set(dateKey, existing);
      });

      const startOffset = calendarMonthStart.getDay();
      const gridStart = new Date(calendarMonthStart);
      gridStart.setDate(calendarMonthStart.getDate() - startOffset);
      const totalCells = Math.ceil((startOffset + calendarMonthEnd.getDate()) / 7) * 7;
      const cells = Array.from({ length: totalCells }, (_, index) => {
          const date = new Date(gridStart);
          date.setDate(gridStart.getDate() + index);
          const dateKey = date.toLocaleDateString('en-CA');
          const summary = dayMap.get(dateKey);
          return {
              date,
              dateKey,
              inMonth: date.getMonth() === calendarMonthStart.getMonth(),
              summary: summary || null,
          };
      });

      const weeks = Array.from({ length: 5 }, (_, weekIndex) => {
          const slice = cells.slice(weekIndex * 7, weekIndex * 7 + 7);
          const weekPnl = slice.reduce((total, cell) => total + (cell.summary?.pnl || 0), 0);
          return {
              index: weekIndex + 1,
              pnl: weekPnl,
              cells: slice,
          };
      });

      const sortedMonthDays = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
      let cumulativePnl = 0;
      const cumulativeChartData = sortedMonthDays.map(day => {
          cumulativePnl += day.pnl;
          return {
              date: day.dateKey,
              label: formatChartDateLabel(day.dateKey),
              cumulativePnl,
          };
      });

      const winningDays = sortedMonthDays.filter(day => day.pnl > 0).length;
      const losingDays = sortedMonthDays.filter(day => day.pnl < 0).length;
      const breakevenDays = sortedMonthDays.filter(day => day.pnl === 0).length;
      const avgWinningDayPnl = winningDays > 0
          ? sortedMonthDays.filter(day => day.pnl > 0).reduce((sum, day) => sum + day.pnl, 0) / winningDays
          : 0;
      const avgLosingDayPnl = losingDays > 0
          ? sortedMonthDays.filter(day => day.pnl < 0).reduce((sum, day) => sum + day.pnl, 0) / losingDays
          : 0;
      const largestWinningDay = sortedMonthDays.reduce((best, day) => day.pnl > (best?.pnl ?? Number.NEGATIVE_INFINITY) ? day : best, null as typeof sortedMonthDays[number] | null);
      const largestLosingDay = sortedMonthDays.reduce((worst, day) => day.pnl < (worst?.pnl ?? Number.POSITIVE_INFINITY) ? day : worst, null as typeof sortedMonthDays[number] | null);
      let peak = 0;
      let maxDrawdown = 0;
      cumulativeChartData.forEach(point => {
          peak = Math.max(peak, point.cumulativePnl);
          maxDrawdown = Math.min(maxDrawdown, point.cumulativePnl - peak);
      });

      return {
          weeks,
          cells,
          sortedMonthDays,
          cumulativeChartData,
          summary: {
              totalTrades: monthTrades.length,
              closedTrades: monthTrades.filter(trade => trade.status !== TradeStatus.OPEN && trade.exitDate).length,
              openTrades: monthTrades.filter(trade => trade.status === TradeStatus.OPEN || !trade.exitDate).length,
              winningTrades: monthTrades.filter(trade => getDisplayPnl(trade) > 0).length,
              losingTrades: monthTrades.filter(trade => getDisplayPnl(trade) < 0).length,
              breakevenTrades: monthTrades.filter(trade => getDisplayPnl(trade) === 0).length,
              totalPnl: monthTrades.reduce((acc, trade) => acc + getDisplayPnl(trade), 0),
              totalFees: monthTrades.reduce((acc, trade) => acc + (Number(trade.fees) || 0), 0),
              totalVolume: monthTrades.reduce((acc, trade) => acc + getTradeVolume(trade), 0),
              activeDays: sortedMonthDays.length,
              winningDays,
              losingDays,
              breakevenDays,
              avgWinningDayPnl,
              avgLosingDayPnl,
              largestWinningDay,
              largestLosingDay,
              maxDrawdown,
          },
      };
  }, [trades, calendarMonthStart, calendarMonthEnd, pnlDisplayMode, language]);

  const calendarCumulativeTicks = useMemo(() => {
      const indexes = getEvenlySpacedIndexes(calendarMonthViewData.cumulativeChartData.length, 4);
      return indexes.map(index => calendarMonthViewData.cumulativeChartData[index]?.label).filter(Boolean);
  }, [calendarMonthViewData]);

  const calendarWinRate = useMemo(() => {
      const closed = calendarMonthViewData.summary.closedTrades;
      return closed > 0 ? (calendarMonthViewData.summary.winningTrades / closed) * 100 : 0;
  }, [calendarMonthViewData]);

  const calendarDonutData = useMemo(() => ([
      { name: language === 'cn' ? '盈利' : 'winners', value: calendarMonthViewData.summary.winningTrades, color: '#55c39e' },
      { name: language === 'cn' ? '亏损' : 'losers', value: calendarMonthViewData.summary.losingTrades, color: '#f45f63' },
  ]), [calendarMonthViewData, language]);

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
          const label = getStrategyLabel(trade);
          if (!grouped.has(label)) grouped.set(label, createDetailedStatRow(label));
          addTradeToDetailedRow(grouped.get(label)!, trade);
      });
      return finalizeDetailedRows(Array.from(grouped.values()).sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl)));
  }, [trades, getStrategyLabel]);

  const tagStats = useMemo(() => {
      const grouped = new Map<string, DetailedStatRow>();
      trades.forEach(trade => {
          const tags = Object.values(trade.customTags || {}).flatMap(value => getSafeTagValues(value)).filter(Boolean);
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

  const emptyStats = {
      totalTrades: 0,
      closedCount: 0,
      openCount: 0,
      netPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalFees: 0,
      avgWin: 0,
      avgLoss: 0,
      avgTradePnl: 0,
      profitFactor: 0,
      winRate: 0,
      expectancy: 0,
      winCount: 0,
      lossCount: 0,
      beCount: 0,
      maxConWins: 0,
      maxConLoss: 0,
      avgHoldAll: 0,
      avgHoldWin: 0,
      avgHoldLoss: 0,
      avgHoldScratch: 0,
      longestTradeDuration: 0,
      totalDays: 0,
      winningDays: 0,
      losingDays: 0,
      beDays: 0,
      avgDailyPnl: 0,
      largestProfit: 0,
      largestLoss: 0,
      largestLosingDay: 0,
      maxConWinDays: 0,
      maxConLossDays: 0,
      maxTradingDaysDuration: 0,
      avgRealizedR: 0,
      bestMonth: 0,
      lowestMonth: 0,
      avgMonth: 0,
      totalVolume: 0,
      longTradesCount: 0,
      shortTradesCount: 0,
      longWinningTrades: 0,
      longLosingTrades: 0,
      longBreakevenTrades: 0,
      longOpenTrades: 0,
      shortWinningTrades: 0,
      shortLosingTrades: 0,
      shortBreakevenTrades: 0,
      shortOpenTrades: 0,
      longWinRate: 0,
      shortWinRate: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
  };

  // --- 6. Advanced Statistics Calculation ---
  const stats = useMemo<typeof emptyStats>(() => {
      if (trades.length === 0) return emptyStats;

      // Basic Filters
      const closedTrades = trades.filter(t => t.status !== TradeStatus.OPEN && t.exitDate);
      const openTrades = trades.filter(t => t.status === TradeStatus.OPEN || !t.exitDate);
      const wins = closedTrades.filter(t => getDisplayPnl(t) > 0);
      const losses = closedTrades.filter(t => getDisplayPnl(t) < 0);
      const breakevens = closedTrades.filter(t => getDisplayPnl(t) === 0);

      // Financials
      const grossProfit = wins.reduce((acc, t) => acc + getDisplayPnl(t), 0);
      const grossLoss = losses.reduce((acc, t) => acc + getDisplayPnl(t), 0); // Negative number
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
      const largestProfit = wins.length > 0 ? Math.max(...wins.map(t => getDisplayPnl(t))) : 0;
      const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => getDisplayPnl(t))) : 0;

      // R-Multiples
      const tradesWithRisk = closedTrades.filter(t => t.riskAmount && t.riskAmount > 0);
      const totalR = tradesWithRisk.reduce((acc, t) => acc + (getDisplayPnl(t) / (t.riskAmount || 1)), 0);
      const avgRealizedR = tradesWithRisk.length > 0 ? totalR / tradesWithRisk.length : 0;
      const longTrades = trades.filter(t => t.direction === Direction.LONG);
      const shortTrades = trades.filter(t => t.direction === Direction.SHORT);
      const closedLongTrades = closedTrades.filter(t => t.direction === Direction.LONG);
      const closedShortTrades = closedTrades.filter(t => t.direction === Direction.SHORT);
      const longWins = closedLongTrades.filter(t => getDisplayPnl(t) > 0);
      const longLosses = closedLongTrades.filter(t => getDisplayPnl(t) < 0);
      const longBreakevens = closedLongTrades.filter(t => getDisplayPnl(t) === 0);
      const shortWins = closedShortTrades.filter(t => getDisplayPnl(t) > 0);
      const shortLosses = closedShortTrades.filter(t => getDisplayPnl(t) < 0);
      const shortBreakevens = closedShortTrades.filter(t => getDisplayPnl(t) === 0);
      const longOpenTrades = openTrades.filter(t => t.direction === Direction.LONG);
      const shortOpenTrades = openTrades.filter(t => t.direction === Direction.SHORT);
      const longWinRate = closedLongTrades.length > 0 ? (longWins.length / closedLongTrades.length) * 100 : 0;
      const shortWinRate = closedShortTrades.length > 0 ? (shortWins.length / closedShortTrades.length) * 100 : 0;

      // --- Sequence Calculations (Consecutive) ---
      let maxConWins = 0, curConWins = 0;
      let maxConLoss = 0, curConLoss = 0;
      
      const chronologicalTrades = [...closedTrades].sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
      
      chronologicalTrades.forEach(t => {
          const displayPnl = getDisplayPnl(t);
          if (displayPnl > 0) {
              curConWins++;
              curConLoss = 0;
              if (curConWins > maxConWins) maxConWins = curConWins;
          } else if (displayPnl < 0) {
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
  }, [trades, dailyData, pnlDisplayMode]);

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

          const net = getDisplayPnl(t);
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
  }, [trades, language, pnlDisplayMode]);

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

  type DayTimeReportRow = {
      key: string;
      label: string;
      shortLabel: string;
      trades: Trade[];
      count: number;
      netPnl: number;
      avgDailyNetPnl: number;
      dailyNetPnl: number;
      grossProfit: number;
      grossLoss: number;
      profitFactor: number;
      tradeExpectancy: number;
      wins: number;
      losses: number;
      breakevens: number;
      volume: number;
      activeDays: Set<string>;
      activeDayCount: number;
      loggedDays: number;
      avgDailyVolume: number;
      avgWin: number;
      avgLoss: number;
      avgNetTradePnl: number;
      avgTradeWinLoss: number;
      avgDailyWinLoss: number;
      avgMaxTradeLoss: number;
      avgMaxTradeProfit: number;
      largestLosingTrade: number;
      largestProfitableTrade: number;
      avgDailyNetDrawdown: number;
      maxDailyNetDrawdown: number;
      dailyNetDrawdown: number;
      avgPlannedR: number;
      avgRealizedR: number;
      breakevenDays: number;
      breakevenTrades: number;
      losingDays: number;
      winningDays: number;
      longBreakevenTrades: number;
      longLosingTrades: number;
      longOpenTrades: number;
      longTrades: number;
      longWinningTrades: number;
      lossTrades: number;
      netAccountBalance: number;
      openTrades: number;
      shortBreakevenTrades: number;
      shortLosingTrades: number;
      shortOpenTrades: number;
      shortTrades: number;
      shortWinningTrades: number;
      tradeCount: number;
      winTrades: number;
      avgDailyWinPct: number;
      longWinPct: number;
      maxConsecutiveLosingDays: number;
      maxConsecutiveLosses: number;
      maxConsecutiveWinningDays: number;
      maxConsecutiveWins: number;
      sharpeRatio: number;
      shortWinPct: number;
      sortinoRatio: number;
      winPct: number;
      winRate: number;
      avgTradingDaysDuration: number;
      avgHoldTime: number;
      longestTradeDuration: number;
      maxTradingDaysDuration: number;
  };

  const createDayTimeRow = (key: string, label: string, shortLabel = label): DayTimeReportRow => ({
      key,
      label,
      shortLabel,
      trades: [],
      count: 0,
      netPnl: 0,
      avgDailyNetPnl: 0,
      dailyNetPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      tradeExpectancy: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      volume: 0,
      activeDays: new Set<string>(),
      activeDayCount: 0,
      loggedDays: 0,
      avgDailyVolume: 0,
      avgWin: 0,
      avgLoss: 0,
      avgNetTradePnl: 0,
      avgTradeWinLoss: 0,
      avgDailyWinLoss: 0,
      avgMaxTradeLoss: 0,
      avgMaxTradeProfit: 0,
      largestLosingTrade: 0,
      largestProfitableTrade: 0,
      avgDailyNetDrawdown: 0,
      maxDailyNetDrawdown: 0,
      dailyNetDrawdown: 0,
      avgPlannedR: 0,
      avgRealizedR: 0,
      breakevenDays: 0,
      breakevenTrades: 0,
      losingDays: 0,
      winningDays: 0,
      longBreakevenTrades: 0,
      longLosingTrades: 0,
      longOpenTrades: 0,
      longTrades: 0,
      longWinningTrades: 0,
      lossTrades: 0,
      netAccountBalance: accountSize,
      openTrades: 0,
      shortBreakevenTrades: 0,
      shortLosingTrades: 0,
      shortOpenTrades: 0,
      shortTrades: 0,
      shortWinningTrades: 0,
      tradeCount: 0,
      winTrades: 0,
      avgDailyWinPct: 0,
      longWinPct: 0,
      maxConsecutiveLosingDays: 0,
      maxConsecutiveLosses: 0,
      maxConsecutiveWinningDays: 0,
      maxConsecutiveWins: 0,
      sharpeRatio: 0,
      shortWinPct: 0,
      sortinoRatio: 0,
      winPct: 0,
      winRate: 0,
      avgTradingDaysDuration: 0,
      avgHoldTime: 0,
      longestTradeDuration: 0,
      maxTradingDaysDuration: 0,
  });

  const addTradeToDayTimeRow = (row: DayTimeReportRow, trade: Trade) => {
      const displayPnl = getDisplayPnl(trade);
      row.count += 1;
      row.tradeCount += 1;
      row.trades.push(trade);
      row.netPnl += displayPnl;
      row.dailyNetPnl += displayPnl;
      row.volume += getTradeVolume(trade);
      const entryDate = new Date(trade.entryDate);
      if (!Number.isNaN(entryDate.getTime())) {
          row.activeDays.add(entryDate.toLocaleDateString('en-CA'));
      }
      if (displayPnl > 0) {
          row.wins += 1;
          row.grossProfit += displayPnl;
      } else if (displayPnl < 0) {
          row.losses += 1;
          row.grossLoss += displayPnl;
      }
  };

  const getDayTimeDateKey = (trade: Trade) => {
      const date = new Date(trade.entryDate);
      return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-CA');
  };

  const isClosedTrade = (trade: Trade) => trade.status !== TradeStatus.OPEN && Boolean(trade.exitDate);

  const getTradeDurationMs = (trade: Trade) => {
      if (!trade.exitDate) return 0;
      const duration = new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime();
      return Number.isFinite(duration) && duration > 0 ? duration : 0;
  };

  const getMaxConsecutiveCount = (values: number[], matcher: (value: number) => boolean) => {
      let max = 0;
      let current = 0;
      values.forEach(value => {
          if (matcher(value)) {
              current += 1;
              max = Math.max(max, current);
          } else {
              current = 0;
          }
      });
      return max;
  };

  const buildWinLossDetailSummary = (subsetTrades: Trade[]): WinLossDetailSummary => {
      const closedSubsetTrades = subsetTrades.filter(isClosedTrade);
      const positiveTrades = closedSubsetTrades.filter(trade => getDisplayPnl(trade) > 0);
      const negativeTrades = closedSubsetTrades.filter(trade => getDisplayPnl(trade) < 0);
      const totalPnl = closedSubsetTrades.reduce((sum, trade) => sum + getDisplayPnl(trade), 0);
      const totalCommissions = closedSubsetTrades.reduce((sum, trade) => sum + (Number(trade.fees) || 0), 0);

      const dailyBuckets = new Map<string, { pnl: number; volume: number }>();
      closedSubsetTrades.forEach(trade => {
          const dateKey = getDayTimeDateKey(trade);
          if (!dateKey) return;
          const current = dailyBuckets.get(dateKey) || { pnl: 0, volume: 0 };
          current.pnl += getDisplayPnl(trade);
          current.volume += getTradeVolume(trade);
          dailyBuckets.set(dateKey, current);
      });

      let cumulative = 0;
      const chartData = Array.from(dailyBuckets.entries())
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, bucket]) => {
              cumulative += bucket.pnl;
              const pointDate = new Date(`${date}T00:00:00`);
              return {
                  date,
                  label: pointDate.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', { month: '2-digit', day: '2-digit' }),
                  tooltipLabel: pointDate.toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
                  value: Number(cumulative.toFixed(2)),
              };
          });

      const avgDailyVolume = dailyBuckets.size > 0
          ? Array.from(dailyBuckets.values()).reduce((sum, bucket) => sum + bucket.volume, 0) / dailyBuckets.size
          : 0;

      const avgWinningTrade = positiveTrades.length > 0
          ? positiveTrades.reduce((sum, trade) => sum + getDisplayPnl(trade), 0) / positiveTrades.length
          : null;
      const avgLosingTrade = negativeTrades.length > 0
          ? negativeTrades.reduce((sum, trade) => sum + getDisplayPnl(trade), 0) / negativeTrades.length
          : null;

      return {
          tradeCount: closedSubsetTrades.length,
          totalPnl: Number(totalPnl.toFixed(2)),
          avgDailyVolume,
          avgWinningTrade,
          avgLosingTrade,
          numberOfWinningTrades: positiveTrades.length,
          numberOfLosingTrades: negativeTrades.length,
          totalCommissions,
          chartData,
      };
  };

  const getRiskMetrics = (closedTrades: Trade[]) => {
      let plannedTotal = 0;
      let realizedTotal = 0;
      let riskCount = 0;

      closedTrades.forEach(trade => {
          const riskAmount = Number(trade.riskAmount) || 0;
          if (riskAmount <= 0) return;
          const plannedTarget = typeof trade.profitTarget === 'number' && typeof trade.entryPrice === 'number'
              ? Math.abs(trade.profitTarget - trade.entryPrice) * (Number(trade.quantity) || 0)
              : 0;
          if (plannedTarget > 0) plannedTotal += plannedTarget / riskAmount;
          realizedTotal += getDisplayPnl(trade) / riskAmount;
          riskCount += 1;
      });

      return {
          avgPlannedR: riskCount > 0 ? plannedTotal / riskCount : 0,
          avgRealizedR: riskCount > 0 ? realizedTotal / riskCount : 0,
      };
  };

  const getDailyRiskRatios = (dailyPnls: number[]) => {
      if (dailyPnls.length === 0) return { sharpeRatio: 0, sortinoRatio: 0 };
      const meanDailyPnl = dailyPnls.reduce((acc, value) => acc + value, 0) / dailyPnls.length;
      const variance = dailyPnls.length > 1
          ? dailyPnls.reduce((acc, pnl) => acc + Math.pow(pnl - meanDailyPnl, 2), 0) / (dailyPnls.length - 1)
          : 0;
      const stdDev = Math.sqrt(variance);
      const downsidePnls = dailyPnls.filter(pnl => pnl < 0);
      const downsideDeviation = downsidePnls.length > 0
          ? Math.sqrt(downsidePnls.reduce((acc, pnl) => acc + Math.pow(pnl, 2), 0) / downsidePnls.length)
          : 0;
      return {
          sharpeRatio: stdDev > 0 ? (meanDailyPnl / stdDev) * Math.sqrt(252) : 0,
          sortinoRatio: downsideDeviation > 0 ? (meanDailyPnl / downsideDeviation) * Math.sqrt(252) : 0,
      };
  };

  const finalizeDayTimeRows = (rows: DayTimeReportRow[]) => rows.map(row => {
      const allTrades = row.trades;
      const closedTrades = allTrades.filter(isClosedTrade);
      const openTrades = allTrades.filter(trade => !isClosedTrade(trade));
      const wins = closedTrades.filter(trade => getDisplayPnl(trade) > 0);
      const losses = closedTrades.filter(trade => getDisplayPnl(trade) < 0);
      const breakevens = closedTrades.filter(trade => getDisplayPnl(trade) === 0);
      const grossProfit = wins.reduce((acc, trade) => acc + getDisplayPnl(trade), 0);
      const grossLoss = losses.reduce((acc, trade) => acc + getDisplayPnl(trade), 0);
      const netPnl = grossProfit + grossLoss;
      const activeDayCount = row.activeDays.size;
      const dailyGroups = new Map<string, { pnl: number; count: number; wins: number; losses: number }>();

      allTrades.forEach(trade => {
          const dateKey = getDayTimeDateKey(trade);
          if (!dateKey) return;
          const group = dailyGroups.get(dateKey) || { pnl: 0, count: 0, wins: 0, losses: 0 };
          if (isClosedTrade(trade)) {
              const displayPnl = getDisplayPnl(trade);
              group.pnl += displayPnl;
              group.count += 1;
              if (displayPnl > 0) group.wins += 1;
              if (displayPnl < 0) group.losses += 1;
          }
          dailyGroups.set(dateKey, group);
      });

      const dailyRows = Array.from(dailyGroups.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, value]) => value);
      const dailyPnls = dailyRows.map(day => day.pnl);
      const winningDays = dailyRows.filter(day => day.pnl > 0).length;
      const losingDays = dailyRows.filter(day => day.pnl < 0).length;
      const breakevenDays = dailyRows.filter(day => day.count > 0 && day.pnl === 0).length;
      const losingDayPnls = dailyPnls.filter(pnl => pnl < 0);
      const dailyWinPctValues = dailyRows.filter(day => day.count > 0).map(day => (day.wins / day.count) * 100);
      const avgDailyWinPct = dailyWinPctValues.length > 0
          ? dailyWinPctValues.reduce((acc, value) => acc + value, 0) / dailyWinPctValues.length
          : 0;
      const avgWinningDay = winningDays > 0 ? dailyPnls.filter(pnl => pnl > 0).reduce((acc, pnl) => acc + pnl, 0) / winningDays : 0;
      const avgLosingDay = losingDays > 0 ? losingDayPnls.reduce((acc, pnl) => acc + pnl, 0) / losingDays : 0;
      const durations = closedTrades.map(getTradeDurationMs).filter(duration => duration > 0);
      const longTrades = allTrades.filter(trade => trade.direction === Direction.LONG);
      const shortTrades = allTrades.filter(trade => trade.direction === Direction.SHORT);
      const closedLongTrades = longTrades.filter(isClosedTrade);
      const closedShortTrades = shortTrades.filter(isClosedTrade);
      const longWins = closedLongTrades.filter(trade => getDisplayPnl(trade) > 0);
      const longLosses = closedLongTrades.filter(trade => getDisplayPnl(trade) < 0);
      const longBreakevens = closedLongTrades.filter(trade => getDisplayPnl(trade) === 0);
      const shortWins = closedShortTrades.filter(trade => getDisplayPnl(trade) > 0);
      const shortLosses = closedShortTrades.filter(trade => getDisplayPnl(trade) < 0);
      const shortBreakevens = closedShortTrades.filter(trade => getDisplayPnl(trade) === 0);
      const chronologicalTradePnls = [...closedTrades]
          .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
          .map(getDisplayPnl);
      const riskMetrics = getRiskMetrics(closedTrades);
      const dailyRiskRatios = getDailyRiskRatios(dailyPnls);
      const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
      const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

      return {
          ...row,
          count: allTrades.length,
          tradeCount: allTrades.length,
          netPnl: Number(netPnl.toFixed(2)),
          dailyNetPnl: Number(netPnl.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          grossLoss: Number(grossLoss.toFixed(2)),
          volume: Number(row.volume.toFixed(2)),
          wins: wins.length,
          losses: losses.length,
          breakevens: breakevens.length,
          activeDayCount,
          loggedDays: activeDayCount,
          avgDailyVolume: activeDayCount > 0 ? Number((row.volume / activeDayCount).toFixed(2)) : 0,
          avgDailyNetPnl: activeDayCount > 0 ? Number((netPnl / activeDayCount).toFixed(2)) : 0,
          avgWin: Number(avgWin.toFixed(2)),
          avgLoss: Number(avgLoss.toFixed(2)),
          avgNetTradePnl: closedTrades.length > 0 ? Number((netPnl / closedTrades.length).toFixed(2)) : 0,
          avgTradeWinLoss: avgWin > 0 && avgLoss < 0 ? Math.abs(avgWin / avgLoss) : 0,
          avgDailyWinLoss: avgWinningDay > 0 && avgLosingDay < 0 ? Math.abs(avgWinningDay / avgLosingDay) : 0,
          avgMaxTradeLoss: losses.length > 0 ? Math.min(...losses.map(getDisplayPnl)) : 0,
          avgMaxTradeProfit: wins.length > 0 ? Math.max(...wins.map(getDisplayPnl)) : 0,
          largestLosingTrade: losses.length > 0 ? Math.min(...losses.map(getDisplayPnl)) : 0,
          largestProfitableTrade: wins.length > 0 ? Math.max(...wins.map(getDisplayPnl)) : 0,
          profitFactor: Math.abs(grossLoss) > 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? grossProfit : 0,
          tradeExpectancy: closedTrades.length > 0 ? Number((netPnl / closedTrades.length).toFixed(2)) : 0,
          avgDailyNetDrawdown: losingDayPnls.length > 0 ? losingDayPnls.reduce((acc, pnl) => acc + pnl, 0) / losingDayPnls.length : 0,
          maxDailyNetDrawdown: losingDayPnls.length > 0 ? Math.min(...losingDayPnls) : 0,
          dailyNetDrawdown: losingDayPnls.length > 0 ? Math.min(...losingDayPnls) : 0,
          avgPlannedR: riskMetrics.avgPlannedR,
          avgRealizedR: riskMetrics.avgRealizedR,
          breakevenDays,
          breakevenTrades: breakevens.length,
          losingDays,
          winningDays,
          longBreakevenTrades: longBreakevens.length,
          longLosingTrades: longLosses.length,
          longOpenTrades: longTrades.filter(trade => !isClosedTrade(trade)).length,
          longTrades: longTrades.length,
          longWinningTrades: longWins.length,
          lossTrades: losses.length,
          netAccountBalance: accountSize + netPnl,
          openTrades: openTrades.length,
          shortBreakevenTrades: shortBreakevens.length,
          shortLosingTrades: shortLosses.length,
          shortOpenTrades: shortTrades.filter(trade => !isClosedTrade(trade)).length,
          shortTrades: shortTrades.length,
          shortWinningTrades: shortWins.length,
          winTrades: wins.length,
          avgDailyWinPct,
          longWinPct: closedLongTrades.length > 0 ? (longWins.length / closedLongTrades.length) * 100 : 0,
          maxConsecutiveLosingDays: getMaxConsecutiveCount(dailyPnls, pnl => pnl < 0),
          maxConsecutiveLosses: getMaxConsecutiveCount(chronologicalTradePnls, pnl => pnl < 0),
          maxConsecutiveWinningDays: getMaxConsecutiveCount(dailyPnls, pnl => pnl > 0),
          maxConsecutiveWins: getMaxConsecutiveCount(chronologicalTradePnls, pnl => pnl > 0),
          sharpeRatio: dailyRiskRatios.sharpeRatio,
          shortWinPct: closedShortTrades.length > 0 ? (shortWins.length / closedShortTrades.length) * 100 : 0,
          sortinoRatio: dailyRiskRatios.sortinoRatio,
          winPct: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
          winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
          avgTradingDaysDuration: activeDayCount > 0 ? 24 * 60 * 60 * 1000 : 0,
          avgHoldTime: durations.length > 0 ? durations.reduce((acc, duration) => acc + duration, 0) / durations.length : 0,
          longestTradeDuration: durations.length > 0 ? Math.max(...durations) : 0,
          maxTradingDaysDuration: activeDayCount > 0 ? activeDayCount * 24 * 60 * 60 * 1000 : 0,
      };
  });

  const dayTimeReportRows = useMemo(() => {
      if (dayTimeReportView === 'DAYS') {
          const labels = language === 'cn'
              ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
              : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const shortLabels = language === 'cn'
              ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const rows = labels.map((label, index) => createDayTimeRow(String(index), label, shortLabels[index]));
          trades.forEach(trade => {
              const date = new Date(trade.entryDate);
              if (Number.isNaN(date.getTime())) return;
              addTradeToDayTimeRow(rows[date.getDay()], trade);
          });
          return finalizeDayTimeRows(rows);
      }

      if (dayTimeReportView === 'MONTHS') {
          const monthLabels = language === 'cn'
              ? ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
              : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const monthShortLabels = language === 'cn'
              ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
              : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const rows = monthLabels.map((label, index) => createDayTimeRow(String(index), label, monthShortLabels[index]));
          trades.forEach(trade => {
              const date = new Date(trade.entryDate);
              if (Number.isNaN(date.getTime())) return;
              addTradeToDayTimeRow(rows[date.getMonth()], trade);
          });
          return finalizeDayTimeRows(rows);
      }

      if (dayTimeReportView === 'TIME') {
          const rows = Array.from({ length: 24 }, (_, hour) => {
              const label = language === 'cn'
                  ? `${String(hour).padStart(2, '0')}:00`
                  : `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? ' PM' : ' AM'}`;
              return createDayTimeRow(String(hour), label, `${String(hour).padStart(2, '0')}:00`);
          });
          trades.forEach(trade => {
              const date = new Date(trade.entryDate);
              if (Number.isNaN(date.getTime())) return;
              addTradeToDayTimeRow(rows[date.getHours()], trade);
          });
          return finalizeDayTimeRows(rows);
      }

      const buckets = [
          { key: 'under-5m', label: language === 'cn' ? '5分钟内' : 'Under 5m', min: 0, max: 5 * 60 * 1000 },
          { key: '5-30m', label: language === 'cn' ? '5-30分钟' : '5-30m', min: 5 * 60 * 1000, max: 30 * 60 * 1000 },
          { key: '30-60m', label: language === 'cn' ? '30-60分钟' : '30-60m', min: 30 * 60 * 1000, max: 60 * 60 * 1000 },
          { key: '1-2h', label: language === 'cn' ? '1-2小时' : '1-2h', min: 60 * 60 * 1000, max: 2 * 60 * 60 * 1000 },
          { key: '2-4h', label: language === 'cn' ? '2-4小时' : '2-4h', min: 2 * 60 * 60 * 1000, max: 4 * 60 * 60 * 1000 },
          { key: '4h-plus', label: language === 'cn' ? '4小时以上' : '4h+', min: 4 * 60 * 60 * 1000, max: Infinity },
      ];
      const rows = buckets.map(bucket => createDayTimeRow(bucket.key, bucket.label));
      trades.forEach(trade => {
          if (!trade.exitDate || trade.status === TradeStatus.OPEN) return;
          const duration = new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime();
          if (!Number.isFinite(duration) || duration < 0) return;
          const index = buckets.findIndex(bucket => duration >= bucket.min && duration < bucket.max);
          if (index >= 0) addTradeToDayTimeRow(rows[index], trade);
      });
      return finalizeDayTimeRows(rows);
  }, [trades, language, pnlDisplayMode, dayTimeReportView]);

  const symbolReportRows = useMemo(() => {
      const grouped = new Map<string, DayTimeReportRow>();

      trades.forEach(trade => {
          const label = symbolReportView === 'SYMBOLS'
              ? getNormalizedSymbol(trade)
              : symbolReportView === 'INSTRUMENTS'
                  ? getInstrumentLabel(trade)
                  : getPriceBucket(trade).label;
          const shortLabel = symbolReportView === 'PRICES' ? getPriceBucket(trade).shortLabel : label;

          if (!grouped.has(label)) {
              grouped.set(label, createDayTimeRow(label, label, shortLabel));
          }

          addTradeToDayTimeRow(grouped.get(label)!, trade);
      });

      const rows = finalizeDayTimeRows(Array.from(grouped.values()));
      return rows.sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl) || a.label.localeCompare(b.label));
  }, [trades, language, pnlDisplayMode, symbolReportView]);

  const strategyReportRows = useMemo(() => {
      const grouped = new Map<string, DayTimeReportRow>();

      strategies.forEach(strategy => {
          const trimmedName = strategy.name?.trim();
          if (!trimmedName) return;
          const key = trimmedName.toLowerCase();
          if (!grouped.has(key)) {
              grouped.set(key, createDayTimeRow(key, trimmedName, trimmedName));
          }
      });

      trades.forEach(trade => {
          const label = getStrategyLabel(trade);
          const key = label.toLowerCase();

          if (!grouped.has(key)) {
              grouped.set(key, createDayTimeRow(key, label, label));
          }

          addTradeToDayTimeRow(grouped.get(key)!, trade);
      });

      const rows = finalizeDayTimeRows(Array.from(grouped.values()));
      return rows.sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl) || a.label.localeCompare(b.label));
  }, [trades, strategies, getStrategyLabel, pnlDisplayMode]);

  const tagReportRows = useMemo(() => {
      const activeCategoryId = activeTagReportCategory?.id;
      if (!activeCategoryId) return [] as DayTimeReportRow[];

      const grouped = new Map<string, DayTimeReportRow>();
      const emptyLabel = language === 'cn' ? '未填写标签' : 'No tag';

      if (activeCategoryId === 'mistakes') {
          trades.forEach(trade => {
              const values = (trade.mistakes || []).map(value => value.trim()).filter(Boolean);
              const labels = values.length > 0 ? values : [emptyLabel];

              labels.forEach(label => {
                  const key = label.toLowerCase();
                  if (!grouped.has(key)) {
                      grouped.set(key, createDayTimeRow(key, label, label));
                  }
                  addTradeToDayTimeRow(grouped.get(key)!, trade);
              });
          });
      } else {
          trades.forEach(trade => {
              const values = getSafeTagValues(trade.customTags?.[activeCategoryId]);
              const labels = values.length > 0 ? values : [emptyLabel];

              labels.forEach(label => {
                  const key = label.toLowerCase();
                  if (!grouped.has(key)) {
                      grouped.set(key, createDayTimeRow(key, label, label));
                  }
                  addTradeToDayTimeRow(grouped.get(key)!, trade);
              });
          });
      }

      const rows = finalizeDayTimeRows(Array.from(grouped.values()));
      return rows.sort((a, b) => b.count - a.count || Math.abs(b.netPnl) - Math.abs(a.netPnl) || a.label.localeCompare(b.label));
  }, [trades, activeTagReportCategory, language, pnlDisplayMode]);

  const riskVolumeBuckets = useMemo(() => language === 'cn'
      ? [
          { key: '1-4', label: '1 到 4', shortLabel: '1 到 4', min: 1, max: 5 },
          { key: '20-49', label: '20 到 49', shortLabel: '20 到 49', min: 20, max: 50 },
          { key: '50-99', label: '50 到 99', shortLabel: '50 到 99', min: 50, max: 100 },
          { key: '100-499', label: '100 到 499', shortLabel: '100 到 499', min: 100, max: 500 },
          { key: '2000-2999', label: '2000 到 2999', shortLabel: '2000 到 2999', min: 2000, max: 3000 },
          { key: '3000+', label: '3000 以上', shortLabel: '3000 以上', min: 3000, max: Number.POSITIVE_INFINITY },
      ]
      : [
          { key: '1-4', label: '1 to 4', shortLabel: '1 to 4', min: 1, max: 5 },
          { key: '20-49', label: '20 to 49', shortLabel: '20 to 49', min: 20, max: 50 },
          { key: '50-99', label: '50 to 99', shortLabel: '50 to 99', min: 50, max: 100 },
          { key: '100-499', label: '100 to 499', shortLabel: '100 to 499', min: 100, max: 500 },
          { key: '2000-2999', label: '2000 to 2999', shortLabel: '2000 to 2999', min: 2000, max: 3000 },
          { key: '3000+', label: '3000 and over', shortLabel: '3000 and over', min: 3000, max: Number.POSITIVE_INFINITY },
      ], [language]);

  const riskPositionSizeBuckets = useMemo(() => language === 'cn'
      ? [
          { key: 'lt-100', label: '100 以下', shortLabel: '100 以下', min: 0, max: 100 },
          { key: '100-499', label: '100 到 499', shortLabel: '100 到 499', min: 100, max: 500 },
          { key: '500-999', label: '500 到 999', shortLabel: '500 到 999', min: 500, max: 1000 },
          { key: '1000-2499', label: '1000 到 2499', shortLabel: '1000 到 2499', min: 1000, max: 2500 },
          { key: '2500-4999', label: '2500 到 4999', shortLabel: '2500 到 4999', min: 2500, max: 5000 },
          { key: '5000+', label: '5000 以上', shortLabel: '5000 以上', min: 5000, max: Number.POSITIVE_INFINITY },
      ]
      : [
          { key: 'lt-100', label: 'Below 100', shortLabel: 'Below 100', min: 0, max: 100 },
          { key: '100-499', label: '100 to 499', shortLabel: '100 to 499', min: 100, max: 500 },
          { key: '500-999', label: '500 to 999', shortLabel: '500 to 999', min: 500, max: 1000 },
          { key: '1000-2499', label: '1000 to 2499', shortLabel: '1000 to 2499', min: 1000, max: 2500 },
          { key: '2500-4999', label: '2500 to 4999', shortLabel: '2500 to 4999', min: 2500, max: 5000 },
          { key: '5000+', label: '5000 and over', shortLabel: '5000 and over', min: 5000, max: Number.POSITIVE_INFINITY },
      ], [language]);

  const riskRMultipleBuckets = useMemo(() => language === 'cn'
      ? [
          { key: 'none', label: '未设置', shortLabel: '未设置', min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY, isNone: true },
          { key: '+4+', label: '+4R 以上', shortLabel: '+4R 以上', min: 4, max: Number.POSITIVE_INFINITY },
          { key: '+3-3.99', label: '+3R 到 3.99R', shortLabel: '+3R 到 3.99R', min: 3, max: 4 },
          { key: '+2-2.99', label: '+2R 到 2.99R', shortLabel: '+2R 到 2.99R', min: 2, max: 3 },
          { key: '+1-1.99', label: '+1R 到 1.99R', shortLabel: '+1R 到 1.99R', min: 1, max: 2 },
          { key: '0-0.99', label: '0R 到 0.99R', shortLabel: '0R 到 0.99R', min: 0, max: 1 },
          { key: '-0.99--0.01', label: '-0.99R 到 -0.01R', shortLabel: '-0.99R 到 -0.01R', min: -1, max: 0 },
          { key: '-1--1.99', label: '-1R 到 -1.99R', shortLabel: '-1R 到 -1.99R', min: -2, max: -1 },
          { key: '-2--2.99', label: '-2R 到 -2.99R', shortLabel: '-2R 到 -2.99R', min: -3, max: -2 },
          { key: '-3--3.99', label: '-3R 到 -3.99R', shortLabel: '-3R 到 -3.99R', min: -4, max: -3 },
          { key: '-4+', label: '-4R 或更低', shortLabel: '-4R 或更低', min: Number.NEGATIVE_INFINITY, max: -4 },
      ]
      : [
          { key: 'none', label: 'None', shortLabel: 'None', min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY, isNone: true },
          { key: '+4+', label: '+4R and more', shortLabel: '+4R and more', min: 4, max: Number.POSITIVE_INFINITY },
          { key: '+3-3.99', label: '+3R to 3.99R', shortLabel: '+3R to 3.99R', min: 3, max: 4 },
          { key: '+2-2.99', label: '+2R to 2.99R', shortLabel: '+2R to 2.99R', min: 2, max: 3 },
          { key: '+1-1.99', label: '+1R to 1.99R', shortLabel: '+1R to 1.99R', min: 1, max: 2 },
          { key: '0-0.99', label: '0R to 0.99R', shortLabel: '0R to 0.99R', min: 0, max: 1 },
          { key: '-0.99--0.01', label: '-0.99R to -0.01R', shortLabel: '-0.99R to -0.01R', min: -1, max: 0 },
          { key: '-1--1.99', label: '-1R to -1.99R', shortLabel: '-1R to -1.99R', min: -2, max: -1 },
          { key: '-2--2.99', label: '-2R to -2.99R', shortLabel: '-2R to -2.99R', min: -3, max: -2 },
          { key: '-3--3.99', label: '-3R to -3.99R', shortLabel: '-3R to -3.99R', min: -4, max: -3 },
          { key: '-4+', label: '-4R or less', shortLabel: '-4R or less', min: Number.NEGATIVE_INFINITY, max: -4 },
      ], [language]);

  const riskReportRows = useMemo(() => {
      const getRowBuckets = () => {
          if (riskReportView === 'POSITION SIZES') return riskPositionSizeBuckets;
          if (riskReportView === 'R_MULTIPLES') return riskRMultipleBuckets;
          return riskVolumeBuckets;
      };

      const buckets = getRowBuckets();
      const rows = buckets.map(bucket => createDayTimeRow(bucket.key, bucket.label, bucket.shortLabel));

      trades.forEach(trade => {
          const quantity = Math.abs(Number(trade.quantity) || 0);
          const volume = getTradeVolume(trade);
          const riskAmount = Number(trade.riskAmount) || 0;
          const tradeR = riskAmount > 0 ? getDisplayPnl(trade) / riskAmount : null;

          let matchedIndex = -1;

          if (riskReportView === 'POSITION SIZES') {
              matchedIndex = buckets.findIndex(bucket => volume >= bucket.min && volume < bucket.max);
          } else if (riskReportView === 'R_MULTIPLES') {
              matchedIndex = buckets.findIndex(bucket => {
                  if ('isNone' in bucket && bucket.isNone) return tradeR === null;
                  if (tradeR === null) return false;
                  return tradeR >= bucket.min && tradeR < bucket.max;
              });
          } else {
              matchedIndex = buckets.findIndex(bucket => quantity >= bucket.min && quantity < bucket.max);
          }

          if (matchedIndex >= 0) {
              addTradeToDayTimeRow(rows[matchedIndex], trade);
          }
      });

      return finalizeDayTimeRows(rows);
  }, [trades, pnlDisplayMode, riskReportView, riskVolumeBuckets, riskPositionSizeBuckets, riskRMultipleBuckets]);

  const getDayTimeMetricValue = (row: DayTimeReportRow, metric: DayTimeMetricId) => {
      return Number(row[metric as keyof DayTimeReportRow]) || 0;
  };

  const dayTimeMetricOptions: Array<{ id: DayTimeMetricId; category: 'time' | 'profitability' | 'risk' | 'activity' | 'streaks'; label: string; shortLabel: string; color: string; visual: ChartMetricVisual; format: ChartMetricFormat }> = [
      { id: 'avgTradingDaysDuration', category: 'time', label: language === 'cn' ? '平均交易日跨度' : 'Average trading days duration', shortLabel: language === 'cn' ? '交易日跨度' : 'Trading days duration', color: '#6b55cf', visual: 'area', format: 'duration' },
      { id: 'avgHoldTime', category: 'time', label: language === 'cn' ? '平均持仓时间' : 'Avg hold time', shortLabel: language === 'cn' ? '平均持仓' : 'Avg hold time', color: '#6b55cf', visual: 'area', format: 'duration' },
      { id: 'longestTradeDuration', category: 'time', label: language === 'cn' ? '最长持仓时间' : 'Longest trade duration', shortLabel: language === 'cn' ? '最长持仓' : 'Longest trade duration', color: '#6b55cf', visual: 'area', format: 'duration' },
      { id: 'maxTradingDaysDuration', category: 'time', label: language === 'cn' ? '最大交易日跨度' : 'Max trading days duration', shortLabel: language === 'cn' ? '最大交易日跨度' : 'Max trading days duration', color: '#6b55cf', visual: 'area', format: 'duration' },
      { id: 'avgDailyNetDrawdown', category: 'risk', label: language === 'cn' ? '平均每日净回撤' : 'Avg daily net drawdown', shortLabel: language === 'cn' ? '平均日回撤' : 'Avg daily drawdown', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgPlannedR', category: 'risk', label: language === 'cn' ? '平均计划 R 倍数' : 'Avg. planned r-multiple', shortLabel: language === 'cn' ? '计划 R' : 'Planned R', color: '#d89d18', visual: 'line', format: 'number' },
      { id: 'avgRealizedR', category: 'risk', label: language === 'cn' ? '平均实现 R 倍数' : 'Avg. realized r-multiple', shortLabel: language === 'cn' ? '实现 R' : 'Realized R', color: '#d89d18', visual: 'line', format: 'number' },
      { id: 'breakevenDays', category: 'risk', label: language === 'cn' ? '打平天数' : 'Breakeven days', shortLabel: language === 'cn' ? '打平天数' : 'Breakeven days', color: '#8f98a6', visual: 'bar', format: 'number' },
      { id: 'breakevenTrades', category: 'risk', label: language === 'cn' ? '打平交易数' : 'Breakeven trades', shortLabel: language === 'cn' ? '打平交易' : 'Breakeven trades', color: '#8f98a6', visual: 'bar', format: 'number' },
      { id: 'losingDays', category: 'risk', label: language === 'cn' ? '亏损天数' : 'Losing days', shortLabel: language === 'cn' ? '亏损天数' : 'Losing days', color: '#ff6468', visual: 'bar', format: 'number' },
      { id: 'maxDailyNetDrawdown', category: 'risk', label: language === 'cn' ? '最大单日净回撤' : 'Max daily net drawdown', shortLabel: language === 'cn' ? '最大日回撤' : 'Max daily drawdown', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgDailyNetPnl', category: 'profitability', label: language === 'cn' ? '平均每日净盈亏' : 'Avg daily net P&L', shortLabel: language === 'cn' ? '平均日净盈亏' : 'Avg daily net P&L', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgDailyWinLoss', category: 'profitability', label: language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss', shortLabel: language === 'cn' ? '日盈亏比' : 'Daily win/loss', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'avgLoss', category: 'profitability', label: language === 'cn' ? '平均亏损' : 'Avg loss', shortLabel: language === 'cn' ? '平均亏损' : 'Avg loss', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgMaxTradeLoss', category: 'profitability', label: language === 'cn' ? '平均最大单笔亏损' : 'Avg max trade loss', shortLabel: language === 'cn' ? '最大亏损' : 'Max trade loss', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgMaxTradeProfit', category: 'profitability', label: language === 'cn' ? '平均最大单笔盈利' : 'Avg max trade profit', shortLabel: language === 'cn' ? '最大盈利' : 'Max trade profit', color: '#55c39e', visual: 'area', format: 'money' },
      { id: 'avgNetTradePnl', category: 'profitability', label: language === 'cn' ? '平均单笔净盈亏' : 'Avg net trade P&L', shortLabel: language === 'cn' ? '单笔净盈亏' : 'Avg trade P&L', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgTradeWinLoss', category: 'profitability', label: language === 'cn' ? '平均单笔盈亏比' : 'Avg trade win/loss', shortLabel: language === 'cn' ? '单笔盈亏比' : 'Trade win/loss', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'avgWin', category: 'profitability', label: language === 'cn' ? '平均盈利' : 'Avg win', shortLabel: language === 'cn' ? '平均盈利' : 'Avg win', color: '#55c39e', visual: 'area', format: 'money' },
      { id: 'largestLosingTrade', category: 'profitability', label: language === 'cn' ? '最大亏损交易' : 'Largest losing trade', shortLabel: language === 'cn' ? '最大亏损' : 'Largest loss', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'largestProfitableTrade', category: 'profitability', label: language === 'cn' ? '最大盈利交易' : 'Largest profitable trade', shortLabel: language === 'cn' ? '最大盈利' : 'Largest win', color: '#55c39e', visual: 'area', format: 'money' },
      { id: 'netPnl', category: 'profitability', label: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L'), shortLabel: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L'), color: '#ff6468', visual: 'bar', format: 'money' },
      { id: 'profitFactor', category: 'profitability', label: language === 'cn' ? '盈利因子' : 'Profit factor', shortLabel: language === 'cn' ? '盈利因子' : 'Profit factor', color: '#55c39e', visual: 'area', format: 'number' },
      { id: 'tradeExpectancy', category: 'profitability', label: language === 'cn' ? '交易期望值' : 'Trade expectancy', shortLabel: language === 'cn' ? '期望值' : 'Expectancy', color: '#ff6468', visual: 'area', format: 'money' },
      { id: 'avgDailyVolume', category: 'activity', label: language === 'cn' ? '平均每日成交额' : 'Avg daily volume', shortLabel: language === 'cn' ? '平均成交额' : 'Avg daily volume', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'dailyNetDrawdown', category: 'activity', label: language === 'cn' ? '每日净回撤' : 'Daily net drawdown', shortLabel: language === 'cn' ? '每日回撤' : 'Daily drawdown', color: '#ff6468', visual: 'bar', format: 'money' },
      { id: 'loggedDays', category: 'activity', label: language === 'cn' ? '记录天数' : 'Logged days', shortLabel: language === 'cn' ? '记录天数' : 'Logged days', color: '#6b55cf', visual: 'bar', format: 'number' },
      { id: 'longBreakevenTrades', category: 'activity', label: language === 'cn' ? '多头打平交易数' : 'Longs # of breakeven trades', shortLabel: language === 'cn' ? '多头打平' : 'Long breakevens', color: '#8f98a6', visual: 'bar', format: 'number' },
      { id: 'longLosingTrades', category: 'activity', label: language === 'cn' ? '多头亏损交易数' : 'Longs # of losing trades', shortLabel: language === 'cn' ? '多头亏损' : 'Long losses', color: '#ff6468', visual: 'bar', format: 'number' },
      { id: 'longOpenTrades', category: 'activity', label: language === 'cn' ? '多头持仓交易数' : 'Longs # of open trades', shortLabel: language === 'cn' ? '多头持仓' : 'Long open', color: '#d89d18', visual: 'bar', format: 'number' },
      { id: 'longTrades', category: 'activity', label: language === 'cn' ? '多头交易数' : 'Longs # of trades', shortLabel: language === 'cn' ? '多头交易' : 'Long trades', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'longWinningTrades', category: 'activity', label: language === 'cn' ? '多头盈利交易数' : 'Longs # of winning trades', shortLabel: language === 'cn' ? '多头盈利' : 'Long wins', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'lossTrades', category: 'activity', label: language === 'cn' ? '亏损交易数' : 'Loss # of trades', shortLabel: language === 'cn' ? '亏损交易' : 'Loss trades', color: '#ff6468', visual: 'bar', format: 'number' },
      { id: 'netAccountBalance', category: 'activity', label: language === 'cn' ? '账户净值' : 'Net account balance', shortLabel: language === 'cn' ? '账户净值' : 'Account balance', color: '#6b55cf', visual: 'area', format: 'money' },
      { id: 'openTrades', category: 'activity', label: language === 'cn' ? '未平仓交易数' : 'Open trades', shortLabel: language === 'cn' ? '未平仓' : 'Open trades', color: '#d89d18', visual: 'bar', format: 'number' },
      { id: 'shortBreakevenTrades', category: 'activity', label: language === 'cn' ? '空头打平交易数' : 'Shorts # of breakeven trades', shortLabel: language === 'cn' ? '空头打平' : 'Short breakevens', color: '#8f98a6', visual: 'bar', format: 'number' },
      { id: 'shortLosingTrades', category: 'activity', label: language === 'cn' ? '空头亏损交易数' : 'Shorts # of losing trades', shortLabel: language === 'cn' ? '空头亏损' : 'Short losses', color: '#ff6468', visual: 'bar', format: 'number' },
      { id: 'shortOpenTrades', category: 'activity', label: language === 'cn' ? '空头持仓交易数' : 'Shorts # of open trades', shortLabel: language === 'cn' ? '空头持仓' : 'Short open', color: '#d89d18', visual: 'bar', format: 'number' },
      { id: 'shortTrades', category: 'activity', label: language === 'cn' ? '空头交易数' : 'Shorts # of trades', shortLabel: language === 'cn' ? '空头交易' : 'Short trades', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'shortWinningTrades', category: 'activity', label: language === 'cn' ? '空头盈利交易数' : 'Shorts # of winning trades', shortLabel: language === 'cn' ? '空头盈利' : 'Short wins', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'tradeCount', category: 'activity', label: language === 'cn' ? '交易总数' : 'Trade count', shortLabel: language === 'cn' ? '交易总数' : 'Trade count', color: '#3d63dd', visual: 'line', format: 'number' },
      { id: 'volume', category: 'activity', label: language === 'cn' ? '成交额' : 'Volume', shortLabel: language === 'cn' ? '成交额' : 'Volume', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'winTrades', category: 'activity', label: language === 'cn' ? '盈利交易数' : 'Win # of trades', shortLabel: language === 'cn' ? '盈利交易' : 'Win trades', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'avgDailyWinPct', category: 'streaks', label: language === 'cn' ? '平均日胜率' : 'Avg daily win %', shortLabel: language === 'cn' ? '平均日胜率' : 'Avg daily win %', color: '#55c39e', visual: 'bar', format: 'percent' },
      { id: 'longWinPct', category: 'streaks', label: language === 'cn' ? '多头胜率' : 'Longs win %', shortLabel: language === 'cn' ? '多头胜率' : 'Long win %', color: '#55c39e', visual: 'line', format: 'percent' },
      { id: 'maxConsecutiveLosingDays', category: 'streaks', label: language === 'cn' ? '最大连续亏损天数' : 'Max consecutive losing days', shortLabel: language === 'cn' ? '连续亏损天数' : 'Losing day streak', color: '#ff6468', visual: 'bar', format: 'number' },
      { id: 'maxConsecutiveLosses', category: 'streaks', label: language === 'cn' ? '最大连续亏损交易' : 'Max consecutive losses', shortLabel: language === 'cn' ? '连续亏损交易' : 'Loss streak', color: '#ff6468', visual: 'bar', format: 'number' },
      { id: 'maxConsecutiveWinningDays', category: 'streaks', label: language === 'cn' ? '最大连续盈利天数' : 'Max consecutive winning days', shortLabel: language === 'cn' ? '连续盈利天数' : 'Winning day streak', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'maxConsecutiveWins', category: 'streaks', label: language === 'cn' ? '最大连续盈利交易' : 'Max consecutive wins', shortLabel: language === 'cn' ? '连续盈利交易' : 'Win streak', color: '#55c39e', visual: 'bar', format: 'number' },
      { id: 'sharpeRatio', category: 'streaks', label: language === 'cn' ? '夏普比率' : 'Sharpe ratio', shortLabel: language === 'cn' ? '夏普比率' : 'Sharpe ratio', color: '#6b55cf', visual: 'line', format: 'number' },
      { id: 'shortWinPct', category: 'streaks', label: language === 'cn' ? '空头胜率' : 'Shorts win %', shortLabel: language === 'cn' ? '空头胜率' : 'Short win %', color: '#55c39e', visual: 'line', format: 'percent' },
      { id: 'sortinoRatio', category: 'streaks', label: language === 'cn' ? '索提诺比率' : 'Sortino ratio', shortLabel: language === 'cn' ? '索提诺' : 'Sortino ratio', color: '#6b55cf', visual: 'line', format: 'number' },
      { id: 'winPct', category: 'streaks', label: language === 'cn' ? '胜率' : 'Win %', shortLabel: language === 'cn' ? '胜率' : 'Win %', color: '#3d63dd', visual: 'line', format: 'percent' },
      { id: 'winningDays', category: 'streaks', label: language === 'cn' ? '盈利天数' : 'Winning days', shortLabel: language === 'cn' ? '盈利天数' : 'Winning days', color: '#55c39e', visual: 'bar', format: 'number' },
  ];

  const getDayTimeMetricOption = (id: DayTimeMetricId) => dayTimeMetricOptions.find(option => option.id === id) || dayTimeMetricOptions[0];
  const dayTimeMetricCategoryOrder: Array<'time' | 'risk' | 'profitability' | 'activity' | 'streaks'> = ['time', 'risk', 'profitability', 'activity', 'streaks'];
  const dayTimeMetricCategoryLabels: Record<'time' | 'profitability' | 'risk' | 'activity' | 'streaks', string> = {
      time: language === 'cn' ? '时间分析' : 'Time Analysis',
      profitability: language === 'cn' ? '盈利能力' : 'Profitability',
      risk: language === 'cn' ? '风险与回撤' : 'Risk & Drawdown',
      activity: language === 'cn' ? '交易活动与成交量' : 'Trading Activity & Volume',
      streaks: language === 'cn' ? '连续性与稳定性' : 'Streaks & Consistency',
  };
  const normalizedDayTimeMetricPickerSearch = dayTimeMetricPickerSearch.trim().toLowerCase();
  const visibleDayTimeMetricCategories = dayTimeMetricCategoryOrder
      .map(category => ({
          id: category,
          label: dayTimeMetricCategoryLabels[category],
          metrics: dayTimeMetricOptions
              .filter(option => option.category === category)
              .filter(option => !normalizedDayTimeMetricPickerSearch || option.label.toLowerCase().includes(normalizedDayTimeMetricPickerSearch)),
      }))
      .filter(category => category.metrics.length > 0);

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
      setReportResult(getSafeReportHtml(report));
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
                                      setReportResult(getSafeReportHtml(report));
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

  const calendarStatisticsColumns = useMemo(() => {
      const leftColumn = [
          [language === 'cn' ? '总盈亏' : 'Total P&L', formatSignedMoney(calendarMonthViewData.summary.totalPnl)],
          [language === 'cn' ? '平均每日成交额' : 'Average daily volume', calendarMonthViewData.summary.activeDays > 0 ? (calendarMonthViewData.summary.totalVolume / calendarMonthViewData.summary.activeDays).toFixed(2) : '0.00'],
          [language === 'cn' ? '平均盈利交易' : 'Average winning trade', stats.winCount > 0 ? formatSignedMoney(stats.avgWin) : '--'],
          [language === 'cn' ? '平均亏损交易' : 'Average losing trade', stats.lossCount > 0 ? formatSignedMoney(stats.avgLoss) : '--'],
          [language === 'cn' ? '总交易数' : 'Total number of trades', String(calendarMonthViewData.summary.totalTrades)],
          [language === 'cn' ? '盈利交易数' : 'Number of winning trades', String(calendarMonthViewData.summary.winningTrades)],
          [language === 'cn' ? '亏损交易数' : 'Number of losing trades', String(calendarMonthViewData.summary.losingTrades)],
          [language === 'cn' ? '打平交易数' : 'Number of break even trades', String(calendarMonthViewData.summary.breakevenTrades)],
          [language === 'cn' ? '最大连续盈利' : 'Max consecutive wins', String(stats.maxConWins)],
          [language === 'cn' ? '最大连续亏损' : 'Max consecutive losses', String(stats.maxConLoss)],
          [language === 'cn' ? '总佣金' : 'Total commissions', formatSignedMoney(0)],
          [language === 'cn' ? '总费用' : 'Total fees', formatSignedMoney(calendarMonthViewData.summary.totalFees)],
          [language === 'cn' ? '总隔夜费' : 'Total swap', formatSignedMoney(0)],
          [language === 'cn' ? '最大盈利' : 'Largest profit', formatSignedMoney(stats.largestProfit)],
          [language === 'cn' ? '最大亏损' : 'Largest loss', formatSignedMoney(stats.largestLoss)],
          [language === 'cn' ? '平均持仓时间（全部交易）' : 'Average hold time (All trades)', formatDuration(stats.avgHoldAll)],
          [language === 'cn' ? '平均持仓时间（盈利交易）' : 'Average hold time (Winning trades)', formatDuration(stats.avgHoldWin)],
          [language === 'cn' ? '平均持仓时间（亏损交易）' : 'Average hold time (Losing trades)', formatDuration(stats.avgHoldLoss)],
          [language === 'cn' ? '平均持仓时间（打平交易）' : 'Average hold time (Scratch trades)', formatDuration(stats.avgHoldScratch)],
          [language === 'cn' ? '平均单笔盈亏' : 'Average trade P&L', formatSignedMoney(stats.avgTradePnl)],
          [language === 'cn' ? '盈利因子' : 'Profit factor', stats.profitFactor >= 999 ? '999+' : stats.profitFactor.toFixed(2)],
      ];

      const rightColumn = [
          [language === 'cn' ? '未平仓交易' : 'Open trades', String(calendarMonthViewData.summary.openTrades)],
          [language === 'cn' ? '总交易日数' : 'Total trading days', String(calendarMonthViewData.summary.activeDays)],
          [language === 'cn' ? '盈利天数' : 'Winning days', String(calendarMonthViewData.summary.winningDays)],
          [language === 'cn' ? '亏损天数' : 'Losing days', String(calendarMonthViewData.summary.losingDays)],
          [language === 'cn' ? '打平天数' : 'Breakeven days', String(calendarMonthViewData.summary.breakevenDays)],
          [language === 'cn' ? '记录天数' : 'Logged days', String(calendarMonthViewData.summary.activeDays)],
          [language === 'cn' ? '最大连续盈利天数' : 'Max consecutive winning days', String(stats.maxConWinDays)],
          [language === 'cn' ? '最大连续亏损天数' : 'Max consecutive losing days', String(stats.maxConLossDays)],
          [language === 'cn' ? '平均每日盈亏' : 'Average daily P&L', formatSignedMoney(stats.avgDailyPnl)],
          [language === 'cn' ? '平均盈利日盈亏' : 'Average winning day P&L', calendarMonthViewData.summary.winningDays > 0 ? formatSignedMoney(calendarMonthViewData.summary.avgWinningDayPnl) : '--'],
          [language === 'cn' ? '平均亏损日盈亏' : 'Average losing day P&L', calendarMonthViewData.summary.losingDays > 0 ? formatSignedMoney(calendarMonthViewData.summary.avgLosingDayPnl) : '--'],
          [language === 'cn' ? '最大盈利日（盈利）' : 'Largest profitable day (Profits)', calendarMonthViewData.summary.largestWinningDay ? formatSignedMoney(calendarMonthViewData.summary.largestWinningDay.pnl) : '--'],
          [language === 'cn' ? '最大亏损日（亏损）' : 'Largest losing day (Losses)', calendarMonthViewData.summary.largestLosingDay ? formatSignedMoney(calendarMonthViewData.summary.largestLosingDay.pnl) : '--'],
          [language === 'cn' ? '平均计划 R 倍数' : 'Average planned R-Multiple', performanceSummary.avgPlannedR === null ? '0R' : `${performanceSummary.avgPlannedR.toFixed(0)}R`],
          [language === 'cn' ? '平均实现 R 倍数' : 'Average realized R-Multiple', `${stats.avgRealizedR.toFixed(0)}R`],
          [language === 'cn' ? '交易期望值' : 'Trade expectancy', formatSignedMoney(stats.expectancy)],
          [language === 'cn' ? '最大回撤' : 'Max drawdown', formatSignedMoney(calendarMonthViewData.summary.maxDrawdown)],
          [language === 'cn' ? '最大回撤，%' : 'Max drawdown, %', '0'],
          [language === 'cn' ? '平均回撤' : 'Average drawdown', formatSignedMoney(performanceSummary.avgDailyNetDrawdown)],
          [language === 'cn' ? '平均回撤，%' : 'Average drawdown, %', '0'],
      ];

      return [leftColumn, rightColumn];
  }, [calendarMonthViewData, language, performanceSummary, stats]);

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

  const dayTimeChartAnimationSignature = useMemo(() => {
      const activeDetailedRows = detailedFilter === 'SYMBOLS'
          ? symbolReportRows
          : detailedFilter === 'SETUPS'
              ? strategyReportRows
              : detailedFilter === 'RISK'
                  ? riskReportRows
                  : detailedFilter === 'TAGS'
                      ? tagReportRows
                      : dayTimeReportRows;
      const rowsSignature = activeDetailedRows
          .map(row => `${row.key}:${row.count}:${row.winRate}:${row.netPnl}:${row.avgDailyVolume}`)
          .join('|');

      return [
          detailedFilter || 'performance',
          dayTimeReportView,
          symbolReportView,
          riskReportView,
          activeTagReportCategory?.id || 'none',
          pnlDisplayMode,
          language,
          dayTimeLeftPrimaryMetric,
          dayTimeLeftSecondaryMetric || 'none',
          dayTimeLeftTertiaryMetric || 'none',
          dayTimeRightPrimaryMetric,
          dayTimeRightSecondaryMetric || 'none',
          dayTimeRightTertiaryMetric || 'none',
          JSON.stringify(dayTimeChartStyleSettings.left),
          JSON.stringify(dayTimeChartStyleSettings.right),
          rowsSignature,
      ].join('||');
  }, [
      dayTimeReportRows,
      symbolReportRows,
      strategyReportRows,
      riskReportRows,
      tagReportRows,
      detailedFilter,
      dayTimeReportView,
      symbolReportView,
      riskReportView,
      activeTagReportCategory,
      pnlDisplayMode,
      language,
      dayTimeLeftPrimaryMetric,
      dayTimeLeftSecondaryMetric,
      dayTimeLeftTertiaryMetric,
      dayTimeRightPrimaryMetric,
      dayTimeRightSecondaryMetric,
      dayTimeRightTertiaryMetric,
      dayTimeChartStyleSettings,
  ]);
  const previousDayTimeChartAnimationSignatureRef = useRef<string | null>(null);
  const [shouldAnimateDayTimeCharts, setShouldAnimateDayTimeCharts] = useState(true);
  const [shouldAnimateDayTimeInsights, setShouldAnimateDayTimeInsights] = useState(true);
  const previousWinLossesChartAnimationSignatureRef = useRef<string | null>(null);
  const [shouldAnimateWinLossesCharts, setShouldAnimateWinLossesCharts] = useState(true);

  useEffect(() => {
      const hasDayTimeChartChanged = previousDayTimeChartAnimationSignatureRef.current !== dayTimeChartAnimationSignature;
      previousDayTimeChartAnimationSignatureRef.current = dayTimeChartAnimationSignature;

      if (hasDayTimeChartChanged) {
          setShouldAnimateDayTimeCharts(true);
      }

      const timer = window.setTimeout(() => {
          setShouldAnimateDayTimeCharts(false);
      }, 760);

      return () => window.clearTimeout(timer);
  }, [dayTimeChartAnimationSignature]);

  useEffect(() => {
      const timer = window.setTimeout(() => {
          setShouldAnimateDayTimeInsights(false);
      }, 620);

      return () => window.clearTimeout(timer);
  }, []);

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

  const OverviewInfoBadge = () => (
      <span
          className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-[#6b55cf] text-[9px] font-black leading-none text-white"
          aria-hidden="true"
      >
          !
      </span>
  );

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

  const formatCompareDateValue = (value: string) => {
      if (!value) return '';
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return '';
      return language === 'cn'
          ? date.toLocaleDateString('zh-CN')
          : date.toLocaleDateString('en-US');
  };

  const renderCompareMiniCalendar = (group: CompareGroupKey, field: CompareCalendarField, baseDate: Date) => {
      const { days, firstDay } = getDaysInMonth(baseDate);
      const dayCells = [];
      const selectedValue = compareDraftFilters[group][field];

      for (let i = 0; i < firstDay; i++) {
          dayCells.push(<div key={`compare-empty-${group}-${field}-${i}`} className="h-8 w-8" />);
      }

      for (let day = 1; day <= days; day++) {
          const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
          const currentValue = current.toLocaleDateString('en-CA');
          const isSelected = currentValue === selectedValue;

          dayCells.push(
              <button
                  key={`${group}-${field}-${day}`}
                  type="button"
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${
                      isSelected
                          ? 'bg-indigo-600 font-bold text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => {
                      setCompareDraftFilters(currentState => ({
                          ...currentState,
                          [group]: {
                              ...currentState[group],
                              [field]: currentValue,
                          },
                      }));
                      setActiveCompareCalendar(null);
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
                      <div key={`compare-day-${day}-${index}`} className="text-[10px] font-bold text-slate-400">{day}</div>
                  ))}
                  {dayCells}
              </div>
          </div>
      );
  };

  const currentAccountName = selectedAccountId === 'all'
      ? (language === 'cn' ? '所有账户' : 'All Accounts')
      : accounts.find(account => account.id === selectedAccountId)?.name || (language === 'cn' ? '未知账户' : 'Unknown');

  const compareSideOptions: Array<{ id: CompareSideFilter; label: string }> = [
      { id: 'all', label: language === 'cn' ? '全部' : 'All' },
      { id: 'long', label: language === 'cn' ? '多' : 'Long' },
      { id: 'short', label: language === 'cn' ? '空' : 'Short' },
  ];
  const comparePnlOptions: Array<{ id: ComparePnlFilter; label: string }> = [
      { id: 'all', label: language === 'cn' ? '全部' : 'All' },
      { id: 'win', label: language === 'cn' ? '盈利' : 'Win' },
      { id: 'loss', label: language === 'cn' ? '亏损' : 'Loss' },
  ];

  const updateCompareDraftFilters = (
      group: CompareGroupKey,
      updater: (current: CompareGroupFilters) => CompareGroupFilters,
  ) => {
      setCompareDraftFilters(current => ({
          ...current,
          [group]: updater(current[group]),
      }));
  };

  const toggleCompareMultiValue = (group: CompareGroupKey, field: CompareMultiSelectField, value: string) => {
      updateCompareDraftFilters(group, current => {
          const nextValues = current[field].includes(value)
              ? current[field].filter(item => item !== value)
              : [...current[field], value];
          return {
              ...current,
              [field]: nextValues,
          };
      });
  };

  const resetCompareFilters = () => {
      const next = {
          left: createDefaultCompareGroupFilters(),
          right: createDefaultCompareGroupFilters(),
      };
      setCompareDraftFilters(next);
      setCompareAppliedFilters(next);
      setCompareHasGenerated(false);
      setActiveCompareMultiSelect(null);
      setActiveCompareSelect(null);
      setActiveCompareCalendar(null);
      setCompareSearch({
          left: { symbols: '', tags: '' },
          right: { symbols: '', tags: '' },
      });
  };

  const generateCompareReport = () => {
      setCompareAppliedFilters({
          left: { ...compareDraftFilters.left },
          right: { ...compareDraftFilters.right },
      });
      setCompareHasGenerated(true);
      setActiveCompareMultiSelect(null);
      setActiveCompareSelect(null);
      setActiveCompareCalendar(null);
  };

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

  const updateDayTimeChartStyle = (side: ChartSide, slot: ChartMetricSlot, patch: NonNullable<ChartStyleSettings[ChartSide][ChartMetricSlot]>) => {
      setDayTimeChartStyleSettings(current => ({
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

  const DayTimeChartStyleMenu = ({
      side,
      metrics,
  }: {
      side: ChartSide;
      metrics: Array<{
          slot: ChartMetricSlot;
          config: {
              label: string;
          };
          visual: ChartMetricVisual;
          color: string;
      }>;
  }) => {
      const isOpen = openDayTimeChartStyleMenu === side;

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
                      const visualDropdownOpen = openDayTimeChartVisualDropdown?.side === side && openDayTimeChartVisualDropdown.slot === metric.slot;
                      const colorDropdownOpen = openDayTimeChartColorDropdown?.side === side && openDayTimeChartColorDropdown.slot === metric.slot;

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
                                              setOpenDayTimeChartColorDropdown(current => current?.side === side && current.slot === metric.slot ? null : { side, slot: metric.slot });
                                              setOpenDayTimeChartVisualDropdown(null);
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
                                                          updateDayTimeChartStyle(side, metric.slot, { color: optionColor });
                                                          setOpenDayTimeChartColorDropdown(null);
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
                                              setOpenDayTimeChartVisualDropdown(current => current?.side === side && current.slot === metric.slot ? null : { side, slot: metric.slot });
                                              setOpenDayTimeChartColorDropdown(null);
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
                                                          updateDayTimeChartStyle(side, metric.slot, { visual: option.id });
                                                          setOpenDayTimeChartVisualDropdown(null);
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
                          setDayTimeChartStyleSettings(current => ({ ...current, [side]: {} }));
                          setOpenDayTimeChartVisualDropdown(null);
                          setOpenDayTimeChartColorDropdown(null);
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
              dataKeys: [] as Array<'primaryValue' | 'secondaryValue' | 'tertiaryValue'>,
          };
          if (!current.colors.includes(metric.color)) {
              current.colors.push(metric.color);
          }
          if (!current.dataKeys.includes(metric.dataKey)) {
              current.dataKeys.push(metric.dataKey);
          }
          groups.set(metric.yAxisId, current);
          return groups;
      }, new Map<string, { id: string; format: ChartMetricFormat; orientation: 'left' | 'right'; colors: string[]; dataKeys: Array<'primaryValue' | 'secondaryValue' | 'tertiaryValue'> }>()).values())
          .map(axis => {
              const axisValues = data.flatMap(row => axis.dataKeys.map(key => Number(row[key])).filter(Number.isFinite));
              return {
                  ...axis,
                  ticks: getChartAxisTicks(axisValues),
              };
          });
      const leftAxisGroups = axisGroups.filter(axis => axis.orientation === 'left');
      const rightAxisGroups = axisGroups.filter(axis => axis.orientation === 'right');
      const gridAxis = axisGroups[0];
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
                          <CartesianGrid
                              vertical={false}
                              horizontal
                              stroke="#dfe5eb"
                              strokeOpacity={0.45}
                              strokeDasharray="4 4"
                          />
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
                                  ticks={axis.ticks}
                                  domain={[axis.ticks[0], axis.ticks[axis.ticks.length - 1]]}
                                  allowDataOverflow={false}
                              />
                          ))}
                          <Tooltip
                              cursor={{ stroke: primaryMetric.color, strokeWidth: 1, strokeDasharray: '3 3' }}
                              content={<GenericChartTooltip metrics={metrics} />}
                          />
                          {gridAxis?.ticks.map(tick => (
                              <ReferenceLine
                                  key={`${side}-horizontal-grid-${tick}`}
                                  yAxisId={gridAxis.id}
                                  y={tick}
                                  stroke="#dfe5eb"
                                  strokeOpacity={0.42}
                                  strokeDasharray="4 4"
                                  strokeWidth={1}
                                  ifOverflow="extendDomain"
                              />
                          ))}
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

  const getDayTimeMetricState = (side: ChartSide, slot: ChartMetricSlot): DayTimeMetricId | null => {
      if (side === 'left') {
          if (slot === 'primary') return dayTimeLeftPrimaryMetric;
          if (slot === 'secondary') return dayTimeLeftSecondaryMetric;
          return dayTimeLeftTertiaryMetric;
      }
      if (slot === 'primary') return dayTimeRightPrimaryMetric;
      if (slot === 'secondary') return dayTimeRightSecondaryMetric;
      return dayTimeRightTertiaryMetric;
  };

  const setDayTimeMetricState = (side: ChartSide, slot: ChartMetricSlot, metricId: DayTimeMetricId | null) => {
      if (side === 'left') {
          if (slot === 'primary' && metricId) setDayTimeLeftPrimaryMetric(metricId);
          else if (slot === 'secondary') setDayTimeLeftSecondaryMetric(metricId);
          else if (slot === 'tertiary') setDayTimeLeftTertiaryMetric(metricId);
          return;
      }

      if (slot === 'primary' && metricId) setDayTimeRightPrimaryMetric(metricId);
      else if (slot === 'secondary') setDayTimeRightSecondaryMetric(metricId);
      else if (slot === 'tertiary') setDayTimeRightTertiaryMetric(metricId);
  };

  const getDayTimeMetricIds = (side: ChartSide) => {
      const ids = side === 'left'
          ? [dayTimeLeftPrimaryMetric, dayTimeLeftSecondaryMetric, dayTimeLeftTertiaryMetric]
          : [dayTimeRightPrimaryMetric, dayTimeRightSecondaryMetric, dayTimeRightTertiaryMetric];
      return ids.filter((metric): metric is DayTimeMetricId => Boolean(metric));
  };

  const getDayTimeNextSlot = (side: ChartSide): ChartMetricSlot | null => {
      if (!getDayTimeMetricState(side, 'secondary')) return 'secondary';
      if (!getDayTimeMetricState(side, 'tertiary')) return 'tertiary';
      return null;
  };

  const getDayTimeAvailableMetrics = (selectedMetricId: DayTimeMetricId | null, excludedMetricIds: DayTimeMetricId[]) =>
      dayTimeMetricOptions.filter(option => option.id === selectedMetricId || !excludedMetricIds.includes(option.id));

  const getDayTimeChartVisual = (side: ChartSide, slot: ChartMetricSlot, metric: ReturnType<typeof getDayTimeMetricOption>): ChartMetricVisual =>
      dayTimeChartStyleSettings[side][slot]?.visual || metric.visual;

  const getDayTimeChartColor = (side: ChartSide, slot: ChartMetricSlot, metric: ReturnType<typeof getDayTimeMetricOption>): string =>
      dayTimeChartStyleSettings[side][slot]?.color || metric.color;

  const getDayTimeRenderMetrics = (side: ChartSide) => {
      const metricIds = getDayTimeMetricIds(side);
      return metricIds.map((metricId, index) => {
          const slot = index === 0 ? 'primary' : index === 1 ? 'secondary' : 'tertiary';
          const metric = getDayTimeMetricOption(metricId);
          return {
              ...metric,
              slot,
              visual: getDayTimeChartVisual(side, slot, metric),
              color: getDayTimeChartColor(side, slot, metric),
          };
      });
  };

  const triggerMetricSweep = (event: React.MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget;
      button.classList.remove('is-sweeping');
      void button.offsetWidth;
      button.classList.add('is-sweeping');
      window.setTimeout(() => button.classList.remove('is-sweeping'), 540);
  };

  const DayTimeMetricPicker = ({
      side,
      slot,
      selectedMetricId,
      excludedMetricIds = [],
  }: {
      side: ChartSide;
      slot: ChartMetricSlot;
      selectedMetricId: DayTimeMetricId | null;
      excludedMetricIds?: DayTimeMetricId[];
  }) => {
      if (openDayTimeMetricPicker?.side !== side || openDayTimeMetricPicker.slot !== slot) return null;

      const availableMetricIds = new Set(getDayTimeAvailableMetrics(selectedMetricId, excludedMetricIds).map(option => option.id));
      const visibleCategories = visibleDayTimeMetricCategories
          .map(category => ({
              ...category,
              metrics: category.metrics.filter(option => availableMetricIds.has(option.id)),
          }))
          .filter(category => category.metrics.length > 0);

      const handleSelectMetric = (metricId: DayTimeMetricId) => {
          setDayTimeMetricState(side, slot, metricId);
          setOpenDayTimeMetricPicker(null);
          setDayTimeMetricPickerSearch('');
      };

      return (
          <div className="absolute left-0 top-full z-50 mt-[8px] flex max-h-[440px] w-[clamp(260px,100%,420px)] min-w-full origin-top-left flex-col overflow-hidden rounded-[10px] border border-[#e2e6ec] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
              <div className="p-[12px] pb-[8px]">
                  <div className="relative">
                      <Search className="pointer-events-none absolute left-[10px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#8b95a1]" />
                      <input
                          value={dayTimeMetricPickerSearch}
                          onChange={(event) => setDayTimeMetricPickerSearch(event.target.value)}
                          placeholder={language === 'cn' ? '搜索' : 'Search'}
                          className="h-[38px] w-full rounded-[7px] border border-[#d9dee6] bg-white pl-[33px] pr-[10px] text-[14px] font-medium text-[#303844] outline-none transition-colors placeholder:text-[#6f7782] focus:border-[#6b55cf] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                  </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-[12px] pb-[10px]">
                  {visibleCategories.map(category => {
                      const isExpanded = Boolean(normalizedDayTimeMetricPickerSearch) || expandedDayTimeMetricCategory === category.id;
                      const expandedHeight = category.metrics.length * 38 + 10;
                      return (
                          <div key={category.id}>
                              <button
                                  type="button"
                                  onClick={() => setExpandedDayTimeMetricCategory(isExpanded && !normalizedDayTimeMetricPickerSearch ? null : category.id)}
                                  className={`flex w-full items-center justify-between py-[10px] text-left text-[14px] font-semibold transition-colors ${isExpanded ? 'text-[#5b45d6]' : 'text-[#26303b] hover:text-[#5b45d6] dark:text-slate-200'}`}
                              >
                                  {category.label}
                                  <ChevronDown className={`h-[17px] w-[17px] transition-transform ${isExpanded ? 'rotate-180 text-[#5b45d6]' : 'text-[#727b86]'}`} />
                              </button>
                              <div
                                  className={`report-metric-category-panel ${isExpanded ? 'is-open' : ''}`}
                                  style={{ maxHeight: isExpanded ? `${expandedHeight}px` : '0px' }}
                              >
                                  <div className="report-metric-category-panel-content space-y-[1px]">
                                      {category.metrics.map((option, index) => {
                                          const selected = option.id === selectedMetricId;
                                          return (
                                              <button
                                                  key={option.id}
                                                  type="button"
                                                  onClick={() => handleSelectMetric(option.id)}
                                                  className={`report-metric-option block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[14px] font-medium leading-[1.45] transition-colors ${
                                                      selected
                                                          ? 'bg-[#ebe7f8] text-[#2f255f]'
                                                          : 'text-[#26303b] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                  }`}
                                                  style={{ '--option-index': index } as React.CSSProperties}
                                              >
                                                  <span className="truncate">{option.label}</span>
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
                  {visibleCategories.length === 0 && (
                      <div className="px-[4px] py-[18px] text-center text-[13px] font-medium text-[#7b828c]">
                          {language === 'cn' ? '没有匹配指标' : 'No matching metrics'}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const DayTimeMetricTrigger = ({
      side,
      slot,
      metricId,
      removable = false,
      onRemove,
  }: {
      side: ChartSide;
      slot: ChartMetricSlot;
      metricId: DayTimeMetricId;
      removable?: boolean;
      onRemove?: () => void;
  }) => {
      const selected = getDayTimeMetricOption(metricId);
      const sideMetrics = getDayTimeMetricIds(side);
      const excludedMetricIds = sideMetrics.filter(id => id !== metricId);

      return (
          <div className="group/day-time-metric relative flex w-[clamp(118px,11vw,178px)] flex-none items-center" data-day-time-metric-picker-root>
              <button
                  type="button"
                  onClick={(event) => {
                      triggerMetricSweep(event);
                      setOpenDayTimeMetricPicker(current => {
                          const next = current?.side === side && current.slot === slot ? null : { side, slot };
                          if (!next) setDayTimeMetricPickerSearch('');
                          return next;
                      });
                  }}
                  className="report-chart-metric-trigger relative inline-flex h-[32px] min-w-0 flex-1 items-center justify-between gap-[8px] overflow-hidden rounded-[7px] border border-[#dfe4ec] bg-white pl-[18px] pr-[9px] text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                  <span className="pointer-events-none absolute left-0 top-0 h-full w-[5px]">
                      <span className="absolute left-0 top-0 h-full w-[4px] rounded-l-[7px]" style={{ backgroundColor: selected.color }} />
                  </span>
                  <span className="truncate">{selected.label}</span>
                  <ChevronDown className="h-[15px] w-[15px] shrink-0 text-[#111827] dark:text-slate-300" />
              </button>
              {removable && (
                  <button
                      type="button"
                      onClick={(event) => {
                          event.stopPropagation();
                          onRemove?.();
                          setOpenDayTimeMetricPicker(null);
                      }}
                      className="pointer-events-none ml-0 inline-flex h-[22px] w-0 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dfe4ec] bg-white text-[#858d99] opacity-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[width,margin,opacity,background-color,color,border-color] duration-150 ease-out hover:border-[#ccd3de] hover:bg-[#f5f6f8] hover:text-[#2f3742] group-hover/day-time-metric:pointer-events-auto group-hover/day-time-metric:ml-[6px] group-hover/day-time-metric:w-[22px] group-hover/day-time-metric:opacity-100 focus-visible:pointer-events-auto focus-visible:ml-[6px] focus-visible:w-[22px] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                      aria-label={language === 'cn' ? '移除指标' : 'Remove metric'}
                  >
                      <X className="h-[13px] w-[13px]" />
                  </button>
              )}
              <DayTimeMetricPicker
                  side={side}
                  slot={slot}
                  selectedMetricId={metricId}
                  excludedMetricIds={excludedMetricIds}
              />
          </div>
      );
  };

  const DayTimeAddMetricButton = ({ side }: { side: ChartSide }) => {
      const nextSlot = getDayTimeNextSlot(side);
      if (!nextSlot) return null;
      const selectedMetricId = getDayTimeMetricState(side, nextSlot);

      return (
          <div className="relative inline-flex shrink-0" data-day-time-metric-picker-root>
              <button
                  type="button"
                  onClick={() => setOpenDayTimeMetricPicker(current => {
                      const next = current?.side === side && current.slot === nextSlot ? null : { side, slot: nextSlot };
                      if (!next) setDayTimeMetricPickerSearch('');
                      return next;
                  })}
                  className="h-[32px] whitespace-nowrap rounded-[7px] px-[10px] text-[13px] font-semibold text-[#6b55cf] transition-colors hover:bg-[#ebe7f8] hover:text-[#4b35b8]"
              >
                  + {language === 'cn' ? '添加指标' : 'Add metric'}
              </button>
              <DayTimeMetricPicker
                  side={side}
                  slot={nextSlot}
                  selectedMetricId={selectedMetricId}
                  excludedMetricIds={getDayTimeMetricIds(side)}
              />
          </div>
      );
  };

  const renderDayTimeMetricChart = ({
      chartId,
      rows = dayTimeReportRows,
      metrics,
      animate = false,
      animationDelayMs = 0,
  }: {
      chartId: string;
      rows?: DayTimeReportRow[];
      metrics: Array<ReturnType<typeof getDayTimeMetricOption> & { slot: ChartMetricSlot }>;
      animate?: boolean;
      animationDelayMs?: number;
  }) => {
      const visibleMetrics = metrics;
      const chartData = rows.map(row => ({
          ...row,
          label: row.shortLabel,
          tooltipLabel: row.label,
          ...Object.fromEntries(metrics.map(metric => [metric.id, getDayTimeMetricValue(row, metric.id)])),
      }));
      const axisGroups = visibleMetrics.map((metric, index) => {
          const values = chartData.map(row => Number(row[metric.id])).filter(Number.isFinite);
          return {
              id: `${chartId}-${metric.id}`,
              metric,
              orientation: index === 0 ? 'left' as const : 'right' as const,
              ticks: getChartAxisTicks(values),
          };
      });
      const gridAxis = axisGroups[0];
      const xTicks = getEvenlySpacedIndexes(chartData.length, Math.min(chartData.length, 8)).map(index => chartData[index]?.label).filter(Boolean);

      const renderSeries = (metric: typeof visibleMetrics[number], index: number) => {
          const yAxisId = `${chartId}-${metric.id}`;
          if (metric.visual === 'bar') {
              return (
                  <Bar key={metric.id} yAxisId={yAxisId} dataKey={metric.id} barSize={metrics.length > 1 ? 26 : 34} radius={[3, 3, 0, 0]} fill={metric.color} isAnimationActive={shouldAnimateDayTimeCharts} animationDuration={520} animationBegin={animationDelayMs}>
                      {chartData.map((entry, cellIndex) => (
                          <Cell key={`${chartId}-${metric.id}-${cellIndex}`} fill={Number(entry[metric.id]) >= 0 ? metric.color : '#ff6468'} />
                      ))}
                  </Bar>
              );
          }

          if (metric.visual === 'area') {
              return (
                  <Area
                      key={metric.id}
                      yAxisId={yAxisId}
                      type="monotone"
                      dataKey={metric.id}
                      stroke={metric.color}
                      strokeWidth={2}
                      fill={`url(#${chartId}-${metric.id}-fill)`}
                      dot={{ r: 2.4, fill: metric.color, stroke: metric.color, strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#fff', stroke: metric.color, strokeWidth: 2.4 }}
                      isAnimationActive={shouldAnimateDayTimeCharts}
                      animationDuration={560}
                      animationBegin={animationDelayMs}
                      connectNulls
                  />
              );
          }

          return (
              <Line
                  key={metric.id}
                  yAxisId={yAxisId}
                  type="monotone"
                  dataKey={metric.id}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={{ r: 2.4, fill: metric.color, stroke: metric.color, strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#fff', stroke: metric.color, strokeWidth: 2.4 }}
                  isAnimationActive={shouldAnimateDayTimeCharts}
                  animationDuration={560}
                  animationBegin={animationDelayMs}
                  connectNulls
              />
          );
      };

      return (
          <div
              className={`relative h-full ${animate ? 'animate-fade-in' : ''}`}
              >
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 26, left: 8, bottom: 44 }} barCategoryGap="48%">
                      <defs>
                          {visibleMetrics.map(metric => (
                              <linearGradient key={metric.id} id={`${chartId}-${metric.id}-fill`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={metric.color} stopOpacity={0.42} />
                                  <stop offset="58%" stopColor={metric.color} stopOpacity={0.14} />
                                  <stop offset="100%" stopColor={metric.color} stopOpacity={0.03} />
                              </linearGradient>
                          ))}
                      </defs>
                      <CartesianGrid vertical={false} horizontal stroke="#dfe5eb" strokeOpacity={0.45} strokeDasharray="4 4" />
                      <XAxis dataKey="label" ticks={xTicks} interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4a5563', fontWeight: 500 }} dy={15} padding={{ left: 18, right: 28 }} />
                      {axisGroups.map(axis => (
                          <YAxis
                              key={axis.id}
                              yAxisId={axis.id}
                              orientation={axis.orientation}
                              axisLine={false}
                              tickLine={false}
                              width={axis.metric.format === 'money' ? 64 : axis.metric.format === 'percent' ? 50 : 42}
                              ticks={axis.ticks}
                              domain={[axis.ticks[0], axis.ticks[axis.ticks.length - 1]]}
                              tick={<ChartYAxisTick format={axis.metric.format} colors={[axis.metric.color]} orientation={axis.orientation} />}
                          />
                      ))}
                      <Tooltip
                          cursor={{ stroke: visibleMetrics[0]?.color || '#6b55cf', strokeDasharray: '3 3' }}
                          content={<GenericChartTooltip metrics={visibleMetrics.map(metric => ({
                              config: {
                                  label: metric.label,
                                  shortLabel: metric.shortLabel,
                                  format: metric.format,
                              },
                              color: metric.color,
                              dataKey: metric.id,
                          }))} />}
                      />
                      {gridAxis?.ticks.map(tick => (
                          <ReferenceLine key={`${chartId}-grid-${tick}`} yAxisId={gridAxis.id} y={tick} stroke="#dfe5eb" strokeOpacity={0.42} strokeDasharray="4 4" strokeWidth={1} ifOverflow="extendDomain" />
                      ))}
                      {visibleMetrics.map(renderSeries)}
                  </ComposedChart>
              </ResponsiveContainer>
              <div className="absolute bottom-[8px] left-1/2 flex -translate-x-1/2 items-center gap-[22px] text-[14px] font-medium text-[#666b72]">
                  {visibleMetrics.map(metric => (
                      <div key={metric.id} className="flex items-center gap-[7px]">
                          <span className="h-[14px] w-[14px] rounded-full" style={{ backgroundColor: metric.color }} />
                          <span>{metric.label}</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const FilledChartStyleIcon = ({ className = '' }: { className?: string }) => (
      <span className={`inline-flex h-4 w-4 items-end justify-center gap-[2px] ${className}`} aria-hidden="true">
          <span className="h-[7px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-[12px] w-[3px] rounded-[1px] bg-current" />
          <span className="h-[9px] w-[3px] rounded-[1px] bg-current" />
      </span>
  );

  const DayTimeInsightIcon = ({ type }: { type: 'best' | 'worst' | 'active' | 'winRate' }) => {
      if (type === 'best') {
          return (
              <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" aria-hidden="true">
                  <path d="M4.2 7.2c0-2 1.6-3.6 3.6-3.6h4.1c.7 0 1.3.2 1.9.6l1 .7c.3.2.6.3 1 .3h.5c2 0 3.6 1.6 3.6 3.6v7.4c0 2.2-1.8 4-4 4H8.2c-2.2 0-4-1.8-4-4V7.2Z" fill="#DDF7EC" />
                  <path d="M4.2 8.6c0-1.9 1.5-3.4 3.4-3.4h4.2c.6 0 1.1.2 1.6.5l1.1.7c.3.2.7.3 1 .3h4.1v1.8c0 1.1-.9 2-2 2H6.2c-.7 0-1.4.2-2 .6V8.6Z" fill="#67D1A7" />
                  <rect x="6.8" y="11.8" width="10.8" height="6.1" rx="1.8" fill="#F8FFFB" />
                  <rect x="8.2" y="14.1" width="1.8" height="2.4" rx="0.7" fill="#35B883" />
                  <rect x="11.2" y="12.7" width="1.8" height="3.8" rx="0.7" fill="#35B883" />
                  <rect x="14.2" y="11.2" width="1.8" height="5.3" rx="0.7" fill="#35B883" />
                  <circle cx="18.1" cy="6.6" r="2.15" fill="#ECFFF5" />
                  <path d="M17.1 6.7c0-.4.3-.7.7-.7h.6c.4 0 .7.3.7.7v1.2c0 .4-.3.7-.7.7h-.6a.7.7 0 0 1-.7-.7V6.7Z" fill="#35B883" />
              </svg>
          );
      }

      if (type === 'worst') {
          return (
              <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" aria-hidden="true">
                  <path d="M4.6 8.1c0-2 1.6-3.6 3.6-3.6h7.6c2 0 3.6 1.6 3.6 3.6v8c0 2.1-1.7 3.8-3.8 3.8H8.4c-2.1 0-3.8-1.7-3.8-3.8V8.1Z" fill="#FFE1E6" />
                  <path d="M6.7 6.2h10.5c1.2 0 2.2 1 2.2 2.2v1H4.6v-.6c0-1.5 1-2.6 2.1-2.6Z" fill="#FF7F8D" />
                  <rect x="6.7" y="10.8" width="10.6" height="5.7" rx="1.8" fill="#FFF7F8" />
                  <path d="M8.5 13.2c0-.7.6-1.2 1.2-1.2h4.7c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2H9.7c-.6 0-1.2-.5-1.2-1.2Z" fill="#FFB6C0" />
                  <path d="M14.8 11.1h1.2c.5 0 .9.4.9.9v3.4c0 .5-.4.9-.9.9h-1.2V11.1Z" fill="#F45C6B" />
                  <circle cx="17.5" cy="6.3" r="2.05" fill="#FFF0F3" />
                  <path d="M16.75 6.35c0-.22.18-.4.4-.4h.7c.22 0 .4.18.4.4v.5c0 .22-.18.4-.4.4h-.7a.4.4 0 0 1-.4-.4v-.5Z" fill="#F45C6B" />
              </svg>
          );
      }

      if (type === 'active') {
          return (
              <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" aria-hidden="true">
                  <path d="M12 3.2c1.2 0 2 .9 2.9 1.2.9.3 2.2 0 2.9.7.7.7.4 2 .7 2.9.3.9 1.2 1.7 1.2 2.9s-.9 2-1.2 2.9c-.3.9 0 2.2-.7 2.9-.7.7-2 .4-2.9.7-.9.3-1.7 1.2-2.9 1.2s-2-.9-2.9-1.2c-.9-.3-2.2 0-2.9-.7-.7-.7-.4-2-.7-2.9-.3-.9-1.2-1.7-1.2-2.9s.9-2 1.2-2.9c.3-.9 0-2.2.7-2.9.7-.7 2-.4 2.9-.7.9-.3 1.7-1.2 2.9-1.2Z" fill="#FFE4A8" />
                  <circle cx="12" cy="12" r="6.2" fill="#FFC652" />
                  <path d="M11.1 7.8c.2-.5.9-.5 1.1 0l.8 2.1c.1.2.2.3.4.4l2.1.8c.5.2.5.9 0 1.1l-2.1.8c-.2.1-.3.2-.4.4l-.8 2.1c-.2.5-.9.5-1.1 0l-.8-2.1a.8.8 0 0 0-.4-.4l-2.1-.8c-.5-.2-.5-.9 0-1.1l2.1-.8c.2-.1.3-.2.4-.4l.8-2.1Z" fill="#F5A100" />
                  <circle cx="17.5" cy="6.7" r="1.35" fill="#FFF6DE" />
              </svg>
          );
      }

      return (
          <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" aria-hidden="true">
              <path d="M5 7.6c0-2 1.6-3.6 3.6-3.6h6.8c2 0 3.6 1.6 3.6 3.6v8.2c0 2.2-1.8 4-4 4H9c-2.2 0-4-1.8-4-4V7.6Z" fill="#E6DEFF" />
              <path d="M5 8.2c0-1.9 1.5-3.4 3.4-3.4h7.2c1.9 0 3.4 1.5 3.4 3.4v1.6H5V8.2Z" fill="#8166E4" />
              <rect x="7.4" y="3.1" width="1.8" height="3.7" rx="0.9" fill="#8166E4" />
              <rect x="14.8" y="3.1" width="1.8" height="3.7" rx="0.9" fill="#8166E4" />
              <rect x="7.3" y="11.4" width="9.4" height="5.7" rx="1.8" fill="#F7F4FF" />
              <path d="M9.2 14.3c0-1.3 1-2.3 2.3-2.3h.9c1.3 0 2.3 1 2.3 2.3 0 1.2-1 2.2-2.3 2.2h-.9c-1.3 0-2.3-1-2.3-2.2Z" fill="#A28AF0" />
              <circle cx="11.2" cy="14.3" r="0.9" fill="#8166E4" />
              <path d="M13.2 13.6h1.3a.8.8 0 0 1 0 1.6h-1.3v-1.6Z" fill="#8166E4" />
          </svg>
      );
  };

  const DayTimeInsightCard = ({
      eyebrow,
      title,
      detail,
      value,
      tone = 'neutral',
      iconType,
      animate = false,
      animationDelayMs = 0,
  }: {
      eyebrow: string;
      title: string;
      detail: string;
      value?: string;
      tone?: 'good' | 'bad' | 'accent' | 'neutral';
      iconType?: 'best' | 'worst' | 'active' | 'winRate';
      animate?: boolean;
      animationDelayMs?: number;
  }) => {
      const toneColor = tone === 'good' ? '#4dbd96' : tone === 'bad' ? '#f05258' : tone === 'accent' ? '#f59f00' : '#6b55cf';
      const valueClass = tone === 'bad'
          ? 'bg-[#ffe5e8] text-[#f05258]'
          : tone === 'good'
              ? 'bg-[#e0f5ee] text-[#31a77e]'
              : 'bg-[#eeeaf8] text-[#6b55cf]';
      return (
          <div
              className={`min-h-[104px] rounded-[8px] bg-white px-[18px] py-[17px] shadow-none dark:bg-slate-900 ${animate ? 'animate-fade-in-up' : ''}`}
              style={animate ? { animationDelay: `${animationDelayMs}ms`, animationDuration: '420ms', animationFillMode: 'both' } : undefined}
          >
              <div className="mb-[10px] flex items-center gap-[6px] text-[13px] font-medium leading-none text-[#777f8b]">
                  <span
                      className={`inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center ${animate ? 'animate-fade-in' : ''}`}
                      style={animate ? { color: toneColor, animationDelay: `${animationDelayMs + 70}ms`, animationDuration: '320ms', animationFillMode: 'both' } : { color: toneColor }}
                  >
                      {iconType ? <DayTimeInsightIcon type={iconType} /> : <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: toneColor }} />}
                  </span>
                  <span>{eyebrow}</span>
              </div>
              <div className="text-[19px] font-bold leading-none text-[#28313c] dark:text-slate-100">{title}</div>
              <div className="mt-[12px] flex items-center gap-[7px] text-[13px] font-bold text-[#3f4854]">
                  <span>{detail}</span>
                  {value && (
                      <span className={`rounded-[4px] px-[5px] py-[2px] text-[13px] font-bold tabular-nums ${valueClass}`}>
                          {value}
                      </span>
                  )}
              </div>
          </div>
      );
  };

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
      const triggerMetricSweep = (event: React.MouseEvent<HTMLButtonElement>) => {
          const button = event.currentTarget;
          button.classList.remove('is-sweeping');
          void button.offsetWidth;
          button.classList.add('is-sweeping');
          window.setTimeout(() => button.classList.remove('is-sweeping'), 540);
      };

      return (
      <div className={`${featured ? 'rounded-[8px] bg-white dark:bg-slate-900 shadow-none' : reportPanelClass} relative overflow-visible`}>
          <div className={`${featured ? 'min-h-[64px] rounded-t-[8px] px-[10px] py-[10px]' : 'min-h-14 px-4 py-3 border-b border-slate-100 dark:border-slate-800'} flex flex-wrap items-start justify-between gap-[10px] bg-white dark:bg-slate-900`}>
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
                          onClick={(event) => {
                              triggerMetricSweep(event);
                              onMetricButtonClick?.();
                              setOpenChartStyleMenu(null);
                              setOpenChartVisualDropdown(null);
                              setOpenChartColorDropdown(null);
                          }}
                          className={`${featured ? 'report-chart-metric-trigger relative h-[32px] w-full overflow-hidden rounded-[7px] border-[#dfe4ec] bg-white pl-[18px] pr-[10px] text-[13px] font-medium text-[#20232a] hover:border-[#c9d0dc]' : 'h-8 w-full min-w-0 border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border transition-colors`}
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
                              onClick={(event) => {
                                  triggerMetricSweep(event);
                                  metric.onButtonClick?.();
                                  setOpenChartStyleMenu(null);
                                  setOpenChartVisualDropdown(null);
                                  setOpenChartColorDropdown(null);
                              }}
                              className={`${featured ? 'report-chart-metric-trigger relative h-[32px] min-w-0 flex-1 overflow-hidden rounded-[7px] border-[#dfe4ec] bg-white pl-[18px] pr-[10px] text-[13px] font-medium text-[#20232a] hover:border-[#c9d0dc]' : 'h-8 min-w-0 flex-1 border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border transition-colors`}
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
          <div className={`${featured ? 'rounded-b-[8px] px-[2px] pb-[12px]' : 'px-4 pt-4'}`}>
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

      const rawDate = payload[0]?.payload?.tooltipLabel || payload[0]?.payload?.date;
      const title = typeof rawDate === 'string' && rawDate
          ? rawDate
          : label;

      return (
          <div className="min-w-[236px] max-w-[360px] rounded-[4px] border border-[#d7dce4] bg-white px-[10px] py-[8px] shadow-[0_2px_8px_rgba(15,23,42,0.18)]">
              <div className="text-[12px] font-semibold leading-[16px] text-[#20232a]">{title}</div>
              <div className="mt-[5px] space-y-[3px]">
                  {rows.map((row: any) => (
                      <div key={row.key} className="flex items-start gap-[6px]">
                          <span className="mt-[5px] h-[6px] w-[6px] flex-shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="text-[12px] font-medium leading-[16px] text-[#303844]">
                              {row.label}: {row.value}
                          </span>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const WinLossDetailedTooltip = ({
      active,
      payload,
      title,
      color,
  }: {
      active?: boolean;
      payload?: Array<{ value?: number; payload?: { tooltipLabel?: string } }>;
      title: string;
      color: string;
  }) => {
      if (!active || !payload?.length) return null;
      const value = Number(payload[0]?.value || 0);
      const tooltipTitle = payload[0]?.payload?.tooltipLabel || '';

      return (
          <div className="min-w-[188px] rounded-[4px] border border-[#d7dce4] bg-white px-[10px] py-[8px] shadow-[0_2px_8px_rgba(15,23,42,0.18)]">
              <div className="text-[12px] font-semibold leading-[16px] text-[#20232a]">{tooltipTitle}</div>
              <div className="mt-[5px] flex items-center gap-[6px]">
                  <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[12px] font-medium leading-[16px] text-[#303844]">
                      {title}: {formatSignedMoney(value)}
                  </span>
              </div>
          </div>
      );
  };

  const renderWinLossDetailedChart = ({
      chartId,
      data,
      color,
      gradientStops,
      title,
      animate,
  }: {
      chartId: string;
      data: WinLossDetailChartPoint[];
      color: string;
      gradientStops: { start: string; end: string };
      title: string;
      animate: boolean;
  }) => {
      const ticks = getEvenlySpacedIndexes(data.length, Math.min(data.length, 6))
          .map(index => data[index]?.label)
          .filter(Boolean);
      const yTicks = getChartAxisTicks(data.map(point => point.value));

      return (
          <div className={`relative h-full ${animate ? 'animate-fade-in' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 26, left: 18, bottom: 26 }}>
                      <defs>
                          <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={gradientStops.start} stopOpacity={0.58} />
                              <stop offset="58%" stopColor={gradientStops.start} stopOpacity={0.2} />
                              <stop offset="100%" stopColor={gradientStops.end} stopOpacity={0.02} />
                          </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} horizontal stroke="#dfe5eb" strokeOpacity={0.48} strokeDasharray="4 4" />
                      <XAxis
                          dataKey="label"
                          ticks={ticks}
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 500 }}
                          dy={16}
                          padding={{ left: 14, right: 24 }}
                      />
                      <YAxis
                          axisLine={false}
                          tickLine={false}
                          width={62}
                          ticks={yTicks}
                          domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                          tick={<ChartYAxisTick format="money" colors={[color]} orientation="left" />}
                      />
                      <Tooltip
                          cursor={{ stroke: color, strokeDasharray: '3 3', strokeWidth: 1 }}
                          content={<WinLossDetailedTooltip title={title} color={color} />}
                      />
                      {yTicks.map(tick => (
                          <ReferenceLine
                              key={`${chartId}-tick-${tick}`}
                              y={tick}
                              stroke="#dfe5eb"
                              strokeOpacity={0.42}
                              strokeDasharray="4 4"
                              strokeWidth={1}
                              ifOverflow="extendDomain"
                          />
                      ))}
                      <Area
                          type="monotone"
                          dataKey="value"
                          stroke={color}
                          strokeWidth={1.8}
                          fill={`url(#${chartId}-fill)`}
                          isAnimationActive={animate}
                          animationDuration={620}
                          animationEasing="ease-out"
                          dot={false}
                          activeDot={{ r: 4.8, fill: '#fff', stroke: color, strokeWidth: 2 }}
                      />
                  </AreaChart>
              </ResponsiveContainer>
          </div>
      );
  };

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
                      const categoryMetrics = category.metrics.filter(([metricId]) => !excludedMetricIds.includes(metricId));
                      const expandedHeight = categoryMetrics.length * 38 + 10;
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
                                  className={`report-metric-category-panel ${isExpanded ? 'is-open' : ''}`}
                                  style={{ maxHeight: isExpanded ? `${expandedHeight}px` : '0px' }}
                              >
                                  <div className="report-metric-category-panel-content space-y-[1px]">
                                      {categoryMetrics
                                          .map(([metricId, config], index) => {
                                              const isSelected = metricId === selectedMetricId;
                                              return (
                                                  <button
                                                      key={metricId}
                                                      type="button"
                                                      onClick={() => handleSelectMetric(metricId)}
                                                      className={`report-metric-option block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[14px] font-medium leading-[1.45] transition-colors ${isSelected ? 'bg-[#ebe7f8] text-[#2f255f]' : 'text-[#26303b] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'}`}
                                                      style={{ '--option-index': index } as React.CSSProperties}
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
      const iconBase = `relative inline-flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-150 ${
          active ? 'bg-[#6f55d8]/10 text-[#6f55d8]' : 'text-[#7e8793] group-hover:bg-[#eef1f5] group-hover:text-[#4d5663]'
      }`;
      const svgBase = "h-[16px] w-[16px]";
      const strokeProps = {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.8,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
      };

      const icons: Record<string, React.ReactNode> = {
          performance: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <rect x="3.5" y="10.5" width="3.2" height="5" rx="1.2" fill="currentColor" opacity={active ? 0.95 : 0.8} />
                  <rect x="8.4" y="5" width="3.2" height="10.5" rx="1.2" fill="currentColor" opacity={active ? 0.95 : 0.8} />
                  <rect x="13.3" y="8" width="3.2" height="7.5" rx="1.2" fill="currentColor" opacity={active ? 0.95 : 0.8} />
              </svg>
          ),
          overview: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <circle cx="10" cy="10" r="7.1" {...strokeProps} />
                  <path d="M3.4 10h13.2M10 2.9c2 2.1 2.8 4.4 2.8 7.1S12 15 10 17.1C8 15 7.2 12.7 7.2 10S8 5 10 2.9Z" {...strokeProps} />
              </svg>
          ),
          detailed: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <rect x="3.5" y="3.2" width="13" height="13.6" rx="3.2" {...strokeProps} />
                  <path d="M7.1 12.7V9.9M10 12.7V7.4M12.9 12.7v-4" {...strokeProps} />
                  <path d="M6.6 14.7h7" {...strokeProps} opacity="0.68" />
              </svg>
          ),
          compare: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <rect x="3.1" y="3.4" width="5.4" height="5.4" rx="1.8" {...strokeProps} />
                  <rect x="11.5" y="3.4" width="5.4" height="5.4" rx="1.8" {...strokeProps} />
                  <rect x="3.1" y="11.2" width="5.4" height="5.4" rx="1.8" {...strokeProps} />
                  <rect x="11.5" y="11.2" width="5.4" height="5.4" rx="1.8" {...strokeProps} />
                  <path d="M8.5 6.1h3M11.5 13.9h-3" {...strokeProps} />
              </svg>
          ),
          calendar: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <rect x="3.3" y="4.3" width="13.4" height="12.1" rx="3" {...strokeProps} />
                  <path d="M6.7 2.9v3M13.3 2.9v3M3.8 8h12.4" {...strokeProps} />
                  <path d="M7 11.3h.1M10 11.3h.1M13 11.3h.1M7 14h.1M10 14h.1" {...strokeProps} />
              </svg>
          ),
          ai: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <rect x="4.2" y="3.2" width="11.6" height="13.6" rx="3" {...strokeProps} />
                  <path d="M7.2 7.4h5.6M7.2 10h5.6M7.2 12.6h3.6" {...strokeProps} />
                  <circle cx="13.1" cy="12.7" r="0.8" fill="currentColor" />
              </svg>
          ),
          guide: (
              <svg viewBox="0 0 20 20" className={svgBase}>
                  <path d="M4.2 4.6c0-1 0.8-1.8 1.8-1.8h3.1c1 0 1.8 0.8 1.8 1.8v12.6c0-1-0.8-1.8-1.8-1.8H6c-1 0-1.8 0.8-1.8 1.8V4.6Z" {...strokeProps} />
                  <path d="M10.9 4.6c0-1 0.8-1.8 1.8-1.8h1.3c1 0 1.8 0.8 1.8 1.8v12.6c0-1-0.8-1.8-1.8-1.8h-1.3c-1 0-1.8 0.8-1.8 1.8V4.6Z" {...strokeProps} />
              </svg>
          ),
      };

      return (
          <span className={iconBase} aria-hidden="true">
              {icons[type] || icons.ai}
          </span>
      );
  };

  const detailedFilterOptions = [
      { id: 'DAYS', label: language === 'cn' ? t.reports.filters.days : 'Day & Time' },
      { id: 'WEEKS', label: t.reports.filters.weeks },
      { id: 'MONTHS', label: t.reports.filters.months },
      { id: 'TIME', label: t.reports.filters.time },
      { id: 'SYMBOLS', label: language === 'cn' ? '交易品种' : 'Symbols' },
      { id: 'RISK', label: language === 'cn' ? '风险' : 'Risk' },
      { id: 'SETUPS', label: language === 'cn' ? t.reports.filters.setups : 'Strategies' },
      { id: 'TAGS', label: language === 'cn' ? t.reports.filters.tags : 'Tags' },
      { id: 'WINS_LOSSES', label: language === 'cn' ? '盈亏结果' : 'Wins vs Losses' },
  ];

  const reportMenuOptions = [
      { id: 'DAYS', label: language === 'cn' ? '日期与时间' : 'Day & Time' },
      { id: 'SYMBOLS', label: language === 'cn' ? '交易品种' : 'Symbols' },
      { id: 'RISK', label: language === 'cn' ? '风险' : 'Risk' },
      { id: 'SETUPS', label: language === 'cn' ? '策略' : 'Strategies' },
      { id: 'TAGS', label: language === 'cn' ? '标签' : 'Tags' },
      { id: 'WINS_LOSSES', label: language === 'cn' ? '盈亏结果' : 'Wins vs Losses' },
  ];

  const activeReportMenuLabel = detailedFilter
      ? reportMenuOptions.find(option => option.id === detailedFilter)?.label ||
        detailedFilterOptions.find(option => option.id === detailedFilter)?.label ||
        detailedFilter
      : null;

  const REPORT_TABS = [
      { id: 'performance', label: language === 'cn' ? '表现' : 'Performance', isNew: true },
      { id: 'overview', label: language === 'cn' ? '概览' : 'Overview' },
      { id: 'detailed', label: activeReportMenuLabel ? (language === 'cn' ? `报告：${activeReportMenuLabel}` : `Reports: ${activeReportMenuLabel}`) : (language === 'cn' ? '报告' : 'Reports'), hasMenu: true },
      { id: 'compare', label: language === 'cn' ? '对比' : 'Compare' },
      { id: 'calendar', label: language === 'cn' ? '日历' : 'Calendar' },
      { id: 'ai', label: language === 'cn' ? '复盘洞察' : 'Recaps & Insights' },
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

  const dayTimeHighlights = useMemo(() => {
      const rowsWithTrades = dayTimeReportRows.filter(row => row.count > 0);
      const bestPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.netPnl > best.netPnl ? row : best, rowsWithTrades[0])
          : null;
      const leastPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((worst, row) => row.netPnl < worst.netPnl ? row : worst, rowsWithTrades[0])
          : null;
      const mostActive = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.count > best.count ? row : best, rowsWithTrades[0])
          : null;
      const bestWinRate = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.winRate > best.winRate || (row.winRate === best.winRate && row.count > best.count) ? row : best, rowsWithTrades[0])
          : null;

      return { bestPerforming, leastPerforming, mostActive, bestWinRate };
  }, [dayTimeReportRows]);

  const symbolHighlights = useMemo(() => {
      const rowsWithTrades = symbolReportRows.filter(row => row.count > 0);
      const bestPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.netPnl > best.netPnl ? row : best, rowsWithTrades[0])
          : null;
      const leastPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((worst, row) => row.netPnl < worst.netPnl ? row : worst, rowsWithTrades[0])
          : null;
      const mostActive = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.count > best.count ? row : best, rowsWithTrades[0])
          : null;
      const bestWinRate = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.winRate > best.winRate || (row.winRate === best.winRate && row.count > best.count) ? row : best, rowsWithTrades[0])
          : null;

      return { bestPerforming, leastPerforming, mostActive, bestWinRate };
  }, [symbolReportRows]);

  const strategyHighlights = useMemo(() => {
      const rowsWithTrades = strategyReportRows.filter(row => row.count > 0);
      const bestPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.netPnl > best.netPnl ? row : best, rowsWithTrades[0])
          : null;
      const leastPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((worst, row) => row.netPnl < worst.netPnl ? row : worst, rowsWithTrades[0])
          : null;
      const mostActive = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.count > best.count ? row : best, rowsWithTrades[0])
          : null;
      const bestWinRate = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.winRate > best.winRate || (row.winRate === best.winRate && row.count > best.count) ? row : best, rowsWithTrades[0])
          : null;

      return { bestPerforming, leastPerforming, mostActive, bestWinRate };
  }, [strategyReportRows]);

  const tagHighlights = useMemo(() => {
      const rowsWithTrades = tagReportRows.filter(row => row.count > 0);
      const bestPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.netPnl > best.netPnl ? row : best, rowsWithTrades[0])
          : null;
      const leastPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((worst, row) => row.netPnl < worst.netPnl ? row : worst, rowsWithTrades[0])
          : null;
      const mostActive = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.count > best.count ? row : best, rowsWithTrades[0])
          : null;
      const bestWinRate = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.winRate > best.winRate || (row.winRate === best.winRate && row.count > best.count) ? row : best, rowsWithTrades[0])
          : null;

      return { bestPerforming, leastPerforming, mostActive, bestWinRate };
  }, [tagReportRows]);

  const dayTimeSummaryColumns = [
      { id: 'label', label: dayTimeReportView === 'DAYS' ? (language === 'cn' ? '日期' : 'Days') : dayTimeReportView === 'MONTHS' ? (language === 'cn' ? '月份' : 'Months') : dayTimeReportView === 'TIME' ? (language === 'cn' ? '交易时间' : 'Trade time') : (language === 'cn' ? '持仓时长' : 'Trade duration') },
      { id: 'winRate', label: language === 'cn' ? '胜率' : 'Win %' },
      { id: 'netPnl', label: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L') },
      { id: 'count', label: language === 'cn' ? '交易次数' : 'Trade count' },
      { id: 'avgDailyVolume', label: language === 'cn' ? '平均成交额' : 'Avg daily volume' },
      { id: 'avgWin', label: language === 'cn' ? '平均盈利' : 'Avg win' },
      { id: 'avgLoss', label: language === 'cn' ? '平均亏损' : 'Avg loss' },
  ];

  const symbolSummaryColumns = [
      { id: 'label', label: symbolReportView === 'SYMBOLS' ? (language === 'cn' ? '交易品种' : 'Symbols') : symbolReportView === 'INSTRUMENTS' ? (language === 'cn' ? '标的' : 'Instruments') : (language === 'cn' ? '价格区间' : 'Prices') },
      { id: 'winRate', label: language === 'cn' ? '胜率' : 'Win %' },
      { id: 'netPnl', label: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L') },
      { id: 'count', label: language === 'cn' ? '交易次数' : 'Trade count' },
      { id: 'avgDailyVolume', label: language === 'cn' ? '平均成交额' : 'Avg daily volume' },
      { id: 'avgWin', label: language === 'cn' ? '平均盈利' : 'Avg win' },
      { id: 'avgLoss', label: language === 'cn' ? '平均亏损' : 'Avg loss' },
  ];

  const strategySummaryColumns = [
      { id: 'label', label: language === 'cn' ? '策略' : 'Strategy' },
      { id: 'winRate', label: language === 'cn' ? '胜率' : 'Win %' },
      { id: 'netPnl', label: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L') },
      { id: 'count', label: language === 'cn' ? '交易次数' : 'Trade count' },
      { id: 'avgDailyVolume', label: language === 'cn' ? '平均成交额' : 'Avg daily volume' },
      { id: 'avgWin', label: language === 'cn' ? '平均盈利' : 'Avg win' },
      { id: 'avgLoss', label: language === 'cn' ? '平均亏损' : 'Avg loss' },
  ];

  const tagSummaryColumns = [
      { id: 'label', label: language === 'cn' ? '标签' : 'Tags' },
      { id: 'winRate', label: language === 'cn' ? '胜率' : 'Win %' },
      { id: 'netPnl', label: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L') },
      { id: 'count', label: language === 'cn' ? '交易次数' : 'Trade count' },
      { id: 'avgDailyVolume', label: language === 'cn' ? '平均成交额' : 'Avg daily volume' },
      { id: 'avgWin', label: language === 'cn' ? '平均盈利' : 'Avg win' },
      { id: 'avgLoss', label: language === 'cn' ? '平均亏损' : 'Avg loss' },
  ];

  const symbolLimitOptions: Array<{ id: DayTimeSymbolLimit; label: string }> = [
      { id: 5, label: language === 'cn' ? '前 5 个项目' : 'Top 5' },
      { id: 10, label: language === 'cn' ? '前 10 个项目' : 'Top 10' },
      { id: 20, label: language === 'cn' ? '前 20 个项目' : 'Top 20' },
      { id: 'all', label: language === 'cn' ? '全部项目' : 'All' },
  ];
  const activeSymbolLimitLabel = symbolLimitOptions.find(option => option.id === dayTimeSymbolLimit)?.label || symbolLimitOptions[1].label;

  const symbolCrossColumns = useMemo(() => {
      return language === 'cn'
          ? ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
          : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  }, [language]);

  const visibleSymbolRows = useMemo(() => {
      return dayTimeSymbolLimit === 'all' ? symbolReportRows : symbolReportRows.slice(0, dayTimeSymbolLimit);
  }, [symbolReportRows, dayTimeSymbolLimit]);

  const strategyRowsWithTrades = useMemo(() => {
      return strategyReportRows.filter(row => row.count > 0);
  }, [strategyReportRows]);

  const visibleStrategyRows = useMemo(() => {
      return dayTimeSymbolLimit === 'all' ? strategyRowsWithTrades : strategyRowsWithTrades.slice(0, dayTimeSymbolLimit);
  }, [strategyRowsWithTrades, dayTimeSymbolLimit]);

  const tagRowsWithTrades = useMemo(() => {
      return tagReportRows.filter(row => row.count > 0);
  }, [tagReportRows]);

  const visibleTagRows = useMemo(() => {
      return dayTimeSymbolLimit === 'all' ? tagRowsWithTrades : tagRowsWithTrades.slice(0, dayTimeSymbolLimit);
  }, [tagRowsWithTrades, dayTimeSymbolLimit]);

  const closedTrades = useMemo(() => trades.filter(isClosedTrade), [trades]);
  const winningTradesDetail = useMemo(() => closedTrades.filter(trade => getDisplayPnl(trade) > 0), [closedTrades, pnlDisplayMode]);
  const losingTradesDetail = useMemo(() => closedTrades.filter(trade => getDisplayPnl(trade) < 0), [closedTrades, pnlDisplayMode]);
  const winningTradePnlsDetail = useMemo(() => winningTradesDetail.map(trade => getDisplayPnl(trade)), [winningTradesDetail, pnlDisplayMode]);
  const losingTradePnlsDetail = useMemo(() => losingTradesDetail.map(trade => getDisplayPnl(trade)), [losingTradesDetail, pnlDisplayMode]);

  const winsLossesSummary = useMemo(() => {
      const winsSummary = buildWinLossDetailSummary(winningTradesDetail);
      const lossesSummary = buildWinLossDetailSummary(losingTradesDetail);

      return {
          wins: {
              ...winsSummary,
              streakValue: getMaxConsecutiveCount(winningTradePnlsDetail, pnl => pnl > 0),
          },
          losses: {
              ...lossesSummary,
              streakValue: getMaxConsecutiveCount(losingTradePnlsDetail, pnl => pnl < 0),
          },
      };
  }, [winningTradesDetail, losingTradesDetail, winningTradePnlsDetail, losingTradePnlsDetail, language, pnlDisplayMode]);

  const getTradeCompareTags = (trade: Trade) => {
      const values = new Set<string>();
      (trade.mistakes || []).forEach(value => {
          const normalized = value.trim();
          if (normalized) values.add(normalized);
      });
      Object.values(trade.customTags || {}).forEach(categoryValues => {
          getSafeTagValues(categoryValues).forEach(value => {
              const normalized = value.trim();
              if (normalized) values.add(normalized);
          });
      });
      return values;
  };

  const compareFilteredTrades = useMemo(() => {
      const applyFilters = (filters: CompareGroupFilters) => {
          return trades.filter(trade => {
              if (filters.symbols.length > 0 && !filters.symbols.includes(getNormalizedSymbol(trade))) return false;

              if (filters.tags.length > 0) {
                  const tags = getTradeCompareTags(trade);
                  const hasMatch = filters.tags.some(tag => tags.has(tag));
                  if (!hasMatch) return false;
              }

              if (filters.side === 'long' && trade.direction !== Direction.LONG) return false;
              if (filters.side === 'short' && trade.direction !== Direction.SHORT) return false;

              const entryTime = new Date(trade.entryDate).getTime();
              if (filters.startDate) {
                  const startTime = new Date(`${filters.startDate}T00:00:00`).getTime();
                  if (Number.isFinite(startTime) && entryTime < startTime) return false;
              }
              if (filters.endDate) {
                  const endTime = new Date(`${filters.endDate}T23:59:59.999`).getTime();
                  if (Number.isFinite(endTime) && entryTime > endTime) return false;
              }

              if (filters.pnl !== 'all') {
                  if (!isClosedTrade(trade)) return false;
                  const pnl = getDisplayPnl(trade);
                  if (filters.pnl === 'win' && pnl <= 0) return false;
                  if (filters.pnl === 'loss' && pnl >= 0) return false;
              }

              return true;
          });
      };

      return {
          left: applyFilters(compareAppliedFilters.left),
          right: applyFilters(compareAppliedFilters.right),
      };
  }, [trades, compareAppliedFilters, pnlDisplayMode, language]);

  const buildCompareGroupSummary = (subsetTrades: Trade[]): CompareGroupSummary => {
      const baseSummary = buildWinLossDetailSummary(subsetTrades);
      const closedSubsetTrades = subsetTrades.filter(isClosedTrade);
      const chronologicalTradePnls = [...closedSubsetTrades]
          .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
          .map(getDisplayPnl);
      const winRate = closedSubsetTrades.length > 0
          ? (baseSummary.numberOfWinningTrades / closedSubsetTrades.length) * 100
          : 0;

      return {
          ...baseSummary,
          matchedTradeCount: subsetTrades.length,
          evaluatedTradeCount: closedSubsetTrades.length,
          maxConsecutiveWins: getMaxConsecutiveCount(chronologicalTradePnls, pnl => pnl > 0),
          maxConsecutiveLosses: getMaxConsecutiveCount(chronologicalTradePnls, pnl => pnl < 0),
          winRate,
      };
  };

  const compareSummaries = useMemo(() => ({
      left: buildCompareGroupSummary(compareFilteredTrades.left),
      right: buildCompareGroupSummary(compareFilteredTrades.right),
  }), [compareFilteredTrades, pnlDisplayMode, language]);

  const compareAnimationSignature = useMemo(() => {
      const serialize = (points: WinLossDetailChartPoint[]) => points.map(point => `${point.date}:${point.value}`).join('|');
      return [
          JSON.stringify(compareAppliedFilters.left),
          JSON.stringify(compareAppliedFilters.right),
          compareSummaries.left.matchedTradeCount,
          compareSummaries.right.matchedTradeCount,
          compareSummaries.left.totalPnl,
          compareSummaries.right.totalPnl,
          serialize(compareSummaries.left.chartData),
          serialize(compareSummaries.right.chartData),
      ].join('||');
  }, [compareAppliedFilters, compareSummaries]);
  const previousCompareAnimationSignatureRef = useRef<string | null>(null);
  const [shouldAnimateCompareCharts, setShouldAnimateCompareCharts] = useState(true);

  useEffect(() => {
      const hasChanged = previousCompareAnimationSignatureRef.current !== compareAnimationSignature;
      previousCompareAnimationSignatureRef.current = compareAnimationSignature;
      if (hasChanged) {
          setShouldAnimateCompareCharts(true);
      }
      const timer = window.setTimeout(() => setShouldAnimateCompareCharts(false), 760);
      return () => window.clearTimeout(timer);
  }, [compareAnimationSignature]);

  const winsLossesChartAnimationSignature = useMemo(() => {
      const serialize = (points: WinLossDetailChartPoint[]) => points.map(point => `${point.date}:${point.value}`).join('|');
      return [
          pnlDisplayMode,
          serialize(winsLossesSummary.wins.chartData),
          serialize(winsLossesSummary.losses.chartData),
          winsLossesSummary.wins.totalPnl,
          winsLossesSummary.losses.totalPnl,
          winsLossesSummary.wins.tradeCount,
          winsLossesSummary.losses.tradeCount,
      ].join('||');
  }, [winsLossesSummary, pnlDisplayMode]);

  useEffect(() => {
      const hasChartChanged = previousWinLossesChartAnimationSignatureRef.current !== winsLossesChartAnimationSignature;
      previousWinLossesChartAnimationSignatureRef.current = winsLossesChartAnimationSignature;

      if (hasChartChanged) {
          setShouldAnimateWinLossesCharts(true);
      }

      const timer = window.setTimeout(() => {
          setShouldAnimateWinLossesCharts(false);
      }, 760);

      return () => window.clearTimeout(timer);
  }, [winsLossesChartAnimationSignature]);

  const symbolCrossAnalysisRows = useMemo(() => {
      return visibleSymbolRows.map(row => {
          const cells = new Map<string, { count: number; pnl: number; wins: number }>();

          row.trades.forEach(trade => {
              const key = (() => {
                  const date = new Date(trade.entryDate);
                  if (Number.isNaN(date.getTime())) return '';
                  return symbolCrossColumns[date.getMonth()] || '';
              })();
              if (!key) return;

              const cell = cells.get(key) || { count: 0, pnl: 0, wins: 0 };
              const pnl = getDisplayPnl(trade);
              cell.count += 1;
              cell.pnl += pnl;
              if (pnl > 0) cell.wins += 1;
              cells.set(key, cell);
          });

          return { row, cells };
      });
  }, [visibleSymbolRows, symbolCrossColumns, pnlDisplayMode]);

  const strategyCrossSymbols = useMemo(() => {
      const totals = new Map<string, { symbol: string; count: number; pnl: number }>();
      trades.forEach(trade => {
          const symbol = getNormalizedSymbol(trade);
          const current = totals.get(symbol) || { symbol, count: 0, pnl: 0 };
          current.count += 1;
          current.pnl += getDisplayPnl(trade);
          totals.set(symbol, current);
      });
      const sortedSymbols = Array.from(totals.values())
          .sort((a, b) => b.count - a.count || Math.abs(b.pnl) - Math.abs(a.pnl))
          .map(item => item.symbol);
      return dayTimeSymbolLimit === 'all' ? sortedSymbols : sortedSymbols.slice(0, dayTimeSymbolLimit);
  }, [trades, pnlDisplayMode, dayTimeSymbolLimit, language]);

  const strategyCrossAnalysisRows = useMemo(() => {
      const symbolSet = new Set(strategyCrossSymbols);
      return visibleStrategyRows.map(row => {
          const cells = new Map<string, { count: number; pnl: number; wins: number }>();

          row.trades.forEach(trade => {
              const symbol = getNormalizedSymbol(trade);
              if (!symbolSet.has(symbol)) return;

              const cell = cells.get(symbol) || { count: 0, pnl: 0, wins: 0 };
              const pnl = getDisplayPnl(trade);
              cell.count += 1;
              cell.pnl += pnl;
              if (pnl > 0) cell.wins += 1;
              cells.set(symbol, cell);
          });

          return { row, cells };
      });
  }, [visibleStrategyRows, strategyCrossSymbols, pnlDisplayMode, language]);

  const tagCrossSymbols = useMemo(() => {
      const totals = new Map<string, { symbol: string; count: number; pnl: number }>();
      trades.forEach(trade => {
          const symbol = getNormalizedSymbol(trade);
          const current = totals.get(symbol) || { symbol, count: 0, pnl: 0 };
          current.count += 1;
          current.pnl += getDisplayPnl(trade);
          totals.set(symbol, current);
      });
      const sortedSymbols = Array.from(totals.values())
          .sort((a, b) => b.count - a.count || Math.abs(b.pnl) - Math.abs(a.pnl))
          .map(item => item.symbol);
      return dayTimeSymbolLimit === 'all' ? sortedSymbols : sortedSymbols.slice(0, dayTimeSymbolLimit);
  }, [trades, pnlDisplayMode, dayTimeSymbolLimit, language]);

  const tagCrossAnalysisRows = useMemo(() => {
      const symbolSet = new Set(tagCrossSymbols);
      return visibleTagRows.map(row => {
          const cells = new Map<string, { count: number; pnl: number; wins: number }>();

          row.trades.forEach(trade => {
              const symbol = getNormalizedSymbol(trade);
              if (!symbolSet.has(symbol)) return;

              const cell = cells.get(symbol) || { count: 0, pnl: 0, wins: 0 };
              const pnl = getDisplayPnl(trade);
              cell.count += 1;
              cell.pnl += pnl;
              if (pnl > 0) cell.wins += 1;
              cells.set(symbol, cell);
          });

          return { row, cells };
      });
  }, [visibleTagRows, tagCrossSymbols, pnlDisplayMode, language]);

  const riskHighlights = useMemo(() => {
      const rowsWithTrades = riskReportRows.filter(row => row.count > 0);
      const bestPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.netPnl > best.netPnl ? row : best, rowsWithTrades[0])
          : null;
      const leastPerforming = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((worst, row) => row.netPnl < worst.netPnl ? row : worst, rowsWithTrades[0])
          : null;
      const mostActive = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.count > best.count ? row : best, rowsWithTrades[0])
          : null;
      const bestWinRate = rowsWithTrades.length > 0
          ? rowsWithTrades.reduce((best, row) => row.winRate > best.winRate || (row.winRate === best.winRate && row.count > best.count) ? row : best, rowsWithTrades[0])
          : null;

      return { bestPerforming, leastPerforming, mostActive, bestWinRate };
  }, [riskReportRows]);

  const riskSummaryColumns = [
      { id: 'label', label: riskReportView === 'POSITION SIZES' ? (language === 'cn' ? '仓位大小' : 'Position sizes') : riskReportView === 'R_MULTIPLES' ? (language === 'cn' ? 'R 倍数' : 'R-multiples') : (language === 'cn' ? '成交量区间' : 'Volumes') },
      { id: 'winRate', label: language === 'cn' ? '胜率' : 'Win %' },
      { id: 'netPnl', label: pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'Net P&L') : (language === 'cn' ? '总盈亏' : 'Gross P&L') },
      { id: 'count', label: language === 'cn' ? '交易次数' : 'Trade count' },
      { id: 'avgDailyVolume', label: language === 'cn' ? '平均成交额' : 'Avg daily volume' },
      { id: 'avgWin', label: language === 'cn' ? '平均盈利' : 'Avg win' },
      { id: 'avgLoss', label: language === 'cn' ? '平均亏损' : 'Avg loss' },
  ];

  const riskCrossRows = useMemo(() => {
      return riskReportRows.filter(row => row.count > 0);
  }, [riskReportRows]);

  const riskCrossSymbols = useMemo(() => {
      const totals = new Map<string, { symbol: string; count: number; pnl: number }>();
      trades.forEach(trade => {
          const symbol = getNormalizedSymbol(trade);
          const current = totals.get(symbol) || { symbol, count: 0, pnl: 0 };
          current.count += 1;
          current.pnl += getDisplayPnl(trade);
          totals.set(symbol, current);
      });
      const sortedSymbols = Array.from(totals.values())
          .sort((a, b) => b.count - a.count || Math.abs(b.pnl) - Math.abs(a.pnl))
          .map(item => item.symbol);
      return dayTimeSymbolLimit === 'all' ? sortedSymbols : sortedSymbols.slice(0, dayTimeSymbolLimit);
  }, [trades, pnlDisplayMode, dayTimeSymbolLimit, language]);

  const riskCrossAnalysisRows = useMemo(() => {
      const symbolSet = new Set(riskCrossSymbols);
      return riskCrossRows.map(row => {
          const cells = new Map<string, { count: number; pnl: number; wins: number }>();

          row.trades.forEach(trade => {
              const symbol = getNormalizedSymbol(trade);
              if (!symbolSet.has(symbol)) return;

              const cell = cells.get(symbol) || { count: 0, pnl: 0, wins: 0 };
              const pnl = getDisplayPnl(trade);
              cell.count += 1;
              cell.pnl += pnl;
              if (pnl > 0) cell.wins += 1;
              cells.set(symbol, cell);
          });

          return { row, cells };
      });
  }, [riskCrossRows, riskCrossSymbols, pnlDisplayMode, language]);

  const topCrossSymbols = useMemo(() => {
      const totals = new Map<string, { symbol: string; count: number; pnl: number }>();
      trades.forEach(trade => {
          const symbol = (trade.symbol || '').trim().toUpperCase() || (language === 'cn' ? '未知' : 'UNKNOWN');
          const current = totals.get(symbol) || { symbol, count: 0, pnl: 0 };
          current.count += 1;
          current.pnl += getDisplayPnl(trade);
          totals.set(symbol, current);
      });
      const sortedSymbols = Array.from(totals.values())
          .sort((a, b) => b.count - a.count || Math.abs(b.pnl) - Math.abs(a.pnl))
          .map(item => item.symbol);
      return dayTimeSymbolLimit === 'all' ? sortedSymbols : sortedSymbols.slice(0, dayTimeSymbolLimit);
  }, [trades, language, pnlDisplayMode, dayTimeSymbolLimit]);

  const dayTimeSymbolLimitOptions: Array<{ id: DayTimeSymbolLimit; label: string }> = [
      { id: 5, label: language === 'cn' ? '前 5 个品种' : 'Top 5 symbols' },
      { id: 10, label: language === 'cn' ? '前 10 个品种' : 'Top 10 symbols' },
      { id: 20, label: language === 'cn' ? '前 20 个品种' : 'Top 20 symbols' },
      { id: 'all', label: language === 'cn' ? '全部品种' : 'All symbols' },
  ];
  const activeDayTimeSymbolLimitLabel = dayTimeSymbolLimitOptions.find(option => option.id === dayTimeSymbolLimit)?.label || dayTimeSymbolLimitOptions[1].label;

  const dayTimeCrossAnalysisRows = useMemo(() => {
      const symbolSet = new Set(topCrossSymbols);
      const rowMap = new Map<string, { row: DayTimeReportRow; cells: Map<string, { count: number; pnl: number; wins: number }> }>();
      dayTimeReportRows.forEach(row => rowMap.set(row.key, { row, cells: new Map() }));

      trades.forEach(trade => {
          const symbol = (trade.symbol || '').trim().toUpperCase() || (language === 'cn' ? '未知' : 'UNKNOWN');
          if (!symbolSet.has(symbol)) return;

          let rowKey = '';
          const entryDate = new Date(trade.entryDate);
          if (Number.isNaN(entryDate.getTime())) return;

          if (dayTimeReportView === 'DAYS') rowKey = String(entryDate.getDay());
          else if (dayTimeReportView === 'MONTHS') rowKey = String(entryDate.getMonth());
          else if (dayTimeReportView === 'TIME') rowKey = String(entryDate.getHours());
          else {
              if (!trade.exitDate || trade.status === TradeStatus.OPEN) return;
              const duration = new Date(trade.exitDate).getTime() - entryDate.getTime();
              if (!Number.isFinite(duration) || duration < 0) return;
              if (duration < 5 * 60 * 1000) rowKey = 'under-5m';
              else if (duration < 30 * 60 * 1000) rowKey = '5-30m';
              else if (duration < 60 * 60 * 1000) rowKey = '30-60m';
              else if (duration < 2 * 60 * 60 * 1000) rowKey = '1-2h';
              else if (duration < 4 * 60 * 60 * 1000) rowKey = '2-4h';
              else rowKey = '4h-plus';
          }

          const row = rowMap.get(rowKey);
          if (!row) return;
          const cell = row.cells.get(symbol) || { count: 0, pnl: 0, wins: 0 };
          const pnl = getDisplayPnl(trade);
          cell.count += 1;
          cell.pnl += pnl;
          if (pnl > 0) cell.wins += 1;
          row.cells.set(symbol, cell);
      });

      return Array.from(rowMap.values());
  }, [dayTimeReportRows, trades, language, pnlDisplayMode, dayTimeReportView, topCrossSymbols]);

  // --- CALENDAR RENDER HELPERS ---
  const renderMonthGrid = (monthIndex: number) => {
      const year = calendarYear;
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const firstDay = new Date(year, monthIndex, 1).getDay();
      const today = new Date();
      const days = [];

      for (let i = 0; i < firstDay; i++) {
          days.push(<div key={`empty-${monthIndex}-${i}`} className="h-[27px] rounded-[7px] bg-transparent" />);
      }

      for (let d = 1; d <= daysInMonth; d++) {
          const currentDate = new Date(year, monthIndex, d);
          const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayData = calendarData.dailyMap[dateKey];
          const isToday = isSameCalendarDay(currentDate, today);

          let cellClass = 'border border-transparent bg-[#f4f5f7] text-[#7d8793]';
          if (dayData) {
              if (dayData.pnl > 0) {
                  cellClass = 'border border-[#d6ecdf] bg-[#e8f6ee] text-[#2d3945]';
              } else if (dayData.pnl < 0) {
                  cellClass = 'border border-[#f5d8da] bg-[#fee8e8] text-[#2d3945]';
              } else {
                  cellClass = 'border border-[#e3e7ed] bg-[#eef2f5] text-[#66717e]';
              }
          }

          days.push(
              <div
                  key={`${monthIndex}-${d}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                      setCalendarMonthDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                      setReportCalendarSelectedDay(new Date(currentDate));
                  }}
                  onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setCalendarMonthDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                          setReportCalendarSelectedDay(new Date(currentDate));
                      }
                  }}
                  className={`group relative flex h-[27px] cursor-pointer items-center justify-center rounded-[7px] text-[11px] font-semibold transition-transform hover:scale-[1.03] ${cellClass}`}
              >
                  <span
                      className={`relative z-[1] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[3px] leading-none ${
                          isToday
                              ? 'border border-[#6d5cd5] bg-white text-[#4f3dc1] shadow-[0_1px_2px_rgba(109,92,213,0.18)]'
                              : ''
                      }`}
                  >
                      {d}
                  </span>
                  {dayData && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[#dfe4ec] bg-white px-[8px] py-[6px] text-[11px] shadow-[0_10px_24px_rgba(15,23,42,0.12)] group-hover:block">
                          <div className={`font-semibold tabular-nums ${dayData.pnl >= 0 ? 'text-[#3baa86]' : 'text-[#f15f63]'}`}>
                              {formatSignedMoney(dayData.pnl)}
                          </div>
                          <div className="mt-[2px] text-[#7b828c]">
                              {dayData.count} {language === 'cn' ? '笔交易' : 'trades'}
                          </div>
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
                            <ReportRangeIcon />
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
                            <ReportAccountIcon />
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
        <div className="relative z-30 -mx-4 md:-mx-8">
            <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#dfe5ec] bg-white/70 px-4 dark:border-slate-800 dark:bg-slate-900/60 md:px-8">
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
                                    className={`absolute left-[-2px] top-[calc(100%-6px)] z-50 w-[180px] origin-top-left overflow-hidden rounded-[10px] border border-[#dedfe4] bg-white py-[7px] shadow-[0_1px_2px_rgba(20,24,36,0.08),0_8px_18px_rgba(20,24,36,0.10)] transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
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
                <ReportTabMark type="guide" active={false} />
                {language === 'cn' ? '阅读指南' : 'Read guide'}
            </button>
            </div>
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
                        <OverviewInfoBadge />
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
                                {pnlDisplayMode === 'net'
                                    ? (language === 'cn' ? '每日净累计盈亏' : 'Daily net cumulative P&L')
                                    : (language === 'cn' ? '每日总累计盈亏' : 'Daily gross cumulative P&L')}
                            </h3>
                            <span className="text-[13px] font-bold uppercase text-[#7b828c]">{language === 'cn' ? '（全部日期）' : '(All dates)'}</span>
                        </div>
                        <OverviewInfoBadge />
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
                                {pnlDisplayMode === 'net'
                                    ? (language === 'cn' ? '每日净盈亏' : 'Net daily P&L')
                                    : (language === 'cn' ? '每日总盈亏' : 'Gross daily P&L')}
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
              {detailedFilter === 'DAYS' ? (
                  <div className="space-y-[14px]">
                      <div className="flex flex-col gap-[12px] xl:flex-row xl:items-center xl:justify-between">
                          <div className="inline-flex w-fit overflow-hidden rounded-[8px] border border-[#e0e4ea] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
                              {([
                                  { id: 'DAYS' as const, label: language === 'cn' ? '天' : 'Days' },
                                  { id: 'MONTHS' as const, label: language === 'cn' ? '月份' : 'Months' },
                                  { id: 'TIME' as const, label: language === 'cn' ? '交易时间' : 'Trade time' },
                                  { id: 'TRADE DURATION' as const, label: language === 'cn' ? '持仓时长' : 'Trade duration' },
                              ]).map(option => (
                                  <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => setDayTimeReportView(option.id)}
                                      className={`h-[38px] min-w-[78px] px-[18px] text-[13px] font-semibold transition-colors ${
                                          dayTimeReportView === option.id
                                              ? 'bg-[#e8e4f4] text-[#5f47c9]'
                                              : 'text-[#4d5560] hover:bg-[#f5f6f8] dark:text-slate-300 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                      {option.label}
                                  </button>
                              ))}
                          </div>

                          <div className="relative" data-pnl-display-menu>
                              <button
                                  type="button"
                                  onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                                  className="inline-flex h-[36px] min-w-[112px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                  <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                                  <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <div
                                  className={`absolute right-0 top-full z-[80] mt-[6px] w-[128px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                      isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                  }`}
                              >
                                  {([
                                      { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                                      { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                                  ]).map(option => (
                                      <button
                                          key={option.id}
                                          type="button"
                                          onClick={() => {
                                              setPnlDisplayMode(option.id);
                                              setIsPnlDisplayMenuOpen(false);
                                          }}
                                          className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                              pnlDisplayMode === option.id
                                                  ? 'bg-[#e8e4f4] text-[#303044]'
                                                  : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                          }`}
                                      >
                                          {option.label}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-4">
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳表现' : 'Best performing'}
                              title={dayTimeHighlights.bestPerforming?.label || '--'}
                              detail={`${dayTimeHighlights.bestPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={dayTimeHighlights.bestPerforming ? formatSignedMoney(dayTimeHighlights.bestPerforming.netPnl) : undefined}
                              tone="good"
                              iconType="best"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={40}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最差表现' : 'Least performing'}
                              title={dayTimeHighlights.leastPerforming?.label || '--'}
                              detail={`${dayTimeHighlights.leastPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={dayTimeHighlights.leastPerforming ? formatSignedMoney(dayTimeHighlights.leastPerforming.netPnl) : undefined}
                              tone="bad"
                              iconType="worst"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={100}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最活跃' : 'Most active'}
                              title={dayTimeHighlights.mostActive?.label || '--'}
                              detail={`${dayTimeHighlights.mostActive?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              tone="accent"
                              iconType="active"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={160}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最高胜率' : 'Best win rate'}
                              title={dayTimeHighlights.bestWinRate?.label || '--'}
                              detail={dayTimeHighlights.bestWinRate ? `${dayTimeHighlights.bestWinRate.winRate.toFixed(0)}% / ${dayTimeHighlights.bestWinRate.count} ${language === 'cn' ? '笔交易' : 'trades'}` : '--'}
                              tone="neutral"
                              iconType="winRate"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={220}
                          />
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="left">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="left"
                                              metrics={getDayTimeRenderMetrics('left').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="left" slot="primary" metricId={dayTimeLeftPrimaryMetric} />
                                      {dayTimeLeftSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="secondary"
                                              metricId={dayTimeLeftSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeLeftSecondaryMetric(dayTimeLeftTertiaryMetric);
                                                  setDayTimeLeftTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeLeftTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="tertiary"
                                              metricId={dayTimeLeftTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeLeftTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="left" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'day-time-left',
                                      metrics: getDayTimeRenderMetrics('left'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 140,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>

                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="right">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="right"
                                              metrics={getDayTimeRenderMetrics('right').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="right" slot="primary" metricId={dayTimeRightPrimaryMetric} />
                                      {dayTimeRightSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="secondary"
                                              metricId={dayTimeRightSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeRightSecondaryMetric(dayTimeRightTertiaryMetric);
                                                  setDayTimeRightTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeRightTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="tertiary"
                                              metricId={dayTimeRightTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeRightTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="right" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'day-time-right',
                                      metrics: getDayTimeRenderMetrics('right'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 220,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>
                      </div>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex h-[52px] items-center justify-between border-b border-[#e0e4ea] px-[18px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '汇总' : 'Summary'}</h3>
                              <button className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] hover:bg-[#f5f6f8]" type="button" aria-label="Summary settings">
                                  <Settings className="h-[15px] w-[15px]" />
                              </button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-left text-[13px]">
                                  <thead className="bg-[#f4f2fa] text-[12px] font-semibold text-[#7b828c]">
                                      <tr>
                                          {dayTimeSummaryColumns.map(column => (
                                              <th key={column.id} className={`border-b border-[#e1e5ec] px-[18px] py-[12px] ${column.id === 'label' ? 'text-left' : 'text-right'}`}>{column.label}</th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {dayTimeReportRows.map(row => (
                                          <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0 hover:bg-[#fafbfc]">
                                              <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.winRate.toFixed(row.winRate % 1 === 0 ? 0 : 2)}%</td>
                                              <td className={`px-[18px] py-[12px] text-right font-semibold tabular-nums ${row.netPnl < 0 ? 'text-[#ff6468]' : row.netPnl > 0 ? 'text-[#3baa86]' : 'text-[#4d5560]'}`}>{formatSignedMoney(row.netPnl)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.count}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.avgDailyVolume.toFixed(2)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#3baa86] tabular-nums">{formatSignedMoney(row.avgWin)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#ff6468] tabular-nums">{formatSignedMoney(row.avgLoss)}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-[10px] border-b border-[#e0e4ea] px-[18px] py-[10px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '交叉分析' : 'Cross analysis'}</h3>
                              <div className="flex flex-wrap items-center gap-[8px]">
                                  <div className="relative" data-day-time-symbol-limit-menu>
                                      <button
                                          type="button"
                                          onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                          className="inline-flex h-[32px] min-w-[132px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                      >
                                          <span>{activeDayTimeSymbolLimitLabel}</span>
                                          <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div
                                          className={`absolute right-0 top-full z-[80] mt-[6px] w-[156px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                              isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                          }`}
                                      >
                                          {dayTimeSymbolLimitOptions.map(option => (
                                              <button
                                                  key={String(option.id)}
                                                  type="button"
                                                  onClick={() => {
                                                      setDayTimeSymbolLimit(option.id);
                                                      setIsDayTimeSymbolLimitOpen(false);
                                                  }}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                      dayTimeSymbolLimit === option.id
                                                          ? 'bg-[#e8e4f4] text-[#303044]'
                                                          : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                  }`}
                                              >
                                                  {option.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="inline-flex overflow-hidden rounded-[7px] border border-[#dfe4ec] bg-white text-[13px] font-semibold">
                                      {([
                                          { id: 'winRate' as const, label: language === 'cn' ? '胜率' : 'Win rate' },
                                          { id: 'pnl' as const, label: 'P&L' },
                                          { id: 'trades' as const, label: language === 'cn' ? '交易' : 'Trades' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => setDayTimeCrossMetric(option.id)}
                                              className={`h-[32px] px-[15px] transition-colors ${dayTimeCrossMetric === option.id ? 'bg-[#e8e4f4] text-[#5f47c9]' : 'text-[#4d5560] hover:bg-[#f5f6f8]'}`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              {topCrossSymbols.length === 0 ? (
                                  <div className="flex min-h-[156px] items-center justify-center text-[14px] font-semibold text-[#7b828c]">
                                      {language === 'cn' ? '暂无可用于交叉分析的交易品种' : 'No symbols available for cross analysis'}
                                  </div>
                              ) : (
                                  <table className="w-full min-w-[1120px] text-left text-[13px]">
                                      <thead className="bg-[#f4f2fa] text-[12px] font-semibold uppercase text-[#7b828c]">
                                          <tr>
                                              <th className="w-[170px] border-b border-[#e1e5ec] px-[18px] py-[12px]"></th>
                                              {topCrossSymbols.map(symbol => (
                                                  <th key={symbol} className="border-b border-l border-[#e1e5ec] px-[18px] py-[12px] text-right">{symbol}</th>
                                              ))}
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {dayTimeCrossAnalysisRows.map(({ row, cells }) => (
                                              <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0">
                                                  <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                                  {topCrossSymbols.map(symbol => {
                                                      const cell = cells.get(symbol);
                                                      const value = dayTimeCrossMetric === 'pnl'
                                                          ? (cell?.pnl || 0)
                                                          : dayTimeCrossMetric === 'trades'
                                                              ? (cell?.count || 0)
                                                              : cell && cell.count > 0 ? (cell.wins / cell.count) * 100 : 0;
                                                      const tone = dayTimeCrossMetric === 'pnl' ? value : 0;
                                                      return (
                                                          <td
                                                              key={`${row.key}-${symbol}`}
                                                              className={`border-l border-[#eceff3] px-[18px] py-[12px] text-right font-semibold tabular-nums ${
                                                                  tone > 0 ? 'bg-[#eaf7f2] text-[#4d5560]' : tone < 0 ? 'bg-[#fdebec] text-[#4d5560]' : 'text-[#4d5560]'
                                                              }`}
                                                          >
                                                              {dayTimeCrossMetric === 'pnl'
                                                                  ? formatSignedMoney(value)
                                                                  : dayTimeCrossMetric === 'trades'
                                                                      ? value
                                                                      : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`}
                                                          </td>
                                                      );
                                                  })}
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                      </section>
                  </div>
              ) : detailedFilter === 'SYMBOLS' ? (
                  <div className="space-y-[14px]">
                      <div className="flex flex-col gap-[12px] xl:flex-row xl:items-center xl:justify-between">
                          <div className="inline-flex w-fit overflow-hidden rounded-[8px] border border-[#e0e4ea] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
                              {([
                                  { id: 'SYMBOLS' as const, label: language === 'cn' ? '交易品种' : 'Symbols' },
                                  { id: 'INSTRUMENTS' as const, label: language === 'cn' ? '标的' : 'Instruments' },
                                  { id: 'PRICES' as const, label: language === 'cn' ? '价格' : 'Prices' },
                              ]).map(option => (
                                  <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => setSymbolReportView(option.id)}
                                      className={`h-[38px] min-w-[92px] px-[18px] text-[13px] font-semibold transition-colors ${
                                          symbolReportView === option.id
                                              ? 'bg-[#e8e4f4] text-[#5f47c9]'
                                              : 'text-[#4d5560] hover:bg-[#f5f6f8] dark:text-slate-300 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                      {option.label}
                                  </button>
                              ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-[8px]">
                              <div className="relative" data-day-time-symbol-limit-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[110px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{activeSymbolLimitLabel}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute right-0 top-full z-[80] mt-[6px] w-[140px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {symbolLimitOptions.map(option => (
                                          <button
                                              key={String(option.id)}
                                              type="button"
                                              onClick={() => {
                                                  setDayTimeSymbolLimit(option.id);
                                                  setIsDayTimeSymbolLimitOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  dayTimeSymbolLimit === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="relative" data-pnl-display-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[112px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute right-0 top-full z-[80] mt-[6px] w-[128px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {([
                                          { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                                          { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => {
                                                  setPnlDisplayMode(option.id);
                                                  setIsPnlDisplayMenuOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  pnlDisplayMode === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-4">
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳表现品种' : 'Best performing symbol'}
                              title={symbolHighlights.bestPerforming?.label || '--'}
                              detail={`${symbolHighlights.bestPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={symbolHighlights.bestPerforming ? formatSignedMoney(symbolHighlights.bestPerforming.netPnl) : undefined}
                              tone="good"
                              iconType="best"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={40}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最差表现品种' : 'Least performing symbol'}
                              title={symbolHighlights.leastPerforming?.label || '--'}
                              detail={`${symbolHighlights.leastPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={symbolHighlights.leastPerforming ? formatSignedMoney(symbolHighlights.leastPerforming.netPnl) : undefined}
                              tone="bad"
                              iconType="worst"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={100}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最活跃品种' : 'Most active symbol'}
                              title={symbolHighlights.mostActive?.label || '--'}
                              detail={`${symbolHighlights.mostActive?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              tone="accent"
                              iconType="active"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={160}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳胜率' : 'Best win rate'}
                              title={symbolHighlights.bestWinRate?.label || '--'}
                              detail={symbolHighlights.bestWinRate ? `${symbolHighlights.bestWinRate.winRate.toFixed(0)}% / ${symbolHighlights.bestWinRate.count} ${language === 'cn' ? '笔交易' : 'trades'}` : '--'}
                              tone="neutral"
                              iconType="winRate"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={220}
                          />
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="left">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="left"
                                              metrics={getDayTimeRenderMetrics('left').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="left" slot="primary" metricId={dayTimeLeftPrimaryMetric} />
                                      {dayTimeLeftSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="secondary"
                                              metricId={dayTimeLeftSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeLeftSecondaryMetric(dayTimeLeftTertiaryMetric);
                                                  setDayTimeLeftTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeLeftTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="tertiary"
                                              metricId={dayTimeLeftTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeLeftTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="left" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'symbols-left',
                                      rows: visibleSymbolRows,
                                      metrics: getDayTimeRenderMetrics('left'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 140,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>

                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="right">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="right"
                                              metrics={getDayTimeRenderMetrics('right').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="right" slot="primary" metricId={dayTimeRightPrimaryMetric} />
                                      {dayTimeRightSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="secondary"
                                              metricId={dayTimeRightSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeRightSecondaryMetric(dayTimeRightTertiaryMetric);
                                                  setDayTimeRightTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeRightTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="tertiary"
                                              metricId={dayTimeRightTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeRightTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="right" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'symbols-right',
                                      rows: visibleSymbolRows,
                                      metrics: getDayTimeRenderMetrics('right'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 220,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>
                      </div>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex h-[52px] items-center justify-between border-b border-[#e0e4ea] px-[18px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '汇总' : 'Summary'}</h3>
                              <button className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] hover:bg-[#f5f6f8]" type="button" aria-label="Summary settings">
                                  <Settings className="h-[15px] w-[15px]" />
                              </button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-left text-[13px]">
                                  <thead className="bg-[#f4f2fa] text-[12px] font-semibold text-[#7b828c]">
                                      <tr>
                                          {symbolSummaryColumns.map(column => (
                                              <th key={column.id} className={`border-b border-[#e1e5ec] px-[18px] py-[12px] ${column.id === 'label' ? 'text-left' : 'text-right'}`}>{column.label}</th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {visibleSymbolRows.map(row => (
                                          <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0 hover:bg-[#fafbfc]">
                                              <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.winRate.toFixed(row.winRate % 1 === 0 ? 0 : 2)}%</td>
                                              <td className={`px-[18px] py-[12px] text-right font-semibold tabular-nums ${row.netPnl < 0 ? 'text-[#ff6468]' : row.netPnl > 0 ? 'text-[#3baa86]' : 'text-[#4d5560]'}`}>{formatSignedMoney(row.netPnl)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.count}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.avgDailyVolume.toFixed(2)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#3baa86] tabular-nums">{formatSignedMoney(row.avgWin)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#ff6468] tabular-nums">{formatSignedMoney(row.avgLoss)}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-[10px] border-b border-[#e0e4ea] px-[18px] py-[10px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '交叉分析' : 'Cross analysis'}</h3>
                              <div className="flex flex-wrap items-center gap-[8px]">
                                  <div className="inline-flex h-[32px] items-center rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844]">
                                      {language === 'cn' ? '月份' : 'Month'}
                                  </div>
                                  <div className="inline-flex overflow-hidden rounded-[7px] border border-[#dfe4ec] bg-white text-[13px] font-semibold">
                                      {([
                                          { id: 'winRate' as const, label: language === 'cn' ? '胜率' : 'Win rate' },
                                          { id: 'pnl' as const, label: 'P&L' },
                                          { id: 'trades' as const, label: language === 'cn' ? '交易' : 'Trades' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => setDayTimeCrossMetric(option.id)}
                                              className={`h-[32px] px-[15px] transition-colors ${dayTimeCrossMetric === option.id ? 'bg-[#e8e4f4] text-[#5f47c9]' : 'text-[#4d5560] hover:bg-[#f5f6f8]'}`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              {visibleSymbolRows.length === 0 ? (
                                  <div className="flex min-h-[156px] items-center justify-center text-[14px] font-semibold text-[#7b828c]">
                                      {language === 'cn' ? '暂无可用于交叉分析的交易数据' : 'No rows available for cross analysis'}
                                  </div>
                              ) : (
                                  <table className="w-full min-w-[1120px] text-left text-[13px]">
                                      <thead className="bg-[#f4f2fa] text-[12px] font-semibold uppercase text-[#7b828c]">
                                          <tr>
                                              <th className="w-[170px] border-b border-[#e1e5ec] px-[18px] py-[12px]"></th>
                                              {symbolCrossColumns.map(column => (
                                                  <th key={column} className="border-b border-l border-[#e1e5ec] px-[18px] py-[12px] text-right">{column}</th>
                                              ))}
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {symbolCrossAnalysisRows.map(({ row, cells }) => (
                                              <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0">
                                                  <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                                  {symbolCrossColumns.map(column => {
                                                      const cell = cells.get(column);
                                                      const value = dayTimeCrossMetric === 'pnl'
                                                          ? (cell?.pnl || 0)
                                                          : dayTimeCrossMetric === 'trades'
                                                              ? (cell?.count || 0)
                                                              : cell && cell.count > 0 ? (cell.wins / cell.count) * 100 : 0;
                                                      const tone = dayTimeCrossMetric === 'pnl' ? value : 0;
                                                      return (
                                                          <td
                                                              key={`${row.key}-${column}`}
                                                              className={`border-l border-[#eceff3] px-[18px] py-[12px] text-right font-semibold tabular-nums ${
                                                                  tone > 0 ? 'bg-[#eaf7f2] text-[#4d5560]' : tone < 0 ? 'bg-[#fdebec] text-[#4d5560]' : 'text-[#4d5560]'
                                                              }`}
                                                          >
                                                              {dayTimeCrossMetric === 'pnl'
                                                                  ? formatSignedMoney(value)
                                                                  : dayTimeCrossMetric === 'trades'
                                                                      ? value
                                                                      : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`}
                                                          </td>
                                                      );
                                                  })}
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                      </section>
                  </div>
              ) : detailedFilter === 'WINS_LOSSES' ? (
                  <div className="space-y-[14px]">
                      <div className="flex flex-col gap-[10px] lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-[12px]">
                              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#7b828c]">
                                  {language === 'cn' ? '盈亏显示' : 'P&L Showing'}
                              </span>
                              <div className="relative" data-pnl-display-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[116px] items-center justify-between gap-[10px] rounded-[8px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute left-0 top-full z-[80] mt-[6px] w-[132px] origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {([
                                          { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                                          { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => {
                                                  setPnlDisplayMode(option.id);
                                                  setIsPnlDisplayMenuOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  pnlDisplayMode === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                          {([
                              {
                                  key: 'wins',
                                  header: language === 'cn' ? '盈利交易' : 'WINS',
                                  matchedLabel: language === 'cn' ? '笔交易匹配' : 'Trades Matched',
                              },
                              {
                                  key: 'losses',
                                  header: language === 'cn' ? '亏损交易' : 'LOSSES',
                                  matchedLabel: language === 'cn' ? '笔交易匹配' : 'Trades Matched',
                              },
                          ] as const).map(section => {
                              const summary = section.key === 'wins' ? winsLossesSummary.wins : winsLossesSummary.losses;
                              return (
                                  <div key={section.key} className="rounded-[8px] bg-white px-[22px] py-[15px] shadow-none dark:bg-slate-900">
                                      <div className="text-[15px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">
                                          {section.header} ({summary.tradeCount} {section.matchedLabel})
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                          {([
                              {
                                  key: 'wins',
                                  heading: language === 'cn' ? '统计（盈利）' : 'STATISTICS (WINS)',
                                  subtitle: language === 'cn' ? '（全部日期）' : '(ALL DATES)',
                                  positiveOnly: true,
                              },
                              {
                                  key: 'losses',
                                  heading: language === 'cn' ? '统计（亏损）' : 'STATISTICS (LOSSES)',
                                  subtitle: language === 'cn' ? '（全部日期）' : '(ALL DATES)',
                                  positiveOnly: false,
                              },
                          ] as const).map(section => {
                              const summary = section.key === 'wins' ? winsLossesSummary.wins : winsLossesSummary.losses;
                              const streakLabel = section.positiveOnly
                                  ? (language === 'cn' ? '最大连续盈利' : 'Max consecutive wins')
                                  : (language === 'cn' ? '最大连续亏损' : 'Max consecutive losses');
                              const rows = [
                                  [language === 'cn' ? '总盈亏' : 'Total P&L', formatSignedMoney(summary.totalPnl)],
                                  [language === 'cn' ? '平均每日成交额' : 'Average daily volume', summary.avgDailyVolume.toFixed(2)],
                                  [language === 'cn' ? '平均盈利交易' : 'Average winning trade', summary.avgWinningTrade === null ? 'N/A' : formatSignedMoney(summary.avgWinningTrade)],
                                  [language === 'cn' ? '平均亏损交易' : 'Average losing trade', summary.avgLosingTrade === null ? 'N/A' : formatSignedMoney(summary.avgLosingTrade)],
                                  [language === 'cn' ? '盈利交易数量' : 'Number of winning trades', summary.numberOfWinningTrades],
                                  [language === 'cn' ? '亏损交易数量' : 'Number of losing trades', summary.numberOfLosingTrades],
                                  [language === 'cn' ? '总佣金' : 'Total commissions', formatSignedMoney(summary.totalCommissions)],
                                  [streakLabel, summary.streakValue],
                              ];

                              return (
                                  <section key={section.key} className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                                      <div className="border-b border-[#eceff3] px-[24px] py-[15px]">
                                          <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">{section.heading}</h3>
                                          <div className="mt-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a919d]">{section.subtitle}</div>
                                      </div>
                                      <div>
                                          {rows.map(([label, value], index) => (
                                              <div
                                                  key={`${section.key}-${label}`}
                                                  className={`flex items-center justify-between gap-[18px] px-[24px] py-[11px] text-[13px] ${
                                                      index < rows.length - 1 ? 'border-b border-[#eceff3]' : ''
                                                  }`}
                                              >
                                                  <span className="font-semibold text-[#6b7280]">{label}</span>
                                                  <span className="font-semibold tabular-nums text-[#4d5560]">{value}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </section>
                              );
                          })}
                      </div>

                      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                          <section className="relative overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="flex items-center justify-between border-b border-[#eceff3] px-[24px] py-[15px]">
                                  <div className="flex items-center gap-[10px]">
                                      <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">
                                          {pnlDisplayMode === 'net'
                                              ? (language === 'cn' ? '每日净累计盈亏（盈利）' : 'DAILY NET CUMULATIVE P&L (WINS)')
                                              : (language === 'cn' ? '每日总累计盈亏（盈利）' : 'DAILY GROSS CUMULATIVE P&L (WINS)')}
                                      </h3>
                                      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a919d]">
                                          {language === 'cn' ? '（全部日期）' : '(ALL DATES)'}
                                      </span>
                                  </div>
                                  <OverviewInfoBadge />
                              </div>
                              <div className="h-[392px] px-[12px] pb-[12px] pt-[8px]">
                                  {winsLossesSummary.wins.chartData.length === 0 ? (
                                      <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[#e4e7ec] bg-[#fafbfc] text-[14px] font-semibold text-[#8a919d]">
                                          {language === 'cn' ? '暂无盈利交易数据' : 'No winning trade data'}
                                      </div>
                                  ) : renderWinLossDetailedChart({
                                      chartId: 'wins-losses-wins',
                                      data: winsLossesSummary.wins.chartData,
                                      color: '#5d53d8',
                                      gradientStops: { start: '#6bd1a4', end: '#eef8f4' },
                                      title: pnlDisplayMode === 'net'
                                          ? (language === 'cn' ? '净盈亏 - 累计' : 'Net P&L - cumulative')
                                          : (language === 'cn' ? '总盈亏 - 累计' : 'Gross P&L - cumulative'),
                                      animate: shouldAnimateWinLossesCharts,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>

                          <section className="relative overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="flex items-center justify-between border-b border-[#eceff3] px-[24px] py-[15px]">
                                  <div className="flex items-center gap-[10px]">
                                      <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">
                                          {pnlDisplayMode === 'net'
                                              ? (language === 'cn' ? '每日净累计盈亏（亏损）' : 'DAILY NET CUMULATIVE P&L (LOSSES)')
                                              : (language === 'cn' ? '每日总累计盈亏（亏损）' : 'DAILY GROSS CUMULATIVE P&L (LOSSES)')}
                                      </h3>
                                      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a919d]">
                                          {language === 'cn' ? '（全部日期）' : '(ALL DATES)'}
                                      </span>
                                  </div>
                                  <OverviewInfoBadge />
                              </div>
                              <div className="h-[392px] px-[12px] pb-[12px] pt-[8px]">
                                  {winsLossesSummary.losses.chartData.length === 0 ? (
                                      <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[#e4e7ec] bg-[#fafbfc] text-[14px] font-semibold text-[#8a919d]">
                                          {language === 'cn' ? '暂无亏损交易数据' : 'No losing trade data'}
                                      </div>
                                  ) : renderWinLossDetailedChart({
                                      chartId: 'wins-losses-losses',
                                      data: winsLossesSummary.losses.chartData,
                                      color: '#5d53d8',
                                      gradientStops: { start: '#ff7b86', end: '#fff0f1' },
                                      title: pnlDisplayMode === 'net'
                                          ? (language === 'cn' ? '净盈亏 - 累计' : 'Net P&L - cumulative')
                                          : (language === 'cn' ? '总盈亏 - 累计' : 'Gross P&L - cumulative'),
                                      animate: shouldAnimateWinLossesCharts,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>
                      </div>
                  </div>
              ) : detailedFilter === 'TAGS' ? (
                  <div className="space-y-[14px]">
                      <div className="flex flex-col gap-[12px] xl:flex-row xl:items-center xl:justify-between">
                          <div className="inline-flex w-fit flex-wrap overflow-hidden rounded-[8px] border border-[#e0e4ea] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
                              {availableTagReportCategories.map(category => (
                                  <button
                                      key={category.id}
                                      type="button"
                                      onClick={() => setTagReportCategoryId(category.id)}
                                      className={`h-[38px] min-w-[92px] px-[18px] text-[13px] font-semibold transition-colors ${
                                          activeTagReportCategory?.id === category.id
                                              ? 'bg-[#e8e4f4] text-[#5f47c9]'
                                              : 'text-[#4d5560] hover:bg-[#f5f6f8] dark:text-slate-300 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                      {category.label}
                                  </button>
                              ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-[8px]">
                              <div className="relative" data-day-time-symbol-limit-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[110px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{activeSymbolLimitLabel}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute right-0 top-full z-[80] mt-[6px] w-[140px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {symbolLimitOptions.map(option => (
                                          <button
                                              key={String(option.id)}
                                              type="button"
                                              onClick={() => {
                                                  setDayTimeSymbolLimit(option.id);
                                                  setIsDayTimeSymbolLimitOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  dayTimeSymbolLimit === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="relative" data-pnl-display-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[112px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute right-0 top-full z-[80] mt-[6px] w-[128px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {([
                                          { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                                          { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => {
                                                  setPnlDisplayMode(option.id);
                                                  setIsPnlDisplayMenuOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  pnlDisplayMode === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-4">
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳表现标签' : 'Best performing tag'}
                              title={tagHighlights.bestPerforming?.label || '--'}
                              detail={`${tagHighlights.bestPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={tagHighlights.bestPerforming ? formatSignedMoney(tagHighlights.bestPerforming.netPnl) : undefined}
                              tone="good"
                              iconType="best"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={40}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最差表现标签' : 'Least performing tag'}
                              title={tagHighlights.leastPerforming?.label || '--'}
                              detail={`${tagHighlights.leastPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={tagHighlights.leastPerforming ? formatSignedMoney(tagHighlights.leastPerforming.netPnl) : undefined}
                              tone="bad"
                              iconType="worst"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={100}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最活跃标签' : 'Most active tag'}
                              title={tagHighlights.mostActive?.label || '--'}
                              detail={`${tagHighlights.mostActive?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              tone="accent"
                              iconType="active"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={160}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳胜率' : 'Best win rate'}
                              title={tagHighlights.bestWinRate?.label || '--'}
                              detail={tagHighlights.bestWinRate ? `${tagHighlights.bestWinRate.winRate.toFixed(0)}% / ${tagHighlights.bestWinRate.count} ${language === 'cn' ? '笔交易' : 'trades'}` : '--'}
                              tone="neutral"
                              iconType="winRate"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={220}
                          />
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="left">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="left"
                                              metrics={getDayTimeRenderMetrics('left').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="left" slot="primary" metricId={dayTimeLeftPrimaryMetric} />
                                      {dayTimeLeftSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="secondary"
                                              metricId={dayTimeLeftSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeLeftSecondaryMetric(dayTimeLeftTertiaryMetric);
                                                  setDayTimeLeftTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeLeftTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="tertiary"
                                              metricId={dayTimeLeftTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeLeftTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="left" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'tags-left',
                                      rows: visibleTagRows,
                                      metrics: getDayTimeRenderMetrics('left'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 140,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>

                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="right">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="right"
                                              metrics={getDayTimeRenderMetrics('right').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="right" slot="primary" metricId={dayTimeRightPrimaryMetric} />
                                      {dayTimeRightSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="secondary"
                                              metricId={dayTimeRightSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeRightSecondaryMetric(dayTimeRightTertiaryMetric);
                                                  setDayTimeRightTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeRightTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="tertiary"
                                              metricId={dayTimeRightTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeRightTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="right" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'tags-right',
                                      rows: visibleTagRows,
                                      metrics: getDayTimeRenderMetrics('right'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 220,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>
                      </div>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex h-[52px] items-center justify-between border-b border-[#e0e4ea] px-[18px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '汇总' : 'Summary'}</h3>
                              <button className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] hover:bg-[#f5f6f8]" type="button" aria-label="Summary settings">
                                  <Settings className="h-[15px] w-[15px]" />
                              </button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-left text-[13px]">
                                  <thead className="bg-[#f4f2fa] text-[12px] font-semibold text-[#7b828c]">
                                      <tr>
                                          {tagSummaryColumns.map(column => (
                                              <th key={column.id} className={`border-b border-[#e1e5ec] px-[18px] py-[12px] ${column.id === 'label' ? 'text-left' : 'text-right'}`}>{column.label}</th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {visibleTagRows.map(row => (
                                          <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0 hover:bg-[#fafbfc]">
                                              <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.winRate.toFixed(row.winRate % 1 === 0 ? 0 : 2)}%</td>
                                              <td className={`px-[18px] py-[12px] text-right font-semibold tabular-nums ${row.netPnl < 0 ? 'text-[#ff6468]' : row.netPnl > 0 ? 'text-[#3baa86]' : 'text-[#4d5560]'}`}>{formatSignedMoney(row.netPnl)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.count}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.avgDailyVolume.toFixed(2)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#3baa86] tabular-nums">{formatSignedMoney(row.avgWin)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#ff6468] tabular-nums">{formatSignedMoney(row.avgLoss)}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-[10px] border-b border-[#e0e4ea] px-[18px] py-[10px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '交叉分析' : 'Cross analysis'}</h3>
                              <div className="flex flex-wrap items-center gap-[8px]">
                                  <div className="relative" data-day-time-symbol-limit-menu>
                                      <button
                                          type="button"
                                          onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                          className="inline-flex h-[32px] min-w-[132px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                      >
                                          <span>{activeSymbolLimitLabel}</span>
                                          <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div
                                          className={`absolute right-0 top-full z-[80] mt-[6px] w-[156px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                              isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                          }`}
                                      >
                                          {symbolLimitOptions.map(option => (
                                              <button
                                                  key={String(option.id)}
                                                  type="button"
                                                  onClick={() => {
                                                      setDayTimeSymbolLimit(option.id);
                                                      setIsDayTimeSymbolLimitOpen(false);
                                                  }}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                      dayTimeSymbolLimit === option.id
                                                          ? 'bg-[#e8e4f4] text-[#303044]'
                                                          : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                  }`}
                                              >
                                                  {option.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="inline-flex overflow-hidden rounded-[7px] border border-[#dfe4ec] bg-white text-[13px] font-semibold">
                                      {([
                                          { id: 'winRate' as const, label: language === 'cn' ? '胜率' : 'Win rate' },
                                          { id: 'pnl' as const, label: 'P&L' },
                                          { id: 'trades' as const, label: language === 'cn' ? '交易' : 'Trades' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => setDayTimeCrossMetric(option.id)}
                                              className={`h-[32px] px-[15px] transition-colors ${dayTimeCrossMetric === option.id ? 'bg-[#e8e4f4] text-[#5f47c9]' : 'text-[#4d5560] hover:bg-[#f5f6f8]'}`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              {tagCrossSymbols.length === 0 ? (
                                  <div className="flex min-h-[156px] items-center justify-center text-[14px] font-semibold text-[#7b828c]">
                                      {language === 'cn' ? '暂无可用于交叉分析的交易品种' : 'No symbols available for cross analysis'}
                                  </div>
                              ) : (
                                  <table className="w-full min-w-[1120px] text-left text-[13px]">
                                      <thead className="bg-[#f4f2fa] text-[12px] font-semibold uppercase text-[#7b828c]">
                                          <tr>
                                              <th className="w-[170px] border-b border-[#e1e5ec] px-[18px] py-[12px]"></th>
                                              {tagCrossSymbols.map(symbol => (
                                                  <th key={symbol} className="border-b border-l border-[#e1e5ec] px-[18px] py-[12px] text-right">{symbol}</th>
                                              ))}
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {tagCrossAnalysisRows.map(({ row, cells }) => (
                                              <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0">
                                                  <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                                  {tagCrossSymbols.map(symbol => {
                                                      const cell = cells.get(symbol);
                                                      const value = dayTimeCrossMetric === 'pnl'
                                                          ? (cell?.pnl || 0)
                                                          : dayTimeCrossMetric === 'trades'
                                                              ? (cell?.count || 0)
                                                              : cell && cell.count > 0 ? (cell.wins / cell.count) * 100 : 0;
                                                      const tone = dayTimeCrossMetric === 'pnl' ? value : 0;
                                                      return (
                                                          <td
                                                              key={`${row.key}-${symbol}`}
                                                              className={`border-l border-[#eceff3] px-[18px] py-[12px] text-right font-semibold tabular-nums ${
                                                                  tone > 0 ? 'bg-[#eaf7f2] text-[#4d5560]' : tone < 0 ? 'bg-[#fdebec] text-[#4d5560]' : 'text-[#4d5560]'
                                                              }`}
                                                          >
                                                              {dayTimeCrossMetric === 'pnl'
                                                                  ? formatSignedMoney(value)
                                                                  : dayTimeCrossMetric === 'trades'
                                                                      ? value
                                                                      : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`}
                                                          </td>
                                                      );
                                                  })}
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                      </section>
                  </div>
              ) : detailedFilter === 'SETUPS' ? (
                  <div className="space-y-[14px]">
                      <div className="flex flex-col gap-[12px] xl:flex-row xl:items-center xl:justify-between">
                          <div className="inline-flex w-fit overflow-hidden rounded-[8px] border border-[#e0e4ea] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
                              <button
                                  type="button"
                                  className="h-[38px] min-w-[92px] bg-[#e8e4f4] px-[18px] text-[13px] font-semibold text-[#5f47c9]"
                              >
                                  {language === 'cn' ? '策略' : 'Strategies'}
                              </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-[8px]">
                              <div className="relative" data-day-time-symbol-limit-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[110px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{activeSymbolLimitLabel}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute right-0 top-full z-[80] mt-[6px] w-[140px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {symbolLimitOptions.map(option => (
                                          <button
                                              key={String(option.id)}
                                              type="button"
                                              onClick={() => {
                                                  setDayTimeSymbolLimit(option.id);
                                                  setIsDayTimeSymbolLimitOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  dayTimeSymbolLimit === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="relative" data-pnl-display-menu>
                                  <button
                                      type="button"
                                      onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                                      className="inline-flex h-[36px] min-w-[112px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  >
                                      <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                                      <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div
                                      className={`absolute right-0 top-full z-[80] mt-[6px] w-[128px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                          isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}
                                  >
                                      {([
                                          { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                                          { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => {
                                                  setPnlDisplayMode(option.id);
                                                  setIsPnlDisplayMenuOpen(false);
                                              }}
                                              className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                  pnlDisplayMode === option.id
                                                      ? 'bg-[#e8e4f4] text-[#303044]'
                                                      : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-4">
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳表现策略' : 'Best performing strategy'}
                              title={strategyHighlights.bestPerforming?.label || '--'}
                              detail={`${strategyHighlights.bestPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={strategyHighlights.bestPerforming ? formatSignedMoney(strategyHighlights.bestPerforming.netPnl) : undefined}
                              tone="good"
                              iconType="best"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={40}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最差表现策略' : 'Least performing strategy'}
                              title={strategyHighlights.leastPerforming?.label || '--'}
                              detail={`${strategyHighlights.leastPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={strategyHighlights.leastPerforming ? formatSignedMoney(strategyHighlights.leastPerforming.netPnl) : undefined}
                              tone="bad"
                              iconType="worst"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={100}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最活跃策略' : 'Most active strategy'}
                              title={strategyHighlights.mostActive?.label || '--'}
                              detail={`${strategyHighlights.mostActive?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              tone="accent"
                              iconType="active"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={160}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳胜率' : 'Best win rate'}
                              title={strategyHighlights.bestWinRate?.label || '--'}
                              detail={strategyHighlights.bestWinRate ? `${strategyHighlights.bestWinRate.winRate.toFixed(0)}% / ${strategyHighlights.bestWinRate.count} ${language === 'cn' ? '笔交易' : 'trades'}` : '--'}
                              tone="neutral"
                              iconType="winRate"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={220}
                          />
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="left">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="left"
                                              metrics={getDayTimeRenderMetrics('left').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="left" slot="primary" metricId={dayTimeLeftPrimaryMetric} />
                                      {dayTimeLeftSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="secondary"
                                              metricId={dayTimeLeftSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeLeftSecondaryMetric(dayTimeLeftTertiaryMetric);
                                                  setDayTimeLeftTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeLeftTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="tertiary"
                                              metricId={dayTimeLeftTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeLeftTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="left" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'strategies-left',
                                      rows: visibleStrategyRows,
                                      metrics: getDayTimeRenderMetrics('left'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 140,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>

                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="right">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="right"
                                              metrics={getDayTimeRenderMetrics('right').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="right" slot="primary" metricId={dayTimeRightPrimaryMetric} />
                                      {dayTimeRightSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="secondary"
                                              metricId={dayTimeRightSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeRightSecondaryMetric(dayTimeRightTertiaryMetric);
                                                  setDayTimeRightTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeRightTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="tertiary"
                                              metricId={dayTimeRightTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeRightTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="right" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'strategies-right',
                                      rows: visibleStrategyRows,
                                      metrics: getDayTimeRenderMetrics('right'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 220,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>
                      </div>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex h-[52px] items-center justify-between border-b border-[#e0e4ea] px-[18px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '汇总' : 'Summary'}</h3>
                              <button className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] hover:bg-[#f5f6f8]" type="button" aria-label="Summary settings">
                                  <Settings className="h-[15px] w-[15px]" />
                              </button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-left text-[13px]">
                                  <thead className="bg-[#f4f2fa] text-[12px] font-semibold text-[#7b828c]">
                                      <tr>
                                          {strategySummaryColumns.map(column => (
                                              <th key={column.id} className={`border-b border-[#e1e5ec] px-[18px] py-[12px] ${column.id === 'label' ? 'text-left' : 'text-right'}`}>{column.label}</th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {visibleStrategyRows.map(row => (
                                          <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0 hover:bg-[#fafbfc]">
                                              <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.winRate.toFixed(row.winRate % 1 === 0 ? 0 : 2)}%</td>
                                              <td className={`px-[18px] py-[12px] text-right font-semibold tabular-nums ${row.netPnl < 0 ? 'text-[#ff6468]' : row.netPnl > 0 ? 'text-[#3baa86]' : 'text-[#4d5560]'}`}>{formatSignedMoney(row.netPnl)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.count}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.avgDailyVolume.toFixed(2)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#3baa86] tabular-nums">{formatSignedMoney(row.avgWin)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#ff6468] tabular-nums">{formatSignedMoney(row.avgLoss)}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-[10px] border-b border-[#e0e4ea] px-[18px] py-[10px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '交叉分析' : 'Cross analysis'}</h3>
                              <div className="flex flex-wrap items-center gap-[8px]">
                                  <div className="relative" data-day-time-symbol-limit-menu>
                                      <button
                                          type="button"
                                          onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                          className="inline-flex h-[32px] min-w-[132px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                      >
                                          <span>{activeSymbolLimitLabel}</span>
                                          <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div
                                          className={`absolute right-0 top-full z-[80] mt-[6px] w-[156px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                              isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                          }`}
                                      >
                                          {symbolLimitOptions.map(option => (
                                              <button
                                                  key={String(option.id)}
                                                  type="button"
                                                  onClick={() => {
                                                      setDayTimeSymbolLimit(option.id);
                                                      setIsDayTimeSymbolLimitOpen(false);
                                                  }}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                      dayTimeSymbolLimit === option.id
                                                          ? 'bg-[#e8e4f4] text-[#303044]'
                                                          : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                  }`}
                                              >
                                                  {option.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="inline-flex overflow-hidden rounded-[7px] border border-[#dfe4ec] bg-white text-[13px] font-semibold">
                                      {([
                                          { id: 'winRate' as const, label: language === 'cn' ? '胜率' : 'Win rate' },
                                          { id: 'pnl' as const, label: 'P&L' },
                                          { id: 'trades' as const, label: language === 'cn' ? '交易' : 'Trades' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => setDayTimeCrossMetric(option.id)}
                                              className={`h-[32px] px-[15px] transition-colors ${dayTimeCrossMetric === option.id ? 'bg-[#e8e4f4] text-[#5f47c9]' : 'text-[#4d5560] hover:bg-[#f5f6f8]'}`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              {strategyCrossSymbols.length === 0 ? (
                                  <div className="flex min-h-[156px] items-center justify-center text-[14px] font-semibold text-[#7b828c]">
                                      {language === 'cn' ? '暂无可用于交叉分析的交易品种' : 'No symbols available for cross analysis'}
                                  </div>
                              ) : (
                                  <table className="w-full min-w-[1120px] text-left text-[13px]">
                                      <thead className="bg-[#f4f2fa] text-[12px] font-semibold uppercase text-[#7b828c]">
                                          <tr>
                                              <th className="w-[170px] border-b border-[#e1e5ec] px-[18px] py-[12px]"></th>
                                              {strategyCrossSymbols.map(symbol => (
                                                  <th key={symbol} className="border-b border-l border-[#e1e5ec] px-[18px] py-[12px] text-right">{symbol}</th>
                                              ))}
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {strategyCrossAnalysisRows.map(({ row, cells }) => (
                                              <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0">
                                                  <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                                  {strategyCrossSymbols.map(symbol => {
                                                      const cell = cells.get(symbol);
                                                      const value = dayTimeCrossMetric === 'pnl'
                                                          ? (cell?.pnl || 0)
                                                          : dayTimeCrossMetric === 'trades'
                                                              ? (cell?.count || 0)
                                                              : cell && cell.count > 0 ? (cell.wins / cell.count) * 100 : 0;
                                                      const tone = dayTimeCrossMetric === 'pnl' ? value : 0;
                                                      return (
                                                          <td
                                                              key={`${row.key}-${symbol}`}
                                                              className={`border-l border-[#eceff3] px-[18px] py-[12px] text-right font-semibold tabular-nums ${
                                                                  tone > 0 ? 'bg-[#eaf7f2] text-[#4d5560]' : tone < 0 ? 'bg-[#fdebec] text-[#4d5560]' : 'text-[#4d5560]'
                                                              }`}
                                                          >
                                                              {dayTimeCrossMetric === 'pnl'
                                                                  ? formatSignedMoney(value)
                                                                  : dayTimeCrossMetric === 'trades'
                                                                      ? value
                                                                      : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`}
                                                          </td>
                                                      );
                                                  })}
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                      </section>
                  </div>
              ) : detailedFilter === 'RISK' ? (
                  <div className="space-y-[14px]">
                      <div className="flex flex-col gap-[12px] xl:flex-row xl:items-center xl:justify-between">
                          <div className="inline-flex w-fit overflow-hidden rounded-[8px] border border-[#e0e4ea] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
                              {([
                                  { id: 'VOLUMES' as const, label: language === 'cn' ? '成交量' : 'Volumes' },
                                  { id: 'POSITION SIZES' as const, label: language === 'cn' ? '仓位大小' : 'Position sizes' },
                                  { id: 'R_MULTIPLES' as const, label: language === 'cn' ? 'R 倍数' : 'R-multiples' },
                              ]).map(option => (
                                  <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => setRiskReportView(option.id)}
                                      className={`h-[38px] min-w-[92px] px-[18px] text-[13px] font-semibold transition-colors ${
                                          riskReportView === option.id
                                              ? 'bg-[#e8e4f4] text-[#5f47c9]'
                                              : 'text-[#4d5560] hover:bg-[#f5f6f8] dark:text-slate-300 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                      {option.label}
                                  </button>
                              ))}
                          </div>

                          <div className="relative" data-pnl-display-menu>
                              <button
                                  type="button"
                                  onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                                  className="inline-flex h-[36px] min-w-[112px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                  <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                                  <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <div
                                  className={`absolute right-0 top-full z-[80] mt-[6px] w-[128px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                      isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                  }`}
                              >
                                  {([
                                      { id: 'net' as const, label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                                      { id: 'gross' as const, label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                                  ]).map(option => (
                                      <button
                                          key={option.id}
                                          type="button"
                                          onClick={() => {
                                              setPnlDisplayMode(option.id);
                                              setIsPnlDisplayMenuOpen(false);
                                          }}
                                          className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                              pnlDisplayMode === option.id
                                                  ? 'bg-[#e8e4f4] text-[#303044]'
                                                  : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                          }`}
                                      >
                                          {option.label}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-4">
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最佳表现' : 'Best performing'}
                              title={riskHighlights.bestPerforming?.label || '--'}
                              detail={`${riskHighlights.bestPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={riskHighlights.bestPerforming ? formatSignedMoney(riskHighlights.bestPerforming.netPnl) : undefined}
                              tone="good"
                              iconType="best"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={40}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最差表现' : 'Least performing'}
                              title={riskHighlights.leastPerforming?.label || '--'}
                              detail={`${riskHighlights.leastPerforming?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              value={riskHighlights.leastPerforming ? formatSignedMoney(riskHighlights.leastPerforming.netPnl) : undefined}
                              tone="bad"
                              iconType="worst"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={100}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最活跃' : 'Most active'}
                              title={riskHighlights.mostActive?.label || '--'}
                              detail={`${riskHighlights.mostActive?.count || 0} ${language === 'cn' ? '笔交易' : 'trades'}`}
                              tone="accent"
                              iconType="active"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={160}
                          />
                          <DayTimeInsightCard
                              eyebrow={language === 'cn' ? '最高胜率' : 'Best win rate'}
                              title={riskHighlights.bestWinRate?.label || '--'}
                              detail={riskHighlights.bestWinRate ? `${riskHighlights.bestWinRate.winRate.toFixed(0)}% / ${riskHighlights.bestWinRate.count} ${language === 'cn' ? '笔交易' : 'trades'}` : '--'}
                              tone="neutral"
                              iconType="winRate"
                              animate={shouldAnimateDayTimeInsights}
                              animationDelayMs={220}
                          />
                      </div>

                      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="left">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="left"
                                              metrics={getDayTimeRenderMetrics('left').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="left" slot="primary" metricId={dayTimeLeftPrimaryMetric} />
                                      {dayTimeLeftSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="secondary"
                                              metricId={dayTimeLeftSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeLeftSecondaryMetric(dayTimeLeftTertiaryMetric);
                                                  setDayTimeLeftTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeLeftTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="left"
                                              slot="tertiary"
                                              metricId={dayTimeLeftTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeLeftTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="left" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'left' ? null : 'left');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'risk-left',
                                      rows: riskCrossRows,
                                      metrics: getDayTimeRenderMetrics('left'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 140,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>

                          <section className="relative overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="relative z-[90] flex min-h-[58px] items-start justify-between gap-[10px] px-[10px] py-[10px]">
                                  <div className="flex min-w-[min(100%,360px)] flex-1 flex-wrap items-center gap-[8px]">
                                      <div className="relative" data-day-time-chart-style-root="right">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                                  setOpenDayTimeChartVisualDropdown(null);
                                                  setOpenDayTimeChartColorDropdown(null);
                                                  setOpenDayTimeMetricPicker(null);
                                              }}
                                              className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#5f636b] transition-colors hover:border-[#c9d0dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b45d6]/35"
                                              aria-label={language === 'cn' ? '调整图表样式' : 'Edit chart style'}
                                          >
                                              <FilledChartStyleIcon />
                                          </button>
                                          <DayTimeChartStyleMenu
                                              side="right"
                                              metrics={getDayTimeRenderMetrics('right').map(metric => ({
                                                  slot: metric.slot,
                                                  config: { label: metric.label },
                                                  visual: metric.visual,
                                                  color: metric.color,
                                              }))}
                                          />
                                      </div>
                                      <DayTimeMetricTrigger side="right" slot="primary" metricId={dayTimeRightPrimaryMetric} />
                                      {dayTimeRightSecondaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="secondary"
                                              metricId={dayTimeRightSecondaryMetric}
                                              removable
                                              onRemove={() => {
                                                  setDayTimeRightSecondaryMetric(dayTimeRightTertiaryMetric);
                                                  setDayTimeRightTertiaryMetric(null);
                                              }}
                                          />
                                      )}
                                      {dayTimeRightTertiaryMetric && (
                                          <DayTimeMetricTrigger
                                              side="right"
                                              slot="tertiary"
                                              metricId={dayTimeRightTertiaryMetric}
                                              removable
                                              onRemove={() => setDayTimeRightTertiaryMetric(null)}
                                          />
                                      )}
                                      <DayTimeAddMetricButton side="right" />
                                  </div>
                                  <button
                                      className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] transition-colors hover:bg-[#f5f6f8]"
                                      type="button"
                                      aria-label={language === 'cn' ? '更多图表选项' : 'More chart options'}
                                      onClick={() => {
                                          setOpenDayTimeChartStyleMenu(current => current === 'right' ? null : 'right');
                                          setOpenDayTimeChartVisualDropdown(null);
                                          setOpenDayTimeChartColorDropdown(null);
                                          setOpenDayTimeMetricPicker(null);
                                      }}
                                  >
                                      <MoreVertical className="h-[16px] w-[16px]" />
                                  </button>
                              </div>
                              <div className="relative z-0 h-[342px] overflow-hidden rounded-b-[8px] px-[10px] pb-[8px] pt-[6px]">
                                  {renderDayTimeMetricChart({
                                      chartId: 'risk-right',
                                      rows: riskCrossRows,
                                      metrics: getDayTimeRenderMetrics('right'),
                                      animate: shouldAnimateDayTimeCharts,
                                      animationDelayMs: 220,
                                  })}
                              </div>
                              <ReportCardLoadingOverlay radius={8} />
                          </section>
                      </div>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex h-[52px] items-center justify-between border-b border-[#e0e4ea] px-[18px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '汇总' : 'Summary'}</h3>
                              <button className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[#dfe4ec] text-[#6b7280] hover:bg-[#f5f6f8]" type="button" aria-label="Summary settings">
                                  <Settings className="h-[15px] w-[15px]" />
                              </button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-left text-[13px]">
                                  <thead className="bg-[#f4f2fa] text-[12px] font-semibold text-[#7b828c]">
                                      <tr>
                                          {riskSummaryColumns.map(column => (
                                              <th key={column.id} className={`border-b border-[#e1e5ec] px-[18px] py-[12px] ${column.id === 'label' ? 'text-left' : 'text-right'}`}>{column.label}</th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {riskCrossRows.map(row => (
                                          <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0 hover:bg-[#fafbfc]">
                                              <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.winRate.toFixed(row.winRate % 1 === 0 ? 0 : 2)}%</td>
                                              <td className={`px-[18px] py-[12px] text-right font-semibold tabular-nums ${row.netPnl < 0 ? 'text-[#ff6468]' : row.netPnl > 0 ? 'text-[#3baa86]' : 'text-[#4d5560]'}`}>{formatSignedMoney(row.netPnl)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.count}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#4d5560] tabular-nums">{row.avgDailyVolume.toFixed(2)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#3baa86] tabular-nums">{formatSignedMoney(row.avgWin)}</td>
                                              <td className="px-[18px] py-[12px] text-right font-semibold text-[#ff6468] tabular-nums">{formatSignedMoney(row.avgLoss)}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>

                      <section className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                          <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-[10px] border-b border-[#e0e4ea] px-[18px] py-[10px]">
                              <h3 className="text-[19px] font-bold text-[#252a32] dark:text-white">{language === 'cn' ? '交叉分析' : 'Cross analysis'}</h3>
                              <div className="flex flex-wrap items-center gap-[8px]">
                                  <div className="relative" data-day-time-symbol-limit-menu>
                                      <button
                                          type="button"
                                          onClick={() => setIsDayTimeSymbolLimitOpen(current => !current)}
                                          className="inline-flex h-[32px] min-w-[132px] items-center justify-between gap-[10px] rounded-[7px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                      >
                                          <span>{activeSymbolLimitLabel}</span>
                                          <ChevronDown className={`h-[13px] w-[13px] text-[#111827] transition-transform dark:text-slate-300 ${isDayTimeSymbolLimitOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div
                                          className={`absolute right-0 top-full z-[80] mt-[6px] w-[156px] origin-top-right overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
                                              isDayTimeSymbolLimitOpen ? 'max-h-[192px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                          }`}
                                      >
                                          {symbolLimitOptions.map(option => (
                                              <button
                                                  key={String(option.id)}
                                                  type="button"
                                                  onClick={() => {
                                                      setDayTimeSymbolLimit(option.id);
                                                      setIsDayTimeSymbolLimitOpen(false);
                                                  }}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                      dayTimeSymbolLimit === option.id
                                                          ? 'bg-[#e8e4f4] text-[#303044]'
                                                          : 'text-[#303844] hover:bg-[#f1f2f4] dark:text-slate-200 dark:hover:bg-slate-800'
                                                  }`}
                                              >
                                                  {option.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="inline-flex overflow-hidden rounded-[7px] border border-[#dfe4ec] bg-white text-[13px] font-semibold">
                                      {([
                                          { id: 'winRate' as const, label: language === 'cn' ? '胜率' : 'Win rate' },
                                          { id: 'pnl' as const, label: 'P&L' },
                                          { id: 'trades' as const, label: language === 'cn' ? '交易' : 'Trades' },
                                      ]).map(option => (
                                          <button
                                              key={option.id}
                                              type="button"
                                              onClick={() => setDayTimeCrossMetric(option.id)}
                                              className={`h-[32px] px-[15px] transition-colors ${dayTimeCrossMetric === option.id ? 'bg-[#e8e4f4] text-[#5f47c9]' : 'text-[#4d5560] hover:bg-[#f5f6f8]'}`}
                                          >
                                              {option.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              {riskCrossSymbols.length === 0 ? (
                                  <div className="flex min-h-[156px] items-center justify-center text-[14px] font-semibold text-[#7b828c]">
                                      {language === 'cn' ? '暂无可用于交叉分析的交易品种' : 'No symbols available for cross analysis'}
                                  </div>
                              ) : (
                                  <table className="w-full min-w-[1120px] text-left text-[13px]">
                                      <thead className="bg-[#f4f2fa] text-[12px] font-semibold uppercase text-[#7b828c]">
                                          <tr>
                                              <th className="w-[170px] border-b border-[#e1e5ec] px-[18px] py-[12px]"></th>
                                              {riskCrossSymbols.map(symbol => (
                                                  <th key={symbol} className="border-b border-l border-[#e1e5ec] px-[18px] py-[12px] text-right">{symbol}</th>
                                              ))}
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {riskCrossAnalysisRows.map(({ row, cells }) => (
                                              <tr key={row.key} className="border-b border-[#eceff3] last:border-b-0">
                                                  <td className="px-[18px] py-[12px] font-semibold text-[#4d5560]">{row.label}</td>
                                                  {riskCrossSymbols.map(symbol => {
                                                      const cell = cells.get(symbol);
                                                      const value = dayTimeCrossMetric === 'pnl'
                                                          ? (cell?.pnl || 0)
                                                          : dayTimeCrossMetric === 'trades'
                                                              ? (cell?.count || 0)
                                                              : cell && cell.count > 0 ? (cell.wins / cell.count) * 100 : 0;
                                                      const tone = dayTimeCrossMetric === 'pnl' ? value : 0;
                                                      return (
                                                          <td
                                                              key={`${row.key}-${symbol}`}
                                                              className={`border-l border-[#eceff3] px-[18px] py-[12px] text-right font-semibold tabular-nums ${
                                                                  tone > 0 ? 'bg-[#eaf7f2] text-[#4d5560]' : tone < 0 ? 'bg-[#fdebec] text-[#4d5560]' : 'text-[#4d5560]'
                                                              }`}
                                                          >
                                                              {dayTimeCrossMetric === 'pnl'
                                                                  ? formatSignedMoney(value)
                                                                  : dayTimeCrossMetric === 'trades'
                                                                      ? value
                                                                      : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`}
                                                          </td>
                                                      );
                                                  })}
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                      </section>
                  </div>
              ) : (
              <>
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
              </>
              )}
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
          <div className="space-y-[16px] animate-fade-in">
              <div className="flex flex-wrap items-start justify-between gap-[12px]">
                  <div className="relative" data-pnl-display-menu>
                      <div className="mb-[6px] text-[12px] font-bold uppercase tracking-[0.02em] text-[#6f7e8e]">
                          {language === 'cn' ? '盈亏显示' : 'P&L showing'}
                      </div>
                      <button
                          type="button"
                          onClick={() => setIsPnlDisplayMenuOpen(current => !current)}
                          className="inline-flex h-[32px] items-center gap-[8px] rounded-[8px] border border-[#dde3ea] bg-white px-[12px] text-[14px] font-medium text-[#2c3138]"
                      >
                          <span>{pnlDisplayMode === 'net' ? (language === 'cn' ? '净盈亏' : 'NET P&L') : (language === 'cn' ? '总盈亏' : 'GROSS P&L')}</span>
                          <ChevronDown className={`h-[14px] w-[14px] text-[#111827] transition-transform ${isPnlDisplayMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <div className={`absolute left-0 top-full z-[90] mt-[6px] w-[136px] origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                          isPnlDisplayMenuOpen ? 'max-h-[112px] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                      }`}>
                          {([
                              { id: 'net', label: language === 'cn' ? '净盈亏' : 'NET P&L' },
                              { id: 'gross', label: language === 'cn' ? '总盈亏' : 'GROSS P&L' },
                          ] as Array<{ id: PnlDisplayMode; label: string }>).map(option => {
                              const selected = option.id === pnlDisplayMode;
                              return (
                                  <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => {
                                          setPnlDisplayMode(option.id);
                                          setIsPnlDisplayMenuOpen(false);
                                      }}
                                      className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[14px] font-medium transition-colors ${
                                          selected ? 'bg-[#e8e4f4] text-[#2f255f]' : 'text-[#303844] hover:bg-[#f1f2f4]'
                                      }`}
                                  >
                                      {option.label}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              </div>

              <section className="overflow-hidden rounded-[16px] bg-white shadow-none">
                  <div className="border-b border-[#edf1f5] px-[22px] py-[16px]">
                      <h2 className="text-[18px] font-bold tracking-[-0.01em] text-[#2d3139]">{language === 'cn' ? '年度' : 'YEAR'}</h2>
                  </div>
                  <div className="px-[24px] pb-[22px] pt-[26px]">
                      <div className="mx-auto flex max-w-[860px] items-center justify-between pb-[22px]">
                          <button
                              type="button"
                              onClick={() => {
                                  setCalendarYear(current => current - 1);
                                  setCalendarMonthDate(current => new Date(current.getFullYear() - 1, current.getMonth(), 1));
                              }}
                              className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6d7b89] transition-colors hover:bg-[#f2f4f7]"
                          >
                              <ChevronLeft className="h-[22px] w-[22px]" />
                          </button>
                          <div className="text-[32px] font-semibold tracking-[-0.02em] text-[#2c3138]">{calendarYear}</div>
                          <button
                              type="button"
                              onClick={() => {
                                  setCalendarYear(current => current + 1);
                                  setCalendarMonthDate(current => new Date(current.getFullYear() + 1, current.getMonth(), 1));
                              }}
                              className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6d7b89] transition-colors hover:bg-[#f2f4f7]"
                          >
                              <ChevronRight className="h-[22px] w-[22px]" />
                          </button>
                      </div>

                      <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-x-[34px] gap-y-[28px] md:grid-cols-2 xl:grid-cols-4">
                          {Array.from({ length: 12 }, (_, monthIndex) => (
                              <button
                                  key={monthIndex}
                                  type="button"
                                  onClick={() => setCalendarMonthDate(new Date(calendarYear, monthIndex, 1))}
                                  className={`rounded-[12px] border-[1.5px] bg-white px-[8px] py-[10px] text-left transition-[border-color,box-shadow,transform] duration-200 ${
                                      calendarMonthStart.getFullYear() === calendarYear && calendarMonthStart.getMonth() === monthIndex
                                          ? 'border-[#6d5cd5] shadow-[0_0_0_1px_rgba(109,92,213,0.06)]'
                                          : 'border-transparent hover:border-[#e7ebf1]'
                                  }`}
                              >
                                  <div className="pb-[10px] text-center text-[16px] font-semibold text-[#303844]">
                                      {new Date(calendarYear, monthIndex).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'long' })}
                                  </div>
                                  <div className="grid grid-cols-7 gap-[4px]">
                                      {calendarWeekdayHeaders.map(label => (
                                          <div key={`${monthIndex}-${label}`} className="flex h-[20px] items-center justify-center rounded-[6px] bg-white text-[10px] font-medium text-[#a2aab6]">
                                              {language === 'cn' ? label.replace('周', '') : label}
                                          </div>
                                      ))}
                                      {renderMonthGrid(monthIndex)}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </section>

              <section className="overflow-hidden rounded-[16px] bg-white shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-[#edf1f5] px-[12px] py-[12px] sm:px-[18px]">
                      <div className="flex flex-wrap items-center gap-[10px]">
                          <button
                              type="button"
                              onClick={() => setCalendarMonthDate(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#6f7c89] hover:bg-[#f3f5f8]"
                          >
                              <ChevronLeft className="h-[16px] w-[16px]" />
                          </button>
                          <div className="text-[15px] font-bold text-[#2d3139]">{calendarMonthLabel}</div>
                          <button
                              type="button"
                              onClick={() => setCalendarMonthDate(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#6f7c89] hover:bg-[#f3f5f8]"
                          >
                              <ChevronRight className="h-[16px] w-[16px]" />
                          </button>
                          <button
                              type="button"
                              onClick={() => setCalendarMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                              className="ml-[6px] inline-flex h-[30px] items-center rounded-[8px] border border-[#dfe4ec] px-[14px] text-[14px] font-medium text-[#303844]"
                          >
                              {language === 'cn' ? '本月' : 'This month'}
                          </button>
                      </div>
                      <div className="flex items-center gap-[10px] px-[6px] text-[#7e8895]">
                          <CalendarIcon className="h-[15px] w-[15px] text-[#7b68d9]" />
                          <Info className="h-[15px] w-[15px]" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
                      <div className="px-[12px] pb-[18px] pt-[16px] sm:px-[18px]">
                          <div className="grid grid-cols-7 gap-[4px]">
                              {calendarWeekdayHeaders.map(label => (
                                  <div
                                      key={label}
                                      className="flex h-[32px] items-center justify-center rounded-[10px] border border-[#e8edf2] bg-white text-[14px] font-semibold text-[#20232a]"
                                  >
                                      {language === 'cn' ? label : label}
                                  </div>
                              ))}
                              {calendarMonthViewData.cells.map(cell => {
                                  const summary = cell.summary;
                                  const dayPnl = summary?.pnl || 0;
                                  const isToday = isSameCalendarDay(cell.date, new Date());
                                  const cellTone = !cell.inMonth
                                      ? 'bg-white text-[#c3cad3]'
                                      : !summary
                                          ? 'bg-[#f1f3f5] text-[#535f6d]'
                                          : dayPnl > 0
                                              ? 'bg-[#dff2e7] text-[#26303b]'
                                              : dayPnl < 0
                                                  ? 'bg-[#ffe1e1] text-[#26303b]'
                                                  : 'bg-[#eef1f4] text-[#26303b]';
                                  const borderTone = !summary
                                      ? 'border-[#e9edf2]'
                                      : dayPnl > 0
                                          ? 'border-[#55c39e]'
                                          : dayPnl < 0
                                              ? 'border-[#ff7d7d]'
                                              : 'border-[#d9e0e8]';

                                  return (
                                      <div
                                          key={cell.dateKey}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setReportCalendarSelectedDay(new Date(cell.date))}
                                          onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault();
                                                  setReportCalendarSelectedDay(new Date(cell.date));
                                              }
                                          }}
                                          className={`relative flex min-h-[118px] cursor-pointer flex-col rounded-[4px] border p-[8px] transition-[transform,colors,box-shadow] duration-200 hover:scale-[1.01] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] xl:min-h-[122px] ${cellTone} ${borderTone}`}
                                      >
                                          <div className="flex items-start justify-between text-[12px] font-medium">
                                              <span
                                                  className={`inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full px-[6px] leading-none ${
                                                      isToday
                                                          ? 'border border-[#6d5cd5] bg-white text-[#4f3dc1] shadow-[0_2px_6px_rgba(109,92,213,0.14)]'
                                                          : ''
                                                  }`}
                                              >
                                                  {cell.date.getDate()}
                                              </span>
                                          </div>
                                          {summary && cell.inMonth && (
                                              <div className="mt-auto flex flex-col items-end text-right">
                                                  <div className={`text-[14px] font-bold leading-none tabular-nums ${dayPnl > 0 ? 'text-[#26303b]' : dayPnl < 0 ? 'text-[#26303b]' : 'text-[#46515c]'}`}>
                                                      {formatSignedMoney(dayPnl)}
                                                  </div>
                                                  <div className="mt-[5px] text-[12px] font-medium text-[#7f8995]">
                                                      {summary.count} {language === 'cn' ? '笔交易' : summary.count === 1 ? 'trade' : 'trades'}
                                                  </div>
                                              </div>
                                          )}
                                          {summary?.hasOpenTrade && cell.inMonth && (
                                              <span className="absolute bottom-[8px] left-[8px] inline-flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border border-current text-[#38414a]">
                                                  <CalendarCheck className="h-[11px] w-[11px]" />
                                              </span>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      <aside className="border-t border-[#edf1f5] px-[24px] pb-[20px] pt-[28px] xl:border-l xl:border-t-0">
                          <div className="text-center text-[16px] font-bold uppercase tracking-[0.01em] text-[#39424f]">
                              {language === 'cn' ? '每周盈亏' : 'P&L PER WEEK'}
                          </div>
                          <div className="mt-[26px] space-y-[18px]">
                              {calendarMonthViewData.weeks.map(week => (
                                  <div key={`calendar-week-${week.index}`} className="text-center">
                                      <div className={`text-[20px] font-bold tabular-nums ${week.pnl > 0 ? 'text-[#55c39e]' : week.pnl < 0 ? 'text-[#f15f63]' : 'text-[#2f3943]'}`}>
                                          {week.pnl === 0 ? '$0' : formatSignedMoney(week.pnl)}
                                      </div>
                                      <div className="mt-[2px] text-[12px] font-bold uppercase tracking-[0.03em] text-[#7b8794]">
                                          {language === 'cn' ? `第 ${week.index} 周` : `WEEK ${week.index}`}
                                      </div>
                                      {week.index !== calendarMonthViewData.weeks.length && (
                                          <div className="mx-auto mt-[16px] h-px w-[112px] bg-[#edf1f5]" />
                                      )}
                                  </div>
                              ))}
                          </div>
                      </aside>
                  </div>
              </section>

              <div className="grid grid-cols-1 gap-[12px] xl:grid-cols-[1fr_1fr]">
                  <section className="overflow-hidden rounded-[16px] bg-white shadow-none">
                      <div className="flex items-center justify-between border-b border-[#edf1f5] px-[14px] py-[14px] sm:px-[18px]">
                          <div className="flex items-baseline gap-[10px]">
                              <h3 className="text-[15px] font-bold uppercase text-[#20232a]">
                                  {language === 'cn' ? '每日累计净盈亏' : 'DAILY NET CUMULATIVE P&L'}
                              </h3>
                              <span className="text-[13px] font-bold uppercase text-[#7b828c]">{calendarRangeLabel}</span>
                          </div>
                          <OverviewInfoBadge />
                      </div>
                      <div className="h-[338px] px-[18px] pb-[18px] pt-[18px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={calendarMonthViewData.cumulativeChartData} margin={{ top: 8, right: 18, left: 10, bottom: 24 }}>
                                  <defs>
                                      <linearGradient id="calendarCumulativeFill" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor={calendarMonthViewData.summary.totalPnl < 0 ? '#ff7d7d' : '#7b68d9'} stopOpacity={0.28} />
                                          <stop offset="65%" stopColor={calendarMonthViewData.summary.totalPnl < 0 ? '#ff7d7d' : '#7b68d9'} stopOpacity={0.1} />
                                          <stop offset="100%" stopColor={calendarMonthViewData.summary.totalPnl < 0 ? '#ff7d7d' : '#7b68d9'} stopOpacity={0.02} />
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe5eb" strokeOpacity={0.82} />
                                  <XAxis dataKey="label" ticks={calendarCumulativeTicks} interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 600 }} dy={16} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#7b828c', fontWeight: 600 }} tickFormatter={(value) => formatMoney(Number(value), true)} width={58} />
                                  <Tooltip content={<PnlTooltip />} cursor={{ stroke: '#9aa3ae', strokeDasharray: '3 3' }} />
                                  <ReferenceLine y={0} stroke="#dfe5eb" strokeDasharray="3 3" />
                                  <Area
                                      type="monotone"
                                      dataKey="cumulativePnl"
                                      stroke="#7b68d9"
                                      strokeWidth={1.8}
                                      fill="url(#calendarCumulativeFill)"
                                      dot={false}
                                      isAnimationActive={shouldAnimateWinLossesCharts}
                                      animationDuration={760}
                                      activeDot={{ r: 4, fill: '#fff', stroke: '#7b68d9', strokeWidth: 2 }}
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </section>

                  <section className="overflow-hidden rounded-[16px] bg-white shadow-none">
                      <div className="border-b border-[#edf1f5] px-[14px] py-[14px] sm:px-[18px]">
                          <div className="flex items-baseline gap-[10px]">
                              <h3 className="text-[15px] font-bold uppercase text-[#20232a]">
                                  {language === 'cn' ? '整体评估' : 'OVERALL EVALUATION'}
                              </h3>
                              <span className="text-[13px] font-bold uppercase text-[#7b828c]">{calendarRangeLabel}</span>
                          </div>
                      </div>
                      <div className="grid h-[338px] grid-cols-1 items-center gap-[24px] px-[22px] py-[22px] md:grid-cols-[1fr_240px]">
                          <div className="flex items-center justify-center">
                              <div className="relative h-[200px] w-[200px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                          <Pie
                                              data={calendarDonutData}
                                              dataKey="value"
                                              nameKey="name"
                                              innerRadius={72}
                                              outerRadius={92}
                                              stroke="none"
                                              startAngle={90}
                                              endAngle={-270}
                                              isAnimationActive={shouldAnimateWinLossesCharts}
                                              animationDuration={760}
                                          >
                                              {calendarDonutData.map(entry => (
                                                  <Cell key={entry.name} fill={entry.color} />
                                              ))}
                                          </Pie>
                                      </PieChart>
                                  </ResponsiveContainer>
                                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                      <div className="flex items-start gap-[4px] text-[#55c39e]">
                                          <span className="text-[46px] font-bold leading-none">{Math.round(calendarWinRate)}</span>
                                          <span className="pt-[7px] text-[20px] font-bold">%</span>
                                      </div>
                                      <div className="mt-[8px] text-[13px] font-bold uppercase tracking-[0.04em] text-[#55c39e]">
                                          {language === 'cn' ? '胜率' : 'WINRATE'}
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div className="space-y-[20px]">
                              {calendarDonutData.map(entry => (
                                  <div key={`calendar-donut-legend-${entry.name}`} className="flex items-start gap-[12px]">
                                      <span className="mt-[3px] inline-flex h-[22px] w-[22px] rounded-[4px]" style={{ backgroundColor: entry.color }} />
                                      <div>
                                          <div className="text-[20px] font-bold leading-none text-[#2d3139]">{entry.value}</div>
                                          <div className="mt-[4px] text-[13px] font-medium text-[#7c8591]">{entry.name}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              </div>

              <section className="overflow-hidden rounded-[16px] bg-white shadow-none">
                  <div className="border-b border-[#edf1f5] px-[14px] py-[14px] sm:px-[18px]">
                      <div className="flex items-baseline gap-[10px]">
                          <h3 className="text-[15px] font-bold uppercase text-[#20232a]">
                              {language === 'cn' ? '统计' : 'STATISTICS'}
                          </h3>
                          <span className="text-[13px] font-bold uppercase text-[#7b828c]">{calendarRangeLabel}</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 gap-0 px-[14px] pb-[18px] pt-[18px] lg:grid-cols-2 lg:gap-[28px] lg:px-[18px]">
                      {calendarStatisticsColumns.map((column, columnIndex) => (
                          <div key={`calendar-stats-column-${columnIndex}`} className="space-y-0">
                              {column.map(([label, value]) => (
                                  <div
                                      key={`${columnIndex}-${String(label)}`}
                                      className="flex min-h-[30px] items-center justify-between border-b border-[#e6e8ec] px-[8px] text-[13px] font-semibold leading-none last:border-b-0"
                                  >
                                      <span className="pr-[16px] text-[#737a83]">{label}</span>
                                      <span className="text-right text-[#737a83] tabular-nums">{value}</span>
                                  </div>
                              ))}
                          </div>
                      ))}
                  </div>
              </section>
          </div>
      )}

      {activeTab === 'compare' && (
          <div className="space-y-[14px]">
              <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                  {([
                      { key: 'left' as const, title: 'Group #1', summary: compareSummaries.left },
                      { key: 'right' as const, title: 'Group #2', summary: compareSummaries.right },
                  ]).map(group => {
                      const filters = compareDraftFilters[group.key];
                      const symbolSearch = compareSearch[group.key].symbols.trim().toLowerCase();
                      const tagSearch = compareSearch[group.key].tags.trim().toLowerCase();
                      const visibleSymbolSuggestions = compareSymbolSuggestions
                          .filter(item => !filters.symbols.includes(item))
                          .filter(item => !symbolSearch || item.toLowerCase().includes(symbolSearch))
                          .slice(0, 10);
                      const visibleTagSuggestions = compareTagSuggestions
                          .filter(item => !filters.tags.includes(item))
                          .filter(item => !tagSearch || item.toLowerCase().includes(tagSearch))
                          .slice(0, 10);
                      const matchedLabel = language === 'cn'
                          ? `${group.summary.matchedTradeCount} 笔交易匹配`
                          : `${group.summary.matchedTradeCount} Trades Matched`;

                      const renderChipButton = (value: string, field: CompareMultiSelectField) => (
                          <span className="inline-flex max-w-full items-center rounded-full bg-[#ece8f7] px-[10px] py-[3px] text-[12px] font-semibold text-[#4b35b8]">
                              <span className="truncate">{value}</span>
                              <button
                                  type="button"
                                  onClick={(event) => {
                                      event.stopPropagation();
                                      toggleCompareMultiValue(group.key, field, value);
                                  }}
                                  className="ml-[6px] inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#d8d0f2] text-[#6a55cf]"
                              >
                                  <X className="h-[10px] w-[10px]" />
                              </button>
                          </span>
                      );

                      return (
                          <section key={group.key} className="overflow-visible rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                              <div className="border-b border-[#eceff3] px-[22px] py-[14px]">
                                  <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">
                                      {group.title}{compareHasGenerated ? ` (${matchedLabel})` : ''}
                                  </h3>
                              </div>
                              <div className="grid grid-cols-1 gap-[12px] px-[22px] py-[22px] md:grid-cols-[112px_minmax(0,1fr)_112px_minmax(0,1fr)] md:items-start md:gap-x-[20px]">
                                  <div className="flex items-center text-[15px] font-medium text-[#313843]">{language === 'cn' ? '标的' : 'Symbol'}</div>
                                  <div className="relative min-w-0" data-compare-field-root>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setActiveCompareMultiSelect(current => current?.group === group.key && current.field === 'symbols' ? null : { group: group.key, field: 'symbols' });
                                              setActiveCompareSelect(null);
                                              setActiveCompareCalendar(null);
                                          }}
                                          className="flex min-h-[38px] w-full items-center rounded-[8px] border border-[#dfe4ec] bg-white px-[10px] py-[6px] text-left text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#cbd3df]"
                                      >
                                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[6px]">
                                              {filters.symbols.length === 0 ? (
                                                  <span className="text-[#9aa3af]">{language === 'cn' ? '选择标的' : 'Select symbols'}</span>
                                              ) : filters.symbols.length === 1 ? (
                                                  renderChipButton(filters.symbols[0], 'symbols')
                                              ) : (
                                                  <>
                                                      {renderChipButton(filters.symbols[0], 'symbols')}
                                                      <span className="text-[13px] font-semibold text-[#4d5560]">+{filters.symbols.length - 1}</span>
                                                  </>
                                              )}
                                          </div>
                                      </button>
                                      <div className={`absolute left-0 top-full z-[90] mt-[6px] w-full origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[6px] shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                                          activeCompareMultiSelect?.group === group.key && activeCompareMultiSelect.field === 'symbols'
                                              ? 'max-h-[320px] scale-100 opacity-100'
                                              : 'pointer-events-none max-h-0 scale-[0.98] opacity-0'
                                      }`}>
                                          <input
                                              value={compareSearch[group.key].symbols}
                                              onChange={(event) => setCompareSearch(current => ({
                                                  ...current,
                                                  [group.key]: { ...current[group.key], symbols: event.target.value },
                                              }))}
                                              placeholder={language === 'cn' ? '搜索标的' : 'Search symbols'}
                                              className="mb-[6px] h-[34px] w-full rounded-[7px] border border-[#dfe4ec] px-[10px] text-[13px] text-[#20232a] outline-none placeholder:text-[#9aa3af] focus:border-[#6a55cf]"
                                          />
                                          <div className="max-h-[240px] overflow-y-auto">
                                              {visibleSymbolSuggestions.length === 0 ? (
                                                  <div className="px-[8px] py-[10px] text-[12px] font-medium text-[#9aa3af]">{language === 'cn' ? '没有可选标的' : 'No symbols found'}</div>
                                              ) : visibleSymbolSuggestions.map(item => (
                                                  <button
                                                      key={`${group.key}-symbol-${item}`}
                                                      type="button"
                                                      onClick={() => toggleCompareMultiValue(group.key, 'symbols', item)}
                                                      className="flex w-full items-center justify-between rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-medium text-[#303844] transition-colors hover:bg-[#f4f5f7]"
                                                  >
                                                      <span>{item}</span>
                                                      {filters.symbols.includes(item) && <Check className="h-[14px] w-[14px] text-[#5f47c9]" />}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex items-center text-[15px] font-medium text-[#313843]">{language === 'cn' ? '标签' : 'Tags'}</div>
                                  <div className="relative min-w-0" data-compare-field-root>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setActiveCompareMultiSelect(current => current?.group === group.key && current.field === 'tags' ? null : { group: group.key, field: 'tags' });
                                              setActiveCompareSelect(null);
                                              setActiveCompareCalendar(null);
                                          }}
                                          className="flex min-h-[38px] w-full items-center rounded-[8px] border border-[#dfe4ec] bg-white px-[10px] py-[6px] text-left text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#cbd3df]"
                                      >
                                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[6px]">
                                              {filters.tags.length === 0 ? (
                                                  <span className="text-[#9aa3af]">{language === 'cn' ? '选择标签' : 'Select tags'}</span>
                                              ) : filters.tags.length === 1 ? (
                                                  renderChipButton(filters.tags[0], 'tags')
                                              ) : (
                                                  <>
                                                      {renderChipButton(filters.tags[0], 'tags')}
                                                      <span className="text-[13px] font-semibold text-[#4d5560]">+{filters.tags.length - 1}</span>
                                                  </>
                                              )}
                                          </div>
                                      </button>
                                      <div className={`absolute left-0 top-full z-[90] mt-[6px] w-full origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[6px] shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                                          activeCompareMultiSelect?.group === group.key && activeCompareMultiSelect.field === 'tags'
                                              ? 'max-h-[320px] scale-100 opacity-100'
                                              : 'pointer-events-none max-h-0 scale-[0.98] opacity-0'
                                      }`}>
                                          <input
                                              value={compareSearch[group.key].tags}
                                              onChange={(event) => setCompareSearch(current => ({
                                                  ...current,
                                                  [group.key]: { ...current[group.key], tags: event.target.value },
                                              }))}
                                              placeholder={language === 'cn' ? '搜索标签' : 'Search tags'}
                                              className="mb-[6px] h-[34px] w-full rounded-[7px] border border-[#dfe4ec] px-[10px] text-[13px] text-[#20232a] outline-none placeholder:text-[#9aa3af] focus:border-[#6a55cf]"
                                          />
                                          <div className="max-h-[240px] overflow-y-auto">
                                              {visibleTagSuggestions.length === 0 ? (
                                                  <div className="px-[8px] py-[10px] text-[12px] font-medium text-[#9aa3af]">{language === 'cn' ? '没有可选标签' : 'No tags found'}</div>
                                              ) : visibleTagSuggestions.map(item => (
                                                  <button
                                                      key={`${group.key}-tag-${item}`}
                                                      type="button"
                                                      onClick={() => toggleCompareMultiValue(group.key, 'tags', item)}
                                                      className="flex w-full items-center justify-between rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-medium text-[#303844] transition-colors hover:bg-[#f4f5f7]"
                                                  >
                                                      <span>{item}</span>
                                                      {filters.tags.includes(item) && <Check className="h-[14px] w-[14px] text-[#5f47c9]" />}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex items-center text-[15px] font-medium text-[#313843]">{language === 'cn' ? '多空方向' : 'Side'}</div>
                                  <div className="relative" data-compare-field-root>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setActiveCompareSelect(current => current?.group === group.key && current.field === 'side' ? null : { group: group.key, field: 'side' });
                                              setActiveCompareMultiSelect(null);
                                              setActiveCompareCalendar(null);
                                          }}
                                          className="inline-flex h-[38px] w-full items-center justify-between rounded-[8px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#cbd3df]"
                                      >
                                          <span>{compareSideOptions.find(option => option.id === filters.side)?.label}</span>
                                          <ChevronDown className={`h-[14px] w-[14px] text-[#111827] transition-transform ${activeCompareSelect?.group === group.key && activeCompareSelect.field === 'side' ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div className={`absolute left-0 top-full z-[90] mt-[6px] w-full origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                                          activeCompareSelect?.group === group.key && activeCompareSelect.field === 'side'
                                              ? 'max-h-[180px] scale-100 opacity-100'
                                              : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}>
                                          {compareSideOptions.map(option => (
                                              <button
                                                  key={`${group.key}-side-${option.id}`}
                                                  type="button"
                                                  onClick={() => {
                                                      updateCompareDraftFilters(group.key, current => ({ ...current, side: option.id }));
                                                      setActiveCompareSelect(null);
                                                  }}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                      filters.side === option.id ? 'bg-[#e8e4f4] text-[#303044]' : 'text-[#303844] hover:bg-[#f1f2f4]'
                                                  }`}
                                              >
                                                  {option.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="flex items-center text-[15px] font-medium text-[#313843]">{language === 'cn' ? '开始日期' : 'Start date'}</div>
                                  <div className="relative" data-compare-field-root>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setActiveCompareCalendar(current => current?.group === group.key && current.field === 'startDate' ? null : { group: group.key, field: 'startDate' });
                                              setActiveCompareMultiSelect(null);
                                              setActiveCompareSelect(null);
                                          }}
                                          className="inline-flex h-[38px] w-full items-center justify-start rounded-[8px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#cbd3df]"
                                      >
                                          <span className={filters.startDate ? 'text-[#20232a]' : 'text-[#9aa3af]'}>
                                              {filters.startDate ? formatCompareDateValue(filters.startDate) : 'MM/DD/YY'}
                                          </span>
                                      </button>
                                      <div className={`absolute left-0 top-full z-[90] mt-[8px] w-[280px] origin-top-left overflow-hidden rounded-[12px] border border-[#e3e7ee] bg-white p-[14px] shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                                          activeCompareCalendar?.group === group.key && activeCompareCalendar.field === 'startDate'
                                              ? 'max-h-[360px] scale-100 opacity-100'
                                              : 'pointer-events-none max-h-0 scale-[0.98] opacity-0'
                                      }`}>
                                          <div className="mb-[10px] flex items-center justify-between">
                                              <button
                                                  type="button"
                                                  onClick={() => setCompareCalendarViewDate(current => ({
                                                      ...current,
                                                      [group.key]: new Date(current[group.key].getFullYear(), current[group.key].getMonth() - 1, 1),
                                                  }))}
                                                  className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#313843] transition-colors hover:bg-[#f4f5f7]"
                                              >
                                                  <ChevronLeft className="h-[16px] w-[16px]" />
                                              </button>
                                              <div className="text-[14px] font-bold text-[#20232a]">
                                                  {compareCalendarViewDate[group.key].toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
                                              </div>
                                              <button
                                                  type="button"
                                                  onClick={() => setCompareCalendarViewDate(current => ({
                                                      ...current,
                                                      [group.key]: new Date(current[group.key].getFullYear(), current[group.key].getMonth() + 1, 1),
                                                  }))}
                                                  className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#313843] transition-colors hover:bg-[#f4f5f7]"
                                              >
                                                  <ChevronRight className="h-[16px] w-[16px]" />
                                              </button>
                                          </div>
                                          {renderCompareMiniCalendar(group.key, 'startDate', compareCalendarViewDate[group.key])}
                                      </div>
                                  </div>

                                  <div className="flex items-center text-[15px] font-medium text-[#313843]">{language === 'cn' ? '盈亏状态' : 'Trade P&L'}</div>
                                  <div className="relative" data-compare-field-root>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setActiveCompareSelect(current => current?.group === group.key && current.field === 'pnl' ? null : { group: group.key, field: 'pnl' });
                                              setActiveCompareMultiSelect(null);
                                              setActiveCompareCalendar(null);
                                          }}
                                          className="inline-flex h-[38px] w-full items-center justify-between rounded-[8px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#cbd3df]"
                                      >
                                          <span>{comparePnlOptions.find(option => option.id === filters.pnl)?.label}</span>
                                          <ChevronDown className={`h-[14px] w-[14px] text-[#111827] transition-transform ${activeCompareSelect?.group === group.key && activeCompareSelect.field === 'pnl' ? 'rotate-180' : ''}`} />
                                      </button>
                                      <div className={`absolute left-0 top-full z-[90] mt-[6px] w-full origin-top-left overflow-hidden rounded-[8px] border border-[#dfe4ec] bg-white p-[5px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                                          activeCompareSelect?.group === group.key && activeCompareSelect.field === 'pnl'
                                              ? 'max-h-[180px] scale-100 opacity-100'
                                              : 'pointer-events-none max-h-0 scale-[0.97] opacity-0'
                                      }`}>
                                          {comparePnlOptions.map(option => (
                                              <button
                                                  key={`${group.key}-pnl-${option.id}`}
                                                  type="button"
                                                  onClick={() => {
                                                      updateCompareDraftFilters(group.key, current => ({ ...current, pnl: option.id }));
                                                      setActiveCompareSelect(null);
                                                  }}
                                                  className={`block w-full rounded-[6px] px-[10px] py-[8px] text-left text-[13px] font-semibold transition-colors ${
                                                      filters.pnl === option.id ? 'bg-[#e8e4f4] text-[#303044]' : 'text-[#303844] hover:bg-[#f1f2f4]'
                                                  }`}
                                              >
                                                  {option.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="flex items-center text-[15px] font-medium text-[#313843]">{language === 'cn' ? '结束日期' : 'End date'}</div>
                                  <div className="relative" data-compare-field-root>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setActiveCompareCalendar(current => current?.group === group.key && current.field === 'endDate' ? null : { group: group.key, field: 'endDate' });
                                              setActiveCompareMultiSelect(null);
                                              setActiveCompareSelect(null);
                                          }}
                                          className="inline-flex h-[38px] w-full items-center justify-start rounded-[8px] border border-[#dfe4ec] bg-white px-[12px] text-[13px] font-medium text-[#20232a] transition-colors hover:border-[#cbd3df]"
                                      >
                                          <span className={filters.endDate ? 'text-[#20232a]' : 'text-[#9aa3af]'}>
                                              {filters.endDate ? formatCompareDateValue(filters.endDate) : 'MM/DD/YY'}
                                          </span>
                                      </button>
                                      <div className={`absolute left-0 top-full z-[90] mt-[8px] w-[280px] origin-top-left overflow-hidden rounded-[12px] border border-[#e3e7ee] bg-white p-[14px] shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition-[opacity,transform,max-height] duration-200 ease-out ${
                                          activeCompareCalendar?.group === group.key && activeCompareCalendar.field === 'endDate'
                                              ? 'max-h-[360px] scale-100 opacity-100'
                                              : 'pointer-events-none max-h-0 scale-[0.98] opacity-0'
                                      }`}>
                                          <div className="mb-[10px] flex items-center justify-between">
                                              <button
                                                  type="button"
                                                  onClick={() => setCompareCalendarViewDate(current => ({
                                                      ...current,
                                                      [group.key]: new Date(current[group.key].getFullYear(), current[group.key].getMonth() - 1, 1),
                                                  }))}
                                                  className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#313843] transition-colors hover:bg-[#f4f5f7]"
                                              >
                                                  <ChevronLeft className="h-[16px] w-[16px]" />
                                              </button>
                                              <div className="text-[14px] font-bold text-[#20232a]">
                                                  {compareCalendarViewDate[group.key].toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
                                              </div>
                                              <button
                                                  type="button"
                                                  onClick={() => setCompareCalendarViewDate(current => ({
                                                      ...current,
                                                      [group.key]: new Date(current[group.key].getFullYear(), current[group.key].getMonth() + 1, 1),
                                                  }))}
                                                  className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#313843] transition-colors hover:bg-[#f4f5f7]"
                                              >
                                                  <ChevronRight className="h-[16px] w-[16px]" />
                                              </button>
                                          </div>
                                          {renderCompareMiniCalendar(group.key, 'endDate', compareCalendarViewDate[group.key])}
                                      </div>
                                  </div>
                              </div>
                          </section>
                      );
                  })}
              </div>

              <div className="flex justify-end gap-[10px]">
                  <button
                      type="button"
                      onClick={resetCompareFilters}
                      className="inline-flex h-[38px] items-center rounded-[8px] border border-[#dfe4ec] bg-white px-[16px] text-[13px] font-semibold text-[#303844] transition-colors hover:border-[#cbd3df] hover:bg-[#fafbfc]"
                  >
                      {language === 'cn' ? '重置' : 'Reset'}
                  </button>
                  <button
                      type="button"
                      onClick={generateCompareReport}
                      className="inline-flex h-[38px] items-center rounded-[8px] bg-[#6b55cf] px-[16px] text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(107,85,207,0.24)] transition-colors hover:bg-[#5d48c3]"
                  >
                      {language === 'cn' ? '生成报告' : 'Generate Report'}
                  </button>
              </div>

              {compareHasGenerated && (
                  <>
                      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                          {([
                              { key: 'left' as const, title: 'Group #1', summary: compareSummaries.left },
                              { key: 'right' as const, title: 'Group #2', summary: compareSummaries.right },
                          ]).map(group => {
                              const rows = [
                                  [language === 'cn' ? '总盈亏' : 'Total P&L', formatSignedMoney(group.summary.totalPnl)],
                                  [language === 'cn' ? '平均每日成交额' : 'Average daily volume', group.summary.avgDailyVolume.toFixed(2)],
                                  [language === 'cn' ? '平均盈利交易' : 'Average winning trade', group.summary.avgWinningTrade === null ? 'N/A' : formatSignedMoney(group.summary.avgWinningTrade)],
                                  [language === 'cn' ? '平均亏损交易' : 'Average losing trade', group.summary.avgLosingTrade === null ? 'N/A' : formatSignedMoney(group.summary.avgLosingTrade)],
                                  [language === 'cn' ? '盈利交易数量' : 'Number of winning trades', group.summary.numberOfWinningTrades],
                                  [language === 'cn' ? '亏损交易数量' : 'Number of losing trades', group.summary.numberOfLosingTrades],
                                  [language === 'cn' ? '总佣金' : 'Total commissions', formatSignedMoney(group.summary.totalCommissions)],
                                  [language === 'cn' ? '最大连续盈利' : 'Max consecutive wins', group.summary.maxConsecutiveWins],
                                  [language === 'cn' ? '最大连续亏损' : 'Max consecutive losses', group.summary.maxConsecutiveLosses],
                              ];

                              return (
                                  <section key={`${group.key}-stats`} className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                                      <div className="border-b border-[#eceff3] px-[24px] py-[15px]">
                                          <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">
                                              {language === 'cn' ? `统计（${group.title}）` : `STATISTICS (${group.title.toUpperCase()})`}
                                          </h3>
                                          <div className="mt-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a919d]">
                                              {language === 'cn' ? '（全部日期）' : '(ALL DATES)'}
                                          </div>
                                      </div>
                                      <div>
                                          {rows.map(([label, value], index) => (
                                              <div
                                                  key={`${group.key}-${label}`}
                                                  className={`flex items-center justify-between gap-[18px] px-[24px] py-[11px] text-[13px] ${
                                                      index < rows.length - 1 ? 'border-b border-[#eceff3]' : ''
                                                  }`}
                                              >
                                                  <span className="font-semibold text-[#6b7280]">{label}</span>
                                                  <span className="font-semibold tabular-nums text-[#4d5560]">{value}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </section>
                              );
                          })}
                      </div>

                      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                          {([
                              { key: 'left' as const, title: 'Group #1', summary: compareSummaries.left },
                              { key: 'right' as const, title: 'Group #2', summary: compareSummaries.right },
                          ]).map(group => {
                              const winCount = group.summary.numberOfWinningTrades;
                              const lossCount = group.summary.numberOfLosingTrades;
                              const total = Math.max(1, winCount + lossCount);
                              const winPercent = (winCount / total) * 100;

                              return (
                                  <section key={`${group.key}-evaluation`} className="overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                                      <div className="border-b border-[#eceff3] px-[24px] py-[15px]">
                                          <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">
                                              {language === 'cn' ? `综合评估（${group.title}）` : `OVERALL EVALUATION (${group.title.toUpperCase()})`}
                                          </h3>
                                          <div className="mt-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a919d]">
                                              {language === 'cn' ? '（全部日期）' : '(ALL DATES)'}
                                          </div>
                                      </div>
                                      <div className="flex flex-col items-center justify-between gap-[24px] px-[24px] py-[18px] md:flex-row">
                                          <div className="relative flex h-[180px] w-[180px] items-center justify-center">
                                              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                                                  <circle cx="60" cy="60" r="44" fill="none" stroke="#edf1f5" strokeWidth="10" />
                                                  <circle
                                                      cx="60"
                                                      cy="60"
                                                      r="44"
                                                      fill="none"
                                                      stroke="#52c69a"
                                                      strokeWidth="10"
                                                      strokeLinecap="round"
                                                      strokeDasharray={`${winPercent} ${100 - winPercent}`}
                                                      pathLength={100}
                                                  />
                                                  <circle
                                                      cx="60"
                                                      cy="60"
                                                      r="44"
                                                      fill="none"
                                                      stroke="#ff6468"
                                                      strokeWidth="10"
                                                      strokeLinecap="round"
                                                      strokeDasharray={`${100 - winPercent} ${winPercent}`}
                                                      strokeDashoffset={-winPercent}
                                                      pathLength={100}
                                                  />
                                              </svg>
                                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                  <div className="text-[22px] font-bold text-[#52c69a]">{group.summary.winRate.toFixed(0)}<span className="ml-[2px] text-[12px]">%</span></div>
                                                  <div className="mt-[4px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#86d8b8]">
                                                      {language === 'cn' ? '胜率' : 'WINRATE'}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex flex-1 flex-col gap-[16px]">
                                              <div className="flex items-center gap-[12px]">
                                                  <span className="h-[22px] w-[22px] rounded-[5px] bg-[#52c69a]" />
                                                  <div>
                                                      <div className="text-[30px] font-bold leading-none text-[#2f3742]">{winCount}</div>
                                                      <div className="mt-[4px] text-[14px] font-medium text-[#7b828c]">{language === 'cn' ? '盈利' : 'winners'}</div>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-[12px]">
                                                  <span className="h-[22px] w-[22px] rounded-[5px] bg-[#ff6468]" />
                                                  <div>
                                                      <div className="text-[30px] font-bold leading-none text-[#2f3742]">{lossCount}</div>
                                                      <div className="mt-[4px] text-[14px] font-medium text-[#7b828c]">{language === 'cn' ? '亏损' : 'losers'}</div>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </section>
                              );
                          })}
                      </div>

                      <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-2">
                          {([
                              {
                                  key: 'left' as const,
                                  title: pnlDisplayMode === 'net'
                                      ? (language === 'cn' ? '每日净累计盈亏（Group #1）' : 'DAILY NET CUMULATIVE P&L (GROUP #1)')
                                      : (language === 'cn' ? '每日总累计盈亏（Group #1）' : 'DAILY GROSS CUMULATIVE P&L (GROUP #1)'),
                                  summary: compareSummaries.left,
                                  chartId: 'compare-left',
                              },
                              {
                                  key: 'right' as const,
                                  title: pnlDisplayMode === 'net'
                                      ? (language === 'cn' ? '每日净累计盈亏（Group #2）' : 'DAILY NET CUMULATIVE P&L (GROUP #2)')
                                      : (language === 'cn' ? '每日总累计盈亏（Group #2）' : 'DAILY GROSS CUMULATIVE P&L (GROUP #2)'),
                                  summary: compareSummaries.right,
                                  chartId: 'compare-right',
                              },
                          ]).map(group => (
                              <section key={`${group.key}-chart`} className="relative overflow-hidden rounded-[8px] bg-white shadow-none dark:bg-slate-900">
                                  <div className="flex items-center justify-between border-b border-[#eceff3] px-[24px] py-[15px]">
                                      <div className="flex items-center gap-[10px]">
                                          <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#2c3138] dark:text-white">{group.title}</h3>
                                          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a919d]">
                                              {language === 'cn' ? '（全部日期）' : '(ALL DATES)'}
                                          </span>
                                      </div>
                                      <OverviewInfoBadge />
                                  </div>
                                  <div className="h-[392px] px-[12px] pb-[12px] pt-[8px]">
                                      {group.summary.chartData.length === 0 ? (
                                          <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[#e4e7ec] bg-[#fafbfc] text-[14px] font-semibold text-[#8a919d]">
                                              {language === 'cn' ? '暂无可用图表数据' : 'No chart data available'}
                                          </div>
                                      ) : renderWinLossDetailedChart({
                                          chartId: group.chartId,
                                          data: group.summary.chartData,
                                          color: '#5d53d8',
                                          gradientStops: {
                                              start: group.summary.totalPnl >= 0 ? '#6bd1a4' : '#ff7b86',
                                              end: group.summary.totalPnl >= 0 ? '#eef8f4' : '#fff0f1',
                                          },
                                          title: pnlDisplayMode === 'net'
                                              ? (language === 'cn' ? '净盈亏 - 累计' : 'Net P&L - cumulative')
                                              : (language === 'cn' ? '总盈亏 - 累计' : 'Gross P&L - cumulative'),
                                          animate: shouldAnimateCompareCharts,
                                      })}
                                  </div>
                                  <ReportCardLoadingOverlay radius={8} />
                              </section>
                          ))}
                      </div>
                  </>
              )}
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
      {['options', 'wins_losses'].includes(activeTab) && (
           <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed text-slate-400">
               <Activity className="w-16 h-16 mb-4 opacity-20" />
               <p className="font-medium">This report view is coming soon.</p>
               <p className="text-sm mt-2 opacity-60">We are building this feature.</p>
           </div>
       )}

      <div className="hidden" aria-hidden="true">
          <CalendarView
              trades={trades}
              plans={plans}
              onSavePlan={onSavePlan}
              externalSelectedDay={reportCalendarSelectedDay}
              onExternalClose={() => setReportCalendarSelectedDay(null)}
              onOpenTradeReview={onOpenTradeReview}
          />
      </div>
    </div>
  );
};

const ReportsWithBoundary: React.FC<ReportsProps> = (props) => {
  const { language } = useLanguage();

  return (
      <ReportsErrorBoundary language={language}>
          <Reports {...props} />
      </ReportsErrorBoundary>
  );
};

export default ReportsWithBoundary;
