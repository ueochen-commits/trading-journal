import React, { useMemo } from 'react';
import { Trade } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DdPoint { date: string; drawdown: number; }

interface DdStats {
  points: DdPoint[];
  maxDrawdown: number;
  deepestIdx: number;
  daysAtMaxDrawdown: number;
  longestUnderwater: number;
  recoveryDays: number | null;
  currentStatus: 'new_high' | 'underwater';
}

// ─── Data computation ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function computeDrawdown(trades: Trade[]): DdStats {
  const closed = trades.filter(t => t.exitDate).sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  // Group by day
  const dayMap: Record<string, number> = {};
  closed.forEach(t => {
    const d = new Date(t.exitDate).toISOString().slice(0, 10);
    dayMap[d] = (dayMap[d] ?? 0) + (t.pnl - t.fees);
  });

  const days = Object.keys(dayMap).sort();
  if (days.length < 2) {
    return { points: [], maxDrawdown: 0, deepestIdx: 0, daysAtMaxDrawdown: 0, longestUnderwater: 0, recoveryDays: null, currentStatus: 'new_high' };
  }

  // Build equity curve + drawdown %
  let cum = 0, peak = 0;
  let underwaterStart: string | null = null;
  let longestUnderwater = 0;
  const points: DdPoint[] = [];

  days.forEach(date => {
    cum += dayMap[date];
    if (cum > peak) {
      if (underwaterStart) {
        longestUnderwater = Math.max(longestUnderwater, daysBetween(underwaterStart, date));
        underwaterStart = null;
      }
      peak = cum;
    } else if (!underwaterStart && cum < peak) {
      underwaterStart = date;
    }
    const dd = peak > 0 ? ((cum - peak) / peak) * 100 : Math.min(0, cum);
    points.push({ date, drawdown: parseFloat(dd.toFixed(2)) });
  });

  if (underwaterStart) {
    longestUnderwater = Math.max(longestUnderwater, daysBetween(underwaterStart, days[days.length - 1]));
  }

  const deepestIdx = points.reduce((mi, p, i) => p.drawdown < points[mi].drawdown ? i : mi, 0);
  const maxDrawdown = points[deepestIdx].drawdown;

  // Days from last high before deepest to deepest
  let lastHighBeforeDeep = 0;
  for (let i = deepestIdx - 1; i >= 0; i--) {
    if (points[i].drawdown >= -0.01) { lastHighBeforeDeep = i; break; }
  }
  const daysAtMaxDrawdown = daysBetween(points[lastHighBeforeDeep].date, points[deepestIdx].date);

  // Recovery days: deepest → next new high
  const recoveryIdx = points.findIndex((p, i) => i > deepestIdx && p.drawdown >= -0.01);
  const recoveryDays = recoveryIdx > 0 ? daysBetween(points[deepestIdx].date, points[recoveryIdx].date) : null;

  const currentStatus = points[points.length - 1].drawdown >= -0.01 ? 'new_high' : 'underwater';

  return { points, maxDrawdown, deepestIdx, daysAtMaxDrawdown, longestUnderwater, recoveryDays, currentStatus };
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────

const VW = 600, VH = 200;
const PL = 38, PR = 16, PT = 18, PB = 22;
const PW = VW - PL - PR, PH = VH - PT - PB;

function xS(idx: number, total: number) { return PL + (idx / Math.max(total - 1, 1)) * PW; }
function yS(pct: number, yMin: number)  { return PT + (pct / yMin) * PH; }

