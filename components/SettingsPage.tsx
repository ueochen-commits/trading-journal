import React, { useState, useRef, useEffect } from 'react';
import { useUser } from './UserContext';
import { Trade, TradingAccount, RiskSettings } from '../types';
import BrokersPage from './BrokersPage';

// ─── Helper ───────────────────────────────────────────────────────────────────
const compressImage = (file: File): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        canvas.width = MAX;
        canvas.height = img.height * (MAX / img.width);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  border: '#f0edf8',
  borderField: '#e4e0f4',
  borderHover: '#b8b0e0',
  primary: '#5050c8',
  primaryHover: '#3e3eb6',
  primaryLight: 'rgba(91,91,214,0.07)',
  textPrimary: '#1a1a2e',
  textSecondary: '#2a2a40',
  textMuted: '#b0aac8',
  textTertiary: '#b0b0c8',
  navActive: '#4040b8',
  navActiveBg: '#eeedfb',
  navHoverBg: '#f7f5fd',
  navHoverText: '#3a3a70',
  navText: '#7878a0',
  danger: '#b84040',
  dangerHover: '#fff0f0',
};

// ─── Shared small components ──────────────────────────────────────────────────
const FieldInput: React.FC<{
  value: string; onChange?: (v: string) => void;
  placeholder?: string; readOnly?: boolean; width?: number;
}> = ({ value, onChange, placeholder, readOnly, width = 180 }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value} readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        height: 33, borderRadius: 7, fontSize: 13, color: readOnly ? '#9898b8' : T.textPrimary,
        padding: '0 10px', outline: 'none', boxSizing: 'border-box', width,
        border: `1px solid ${focused ? '#6060d0' : T.borderField}`,
        background: readOnly ? '#f5f3fb' : (focused ? '#fff' : '#fafafe'),
        boxShadow: focused ? `0 0 0 3px ${T.primaryLight}` : 'none',
        cursor: readOnly ? 'default' : 'text',
        transition: 'border-color 0.14s, box-shadow 0.14s, background 0.14s',
      }}
    />
  );
};

const SmallBtn: React.FC<{
  children: React.ReactNode; onClick?: () => void;
  danger?: boolean; style?: React.CSSProperties;
}> = ({ children, onClick, danger, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        height: 30, padding: '0 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
        border: danger ? 'none' : `1px solid ${hov ? T.borderHover : T.borderField}`,
        background: danger ? 'transparent' : (hov ? '#f5f2fc' : 'transparent'),
        color: danger ? (hov ? T.danger : T.danger) : (hov ? T.navActive : '#5050a0'),
        ...(danger && hov ? { background: T.dangerHover } : {}),
        ...style,
      }}>
      {children}
    </button>
  );
};

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{
    width: 38, height: 21, borderRadius: 11, cursor: 'pointer',
    background: value ? T.primary : '#d8d4ee',
    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
  }}>
    <div style={{
      position: 'absolute', top: 2.5, left: value ? 19 : 2.5,
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    }} />
  </div>
);

