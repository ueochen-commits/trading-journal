import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CURRENCIES = [
    { value: 'USD', label: 'USD - 美元 (United States Dollar)' },
    { value: 'CNY', label: 'CNY - 人民币 (Chinese Yuan)' },
    { value: 'EUR', label: 'EUR - 欧元 (Euro)' },
    { value: 'GBP', label: 'GBP - 英镑 (British Pound)' },
    { value: 'JPY', label: 'JPY - 日元 (Japanese Yen)' },
    { value: 'HKD', label: 'HKD - 港币 (Hong Kong Dollar)' },
    { value: 'AUD', label: 'AUD - 澳元 (Australian Dollar)' },
    { value: 'CAD', label: 'CAD - 加元 (Canadian Dollar)' },
    { value: 'SGD', label: 'SGD - 新加坡元 (Singapore Dollar)' },
];

const TIMEZONES = [
    { value: 'Asia/Shanghai',       label: 'UTC+8:00 Asia/Shanghai' },
    { value: 'Asia/Hong_Kong',      label: 'UTC+8:00 Asia/Hong_Kong' },
    { value: 'Asia/Tokyo',          label: 'UTC+9:00 Asia/Tokyo' },
    { value: 'America/New_York',    label: 'UTC-4:00 America/New_York' },
    { value: 'America/Chicago',     label: 'UTC-5:00 America/Chicago' },
    { value: 'America/Los_Angeles', label: 'UTC-7:00 America/Los_Angeles' },
    { value: 'Europe/London',       label: 'UTC+1:00 Europe/London' },
    { value: 'Europe/Paris',        label: 'UTC+2:00 Europe/Paris' },
    { value: 'Australia/Sydney',    label: 'UTC+10:00 Australia/Sydney' },
];

