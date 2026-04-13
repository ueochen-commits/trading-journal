import React, { useState } from 'react';

interface BadgeProps {
    text: string;
    color: string;
}

interface LargeOptionProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
    badge?: BadgeProps | null;
    onClick: () => void;
}

interface SmallOptionProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
    badge?: BadgeProps | null;
    onClick: () => void;
}

const LargeOption: React.FC<LargeOptionProps> = ({ icon, title, desc, badge, onClick }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 12,
            border: '1.5px solid #ededf3', background: '#fafafa',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.background = '#f5f5ff';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.1)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#ededf3';
            e.currentTarget.style.background = '#fafafa';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{ flexShrink: 0, lineHeight: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1d2e' }}>{title}</span>
                {badge && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: badge.color,
                        background: `${badge.color}18`, border: `1px solid ${badge.color}40`,
                        padding: '1px 6px', borderRadius: 4, letterSpacing: '0.04em', flexShrink: 0,
                    }}>{badge.text}</span>
                )}
            </div>
            <div style={{ fontSize: 12, color: '#9396aa', lineHeight: 1.5 }}>{desc}</div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c8cad8" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6"/>
        </svg>
    </button>
);

const SmallOption: React.FC<SmallOptionProps> = ({ icon, title, desc, badge, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 8, padding: '14px', borderRadius: 12,
            border: '1.5px solid #ededf3', background: '#fafafa',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', minHeight: 100,
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.background = '#f5f5ff';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.1)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#ededf3';
            e.currentTarget.style.background = '#fafafa';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{ lineHeight: 0 }}>{icon}</div>
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{title}</span>
                {badge && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: badge.color,
                        background: `${badge.color}18`, border: `1px solid ${badge.color}40`,
                        padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0,
                    }}>{badge.text}</span>
                )}
            </div>
            <div style={{ fontSize: 11.5, color: '#9396aa', lineHeight: 1.5 }}>{desc}</div>
        </div>
    </button>
);

interface WelcomeStep2Props {
    userName: string;
    onClose: () => void;
    onNavigate: (tab: string, action?: string) => void;
}

const WelcomeStep2: React.FC<WelcomeStep2Props> = ({ userName, onClose, onNavigate }) => {
    const [showQR, setShowQR] = useState(false);

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
                {/* Outer wrapper — logo is positioned here, outside overflow:hidden card */}
                <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>

                    {/* Floating logo — absolute on outer wrapper, not clipped */}
                    <div style={{
                        position: 'absolute', top: 82, left: '50%', transform: 'translateX(-50%)',
                        width: 64, height: 64, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 20, border: '3px solid #fff',
                    }}>
                        <img src="/lion-logo.png" alt="TradeGrail" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                    </div>

                    {/* Card */}
                    <div style={{
                        background: '#fff', borderRadius: 20, width: '100%',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
                        animation: 'ws2-fadeIn 0.45s cubic-bezier(0.34,1.4,0.64,1)',
                        overflow: 'hidden',
                    }}>
                        {/* Top banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                            padding: '28px 32px 52px', textAlign: 'center',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }}/>
                            <h2 style={{
                                fontSize: 20, fontWeight: 700, color: '#fff',
                                letterSpacing: '-0.3px', marginBottom: 4, position: 'relative', zIndex: 1,
                            }}>
                                谢谢，{userName || '交易者'} 👋
                            </h2>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', position: 'relative', zIndex: 1 }}>
                                设置已保存，开始你的交易复盘之旅
                            </p>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '52px 20px 8px' }}>
                            <h3 style={{
                                fontSize: 16, fontWeight: 700, color: '#1a1d2e',
                                textAlign: 'center', marginBottom: 20, letterSpacing: '-0.2px',
                            }}>
                                你想从哪里开始？
                            </h3>

                            {/* Top 2 large options — full width stacked */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                                <LargeOption
                                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#b0b3c6"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z"/><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z"/></svg>}
                                    title="记录第一笔交易"
                                    desc="手动添加一笔交易记录，开始建立你的复盘数据库"
                                    badge={null}
                                    onClick={() => { onClose(); onNavigate('journal', 'add-trade'); }}
                                />
                                <LargeOption
                                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#b0b3c6"><path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z"/></svg>}
                                    title="连接交易所"
                                    desc="通过 API Key 自动同步 Binance、OKX、Bitget 交易记录，无需手动录入"
                                    badge={{ text: 'Beta', color: '#f59e0b' }}
                                    onClick={() => { onClose(); onNavigate('settings'); }}
                                />
                            </div>

                            {/* Bottom 2 small options — side by side */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                                <SmallOption
                                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#b0b3c6"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"/></svg>}
                                    title="设置心态风控"
                                    desc="制定交易纪律，建立检查清单"
                                    onClick={() => { onClose(); onNavigate('psychology'); }}
                                />
                                <SmallOption
                                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#b0b3c6"><path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z"/><path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z"/></svg>}
                                    title="加入我们"
                                    desc="扫码加入微信群交流"
                                    badge={{ text: '微信群', color: '#07c160' }}
                                    onClick={() => setShowQR(true)}
                                />
                            </div>
                        </div>

                        {/* Bottom buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 22px' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 1, height: 42, borderRadius: 10,
                                    border: '1.5px solid #e8e8f0', background: 'transparent',
                                    fontSize: 13, fontWeight: 500, color: '#9396aa',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8cad8'; e.currentTarget.style.color = '#4a4d6a'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8f0'; e.currentTarget.style.color = '#9396aa'; }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                自己探索
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 2, height: 42, borderRadius: 10, border: 'none',
                                    background: '#6366f1', fontSize: 13, fontWeight: 700, color: '#fff',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)', letterSpacing: '0.01em',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#5558e8'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.45)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'; }}
                            >
                                进入仪表盘
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* WeChat QR modal */}
            {showQR && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                    zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, padding: '28px 32px',
                        textAlign: 'center', maxWidth: 280, width: '100%',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1d2e', marginBottom: 6 }}>加入交易者微信群</div>
                        <div style={{ fontSize: 12, color: '#9396aa', marginBottom: 16, lineHeight: 1.6 }}>
                            扫描下方二维码加入群聊<br/>与其他交易者交流复盘经验
                        </div>
                        <img src="/wechat-qr.png" alt="微信群二维码" style={{ width: 160, height: 160, borderRadius: 8, border: '1px solid #f0f0f6', display: 'block', margin: '0 auto 16px' }} />
                        <button onClick={() => setShowQR(false)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #e8e8f0', background: 'transparent', fontSize: 13, fontWeight: 500, color: '#4a4d6a', cursor: 'pointer' }}>
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
