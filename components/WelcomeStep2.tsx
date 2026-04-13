import React, { useState } from 'react';

interface BadgeProps {
    text: string;
    color: string;
}

interface OptionCardProps {
    color: string;
    badge?: BadgeProps | null;
    icon: React.ReactNode;
    title: string;
    desc: string;
    onClick: () => void;
}

interface SmallOptionCardProps extends OptionCardProps {}

const OptionCard: React.FC<OptionCardProps> = ({ color, badge, icon, title, desc, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 10, padding: '16px 14px', borderRadius: 12,
            border: '1.5px solid #f0f0f6', background: '#fff',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            minHeight: 120, width: '100%',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.background = '#fafafe';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#f0f0f6';
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{ color, lineHeight: 0 }}>{icon}</div>
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d2e' }}>{title}</span>
                {badge && (
                    <span style={{
                        fontSize: 9, fontWeight: 700, color: badge.color,
                        background: `${badge.color}18`, border: `1px solid ${badge.color}40`,
                        padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0,
                    }}>
                        {badge.text}
                    </span>
                )}
            </div>
            <div style={{ fontSize: 11.5, color: '#9396aa', lineHeight: 1.5 }}>{desc}</div>
        </div>
    </button>
);

const SmallOptionCard: React.FC<SmallOptionCardProps> = ({ color, badge, icon, title, desc, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 8, padding: '14px 12px', borderRadius: 12,
            border: '1.5px solid #f0f0f6', background: '#fafafa',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#f0f0f6';
            e.currentTarget.style.background = '#fafafa';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{ color, lineHeight: 0 }}>{icon}</div>
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1d2e' }}>{title}</span>
                {badge && (
                    <span style={{
                        fontSize: 9, fontWeight: 700, color: badge.color,
                        background: `${badge.color}18`, border: `1px solid ${badge.color}40`,
                        padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0,
                    }}>
                        {badge.text}
                    </span>
                )}
            </div>
            <div style={{ fontSize: 11, color: '#9396aa', lineHeight: 1.5 }}>{desc}</div>
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
                {/* Card */}
                <div style={{
                    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
                    animation: 'ws2-fadeIn 0.45s cubic-bezier(0.34,1.4,0.64,1)',
                    overflow: 'visible',
                }}>
                    {/* Top banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                        borderRadius: '20px 20px 0 0',
                        padding: '28px 32px 56px',
                        textAlign: 'center', position: 'relative', overflow: 'hidden',
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
                        {/* Floating logo */}
                        <div style={{
                            position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
                            width: 60, height: 60, borderRadius: '50%', background: '#fff',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2, border: '3px solid rgba(255,255,255,0.95)',
                        }}>
                            <img src="/lion-logo.png" alt="TradeGrail" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                        </div>
                    </div>

                    {/* Content area */}
                    <div style={{ padding: '44px 20px 8px' }}>
                        <h3 style={{
                            fontSize: 16, fontWeight: 700, color: '#1a1d2e',
                            textAlign: 'center', marginBottom: 20, letterSpacing: '-0.2px',
                        }}>
                            你想从哪里开始？
                        </h3>

                        {/* Top 2 large cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <OptionCard
                                color="#6366f1"
                                badge={null}
                                icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="12" y1="18" x2="12" y2="12"/>
                                        <line x1="9" y1="15" x2="15" y2="15"/>
                                    </svg>
                                }
                                title="记录第一笔交易"
                                desc="手动添加，开始建立复盘数据库"
                                onClick={() => { onClose(); onNavigate('journal', 'add-trade'); }}
                            />
                            <OptionCard
                                color="#00c896"
                                badge={{ text: 'Beta', color: '#f59e0b' }}
                                icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                                    </svg>
                                }
                                title="连接交易所"
                                desc="通过 API 自动同步交易记录"
                                onClick={() => { onClose(); onNavigate('settings'); }}
                            />
                        </div>

                        {/* Bottom 2 small cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            <SmallOptionCard
                                color="#8b5cf6"
                                badge={null}
                                icon={
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 11l3 3L22 4"/>
                                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                                    </svg>
                                }
                                title="设置心态风控规则"
                                desc="建立交易纪律和检查清单"
                                onClick={() => { onClose(); onNavigate('psychology'); }}
                            />
                            <SmallOptionCard
                                color="#07c160"
                                badge={{ text: '微信群', color: '#07c160' }}
                                icon={
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 010 7.75"/>
                                    </svg>
                                }
                                title="加入我们"
                                desc="与其他交易者交流复盘经验"
                                onClick={() => setShowQR(true)}
                            />
                        </div>
                    </div>

                    {/* Bottom buttons */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '4px 20px 22px',
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1, height: 42, borderRadius: 10,
                                border: '1.5px solid #e8e8f0', background: 'transparent',
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
                        <button
                            onClick={onClose}
                            style={{
                                flex: 2, height: 42, borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                fontSize: 13, fontWeight: 700, color: '#fff',
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                boxShadow: '0 4px 14px rgba(99,102,241,0.4)', letterSpacing: '0.01em',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)'; }}
                        >
                            进入仪表盘
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
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
