
import React, { useState, useMemo, useEffect } from 'react';
import { Trade, DailyPlan, ReviewSessionConfig, Direction } from '../types';
import { useLanguage } from '../LanguageContext';
import { X, Save, TrendingUp, TrendingDown, Clock, Activity, StickyNote, Image as ImageIcon, ChevronRight } from 'lucide-react';

interface ReviewSessionProps {
    config: ReviewSessionConfig;
    trades: Trade[];
    plans: DailyPlan[];
    onSavePlan: (plan: DailyPlan) => void;
    onClose: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ config, trades, plans, onSavePlan, onClose }) => {
    const { t } = useLanguage();
    const [reviewContent, setReviewContent] = useState('');
    const [viewTrade, setViewTrade] = useState<Trade | null>(null);

    // Determine folder name based on review type
    const targetFolder = useMemo(() => {
        if (config.type === 'weekly') return 'weekly-review';
        if (config.type === 'monthly') return 'monthly-review';
        return 'daily-journal';
    }, [config.type]);

    // 1. Filter Trades for this period
    const sessionTrades = useMemo(() => {
        const { start, end } = config.dateRange;
        // Normalize time for comparison
        const startTime = start.getTime();
        const endTime = end.getTime();

        return trades.filter(t => {
            const tDate = new Date(t.entryDate).getTime();
            return tDate >= startTime && tDate <= endTime;
        }).sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    }, [trades, config.dateRange]);

    // 2. Calculate Stats
    const stats = useMemo(() => {
        const count = sessionTrades.length;
        const netPnl = sessionTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
        const wins = sessionTrades.filter(t => t.pnl > 0).length;
        const winRate = count > 0 ? (wins / count) * 100 : 0;
        return { count, netPnl, winRate };
    }, [sessionTrades]);

    // 3. Load existing plan content if exists
    useEffect(() => {
        // Construct a unique date key or title to find existing review using LOCAL time
        const d = config.dateRange.end;
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // Find existing plan matching date AND folder type
        let existingPlan = plans.find(p => p.date === dateKey && p.folder === targetFolder);
        
        if (existingPlan) {
            // Strip HTML for textarea (simple version)
            const doc = new DOMParser().parseFromString(existingPlan.content, 'text/html');
            setReviewContent(doc.body.textContent || "");
        } else {
            setReviewContent('');
        }
    }, [config, plans, targetFolder]);

    const handleSave = () => {
        // Use strictly local date string YYYY-MM-DD
        const d = config.dateRange.end;
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const existingPlan = plans.find(p => p.date === dateKey && p.folder === targetFolder);
        
        // Wrap content
        const formattedContent = reviewContent.split('\n').filter(line => line.trim() !== '').map(line => `<p>${line}</p>`).join('');

        const newPlan: DailyPlan = {
            id: existingPlan ? existingPlan.id : Date.now().toString(),
            date: dateKey,
            title: config.title, // e.g. "Daily Review"
            folder: targetFolder, // Use the specific folder type
            content: formattedContent,
            focusTickers: existingPlan?.focusTickers || [],
            linkedTradeIds: sessionTrades.map(t => t.id) // Auto link trades in this period
        };

        onSavePlan(newPlan);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{config.title}</h3>
                            <p className="text-xs text-slate-500">
                                {config.dateRange.start.toLocaleDateString()} - {config.dateRange.end.toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Left Column: Trades List & Stats */}
                    <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
                        {/* Mini Stats */}
                        <div className="p-5 grid grid-cols-2 gap-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.reviewSession.netPnl}</p>
                                <p className={`text-lg font-bold font-mono ${stats.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
                                </p>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.reviewSession.winRate}</p>
                                <div className="flex items-end gap-1">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{stats.winRate.toFixed(1)}%</p>
                                    <span className="text-xs text-slate-400 mb-1">({stats.count} trades)</span>
                                </div>
                            </div>
                        </div>

                        {/* Trade List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.reviewSession.tradesInPeriod}</h4>
                            {sessionTrades.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-10">{t.reviewSession.noTrades}</p>
                            ) : (
                                sessionTrades.map(trade => (
                                    <div 
                                        key={trade.id}
                                        onClick={() => setViewTrade(trade)}
                                        className={`p-3 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition-all hover:shadow-md group ${
                                            viewTrade?.id === trade.id 
                                            ? 'border-indigo-500 ring-1 ring-indigo-500' 
                                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{trade.symbol}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${trade.direction === Direction.LONG ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                                                {trade.direction}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500">{new Date(trade.entryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            <span className={`text-sm font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Middle Column: Trade Detail View (Dynamic) */}
                    <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 overflow-y-auto">
                        {viewTrade ? (
                            <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {viewTrade.symbol} 
                                        <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{viewTrade.setup}</span>
                                    </h4>
                                    <span className={`text-xl font-mono font-bold ${viewTrade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        ${viewTrade.pnl.toFixed(2)}
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {/* Price Data */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                            <span className="text-xs text-slate-500 uppercase">Entry</span>
                                            <p className="font-mono font-medium dark:text-slate-200">${viewTrade.entryPrice}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                            <span className="text-xs text-slate-500 uppercase">Exit</span>
                                            <p className="font-mono font-medium dark:text-slate-200">${viewTrade.exitPrice}</p>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                            <StickyNote className="w-3 h-3" /> Notes
                                        </h5>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                            {viewTrade.notes || "No notes."}
                                        </p>
                                    </div>

                                    {/* Review Notes */}
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                            <Activity className="w-3 h-3" /> Review
                                        </h5>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                            {viewTrade.reviewNotes || "No review notes."}
                                        </p>
                                    </div>

                                    {/* Images */}
                                    {viewTrade.images && viewTrade.images.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3" /> Screenshots
                                            </h5>
                                            <div className="grid grid-cols-1 gap-2">
                                                {viewTrade.images.map((img, i) => (
                                                    <img key={i} src={img} className="w-full rounded-lg border border-slate-200 dark:border-slate-800" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <ChevronRight className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm">{t.reviewSession.clickForDetails}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Editor */}
                    <div className="w-1/3 flex flex-col bg-white dark:bg-slate-950 p-6">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            {config.type === 'daily' ? t.risk.dailyReview : config.type === 'weekly' ? t.risk.weeklyReview : t.risk.monthlyReview}
                        </h4>
                        <textarea 
                            className="flex-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none font-sans mb-4"
                            placeholder={t.reviewSession.writeSummary}
                            value={reviewContent}
                            onChange={(e) => setReviewContent(e.target.value)}
                        ></textarea>
                        
                        <div className="flex justify-end">
                            <button 
                                onClick={handleSave}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                            >
                                <Save className="w-4 h-4" />
                                {t.reviewSession.finish}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReviewSession;
