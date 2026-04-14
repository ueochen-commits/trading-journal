import React, { useState, useRef, useEffect } from 'react';

interface Account {
  id: string;
  name: string;
  brokerName: string;
  brokerLogoUrl?: string;
  brokerBrandColor?: string;
  balance: number;
  currency: string;
  profitMethod: 'FIFO' | 'LIFO' | 'WAVG';
  lastUpdate?: string;
  nextUpdate?: string;
  type: 'demo' | 'auto_sync' | 'manual';
  syncStatus?: 'synced' | 'syncing' | 'error';
}

interface Props {
  accounts?: Account[];
  userPlan?: 'free' | 'pro' | 'elite';
  onAddAccount?: () => void;
  onEditAccount?: (id: string) => void;
  onDeleteAccount?: (id: string) => void;
  onSyncAccount?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  onUpgrade?: () => void;
}

const PLAN_LIMITS = { free: 1, pro: 3, elite: Infinity };

const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'demo-1', name: 'Demo 账户', brokerName: 'TradeGrail',
    brokerBrandColor: '#5050c8', balance: 10000, currency: 'USD',
    profitMethod: 'FIFO', lastUpdate: '2026-04-15 10:23', nextUpdate: '—',
    type: 'demo', syncStatus: 'synced',
  },
  {
    id: 'binance-1', name: 'Binance 主账户', brokerName: 'Binance',
    brokerLogoUrl: '/exchanges/binance.png', brokerBrandColor: '#f5a500',
    balance: 24680.5, currency: 'USDT', profitMethod: 'FIFO',
    lastUpdate: '2026-04-15 09:00', nextUpdate: '2026-04-15 21:00',
    type: 'auto_sync', syncStatus: 'synced',
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconRefresh = ({ color = '#8080b8' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
);
const IconDots = ({ color = '#8080b8' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a2a40" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconHistory = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a2a40" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconLink = ({ color = '#2a2a40' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c04040" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const IconQuestion = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8080b8" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0cce8" strokeWidth="1.5" strokeLinecap="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);

// ─── Row menu ─────────────────────────────────────────────────────────────────
const RowMenu: React.FC<{
  account: Account;
  onEdit?: () => void;
  onDelete?: () => void;
  onSync?: () => void;
  onHistory?: () => void;
}> = ({ account, onEdit, onDelete, onSync, onHistory }) => {
  const [open, setOpen] = useState(false);
  const [syncHov, setSyncHov] = useState(false);
  const [dotsHov, setDotsHov] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const MenuItem: React.FC<{
    icon: React.ReactNode; label: string;
    onClick?: () => void; danger?: boolean; disabled?: boolean; title?: string;
  }> = ({ icon, label, onClick, danger, disabled, title }) => {
    const [hov, setHov] = useState(false);
    return (
      <div
        title={title}
        onClick={disabled ? undefined : () => { onClick?.(); setOpen(false); }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          padding: '8px 12px', borderRadius: 7, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
          background: hov && !disabled ? (danger ? '#fff0f0' : '#f5f2fc') : 'transparent',
          color: disabled ? '#c0bcd8' : (danger ? '#c04040' : '#2a2a40'),
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon}{label}
      </div>
    );
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
      {account.type === 'auto_sync' && (
        <button
          onClick={() => onSync?.()}
          onMouseEnter={() => setSyncHov(true)} onMouseLeave={() => setSyncHov(false)}
          title="立即同步"
          style={{
            width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: syncHov ? '#f0edf8' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
          }}
        >
          <IconRefresh color={syncHov ? '#5050c8' : '#8080b8'} />
        </button>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setDotsHov(true)} onMouseLeave={() => setDotsHov(false)}
        style={{
          width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
          background: open || dotsHov ? '#f0edf8' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
        }}
      >
        <IconDots color={open || dotsHov ? '#5050c8' : '#8080b8'} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100,
          background: '#ffffff', border: '1px solid #e8e4f4',
          borderRadius: 10, boxShadow: '0 4px 20px rgba(80,80,160,0.12)',
          padding: 6, minWidth: 160, marginTop: 4,
        }}>
          <MenuItem icon={<IconEdit />} label="编辑账户" onClick={onEdit} />
          <MenuItem icon={<IconHistory />} label="查看导入历史" onClick={onHistory} />
          {account.type === 'auto_sync' && (
            <MenuItem icon={<IconLink />} label="重新连接" onClick={() => {}} />
          )}
          <div style={{ borderTop: '1px solid #f0edf8', margin: '4px 0' }} />
          <MenuItem
            icon={<IconTrash />} label="删除账户" danger
            onClick={onDelete}
            disabled={account.type === 'demo'}
            title={account.type === 'demo' ? 'Demo 账户无法删除' : undefined}
          />
        </div>
      )}
    </div>
  );
};

// ─── Type badge ───────────────────────────────────────────────────────────────
const TypeBadge: React.FC<{ account: Account }> = ({ account }) => {
  if (account.type === 'demo') {
    return <span style={{ background: '#f0eeff', color: '#5050a0', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>演示</span>;
  }
  if (account.type === 'manual') {
    return <span style={{ color: '#8080a8', fontSize: 12 }}>手动</span>;
  }
  const statusMap = {
    synced: { bg: '#e8f7ee', color: '#1a7a42', label: '已同步' },
    syncing: { bg: '#f0eeff', color: '#8060c0', label: '同步中' },
    error: { bg: '#fff0f0', color: '#a03030', label: '错误' },
  };
  const s = statusMap[account.syncStatus ?? 'synced'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#6060a0', fontSize: 12 }}>Auto sync</span>
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const BrokersPage: React.FC<Props> = ({
  accounts: propAccounts,
  userPlan = 'free',
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onSyncAccount,
  onViewHistory,
  onUpgrade,
}) => {
  const [accounts, setAccounts] = useState<Account[]>(propAccounts ?? MOCK_ACCOUNTS);
  const [addBtnHov, setAddBtnHov] = useState(false);

  const realAccounts = accounts.filter(a => a.type !== 'demo');
  const limit = PLAN_LIMITS[userPlan];
  const isAtLimit = realAccounts.length >= limit;

  const handleDelete = (id: string) => {
    setAccounts(a => a.filter(x => x.id !== id));
    onDeleteAccount?.(id);
  };

  const COLS = ['账户名称', '经纪商', '余额', '盈利计算方式', '最后更新', '下次更新', '类型', '操作'];
  const COL_WIDTHS = [220, 180, 120, 160, 180, 180, 120, 80];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>

      {/* Top bar */}
      <div style={{
        height: 52, borderBottom: '1px solid #f0edf8', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>经纪商账户</span>
          <a style={{ fontSize: 12, color: '#8080b8', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <IconQuestion />了解更多
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAtLimit && userPlan !== 'elite' && (
            <div style={{
              fontSize: 12, color: '#8080b8', background: '#f5f3fc',
              border: '1px solid #e4e0f4', borderRadius: 8, padding: '5px 12px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              已达到 {limit} 个账户上限 —
              <span onClick={onUpgrade} style={{ color: '#5050c8', fontWeight: 600, cursor: 'pointer' }}>升级到 Pro ↗</span>
            </div>
          )}
          <button
            disabled={isAtLimit}
            onClick={isAtLimit ? undefined : onAddAccount}
            onMouseEnter={() => !isAtLimit && setAddBtnHov(true)}
            onMouseLeave={() => setAddBtnHov(false)}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none', transition: 'all 0.14s',
              background: isAtLimit ? '#d8d4f0' : (addBtnHov ? '#3e3eb6' : '#5050c8'),
              color: isAtLimit ? '#a8a8c8' : '#ffffff',
              cursor: isAtLimit ? 'not-allowed' : 'pointer',
              boxShadow: !isAtLimit && addBtnHov ? '0 2px 10px rgba(80,80,200,0.22)' : 'none',
            }}
          >
            + 添加账户
          </button>
        </div>
      </div>

      {/* Table area */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        {accounts.length === 0 ? (
          <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <IconEmpty />
            <div style={{ fontSize: 16, fontWeight: 500, color: '#6060a0' }}>还没有连接任何账户</div>
            <div style={{ fontSize: 13, color: '#a0a0b8' }}>添加您的第一个经纪商账户，开始追踪交易</div>
            <button
              onClick={onAddAccount}
              style={{ marginTop: 8, height: 34, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: '#5050c8', color: '#fff', cursor: 'pointer' }}
            >
              + 添加账户
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ height: 38, borderBottom: '1px solid #f0edf8', background: '#faf8ff' }}>
                {COLS.map((col, i) => (
                  <th key={col} style={{
                    padding: '0 16px', fontSize: 11, fontWeight: 600, color: '#b0aac8',
                    letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'left',
                    whiteSpace: 'nowrap', width: COL_WIDTHS[i],
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onEdit={() => onEditAccount?.(account.id)}
                  onDelete={() => handleDelete(account.id)}
                  onSync={() => onSyncAccount?.(account.id)}
                  onHistory={() => onViewHistory?.(account.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Account row ──────────────────────────────────────────────────────────────
const AccountRow: React.FC<{
  account: Account;
  onEdit?: () => void;
  onDelete?: () => void;
  onSync?: () => void;
  onHistory?: () => void;
}> = ({ account, onEdit, onDelete, onSync, onHistory }) => {
  const [hov, setHov] = useState(false);
  const [balHov, setBalHov] = useState(false);

  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;

  return (
    <tr
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ height: 52, borderBottom: '1px solid #f5f2fc', background: hov ? '#faf8ff' : '#ffffff', transition: 'background 0.12s' }}
    >
      {/* Name */}
      <td style={{ padding: '0 16px', color: '#1a1a2e', fontWeight: 500, verticalAlign: 'middle' }}>
        {account.name}
      </td>

      {/* Broker */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4, flexShrink: 0, overflow: 'hidden',
            background: account.brokerBrandColor ?? '#e0ddf0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {account.brokerLogoUrl
              ? <img src={account.brokerLogoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={account.brokerName} />
              : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{account.brokerName[0]}</span>
            }
          </div>
          <span style={{ color: '#2a2a40' }}>{account.brokerName}</span>
        </div>
      </td>

      {/* Balance */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <span
          onMouseEnter={() => setBalHov(true)} onMouseLeave={() => setBalHov(false)}
          style={{ color: '#5050c8', fontWeight: 500, cursor: 'pointer', textDecoration: balHov ? 'underline' : 'none' }}
        >
          {fmt(account.balance, account.currency)}
        </span>
      </td>

      {/* Profit method */}
      <td style={{ padding: '0 16px', color: '#6060a0', verticalAlign: 'middle' }}>
        {account.profitMethod}
      </td>

      {/* Last update */}
      <td style={{ padding: '0 16px', color: '#8080a8', fontSize: 12, verticalAlign: 'middle' }}>
        {account.lastUpdate ?? <span style={{ color: '#c0bcd8' }}>—</span>}
      </td>

      {/* Next update */}
      <td style={{ padding: '0 16px', color: '#8080a8', fontSize: 12, verticalAlign: 'middle' }}>
        {account.nextUpdate && account.nextUpdate !== '—'
          ? account.nextUpdate
          : <span style={{ color: '#c0bcd8' }}>—</span>
        }
      </td>

      {/* Type */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <TypeBadge account={account} />
      </td>

      {/* Actions */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <RowMenu account={account} onEdit={onEdit} onDelete={onDelete} onSync={onSync} onHistory={onHistory} />
      </td>
    </tr>
  );
};

export default BrokersPage;
