import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';

const CURRENCIES = [
    { value: 'USD', label: 'USD', desc: '美元 · United States Dollar', symbol: '$' },
    { value: 'CNY', label: 'CNY', desc: '人民币 · Chinese Yuan', symbol: '¥' },
    { value: 'EUR', label: 'EUR', desc: '欧元 · Euro', symbol: '€' },
    { value: 'GBP', label: 'GBP', desc: '英镑 · British Pound', symbol: '£' },
    { value: 'JPY', label: 'JPY', desc: '日元 · Japanese Yen', symbol: '¥' },
    { value: 'HKD', label: 'HKD', desc: '港币 · Hong Kong Dollar', symbol: 'HK$' },
    { value: 'AUD', label: 'AUD', desc: '澳元 · Australian Dollar', symbol: 'A$' },
    { value: 'CAD', label: 'CAD', desc: '加元 · Canadian Dollar', symbol: 'C$' },
    { value: 'SGD', label: 'SGD', desc: '新加坡元 · Singapore Dollar', symbol: 'S$' },
];

const TIMEZONES = [
    { value: 'Asia/Shanghai',       label: 'Asia/Shanghai',       offset: 'UTC+8' },
    { value: 'Asia/Hong_Kong',      label: 'Asia/Hong Kong',      offset: 'UTC+8' },
    { value: 'Asia/Tokyo',          label: 'Asia/Tokyo',          offset: 'UTC+9' },
    { value: 'America/New_York',    label: 'America/New York',    offset: 'UTC-4' },
    { value: 'America/Chicago',     label: 'America/Chicago',     offset: 'UTC-5' },
    { value: 'America/Los_Angeles', label: 'America/Los Angeles', offset: 'UTC-7' },
    { value: 'Europe/London',       label: 'Europe/London',       offset: 'UTC+1' },
    { value: 'Europe/Paris',        label: 'Europe/Paris',        offset: 'UTC+2' },
    { value: 'Australia/Sydney',    label: 'Australia/Sydney',    offset: 'UTC+10' },
];

// ── Custom dropdown ──────────────────────────────────────────────────────────

interface DropdownOption {
    value: string;
    label: string;
    desc?: string;
    symbol?: string;
    offset?: string;
}

interface CustomSelectProps {
    value: string;
    options: DropdownOption[];
    onChange: (v: string) => void;
    placeholder?: string;
    hasError?: boolean;
    searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value, options, onChange, hasError, searchable = false,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = options.find(o => o.value === value);

