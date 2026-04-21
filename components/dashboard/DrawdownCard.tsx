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

// ─── Y-axis config ────────────────────────────────────────────────────────────

interface YAxisConfig {
  yMin: number;
  ticks: number[];
  thresholds: { value: number; label: string; color: string }[];
}

function calcYAxis(maxDrawdown: number): YAxisConfig {
  const abs = Math.abs(maxDrawdown);
  if (abs < 5) return {
    yMin: -6,
    ticks: [0, -3, -6],
    thresholds: [{ value: -3, label: '警戒', color: '#F59E0B' }],
  };
  if (abs < 10) return {
    yMin: -12,
    ticks: [0, -4, -8, -12],
    thresholds: [
      { value: -5,  label: '警戒', color: '#F59E0B' },
      { value: -10, label: '危险', color: '#DC2626' },
    ],
  };
  if (abs < 20) return {
    yMin: -24,
    ticks: [0, -8, -16, -24],
    thresholds: [
      { value: -10, label: '警戒', color: '#F59E0B' },
      { value: -20, label: '危险', color: '#DC2626' },
    ],
  };
  if (abs < 35) return {
    yMin: -40,
    ticks: [0, -10, -20, -30, -40],
    thresholds: [
      { value: -10, label: '警戒', color: '#F59E0B' },
      { value: -20, label: '危险', color: '#DC2626' },
    ],
  };
  const yMin = Math.floor(maxDrawdown * 1.3 / 10) * 10;
  const step = Math.ceil(Math.abs(yMin) / 4 / 10) * 10;
  const ticks: number[] = [];
  for (let v = 0; v >= yMin; v -= step) ticks.push(v);
  return {
    yMin,
    ticks,
    thresholds: [
      { value: -10, label: '警戒', color: '#F59E0B' },
      { value: -20, label: '危险', color: '#DC2626' },
      { value: -30, label: '极限', color: '#991B1B' },
    ],
  };
}

// ─── X-axis ticks ─────────────────────────────────────────────────────────────

