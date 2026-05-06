
import { Trade, TradeStatus, Direction, Strategy, ChecklistItem, TrackerRule, Friend, Post, DisciplineRule, Notification, TradingAccount } from './types';

// Mock Accounts
export const MOCK_ACCOUNTS: TradingAccount[] = [
    { id: 'acc_1', name: '2023 TradingUA', isReal: true, balance: 10000, currency: 'USD', profitMethod: 'FIFO', type: 'manual' },
    { id: 'acc_2', name: 'Umar Account', isReal: false, balance: 5000, currency: 'USD', profitMethod: 'FIFO', type: 'demo' },
    { id: 'acc_3', name: 'Challenge Phase 1', isReal: false, balance: 25000, currency: 'USD', profitMethod: 'FIFO', type: 'manual' },
    { id: 'acc_4', name: 'MT4 7473', isReal: true, balance: 8500, currency: 'USD', profitMethod: 'FIFO', type: 'auto_sync' },
];

// Helper to generate realistic US stock & forex trades for a specific month
const generateCryptoTrades = (count: number, year: number, month: number): Trade[] => {
    const trades: Trade[] = [];
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'SPY', 'QQQ', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'NAS100', 'US30'];
    const setups = ['突破形态', '趋势回调', '支撑反弹', '均线交叉', '缺口填补', '财报行情', '日内动量'];
    const mistakesList = ['追涨杀跌', '仓位过重', '止损过宽', '提前离场', '未设止损', '情绪化交易'];

    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let maxDay = daysInMonth;
    if (year === now.getFullYear() && month === now.getMonth()) {
        maxDay = now.getDate();
    }

    for (let i = 0; i < count; i++) {
        const day = Math.floor(Math.random() * maxDay) + 1;
        const hour = Math.floor(Math.random() * 8) + 9; // 9am-5pm 交易时段
        const minute = Math.floor(Math.random() * 60);
        const entryDateObj = new Date(year, month, day, hour, minute);
        if (entryDateObj > now) continue;

        const durationMinutes = Math.floor(Math.random() * 300) + 30;
        const exitDateObj = new Date(entryDateObj.getTime() + durationMinutes * 60000);
        let exitDateString = exitDateObj.toISOString();
        let status = TradeStatus.WIN;
        const isWin = Math.random() > 0.45;

        if (exitDateObj > now) {
            exitDateString = Math.random() > 0.7 ? '' : now.toISOString();
            status = exitDateString === '' ? TradeStatus.OPEN : (isWin ? TradeStatus.WIN : TradeStatus.LOSS);
        }

        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const direction = Math.random() > 0.5 ? Direction.LONG : Direction.SHORT;
        const setup = setups[Math.floor(Math.random() * setups.length)];

        // 价格区间
        let basePrice = 0;
        if (symbol === 'AAPL') basePrice = 170 + Math.random() * 30;
        else if (symbol === 'TSLA') basePrice = 180 + Math.random() * 60;
        else if (symbol === 'NVDA') basePrice = 800 + Math.random() * 200;
        else if (symbol === 'MSFT') basePrice = 380 + Math.random() * 40;
        else if (symbol === 'AMZN') basePrice = 170 + Math.random() * 30;
        else if (symbol === 'META') basePrice = 460 + Math.random() * 60;
        else if (symbol === 'GOOGL') basePrice = 160 + Math.random() * 20;
        else if (symbol === 'SPY') basePrice = 500 + Math.random() * 30;
        else if (symbol === 'QQQ') basePrice = 430 + Math.random() * 30;
        else if (symbol === 'EUR/USD') basePrice = 1.07 + Math.random() * 0.04;
        else if (symbol === 'GBP/USD') basePrice = 1.26 + Math.random() * 0.04;
        else if (symbol === 'USD/JPY') basePrice = 148 + Math.random() * 6;
        else if (symbol === 'XAU/USD') basePrice = 2300 + Math.random() * 200;
        else if (symbol === 'NAS100') basePrice = 17500 + Math.random() * 1000;
        else basePrice = 38000 + Math.random() * 2000; // US30

        const isForex = symbol.includes('/');
        const entryPrice = parseFloat(basePrice.toFixed(isForex ? 4 : 2));
        const quantity = isForex
            ? parseFloat((10000 + Math.random() * 90000).toFixed(0)) // 外汇手数
            : parseFloat((10 + Math.random() * 90).toFixed(0));       // 股票股数

        let pnl = 0;
        if (status === TradeStatus.OPEN) {
            pnl = (Math.random() - 0.5) * 200;
        } else if (isWin) {
            pnl = 150 + Math.random() * 500;
            status = TradeStatus.WIN;
        } else {
            pnl = -(80 + Math.random() * 200);
            status = Math.random() > 0.85 ? TradeStatus.BE : TradeStatus.LOSS;
            if (status === TradeStatus.BE) pnl = (Math.random() - 0.5) * 20;
        }

        let exitPrice = 0;
        if (status !== TradeStatus.OPEN) {
            exitPrice = direction === Direction.LONG
                ? entryPrice + pnl / quantity
                : entryPrice - pnl / quantity;
        }

        const executionScore = Math.min(10, Math.floor(Math.random() * 7) + (status === TradeStatus.WIN ? 4 : 1));
        let executionGrade = '-';
        if (executionScore >= 9) executionGrade = 'A+';
        else if (executionScore >= 8) executionGrade = 'A';
        else if (executionScore >= 6) executionGrade = 'B';
        else if (executionScore >= 4) executionGrade = 'C';
        else executionGrade = 'D';

        const hasMistake = status === TradeStatus.LOSS && Math.random() > 0.6;
        const tradeMistakes = hasMistake ? [mistakesList[Math.floor(Math.random() * mistakesList.length)]] : [];

        trades.push({
            id: `mock-${year}-${month}-${i}`,
            symbol,
            entryDate: entryDateObj.toISOString(),
            exitDate: exitDateString,
            entryPrice: parseFloat(entryPrice.toFixed(isForex ? 4 : 2)),
            exitPrice: parseFloat(exitPrice.toFixed(isForex ? 4 : 2)),
            executionScore,
            executionGrade,
            quantity,
            direction,
            status,
            pnl: parseFloat(pnl.toFixed(2)),
            setup,
            notes: `${symbol} ${direction === Direction.LONG ? '做多' : '做空'}，形态：${setup}`,
            reviewNotes: status === TradeStatus.WIN ? '执行良好，按计划操作。' : '需复盘入场时机。',
            fees: parseFloat((Math.abs(pnl) * 0.001 + 1).toFixed(2)),
            mistakes: tradeMistakes,
            accountId: 'acc_2'
        });
    }

    return trades.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
};

