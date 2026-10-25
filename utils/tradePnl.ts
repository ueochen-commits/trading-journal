export type PnlInputMode = 'net' | 'gross';

const money = (value: number) => Math.round((value + Math.sign(value) * Number.EPSILON) * 1e8) / 1e8;

/** Trade.pnl is always net. Fees are the total trading fees for this record. */
export function tradePnlBreakdown(amount: number, fees: number, mode: PnlInputMode = 'net') {
  if (!Number.isFinite(amount) || !Number.isFinite(fees) || fees < 0) {
    throw new Error('盈亏须为有效数字，手续费须为不小于 0 的本笔总额。');
  }
  const net = mode === 'gross' ? money(amount - fees) : amount;
  return { net, fees, gross: mode === 'gross' ? amount : money(net + fees) };
}

/** Only explicit field names establish a basis. An AI guess or generic P&L cannot. */
export function inferPnlInputMode(column: string): PnlInputMode | null {
  const name = column.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (/净盈亏|净利润|净收益|netp[&/]?l|netpnl|netprofit|closedp[&/]?l/.test(name)) return 'net';
  if (/毛盈亏|毛利润|grossp[&/]?l|grosspnl|grossprofit/.test(name)) return 'gross';
  return null;
}

/** Read existing rows without mutating/reinterpreting their saved net amount. */
export function displayTradePnl(trade: { pnl: number; fees: number }, mode: PnlInputMode = 'net'): number {
  return mode === 'gross' ? money(trade.pnl + (trade.fees || 0)) : trade.pnl;
}
