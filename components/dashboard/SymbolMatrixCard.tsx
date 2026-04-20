import React, { useMemo, useRef, useState, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Trade } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SymbolData {
  symbol: string;
  shortCode: string;
  tradeCount: number;
  expectancyR: number;
  totalPnL: number;
  winRate: number;
  avgR: number;
  maxLossStreak: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: SymbolData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_R = 8;
const MAX_R = 28;

function calcRadius(pnl: number, maxAbs: number): number {
  if (maxAbs === 0) return MIN_R;
  return MIN_R + (MAX_R - MIN_R) * Math.sqrt(Math.abs(pnl) / maxAbs);
}

function calcFontSize(r: number): number {
  const d = r * 2;
  if (d <= 20) return 0;
  return Math.floor(d * 0.28);
}

function computeSymbolData(trades: Trade[]): SymbolData[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const bySymbol: Record<string, Trade[]> = {};
  trades.forEach(t => {
    if (new Date(t.entryDate) < cutoff) return;
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = [];
    bySymbol[t.symbol].push(t);
  });

  return Object.entries(bySymbol)
    .filter(([, ts]) => ts.length >= 5)
    .map(([symbol, ts]) => {
      const totalPnL = ts.reduce((s, t) => s + (t.pnl - t.fees), 0);
      const wins = ts.filter(t => t.pnl > 0).length;
      const winRate = wins / ts.length;

      // True R: pnl / riskAmount per trade; fallback to 1% of position value
      const rValues = ts.map(t => {
        const risk = t.riskAmount && t.riskAmount > 0
          ? t.riskAmount
          : t.entryPrice * t.quantity * 0.01;
        return (t.pnl - t.fees) / risk;
      });
      const avgR = rValues.reduce((s, r) => s + r, 0) / rValues.length;

      // expectancyR using true R values
      const winRValues = rValues.filter((_, i) => ts[i].pnl > 0);
      const lossRValues = rValues.filter((_, i) => ts[i].pnl <= 0);
      const avgWinR = winRValues.length > 0 ? winRValues.reduce((s, r) => s + r, 0) / winRValues.length : 0;
      const avgLossR = lossRValues.length > 0 ? Math.abs(lossRValues.reduce((s, r) => s + r, 0) / lossRValues.length) : 1;
      const expectancyR = winRate * avgWinR - (1 - winRate) * avgLossR;

      // max loss streak
      let maxStreak = 0, streak = 0;
      ts.forEach(t => { if (t.pnl <= 0) { streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0; });

      const shortCode = symbol.replace(/USDT|USDC|BTC|ETH|BNB$/i, '').slice(0, 5) || symbol.slice(0, 4);

      return { symbol, shortCode, tradeCount: ts.length, expectancyR, totalPnL, winRate, avgR, maxLossStreak: maxStreak };
    });
}

// ─── Custom Bubble Shape ──────────────────────────────────────────────────────

const BubbleShape = (props: any) => {
  const { cx, cy, payload, maxAbsPnL, onHover, onLeave } = props;
  const r = calcRadius(payload.totalPnL, maxAbsPnL);
  const fs = calcFontSize(r);
  const isPos = payload.totalPnL >= 0;
  const fill = isPos ? '#D1FAE5' : '#FEE2E2';
  const textColor = isPos ? '#047857' : '#B91C1C';

  return (
    <g
      onMouseEnter={(e) => onHover(e, payload)}
      onMouseLeave={onLeave}
      style={{ cursor: 'default' }}
    >
      <circle cx={cx} cy={cy} r={r} fill={fill}
        stroke={isPos ? 'rgba(5,150,105,0.18)' : 'rgba(220,38,38,0.18)'}
        strokeWidth={1} />
      {fs > 0 && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill={textColor} fontSize={fs} fontWeight={500} fontFamily="Inter, sans-serif"
          letterSpacing="0.06em">
          {payload.shortCode}
        </text>
      )}
    </g>
  );
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const BubbleTooltip = ({ state }: { state: TooltipState }) => {
  if (!state.visible || !state.data) return null;
  const d = state.data;
  const isPos = d.totalPnL >= 0;
  const pnlClass = isPos ? '#059669' : '#DC2626';
  const dotColor = isPos ? '#10B981' : '#EF4444';
  const avgRColor = d.avgR >= 0 ? '#059669' : '#DC2626';

  return (
    <div style={{
      position: 'fixed', left: state.x, top: state.y,
      background: '#fff', border: '1px solid rgba(148,163,184,0.25)',
      borderRadius: 8, padding: '12px 14px', minWidth: 180,
      boxShadow: '0 4px 16px -4px rgba(15,23,42,0.12)',
      pointerEvents: 'none', zIndex: 9999,
      fontFamily: 'inherit', fontSize: 12,
    }}>
      <div style={{ marginBottom: 6, paddingBottom: 8, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', letterSpacing: '0.02em' }}>{d.symbol}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ color: '#64748B', flex: 1 }}>总盈亏</span>
        <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: pnlClass }}>
          {isPos ? '+' : '−'}${Math.abs(d.totalPnL).toFixed(2)}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', paddingTop: 10, borderTop: '1px solid rgba(148,163,184,0.1)' }}>
        {[
          { label: '交易笔数', value: String(d.tradeCount), color: '#0F172A' },
          { label: '胜率', value: `${(d.winRate * 100).toFixed(0)}%`, color: '#0F172A' },
          { label: '平均 R', value: `${d.avgR >= 0 ? '+' : ''}${d.avgR.toFixed(2)}R`, color: avgRColor },
          { label: '最长连亏', value: `${d.maxLossStreak} 笔`, color: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '0.02em' }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: '"SF Mono", monospace', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface SymbolMatrixCardProps {
  trades: Trade[];
  language?: string;
}

const SymbolMatrixCard: React.FC<SymbolMatrixCardProps> = ({ trades, language = 'cn' }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const symbols = useMemo(() => computeSymbolData(trades), [trades]);
  const maxAbsPnL = useMemo(() => Math.max(...symbols.map(s => Math.abs(s.totalPnL)), 1), [symbols]);

  const stats = useMemo(() => {
    if (symbols.length === 0) return null;
    const sorted = [...symbols].sort((a, b) => b.totalPnL - a.totalPnL);
    const profitable = symbols.filter(s => s.totalPnL > 0).length;
    const totalPnL = symbols.reduce((s, d) => s + d.totalPnL, 0);
    const totalTrades = symbols.reduce((s, d) => s + d.tradeCount, 0);
    const portfolioExp = totalTrades > 0 ? totalPnL / totalTrades : 0;
    return {
      best: sorted[0]?.shortCode ?? '—',
      worst: sorted[sorted.length - 1]?.shortCode ?? '—',
      profitable,
      total: symbols.length,
      portfolioExp,
    };
  }, [symbols]);

  const handleHover = useCallback((e: React.MouseEvent, data: SymbolData) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => {
      const TOOLTIP_W = 200, TOOLTIP_H = 160;
      let x = e.clientX + 14;
      let y = e.clientY - TOOLTIP_H / 2;
      if (x + TOOLTIP_W > window.innerWidth - 10) x = e.clientX - TOOLTIP_W - 14;
      if (y < 10) y = 10;
      if (y + TOOLTIP_H > window.innerHeight - 10) y = window.innerHeight - TOOLTIP_H - 10;
      setTooltip({ visible: true, x, y, data });
    }, 150);
  }, []);

  const handleLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 100);
  }, []);

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '0.5px solid #e8e8f0', borderRadius: 12,
    padding: '16px 20px', display: 'flex', flexDirection: 'column',
  };

  if (symbols.length < 3) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d2e' }}>{language === 'cn' ? '品种表现' : 'Symbol Performance'}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: 'default' }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>近 90 天</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 8 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
          </svg>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500, margin: 0 }}>品种交易数据不足</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            至少需要 3 个交易过 5 次以上的品种才能生成分析
          </p>
        </div>
      </div>
    );
  }

  const scatterData = symbols.map(s => ({ ...s, x: s.tradeCount, y: s.expectancyR }));

  return (
    <>
      <BubbleTooltip state={tooltip} />
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d2e' }}>{language === 'cn' ? '品种表现' : 'Symbol Performance'}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: 'default' }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>近 90 天 · 气泡大小 = 总盈亏</span>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis
                type="number" dataKey="x" name="交易频次"
                axisLine={false} tickLine={false}
                tick={{ fontSize: 9, fill: '#94A3B8', fontFamily: '"SF Mono", monospace' }}
                label={{ value: '交易频次 (笔)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94A3B8' }}
              />
              <YAxis
                type="number" dataKey="y" name="期望收益 R"
                axisLine={false} tickLine={false} width={36}
                tick={{ fontSize: 9, fill: '#94A3B8', fontFamily: '"SF Mono", monospace' }}
                tickFormatter={(v: number) => v > 0 ? `+${v.toFixed(1)}R` : `${v.toFixed(1)}R`}
              />
              <Scatter
                data={scatterData}
                shape={(props: any) => (
                  <BubbleShape {...props} maxAbsPnL={maxAbsPnL} onHover={handleHover} onLeave={handleLeave} />
                )}
              >
                {scatterData.map((_, i) => <Cell key={i} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Footer stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.12)', flexShrink: 0 }}>
            {[
              { label: '最佳品种', value: stats.best, color: '#15803D', mono: false },
              { label: '最差品种', value: stats.worst, color: '#B91C1C', mono: false },
              { label: '盈利品种', value: `${stats.profitable} / ${stats.total}`, color: stats.profitable > stats.total / 2 ? '#15803D' : '#B91C1C', mono: true },
              { label: '组合期望', value: `${stats.portfolioExp >= 0 ? '+' : ''}${stats.portfolioExp.toFixed(2)}R`, color: stats.portfolioExp >= 0 ? '#15803D' : '#B91C1C', mono: true },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '0 14px', borderRight: i < 3 ? '1px solid rgba(148,163,184,0.1)' : 'none', paddingLeft: i === 0 ? 0 : 14, paddingRight: i === 3 ? 0 : 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '0.04em' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: s.mono ? '"SF Mono", monospace' : '"Inter", sans-serif', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SymbolMatrixCard;
