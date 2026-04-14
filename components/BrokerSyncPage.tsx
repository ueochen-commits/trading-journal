import React, { useState, useRef, useEffect } from 'react';

interface Props {
  exchangeName?: string;
  exchangeLogoUrl?: string;
  exchangeBrandColor?: string;
  supportedAssets?: Record<string, boolean>;
  isNew?: boolean;
  onConnect?: (data: {
    accountType: string;
    apiKey: string;
    apiSecret: string;
    skipSpot: boolean;
    startDate: string;
  }) => Promise<void> | void;
  onBack?: () => void;
  onClose?: () => void;
}

const ASSET_ORDER = ['股票', '期货', '期权', '外汇', '加密货币', '差价合约'];

const CheckIcon16 = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="8" fill="#5b5bd6"/>
    <polyline points="4,8 7,11 12,5" stroke="white" strokeWidth="1.6"
      fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossIcon16 = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="none" stroke="#c8c8d8" strokeWidth="1.5"/>
    <line x1="5" y1="5" x2="11" y2="11" stroke="#c0c0d0" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="11" y1="5" x2="5" y2="11" stroke="#c0c0d0" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BrokerSyncPage: React.FC<Props> = ({
  exchangeName = 'Binance',
  exchangeLogoUrl,
  exchangeBrandColor = '#f5a500',
  supportedAssets,
  isNew = false,
  onConnect,
  onBack,
  onClose,
}) => {
  const [startDate, setStartDate] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [accountType, setAccountType] = useState('main');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiSecretVisible, setApiSecretVisible] = useState(false);
  const [skipSpot, setSkipSpot] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [backHovered, setBackHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const ACCOUNT_OPTIONS = [
    { value: 'main', label: '主账户' },
    { value: 'demo', label: '演示 Account' },
  ];

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const displayDate = (val: string) => {
    if (!val) return '导入所有记录';
    const [y, m, d] = val.split('-');
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
  };

  const assets = supportedAssets ?? {
    股票: false, 期货: false, 期权: false, 外汇: false, 加密货币: true, 差价合约: false,
  };

  const canConnect = apiKey.trim() !== '' && apiSecret.trim() !== '';

  const inputStyle = (fieldName: string): React.CSSProperties => ({
    width: '100%',
    height: 44,
    borderRadius: 10,
    border: `1px solid ${focusedField === fieldName ? '#5b5bd6' : '#d8d4ee'}`,
    background: '#ffffff',
    padding: '0 14px',
    fontSize: 14,
    color: '#1a1a3a',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: focusedField === fieldName ? '0 0 0 3px rgba(91,91,214,0.10)' : 'none',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: '#4a4a6a',
    marginBottom: 6,
    display: 'block',
  };

  const bulletDot = (size = 6, color = '#5b5bd6') => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, flexShrink: 0, marginTop: 6,
    }} />
  );

  const StepItem = ({ text, children }: { text: string; children?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
      {bulletDot(6, '#5b5bd6')}
      <div style={{ fontSize: 14, color: '#6b6b9a', lineHeight: 1.7 }}>
        {text}
        {children}
      </div>
    </div>
  );

  const SubItem = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, paddingLeft: 14, marginTop: 4 }}>
      {bulletDot(4, '#c0c0d8')}
      <span style={{ fontSize: 14, color: '#6b6b9a', lineHeight: 1.7 }}>{text}</span>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse 65% 55% at 50% 38%, #ffffff 0%, #ffffff 20%, #ede9fe 55%, #ddd6fe 100%)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', paddingBottom: 60, boxSizing: 'border-box',
    }}>

      {/* Connecting overlay */}
      {isConnecting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 20,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #5b5bd6 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(91,91,214,0.35)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 0.9s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a3a', marginBottom: 6 }}>
              正在连接 {exchangeName}...
            </div>
            <div style={{ fontSize: 13, color: '#8888b0' }}>
              正在验证 API 密钥并导入交易记录，请稍候
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', zIndex: 100, height: 3 }}>
        <div style={{ flex: 4, background: '#5b5bd6' }} />
        <div style={{ flex: 1, background: '#dcd8f0' }} />
      </div>

      {/* Back button */}
      <button onClick={onBack}
        onMouseEnter={() => setBackHovered(true)} onMouseLeave={() => setBackHovered(false)}
        style={{
          position: 'fixed', top: 28, left: 32, zIndex: 100,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: backHovered ? '#3a3ab8' : '#6b6b9a',
          padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s',
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
          position: 'fixed', top: 28, right: 32, zIndex: 100,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: closeHovered ? '#3a3ab8' : '#6b6b9a',
          padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      {/* Main content */}
      <div style={{ width: '100%', maxWidth: 900, paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 13, color: '#8888b0', fontWeight: 400, letterSpacing: '0.03em', marginBottom: 8 }}>
            添加交易
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a3a', margin: 0 }}>
            经纪商同步
          </h1>
        </div>

        {/* Two-column layout */}
        <div style={{
          width: '100%', maxWidth: '97vw',
          display: 'flex', gap: 32, alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>

          {/* LEFT: Form */}
          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Start date — custom calendar */}
            <div>
              <label style={labelStyle}>开始日期</label>
              <div ref={calendarRef} style={{ position: 'relative' }}>
                {/* Trigger */}
                <div
                  onClick={() => {
                    if (!calendarOpen && startDate) {
                      const [y, m] = startDate.split('-');
                      setCalendarYear(parseInt(y));
                      setCalendarMonth(parseInt(m) - 1);
                    }
                    setCalendarOpen(o => !o);
                  }}
                  style={{
                    ...inputStyle('startDate'),
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                    borderRadius: calendarOpen ? '10px 10px 0 0' : 10,
                    border: calendarOpen ? '1px solid #e0e0ea' : '1px solid #d8d4ee',
                    boxShadow: calendarOpen ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <span style={{ color: startDate ? '#1a1a3a' : '#a0a0c0', fontSize: 14 }}>
                    {displayDate(startDate)}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#8888b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>

                {/* Calendar panel */}
                {calendarOpen && (() => {
                  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
                  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
                  const today = new Date();
                  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
                  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];
                  while (cells.length % 7 !== 0) cells.push(null);

                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: '#ffffff',
                      border: '1px solid #e0e0ea', borderTop: 'none',
                      borderRadius: '0 0 12px 12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                      padding: '12px 14px 14px',
                    }}>
                      {/* Month nav */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <button onClick={() => {
                          if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                          else setCalendarMonth(m => m - 1);
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888b0', padding: '2px 6px', borderRadius: 6, fontSize: 16, lineHeight: 1 }}>‹</button>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a3a' }}>
                          {calendarYear}年 {MONTHS[calendarMonth]}
                        </span>
                        <button onClick={() => {
                          if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                          else setCalendarMonth(m => m + 1);
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888b0', padding: '2px 6px', borderRadius: 6, fontSize: 16, lineHeight: 1 }}>›</button>
                      </div>

                      {/* Weekday headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                        {WEEKDAYS.map(d => (
                          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#b0b0c8', padding: '2px 0' }}>{d}</div>
                        ))}
                      </div>

                      {/* Day cells */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                        {cells.map((day, i) => {
                          if (!day) return <div key={i} />;
                          const dateStr = formatDate(calendarYear, calendarMonth, day);
                          const isSelected = dateStr === startDate;
                          const isToday = dateStr === todayStr;
                          return (
                            <div key={i}
                              onClick={() => { setStartDate(dateStr); setCalendarOpen(false); }}
                              style={{
                                textAlign: 'center', fontSize: 13, padding: '5px 0',
                                borderRadius: 7, cursor: 'pointer',
                                background: isSelected ? '#5b5bd6' : 'transparent',
                                color: isSelected ? '#fff' : isToday ? '#5b5bd6' : '#1a1a3a',
                                fontWeight: isSelected || isToday ? 600 : 400,
                                border: isToday && !isSelected ? '1px solid #c8c4f0' : '1px solid transparent',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f0eeff'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#5b5bd6' : 'transparent'; }}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>

                      {/* Clear */}
                      {startDate && (
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                          <button onClick={() => { setStartDate(''); setCalendarOpen(false); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9090b8' }}>
                            清除日期（导入所有记录）
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Account type — custom dropdown */}
            <div>
              <label style={labelStyle}>账户类型 <span style={{ color: '#e05555' }}>*</span></label>
              <div ref={accountDropdownRef} style={{ position: 'relative' }}>
                {/* Trigger */}
                <div
                  onClick={() => setAccountDropdownOpen(o => !o)}
                  style={{
                    ...inputStyle('accountType'),
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                    borderRadius: accountDropdownOpen ? '10px 10px 0 0' : 10,
                    border: accountDropdownOpen ? '1px solid #e0e0ea' : '1px solid #d8d4ee',
                    boxShadow: accountDropdownOpen ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, color: '#1a1a3a' }}>
                    {ACCOUNT_OPTIONS.find(o => o.value === accountType)?.label}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#8888b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: accountDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Dropdown panel */}
                {accountDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#ffffff',
                    border: '1px solid #e0e0ea', borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  }}>
                    {ACCOUNT_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setAccountType(opt.value); setAccountDropdownOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 14px', cursor: 'pointer', fontSize: 14,
                          color: accountType === opt.value ? '#5b5bd6' : '#1a1a3a',
                          background: accountType === opt.value ? '#f5f5ff' : 'transparent',
                          transition: 'background 0.1s',
                          fontWeight: accountType === opt.value ? 500 : 400,
                        }}
                        onMouseEnter={e => { if (accountType !== opt.value) e.currentTarget.style.background = '#f8f8ff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = accountType === opt.value ? '#f5f5ff' : 'transparent'; }}
                      >
                        {opt.label}
                        {accountType === opt.value && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="#5b5bd6" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label style={labelStyle}>API 密钥 <span style={{ color: '#e05555' }}>*</span></label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onFocus={() => setFocusedField('apiKey')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle('apiKey')}
              />
            </div>

            {/* API Secret */}
            <div>
              <label style={labelStyle}>API Secret <span style={{ color: '#e05555' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={apiSecretVisible ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value)}
                  onFocus={() => setFocusedField('apiSecret')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('apiSecret'), paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setApiSecretVisible(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#8888b0', display: 'flex', alignItems: 'center',
                  }}
                >
                  {apiSecretVisible ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Skip spot checkbox */}
            <div
              onClick={() => setSkipSpot(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: skipSpot ? 'none' : '1.5px solid #c8c4e8',
                background: skipSpot ? '#5b5bd6' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {skipSpot && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: '#6b6b9a' }}>跳过现货交易</span>
            </div>

            {/* Warning banner */}
            <div style={{
              background: '#fff8ec',
              border: '1px solid #f5d080',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="10" cy="10" r="10" fill="#e8a020"/>
                <text x="10" y="15" textAnchor="middle" fill="white"
                  fontSize="13" fontWeight="700" fontFamily="sans-serif">!</text>
              </svg>
              <span style={{ fontSize: 13, color: '#9a6010', lineHeight: 1.6 }}>
                此次导入存在一些限制。请点击此消息查看详情，您将找到可能影响导入的关键信息。
              </span>
            </div>

            {/* Connect button */}
            <button
              disabled={!canConnect || isConnecting}
              onClick={async () => {
                if (!canConnect || isConnecting) return;
                setIsConnecting(true);
                try {
                  await onConnect?.({ accountType, apiKey, apiSecret, skipSpot, startDate });
                } finally {
                  setIsConnecting(false);
                }
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              style={{
                width: '100%', height: 48, borderRadius: 10,
                fontSize: 15, fontWeight: 600, border: 'none', marginTop: 4,
                transition: 'all 0.18s ease',
                background: (!canConnect || isConnecting) ? (isConnecting ? '#5b5bd6' : '#e0ddf0') : (btnHovered ? '#4a4ac8' : '#5b5bd6'),
                color: (!canConnect && !isConnecting) ? '#a8a8c8' : '#ffffff',
                cursor: (!canConnect || isConnecting) ? 'not-allowed' : 'pointer',
                boxShadow: canConnect && !isConnecting
                  ? (btnHovered ? '0 6px 20px rgba(91,91,214,0.40)' : '0 4px 16px rgba(91,91,214,0.30)')
                  : 'none',
                transform: canConnect && !isConnecting && btnHovered ? 'translateY(-1px)' : 'translateY(0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {isConnecting ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                    style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  正在连接...
                </>
              ) : '连接'}
            </button>
          </div>

          {/* RIGHT: Info panel */}
          <div style={{ width: 400, minWidth: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Exchange header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: exchangeBrandColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {exchangeLogoUrl
                  ? <img src={exchangeLogoUrl} alt={exchangeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{exchangeName[0]}</span>
                }
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a3a' }}>{exchangeName}</span>
                  {isNew && (
                    <span style={{
                      background: '#5b5bd6', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                    }}>新的</span>
                  )}
                </div>
              </div>
            </div>

            {/* Supported assets */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a3a', marginBottom: 8 }}>
                支持的资产类型：
              </div>
              <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '4px 10px', alignItems: 'center', width: '100%', overflow: 'visible' }}>
                {ASSET_ORDER.map(asset => {
                  const supported = assets[asset] ?? false;
                  return (
                    <div key={asset} style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {supported
                        ? <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#5b5bd6"/><polyline points="4,8 7,11 12,5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="#c8c8d8" strokeWidth="1.5"/><line x1="5" y1="5" x2="11" y2="11" stroke="#c0c0d0" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="5" x2="5" y2="11" stroke="#c0c0d0" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      }
                      <span style={{
                        fontSize: 12, whiteSpace: 'nowrap', lineHeight: 1,
                        fontWeight: supported ? 500 : 400,
                        color: supported ? '#1a1a3a' : '#b8b8d0',
                      }}>
                        {asset}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a3a', marginBottom: 6 }}>
                链接 {exchangeName}
              </div>
              <p style={{ fontSize: 14, color: '#6b6b9a', lineHeight: 1.75, margin: '0 0 12px 0' }}>
                要同步您在 {exchangeName} 上的交易，您需要从您的 {exchangeName} 账户创建 API 密钥和 API Secret。
                <br /><br />
                请按照以下步骤创建您的 API 密钥：
              </p>

              {/* Always-visible steps: 3 */}
              <StepItem text={`登录 ${exchangeName} 网页版`}>
                <SubItem text="请使用网页版登录，无法通过移动应用创建 API 密钥。" />
              </StepItem>
              <StepItem text="导航至 API 管理">
                <SubItem text="点击右上角的个人资料图标。" />
                <SubItem text="从下拉菜单中选择「API 管理」。" />
              </StepItem>
              <StepItem text="创建新的 API 密钥">
                <SubItem text="点击 API 管理页面右侧的「创建新密钥」。" />
                <SubItem text="在弹出窗口中选择「系统生成的 API 密钥」。" />
                <SubItem text="将名称设置为「TradeGrail」。" />
              </StepItem>

              {/* Expandable steps */}
              <div style={{
                overflow: 'hidden',
                maxHeight: expanded ? 600 : 0,
                opacity: expanded ? 1 : 0,
                transition: 'max-height 0.3s ease, opacity 0.3s ease',
              }}>
                <StepItem text="在「API 密钥权限」下选择：">
                  <SubItem text="勾选「只读」访问权限。" />
                  <SubItem text="选择「无 IP 限制」。" />
                  <SubItem text="请确保已勾选所有交易选项。" />
                </StepItem>
                <StepItem text="复制 API 密钥和 API Secret">
                  <SubItem text="将生成的 API 密钥和 Secret 分别粘贴到左侧对应字段中。" />
                  <SubItem text="Secret 仅在创建时显示一次，请妥善保存。" />
                </StepItem>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  color: '#5b5bd6', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', background: 'none', border: 'none',
                  padding: 0, marginTop: 2,
                }}
              >
                {expanded ? '收起指令 ▴' : '展开整个指令 ▾'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerSyncPage;