// Generate dynamic trades based on TODAY's date
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

// 1. Current Month Trades
const TRADES_CURRENT_MONTH = generateCryptoTrades(50, currentYear, currentMonth);

// 2. Previous Month Trades
const prevDate = new Date(currentYear, currentMonth - 1, 1);
const TRADES_LAST_MONTH = generateCryptoTrades(70, prevDate.getFullYear(), prevDate.getMonth());

// 3. Two Months Ago
const prev2Date = new Date(currentYear, currentMonth - 2, 1);
const TRADES_2_MONTHS_AGO = generateCryptoTrades(60, prev2Date.getFullYear(), prev2Date.getMonth());

export const MOCK_TRADES: Trade[] = [
  ...TRADES_CURRENT_MONTH,
  ...TRADES_LAST_MONTH,
  ...TRADES_2_MONTHS_AGO,
];

export const MOCK_RULES = [
  { id: '1', text: '每日亏损超过 $200 停止交易', isActive: true },
  { id: '2', text: '不在开盘前 5 分钟交易', isActive: true },
  { id: '3', text: '必须等待 5 分钟 K 线收盘确认', isActive: true },
  { id: '4', text: '永远不移动止损线', isActive: true }
];

export const DEFAULT_TRACKER_RULES: TrackerRule[] = [
    { id: '1', type: 'no_mistakes', name: '避免犯错', isActive: true },
    { id: '2', type: 'max_loss', name: '单笔风控', value: 200, isActive: true },
    { id: '3', type: 'daily_trade_limit', name: '每日交易次数限制', value: 5, isActive: true },
];

// Default Discipline Checklist Rules (10 XP each)
export const DEFAULT_DISCIPLINE_RULES: DisciplineRule[] = [
    { id: 'd1', text: 'Did not FOMO into any trades', xpReward: 10 },
    { id: 'd2', text: 'Used Stop Loss on EVERY trade', xpReward: 10 },
    { id: 'd3', text: 'Completed Pre-Market Analysis', xpReward: 10 },
    { id: 'd4', text: 'Wrote Daily Review & Journal', xpReward: 10 },
    { id: 'd5', text: 'Stopped trading after hitting max loss/target', xpReward: 10 },
];

