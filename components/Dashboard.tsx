import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Trade, TradeStatus, RiskSettings, TrackerRule, TrackerRuleType, DailyPlan, Friend, UserLevelProfile, DisciplineRule, DailyDisciplineRecord, WeeklyGoal } from '../types';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ComposedChart,
  RadialBarChart, RadialBar
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity, ShieldCheck, AlertOctagon, Hexagon, Calendar, Settings, X, XCircle, Plus, Sparkles, BrainCircuit, Trophy, Star, Crown, Eye, EyeOff, Users, UserPlus, Search, Flame, Award, CheckCircle2, Zap, Lightbulb, ClipboardList, CheckSquare, Edit2, ArrowRight, Clock, Globe, Sun, Building2, Landmark, Euro, BookOpen, Shield, Gem, Medal, Sunrise, Flower, Apple, ChevronDown, Check, Briefcase, Trash2, Circle, RefreshCw, BarChart2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import CalendarView from './CalendarView';
import { MOCK_FRIENDS, MOCK_INDICES, MOCK_ACCOUNTS } from '../constants';
import MentorWidget from './MentorWidget';

// ── TradeZella-style stat cards ──────────────────────────────────────────────

const SEMI = 75; // π × 24 ≈ 75px

const TZInfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: '#b8bbc8', flexShrink: 0 }}>
    <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M6.5 5.8v3.5M6.5 4.2h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const HalfGauge: React.FC<{ winPct: number; lossPct: number; singleColor?: string }> = ({ winPct, lossPct, singleColor }) => {
  const winArc = (Math.min(winPct, 100) / 100) * SEMI;
  const lossArc = (Math.min(lossPct, 100) / 100) * SEMI;
  const c = singleColor || '#00c896';
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" style={{ flexShrink: 0 }}>
      <path d="M4 30 A 24 24 0 0 1 52 30" fill="none" stroke="#ededf3" strokeWidth="5.5" strokeLinecap="round"/>
      {lossArc > 0 && !singleColor && (
        <path d="M4 30 A 24 24 0 0 1 52 30" fill="none" stroke="#ff4d6a" strokeWidth="5.5" strokeLinecap="round"
          strokeDasharray={`${lossArc} ${SEMI}`} />
      )}
      {winArc > 0 && (
        <path d="M4 30 A 24 24 0 0 1 52 30" fill="none" stroke={c} strokeWidth="5.5" strokeLinecap="round"
          strokeDasharray={`${winArc} ${SEMI}`} />
      )}
    </svg>
  );
};

const tzCard: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #ededf3', borderRadius: 10,
  padding: '11px 13px', height: 82, display: 'flex', flexDirection: 'column',
  justifyContent: 'space-between', flex: 1, minWidth: 0,
};
const tzLabel: React.CSSProperties = { fontSize: 11, color: '#9396aa', fontWeight: 500 };
const tzVal = (c: string): React.CSSProperties => ({
  fontSize: 19, fontWeight: 700, letterSpacing: -0.5, color: c, lineHeight: 1,
});
const tzDot = (c: string): React.CSSProperties => ({
  width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block',
});

const TZDots: React.FC<{ w: number; b: number; l: number }> = ({ w, b, l }) => (
  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#00c896', display: 'flex', alignItems: 'center', gap: 2 }}><span style={tzDot('#00c896')} />{w}</span>
    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 2 }}><span style={tzDot('#6366f1')} />{b}</span>
    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#ff4d6a', display: 'flex', alignItems: 'center', gap: 2 }}><span style={tzDot('#ff4d6a')} />{l}</span>
  </div>
);

