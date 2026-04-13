import React, { useState } from 'react';

const EXCHANGES = [
    { id: 'binance',  name: 'Binance',  nameCN: '币安',       tag: '热门', available: true  },
    { id: 'okx',      name: 'OKX',      nameCN: 'OKX',        tag: '热门', available: true  },
    { id: 'bitget',   name: 'Bitget',   nameCN: 'Bitget',     tag: null,   available: true  },
    { id: 'bybit',    name: 'Bybit',    nameCN: 'Bybit',      tag: null,   available: false },
    { id: 'htx',      name: 'HTX',      nameCN: 'HTX（火币）', tag: null,   available: false },
    { id: 'gate',     name: 'Gate.io',  nameCN: 'Gate.io',    tag: null,   available: false },
    { id: 'mexc',     name: 'MEXC',     nameCN: 'MEXC',       tag: null,   available: false },
    { id: 'kucoin',   name: 'KuCoin',   nameCN: 'KuCoin',     tag: null,   available: false },
];

interface ConnectExchangePageProps {
    onClose: () => void;
}

const ConnectExchangePage: React.FC<ConnectExchangePageProps> = ({ onClose }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string | null>(null);

    const filtered = EXCHANGES.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.nameCN.includes(search)
    );

    const handleContinue = () => {
        if (!selected) return;
        // TODO: navigate to API key input step
        alert(`即将跳转到 ${selected} 的 API Key 填写页面`);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #f0f0ff 0%, #f8f0ff 50%, #f0f4ff 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflowY: 'auto',
        }}>
            {/* Progress bar */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, background: '#e8e8f0', zIndex: 100 }}>
                <div style={{
                    width: '33.33%', height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: '0 2px 2px 0',
                }}/>
            </div>

            {/* Step indicators */}
            <div style={{
                position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 6, zIndex: 100,
            }}>
                {[1, 2, 3].map(step => (
                    <div key={step} style={{
                        width: 72, height: 4, borderRadius: 2,
                        background: step === 1 ? '#6366f1' : '#e8e8f0',
                    }}/>
                ))}
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'fixed', top: 16, right: 24,
                    width: 36, height: 36, borderRadius: '50%',
                    border: '1px solid #e8e8f0', background: '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#9396aa', fontSize: 16, zIndex: 100,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
            >
                ✕
            </button>

            {/* Main content */}
            <div style={{
                width: '100%', maxWidth: 660,
                padding: '72px 24px 120px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        fontSize: 12, fontWeight: 600, color: '#6366f1',
                        marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                        添加交易
                    </div>
                    <h1 style={{
                        fontSize: 28, fontWeight: 700, color: '#1a1d2e',
                        letterSpacing: '-0.5px', lineHeight: 1.3, margin: 0,
                    }}>
                        选择你的交易所
                    </h1>
                    <p style={{ fontSize: 14, color: '#9396aa', marginTop: 8, marginBottom: 0 }}>
                        通过 API Key 安全连接，只读权限，无法操作你的资金
                    </p>
                </div>

                {/* Search */}
                <div style={{ width: '100%', position: 'relative', marginBottom: 24 }}>
                    <div style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        color: '#b0b3c6', lineHeight: 0,
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="搜索交易所名称..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', height: 48, borderRadius: 10,
                            border: '1.5px solid #e8e8f0', paddingLeft: 42, paddingRight: 16,
                            fontSize: 14, color: '#1a1d2e', background: '#fff',
                            outline: 'none', boxSizing: 'border-box',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#e8e8f0'; }}
                    />
                </div>

                {!search && (
                    <div style={{
                        width: '100%', fontSize: 12, fontWeight: 600,
                        color: '#9396aa', marginBottom: 12, letterSpacing: '0.04em',
                    }}>
                        热门交易所
                    </div>
                )}

                {/* Exchange grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                    {filtered.map(exchange => (
                        <button
                            key={exchange.id}
                            onClick={() => exchange.available && setSelected(exchange.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px', borderRadius: 10,
                                border: selected === exchange.id ? '2px solid #6366f1' : '1.5px solid #e8e8f0',
                                background: selected === exchange.id ? '#f5f5ff' : exchange.available ? '#fff' : '#fafafa',
                                cursor: exchange.available ? 'pointer' : 'not-allowed',
                                textAlign: 'left', transition: 'all 0.15s',
                                opacity: exchange.available ? 1 : 0.5,
                                boxShadow: selected === exchange.id
                                    ? '0 0 0 3px rgba(99,102,241,0.1)'
                                    : '0 1px 4px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => {
                                if (exchange.available && selected !== exchange.id) {
                                    e.currentTarget.style.borderColor = '#c8cafd';
                                    e.currentTarget.style.background = '#fafafe';
                                }
                            }}
                            onMouseLeave={e => {
                                if (exchange.available && selected !== exchange.id) {
                                    e.currentTarget.style.borderColor = '#e8e8f0';
                                    e.currentTarget.style.background = '#fff';
                                }
                            }}
                        >
                            {/* Logo placeholder */}
                            <div style={{
                                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                                background: '#f0f0f8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, fontWeight: 700, color: '#6366f1',
                            }}>
                                {exchange.name[0]}
                            </div>

                            {/* Name */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1d2e' }}>
                                        {exchange.name}
                                    </span>
                                    {exchange.tag && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 600, color: '#6366f1',
                                            background: '#eef0ff', padding: '1px 6px', borderRadius: 3,
                                        }}>
                                            {exchange.tag}
                                        </span>
                                    )}
                                    {!exchange.available && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 600, color: '#b0b3c6',
                                            background: '#f0f0f6', padding: '1px 6px', borderRadius: 3,
                                        }}>
                                            即将支持
                                        </span>
                                    )}
                                </div>
                                {exchange.nameCN !== exchange.name && (
                                    <div style={{ fontSize: 12, color: '#9396aa', marginTop: 2 }}>
                                        {exchange.nameCN}
                                    </div>
                                )}
                            </div>

                            {/* Check */}
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
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#b0b3c6', fontSize: 14 }}>
                        未找到匹配的交易所
                    </div>
                )}
            </div>

            {/* Bottom CTA */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid #f0f0f6',
                display: 'flex', justifyContent: 'center', zIndex: 100,
            }}>
                <button
                    onClick={handleContinue}
                    disabled={!selected}
                    style={{
                        width: '100%', maxWidth: 660, height: 48, borderRadius: 10, border: 'none',
                        background: selected
                            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)'
                            : '#e8e8f0',
                        color: selected ? '#fff' : '#b0b3c6',
                        fontSize: 15, fontWeight: 700,
                        cursor: selected ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s', letterSpacing: '0.02em',
                        boxShadow: selected ? '0 4px 16px rgba(30,27,75,0.35)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
