
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DailyPlan, Notification, Trade, TradeStatus, Direction, Report } from '../types';
import { useLanguage } from '../LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ComposedChart, Line, ReferenceLine, Legend, LineChart
} from 'recharts';
import { Filter, Calendar as CalendarIcon, BarChart2, Clock, Calculator, Activity, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Sparkles, FileText, Loader2, Bot, Lock, CalendarCheck, Coins, Hash, Hourglass, TrendingDown, Star, Info, ChevronDown, ChevronLeft, ChevronRight, Download, Trash2, Eye, History, MoreVertical, Settings, Globe2, Repeat2, BookOpen, FileBarChart2, GripVertical, X, Search } from 'lucide-react';
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

type SummaryMetricId = typeof ALL_SUMMARY_METRIC_IDS[number];

const getDefaultSummaryLayout = () => [...DEFAULT_SUMMARY_METRIC_IDS];

const normalizeSummaryLayout = (ids: unknown): SummaryMetricId[] => {
  if (!Array.isArray(ids)) return getDefaultSummaryLayout();

  const allowedIds = new Set<string>(ALL_SUMMARY_METRIC_IDS);
  const normalized = ids.filter((id): id is SummaryMetricId => typeof id === 'string' && allowedIds.has(id));
  const deduped = Array.from(new Set(normalized));

  return deduped.length > 0 ? deduped : getDefaultSummaryLayout();
};

