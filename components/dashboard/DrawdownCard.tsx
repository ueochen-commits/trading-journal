import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Trade } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DdPoint { date: string; drawdown: number; }

interface DdStats {
  points: DdPoint[];
  maxDrawdown: number;
  deepestIdx: number;
  daysAtMaxDrawdown: number;
  longestUnderwater: number;
  maxRecoveryDays: number | null;
  currentStatus: 'new_high' | 'underwater';
}

// ─── Data computation ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function computeDrawdown(trades: Trade[], accountSize: number): DdStats {
  const closed = trades.filter(t => t.exitDate).sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  const dayMap: Record<string, number> = {};
  closed.forEach(t => {
    const d = new Date(t.exitDate).toISOString().slice(0, 10);
    dayMap[d] = (dayMap[d] ?? 0) + (t.pnl - t.fees);
  });

  const days = Object.keys(dayMap).sort();
  if (days.length < 2) {
    return { points: [], maxDrawdown: 0, deepestIdx: 0, daysAtMaxDrawdown: 0, longestUnderwater: 0, maxRecoveryDays: null, currentStatus: 'new_high' };
  }

  const base = accountSize > 0 ? accountSize : 10000;
  let cum = 0, peakEquity = base;
  let underwaterStart: string | null = null;
  let longestUnderwater = 0;
  let maxRecoveryDays: number | null = null;
  const points: DdPoint[] = [];

  days.forEach(date => {
    cum += dayMap[date];
    const equity = base + cum;

    if (equity > peakEquity) {
      if (underwaterStart) {
        longestUnderwater = Math.max(longestUnderwater, daysBetween(underwaterStart, date));
        const deepestInPeriod = points
          .filter(p => p.date >= underwaterStart! && p.date <= date)
          .reduce((min, p) => p.drawdown < min.drawdown ? p : min, { drawdown: 0, date: '' });
        if (deepestInPeriod.date) {
          const recDays = daysBetween(deepestInPeriod.date, date);
          maxRecoveryDays = maxRecoveryDays == null ? recDays : Math.max(maxRecoveryDays, recDays);
        }
        underwaterStart = null;
      }
      peakEquity = equity;
    } else if (!underwaterStart && equity < peakEquity) {
      underwaterStart = date;
    }

    const dd = ((equity - peakEquity) / peakEquity) * 100;
    points.push({ date, drawdown: parseFloat(dd.toFixed(2)) });
  });

  if (underwaterStart) {
    longestUnderwater = Math.max(longestUnderwater, daysBetween(underwaterStart, days[days.length - 1]));
  }

  const deepestIdx = points.reduce((mi, p, i) => p.drawdown < points[mi].drawdown ? i : mi, 0);
  const maxDrawdown = points[deepestIdx].drawdown;

  let lastHighBeforeDeep = 0;
  for (let i = deepestIdx - 1; i >= 0; i--) {
    if (points[i].drawdown >= -0.01) { lastHighBeforeDeep = i; break; }
  }
  const daysAtMaxDrawdown = daysBetween(points[lastHighBeforeDeep].date, points[deepestIdx].date);
  const currentStatus = points[points.length - 1].drawdown >= -0.01 ? 'new_high' : 'underwater';

  return { points, maxDrawdown, deepestIdx, daysAtMaxDrawdown, longestUnderwater, maxRecoveryDays, currentStatus };
}

function daysUnderwaterAt(points: DdPoint[], idx: number): number | null {
  if (points[idx].drawdown >= -0.01) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (points[i].drawdown >= -0.01) return idx - i;
  }
  return idx + 1;
}