const TZNetPnlCard: React.FC<{ value: number; total: number; label: string }> = ({ value, total, label }) => {
  const pos = value >= 0;
  const c = pos ? '#00c896' : '#ff4d6a';
  return (
    <div style={tzCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={tzLabel}>{label}</span>
        <TZInfoIcon />
        <span style={{ fontSize: 10, background: '#eef0ff', color: '#6366f1', padding: '1px 6px', borderRadius: 8, fontWeight: 700, marginLeft: 2 }}>{total}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={tzVal(c)}>{pos ? '+' : ''}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <HalfGauge winPct={pos ? 70 : 0} lossPct={pos ? 0 : 70} singleColor={c} />
      </div>
    </div>
  );
};

const TZWinRateCard: React.FC<{ winRate: number; wins: number; losses: number; breakEven: number; label: string }> = ({ winRate, wins, losses, breakEven, label }) => {
  const total = wins + losses + breakEven || 1;
  return (
    <div style={tzCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={tzLabel}>{label}</span><TZInfoIcon />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div>
          <div style={tzVal('#1a1d2e')}>{winRate.toFixed(2)}%</div>
          <TZDots w={wins} b={breakEven} l={losses} />
        </div>
        <HalfGauge winPct={(wins / total) * 100} lossPct={(losses / total) * 100} />
      </div>
    </div>
  );
};

const TZProfitFactorCard: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const pct = Math.min(100, (value / 3) * 100);
  const c = value >= 1.5 ? '#00c896' : value >= 1 ? '#f59e0b' : '#ff4d6a';
  return (
    <div style={tzCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={tzLabel}>{label}</span><TZInfoIcon />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div>
          <div style={tzVal('#1a1d2e')}>{value.toFixed(2)}</div>
          <div style={{ fontSize: 10.5, color: '#9396aa', marginTop: 4 }}>综合盈亏比</div>
        </div>
        <HalfGauge winPct={pct} lossPct={0} singleColor={c} />
      </div>
    </div>
  );
};

const TZDayWinCard: React.FC<{ dayWinRate: number; winDays: number; lossDays: number; breakEvenDays: number; label: string }> = ({ dayWinRate, winDays, lossDays, breakEvenDays, label }) => {
  const total = winDays + lossDays + breakEvenDays || 1;
  return (
    <div style={tzCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={tzLabel}>{label}</span><TZInfoIcon />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div>
          <div style={tzVal('#1a1d2e')}>{dayWinRate.toFixed(2)}%</div>
          <TZDots w={winDays} b={breakEvenDays} l={lossDays} />
        </div>
        <HalfGauge winPct={(winDays / total) * 100} lossPct={(lossDays / total) * 100} />
      </div>
    </div>
  );
};

const TZAvgWinLossCard: React.FC<{ ratio: number; avgWin: number; avgLoss: number; label: string }> = ({ ratio, avgWin, avgLoss, label }) => {
  const winPct = avgWin > 0 && Math.abs(avgLoss) > 0 ? (avgWin / (avgWin + Math.abs(avgLoss))) * 100 : 50;
  return (
    <div style={tzCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={tzLabel}>{label}</span><TZInfoIcon />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={tzVal('#1a1d2e')}>{ratio.toFixed(2)}</div>
        <div style={{ flex: 1, maxWidth: 100 }}>
          <div style={{ height: 6, borderRadius: 3, background: '#f0f0f6', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${winPct}%`, background: '#00c896', borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#00c896' }}>${avgWin.toFixed(0)}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#ff4d6a' }}>-${Math.abs(avgLoss).toFixed(0)}</span>
          </div>
        </div>
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
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const getMarketStatus = (config: typeof MARKET_OPTIONS[0]) => {
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone: config.zone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
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
    const timeString = parts.filter(p => ['hour', 'minute', 'second', 'literal'].includes(p.type)).map(p => p.value).join('');
    return { time: timeString, isOpen };
  };
  return { getMarketStatus };
};

const MarketSessionCard: React.FC<{ label: string, data: any, color: string, icon: React.ElementType }> = ({ label, data, color, icon: Icon }) => {
    const { t } = useLanguage();
    return (
        <div className={`relative flex items-center justify-between p-3 rounded-xl border transition-all ${data.isOpen ? `bg-${color}-50 dark:bg-${color}-900/10 border-${color}-200 dark:border-${color}-500/30` : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.isOpen ? `bg-${color}-100 dark:bg-${color}-500/20 text-${color}-600 dark:text-${color}-400` : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">{data.time}</p>
                </div>
            </div>
            <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${data.isOpen ? `bg-${color}-500 text-white` : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
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

const GrailScoreWidget: React.FC<{ composite: number; radarData: { subject: string; value: number; fullMark: number }[]; language: string }> = ({ composite, radarData }) => {
  const clampedScore = Math.min(100, Math.max(0, composite));
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      {/* Title row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Grail Score</span>
        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-none">i</span>
        </div>
      </div>
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />

      {/* Radar chart */}
      <div className="px-4 pt-2 pb-1" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 18, right: 30, bottom: 18, left: 30 }}>
            <PolarGrid stroke="#e8eaf0" strokeDasharray="0" className="dark:stroke-slate-700/50" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 9.5, fill: '#94a3b8', fontWeight: 600 }}
              tickLine={false}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#6d28d9"
              fill="rgba(167,139,250,0.18)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: '#6d28d9', strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score + gradient bar */}
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Your Grail Score</p>
            <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white leading-none">{clampedScore.toFixed(2)}</span>
          </div>
        </div>

        {/* Gradient bar */}
        <div className="relative mt-3">
          <div className="h-2.5 w-full rounded-full overflow-hidden" style={{
            background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #06b6d4)'
          }} />
          {/* Indicator dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-700 shadow-md transition-all duration-700"
            style={{ left: `calc(${clampedScore}% - 8px)` }}
          />
          {/* Tick labels */}
          <div className="flex justify-between mt-1.5">
            {[0, 20, 40, 60, 80, 100].map(n => (
              <span key={n} className="text-[9px] text-slate-400 font-medium tabular-nums">{n}</span>
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
    weeklyGoal, onSetWeeklyGoal, onViewGoals, onViewLeaderboard
}) => {
  const { t, language } = useLanguage();
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
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
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
    const wins = trades.filter(t => t.status === TradeStatus.WIN).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const netPnl = trades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    const profitFactor = Math.abs(trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0) / (trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0) || 1));
    const today = new Date().toDateString();
    const todayPnl = trades.filter(t => new Date(t.entryDate).toDateString() === today).reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    // Sparkline: last 12 trades cumulative PnL
    const sorted = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).slice(-12);
    let cum = 0;
    const pnlSpark = sorted.map(t => { cum += (t.pnl - t.fees); return cum; });
    const wrSpark = sorted.map((_, i) => { const slice = sorted.slice(0, i + 1); return slice.filter(t => t.pnl > 0).length / slice.length * 100; });
    const winTrades = trades.filter(t => t.pnl > 0);
    const lossTrades = trades.filter(t => t.pnl < 0);
    const breakEvenTrades = trades.filter(t => t.pnl === 0);
    const avgWin = winTrades.length > 0 ? winTrades.reduce((a, t) => a + t.pnl, 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((a, t) => a + t.pnl, 0) / lossTrades.length : 0;
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
  }, [trades]);

  const grailScore = useMemo(() => {
    const { winRate, profitFactor, totalTrades } = stats;
    const wins = trades.filter(t => t.status === TradeStatus.WIN);
    const losses = trades.filter(t => t.status !== TradeStatus.WIN && t.pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + t.pnl, 0) / losses.length) : 1;
    const rr = avgWin / avgLoss;

    // Max consecutive losses
    let maxConsecLoss = 0, curConsec = 0;
    [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()).forEach(t => {
      if (t.pnl < 0) { curConsec++; maxConsecLoss = Math.max(maxConsecLoss, curConsec); } else curConsec = 0;
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
    let currentEquity = riskSettings.accountSize || 0;
    const initialEquity = riskSettings.accountSize || 1;
    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    const data: any[] = [{ date: 'Start', equity: riskSettings.accountSize, returnPct: 0 }];
    sortedTrades.forEach((t, i) => {
        currentEquity += (t.pnl - t.fees);
        const dataPoint: any = { date: new Date(t.entryDate).toLocaleDateString(), equity: currentEquity, returnPct: ((currentEquity - initialEquity) / initialEquity) * 100 };
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
        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">{greeting} <span className="text-2xl">👋</span></h2><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.sidebar.dashboard}</p></div>
        <div className="flex flex-col sm:flex-row gap-3 relative z-30">
            <div className="relative z-30" ref={datePickerRef}>
                <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-indigo-300 transition-all group min-w-[220px]"><div className="flex items-center gap-3"><div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400"><Calendar className="w-4 h-4" /></div><div className="text-left"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{(datePresets.find(p => p.id === activeDatePreset)?.label || (activeDatePreset === 'Custom' ? 'Custom Range' : activeDatePreset)).toUpperCase()}</p><p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
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
                <button onClick={() => setIsAccountSwitcherOpen(!isAccountSwitcherOpen)} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-indigo-300 transition-all min-w-[200px]"><div className="flex items-center gap-3"><div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400"><Briefcase className="w-4 h-4" /></div><div className="text-left flex-1"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trading Account</p><p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate max-w-[120px]">{selectedAccountId === 'all' ? (language === 'cn' ? '所有账户' : 'All Accounts') : MOCK_ACCOUNTS.find(a => a.id === selectedAccountId)?.name || 'Unknown'}</p></div></div><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAccountSwitcherOpen ? 'rotate-180' : ''}`} /></button>
                {isAccountSwitcherOpen && <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up z-50 origin-top-right"><div className="p-2 space-y-1"><button onClick={() => { setSelectedAccountId('all'); setIsAccountSwitcherOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedAccountId === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>All Accounts{selectedAccountId === 'all' && <Check className="w-4 h-4" />}</button><div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>{MOCK_ACCOUNTS.map(acc => (<button key={acc.id} onClick={() => { setSelectedAccountId(acc.id); setIsAccountSwitcherOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedAccountId === acc.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${acc.isReal ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>{acc.name}</div>{selectedAccountId === acc.id && <Check className="w-4 h-4" />}</button>))}</div><div className="border-t border-slate-100 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-950/50"><button className="w-full text-center text-xs font-bold text-slate-500 hover:text-indigo-600 py-1.5 flex items-center justify-center gap-2"><Settings className="w-3 h-3" /> Manage Accounts</button></div></div>}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              <div id="dashboard-timezone" className="relative group/config">
                  <div className={`grid grid-cols-1 md:grid-cols-${selectedMarketIds.length === 4 ? '2 lg:grid-cols-4' : selectedMarketIds.length === 2 ? '2' : '3'} gap-4 transition-all duration-300`}>
                      {MARKET_OPTIONS.filter(m => selectedMarketIds.includes(m.id)).map(market => (<MarketSessionCard key={market.id} label={t.dashboard.marketHours[market.labelKey as keyof typeof t.dashboard.marketHours] || market.labelKey} data={getMarketStatus(market)} color={market.color} icon={market.icon} />))}
                  </div>
                  <button onClick={() => setIsMarketConfigOpen(true)} className="absolute -top-3 -right-2 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 opacity-0 group-hover/config:opacity-100 transition-all hover:scale-110 z-10" title={t.dashboard.marketHours.configure}><Settings className="w-3.5 h-3.5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div id="dashboard-rank" className={`md:col-span-2 relative overflow-hidden rounded-2xl p-6 shadow-lg text-white bg-gradient-to-r ${rankData.color}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-20"><rankData.icon className="w-32 h-32 text-white" /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between"><div className="flex justify-between items-start"><div><h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">{t.dashboard.rank.title}</h3><h2 className="text-3xl md:text-4xl font-black tracking-tight flex items-baseline gap-3"><rankData.icon className="w-8 h-8 md:w-10 md:h-10" />{rankData.currentTier}</h2></div><button onClick={onViewLeaderboard} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors border border-white/20 flex items-center gap-1"><Trophy className="w-3 h-3" />{t.dashboard.rank.viewLeaderboard}</button></div><div className="mt-6 max-w-md"><div className="flex justify-between text-xs font-semibold mb-2 opacity-90"><span>{t.dashboard.rank.progress}</span><span>{rankData.nextTier}</span></div><div className="h-2.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm"><div className="h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" style={{ width: `${rankData.progress}%` }}></div></div></div></div>
                </div>
                 {riskAlert ? (
                    <div id="dashboard-risk" className="bg-rose-500 text-white p-5 rounded-2xl shadow-lg shadow-rose-500/30 flex flex-col justify-between animate-pulse-slow relative overflow-hidden h-full"><div className="absolute -right-6 -top-6 bg-white/10 w-32 h-32 rounded-full blur-2xl pointer-events-none"></div><div className="relative z-10"><div className="flex items-center gap-3 mb-3"><div className="p-2 bg-white/20 rounded-lg backdrop-blur-md shrink-0"><AlertOctagon className="w-5 h-5" /></div><h3 className="font-bold text-lg leading-tight">{t.dashboard.riskAlert}</h3></div><p className="text-xs text-rose-50 opacity-90 leading-relaxed mb-4">{t.dashboard.riskAlertDesc.replace('${current}', Math.abs(stats.todayPnl).toFixed(2)).replace('${limit}', riskSettings.maxDailyLoss.toString())}</p></div><div className="bg-black/20 rounded-lg p-3 flex items-center justify-between backdrop-blur-sm relative z-10 border border-white/5 mt-auto"><span className="text-[10px] font-bold opacity-80 flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-3.5 h-3.5" />{language === 'cn' ? '距离重置' : 'Reset in'}</span><span className="font-mono text-sm font-bold tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/10">{timeToMidnight}</span></div></div>
                 ) : (
                    <div id="dashboard-risk" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center"><div className="flex items-center gap-3 mb-4"><div className="p-3 bg-emerald-100 dark:bg-emerald-50/20 rounded-xl text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-6 h-6" /></div><div><h3 className="font-bold text-slate-900 dark:text-white">{t.dashboard.riskStatus.ok}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{t.dashboard.riskStatus.okDesc}</p></div></div><div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">{t.dashboard.riskStatus.dailyPnl}</span><span className={`font-bold tabular-nums ${stats.todayPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${stats.todayPnl.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">{t.dashboard.riskStatus.limit}</span><span className="font-medium tabular-nums text-slate-700 dark:text-slate-300">-${riskSettings.maxDailyLoss}</span></div><div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (Math.abs(stats.todayPnl)/riskSettings.maxDailyLoss)*100)}%` }}></div></div></div></div>
                 )}
              </div>

              <div id="dashboard-stats" className="grid grid-cols-2 md:flex gap-2.5 w-full">
                <TZNetPnlCard value={stats.netPnl} total={stats.totalTrades} label={language === 'cn' ? '净盈亏' : 'Net P&L'} />
                <TZWinRateCard winRate={stats.winRate} wins={stats.winCount} losses={stats.lossCount} breakEven={stats.breakEvenCount} label={language === 'cn' ? '胜率' : 'Trade win %'} />
                <TZProfitFactorCard value={stats.profitFactor} label={language === 'cn' ? '盈利因子' : 'Profit factor'} />
                <TZDayWinCard dayWinRate={stats.dayWinRate} winDays={stats.winDays} lossDays={stats.lossDays} breakEvenDays={stats.breakEvenDays} label={language === 'cn' ? '日胜率' : 'Day win %'} />
                <TZAvgWinLossCard ratio={stats.avgWinLossRatio} avgWin={stats.avgWin} avgLoss={stats.avgLoss} label={language === 'cn' ? '盈亏比' : 'Avg win/loss'} />
              </div>

              <div id="dashboard-equity" className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 h-96"><div className="flex justify-between items-start mb-6"><div><div className="flex items-center gap-3 mb-1"><h3 className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs uppercase tracking-wider"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />{t.dashboard.equityCurve}</h3><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{activeDatePreset === 'All Time' || activeDatePreset === '所有时间' ? (language === 'cn' ? '所有时间' : 'All Time') : activeDatePreset}</span></div><div className="flex items-baseline gap-3"><span className={`text-3xl font-black tabular-nums tracking-tight ${stats.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={`text-sm font-bold px-2.5 py-1 rounded-full ${currentTotalReturnPct >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>{currentTotalReturnPct >= 0 ? '+' : ''}{currentTotalReturnPct.toFixed(2)}%</span></div></div><div className="text-xs text-slate-400 font-mono">{t.dashboard.equityChart.initial} ${riskSettings.accountSize.toLocaleString()}</div></div><ResponsiveContainer width="100%" height="100%"><ComposedChart data={mergedEquityData}><defs><linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.12}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.08} /><XAxis dataKey="date" hide /><YAxis orientation="right" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} domain={['auto', 'auto']} /><Tooltip contentStyle={tooltipStyle} itemStyle={{ fontSize: '12px' }} formatter={(value: number, name: string, props: any) => { if (name === 'My Equity') { const pct = props.payload.returnPct; return [`$${value.toLocaleString()} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`, name]; } return [`$${value.toLocaleString()}`, name]; }} /><Legend content={renderCustomLegend} /><Area type="monotone" dataKey="equity" name="My Equity" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorEquity)" />{selectedFriends.map(friendId => { const friend = friends.find(f => f.id === friendId); if (!friend) return null; return (<div key={friend.id}><Line type="monotone" dataKey={friend.id} name={friend.name} stroke={friend.color} strokeWidth={1.5} dot={false} strokeDasharray="4 4" /></div>); })}</ComposedChart></ResponsiveContainer></div>

              <div id="dashboard-strategy" className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 h-80 flex flex-col"><h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2 text-sm"><Activity className="w-4 h-4 text-purple-500" />{t.dashboard.setupPerformance}</h3><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={setupPerformance} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.4} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#64748b', fontWeight: 500}} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} contentStyle={{...tooltipStyle, fontSize: '12px'}} itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'PnL']} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>{setupPerformance.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.value >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(244,63,94,0.75)'} />))}</Bar></BarChart></ResponsiveContainer></div></div><div className="lg:col-span-1 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50 relative overflow-hidden h-80 flex flex-col"><div className="relative z-10 flex flex-col h-full"><div className="flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-amber-400" /><h3 className="font-bold text-slate-800 dark:text-white text-sm">{t.dashboard.aiTips.title}</h3></div>{loadingTips ? (<div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400"><Activity className="w-5 h-5 animate-spin mr-2" /><p className="text-xs">{t.dashboard.aiTips.loading}</p></div>) : aiTips.length > 0 ? (<div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">{aiTips.map((tip, idx) => (<div key={idx} className="bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex items-start gap-2.5"><span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold mt-0.5">{idx + 1}</span><p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{tip}</p></div>))}</div>) : (<div className="flex flex-1 items-center justify-center"><p className="text-xs text-slate-500 dark:text-slate-400 italic text-center px-4">{t.dashboard.aiTips.fallback}</p></div>)}</div></div></div>

              <div id="dashboard-calendar" className="pt-2"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 dark:bg-orange-50/10 rounded-lg"><Calendar className="w-6 h-6 text-orange-500" /></div><h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.calendar.title}</h3></div><CalendarView trades={trades} plans={plans} onSavePlan={onSavePlan} /></div>
          </div>

          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
              <GrailScoreWidget composite={grailScore.composite} radarData={grailScore.radarData} language={language} />
              {userProfile && (<div id="dashboard-level" className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl relative"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div><div className="absolute top-4 right-4 z-20"><MentorWidget trades={trades} plans={plans} riskSettings={riskSettings} className="flex flex-col items-end" /></div><div className="relative z-10"><div className="flex justify-between items-start mb-4"><div><p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">{t.dashboard.level.current}</p><h2 className="text-4xl font-black flex items-baseline gap-1"><span className="text-2xl text-slate-400">Lv.</span>{userProfile.level}</h2></div></div><div className="mb-2 flex justify-between text-xs font-semibold text-slate-300"><span>{userProfile.currentXp} XP</span><span>{userProfile.nextLevelXp} XP</span></div><div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-4 border border-slate-600/50"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-700 ease-out" style={{ width: `${(userProfile.currentXp / userProfile.nextLevelXp) * 100}%` }}></div></div><p className="text-xs text-center text-slate-400">{t.dashboard.level.lifetimeXp} {userProfile.totalLifetimeXp.toLocaleString()}</p></div></div>)}

              <div id="dashboard-goal" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group cursor-pointer hover:border-pink-500/50 transition-colors" onClick={onViewGoals}><div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide"><Target className="w-4 h-4 text-pink-500" />{t.dashboard.goals.title}</h3><p className="text-[10px] text-slate-500 mt-1">{t.dashboard.goals.subtitle}</p></div><button onClick={(e) => { e.stopPropagation(); setIsGoalModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-pink-500 transition-colors"><Edit2 className="w-3 h-3" /></button></div><div className="flex items-center gap-4"><div className="relative w-24 h-24 flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="70%" outerRadius="100%" barSize={10} data={goalRadialData} startAngle={180} endAngle={-180}><RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} /></RadialBarChart></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-lg font-bold text-pink-500">{goalProgress.percent.toFixed(0)}%</span></div></div><div className="flex-1 space-y-2"><div><p className="text-[10px] text-slate-400 uppercase">{t.dashboard.goals.current}</p><p className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{weeklyGoal?.type === 'amount' ? '$' : ''}{goalProgress.current.toFixed(weeklyGoal?.type === 'percentage' ? 1 : 0)}{weeklyGoal?.type === 'percentage' ? '%' : weeklyGoal?.type === 'r_multiple' ? 'R' : ''}</p></div><div><p className="text-[10px] text-slate-400 uppercase">{t.dashboard.goals.target}</p><p className="font-medium tabular-nums text-slate-500">{weeklyGoal?.type === 'amount' ? '$' : ''}{weeklyGoal?.value}{weeklyGoal?.type === 'percentage' ? '%' : weeklyGoal?.type === 'r_multiple' ? 'R' : ''}</p></div></div></div>{goalProgress.percent >= 100 && (<div className="absolute top-4 right-12 animate-bounce"><span className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg">{t.dashboard.goals.achieved}</span></div>)}<div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end"><button onClick={(e) => { e.stopPropagation(); setIsHistoryModalOpen(true); }} className="text-xs text-pink-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">{t.dashboard.goals.history} <ArrowRight className="w-3 h-3" /></button></div></div>

              {/* --- ENHANCED TODO LIST WIDGET --- */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <ClipboardList className="w-4 h-4 text-indigo-500" /> {t.dashboard.todo.title}
                      {pendingCount > 0 && (
                          <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse-slow">
                              {pendingCount}
                          </span>
                      )}
                  </h3>

                  {/* Add Input Area */}
                  <div className="flex gap-2 mb-4">
                      <input 
                          type="text" 
                          value={newTodoInput}
                          onChange={(e) => setNewTodoInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTodo()}
                          placeholder={language === 'cn' ? "添加新待办..." : "Add new task..."}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button 
                          onClick={handleAddCustomTodo}
                          disabled={!newTodoInput.trim()}
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors"
                      >
                          <Plus className="w-4 h-4" />
                      </button>
                  </div>

                  <div className="space-y-3">
                      {visibleTodos.map((task) => (
                          <div 
                            key={task.id}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all group ${
                                task.isCompleted 
                                ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60' 
                                : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-sm'
                            }`}
                          >
                              <div className="flex items-center gap-3 flex-1">
                                  <button 
                                      onClick={() => !task.isSystem && toggleCustomTodo(task.id)}
                                      className={`p-1 transition-colors ${task.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                                  >
                                      {task.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                  </button>
                                  <div>
                                      <p className={`text-sm font-bold transition-all ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                                          {task.label}
                                      </p>
                                      <p className="text-[10px] text-slate-500 font-medium">
                                          {task.isSystem ? t.dashboard.todo.system : t.dashboard.todo.manual}
                                      </p>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                  {task.isSystem && !task.isCompleted && (
                                      <button 
                                        onClick={() => onStartReview && onStartReview(task.type as any)}
                                        className="text-[10px] px-2 py-1 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700"
                                      >
                                          {t.dashboard.todo.start}
                                      </button>
                                  )}
                                  {!task.isSystem && (
                                      <button 
                                          onClick={() => deleteCustomTodo(task.id)}
                                          className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Expand/Collapse Footer */}
                  {allTodos.length > 3 && (
                      <button 
                          onClick={() => setIsTodoListExpanded(!isTodoListExpanded)}
                          className="w-full mt-4 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                          {isTodoListExpanded 
                            ? (language === 'cn' ? '收起' : 'Collapse') 
                            : (language === 'cn' ? `展开 (${allTodos.length - 3} 更多)` : `Show More (${allTodos.length - 3})`)
                          }
                          <ChevronDown className={`w-3 h-3 transition-transform ${isTodoListExpanded ? 'rotate-180' : ''}`} />
                      </button>
                  )}
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"><h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Flame className="w-4 h-4 text-orange-500" /> {t.dashboard.discipline.streak}</h3><div className="grid grid-cols-7 gap-1.5">{disciplineCalendarDays?.map((day, idx) => (<div key={idx} className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${day.status === 'success' ? 'bg-emerald-500 text-white shadow-sm' : day.status === 'fail' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`} title={day.status === 'success' ? t.dashboard.discipline.success : day.status === 'fail' ? t.dashboard.discipline.fail : t.dashboard.discipline.empty}>{day.day}</div>))}</div><div className="flex justify-center gap-4 mt-4 text-[10px] text-slate-400"><div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"></span> {t.dashboard.discipline.success}</div><div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500/20"></span> {t.dashboard.discipline.fail}</div><div className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-200 dark:bg-slate-800"></span> {t.dashboard.discipline.empty}</div></div></div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]"><h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Zap className="w-4 h-4 text-yellow-500" /> {t.dashboard.discipline.rituals}</h3><div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">{disciplineRules?.map(rule => { const todayStr = new Date().toISOString().split('T')[0], todayRecord = disciplineHistory?.find(r => r.date === todayStr), isChecked = todayRecord?.completedRuleIds.includes(rule.id) || false; return (<div key={rule.id} onClick={() => onCheckDisciplineRule && onCheckDisciplineRule(rule.id, !isChecked)} className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all group ${isChecked ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>{isChecked && <CheckCircle2 className="w-3 h-3" />}</div><div className="flex-1"><p className={`text-sm font-medium transition-colors ${isChecked ? 'text-emerald-700 dark:text-emerald-400 line-through opacity-70' : 'text-slate-700 dark:text-slate-300'}`}>{rule.text}</p></div><button onClick={(e) => { e.stopPropagation(); handleDeleteDisciplineRule(rule.id); }} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button></div>); })}</div><div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2"><input type="text" placeholder={t.dashboard.discipline.addRule} value={newDisciplineRuleText} onChange={(e) => setNewDisciplineRuleText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDisciplineRule()} className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500" /><button onClick={handleAddDisciplineRule} className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"><Plus className="w-4 h-4" /></button></div></div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[300px]"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide"><Users className="w-4 h-4 text-indigo-500" />{t.social.title}</h3><button onClick={() => setIsAddFriendModalOpen(true)} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"><UserPlus className="w-3 h-3" /></button></div><div className="flex-1 overflow-y-auto pr-1 custom-scrollbar"><table className="w-full text-xs"><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{friends.sort((a,b) => b.pnl - a.pnl).map((friend, index) => { const isSelected = selectedFriends.includes(friend.id); return (<tr key={friend.id} className="group"><td className="py-2.5 w-6 text-center">{index === 0 && <span className="text-base">🥇</span>}{index === 1 && <span className="text-base">🥈</span>}{index === 2 && <span className="text-base">🥉</span>}{index > 2 && <span className="text-slate-400 font-mono">{index + 1}</span>}</td><td className="py-2.5"><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{backgroundColor: friend.color}}>{friend.initials}</div><div className="overflow-hidden"><p className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80px]">{friend.name}</p></div></div></td><td className={`py-2.5 text-right font-bold tabular-nums ${friend.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${friend.pnl.toLocaleString()}</td><td className="py-2.5 text-right"><button onClick={() => toggleFriend(friend.id)} className={`p-1 rounded transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 hover:text-slate-500'}`}>{isSelected ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</button></td></tr>); })}</tbody></table></div></div>
          </div>
      </div>

      {isMarketConfigOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"><div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm flex flex-col shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900"><h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" />{t.dashboard.marketHours.configure}</h3><button onClick={() => setIsMarketConfigOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button></div><div className="p-6 space-y-3"><p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.dashboard.marketHours.limitError}</p>{MARKET_OPTIONS.map(market => { const isSelected = selectedMarketIds.includes(market.id); return (<button key={market.id} onClick={() => toggleMarket(market.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? `bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-500` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}><market.icon className="w-4 h-4" /></div><span className={`text-sm font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>{t.dashboard.marketHours[market.labelKey as keyof typeof t.dashboard.marketHours] || market.labelKey}</span></div>{isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}</button>); })}<button onClick={() => setIsMarketConfigOpen(false)} className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20">{t.dashboard.discipline.done}</button></div></div></div>)}

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