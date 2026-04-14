import React, { useState, useRef, useEffect } from 'react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';
import { Trade } from '../types';
import { fetchTradesFromExchange } from '../services/exchangeService';

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
const C = {
  bgPage: '#f8f7fc',
  bgContent: '#ffffff',
  bgNav: '#f3f1f9',
  primary: '#5b5bd6',
  primaryHover: '#4a4ac8',
  primaryLight: 'rgba(91,91,214,0.08)',
  textPrimary: '#1a1a2e',
  textSecondary: '#6b6b8a',
  textTertiary: '#a0a0b8',
  border: '#e8e4f4',
  borderHover: '#c8c0e8',
  danger: '#dc3545',
  dangerLight: '#fff0f0',
};

// ─── Shared UI components ─────────────────────────────────────────────────────
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{
    width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
    background: value ? C.primary : '#d8d4ee',
    position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
  }}>
    <div style={{
      position: 'absolute', top: 3, left: value ? 21 : 3,
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    }} />
  </div>
);

const Btn: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}> = ({ children, variant = 'secondary', onClick, disabled, style }) => {
  const [hov, setHov] = useState(false);
  const base: React.CSSProperties = {
    height: 36, padding: '0 16px', borderRadius: 8,
    fontSize: 14, fontWeight: 500, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: hov ? C.primaryHover : C.primary, color: '#fff' },
    secondary: { background: hov ? '#faf8ff' : '#fff', color: C.textPrimary, border: `1px solid ${hov ? C.borderHover : C.border}` },
    danger: { background: hov ? C.dangerLight : '#fff', color: C.danger, border: `1px solid ${hov ? '#faa' : '#fcc'}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Input: React.FC<{
  value: string; onChange?: (v: string) => void;
  placeholder?: string; readOnly?: boolean; type?: string;
  style?: React.CSSProperties;
}> = ({ value, onChange, placeholder, readOnly, type = 'text', style }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        height: 38, borderRadius: 8, fontSize: 14, color: C.textPrimary,
        padding: '0 12px', outline: 'none', boxSizing: 'border-box',
        border: `1px solid ${focused ? C.primary : C.border}`,
        boxShadow: focused ? `0 0 0 3px rgba(91,91,214,0.10)` : 'none',
        background: readOnly ? '#faf8ff' : '#fff',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...style,
      }}
    />
  );
};

const Select: React.FC<{
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}> = ({ value, onChange, options, style }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const label = options.find(o => o.value === value)?.label ?? value;
  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div onClick={() => setOpen(o => !o)} style={{
        height: 38, borderRadius: open ? '8px 8px 0 0' : 8, fontSize: 14,
        color: C.textPrimary, padding: '0 12px', boxSizing: 'border-box',
        border: `1px solid ${open ? '#c8c0e8' : C.border}`,
        background: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        boxShadow: open ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
      }}>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary}
          strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: `1px solid #e0e0ea`, borderTop: 'none',
          borderRadius: '0 0 8px 8px', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>
          {options.map(opt => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: '10px 12px', fontSize: 14, cursor: 'pointer',
                color: opt.value === value ? C.primary : C.textPrimary,
                background: opt.value === value ? '#f5f5ff' : 'transparent',
                fontWeight: opt.value === value ? 500 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = '#f8f8ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = opt.value === value ? '#f5f5ff' : 'transparent'; }}
            >
              {opt.label}
              {opt.value === value && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Card wrapper
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; danger?: boolean }> = ({ children, style, danger }) => (
  <div style={{
    background: C.bgContent, borderRadius: 14, overflow: 'hidden', marginBottom: 20,
    border: `1px solid ${danger ? '#fcc' : C.border}`,
    ...style,
  }}>
    {children}
  </div>
);

// Row inside card
const Row: React.FC<{ children: React.ReactNode; last?: boolean; style?: React.CSSProperties }> = ({ children, last, style }) => (
  <div style={{
    padding: '16px 20px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16,
    borderBottom: last ? 'none' : `1px solid ${C.border}`,
    ...style,
  }}>
    {children}
  </div>
);

const RowLabel: React.FC<{ label: string; desc?: string }> = ({ label, desc }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{label}</div>
    {desc && <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginTop: 2 }}>{desc}</div>}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '16px 12px 6px' }}>
    {children}
  </div>
);

