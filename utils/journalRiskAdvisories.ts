import { TradeStatus } from '../types';
import type { RiskSettings, Trade, TradingAccount } from '../types';

export type JournalRiskAdvisory =
  | { kind: 'daily_loss'; value: number; limit: number }
  | { kind: 'consecutive_loss'; value: number; limit: number };

const positiveLimit = (value?: number): value is number => Number.isFinite(value) && Number(value) > 0;

/** Review signals only. None of these results grants or denies journal access. */
export function getJournalRiskAdvisories(
  trades: Trade[],
  settings: RiskSettings | undefined,
  accounts: TradingAccount[],
  accountId = 'all',
  now = new Date(),
  timeZone?: string,
): JournalRiskAdvisory[] {
  if (!settings) return [];
  const realAccounts = new Set(accounts.filter(account => account.type !== 'demo').map(account => account.id));
  const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = dayFormatter.format(now);
  const closedToday = trades.flatMap(trade => {
    // Sample/demo and unknown account data must not become real-account signals.
    if (trade.accountId && !realAccounts.has(trade.accountId)) return [];
    if (accountId !== 'all' && trade.accountId !== accountId) return [];
    if (trade.status === TradeStatus.OPEN || !Number.isFinite(trade.pnl)) return [];
    const closeTime = new Date(trade.exitDate || trade.entryDate);
    if (!Number.isFinite(closeTime.getTime()) || closeTime > now || dayFormatter.format(closeTime) !== today) return [];
    return [{ trade, closeTime: closeTime.getTime() }];
  }).sort((a, b) => b.closeTime - a.closeTime);

  const advisories: JournalRiskAdvisory[] = [];
  const dailyPnl = closedToday.reduce((sum, { trade }) => sum + trade.pnl, 0);
  if (positiveLimit(settings.maxDailyLoss) && dailyPnl <= -settings.maxDailyLoss) {
    advisories.push({ kind: 'daily_loss', value: Math.abs(dailyPnl), limit: settings.maxDailyLoss });
  }
  let streak = 0;
  for (const { trade } of closedToday) {
    if (trade.pnl >= 0) break;
    streak += 1;
  }
  if (positiveLimit(settings.maxConsecutiveLosses) && streak >= settings.maxConsecutiveLosses) {
    advisories.push({ kind: 'consecutive_loss', value: streak, limit: settings.maxConsecutiveLosses });
  }
  return advisories;
}

export const exceedsTradeRiskReference = (risk: number, settings?: RiskSettings): boolean =>
  positiveLimit(settings?.maxTradeRisk) && Number.isFinite(risk) && risk > settings.maxTradeRisk;

/** Demo records are samples, not usage of the user's real journal allowance. */
export function countNonDemoJournalTrades(trades: Trade[], accounts: TradingAccount[]): number {
  const demoIds = new Set(accounts.filter(account => account.type === 'demo').map(account => account.id));
  return trades.filter(trade => !demoIds.has(trade.accountId)).length;
}
