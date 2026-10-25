import type { TradingAccount } from '../types';

export const FUTURES_SPECS = {
  GC: { symbol: 'GC', venue: 'COMEX', multiplier: 100, tickSize: 0.1, tickValue: 10, name: 'Gold / 黄金期货', source: 'https://www.cmegroup.com/markets/metals/precious/gold.contractSpecs.html' },
  NQ: { symbol: 'NQ', venue: 'CME_MINI', multiplier: 20, tickSize: 0.25, tickValue: 5, name: 'E-mini Nasdaq-100', source: 'https://www.cmegroup.com/markets/equities/nasdaq/e-mini-nasdaq-100.contractSpecs.html' },
  ES: { symbol: 'ES', venue: 'CME_MINI', multiplier: 50, tickSize: 0.25, tickValue: 12.5, name: 'E-mini S&P 500', source: 'https://www.cmegroup.com/markets/equities/sp/e-mini-sandp500.contractSpecs.html' },
} as const;

export function futuresSpec(raw: string) {
  const input = raw.trim().toUpperCase().replace(/^\//, '');
  for (const spec of Object.values(FUTURES_SPECS)) {
    const [venue, symbol] = input.includes(':') ? input.split(':') : ['', input];
    if (venue && venue !== spec.venue && !(venue === 'CME' && spec.venue === 'CME_MINI')) continue;
    if (new RegExp(`^${spec.symbol}(?:1!|[FGHJKMNQUVXZ]\\d{1,4})?$`).test(symbol)) return spec;
  }
  return null;
}

const round = (value: number) => Math.round((value + Math.sign(value) * Number.EPSILON) * 1e8) / 1e8;

/** Completed, equal-size entry/exit lots, priced in USD. No leverage multiplier. */
export function futuresGrossPnl(input: { symbol: string; entryPrice: number; exitPrice: number; quantity: number; direction: string }) {
  const spec = futuresSpec(input.symbol);
  if (!spec) throw new Error('暂不支持该合约自动计算，请手动填写券商结单盈亏。');
  if (![input.entryPrice, input.exitPrice, input.quantity].every(Number.isFinite) || input.entryPrice <= 0 || input.exitPrice <= 0) throw new Error('填写有效的开仓价和平仓价后，才能按合约计算。');
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('期货手数必须为正整数；分批交易请拆分为相同开平仓手数的记录。');
  if (!['long', 'short', '做多', '做空'].includes(input.direction)) throw new Error('请选择有效的交易方向。');
  const sign = input.direction === 'long' || input.direction === '做多' ? 1 : -1;
  const priceDifference = round((input.exitPrice - input.entryPrice) * sign);
  const gross = round(priceDifference * input.quantity * spec.multiplier);
  if (!Number.isFinite(gross)) throw new Error('计算结果超出可用范围，请核对价格和手数。');
  return { spec, priceDifference, quantity: input.quantity, gross: gross === 0 ? 0 : gross };
}

export type FeeBasis = 'trade_total' | 'contract_side' | 'contract_roundtrip';
export interface FeeTemplate { accountId: string; symbol: string; currency: string; basis: FeeBasis; rate: number }
export const FEE_BASIS_LABELS: Record<FeeBasis, { cn: string; en: string }> = {
  trade_total: { cn: '每笔总额（开平仓合计）', en: 'Total per completed trade' },
  contract_side: { cn: '每手单边（开仓和平仓各一次）', en: 'Per contract, per side' },
  contract_roundtrip: { cn: '每手双边（已含开平仓）', en: 'Per contract, round trip' },
};

export function feeSymbol(raw: string) { return futuresSpec(raw)?.symbol || raw.trim().toUpperCase(); }

export function validateFeeTemplates(templates: FeeTemplate[], accounts: TradingAccount[]): FeeTemplate[] {
  const keys = new Set<string>();
  return templates.map(template => {
    const account = accounts.find(a => a.id === template.accountId && a.type !== 'demo');
    if (!account) throw new Error('请选择有效的个人交易账户。');
    const symbol = feeSymbol(template.symbol);
    if (!symbol || symbol.length > 64) throw new Error('请输入有效的交易品种。');
    if (!Object.hasOwn(FEE_BASIS_LABELS, template.basis) || !Number.isFinite(template.rate) || template.rate < 0) throw new Error('请选择计费方式，并填写不小于 0 的费率。');
    if (template.currency !== account.currency) throw new Error('模板币种必须与交易账户一致，请核对后重新保存。');
    const key = `${template.accountId}:${symbol}`;
    if (keys.has(key)) throw new Error('同一账户和品种只能有一个手续费模板。');
    keys.add(key);
    return { ...template, symbol };
  });
}

/** Templates never reinterpret imported, saved or manually overridden fees. */
export function estimateTradeFee(template: FeeTemplate, quantity: number, closed: boolean): number | null {
  if (!closed) return null;
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(template.rate) || template.rate < 0) return null;
  const total = template.basis === 'trade_total' ? template.rate : template.rate * quantity * (template.basis === 'contract_side' ? 2 : 1);
  return Number.isFinite(total) ? round(total) : null;
}

export function matchingFeeTemplate(templates: FeeTemplate[], account: TradingAccount | undefined, symbol: string): FeeTemplate | undefined {
  if (!account || account.type === 'demo') return undefined;
  return templates.find(t => t.accountId === account.id && feeSymbol(t.symbol) === feeSymbol(symbol) && t.currency === account.currency && Object.hasOwn(FEE_BASIS_LABELS, t.basis) && Number.isFinite(t.rate) && t.rate >= 0);
}

/** Notional value, not broker margin or cash invested. */
export function tradeNotional(trade: { symbol: string; entryPrice: number; quantity: number }): number {
  const value = trade.entryPrice * trade.quantity * (futuresSpec(trade.symbol)?.multiplier || 1);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
export function tradePnlPercent(trade: { symbol: string; entryPrice: number; quantity: number; pnl: number }): number {
  const notional = tradeNotional(trade);
  return notional ? trade.pnl / notional * 100 : 0;
}