interface WelcomeModalProps {
    userId: string;
    userEmail: string;
    userMetaUsername?: string;
    onComplete: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ userId, userEmail, userMetaUsername, onComplete }) => {
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        username: userMetaUsername ?? userEmail?.split('@')[0] ?? '',
        currency: 'USD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Shanghai',
    });

    useEffect(() => {
        const triggerConfetti = async () => {
            const confetti = (await import('canvas-confetti')).default;
            const colors = ['#6366f1', '#a78bfa', '#00c896', '#fbbf24', '#f472b6'];

            confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors, zIndex: 10001 });

            setTimeout(() => {
                confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors, zIndex: 10001 });
            }, 150);

            setTimeout(() => {
                confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.4 }, colors, zIndex: 10001 });
            }, 300);
        };
        triggerConfetti();
    }, []);

    const update = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.firstName.trim()) errs.firstName = '请输入名字';
        if (!form.lastName.trim()) errs.lastName = '请输入姓氏';
        if (!form.username.trim()) errs.username = '请输入用户名';
        else if (form.username.trim().length < 3) errs.username = '用户名至少3个字符';
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: userId,
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                username: form.username.trim(),
                currency: form.currency,
                timezone: form.timezone,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

            if (error) throw error;
            onComplete();
        } catch (err) {
            console.error('保存失败:', err);
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
            }}>
                {/* Card */}
                <div style={{
                    background: '#fff',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 460,
                    overflow: 'hidden',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                    animation: 'wm-fadeIn 0.45s cubic-bezier(0.34,1.4,0.64,1)',
                    position: 'relative',
                }}>

                    {/* ── Top brand banner ── */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                        padding: '28px 32px 52px',
                        textAlign: 'center',
                        position: 'relative',
                    }}>
                        {/* Purple glow */}
                        <div style={{
                            position: 'absolute', top: 0, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 300, height: 200,
                            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }} />

                        <h2 style={{
                            fontSize: 22, fontWeight: 700, color: '#ffffff',
                            letterSpacing: '-0.3px', marginBottom: 6,
                            position: 'relative', zIndex: 1,
                        }}>
                            欢迎来到 TradeGrail
                        </h2>
                        <p style={{
                            fontSize: 13, color: 'rgba(255,255,255,0.5)',
                            position: 'relative', zIndex: 1,
                        }}>
                            先完成基本设置，开始你的交易复盘之旅
                        </p>

                        {/* Floating logo circle */}
                        <div style={{
                            position: 'absolute',
                            bottom: -32, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 68, height: 68,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2,
                            border: '3px solid rgba(255,255,255,0.9)',
                        }}>
                            <img
                                src="/lion-logo.png"
                                alt="TradeGrail"
                                style={{ width: 46, height: 46, objectFit: 'contain' }}
                            />
                        </div>
                    </div>

                    {/* ── Form area ── */}
                    <div style={{ padding: '52px 32px 32px' }}>
                        <h3 style={{
                            fontSize: 16, fontWeight: 700, color: '#1a1d2e',
                            marginBottom: 20, letterSpacing: '-0.2px',
                        }}>
                            设置你的偏好
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* 名 + 姓 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>名 <span style={{ color: '#ff4d6a' }}>*</span></label>
                                    <input
                                        type="text" placeholder="First name" value={form.firstName}
                                        onChange={e => update('firstName', e.target.value)}
                                        style={{ ...inputStyle, borderColor: errors.firstName ? '#ff4d6a' : '#e8e8f0' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = errors.firstName ? '#ff4d6a' : '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = errors.firstName ? '#ff4d6a' : '#e8e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    {errors.firstName && <div style={errorStyle}>{errors.firstName}</div>}
                                </div>
                                <div>
                                    <label style={labelStyle}>姓 <span style={{ color: '#ff4d6a' }}>*</span></label>
                                    <input
                                        type="text" placeholder="Last name" value={form.lastName}
                                        onChange={e => update('lastName', e.target.value)}
                                        style={{ ...inputStyle, borderColor: errors.lastName ? '#ff4d6a' : '#e8e8f0' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = errors.lastName ? '#ff4d6a' : '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = errors.lastName ? '#ff4d6a' : '#e8e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    {errors.lastName && <div style={errorStyle}>{errors.lastName}</div>}
                                </div>
                            </div>

                            {/* 用户名 */}
                            <div>
                                <label style={labelStyle}>用户名 <span style={{ color: '#ff4d6a' }}>*</span></label>
                                <input
                                    type="text" placeholder="username" value={form.username}
                                    onChange={e => update('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                                    style={{ ...inputStyle, borderColor: errors.username ? '#ff4d6a' : '#e8e8f0' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = errors.username ? '#ff4d6a' : '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = errors.username ? '#ff4d6a' : '#e8e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                                {errors.username
                                    ? <div style={errorStyle}>{errors.username}</div>
                                    : <div style={{ fontSize: 11, color: '#b0b3c6', marginTop: 4 }}>已根据注册信息自动填入，可修改</div>
                                }
                            </div>

                            {/* 货币 */}
                            <div>
                                <label style={labelStyle}>账户货币单位</label>
                                <select value={form.currency} onChange={e => update('currency', e.target.value)} style={selectStyle}>
                                    {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>

                            {/* 时区 */}
                            <div>
                                <label style={labelStyle}>时区</label>
                                <select value={form.timezone} onChange={e => update('timezone', e.target.value)} style={selectStyle}>
                                    {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                width: '100%', height: 48, marginTop: 24,
                                borderRadius: 12, border: 'none',
                                background: saving ? '#e8e8f0' : 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                                color: saving ? '#b0b3c6' : '#fff',
                                fontSize: 15, fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                letterSpacing: '0.02em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: saving ? 'none' : '0 6px 20px rgba(14,20,40,0.35)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => {
                                if (saving) return;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(14,20,40,0.45)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = saving ? 'none' : '0 6px 20px rgba(14,20,40,0.35)';
                            }}
                        >
                            {saving ? '保存中...' : (
                                <>
                                    下一步
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes wm-fadeIn {
                    from { opacity: 0; transform: scale(0.88) translateY(24px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#6366f1', marginBottom: 6, letterSpacing: '0.01em',
};

const inputStyle: React.CSSProperties = {
    width: '100%', height: 42, borderRadius: 9,
    border: '1.5px solid #e8e8f0', padding: '0 14px',
    fontSize: 13.5, color: '#1a1d2e', background: '#fff',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: 42,
    cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
    fontSize: 11, color: '#ff4d6a', marginTop: 4,
};

export default WelcomeModal;