const Select: React.FC<{
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; width?: number;
}> = ({ value, onChange, options, width = 180 }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const label = options.find(o => o.value === value)?.label ?? value;
  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <div onClick={() => setOpen(o => !o)} style={{
        height: 33, borderRadius: open ? '7px 7px 0 0' : 7, fontSize: 13,
        color: T.textPrimary, padding: '0 10px', boxSizing: 'border-box',
        border: `1px solid ${open ? '#6060d0' : T.borderField}`,
        background: '#fafafe', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <span>{label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMuted}
          strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: `1px solid #e0dcf4`, borderTop: 'none',
          borderRadius: '0 0 7px 7px', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>
          {options.map(opt => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: '9px 10px', fontSize: 13, cursor: 'pointer',
                color: opt.value === value ? T.primary : T.textPrimary,
                background: opt.value === value ? '#f0eeff' : 'transparent',
                fontWeight: opt.value === value ? 500 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = '#f8f6ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = opt.value === value ? '#f0eeff' : 'transparent'; }}
            >
              {opt.label}
              {opt.value === value && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Field row ────────────────────────────────────────────────────────────────
const FieldRow: React.FC<{
  label: string; desc?: string; last?: boolean;
  children: React.ReactNode;
}> = ({ label, desc, last, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', padding: '14px 0', gap: 24,
    borderBottom: last ? 'none' : `1px solid #f5f2fc`,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary, marginBottom: desc ? 1 : 0 }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: T.textTertiary, lineHeight: 1.4 }}>{desc}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {children}
    </div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 600, color: '#b0aac8',
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
  }}>
    {children}
  </div>
);

// ─── Nav icons ────────────────────────────────────────────────────────────────
const NI: Record<string, React.ReactNode> = {
  profile: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  publicProfile: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>,
  security: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  account: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>,
  brokers: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  tradeSettings: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>,
  ptsl: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
  commissions: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  tags: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  subscription: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  billing: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  notifications: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
};

const NAV_GROUPS = [
  { label: '个人资料', items: [
    { id: 'profile', label: '个人信息' },
    { id: 'security', label: '安全设置' },
  ]},
  { label: '订阅与账单', items: [
    { id: 'subscription', label: '订阅方案' },
  ]},
  { label: '账户', items: [
    { id: 'account', label: '账户设置' },
    { id: 'brokers', label: '经纪商账户' },
  ]},
  { label: '交易设置', items: [
    { id: 'tradeSettings', label: '交易参数' },
    { id: 'ptsl', label: '止盈止损' },
    { id: 'commissions', label: '手续费设置' },
    { id: 'tags', label: '标签管理' },
  ]},
  { label: '通知', items: [
    { id: 'notifications', label: '消息提醒' },
  ]},
];

// ─── Profile page ─────────────────────────────────────────────────────────────
const ProfilePage: React.FC<{ user: any; updateProfile: (p: any) => void; showToast: (m?: string) => void }> = ({ user, updateProfile, showToast }) => {
  const [firstName, setFirstName] = useState(user.name?.split(' ')[0] ?? 'Zhixun');
  const [lastName, setLastName] = useState(user.name?.split(' ')[1] ?? 'Chen');
  const [username, setUsername] = useState(user.name ?? 'ueochen');
  const [wechat, setWechat] = useState('');
  const [bilibili, setBilibili] = useState('');
  const [douyin, setDouyin] = useState('');
  const [weibo, setWeibo] = useState('');
  const [website, setWebsite] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [avatarHov, setAvatarHov] = useState(false);
  const [saveBtnHov, setSaveBtnHov] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mark = (fn: (v: string) => void) => (v: string) => { fn(v); setIsDirty(true); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const base64 = await compressImage(e.target.files[0]);
      updateProfile({ avatarUrl: base64 });
      setIsDirty(true);
      showToast('头像已更新');
    }
  };

  const handleSave = () => {
    updateProfile({ name: `${firstName} ${lastName}`.trim() || username });
    setIsDirty(false);
    showToast();
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 28, borderBottom: `1px solid ${T.border}` }}>
        <div
          style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0, position: 'relative', cursor: 'pointer',
            background: 'linear-gradient(140deg, #5b5bd6, #9060e8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', overflow: 'hidden',
          }}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setAvatarHov(true)}
          onMouseLeave={() => setAvatarHov(false)}
        >
          {user.avatarUrl
            ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
            : (user.name ?? 'U')[0].toUpperCase()
          }
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: avatarHov ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.18s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"
              style={{ opacity: avatarHov ? 1 : 0, transition: 'opacity 0.18s' }}>
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, marginBottom: 2 }}>
            {`${firstName} ${lastName}`.trim() || username}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>头像显示在您的公开主页与评论区</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SmallBtn onClick={() => fileInputRef.current?.click()}>更换头像</SmallBtn>
            <SmallBtn danger onClick={() => { updateProfile({ avatarUrl: '' }); showToast('头像已移除'); }}>移除</SmallBtn>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div style={{ marginTop: 28, marginBottom: 40 }}>
        <SectionLabel>基本信息</SectionLabel>
        <FieldRow label="姓名" desc="您的真实姓名">
          <div style={{ display: 'flex', gap: 6 }}>
            <FieldInput value={firstName} onChange={mark(setFirstName)} placeholder="名" width={130} />
            <FieldInput value={lastName} onChange={mark(setLastName)} placeholder="姓" width={130} />
          </div>
        </FieldRow>
        <FieldRow label="用户名" desc="公开主页 URL 中的唯一标识">
          <FieldInput value={username} onChange={mark(setUsername)} width={180} />
          <SmallBtn onClick={() => { updateProfile({ name: username }); showToast('用户名已更新'); }}>修改</SmallBtn>
        </FieldRow>
        <FieldRow label="邮箱地址" desc="登录邮箱，无法直接修改" last>
          <FieldInput value={user.email ?? 'user@example.com'} readOnly width={180} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1a7a42', background: '#eaf6f0', border: '1px solid #bbf7d0', padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>已验证</span>
        </FieldRow>
      </div>

      {/* Social */}
      <div style={{ marginBottom: 40 }}>
        <SectionLabel>社交账号</SectionLabel>
        {[
          { label: '微信', val: wechat, set: mark(setWechat), ph: 'wxid...' },
          { label: '哔哩哔哩', val: bilibili, set: mark(setBilibili), ph: 'space.bilibili.com/...' },
          { label: '抖音', val: douyin, set: mark(setDouyin), ph: '@username' },
          { label: '微博', val: weibo, set: mark(setWeibo), ph: 'weibo.com/...' },
          { label: '个人网站', val: website, set: mark(setWebsite), ph: 'https://...' },
        ].map((f, i, arr) => (
          <FieldRow key={f.label} label={f.label} last={i === arr.length - 1}>
            <FieldInput value={f.val} onChange={f.set} placeholder={f.ph} width={180} />
          </FieldRow>
        ))}
      </div>

      {/* Save */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          disabled={!isDirty}
          onClick={handleSave}
          onMouseEnter={() => setSaveBtnHov(true)}
          onMouseLeave={() => setSaveBtnHov(false)}
          style={{
            height: 34, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: isDirty ? 'pointer' : 'not-allowed', transition: 'all 0.14s',
            background: isDirty ? (saveBtnHov ? T.primaryHover : T.primary) : '#d8d4f0',
            color: isDirty ? '#fff' : '#a8a8c8',
            boxShadow: isDirty && saveBtnHov ? '0 2px 10px rgba(80,80,200,0.22)' : 'none',
          }}
        >
          保存更改
        </button>
      </div>
    </div>
  );
};

