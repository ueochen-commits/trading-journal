import React, { useState, useRef, useEffect } from 'react';

const EXCHANGES = [
    { id: 'binance', name: 'Binance', nameCN: '币安',       available: true,  logo: '/exchanges/binance.png'  },
    { id: 'okx',     name: 'OKX',     nameCN: 'OKX',        available: true,  logo: '/exchanges/okx.png'      },
    { id: 'bitget',  name: 'Bitget',  nameCN: 'Bitget',     available: true,  logo: '/exchanges/bitget.png'   },
    { id: 'bybit',   name: 'Bybit',   nameCN: 'Bybit',      available: false, logo: '/exchanges/bybit.png'    },
    { id: 'htx',     name: 'HTX',     nameCN: 'HTX（火币）', available: false, logo: '/exchanges/htx.png'      },
    { id: 'gate',    name: 'Gate.io', nameCN: 'Gate.io',    available: false, logo: '/exchanges/gate.png'     },
    { id: 'mexc',    name: 'MEXC',    nameCN: 'MEXC',       available: false, logo: '/exchanges/mexc.png'     },
    { id: 'kucoin',  name: 'KuCoin',  nameCN: 'KuCoin',     available: false, logo: '/exchanges/kucoin.png'   },
];

interface Exchange {
    id: string;
    name: string;
    nameCN: string;
    available: boolean;
    logo: string;
}

const ExchangeLogo: React.FC<{ exchange: Exchange; size: number }> = ({ exchange, size }) => {
    const [failed, setFailed] = useState(false);
    if (failed) {
        return (
            <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                {exchange.name[0]}
            </span>
        );
    }
    return (
        <img src={exchange.logo} alt={exchange.name}
            style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
            onError={() => setFailed(true)}
        />
    );
};

interface ConnectExchangePageProps {
    onClose: () => void;
}

