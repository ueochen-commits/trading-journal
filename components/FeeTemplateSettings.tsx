import React, { useEffect, useState } from 'react';
import type { TradingAccount } from '../types';
import { FEE_BASIS_LABELS, validateFeeTemplates, type FeeBasis, type FeeTemplate } from '../utils/tradeCalculation';

interface Props { accounts: TradingAccount[]; templates: FeeTemplate[]; onSave: (templates: FeeTemplate[]) => Promise<void> }
const field = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-[var(--tg-border)] dark:bg-slate-800 dark:text-slate-100';

export default function FeeTemplateSettings({ accounts, templates, onSave }: Props) {
  const own = accounts.filter(a => a.type !== 'demo');
  const [drafts, setDrafts] = useState<FeeTemplate[]>(templates);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDrafts(templates); }, [templates]);
  const update = (index: number, changes: Partial<FeeTemplate>) => {
    setDrafts(previous => previous.map((row, i) => i === index ? { ...row, ...changes } : row)); setSaved(false); setError('');
  };
  return <section className="max-w-4xl space-y-5 text-slate-800 dark:text-slate-100">
    <div><h2 className="text-lg font-bold">手续费模板</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">按账户和品种设置券商收取的合计费率。模板只估算新建的完整平仓记录，可在每笔交易中手动覆盖。修改模板不会改动历史记录或导入文件中的费用。</p></div>
    <p className="rounded-xl bg-indigo-50 p-3 text-sm leading-6 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">请按实际券商费率填写，并包含需计入的佣金、交易所及清算费。系统不预设统一费率。每手单边会乘以 2；每手双边已含开平仓，不再乘以 2。</p>
    {!own.length && <p role="status" className="text-sm text-amber-600 dark:text-amber-300">先在「经纪商账户」创建自己的交易账户，再设置模板。手动记录交易无需模板。</p>}
    {drafts.map((template, index) => <div key={index} className="tg-module space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold">交易账户<select aria-label={`模板 ${index + 1} 交易账户`} disabled={saving} className={field} value={template.accountId} onChange={e => { const account = own.find(a => a.id === e.target.value); update(index, { accountId: e.target.value, currency: account?.currency || '' }); }}><option value="">请选择账户</option>{own.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold">交易品种<input aria-label={`模板 ${index + 1} 交易品种`} disabled={saving} className={field} placeholder="GC / NQ / ES / BTCUSDT" value={template.symbol} onChange={e => update(index, { symbol: e.target.value.toUpperCase() })} /></label>
        <label className="space-y-1 text-xs font-semibold">计费方式<select aria-label={`模板 ${index + 1} 计费方式`} disabled={saving} className={field} value={template.basis} onChange={e => update(index, { basis: e.target.value as FeeBasis })}>{Object.entries(FEE_BASIS_LABELS).map(([value, label]) => <option key={value} value={value}>{label.cn}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold">费率 ({template.currency || '账户币种'})<input aria-label={`模板 ${index + 1} 费率`} disabled={saving} className={field} type="number" min="0" step="any" value={Number.isNaN(template.rate) ? '' : template.rate} onChange={e => update(index, { rate: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
      </div>
      <button type="button" disabled={saving} className="text-xs font-semibold text-rose-600 dark:text-rose-400" onClick={() => { setDrafts(previous => previous.filter((_, i) => i !== index)); setSaved(false); }}>移除此模板</button>
    </div>)}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={!own.length || saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-[var(--tg-border)]" onClick={() => { setDrafts(previous => [...previous, { accountId: own[0]?.id || '', currency: own[0]?.currency || '', symbol: '', basis: 'contract_roundtrip', rate: NaN }]); setSaved(false); }}>添加模板</button>
      <button type="button" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={async () => {
        if (saving) return; setSaving(true); setError(''); setSaved(false);
        try { const normalized = validateFeeTemplates(drafts, accounts); await onSave(normalized); setDrafts(normalized); setSaved(true); }
        catch (error) { setError(error instanceof Error ? error.message : '保存失败，请重试。'); }
        finally { setSaving(false); }
      }}>{saving ? '保存中…' : '保存手续费模板'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    {saved && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">手续费模板已保存。</p>}
  </section>;
}