function buildXTicks(points: DdPoint[]): { idx: number; text: string; isLast: boolean }[] {
  if (points.length < 2) return [];
  return Array.from({ length: 5 }, (_, i) => {
    const idx = Math.round((i / 4) * (points.length - 1));
    const isLast = i === 4;
    const d = new Date(points[idx].date);
    const text = isLast ? '现在' : `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
    return { idx, text, isLast };
  });
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const VW = 480, VH = 160;
const PL = 42, PR = 10, PT = 8, PB = 14;
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

  const { yMin, ticks, thresholds } = calcYAxis(maxDrawdown);

  const pts = points.map((p, i) => ({ x: xS(i, points.length), y: yS(p.drawdown, yMin) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(VH-PB).toFixed(1)} L${PL},${(VH-PB).toFixed(1)} Z`;

  const dx = pts[deepestIdx].x;
  const dy = pts[deepestIdx].y;
  const bubbleLabel = `${maxDrawdown.toFixed(1)}% · ${daysAtMaxDrawdown}天`;
  const bubbleW = 80, bubbleH = 18;
  const bubbleX = Math.max(PL, Math.min(VW - PR - bubbleW, dx - bubbleW / 2));
  // Place bubble above dot; flip below if too close to top
  const labelAbove = dy > PT + 45;
  const bubbleY = labelAbove ? dy - 22 - bubbleH : dy + 22;

  const xTicks = buildXTicks(points);
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
          <stop offset="0%"   stopColor="#F5A5A0" stopOpacity="0.04" />
          <stop offset="40%"  stopColor="#F5A5A0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F5A5A0" stopOpacity="0.50" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks */}
      {ticks.map(v => (
        <text key={v} x={PL - 5} y={yS(v, yMin) + 3} textAnchor="end"
          fontSize="9" fill={v === 0 ? '#64748B' : '#CBD5E1'}
          fontWeight={v === 0 ? '500' : '400'}
          fontFamily='"SF Mono", monospace'>{v}%</text>
      ))}

      {/* 0% new-high line */}
      <line x1={PL} y1={PT} x2={VW-PR} y2={PT} stroke="#059669" strokeWidth="1.2" strokeDasharray="4,3" />
      <text x={PL+4} y={PT-4} fontSize="8" fill="#059669" fontWeight="500" fontFamily='"SF Mono", monospace'>新高水位线</text>

      {/* Dynamic threshold lines */}
      {thresholds.map(t => {
        const ty = yS(t.value, yMin);
        return (
          <g key={t.value}>
            <line x1={PL} y1={ty} x2={VW-PR} y2={ty} stroke={t.color} strokeWidth="1" strokeDasharray="3,3" opacity="0.55" />
            <text x={VW-PR-3} y={ty-3} textAnchor="end" fontSize="8" fill={t.color} fontFamily='"SF Mono", monospace'>{t.label}</text>
          </g>
        );
      })}

      {/* Fill + line */}
      <path d={areaPath} fill="url(#dd-grad)" />
      <path d={linePath} fill="none" stroke="#DC2626" strokeWidth="1.25" strokeLinejoin="round" />

      {/* Deepest point: dot + leader line + bubble */}
      <circle cx={dx} cy={dy} r="3.5" fill="#DC2626" stroke="white" strokeWidth="1.5" />
      <line x1={dx} y1={labelAbove ? dy - 6 : dy + 6} x2={dx} y2={labelAbove ? bubbleY + bubbleH : bubbleY}
        stroke="#DC2626" strokeWidth="0.8" />
      <rect x={bubbleX} y={bubbleY} width={bubbleW} height={bubbleH} fill="#DC2626" rx="3" />
      <text x={bubbleX + bubbleW/2} y={bubbleY + 12} textAnchor="middle"
        fontSize="9" fill="white" fontWeight="600" fontFamily='"SF Mono", monospace'>{bubbleLabel}</text>

      {/* Hover indicator */}
      {hoverIdx !== null && hoverPt && (
        <>
          <line x1={hoverPt.x} y1={PT} x2={hoverPt.x} y2={VH-PB}
            stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
          <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill="#DC2626" stroke="white" strokeWidth="2" />
        </>
      )}

      {/* X-axis labels */}
      {xTicks.map(({ idx, text, isLast }, i) => (
        <text key={idx} x={xS(idx, points.length)} y={VH - 6}
          textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
          fontSize="9" fill={isLast ? '#64748B' : '#94A3B8'}
          fontWeight={isLast ? '500' : '400'}
          fontFamily='"SF Mono", monospace'>{text}</text>
      ))}
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
    const viewBoxX = (e.clientX - rect.left) * (VW / rect.width);
    const idx = Math.round(((viewBoxX - PL) / PW) * (stats.points.length - 1));
    if (idx >= 0 && idx < stats.points.length) setHoverIdx(idx);
  }, [stats.points.length]);

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  const tooltipStyle = useMemo((): React.CSSProperties | null => {
    if (hoverIdx === null || !svgContainerRef.current) return null;
    const containerW = svgContainerRef.current.offsetWidth;
    const pixelX = (xS(hoverIdx, stats.points.length) / VW) * containerW;
    const isRight = pixelX > containerW * 0.6;
    return {
      position: 'absolute', top: 0,
      ...(isRight ? { right: `${containerW - pixelX + 12}px` } : { left: `${pixelX + 12}px` }),
    };
  }, [hoverIdx, stats.points.length]);

  const hoverPoint = hoverIdx !== null ? stats.points[hoverIdx] : null;
  const uwDays = hoverIdx !== null ? daysUnderwaterAt(stats.points, hoverIdx) : null;

  return (
    <div style={{ position: 'relative', background: '#fff', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '18px 20px', height: 320, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>{language === 'cn' ? '回撤分析' : 'Drawdown'}</span>
          {infoIcon}
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>从历史最高点的回撤%</span>
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
        <div ref={svgContainerRef} style={{ height: 180, flexShrink: 0, position: 'relative' }}>
          <DrawdownSVG stats={stats} hoverIdx={hoverIdx} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} />

          {/* White tooltip */}
          {hoverPoint && tooltipStyle && (
            <div style={{
              ...tooltipStyle,
              background: '#fff', border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 8, padding: '10px 12px', minWidth: 148,
              boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
              pointerEvents: 'none', zIndex: 10, fontFamily: 'inherit',
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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom stats */}
      {stats.points.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 12px', paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.12)', flexShrink: 0 }}>
          {[
            { label: '最大回撤', value: `${stats.maxDrawdown.toFixed(1)}%`, color: '#DC2626' },
            { label: '最长水下', value: `${stats.longestUnderwater} 天`, color: '#DC2626' },
            { label: '历史恢复', value: stats.maxRecoveryDays != null ? `${stats.maxRecoveryDays} 天` : '--', color: '#F59E0B' },
            { label: '当前状态', value: stats.currentStatus === 'new_high' ? '新高 ✓' : '水下中', color: stats.currentStatus === 'new_high' ? '#059669' : '#DC2626' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: s.color, fontFamily: '"SF Mono", monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrawdownCard;