// ─── Account page ─────────────────────────────────────────────────────────────
const AccountPage: React.FC<{ showToast: (m?: string) => void }> = ({ showToast }) => {
  const [enableChecklist, setEnableChecklist] = useState(() => localStorage.getItem('tg_enable_checklist') !== 'false');
  const [defaultAccount, setDefaultAccount] = useState('main');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('Asia/Shanghai');

  const handleToggleChecklist = (v: boolean) => {
    setEnableChecklist(v);
    localStorage.setItem('tg_enable_checklist', String(v));
    showToast(v ? '检查清单已启用' : '检查清单已禁用');
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginTop: 4, marginBottom: 40 }}>
        <SectionLabel>账户偏好</SectionLabel>
        <FieldRow label="默认账户" desc="新交易记录默认归属的账户">
          <Select value={defaultAccount} onChange={setDefaultAccount} options={[{ value: 'main', label: '主账户' }, { value: 'demo', label: '演示账户' }]} width={180} />
        </FieldRow>
        <FieldRow label="账户货币" desc="用于计算盈亏的基础货币">
          <Select value={currency} onChange={setCurrency} options={[{ value: 'USD', label: 'USD 美元' }, { value: 'CNY', label: 'CNY 人民币' }, { value: 'USDT', label: 'USDT' }]} width={180} />
        </FieldRow>
        <FieldRow label="账户时区" desc="交易时间戳使用的时区" last>
          <Select value={timezone} onChange={setTimezone} options={[{ value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' }, { value: 'UTC', label: 'UTC' }, { value: 'America/New_York', label: '美东时间 (UTC-5)' }]} width={220} />
        </FieldRow>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionLabel>交易控制</SectionLabel>
        <FieldRow label="启用交易权限清单检查" desc="开启后，每次交易前将自动检查您的权限清单条件" last>
          <Toggle value={enableChecklist} onChange={handleToggleChecklist} />
        </FieldRow>
      </div>

      <div style={{ marginBottom: 40 }}>
        <SectionLabel>危险操作</SectionLabel>
        <FieldRow label="删除账户" desc="永久删除您的 TradeGrail 账户及所有数据，此操作不可撤销。" last>
          <SmallBtn danger>删除账户</SmallBtn>
        </FieldRow>
      </div>
    </div>
  );
};

// ─── Trade settings page ──────────────────────────────────────────────────────
const TradeSettingsPage: React.FC<{ showToast: (m?: string) => void; riskSettings?: RiskSettings; onSaveRiskSettings?: (s: RiskSettings) => void }> = ({ showToast, riskSettings, onSaveRiskSettings }) => {
  const [positionMethod, setPositionMethod] = useState('fixed');
  const [riskRatio, setRiskRatio] = useState('1');
  const [maxTradeLoss, setMaxTradeLoss] = useState('');
  const [maxDailyLoss, setMaxDailyLoss] = useState(riskSettings?.maxDailyLoss?.toString() || '');
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginTop: 4, marginBottom: 40 }}>
        <SectionLabel>仓位与风险</SectionLabel>
        <FieldRow label="默认仓位计算方式">
          <Select value={positionMethod} onChange={setPositionMethod} options={[{ value: 'fixed', label: '固定金额' }, { value: 'percent', label: '账户百分比' }, { value: 'risk', label: '风险比例' }]} width={180} />
        </FieldRow>
        <FieldRow label="默认风险比例" desc="每笔交易占账户的最大风险百分比">
          <FieldInput value={riskRatio} onChange={setRiskRatio} width={80} />
          <span style={{ fontSize: 13, color: T.textMuted }}>%</span>
        </FieldRow>
        <FieldRow label="最大单笔亏损限制">
          <FieldInput value={maxTradeLoss} onChange={setMaxTradeLoss} placeholder="0.00" width={140} />
        </FieldRow>
        <FieldRow label="每日最大亏损限制" last>
          <FieldInput value={maxDailyLoss} onChange={setMaxDailyLoss} placeholder="0.00" width={140} />
        </FieldRow>
      </div>
      <div style={{ paddingTop: 20, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => {
          if (riskSettings && onSaveRiskSettings) {
            onSaveRiskSettings({ ...riskSettings, maxDailyLoss: Number(maxDailyLoss) || riskSettings.maxDailyLoss });
          }
          showToast();
        }} style={{ height: 34, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: T.primary, color: '#fff' }}>保存更改</button>
      </div>
    </div>
  );
};

