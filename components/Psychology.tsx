import React, { useMemo, useState } from 'react';
import { RiskSettings, TradingRule, ReviewStatus, Trade, DisciplineRule, DailyDisciplineRecord } from '../types';
import { useLanguage } from '../LanguageContext';
import { Edit2 } from 'lucide-react';

interface PsychologyProps {
  riskSettings: RiskSettings;
  onSaveSettings: (s: RiskSettings) => void;
  rules: TradingRule[];
  onToggleRule: (id: string) => void;
  onAddRule: (text: string) => void;
  onDeleteRule: (id: string) => void;
  reviewStatus: ReviewStatus;
  onUpdateReview: (type: 'daily' | 'weekly' | 'monthly') => void;
  trades?: Trade[];
  disciplineRules?: DisciplineRule[];
  disciplineHistory?: DailyDisciplineRecord[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RuleSettings {
  trading_days: string[];
  email_reminder_enabled: boolean;
  email_reminder_time: string;
  trading_hours_enabled: boolean;
  trading_hours_from: string;
  trading_hours_to: string;
  start_my_day_enabled: boolean;
  start_my_day_time: string;
  link_to_playbook_enabled: boolean;
  input_stop_loss_enabled: boolean;
  net_max_loss_per_trade_enabled: boolean;
  net_max_loss_per_trade_type: string;
  net_max_loss_per_trade_value: number;
  net_max_loss_per_day_enabled: boolean;
  net_max_loss_per_day_value: number;
}

interface ManualRule {
  id: string;
  name: string;
  active_days: string[];
  enabled: boolean;
}

const DEFAULT_SETTINGS: RuleSettings = {
  trading_days: ['Mo','Tu','We','Th','Fr'],
  email_reminder_enabled: true,
  email_reminder_time: '20:30',
  trading_hours_enabled: false,
  trading_hours_from: '09:00',
  trading_hours_to: '12:00',
  start_my_day_enabled: true,
  start_my_day_time: '09:30',
  link_to_playbook_enabled: true,
  input_stop_loss_enabled: true,
  net_max_loss_per_trade_enabled: true,
  net_max_loss_per_trade_type: '$',
  net_max_loss_per_trade_value: 100,
  net_max_loss_per_day_enabled: true,
  net_max_loss_per_day_value: 100,
};

const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtKey = (d: Date) => d.toISOString().split('T')[0];

const generateTimeOptions = () => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++)
    for (const m of ['00','30'])
      opts.push(`${String(h).padStart(2,'0')}:${m}`);
  return opts;
};

const inputStyle: React.CSSProperties = {
  height: 34, borderRadius: 7, border: '1px solid #e8e8f0',
  padding: '0 10px', fontSize: 13, color: '#1a1d2e', background: '#fff', outline: 'none',
};

const selectSt = (disabled: boolean): React.CSSProperties => ({
  ...inputStyle, width: 90, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

// ── Sub-components ────────────────────────────────────────────────────────────

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: '#b8bbc8', flexShrink: 0 }}>
    <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M6.5 5.8v3.5M6.5 4.2h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const Toggle: React.FC<{ enabled: boolean; onToggle: (v: boolean) => void }> = ({ enabled, onToggle }) => (
  <div onClick={() => onToggle(!enabled)} style={{
    width: 42, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
    background: enabled ? '#6366f1' : '#e0e0ea', position: 'relative', transition: 'background 0.2s',
  }}>
    <div style={{
      width: 20, height: 20, borderRadius: 10, background: '#fff',
      position: 'absolute', top: 2, left: enabled ? 20 : 2,
      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </div>
);

const ToggleRow: React.FC<{
  enabled: boolean; onToggle: (v: boolean) => void;
  title: string; desc?: string; children?: React.ReactNode;
}> = ({ enabled, onToggle, title, desc, children }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 24px', borderBottom: '1px solid #f5f5fa' }}>
    <Toggle enabled={enabled} onToggle={onToggle} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? '#1a1d2e' : '#9396aa' }}>{title}</div>
      {desc && <div style={{ fontSize: 11, color: '#b0b3c6', marginTop: 3, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{desc}</div>}
    </div>
    {children && <div style={{ flexShrink: 0, marginTop: 2 }}>{children}</div>}
  </div>
);

// ── Heatmap ───────────────────────────────────────────────────────────────────

const WEEKS = 18;
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function buildWeeks(): (string | null)[][] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);
  const weeks: (string | null)[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      week.push(cur > today ? null : fmtKey(cur));
    }
    weeks.push(week);
  }
  return weeks;
}

