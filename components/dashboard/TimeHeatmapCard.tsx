import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Trade } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'] as const;
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
type TimeSlot = typeof TIME_SLOTS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellData {
  dayOfWeek: number; // 1=Mon, 7=Sun
  timeSlot: TimeSlot;
  expectancy: number;
  tradeCount: number;
  totalPnL: number;
  winRate: number;
  avgPnL: number;
}

interface TooltipState {
  visible: boolean;
  cell: CellData | null;
  x: number;
  y: number;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const HEATMAP_CONFIG = {
  profit:   { rgb: '16, 185, 129' },
  loss:     { rgb: '239, 68, 68'  },
  alphaMin: 0.10,
  alphaMax: 0.70,
  noData:   '#F8FAFC',
};

function getCellColor(allCells: CellData[], cell: CellData | null): string {
  if (!cell || cell.tradeCount === 0) return HEATMAP_CONFIG.noData;
  if (cell.expectancy === 0) return '#FFFFFF';

  const valid = allCells.filter(c => c.tradeCount > 0);

  if (cell.expectancy > 0) {
    const positives = valid.filter(c => c.expectancy > 0).sort((a, b) => a.expectancy - b.expectancy);
    const rank = positives.findIndex(c => c.dayOfWeek === cell.dayOfWeek && c.timeSlot === cell.timeSlot);
    const pct  = positives.length > 1 ? rank / (positives.length - 1) : 1;
    const alpha = HEATMAP_CONFIG.alphaMin + pct * (HEATMAP_CONFIG.alphaMax - HEATMAP_CONFIG.alphaMin);
    return `rgba(${HEATMAP_CONFIG.profit.rgb}, ${alpha.toFixed(2)})`;
  } else {
    const negatives = valid.filter(c => c.expectancy < 0).sort((a, b) => b.expectancy - a.expectancy);
    const rank = negatives.findIndex(c => c.dayOfWeek === cell.dayOfWeek && c.timeSlot === cell.timeSlot);
    const pct  = negatives.length > 1 ? rank / (negatives.length - 1) : 1;
    const alpha = HEATMAP_CONFIG.alphaMin + pct * (HEATMAP_CONFIG.alphaMax - HEATMAP_CONFIG.alphaMin);
    return `rgba(${HEATMAP_CONFIG.loss.rgb}, ${alpha.toFixed(2)})`;
  }
}

// ─── Data computation ─────────────────────────────────────────────────────────

function getTimeSlot(utcHour: number): TimeSlot {
  if (utcHour < 4)  return '00-04';
  if (utcHour < 8)  return '04-08';
  if (utcHour < 12) return '08-12';
  if (utcHour < 16) return '12-16';
  if (utcHour < 20) return '16-20';
  return '20-24';
}

function computeHeatmap(trades: Trade[]): CellData[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const buckets: Record<string, Trade[]> = {};

  trades.forEach(t => {
    if (!t.exitDate) return;
    const closeTime = new Date(t.exitDate);
    if (isNaN(closeTime.getTime()) || closeTime < cutoff) return;

    const dow = closeTime.getUTCDay() === 0 ? 7 : closeTime.getUTCDay(); // 1=Mon
    const slot = getTimeSlot(closeTime.getUTCHours());
    const key = `${dow}-${slot}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(t);
  });

  return Object.entries(buckets).map(([key, ts]) => {
    const [dowStr, slot] = key.split(/-(.+)/); // split on first dash only
    const wins = ts.filter(t => (t.pnl - t.fees) > 0);
    const losses = ts.filter(t => (t.pnl - t.fees) <= 0);
    const totalPnL = ts.reduce((s, t) => s + (t.pnl - t.fees), 0);
    const winRate = ts.length > 0 ? wins.length / ts.length : 0;

    // Expectancy in R
    const rValues = ts.map(t => {
      const risk = t.riskAmount && t.riskAmount > 0
        ? t.riskAmount
        : Math.abs(t.entryPrice * t.quantity * 0.01) || 1;
      return (t.pnl - t.fees) / risk;
    });
    const avgWinR = wins.length > 0
      ? rValues.filter((_, i) => ts[i].pnl > 0).reduce((s, r) => s + r, 0) / wins.length
      : 0;
    const avgLossR = losses.length > 0
      ? Math.abs(rValues.filter((_, i) => ts[i].pnl <= 0).reduce((s, r) => s + r, 0) / losses.length)
      : 1;
    const expectancy = winRate * avgWinR - (1 - winRate) * avgLossR;

    return {
      dayOfWeek: parseInt(dowStr),
      timeSlot: slot as TimeSlot,
      tradeCount: ts.length,
      totalPnL,
      winRate,
      avgPnL: totalPnL / ts.length,
      expectancy,
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const HeatmapTooltip = ({ state, cardRef }: { state: TooltipState; cardRef: React.RefObject<HTMLDivElement | null> }) => {
  if (!state.visible || !state.cell) return null;
  const c = state.cell;
  const isPos = c.totalPnL >= 0;
  const dotColor = isPos ? '#10B981' : '#EF4444';
  const pnlColor = isPos ? '#059669' : '#DC2626';
  const expColor = c.expectancy >= 0 ? '#059669' : '#DC2626';
  const dayLabel = WEEK_DAYS[c.dayOfWeek - 1];

  const card = cardRef.current;
  let left = state.x;
  let top = state.y;
  if (card) {
    const cardRect = card.getBoundingClientRect();
    const TW = 190, TH = 160;
    left = state.x - cardRect.left + 10;
    top = state.y - cardRect.top - TH / 2;
    if (left + TW > cardRect.width - 4) left = state.x - cardRect.left - TW - 10;
    if (top < 4) top = 4;
    if (top + TH > cardRect.height - 4) top = cardRect.height - TH - 4;
  }

  return (
    <div style={{
      position: 'absolute', left, top,
      background: '#fff', border: '1px solid rgba(148,163,184,0.25)',
      borderRadius: 8, padding: '12px 14px', minWidth: 180,
      boxShadow: '0 4px 16px -4px rgba(15,23,42,0.12)',
      pointerEvents: 'none', zIndex: 100,
      fontFamily: 'inherit', fontSize: 12,
    }}>
      <div style={{ marginBottom: 6, paddingBottom: 8, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{dayLabel} · {c.timeSlot} UTC</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ color: '#64748B', flex: 1 }}>累计盈亏</span>
        <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: pnlColor }}>
          {isPos ? '+' : '−'}${Math.abs(c.totalPnL).toFixed(2)}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', paddingTop: 10, borderTop: '1px solid rgba(148,163,184,0.1)' }}>
        {[
          { label: '期望 R', value: `${c.expectancy >= 0 ? '+' : ''}${c.expectancy.toFixed(2)}R`, color: expColor },
          { label: '交易笔数', value: String(c.tradeCount), color: '#0F172A' },
          { label: '胜率', value: `${(c.winRate * 100).toFixed(0)}%`, color: '#0F172A' },
          { label: '平均 P/L', value: `${c.avgPnL >= 0 ? '+' : '−'}$${Math.abs(c.avgPnL).toFixed(2)}`, color: c.avgPnL >= 0 ? '#059669' : '#DC2626' },
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

interface TimeHeatmapCardProps {
  trades: Trade[];
  language?: string;
  infoIcon?: React.ReactNode;
}

const TimeHeatmapCard: React.FC<TimeHeatmapCardProps> = ({ trades, language = 'cn', infoIcon }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, cell: null, x: 0, y: 0 });

  const cells = useMemo(() => computeHeatmap(trades), [trades]);
  const totalTrades = useMemo(() => cells.reduce((s, c) => s + c.tradeCount, 0), [cells]);

  const cellMap = useMemo(() => {
    const m: Record<string, CellData> = {};
    cells.forEach(c => { m[`${c.dayOfWeek}-${c.timeSlot}`] = c; });
    return m;
  }, [cells]);

  const aggregates = useMemo(() => {
    const valid = cells.filter(c => c.tradeCount >= 3);
    if (!valid.length) return null;
    const best  = valid.reduce((a, b) => a.totalPnL > b.totalPnL ? a : b);
    const worst = valid.reduce((a, b) => a.totalPnL < b.totalPnL ? a : b);
    return { best, worst };
  }, [cells]);

  const handleEnter = useCallback((e: React.MouseEvent, cell: CellData | null) => {
    if (!cell || cell.tradeCount === 0) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showTimer.current) clearTimeout(showTimer.current);
    const x = e.clientX, y = e.clientY;
    showTimer.current = setTimeout(() => setTooltip({ visible: true, cell, x, y }), 150);
  }, []);

  const handleLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 100);
  }, []);

  // Empty state
  if (totalTrades < 10) {
    return (
      <div style={{ position: 'relative', background: '#fff', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '20px 24px', display: 'flex', flexDirection: 'column', height: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d2e' }}>{language === 'cn' ? '时段 × 星期' : 'Time × Day'}</span>
            {infoIcon}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>近 90 天 · UTC</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="22"/>
          </svg>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500, margin: 0 }}>交易数据不足</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
            至少需要近 90 天内 10 笔以上交易才能生成热力图
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} style={{ position: 'relative', background: '#fff', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '20px 24px', display: 'flex', flexDirection: 'column', height: 420 }}>
      <HeatmapTooltip state={tooltip} cardRef={cardRef} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d2e' }}>{language === 'cn' ? '时段 × 星期' : 'Time × Day'}</span>
          {infoIcon}
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>近 90 天 · UTC</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '42px repeat(7, 1fr)',
          gridTemplateRows: '20px repeat(6, 1fr)',
          gap: 3,
          width: '100%',
          flex: 1,
          minHeight: 0,
        }}>
          {/* Corner */}
          <div />
          {/* Day headers */}
          {WEEK_DAYS.map(d => (
            <div key={d} style={{ fontSize: 10, fontWeight: 500, color: '#64748B', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
          ))}

          {/* Rows */}
          {TIME_SLOTS.map(slot => (
            <React.Fragment key={slot}>
              {/* Time label */}
              <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: '"SF Mono", Menlo, monospace', textAlign: 'right', paddingRight: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                {slot}
              </div>
              {/* Cells */}
              {[1, 2, 3, 4, 5, 6, 7].map(dow => {
                const cell = cellMap[`${dow}-${slot}`] ?? null;
                const color = getCellColor(cells, cell);
                const hasData = cell && cell.tradeCount > 0;
                return (
                  <div
                    key={dow}
                    onMouseEnter={e => handleEnter(e, cell)}
                    onMouseLeave={handleLeave}
                    style={{
                      borderRadius: 3,
                      border: '1px solid rgba(148,163,184,0.08)',
                      background: color,
                      cursor: hasData ? 'pointer' : 'default',
                      transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                      minHeight: 0,
                    }}
                    onMouseOver={e => {
                      if (!hasData) return;
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(15,23,42,0.15)';
                      (e.currentTarget as HTMLElement).style.zIndex = '10';
                      (e.currentTarget as HTMLElement).style.position = 'relative';
                    }}
                    onMouseOut={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                      (e.currentTarget as HTMLElement).style.zIndex = '';
                      (e.currentTarget as HTMLElement).style.position = '';
                    }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.12)', flexShrink: 0 }}>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>亏损</span>
          <div style={{ width: 80, height: 6, borderRadius: 3, background: 'linear-gradient(to right, rgba(239,68,68,0.70) 0%, rgba(239,68,68,0.40) 30%, rgba(239,68,68,0.10) 45%, #F8FAFC 50%, rgba(16,185,129,0.10) 55%, rgba(16,185,129,0.40) 70%, rgba(16,185,129,0.70) 100%)' }} />
          <span style={{ fontSize: 10, color: '#94A3B8' }}>盈利</span>
        </div>
        {/* Best / Worst */}
        {aggregates && (
          <div style={{ fontSize: 10, color: '#64748B' }}>
            最佳: <strong style={{ color: '#059669', fontFamily: '"Inter", sans-serif' }}>{WEEK_DAYS[aggregates.best.dayOfWeek - 1]} {aggregates.best.timeSlot}</strong>
            <span style={{ margin: '0 5px', color: '#CBD5E1' }}>·</span>
            最差: <strong style={{ color: '#DC2626', fontFamily: '"Inter", sans-serif' }}>{WEEK_DAYS[aggregates.worst.dayOfWeek - 1]} {aggregates.worst.timeSlot}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeHeatmapCard;
