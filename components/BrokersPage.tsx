import React, { useState, useRef, useEffect } from 'react';
import { TradingAccount } from '../types';

interface Props {
  accounts?: TradingAccount[];
  userPlan?: 'free' | 'pro' | 'elite';
  onAddAccount?: () => void;
  onEditAccount?: (id: string) => void;
  onDeleteAccount?: (id: string) => void;
  onSyncAccount?: (id: string) => void;
  onUpdateAccount?: (id: string, updates: { manualBalance?: number | null; balance?: number }) => void;
  onClearTrades?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  onUpgrade?: () => void;
}

const PLAN_LIMITS = { free: 1, pro: 3, elite: Infinity };

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
const IconClear = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c04040" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const IconBalance = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a2a40" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);

// ─── Row menu ─────────────────────────────────────────────────────────────────
const RowMenu: React.FC<{
  account: TradingAccount;
  onEdit?: () => void;
  onDelete?: () => void;
  onSync?: () => void;
  onHistory?: () => void;
  onClearTrades?: () => void;
  onEditBalance?: () => void;
}> = ({ account, onEdit, onDelete, onSync, onHistory, onClearTrades, onEditBalance }) => {
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
          <MenuItem icon={<IconBalance />} label="编辑余额" onClick={onEditBalance} />
          <MenuItem icon={<IconHistory />} label="查看导入历史" onClick={onHistory} />
          {account.type === 'auto_sync' && (
            <MenuItem icon={<IconLink />} label="重新连接" onClick={() => {}} />
          )}
          <div style={{ borderTop: '1px solid #f0edf8', margin: '4px 0' }} />
          <MenuItem icon={<IconClear />} label="清除交易" danger onClick={onClearTrades} />
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

// ─── Clear Trades Modal ───────────────────────────────────────────────────────
const ClearTradesModal: React.FC<{
  accountName: string;
  accountId: string;
  onClose: () => void;
  onConfirm: (accountId: string) => Promise<void>;
}> = ({ accountName, accountId, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const canConfirm = inputValue === '清除所有交易';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm(accountId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,35,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', border: '0.5px solid #e4e4ef', borderRadius: 10, width: 400, animation: 'clearModalIn 0.15s ease forwards' }}
      >
        <style>{`@keyframes clearModalIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: '22px 22px 18px', borderBottom: '0.5px solid #f0f0f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e' }}>清除交易记录</span>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ cursor: 'pointer', opacity: 0.4 }} onClick={onClose}>
              <line x1="1.5" y1="1.5" x2="11.5" y2="11.5" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11.5" y1="1.5" x2="1.5" y2="11.5" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, margin: 0 }}>
            <span style={{ color: '#c0392b', fontWeight: 500 }}>此操作无法撤销</span>，将清除{' '}
            <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{accountName}</span>{' '}
            账户下所有交易记录、标签与备注。
          </p>
        </div>

        {/* Input */}
        <div style={{ padding: '16px 22px 18px' }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>请输入「清除所有交易」以确认</div>
          <input
            autoFocus
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="清除所有交易"
            style={{ width: '100%', border: '0.5px solid #e4e4ef', borderRadius: 6, padding: '8px 11px', fontSize: 13, color: '#1a1a2e', outline: 'none', background: '#fff', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#9b8fde')}
            onBlur={e => (e.target.style.borderColor = '#e4e4ef')}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          />
        </div>

        {/* Buttons */}
        <div style={{ padding: '0 22px 18px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#fff', border: '0.5px solid #e4e4ef', borderRadius: 6, padding: '7px 14px', fontSize: 13, color: '#666', cursor: 'pointer' }}>
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            style={{ background: canConfirm ? '#5050c8' : '#f0f0f5', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, color: canConfirm ? '#fff' : '#bbb', cursor: canConfirm && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
          >
            {loading ? '清除中...' : '确认清除'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Type badge ───────────────────────────────────────────────────────────────
const TypeBadge: React.FC<{ account: TradingAccount }> = ({ account }) => {
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
  onUpdateAccount,
}) => {
  const [accounts, setAccounts] = useState<TradingAccount[]>(propAccounts ?? []);
  const [addBtnHov, setAddBtnHov] = useState(false);
  const [syncBtnHov, setSyncBtnHov] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [manualBalanceInput, setManualBalanceInput] = useState('');
  const [clearModal, setClearModal] = useState<{ id: string; name: string } | null>(null);

  // 当父组件传入新账户数据时同步更新（连接成功后刷新）
  React.useEffect(() => {
    if (propAccounts !== undefined) setAccounts(propAccounts);
  }, [propAccounts]);

  const realAccounts = accounts.filter(a => a.type !== 'demo');
  const limit = PLAN_LIMITS[userPlan];
  const isAtLimit = realAccounts.length >= limit;

  const handleDelete = (id: string) => {
    setAccounts(a => a.filter(x => x.id !== id));
    setSelectedIds(s => s.filter(x => x !== id));
    onDeleteAccount?.(id);
  };

  const handleOpenEdit = (account: TradingAccount) => {
    setEditingAccount(account);
    setManualBalanceInput(account.manualBalance != null ? String(account.manualBalance) : '');
  };

  const handleSaveManualBalance = () => {
    if (!editingAccount) return;
    const val = manualBalanceInput.trim() === '' ? null : parseFloat(manualBalanceInput);
    const updated = { ...editingAccount, manualBalance: val ?? undefined };
    setAccounts(a => a.map(x => x.id === editingAccount.id ? updated : x));
    onUpdateAccount?.(editingAccount.id, { manualBalance: val });
    setEditingAccount(null);
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === accounts.length ? [] : accounts.map(a => a.id));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const COLS = ['账户名称', '经纪商', '余额', '盈利计算方式', '最后更新', '下次更新', '类型', '操作'];
  const COL_WIDTHS = [220, 180, 120, 160, 180, 180, 120, 80];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>

      {/* Page title */}
      <div style={{ padding: '28px 40px 20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>我的交易账户</h1>
      </div>

      {/* Top bar */}
      <div style={{
        height: 52, borderBottom: '1px solid #f0edf8', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a style={{ fontSize: 12, color: '#8080b8', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            了解更多
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            disabled={selectedIds.length === 0}
            onMouseEnter={() => selectedIds.length > 0 && setSyncBtnHov(true)}
            onMouseLeave={() => setSyncBtnHov(false)}
            onClick={() => selectedIds.forEach(id => onSyncAccount?.(id))}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: '1px solid #e4e0f4', transition: 'all 0.14s',
              background: selectedIds.length > 0 ? (syncBtnHov ? '#f5f2fc' : '#ffffff') : '#f5f3fc',
              color: selectedIds.length > 0 ? '#5050a0' : '#b0a8d0',
              cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            同步已选
          </button>
          {isAtLimit && userPlan !== 'elite' && (
            <div style={{
              fontSize: 12, color: '#8080b8', background: '#f5f3fc',
              border: '1px solid #e4e0f4', borderRadius: 8, padding: '5px 12px',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
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
            <button onClick={onAddAccount} style={{ marginTop: 8, height: 34, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: '#5050c8', color: '#fff', cursor: 'pointer' }}>
              + 添加账户
            </button>
          </div>
        ) : (
          <>
            {/* Group label */}
            <div style={{ padding: '16px 40px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4a4a6a' }}>活跃账户</span>
              <span style={{ fontSize: 12, color: '#b0aac8' }}>共 {accounts.length} 个账户</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ height: 38, borderBottom: '1px solid #f0edf8', background: '#faf8ff' }}>
                  <th style={{ width: 40, padding: '0 0 0 40px' }}>
                    <input type="checkbox" checked={selectedIds.length === accounts.length && accounts.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer', accentColor: '#5050c8' }} />
                  </th>
                  {COLS.map((col, i) => (
                    <th key={col} style={{ padding: '0 16px', fontSize: 11, fontWeight: 600, color: '#b0aac8', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap', width: COL_WIDTHS[i] }}>
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
                    selected={selectedIds.includes(account.id)}
                    onToggleSelect={() => handleToggleSelect(account.id)}
                    onEdit={() => account.type === 'manual' ? handleOpenEdit(account) : onEditAccount?.(account.id)}
                    onDelete={() => handleDelete(account.id)}
                    onSync={() => onSyncAccount?.(account.id)}
                    onHistory={() => onViewHistory?.(account.id)}
                    onClearTrades={() => setClearModal({ id: account.id, name: account.name })}
                    onEditBalance={(newBalance) => {
                      setAccounts(a => a.map(x => x.id === account.id ? { ...x, balance: newBalance } : x));
                      onUpdateAccount?.(account.id, { balance: newBalance });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Manual Balance Edit Modal */}
      {editingAccount && editingAccount.type === 'manual' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditingAccount(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', margin: '0 0 4px' }}>{editingAccount.name}</h3>
            <p style={{ fontSize: 12, color: '#b0aac8', margin: '0 0 20px' }}>手动账户设置</p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2a2a40', marginBottom: 6 }}>账户总资产</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input
                type="number" step="any" placeholder="请输入账户总资产"
                value={manualBalanceInput}
                onChange={e => setManualBalanceInput(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e4e0f4', borderRadius: 8, fontSize: 14, color: '#1a1a2e', outline: 'none' }}
                autoFocus
              />
              <span style={{ fontSize: 13, color: '#8080a8', flexShrink: 0 }}>{editingAccount.currency}</span>
            </div>
            <p style={{ fontSize: 12, color: '#b0aac8', margin: '0 0 20px', lineHeight: 1.5 }}>
              用于计算仓位占比和风险评级，建议与实际账户资金保持一致
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingAccount(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e4e0f4', background: '#fff', color: '#8080a8', fontSize: 13, cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={handleSaveManualBalance}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#5050c8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Trades Modal */}
      {clearModal && (
        <ClearTradesModal
          accountName={clearModal.name}
          accountId={clearModal.id}
          onClose={() => setClearModal(null)}
          onConfirm={async (id) => {
            await onClearTrades?.(id);
          }}
        />
      )}
    </div>
  );
};

// ─── Account row ──────────────────────────────────────────────────────────────
const AccountRow: React.FC<{
  account: TradingAccount;
  selected?: boolean;
  onToggleSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSync?: () => void;
  onHistory?: () => void;
  onClearTrades?: () => void;
  onEditBalance?: (newBalance: number) => void;
}> = ({ account, selected, onToggleSelect, onEdit, onDelete, onSync, onHistory, onClearTrades, onEditBalance }) => {
  const [hov, setHov] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;

  const brokerName = account.exchange || account.name;

  return (
    <tr
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ height: 52, borderBottom: '1px solid #f5f2fc', background: selected ? '#f5f2ff' : (hov ? '#faf8ff' : '#ffffff'), transition: 'background 0.12s' }}
    >
      {/* Checkbox */}
      <td style={{ padding: '0 0 0 40px', verticalAlign: 'middle' }}>
        <input type="checkbox" checked={!!selected} onChange={onToggleSelect} style={{ cursor: 'pointer', accentColor: '#5050c8' }} />
      </td>

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
              ? <img src={account.brokerLogoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={brokerName} />
              : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{brokerName[0]}</span>
            }
          </div>
          <span style={{ color: '#2a2a40' }}>{brokerName}</span>
        </div>
      </td>

      {/* Balance */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        {editingBalance ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" step="any" autoFocus
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = parseFloat(balanceInput);
                  if (!isNaN(val)) onEditBalance?.(val);
                  setEditingBalance(false);
                }
                if (e.key === 'Escape') setEditingBalance(false);
              }}
              onBlur={() => {
                const val = parseFloat(balanceInput);
                if (!isNaN(val)) onEditBalance?.(val);
                setEditingBalance(false);
              }}
              style={{ width: 100, padding: '3px 8px', border: '1px solid #5050c8', borderRadius: 6, fontSize: 13, color: '#1a1a2e', outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: '#8080a8' }}>{account.currency}</span>
          </div>
        ) : (
          <span style={{ color: '#5050c8', fontWeight: 500 }}>
            {fmt(account.balance, account.currency)}
          </span>
        )}
      </td>

      {/* Profit method */}
      <td style={{ padding: '0 16px', color: '#6060a0', verticalAlign: 'middle' }}>
        {account.profitMethod}
      </td>

      {/* Last update */}
      <td style={{ padding: '0 16px', color: '#8080a8', fontSize: 12, verticalAlign: 'middle' }}>
        {account.lastSync ?? <span style={{ color: '#c0bcd8' }}>—</span>}
      </td>

      {/* Next update */}
      <td style={{ padding: '0 16px', color: '#8080a8', fontSize: 12, verticalAlign: 'middle' }}>
        {account.nextSync && account.nextSync !== '—'
          ? account.nextSync
          : <span style={{ color: '#c0bcd8' }}>—</span>
        }
      </td>

      {/* Type */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <TypeBadge account={account} />
      </td>

      {/* Actions */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <RowMenu
          account={account} onEdit={onEdit} onDelete={onDelete} onSync={onSync} onHistory={onHistory}
          onClearTrades={onClearTrades}
          onEditBalance={() => { setBalanceInput(String(account.balance)); setEditingBalance(true); }}
        />
      </td>
    </tr>
  );
};

export default BrokersPage;
