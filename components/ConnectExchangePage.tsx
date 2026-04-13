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

// Fallback letter avatar when logo fails to load
const ExchangeLogo: React.FC<{ exchange: Exchange; size: number }> = ({ exchange, size }) => {
    const [failed, setFailed] = useState(false);
    if (failed) {
        return (
            <span style={{ fontSize: size * 0.55, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                {exchange.name[0]}
            </span>
        );
    }
    return (
        <img
            src={exchange.logo}
            alt={exchange.name}
            style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
            onError={() => setFailed(true)}
        />
    );
};

interface DropdownItemProps {
    exchange: Exchange;
    selected: boolean;
    onSelect: () => void;
    disabled?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ exchange, selected, onSelect, disabled }) => (
    <div
        onClick={onSelect}
        style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            cursor: disabled ? 'default' : 'pointer',
            background: selected ? 'rgba(99,102,241,0.15)' : 'transparent',
            transition: 'background 0.1s',
            opacity: disabled ? 0.4 : 1,
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = selected ? 'rgba(99,102,241,0.15)' : 'transparent'; }}
    >
        <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExchangeLogo exchange={exchange} size={24} />
        </div>
        <span style={{ fontSize: 14, color: selected ? '#a5b4fc' : 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            {exchange.name}
        </span>
        {selected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 'auto' }}>
                <path d="M20 6L9 17l-5-5"/>
            </svg>
        )}
    </div>
);

interface ConnectExchangePageProps {
    onClose: () => void;
}

const ConnectExchangePage: React.FC<ConnectExchangePageProps> = ({ onClose }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filtered = EXCHANGES.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.nameCN.includes(search)
    );

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                searchRef.current && !searchRef.current.contains(e.target as Node) &&
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
        setSearch(exchange.name);
        setDropdownOpen(false);
    };

    const handleContinue = () => {
        if (!selected) return;
        // TODO: show API key input step
        alert(`即将跳转到 ${selected} 的 API Key 填写页面`);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(145deg, #0a0e1f 0%, #0f0a2e 40%, #1a0a3e 70%, #0e1428 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflowY: 'auto', padding: '0 20px',
        }}>
            {/* Background glow */}
            <div style={{
                position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 400,
                background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0,
            }}/>

            {/* Progress bar */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                display: 'flex', gap: 6, padding: '16px 32px', zIndex: 100,
            }}>
                {[1, 2, 3].map(step => (
                    <div key={step} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: step === 1
                            ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                            : 'rgba(255,255,255,0.15)',
                    }}/>
                ))}
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'fixed', top: 16, right: 24,
                    width: 36, height: 36, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.6)', fontSize: 16, zIndex: 100,
                    backdropFilter: 'blur(8px)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >✕</button>

            {/* Main content */}
            <div style={{ width: '100%', maxWidth: 560, paddingTop: 80, paddingBottom: 40, position: 'relative', zIndex: 1 }}>
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8b8ff8', marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        添加交易
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.25, margin: '0 0 12px' }}>
                        选择你的交易所
                    </h1>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
                        通过 API Key 安全连接，只读权限<br/>无法操作你的资金
                    </p>
                </div>

                {/* Search + dropdown */}
                <div style={{ position: 'relative', marginBottom: 32 }}>
                    <div ref={searchRef} style={{
                        position: 'relative',
                        borderRadius: dropdownOpen ? '10px 10px 0 0' : 10,
                        border: `1.5px solid ${dropdownOpen ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)'}`,
                        background: 'rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(12px)',
                        transition: 'all 0.15s',
                        boxShadow: dropdownOpen
                            ? '0 0 0 3px rgba(99,102,241,0.15), 0 8px 32px rgba(0,0,0,0.4)'
                            : '0 4px 20px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="搜索交易所..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
                            onFocus={() => setDropdownOpen(true)}
                            style={{
                                width: '100%', height: 52, background: 'transparent',
                                border: 'none', outline: 'none',
                                paddingLeft: 44, paddingRight: 40,
                                fontSize: 14, color: '#fff', boxSizing: 'border-box',
                            }}
                        />
                        <div style={{
                            position: 'absolute', right: 14, top: '50%',
                            transform: `translateY(-50%) rotate(${dropdownOpen ? 180 : 0}deg)`,
                            transition: 'transform 0.2s',
                            color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </div>
                    </div>

                    {dropdownOpen && (
                        <div ref={dropdownRef} style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: 'rgba(18,14,46,0.98)', backdropFilter: 'blur(20px)',
                            border: '1.5px solid rgba(99,102,241,0.3)', borderTop: 'none',
                            borderRadius: '0 0 10px 10px',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                            zIndex: 50, maxHeight: 320, overflowY: 'auto',
                        }}>
                            <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                已支持
                            </div>
                            {filtered.filter(e => e.available).map(e => (
                                <DropdownItem key={e.id} exchange={e} selected={selected === e.id} onSelect={() => handleSelect(e)} />
                            ))}
                            <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                                即将支持
                            </div>
                            {filtered.filter(e => !e.available).map(e => (
                                <DropdownItem key={e.id} exchange={e} selected={false} onSelect={() => {}} disabled />
                            ))}
                        </div>
                    )}
                </div>

                {/* Section label */}
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                    热门交易所
                </div>

                {/* Exchange list */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {EXCHANGES.map((exchange, index) => (
                        <div key={exchange.id}>
                            <button
                                onClick={() => exchange.available && handleSelect(exchange)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '13px 4px', background: 'transparent', border: 'none',
                                    cursor: exchange.available ? 'pointer' : 'default',
                                    textAlign: 'left', transition: 'opacity 0.15s',
                                    opacity: exchange.available ? 1 : 0.35,
                                }}
                            >
                                <div style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ExchangeLogo exchange={exchange} size={28} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{
                                        fontSize: 15, fontWeight: 500,
                                        color: selected === exchange.id ? '#a5b4fc' : '#fff',
                                        transition: 'color 0.15s',
                                    }}>
                                        {exchange.name}
                                    </span>
                                    {!exchange.available && (
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                                            即将支持
                                        </span>
                                    )}
                                </div>
                                {selected === exchange.id && (
                                    <div style={{
                                        width: 20, height: 20, borderRadius: '50%',
                                        background: '#6366f1', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                                            <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                    </div>
                                )}
                            </button>
                            {index < EXCHANGES.length - 1 && (
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }}/>
                            )}
                        </div>
                    ))}
                </div>

                {/* Continue button */}
                <button
                    onClick={handleContinue}
                    disabled={!selected}
                    style={{
                        width: '100%', height: 50, marginTop: 28, borderRadius: 10, border: 'none',
                        background: selected ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'rgba(255,255,255,0.08)',
                        color: selected ? '#fff' : 'rgba(255,255,255,0.25)',
                        fontSize: 15, fontWeight: 700,
                        cursor: selected ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s', letterSpacing: '0.02em',
                        boxShadow: selected ? '0 6px 24px rgba(79,70,229,0.5)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => {
                        if (selected) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 8px 28px rgba(79,70,229,0.6)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (selected) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 6px 24px rgba(79,70,229,0.5)';
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

                {/* Security note */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)',
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    只读权限，安全连接，TradeGrail 无法操作你的资金
                </div>
            </div>
        </div>
    );
};

export default ConnectExchangePage;