export const MOCK_STRATEGIES: Strategy[] = [
    {
        id: '1',
        name: 'Breakout',
        description: 'Taking trades when price breaks a key resistance level with volume confirmation.',
        notes: [
            { id: 'n1', title: 'General Logic', content: '<h3>Breakout logic:</h3><p>Wait for 3 attempts at a level before taking the break.</p>' }
        ],
        checklist: [
            { id: '1', text: 'Clean level identified', isCompleted: true },
            { id: '2', text: 'Volume expansion on break', isCompleted: true },
            { id: '3', text: 'Close above level', isCompleted: false },
            { id: '4', text: 'Relative Volume (RVOL) > 2.0', isCompleted: false },
        ]
    },
    {
        id: '2',
        name: 'Trend Pullback',
        description: 'Entering in the direction of the trend after a retracement to equilibrium.',
        notes: [
            { id: 'n2', title: 'Bullish Scenarios', content: '<h3>Pullback setup:</h3><p>Look for Fib 61.8% confluence.</p>' }
        ],
        checklist: [
            { id: '1', text: 'Strong trend established (Higher Highs)', isCompleted: true },
            { id: '2', text: 'Retracement to 50% or 61.8% Fib', isCompleted: false },
            { id: '3', text: 'Rejection candle or slowing momentum', isCompleted: false },
            { id: '4', text: 'No opposing market structure shift', isCompleted: false }
        ]
    },
    {
        id: '3',
        name: 'Liquidity Sweep',
        description: 'Reversal setup after stops are triggered above/below a swing point.',
        notes: [
            { id: 'n3', title: 'Mistakes to Avoid', content: '<h3>Common traps:</h3><p>Avoid entering before the displacement candle.</p>' }
        ],
        checklist: [
            { id: '1', text: 'Key Swing High/Low broken', isCompleted: true },
            { id: '2', text: 'Immediate reclaim of range', isCompleted: true },
            { id: '3', text: 'Divergence on RSI or CVD', isCompleted: true },
            { id: '4', text: 'Displacement after sweep', isCompleted: false }
        ]
    },
    {
        id: '4',
        name: 'Gap and Go',
        description: 'Day trading strategy for stocks gapping up pre-market.',
        notes: [],
        checklist: [
            { id: '1', text: 'Gap > 4%', isCompleted: true },
            { id: '2', text: 'Pre-market volume > 100k', isCompleted: true },
            { id: '3', text: 'Opening range breakout', isCompleted: false }
        ]
    },
    {
        id: '5',
        name: 'Support Bounce',
        description: 'Buying at a proven demand zone or support level.',
        notes: [],
        checklist: [
            { id: '1', text: 'Level tested multiple times', isCompleted: true },
            { id: '2', text: 'Bullish engulfing confirmation', isCompleted: false },
            { id: '3', text: 'Risk/Reward > 1:2', isCompleted: false }
        ]
    }
];

export const MOCK_PRE_TRADE_CHECKLIST: ChecklistItem[] = [
    { id: '1', text: 'Mental State is Calm & Focused', isCompleted: false },
    { id: '2', text: 'Risk Reward > 1:2', isCompleted: false },
    { id: '3', text: 'Stop Loss Defined & Accepted', isCompleted: false },
    { id: '4', text: 'No Major News Events Nearby', isCompleted: false },
    { id: '5', text: 'Trading With The Trend', isCompleted: false },
];

// Generate fake equity curves for friends based on ~200 data points (similar to user trades count)
const generateFriendEquity = (startBalance: number, points: number, volatility: number, drift: number) => {
    let current = startBalance;
    const curve = [current];
    for (let i = 0; i < points; i++) {
        const change = (Math.random() - 0.5) * volatility + drift;
        current += change;
        curve.push(current);
    }
    return curve;
}

export const MOCK_FRIENDS: Friend[] = [
    {
        id: 'f1',
        name: '查德 李',
        initials: 'CL',
        tier: 'Diamond',
        winRate: 62.5,
        pnl: 15400,
        color: '#f472b6', // pink
        equityCurve: generateFriendEquity(10000, 205, 300, 50) // High growth
    },
    {
        id: 'f2',
        name: 'Jerry Xia',
        initials: 'JX',
        tier: 'Platinum',
        winRate: 58.0,
        pnl: 8200,
        color: '#22d3ee', // cyan
        equityCurve: generateFriendEquity(10000, 205, 200, 30) // Steady growth
    },
    {
        id: 'f3',
        name: 'Hong Yi',
        initials: 'HY',
        tier: 'Gold',
        winRate: 45.2,
        pnl: 1200,
        color: '#fbbf24', // amber
        equityCurve: generateFriendEquity(10000, 205, 400, 10) // Volatile
    },
    {
        id: 'f4',
        name: 'David Kim',
        initials: 'DK',
        tier: 'Silver',
        winRate: 38.5,
        pnl: -2500,
        color: '#94a3b8', // slate
        equityCurve: generateFriendEquity(10000, 205, 150, -10) // Slow decline
    }
];