const PageHeader: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div style={{ marginBottom: 32 }}>
    <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>{title}</h1>
    <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>{desc}</p>
  </div>
);

// ─── Sub-pages ────────────────────────────────────────────────────────────────

const ProfilePage: React.FC<{ user: any; updateProfile: (p: any) => void; showToast: (m?: string) => void }> = ({ user, updateProfile, showToast }) => {
  const [firstName, setFirstName] = useState(user.name?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(user.name?.split(' ')[1] ?? '');
  const [username, setUsername] = useState(user.name ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const base64 = await compressImage(e.target.files[0]);
      updateProfile({ avatarUrl: base64 });
      showToast('头像已更新');
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="个人信息" desc="管理您的基本个人资料信息" />
      <Card>
        <Row>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                  : <span style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{(user.name ?? 'U')[0].toUpperCase()}</span>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 4 }}>头像</div>
              <div style={{ fontSize: 13, color: C.textSecondary }}>将显示在您的公开主页上。</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => fileInputRef.current?.click()}>上传新头像</Btn>
            <Btn variant="danger" onClick={() => { updateProfile({ avatarUrl: '' }); showToast('头像已移除'); }}>移除</Btn>
          </div>
        </Row>
      </Card>

      <Card>
        <Row>
          <RowLabel label="姓名" />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input value={firstName} onChange={setFirstName} placeholder="名" style={{ width: 160 }} />
            <Input value={lastName} onChange={setLastName} placeholder="姓" style={{ width: 160 }} />
          </div>
        </Row>
        <Row>
          <RowLabel label="用户名" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Input value={username} onChange={setUsername} style={{ width: 220 }} />
            <Btn onClick={() => { updateProfile({ name: username }); showToast('用户名已更新'); }}>修改用户名</Btn>
          </div>
        </Row>
        <Row last>
          <RowLabel label="邮箱" desc="登录邮箱，无法直接修改" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input value={user.email ?? 'user@example.com'} readOnly style={{ width: 240 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6 }}>已验证</span>
          </div>
        </Row>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="primary" onClick={() => { updateProfile({ name: `${firstName} ${lastName}`.trim() || username }); showToast(); }}>保存更改</Btn>
      </div>
    </div>
  );
};

