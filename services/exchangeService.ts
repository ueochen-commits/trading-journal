import { tradePnlBreakdown } from '../utils/tradePnl';
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
    const pnl = tradePnlBreakdown(raw.pnl ?? 0, Math.max(0, raw.fees ?? 0), 'gross').net;
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
    skipSpot = false,
): Promise<{ trades: Trade[]; balance: number; currency: string }> => {

    throw new Error('API 同步暂未开放，请使用手动记录或 CSV 导入。');
};

// 返回账户余额（从 binance-sync 响应中提取）
export const fetchAccountBalance = async (
    apiKey: string,
    apiSecret: string,
): Promise<{ balance: number; currency: string } | null> => {
    return null;
};
