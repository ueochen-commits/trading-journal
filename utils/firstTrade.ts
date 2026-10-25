import type { TradingAccount } from '../types';

// "All accounts" is a filter, never a destination for a new record.
export function defaultJournalAccount(accounts: TradingAccount[], selectedId = 'all', preferredId?: string): string {
  if (accounts.some(account => account.id === selectedId)) return selectedId;
  if (preferredId && accounts.some(account => account.id === preferredId)) return preferredId;
  const own = accounts.filter(account => account.type !== 'demo');
  return own.length === 1 ? own[0].id : '';
}

export function validateFirstTrade(form: Record<string, any>, accounts: TradingAccount[]): string | null {
  if (!accounts.some(account => account.id === form.accountId)) return '请选择交易归属账户；也可以先创建自己的账户。';
  if (!form.symbol?.trim()) return '请填写交易品种。';
  if (!form.entryDate || !Number.isFinite(new Date(form.entryDate).getTime())) return '请填写有效的开仓时间。';
  if (form.exitDate && (!Number.isFinite(new Date(form.exitDate).getTime()) || new Date(form.exitDate) < new Date(form.entryDate))) return '平仓时间必须有效，且不能早于开仓时间。';
  if (form.entryPrice === '' || form.entryPrice == null || !Number.isFinite(Number(form.entryPrice)) || Number(form.entryPrice) <= 0) return '请填写大于 0 的开仓价格。';
  for (const field of ['quantity', 'leverage']) {
    if (form[field] !== '' && form[field] != null && (!Number.isFinite(Number(form[field])) || Number(form[field]) <= 0)) return '仓位数量和杠杆需大于 0；不填写时默认为 1。';
  }
  for (const field of ['pnl', 'fees', 'riskAmount', 'exitPrice', 'profitTarget', 'stopLoss']) {
    if (form[field] !== '' && form[field] != null && !Number.isFinite(Number(form[field]))) return '请检查价格、盈亏、手续费和风险金额是否为有效数字。';
  }
  if (Number(form.fees || 0) < 0 || Number(form.riskAmount || 0) < 0 || Number(form.exitPrice || 0) < 0) return '手续费、风险金额和平仓价格不能为负数。';
  return null;
}
