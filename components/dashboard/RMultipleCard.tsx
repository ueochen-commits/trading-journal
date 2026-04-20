import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Trade } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BIN_CENTERS = [-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const AXIS_LABELS = ['≤-4', '-3.5', '-3', '-2.5', '-2', '-1.5', '-1', '-0.5', '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '≥+4'];

const RMULTIPLE_COLORS = {
  largeLoss:  '#F5A5A0',
  mediumLoss: '#FCD3CD',
  smallLoss:  '#FEE9E6',
  neutral:    '#E8ECEF',
  smallWin:   '#E0F3EA',
  mediumWin:  '#BEE9D2',
  largeWin:   '#81D4AC',
};

function getBarColor(center: number): string {
  if (center <= -2.5) return RMULTIPLE_COLORS.largeLoss;
  if (center <= -0.75) return RMULTIPLE_COLORS.mediumLoss;
  if (center < 0)  return RMULTIPLE_COLORS.smallLoss;
  if (center === 0) return RMULTIPLE_COLORS.neutral;
  if (center <= 0.75) return RMULTIPLE_COLORS.smallWin;
  if (center <= 2)  return RMULTIPLE_COLORS.mediumWin;
  return RMULTIPLE_COLORS.largeWin;
}

function binR(r: number): number {
  if (r <= -4) return -4;
  if (r >= 4)  return 4;
  return Math.round(r * 2) / 2;
}

function fmtR(val: number): string {
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}R`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BinData {
  center: number;
  count: number;
  rValues: number[];
}

interface Stats {
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  maxWin: number;
  maxLoss: number;
  totalTrades: number;
}

interface TooltipState {
  visible: boolean;
  binIdx: number;
  x: number;
  y: number;
}

// ─── Data computation ─────────────────────────────────────────────────────────

function computeRMultiple(trades: Trade[]): { bins: BinData[]; stats: Stats } {
  const bins: BinData[] = BIN_CENTERS.map(c => ({ center: c, count: 0, rValues: [] }));

  const rValues: number[] = [];

  trades.forEach(t => {
    if (!t.exitDate) return;
    const pnl = t.pnl - t.fees;
    const risk = t.riskAmount && t.riskAmount > 0
      ? t.riskAmount
      : Math.abs(t.entryPrice * t.quantity * 0.01) || 1;
    const r = pnl / risk;
    rValues.push(r);
    const center = binR(r);
    const bin = bins.find(b => b.center === center);
    if (bin) { bin.count++; bin.rValues.push(r); }
  });

  const wins   = rValues.filter(r => r > 0);
  const losses = rValues.filter(r => r < 0);
  const winRate = rValues.length > 0 ? wins.length / rValues.length : 0;
  const avgWin  = wins.length   > 0 ? wins.reduce((s, r) => s + r, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, r) => s + r, 0) / losses.length : 0;

  return {
    bins,
    stats: {
      expectancy:   winRate * avgWin + (1 - winRate) * avgLoss,
      avgWin,
      avgLoss,
      maxWin:  rValues.length ? Math.max(...rValues) : 0,
      maxLoss: rValues.length ? Math.min(...rValues) : 0,
      totalTrades: rValues.length,
    },
  };
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const BinTooltip = ({
  state, bins, stats, cardRef,
}: {
  state: TooltipState;
  bins: BinData[];
  stats: Stats;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) => {
  if (!state.visible) return null;
  const bin = bins[state.binIdx];
  if (!bin || bin.count === 0) return null;

  const isCap = bin.center === -4 || bin.center === 4;
  const pct = stats.totalTrades > 0 ? ((bin.count / stats.totalTrades) * 100).toFixed(1) : '0';
  const avgR = bin.rValues.length > 0
    ? bin.rValues.reduce((s, r) => s + r, 0) / bin.rValues.length
    : bin.center;
  const label = bin.center === -4 ? '≤ -4R' : bin.center === 4 ? '≥ +4R' : `${fmtR(bin.center)}`;

  const card = cardRef.current;
  let left = state.x, top = state.y;
  if (card) {
    const cr = card.getBoundingClientRect();
    const TW = 170, TH = 110;
    left = state.x - cr.left + 10;
    top  = state.y - cr.top  - TH / 2;
    if (left + TW > cr.width - 4) left = state.x - cr.left - TW - 10;
    if (top < 4) top = 4;
    if (top + TH > cr.height - 4) top = cr.height - TH - 4;
  }

  return (
    <div style={{
      position: 'absolute', left, top, zIndex: 100, pointerEvents: 'none',
      background: '#fff', border: '1px solid rgba(148,163,184,0.25)',
      borderRadius: 8, padding: '10px 12px', minWidth: 160,
      boxShadow: '0 4px 16px -4px rgba(15,23,42,0.12)',
      fontFamily: 'inherit', fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
        {label}{isCap ? (bin.center < 0 ? ' (极端亏损)' : ' (极端盈利)') : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#64748B' }}>笔数</span>
          <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: '#0F172A' }}>{bin.count} 笔</span>
        </div>
        {isCap ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#64748B' }}>范围</span>
            <span style={{ fontFamily: '"SF Mono", monospace', color: '#475569', fontSize: 10 }}>
              {bin.rValues.sort((a, b) => a - b).map(r => fmtR(r)).join(', ')}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#64748B' }}>占比</span>
            <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: '#0F172A' }}>{pct}%</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#64748B' }}>区间均值</span>
          <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: avgR >= 0 ? '#059669' : '#DC2626' }}>{fmtR(avgR)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface RMultipleCardProps {
  trades: Trade[];
  language?: string;
  infoIcon?: React.ReactNode;
}

const RMultipleCard: React.FC<RMultipleCardProps> = ({ trades, language = 'cn', infoIcon }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, binIdx: -1, x: 0, y: 0 });

  const { bins, stats } = useMemo(() => computeRMultiple(trades), [trades]);
  const maxCount = useMemo(() => Math.max(...bins.map(b => b.count), 1), [bins]);

  const handleEnter = useCallback((e: React.MouseEvent, idx: number) => {
    if (bins[idx].count === 0) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showTimer.current) clearTimeout(showTimer.current);
    const x = e.clientX, y = e.clientY;
    showTimer.current = setTimeout(() => setTooltip({ visible: true, binIdx: idx, x, y }), 150);
  }, [bins]);

  const handleLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 100);
  }, []);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: '#fff',
    border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: 10,
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    height: 320,
  };

  // Empty state
  if (stats.totalTrades < 10) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>R-Multiple 分布</span>
            {infoIcon}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>近 {stats.totalTrades} 笔</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 160 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
            <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 4-4"/>
          </svg>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500, margin: 0 }}>交易数据不足</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, textAlign: 'center', maxWidth: 200, lineHeight: 1.5 }}>
            至少需要 10 笔已平仓交易才能生成分布图
          </p>
        </div>
      </div>
    );
  }

  const expPos = stats.expectancy >= 0;

  return (
    <div ref={cardRef} style={cardStyle}>
      <BinTooltip state={tooltip} bins={bins} stats={stats} cardRef={cardRef} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>R-Multiple 分布</span>
          {infoIcon}
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>近 {stats.totalTrades} 笔 · R = 盈亏 / 初始风险</span>
      </div>

      {/* Chart — explicit height so children's height:% resolves correctly */}
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 130, gap: 3, padding: '0 2px', flexShrink: 0 }}>
        {BIN_CENTERS.map((center, idx) => {
          const bin = bins[idx];
          const heightPct = (bin.count / maxCount) * 100;
          return (
            <div
              key={center}
              onMouseEnter={e => handleEnter(e, idx)}
              onMouseLeave={handleLeave}
              style={{
                flex: 1,
                height: `${heightPct}%`,
                minHeight: bin.count > 0 ? 3 : 0,
                background: getBarColor(center),
                borderRadius: '3px 3px 0 0',
                cursor: bin.count > 0 ? 'pointer' : 'default',
                transition: 'opacity 0.12s ease, transform 0.12s ease',
                transformOrigin: 'bottom',
              }}
              onMouseOver={e => {
                if (bin.count === 0) return;
                (e.currentTarget as HTMLElement).style.opacity = '0.82';
                (e.currentTarget as HTMLElement).style.transform = 'scaleY(1.04)';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLElement).style.opacity = '';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            />
          );
        })}
      </div>

      {/* X-axis */}
      <div style={{ display: 'flex', padding: '5px 2px 0', gap: 3, borderTop: '1px solid rgba(148,163,184,0.15)', marginBottom: 14, flexShrink: 0 }}>
        {AXIS_LABELS.map((label, idx) => {
          const isCap  = idx === 0 || idx === 16;
          const isZero = idx === 8;
          return (
            <span key={idx} style={{
              flex: 1, textAlign: 'center', fontSize: 9, overflow: 'hidden',
              fontFamily: '"SF Mono", Menlo, monospace',
              color: isCap ? '#475569' : isZero ? '#64748B' : '#94A3B8',
              fontWeight: isCap ? 600 : isZero ? 500 : 400,
            }}>
              {label}
            </span>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 10px', paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.12)', flexShrink: 0 }}>
        {[
          { label: 'EXPECTANCY', value: fmtR(stats.expectancy), color: expPos ? '#059669' : '#DC2626', bold: true },
          { label: '平均胜场',   value: fmtR(stats.avgWin),     color: '#059669', bold: true },
          { label: '平均负场',   value: fmtR(stats.avgLoss),    color: '#DC2626', bold: true },
          { label: '最大盈亏',   value: `${fmtR(stats.maxWin)} / ${fmtR(stats.maxLoss)}`, color: '#0F172A', bold: false },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>{s.label}</span>
            <span style={{
              fontSize: 13, fontWeight: s.bold ? 600 : 500, color: s.color,
              fontFamily: '"SF Mono", monospace', fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RMultipleCard;