const PublicProfilePage: React.FC<{ showToast: (m?: string) => void }> = ({ showToast }) => {
  const [socials, setSocials] = useState({ wechat: '', bilibili: '', douyin: '', weibo: '', website: '' });
  const set = (k: string) => (v: string) => setSocials(s => ({ ...s, [k]: v }));
  const platforms = [
    { key: 'wechat', label: '微信', placeholder: 'wxid...' },
    { key: 'bilibili', label: '哔哩哔哩', placeholder: 'space.bilibili.com/...' },
    { key: 'douyin', label: '抖音', placeholder: '@username' },
    { key: 'weibo', label: '微博', placeholder: 'weibo.com/...' },
    { key: 'website', label: '个人网站', placeholder: 'https://...' },
  ];
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="公开主页" desc="管理您的社交账号和公开信息" />
      <Card>
        {platforms.map((p, i) => (
          <Row key={p.key} last={i === platforms.length - 1}>
            <RowLabel label={p.label} />
            <Input value={(socials as any)[p.key]} onChange={set(p.key)} placeholder={p.placeholder} style={{ width: 280 }} />
          </Row>
        ))}
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="primary" onClick={() => showToast()}>保存更改</Btn>
      </div>
    </div>
  );
};

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
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="账户设置" desc="管理您的账户偏好和交易控制选项" />

      <div style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>账户偏好</div>
      <Card>
        <Row>
          <RowLabel label="默认账户" desc="新交易记录默认归属的账户" />
          <Select value={defaultAccount} onChange={setDefaultAccount} options={[{ value: 'main', label: '主账户' }, { value: 'demo', label: '演示账户' }]} style={{ width: 200 }} />
        </Row>
        <Row>
          <RowLabel label="账户货币" desc="用于计算盈亏的基础货币" />
          <Select value={currency} onChange={setCurrency} options={[{ value: 'USD', label: 'USD 美元' }, { value: 'CNY', label: 'CNY 人民币' }, { value: 'USDT', label: 'USDT' }]} style={{ width: 200 }} />
        </Row>
        <Row last>
          <RowLabel label="账户时区" desc="交易时间戳使用的时区" />
          <Select value={timezone} onChange={setTimezone} options={[{ value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' }, { value: 'UTC', label: 'UTC' }, { value: 'America/New_York', label: '美东时间 (UTC-5)' }]} style={{ width: 240 }} />
        </Row>
      </Card>

      <div style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>交易控制</div>
      <Card>
        <Row last>
          <RowLabel label="启用交易权限清单检查" desc="开启后，每次交易前将自动检查您的权限清单条件" />
          <Toggle value={enableChecklist} onChange={handleToggleChecklist} />
        </Row>
      </Card>

      <div style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>危险操作</div>
      <Card danger>
        <Row last>
          <RowLabel label="删除账户" desc="永久删除您的 TradeGrail 账户及所有数据，此操作不可撤销。" />
          <Btn variant="danger">删除账户</Btn>
        </Row>
      </Card>
    </div>
  );
};

const TradeSettingsPage: React.FC<{ showToast: (m?: string) => void }> = ({ showToast }) => {
  const [positionMethod, setPositionMethod] = useState('fixed');
  const [riskRatio, setRiskRatio] = useState('1');
  const [maxTradeLoss, setMaxTradeLoss] = useState('');
  const [maxDailyLoss, setMaxDailyLoss] = useState('');
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="交易参数" desc="设置默认的仓位计算和风险控制参数" />
      <Card>
        <Row>
          <RowLabel label="默认仓位计算方式" />
          <Select value={positionMethod} onChange={setPositionMethod} options={[{ value: 'fixed', label: '固定金额' }, { value: 'percent', label: '账户百分比' }, { value: 'risk', label: '风险比例' }]} style={{ width: 200 }} />
        </Row>
        <Row>
          <RowLabel label="默认风险比例" desc="每笔交易占账户的最大风险百分比" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Input value={riskRatio} onChange={setRiskRatio} style={{ width: 80 }} />
            <span style={{ fontSize: 14, color: C.textSecondary }}>%</span>
          </div>
        </Row>
        <Row>
          <RowLabel label="最大单笔亏损限制" />
          <Input value={maxTradeLoss} onChange={setMaxTradeLoss} placeholder="0.00" style={{ width: 140 }} />
        </Row>
        <Row last>
          <RowLabel label="每日最大亏损限制" />
          <Input value={maxDailyLoss} onChange={setMaxDailyLoss} placeholder="0.00" style={{ width: 140 }} />
        </Row>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="primary" onClick={() => showToast()}>保存更改</Btn>
      </div>
    </div>
  );
};

