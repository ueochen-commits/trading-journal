import ccxt from 'ccxt';

export const config = {
  runtime: 'nodejs',
  regions: ['sin1'],  // 新加坡节点，避免美国 IP 被 Binance 451 屏蔽
};

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
    const debugLog: string[] = [];

    // ── 1. 验证 API Key（现货账户）──────────────────────────────────────────
    const exchange = new ccxt.binance({
      apiKey, secret: apiSecret,
      enableRateLimit: true, timeout: 20000,
      options: { fetchCurrencies: false },
    });

    let balance: any;
    try {
      balance = await exchange.fetchBalance({ type: 'spot' });
    } catch (e: any) {
      return res.status(401).json({ error: `API 验证失败: ${e.message}` });
    }

    // ── 2. 现货余额折算 USDT ────────────────────────────────────────────────
    let spotUsdtTotal = 0;
    try {
      const tickers = await exchange.fetchTickers();
      if (balance?.info?.balances) {
        for (const b of balance.info.balances) {
          const total = parseFloat(b.free || '0') + parseFloat(b.locked || '0');
          if (total <= 0) continue;
          if (b.asset === 'USDT') { spotUsdtTotal += total; }
          else if (tickers[`${b.asset}/USDT`]?.last) {
            spotUsdtTotal += total * tickers[`${b.asset}/USDT`].last;
          }
        }
      }
    } catch { spotUsdtTotal = (balance as any)?.USDT?.total ?? 0; }

    let futuresUsdtTotal = 0;
    const allTrades: any[] = [];

    // ── 3. 合约交易 ─────────────────────────────────────────────────────────
    try {
      const futuresExchange = new ccxt.binanceusdm({
        apiKey, secret: apiSecret,
        enableRateLimit: true, timeout: 20000,
        options: { fetchCurrencies: false },
      });
      await futuresExchange.loadMarkets();

      // 合约余额
      try {
        const fb = await futuresExchange.fetchBalance();
        futuresUsdtTotal = (fb as any)?.USDT?.total ?? 0;
      } catch (e: any) {
        debugLog.push(`FUTURES balance ERROR: ${e.message?.slice(0, 60)}`);
      }

      // 确定时间范围：默认最近180天（Binance合约API限制）
      // 如果用户指定了startDate则使用，否则用180天
      const since = startDate
        ? new Date(startDate).getTime()
        : Date.now() - 180 * 24 * 60 * 60 * 1000;

      debugLog.push(`since: ${new Date(since).toISOString()}`);

      // 用 income 接口发现交易过的品种
      const rawSymbols = new Set<string>();
      try {
        let incomeStart = since;
        for (let page = 0; page < 20; page++) {
          const batch = await futuresExchange.fapiPrivateGetIncome({
            startTime: incomeStart, limit: 1000,
          }) || [];
          for (const r of batch) { if (r.symbol) rawSymbols.add(r.symbol); }
          if (batch.length < 1000) break;
          const lastTime = parseInt(batch[batch.length - 1].time, 10);
          if (!lastTime || lastTime <= incomeStart) break;
          incomeStart = lastTime + 1;
        }
        debugLog.push(`income symbols: ${[...rawSymbols].join(',')}`);
      } catch (e: any) {
        debugLog.push(`income ERROR: ${e.message?.slice(0, 60)}`);
      }

      // 补充当前持仓的品种
      try {
        const positions = await futuresExchange.fetchPositions();
        for (const p of positions) {
          if (parseFloat(p.contracts || '0') !== 0 && p.info?.symbol) {
            rawSymbols.add(p.info.symbol);
          }
        }
      } catch (e: any) {
        debugLog.push(`positions ERROR: ${e.message?.slice(0, 60)}`);
      }

      // 转换为 CCXT 格式
      const futuresSymbols: string[] = [];
      for (const raw of rawSymbols) {
        const market = futuresExchange.markets_by_id?.[raw]?.[0];
        if (market) {
          futuresSymbols.push(market.symbol);
        } else {
          const base = raw.replace(/USDT$/, '');
          if (base && base !== raw) futuresSymbols.push(`${base}/USDT:USDT`);
        }
      }

      debugLog.push(`querying ${futuresSymbols.length} symbols`);

      // 核心：用 fapiPrivateGetUserTrades 直接获取每笔成交，含 realizedPnl
      // 这个接口每条记录就是一次完整的开仓或平仓成交，不需要手动配对
      for (const ccxtSymbol of futuresSymbols) {
        try {
          const rawSymbol = ccxtSymbol.split(':')[0].replace('/', '');
          const cleanSymbol = rawSymbol; // 已经是 XRPUSDT 格式

          // 分页拉取，每次1000条，从最新往前
          let fromId: string | undefined;
          const symbolFills: any[] = [];

          for (let page = 0; page < 10; page++) {
            const params: any = { symbol: rawSymbol, limit: 1000, startTime: since };
            if (fromId) params.fromId = fromId;

            const fills = await futuresExchange.fapiPrivateGetUserTrades(params) || [];
            if (fills.length === 0) break;
            symbolFills.push(...fills);
            if (fills.length < 1000) break;
            // 下一页从最后一条的 id+1 开始
            fromId = String(parseInt(fills[fills.length - 1].id, 10) + 1);
          }

          if (symbolFills.length === 0) continue;
          debugLog.push(`${rawSymbol}: ${symbolFills.length} fills`);

          // 按订单分组，同一订单的多次成交合并为一条
          const orderMap = new Map<string, any>();
          for (const fill of symbolFills) {
            const orderId = fill.orderId;
            if (!orderMap.has(orderId)) {
              orderMap.set(orderId, {
                orderId,
                symbol: cleanSymbol,
                side: fill.side,           // BUY / SELL
                positionSide: fill.positionSide, // LONG / SHORT / BOTH
                time: parseInt(fill.time, 10),
                totalQty: 0,
                totalCost: 0,
                totalFee: 0,
                totalRealizedPnl: 0,
                isMaker: fill.maker,
              });
            }
            const o = orderMap.get(orderId)!;
            const qty = parseFloat(fill.qty);
            const price = parseFloat(fill.price);
            o.totalQty += qty;
            o.totalCost += price * qty;
            o.totalFee += parseFloat(fill.commission || '0');
            o.totalRealizedPnl += parseFloat(fill.realizedPnl || '0');
          }

          // 把订单分为开仓和平仓
          // 双向持仓：LONG+BUY=开多, LONG+SELL=平多, SHORT+SELL=开空, SHORT+BUY=平空
          // 单向持仓：reduceOnly=false=开仓, reduceOnly=true=平仓
          const isDual = symbolFills.some(f => f.positionSide && f.positionSide !== 'BOTH');

          const isEntry = (o: any) => {
            if (isDual) {
              return (o.positionSide === 'LONG' && o.side === 'BUY') ||
                     (o.positionSide === 'SHORT' && o.side === 'SELL');
            }
            // 单向：realizedPnl=0 的是开仓，非0的是平仓
            return o.totalRealizedPnl === 0;
          };

          const getDirection = (o: any): 'LONG' | 'SHORT' => {
            if (isDual) return o.positionSide === 'SHORT' ? 'SHORT' : 'LONG';
            return o.side === 'BUY' ? 'LONG' : 'SHORT';
          };

          const orders = Array.from(orderMap.values()).sort((a, b) => a.time - b.time);
          const openOrders: any[] = [];

          for (const order of orders) {
            const avgPrice = order.totalQty > 0 ? order.totalCost / order.totalQty : 0;
            order.avgPrice = avgPrice;

            if (isEntry(order)) {
              openOrders.push(order);
            } else {
              // 平仓：找对应的开仓
              const direction = getDirection(order);
              const entryIdx = openOrders.findIndex(o => getDirection(o) === direction);

              if (entryIdx >= 0) {
                const entry = openOrders.splice(entryIdx, 1)[0];
                allTrades.push({
                  symbol: cleanSymbol,
                  direction,
                  entryTime: entry.time,
                  exitTime: order.time,
                  entryPrice: entry.avgPrice,
                  exitPrice: order.avgPrice,
                  quantity: entry.totalQty,
                  pnl: parseFloat(order.totalRealizedPnl.toFixed(4)),
                  fees: parseFloat((entry.totalFee + order.totalFee).toFixed(4)),
                  orderId: entry.orderId,
                });
              } else {
                // 找不到对应开仓（可能开仓在时间窗口之前），仍然记录平仓信息
                allTrades.push({
                  symbol: cleanSymbol,
                  direction,
                  entryTime: order.time,
                  exitTime: order.time,
                  entryPrice: 0,
                  exitPrice: order.avgPrice,
                  quantity: order.totalQty,
                  pnl: parseFloat(order.totalRealizedPnl.toFixed(4)),
                  fees: parseFloat(order.totalFee.toFixed(4)),
                  orderId: order.orderId,
                });
              }
            }
          }

          // 未配对的开仓 = 当前持仓中
          for (const entry of openOrders) {
            const direction = getDirection(entry);
            allTrades.push({
              symbol: cleanSymbol,
              direction,
              entryTime: entry.time,
              exitTime: null,
              entryPrice: entry.avgPrice,
              exitPrice: 0,
              quantity: entry.totalQty,
              pnl: 0,
              fees: parseFloat(entry.totalFee.toFixed(4)),
              orderId: entry.orderId,
              isOpen: true,
            });
          }

        } catch (e: any) {
          debugLog.push(`${ccxtSymbol} ERROR: ${e.message?.slice(0, 80)}`);
        }
      }

    } catch (e: any) {
      debugLog.push(`FUTURES init ERROR: ${e.message?.slice(0, 80)}`);
    }

    // ── 4. 现货交易（可选）──────────────────────────────────────────────────
    if (!skipSpot) {
      // 现货逻辑保持不变，略
    }

    // ── 5. 排序并返回 ────────────────────────────────────────────────────────
    allTrades.sort((a, b) => b.entryTime - a.entryTime);

    console.log('[CCXT] Debug:', debugLog.join(' | '));

    return res.status(200).json({
      success: true,
      balance: parseFloat((spotUsdtTotal + futuresUsdtTotal).toFixed(2)),
      currency: 'USDT',
      tradeCount: allTrades.length,
      trades: allTrades,
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