    const filtered = searchable && query
        ? options.filter(o =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            (o.desc ?? '').toLowerCase().includes(query.toLowerCase())
          )
        : options;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open && searchable) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open, searchable]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => { setOpen(o => !o); setQuery(''); }}
                style={{
                    width: '100%', height: 42, borderRadius: 9,
                    border: `1.5px solid ${hasError ? '#ff4d6a' : open ? '#6366f1' : '#e8e8f0'}`,
                    boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                    padding: '0 36px 0 14px',
                    fontSize: 13.5, color: '#1a1d2e', background: '#fff',
                    outline: 'none', boxSizing: 'border-box',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
            >
                {selected?.symbol && (
                    <span style={{
                        minWidth: 28, height: 22, borderRadius: 5,
                        background: 'linear-gradient(135deg, #0e1428, #1a1040)',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {selected.symbol}
                    </span>
                )}
                {selected?.offset && (
                    <span style={{
                        minWidth: 44, height: 22, borderRadius: 5,
                        background: 'linear-gradient(135deg, #0e1428, #1a1040)',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {selected.offset}
                    </span>
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected?.label ?? ''}
                </span>
                {/* Chevron */}
                <span style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
                    transition: 'transform 0.2s', pointerEvents: 'none',
                    color: '#6366f1',
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </span>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: '#fff', borderRadius: 12,
                    border: '1.5px solid #e8e8f0',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    zIndex: 9999, overflow: 'hidden',
                    animation: 'dd-open 0.15s ease-out',
                }}>
                    {searchable && (
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f8' }}>
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="搜索..."
                                style={{
                                    width: '100%', height: 32, borderRadius: 7,
                                    border: '1.5px solid #e8e8f0', padding: '0 10px',
                                    fontSize: 12.5, color: '#1a1d2e', outline: 'none',
                                    boxSizing: 'border-box', background: '#fafafa',
                                }}
                            />
                        </div>
                    )}
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {filtered.map(opt => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                                    style={{
                                        width: '100%', padding: '9px 14px',
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f7f7fc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                                >
                                    {opt.symbol && (
                                        <span style={{
                                            minWidth: 28, height: 22, borderRadius: 5,
                                            background: isSelected
                                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                : 'linear-gradient(135deg, #0e1428, #1a1040)',
                                            color: '#fff', fontSize: 11, fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {opt.symbol}
                                        </span>
                                    )}
                                    {opt.offset && (
                                        <span style={{
                                            minWidth: 44, height: 22, borderRadius: 5,
                                            background: isSelected
                                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                : 'linear-gradient(135deg, #0e1428, #1a1040)',
                                            color: '#fff', fontSize: 10, fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {opt.offset}
                                        </span>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? '#6366f1' : '#1a1d2e',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {opt.label}
                                        </div>
                                        {opt.desc && (
                                            <div style={{ fontSize: 11, color: '#9396aa', marginTop: 1 }}>
                                                {opt.desc}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main modal ───────────────────────────────────────────────────────────────

interface WelcomeModalProps {
    userId: string;
    userEmail: string;
    userMetaUsername?: string;
    onComplete: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ userId, userEmail, userMetaUsername, onComplete }) => {
    const { markOnboardingComplete, updateUserPreferences } = useUser();
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

            // Push chosen values into global context immediately
            updateUserPreferences(form.currency, form.timezone);
            markOnboardingComplete();
            onComplete();
        } catch (err) {
            console.error('保存失败:', err);
            setSaving(false);
        }
    };

    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
                <div style={{
                    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
                    overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                    animation: 'wm-fadeIn 0.45s cubic-bezier(0.34,1.4,0.64,1)', position: 'relative',
                }}>
                    {/* Top banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                        padding: '28px 32px 52px', textAlign: 'center', position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                            width: 300, height: 200,
                            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }} />
                        <h2 style={{
                            fontSize: 22, fontWeight: 700, color: '#fff',
                            letterSpacing: '-0.3px', marginBottom: 6, position: 'relative', zIndex: 1,
                        }}>
                            欢迎来到 TradeGrail
                        </h2>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>
                            先完成基本设置，开始你的交易复盘之旅
                        </p>
                        <div style={{
                            position: 'absolute', bottom: -32, left: '50%', transform: 'translateX(-50%)',
                            width: 68, height: 68, borderRadius: '50%', background: '#fff',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2, border: '3px solid rgba(255,255,255,0.9)',
                        }}>
                            <img src="/lion-logo.png" alt="TradeGrail" style={{ width: 46, height: 46, objectFit: 'contain' }} />
                        </div>
                    </div>

                    {/* Form area */}
                    <div style={{ padding: '52px 32px 32px' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d2e', marginBottom: 20, letterSpacing: '-0.2px' }}>
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
                                <CustomSelect
                                    value={form.currency}
                                    options={CURRENCIES}
                                    onChange={v => update('currency', v)}
                                />
                            </div>

                            {/* 时区 */}
                            <div>
                                <label style={labelStyle}>时区</label>
                                <CustomSelect
                                    value={form.timezone}
                                    options={TIMEZONES}
                                    onChange={v => update('timezone', v)}
                                    searchable
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                width: '100%', height: 48, marginTop: 24, borderRadius: 12, border: 'none',
                                background: saving ? '#e8e8f0' : 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
                                color: saving ? '#b0b3c6' : '#fff', fontSize: 15, fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.02em',
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
                @keyframes dd-open {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
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

const errorStyle: React.CSSProperties = {
    fontSize: 11, color: '#ff4d6a', marginTop: 4,
};

export default WelcomeModal;
