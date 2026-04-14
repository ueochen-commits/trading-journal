import React, { useState, useEffect } from 'react';

type Method = 'auto' | 'file' | 'manual';

interface Props {
  exchangeName?: string;
  exchangeLogoUrl?: string;
  exchangeBrandColor?: string;
  onContinue?: (method: Method) => void;
  onBack?: () => void;
  onClose?: () => void;
}

const ASSET_CONFIG: Record<Method, Record<string, boolean>> = {
  auto: {
    股票: false, 期货: false, 期权: false, 外汇: false, 加密货币: true, 差价合约: false,
  },
  file: {
    股票: false, 期货: false, 期权: false, 外汇: false, 加密货币: true, 差价合约: false,
  },
  manual: {
    股票: true, 期货: true, 期权: true, 外汇: true, 加密货币: true, 差价合约: true,
  },
};

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="9" fill="#5b5bd6"/>
    <polyline points="5,9 8,12 13,6" stroke="white" strokeWidth="1.8"
      fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="8" fill="none" stroke="#c8c8d8" strokeWidth="1.5"/>
    <line x1="6" y1="6" x2="12" y2="12" stroke="#b0b0c8" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="6" x2="6" y2="12" stroke="#b0b0c8" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

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

  useEffect(() => {
    const style = document.createElement('style');
    const keyframes = '@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }';
    style.appendChild(document.createTextNode(keyframes));
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const cards: { method: Method; title: string; desc: string; recommended?: boolean; icon: React.ReactNode }[] = [
    {
      method: 'auto',
      title: '自动同步',
      desc: '连接您的经纪商账户',
      recommended: true,
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#5b5bd6" style={{ opacity: 0.82 }}>
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
      ),
    },
    {
      method: 'file',
      title: '上传文件',
      desc: '上传经纪商提供的交易记录文件',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#5b5bd6" style={{ opacity: 0.82 }}>
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-1 4l-3 3h2v3h2v-3h2l-3-3z"/>
        </svg>
      ),
    },
    {
      method: 'manual',
      title: '手动添加',
      desc: '通过界面逐笔添加交易记录',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#5b5bd6" style={{ opacity: 0.82 }}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
      ),
    },
  ];

  const getCardStyle = (method: Method): React.CSSProperties => {
    const isSelected = selectedMethod === method;
    const isHovered = hoveredCard === method && !isSelected;
    return {
      position: 'relative',
      flex: 1,
      minHeight: 190,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px 32px',
      borderRadius: 14,
      cursor: 'pointer',
      transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      background: isSelected
        ? 'linear-gradient(160deg, #ffffff 60%, #f3f1ff 100%)'
        : '#ffffff',
      border: '1px solid transparent',
      boxShadow: isSelected
        ? '0 0 0 3px rgba(99,91,255,0.13), 0 0 20px 6px rgba(99,91,255,0.10), 0 8px 24px rgba(99,91,255,0.10)'
        : isHovered
        ? '0 4px 16px rgba(90,80,160,0.10), 0 0 0 1px #c8c0f0'
        : '0 2px 8px rgba(90,80,160,0.06), 0 0 0 1px #ebe8f5',
      transform: isSelected ? 'translateY(-3px)' : isHovered ? 'translateY(-2px)' : 'translateY(0)',
    };
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse 65% 55% at 50% 38%, #ffffff 0%, #ffffff 20%, #ede9fe 55%, #ddd6fe 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', paddingBottom: 48,
    }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', zIndex: 100, height: 3 }}>
        <div style={{ flex: 2, background: '#5b5bd6' }} />
        <div style={{ flex: 1, background: '#dcd8f0' }} />
      </div>

      {/* Back button */}
      <button onClick={onBack}
        onMouseEnter={() => setBackHovered(true)} onMouseLeave={() => setBackHovered(false)}
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
      <button onClick={onClose}
        onMouseEnter={() => setCloseHovered(true)} onMouseLeave={() => setCloseHovered(false)}
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
        <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: '92vw', marginBottom: 0 }}>
          {cards.map(({ method, title, desc, recommended, icon }) => {
            const isSelected = selectedMethod === method;
            return (
              <div key={method} style={getCardStyle(method)}
                onClick={() => setSelectedMethod(method)}
                onMouseEnter={() => setHoveredCard(method)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {recommended && (
                  <div style={{
                    position: 'absolute', top: -1, left: -1,
                    background: '#5b5bd6', color: '#fff',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                    padding: '4px 12px', borderRadius: '15px 0 10px 0',
                  }}>
                    推荐
                  </div>
                )}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: isSelected ? '#e4e0ff' : '#f0eefb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18, transition: 'background 0.2s ease',
                }}>
                  {icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a3a', marginBottom: 8, textAlign: 'center' }}>
                  {title}
                </div>
                <div style={{ fontSize: 12, color: '#9090b8', lineHeight: 1.65, textAlign: 'center' }}>
                  {desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Asset types area — fixed height, always rendered */}
        <div style={{
          width: '100%', maxWidth: '92vw',
          height: 90,
          marginTop: 24, marginBottom: 20,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          visibility: selectedMethod ? 'visible' : 'hidden',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a3a' }}>
              支持的资产类型：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px' }}>
              {Object.keys(ASSET_CONFIG.manual).map(asset => {
                const supported = selectedMethod ? ASSET_CONFIG[selectedMethod][asset] : false;
                return (
                  <div key={asset} style={{ display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s ease' }}>
                    {supported ? <CheckIcon /> : <CrossIcon />}
                    <span style={{
                      fontSize: 13,
                      fontWeight: supported ? 500 : 400,
                      color: supported ? '#1a1a3a' : '#b0b0c8',
                      transition: 'color 0.2s ease',
                    }}>
                      {asset}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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
            background: selectedMethod ? (btnHovered ? '#312e81' : '#3730a3') : '#e8e8f0',
            color: selectedMethod ? '#ffffff' : '#b0b3c6',
            fontSize: 16, fontWeight: 700,
            cursor: selectedMethod ? 'pointer' : 'not-allowed',
            transition: 'all 0.18s ease',
            boxShadow: selectedMethod
              ? (btnHovered ? '0 6px 20px rgba(55,48,163,0.4)' : '0 4px 16px rgba(55,48,163,0.3)')
              : 'none',
            transform: selectedMethod && btnHovered ? 'translateY(-1px)' : 'translateY(0)',
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
