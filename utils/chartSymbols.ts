export const JOURNAL_INSTRUMENTS = [
  { symbol: 'GC', name: '黄金期货 / Gold Futures', exchange: 'COMEX', chart: 'COMEX:GC1!' },
  { symbol: 'NQ', name: '纳斯达克 100 E-mini 期货 / Nasdaq-100 E-mini', exchange: 'CME_MINI', chart: 'CME_MINI:NQ1!' },
  { symbol: 'ES', name: '标普 500 E-mini 期货 / S&P 500 E-mini', exchange: 'CME_MINI', chart: 'CME_MINI:ES1!' },
];

export interface ChartSymbol { symbol: string; continuous: boolean }

export function resolveChartSymbol(raw: string): ChartSymbol | null {
  const input = raw.trim().toUpperCase();
  if (!input) return null;
  // Respect an explicit venue and symbol; never append USDT to an existing symbol.
  if (/^[A-Z_]+:[A-Z0-9_.!/-]+$/.test(input)) {
    return { symbol: input, continuous: /\d!$/.test(input) };
  }
  const future = input.replace(/^\//, '');
  for (const instrument of JOURNAL_INSTRUMENTS) {
    if (future === instrument.symbol || future === `${instrument.symbol}1!`) {
      return { symbol: instrument.chart, continuous: true };
    }
    // An explicit delivery month/year must stay that contract, not a continuous proxy.
    if (new RegExp(`^${instrument.symbol}[FGHJKMNQUVXZ]\\d{4}$`).test(future)) {
      return { symbol: `${instrument.exchange}:${future}`, continuous: false };
    }
  }
  const crypto = input.replace(/_PERP$/, '').replace(/\//g, '').replace(/:USDT$/, '');
  if (/^[A-Z0-9]+(USDT|USDC|BUSD)$/.test(crypto)) return { symbol: `BINANCE:${crypto}`, continuous: false };
  if (['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE'].includes(crypto)) return { symbol: `BINANCE:${crypto}USDT`, continuous: false };
  return null;
}

export function hasRestrictedFuturesFeed(symbol: string): boolean {
  // These venues are not in TradingView's free embeddable market-data list.
  return /^(COMEX|CME|CME_MINI):/.test(symbol);
}

export function tradingViewChartUrl(symbol: string): string {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}