const PtSlPage: React.FC<{ showToast: (m?: string) => void }> = ({ showToast }) => {
  const [tpMethod, setTpMethod] = useState('fixed');
  const [slMethod, setSlMethod] = useState('fixed');
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');
  const methods = [{ value: 'fixed', label: '固定点数' }, { value: 'percent', label: '百分比' }, { value: 'risk', label: '风险比' }];
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="止盈止损设置" desc="配置默认的止盈止损计算方式" />
      <Card>
        <Row><RowLabel label="止盈计算方式" /><Select value={tpMethod} onChange={setTpMethod} options={methods} style={{ width: 180 }} /></Row>
        <Row><RowLabel label="默认止盈值" /><Input value={tpValue} onChange={setTpValue} placeholder="0.00" style={{ width: 140 }} /></Row>
        <Row><RowLabel label="止损计算方式" /><Select value={slMethod} onChange={setSlMethod} options={methods} style={{ width: 180 }} /></Row>
        <Row last><RowLabel label="默认止损值" /><Input value={slValue} onChange={setSlValue} placeholder="0.00" style={{ width: 140 }} /></Row>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn variant="primary" onClick={() => showToast()}>保存更改</Btn></div>
    </div>
  );
};

const CommissionsPage: React.FC<{ showToast: (m?: string) => void }> = ({ showToast }) => {
  const [method, setMethod] = useState('fixed');
  const [rate, setRate] = useState('');
  const [includeTax, setIncludeTax] = useState(false);
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="手续费设置" desc="配置交易手续费的计算方式" />
      <Card>
        <Row><RowLabel label="手续费计算方式" /><Select value={method} onChange={setMethod} options={[{ value: 'fixed', label: '每手固定' }, { value: 'percent', label: '按百分比' }]} style={{ width: 180 }} /></Row>
        <Row><RowLabel label="默认手续费率" /><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Input value={rate} onChange={setRate} placeholder="0.00" style={{ width: 100 }} /><span style={{ fontSize: 14, color: C.textSecondary }}>{method === 'percent' ? '%' : '元/手'}</span></div></Row>
        <Row last><RowLabel label="是否含税" desc="手续费金额是否已包含税费" /><Toggle value={includeTax} onChange={setIncludeTax} /></Row>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn variant="primary" onClick={() => showToast()}>保存更改</Btn></div>
    </div>
  );
};

const TagsPage: React.FC = () => {
  const COLORS = ['#5b5bd6','#e05555','#16a34a','#d97706','#0891b2','#7c3aed','#db2777'];
  const [tags, setTags] = useState([{ id: '1', name: '趋势交易', color: '#5b5bd6' }, { id: '2', name: '突破', color: '#16a34a' }, { id: '3', name: '反转', color: '#e05555' }]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="标签管理" desc="管理您的交易标签，用于分类和筛选交易记录" />
      <Card>
        {tags.map((tag, i) => (
          <Row key={tag.id} last={i === tags.length - 1 && !adding}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: C.textPrimary }}>{tag.name}</span>
            </div>
            <Btn variant="danger" onClick={() => setTags(t => t.filter(x => x.id !== tag.id))}>删除</Btn>
          </Row>
        ))}
        {adding && (
          <Row last>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setNewColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? `2px solid ${C.textPrimary}` : '2px solid transparent' }} />
              ))}
              <Input value={newName} onChange={setNewName} placeholder="标签名称" style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" onClick={() => { if (newName.trim()) { setTags(t => [...t, { id: Date.now().toString(), name: newName.trim(), color: newColor }]); setNewName(''); setAdding(false); } }}>添加</Btn>
              <Btn onClick={() => setAdding(false)}>取消</Btn>
            </div>
          </Row>
        )}
      </Card>
      {!adding && <Btn onClick={() => setAdding(true)}>+ 新增标签</Btn>}
    </div>
  );
};

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
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="消息提醒" desc="管理您希望接收的通知类型" />
      <Card>
        {items.map((item, i) => (
          <Row key={item.key} last={i === items.length - 1}>
            <RowLabel label={item.label} desc={item.desc} />
            <Toggle value={vals[item.key]} onChange={v => { setVals(s => ({ ...s, [item.key]: v })); showToast(v ? `${item.label}已开启` : `${item.label}已关闭`); }} />
          </Row>
        ))}
      </Card>
    </div>
  );
};

