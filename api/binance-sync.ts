import { createHmac } from 'crypto';

export const config = { runtime: 'nodejs' };

// Binance 官方提供的多个 API 域名，逐个尝试
const BINANCE_ENDPOINTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
  'https://api-gcp.binance.com',
];

let activeBinanceBase: string | null = null;

// HMAC-SHA256 签名（使用 Node.js 原生 crypto）
function sign(queryString: string, secret: string): string {
  return createHmac('sha256', secret).update(queryString).digest('hex');
}

// 探测可用的 Binance 域名并获取服务器时间
async function findWorkingEndpoint(): Promise<{ base: string; serverTime: number }> {
  const errors: string[] = [];
  for (const base of BINANCE_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}/api/v3/time`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        console.log(`[Binance] Using endpoint: ${base}`);
        activeBinanceBase = base;
        return { base, serverTime: data.serverTime };
      }
      errors.push(`${base}: HTTP ${res.status}`);
    } catch (e: any) {
      errors.push(`${base}: ${e.message}`);
    }
  }
  throw new Error(`所有 Binance API 域名均不可达: ${errors.join('; ')}`);
}

// 带签名的 Binance 请求
async function binanceRequest(
  path: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string | number> = {}
): Promise<any> {
  // 获取可用域名和服务器时间
  const { base, serverTime } = await findWorkingEndpoint();
  const allParams = { ...params, recvWindow: 60000, timestamp: serverTime };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const signature = sign(queryString, apiSecret);
  const url = `${base}${path}?${queryString}&signature=${signature}`;

  console.log(`[Binance] ${path} via ${base}, ts=${serverTime}`);

  const res = await fetch(url, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Binance] ${path} failed (${res.status}):`, errText);
    throw new Error(`Binance ${path} (${res.status}): ${errText}`);
  }
  return res.json();
}

// 把 Binance myTrades 成交记录配对成完整交易
// Binance 返回的是每一笔成交（fill），买入+卖出需要配对
function pairTrades(fills: any[], symbol: string): any[] {
  const trades: any[] = [];
  // 按时间排序
  const sorted = [...fills].sort((a, b) => a.time - b.time);

  // 简单策略：把连续同方向的成交合并为一笔开仓，遇到反向成交视为平仓
  let openBuys: any[] = [];
  let openSells: any[] = [];

  for (const fill of sorted) {
    if (fill.isBuyer) {
      openBuys.push(fill);
    } else {
      // 卖出：尝试与最早的买入配对
      if (openBuys.length > 0) {
        const entry = openBuys.shift();
        const entryPrice = parseFloat(entry.price);
        const exitPrice = parseFloat(fill.price);
        const qty = parseFloat(entry.qty);
        const pnl = (exitPrice - entryPrice) * qty - parseFloat(entry.commission) - parseFloat(fill.commission);
        trades.push({
          symbol,
          entryTime: entry.time,
          exitTime: fill.time,
          direction: 'LONG',
          entryPrice,
          exitPrice,
          quantity: qty,
          pnl: parseFloat(pnl.toFixed(4)),
          fees: parseFloat(entry.commission) + parseFloat(fill.commission),
          orderId: entry.orderId,
        });
      } else {
        openSells.push(fill);
      }
    }
  }

  // 未配对的买入视为持仓中（OPEN）
  for (const entry of openBuys) {
    trades.push({
      symbol,
      entryTime: entry.time,
      exitTime: null,
      direction: 'LONG',
      entryPrice: parseFloat(entry.price),
      exitPrice: 0,
      quantity: parseFloat(entry.qty),
      pnl: 0,
      fees: parseFloat(entry.commission),
      orderId: entry.orderId,
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

  // 去除首尾空白（复制粘贴常见问题）
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  const apiSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: '缺少 API Key 或 Secret' });
  }

  try {
    // 1. 验证 API Key 是否有效（获取账户信息）
    let accountInfo: any;
    try {
      accountInfo = await binanceRequest('/api/v3/account', apiKey, apiSecret);
    } catch (e: any) {
      console.error('[Binance Sync] Auth failed:', e.message);
      // 区分连接失败和认证失败
      if (e.message.includes('不可达') || e.message.includes('Cannot')) {
        return res.status(502).json({
          error: `无法连接 Binance 服务器: ${e.message}`,
          details: e.message,
        });
      }
      return res.status(401).json({
        error: `API 验证失败: ${e.message}`,
        details: e.message,
      });
    }

    // 2. 获取账户余额（USDT）
    const usdtBalance = accountInfo.balances?.find((b: any) => b.asset === 'USDT');
    const balance = usdtBalance ? parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked) : 0;

    // 3. 确定查询起始时间
    const startTime = startDate
      ? new Date(startDate).getTime()
      : Date.now() - 90 * 24 * 60 * 60 * 1000; // 默认最近 90 天

    // 4. 获取现货交易对列表（取交易量最大的主流币对）
    const SPOT_SYMBOLS = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
    ];

    // 5. 获取合约交易对列表
    const FUTURES_SYMBOLS = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    ];

    const allPairedTrades: any[] = [];

    // 6. 拉取现货成交记录
    if (!skipSpot) {
      for (const symbol of SPOT_SYMBOLS) {
        try {
          const fills = await binanceRequest('/api/v3/myTrades', apiKey, apiSecret, {
            symbol,
            startTime,
            limit: 500,
          });
          if (fills && fills.length > 0) {
            const paired = pairTrades(fills, symbol);
            allPairedTrades.push(...paired);
          }
        } catch {
          // 该交易对无记录，跳过
        }
      }
    }

    // 7. 尝试拉取合约成交记录（需要合约权限）
    try {
      for (const symbol of FUTURES_SYMBOLS) {
        try {
          const { serverTime: ts } = await findWorkingEndpoint();
          const qs = `symbol=${symbol}&startTime=${startTime}&limit=500&recvWindow=60000&timestamp=${ts}`;
          const sig = sign(qs, apiSecret);
          const fills = await fetch(
            `https://fapi.binance.com/fapi/v1/userTrades?${qs}&signature=${sig}`,
            { headers: { 'X-MBX-APIKEY': apiKey } }
          );
          if (fills.ok) {
            const data = await fills.json();
            if (Array.isArray(data) && data.length > 0) {
              const paired = pairTrades(data, symbol + '_PERP');
              allPairedTrades.push(...paired);
            }
          }
        } catch {
          // 无合约权限或无记录，跳过
        }
      }
    } catch {
      // 合约 API 不可用，忽略
    }

    // 8. 按时间排序
    allPairedTrades.sort((a, b) => b.entryTime - a.entryTime);

    return res.status(200).json({
      success: true,
      balance,
      currency: 'USDT',
      tradeCount: allPairedTrades.length,
      trades: allPairedTrades,
    });

  } catch (error: any) {
    console.error('[Binance Sync] Error:', error);
    return res.status(500).json({
      error: '同步失败',
      details: error.message,
    });
  }
}
