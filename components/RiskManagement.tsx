
import React, { useState, useMemo, useEffect } from 'react';
import { RiskSettings, TradingRule, ReviewStatus } from '../types';
import { Shield, AlertTriangle, Save, CheckCircle2, Clock, CalendarCheck, TrendingUp, RefreshCw, Sliders, AlertOctagon, Target, Layers, HelpCircle, Lock, Unlock, RotateCcw } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface RiskManagementProps {
  settings: RiskSettings;
  onSaveSettings: (settings: RiskSettings) => void;
  rules: TradingRule[];
  onToggleRule: (id: string) => void;
  onAddRule: (text: string) => void;
  onDeleteRule: (id: string) => void;
  reviewStatus: ReviewStatus;
  onUpdateReview: (type: 'daily' | 'weekly' | 'monthly') => void;
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative ml-1.5 inline-flex">
        <HelpCircle className="w-3 h-3 text-slate-400 cursor-help hover:text-indigo-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center leading-snug">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

const RiskManagement: React.FC<RiskManagementProps> = ({ 
  settings, onSaveSettings, 
  rules, onToggleRule, onAddRule, onDeleteRule,
  reviewStatus, onUpdateReview
}) => {
  const { t } = useLanguage();
  const [localSettings, setLocalSettings] = useState(settings);
  const [newRuleText, setNewRuleText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isLocked = !!localSettings.lockedAt;

  // Live countdown ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isLocked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isLocked]);

  // Compute reset eligibility + countdown string
  const resetCooldownMs = 7 * 24 * 60 * 60 * 1000;
  const { canReset, countdownStr } = useMemo(() => {
    if (!localSettings.lastResetAt) return { canReset: true, countdownStr: '' };
    const unlockAt = new Date(localSettings.lastResetAt).getTime() + resetCooldownMs;
    const remaining = unlockAt - now;
    if (remaining <= 0) return { canReset: true, countdownStr: '' };
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { canReset: false, countdownStr: `${h}小时 ${pad(m)}分 ${pad(s)}秒` };
  }, [localSettings.lastResetAt, now]);

  // Update local settings if props change (e.g. from the assessment modal)
  useEffect(() => {
      setLocalSettings(settings);
      setSimBalance(settings.accountSize);
  }, [settings]);

  // Simulator State
  const [simBalance, setSimBalance] = useState(settings.accountSize);
  const [simRiskPct, setSimRiskPct] = useState(1);
  const [simWinRate, setSimWinRate] = useState(50);
  const [simRR, setSimRR] = useState(2.0);
  const [simTrades, setSimTrades] = useState(100);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check if reviews are done for current periods
  const isDailyDone = reviewStatus.lastDailyReview === new Date().toDateString();
  
  // Simple weekly check (start of week)
  const getWeekStart = (d: Date) => { d = new Date(d); var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); return new Date(d.setDate(diff)).toDateString(); }
  const isWeeklyDone = reviewStatus.lastWeeklyReview === getWeekStart(new Date());

  // Monthly check
  const getMonthStr = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const isMonthlyDone = reviewStatus.lastMonthlyReview === getMonthStr(new Date());

  // Simulation Logic
  const { simulationData, isBlown, blownTrade, isHighRisk } = useMemo(() => {
      // Seed random logic (simple Math.random for now, re-runs on refreshTrigger change)
      const data = [{ trade: 0, equity: simBalance }];
      let current = simBalance;
      let blown = false;
      let blownAt = 0;

      // Kelly Criterion Calculation for Risk Warning
      // Kelly % = W - (1-W)/R
      const winProb = simWinRate / 100;
      const lossProb = 1 - winProb;
      const kellyPct = (winProb - (lossProb / simRR)) * 100; // in percent
      
      // High Risk Trigger: > 5% fixed risk OR > Kelly
      const isHigh = simRiskPct > 5 || (kellyPct > 0 && simRiskPct > kellyPct);
      
      for (let i = 1; i <= simTrades; i++) {
          if (current <= 0) break; // Stop if already blown

          const isWin = Math.random() * 100 < simWinRate;
          const riskAmount = current * (simRiskPct / 100);
          
          let pnl = 0;
          if (isWin) {
              pnl = riskAmount * simRR;
          } else {
              pnl = -riskAmount;
          }
          
          current += pnl;
          
          if (current <= 0.01) { // Floating point safety
              current = 0;
              blown = true;
              blownAt = i;
          }
          
          data.push({ trade: i, equity: parseFloat(current.toFixed(2)) });
      }
      return { simulationData: data, isBlown: blown, blownTrade: blownAt, isHighRisk: isHigh };
  }, [simBalance, simRiskPct, simWinRate, simRR, simTrades, refreshTrigger]);

  const finalEquity = simulationData[simulationData.length - 1].equity;
  const totalGain = finalEquity - simBalance;
  const gainPct = simBalance > 0 ? (totalGain / simBalance) * 100 : 0;

  const handleSave = () => {
      const now = new Date().toISOString();
      const updated = { ...localSettings, lockedAt: now };
      setLocalSettings(updated);
      onSaveSettings(updated);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
  };

  const handleReset = () => {
      const now = new Date().toISOString();
      const updated = { ...localSettings, lockedAt: undefined, lastResetAt: now };
      setLocalSettings(updated);
      onSaveSettings(updated);
      setShowResetConfirm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in pb-12 relative">

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full mx-4">
                  <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                          <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">确认重置风控设置？</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                      重置后您可以重新编辑风控金额。下次重置需等待 <span className="font-bold text-amber-600">7 天</span>冷却期。
                  </p>
                  <div className="flex gap-3">
                      <button
                          onClick={() => setShowResetConfirm(false)}
                          className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                      >
                          取消
                      </button>
                      <button
                          onClick={handleReset}
                          className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
                      >
                          确认重置
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* Toast Notification */}
      {showToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
              <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-md">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm shadow-sm">{t.risk.saveSuccess}</span>
              </div>
          </div>
      )}

      {/* Column 1: Risk Settings */}
      <div id="risk-settings" className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-500" />
                {t.risk.settingsTitle}
                {isLocked && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                        <Lock className="w-3 h-3" /> 已锁定
                    </span>
                )}
            </h3>
            {isLocked && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>锁定于 {new Date(localSettings.lockedAt!).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <button
                            onClick={() => canReset ? setShowResetConfirm(true) : undefined}
                            disabled={!canReset}
                            title={!canReset ? `冷却中` : '重置设置'}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                canReset
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            <RotateCcw className="w-3 h-3" />
                            重置
                        </button>
                    </div>
                    {!canReset && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span>距下次可重置还剩：</span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">{countdownStr}</span>
                        </div>
                    )}
                </div>
            )}
            
            {/* Hard Limits Section */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                            {t.risk.accountSize} <InfoTooltip text={t.risk.tooltips.accountSize} />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input
                                type="number"
                                value={localSettings.accountSize}
                                disabled={isLocked}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setLocalSettings({...localSettings, accountSize: val});
                                    setSimBalance(val);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 pl-6 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center text-xs text-rose-500 dark:text-rose-400 font-bold uppercase mb-1">
                            {t.risk.maxDailyLoss} <InfoTooltip text={t.risk.tooltips.maxDailyLoss} />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input
                                type="number"
                                value={localSettings.maxDailyLoss}
                                disabled={isLocked}
                                onChange={e => setLocalSettings({...localSettings,maxDailyLoss: Number(e.target.value)})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded p-2 pl-6 text-rose-600 dark:text-rose-400 font-bold outline-none focus:border-rose-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                            {t.risk.maxTradeRisk} <InfoTooltip text={t.risk.tooltips.maxTradeRisk} />
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input
                                type="number"
                                value={localSettings.maxTradeRisk}
                                disabled={isLocked}
                                onChange={e => setLocalSettings({...localSettings, maxTradeRisk: Number(e.target.value)})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 pl-6 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                            {t.risk.maxConsecutiveLosses} <InfoTooltip text={t.risk.tooltips.maxConsecutiveLosses} />
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={localSettings.maxConsecutiveLosses || 4}
                            disabled={isLocked}
                            onChange={e => setLocalSettings({...localSettings, maxConsecutiveLosses: Number(e.target.value)})}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* New Risk Factors Section */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-3">Additional Constraints</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-1 gap-1">
                                <Layers className="w-3 h-3" /> Max Open Pos. <InfoTooltip text={t.risk.tooltips.maxOpenPositions} />
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={localSettings.maxOpenPositions || 1}
                                disabled={isLocked}
                                onChange={e => setLocalSettings({...localSettings, maxOpenPositions: Number(e.target.value)})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 mb-1 gap-1 font-bold">
                                <Target className="w-3 h-3" /> Daily Profit Target <InfoTooltip text={t.risk.tooltips.dailyProfitTarget} />
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                    type="number"
                                    value={localSettings.dailyProfitTarget || ''}
                                    disabled={isLocked}
                                    onChange={e => setLocalSettings({...localSettings, dailyProfitTarget: Number(e.target.value)})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded p-2 pl-6 text-emerald-600 dark:text-emerald-400 font-bold outline-none focus:border-emerald-500 placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {!isLocked && (
                <button
                    onClick={handleSave}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Lock className="w-4 h-4" /> 确认并锁定
                </button>
                )}
            </div>
        </div>

        {/* Review Center */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarCheck className="w-6 h-6 text-emerald-500" />
                {t.risk.reviewTitle}
            </h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{t.risk.dailyReview}</p>
                            <p className="text-xs text-slate-500">{t.risk.dailyDesc}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onUpdateReview('daily')}
                        disabled={isDailyDone}
                        className={`px-4 py-1 rounded text-sm font-medium ${isDailyDone ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isDailyDone ? t.risk.completed : t.risk.checkIn}
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                        <CalendarCheck className="w-5 h-5 text-purple-500" />
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{t.risk.weeklyReview}</p>
                            <p className="text-xs text-slate-500">{t.risk.weeklyDesc}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onUpdateReview('weekly')}
                        disabled={isWeeklyDone}
                         className={`px-4 py-1 rounded text-sm font-medium ${isWeeklyDone ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                        {isWeeklyDone ? t.risk.completed : t.risk.checkIn}
                    </button>
                </div>
                 <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-orange-500" />
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{t.risk.monthlyReview}</p>
                            <p className="text-xs text-slate-500">{t.risk.monthlyDesc}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onUpdateReview('monthly')}
                        disabled={isMonthlyDone}
                         className={`px-4 py-1 rounded text-sm font-medium ${isMonthlyDone ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                    >
                        {isMonthlyDone ? t.risk.completed : t.risk.checkIn}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Column 2: Trading Rules */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full transition-colors">
         <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            {t.risk.rulesTitle}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.risk.rulesDesc}</p>
        
        <div className="flex-1 space-y-3 overflow-y-auto mb-4">
            {rules.map(rule => (
                <div key={rule.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg group border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                    <button onClick={() => onToggleRule(rule.id)} className="mt-1">
                        {rule.isActive 
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 
                            : <div className="w-5 h-5 rounded-full border-2 border-slate-400 dark:border-slate-600" />
                        }
                    </button>
                    <span className={`flex-1 text-slate-700 dark:text-slate-200 ${!rule.isActive && 'text-slate-400 dark:text-slate-500 line-through'}`}>{rule.text}</span>
                    <button onClick={() => onDeleteRule(rule.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all">
                        ✕
                    </button>
                </div>
            ))}
            {rules.length === 0 && <p className="text-slate-500 text-center py-8">{t.risk.noRules}</p>}
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <input 
                type="text"
                value={newRuleText}
                onChange={e => setNewRuleText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newRuleText && (onAddRule(newRuleText), setNewRuleText(''))}
                placeholder={t.risk.addRulePlaceholder}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
            <button 
                onClick={() => { if(newRuleText) { onAddRule(newRuleText); setNewRuleText(''); } }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded transition-colors"
            >
                {t.risk.add}
            </button>
        </div>
      </div>

      {/* NEW SECTION: Equity Simulator (Full Width) */}
      <div id="risk-simulator" className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-indigo-500/5 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-purple-500" />
                      {t.risk.simulator.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.risk.simulator.desc}</p>
              </div>
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors mt-4 md:mt-0"
              >
                  <RefreshCw className="w-4 h-4" />
                  {t.risk.simulator.runSim}
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Controls */}
              <div className="space-y-5 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">
                      <Sliders className="w-4 h-4" /> Parameters
                  </div>
                  
                  {/* Start Balance */}
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <label className="text-slate-600 dark:text-slate-300">{t.risk.simulator.startBalance}</label>
                          <span className="font-mono font-bold">${simBalance.toLocaleString()}</span>
                      </div>
                      <input 
                        type="number" 
                        value={simBalance}
                        onChange={e => setSimBalance(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-1.5 text-sm"
                      />
                  </div>

                  {/* Risk % */}
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <label className="text-slate-600 dark:text-slate-300">{t.risk.simulator.riskPerTrade}</label>
                          <span className={`font-mono font-bold ${simRiskPct > 5 ? 'text-rose-500' : 'text-indigo-500'}`}>{simRiskPct}%</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="10" step="0.1"
                        value={simRiskPct}
                        onChange={e => setSimRiskPct(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500"
                      />
                  </div>

                  {/* Win Rate */}
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <label className="text-slate-600 dark:text-slate-300">{t.risk.simulator.winRate}</label>
                          <span className="font-mono font-bold text-emerald-500">{simWinRate}%</span>
                      </div>
                      <input 
                        type="range" min="10" max="90" step="1"
                        value={simWinRate}
                        onChange={e => setSimWinRate(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
                      />
                  </div>

                  {/* R:R Ratio */}
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <label className="text-slate-600 dark:text-slate-300">{t.risk.simulator.rrRatio}</label>
                          <span className="font-mono font-bold text-purple-500">1:{simRR}</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="10" step="0.1"
                        value={simRR}
                        onChange={e => setSimRR(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-purple-500"
                      />
                  </div>

                  {/* Num Trades */}
                  <div>
                      <div className="flex justify-between text-sm mb-1">
                          <label className="text-slate-600 dark:text-slate-300">{t.risk.simulator.numTrades}</label>
                          <span className="font-mono font-bold">{simTrades}</span>
                      </div>
                      <input 
                        type="range" min="20" max="500" step="10"
                        value={simTrades}
                        onChange={e => setSimTrades(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-slate-500"
                      />
                  </div>
              </div>

              {/* Chart */}
              <div className="md:col-span-2 flex flex-col h-[400px]">
                  
                  {/* Warning Panel */}
                  {(isBlown || isHighRisk) && (
                      <div className={`col-span-1 md:col-span-3 mb-4 p-4 rounded-xl border flex items-start gap-3 ${
                          isBlown 
                          ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' 
                          : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                      }`}>
                          <div className={`p-2 rounded-full shrink-0 ${isBlown ? 'bg-rose-100 text-rose-600 dark:bg-rose-800 dark:text-rose-200' : 'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-200'}`}>
                              {isBlown ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                          </div>
                          <div>
                              <h4 className={`font-bold ${isBlown ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                  {isBlown ? t.risk.simulator.blownAccount : t.risk.simulator.highRiskParam}
                              </h4>
                              <p className={`text-sm ${isBlown ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {isBlown 
                                    ? t.risk.simulator.blownDesc.replace('${trade}', blownTrade.toString()) 
                                    : t.risk.simulator.highRiskDesc}
                              </p>
                          </div>
                      </div>
                  )}

                  {/* Results Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`p-3 border rounded-xl ${isBlown ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-500/30'}`}>
                          <p className={`text-xs font-bold uppercase ${isBlown ? 'text-rose-600 dark:text-rose-300' : 'text-indigo-600 dark:text-indigo-300'}`}>{t.risk.simulator.finalEquity}</p>
                          <p className={`text-xl font-bold font-mono ${isBlown ? 'text-rose-900 dark:text-rose-100' : 'text-indigo-900 dark:text-white'}`}>
                              ${finalEquity.toLocaleString()} {isBlown && '(BLOWN)'}
                          </p>
                      </div>
                      <div className={`p-3 border rounded-xl ${totalGain >= 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-500/30' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-500/30'}`}>
                          <p className={`text-xs font-bold uppercase ${totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{t.risk.simulator.totalGain}</p>
                          <p className={`text-xl font-bold font-mono ${totalGain >= 0 ? 'text-emerald-800 dark:text-emerald-100' : 'text-rose-800 dark:text-rose-100'}`}>
                              {totalGain >= 0 ? '+' : ''}{gainPct.toFixed(2)}% (${totalGain.toLocaleString()})
                          </p>
                      </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2 shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={simulationData}>
                              <defs>
                                  <linearGradient id="simColor" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={totalGain >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor={totalGain >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                              <XAxis dataKey="trade" hide />
                              <YAxis domain={['auto', 'auto']} hide />
                              <Tooltip 
                                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                                  labelFormatter={(label) => `Trade #${label}`}
                              />
                              <Area 
                                  type="monotone" 
                                  dataKey="equity" 
                                  stroke={totalGain >= 0 ? "#10b981" : "#f43f5e"} 
                                  fill="url(#simColor)" 
                                  strokeWidth={2}
                              />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default RiskManagement;