export const MOCK_POSTS: Post[] = [
    {
        id: 'p1',
        authorId: 'f1', 
        authorName: '查德 李',
        authorInitials: 'CL',
        authorTier: 'Diamond',
        content: "Just caught a massive move on BTC! 🚀 Liquidity sweep followed by a strong reclamation of the range low. Targeting 48k next.",
        timestamp: "2 hours ago",
        likes: 45,
        comments: 2,
        shares: 5,
        isLiked: false,
        commentsList: [
            {
                id: 'c1',
                authorName: 'David Kim',
                authorInitials: 'DK',
                content: 'Great catch! What time frame did you use for entry?',
                timestamp: '1 hour ago'
            },
            {
                id: 'c2',
                authorName: '查德 李',
                authorInitials: 'CL',
                content: '15m sweep confirmation.',
                timestamp: '55m ago'
            }
        ]
    },
    {
        id: 'p2',
        authorId: 'f2',
        authorName: 'Jerry Xia',
        authorInitials: 'JX',
        authorTier: 'Platinum',
        content: "Market feels chopping today. Sitting on hands and reviewing my weekly goals. Consistency > Intensity.",
        timestamp: "5 hours ago",
        likes: 128,
        comments: 0,
        shares: 10,
        isLiked: true,
        commentsList: []
    }
];

// Global Market Indices for Ticker Tape
export const MOCK_INDICES = [
    { symbol: 'S&P 500', price: 4783.45, change: 1.25 },
    { symbol: 'NASDAQ', price: 16832.92, change: 1.80 },
    { symbol: 'DOW JONES', price: 37468.61, change: 0.74 },
    { symbol: 'BTC/USD', price: 65432.10, change: -1.2 },
    { symbol: 'ETH/USD', price: 3456.78, change: 2.5 },
    { symbol: 'GOLD', price: 2045.30, change: 0.45 },
    { symbol: 'OIL (WTI)', price: 72.45, change: -0.85 },
    { symbol: 'EUR/USD', price: 1.0950, change: 0.12 },
    { symbol: 'USD/JPY', price: 145.20, change: 0.35 },
    { symbol: '10Y YIELD', price: 4.05, change: -0.02 },
];

// Mock Notifications
export const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 'n1',
        type: 'system',
        title: '系统维护通知',
        content: 'TradeGrail 将于北京时间 4月19日 00:30-00:35（周六凌晨）进行服务器维护，期间服务将短暂不可用，给您带来不便请谅解。',
        timestamp: '04月17日 19:35',
        isRead: false
    },
    {
        id: 'n2',
        type: 'alert',
        title: '风控预警',
        content: '您的今日亏损已达到设定的 80% ($400/$500)。请谨慎开仓，避免情绪化交易。',
        timestamp: '04月17日 14:20',
        isRead: false
    },
    {
        id: 'n3',
        type: 'upgrade',
        title: '功能限制提醒',
        content: '您正在尝试使用 Pro 版专属功能「AI 交易教练」。升级会员即可解锁无限次 AI 复盘与诊断。',
        timestamp: '2024年12月29日 16:58',
        isRead: true
    },
    {
        id: 'n4',
        type: 'removal',
        title: '移除通知',
        content: '您已被移出交易小组「加密货币短线精英群」。',
        timestamp: '2024年12月29日 16:50',
        senderInitials: 'CS',
        senderName: 'Admin',
        isRead: true
    },
    {
        id: 'n5',
        type: 'invite',
        title: '新粉丝提醒',
        content: 'Victor Zhang 开始关注您的交易日志。',
        timestamp: '2024年12月29日 16:50',
        senderInitials: 'VZ',
        senderName: 'Victor Zhang',
        isRead: true
    },
    {
        id: 'n6',
        type: 'system',
        title: '新功能上线',
        content: '「资金曲线模拟器」现已上线！输入胜率和盈亏比，可视化您的账户潜在增长路径。',
        timestamp: '2024年09月14日 02:01',
        isRead: true
    },
    {
        id: 'n7',
        type: 'invite',
        title: '入群邀请',
        content: 'Jerry Xia 邀请您加入「外汇狙击手」交易圈。',
        timestamp: '2024年09月12日 13:15',
        senderInitials: 'JX',
        senderName: 'Jerry Xia',
        isRead: true
    },
    {
        id: 'n8',
        type: 'alert',
        title: '会员到期提醒',
        content: '您的 Pro 试用期将于 3 天后结束。请及时续费以保留高级图表功能的访问权限。',
        timestamp: '2023年12月10日 21:57',
        isRead: true
    }
];
