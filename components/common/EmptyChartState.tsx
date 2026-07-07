import React from 'react';

type EmptyChartStateVariant = 'cards' | 'cloud';

interface EmptyChartStateProps {
  title: string;
  subtitle?: string;
  variant?: EmptyChartStateVariant;
  compact?: boolean;
  minHeight?: number | string;
}

const EmptyChartState: React.FC<EmptyChartStateProps> = ({
  title,
  subtitle,
  variant = 'cards',
  compact = false,
  minHeight = 220,
}) => {
  const imageSrc = variant === 'cloud'
    ? '/report-empty-state-preview-cloud-v2.svg'
    : '/report-empty-state-preview-cards-v2.svg';

  const imageWidth = compact ? 78 : 92;
  const titleSize = compact ? 13 : 14;
  const subtitleSize = compact ? 11 : 12;

  return (
    <div
      style={{
        height: '100%',
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '16px 12px' : '20px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: compact ? 8 : 10,
          maxWidth: compact ? 260 : 320,
        }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          style={{
            width: imageWidth,
            height: 'auto',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: titleSize,
            lineHeight: compact ? '18px' : '20px',
            fontWeight: 500,
            color: '#2f3742',
          }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            style={{
              margin: 0,
              fontSize: subtitleSize,
              lineHeight: compact ? '17px' : '18px',
              fontWeight: 400,
              color: '#9aa4b2',
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyChartState;
