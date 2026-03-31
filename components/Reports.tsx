
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DailyPlan, Notification, Trade, TradeStatus, Direction, Report } from '../types';
import { useLanguage } from '../LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ComposedChart, Line, ReferenceLine, Legend, LineChart
} from 'recharts';
import { Filter, Calendar as CalendarIcon, BarChart2, Clock, Calculator, Activity, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Sparkles, FileText, Loader2, Bot, Lock, CalendarCheck, Coins, Hash, Hourglass, TrendingDown, Star, Info, ChevronDown, ChevronLeft, ChevronRight, Download, Trash2, Eye, History } from 'lucide-react';
import FeatureGate from './FeatureGate';
import { generatePeriodicReport } from '../services/geminiService';
import { supabase, saveReport, fetchReports, deleteReport } from '../supabaseClient';

interface ReportsProps {
  trades: Trade[];
  accountSize?: number;
  plans?: DailyPlan[];
  onPushNotification?: (notification: Notification) => void;
  onSavePlan?: (plan: DailyPlan) => void;
  disciplineHistory?: any[];
  riskSettings?: any;
}

const Reports: React.FC<ReportsProps> = ({ trades, accountSize = 10000, plans = [], onPushNotification, onSavePlan, disciplineHistory = [], riskSettings = null }) => {
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

  // Default to 'detailed' to show the requested view immediately, or stick to 'overview'
  const [activeTab, setActiveTab] = useState<string>('detailed');
  // Sub-filter for Detailed Tab
  const [detailedFilter, setDetailedFilter] = useState<string>('DAYS');
  // State for Time Interval Selection
  const [timeInterval, setTimeInterval] = useState<string>('1 Hour');
  // Risk Tab Sub-filter
  const [riskFilter, setRiskFilter] = useState<'R-MULTIPLE' | 'POSITION SIZE'>('R-MULTIPLE');
  
  // Calendar Report State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
      const fetchUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              setCurrentUserId(user.id);
              loadReports(user.id);
          }
      };
      fetchUser();

      // 每 5 秒自动刷新报告列表（检查 pending 状态）
      const interval = setInterval(() => {
          if (currentUserId) loadReports(currentUserId);
      }, 5000);

      return () => clearInterval(interval);
  }, [currentUserId]);

  const loadReports = async (userId: string) => {
      setIsLoadingReports(true);
      try {
          const reports = await fetchReports(userId);
          setSavedReports(reports);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingReports(false);
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
          s.netPnl += (t.pnl - t.fees);
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
              bucket.netPnl += (t.pnl - t.fees);
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
              b.netPnl += (t.pnl - t.fees);
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
              const netPnl = t.pnl - t.fees;
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
              const net = t.pnl - t.fees;
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
      const netPnl = grossProfit + grossLoss - totalFees;
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

      // --- Daily Stats ---
      const dailyPnls = dailyData.map(d => d.pnl);
      const winningDays = dailyPnls.filter(p => p > 0).length;
      const losingDays = dailyPnls.filter(p => p < 0).length;
      const beDays = dailyPnls.filter(p => p === 0).length;
      const totalDays = dailyData.length;
      const avgDailyPnl = totalDays > 0 ? netPnl / totalDays : 0;
      const largestLosingDay = dailyPnls.length > 0 ? Math.min(...dailyPnls) : 0; 

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
          avgRealizedR,
          bestMonth,
          lowestMonth,
          avgMonth,
          totalVolume
      };
  }, [trades, dailyData]);

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

          // 显示提示
          if (onPushNotification) {
              onPushNotification({
                  id: Date.now().toString(),
                  type: 'info',
                  message: language === 'cn'
                      ? '报告正在后台生成，您可以继续浏览其他页面'
                      : 'Report is generating in background, you can continue browsing',
                  timestamp: new Date().toISOString()
              });
          }

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

  const REPORT_TABS = [
      { id: 'overview', label: t.reports.tabs.overview },
      { id: 'detailed', label: t.reports.tabs.detailed },
      { id: 'options', label: t.reports.tabs.options },
      { id: 'risk', label: t.reports.tabs.risk },
      { id: 'wins_losses', label: t.reports.tabs.winsLosses },
      { id: 'compare', label: t.reports.tabs.compare },
      { id: 'calendar', label: t.reports.tabs.calendar },
      { id: 'ai', label: t.reports.tabs.ai }
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-500" />
            {t.reports.title}
        </h2>
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-0 no-scrollbar">
            {REPORT_TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        px-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

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
                      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/30">
                          {isGeneratingReport ? (
                              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
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
                              <div className="space-y-8">
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

                                  {/* Report History */}
                                  {savedReports.length > 0 && (
                                      <div className="max-w-4xl mx-auto">
                                          <div className="flex items-center gap-2 mb-4">
                                              <History className="w-5 h-5 text-slate-500" />
                                              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                                  {language === 'cn' ? '历史报告' : 'Report History'}
                                              </h4>
                                              <span className="text-sm text-slate-400">({savedReports.length})</span>
                                          </div>
                                          <div className="grid gap-3">
                                              {savedReports.map(report => renderReportCard(report))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ) : (
                              <div className="space-y-8">
                                  {/* Empty State */}
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

                                  {/* Report History */}
                                  {savedReports.length > 0 && (
                                      <div className="max-w-4xl mx-auto">
                                          <div className="flex items-center gap-2 mb-4">
                                              <History className="w-5 h-5 text-slate-500" />
                                              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                                  {language === 'cn' ? '历史报告' : 'Report History'}
                                              </h4>
                                              <span className="text-sm text-slate-400">({savedReports.length})</span>
                                          </div>
                                          <div className="grid gap-3">
                                              {savedReports.map(report => renderReportCard(report))}
                                          </div>
                                      </div>
                                  )}
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
