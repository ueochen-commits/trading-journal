import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Trade, TradeStatus, RiskSettings, TrackerRule, TrackerRuleType, DailyPlan, Friend, UserLevelProfile, DisciplineRule, DailyDisciplineRecord, WeeklyGoal, TradingAccount } from '../types';
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  Legend, ComposedChart,
  RadialBarChart, RadialBar,
  ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity, ShieldCheck, AlertOctagon, Hexagon, Calendar, Settings, X, XCircle, Plus, Sparkles, BrainCircuit, Trophy, Star, Crown, Eye, EyeOff, Users, UserPlus, Search, Flame, Award, CheckCircle2, Zap, Lightbulb, ClipboardList, CheckSquare, Edit2, ArrowRight, Clock, Globe, Sun, Building2, Landmark, Euro, BookOpen, Shield, Gem, Medal, Sunrise, Flower, Apple, ChevronDown, Check, Briefcase, Trash2, Circle, RefreshCw, BarChart2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useUser } from './UserContext';
import CalendarView from './CalendarView';
import { MOCK_FRIENDS, MOCK_INDICES } from '../constants';
import MentorWidget from './MentorWidget';

// ── TradeZella-style stat cards ──────────────────────────────────────────────

const TZInfoIcon = () => (
  <span style={{
    width: 14, height: 14, borderRadius: '50%',
    border: '1px solid #d1d5db', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 9, color: '#9ca3af', flexShrink: 0,
  }}>i</span>
);

const tzCardShell: React.CSSProperties = {
  background: '#ffffff',
  border: '0.5px solid #e8e8f0',
  borderRadius: 14,
  padding: '14px 16px 12px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 90,
  overflow: 'hidden',
  flex: 1,
  minWidth: 0,
};
const tzLabelRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280', fontWeight: 400, marginBottom: 6 };
const tzBigVal = (c: string): React.CSSProperties => ({ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: c });

// Semi-circle gauge (100×58, path-length 138.16)
const SemiGauge: React.FC<{ wins: number; bes: number; losses: number }> = ({ wins, bes, losses }) => {
  const total = wins + bes + losses || 1;
  const PL = 138.16;
  const wLen = (wins / total) * PL;
  const bLen = (bes / total) * PL;
  const lLen = (losses / total) * PL;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <svg width="100" height="58" viewBox="0 0 100 58">
        <path d="M8,54 A44,44 0 0,1 92,54" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" pathLength={PL} />
        {wLen > 0 && <path d="M8,54 A44,44 0 0,1 92,54" fill="none" stroke="#1D9E75" strokeWidth="8" strokeLinecap="round" pathLength={PL} strokeDasharray={`${wLen} ${PL}`} strokeDashoffset="0" />}
        {bLen > 0 && <path d="M8,54 A44,44 0 0,1 92,54" fill="none" stroke="#7F77DD" strokeWidth="8" strokeLinecap="round" pathLength={PL} strokeDasharray={`${bLen} ${PL}`} strokeDashoffset={-wLen} />}
        {lLen > 0 && <path d="M8,54 A44,44 0 0,1 92,54" fill="none" stroke="#E24B4A" strokeWidth="8" strokeLinecap="round" pathLength={PL} strokeDasharray={`${lLen} ${PL}`} strokeDashoffset={-(wLen + bLen)} />}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 100, marginTop: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#1D9E75', fontVariantNumeric: 'tabular-nums' }}>{wins}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#7F77DD', fontVariantNumeric: 'tabular-nums', flex: 1, textAlign: 'center' }}>{bes}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#E24B4A', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{losses}</span>
      </div>
    </div>
  );
};

const TZNetPnlCard: React.FC<{ value: number; total: number; wins: number; losses: number; label: string }> = ({ value, total, label }) => {
  const { currencySymbol } = useUser();
  const pos = value >= 0;
  const formatted = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div style={tzCardShell} className="dark:bg-slate-900 dark:border-slate-700">
      <div style={tzLabelRow} className="dark:text-slate-400">
        {label}<TZInfoIcon />
        <span style={{ fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }} className="dark:text-slate-400">{total}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
        <div style={tzBigVal(pos ? '#1D9E75' : '#E24B4A')}>
          {pos ? '+' : '-'}{currencySymbol}{formatted}
        </div>
      </div>
    </div>
  );
};

const TZWinRateCard: React.FC<{ winRate: number; wins: number; losses: number; breakEven: number; label: string }> = ({ winRate, wins, losses, breakEven, label }) => {
  const total = wins + losses + breakEven;
  return (
    <div style={tzCardShell} className="dark:bg-slate-900 dark:border-slate-700">
      <div style={tzLabelRow} className="dark:text-slate-400">{label}<TZInfoIcon /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flex: 1 }}>
        <div style={tzBigVal('#111827')} className="dark:text-white">
          {total === 0 ? '--' : `${winRate.toFixed(2)}%`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <SemiGauge wins={wins} bes={breakEven} losses={losses} />
        </div>
      </div>
    </div>
  );
};

const TZProfitFactorCard: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const circ = 2 * Math.PI * 28; // 175.93
  const fill = Math.min(value === Infinity ? 1 : value / 3, 1);
  const greenLen = fill * circ;
  return (
    <div style={tzCardShell} className="dark:bg-slate-900 dark:border-slate-700">
      <div style={tzLabelRow} className="dark:text-slate-400">{label}<TZInfoIcon /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flex: 1 }}>
        <div>
          <div style={tzBigVal('#111827')} className="dark:text-white">
            {value === 0 ? '--' : value === Infinity ? '∞' : value.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>综合盈亏比</div>
        </div>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
          <circle cx="36" cy="36" r="28" fill="none" stroke="#E24B4A" strokeWidth="7" />
          {fill > 0 && (
            <circle cx="36" cy="36" r="28" fill="none" stroke="#1D9E75" strokeWidth="7"
              strokeDasharray={`${greenLen} ${circ}`} strokeLinecap="butt"
              transform="rotate(-90 36 36)" />
          )}
        </svg>
      </div>
    </div>
  );
};

const TZDayWinCard: React.FC<{ dayWinRate: number; winDays: number; lossDays: number; breakEvenDays: number; label: string }> = ({ dayWinRate, winDays, lossDays, breakEvenDays, label }) => {
  const total = winDays + lossDays + breakEvenDays;
  return (
    <div style={tzCardShell} className="dark:bg-slate-900 dark:border-slate-700">
      <div style={tzLabelRow} className="dark:text-slate-400">{label}<TZInfoIcon /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flex: 1 }}>
        <div style={tzBigVal('#111827')} className="dark:text-white">
          {total === 0 ? '--' : `${dayWinRate.toFixed(2)}%`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <SemiGauge wins={winDays} bes={breakEvenDays} losses={lossDays} />
        </div>
      </div>
    </div>
  );
};