// ─── Notifications page ───────────────────────────────────────────────────────
const NotificationsPage: React.FC<{ showToast: (m?: string) => void }> = ({ showToast }) => {
  const items = [
    { key: 'import', label: '交易导入完成通知', desc: '当交易数据导入完成时发送通知' },
    { key: 'disconnect', label: '账户连接断开提醒', desc: '当经纪商连接断开时立即提醒' },
    { key: 'maintenance', label: '系统维护通知', desc: '系统维护前提前通知' },
    { key: 'subscription', label: '订阅到期提醒', desc: '订阅到期前 7 天发送提醒' },
    { key: 'weekly', label: '每周交易报告推送', desc: '每周一发送上周交易总结报告' },
  ];
  const [vals, setVals] = useState<Record<string, boolean>>({ import: true, disconnect: true, maintenance: false, subscription: true, weekly: false });
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginTop: 4 }}>
        <SectionLabel>通知偏好</SectionLabel>
        {items.map((item, i) => (
          <FieldRow key={item.key} label={item.label} desc={item.desc} last={i === items.length - 1}>
            <Toggle value={vals[item.key]} onChange={v => { setVals(s => ({ ...s, [item.key]: v })); showToast(v ? `${item.label}已开启` : `${item.label}已关闭`); }} />
          </FieldRow>
        ))}
      </div>
    </div>
  );
};

