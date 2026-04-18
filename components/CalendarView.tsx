
import React, { useMemo, useState, useEffect } from 'react';
import { DailyPlan, Trade, Direction } from '../types';
import { ChevronLeft, ChevronRight, X, Save, Edit3, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface CalendarViewProps {
  trades: Trade[];
  plans?: DailyPlan[];
  onSavePlan?: (plan: DailyPlan) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ trades, plans, onSavePlan }) => {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  // Month stats for toolbar pills
  const monthStats = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthTrades = trades.filter(tr => {
      const d = new Date(tr.entryDate);
      return d >= start && d <= end;
    });
    const totalPnl = monthTrades.reduce((acc, tr) => acc + (tr.pnl - tr.fees), 0);
    // Count unique trading days
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
      let weekPnl = 0;
      let weekCount = 0;
      const daySet = new Set<string>();
      let containsToday = false;
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

  // Day data with win rate
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

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
    setReviewText(existingPlan ? stripHtml(existingPlan.content) : '');
    setShowReview(false);
    setSelectedDay(date);
  };

  const handleSaveReview = () => {
    if (!selectedDay || !onSavePlan) return;
    const yyyy = selectedDay.getFullYear();
    const mm = String(selectedDay.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDay.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
    const formattedContent = reviewText.split('\n').filter(line => line.trim() !== '').map(line => `<p>${line}</p>`).join('');
    const newPlan: DailyPlan = {
      id: existingPlan ? existingPlan.id : Date.now().toString(),
      date: dateKey,
      title: `Daily Review - ${dateKey}`,
      folder: 'daily-journal',
      content: formattedContent,
      focusTickers: existingPlan?.focusTickers || [],
      linkedTradeIds: existingPlan?.linkedTradeIds || []
    };
    onSavePlan(newPlan);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Selected day detail stats (for modal)
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
    return sorted.map((tr, i) => {
      cum += tr.pnl - tr.fees;
      return { i: i + 1, pnl: parseFloat(cum.toFixed(2)) };
    });
  }, [selectedDay, selectedDayTrades]);

  useEffect(() => {
    if (!selectedDay) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedDay(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDay]);

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

  // Build calendar cells: prev-month blanks + current month days + next-month blanks
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

      // Determine cell style
      let bgStyle = '#F3F4F6'; // no-trade day —明显浅灰
      let textClass = 'text-[#9CA3AF] dark:text-slate-500';
      let pnlTextClass = 'text-[#9CA3AF]';
      let borderClass = '';

      if (data && data.count > 0) {
        if (data.netPnl > 0) {
          bgStyle = '#DCFCE7';
          textClass = 'text-[#15803D] dark:text-emerald-400';
          pnlTextClass = 'text-[#15803D] dark:text-emerald-400';
        } else if (data.netPnl < 0) {
          bgStyle = '#FEE2E2';
          textClass = 'text-[#DC2626] dark:text-rose-400';
          pnlTextClass = 'text-[#DC2626] dark:text-rose-400';
        } else {
          bgStyle = '#FEF3C7';
          textClass = 'text-[#92400E] dark:text-amber-400';
          pnlTextClass = 'text-[#92400E] dark:text-amber-400';
        }
      }

      if (isToday) borderClass = 'ring-2 ring-[#3B82F6] ring-inset';

      const ariaLabel = data && data.count > 0
        ? `${data.netPnl >= 0 ? '盈利' : '亏损'} ${Math.abs(data.netPnl).toFixed(2)} 美元，${data.count} 笔交易，胜率 ${data.winRate.toFixed(0)}%`
        : undefined;

      return (
        <div
          key={d}
          onClick={() => handleDayClick(d)}
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          className={`rounded-[8px] cursor-pointer relative ${borderClass}`}
          style={{ minHeight: 130, background: bgStyle, transition: 'all 150ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          {/* Day number — absolute top-right */}
          <span className={`absolute text-[13px] font-medium ${textClass}`} style={{ top: 12, right: 14 }}>{d}</span>

          {data && data.count > 0 && (
            <>
              {/* P&L + meta — absolute bottom-right */}
              <div className="absolute flex flex-col items-end" style={{ bottom: 12, right: 14, lineHeight: 1.5 }}>
                <span className={`text-[15px] font-semibold ${pnlTextClass}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.netPnl >= 0 ? '+' : '\u2212'}${Math.abs(data.netPnl).toFixed(2)}
                </span>
                <span className="text-[12px] font-normal" style={{ color: '#6B7280' }}>
                  {data.count} {cal.trades || 'trades'}
                </span>
                <span className="text-[12px] font-normal" style={{ color: '#9CA3AF' }}>
                  {data.winRate.toFixed(1)}%
                </span>
              </div>
              {/* Marker dot */}
              <div
                className={`absolute rounded-full ${data.netPnl >= 0 ? 'bg-[#15803D]' : 'bg-[#DC2626]'}`}
                style={{ width: 5, height: 5, bottom: 6, right: 6 }}
              />
            </>
          )}

          {/* Review dot for no-trade days */}
          {(!data || data.count === 0) && data?.hasReview && (
            <div className="absolute rounded-full bg-[#F97316]" style={{ width: 5, height: 5, bottom: 6, right: 6 }} />
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4 relative">
      {/* Toolbar — single line, left nav + right stats */}
      <div className="flex items-center justify-between">
        {/* Left: Month Nav */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-slate-800 text-[#6B7280] dark:text-slate-400" style={{ transition: 'all 150ms ease' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[16px] font-semibold text-[#111827] dark:text-slate-100 min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-slate-800 text-[#6B7280] dark:text-slate-400" style={{ transition: 'all 150ms ease' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-1 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-[8px] text-[13px] font-medium text-[#6B7280] dark:text-slate-400 hover:bg-[#F9FAFB] dark:hover:bg-slate-800"
            style={{ padding: '6px 10px', transition: 'all 150ms ease' }}
          >
            {cal.thisMonth || 'This month'}
          </button>
        </div>

        {/* Right: Monthly Stats Pills */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#9CA3AF] dark:text-slate-500 font-medium">{cal.monthlyStats || 'Monthly:'}</span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-bold ${
              monthStats.totalPnl >= 0
                ? 'bg-[#D4F4DD] dark:bg-emerald-900/30 text-[#15803D] dark:text-emerald-400'
                : 'bg-[#FEE2E2] dark:bg-rose-900/30 text-[#DC2626] dark:text-rose-400'
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {monthStats.totalPnl >= 0 ? '+' : '\u2212'}${Math.abs(monthStats.totalPnl).toFixed(2)}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium bg-[#F3F4F6] dark:bg-slate-800 text-[#374151] dark:text-slate-300">
            {monthStats.tradingDays} {cal.tradingDays || 'days'}
          </span>
        </div>
      </div>


      {/* Main: Calendar Grid + Weekly Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          {/* Weekday Header — plain text, no card borders */}
          <div className="grid grid-cols-7 mb-1.5 border-b border-[#F3F4F6] dark:border-slate-800 pb-2">
            {t.calendar.weekdays.map(day => (
              <div key={day} className="flex items-center justify-center">
                <span className="text-[13px] font-medium text-[#6B7280] dark:text-slate-400">{day}</span>
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7" style={{ gap: 6 }}>
            {renderPrevMonthBlanks()}
            {renderCurrentMonthDays()}
            {renderNextMonthBlanks()}
          </div>
        </div>

        {/* Weekly Summary Sidebar — no title, aligned to grid top */}
        <div className="lg:w-[220px] flex flex-col gap-[6px]">
          {/* Spacer matching weekday header height */}
          <div style={{ height: 33 }} />
          {weeklyStats.map((week, i) => {
            const isPositive = week.pnl >= 0;
            const weekLabel = cal.weekSuffix
              ? `${cal.week}${i + 1}${cal.weekSuffix}`
              : `${cal.week} ${i + 1}`;
            return (
              <div
                key={i}
                className="rounded-[8px] border border-[#E5E7EB] dark:border-slate-800 cursor-pointer flex-1 flex flex-col justify-center"
                style={{
                  minHeight: 130,
                  padding: '12px 16px',
                  background: week.isCurrent ? '#FAFAFA' : '#ffffff',
                  transition: 'all 150ms ease'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = week.isCurrent ? '#FAFAFA' : '#ffffff'; }}
              >
                <span className="text-[12px] font-medium text-[#9CA3AF] dark:text-slate-500 mb-1">{weekLabel}</span>
                <span
                  className={`text-[18px] font-bold mb-2 ${
                    week.count === 0
                      ? 'text-[#111827] dark:text-slate-300'
                      : isPositive
                        ? 'text-[#15803D] dark:text-emerald-400'
                        : 'text-[#DC2626] dark:text-rose-400'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {week.count === 0 ? '$0.00' : `${isPositive ? '+' : '\u2212'}$${Math.abs(week.pnl).toFixed(2)}`}
                </span>
                <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F3F4F6] dark:bg-slate-800 text-[#6B7280] dark:text-slate-400">
                  {week.tradingDays} {cal.tradingDays || 'days'}
                </span>
              </div>
            );
          })}
        </div>
      </div>


      {/* Daily Details Modal Final */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', padding: 24 }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="animate-fade-in-up"
            style={{ width: 'min(1040px, 92vw)', maxHeight: 'min(92vh, 1040px)', background: '#FFFFFF', borderRadius: 16, boxShadow: '0 24px 72px rgba(15,23,42,0.14)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", WebkitFontSmoothing: 'antialiased' }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 44px 0' }}>
              {/* Left cluster */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 19, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.015em' }}>{modalDateLabel}</span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 400, color: '#64748B' }}>Net P&L</span>
                <span style={{ fontSize: 19, fontWeight: 500, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: selectedDayStats ? (selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626') : '#94A3B8' }}>
                  {selectedDayStats ? `${selectedDayStats.pnl >= 0 ? '+' : '\u2212'}$${Math.abs(selectedDayStats.pnl).toFixed(2)}` : '\u2014'}
                </span>
              </div>
              {/* Right cluster */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setShowReview(v => !v)}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontWeight: 500, color: '#334155', cursor: 'pointer', outline: 'none', transition: 'background 150ms', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                >
                  <Edit3 style={{ width: 14, height: 14 }} />
                  {showReview ? (cal.weekSuffix ? '收起复盘' : 'Hide note') : (cal.weekSuffix ? '写复盘' : 'Add note')}
                  {selectedDayHasReview && (
                    <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#6366F1', border: '2px solid #fff' }} />
                  )}
                </button>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#A78BFA 0%,#818CF8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src="/lion-care.png" alt="logo" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '50%' }} />
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, color: '#64748B', cursor: 'pointer', outline: 'none', transition: 'background 150ms', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <X style={{ width: 17, height: 17 }} />
                </button>
              </div>
            </div>
            {/* ── Section 2: KPI + Chart ── */}
            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 40, alignItems: 'center', padding: '32px 44px' }}>
              {/* Left: Cumulative P&L chart */}
              <div style={{ minWidth: 0 }}>
                {selectedDayStats ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={cumulativePnlData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="v7PnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626'} stopOpacity={0.13} />
                          <stop offset="100%" stopColor={selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="i" axisLine={false} tickLine={false} tick={false} />
                      <YAxis axisLine={false} tickLine={false} tickCount={5} width={44} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Inter' } as any} tickFormatter={(v: number) => `${v < 0 ? '\u2212' : ''}$${Math.abs(v).toFixed(2)}`} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, padding: '4px 10px' }} formatter={(v: any) => [`${v >= 0 ? '+' : ''}$${Number(v).toFixed(2)}`, 'P&L']} labelFormatter={(l: any) => `Trade ${l}`} />
                      <Area type="linear" dataKey="pnl" stroke={selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626'} strokeWidth={1.5} strokeLinecap="round" fill="url(#v7PnlGrad)" dot={false} activeDot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14 }}>当日无交易</div>
                )}
              </div>
              {/* Right: 4×2 KPI grid */}
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
            {/* ── Section 3: Trade Table ── */}
            {selectedDayTrades.length > 0 && (
              <div style={{ borderTop: '1px solid #F1F5F9', flex: '1 1 auto', minHeight: 0, overflowY: selectedDayTrades.length > 10 ? 'auto' : 'visible', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>
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
                        <tr key={trade.id} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 100ms' }}
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
            {/* ── Section 4: Daily Review (collapsible) ── */}
            {showReview && (
              <div style={{ flexShrink: 0, borderTop: '1px solid #F1F5F9', padding: '20px 44px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{cal.weekSuffix ? '每日复盘' : 'Daily Review'}</span>
                  <button onClick={handleSaveReview} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
                    <Save style={{ width: 13, height: 13 }} />
                    {t.calendar.modal.save}
                  </button>
                </div>
                <textarea
                  style={{ width: '100%', height: 140, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', fontSize: 13.5, color: '#0F172A', lineHeight: 1.65, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 150ms' }}
                  placeholder={cal.weekSuffix ? '记录今天的交易心得、市场观察、情绪状态...' : t.calendar.modal.writeReview}
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  onFocus={e => { e.currentTarget.style.borderColor = '#6366F1'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                />
              </div>
            )}
            {/* ── Section 5: Bottom Bar ── */}
            <div style={{ flexShrink: 0, borderTop: '1px solid #F1F5F9', padding: '0 44px 28px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 20 }}>
              <button
                onClick={() => setSelectedDay(null)}
                style={{ height: 40, padding: '0 22px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontWeight: 500, color: '#475569', cursor: 'pointer', outline: 'none', transition: 'background 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
              >
                {cal.weekSuffix ? '取消' : 'Cancel'}
              </button>
              <button
                style={{ height: 40, padding: '0 22px', background: '#6366F1', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 500, color: '#FFFFFF', cursor: 'pointer', outline: 'none', transition: 'background 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6366F1'; }}
              >
                {cal.weekSuffix ? '查看详情' : 'View Details'}
              </button>
            </div>
            {/* Toast */}
            {showToast && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-[60]">
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.calendar.modal.saveSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;