const TZAvgWinLossCard: React.FC<{ ratio: number; avgWin: number; avgLoss: number; label: string }> = ({ ratio, avgWin, avgLoss, label }) => {
  const absLoss = Math.abs(avgLoss);
  const total = avgWin + absLoss;
  const winPct = total > 0 ? (avgWin / total) * 100 : 50;
  return (
    <div style={tzCardShell} className="dark:bg-slate-900 dark:border-slate-700">
      <div style={tzLabelRow} className="dark:text-slate-400">{label}<TZInfoIcon /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div style={{ ...tzBigVal('#111827'), flexShrink: 0 }} className="dark:text-white">
          {ratio === 0 ? '--' : ratio.toFixed(2)}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <div style={{ width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ background: '#1D9E75', width: `${winPct}%` }} />
            <div style={{ background: '#E24B4A', flex: 1 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#1D9E75', fontVariantNumeric: 'tabular-nums' }}>${avgWin.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: '#E24B4A', fontVariantNumeric: 'tabular-nums' }}>-${absLoss.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};



const DailyPnlTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const pos = val >= 0;
  const { currencySymbol } = useUser();
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#1a1d2e', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, background: pos ? '#00c896' : '#ff4d6a', borderRadius: 2, display: 'inline-block' }} />
        <span style={{ color: pos ? '#00c896' : '#ff4d6a', fontWeight: 700 }}>{pos ? '+' : ''}{currencySymbol}{Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

// ── Trade Time Performance scatter chart ─────────────────────────────────────
const TradeTimeChart: React.FC<{ trades: any[]; language: string }> = ({ trades, language }) => {
  const [mode, setMode] = React.useState<'entry'|'exit'>('entry');
  const timeToHour = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? null : d.getHours() + d.getMinutes() / 60; };
  const ttData = useMemo(() => trades.filter(t => {
    const f = mode === 'entry' ? t.entryDate : t.exitDate;
    return f && f !== '';
  }).map(t => {
    const f = mode === 'entry' ? t.entryDate : t.exitDate;
    const hour = timeToHour(f);
    if (hour === null) return null;
    const d = new Date(f);
    return { x: parseFloat(hour.toFixed(4)), pnl: parseFloat((t.pnl - t.fees).toFixed(2)), symbol: t.symbol, timeLabel: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, date: d.toLocaleDateString() };
  }).filter(Boolean) as { x: number; pnl: number; symbol: string; timeLabel: string; date: string }[], [trades, mode]);

  const pnlVals = ttData.map(d => d.pnl);
  const maxP = pnlVals.length ? Math.max(...pnlVals) : 1000;
  const minP = pnlVals.length ? Math.min(...pnlVals) : -1000;
  const pad = Math.max(Math.abs(maxP), Math.abs(minP)) * 0.2 || 200;
  const yMax = Math.ceil((maxP + pad) / 500) * 500;
  const yMin = Math.floor((minP - pad) / 500) * 500;

  const isDark = document.documentElement.classList.contains('dark');
  const ttTooltipStyle: React.CSSProperties = { background: isDark ? '#0f172a' : '#fff', border: `1px solid ${isDark ? '#1e293b' : '#e8e8f0'}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 };

  return (
    <div style={{ background: isDark ? '#0f172a' : '#fff', border: `1px solid ${isDark ? '#1e293b' : '#ededf3'}`, borderRadius: 12, padding: '16px 20px', height: 320, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#f8fafc' : '#1a1d2e' }}>{language === 'cn' ? '交易时间表现' : 'Trade Time Performance'}</span>
          <TZInfoIcon />
        </div>
        <div style={{ display: 'flex', background: isDark ? '#1e293b' : '#f5f5fa', borderRadius: 7, padding: 3, gap: 2 }}>
          {(['entry', 'exit'] as const).map(key => (
            <button key={key} onClick={() => setMode(key)} style={{ padding: '5px 12px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: mode === key ? (isDark ? '#334155' : '#fff') : 'transparent', color: mode === key ? (isDark ? '#f8fafc' : '#1a1d2e') : '#9396aa', boxShadow: mode === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {key === 'entry' ? (language === 'cn' ? '入场' : 'Entry') : (language === 'cn' ? '出场' : 'Exit')}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {ttData.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0c3d4', fontSize: 13 }}>{language === 'cn' ? '暂无交易数据' : 'No trade data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.04)" />
              <XAxis type="number" dataKey="x" domain={[0, 24]} ticks={[0,4,8,12,16,20,24]} tickFormatter={(h: number) => `${String(h).padStart(2,'0')}:00`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#b0b3c6' }} />
              <YAxis type="number" dataKey="pnl" domain={[yMin, yMax]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#b0b3c6' }} width={46}
                tickFormatter={(v: number) => v >= 0 ? `$${(v/1000).toFixed(0)}k` : `-$${(Math.abs(v)/1000).toFixed(0)}k`} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
              <Tooltip cursor={{ strokeDasharray: '4 4', stroke: '#c0c3d4' }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  const isUp = d.pnl >= 0;
                  return (
                    <div style={ttTooltipStyle}>
                      <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#1a1d2e', marginBottom: 6 }}>{d.symbol}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: '#9396aa' }}>{language === 'cn' ? '时间' : 'Time'}</span><span style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#1a1d2e' }}>{d.timeLabel}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: '#9396aa' }}>P&L</span><span style={{ fontWeight: 700, color: isUp ? '#00c896' : '#ff4d6a' }}>{isUp ? '+' : ''}{currencySymbol}{Math.abs(d.pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: '#9396aa' }}>{language === 'cn' ? '日期' : 'Date'}</span><span style={{ color: '#4a4d6a' }}>{d.date}</span></div>
                      </div>
                    </div>
                  );
                }} />
              <Scatter data={ttData}>
                {ttData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#00c896' : '#ff4d6a'} fillOpacity={0.75} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c896', display: 'inline-block' }}/><span style={{ fontSize: 11, color: '#9396aa' }}>{language === 'cn' ? '盈利' : 'Profit'}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d6a', display: 'inline-block' }}/><span style={{ fontSize: 11, color: '#9396aa' }}>{language === 'cn' ? '亏损' : 'Loss'}</span></div>
      </div>
    </div>
  );
};

// ── Dashboard Progress Tracker (heatmap + today score) ───────────────────────
const HEAT_COLORS = ['#f0f0f6','#e0e4fd','#b8bef9','#7b7ef8','#4338ca'];
const heatColor = (v: number | undefined) => {
  if (!v) return HEAT_COLORS[0];
  if (v <= 0.25) return HEAT_COLORS[1];
  if (v <= 0.5) return HEAT_COLORS[2];
  if (v <= 0.75) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
};

function buildDashWeeks(): (string | null)[][] {
  const now = new Date();
  // Today in local time, normalized to midnight
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const y = now.getFullYear(), m = now.getMonth();
  // Start: 1st of 2 months ago, back to Sunday
  const startBase = new Date(y, m - 2, 1);
  const startSunday = new Date(y, m - 2, 1 - startBase.getDay());
  // End: last day of next month
  const endDate = new Date(y, m + 2, 0);

  const weeks: (string | null)[][] = [];
  const cur = new Date(startSunday);
  while (cur.getTime() <= endDate.getTime()) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + d);
      // Compare purely in local time — include today, exclude future
      week.push(day.getTime() <= todayLocal.getTime() ? toLocalStr(day) : null);
    }
    weeks.push(week);
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

const DashboardHeatmap: React.FC<{
  language: string;
  trades: any[];
  disciplineHistory?: any[];
  disciplineRules?: any[];
}> = ({ language, trades, disciplineHistory = [], disciplineRules = [] }) => {
  const weeks = useMemo(() => buildDashWeeks(), []);
  const _now = new Date();
  const todayKey = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const todayDayAbbr = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date().getDay()];
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [ruleSettings, setRuleSettings] = useState<any>(null);
  const [manualRules, setManualRules] = useState<any[]>([]);

  useEffect(() => {
    try {
      const s = localStorage.getItem('tg_rule_settings');
      if (s) setRuleSettings(JSON.parse(s));
      const m = localStorage.getItem('tg_manual_rules');
      if (m) setManualRules(JSON.parse(m));
    } catch {}
    const load = async () => {
      try {
        const { supabase } = await import('../supabaseClient');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('rule_execution_logs').select('date, completion_rate').eq('user_id', user.id);
        if (data?.length) {
          const hm: Record<string, number> = {};
          data.forEach((row: any) => { hm[row.date] = parseFloat(row.completion_rate); });
          setHeatmapData(hm);
          return;
        }
      } catch {}
      // Fallback from disciplineHistory
      if (disciplineHistory.length && disciplineRules.length) {
        const map: Record<string, number> = {};
        disciplineHistory.forEach((rec: any) => { map[rec.date] = rec.completedRuleIds.length / disciplineRules.length; });
        setHeatmapData(map);
      }
    };
    load();
  }, [disciplineHistory, disciplineRules]);

  // ── Identical rule evaluation logic as Psychology today rules panel ──
  const todayRuleRows = useMemo(() => {
    if (!ruleSettings) return [];
    const isTradingDay = ruleSettings.trading_days?.includes(todayDayAbbr) ?? true;
    if (!isTradingDay) return [];

    const todayTrades = trades.filter(t => t.entryDate?.startsWith(todayKey));
    const todayNetPnl = todayTrades.reduce((a: number, t: any) => a + (t.pnl - t.fees), 0);
    const worstTrade = todayTrades.length > 0 ? todayTrades.reduce((a: any, b: any) => (a.pnl - a.fees) < (b.pnl - b.fees) ? a : b) : null;
    const worstTradePnl = worstTrade ? (worstTrade.pnl - worstTrade.fees) : 0;
    const todayRecord = disciplineHistory.find((r: any) => r.date === todayKey);

    // Build today's rule list (same as Psychology todayRulesList)
    const sys = [
      ruleSettings.start_my_day_enabled && { id: 'start_my_day', name: language === 'cn' ? '开始我的一天' : 'Start my day by' },
      ruleSettings.link_to_playbook_enabled && { id: 'link_playbook', name: language === 'cn' ? '关联策略手册' : 'Link trades to playbook' },
      ruleSettings.input_stop_loss_enabled && { id: 'stop_loss', name: language === 'cn' ? '设置止损' : 'Input Stop loss' },
      ruleSettings.net_max_loss_per_trade_enabled && { id: 'max_loss_trade', name: language === 'cn' ? '单笔最大亏损' : 'Net max loss /trade' },
      ruleSettings.net_max_loss_per_day_enabled && { id: 'max_loss_day', name: language === 'cn' ? '单日最大亏损' : 'Net max loss /day' },
    ].filter(Boolean) as { id: string; name: string }[];
    const manual = manualRules.filter((r: any) => r.active_days?.includes(todayDayAbbr)).map((r: any) => ({ id: r.id, name: r.name }));

    return [...sys, ...manual].map(rule => {
      if (rule.id === 'start_my_day') {
        return { ...rule, value: ruleSettings.start_my_day_time, status: todayTrades.length > 0 ? 'pass' : 'pending' };
      }
      if (rule.id === 'link_playbook') {
        const unlinked = todayTrades.filter((t: any) => !t.setup || t.setup === '');
        const status = todayTrades.length === 0 ? 'pending' : unlinked.length === 0 ? 'pass' : 'fail';
        return { ...rule, value: todayTrades.length === 0 ? '—' : `${todayTrades.length - unlinked.length}/${todayTrades.length}`, status };
      }
      if (rule.id === 'stop_loss') {
        const noSL = todayTrades.filter((t: any) => !t.riskAmount || t.riskAmount === 0);
        const status = todayTrades.length === 0 ? 'pending' : noSL.length === 0 ? 'pass' : 'fail';
        return { ...rule, value: todayTrades.length === 0 ? '—' : `${todayTrades.length - noSL.length}/${todayTrades.length}`, status };
      }
      if (rule.id === 'max_loss_trade') {
        const limit = ruleSettings.net_max_loss_per_trade_value;
        const type = ruleSettings.net_max_loss_per_trade_type;
        const exceeded = todayTrades.some((t: any) => (t.pnl - t.fees) < -(type === '%' ? (limit / 100) * 10000 : limit));
        const status = todayTrades.length === 0 ? 'pending' : exceeded ? 'fail' : 'pass';
        return { ...rule, value: worstTrade ? `$${Math.abs(worstTradePnl).toFixed(0)} / ${type}${limit}` : `${type}${limit}`, status };
      }
      if (rule.id === 'max_loss_day') {
        const limit = ruleSettings.net_max_loss_per_day_value;
        const exceeded = todayNetPnl < -limit;
        const status = todayTrades.length === 0 ? 'pending' : exceeded ? 'fail' : 'pass';
        return { ...rule, value: `$${Math.abs(todayNetPnl).toFixed(0)} / $${limit}`, status };
      }
      const done = todayRecord?.completedRuleIds?.includes(rule.id) ?? false;
      return { ...rule, value: '—', status: done ? 'pass' : 'pending' };
    }) as { id: string; name: string; value: string; status: 'pass' | 'fail' | 'pending' }[];
  }, [ruleSettings, manualRules, trades, todayKey, todayDayAbbr, disciplineHistory, language]);

  const todayCompleted = todayRuleRows.filter(r => r.status === 'pass').length;
  const todayTotal = todayRuleRows.length;
  const pct = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  const monthLabels: { col: number; label: string }[] = [];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d !== null);
    if (first) { const d = new Date(first); if (d.getDate() <= 7) monthLabels.push({ col: wi, label: `${d.getMonth() + 1}月` }); }
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #ededf3', borderRadius: 12, padding: '16px 20px' }} className="dark:bg-slate-900 dark:border-slate-800">
      {tip && <div style={{ position: 'fixed', left: tip.x + 8, top: tip.y - 36, background: '#1a1d2e', color: '#fff', fontSize: 10, padding: '4px 8px', borderRadius: 5, pointerEvents: 'none', zIndex: 999, whiteSpace: 'nowrap' }}>{tip.key}：{Math.round((heatmapData[tip.key] ?? 0) * 100)}%</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }} className="dark:text-white">{language === 'cn' ? '规则追踪热力图' : 'Progress Tracker'}</span>
          <TZInfoIcon />
        </div>
      </div>

      {showChecklist ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1d2e', marginBottom: 10 }} className="dark:text-white">{language === 'cn' ? '今日规则' : "Today's Rules"}</div>
          {todayRuleRows.length === 0 ? (
            <div style={{ fontSize: 12, color: '#b0b3c6', textAlign: 'center', padding: '20px 0' }}>{language === 'cn' ? '今日无生效规则' : 'No rules active today'}</div>
          ) : todayRuleRows.map((rule, i) => (
            <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < todayRuleRows.length - 1 ? '1px solid #f5f5fa' : 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rule.status === 'pass' ? '#00c896' : rule.status === 'fail' ? '#ff4d6a' : '#f0f0f6', border: `2px solid ${rule.status === 'pass' ? '#00c896' : rule.status === 'fail' ? '#ff4d6a' : '#e0e0ea'}` }}>
                {rule.status === 'pass' && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                {rule.status === 'fail' && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✕</span>}
              </div>
              <span style={{ flex: 1, fontSize: 12.5, color: rule.status === 'pass' ? '#9396aa' : '#1a1d2e', textDecoration: rule.status === 'pass' ? 'line-through' : 'none' }}>{rule.name}</span>
              <span style={{ fontSize: 12, fontWeight: 400, flexShrink: 0, color: rule.status === 'pass' ? '#00c896' : rule.status === 'fail' ? '#ff4d6a' : '#b0b3c6' }}>{rule.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 18, marginRight: 4 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ height: 14, fontSize: 9, color: '#b0b3c6', lineHeight: '14px', width: 22, textAlign: 'right' }}>
                  {['Mon','Wed','Fri'].includes(d) ? d : ''}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 3, height: 18 }}>
                {weeks.map((_, wi) => { const ml = monthLabels.find(m => m.col === wi); return <div key={wi} style={{ width: 14, fontSize: 9, color: '#b0b3c6', whiteSpace: 'nowrap' }}>{ml?.label || ''}</div>; })}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {week.map((dateKey, di) => (
                      <div key={di} style={{ width: 14, height: 14, borderRadius: 2, background: dateKey ? heatColor(heatmapData[dateKey]) : 'transparent', border: dateKey === todayKey ? '1.5px solid #f97316' : 'none', cursor: dateKey ? 'pointer' : 'default' }}
                        onMouseEnter={e => dateKey && setTip({ key: dateKey, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTip(null)} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 9, color: '#b0b3c6' }}>Less</span>
                {HEAT_COLORS.map((c, i) => <span key={i} style={{ width: 11, height: 11, background: c, borderRadius: 2, display: 'inline-block' }} />)}
                <span style={{ fontSize: 9, color: '#b0b3c6' }}>More</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: '#f0f0f6', margin: '12px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#9396aa', marginBottom: 5 }}>{language === 'cn' ? '今日得分' : "Today's score"}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1d2e', letterSpacing: '-0.5px' }} className="dark:text-white">{todayCompleted}/{todayTotal}</span>
            <div style={{ width: 100, height: 5, background: '#f0f0f6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#00c896' : '#6366f1', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
        <button onClick={() => setShowChecklist(v => !v)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e0e0ea', background: '#fff', fontSize: 12, fontWeight: 600, color: '#1a1d2e', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f5f5fa'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
        >
          {showChecklist ? (language === 'cn' ? '← 热力图' : '← Heatmap') : (language === 'cn' ? '每日检查清单' : 'Daily checklist')}
        </button>
      </div>
    </div>
  );
};

const MARKET_OPTIONS = [
    { id: 'sydney', labelKey: 'sydney', zone: 'Australia/Sydney', start: [10, 0], end: [16, 0], color: 'amber', icon: Sunrise },
    { id: 'tokyo', labelKey: 'asia', zone: 'Asia/Tokyo', start: [9, 0], end: [15, 0], color: 'cyan', icon: Flower },
    { id: 'hongkong', labelKey: 'hongKong', zone: 'Asia/Hong_Kong', start: [9, 30], end: [16, 0], color: 'purple', icon: Gem }, 
    { id: 'frankfurt', labelKey: 'frankfurt', zone: 'Europe/Berlin', start: [9, 0], end: [17, 30], color: 'blue', icon: Euro },
    { id: 'london', labelKey: 'london', zone: 'Europe/London', start: [8, 0], end: [16, 30], color: 'indigo', icon: Crown },
    { id: 'newyork', labelKey: 'newYork', zone: 'America/New_York', start: [9, 30], end: [16, 0], color: 'rose', icon: Landmark },
];

const MOCK_GOAL_HISTORY = [
    { id: 1, week: '12/08 - 12/14', target: 1000, current: 1250, status: 'success' },
    { id: 2, week: '12/01 - 12/07', target: 1000, current: 800, status: 'fail' },
    { id: 3, week: '11/24 - 11/30', target: 500, current: 620, status: 'success' },
    { id: 4, week: '11/17 - 11/23', target: 500, current: 450, status: 'fail' },
];

const useMarketHours = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const getMarketStatus = (config: typeof MARKET_OPTIONS[0]) => {
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone: config.zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short'
    });
    const parts = format.formatToParts(now);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const weekday = parts.find(p => p.type === 'weekday')?.value;
    const currentTimeVal = h * 60 + m;
    const startTimeVal = config.start[0] * 60 + config.start[1];
    const endTimeVal = config.end[0] * 60 + config.end[1];
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    const isOpen = !isWeekend && currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return { time: `${hh}:${mm}`, isOpen };
  };
  return { getMarketStatus };
};

const MARKET_ABBR: Record<string, string> = {
  sydney: 'SYD', tokyo: 'TYO', hongkong: 'HKG', frankfurt: 'FRA', london: 'LON', newyork: 'NYC',
};

const FlagJP = () => (
  <svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="3" height="2" fill="#ffffff" />
    <circle cx="1.5" cy="1" r="0.6" fill="#BC002D" />
  </svg>
);

const FlagGB = () => (
  <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="60" height="30" fill="#012169" />
    <line x1="0" y1="0" x2="60" y2="30" stroke="#ffffff" strokeWidth="6" />
    <line x1="60" y1="0" x2="0" y2="30" stroke="#ffffff" strokeWidth="6" />
    <line x1="0" y1="0" x2="60" y2="30" stroke="#C8102E" strokeWidth="3.5" />
    <line x1="60" y1="0" x2="0" y2="30" stroke="#C8102E" strokeWidth="3.5" />
    <line x1="30" y1="0" x2="30" y2="30" stroke="#ffffff" strokeWidth="10" />
    <line x1="0" y1="15" x2="60" y2="15" stroke="#ffffff" strokeWidth="10" />
    <line x1="30" y1="0" x2="30" y2="30" stroke="#C8102E" strokeWidth="6" />
    <line x1="0" y1="15" x2="60" y2="15" stroke="#C8102E" strokeWidth="6" />
  </svg>
);

const FlagUS = () => (
  <svg viewBox="0 0 19 10" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="19" height="10" fill="#ffffff" />
    {[0,1,2,3,4,5,6].map(i => <rect key={i} x="0" y={i * 1.54} width="19" height="0.77" fill="#B22234" />)}
    <rect x="0" y="0" width="7.6" height="5.38" fill="#3C3B6E" />
    {[0.95,2.85,4.75,6.65].map(x => <text key={x} x={x} y="1.7" fontSize="1.3" fill="#fff" textAnchor="middle">★</text>)}
    {[1.9,3.8,5.7].map(x => <text key={x} x={x} y="3.1" fontSize="1.3" fill="#fff" textAnchor="middle">★</text>)}
    {[0.95,2.85,4.75,6.65].map(x => <text key={x} x={x} y="4.5" fontSize="1.3" fill="#fff" textAnchor="middle">★</text>)}
  </svg>
);

const FlagHK = () => (
  <svg viewBox="0 0 4 3" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="4" height="3" fill="#DE2910" />
    <g transform="translate(2,1.5) scale(0.9)">
      {[0,72,144,216,288].map(deg => (
        <path key={deg} transform={`rotate(${deg})`}
          d="M0,-0.55 C0.18,-0.28 0.05,0.1 -0.2,0.28 C-0.45,0.45 -0.55,0.1 -0.35,-0.1 C-0.55,0.05 -0.55,-0.3 -0.3,-0.42 C-0.05,-0.55 0.1,-0.2 0,-0.55Z"
          fill="#ffffff" />
      ))}
    </g>
  </svg>
);

const FlagAU = () => (
  <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="60" height="30" fill="#00008B" />
    <line x1="0" y1="0" x2="30" y2="30" stroke="#fff" strokeWidth="4" />
    <line x1="30" y1="0" x2="0" y2="30" stroke="#fff" strokeWidth="4" />
    <line x1="0" y1="0" x2="30" y2="30" stroke="#CC0000" strokeWidth="2.5" />
    <line x1="30" y1="0" x2="0" y2="30" stroke="#CC0000" strokeWidth="2.5" />
    <line x1="15" y1="0" x2="15" y2="30" stroke="#fff" strokeWidth="6" />
    <line x1="0" y1="15" x2="30" y2="15" stroke="#fff" strokeWidth="6" />
    <line x1="15" y1="0" x2="15" y2="30" stroke="#CC0000" strokeWidth="3.5" />
    <line x1="0" y1="15" x2="30" y2="15" stroke="#CC0000" strokeWidth="3.5" />
    <polygon points="44,22 45,25 48,25 45.5,27 46.5,30 44,28 41.5,30 42.5,27 40,25 43,25" fill="#fff" transform="scale(0.5) translate(42,-10)" />
    <polygon points="51,4 52,7 55,7 52.5,9 53.5,12 51,10 48.5,12 49.5,9 47,7 50,7" fill="#fff" transform="scale(0.42) translate(48,4)" />
    <polygon points="55,16 56,19 59,19 56.5,21 57.5,24 55,22 52.5,24 53.5,21 51,19 54,19" fill="#fff" transform="scale(0.38) translate(60,-4)" />
    <polygon points="44,10 44.6,12 46.6,12 45,13.2 45.6,15.2 44,14 42.4,15.2 43,13.2 41.4,12 43.4,12" fill="#fff" transform="scale(0.4) translate(52,8)" />
  </svg>
);

const FlagDE = () => (
  <svg viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="0" y="0" width="5" height="1" fill="#000000" />
    <rect x="0" y="1" width="5" height="1" fill="#DD0000" />
    <rect x="0" y="2" width="5" height="1" fill="#FFCE00" />
  </svg>
);

const FLAG_MAP: Record<string, React.FC> = {
  tokyo: FlagJP,
  london: FlagGB,
  newyork: FlagUS,
  hongkong: FlagHK,
  sydney: FlagAU,
  frankfurt: FlagDE,
};

const MarketSessionCard: React.FC<{
  label: string;
  marketId: string;
  data: { time: string; isOpen: boolean };
  count: number;
  isFirst: boolean;
}> = ({ label, marketId, data, count, isFirst }) => {
  const { t } = useLanguage();
  const cityName = count === 4 ? (MARKET_ABBR[marketId] || label) : label;
  const fontSize = count <= 3 ? 26 : 20;
  const flagW = count <= 3 ? 130 : 110;
  const flagH = count <= 3 ? 90 : 76;
  const FlagComp = FLAG_MAP[marketId];
  const maskStyle = {
    WebkitMaskImage: 'radial-gradient(ellipse 78% 75% at 68% 68%, black 25%, transparent 75%)',
    maskImage: 'radial-gradient(ellipse 78% 75% at 68% 68%, black 25%, transparent 75%)',
  };
  return (
    <div style={{
      flex: 1,
      padding: '10px 14px',
      backgroundColor: data.isOpen ? '#ffffff' : '#f7f7f9',
      borderLeft: isFirst ? 'none' : '0.5px solid #e4e4ec',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
    }}
    className={data.isOpen ? 'dark:bg-slate-900' : 'dark:bg-slate-950'}
    >
      {/* Flag watermark */}
      {FlagComp && (
        <div style={{
          position: 'absolute',
          right: -10,
          bottom: -10,
          width: flagW,
          height: flagH,
          zIndex: 1,
          opacity: data.isOpen ? 0.25 : 0.07,
          ...maskStyle,
        }}>
          <FlagComp />
        </div>
      )}

      {/* City name */}
      <span style={{
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#9b9bb0',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        position: 'relative',
        zIndex: 2,
      }} className="dark:text-slate-500">
        {cityName}
      </span>
      {/* Time */}
      <span style={{
        fontSize,
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        margin: '3px 0',
        color: data.isOpen ? '#1a1d2e' : '#9b9bb0',
        position: 'relative',
        zIndex: 2,
      }} className={data.isOpen ? 'dark:text-white' : 'dark:text-slate-500'}>
        {data.time}
      </span>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, position: 'relative', zIndex: 2 }}>
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: data.isOpen ? '#639922' : 'rgba(155,155,176,0.3)',
        }} />
        <span style={{ fontSize: 11, color: '#9b9bb0' }} className="dark:text-slate-500">
          {data.isOpen ? t.dashboard.marketHours.open : t.dashboard.marketHours.closed}
        </span>
      </div>
    </div>
  );
};

const GoalHistoryModal = ({ isOpen, onClose, history, language }: { isOpen: boolean, onClose: () => void, history: any[], language: string }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        {language === 'cn' ? '往期目标回顾' : 'Goal History'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Week</th>
                                    <th className="px-4 py-3">Target</th>
                                    <th className="px-4 py-3">Actual</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {history.map((row) => (
                                    <tr key={row.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">{row.week}</td>
                                        <td className="px-4 py-4 text-slate-500 font-mono">${row.target}</td>
                                        <td className={`px-4 py-4 font-mono font-bold ${row.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            ${row.current}
                                        </td>
                                        <td className="px-4 py-4">
                                            {row.status === 'success' ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-rose-500 mx-auto" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full mt-8 py-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-[0.98]"
                    >
                        {language === 'cn' ? '确认关闭' : 'Close History'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const grailScoreColorStops = ['#ff4d4d', '#ff9500', '#ffcd00', '#7ecb3a', '#3dbf7a'];
function interpolateGrailColor(score: number): string {
  const t = Math.min(100, Math.max(0, score)) / 100;
  const seg = t * (grailScoreColorStops.length - 1);
  const i = Math.min(Math.floor(seg), grailScoreColorStops.length - 2);
  const f = seg - i;
  const parse = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const c0 = parse(grailScoreColorStops[i]), c1 = parse(grailScoreColorStops[i + 1]);
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
  return `rgb(${r},${g},${b})`;
}

const GRAIL_LABELS = ['胜率', '盈利因子', '盈亏比', '恢复因子', '最大回撤', '稳定性'];

const GrailScoreWidget: React.FC<{ composite: number; radarData: { subject: string; value: number; fullMark: number }[]; language: string }> = ({ composite, radarData }) => {
  const clampedScore = Math.min(100, Math.max(0, composite));
  const indicatorColor = interpolateGrailColor(clampedScore);

  // SVG radar geometry
  const svgW = 360, svgH = 340;
  const cx = svgW / 2, cy = svgH / 2;
  const maxR = 110;
  const layers = 5;
  const sides = 6;
  const angleOffset = -Math.PI / 2; // start from top

  const hexPoint = (r: number, idx: number) => {
    const angle = angleOffset + (2 * Math.PI * idx) / sides;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
  };

  const hexPath = (r: number) => {
    const pts = Array.from({ length: sides }, (_, i) => hexPoint(r, i));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z';
  };

  // English keys matching radarData.subject, in same order as GRAIL_LABELS
  const GRAIL_KEYS = ['Win %', 'Profit factor', 'Avg win/loss', 'Recovery factor', 'Max drawdown', 'Consistency'];

  // Map radarData values to points
  const dataValues = GRAIL_KEYS.map(key => {
    const found = radarData.find(d => d.subject === key);
    return found ? Math.min(found.value / found.fullMark, 1) : 0;
  });

  const dataPoints = dataValues.map((v, i) => hexPoint(maxR * v, i));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z';

  // Label positions (pushed outward)
  const labelOffset = 22;
  const labelPositions = Array.from({ length: sides }, (_, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / sides;
    return [cx + (maxR + labelOffset) * Math.cos(angle), cy + (maxR + labelOffset) * Math.sin(angle)] as [number, number];
  });

  const labelAnchors: Array<'middle' | 'start' | 'end'> = ['middle', 'start', 'start', 'middle', 'end', 'end'];
  const labelDy = ['-0.3em', '0.35em', '0.35em', '1em', '0.35em', '0.35em'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#f0f0f0] dark:border-slate-800 p-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold" style={{ color: '#1a1a2e' }}>
          <span className="dark:text-slate-100">Grail Score</span>
        </span>
        <div className="w-5 h-5 rounded-full border border-[#ccc] dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors">
          <span className="text-[10px] font-bold leading-none" style={{ color: '#aaa' }}>i</span>
        </div>
      </div>
      <div className="h-px mt-3 mb-2" style={{ backgroundColor: '#f0f0f0' }} />

      {/* Pure SVG Radar */}
      <div className="flex justify-center">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>

          {/* Hexagonal grid layers (outer to inner, so inner paints on top) */}
          {(() => {
            const layerFills = ['#f8f8fc', '#fdfdff', '#f8f8fc', '#fdfdff', '#f8f8fc'];
            return [...Array(layers)].map((_, idx) => {
              const i = layers - 1 - idx;
              return <path key={`grid-${i}`} d={hexPath(maxR * ((i + 1) / layers))} fill={layerFills[i]} stroke="#dddde8" strokeWidth={1} />;
            });
          })()}

          {/* Axis lines from center to vertices */}
          {Array.from({ length: sides }, (_, i) => {
            const [px, py] = hexPoint(maxR, i);
            return <line key={`axis-${i}`} x1={cx} y1={cy} x2={px} y2={py} stroke="#dddde8" strokeWidth={1} />;
          })}

          {/* Filled data area — no stroke */}
          <path d={dataPath} fill="rgba(180,168,220,0.32)" stroke="none" />

          {/* Data points — two-layer: outer glow + inner dot */}
          {dataPoints.map((p, i) => (
            <g key={`dot-${i}`}>
              <circle cx={p[0]} cy={p[1]} r={6} fill="rgba(139,92,246,0.15)" />
              <circle cx={p[0]} cy={p[1]} r={2.5} fill="#ffffff" stroke="#8b72d4" strokeWidth={1.5} />
            </g>
          ))}

          {/* Labels */}
          {GRAIL_LABELS.map((label, i) => (
            <text
              key={`label-${i}`}
              x={labelPositions[i][0]}
              y={labelPositions[i][1]}
              textAnchor={labelAnchors[i]}
              dy={labelDy[i]}
              fontSize={12}
              fill="#888"
              fontWeight={400}
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      {/* Score + progress bar (side by side) */}
      <div className="flex items-center gap-5 mt-2">
        {/* Left: score */}
        <div className="flex-shrink-0">
          <p className="uppercase text-[11px] font-semibold tracking-[1px]" style={{ color: '#999' }}>YOUR GRAIL 分数</p>
          <span className="text-[40px] font-bold tabular-nums leading-none" style={{ color: '#1a1a2e' }}>
            <span className="dark:text-white">{clampedScore.toFixed(2)}</span>
          </span>
        </div>

        {/* Right: progress bar */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="relative">
            {/* Bar track */}
            <div className="h-[5px] w-full rounded-full overflow-hidden" style={{ backgroundColor: '#e5e5e5' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${clampedScore}%`,
                  background: `linear-gradient(to right, ${grailScoreColorStops.join(', ')})`
                }}
              />
            </div>
            {/* Indicator dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-700"
              style={{
                left: `calc(${clampedScore}% - 6px)`,
                backgroundColor: indicatorColor,
                boxShadow: '0 1px 5px rgba(0,0,0,0.2)'
              }}
            />
          </div>
          {/* Tick labels */}
          <div className="flex justify-between mt-1.5">
            {[0, 20, 40, 60, 80, 100].map(n => (
              <span key={n} className="text-[11px] tabular-nums" style={{ color: '#ccc' }}>{n}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardProps {
  trades: Trade[];
  riskSettings: RiskSettings;
  trackerRules: TrackerRule[];
  onUpdateTrackerRules: (rules: TrackerRule[]) => void;
  plans?: DailyPlan[];
  onSavePlan?: (plan: DailyPlan) => void;
  onQuickAddTrade?: () => void;
  userProfile?: UserLevelProfile;
  disciplineHistory?: DailyDisciplineRecord[];
  disciplineRules?: DisciplineRule[];
  onUpdateDisciplineRules?: (rules: DisciplineRule[]) => void;
  onCheckDisciplineRule?: (ruleId: string, isChecked: boolean) => void;
  onStartReview?: (type: 'daily' | 'weekly' | 'monthly') => void;
  weeklyGoal?: WeeklyGoal;
  onSetWeeklyGoal?: (goal: WeeklyGoal) => void;
  onViewGoals?: () => void;
  onViewLeaderboard?: () => void;
  onViewPsychology?: () => void;
  tradingAccounts?: TradingAccount[];
  onManageAccounts?: () => void;
  selectedAccountId?: string;
  onAccountChange?: (id: string) => void;
}

const getRange = (period: 'today' | 'week' | 'month' | 'last30') => {
    const end = new Date();
    const start = new Date();
    if (period === 'today') {
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
    } else if (period === 'week') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0,0,0,0);
    } else if (period === 'month') {
        start.setDate(1);
        start.setHours(0,0,0,0);
    } else if (period === 'last30') {
        start.setDate(start.getDate() - 30);
        start.setHours(0,0,0,0);
    }
    return { start, end };
};

const Dashboard: React.FC<DashboardProps> = ({
    trades: allTrades, riskSettings, trackerRules, onUpdateTrackerRules, plans = [], onSavePlan, onQuickAddTrade,
    userProfile, disciplineHistory, disciplineRules, onUpdateDisciplineRules, onCheckDisciplineRule, onStartReview,
    weeklyGoal, onSetWeeklyGoal, onViewGoals, onViewLeaderboard, onViewPsychology,
    tradingAccounts, onManageAccounts, selectedAccountId: externalAccountId, onAccountChange
}) => {
  const { t, language } = useLanguage();
  const { currencySymbol } = useUser();
  const accounts = tradingAccounts || [];
  const isDark = document.documentElement.classList.contains('dark');
  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '0.5rem' }
    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const { getMarketStatus } = useMarketHours();
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('selectedMarketIds');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['tokyo', 'london', 'newyork'];
  });
  const [isMarketConfigOpen, setIsMarketConfigOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newDisciplineRuleText, setNewDisciplineRuleText] = useState('');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [tempGoal, setTempGoal] = useState<WeeklyGoal>(weeklyGoal || { type: 'amount', value: 1000, isActive: true });
  const [timeToMidnight, setTimeToMidnight] = useState('');
  const [greeting, setGreeting] = useState('');
  const selectedAccountId = externalAccountId ?? 'all';
  const setSelectedAccountId = (id: string) => onAccountChange?.(id);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const accountSwitcherRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>(getRange('last30'));
  const [activeDatePreset, setActiveDatePreset] = useState<string>('All Time');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(new Date());

  // --- NEW: Dynamic Todo State ---
  const [customTodos, setCustomTodos] = useState<{id: string, label: string, isCompleted: boolean}[]>(() => {
      const saved = localStorage.getItem('tg_custom_todos');
      return saved ? JSON.parse(saved) : [];
  });
  const [newTodoInput, setNewTodoInput] = useState('');
  const [isTodoListExpanded, setIsTodoListExpanded] = useState(false);

  useEffect(() => {
      localStorage.setItem('tg_custom_todos', JSON.stringify(customTodos));
  }, [customTodos]);

  useEffect(() => {
      const updateGreeting = () => {
          const hour = new Date().getHours();
          let key = 'morning';
          if (hour >= 18) key = 'evening';
          else if (hour >= 13) key = 'afternoon';
          else if (hour >= 11) key = 'noon';
          const msg = t.dashboard.greeting?.[key] || t.dashboard.greeting?.morning;
          setGreeting(msg);
      };
      updateGreeting();
      const timer = setInterval(updateGreeting, 60000);
      return () => clearInterval(timer);
  }, [t, language]);

  useEffect(() => {
      const updateTimer = () => {
          const now = new Date();
          const midnight = new Date();
          midnight.setHours(24, 0, 0, 0);
          const diff = midnight.getTime() - now.getTime();
          if (diff <= 0) setTimeToMidnight("00:00:00");
          else {
              const h = Math.floor(diff / (1000 * 60 * 60));
              const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((diff % (1000 * 60)) / 1000);
              setTimeToMidnight(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (accountSwitcherRef.current && !accountSwitcherRef.current.contains(event.target as Node)) setIsAccountSwitcherOpen(false);
          if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setIsDatePickerOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trades = useMemo(() => {
      return allTrades.filter(t => {
          if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false;
          const tDate = new Date(t.entryDate).getTime();
          if (activeDatePreset === 'All Time' || activeDatePreset === '所有时间') return true;
          return tDate >= dateRange.start.getTime() && tDate <= dateRange.end.getTime();
      });
  }, [allTrades, selectedAccountId, dateRange, activeDatePreset]);

  useEffect(() => {
    const generateLocalInsights = () => {
        const tips: string[] = [];
        const sortedTrades = [...trades].sort((a, b) => b.pnl - a.pnl).slice(0, 30);
        if (sortedTrades.length === 0) return [];
        const mistakesCount: Record<string, number> = {};
        sortedTrades.forEach(t => { t.mistakes?.forEach(m => mistakesCount[m] = (mistakesCount[m] || 0) + 1); });
        const topMistake = Object.entries(mistakesCount).sort((a, b) => b[1] - a[1])[0];
        if (topMistake) tips.push(`${t.dashboard.aiTips.avoid}: ${topMistake[0]}`);
        else tips.push(t.dashboard.aiTips.good);
        const setupWinRate: Record<string, {wins: number, total: number}> = {};
        sortedTrades.forEach(t => {
            if (!setupWinRate[t.setup]) setupWinRate[t.setup] = {wins: 0, total: 0};
            setupWinRate[t.setup].total++;
            if (t.pnl > 0) setupWinRate[t.setup].wins++;
        });
        let bestSetup = '';
        let bestRate = -1;
        Object.entries(setupWinRate).forEach(([setup, data]) => {
            if (data.total >= 3) {
                const rate = data.wins / data.total;
                if (rate > bestRate) { bestRate = rate; bestSetup = setup; }
            }
        });
        if (bestSetup) tips.push(`${t.dashboard.aiTips.focus}: ${bestSetup} (${(bestRate * 100).toFixed(0)}% WR)`);
        const noteTrade = sortedTrades.find(t => t.reviewNotes || t.notes);
        if (noteTrade) {
            const text = noteTrade.reviewNotes || noteTrade.notes;
            const snippet = text.replace(/<[^>]*>?/gm, '').substring(0, 25) + '...';
            tips.push(`${t.dashboard.aiTips.note}: "${snippet}"`);
        }
        return tips;
    };
    setLoadingTips(true);
    const timer = setTimeout(() => {
        setAiTips(generateLocalInsights());
        setLoadingTips(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [trades, language, t]);

  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const winTrades = trades.filter(t => (t.pnl - t.fees) > 0);
    const lossTrades = trades.filter(t => (t.pnl - t.fees) < 0);
    const breakEvenTrades = trades.filter(t => (t.pnl - t.fees) === 0);
    const wins = winTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const netPnl = trades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    const grossProfit = winTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    const grossLoss = lossTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    const profitFactor = Math.abs(grossLoss) > 0 ? Math.abs(grossProfit / grossLoss) : grossProfit > 0 ? grossProfit : 0;
    const today = new Date().toDateString();
    const todayTrades = allTrades.filter(t =>
      new Date(t.entryDate).toDateString() === today &&
      (selectedAccountId === 'all' || t.accountId === selectedAccountId)
    );
    const todayPnl = todayTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    // Sparkline: last 12 trades cumulative PnL
    const sorted = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).slice(-12);
    let cum = 0;
    const pnlSpark = sorted.map(t => { cum += (t.pnl - t.fees); return cum; });
    const wrSpark = sorted.map((_, i) => { const slice = sorted.slice(0, i + 1); return slice.filter(t => (t.pnl - t.fees) > 0).length / slice.length * 100; });
    const avgWin = winTrades.length > 0 ? winTrades.reduce((a, t) => a + (t.pnl - t.fees), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((a, t) => a + (t.pnl - t.fees), 0) / lossTrades.length : 0;
    const avgWinLossRatio = avgWin > 0 && Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;
    // Day stats
    const dayMap: Record<string, number> = {};
    trades.forEach(t => { const d = new Date(t.entryDate).toDateString(); dayMap[d] = (dayMap[d] || 0) + (t.pnl - t.fees); });
    const dayVals = Object.values(dayMap);
    const winDays = dayVals.filter(v => v > 0).length;
    const lossDays = dayVals.filter(v => v < 0).length;
    const breakEvenDays = dayVals.filter(v => v === 0).length;
    const dayWinRate = dayVals.length > 0 ? (winDays / dayVals.length) * 100 : 0;
    return { totalTrades, winRate, netPnl, profitFactor, todayPnl, pnlSpark, wrSpark,
      winCount: winTrades.length, lossCount: lossTrades.length, breakEvenCount: breakEvenTrades.length,
      avgWin, avgLoss, avgWinLossRatio, winDays, lossDays, breakEvenDays, dayWinRate };
  }, [trades, allTrades, selectedAccountId]);

  const grailScore = useMemo(() => {
    const { winRate, profitFactor, totalTrades } = stats;
    const wins = trades.filter(t => (t.pnl - t.fees) > 0);
    const losses = trades.filter(t => (t.pnl - t.fees) < 0);
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + (t.pnl - t.fees), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + (t.pnl - t.fees), 0) / losses.length) : 1;
    const rr = avgWin / avgLoss;

    // Max consecutive losses
    let maxConsecLoss = 0, curConsec = 0;
    [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).forEach(t => {
      if ((t.pnl - t.fees) < 0) { curConsec++; maxConsecLoss = Math.max(maxConsecLoss, curConsec); } else curConsec = 0;
    });

    // Std dev of daily trade counts
    const dailyCounts: Record<string, number> = {};
    trades.forEach(t => { const d = new Date(t.entryDate).toDateString(); dailyCounts[d] = (dailyCounts[d] || 0) + 1; });
    const counts = Object.values(dailyCounts);
    const mean = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    const stdDev = counts.length > 1 ? Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length) : 0;

    // Max drawdown (peak-to-trough on cumulative PnL)
    let peak = 0, cumPnl = 0, maxDD = 0;
    [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).forEach(t => {
      cumPnl += t.pnl; if (cumPnl > peak) peak = cumPnl;
      const dd = peak > 0 ? (peak - cumPnl) / peak * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    });
    // Recovery factor: net pnl / max drawdown amount
    const maxDDAmount = peak > 0 ? peak * (maxDD / 100) : 1;
    const recoveryFactor = totalTrades === 0 ? 0 : Math.min(1, (stats.netPnl > 0 ? stats.netPnl : 0) / (maxDDAmount || 1)) * 100;

    const d1 = totalTrades === 0 ? 0 : Math.min(100, winRate);
    const d2 = totalTrades === 0 ? 0 : Math.min(1, profitFactor / 3) * 100;
    const d3 = totalTrades === 0 ? 0 : Math.min(1, rr / 3) * 100;
    const d4 = totalTrades === 0 ? 0 : Math.round(recoveryFactor);
    const d5 = totalTrades === 0 ? 0 : Math.max(0, 100 - maxDD * 1.5);
    const d6 = totalTrades === 0 ? 0 : Math.max(0, 100 - stdDev * 20);

    const composite = d1 * 0.18 + d2 * 0.20 + d3 * 0.18 + d4 * 0.15 + d5 * 0.15 + d6 * 0.14;

    return {
      composite: Math.round(composite * 100) / 100,
      radarData: [
        { subject: 'Win %', value: Math.round(d1), fullMark: 100 },
        { subject: 'Profit factor', value: Math.round(d2), fullMark: 100 },
        { subject: 'Avg win/loss', value: Math.round(d3), fullMark: 100 },
        { subject: 'Recovery factor', value: Math.round(d4), fullMark: 100 },
        { subject: 'Max drawdown', value: Math.round(d5), fullMark: 100 },
        { subject: 'Consistency', value: Math.round(d6), fullMark: 100 },
      ],
    };
  }, [trades, stats]);

  const goalProgress = useMemo(() => {
      if (!weeklyGoal || !weeklyGoal.isActive) return { current: 0, percent: 0 };
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const currentWeekTrades = trades.filter(t => new Date(t.entryDate) >= startOfWeek);
      let current = 0;
      if (weeklyGoal.type === 'amount') current = currentWeekTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
      else if (weeklyGoal.type === 'r_multiple') current = currentWeekTrades.reduce((acc, t) => acc + (t.riskAmount && t.riskAmount > 0 ? (t.pnl - t.fees) / t.riskAmount : 0), 0);
      else if (weeklyGoal.type === 'percentage') current = (currentWeekTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0) / (riskSettings.accountSize || 10000)) * 100;
      return { current, percent: Math.min(100, Math.max(0, (current / weeklyGoal.value) * 100)) };
  }, [weeklyGoal, trades, riskSettings.accountSize]);

  const rankData = useMemo(() => {
    const { profitFactor, winRate, totalTrades } = stats;
    let currentTier = t.dashboard.rank.tiers.bronze, nextTier = t.dashboard.rank.tiers.silver, color = 'from-orange-700 to-orange-500', icon = Shield, progress = 0;
    if (totalTrades < 10) { progress = (totalTrades / 10) * 100; }
    else if (profitFactor < 1.2 || winRate < 40) { currentTier = t.dashboard.rank.tiers.silver; nextTier = t.dashboard.rank.tiers.gold; color = 'from-slate-400 to-slate-500'; icon = Star; progress = Math.min(100, (profitFactor / 1.2) * 100); }
    else if (profitFactor < 1.5 || winRate < 50) { currentTier = t.dashboard.rank.tiers.gold; nextTier = t.dashboard.rank.tiers.platinum; color = 'from-yellow-400 to-yellow-600'; icon = Trophy; progress = Math.min(100, (profitFactor / 1.5) * 100); }
    else if (profitFactor < 2.0 || winRate < 55) { currentTier = t.dashboard.rank.tiers.platinum; nextTier = t.dashboard.rank.tiers.blackGold; color = 'from-cyan-400 to-blue-500'; icon = Medal; progress = Math.min(100, (profitFactor / 2.0) * 100); }
    else if (profitFactor < 3.0 || winRate < 60) { currentTier = t.dashboard.rank.tiers.blackGold; nextTier = t.dashboard.rank.tiers.legend; color = 'from-slate-900 via-amber-900 to-slate-950 border border-amber-500/20'; icon = Gem; progress = Math.min(100, (profitFactor / 3.0) * 100); }
    else { currentTier = t.dashboard.rank.tiers.legend; nextTier = "Max Rank"; color = 'from-fuchsia-600 via-purple-600 to-indigo-600'; icon = Crown; progress = 100; }
    return { currentTier, nextTier, color, icon, progress };
  }, [stats, t]);

  const mergedEquityData = useMemo(() => {
    const initialEquity = riskSettings.accountSize || 1;
    const fmtDate = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`; };
    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    // Group by date
    const grouped: Record<string, typeof trades> = {};
    sortedTrades.forEach(t => { const d = fmtDate(t.entryDate); if (!grouped[d]) grouped[d] = []; grouped[d].push(t); });
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const data: any[] = [{ date: 'Start', equity: initialEquity, returnPct: 0, cumulativePnl: 0 }];
    let currentEquity = initialEquity;
    sortedDates.forEach((date, i) => {
      const dayTrades = grouped[date];
      dayTrades.forEach(t => { currentEquity += (t.pnl - t.fees); });
      const cumulativePnl = parseFloat((currentEquity - initialEquity).toFixed(2));
      const dataPoint: any = { date, equity: currentEquity, returnPct: ((currentEquity - initialEquity) / initialEquity) * 100, cumulativePnl };
      selectedFriends.forEach(friendId => { const friend = friends.find(f => f.id === friendId); if (friend) dataPoint[friendId] = friend.equityCurve[Math.min(i + 1, friend.equityCurve.length - 1)]; });
      data.push(dataPoint);
    });
    selectedFriends.forEach(friendId => { const friend = friends.find(f => f.id === friendId); if (friend && data[0]) data[0][friendId] = friend.equityCurve[0]; });
    return data;
  }, [trades, riskSettings.accountSize, selectedFriends, friends]);

  const currentTotalEquity = mergedEquityData[mergedEquityData.length - 1]?.equity || riskSettings.accountSize;
  const currentTotalReturnPct = mergedEquityData[mergedEquityData.length - 1]?.returnPct || 0;

  const setupPerformance = useMemo(() => {
    const setups: Record<string, number> = {};
    trades.forEach(t => { if (!setups[t.setup]) setups[t.setup] = 0; setups[t.setup] += (t.pnl - t.fees); });
    return Object.keys(setups).map(key => ({ name: key, value: setups[key] })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [trades]);

  const disciplineCalendarDays = useMemo(() => {
      const today = new Date();
      const days = [];
      for (let i = 1; i <= new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); i++) {
          const dateStr = new Date(today.getFullYear(), today.getMonth(), i).toISOString().split('T')[0];
          const record = disciplineHistory?.find(r => r.date === dateStr);
          days.push({ day: i, status: record ? (record.isSuccess ? 'success' : 'fail') : 'none' });
      }
      return days;
  }, [disciplineHistory]);

  const riskAlert = stats.todayPnl < -Math.abs(riskSettings.maxDailyLoss);

  // Progress tracker heatmap data (from disciplineHistory + Supabase logs via localStorage)
  const dashHeatmap = useMemo(() => {
    const map: Record<string, number> = {};
    // Try to load from localStorage (written by Psychology page)
    try {
      const stored = localStorage.getItem('tg_heatmap_cache');
      if (stored) Object.assign(map, JSON.parse(stored));
    } catch {}
    // Fallback: compute from disciplineHistory
    if (disciplineHistory && disciplineRules) {
      disciplineHistory.forEach(rec => {
        if (!disciplineRules.length) return;
        if (!map[rec.date]) map[rec.date] = rec.completedRuleIds.length / disciplineRules.length;
      });
    }
    return map;
  }, [disciplineHistory, disciplineRules]);

  const dashTodayKey = new Date().toISOString().split('T')[0];
  const dashTodayRecord = disciplineHistory?.find(r => r.date === dashTodayKey);
  const dashTodayCompleted = dashTodayRecord?.completedRuleIds.length ?? 0;
  const dashTodayTotal = disciplineRules?.length ?? 0;
  
  const toggleFriend = (id: string) => setSelectedFriends(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);

  const handleAddFriend = () => {
    if (!newFriendName.trim()) return;
    const startBalance = 10000, points = 205, volatility = 300, drift = (Math.random() - 0.5) * 50;
    let current = startBalance;
    const equityCurve = [current];
    for (let i = 0; i < points; i++) { current += (Math.random() - 0.5) * volatility + drift; equityCurve.push(current); }
    const newFriend: Friend = { id: `custom-${Date.now()}`, name: newFriendName, initials: newFriendName.slice(0, 2).toUpperCase(), tier: 'Silver', winRate: 45, pnl: current - startBalance, color: '#' + Math.floor(Math.random()*16777215).toString(16), equityCurve };
    setFriends(prev => [...prev, newFriend]);
    setNewFriendName('');
    setIsAddFriendModalOpen(false);
  };

  const handleAddDisciplineRule = () => {
      if(!newDisciplineRuleText.trim() || !onUpdateDisciplineRules || !disciplineRules) return;
      onUpdateDisciplineRules([...disciplineRules, { id: Date.now().toString(), text: newDisciplineRuleText, xpReward: 10 }]);
      setNewDisciplineRuleText('');
  };

  const handleDeleteDisciplineRule = (id: string) => {
      if(!onUpdateDisciplineRules || !disciplineRules) return;
      onUpdateDisciplineRules(disciplineRules.filter(r => r.id !== id));
  };

  // --- NEW: Unified Todo Logic ---
  const allTodos = useMemo(() => {
      const today = new Date();
      const sysTasks = [];
      const dailyDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      sysTasks.push({
          id: 'sys-daily',
          type: 'daily',
          label: t.dashboard.todo.daily,
          isCompleted: plans.some(p => p.date === dailyDateKey && p.folder === 'daily-journal'),
          isSystem: true
      });

      const unreviewedCount = trades.filter(t => new Date(t.entryDate).toDateString() === today.toDateString() && !t.reviewNotes).length;
      if (unreviewedCount > 0) {
          sysTasks.push({
              id: 'sys-unreviewed',
              type: 'daily',
              label: `${t.dashboard.todo.unreviewed} (${unreviewedCount})`,
              isCompleted: false,
              isSystem: true
          });
      }

      if ([0, 5, 6].includes(today.getDay())) {
          sysTasks.push({
              id: 'sys-weekly',
              type: 'weekly',
              label: t.dashboard.todo.weekly,
              isCompleted: plans.some(p => p.folder === 'weekly-review' && Math.abs(today.getTime() - new Date(p.date).getTime()) <= 4 * 86400000),
              isSystem: true
          });
      }

      return [...sysTasks, ...customTodos.map(t => ({...t, isSystem: false, type: 'custom'}))];
  }, [plans, trades, customTodos, t]);

  const visibleTodos = isTodoListExpanded ? allTodos : allTodos.slice(0, 3);
  
  // Logic: Calculate number of uncompleted tasks
  const pendingCount = useMemo(() => allTodos.filter(task => !task.isCompleted).length, [allTodos]);

  const handleAddCustomTodo = () => {
      if (!newTodoInput.trim()) return;
      setCustomTodos([{ id: Date.now().toString(), label: newTodoInput.trim(), isCompleted: false }, ...customTodos]);
      setNewTodoInput('');
  };

  const toggleCustomTodo = (id: string) => {
      setCustomTodos(customTodos.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const deleteCustomTodo = (id: string) => {
      setCustomTodos(customTodos.filter(t => t.id !== id));
  };

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {payload.map((entry: any, index: number) => {
          const isUser = entry.value === 'My Equity' || entry.dataKey === 'equity';
          return (
            <div key={`legend-${index}`} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isUser ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/10' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: entry.color }}></span>
              <span className="opacity-90">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const goalRadialData = [{ name: 'Progress', value: goalProgress.percent, fill: '#ec4899' }, { name: 'Remaining', value: 100 - goalProgress.percent, fill: '#1e293b00' }];

  const toggleMarket = (marketId: string) => setSelectedMarketIds(prev => {
    const next = prev.includes(marketId) ? (prev.length <= 2 ? prev : prev.filter(id => id !== marketId)) : (prev.length >= 4 ? prev : [...prev, marketId]);
    try { localStorage.setItem('selectedMarketIds', JSON.stringify(next)); } catch {}
    return next;
  });

  const handlePresetSelect = (preset: string) => {
      setActiveDatePreset(preset);
      let { start, end } = getRange('today');
      if (preset === 'All Time' || preset === '所有时间') {
          start = new Date(0);
          end = new Date(9999, 11, 31);
      } else if (preset === 'Yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); end.setHours(23,59,59,999); }
      else if (preset === 'This Week') { start.setDate(start.getDate() - start.getDay()); start.setHours(0,0,0,0); }
      else if (preset === 'Last Month') { start = new Date(start.getFullYear(), start.getMonth() - 1, 1); end = new Date(start.getFullYear(), start.getMonth() + 1, 0); end.setHours(23,59,59,999); }
      else if (preset === 'Last 30 Days') { const r = getRange('last30'); start = r.start; end = r.end; }
      setDateRange({ start, end }); setIsDatePickerOpen(false);
  };

  const renderMiniCalendar = (baseDate: Date) => {
      const { days, firstDay } = getDaysInMonth(baseDate);
      const dayCells = [];
      for(let i = 0; i < firstDay; i++) dayCells.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
      for(let d = 1; d <= days; d++) {
          const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), d);
          const isSelected = current >= dateRange.start && current <= dateRange.end, isStart = current.toDateString() === dateRange.start.toDateString(), isEnd = current.toDateString() === dateRange.end.toDateString();
          dayCells.push(<div key={d} className={`w-8 h-8 flex items-center justify-center text-xs cursor-pointer rounded-full transition-all ${isStart || isEnd ? 'bg-indigo-600 text-white font-bold' : isSelected ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`} onClick={() => { if (dateRange.start.toDateString() === dateRange.end.toDateString()) { if (current < dateRange.start) setDateRange({ start: current, end: dateRange.end }); else setDateRange({ start: dateRange.start, end: current }); } else { setDateRange({ start: current, end: current }); } setActiveDatePreset('Custom'); }}>{d}</div>);
      }
      return (<div className="w-full"><div className="text-center font-bold text-sm mb-2 text-slate-700">{baseDate.toLocaleString('default', { month: 'short' })} {baseDate.getFullYear()}</div><div className="grid grid-cols-7 gap-y-1 justify-items-center">{['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] text-slate-400 font-bold">{d}</div>)}{dayCells}</div></div>);
  };

  const getDaysInMonth = (date: Date) => ({ days: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), firstDay: new Date(date.getFullYear(), date.getMonth(), 1).getDay() });

  const datePresets = [
      { id: 'All Time', label: language === 'cn' ? '所有时间' : 'All Time' },
      { id: 'Today', label: language === 'cn' ? '今天' : 'Today' },
      { id: 'Yesterday', label: language === 'cn' ? '昨天' : 'Yesterday' },
      { id: 'This Week', label: language === 'cn' ? '本周' : 'This Week' },
      { id: 'Last Month', label: language === 'cn' ? '上个月' : 'Last Month' },
      { id: 'Last 30 Days', label: language === 'cn' ? '最近30天' : 'Last 30 Days' },
      { id: 'This Quarter', label: language === 'cn' ? '本季度' : 'This Quarter' },
      { id: 'YTD', label: language === 'cn' ? '今年以来' : 'YTD' }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden py-2 relative group mb-6 -mt-2 rounded-xl shadow-sm">
         <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10"></div>
         <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10"></div>
         <div className="flex animate-scroll hover-pause whitespace-nowrap w-max">
            {[...MOCK_INDICES, ...MOCK_INDICES].map((item, i) => (
                <div key={i} className="inline-flex items-center gap-2 mx-6 text-sm font-medium tabular-nums">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{item.symbol}</span>
                    <span className={item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{item.price.toLocaleString()}</span>
                    <span className={`text-xs ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'} flex items-center`}>{item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change)}%</span>
                </div>
            ))}
         </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">{greeting}</h2><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.sidebar.dashboard}</p></div>
        <div className="flex flex-col sm:flex-row gap-3 relative z-30">
            <div className="relative z-30" ref={datePickerRef}>
                <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className="flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group min-w-[220px]"><div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 flex-shrink-0 text-slate-400" /><div className="text-left"><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-0.5">{(datePresets.find(p => p.id === activeDatePreset)?.label || (activeDatePreset === 'Custom' ? 'Custom Range' : activeDatePreset)).toUpperCase()}</p><p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-none">
                    {activeDatePreset === 'All Time' || activeDatePreset === '所有时间' ? (language === 'cn' ? '所有时间' : 'All Time') : (
                        <>{dateRange.start.toLocaleDateString()} <span className="text-slate-400 mx-1">→</span> {dateRange.end.toLocaleDateString()}</>
                    )}
                </p></div></div><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} /></button>
                {isDatePickerOpen && <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex w-[640px] animate-fade-in-up z-50 origin-top-right"><div className="flex-1 p-6 border-r border-slate-100"><div className="flex items-center justify-between mb-4"><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronDown className="w-4 h-4 rotate-90 text-slate-400" /></button><div className="flex gap-8">{renderMiniCalendar(viewDate)}{renderMiniCalendar(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}</div><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronDown className="w-4 h-4 -rotate-90 text-slate-400" /></button></div></div><div className="w-48 bg-slate-50 p-2 flex flex-col gap-1">
                    {datePresets.map(preset => (
                        <button key={preset.id} onClick={() => handlePresetSelect(preset.id)} className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeDatePreset === preset.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>{preset.label}</button>
                    ))}
                </div></div>}
            </div>
            <div className="relative z-30" ref={accountSwitcherRef}>
                <button onClick={() => setIsAccountSwitcherOpen(!isAccountSwitcherOpen)} className="flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-w-[200px]"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 flex-shrink-0 text-slate-400" /><div className="text-left flex-1"><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-0.5">Trading Account</p><p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-none truncate max-w-[120px]">{selectedAccountId === 'all' ? (language === 'cn' ? '所有账户' : 'All Accounts') : accounts.find(a => a.id === selectedAccountId)?.name || 'Unknown'}</p></div></div><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAccountSwitcherOpen ? 'rotate-180' : ''}`} /></button>
                {isAccountSwitcherOpen && <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up z-50 origin-top-right"><div className="p-2 space-y-1"><button onClick={() => { setSelectedAccountId('all'); setIsAccountSwitcherOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedAccountId === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>All Accounts{selectedAccountId === 'all' && <Check className="w-4 h-4" />}</button><div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>{accounts.map(acc => (<button key={acc.id} onClick={() => { setSelectedAccountId(acc.id); setIsAccountSwitcherOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedAccountId === acc.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${acc.isReal ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>{acc.name}</div>{selectedAccountId === acc.id && <Check className="w-4 h-4" />}</button>))}</div><div className="border-t border-slate-100 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-950/50"><button onClick={() => onManageAccounts?.()} className="w-full text-center text-xs font-bold text-slate-500 hover:text-indigo-600 py-1.5 flex items-center justify-center gap-2"><Settings className="w-3 h-3" /> Manage Accounts</button></div></div>}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              <div id="dashboard-timezone" className="relative group/config">
                  <div style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    border: '0.5px solid #e4e4ec',
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                  }} className="dark:border-slate-700 dark:bg-slate-900">
                    {MARKET_OPTIONS.filter(m => selectedMarketIds.includes(m.id)).map((market, idx) => (
                      <MarketSessionCard
                        key={market.id}
                        label={t.dashboard.marketHours[market.labelKey as keyof typeof t.dashboard.marketHours] || market.labelKey}
                        marketId={market.id}
                        data={getMarketStatus(market)}
                        count={selectedMarketIds.length}
                        isFirst={idx === 0}
                      />
                    ))}
                  </div>
                  <button onClick={() => setIsMarketConfigOpen(true)} className="absolute -top-3 -right-2 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 opacity-0 group-hover/config:opacity-100 transition-all hover:scale-110 z-10" title={t.dashboard.marketHours.configure}><Settings className="w-3.5 h-3.5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div id="dashboard-rank" className={`md:col-span-2 relative overflow-hidden rounded-2xl p-6 shadow-lg text-white bg-gradient-to-r ${rankData.color}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-20"><rankData.icon className="w-32 h-32 text-white" /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between"><div className="flex justify-between items-start"><div><h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">{t.dashboard.rank.title}</h3><h2 className="text-3xl md:text-4xl font-black tracking-tight flex items-baseline gap-3"><rankData.icon className="w-8 h-8 md:w-10 md:h-10" />{rankData.currentTier}</h2></div><button onClick={onViewLeaderboard} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors border border-white/20 flex items-center gap-1"><Trophy className="w-3 h-3" />{t.dashboard.rank.viewLeaderboard}</button></div><div className="mt-6 max-w-md"><div className="flex justify-between text-xs font-semibold mb-2 opacity-90"><span>{t.dashboard.rank.progress}</span><span>{rankData.nextTier}</span></div><div className="h-2.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm"><div className="h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" style={{ width: `${rankData.progress}%` }}></div></div></div></div>
                </div>
                 {(() => {
                    const todayLoss = Math.abs(Math.min(stats.todayPnl, 0));
                    const limit = Math.abs(riskSettings.maxDailyLoss);
                    const riskRatio = limit > 0 ? todayLoss / limit : 0;
                    const pct = Math.round(riskRatio * 100);
                    const filledCells = Math.min(Math.round(riskRatio * 10), 10);
                    const status = riskRatio >= 1 ? 'danger' : riskRatio >= 0.5 ? 'warn' : 'safe';
                    const dotColor = status === 'danger' ? '#E24B4A' : status === 'warn' ? '#EF9F27' : '#1D9E75';
                    const cellColor = dotColor;
                    const pctColor = dotColor;
                    const cardStyle: React.CSSProperties = {
                      borderRadius: 14,
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0,
                      ...(status === 'danger'
                        ? { background: '#FFF5F5', border: '1px solid #E24B4A' }
                        : status === 'warn'
                        ? { background: '#FFFBF5', border: '1px solid #EF9F27' }
                        : { background: '#ffffff', border: '0.5px solid #e8e8f0' }),
                    };
                    return (
                      <div id="dashboard-risk" style={cardStyle} className={status === 'danger' ? 'dark:!bg-[rgba(226,75,74,0.08)]' : status === 'warn' ? 'dark:!bg-[rgba(239,159,39,0.08)]' : 'dark:!bg-slate-900 dark:!border-slate-700'}>
                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }} className="dark:text-white">
                            {language === 'cn' ? '风控状态' : 'Risk Status'}
                          </span>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                        </div>
                        {/* Data rows */}
                        <div style={{ borderBottom: '0.5px solid #e8e8f0', padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }} className="dark:text-slate-400">
                            {status === 'danger' ? (language === 'cn' ? '今日亏损' : 'Today loss') : (language === 'cn' ? '今日盈亏' : 'Today P&L')}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: stats.todayPnl >= 0 && status === 'safe' ? '#1D9E75' : '#E24B4A' }}>
                            {stats.todayPnl >= 0 ? '+' : ''}{stats.todayPnl.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }} className="dark:text-slate-400">
                            {status === 'danger' ? (language === 'cn' ? '超出限额' : 'Over limit') : (language === 'cn' ? '日亏损限额' : 'Daily limit')}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: status === 'danger' ? '#E24B4A' : '#111827' }} className={status !== 'danger' ? 'dark:text-white' : ''}>
                            {status === 'danger'
                              ? `+$${(todayLoss - limit).toFixed(2)}`
                              : `-$${riskSettings.maxDailyLoss}`}
                          </span>
                        </div>
                        {/* Battery */}
                        <div style={{ marginTop: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                            <span style={{ fontSize: 10, letterSpacing: '0.03em', color: '#9ca3af' }}>{language === 'cn' ? '风险用量' : 'Risk used'}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: pctColor }}>{pct}%</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                              {Array.from({ length: 10 }, (_, i) => (
                                <div key={i} style={{ flex: 1, height: 14, borderRadius: 2, background: i < filledCells ? cellColor : '#e8e8f0' }} />
                              ))}
                            </div>
                            <div style={{ width: 4, height: 8, borderRadius: '0 2px 2px 0', background: filledCells > 0 ? cellColor : '#e8e8f0' }} />
                          </div>
                        </div>
                        {/* Countdown — danger only */}
                        {status === 'danger' && (
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E24B4A', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#6b7280' }} className="dark:text-slate-400">{language === 'cn' ? '距账户重置' : 'Reset in'}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#E24B4A', fontVariantNumeric: 'tabular-nums' }}>{timeToMidnight}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              <div id="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
                <TZNetPnlCard value={stats.netPnl} total={stats.totalTrades} wins={stats.winCount} losses={stats.lossCount} label={language === 'cn' ? '净盈亏' : 'Net P&L'} />
                <TZWinRateCard winRate={stats.winRate} wins={stats.winCount} losses={stats.lossCount} breakEven={stats.breakEvenCount} label={language === 'cn' ? '胜率' : 'Trade win %'} />
                <TZProfitFactorCard value={stats.profitFactor} label={language === 'cn' ? '盈利因子' : 'Profit factor'} />
                <TZDayWinCard dayWinRate={stats.dayWinRate} winDays={stats.winDays} lossDays={stats.lossDays} breakEvenDays={stats.breakEvenDays} label={language === 'cn' ? '日胜率' : 'Day win %'} />
                <TZAvgWinLossCard ratio={stats.avgWinLossRatio} avgWin={stats.avgWin} avgLoss={stats.avgLoss} label={language === 'cn' ? '盈亏比' : 'Avg win/loss'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, width: '100%', alignItems: 'stretch' }}>

              <div id="dashboard-equity" style={{ background: '#fff', border: '0.5px solid #e8e8f0', borderRadius: 12, padding: '16px 20px', height: 420, display: 'flex', flexDirection: 'column' }} className="dark:bg-slate-900 dark:border-slate-800">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d2e' }} className="dark:text-white">{language === 'cn' ? '累计净盈亏' : 'Daily net cumulative P&L'}</span>
                    <TZInfoIcon />
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${currentTotalReturnPct >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>{currentTotalReturnPct >= 0 ? '+' : ''}{currentTotalReturnPct.toFixed(2)}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#b0b3c6' }}>{t.dashboard.equityChart.initial} {currencySymbol}{riskSettings.accountSize.toLocaleString()}</div>
                </div>
                {/* Chart */}
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mergedEquityData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="pnlGradientPos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#1D9E75" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E24B4A" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#E24B4A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="6 4" stroke="rgba(0,0,0,0.07)" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#bbb' }} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#bbb' }} width={55}
                        tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : v <= -1000 ? `-$${(Math.abs(v)/1000).toFixed(0)}k` : `$${v}`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        cursor={{ stroke: currentTotalReturnPct >= 0 ? '#4A6CF7' : '#E24B4A', strokeWidth: 1, strokeDasharray: '4 4' }}
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;
                          const val = payload[0]?.value ?? 0;
                          const sign = val >= 0 ? '+' : '';
                          return (
                            <div style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12, color: '#1a1d2e' }}>
                              <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, background: val >= 0 ? '#4A6CF7' : '#E24B4A', borderRadius: 2, display: 'inline-block' }} />
                                <span>{sign}{currencySymbol}{Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="cumulativePnl"
                        stroke={currentTotalReturnPct >= 0 ? '#4A6CF7' : '#E24B4A'} strokeWidth={2}
                        fill={currentTotalReturnPct >= 0 ? 'url(#pnlGradientPos)' : 'url(#pnlGradientNeg)'}
                        dot={false}
                        activeDot={{ r: 5, fill: currentTotalReturnPct >= 0 ? '#4A6CF7' : '#E24B4A', stroke: '#fff', strokeWidth: 2 }}
                      />
                      {selectedFriends.map(friendId => {
                        const friend = friends.find(f => f.id === friendId);
                        if (!friend) return null;
                        return <Line key={friend.id} type="monotone" dataKey={friendId} name={friend.name} stroke={friend.color} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />;
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win Rate · Avg Win · Avg Loss chart */}
              {(() => {
                const fmtDate = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`; };
                const sorted = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
                // Group by date
                const grouped: Record<string, typeof trades> = {};
                sorted.forEach(t => { const d = fmtDate(t.entryDate); if (!grouped[d]) grouped[d] = []; grouped[d].push(t); });
                const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                // Rolling calculation per date
                let cumTrades: typeof trades = [];
                const winRateData = sortedDates.map(date => {
                  cumTrades = cumTrades.concat(grouped[date]);
                  const wins = cumTrades.filter(t => (t.pnl - t.fees) > 0);
                  const losses = cumTrades.filter(t => (t.pnl - t.fees) < 0);
                  const winPct = cumTrades.length > 0 ? parseFloat((wins.length / cumTrades.length * 100).toFixed(1)) : 0;
                  const avgWin = wins.length > 0 ? parseFloat((wins.reduce((s, t) => s + (t.pnl - t.fees), 0) / wins.length).toFixed(2)) : 0;
                  const avgLoss = losses.length > 0 ? parseFloat((losses.reduce((s, t) => s + (t.pnl - t.fees), 0) / losses.length).toFixed(2)) : 0;
                  return { date, winPct, avgWin, avgLoss };
                });
                // Dynamic right-axis domain
                const allAmts = winRateData.flatMap(d => [d.avgWin, d.avgLoss]).filter(v => v !== 0);
                const amtMin = allAmts.length ? Math.min(...allAmts) : -40;
                const amtMax = allAmts.length ? Math.max(...allAmts) : 20;
                const amtRange = amtMax - amtMin || 1;
                const stepSize = amtRange < 50 ? 5 : amtRange < 200 ? 20 : 50;
                const yAmtMin = Math.floor(amtMin / stepSize) * stepSize - stepSize;
                const yAmtMax = Math.ceil(amtMax / stepSize) * stepSize + stepSize;
                const tickCount = Math.round((yAmtMax - yAmtMin) / stepSize) + 1;
                const legendItems = [{ color: '#4A6CF7', label: 'Win %' }, { color: '#1D9E75', label: 'Avg win' }, { color: '#E24B4A', label: 'Avg loss' }];
                return (
                  <div style={{ background: '#fff', border: '0.5px solid #e8e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', height: 420 }} className="dark:bg-slate-900 dark:border-slate-800">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d2e' }} className="dark:text-white">{language === 'cn' ? '胜率 · 平均胜场 · 平均负场' : 'Win % · Avg Win · Avg Loss'}</span>
                      <TZInfoIcon />
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={winRateData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="6 4" stroke="rgba(0,0,0,0.07)" vertical={false} yAxisId="pct" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#bbb' }} interval="preserveStartEnd" />
                          <YAxis yAxisId="pct" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#bbb' }} width={38}
                            domain={[0, 100]} tickCount={6} tickFormatter={(v: number) => `${v}%`} />
                          <YAxis yAxisId="amt" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#bbb' }} width={42}
                            domain={[Math.min(yAmtMin, -10), Math.max(yAmtMax, 10)]} tickCount={6} tickFormatter={(v: number) => `$${v}`} />
                          <Tooltip
                            mode="index"
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12, color: '#1a1d2e' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                                  {payload.map((p: any) => (
                                    <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                                      <span>{p.dataKey === 'winPct' ? `Win %: ${p.value}%` : p.dataKey === 'avgWin' ? `Avg win: $${p.value}` : `Avg loss: $${p.value}`}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          <Line yAxisId="pct" type="monotone" dataKey="winPct" stroke="#4A6CF7" strokeWidth={2} dot={{ r: 3, fill: '#4A6CF7', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                          <Line yAxisId="amt" type="monotone" dataKey="avgWin" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3, fill: '#1D9E75', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                          <Line yAxisId="amt" type="monotone" dataKey="avgLoss" stroke="#E24B4A" strokeWidth={2} dot={{ r: 3, fill: '#E24B4A', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                      {legendItems.map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              </div>

              <div id="dashboard-strategy" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', alignItems: 'stretch' }}>
                {/* Left: Daily P&L bar chart */}
                <div style={{ background: '#fff', border: '1px solid #ededf3', borderRadius: 12, padding: '16px 20px', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{language === 'cn' ? '每日净盈亏' : 'Net daily P&L'}</span>
                    <TZInfoIcon />
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {(() => {
                      const fmt = (d: string) => { const dt = new Date(d); return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`; };
                      const dayMap: Record<string, number> = {};
                      trades.forEach(t => { const k = fmt(t.entryDate); dayMap[k] = (dayMap[k] || 0) + (t.pnl - t.fees); });
                      const data = Object.entries(dayMap).sort(([a],[b]) => new Date(a).getTime() - new Date(b).getTime()).map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
                      if (!data.length) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0b3c6', fontSize: 13 }}>{language === 'cn' ? '暂无交易数据' : 'No trade data'}</div>;
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#b0b3c6' }} interval="preserveStartEnd" />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#b0b3c6' }} width={52}
                              tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                            <Tooltip content={<DailyPnlTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="pnl" radius={[3,3,0,0]} maxBarSize={32}>
                              {data.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#00c896' : '#ff4d6a'} fillOpacity={0.9} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* Right: Recent Trades */}
                {(() => {
                  const recent = [...trades]
                    .filter(t => t.exitDate)
                    .sort((a, b) => new Date(b.exitDate).getTime() - new Date(a.exitDate).getTime())
                    .slice(0, 10);
                  const fmtDate = (d: string) => { const dt = new Date(d); return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}`; };
                  return (
                    <div style={{ background: '#fff', border: '1px solid #ededf3', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 320 }}>
                      {/* Tab header */}
                      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid #f0f0f6', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e', paddingBottom: 12, display: 'inline-block', borderBottom: '2px solid #6366f1' }}>
                          {language === 'cn' ? '最近交易' : 'Recent trades'}
                        </span>
                      </div>
                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 20px', background: '#fafafa', borderBottom: '1px solid #f0f0f6', flexShrink: 0 }}>
                        {[language === 'cn' ? '平仓日期' : 'Close Date', language === 'cn' ? '品种' : 'Symbol', language === 'cn' ? '净盈亏' : 'Net P&L'].map((h, i) => (
                          <span key={h} style={{ fontSize: 12, fontWeight: 600, color: '#9396aa', textAlign: i === 2 ? 'right' : i === 1 ? 'center' : 'left' }}>{h}</span>
                        ))}
                      </div>
                      {/* Rows */}
                      <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                        {recent.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#c0c3d4', fontSize: 13 }}>
                            {language === 'cn' ? '暂无交易记录' : 'No trades yet'}
                          </div>
                        ) : recent.map((trade, idx) => {
                          const netPnl = trade.pnl - trade.fees;
                          return (
                            <div key={trade.id || idx}
                              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '11px 20px', borderBottom: idx < recent.length - 1 ? '1px solid #f5f5fa' : 'none', transition: 'background 0.1s', cursor: 'default' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafe'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <span style={{ fontSize: 12.5, color: '#4a4d6a' }}>{fmtDate(trade.exitDate)}</span>
                              <span style={{ fontSize: 12.5, color: '#4a4d6a', fontWeight: 500, textAlign: 'center' }}>{trade.symbol}</span>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: netPnl >= 0 ? '#00c896' : '#ff4d6a', textAlign: 'right' }}>
                                {netPnl >= 0 ? '+' : ''}{currencySymbol}{Math.abs(netPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div id="dashboard-calendar" className="pt-2"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 dark:bg-orange-50/10 rounded-lg"><Calendar className="w-6 h-6 text-orange-500" /></div><h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.calendar.title}</h3></div><CalendarView trades={trades} plans={plans} onSavePlan={onSavePlan} /></div>
          </div>

          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
              <GrailScoreWidget composite={grailScore.composite} radarData={grailScore.radarData} language={language} />
              {userProfile && (<div id="dashboard-level" className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl relative"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div><div className="absolute top-4 right-4 z-20"><MentorWidget trades={trades} plans={plans} riskSettings={riskSettings} className="flex flex-col items-end" /></div><div className="relative z-10"><div className="flex justify-between items-start mb-4"><div><p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">{t.dashboard.level.current}</p><h2 className="text-4xl font-black flex items-baseline gap-1"><span className="text-2xl text-slate-400">Lv.</span>{userProfile.level}</h2></div></div><div className="mb-2 flex justify-between text-xs font-semibold text-slate-300"><span>{userProfile.currentXp} XP</span><span>{userProfile.nextLevelXp} XP</span></div><div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-4 border border-slate-600/50"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-700 ease-out" style={{ width: `${(userProfile.currentXp / userProfile.nextLevelXp) * 100}%` }}></div></div><p className="text-xs text-center text-slate-400">{t.dashboard.level.lifetimeXp} {userProfile.totalLifetimeXp.toLocaleString()}</p></div></div>)}

              <div id="dashboard-goal" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group cursor-pointer hover:border-pink-500/50 transition-colors" onClick={onViewGoals}><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide"><Target className="w-4 h-4 text-pink-500" />{t.dashboard.goals.title}</h3><p className="text-[10px] text-slate-500 mt-1">{t.dashboard.goals.subtitle}</p></div><button onClick={(e) => { e.stopPropagation(); setIsGoalModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-pink-500 transition-colors"><Edit2 className="w-3 h-3" /></button></div><div className="flex items-center gap-4"><div className="relative w-24 h-24 flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="70%" outerRadius="100%" barSize={10} data={goalRadialData} startAngle={180} endAngle={-180}><RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} /></RadialBarChart></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-lg font-bold text-pink-500">{goalProgress.percent.toFixed(0)}%</span></div></div><div className="flex-1 space-y-2"><div><p className="text-[10px] text-slate-400 uppercase">{t.dashboard.goals.current}</p><p className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{weeklyGoal?.type === 'amount' ? currencySymbol : ''}{goalProgress.current.toFixed(weeklyGoal?.type === 'percentage' ? 1 : 0)}{weeklyGoal?.type === 'percentage' ? '%' : weeklyGoal?.type === 'r_multiple' ? 'R' : ''}</p></div><div><p className="text-[10px] text-slate-400 uppercase">{t.dashboard.goals.target}</p><p className="font-medium tabular-nums text-slate-500">{weeklyGoal?.type === 'amount' ? currencySymbol : ''}{weeklyGoal?.value}{weeklyGoal?.type === 'percentage' ? '%' : weeklyGoal?.type === 'r_multiple' ? 'R' : ''}</p></div></div></div>{goalProgress.percent >= 100 && (<div className="absolute top-4 right-12 animate-bounce"><span className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg">{t.dashboard.goals.achieved}</span></div>)}<div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end"><button onClick={(e) => { e.stopPropagation(); setIsHistoryModalOpen(true); }} className="text-xs text-pink-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">{t.dashboard.goals.history} <ArrowRight className="w-3 h-3" /></button></div></div>

              {/* --- DRAWDOWN CHART --- */}
              {(() => {
                const ddTooltipStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e8e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 };
                const sorted = [...trades].filter(t => t.exitDate).sort((a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime());
                const dayMap: Record<string, number> = {};
                sorted.forEach(t => { const d = new Date(t.exitDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }); dayMap[d] = (dayMap[d] || 0) + (t.pnl - t.fees); });
                let cum = 0, peak = 0;
                const ddData = Object.entries(dayMap).map(([date, pnl]) => { cum += pnl; if (cum > peak) peak = cum; const dd = peak > 0 ? cum - peak : Math.min(0, cum); return { date, drawdown: parseFloat(dd.toFixed(2)) }; });
                const minVal = ddData.length ? Math.min(...ddData.map(d => d.drawdown)) : 0;
                const yMin = Math.floor(minVal / 100) * 100 - 100;
                return (
                  <div style={{ background: '#fff', border: '1px solid #ededf3', borderRadius: 12, padding: '16px 20px', height: 280, display: 'flex', flexDirection: 'column' }} className="dark:bg-slate-900 dark:border-slate-800">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }} className="dark:text-white">{language === 'cn' ? '回撤分析' : 'Drawdown'}</span>
                      <TZInfoIcon />
                    </div>
                    {ddData.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0c3d4', fontSize: 13 }}>{language === 'cn' ? '暂无回撤数据' : 'No drawdown data'}</div>
                    ) : (
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ddData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#e8a0b4" stopOpacity={0.5}/>
                                <stop offset="60%" stopColor="#e8a0b4" stopOpacity={0.2}/>
                                <stop offset="100%" stopColor="#e8a0b4" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.04)" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#b0b3c6' }} interval="preserveStartEnd" />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#b0b3c6' }} domain={[yMin, 0]} width={58}
                              tickFormatter={(v: number) => v === 0 ? `${currencySymbol}0` : `-${currencySymbol}${Math.abs(v).toLocaleString('en-US')}`} />
                            <Tooltip cursor={{ stroke: '#7b7ef8', strokeWidth: 1, strokeDasharray: '4 4' }}
                              content={({ active, payload, label }: any) => {
                                if (!active || !payload?.length) return null;
                                const val = payload[0]?.value ?? 0;
                                return (
                                  <div style={ddTooltipStyle}>
                                    <div style={{ fontWeight: 600, color: '#1a1d2e', marginBottom: 5 }}>{label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ width: 10, height: 10, background: '#e8a0b4', borderRadius: 2, display: 'inline-block' }} />
                                      <span style={{ color: val < 0 ? '#e05c8a' : '#1a1d2e', fontWeight: 600 }}>
                                        {val < 0 ? '-' : ''}{currencySymbol}{Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }} />
                            <Area type="monotone" dataKey="drawdown" stroke="#7b7ef8" strokeWidth={2} fill="url(#ddGradient)" dot={false} activeDot={{ r: 5, fill: '#7b7ef8', stroke: '#fff', strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* --- TRADE TIME PERFORMANCE --- */}
              <TradeTimeChart trades={trades} language={language} />

              <DashboardHeatmap
                language={language}
                trades={trades}
                disciplineHistory={disciplineHistory}
                disciplineRules={disciplineRules}
              />

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[300px]"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide"><Users className="w-4 h-4 text-indigo-500" />{t.social.title}</h3><button onClick={() => setIsAddFriendModalOpen(true)} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"><UserPlus className="w-3 h-3" /></button></div><div className="flex-1 overflow-y-auto pr-1 custom-scrollbar"><table className="w-full text-xs"><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{friends.sort((a,b) => b.pnl - a.pnl).map((friend, index) => { const isSelected = selectedFriends.includes(friend.id); return (<tr key={friend.id} className="group"><td className="py-2.5 w-6 text-center">{index === 0 && <span className="text-base">🥇</span>}{index === 1 && <span className="text-base">🥈</span>}{index === 2 && <span className="text-base">🥉</span>}{index > 2 && <span className="text-slate-400 font-mono">{index + 1}</span>}</td><td className="py-2.5"><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{backgroundColor: friend.color}}>{friend.initials}</div><div className="overflow-hidden"><p className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80px]">{friend.name}</p></div></div></td><td className={`py-2.5 text-right font-bold tabular-nums ${friend.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{currencySymbol}{friend.pnl.toLocaleString()}</td><td className="py-2.5 text-right"><button onClick={() => toggleFriend(friend.id)} className={`p-1 rounded transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 hover:text-slate-500'}`}>{isSelected ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</button></td></tr>); })}</tbody></table></div></div>
          </div>
      </div>

      {isMarketConfigOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm flex flex-col shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900"><h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" />{t.dashboard.marketHours.configure}</h3><button onClick={() => setIsMarketConfigOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button></div><div className="p-6 space-y-3"><p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.dashboard.marketHours.limitError}</p>{MARKET_OPTIONS.map(market => { const isSelected = selectedMarketIds.includes(market.id); const isDisabled = !isSelected && selectedMarketIds.length >= 4; return (<button key={market.id} onClick={() => toggleMarket(market.id)} disabled={isDisabled} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isDisabled ? 'opacity-40 cursor-not-allowed bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : isSelected ? `bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-500` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}><market.icon className="w-4 h-4" /></div><span className={`text-sm font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>{t.dashboard.marketHours[market.labelKey as keyof typeof t.dashboard.marketHours] || market.labelKey}</span></div>{isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}</button>); })}<button onClick={() => setIsMarketConfigOpen(false)} className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20">{t.dashboard.discipline.done}</button></div></div></div>)}

      {isGoalModalOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md flex flex-col shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900"><h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Target className="w-5 h-5 text-pink-500" />{t.dashboard.goals.modalTitle}</h3><button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button></div><div className="p-6 space-y-4"><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.dashboard.goals.type}</label><select value={tempGoal.type} onChange={(e) => setTempGoal({...tempGoal, type: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"><option value="amount">{t.dashboard.goals.types.amount}</option><option value="percentage">{t.dashboard.goals.types.percentage}</option><option value="r_multiple">{t.dashboard.goals.types.r_multiple}</option></select></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.dashboard.goals.target}</label><input type="number" value={tempGoal.value} onChange={(e) => setTempGoal({...tempGoal, value: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500 font-mono" /></div><div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={tempGoal.isActive} onChange={(e) => setTempGoal({...tempGoal, isActive: e.target.checked})} className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500 border-gray-300" /><label className="text-sm text-slate-600 dark:text-slate-400">{t.dashboard.discipline.active}</label></div><button onClick={() => { if (onSetWeeklyGoal) onSetWeeklyGoal(tempGoal); setIsGoalModalOpen(false); }} className="w-full mt-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold transition-colors shadow-lg shadow-pink-500/20">{t.dashboard.tracker.save}</button></div></div></div>)}

      {isHistoryModalOpen && (
          <GoalHistoryModal 
            isOpen={isHistoryModalOpen} 
            onClose={() => setIsHistoryModalOpen(false)} 
            history={MOCK_GOAL_HISTORY}
            language={language}
          />
      )}

      {isAddFriendModalOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm flex flex-col shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900"><h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-500" />{t.social.addModalTitle}</h3><button onClick={() => setIsAddFriendModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button></div><div className="p-6"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.social.namePlaceholder}</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={newFriendName} onChange={e => setNewFriendName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddFriend()} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. TradingWiz" autoFocus /></div><p className="text-xs text-slate-400 mt-3 italic text-center">{t.social.simulated}</p><button onClick={handleAddFriend} disabled={!newFriendName.trim()} className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20">{t.social.addBtn}</button></div></div></div>)}
    </div>
  );
};

export default Dashboard;