// ─── Tags page ────────────────────────────────────────────────────────────────
const TagsPage: React.FC = () => {
  const COLORS = ['#5b5bd6','#e05555','#16a34a','#d97706','#0891b2','#7c3aed','#db2777'];
  const [tags, setTags] = useState([{ id: '1', name: '趋势交易', color: '#5b5bd6' }, { id: '2', name: '突破', color: '#16a34a' }, { id: '3', name: '反转', color: '#e05555' }]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginTop: 4 }}>
        <SectionLabel>标签列表</SectionLabel>
        {tags.map((tag, i) => (
          <FieldRow key={tag.id} label={tag.name} last={i === tags.length - 1 && !adding}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: tag.color, marginRight: 4 }} />
            <SmallBtn danger onClick={() => setTags(t => t.filter(x => x.id !== tag.id))}>删除</SmallBtn>
          </FieldRow>
        ))}
        {adding && (
          <FieldRow label="" last>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {COLORS.map(c => <div key={c} onClick={() => setNewColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? `2px solid #1a1a2e` : '2px solid transparent' }} />)}
              <FieldInput value={newName} onChange={setNewName} placeholder="标签名称" width={140} />
              <SmallBtn onClick={() => { if (newName.trim()) { setTags(t => [...t, { id: Date.now().toString(), name: newName.trim(), color: newColor }]); setNewName(''); setAdding(false); } }}>添加</SmallBtn>
              <SmallBtn onClick={() => setAdding(false)}>取消</SmallBtn>
            </div>
          </FieldRow>
        )}
      </div>
      {!adding && <button onClick={() => setAdding(true)} style={{ marginTop: 16, height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${T.borderField}`, background: 'transparent', fontSize: 12, fontWeight: 500, color: '#5050a0', cursor: 'pointer' }}>+ 新增标签</button>}
    </div>
  );
};

// ─── Placeholder ──────────────────────────────────────────────────────────────
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ maxWidth: 640, paddingTop: 4 }}>
    <SectionLabel>{title}</SectionLabel>
    <div style={{ padding: '60px 0', textAlign: 'center', color: T.textMuted, fontSize: 14 }}>此功能正在建设中，敬请期待</div>
  </div>
);

// ─── Main SettingsPage ────────────────────────────────────────────────────────
interface SettingsPageProps {
  onImportTrades?: (trades: Trade[]) => void;
  tradingAccounts?: TradingAccount[];
  onAddAccount?: () => void;
  onDeleteAccount?: (id: string) => void;
  onSyncAccount?: (id: string) => void;
  onUpdateAccount?: (id: string, updates: { manualBalance?: number | null; balance?: number }) => void;
  onClearTrades?: (accountId: string) => void;
  initialSection?: string;
  riskSettings?: RiskSettings;
  onSaveRiskSettings?: (s: RiskSettings) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onImportTrades, tradingAccounts, onAddAccount, onDeleteAccount, onSyncAccount, onUpdateAccount, onClearTrades, initialSection, riskSettings, onSaveRiskSettings }) => {
  const { user, updateProfile } = useUser();
  const [activeSection, setActiveSection] = useState(initialSection || 'profile');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg = '设置保存成功') => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Tab bar config per section
  const TABS: Record<string, { id: string; label: string }[]> = {
    profile: [{ id: 'profile', label: '个人信息' }, { id: 'security', label: '安全设置' }],
    security: [{ id: 'profile', label: '个人信息' }, { id: 'security', label: '安全设置' }],
    account: [{ id: 'account', label: '账户设置' }, { id: 'brokers', label: '经纪商账户' }],
  };
  const currentTabs = TABS[activeSection] ?? [];

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfilePage user={user} updateProfile={updateProfile} showToast={showToast} />;
      case 'account': return <AccountPage showToast={showToast} />;
      case 'brokers': return <BrokersPage userPlan={user.tier} accounts={tradingAccounts} onAddAccount={onAddAccount} onDeleteAccount={onDeleteAccount} onSyncAccount={onSyncAccount} onUpdateAccount={onUpdateAccount} onClearTrades={onClearTrades} />;
      case 'tradeSettings': return <TradeSettingsPage showToast={showToast} riskSettings={riskSettings} onSaveRiskSettings={onSaveRiskSettings} />;
      case 'notifications': return <NotificationsPage showToast={showToast} />;
      case 'tags': return <TagsPage />;
      default: return <PlaceholderPage title={NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeSection)?.label ?? activeSection} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#ffffff', overflow: 'hidden' }}>

      {/* Left nav */}
      <div style={{ width: 192, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: '#ffffff', padding: '24px 0', overflowY: 'auto' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#c4bfda', letterSpacing: '0.09em', textTransform: 'uppercase', padding: '18px 20px 6px' }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const isActive = activeSection === item.id;
              return (
                <div key={item.id} onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 16px', margin: '0 4px', borderRadius: 6,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.12s',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? T.navActive : T.navText,
                    background: isActive ? T.navActiveBg : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = T.navHoverBg; e.currentTarget.style.color = T.navHoverText; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.navText; } }}
                >
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.65 }}>{NI[item.id]}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Right area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tab bar */}
        {currentTabs.length > 0 && (
          <div style={{ height: 52, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 48px', background: '#ffffff', flexShrink: 0 }}>
            {currentTabs.map(tab => {
              const isActive = activeSection === tab.id;
              return (
                <div key={tab.id} onClick={() => setActiveSection(tab.id)}
                  style={{
                    fontSize: 13, marginRight: 28, height: 52,
                    display: 'flex', alignItems: 'center', cursor: 'pointer',
                    borderBottom: isActive ? `2px solid #5050cc` : '2px solid transparent',
                    color: isActive ? '#4040b8' : '#9090b8',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#3a3a70'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#9090b8'; }}
                >
                  {tab.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: activeSection === 'brokers' ? 0 : '36px 48px', background: '#ffffff' }}>
          {renderContent()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', color: '#fff', fontSize: 13, fontWeight: 500,
          padding: '10px 20px', borderRadius: 10, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          {toast}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
