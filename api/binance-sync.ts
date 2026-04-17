import ccxt from 'ccxt';

export const config = {
  runtime: 'nodejs',
  regions: ['sin1'],  // 新加坡节点，避免美国 IP 被 Binance 451 屏蔽
};

// 把同一 orderId + 同一 side 的多条 fill 合并为一条（加权平均价 + 总数量 + 总手续费）
function mergeOrderFills(fills: any[]): any[] {
  const groups = new Map<string, any[]>();
  for (const fill of fills) {
    const key = `${fill.order ?? fill.id}_${fill.side}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fill);
  }
  const merged: any[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) { merged.push(group[0]); continue; }
    let totalQty = 0, totalCost = 0, totalFee = 0;
    let earliest = Infinity;
    for (const f of group) {
      totalQty += f.amount;
      totalCost += f.price * f.amount;
      totalFee += f.fee?.cost ?? 0;
      if (f.timestamp < earliest) earliest = f.timestamp;
    }
    const base = group[0];
    merged.push({
      ...base,
      amount: totalQty,
      price: totalCost / totalQty,
      fee: { cost: totalFee, currency: base.fee?.currency },
      timestamp: earliest,
    });
  }
  return merged;
}

// 把 Binance 成交记录配对成完整交易
// Binance 合约成交记录字段说明：
//   side: 'buy'/'sell' — 订单方向
//   info.positionSide: 'LONG'/'SHORT'/'BOTH' — 持仓方向（双向持仓模式）
//   info.maker: bool — 是否是 maker
// 双向持仓模式下：LONG+buy=做多开仓, LONG+sell=做多平仓, SHORT+sell=做空开仓, SHORT+buy=做空平仓
// 单向持仓模式下：buy=开多或平空, sell=开空或平多，需要用 reduceOnly 区分
function pairTrades(fills: any[], symbol: string): any[] {
  const trades: any[] = [];
  const merged = mergeOrderFills(fills);
  const sorted = [...merged].sort((a, b) => a.timestamp - b.timestamp);

  // 检测是否为双向持仓模式
  const isDualSide = sorted.some((f: any) =>
    f.info?.positionSide && f.info.positionSide !== 'BOTH'
  );

  if (isDualSide) {
    // 双向持仓模式：按 positionSide 分组，分别配对
    const longFills = sorted.filter((f: any) => f.info?.positionSide === 'LONG');
    const shortFills = sorted.filter((f: any) => f.info?.positionSide === 'SHORT');

    const pairOneSide = (sideFills: any[], direction: 'LONG' | 'SHORT') => {
      const openFills: any[] = [];
      const entryBuy = direction === 'LONG' ? 'buy' : 'sell';
      for (const fill of sideFills) {
        if (fill.side === entryBuy) {
          openFills.push(fill); // 开仓
        } else if (openFills.length > 0) {
          const entry = openFills.shift()!;
          const pnl = direction === 'LONG'
            ? (fill.price - entry.price) * entry.amount - (entry.fee?.cost ?? 0) - (fill.fee?.cost ?? 0)
            : (entry.price - fill.price) * entry.amount - (entry.fee?.cost ?? 0) - (fill.fee?.cost ?? 0);
          trades.push({
            symbol, direction,
            entryTime: entry.timestamp, exitTime: fill.timestamp,
            entryPrice: entry.price, exitPrice: fill.price,
            quantity: entry.amount,
            pnl: parseFloat(pnl.toFixed(4)),
            fees: (entry.fee?.cost ?? 0) + (fill.fee?.cost ?? 0),
            orderId: entry.order || entry.id,
          });
        }
      }
      // 未配对的 = 持仓中
      for (const entry of openFills) {
        trades.push({
          symbol, direction,
          entryTime: entry.timestamp, exitTime: null,
          entryPrice: entry.price, exitPrice: 0,
          quantity: entry.amount, pnl: 0,
          fees: entry.fee?.cost ?? 0,
          orderId: entry.order || entry.id, isOpen: true,
        });
      }
    };

    pairOneSide(longFills, 'LONG');
    pairOneSide(shortFills, 'SHORT');
  } else {
    // 单向持仓模式：用 reduceOnly 区分开仓/平仓
    const openLongs: any[] = [];
    const openShorts: any[] = [];

    for (const fill of sorted) {
      const isReduce = fill.info?.reduceOnly === true || fill.reduceOnly === true;
      if (fill.side === 'buy' && !isReduce) {
        openLongs.push(fill); // 做多开仓
      } else if (fill.side === 'sell' && !isReduce) {
        openShorts.push(fill); // 做空开仓
      } else if (fill.side === 'sell' && isReduce && openLongs.length > 0) {
        const entry = openLongs.shift()!;
        const pnl = (fill.price - entry.price) * entry.amount - (entry.fee?.cost ?? 0) - (fill.fee?.cost ?? 0);
        trades.push({
          symbol, direction: 'LONG',
          entryTime: entry.timestamp, exitTime: fill.timestamp,
          entryPrice: entry.price, exitPrice: fill.price,
          quantity: entry.amount,
          pnl: parseFloat(pnl.toFixed(4)),
          fees: (entry.fee?.cost ?? 0) + (fill.fee?.cost ?? 0),
          orderId: entry.order || entry.id,
        });
      } else if (fill.side === 'buy' && isReduce && openShorts.length > 0) {
        const entry = openShorts.shift()!;
        const pnl = (entry.price - fill.price) * entry.amount - (entry.fee?.cost ?? 0) - (fill.fee?.cost ?? 0);
        trades.push({
          symbol, direction: 'SHORT',
          entryTime: entry.timestamp, exitTime: fill.timestamp,
          entryPrice: entry.price, exitPrice: fill.price,
          quantity: entry.amount,
          pnl: parseFloat(pnl.toFixed(4)),
          fees: (entry.fee?.cost ?? 0) + (fill.fee?.cost ?? 0),
          orderId: entry.order || entry.id,
        });
      }
    }
    // 未配对的 = 持仓中
    for (const entry of openLongs) {
      trades.push({ symbol, direction: 'LONG', entryTime: entry.timestamp, exitTime: null, entryPrice: entry.price, exitPrice: 0, quantity: entry.amount, pnl: 0, fees: entry.fee?.cost ?? 0, orderId: entry.order || entry.id, isOpen: true });
    }
    for (const entry of openShorts) {
      trades.push({ symbol, direction: 'SHORT', entryTime: entry.timestamp, exitTime: null, entryPrice: entry.price, exitPrice: 0, quantity: entry.amount, pnl: 0, fees: entry.fee?.cost ?? 0, orderId: entry.order || entry.id, isOpen: true });
    }
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

    // 1. 验证 API Key + 获取现货余额（使用 /api/v3/account，无地理限制）
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

    // 计算现货总资产（USDT + 所有持币折算为 USDT）
    let spotUsdtTotal = 0;
    try {
      // 先拿 ticker 价格用于折算
      const tickers = await exchange.fetchTickers();
      if (balance?.info?.balances) {
        for (const b of balance.info.balances) {
          const asset = b.asset;
          const total = parseFloat(b.free || '0') + parseFloat(b.locked || '0');
          if (total <= 0) continue;
          if (asset === 'USDT') {
            spotUsdtTotal += total;
          } else {
            // 尝试用 XXX/USDT ticker 折算
            const pair = `${asset}/USDT`;
            if (tickers[pair]?.last) {
              spotUsdtTotal += total * tickers[pair].last;
            }
          }
        }
      }
    } catch {
      // fallback: 只用 USDT 余额
      spotUsdtTotal = (balance as any)?.USDT?.total ?? (balance as any)?.total?.USDT ?? 0;
    }

    // 合约余额稍后在初始化 futuresExchange 后获取
    let futuresUsdtTotal = 0;

    // 2. 确定查询起始时间
    // 默认拉取3年内的数据，覆盖绝大多数用户的历史记录
    // Binance 合约历史最多支持查询约200天，现货无限制
    const since = startDate
      ? new Date(startDate).getTime()
      : Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;

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

    // 4. 自动发现合约品种（通过 income history 获取所有交易过的品种）
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
      await futuresExchange.loadMarkets();

      // 获取合约账户余额
      try {
        const futuresBalance = await futuresExchange.fetchBalance();
        futuresUsdtTotal = (futuresBalance as any)?.USDT?.total ?? (futuresBalance as any)?.total?.USDT ?? 0;
      } catch (e: any) {
        debugLog.push(`FUTURES balance ERROR: ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
      }

      // 方法1: 用 /fapi/v1/income 获取所有收入记录（分页），从中提取交易过的品种
      let futuresSymbols: string[] = [];
      const rawSymbols = new Set<string>();
      const incomeRecords: any[] = [];
      try {
        let incomeStartTime = since;
        let totalRecords = 0;
        let page = 0;
        while (true) {
          const incomeBatch = await futuresExchange.fapiPrivateGetIncome({
            startTime: incomeStartTime,
            limit: 1000,
          });
          const batch = incomeBatch || [];
          totalRecords += batch.length;
          for (const record of batch) {
            if (record.symbol) rawSymbols.add(record.symbol);
            incomeRecords.push(record);
          }
          page++;
          // 不足 1000 条说明已经拿完，或者空结果
          if (batch.length < 1000) break;
          // 用最后一条的时间 +1ms 作为下一页起点
          const lastTime = parseInt(batch[batch.length - 1].time, 10);
          if (!lastTime || lastTime <= incomeStartTime) break;
          incomeStartTime = lastTime + 1;
          if (page >= 10) break; // 安全上限，防止无限循环
        }
        debugLog.push(`FUTURES income: ${totalRecords} records (${page} pages), ${rawSymbols.size} unique symbols: ${[...rawSymbols].join(',')}`);

        // 把 Binance 原始 symbol（如 ETHUSDT）转换为 CCXT 格式（如 ETH/USDT:USDT）
        for (const raw of rawSymbols) {
          const market = futuresExchange.markets_by_id?.[raw]?.[0];
          if (market) {
            futuresSymbols.push(market.symbol);
          } else {
            const base = raw.replace(/USDT$/, '');
            if (base && base !== raw) {
              futuresSymbols.push(`${base}/USDT:USDT`);
            }
          }
        }
      } catch (e: any) {
        debugLog.push(`FUTURES income ERROR: ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
      }

      // 方法2: 同时检查当前持仓（补充 income 可能遗漏的）
      // 保存完整持仓数据，后续用于填充开仓均价、持仓量等字段
      const positionMap = new Map<string, any>();
      try {
        const positions = await futuresExchange.fetchPositions();
        const activePositions = positions.filter((p: any) => parseFloat(p.contracts || '0') !== 0);
        if (activePositions.length > 0) {
          const activeSymbols = activePositions.map((p: any) => p.symbol).filter((s: string) => !!s);
          debugLog.push(`FUTURES active positions: ${activeSymbols.join(',')}`);
          for (const p of activePositions) {
            if (p.symbol) {
              if (!futuresSymbols.includes(p.symbol)) futuresSymbols.push(p.symbol);
              // 用 Binance 原始 symbol（如 ETHUSDT）作为 key，方便后续匹配 income 记录
              const rawSymbol = p.info?.symbol || p.symbol.split(':')[0].replace('/', '');
              positionMap.set(rawSymbol, p);
            }
          }
        }
      } catch (e: any) {
        debugLog.push(`FUTURES positions ERROR: ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
      }

      // fallback: 扩展的热门合约品种列表兜底
      const DEFAULT_FUTURES = [
        'BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'DOGE/USDT:USDT',
        'XRP/USDT:USDT', 'PEPE/USDT:USDT', '1000PEPE/USDT:USDT', 'WIF/USDT:USDT',
        'ORDI/USDT:USDT', 'SUI/USDT:USDT', 'AVAX/USDT:USDT', 'LINK/USDT:USDT',
        'ADA/USDT:USDT', 'ARB/USDT:USDT', 'OP/USDT:USDT', 'DOGS/USDT:USDT',
        'BNB/USDT:USDT', 'TRX/USDT:USDT', 'TON/USDT:USDT', 'NEAR/USDT:USDT',
      ];
      if (futuresSymbols.length === 0) {
        futuresSymbols = [...DEFAULT_FUTURES];
        debugLog.push('FUTURES: no symbols discovered, using expanded defaults');
      } else {
        // 把默认列表中未被发现的品种也加上，确保覆盖面
        for (const s of DEFAULT_FUTURES) {
          if (!futuresSymbols.includes(s)) futuresSymbols.push(s);
        }
      }

      debugLog.push(`FUTURES querying ${futuresSymbols.length} symbols: ${futuresSymbols.join(',')}`);

      for (const symbol of futuresSymbols) {
        try {
          const trades = await futuresExchange.fetchMyTrades(symbol, since, 500);
          const cleanSymbol = symbol.split(':')[0].replace('/', '');
          if (trades && trades.length > 0) {
            debugLog.push(`FUTURES ${symbol}: ${trades.length} fills`);
            const paired = pairTrades(trades, cleanSymbol);
            allPairedTrades.push(...paired);
          }
        } catch (e: any) {
          debugLog.push(`FUTURES ${symbol}: ERROR ${e.constructor.name} - ${e.message?.slice(0, 80)}`);
        }
      }

      // Fallback: 如果 fetchMyTrades 没拿到任何合约交易（可能缺少 Enable Futures 权限），
      // 用 income 记录 + fetchPositions 持仓数据构建交易记录
      // 注意：symbol已去掉_PERP后缀，用allPairedTrades总数判断
      const futuresTradeCount = allPairedTrades.length;
      if (futuresTradeCount === 0 && (incomeRecords.length > 0 || positionMap.size > 0)) {
        debugLog.push('FUTURES fetchMyTrades returned 0 trades, falling back to income + position data');

        // --- 已平仓交易：从 income 记录构建 ---
        const pnlRecords = incomeRecords.filter(r => r.incomeType === 'REALIZED_PNL' && parseFloat(r.income) !== 0);
        const commissionRecords = incomeRecords.filter(r => r.incomeType === 'COMMISSION');

        const tradeGroups = new Map<string, { pnl: number; fees: number; time: number; symbol: string }>();

        for (const rec of pnlRecords) {
          const timeKey = Math.floor(parseInt(rec.time) / 1000);
          const key = `${rec.symbol}_${timeKey}`;
          if (!tradeGroups.has(key)) {
            tradeGroups.set(key, { pnl: 0, fees: 0, time: parseInt(rec.time), symbol: rec.symbol });
          }
          tradeGroups.get(key)!.pnl += parseFloat(rec.income);
        }

        for (const rec of commissionRecords) {
          const timeKey = Math.floor(parseInt(rec.time) / 1000);
          const key = `${rec.symbol}_${timeKey}`;
          if (tradeGroups.has(key)) {
            tradeGroups.get(key)!.fees += Math.abs(parseFloat(rec.income));
          }
        }

        for (const [, group] of tradeGroups) {
          const base = group.symbol.replace(/USDT$/, '');
          const cleanSymbol = base ? `${base}USDT` : group.symbol;

          // 尝试从 fetchMyTrades 获取该品种的价格信息
          let entryPrice = 0;
          let exitPrice = 0;
          let quantity = 0;
          let direction = 'LONG';
          try {
            const ccxtSymbol = `${base}/USDT:USDT`;
            const symbolTrades = await futuresExchange.fetchMyTrades(ccxtSymbol, group.time - 60000, 10);
            if (symbolTrades && symbolTrades.length > 0) {
              const buys = symbolTrades.filter((t: any) => t.side === 'buy');
              const sells = symbolTrades.filter((t: any) => t.side === 'sell');
              if (buys.length > 0) { entryPrice = buys[0].price; quantity = buys[0].amount; direction = 'LONG'; }
              if (sells.length > 0) { exitPrice = sells[0].price; }
              if (sells.length > 0 && buys.length === 0) { entryPrice = sells[0].price; quantity = sells[0].amount; direction = 'SHORT'; }
            }
          } catch { /* 拿不到就保持0 */ }

          allPairedTrades.push({
            symbol: cleanSymbol,
            entryTime: group.time,
            exitTime: group.time,
            direction,
            entryPrice,
            exitPrice,
            quantity,
            pnl: parseFloat(group.pnl.toFixed(4)),
            fees: parseFloat(group.fees.toFixed(4)),
            orderId: `income_${group.time}`,
            fromIncome: true,
          });
        }

        debugLog.push(`FUTURES income fallback: ${tradeGroups.size} closed trades constructed`);

        // --- 当前持仓：从 fetchPositions 构建，包含完整数据 ---
        const openSymbolsFromIncome = new Set<string>();
        for (const [, pos] of positionMap) {
          const rawSymbol = pos.info?.symbol || pos.symbol?.split(':')[0].replace('/', '');
          const base = rawSymbol.replace(/USDT$/, '');
          const cleanSymbol = base ? `${base}USDT` : rawSymbol;
          openSymbolsFromIncome.add(cleanSymbol);

          const entryPrice = parseFloat(pos.entryPrice || pos.info?.entryPrice || '0');
          const quantity = Math.abs(parseFloat(pos.contracts || pos.info?.positionAmt || '0'));
          const side = pos.side || (parseFloat(pos.info?.positionAmt || '0') >= 0 ? 'long' : 'short');
          const margin = parseFloat(pos.initialMargin || pos.info?.isolatedMargin || pos.info?.initialMargin || '0');
          const unrealizedPnl = parseFloat(pos.unrealizedPnl || pos.info?.unRealizedProfit || '0');
          const leverage = parseInt(pos.leverage || pos.info?.leverage || '1', 10);

          allPairedTrades.push({
            symbol: cleanSymbol,
            entryTime: Date.now(),
            exitTime: null,
            direction: side === 'short' ? 'SHORT' : 'LONG',
            entryPrice,
            exitPrice: 0,
            quantity,
            pnl: parseFloat(unrealizedPnl.toFixed(4)),
            fees: 0,
            orderId: `position_${rawSymbol}_${Date.now()}`,
            isOpen: true,
            riskAmount: parseFloat(margin.toFixed(4)),
            leverage,
            fromPosition: true,
          });
        }

        if (positionMap.size > 0) {
          debugLog.push(`FUTURES position data: ${positionMap.size} open positions with full details`);
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
      balance: parseFloat((spotUsdtTotal + futuresUsdtTotal).toFixed(2)),
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