function heatColor(v: number | undefined): string {
  if (!v) return '#f0f0f6';
  if (v <= 0.25) return '#eef0ff';
  if (v <= 0.5) return '#c7cafd';
  if (v <= 0.75) return '#9b9ef9';
  if (v < 1) return '#6366f1';
  return '#4338ca';
}

const HeatmapCalendar: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const weeks = useMemo(buildWeeks, []);
  const todayKey = fmtKey(new Date());
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d !== null);
    if (first) { const d = new Date(first); if (d.getDate() <= 7) monthLabels.push({ label: d.toLocaleString('default', { month: 'short' }), col: wi }); }
  });
  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
      {tip && <div style={{ position: 'fixed', left: tip.x + 8, top: tip.y - 36, background: '#1a1d2e', color: '#fff', fontSize: 11, padding: '4px 8px', borderRadius: 6, pointerEvents: 'none', zIndex: 999, whiteSpace: 'nowrap' }}>{tip.key}: {Math.round((data[tip.key] ?? 0) * 100)}%</div>}
      <div style={{ display: 'flex', gap: 3 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 20, marginRight: 2 }}>
          {DAY_LABELS.map(d => <div key={d} style={{ height: 14, fontSize: 9, color: '#b0b3c6', lineHeight: '14px', width: 24 }}>{d}</div>)}
        </div>
        <div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 4, height: 16 }}>
            {weeks.map((_, wi) => { const ml = monthLabels.find(m => m.col === wi); return <div key={wi} style={{ width: 14, fontSize: 9, color: '#b0b3c6', whiteSpace: 'nowrap' }}>{ml?.label || ''}</div>; })}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {week.map((dateKey, di) => (
                  <div key={di} style={{ width: 14, height: 14, borderRadius: 2, background: dateKey ? heatColor(data[dateKey]) : 'transparent', border: dateKey === todayKey ? '1.5px solid #f97316' : 'none', cursor: dateKey ? 'pointer' : 'default' }}
                    onMouseEnter={e => dateKey && setTip({ key: dateKey, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTip(null)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Psychology component ─────────────────────────────────────────────────

const Psychology: React.FC<PsychologyProps> = ({
  disciplineHistory = [], trades = [],
  onAddRule, onDeleteRule,
}) => {
  const { language } = useLanguage();
  const todayKey = fmtKey(new Date());

  const [ruleSettings, setRuleSettings] = useState<RuleSettings>(() => {
    try { const s = localStorage.getItem('tg_rule_settings'); return s ? JSON.parse(s) : DEFAULT_SETTINGS; } catch { return DEFAULT_SETTINGS; }
  });
  const [manualRules, setManualRules] = useState<ManualRule[]>(() => {
    try { const s = localStorage.getItem('tg_manual_rules'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showModal, setShowModal] = useState(false);

  const handleSave = (newSettings: RuleSettings, newManualRules: ManualRule[]) => {
    setRuleSettings(newSettings);
    setManualRules(newManualRules);
    localStorage.setItem('tg_rule_settings', JSON.stringify(newSettings));
    localStorage.setItem('tg_manual_rules', JSON.stringify(newManualRules));
  };

  // Build discipline rules from settings + manual rules (for heatmap/streak)
  const allRuleIds = useMemo(() => {
    const sys = ['start_my_day','link_playbook','stop_loss','max_loss_trade','max_loss_day'].filter(id => {
      if (id === 'start_my_day') return ruleSettings.start_my_day_enabled;
      if (id === 'link_playbook') return ruleSettings.link_to_playbook_enabled;
      if (id === 'stop_loss') return ruleSettings.input_stop_loss_enabled;
      if (id === 'max_loss_trade') return ruleSettings.net_max_loss_per_trade_enabled;
      if (id === 'max_loss_day') return ruleSettings.net_max_loss_per_day_enabled;
      return false;
    });
    return [...sys, ...manualRules.map(r => r.id)];
  }, [ruleSettings, manualRules]);

  // Heatmap data from disciplineHistory
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    disciplineHistory.forEach(rec => {
      if (!allRuleIds.length) return;
      map[rec.date] = rec.completedRuleIds.length / allRuleIds.length;
    });
    return map;
  }, [disciplineHistory, allRuleIds]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if ((heatmapData[fmtKey(d)] ?? 0) > 0) streak++; else break;
    }
    return streak;
  }, [heatmapData]);

  const periodScore = useMemo(() => {
    const vals = Object.values(heatmapData);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  }, [heatmapData]);

  const todayRecord = disciplineHistory.find(r => r.date === todayKey);
  const todayCompleted = todayRecord?.completedRuleIds.length ?? 0;
  const todayTotal = allRuleIds.length;

  // Build rules for table
  const tableRules = useMemo(() => {
    const sys = [
      ruleSettings.start_my_day_enabled && { id: 'start_my_day', name: 'Start my day by', condition: ruleSettings.start_my_day_time },
      ruleSettings.link_to_playbook_enabled && { id: 'link_playbook', name: 'Link trades to playbook', condition: '100%' },
      ruleSettings.input_stop_loss_enabled && { id: 'stop_loss', name: 'Input Stop loss to all trades', condition: '100%' },
      ruleSettings.net_max_loss_per_trade_enabled && { id: 'max_loss_trade', name: 'Net max loss /trade', condition: `${ruleSettings.net_max_loss_per_trade_type}${ruleSettings.net_max_loss_per_trade_value}` },
      ruleSettings.net_max_loss_per_day_enabled && { id: 'max_loss_day', name: 'Net max loss /day', condition: `$${ruleSettings.net_max_loss_per_day_value}` },
    ].filter(Boolean) as { id: string; name: string; condition: string }[];
    const manual = manualRules.map(r => ({ id: r.id, name: r.name, condition: r.active_days.join('/') }));
    return [...sys, ...manual].map(r => {
      const records = disciplineHistory.filter(rec => rec.completedRuleIds.includes(r.id));
      const followRate = disciplineHistory.length > 0 ? Math.round((records.length / disciplineHistory.length) * 100) : 0;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const rec = disciplineHistory.find(rec2 => rec2.date === fmtKey(d));
        if (rec?.completedRuleIds.includes(r.id)) streak++; else break;
      }
      let avgPerf: number | null = null;
      if (records.length > 0) {
        const pnls = records.map(rec => trades.filter(t => t.entryDate.startsWith(rec.date)).reduce((a, t) => a + (t.pnl - t.fees), 0));
        avgPerf = parseFloat((pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2));
      }
      return { ...r, followRate, streak, avgPerf };
    });
  }, [ruleSettings, manualRules, disciplineHistory, trades]);

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #ededf3', borderRadius: 12 };

  return (
    <div style={{ background: '#f8f9fc', minHeight: '100vh', padding: '28px 32px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d2e', margin: 0 }}>{language === 'cn' ? '心态风控' : 'Progress Tracker'}</h1>
      </div>

      {/* Top 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20, maxWidth: 560 }}>
        {/* Streak */}
        <div style={{ ...card, padding: '18px 20px', minHeight: 110 }}>
          <div style={{ fontSize: 12, color: '#9396aa', fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            {language === 'cn' ? '连续天数' : 'Current streak'} <InfoIcon />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1d2e' }}>{currentStreak} {language === 'cn' ? '天' : 'days'} {currentStreak === 0 ? '😐' : currentStreak > 3 ? '🔥' : '👍'}</div>
        </div>
        {/* Period score */}
        <div style={{ ...card, padding: '18px 20px', minHeight: 110 }}>
          <div style={{ fontSize: 12, color: '#9396aa', fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            {language === 'cn' ? '当期得分' : 'Period score'} <InfoIcon />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: periodScore === null ? '#9396aa' : periodScore >= 70 ? '#00c896' : periodScore >= 40 ? '#f59e0b' : '#ff4d6a' }}>
            {periodScore === null ? '--' : `${periodScore}%`}
          </div>
        </div>
        {/* Today's progress */}
        <div style={{ ...card, padding: '18px 20px', minHeight: 110 }}>
          <div style={{ fontSize: 12, color: '#9396aa', fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            {language === 'cn' ? '今日进度' : "Today's progress"} <InfoIcon />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1d2e', marginBottom: 10 }}>{todayCompleted}/{todayTotal}</div>
          <div style={{ height: 3, background: '#f0f0f6', borderRadius: 2 }}>
            <div style={{ height: '100%', width: todayTotal > 0 ? `${(todayCompleted / todayTotal) * 100}%` : '0%', background: '#6366f1', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Middle: today rules + heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, marginBottom: 20, alignItems: 'stretch' }}>
        {/* Today rules */}
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e', marginBottom: 16 }}>{language === 'cn' ? '今日规则' : "Today's Rules"}</div>
          {allRuleIds.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d2e' }}>{language === 'cn' ? '暂无规则' : 'No rules yet'}</div>
              <div style={{ fontSize: 12, color: '#9396aa', textAlign: 'center', lineHeight: 1.6 }}>{language === 'cn' ? '点击「编辑规则」开始配置' : 'Click "Edit rules" to get started'}</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tableRules.map(rule => {
                const done = todayRecord?.completedRuleIds.includes(rule.id) ?? false;
                return (
                  <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5fa' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${done ? '#00c896' : '#e0e0ea'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? '#00c896' : 'transparent' }}>
                      {done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: done ? '#9396aa' : '#1a1d2e', textDecoration: done ? 'line-through' : 'none' }}>{rule.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Heatmap */}
        <div style={{ ...card, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{language === 'cn' ? '规则追踪热力图' : 'Progress Tracker'}</span>
            <InfoIcon />
          </div>
          <HeatmapCalendar data={heatmapData} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: '#b0b3c6' }}>Less</span>
            {['#f0f0f6','#eef0ff','#c7cafd','#9b9ef9','#6366f1','#4338ca'].map((c, i) => <span key={i} style={{ width: 12, height: 12, background: c, borderRadius: 2, display: 'inline-block' }} />)}
            <span style={{ fontSize: 11, color: '#b0b3c6' }}>More</span>
          </div>
        </div>
      </div>

      {/* Rules table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f0f0f6' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1d2e' }}>{language === 'cn' ? '当前规则' : 'Current Rules'}</span>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, border: '1px solid #e0e0ea', background: '#fff', fontSize: 13, color: '#4a4d6a', fontWeight: 500, cursor: 'pointer' }}>
            <Edit2 size={13} /> {language === 'cn' ? '编辑规则' : 'Edit rules'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr', padding: '10px 24px', background: '#fafafa', borderBottom: '1px solid #f0f0f6' }}>
          {['RULE','CONDITION','RULE STREAK','AVG PERFORMANCE','FOLLOW RATE'].map((h, i) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.06em', textAlign: i > 1 ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>
        {tableRules.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#c0c3d4', fontSize: 13 }}>{language === 'cn' ? '暂无规则，点击「编辑规则」开始配置' : 'No rules yet. Click "Edit rules" to get started.'}</div>
        ) : tableRules.map((rule, i) => (
          <div key={rule.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr', padding: '13px 24px', borderBottom: i < tableRules.length - 1 ? '1px solid #f5f5fa' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafe'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${rule.followRate > 0 ? '#00c896' : '#ff4d6a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: rule.followRate > 0 ? '#00c896' : '#ff4d6a' }}>{rule.followRate > 0 ? '✓' : '✕'}</span>
              </div>
              <span style={{ fontSize: 13, color: '#1a1d2e' }}>{rule.name}</span>
            </div>
            <span style={{ fontSize: 13, color: '#4a4d6a' }}>{rule.condition}</span>
            <span style={{ fontSize: 13, color: '#4a4d6a', textAlign: 'center' }}>{rule.streak}</span>
            <span style={{ fontSize: 13, textAlign: 'center', color: rule.avgPerf === null ? '#9396aa' : rule.avgPerf > 0 ? '#00c896' : rule.avgPerf < 0 ? '#ff4d6a' : '#9396aa' }}>
              {rule.avgPerf === null ? '–' : `${rule.avgPerf > 0 ? '+' : ''}$${Math.abs(rule.avgPerf).toFixed(2)}`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: rule.followRate > 70 ? '#00c896' : rule.followRate > 30 ? '#f59e0b' : '#ff4d6a' }}>{rule.followRate}%</span>
          </div>
        ))}
      </div>

      <RulesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialSettings={ruleSettings}
        initialManualRules={manualRules}
        onSave={handleSave}
      />
    </div>
  );
};

export default Psychology;


const RulesModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  initialSettings: RuleSettings; initialManualRules: ManualRule[];
  onSave: (s: RuleSettings, r: ManualRule[]) => void;
}> = ({ isOpen, onClose, initialSettings, initialManualRules, onSave }) => {
  const [settings, setSettings] = useState<RuleSettings>(initialSettings);
  const [manualRules, setManualRules] = useState<ManualRule[]>(initialManualRules);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDays, setNewRuleDays] = useState(['Mo','Tu','We','Th','Fr']);
  const [isDirty, setIsDirty] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const update = (key: keyof RuleSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const addManualRule = () => {
    if (!newRuleName.trim()) return;
    setManualRules(prev => [...prev, { id: `manual-${Date.now()}`, name: newRuleName.trim(), active_days: [...newRuleDays], enabled: true }]);
    setNewRuleName('');
    setIsDirty(true);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0f0f6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d2e', margin: 0 }}>Rules</h2>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e8e8f0', background: 'transparent', fontSize: 18, color: '#9396aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <p style={{ fontSize: 12, color: '#9396aa', marginTop: 4, marginBottom: 0 }}>Changes you make will only update your scoring for today and for future days.</p>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Trading days */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f5f5fa' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d2e', marginBottom: 4 }}>Trading days</div>
            <div style={{ fontSize: 12, color: '#9396aa', marginBottom: 12 }}>The days on which these rules should be active.</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAYS.map(day => {
                const active = settings.trading_days.includes(day);
                return (
                  <button key={day} onClick={() => update('trading_days', active ? settings.trading_days.filter(d => d !== day) : [...settings.trading_days, day])}
                    style={{ width: 40, height: 36, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? 'transparent' : '#f5f5fa', color: active ? '#00b894' : '#9396aa', border: active ? '1.5px solid #00b894' : '1px solid #e8e8f0', transition: 'all 0.15s' }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email reminder */}
          <ToggleRow enabled={settings.email_reminder_enabled} onToggle={v => update('email_reminder_enabled', v)} title="Send an email reminder when I'm about to lose my streak">
            <select value={settings.email_reminder_time} onChange={e => update('email_reminder_time', e.target.value)} disabled={!settings.email_reminder_enabled} style={selectSt(!settings.email_reminder_enabled)}>
              {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </ToggleRow>

          {/* Trading hours */}
          <ToggleRow enabled={settings.trading_hours_enabled} onToggle={v => update('trading_hours_enabled', v)} title="Trading hours" desc={`Set trading hours in a 24-hour format.\nYour timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select value={settings.trading_hours_from} onChange={e => update('trading_hours_from', e.target.value)} disabled={!settings.trading_hours_enabled} style={selectSt(!settings.trading_hours_enabled)}>
                {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ fontSize: 11, color: '#9396aa' }}>to</span>
              <select value={settings.trading_hours_to} onChange={e => update('trading_hours_to', e.target.value)} disabled={!settings.trading_hours_enabled} style={selectSt(!settings.trading_hours_enabled)}>
                {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </ToggleRow>

          {/* Start my day */}
          <ToggleRow enabled={settings.start_my_day_enabled} onToggle={v => update('start_my_day_enabled', v)} title="Start my day by" desc="The time you should start your day and enter your starting journal entry before your trading session.">
            <input type="time" value={settings.start_my_day_time} onChange={e => update('start_my_day_time', e.target.value)} disabled={!settings.start_my_day_enabled} style={{ ...inputStyle, width: 90, opacity: settings.start_my_day_enabled ? 1 : 0.4 }} />
          </ToggleRow>

          {/* Link to playbook */}
          <ToggleRow enabled={settings.link_to_playbook_enabled} onToggle={v => update('link_to_playbook_enabled', v)} title="Link trades to playbook" desc="All trades opened must have a playbook attached." />

          {/* Stop loss */}
          <ToggleRow enabled={settings.input_stop_loss_enabled} onToggle={v => update('input_stop_loss_enabled', v)} title="Input Stop loss to all trades" desc="All trades opened must have a stop loss added." />

          {/* Max loss per trade */}
          <ToggleRow enabled={settings.net_max_loss_per_trade_enabled} onToggle={v => update('net_max_loss_per_trade_enabled', v)} title="Net max loss /trade" desc="The maximum net loss on a trade in amount or percentage of the account balance.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {['%', '$'].map(t => (
                <button key={t} onClick={() => update('net_max_loss_per_trade_type', t)} style={{ width: 34, height: 34, borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: settings.net_max_loss_per_trade_type === t ? '#6366f1' : '#f0f0f6', color: settings.net_max_loss_per_trade_type === t ? '#fff' : '#9396aa' }}>{t}</button>
              ))}
              <input type="number" value={settings.net_max_loss_per_trade_value} onChange={e => update('net_max_loss_per_trade_value', Number(e.target.value))} disabled={!settings.net_max_loss_per_trade_enabled} style={{ ...inputStyle, width: 80 }} />
            </div>
          </ToggleRow>

          {/* Max loss per day */}
          <ToggleRow enabled={settings.net_max_loss_per_day_enabled} onToggle={v => update('net_max_loss_per_day_enabled', v)} title="Net max loss /day" desc="The maximum net loss on a day among all accounts.">
            <input type="number" value={settings.net_max_loss_per_day_value} onChange={e => update('net_max_loss_per_day_value', Number(e.target.value))} disabled={!settings.net_max_loss_per_day_enabled} style={{ ...inputStyle, width: 80 }} />
          </ToggleRow>

          {/* Manual rules */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f6' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d2e', marginBottom: 2 }}>Manual rules</div>
            <div style={{ fontSize: 12, color: '#9396aa', marginBottom: 12 }}>The rule will be added as a daily check list</div>
            <input type="text" placeholder="Rule name..." value={newRuleName} onChange={e => setNewRuleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualRule()} style={{ ...inputStyle, width: '100%', marginBottom: 8, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {DAYS.map(day => {
                const active = newRuleDays.includes(day);
                return <button key={day} onClick={() => setNewRuleDays(prev => active ? prev.filter(d => d !== day) : [...prev, day])} style={{ width: 34, height: 28, borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: active ? 'transparent' : '#f5f5fa', color: active ? '#6366f1' : '#b0b3c6', border: active ? '1.5px solid #6366f1' : '1px solid #e8e8f0' }}>{day}</button>;
              })}
              <button onClick={addManualRule} disabled={!newRuleName.trim()} style={{ marginLeft: 'auto', padding: '0 14px', height: 28, borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: newRuleName.trim() ? 'pointer' : 'not-allowed', background: newRuleName.trim() ? '#6366f1' : '#e8e8f0', color: newRuleName.trim() ? '#fff' : '#b0b3c6' }}>+ Add</button>
            </div>
            {manualRules.map(rule => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 8, marginBottom: 6, border: '1px solid #f0f0f6' }}>
                <span style={{ flex: 1, fontSize: 13, color: '#1a1d2e' }}>{rule.name}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {DAYS.map(day => <span key={day} style={{ width: 24, height: 20, borderRadius: 3, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rule.active_days.includes(day) ? '#eef0ff' : '#f5f5fa', color: rule.active_days.includes(day) ? '#6366f1' : '#d0d3e0' }}>{day}</span>)}
                </div>
                <button onClick={() => { setManualRules(prev => prev.filter(r => r.id !== rule.id)); setIsDirty(true); }} style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: '#fee2e2', color: '#ff4d6a', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>

          {/* Reset */}
          <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #f0f0f6' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d2e', marginBottom: 4 }}>Reset your progress tracker</div>
            <div style={{ fontSize: 12, color: '#9396aa', marginBottom: 14 }}>Start over with new rules, streak and habit building.</div>
            {!showResetConfirm ? (
              <button onClick={() => setShowResetConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#ff4d6a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🔄 Reset all progress</button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#ff4d6a', fontWeight: 500 }}>确认重置？此操作不可撤销。</span>
                <button onClick={() => { setManualRules([]); setSettings(DEFAULT_SETTINGS); setShowResetConfirm(false); setIsDirty(true); }} style={{ padding: '6px 14px', borderRadius: 6, background: '#ff4d6a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>确认</button>
                <button onClick={() => setShowResetConfirm(false)} style={{ padding: '6px 14px', borderRadius: 6, background: '#f5f5fa', color: '#4a4d6a', border: '1px solid #e8e8f0', fontSize: 12, cursor: 'pointer' }}>取消</button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f0f6', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '9px 22px', borderRadius: 8, border: '1px solid #e0e0ea', background: 'transparent', fontSize: 13, color: '#4a4d6a', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={() => { onSave(settings, manualRules); setIsDirty(false); onClose(); }} disabled={!isDirty} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: isDirty ? 'pointer' : 'not-allowed', background: isDirty ? '#6366f1' : '#e8e8f0', color: isDirty ? '#fff' : '#b0b3c6' }}>Save changes</button>
        </div>
      </div>
    </div>
  );
};