const ConnectExchangePage: React.FC<ConnectExchangePageProps> = ({ onClose }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filtered = EXCHANGES.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.nameCN.includes(search)
    );

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                inputRef.current && !inputRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (exchange: Exchange) => {
        if (!exchange.available) return;
        setSelected(exchange.id);
        setSearch('');
        setDropdownOpen(false);
    };

    const handleContinue = () => {
        if (!selected) return;
        alert(`即将跳转到 ${selected} 的 API Key 填写页面`);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'radial-gradient(ellipse 65% 55% at 50% 38%, #ffffff 0%, #ffffff 20%, #ede9fe 55%, #ddd6fe 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflowY: 'auto', padding: '0 24px',
        }}>
            {/* Progress bar */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', zIndex: 100 }}>
                {[1, 2].map(step => (
                    <div key={step} style={{
                        flex: 1, height: 4,
                        background: step === 1 ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '#e0e0ea',
                    }}/>
                ))}
            </div>

            {/* Close button — no circle, pure icon */}
            <button
                onClick={onClose}
                style={{
                    position: 'fixed', top: 20, right: 24,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', color: '#9396aa', padding: 4,
                    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#1a1d2e'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9396aa'; }}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>

            {/* Main content */}
            <div style={{ width: '100%', maxWidth: 680, paddingTop: 72, paddingBottom: 60 }}>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', marginBottom: 10, letterSpacing: '0.04em' }}>
                        添加交易
                    </div>
                    <h1 style={{ fontSize: 34, fontWeight: 700, color: '#1a1d2e', letterSpacing: '-0.6px', lineHeight: 1.25, margin: '0 auto', maxWidth: 480 }}>
                        选择经纪商、自营交易公司<br/>或交易平台
                    </h1>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 32 }}>
                    <div ref={inputRef} style={{
                        position: 'relative',
                        border: dropdownOpen ? '1px solid #e0e0ea' : '1px solid #e8e8f0',
                        background: '#ffffff',
                        borderRadius: dropdownOpen ? '10px 10px 0 0' : 10,
                        boxShadow: dropdownOpen
                            ? '0 2px 8px rgba(0,0,0,0.08)'
                            : '0 1px 4px rgba(0,0,0,0.06)',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}>
                        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#b0b3c6', pointerEvents: 'none' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="开始输入经纪商、自营交易公司或交易平台的名称"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
                            onFocus={() => setDropdownOpen(true)}
                            style={{
                                width: '100%', height: 50, background: 'transparent',
                                border: 'none', outline: 'none',
                                paddingLeft: 42, paddingRight: 16,
                                fontSize: 14, color: '#1a1d2e', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {dropdownOpen && (
                        <div ref={dropdownRef} style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: '#ffffff',
                            border: '1px solid #e0e0ea', borderTop: 'none',
                            borderRadius: '0 0 10px 10px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                            zIndex: 50, overflow: 'hidden', maxHeight: 360, overflowY: 'auto',
                        }}>
                            <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: '#b0b3c6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                已支持
                            </div>
                            {filtered.filter(e => e.available).map(e => (
                                <div key={e.id} onClick={() => handleSelect(e)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 16px', cursor: 'pointer',
                                        background: selected === e.id ? '#f5f5ff' : 'transparent',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={ev => { if (selected !== e.id) ev.currentTarget.style.background = '#f8f8ff'; }}
                                    onMouseLeave={ev => { ev.currentTarget.style.background = selected === e.id ? '#f5f5ff' : 'transparent'; }}
                                >
                                    <ExchangeLogo exchange={e} size={24} />
                                    <span style={{ fontSize: 14, color: '#1a1d2e', fontWeight: 500 }}>{e.name}</span>
                                    {selected === e.id && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 'auto' }}>
                                            <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                    )}
                                </div>
                            ))}
                            <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: '#b0b3c6', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid #f0f0f6', marginTop: 4 }}>
                                即将支持
                            </div>
                            {filtered.filter(e => !e.available).map(e => (
                                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', opacity: 0.4, cursor: 'default' }}>
                                    <ExchangeLogo exchange={e} size={24} />
                                    <span style={{ fontSize: 14, color: '#9396aa' }}>{e.name}</span>
                                </div>
                            ))}

                            {/* Divider */}
                            <div style={{ height: 1, background: '#f0f0f6', margin: '4px 0' }}/>

                            {/* Fallback row */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: '#fafafa', transition: 'background 0.1s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5ff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                      width: 28,
                                      height: 28,
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}>
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                        stroke="#b0b3c6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                                      </svg>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#4a4d6a' }}>找不到你的交易所？</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button
                                        onClick={e => { e.stopPropagation(); setDropdownOpen(false); }}
                                        style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 5, transition: 'background 0.1s', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#eef0ff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        使用通用模板
                                    </button>
                                    <span style={{ color: '#d0d3e0', fontSize: 12 }}>或</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); setDropdownOpen(false); }}
                                        style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 5, transition: 'background 0.1s', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#eef0ff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        手动添加交易
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section label */}
                <div style={{ fontSize: 14, fontWeight: 600, color: '#4a4d6a', marginBottom: 20 }}>
                    热门经纪商
                </div>

                {/* Exchange grid — 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 0, columnGap: 40 }}>
                    {EXCHANGES.map(exchange => (
                        <button
                            key={exchange.id}
                            onClick={() => exchange.available && handleSelect(exchange)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                padding: '16px 0', background: 'transparent', border: 'none',
                                borderBottom: '1px solid rgba(0,0,0,0.06)',
                                cursor: exchange.available ? 'pointer' : 'default',
                                textAlign: 'left', width: '100%',
                                opacity: exchange.available ? 1 : 0.4,
                                transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => { if (exchange.available) e.currentTarget.style.opacity = '0.7'; }}
                            onMouseLeave={e => { if (exchange.available) e.currentTarget.style.opacity = '1'; }}
                        >
                            <ExchangeLogo exchange={exchange} size={40} />
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 15, fontWeight: 500,
                                    color: selected === exchange.id ? '#6366f1' : '#1a1d2e',
                                    transition: 'color 0.15s',
                                }}>
                                    {exchange.name}
                                </div>
                                {!exchange.available && (
                                    <div style={{ fontSize: 12, color: '#b0b3c6', marginTop: 2 }}>即将支持</div>
                                )}
                            </div>
                            {selected === exchange.id && (
                                <div style={{
                                    marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%',
                                    background: '#6366f1', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                                        <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Continue button */}
                <button
                    onClick={handleContinue}
                    disabled={!selected}
                    style={{
                        width: '100%', height: 50, marginTop: 32, borderRadius: 10, border: 'none',
                        background: selected ? '#3730a3' : '#e8e8f0',
                        color: selected ? '#fff' : '#b0b3c6',
                        fontSize: 15, fontWeight: 700,
                        cursor: selected ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s', letterSpacing: '0.02em',
                        boxShadow: selected ? '0 4px 16px rgba(55,48,163,0.3)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => {
                        if (selected) {
                            e.currentTarget.style.background = '#312e81';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(55,48,163,0.4)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (selected) {
                            e.currentTarget.style.background = '#3730a3';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(55,48,163,0.3)';
                        }
                    }}
                >
                    继续
                    {selected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ConnectExchangePage;
