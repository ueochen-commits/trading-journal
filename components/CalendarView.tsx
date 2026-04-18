
import React, { useMemo, useState, useEffect } from 'react';
import { DailyPlan, Trade, Direction } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Save, Edit3, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface CalendarViewProps {
  trades: Trade[];
  plans?: DailyPlan[];
  onSavePlan?: (plan: DailyPlan) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ trades, plans, onSavePlan }) => {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State for Daily Detail Modal
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [reviewText, setReviewText] = useState('');
  
  // State for Toast Notification
  const [showToast, setShowToast] = useState(false);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  // Helper to get aggregates for the month header
  const monthStats = useMemo(() => {
     const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
     const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
     
     const monthTrades = trades.filter(t => {
         const d = new Date(t.entryDate);
         return d >= start && d <= end;
     });

     const totalPnl = monthTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
     const totalTrades = monthTrades.length;

     return { totalPnl, totalTrades };
  }, [currentDate, trades]);

  // Weekly stats: aggregate P&L and trade count per calendar row
  const weeklyStats = useMemo(() => {
    const totalCells = firstDayOfMonth + daysInMonth;
    const numWeeks = Math.ceil(totalCells / 7);
    const weeks: { pnl: number; count: number }[] = [];

    for (let w = 0; w < numWeeks; w++) {
      let weekPnl = 0;
      let weekCount = 0;
      for (let col = 0; col < 7; col++) {
        const cellIndex = w * 7 + col;
        const day = cellIndex - firstDayOfMonth + 1;
        if (day < 1 || day > daysInMonth) continue;
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
        const dayTrades = trades.filter(t => new Date(t.entryDate).toDateString() === dateStr);
        weekPnl += dayTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
        weekCount += dayTrades.length;
      }
      weeks.push({ pnl: weekPnl, count: weekCount });
    }
    return weeks;
  }, [currentDate, trades, firstDayOfMonth, daysInMonth]);

  const getDayData = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    
    // Aggregate trades for this day
    const daysTrades = trades.filter(t => new Date(t.entryDate).toDateString() === dateStr);
    
    // Check if there is a plan/review for this day
    // Convert to YYYY-MM-DD for matching
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    
    const dayPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');

    if (daysTrades.length === 0 && !dayPlan) return null;

    const netPnl = daysTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    const count = daysTrades.length;
    
    // Collect tags (Setups and Mistakes)
    const setups = Array.from(new Set(daysTrades.map(t => t.setup).filter(Boolean)));
    const mistakes = Array.from(new Set(daysTrades.flatMap(t => t.mistakes || []).filter(Boolean)));
    
    return { netPnl, count, setups, mistakes, hasReview: !!dayPlan, dateKey };
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // --- Modal Logic ---
  
  // Helper to strip HTML for editing in simple textarea
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
      
      // Load existing review content
      const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');
      // If content exists, strip HTML tags to show in plain text area
      setReviewText(existingPlan ? stripHtml(existingPlan.content) : '');
      
      setSelectedDay(date);
  };

  const handleSaveReview = () => {
      if (!selectedDay || !onSavePlan) {
          console.warn("Save failed: missing selectedDay or onSavePlan handler");
          return;
      }
      const yyyy = selectedDay.getFullYear();
      const mm = String(selectedDay.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDay.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      
      const existingPlan = plans?.find(p => p.date === dateKey && p.folder === 'daily-journal');

      // Simple formatting: wrap lines in paragraphs if it's plain text being saved
      // This ensures it looks good in the rich text editor of the Notebook
      const formattedContent = reviewText.split('\n').filter(line => line.trim() !== '').map(line => `<p>${line}</p>`).join('');

      const newPlan: DailyPlan = {
          id: existingPlan ? existingPlan.id : Date.now().toString(),
          date: dateKey,
          title: `Daily Review - ${dateKey}`,
          folder: 'daily-journal',
          content: formattedContent, // Save as HTML
          focusTickers: existingPlan?.focusTickers || [],
          linkedTradeIds: existingPlan?.linkedTradeIds || []
      };

      onSavePlan(newPlan);
      
      // Trigger Toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
  };

  const renderCalendarDays = () => {
    const days = [];
    const blanks = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      blanks.push(<div key={`blank-${i}`} className="min-h-[100px] bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const data = getDayData(d);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
      
      // Theme-aware Colors
      let bgColor = 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'; // Default Neutral
      let pnlColor = 'text-slate-400 dark:text-slate-500';
      
      if (data) {
        if (data.netPnl > 0) {
            bgColor = 'bg-emerald-50 dark:bg-teal-900/20 border-emerald-100 dark:border-teal-800/30 hover:bg-emerald-100 dark:hover:bg-teal-900/30'; 
            pnlColor = 'text-emerald-600 dark:text-emerald-400';
        } else if (data.netPnl < 0) {
            bgColor = 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30 hover:bg-rose-100 dark:hover:bg-rose-900/30';
            pnlColor = 'text-rose-600 dark:text-rose-400';
        }
      }

      days.push(
        <div 
            key={d} 
            onClick={() => handleDayClick(d)}
            className={`min-h-[100px] p-2 border relative group transition-all flex flex-col cursor-pointer ${bgColor} ${isToday ? 'ring-2 ring-indigo-500 z-10' : ''}`}
        >
          {/* Day Number */}
          <div className="flex justify-between items-start mb-1">
             <span className={`text-xs font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>{d}</span>
             {data?.hasReview && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Review Logged"></div>}
          </div>

          {data && data.count > 0 ? (
            <div className="flex-1 flex flex-col">
                {/* P&L */}
                <span className={`text-lg font-bold font-mono tracking-tight ${pnlColor} mb-0.5`}>
                    {data.netPnl >= 0 ? '+' : ''}${data.netPnl.toFixed(2)}
                </span>
                
                {/* Trade Count */}
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 font-medium">
                    {data.count} {data.count === 1 ? 'Trade' : 'Trades'}
                </span>
            </div>
          ) : (
             // No trades, but allow clicking to add review
              <div className="flex-1 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-slate-300" />
              </div>
          )}
        </div>
      );
    }

    return [...blanks, ...days];
  };

  // --- Day Detail Stats Logic ---
  const selectedDayTrades = useMemo(() => {
      if (!selectedDay) return [];
      return trades.filter(t => new Date(t.entryDate).toDateString() === selectedDay.toDateString());
  }, [selectedDay, trades]);

  const selectedDayStats = useMemo(() => {
      const count = selectedDayTrades.length;
      if (count === 0) return null;
      const pnl = selectedDayTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
      const wins = selectedDayTrades.filter(t => t.pnl > 0).length;
      const losses = selectedDayTrades.filter(t => t.pnl <= 0).length;
      const winRate = (wins / count) * 100;
      
      const avgWin = wins > 0 ? selectedDayTrades.filter(t => t.pnl > 0).reduce((acc,t) => acc + t.pnl, 0) / wins : 0;
      const avgLoss = losses > 0 ? selectedDayTrades.filter(t => t.pnl <= 0).reduce((acc,t) => acc + t.pnl, 0) / losses : 0;

      return { pnl, count, wins, losses, winRate, avgWin, avgLoss };
  }, [selectedDayTrades]);


  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <div className="space-y-4 relative">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-colors">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:shadow-sm"><ChevronLeft className="w-4 h-4"/></button>
                <span className="min-w-[140px] text-center font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                    {monthName} {year}
                </span>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:shadow-sm"><ChevronRight className="w-4 h-4"/></button>
            </div>
            
            <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 text-xs font-bold rounded-lg transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hidden md:block"
            >
                Today
            </button>
        </div>

        {/* Monthly Summary */}
        <div className="flex gap-8 divide-x divide-slate-100 dark:divide-slate-700">
             <div className="pl-8 first:pl-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">{t.calendar.totalPnl}</p>
                <p className={`text-xl font-bold font-mono ${monthStats.totalPnl >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {monthStats.totalPnl >= 0 ? '+' : ''}${monthStats.totalPnl.toFixed(2)}
                </p>
            </div>
             <div className="pl-8">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">{t.calendar.totalTrades}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {monthStats.totalTrades}
                </p>
            </div>
        </div>
      </div>

      {/* Grid + Weekly Summary */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
              {t.calendar.weekdays.map(day => (
                  <div key={day} className="py-4 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest">{day}</div>
              ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-950 gap-px border-b border-l border-slate-200 dark:border-slate-800">
              {renderCalendarDays()}
          </div>
        </div>

        {/* Weekly Summary Sidebar */}
        <div className="lg:w-56 xl:w-64 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors p-4">
          <h3 className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-3">
            {t.calendar.weeklySummary}
          </h3>
          <div className="space-y-2">
            {weeklyStats.map((week, i) => {
              const isPositive = week.pnl >= 0;
              const weekLabel = (t.calendar as any).weekSuffix
                ? `${t.calendar.week}${i + 1}${(t.calendar as any).weekSuffix}`
                : `${t.calendar.week} ${i + 1}`;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-colors ${
                    week.count === 0
                      ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50'
                      : isPositive
                        ? 'bg-emerald-50 dark:bg-teal-900/20 border-emerald-100 dark:border-teal-800/30'
                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{weekLabel}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {week.count} {week.count === 1 ? 'trade' : 'trades'}
                    </span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${
                    week.count === 0
                      ? 'text-slate-300 dark:text-slate-600'
                      : isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {week.count === 0 ? '$0.00' : `${isPositive ? '+' : ''}$${week.pnl.toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Details Modal */}
      {selectedDay && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
                  
                  {/* Toast inside Modal */}
                  {showToast && (
                      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-[60] border border-emerald-500/50">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium text-sm">{t.calendar.modal.saveSuccess}</span>
                      </div>
                  )}

                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {selectedDay.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </h3>
                      </div>
                      <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-6 h-6"/></button>
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                      {/* Left Sidebar: Stats & Trades */}
                      <div className="w-1/3 bg-slate-50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 p-5 overflow-y-auto">
                          
                          {/* Mini Stats Grid */}
                          <div className="mb-6">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.calendar.modal.stats}</h4>
                              {selectedDayStats ? (
                                  <div className="grid grid-cols-2 gap-3">
                                      <div className={`p-3 rounded-xl border ${selectedDayStats.pnl >= 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-500/20'}`}>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">Net P&L</p>
                                          <p className={`text-lg font-bold font-mono ${selectedDayStats.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                              ${selectedDayStats.pnl.toFixed(2)}
                                          </p>
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

                          {/* Trade List */}
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
                                              <span>{new Date(trade.entryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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

                      {/* Right Content: Review Editor */}
                      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 p-6">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                              <Edit3 className="w-5 h-5 text-indigo-500" />
                              {t.calendar.modal.dailyReview}
                          </h4>
                          <p className="text-xs text-slate-400 mb-2">
                             Synced to Notebook &gt; Daily Journal
                          </p>
                          <div className="flex-1 flex flex-col relative">
                                <textarea 
                                    className="flex-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none font-sans"
                                    placeholder={t.calendar.modal.writeReview}
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                ></textarea>
                                
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
