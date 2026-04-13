import React, { useState } from 'react';

interface WelcomeStep2Props {
    userName: string;
    onClose: () => void;
    onNavigate: (tab: string, action?: string) => void;
}

const WelcomeStep2: React.FC<WelcomeStep2Props> = ({ userName, onClose, onNavigate }) => {
    const [showQR, setShowQR] = useState(false);

    const OPTIONS = [
        {
            id: 'add-trade',
            color: '#6366f1',
            badge: null as { text: string; color: string } | null,
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
            ),
            title: '记录你的第一笔交易',
            desc: '手动添加一笔交易记录，开始建立你的复盘数据库，随时可以补录历史数据',
            onClick: () => { onClose(); onNavigate('journal', 'add-trade'); },
        },
        {
            id: 'mindset',
            color: '#8b5cf6',
            badge: null as { text: string; color: string } | null,
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
            ),
            title: '设置心态风控规则',
            desc: '制定你的交易纪律，建立每日检查清单，让每一次复盘都更有方向',
            onClick: () => { onClose(); onNavigate('psychology'); },
        },
        {
            id: 'community',
            color: '#07c160',
            badge: { text: '微信群', color: '#07c160' },
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
            ),
            title: '加入交易者社群',
            desc: '扫码加入微信群，与其他交易者交流、分享复盘经验',
            onClick: () => setShowQR(true),
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
                {/* Card */}
                <div style={{
                    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                    animation: 'ws2-fadeIn 0.4s cubic-bezier(0.34,1.4,0.64,1)',
                    overflow: 'hidden',
                }}>
                    {/* Top banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                        padding: '26px 32px 22px', textAlign: 'center', position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.28) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }}/>
                        <h2 style={{
                            fontSize: 20, fontWeight: 700, color: '#fff',
                            letterSpacing: '-0.3px', marginBottom: 5, position: 'relative', zIndex: 1,
                        }}>
                            你好，{userName || '交易者'} 👋
                        </h2>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', position: 'relative', zIndex: 1 }}>
                            你想从哪里开始？
                        </p>
                    </div>

                    {/* Options */}
                    <div style={{ padding: '16px 20px 8px' }}>
                        {OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={opt.onClick}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '13px 14px', marginBottom: 8, borderRadius: 12,
                                    border: '1.5px solid #f0f0f6', background: '#fff',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = opt.color;
                                    e.currentTarget.style.background = '#fafafe';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#f0f0f6';
                                    e.currentTarget.style.background = '#fff';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: 11,
                                    background: `${opt.color}18`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, color: opt.color,
                                }}>
                                    {opt.icon}
                                </div>

                                {/* Text */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d2e' }}>
                                            {opt.title}
                                        </span>
                                        {opt.badge && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, color: opt.badge.color,
                                                background: `${opt.badge.color}18`,
                                                border: `1px solid ${opt.badge.color}40`,
                                                padding: '1px 6px', borderRadius: 4,
                                                letterSpacing: '0.04em', flexShrink: 0,
                                            }}>
                                                {opt.badge.text}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#9396aa', lineHeight: 1.55 }}>
                                        {opt.desc}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="#c8cad8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ flexShrink: 0 }}>
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>
                        ))}
                    </div>

                    {/* Bottom buttons */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 20px 22px',
                        borderTop: '1px solid #f5f5fa', marginTop: 4,
                    }}>
                        {/* Explore on own */}
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1, height: 38, borderRadius: 9,
                                border: '1px solid #e8e8f0', background: 'transparent',
                                fontSize: 13, fontWeight: 500, color: '#9396aa',
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8cad8'; e.currentTarget.style.color = '#4a4d6a'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8f0'; e.currentTarget.style.color = '#9396aa'; }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            自己探索
                        </button>

                        {/* Go to dashboard */}
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1, height: 38, borderRadius: 9, border: 'none',
                                background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                                fontSize: 13, fontWeight: 600, color: '#fff',
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: '0 3px 12px rgba(14,20,40,0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(14,20,40,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(14,20,40,0.3)'; }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                            进入仪表盘
                        </button>
                    </div>
                </div>
            </div>

            {/* WeChat QR modal */}
            {showQR && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, padding: '28px 32px',
                        textAlign: 'center', maxWidth: 280, width: '100%',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1d2e', marginBottom: 6 }}>
                            加入交易者微信群
                        </div>
                        <div style={{ fontSize: 12, color: '#9396aa', marginBottom: 16, lineHeight: 1.6 }}>
                            扫描下方二维码加入群聊<br/>与其他交易者交流复盘经验
                        </div>
                        <img
                            src="/wechat-qr.png"
                            alt="微信群二维码"
                            style={{
                                width: 160, height: 160, borderRadius: 8,
                                border: '1px solid #f0f0f6',
                                display: 'block', margin: '0 auto 16px',
                            }}
                        />
                        <button
                            onClick={() => setShowQR(false)}
                            style={{
                                width: '100%', height: 38, borderRadius: 8,
                                border: '1px solid #e8e8f0', background: 'transparent',
                                fontSize: 13, fontWeight: 500, color: '#4a4d6a', cursor: 'pointer',
                            }}
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes ws2-fadeIn {
                    from { opacity: 0; transform: scale(0.88) translateY(24px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
};

export default WelcomeStep2;
