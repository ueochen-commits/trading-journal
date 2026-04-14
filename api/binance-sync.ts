import ccxt from 'ccxt';

export const config = { runtime: 'nodejs' };

// 把 Binance 成交记录配对成完整交易（买入+卖出）
function pairTrades(fills: any[], symbol: string): any[] {
  const trades: any[] = [];
  const sorted = [...fills].sort((a, b) => a.timestamp - b.timestamp);

  const openBuys: any[] = [];

  for (const fill of sorted) {
    if (fill.side === 'buy') {
      openBuys.push(fill);
    } else {
      // 卖出：与最早的买入配对
      if (openBuys.length > 0) {
        const entry = openBuys.shift()!;
        const pnl = (fill.price - entry.price) * entry.amount - (entry.fee?.cost ?? 0) - (fill.fee?.cost ?? 0);
        trades.push({
          symbol,
          entryTime: entry.timestamp,
          exitTime: fill.timestamp,
          direction: 'LONG',
          entryPrice: entry.price,
          exitPrice: fill.price,
          quantity: entry.amount,
          pnl: parseFloat(pnl.toFixed(4)),
          fees: (entry.fee?.cost ?? 0) + (fill.fee?.cost ?? 0),
          orderId: entry.order || entry.id,
        });
      }
    }
  }

  // 未配对的买入 = 持仓中
  for (const entry of openBuys) {
    trades.push({
      symbol,
      entryTime: entry.timestamp,
      exitTime: null,
      direction: 'LONG',
      entryPrice: entry.price,
      exitPrice: 0,
      quantity: entry.amount,
      pnl: 0,
      fees: entry.fee?.cost ?? 0,
      orderId: entry.order || entry.id,
      isOpen: true,
    });
  }

  return trades;
}
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey: rawKey, apiSecret: rawSecret, startDate, skipSpot } = req.body;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  const apiSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: '缺少 API Key 或 Secret' });
  }

  try {
    // 用 CCXT 初始化 Binance（自动处理签名、限流、端点选择）
    const exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      timeout: 15000,
    });

    // 1. 验证 API Key + 获取余额
    let balance: any;
    try {
      balance = await exchange.fetchBalance();
    } catch (e: any) {
      console.error('[CCXT] Auth failed:', e.constructor.name, e.message);
      return res.status(401).json({
        error: `API 验证失败: ${e.message}`,
        details: e.constructor.name + ': ' + e.message,
      });
    }

    const usdtTotal = balance?.USDT?.total ?? balance?.total?.USDT ?? 0;

    // 2. 确定查询起始时间
    const since = startDate
      ? new Date(startDate).getTime()
      : Date.now() - 90 * 24 * 60 * 60 * 1000;

    // 3. 拉取现货交易记录
    const SPOT_SYMBOLS = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
      'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    ];

    const allPairedTrades: any[] = [];

    if (!skipSpot) {
      for (const symbol of SPOT_SYMBOLS) {
        try {
          const trades = await exchange.fetchMyTrades(symbol, since, 500);
          if (trades && trades.length > 0) {
            const paired = pairTrades(trades, symbol.replace('/', ''));
            allPairedTrades.push(...paired);
          }
        } catch {
          // 该交易对无记录或无权限，跳过
        }
      }
    }

    // 4. 尝试拉取合约交易记录
    try {
      const futuresExchange = new ccxt.binanceusdm({
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
        timeout: 15000,
      });
      const FUTURES_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
      for (const symbol of FUTURES_SYMBOLS) {
        try {
          const trades = await futuresExchange.fetchMyTrades(symbol, since, 500);
          if (trades && trades.length > 0) {
            const paired = pairTrades(trades, symbol.replace('/', '') + '_PERP');
            allPairedTrades.push(...paired);
          }
        } catch {
          // 无合约权限或无记录
        }
      }
    } catch {
      // 合约 API 不可用
    }

    // 5. 按时间排序
    allPairedTrades.sort((a, b) => b.entryTime - a.entryTime);

    return res.status(200).json({
      success: true,
      balance: usdtTotal,
      currency: 'USDT',
      tradeCount: allPairedTrades.length,
      trades: allPairedTrades,
    });

  } catch (error: any) {
    console.error('[CCXT] Error:', error.constructor.name, error.message);
    return res.status(500).json({
      error: `同步失败: ${error.message}`,
      details: error.constructor.name + ': ' + error.message,
    });
  }
}
