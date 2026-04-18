
import React, { useMemo, useState } from 'react';
import { DailyPlan, Trade, Direction } from '../types';
import { ChevronLeft, ChevronRight, X, Save, Edit3, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

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
        <div key={`prev-${i}`} className="h-[96px] rounded-[8px] flex flex-col items-end" style={{ background: '#FAFAFA', padding: '10px 12px' }}>
          <span className="text-[13px]" style={{ color: '#B0B5BD' }}>{day}</span>
        </div>
      );
    });
  };

  const renderNextMonthBlanks = () => {
    return Array.from({ length: trailingBlanks }, (_, i) => (
      <div key={`next-${i}`} className="h-[96px] rounded-[8px] flex flex-col items-end" style={{ background: '#FAFAFA', padding: '10px 12px' }}>
        <span className="text-[13px]" style={{ color: '#B0B5BD' }}>{i + 1}</span>
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
          className={`h-[96px] rounded-[8px] flex flex-col cursor-pointer group relative ${borderClass}`}
          style={{ padding: '10px 12px', background: bgStyle, transition: 'all 150ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          {/* Day number — right aligned, top */}
          <div className="w-full flex justify-end">
            <span className={`text-[13px] font-medium ${textClass}`}>{d}</span>
          </div>

          {data && data.count > 0 ? (
            <div className="flex-1 flex flex-col items-end justify-center w-full">
              <span className={`text-[16px] font-bold ${pnlTextClass}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {data.netPnl >= 0 ? '+' : '\u2212'}${Math.abs(data.netPnl).toFixed(2)}
              </span>
              <span className={`text-[12px] ${pnlTextClass} mt-0.5`} style={{ opacity: 0.7 }}>
                {data.count} {cal.trades || 'trades'}
              </span>
              <span className={`text-[12px] ${pnlTextClass}`} style={{ opacity: 0.55 }}>
                {data.winRate.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Marker dot — absolute, bottom-right corner */}
          {data && data.count > 0 && (
            <div
              className={`absolute rounded-full ${data.netPnl >= 0 ? 'bg-[#15803D]' : 'bg-[#DC2626]'}`}
              style={{ width: 5, height: 5, bottom: 6, right: 6 }}
            />
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
          <div className="grid grid-cols-7" style={{ gap: 5 }}>
            {renderPrevMonthBlanks()}
            {renderCurrentMonthDays()}
            {renderNextMonthBlanks()}
          </div>
        </div>

        {/* Weekly Summary Sidebar — no title, aligned to grid top */}
        <div className="lg:w-[200px] flex flex-col gap-[5px]">
          {/* Spacer matching weekday header height so week cards align with day rows */}
          <div style={{ height: 33 }} />
          {weeklyStats.map((week, i) => {
            const isPositive = week.pnl >= 0;
            const weekLabel = cal.weekSuffix
              ? `${cal.week}${i + 1}${cal.weekSuffix}`
              : `${cal.week} ${i + 1}`;
            return (
              <div
                key={i}
                className="rounded-xl border border-[#E5E7EB] dark:border-slate-800 px-4 py-3.5 cursor-pointer flex-1 flex flex-col"
                style={{
                  background: week.isCurrent ? '#FAFAFA' : '#ffffff',
                  transition: 'all 150ms ease'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = week.isCurrent ? '#FAFAFA' : '#ffffff'; }}
              >
                <span className="text-[13px] font-medium text-[#6B7280] dark:text-slate-400 mb-1">{weekLabel}</span>
                <span
                  className={`text-[20px] font-bold mb-1.5 ${
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
                <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F3F4F6] dark:bg-slate-800 text-[#374151] dark:text-slate-400">
                  {week.tradingDays} {cal.tradingDays || 'days'}
                </span>
              </div>
            );
          })}
        </div>
      </div>


      {/* Daily Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            {showToast && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-[60] border border-emerald-500/50">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium text-sm">{t.calendar.modal.saveSuccess}</span>
              </div>
            )}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedDay.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Stats & Trades */}
              <div className="w-1/3 bg-slate-50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 p-5 overflow-y-auto">
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.calendar.modal.stats}</h4>
                  {selectedDayStats ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-xl border ${selectedDayStats.pnl >= 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-500/20'}`}>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Net P&L</p>
                        <p className={`text-lg font-bold font-mono ${selectedDayStats.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>${selectedDayStats.pnl.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.calendar.modal.wins}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{selectedDayStats.wins}/{selectedDayStats.count}</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.calendar.modal.avgWin}</p>
                        <p className="text-sm font-bold text-emerald-500 font-mono">${selectedDayStats.avgWin.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.calendar.modal.avgLoss}</p>
                        <p className="text-sm font-bold text-rose-500 font-mono">${selectedDayStats.avgLoss.toFixed(2)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic">No trades recorded.</div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.calendar.modal.trades}</h4>
                  <div className="space-y-3">
                    {selectedDayTrades.map(trade => (
                      <div key={trade.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{trade.symbol}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${trade.direction === Direction.LONG ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'}`}>{trade.direction}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                          <span>{new Date(trade.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{trade.setup}</span>
                        </div>
                        <div className={`text-right font-mono font-bold text-sm ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          ${(trade.pnl - trade.fees).toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {selectedDayTrades.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No trades.</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Right: Review Editor */}
              <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 p-6">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-500" />
                  {t.calendar.modal.dailyReview}
                </h4>
                <p className="text-xs text-slate-400 mb-2">Synced to Notebook &gt; Daily Journal</p>
                <div className="flex-1 flex flex-col relative">
                  <textarea
                    className="flex-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none font-sans"
                    placeholder={t.calendar.modal.writeReview}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSaveReview}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      {t.calendar.modal.save}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;