function buildXLabels(points: DdPoint[]): { idx: number; text: string }[] {
  if (points.length === 0) return [];
  const raw: { idx: number; text: string }[] = [];
  let lastMonth = -1;
  points.forEach((p, i) => {
    const m = new Date(p.date).getMonth();
    if (m !== lastMonth) { raw.push({ idx: i, text: `${m + 1}月` }); lastMonth = m; }
  });
  let labels = raw;
  if (labels.length > 6) {
    const step = Math.ceil(labels.length / 5);
    labels = labels.filter((_, i) => i % step === 0);
    if (labels[labels.length - 1] !== raw[raw.length - 1]) labels.push(raw[raw.length - 1]);
  }
  if (labels.length > 0) labels[labels.length - 1] = { ...labels[labels.length - 1], text: '现在' };
  return labels;
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const VW = 600, VH = 380;
const PL = 40, PR = 16, PT = 24, PB = 28;
const PW = VW - PL - PR, PH = VH - PT - PB;

function xS(idx: number, total: number) { return PL + (idx / Math.max(total - 1, 1)) * PW; }
function yS(pct: number, yMin: number)  { return PT + (pct / yMin) * PH; }

// ─── SVG Chart ────────────────────────────────────────────────────────────────

interface DrawdownSVGProps {
  stats: DdStats;
  hoverIdx: number | null;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave: () => void;
}

function DrawdownSVG({ stats, hoverIdx, onMouseMove, onMouseLeave }: DrawdownSVGProps) {
  const { points, maxDrawdown, deepestIdx, daysAtMaxDrawdown } = stats;
  if (points.length < 2) return null;

  const yMin = Math.min(-20, Math.floor(maxDrawdown / 5) * 5 - 5);
  const warningY = yS(-10, yMin);
  const dangerY  = yS(-20, yMin);
  const zeroY    = PT;

  const pts = points.map((p, i) => ({ x: xS(i, points.length), y: yS(p.drawdown, yMin) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(VH-PB).toFixed(1)} L${PL},${(VH-PB).toFixed(1)} Z`;

  const dx = pts[deepestIdx].x;
  const dy = pts[deepestIdx].y;
  const bubbleLabel = `${maxDrawdown.toFixed(1)}% · ${daysAtMaxDrawdown}天`;
  const bubbleW = 90;
  const bubbleH = 20;
  const bubbleX = Math.max(PL, Math.min(VW - PR - bubbleW, dx - bubbleW / 2));
  // Flip bubble above the dot if it would overflow the bottom
  const bubbleBelow = dy + 8 + bubbleH < VH - PB - 10;
  const bubbleY = bubbleBelow ? dy + 8 : dy - 8 - bubbleH;

  const yTicks = Array.from(new Set([0, -10, -20, yMin])).sort((a, b) => b - a);
  const xLabels = buildXLabels(points);

  const hoverPt = hoverIdx !== null ? pts[hoverIdx] : null;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <defs>
        <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F5A5A0" stopOpacity="0.05" />
          <stop offset="30%"  stopColor="#F5A5A0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F5A5A0" stopOpacity="0.50" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks */}
      {yTicks.map(v => (
        <text key={v} x={PL - 4} y={yS(v, yMin) + 3} textAnchor="end"
          fontSize="8" fill={v === 0 ? '#059669' : v === -10 ? '#F59E0B' : '#DC2626'}
          fontWeight={v === 0 || v === yMin ? '500' : '400'}
          fontFamily='"SF Mono", monospace'>{v}%</text>
      ))}

      {/* 0% line */}
      <line x1={PL} y1={zeroY} x2={VW-PR} y2={zeroY} stroke="#059669" strokeWidth="1.2" strokeDasharray="4,3" />
      <text x={PL+4} y={zeroY-4} fontSize="8" fill="#059669" fontWeight="500" fontFamily='"SF Mono", monospace'>新高水位线</text>

      {/* -10% warning */}
      <line x1={PL} y1={warningY} x2={VW-PR} y2={warningY} stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,3" opacity="0.75" />
      <text x={PL+4} y={warningY-3} fontSize="8" fill="#F59E0B" fontFamily='"SF Mono", monospace'>-10% 警戒</text>

      {/* -20% danger */}
      <line x1={PL} y1={dangerY} x2={VW-PR} y2={dangerY} stroke="#DC2626" strokeWidth="1" strokeDasharray="3,3" opacity="0.65" />
      <text x={PL+4} y={dangerY-3} fontSize="8" fill="#DC2626" fontFamily='"SF Mono", monospace'>-20% 危险</text>

      {/* Fill + line */}
      <path d={areaPath} fill="url(#dd-grad)" />
      <path d={linePath} fill="none" stroke="#DC2626" strokeWidth="1.25" strokeLinejoin="round" />

      {/* Deepest point bubble (always visible) */}
      <circle cx={dx} cy={dy} r="3.5" fill="#DC2626" stroke="white" strokeWidth="1.5" />
      {bubbleBelow
        ? <polygon points={`${dx-5},${dy+8} ${dx+5},${dy+8} ${dx},${dy+4}`} fill="#DC2626" />
        : <polygon points={`${dx-5},${dy-8} ${dx+5},${dy-8} ${dx},${dy-4}`} fill="#DC2626" />}
      <rect x={bubbleX} y={bubbleY} width={bubbleW} height={bubbleH} fill="#DC2626" rx="3" />
      <text x={bubbleX+bubbleW/2} y={bubbleY+13} textAnchor="middle" fontSize="9.5" fill="white" fontWeight="600" fontFamily='"SF Mono", monospace'>{bubbleLabel}</text>

      {/* Hover indicator */}
      {hoverIdx !== null && hoverPt && (
        <>
          <line x1={hoverPt.x} y1={PT} x2={hoverPt.x} y2={VH-PB}
            stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
          <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill="#DC2626" stroke="white" strokeWidth="2" />
        </>
      )}

      {/* X-axis labels */}
      {xLabels.map(({ idx, text }) => {
        const isDeep = Math.abs(idx - deepestIdx) < points.length / 10;
        return (
          <text key={idx} x={xS(idx, points.length)} y={VH-4} textAnchor="middle" fontSize="8.5"
            fill={isDeep ? '#DC2626' : '#94A3B8'} fontWeight={isDeep ? '600' : '400'}
            fontFamily='"SF Mono", monospace'>{text}</text>
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DrawdownCardProps {
  trades: Trade[];
  accountSize: number;
  language?: string;
  infoIcon?: React.ReactNode;
}

const DrawdownCard: React.FC<DrawdownCardProps> = ({ trades, accountSize, language = 'cn', infoIcon }) => {
  const stats = useMemo(() => computeDrawdown(trades, accountSize), [trades, accountSize]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgContainerRef.current || stats.points.length < 2) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const viewBoxX = mouseX * (VW / rect.width);
    const dataX = (viewBoxX - PL) / PW;
    const idx = Math.round(dataX * (stats.points.length - 1));
    if (idx >= 0 && idx < stats.points.length) setHoverIdx(idx);
  }, [stats.points.length]);

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  // Tooltip position
  const tooltipStyle = useMemo((): React.CSSProperties | null => {
    if (hoverIdx === null || !svgContainerRef.current) return null;
    const containerW = svgContainerRef.current.offsetWidth;
    const xPct = xS(hoverIdx, stats.points.length) / VW;
    const pixelX = xPct * containerW;
    const isRight = pixelX > containerW * 0.6;
    return {
      position: 'absolute',
      top: 0,
      ...(isRight ? { right: `${containerW - pixelX + 12}px` } : { left: `${pixelX + 12}px` }),
    };
  }, [hoverIdx, stats.points.length]);

  const hoverPoint = hoverIdx !== null ? stats.points[hoverIdx] : null;
  const uwDays = hoverIdx !== null ? daysUnderwaterAt(stats.points, hoverIdx) : null;

  return (
    <div style={{ position: 'relative', background: '#fff', border: '1px solid #ededf3', borderRadius: 12, padding: '16px 20px', height: 320, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{language === 'cn' ? '回撤分析' : 'Drawdown'}</span>
          {infoIcon}
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>从历史最高点的回撤%</span>
      </div>

      {/* Chart */}
      {stats.points.length < 2 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
            <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 4-4"/>
          </svg>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500, margin: 0 }}>数据积累中</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, textAlign: 'center', maxWidth: 200, lineHeight: 1.5 }}>
            至少需要 7 天交易数据才能生成回撤分析
          </p>
        </div>
      ) : (
        <div ref={svgContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <DrawdownSVG stats={stats} hoverIdx={hoverIdx} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} />

          {/* White tooltip */}
          {hoverPoint && tooltipStyle && (
            <div style={{
              ...tooltipStyle,
              background: '#fff',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 8,
              padding: '10px 12px',
              minWidth: 148,
              boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
              pointerEvents: 'none',
              zIndex: 10,
              fontFamily: 'inherit',
            }}>
              <div style={{ fontSize: 11, color: '#0F172A', fontWeight: 500, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.15)', fontFamily: '"SF Mono", monospace' }}>
                {hoverPoint.date.replace(/-/g, '/')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', flexShrink: 0, display: 'inline-block' }} />
                  回撤
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: '"SF Mono", monospace', fontVariantNumeric: 'tabular-nums', color: '#DC2626' }}>
                  {hoverPoint.drawdown.toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: uwDays === null ? '#059669' : '#F59E0B', flexShrink: 0, display: 'inline-block' }} />
                  {uwDays === null ? '状态' : '已水下'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: '"SF Mono", monospace', fontVariantNumeric: 'tabular-nums', color: uwDays === null ? '#059669' : '#F59E0B' }}>
                  {uwDays === null ? '新高 ✓' : `${uwDays} 天`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom stats */}
      {stats.points.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 10px', paddingTop: 10, borderTop: '1px solid rgba(148,163,184,0.12)', flexShrink: 0 }}>
          {[
            { label: '最大回撤', value: `${stats.maxDrawdown.toFixed(1)}%`, color: '#DC2626' },
            { label: '最长水下', value: `${stats.longestUnderwater} 天`, color: '#DC2626' },
            { label: '历史恢复', value: stats.maxRecoveryDays != null ? `${stats.maxRecoveryDays} 天` : '--', color: '#F59E0B' },
            { label: '当前状态', value: stats.currentStatus === 'new_high' ? '新高 ✓' : '水下中', color: stats.currentStatus === 'new_high' ? '#059669' : '#DC2626' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: '"SF Mono", monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrawdownCard;
