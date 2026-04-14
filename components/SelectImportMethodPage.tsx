import React, { useState } from 'react';

type Method = 'auto' | 'file' | 'manual';

interface Props {
  exchangeName?: string;
  exchangeLogoUrl?: string;
  exchangeBrandColor?: string;
  onContinue?: (method: Method) => void;
  onBack?: () => void;
  onClose?: () => void;
}

const SelectImportMethodPage: React.FC<Props> = ({
  exchangeName = 'Binance',
  exchangeLogoUrl,
  exchangeBrandColor = '#f5a500',
  onContinue,
  onBack,
  onClose,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Method | null>(null);
  const [backHovered, setBackHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const cards: { method: Method; title: string; desc: string; recommended?: boolean; icon: React.ReactNode }[] = [
    {
      method: 'auto',
      title: '自动同步',
      desc: '连接您的经纪商账户',
      recommended: true,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="#5b5bd6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2v6h-6"/>
          <path d="M3 12a9 9 0 0115-6.7L21 8"/>
          <path d="M3 22v-6h6"/>
          <path d="M21 12a9 9 0 01-15 6.7L3 16"/>
        </svg>
      ),
    },
    {
      method: 'file',
      title: '上传文件',
      desc: '上传经纪商提供的交易记录文件',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="#5b5bd6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 12 15 15"/>
        </svg>
      ),
    },
    {
      method: 'manual',
      title: '手动添加',
      desc: '通过界面逐笔添加交易记录',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="#5b5bd6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="13" height="16" rx="2"/>
          <path d="M3 6v14a2 2 0 002 2h13"/>
          <line x1="17" y1="9" x2="17" y2="14"/>
          <line x1="14.5" y1="11.5" x2="19.5" y2="11.5"/>
        </svg>
      ),
    },
  ];

  const getCardStyle = (method: Method): React.CSSProperties => {
    const isSelected = selectedMethod === method;
    const isHovered = hoveredCard === method;
    return {
      position: 'relative',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 16px 24px',
      borderRadius: 16,
      cursor: 'pointer',
      transition: 'all 0.18s ease',
      background: '#ffffff',
      border: isSelected ? '2px solid #5b5bd6' : '1px solid #ebe8f5',
      boxShadow: isSelected
        ? '0 6px 24px rgba(91,91,214,0.16), 0 2px 6px rgba(91,91,214,0.08)'
        : isHovered
        ? '0 6px 20px rgba(90,80,160,0.13), 0 2px 6px rgba(90,80,160,0.07)'
        : '0 2px 8px rgba(90,80,160,0.07), 0 1px 2px rgba(90,80,160,0.04)',
      transform: isSelected || isHovered ? 'translateY(-2px)' : 'none',
    };
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e2dcf0 0%, #ece8f8 25%, #f2f0f9 55%, #f5f4fb 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      paddingBottom: 60,
    }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', zIndex: 100, height: 3 }}>
        <div style={{ flex: 2, background: '#5b5bd6' }} />
        <div style={{ flex: 1, background: '#dcd8f0' }} />
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        onMouseEnter={() => setBackHovered(true)}
        onMouseLeave={() => setBackHovered(false)}
        style={{
          position: 'fixed', top: 28, left: 32,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: backHovered ? '#3a3ab8' : '#6b6b9a',
          padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s', zIndex: 100,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>

      {/* Close button */}
      <button
        onClick={onClose}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
        style={{
          position: 'fixed', top: 28, right: 32,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: closeHovered ? '#3a3ab8' : '#6b6b9a',
          padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s', zIndex: 100,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      {/* Main content */}
      <div style={{ width: '100%', maxWidth: 660, paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#8888b0', fontWeight: 400, letterSpacing: '0.03em', marginBottom: 8 }}>
            添加交易
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a3a', margin: 0 }}>
            选择导入方式
          </h1>
        </div>

        {/* Exchange logo + label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: exchangeBrandColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            overflow: 'hidden',
          }}>
            {exchangeLogoUrl
              ? <img src={exchangeLogoUrl} alt={exchangeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{exchangeName[0]}</span>
            }
          </div>
          <div style={{ fontSize: 13, color: '#8888b0' }}>
            您正在连接到 <strong style={{ fontWeight: 700, color: '#1a1a3a' }}>{exchangeName}</strong>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: 'flex', gap: 16,
          width: '100%', maxWidth: '92vw',
          marginBottom: 32,
        }}>
          {cards.map(({ method, title, desc, recommended, icon }) => (
            <div
              key={method}
              style={getCardStyle(method)}
              onClick={() => setSelectedMethod(method)}
              onMouseEnter={() => setHoveredCard(method)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {recommended && (
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  background: '#5b5bd6', color: '#fff',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '4px 10px',
                  borderRadius: '16px 0 12px 0',
                }}>
                  推荐
                </div>
              )}
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#f0eefb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a3a', marginBottom: 6, textAlign: 'center' }}>
                {title}
              </div>
              <div style={{ fontSize: 12, color: '#9090b8', lineHeight: 1.65, textAlign: 'center' }}>
                {desc}
              </div>
            </div>
          ))}
        </div>

        {/* Continue button */}
        <button
          disabled={!selectedMethod}
          onClick={() => selectedMethod && onContinue?.(selectedMethod)}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            width: '100%', maxWidth: '92vw', height: 50,
            borderRadius: 12, border: 'none',
            background: selectedMethod
              ? (btnHovered ? '#4a4ac4' : '#5b5bd6')
              : '#e0ddf0',
            color: selectedMethod ? '#ffffff' : '#a8a8c8',
            fontSize: 16, fontWeight: 700,
            cursor: selectedMethod ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          继续
          {selectedMethod && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default SelectImportMethodPage;
