
import React, { useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import { Trade, WeeklyGoal } from '../types';
import { ArrowLeft, Target, Trophy, TrendingUp, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { 
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine 
} from 'recharts';

interface GoalsPageProps {
    onBack: () => void;
    trades: Trade[];
    currentGoal: WeeklyGoal;
}

const GoalsPage: React.FC<GoalsPageProps> = ({ onBack, trades, currentGoal }) => {
    const { t, language } = useLanguage();

    // Mock Data Generation for History based on trades
    // In a real app, this would come from a database of saved historical goals
    // Here we will simulate past goals being similar to the current one for visualization
    const historicalData = useMemo(() => {
        const weeks = [];
        const today = new Date();
        
        // Generate last 8 weeks
        for (let i = 0; i < 8; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() - (i * 7)); // Start of week (Sunday)
            weekStart.setHours(0,0,0,0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23,59,59,999);

            // Calculate actual performance for this week
            const weekTrades = trades.filter(t => {
                const tDate = new Date(t.entryDate).getTime();
                return tDate >= weekStart.getTime() && tDate <= weekEnd.getTime();
            });

            let actual = 0;
            if (currentGoal.type === 'amount') {
                actual = weekTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
            } else if (currentGoal.type === 'r_multiple') {
                actual = weekTrades.reduce((acc, t) => {
                    const r = t.riskAmount && t.riskAmount > 0 ? (t.pnl - t.fees) / t.riskAmount : 0;
                    return acc + r;
                }, 0);
            } else {
                // Mock Percentage (assuming 10k base for simplicity in history)
                const pnl = weekTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
                actual = (pnl / 10000) * 100;
            }

            // Mock Targets (vary slightly)
            const target = i === 0 ? currentGoal.value : currentGoal.value * (0.8 + Math.random() * 0.4);

            weeks.push({
                weekLabel: weekStart.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
                fullDate: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
                actual: parseFloat(actual.toFixed(2)),
                target: parseFloat(target.toFixed(2)),
                achieved: actual >= target,
                timestamp: weekStart.getTime()
            });
        }
        return weeks.reverse();
    }, [trades, currentGoal]);

    // Calculate Stats
    const stats = useMemo(() => {
        const achievedCount = historicalData.filter(d => d.achieved).length;
        const totalWeeks = historicalData.length;
        const avgCompletion = (achievedCount / totalWeeks) * 100;
        
        // Find best week
        const bestWeek = [...historicalData].sort((a,b) => b.actual - a.actual)[0];
        
        // Calculate Streak (working backwards)
        let streak = 0;
        for (let i = historicalData.length - 1; i >= 0; i--) {
            if (historicalData[i].achieved) streak++;
            else break;
        }

        return { streak, bestWeek, avgCompletion, totalWeeks };
    }, [historicalData]);

    const unit = currentGoal.type === 'amount' ? '$' : currentGoal.type === 'r_multiple' ? 'R' : '%';

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={onBack}
                    className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="w-6 h-6 text-rose-500" />
                        {t.goalsPage.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {language === 'cn' ? '持续追踪你的进步' : 'Track your progress over time'}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">{t.goalsPage.streak}</p>
                        <h3 className="text-4xl font-black flex items-baseline gap-2">
                            {stats.streak} <span className="text-lg font-normal opacity-80">{t.goalsPage.weeks}</span>
                        </h3>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4">
                        <Target className="w-24 h-24" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.goalsPage.bestWeek}</p>
                        <h3 className="text-3xl font-bold text-emerald-500 font-mono">
                            {unit === '$' ? unit : ''}{stats.bestWeek?.actual}{unit !== '$' ? unit : ''}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{stats.bestWeek?.weekLabel}</p>
                    </div>
                    <div className="absolute right-4 top-4 text-emerald-100 dark:text-emerald-900/20">
                        <Trophy className="w-16 h-16" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.goalsPage.avgCompletion}</p>
                        <h3 className="text-3xl font-bold text-blue-500 font-mono">
                            {stats.avgCompletion.toFixed(0)}%
                        </h3>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.avgCompletion}%` }}></div>
                        </div>
                    </div>
                    <div className="absolute right-4 top-4 text-blue-100 dark:text-blue-900/20">
                        <TrendingUp className="w-16 h-16" />
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500" />
                    {t.goalsPage.chartTitle}
                </h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={historicalData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                            <XAxis dataKey="weekLabel" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                            />
                            <Bar dataKey="actual" name={t.goalsPage.actual} barSize={20} radius={[4, 4, 0, 0]}>
                                {historicalData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.achieved ? '#10b981' : '#f43f5e'} />
                                ))}
                            </Bar>
                            <Line type="monotone" dataKey="target" name={t.goalsPage.target} stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* History List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">{t.goalsPage.weekOf}</th>
                                <th className="px-6 py-4">{t.goalsPage.target}</th>
                                <th className="px-6 py-4">{t.goalsPage.actual}</th>
                                <th className="px-6 py-4 text-center">{t.goalsPage.status}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                            {historicalData.map((week, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <span>{week.fullDate}</span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        {unit === '$' ? unit : ''}{week.target}{unit !== '$' ? unit : ''}
                                    </td>
                                    <td className={`px-6 py-4 font-mono font-bold ${week.actual >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                                        {unit === '$' ? unit : ''}{week.actual}{unit !== '$' ? unit : ''}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {week.achieved ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase">
                                                <CheckCircle2 className="w-3 h-3" /> Pass
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                                                <XCircle className="w-3 h-3" /> Miss
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GoalsPage;
