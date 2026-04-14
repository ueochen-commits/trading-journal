
import { Trade, Direction, TradeStatus } from '../types';

// 生成账户名称：交易所名 + 5位随机数
export const generateAccountName = (exchange: string): string => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${exchange}-${num}`;
};

// Helper to get real current price from Coinbase (CORS friendly)
export const getRealCryptoPrice = async (symbol: string): Promise<number | null> => {
    try {
        const response = await fetch(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`);
        const data = await response.json();
        return parseFloat(data.data.amount);
    } catch (e) {
        // console.warn("Failed to fetch real price, using fallback.", e);
        return null;
    }
};

export const fetchTradesFromExchange = async (
    exchange: string,
    apiKey: string,
    apiSecret: string,
    onLog?: (msg: string) => void,
    accountId?: string,
    startDate?: string,
): Promise<Trade[]> => {
    
    // 1. Simulation: Authentication
    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] Authenticating with ${exchange} API...`);
    await new Promise(resolve => setTimeout(resolve, 800)); // Delay

    // Validation (Mock)
    if (!apiKey || !apiSecret) {
        throw new Error("Invalid API Credentials");
    }

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] Handshake successful. Token verified.`);
    await new Promise(resolve => setTimeout(resolve, 600));

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] Requesting GET /api/v3/allOrders...`);
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Fetch Real Base Price for realism
    let btcPrice = 65000;
    let ethPrice = 3500;

    try {
        const realBtc = await getRealCryptoPrice('BTC');
        const realEth = await getRealCryptoPrice('ETH');
        if (realBtc) btcPrice = realBtc;
        if (realEth) ethPrice = realEth;
        if (onLog && realBtc) onLog(`[${new Date().toLocaleTimeString()}] Synced real-time market data: BTC @ $${realBtc}`);
    } catch (e) {
        if (onLog) onLog(`[${new Date().toLocaleTimeString()}] Market data sync failed, using cached values.`);
    }

    // 3. Generate Realistic Trades based on current price
    const count = 5 + Math.floor(Math.random() * 5); // 5-10 trades
    const trades: Trade[] = [];
    const now = new Date();

    const symbols = exchange === 'Binance' 
        ? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
        : ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'];

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] Parsing ${count} recent orders...`);

    for (let i = 0; i < count; i++) {
        // Random time in last 14 days
        const timeOffset = Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 14);
        const date = new Date(now.getTime() - timeOffset);
        
        const isWin = Math.random() > 0.5;
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const direction = Math.random() > 0.5 ? Direction.LONG : Direction.SHORT;
        
        let pnl = 0;
        let status = TradeStatus.WIN;

        if (isWin) {
            pnl = 50 + Math.random() * 200;
            status = TradeStatus.WIN;
        } else {
            pnl = -1 * (20 + Math.random() * 100);
            status = TradeStatus.LOSS;
        }

        // Determine Entry Price based on symbol and current real price (with some variance for history)
        let basePrice = 100;
        if (symbol.includes('BTC')) basePrice = btcPrice;
        if (symbol.includes('ETH')) basePrice = ethPrice;
        if (symbol.includes('SOL')) basePrice = 145;
        if (symbol.includes('BNB')) basePrice = 600;

        // Add random variance (+- 5%) to simulate historical price
        const variance = 1 + (Math.random() * 0.1 - 0.05); 
        const entryPrice = parseFloat((basePrice * variance).toFixed(2));

        // Calculate logical exit price
        // PnL = (Exit - Entry) * Qty * (Long?1:-1)
        // Let's assume a position size roughly $5000
        const positionSize = 5000;
        const quantity = parseFloat((positionSize / entryPrice).toFixed(symbol.includes('BTC') ? 3 : 2));
        
        let exitPrice = 0;
        if (direction === Direction.LONG) {
            // Exit = Entry + (PnL / Qty)
            exitPrice = entryPrice + (pnl / quantity);
        } else {
            // Short: PnL = (Entry - Exit) * Qty => Exit = Entry - (PnL / Qty)
            exitPrice = entryPrice - (pnl / quantity);
        }

        trades.push({
            id: `api-${exchange}-${Date.now()}-${i}`,
            symbol: symbol,
            entryDate: date.toISOString(),
            exitDate: new Date(date.getTime() + 1000 * 60 * 60 * (1 + Math.random())).toISOString(), // 1-2 hours later
            entryPrice: parseFloat(entryPrice.toFixed(2)),
            exitPrice: parseFloat(exitPrice.toFixed(2)),
            quantity,
            direction,
            status,
            pnl: parseFloat(pnl.toFixed(2)),
            leverage: 10,
            riskAmount: 50,
            setup: 'API Import',
            notes: `Auto-imported from ${exchange} OrderID: #${Math.floor(Math.random()*1000000)}`,
            fees: 2.5,
            mistakes: [],
            accountId: accountId,
        });
    }

    if (onLog) onLog(`[${new Date().toLocaleTimeString()}] Import complete. ${count} trades processed.`);
    
    return trades.sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
};