const Reports: React.FC<ReportsProps> = ({ trades, accountSize = 10000, plans = [], isDataLoading = false, onPushNotification, onSavePlan, disciplineHistory = [], riskSettings = null }) => {
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
  
  // Calendar Report State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [previousReports, setPreviousReports] = useState<Report[]>([]);

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
      const grouped: Record<string, { pnl: number; count: number; wins: number; losses: number; winPnl: number; lossPnl: number; volume: number }> = {};

      trades.forEach(t => {
          if (!t.entryDate) return;
          const date = new Date(t.entryDate).toLocaleDateString('en-CA');
          if (!grouped[date]) grouped[date] = { pnl: 0, count: 0, wins: 0, losses: 0, winPnl: 0, lossPnl: 0, volume: 0 };

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
      });

      let cumulativePnl = 0;
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
                  winRate: value.count > 0 ? (value.wins / value.count) * 100 : 0,
                  avgDailyWinLoss: Number(avgDailyWinLoss.toFixed(2)),
                  hasAvgDailyWinLoss,
                  volume: value.volume,
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
  function formatChartDateLabel(date: string) {
      const d = new Date(`${date}T00:00:00`);
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

  const ChartCard = ({
      title,
      metricLabel,
      children,
      accent = 'text-indigo-500',
      rightControl = 'Day',
      featured = false,
      summaryValue,
      summaryTone = 'neutral',
  }: {
      title: string;
      metricLabel: string;
      children: React.ReactNode;
      accent?: string;
      rightControl?: string;
      featured?: boolean;
      summaryValue?: string;
      summaryTone?: 'neutral' | 'good' | 'bad';
  }) => (
      <div className={`${featured ? 'overflow-hidden rounded-[8px] bg-white dark:bg-slate-900 shadow-none' : reportPanelClass} relative overflow-hidden`}>
          <div className={`${featured ? 'h-[64px] px-[10px]' : 'h-14 px-4 border-b border-slate-100 dark:border-slate-800'} flex items-center justify-between bg-white dark:bg-slate-900`}>
              <div className={`${featured ? 'gap-[12px]' : 'gap-3'} flex items-center min-w-0`}>
                  <div className={`${featured ? 'h-[32px] w-[32px] rounded-[7px] border-[#dfe4ec] bg-white text-[#5f636b]' : 'w-8 h-8 rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'} border flex items-center justify-center`}>
                      <BarChart2 className={`w-4 h-4 ${accent}`} />
                  </div>
                  <button className={`${featured ? 'relative h-[32px] w-[154px] overflow-hidden rounded-[7px] border-[#dfe4ec] bg-white pl-[18px] pr-[9px] text-[13px] font-medium text-[#20232a]' : 'h-8 min-w-0 max-w-[220px] border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border transition-colors`}>
                      {featured && (
                          <span className="pointer-events-none absolute left-0 top-0 h-full w-[5px]">
                              <span className="absolute left-0 top-0 h-[15px] w-[4px] rounded-tl-[7px] bg-[#35cfa2]" />
                              <span className="absolute left-0 bottom-0 h-[15px] w-[4px] rounded-bl-[7px] bg-[#ff6468]" />
                          </span>
                      )}
                      <span className="truncate">{metricLabel}</span>
                      <ChevronDown className={`${featured ? 'h-[15px] w-[15px] text-[#111827]' : 'w-3.5 h-3.5 text-slate-400'} flex-shrink-0`} />
                  </button>
                  <button className={`${featured ? 'text-[14px] font-semibold text-[#5b45b6]' : 'text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'} hidden sm:inline-flex`}>
                      + {language === 'cn' ? '添加指标' : 'Add metric'}
                  </button>
              </div>
              <div className={`${featured ? 'gap-[8px]' : 'gap-2'} flex items-center`}>
                  <button className={`${featured ? 'h-[32px] w-[100px] rounded-[7px] border-[#4f2db8] px-[12px] text-[14px] font-medium text-[#1f2933]' : 'h-8 border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-between gap-2 border bg-white dark:bg-slate-900 transition-colors`}>
                      {rightControl}
                      <ChevronDown className={`${featured ? 'h-[15px] w-[15px] text-black' : 'w-3.5 h-3.5 text-slate-400'}`} />
                  </button>
                  <button className={`${featured ? 'h-[32px] w-[36px] rounded-[7px] border-[#dfe4ec] text-[#5f636b]' : 'h-8 w-8 rounded-md border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'} inline-flex items-center justify-center border bg-white dark:bg-slate-900 transition-colors`}>
                      <MoreVertical className={`${featured ? 'h-[18px] w-[18px]' : 'w-4 h-4'}`} />
                  </button>
              </div>
          </div>
          <div className={`${featured ? 'px-[10px] pb-[12px]' : 'px-4 pt-4'}`}>
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

  const REPORT_TABS = [
      { id: 'performance', label: language === 'cn' ? '表现' : 'Performance', icon: Activity, isNew: true },
      { id: 'overview', label: language === 'cn' ? '概览' : 'Overview', icon: Globe2 },
      { id: 'detailed', label: language === 'cn' ? '详细报表' : 'Reports', icon: FileBarChart2, hasMenu: true },
      { id: 'compare', label: language === 'cn' ? '对比' : 'Compare', icon: Repeat2 },
      { id: 'calendar', label: language === 'cn' ? '日历' : 'Calendar', icon: CalendarIcon },
      { id: 'ai', label: language === 'cn' ? '复盘洞察' : 'Recaps & Insights', icon: FileText },
  ];

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

  const detailedFilterOptions = [
      { id: 'DAYS', label: t.reports.filters.days },
      { id: 'WEEKS', label: t.reports.filters.weeks },
      { id: 'MONTHS', label: t.reports.filters.months },
      { id: 'TIME', label: t.reports.filters.time },
      { id: 'TRADE DURATION', label: t.reports.filters.duration },
      { id: 'PRICE', label: t.reports.filters.price },
      { id: 'VOLUME', label: t.reports.filters.volume },
      { id: 'INSTRUMENT', label: t.reports.filters.instrument },
      { id: 'SECTOR', label: t.reports.filters.sector },
      { id: 'SETUPS', label: t.reports.filters.setups },
      { id: 'MISTAKES', label: t.reports.filters.mistakes },
      { id: 'TAGS', label: t.reports.filters.tags },
      { id: 'OTHER', label: t.reports.filters.other },
  ];

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
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                {t.reports.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
                <button className={reportControlClass}>
                    <Coins className="w-4 h-4 text-indigo-400" />
                    USD
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className={reportControlClass}>
                    <Filter className="w-4 h-4 text-indigo-400" />
                    {language === 'cn' ? '筛选' : 'Filters'}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className={reportControlClass}>
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                    {language === 'cn' ? '日期范围' : 'Date range'}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className={reportControlClass}>
                    <Hash className="w-4 h-4 text-indigo-400" />
                    {language === 'cn' ? '所有账户' : 'All accounts'}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
            </div>
        </div>
        
        {/* Navigation Bar */}
        <div className="flex min-h-[52px] items-center justify-between gap-4 overflow-x-auto border-b border-slate-200 dark:border-slate-800 no-scrollbar">
            <div className="flex items-center gap-[28px]">
                {REPORT_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group relative inline-flex h-[52px] items-center gap-[9px] whitespace-nowrap border-b-2 text-[14px] font-semibold transition-colors ${
                                isActive
                                    ? 'border-[#5b45d6] text-[#5b45d6] dark:text-indigo-400'
                                    : 'border-transparent text-[#5f6875] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#5b45d6]' : 'text-[#68717d] group-hover:text-slate-800 dark:text-slate-400'}`} />
                            <span>{tab.label}</span>
                            {tab.isNew && (
                                <span className="rounded-[3px] bg-[#e8ebf1] px-[5px] py-[2px] text-[10px] font-bold leading-none text-[#536070]">
                                    NEW
                                </span>
                            )}
                            {tab.hasMenu && (
                                <ChevronDown className="h-[13px] w-[13px] text-[#68717d]" />
                            )}
                        </button>
                    );
                })}
            </div>
            <button className="hidden shrink-0 items-center gap-2 text-[14px] font-medium text-[#5f6875] transition-colors hover:text-[#5b45d6] xl:inline-flex">
                <BookOpen className="h-[17px] w-[17px]" />
                {language === 'cn' ? '阅读指南' : 'Read guide'}
            </button>
        </div>
      </div>

      {/* --- PERFORMANCE TAB --- */}
      {activeTab === 'performance' && (
          <div className="space-y-5 animate-fade-in">
              <div className="flex justify-end gap-2">
                  <button className={reportControlClass}>
                      NET P&L
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button className={reportControlClass}>
                      <Download className="w-4 h-4" />
                      {language === 'cn' ? '导出 PDF' : 'Export PDF'}
                  </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-[10px]">
                  <ChartCard
                      title={language === 'cn' ? '累计净盈亏' : 'Net P&L cumulative'}
                      metricLabel={language === 'cn' ? '净盈亏 - 累计' : 'Net P&L - cumulative'}
                      accent="text-[#5f636b]"
                      rightControl={language === 'cn' ? '日' : 'Day'}
                      featured
                  >
                      {!isDataLoading && performanceDailyData.length === 0 ? (
                          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                              {language === 'cn' ? '暂无交易数据' : 'No trade data yet'}
                          </div>
                      ) : (
                          <div className="relative h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={performancePnlDisplayData} margin={{ top: 8, right: 10, left: 5, bottom: 42 }}>
                                      <defs>
                                          <linearGradient id="performancePnlFillPremium" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor="#ff6468" stopOpacity={isPnlTrendingDown ? 0.04 : 0.58} />
                                              <stop offset="42%" stopColor="#ff6468" stopOpacity={isPnlTrendingDown ? 0.12 : 0.18} />
                                              <stop offset="100%" stopColor="#ff6468" stopOpacity={isPnlTrendingDown ? 0.58 : 0.04} />
                                          </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#dfe5eb" strokeOpacity={0.74} />
                                      <XAxis
                                          dataKey="label"
                                          ticks={performancePnlXAxisTicks}
                                          tick={{ fontSize: 12, fill: '#1f2933', fontWeight: 400 }}
                                          axisLine={false}
                                          tickLine={false}
                                          interval={0}
                                          minTickGap={22}
                                          dy={15}
                                      />
                                      <YAxis
                                          tick={{ fontSize: 12, fill: '#69717b', fontWeight: 400 }}
                                          axisLine={false}
                                          tickLine={false}
                                          width={58}
                                          tickFormatter={(value: number) => formatMoney(value, true)}
                                      />
                                      <Tooltip
                                          cursor={{ stroke: '#ff6468', strokeWidth: 1, strokeDasharray: '3 3' }}
                                          content={<PnlTooltip />}
                                      />
                                      <Area
                                          type="monotone"
                                          dataKey="cumulativePnl"
                                          stroke="#ff6468"
                                          strokeWidth={2}
                                          fill="url(#performancePnlFillPremium)"
                                          dot={{ r: 2.4, fill: '#ff6468', stroke: '#ff6468', strokeWidth: 1 }}
                                          isAnimationActive={false}
                                          activeDot={{
                                              r: 5,
                                              fill: '#ff6468',
                                              stroke: '#ffffff',
                                              strokeWidth: 2,
                                          }}
                                      />
                                  </AreaChart>
                              </ResponsiveContainer>
                              <div className="absolute bottom-[6px] left-1/2 flex -translate-x-1/2 items-center gap-[7px] text-[14px] font-medium text-[#666b72]">
                                  <span className="h-[14px] w-[14px] overflow-hidden rounded-full">
                                      <span className="block h-1/2 bg-[#39c29a]" />
                                      <span className="block h-1/2 bg-[#ff6468]" />
                                  </span>
                                  <span>Net P&L</span>
                              </div>
                          </div>
                      )}
                  </ChartCard>

                  <ChartCard
                      title={language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss'}
                      metricLabel={language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss'}
                      accent="text-emerald-500"
                      rightControl={language === 'cn' ? '日' : 'Day'}
                      featured
                  >
                      {!isDataLoading && avgDailyWinLossDisplayData.length === 0 ? (
                          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                              {language === 'cn' ? '暂无可计算的盈亏比数据' : 'No win/loss ratio data yet'}
                          </div>
                      ) : (
                          <div className="relative h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={avgDailyWinLossDisplayData} margin={{ top: 8, right: 10, left: 5, bottom: 42 }} barCategoryGap="48%">
                                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#dfe5eb" strokeOpacity={0.74} />
                                      <XAxis
                                          dataKey="label"
                                          ticks={avgDailyWinLossTicks}
                                          tick={{ fontSize: 12, fill: '#1f2933', fontWeight: 400 }}
                                          axisLine={false}
                                          tickLine={false}
                                          interval={0}
                                          minTickGap={22}
                                          dy={15}
                                      />
                                      <YAxis
                                          tick={{ fontSize: 12, fill: '#69717b', fontWeight: 400 }}
                                          axisLine={false}
                                          tickLine={false}
                                          width={50}
                                          domain={[0, (dataMax: number) => Math.max(dataMax * 1.18, 0.2)]}
                                          tickFormatter={(value: number) => Number(value).toFixed(value < 1 ? 2 : 0).replace(/\.?0+$/, '')}
                                      />
                                      <Tooltip cursor={{ fill: 'rgba(85, 195, 158, 0.07)' }} content={<WinLossTooltip />} />
                                      <Bar dataKey="avgDailyWinLoss" fill="#55c39e" radius={[4, 4, 0, 0]} barSize={36} maxBarSize={42} isAnimationActive={false} />
                                  </BarChart>
                              </ResponsiveContainer>
                              <div className="absolute bottom-[6px] left-1/2 flex -translate-x-1/2 items-center gap-[7px] text-[14px] font-medium text-[#666b72]">
                                  <span className="h-[14px] w-[14px] rounded-full bg-[#55c39e]" />
                                  <span>{language === 'cn' ? '平均每日盈亏比' : 'Avg daily win/loss'}</span>
                              </div>
                          </div>
                      )}
                  </ChartCard>
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
                      {summaryTab === 'summary' && isSummaryEditing ? (
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
                              onClick={startSummaryEditing}
                              className="h-[32px] w-[32px] inline-flex items-center justify-center rounded-[7px] border border-[#dfe4ec] bg-white text-[#1f2933] transition-colors hover:border-[#c9d0dc] hover:text-[#5b45d6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              aria-label={language === 'cn' ? '编辑汇总模块' : 'Edit summary modules'}
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
                                                  <div className="absolute bottom-full right-0 z-40 mb-[10px] flex max-h-[390px] w-[320px] flex-col overflow-hidden rounded-[10px] border border-[#e2e6ec] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
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

                                                                      {isExpanded && (
                                                                          <div className="pb-[6px]">
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
                                                                      )}
                                                                  </div>
                                                              );
                                                          }) : (
                                                              <div className="px-[4px] py-[18px] text-[13px] font-medium text-[#69717b] dark:text-slate-400">
                                                                  {language === 'cn' ? '没有匹配的指标' : 'No matching metrics'}
                                                              </div>
                                                          )}
                                                      </div>

                                                      <div className="border-t border-[#e5e7eb] px-[12px] py-[11px]">
                                                          <label className="flex cursor-pointer items-center gap-[10px] text-[14px] font-semibold text-[#20232a] dark:text-slate-100">
                                                              <button
                                                                  type="button"
                                                                  onClick={() => setShowMetricDifference(value => !value)}
                                                                  className={`relative h-[26px] w-[46px] rounded-full transition-colors ${showMetricDifference ? 'bg-[#5b45d6]' : 'bg-[#e2e4e8]'}`}
                                                                  aria-pressed={showMetricDifference}
                                                              >
                                                                  <span className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform ${showMetricDifference ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                                                              </button>
                                                              {language === 'cn' ? '显示差值' : 'Show difference'}
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
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                              <thead className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                      <th className="px-5 py-3 text-left font-semibold">{language === 'cn' ? '日期' : 'Date'}</th>
                                      <th className="px-5 py-3 text-right font-semibold">Net P&L</th>
                                      <th className="px-5 py-3 text-right font-semibold">{language === 'cn' ? '胜率' : 'Win %'}</th>
                                      <th className="px-5 py-3 text-right font-semibold">{language === 'cn' ? '交易数' : 'Trades'}</th>
                                      <th className="px-5 py-3 text-right font-semibold">{language === 'cn' ? '交易量' : 'Volume'}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {performanceDailyData.map(row => (
                                      <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-200">{row.date}</td>
                                          <td className={`px-5 py-3 text-right font-semibold tabular-nums ${row.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatSignedMoney(row.pnl)}</td>
                                          <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.winRate.toFixed(1)}%</td>
                                          <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.count}</td>
                                          <td className="px-5 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{row.volume.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {summaryTab === 'trades' && (
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                              <thead className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                      <th className="px-5 py-3 text-left font-semibold">{language === 'cn' ? '品种' : 'Symbol'}</th>
                                      <th className="px-5 py-3 text-left font-semibold">{language === 'cn' ? '日期' : 'Date'}</th>
                                      <th className="px-5 py-3 text-left font-semibold">{language === 'cn' ? '方向' : 'Direction'}</th>
                                      <th className="px-5 py-3 text-right font-semibold">Net P&L</th>
                                      <th className="px-5 py-3 text-right font-semibold">R</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {[...trades]
                                      .filter(t => t.status !== TradeStatus.OPEN)
                                      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
                                      .slice(0, 12)
                                      .map(trade => {
                                          const net = trade.pnl - trade.fees;
                                          const realizedR = trade.riskAmount && trade.riskAmount > 0 ? net / trade.riskAmount : null;
                                          return (
                                              <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{trade.symbol}</td>
                                                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{new Date(trade.entryDate).toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US')}</td>
                                                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{trade.direction}</td>
                                                  <td className={`px-5 py-3 text-right font-semibold tabular-nums ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatSignedMoney(net)}</td>
                                                  <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{realizedR === null ? '--' : `${realizedR.toFixed(2)}R`}</td>
                                              </tr>
                                          );
                                      })}
                              </tbody>
                          </table>
                      </div>
                  )}
                  <ReportCardLoadingOverlay radius={8} />
              </div>
          </div>
      )}

      {/* --- OVERVIEW TAB --- */}
      {stats && activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.reports.stats.bestMonth}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-500 font-mono">${stats.bestMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{t.reports.stats.peakPerformance}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.reports.stats.lowestMonth}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-rose-500 font-mono">${stats.lowestMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{t.reports.stats.maxDrawdown}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.reports.stats.avgMonth}</p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black font-mono ${stats.avgMonth >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-500'}`}>${stats.avgMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{t.reports.stats.consistentBaseline}</p>
                </div>
            </div>

            {/* Detailed Stats Grid (TradeZella Style) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Hash className="w-4 h-4 text-indigo-500" /> {t.reports.stats.yourStats}
                    </h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
                    <div className="flex flex-col">
                        <DataRow label={t.reports.stats.totalPnl} value={`$${stats.netPnl.toLocaleString(undefined, {minimumFractionDigits: 2})}`} colorClass={stats.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                        <DataRow label={t.reports.stats.avgDailyVol} value={`$${(stats.totalVolume / (stats.totalDays || 1)).toLocaleString(undefined, {minimumFractionDigits: 0})}`} />
                        <DataRow label={t.reports.stats.avgWin} value={`$${stats.avgWin.toFixed(2)}`} colorClass="text-emerald-600 dark:text-emerald-400" />
                        <DataRow label={t.reports.stats.avgLoss} value={`$${stats.avgLoss.toFixed(2)}`} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.totalTrades} value={stats.totalTrades} />
                        <DataRow label={t.reports.stats.winCount} value={stats.winCount} colorClass="text-emerald-600 dark:text-emerald-400" />
                        <DataRow label={t.reports.stats.lossCount} value={stats.lossCount} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.beCount} value={stats.beCount} />
                        <DataRow label={t.reports.stats.maxConWins} value={stats.maxConWins} colorClass="text-emerald-600 dark:text-emerald-400" />
                        <DataRow label={t.reports.stats.maxConLoss} value={stats.maxConLoss} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.commissions} value={`$${stats.totalFees.toFixed(2)}`} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.totalSwap} value="$0.00" />
                        <DataRow label={t.reports.stats.largestProfit} value={`$${stats.largestProfit.toFixed(2)}`} colorClass="text-emerald-600 dark:text-emerald-400" />
                        <DataRow label={t.reports.stats.largestLoss} value={`$${stats.largestLoss.toFixed(2)}`} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.avgHoldAll} value={formatDuration(stats.avgHoldAll)} />
                        <DataRow label={t.reports.stats.avgHoldWin} value={formatDuration(stats.avgHoldWin)} />
                    </div>
                    <div className="flex flex-col">
                        <DataRow label={t.reports.stats.avgHoldLoss} value={formatDuration(stats.avgHoldLoss)} />
                        <DataRow label={t.reports.stats.avgHoldScratch} value={formatDuration(stats.avgHoldScratch)} />
                        <DataRow label={t.reports.stats.avgTradePnl} value={`$${stats.avgTradePnl.toFixed(2)}`} colorClass={stats.avgTradePnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                        <DataRow label={t.reports.stats.profitFactor} value={stats.profitFactor.toFixed(2)} colorClass="text-indigo-600 dark:text-indigo-400" />
                        <DataRow label={t.reports.stats.openTrades} value={stats.openCount} />
                        <DataRow label={t.reports.stats.totalDays} value={stats.totalDays} />
                        <DataRow label={t.reports.stats.winningDays} value={stats.winningDays} colorClass="text-emerald-600 dark:text-emerald-400" />
                        <DataRow label={t.reports.stats.losingDays} value={stats.losingDays} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.beDays} value={stats.beDays} />
                        <DataRow label={t.reports.stats.loggedDays} value={stats.totalDays} />
                        <DataRow label={t.reports.stats.maxConWinDays} value={stats.maxConWinDays} colorClass="text-emerald-600 dark:text-emerald-400" />
                        <DataRow label={t.reports.stats.maxConLossDays} value={stats.maxConLossDays} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.avgDailyPnl} value={`$${stats.avgDailyPnl.toFixed(2)}`} colorClass={stats.avgDailyPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                        <DataRow label={t.reports.stats.largestLosingDay} value={`$${stats.largestLosingDay.toFixed(2)}`} colorClass="text-rose-600 dark:text-rose-400" />
                        <DataRow label={t.reports.stats.avgPlannedR} value="--" />
                        <DataRow label={t.reports.stats.avgRealizedR} value={`${stats.avgRealizedR.toFixed(2)}R`} />
                        <DataRow label={t.reports.stats.expectancy} value={`$${stats.expectancy.toFixed(2)}`} colorClass={stats.expectancy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                    </div>
                </div>
            </div>

            {/* Visual Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        {t.reports.charts.equityTitle}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis dataKey="date" hide />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Equity']} labelStyle={{ color: '#94a3b8' }} />
                                <Area type="monotone" dataKey="equity" stroke="#6366f1" fillOpacity={1} fill="url(#colorEquity)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-emerald-500" />
                        {t.reports.charts.dailyPnlTitle}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis dataKey="date" hide />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']} labelStyle={{ color: '#94a3b8' }} />
                                <ReferenceLine y={0} stroke="#94a3b8" />
                                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                                    {dailyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
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
                                  <th className="px-6 py-4">{detailedFilter === 'TRADE DURATION' ? t.reports.filters.duration : detailedFilter === 'TIME' ? t.reports.filters.time : detailedFilter === 'DAYS' ? t.reports.filters.days : detailedFilter}</th>
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
