import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';
import WelcomeStep2 from './WelcomeStep2';
import WelcomeHeader from './WelcomeHeader';

const CURRENCIES = [
    { value: 'USD', symbol: '$',    label: 'USD', desc: '美元 · United States Dollar' },
    { value: 'CNY', symbol: '¥',    label: 'CNY', desc: '人民币 · Chinese Yuan' },
    { value: 'EUR', symbol: '€',    label: 'EUR', desc: '欧元 · Euro' },
    { value: 'GBP', symbol: '£',    label: 'GBP', desc: '英镑 · British Pound' },
    { value: 'JPY', symbol: '¥',    label: 'JPY', desc: '日元 · Japanese Yen' },
    { value: 'HKD', symbol: 'HK$',  label: 'HKD', desc: '港币 · Hong Kong Dollar' },
    { value: 'AUD', symbol: 'A$',   label: 'AUD', desc: '澳元 · Australian Dollar' },
    { value: 'CAD', symbol: 'C$',   label: 'CAD', desc: '加元 · Canadian Dollar' },
    { value: 'SGD', symbol: 'S$',   label: 'SGD', desc: '新加坡元 · Singapore Dollar' },
];

const TIMEZONES = [
    { value: 'Asia/Shanghai',       label: 'Asia/Shanghai',       offset: 'UTC+8'  },
    { value: 'Asia/Hong_Kong',      label: 'Asia/Hong_Kong',      offset: 'UTC+8'  },
    { value: 'Asia/Tokyo',          label: 'Asia/Tokyo',          offset: 'UTC+9'  },
    { value: 'Asia/Singapore',      label: 'Asia/Singapore',      offset: 'UTC+8'  },
    { value: 'Asia/Seoul',          label: 'Asia/Seoul',          offset: 'UTC+9'  },
    { value: 'Asia/Dubai',          label: 'Asia/Dubai',          offset: 'UTC+4'  },
    { value: 'America/New_York',    label: 'America/New_York',    offset: 'UTC-4'  },
    { value: 'America/Chicago',     label: 'America/Chicago',     offset: 'UTC-5'  },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles', offset: 'UTC-7'  },
    { value: 'Europe/London',       label: 'Europe/London',       offset: 'UTC+1'  },
    { value: 'Europe/Paris',        label: 'Europe/Paris',        offset: 'UTC+2'  },
    { value: 'Australia/Sydney',    label: 'Australia/Sydney',    offset: 'UTC+10' },
];

