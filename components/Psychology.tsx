import React, { useMemo, useState } from 'react';
import { RiskSettings, TradingRule, ReviewStatus, Trade, DisciplineRule, DailyDisciplineRecord } from '../types';
import { useLanguage } from '../LanguageContext';
import { Edit2, Plus, Trash2 } from 'lucide-react';

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

const fmtKey = (d: Date) => d.toISOString().split('T')[0];

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: '#b8bbc8', flexShrink: 0 }}>
    <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M6.5 5.8v3.5M6.5 4.2h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ededf3', borderRadius: 12 };

// ── Heatmap ───────────────────────────────────────────────────────────────────
const WEEKS = 18;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const Psychology: React.FC<PsychologyProps> = ({
  disciplineRules = [], disciplineHistory = [], trades = [], onAddRule, onDeleteRule,
}) => {
  const { language } = useLanguage();
  const [newRuleText, setNewRuleText] = useState('');
  const todayKey = fmtKey(new Date());

  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    disciplineHistory.forEach(rec => {
      if (!disciplineRules.length) return;
      map[rec.date] = rec.completedRuleIds.length / disciplineRules.length;
    });
    return map;
  }, [disciplineHistory, disciplineRules]);

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
  const todayTotal = disciplineRules.length;

  const ruleStats = useMemo(() => disciplineRules.map(rule => {
    const records = disciplineHistory.filter(r => r.completedRuleIds.includes(rule.id));
    const followRate = disciplineHistory.length > 0 ? Math.round((records.length / disciplineHistory.length) * 100) : 0;
    let avgPerf: number | null = null;
    if (records.length > 0) {
      const pnls = records.map(rec => trades.filter(t => t.entryDate.startsWith(rec.date)).reduce((a, t) => a + (t.pnl - t.fees), 0));
      avgPerf = parseFloat((pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2));
    }
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const rec = disciplineHistory.find(r => r.date === fmtKey(d));
      if (rec?.completedRuleIds.includes(rule.id)) streak++; else break;
    }
    return { ...rule, followRate, avgPerf, streak };
  }), [disciplineRules, disciplineHistory, trades]);

  const handleAddRule = () => { if (!newRuleText.trim()) return; onAddRule(newRuleText.trim()); setNewRuleText(''); };

  return (
    <div style={{ background: '#f8f9fc', minHeight: '100vh', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d2e', margin: 0 }}>{language === 'cn' ? '心态风控' : 'Progress Tracker'}</h1>
      </div>

      {/* Top 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16, maxWidth: 480 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9396aa', fontWeight: 500, marginBottom: 8 }}>{language === 'cn' ? '连续天数' : 'Current streak'} <InfoIcon /></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1d2e' }}>{currentStreak} {language === 'cn' ? '天' : 'days'} {currentStreak === 0 ? '😐' : currentStreak > 3 ? '🔥' : '👍'}</div>
        </div>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9396aa', fontWeight: 500, marginBottom: 8 }}>{language === 'cn' ? '当期得分' : 'Period score'} <InfoIcon /></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: periodScore === null ? '#9396aa' : periodScore >= 70 ? '#00c896' : periodScore >= 40 ? '#f59e0b' : '#ff4d6a' }}>{periodScore === null ? '--' : `${periodScore}%`}</div>
        </div>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9396aa', fontWeight: 500, marginBottom: 8 }}>{language === 'cn' ? '今日进度' : "Today's progress"} <InfoIcon /></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1d2e', marginBottom: 8 }}>{todayCompleted}/{todayTotal}</div>
          <div style={{ height: 4, background: '#f0f0f6', borderRadius: 2 }}>
            <div style={{ height: '100%', width: todayTotal > 0 ? `${(todayCompleted / todayTotal) * 100}%` : '0%', background: '#6366f1', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Middle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16, alignItems: 'stretch' }}>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e', marginBottom: 16 }}>{language === 'cn' ? '今日规则' : "Today's Rules"}</div>
          {disciplineRules.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d2e' }}>{language === 'cn' ? '暂无规则' : 'No rules yet'}</div>
              <div style={{ fontSize: 12, color: '#9396aa', textAlign: 'center', lineHeight: 1.6 }}>{language === 'cn' ? '在下方添加您的交易规则' : 'Add your trading rules below'}</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {disciplineRules.map(rule => {
                const done = todayRecord?.completedRuleIds.includes(rule.id) ?? false;
                return (
                  <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5fa' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${done ? '#00c896' : '#e0e0ea'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? '#00c896' : 'transparent' }}>
                      {done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: done ? '#9396aa' : '#1a1d2e', textDecoration: done ? 'line-through' : 'none' }}>{rule.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f6' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1d2e' }}>{language === 'cn' ? '当前规则' : 'Current Rules'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={newRuleText} onChange={e => setNewRuleText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRule()}
              placeholder={language === 'cn' ? '添加新规则...' : 'Add new rule...'}
              style={{ fontSize: 12, border: '1px solid #e0e0ea', borderRadius: 6, padding: '6px 12px', outline: 'none', width: 200, color: '#1a1d2e' }} />
            <button onClick={handleAddRule} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6366f1', background: 'transparent', border: '1px solid #e0e0ea', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 500 }}>
              <Plus size={13} /> {language === 'cn' ? '添加' : 'Add'}
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 20px', background: '#fafafa', borderBottom: '1px solid #f0f0f6' }}>
          {[language === 'cn' ? '规则' : 'Rule', language === 'cn' ? '条件' : 'Condition', language === 'cn' ? '连续天数' : 'Rule Streak', language === 'cn' ? '平均表现' : 'Avg Performance', language === 'cn' ? '执行率' : 'Follow Rate'].map((h, i) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9396aa', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: i > 1 ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>
        {ruleStats.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#b0b3c6', fontSize: 13 }}>{language === 'cn' ? '暂无规则，在上方添加您的第一条规则' : 'No rules yet. Add your first rule above.'}</div>
        ) : ruleStats.map((rule, i) => (
          <div key={rule.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '13px 20px', borderBottom: i < ruleStats.length - 1 ? '1px solid #f5f5fa' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafe'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${rule.followRate > 0 ? '#00c896' : '#ff4d6a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: rule.followRate > 0 ? '#00c896' : '#ff4d6a', fontSize: 10 }}>{rule.followRate > 0 ? '✓' : '✕'}</span>
              </div>
              <span style={{ fontSize: 13, color: '#1a1d2e' }}>{rule.text}</span>
            </div>
            <span style={{ fontSize: 13, color: '#4a4d6a' }}>—</span>
            <span style={{ fontSize: 13, color: '#4a4d6a', textAlign: 'center' }}>{rule.streak}</span>
            <span style={{ fontSize: 13, textAlign: 'center', color: rule.avgPerf === null ? '#9396aa' : rule.avgPerf > 0 ? '#00c896' : rule.avgPerf < 0 ? '#ff4d6a' : '#9396aa' }}>
              {rule.avgPerf === null ? '--' : `${rule.avgPerf > 0 ? '+' : ''}$${Math.abs(rule.avgPerf).toFixed(2)}`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: rule.followRate > 70 ? '#00c896' : rule.followRate > 40 ? '#f59e0b' : '#ff4d6a' }}>{rule.followRate}%</span>
              <button onClick={() => onDeleteRule(rule.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d0d3e0', padding: 0, display: 'flex' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff4d6a'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#d0d3e0'}
              ><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Psychology;
