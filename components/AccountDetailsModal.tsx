import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface AccountDetails {
  name: string;
  balance: number;
  currency: string;
  broker?: string;
  manualBalance?: number | null;
}

interface Props {
  initial: AccountDetails;
  mode: 'create' | 'edit';
  showBroker?: boolean;
  showManualBalance?: boolean;
  synced?: boolean;
  onClose: () => void;
  onSave: (details: AccountDetails) => Promise<void>;
}

const AccountDetailsModal: React.FC<Props> = ({ initial, mode, showBroker, showManualBalance, synced, onClose, onSave }) => {
  const [name, setName] = useState(initial.name);
  const [balance, setBalance] = useState(String(initial.balance));
  const [currency, setCurrency] = useState(initial.currency);
  const [broker, setBroker] = useState(initial.broker || '');
  const [manualBalance, setManualBalance] = useState(initial.manualBalance == null ? '' : String(initial.manualBalance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const field = 'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!name.trim()) { setError('请输入账户名称'); return; }
    if (!balance.trim() || !Number.isFinite(Number(balance))) { setError('请输入有效的账户余额'); return; }
    if (!/^[A-Z][A-Z0-9]{2,9}$/.test(currency.trim().toUpperCase())) { setError('请输入有效的币种，例如 USD、CNY 或 USDT'); return; }
    if (showManualBalance && manualBalance.trim() && !Number.isFinite(Number(manualBalance))) { setError('请输入有效的总资产'); return; }
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), balance: Number(balance), currency: currency.trim().toUpperCase(),
        ...(showBroker ? { broker: broker.trim() } : {}),
        ...(showManualBalance ? { manualBalance: manualBalance.trim() ? Number(manualBalance) : null } : {}),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="account-details-title"
        className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="account-details-title" className="text-lg font-semibold">{mode === 'create' ? '创建手动交易账户' : '编辑账户'}</h2>
          <button type="button" aria-label="关闭账户设置" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        {mode === 'create' && <p className="mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">支持任意经纪商或交易平台，也可以不关联平台。创建后即可手动记录交易。</p>}
        <label className="mb-4 block text-sm font-medium">账户名称
          <input aria-label="账户名称" className={field} value={name} onChange={e => setName(e.target.value)} maxLength={80} required autoFocus disabled={saving} />
        </label>
        {showBroker && <label className="mb-4 block text-sm font-medium">经纪商或平台（可选）
          <input aria-label="经纪商或平台（可选）" className={field} value={broker} onChange={e => setBroker(e.target.value)} placeholder="例如：您的券商、交易平台或其他来源" maxLength={80} disabled={saving} />
        </label>}
        <div className="mb-4 grid grid-cols-[1fr_110px] gap-3">
          <label className="block text-sm font-medium">{mode === 'create' ? '初始余额' : '账户余额'}
            <input aria-label={mode === 'create' ? '初始余额' : '账户余额'} className={field} type="number" step="any" value={balance} onChange={e => setBalance(e.target.value)} required disabled={saving || synced} />
          </label>
          <label className="block text-sm font-medium">币种
            <input aria-label="币种" className={field} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={10} required disabled={saving || synced} />
          </label>
        </div>
        {synced && <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">余额和币种由已连接的平台同步。</p>}
        {showManualBalance && <label className="mb-4 block text-sm font-medium">手动指定总资产（可选）
          <input aria-label="手动指定总资产（可选）" className={field} type="number" step="any" value={manualBalance} onChange={e => setManualBalance(e.target.value)} placeholder="留空则按账户余额和交易盈亏计算" disabled={saving} />
        </label>}
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700 disabled:opacity-50">取消</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? '保存中…' : mode === 'create' ? '创建账户' : '保存修改'}</button>
        </div>
      </form>
    </div>
  );
};

export default AccountDetailsModal;
