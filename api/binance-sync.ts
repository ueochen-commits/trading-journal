import ccxt from 'ccxt';

export const config = {
  runtime: 'nodejs',
  regions: ['sin1'],  // 新加坡节点，避免美国 IP 被 Binance 451 屏蔽
};

// 把 Binance 成交记录配对成完整交易（支持 LONG 和 SHORT）
function pairTrades(fills: any[], symbol: string): any[] {
  const trades: any[] = [];
  const sorted = [...fills].sort((a, b) => a.timestamp - b.timestamp);

  const openBuys: any[] = [];   // 未配对的买入（做多开仓）
  const openSells: any[] = [];  // 未配对的卖出（做空开仓）

  for (const fill of sorted) {
    if (fill.side === 'buy') {
      // 如果有未配对的做空，这笔买入是平空
      if (openSells.length > 0) {
        const entry = openSells.shift()!;
        const pnl = (entry.price - fill.price) * entry.amount - (entry.fee?.cost ?? 0) - (fill.fee?.cost ?? 0);
        trades.push({
          symbol,
          entryTime: entry.timestamp,
          exitTime: fill.timestamp,
          direction: 'SHORT',
          entryPrice: entry.price,
          exitPrice: fill.price,
          quantity: entry.amount,
          pnl: parseFloat(pnl.toFixed(4)),
          fees: (entry.fee?.cost ?? 0) + (fill.fee?.cost ?? 0),
          orderId: entry.order || entry.id,
        });
      } else {
        // 否则是做多开仓
        openBuys.push(fill);
      }
    } else {
      // 如果有未配对的做多，这笔卖出是平多
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
      } else {
        // 否则是做空开仓
        openSells.push(fill);
      }
    }
  }

  // 未配对的买入 = 做多持仓中
  for (const entry of openBuys) {
    trades.push({
      symbol, entryTime: entry.timestamp, exitTime: null,
      direction: 'LONG', entryPrice: entry.price, exitPrice: 0,
      quantity: entry.amount, pnl: 0, fees: entry.fee?.cost ?? 0,
      orderId: entry.order || entry.id, isOpen: true,
    });
  }
  // 未配对的卖出 = 做空持仓中
  for (const entry of openSells) {
    trades.push({
      symbol, entryTime: entry.timestamp, exitTime: null,
      direction: 'SHORT', entryPrice: entry.price, exitPrice: 0,
      quantity: entry.amount, pnl: 0, fees: entry.fee?.cost ?? 0,
      orderId: entry.order || entry.id, isOpen: true,
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
    // 用 CCXT 初始化 Binance
    // fetchCurrencies: false 跳过 /sapi/v1/capital/config/getall（该端点有地理限制）
    const exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      timeout: 15000,
      options: {
        fetchCurrencies: false,
      },
    });

    // 1. 验证 API Key + 获取余额（使用 /api/v3/account，无地理限制）
    let balance: any;
    try {
      balance = await exchange.fetchBalance({ type: 'spot' });
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

    // 3. 自动发现现货交易品种（从余额推断 + 常用列表兜底）
    const DEFAULT_SPOT = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
      'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    ];
    // 从余额中找出持有的资产，构建 XXX/USDT 交易对
    const SKIP_ASSETS = new Set(['USDT', 'USDC', 'BUSD', 'USD', 'LDUSDT', 'LDBUSD']);
    const balanceSymbols: string[] = [];
    if (balance?.info?.balances) {
      for (const b of balance.info.balances) {
        const asset = b.asset;
        const free = parseFloat(b.free || '0');
        const locked = parseFloat(b.locked || '0');
        if ((free > 0 || locked > 0) && !SKIP_ASSETS.has(asset)) {
          balanceSymbols.push(`${asset}/USDT`);
        }
      }
    }
    // 合并：余额推断的 + 默认列表，去重
    const spotSet = new Set([...balanceSymbols, ...DEFAULT_SPOT]);
    const SPOT_SYMBOLS = Array.from(spotSet);

    const allPairedTrades: any[] = [];
    const debugLog: string[] = [`since: ${new Date(since).toISOString()}`, `spot symbols: ${SPOT_SYMBOLS.length} (${balanceSymbols.length} from balance)`];

    if (!skipSpot) {
      for (const symbol of SPOT_SYMBOLS) {
        try {
          const trades = await exchange.fetchMyTrades(symbol, since, 500);
          if (trades && trades.length > 0) {
            debugLog.push(`${symbol}: ${trades.length} fills`);
            const paired = pairTrades(trades, symbol.replace('/', ''));
            allPairedTrades.push(...paired);
          }
        } catch (e: any) {
          // 只记录非 BadSymbol 的错误（无效交易对很正常，不需要记录）
          if (e.constructor.name !== 'BadSymbol') {
            debugLog.push(`${symbol}: ERROR ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
          }
        }
      }
    }

    // 4. 自动发现合约品种（通过 fetchPositions 获取所有有过持仓的品种）
    try {
      const futuresExchange = new ccxt.binanceusdm({
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
        timeout: 15000,
        options: {
          fetchCurrencies: false,
        },
      });

      // fetchPositions 返回所有品种的持仓信息（包括已平仓的，size=0）
      // 我们从中筛选出有过交易的品种
      let futuresSymbols: string[] = [];
      try {
        const positions = await futuresExchange.fetchPositions();
        // 筛选出有持仓或有过未实现盈亏的品种
        futuresSymbols = positions
          .filter((p: any) => {
            const size = parseFloat(p.contracts || '0');
            const notional = parseFloat(p.notional || '0');
            const unrealizedPnl = parseFloat(p.unrealizedPnl || '0');
            // 有持仓，或有未实现盈亏记录
            return size !== 0 || notional !== 0 || unrealizedPnl !== 0;
          })
          .map((p: any) => p.symbol)
          .filter((s: string) => !!s);
        debugLog.push(`FUTURES positions: ${positions.length} total, ${futuresSymbols.length} with activity`);
      } catch (e: any) {
        debugLog.push(`FUTURES fetchPositions ERROR: ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
        // fallback: 用默认列表
        futuresSymbols = ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT'];
      }

      // 如果 fetchPositions 没发现活跃品种，也用默认列表兜底
      if (futuresSymbols.length === 0) {
        futuresSymbols = ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT'];
        debugLog.push('FUTURES: no active positions, using defaults');
      }

      for (const symbol of futuresSymbols) {
        try {
          const trades = await futuresExchange.fetchMyTrades(symbol, since, 500);
          const cleanSymbol = symbol.split(':')[0].replace('/', '') + '_PERP';
          if (trades && trades.length > 0) {
            debugLog.push(`FUTURES ${symbol}: ${trades.length} fills`);
            const paired = pairTrades(trades, cleanSymbol);
            allPairedTrades.push(...paired);
          }
        } catch (e: any) {
          debugLog.push(`FUTURES ${symbol}: ERROR ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
        }
      }
    } catch (e: any) {
      debugLog.push(`FUTURES init ERROR: ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
    }

    // 5. 按时间排序
    allPairedTrades.sort((a, b) => b.entryTime - a.entryTime);

    console.log('[CCXT] Debug:', debugLog.join(' | '));

    return res.status(200).json({
      success: true,
      balance: usdtTotal,
      currency: 'USDT',
      tradeCount: allPairedTrades.length,
      trades: allPairedTrades,
      debug: debugLog,
    });

  } catch (error: any) {
    console.error('[CCXT] Error:', error.constructor.name, error.message);
    return res.status(500).json({
      error: `同步失败: ${error.message}`,
      details: error.constructor.name + ': ' + error.message,
    });
  }
}
