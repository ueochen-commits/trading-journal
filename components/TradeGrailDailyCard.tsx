import React, { useMemo, useState } from 'react';
import { Trade, DailyPlan } from '../types';

type Scenario = 'profit' | 'loss' | 'no-trade' | 'market-closed';

interface BannerData {
  type: 'weekly' | 'monthly';
  title: string;
  meta: string;
  actionText: string;
  onAction: () => void;
}

interface TradeGrailDailyCardProps {
  trades: Trade[];
  plans?: DailyPlan[];
  language?: string;
  onNavigateToJournal?: () => void;
  onNavigateToPlans?: () => void;
}

function formatDateLabel(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${y} · ${m} · ${d}  ${days[date.getDay()]}`;
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function getYesterdayTrades(trades: Trade[]): Trade[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  return trades.filter(t => t.entryDate?.slice(0, 10) === key);
}

// Headline is built from hardcoded templates with only numeric/symbol data interpolated — no user input
function buildHeadlineParts(scenario: Scenario, yesterdayTrades: Trade[]): React.ReactNode {
  const netPnl = yesterdayTrades.reduce((s, t) => s + (t.pnl - t.fees), 0);
  const wins = yesterdayTrades.filter(t => t.pnl > 0).length;
  const winRate = yesterdayTrades.length > 0 ? ((wins / yesterdayTrades.length) * 100).toFixed(1) : '0';
  const grossWins = yesterdayTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLosses = Math.abs(yesterdayTrades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0));
  const pf = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : '∞';
  const n = yesterdayTrades.length;
  const symbols = [...new Set(yesterdayTrades.map(t => t.symbol))].slice(0, 2).join('、');

  const pos = (v: string) => <span style={{ color: '#86EFAC', fontWeight: 500 }}>{v}</span>;
  const neg = (v: string) => <span style={{ color: '#FCA5A5', fontWeight: 500 }}>{v}</span>;
  const emph = (v: string) => <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{v}</span>;
  const actionPrefix = <span style={{ color: 'rgba(199,210,254,0.7)', fontWeight: 500 }}>建议：</span>;
  const action = (v: string) => <span style={{ color: '#C7D2FE', fontWeight: 500 }}>{v}</span>;

  if (scenario === 'profit') return <>昨日成交 {emph(`${n} 笔`)}，{symbols ? symbols + ' ' : ''}净收益 {pos(`+$${netPnl.toFixed(2)}`)}，盈亏比 {emph(pf)}，胜率 {emph(`${winRate}%`)}。{actionPrefix}{action('检视离场条件是否符合策略手册规则。')}</>;
  if (scenario === 'loss') return <>昨日成交 {emph(`${n} 笔`)}，净亏损 {neg(`-$${Math.abs(netPnl).toFixed(2)}`)}，胜率 {emph(`${winRate}%`)}，盈亏比 {emph(pf)}。{actionPrefix}{action('回看亏损笔交易并在策略手册中强化止损条款。')}</>;
  if (scenario === 'market-closed') return <>周末市场休市。{actionPrefix}{action('在笔记本中记录本周市场判断，查看上周周报。')}</>;
  return <>昨日无成交记录，纪律执行率待评估。{actionPrefix}{action('在笔记本中记录观望期的市场判断。')}</>;
}

const TradeGrailDailyCard: React.FC<TradeGrailDailyCardProps> = ({
  trades, plans = [], language = 'cn', onNavigateToJournal, onNavigateToPlans,
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const today = new Date();

  const yesterdayTrades = useMemo(() => getYesterdayTrades(trades), [trades]);

  const scenario: Scenario = useMemo(() => {
    if (isWeekend(today)) return 'market-closed';
    if (yesterdayTrades.length === 0) return 'no-trade';
    const netPnl = yesterdayTrades.reduce((s, t) => s + (t.pnl - t.fees), 0);
    return netPnl >= 0 ? 'profit' : 'loss';
  }, [yesterdayTrades]);

  const netPnl = useMemo(() => yesterdayTrades.reduce((s, t) => s + (t.pnl - t.fees), 0), [yesterdayTrades]);
  const headlineParts = useMemo(() => buildHeadlineParts(scenario, yesterdayTrades), [scenario, yesterdayTrades]);

  const banner: BannerData | null = useMemo(() => {
    if (bannerDismissed) return null;
    const monthlyPlan = plans.find(p => p.folder === 'monthly-review' && !p.isDeleted);
    const weeklyPlan = plans.find(p => p.folder === 'weekly-review' && !p.isDeleted);
    if (monthlyPlan && today.getDate() <= 3) {
      return { type: 'monthly', title: `${today.getMonth() + 1}月月度报告`, meta: '已生成', actionText: '打开月报 →', onAction: () => { onNavigateToPlans?.(); setBannerDismissed(true); } };
    }
    if (weeklyPlan && today.getDay() === 1) {
      return { type: 'weekly', title: `第 ${Math.ceil(today.getDate() / 7)} 周周度报告`, meta: '已生成', actionText: '查看周报 →', onAction: () => { onNavigateToPlans?.(); setBannerDismissed(true); } };
    }
    return null;
  }, [plans, bannerDismissed, onNavigateToPlans]);

  const primaryActionText = banner?.type === 'monthly' ? '打开月报 →' : banner?.type === 'weekly' ? '查看周报 →' : scenario === 'no-trade' ? '打开笔记本 →' : scenario === 'market-closed' ? '查看周报 →' : '查看复盘 →';
  const handlePrimaryAction = () => (scenario === 'no-trade' || scenario === 'market-closed') ? onNavigateToPlans?.() : onNavigateToJournal?.();

  const pnlColor = (scenario === 'no-trade' || scenario === 'market-closed') ? '#CBD5E1' : netPnl >= 0 ? '#86EFAC' : '#FCA5A5';
  const pnlArrow = (scenario === 'no-trade' || scenario === 'market-closed') ? '—' : netPnl >= 0 ? '▲' : '▼';
  const pnlValue = (scenario === 'no-trade' || scenario === 'market-closed') ? '无交易' : `${netPnl >= 0 ? '+' : '−'}$${Math.abs(netPnl).toFixed(2)}`;

  const isMonthly = banner?.type === 'monthly';

  return (
    <div style={{ position: 'relative', minHeight: 160, borderRadius: 10, background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)', overflow: 'hidden', padding: banner ? '50px 24px 20px' : '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', transition: 'padding-top 0.2s ease', height: '100%' }}>

      {/* Lion watermark */}
      <img
        src="/band-lion.png"
        alt=""
        style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', width: 180, height: 180, objectFit: 'contain', opacity: 0.18, pointerEvents: 'none', zIndex: 1, mixBlendMode: 'luminosity' as const }}
      />

      {/* Report banner */}
      {banner && (
        <div style={{ position: 'absolute', top: 12, left: 24, right: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: isMonthly ? 'rgba(99,102,241,0.3)' : 'rgba(167,139,250,0.15)', border: `1px solid ${isMonthly ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.3)'}`, borderRadius: 5, zIndex: 3, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#E0E7FF' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isMonthly ? '#F8FAFC' : '#C7D2FE', boxShadow: `0 0 0 3px ${isMonthly ? 'rgba(248,250,252,0.25)' : 'rgba(199,210,254,0.2)'}`, flexShrink: 0 }} />
            <span><span style={{ fontWeight: 600, color: '#FFFFFF' }}>{banner.title}</span>{banner.meta ? ` · ${banner.meta}` : ''}</span>
          </span>
          <button onClick={banner.onAction} style={{ fontSize: 11, color: isMonthly ? '#F8FAFC' : '#E0E7FF', background: isMonthly ? 'rgba(255,255,255,0.15)' : 'transparent', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 4, fontWeight: 500, fontFamily: 'inherit', transition: 'background 0.15s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isMonthly ? 'rgba(255,255,255,0.15)' : 'transparent'; }}>
            {banner.actionText}
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, letterSpacing: '0.12em', fontWeight: 500, color: 'rgba(167,139,250,0.9)' }}>
          TRADEGRAIL DAILY<span style={{ color: 'rgba(167,139,250,0.5)', margin: '0 8px' }}>·</span>{formatDateLabel(today)}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, letterSpacing: '0.12em', fontWeight: 500, color: 'rgba(167,139,250,0.7)' }}>NET P/L</span>
          <span style={{ fontFamily: '"SF Mono", Menlo, monospace', fontWeight: 600, fontSize: 12, letterSpacing: '-0.01em', color: pnlColor, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9 }}>{pnlArrow}</span>{pnlValue}
          </span>
        </span>
      </div>

      {/* Headline */}
      <p style={{ fontSize: 14, color: '#F8FAFC', lineHeight: 1.65, fontWeight: 400, margin: 0, maxWidth: '72%', position: 'relative', zIndex: 2 }}>
        {headlineParts}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <span style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(167,139,250,0.7)', flexShrink: 0 }} />
          由 TradeGrail AI 生成
        </span>
        <button onClick={handlePrimaryAction}
          style={{ fontSize: 11, color: 'rgba(248,250,252,0.85)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit' }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#FFFFFF'; b.style.background = 'rgba(255,255,255,0.18)'; b.style.borderColor = 'rgba(255,255,255,0.3)'; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'rgba(248,250,252,0.85)'; b.style.background = 'rgba(255,255,255,0.08)'; b.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
          {primaryActionText}
        </button>
      </div>
    </div>
  );
};

export default TradeGrailDailyCard;