const SubscriptionPage: React.FC = () => {
  const plans = [
    { id: 'free', name: '免费版', price: '¥0', period: '/月', features: ['最多 100 笔交易记录', '基础统计分析', '1 个经纪商连接'], current: false },
    { id: 'pro', name: 'Pro 版', price: '¥68', period: '/月', features: ['无限交易记录', '高级 AI 分析', '无限经纪商连接', '优先客服支持'], current: true },
    { id: 'team', name: '团队版', price: '¥198', period: '/月', features: ['包含所有 Pro 功能', '最多 5 个成员', '团队数据共享', '专属客户经理'], current: false },
  ];
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="订阅方案" desc="管理您的 TradeGrail 订阅" />
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{
            flex: 1, borderRadius: 14, padding: '20px 16px',
            border: plan.current ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
            background: plan.current ? '#faf8ff' : '#fff',
            position: 'relative',
          }}>
            {plan.current && <div style={{ position: 'absolute', top: -1, right: 12, background: C.primary, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: '0 0 6px 6px' }}>当前方案</div>}
            <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: plan.current ? C.primary : C.textPrimary, marginBottom: 12 }}>{plan.price}<span style={{ fontSize: 13, fontWeight: 400, color: C.textSecondary }}>{plan.period}</span></div>
            {plan.features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span style={{ fontSize: 13, color: C.textSecondary }}>{f}</span>
              </div>
            ))}
            {!plan.current && <Btn variant={plan.id === 'team' ? 'secondary' : 'primary'} style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>{plan.id === 'free' ? '降级' : '升级'}</Btn>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ImportHistoryPage: React.FC = () => {
  const records = [
    { time: '2026-04-14 10:23', broker: 'Binance', method: '自动同步', count: 142, status: 'success' },
    { time: '2026-04-10 08:15', broker: 'OKX', method: '上传文件', count: 87, status: 'success' },
    { time: '2026-04-05 14:30', broker: 'Bitget', method: '自动同步', count: 0, status: 'failed' },
  ];
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="导入历史" desc="查看所有历史交易数据导入记录" />
      <Card>
        <Row style={{ background: '#faf8ff' }}>
          {['导入时间', '经纪商', '导入方式', '记录数量', '状态', ''].map((h, i) => (
            <div key={i} style={{ flex: i === 0 ? 2 : 1, fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </Row>
        {records.map((r, i) => (
          <Row key={i} last={i === records.length - 1}>
            <div style={{ flex: 2, fontSize: 13, color: C.textSecondary }}>{r.time}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{r.broker}</div>
            <div style={{ flex: 1, fontSize: 13, color: C.textSecondary }}>{r.method}</div>
            <div style={{ flex: 1, fontSize: 14, color: C.textPrimary }}>{r.count}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: r.status === 'success' ? '#f0fdf4' : '#fff0f0', color: r.status === 'success' ? '#16a34a' : C.danger, border: `1px solid ${r.status === 'success' ? '#bbf7d0' : '#fcc'}` }}>
                {r.status === 'success' ? '成功' : '失败'}
              </span>
            </div>
            <div style={{ flex: 1 }}><button style={{ background: 'none', border: 'none', color: C.primary, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>查看详情</button></div>
          </Row>
        ))}
      </Card>
    </div>
  );
};

const PlaceholderPage: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div style={{ maxWidth: 680 }}>
    <PageHeader title={title} desc={desc} />
    <Card>
      <Row last>
        <div style={{ width: '100%', textAlign: 'center', padding: '40px 0', color: C.textTertiary, fontSize: 14 }}>
          此功能正在建设中，敬请期待
        </div>
      </Row>
    </Card>
  </div>
);

// ─── Nav icons ────────────────────────────────────────────────────────────────
const NavIcons: Record<string, React.ReactNode> = {
  profile: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  publicProfile: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>,
  security: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  account: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>,
  brokers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  devices: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  tradeSettings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>,
  ptsl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
  commissions: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  tags: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  global: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  importHistory: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  logHistory: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  subscription: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  billing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  notifications: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
};

// ─── Nav structure ────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { label: '个人资料', items: [
    { id: 'profile', label: '个人信息' },
    { id: 'publicProfile', label: '公开主页' },
    { id: 'security', label: '安全设置' },
  ]},
  { label: '账户', items: [
    { id: 'account', label: '账户设置' },
    { id: 'brokers', label: '经纪商账户' },
    { id: 'devices', label: '登录设备' },
  ]},
  { label: '交易设置', items: [
    { id: 'tradeSettings', label: '交易参数' },
    { id: 'ptsl', label: '止盈止损设置' },
    { id: 'commissions', label: '手续费设置' },
    { id: 'tags', label: '标签管理' },
    { id: 'global', label: '全局设置' },
  ]},
  { label: '数据与历史', items: [
    { id: 'importHistory', label: '导入历史' },
    { id: 'logHistory', label: '日志历史' },
  ]},
  { label: '订阅与账单', items: [
    { id: 'subscription', label: '订阅方案' },
    { id: 'billing', label: '支付方式' },
    { id: 'logHistory', label: '账单记录' },
  ]},
  { label: '通知', items: [
    { id: 'notifications', label: '消息提醒' },
  ]},
];

// ─── Main SettingsPage ────────────────────────────────────────────────────────
interface SettingsPageProps {
  onImportTrades?: (trades: Trade[]) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onImportTrades }) => {
  const { user, updateProfile } = useUser();
  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg = '设置保存成功') => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfilePage user={user} updateProfile={updateProfile} showToast={showToast} />;
      case 'publicProfile': return <PublicProfilePage showToast={showToast} />;
      case 'account': return <AccountPage showToast={showToast} />;
      case 'tradeSettings': return <TradeSettingsPage showToast={showToast} />;
      case 'ptsl': return <PtSlPage showToast={showToast} />;
      case 'commissions': return <CommissionsPage showToast={showToast} />;
      case 'tags': return <TagsPage />;
      case 'notifications': return <NotificationsPage showToast={showToast} />;
      case 'subscription': return <SubscriptionPage />;
      case 'importHistory': return <ImportHistoryPage />;
      case 'security': return <PlaceholderPage title="安全设置" desc="管理您的密码和两步验证" />;
      case 'brokers': return <PlaceholderPage title="经纪商账户" desc="管理已连接的经纪商账户" />;
      case 'devices': return <PlaceholderPage title="登录设备" desc="查看和管理已登录的设备" />;
      case 'global': return <PlaceholderPage title="全局设置" desc="配置全局显示和行为偏好" />;
      case 'logHistory': return <PlaceholderPage title="日志历史" desc="查看系统操作日志" />;
      case 'billing': return <PlaceholderPage title="支付方式与账单" desc="管理支付方式和查看账单记录" />;
      default: return <ProfilePage user={user} updateProfile={updateProfile} showToast={showToast} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: C.bgPage, overflow: 'hidden' }}>

      {/* Left nav */}
      <div style={{
        width: 220, flexShrink: 0, background: C.bgNav,
        borderRight: `1px solid ${C.border}`,
        padding: '20px 12px', overflowY: 'auto',
      }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <SectionTitle>{group.label}</SectionTitle>
            {group.items.map(item => {
              const isActive = activeSection === item.id;
              return (
                <div key={item.id} onClick={() => setActiveSection(item.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 14, marginBottom: 2,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? C.primary : C.textSecondary,
                    background: isActive ? C.primaryLight : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(91,91,214,0.06)'; e.currentTarget.style.color = C.textPrimary; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; } }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{NavIcons[item.id]}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '40px 48px', background: C.bgPage }}>
        {renderContent()}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', color: '#fff', fontSize: 14, fontWeight: 500,
          padding: '10px 20px', borderRadius: 10, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          {toast}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