function DrawdownSVG({ stats }: { stats: DdStats }) {
  const { points, maxDrawdown, deepestIdx, daysAtMaxDrawdown } = stats;
  if (points.length < 2) return null;

  // Y axis: at least -20%, expand if deeper
  const yMin = Math.min(-20, Math.floor(maxDrawdown / 10) * 10 - 5);

  const warningY = yS(-10, yMin);
  const dangerY  = yS(-20, yMin);
  const zeroY    = PT; // 0% is always at top

  // Paths
  const pts = points.map((p, i) => ({ x: xS(i, points.length), y: yS(p.drawdown, yMin) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(VH-PB).toFixed(1)} L${PL},${(VH-PB).toFixed(1)} Z`;

  // Deepest point
  const dx = pts[deepestIdx].x;
  const dy = pts[deepestIdx].y;
  const bubbleLabel = `${maxDrawdown.toFixed(1)}% · ${daysAtMaxDrawdown}天`;
  // Clamp bubble so it doesn't overflow left/right
  const bubbleW = 84;
  const bubbleX = Math.max(PL, Math.min(VW - PR - bubbleW, dx - bubbleW / 2));

  // X-axis labels: ~5 evenly spaced
  const labelCount = Math.min(5, points.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round(i * (points.length - 1) / (labelCount - 1))
  );
  const fmtLabel = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}月`;
  };

  // Y-axis ticks
  const yTicks: number[] = [0];
  for (let v = -10; v >= yMin; v -= 10) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5A5A0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F5A5A0" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Y-axis tick labels */}
      {yTicks.map(v => (
        <text key={v} x={PL - 4} y={yS(v, yMin) + 3} textAnchor="end"
          fontSize="8" fill="#94A3B8" fontFamily='"SF Mono", monospace'>
          {v}%
        </text>
      ))}

      {/* 0% new-high line */}
      <line x1={PL} y1={zeroY} x2={VW - PR} y2={zeroY}
        stroke="#059669" strokeWidth="1.2" strokeDasharray="4,3" />
      <text x={PL + 4} y={zeroY - 4} fontSize="8.5" fill="#059669" fontWeight="500"
        fontFamily='"SF Mono", monospace'>新高水位线</text>

      {/* -10% warning line */}
      {warningY < VH - PB && (
        <>
          <line x1={PL} y1={warningY} x2={VW - PR} y2={warningY}
            stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />
          <text x={PL + 4} y={warningY - 3} fontSize="8" fill="#F59E0B"
            fontFamily='"SF Mono", monospace'>-10% 警戒</text>
        </>
      )}

      {/* -20% danger line */}
      {dangerY < VH - PB && (
        <>
          <line x1={PL} y1={dangerY} x2={VW - PR} y2={dangerY}
            stroke="#DC2626" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          <text x={PL + 4} y={dangerY - 3} fontSize="8" fill="#DC2626"
            fontFamily='"SF Mono", monospace'>-20% 危险</text>
        </>
      )}

      {/* Fill */}
      <path d={areaPath} fill="url(#dd-grad)" />

      {/* Main line */}
      <path d={linePath} fill="none" stroke="#DC2626" strokeWidth="1.25" strokeLinejoin="round" />

      {/* Deepest point dot */}
      <circle cx={dx} cy={dy} r="3.5" fill="#DC2626" stroke="white" strokeWidth="1.5" />

      {/* Bubble annotation */}
      <polygon points={`${dx - 5},${dy + 8} ${dx + 5},${dy + 8} ${dx},${dy + 4}`} fill="#DC2626" />
      <rect x={bubbleX} y={dy + 8} width={bubbleW} height={18} fill="#DC2626" rx="3" />
      <text x={bubbleX + bubbleW / 2} y={dy + 20} textAnchor="middle"
        fontSize="9.5" fill="white" fontWeight="600" fontFamily='"SF Mono", monospace'>
        {bubbleLabel}
      </text>

      {/* X-axis labels */}
      {labelIndices.map((idx, i) => {
        const isDeep = Math.abs(idx - deepestIdx) < points.length / 10;
        const isLast = i === labelIndices.length - 1;
        return (
          <text key={idx} x={xS(idx, points.length)} y={VH - 4}
            textAnchor="middle" fontSize="8.5"
            fill={isDeep ? '#DC2626' : '#94A3B8'}
            fontWeight={isDeep ? '600' : '400'}
            fontFamily='"SF Mono", monospace'>
            {isLast ? '现在' : fmtLabel(points[idx].date)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DrawdownCardProps {
  trades: Trade[];
  language?: string;
  infoIcon?: React.ReactNode;
}

const DrawdownCard: React.FC<DrawdownCardProps> = ({ trades, language = 'cn', infoIcon }) => {
  const stats = useMemo(() => computeDrawdown(trades), [trades]);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: '#fff',
    border: '1px solid #ededf3',
    borderRadius: 12,
    padding: '16px 20px',
    height: 280,
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{language === 'cn' ? '回撤分析' : 'Drawdown'}</span>
          {infoIcon}
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>从历史最高点的回撤%</span>
      </div>

      {/* Chart or empty */}
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
        <div style={{ flex: 1, minHeight: 0 }}>
          <DrawdownSVG stats={stats} />
        </div>
      )}

      {/* Bottom stats */}
      {stats.points.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 10px', paddingTop: 10, borderTop: '1px solid rgba(148,163,184,0.12)', flexShrink: 0 }}>
          {[
            { label: '最大回撤', value: `${stats.maxDrawdown.toFixed(1)}%`, color: '#DC2626' },
            { label: '最长水下', value: `${stats.longestUnderwater} 天`, color: '#DC2626' },
            { label: '恢复天数', value: stats.recoveryDays != null ? `${stats.recoveryDays} 天` : '--', color: '#F59E0B' },
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
