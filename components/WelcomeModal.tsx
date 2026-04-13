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
    { value: 'Asia/Shanghai',      label: 'UTC+8:00 Asia/Shanghai' },
    { value: 'Asia/Hong_Kong',     label: 'UTC+8:00 Asia/Hong_Kong' },
    { value: 'Asia/Tokyo',         label: 'UTC+9:00 Asia/Tokyo' },
    { value: 'America/New_York',   label: 'UTC-4:00 America/New_York' },
    { value: 'America/Chicago',    label: 'UTC-5:00 America/Chicago' },
    { value: 'America/Los_Angeles',label: 'UTC-7:00 America/Los_Angeles' },
    { value: 'Europe/London',      label: 'UTC+1:00 Europe/London' },
    { value: 'Europe/Paris',       label: 'UTC+2:00 Europe/Paris' },
    { value: 'Australia/Sydney',   label: 'UTC+10:00 Australia/Sydney' },
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
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                zIndex: 10000, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 20,
            }}>
                <div style={{
                    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
                    padding: '36px 36px 32px', boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
                    position: 'relative', animation: 'wm-fadeIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1d2e', letterSpacing: '-0.4px', marginBottom: 6 }}>
                            欢迎来到 TradeGrail
                        </h2>
                        <p style={{ fontSize: 13, color: '#9396aa', lineHeight: 1.6 }}>
                            先完成基本设置，开始你的交易复盘之旅
                        </p>
                    </div>

                    {/* Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* 名 + 姓 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>名 <span style={{ color: '#ff4d6a' }}>*</span></label>
                                <input
                                    type="text" placeholder="First name" value={form.firstName}
                                    onChange={e => update('firstName', e.target.value)}
                                    style={{ ...inputStyle, borderColor: errors.firstName ? '#ff4d6a' : '#e8e8f0' }}
                                />
                                {errors.firstName && <div style={errorStyle}>{errors.firstName}</div>}
                            </div>
                            <div>
                                <label style={labelStyle}>姓 <span style={{ color: '#ff4d6a' }}>*</span></label>
                                <input
                                    type="text" placeholder="Last name" value={form.lastName}
                                    onChange={e => update('lastName', e.target.value)}
                                    style={{ ...inputStyle, borderColor: errors.lastName ? '#ff4d6a' : '#e8e8f0' }}
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
                            width: '100%', height: 46, marginTop: 24, borderRadius: 10, border: 'none',
                            background: saving ? '#e8e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: saving ? '#b0b3c6' : '#fff', fontSize: 14, fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.02em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                            transition: 'all 0.2s',
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

            <style>{`
                @keyframes wm-fadeIn {
                    from { opacity: 0; transform: scale(0.85) translateY(20px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#4a4d6a', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, borderRadius: 8, border: '1px solid #e8e8f0',
    padding: '0 12px', fontSize: 13, color: '#1a1d2e', background: '#fff',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239396aa' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
};

const errorStyle: React.CSSProperties = {
    fontSize: 11, color: '#ff4d6a', marginTop: 4,
};

export default WelcomeModal;
