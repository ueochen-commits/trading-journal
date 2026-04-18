
import React, { useMemo, useState, useEffect } from 'react';
import { DailyPlan, Trade, Direction } from '../types';
import { ChevronLeft, ChevronRight, X, Save, Edit3, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
    return { profitFactor, totalFees };
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


      {/* Daily Details Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden animate-fade-in-up relative"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-semibold text-[#111827] dark:text-slate-100">
                  {selectedDay.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                {selectedDayStats && (
                  <span
                    className={`text-[15px] font-bold ${selectedDayStats.pnl >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {selectedDayStats.pnl >= 0 ? '+' : '\u2212'}${Math.abs(selectedDayStats.pnl).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReview(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all ${
                    showReview
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-800 border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] dark:text-slate-400 hover:bg-[#F9FAFB] dark:hover:bg-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {(t.calendar.modal as any).writeReview || '写复盘'}
                </button>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#111827] dark:hover:text-slate-100 hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* KPI + Chart Section */}
            {selectedDayStats && (
              <div className="flex border-b border-[#F3F4F6] dark:border-slate-800 flex-shrink-0">
                {/* Cumulative P&L Chart */}
                <div className="flex-[7] px-6 py-4 border-r border-[#F3F4F6] dark:border-slate-800 min-w-0">
                  <p className="text-[11px] font-medium text-[#9CA3AF] dark:text-slate-500 mb-2 uppercase tracking-wide">Cumulative P&L</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={cumulativePnlData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="modalPnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedDayStats.pnl >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={selectedDayStats.pnl >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="i" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, padding: '4px 10px' }}
                        formatter={(v: any) => [`${v >= 0 ? '+' : ''}$${Number(v).toFixed(2)}`, 'P&L']}
                        labelFormatter={(l: any) => `Trade ${l}`}
                      />
                      <Area type="monotone" dataKey="pnl" stroke={selectedDayStats.pnl >= 0 ? '#10B981' : '#EF4444'} strokeWidth={2} fill="url(#modalPnlGrad)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* 8 KPI Grid */}
                <div className="flex-[5] px-4 py-4 grid grid-cols-2 gap-2 content-start">
                  {[
                    { label: 'Net P&L', value: `${selectedDayStats.pnl >= 0 ? '+' : '\u2212'}$${Math.abs(selectedDayStats.pnl).toFixed(2)}`, color: selectedDayStats.pnl >= 0 ? '#15803D' : '#DC2626' },
                    { label: 'Win Rate', value: `${selectedDayStats.winRate.toFixed(1)}%`, color: selectedDayStats.winRate >= 50 ? '#15803D' : '#DC2626' },
                    { label: 'Trades', value: String(selectedDayStats.count), color: '#374151' },
                    { label: 'W / L', value: `${selectedDayStats.wins} / ${selectedDayStats.losses}`, color: '#374151' },
                    { label: 'Avg Win', value: `$${selectedDayStats.avgWin.toFixed(2)}`, color: '#15803D' },
                    { label: 'Avg Loss', value: `$${Math.abs(selectedDayStats.avgLoss).toFixed(2)}`, color: '#DC2626' },
                    { label: 'Prof. Factor', value: extendedDayStats ? (extendedDayStats.profitFactor === Infinity ? '\u221e' : extendedDayStats.profitFactor.toFixed(2)) : '\u2014', color: '#374151' },
                    { label: 'Fees', value: extendedDayStats ? `$${extendedDayStats.totalFees.toFixed(2)}` : '\u2014', color: '#6B7280' },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-[#F9FAFB] dark:bg-slate-800 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-[#9CA3AF] dark:text-slate-500 font-medium mb-0.5">{kpi.label}</p>
                      <p className="text-[13px] font-bold" style={{ color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trade Table */}
            <div className="overflow-y-auto flex-shrink-0" style={{ maxHeight: selectedDayTrades.length > 6 ? 280 : undefined }}>
              {selectedDayTrades.length > 0 ? (
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-[#F9FAFB] dark:bg-slate-800 border-b border-[#F3F4F6] dark:border-slate-700">
                    <tr>
                      {['Time', 'Symbol', 'Dir', 'Qty', 'Net P&L', 'ROI%', 'Setup'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7280] dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6] dark:divide-slate-800">
                    {selectedDayTrades.map(trade => {
                      const netPnl = trade.pnl - trade.fees;
                      const costBasis = trade.entryPrice * trade.quantity;
                      const roi = costBasis > 0 ? (netPnl / costBasis) * 100 : null;
                      return (
                        <tr key={trade.id} className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-[#6B7280] dark:text-slate-400 whitespace-nowrap">
                            {new Date(trade.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#111827] dark:text-slate-100">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              trade.direction === Direction.LONG
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                            }`}>{trade.direction}</span>
                          </td>
                          <td className="px-4 py-3 text-[#374151] dark:text-slate-300" style={{ fontVariantNumeric: 'tabular-nums' }}>{trade.quantity}</td>
                          <td className={`px-4 py-3 font-semibold ${netPnl >= 0 ? 'text-[#15803D] dark:text-emerald-400' : 'text-[#DC2626] dark:text-rose-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {netPnl >= 0 ? '+' : '\u2212'}${Math.abs(netPnl).toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 ${roi !== null ? (roi >= 0 ? 'text-[#15803D] dark:text-emerald-400' : 'text-[#DC2626] dark:text-rose-400') : 'text-[#9CA3AF]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%` : '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-[#6B7280] dark:text-slate-400">{trade.setup || '\u2014'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-10 text-center text-[13px] text-[#9CA3AF] dark:text-slate-500">
                  当日无交易记录
                </div>
              )}
            </div>

            {/* Collapsible Daily Review */}
            {showReview && (
              <div className="border-t border-[#F3F4F6] dark:border-slate-800 px-6 py-5 flex flex-col gap-3 flex-shrink-0">
                <p className="text-[11px] text-[#9CA3AF] dark:text-slate-500 font-medium uppercase tracking-wide">Daily Review</p>
                <textarea
                  className="w-full bg-[#F9FAFB] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl p-4 text-[14px] text-[#374151] dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all resize-none"
                  rows={5}
                  placeholder={t.calendar.modal.writeReview}
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveReview}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[13px] font-medium transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {t.calendar.modal.save}
                  </button>
                </div>
              </div>
            )}

            {/* Save Toast */}
            {showToast && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-[60]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[13px] font-medium">{t.calendar.modal.saveSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;