
import { Trade, Direction, TradeStatus } from '../types';

// 生成账户名称：交易所名 + 5位随机数
export const generateAccountName = (exchange: string): string => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${exchange}-${num}`;
};

// Binance 成交方向 → TradeGrail Direction
function toDirection(dir: string): Direction {
    return dir === 'LONG' ? Direction.LONG : Direction.SHORT;
}

// Binance 配对交易 → TradeGrail Trade
function mapBinanceTrade(raw: any, accountId?: string): Trade {
    const pnl = raw.pnl ?? 0;
    let status: TradeStatus;
    if (raw.isOpen) {
        status = TradeStatus.OPEN;
    } else if (pnl > 0) {
        status = TradeStatus.WIN;
    } else if (pnl < 0) {
        status = TradeStatus.LOSS;
    } else {
        status = TradeStatus.BE;
    }

    return {
        id: `binance-${raw.orderId}-${raw.entryTime}`,
        symbol: raw.symbol,
        entryDate: new Date(raw.entryTime).toISOString(),
        exitDate: raw.exitTime ? new Date(raw.exitTime).toISOString() : '',
        entryPrice: raw.entryPrice,
        exitPrice: raw.exitPrice ?? 0,
        quantity: raw.quantity,
        direction: toDirection(raw.direction),
        status,
        pnl,
        fees: raw.fees ?? 0,
        leverage: raw.leverage ?? 1,
        riskAmount: raw.riskAmount ?? 0,
        setup: 'Binance Import',
        notes: `从 Binance 自动导入 OrderID: ${raw.orderId}`,
        mistakes: [],
        accountId,
    };
}

export const fetchTradesFromExchange = async (
    exchange: string,
    apiKey: string,
    apiSecret: string,
    onLog?: (msg: string) => void,
    accountId?: string,
    startDate?: string,
): Promise<Trade[]> => {

    if (!apiKey || !apiSecret) {
        throw new Error('缺少 API 凭证');
    }

    if (exchange !== 'Binance') {
        throw new Error(`暂不支持 ${exchange}，敬请期待`);
    }

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] 正在连接 Binance API...`);

    const response = await fetch('/api/binance-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, startDate, skipSpot: false }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        const msg = err?.error || err?.details || `请求失败 (${response.status})`;
        throw new Error(msg);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || '同步失败');
    }

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] 验证成功，正在解析 ${data.tradeCount} 笔交易...`);

    // 输出调试信息到控制台
    if (data.debug) {
        console.log('[Binance Sync Debug]', data.debug);
    }

    const trades: Trade[] = (data.trades || []).map((raw: any) => mapBinanceTrade(raw, accountId));

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] 导入完成，共 ${trades.length} 笔交易`);

    return trades;
};

// 静默拉取新交易（自动同步用，不输出日志到 UI）
export const fetchNewTrades = async (
    apiKey: string,
    apiSecret: string,
    sinceDate: string,
    accountId?: string,
): Promise<Trade[]> => {
    return fetchTradesFromExchange('Binance', apiKey, apiSecret, undefined, accountId, sinceDate);
};

// 返回账户余额（从 binance-sync 响应中提取）
export const fetchAccountBalance = async (
    apiKey: string,
    apiSecret: string,
): Promise<{ balance: number; currency: string } | null> => {
    try {
        const response = await fetch('/api/binance-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, apiSecret, startDate: null, skipSpot: true }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.success) return null;
        return { balance: data.balance ?? 0, currency: data.currency ?? 'USDT' };
    } catch {
        return null;
    }
};
