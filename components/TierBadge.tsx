import React from 'react';

type Tier = 'free' | 'pro' | 'elite';

const TIER_STYLES: Record<Tier, {
  color: string;
  border: string;
  background: string;
  fontWeight: number;
  dotBg: string;
}> = {
  free: {
    color: 'rgba(148, 163, 184, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    background: 'transparent',
    fontWeight: 500,
    dotBg: 'rgba(148, 163, 184, 0.55)',
  },
  pro: {
    color: '#C7D2FE',
    border: '1px solid rgba(167, 139, 250, 0.45)',
    background: 'rgba(99, 102, 241, 0.15)',
    fontWeight: 600,
    dotBg: '#A78BFA',
  },
  elite: {
    color: '#0F172A',
    border: 'none',
    background: '#F8FAFC',
    fontWeight: 700,
    dotBg: '#0F172A',
  },
};

interface TierBadgeProps {
  tier: Tier;
}

const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const s = TIER_STYLES[tier] || TIER_STYLES.free;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 7px',
      borderRadius: '4px',
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      letterSpacing: '0.06em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      color: s.color,
      border: s.border,
      background: s.background,
      fontWeight: s.fontWeight,
      flexShrink: 0,
    }}>
      <span style={{
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: s.dotBg,
        flexShrink: 0,
      }} />
      {tier.toUpperCase()}
    </span>
  );
};

export default TierBadge;