// ── Custom dropdown with fixed positioning ───────────────────────────────────

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
    hasError?: boolean;
    renderSelected: (val: string) => React.ReactNode;
    renderOption: (opt: DropdownOption) => React.ReactNode;
    searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value, options, onChange, hasError, renderSelected, renderOption, searchable = false,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = searchable && search
        ? options.filter(o =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            (o.offset ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : options;

    const handleOpen = () => {
        if (open) { setOpen(false); return; }
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const dropdownHeight = Math.min(240, options.length * 52 + (searchable ? 48 : 0));
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < dropdownHeight + 10) {
                setDropdownStyle({
                    position: 'fixed',
                    bottom: window.innerHeight - rect.top + 4,
                    left: rect.left,
                    width: rect.width,
                    zIndex: 99999,
                });
            } else {
                setDropdownStyle({
                    position: 'fixed',
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                    zIndex: 99999,
                });
            }
        }
        setSearch('');
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        if (searchable) setTimeout(() => searchRef.current?.focus(), 50);
        const handler = (e: MouseEvent) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, searchable]);

    return (
        <div ref={triggerRef} style={{ position: 'relative' }}>
            {/* Trigger */}
            <div
                onClick={handleOpen}
                style={{
                    height: 42, borderRadius: 9,
                    border: `1.5px solid ${hasError ? '#ff4d6a' : open ? '#6366f1' : '#e8e8f0'}`,
                    padding: '0 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', background: '#fff',
                    boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    {renderSelected(value)}
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9396aa" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 8 }}>
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>

            {/* Dropdown panel — fixed, escapes overflow:hidden */}
            {open && (
                <div style={{
                    ...dropdownStyle,
                    background: '#fff',
                    border: '1.5px solid #e8e8f0',
                    borderRadius: 10,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    maxHeight: 240,
                    overflowY: 'auto',
                    animation: 'dd-open 0.15s ease-out',
                }}>
                    {searchable && (
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f6', position: 'sticky', top: 0, background: '#fff' }}>
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="搜索..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    width: '100%', height: 32, borderRadius: 6,
                                    border: '1px solid #e8e8f0', padding: '0 10px',
                                    fontSize: 12, color: '#1a1d2e', outline: 'none',
                                    boxSizing: 'border-box', background: '#fafafa',
                                }}
                            />
                        </div>
                    )}
                    {filtered.map(opt => {
                        const isSelected = opt.value === value;
                        return (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', cursor: 'pointer',
                                    background: isSelected ? '#f5f5ff' : 'transparent',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f5f5ff' : 'transparent'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {renderOption(opt)}
                                </div>
                                {isSelected && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                                        <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                )}
                            </div>
                        );
                    })}
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
    onNavigate: (tab: string, action?: string) => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ userId, userEmail, userMetaUsername, onComplete, onNavigate }) => {
    const { markOnboardingComplete, updateUserPreferences } = useUser();
    const [step, setStep] = useState(1);
    const [savedUserName, setSavedUserName] = useState('');
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
            updateUserPreferences(form.currency, form.timezone);
            // markOnboardingComplete is called when user closes Step2, not here
            setSavedUserName(form.firstName);
            setStep(2);
            setSaving(false);
        } catch (err) {
            console.error('保存失败:', err);
            setSaving(false);
        }
    };

    if (step === 2) {
        return (
            <WelcomeStep2
                userName={savedUserName}
                onClose={() => { markOnboardingComplete(); onComplete(); }}
                onNavigate={onNavigate}
            />
        );
    }

    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
                {/* Card — no overflow:hidden so dropdowns aren't clipped */}
                <div style={{
                    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                    animation: 'wm-fadeIn 0.45s cubic-bezier(0.34,1.4,0.64,1)', position: 'relative',
                }}>
                    {/* Top banner — shared with Step2 via WelcomeHeader */}
                    <WelcomeHeader
                        title="欢迎来到 TradeGrail"
                        subtitle="先完成基本设置，开始你的交易复盘之旅"
                    />

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
                                    renderSelected={val => {
                                        const c = CURRENCIES.find(x => x.value === val);
                                        return (
                                            <>
                                                <span style={{ fontSize: 14, color: '#4a4d6a', fontWeight: 600, minWidth: 24 }}>{c?.symbol}</span>
                                                <span style={{ fontSize: 13, color: '#1a1d2e', fontWeight: 500 }}>{c?.label}</span>
                                            </>
                                        );
                                    }}
                                    renderOption={opt => (
                                        <>
                                            <span style={{ fontSize: 14, color: '#4a4d6a', fontWeight: 600, minWidth: 24 }}>{opt.symbol}</span>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d2e' }}>{opt.label}</div>
                                                {opt.desc && <div style={{ fontSize: 11, color: '#9396aa', marginTop: 1 }}>{opt.desc}</div>}
                                            </div>
                                        </>
                                    )}
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
                                    renderSelected={val => {
                                        const tz = TIMEZONES.find(x => x.value === val);
                                        return (
                                            <>
                                                <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, minWidth: 46 }}>{tz?.offset}</span>
                                                <span style={{ fontSize: 13, color: '#1a1d2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tz?.label}</span>
                                            </>
                                        );
                                    }}
                                    renderOption={opt => (
                                        <>
                                            <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, minWidth: 46 }}>{opt.offset}</span>
                                            <span style={{ fontSize: 13, color: '#1a1d2e' }}>{opt.label}</span>
                                        </>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                width: '100%', height: 46, marginTop: 24, borderRadius: 10, border: 'none',
                                background: saving ? '#e8e8f0' : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)',
                                color: saving ? '#b0b3c6' : '#fff', fontSize: 14, fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.02em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: saving ? 'none' : '0 4px 16px rgba(30,27,75,0.4)',
                                transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
                            }}
                            onMouseEnter={e => {
                                if (saving) return;
                                e.currentTarget.style.background = 'linear-gradient(135deg, #312e81 0%, #3730a3 50%, #4338ca 100%)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,27,75,0.5)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = saving ? '#e8e8f0' : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = saving ? 'none' : '0 4px 16px rgba(30,27,75,0.4)';
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
