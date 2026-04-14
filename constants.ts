
import { Trade, TradeStatus, Direction, Strategy, ChecklistItem, TrackerRule, Friend, Post, DisciplineRule, Notification, TradingAccount } from './types';

// Mock Accounts
export const MOCK_ACCOUNTS: TradingAccount[] = [
    { id: 'acc_1', name: '2023 TradingUA', isReal: true, balance: 10000, currency: 'USD', profitMethod: 'FIFO', type: 'manual' },
    { id: 'acc_2', name: 'Umar Account', isReal: false, balance: 5000, currency: 'USD', profitMethod: 'FIFO', type: 'demo' },
    { id: 'acc_3', name: 'Challenge Phase 1', isReal: false, balance: 25000, currency: 'USD', profitMethod: 'FIFO', type: 'manual' },
    { id: 'acc_4', name: 'MT4 7473', isReal: true, balance: 8500, currency: 'USD', profitMethod: 'FIFO', type: 'auto_sync' },
];

// Helper to generate realistic crypto trades for a specific month
const generateCryptoTrades = (count: number, year: number, month: number): Trade[] => {
    const trades: Trade[] = [];
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ORDIUSDT', '1000SATS', 'DOGEUSDT', 'XRPUSDT', 'TIAUSDT', 'AVAXUSDT', 'LINKUSDT'];
    const setups = ['Breakout', 'Trend Pullback', 'Liquidity Sweep', 'Fib Retracement', 'Support Bounce', 'News Event', 'Gap and Go'];
    const mistakesList = ['FOMO', 'Revenge Trading', 'Too Large Size', 'Hesitation', 'Early Exit', 'No Stop Loss'];
    
    // Current real time
    const now = new Date();

    // Determine the max day allowed (if current month, max day is today, else last day of month)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let maxDay = daysInMonth;
    
    // If generating for the current real-world month, cap the date at 'yesterday' or 'today' to avoid future trades
    if (year === now.getFullYear() && month === now.getMonth()) {
        maxDay = now.getDate(); 
    }

    // Price Multiplier (Simple random variation)
    const priceMultiplier = 1.0 + (Math.random() * 0.2 - 0.1);

    for (let i = 0; i < count; i++) {
        // Random Day up to maxDay
        const day = Math.floor(Math.random() * maxDay) + 1;
        
        // Don't generate trades literally *right now* to avoid timezone edge cases, stick to hours 0-23
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        
        const entryDateObj = new Date(year, month, day, hour, minute);
        
        // Double check we aren't in the future (e.g. later today)
        if (entryDateObj > now) continue;

        const durationMinutes = Math.floor(Math.random() * 240) + 15; // 15 mins to 4 hours
        const exitDateObj = new Date(entryDateObj.getTime() + durationMinutes * 60000);
        
        // If exit is in future, either make it OPEN trade or cap exit at now
        let exitDateString = exitDateObj.toISOString();
        let status = TradeStatus.WIN; // Placeholder
        let isWin = Math.random() > 0.52;

        if (exitDateObj > now) {
             // Make it an OPEN trade randomly if it overlaps now, or just shorten duration
             if (Math.random() > 0.5) {
                 exitDateString = ''; // Open trade
                 status = TradeStatus.OPEN;
             } else {
                 exitDateString = now.toISOString();
             }
        }

        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const direction = Math.random() > 0.5 ? Direction.LONG : Direction.SHORT;
        const setup = setups[Math.floor(Math.random() * setups.length)];
        
        // Base Price Estimation
        let basePrice = 0;
        if (symbol.startsWith('BTC')) basePrice = (60000 + Math.random() * 10000) * priceMultiplier;
        else if (symbol.startsWith('ETH')) basePrice = (3000 + Math.random() * 500) * priceMultiplier;
        else if (symbol.startsWith('SOL')) basePrice = (140 + Math.random() * 20) * priceMultiplier;
        else if (symbol.startsWith('ORDI')) basePrice = (60 + Math.random() * 20) * priceMultiplier;
        else if (symbol.startsWith('1000SATS')) basePrice = 0.0004 * priceMultiplier;
        else basePrice = (1 + Math.random() * 100) * priceMultiplier;

        const entryPrice = parseFloat(basePrice.toFixed(symbol.includes('SATS') ? 7 : 2));
        
        // Position Sizing (Assume roughly $5000 - $10000 position size)
        const positionSize = 5000 + Math.random() * 5000; 
        const quantity = parseFloat((positionSize / entryPrice).toFixed(symbol.includes('SATS') ? 0 : 2));

        // PnL Generation
        let pnl = 0;

        if (status === TradeStatus.OPEN) {
            pnl = (Math.random() - 0.5) * 100; // Floating PnL
        } else {
            if (isWin) {
                pnl = 100 + Math.random() * 400; // Win $100 - $500
                status = TradeStatus.WIN;
            } else {
                pnl = -(50 + Math.random() * 150); // Loss $50 - $200
                status = TradeStatus.LOSS;
                if (Math.random() > 0.9) {
                    pnl = -5 + Math.random() * 10;
                    status = TradeStatus.BE;
                }
            }
        }

        // Calculate Exit Price based on PnL
        let exitPrice = 0;
        if (status !== TradeStatus.OPEN) {
            if (direction === Direction.LONG) {
                exitPrice = entryPrice + (pnl / quantity);
            } else {
                exitPrice = entryPrice - (pnl / quantity);
            }
        }

        // Execution Score (1-10)
        const executionScore = Math.floor(Math.random() * 7) + (status === TradeStatus.WIN ? 4 : 1);
        
        // Calculate Unified Grade based on Score
        let executionGrade = '-';
        if (executionScore >= 9) executionGrade = 'A+';
        else if (executionScore >= 8) executionGrade = 'A';
        else if (executionScore >= 6) executionGrade = 'B';
        else if (executionScore >= 4) executionGrade = 'C';
        else if (executionScore > 0) executionGrade = 'D';

        // Mistakes
        const hasMistake = status === TradeStatus.LOSS && Math.random() > 0.7; 
        const tradeMistakes = hasMistake ? [mistakesList[Math.floor(Math.random() * mistakesList.length)]] : [];

        // Randomly assign an account from MOCK_ACCOUNTS
        const accountRand = Math.random();
        let assignedAccount = MOCK_ACCOUNTS[0].id;
        if (accountRand > 0.6) assignedAccount = MOCK_ACCOUNTS[1].id;
        if (accountRand > 0.85) assignedAccount = MOCK_ACCOUNTS[2].id;

        trades.push({
            id: `mock-${year}-${month}-${i}`,
            symbol,
            entryDate: entryDateObj.toISOString(),
            exitDate: exitDateString,
            entryPrice: parseFloat(entryPrice.toFixed(symbol.includes('SATS') ? 7 : 2)),
            exitPrice: parseFloat(exitPrice.toFixed(symbol.includes('SATS') ? 7 : 2)),
            executionScore: Math.min(10, executionScore),
            executionGrade, // Single source of truth for the grade
            quantity,
            direction,
            status,
            pnl: parseFloat(pnl.toFixed(2)),
            setup,
            notes: `Trade on ${entryDateObj.toLocaleDateString()}. Structure was ${direction === Direction.LONG ? 'bullish' : 'bearish'}.`,
            reviewNotes: status === TradeStatus.WIN ? 'Good execution.' : 'Review entry criteria.',
            fees: parseFloat((positionSize * 0.0005).toFixed(2)), // 0.05% fee approx
            mistakes: tradeMistakes,
            accountId: assignedAccount
        });
    }

    // Sort by date desc
    return trades.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
};

// Generate dynamic trades based on TODAY's date
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

// 1. Current Month Trades
const TRADES_CURRENT_MONTH = generateCryptoTrades(40, currentYear, currentMonth);

// 2. Previous Month Trades
const prevDate = new Date(currentYear, currentMonth - 1, 1);
const TRADES_LAST_MONTH = generateCryptoTrades(60, prevDate.getFullYear(), prevDate.getMonth());

export const MOCK_TRADES: Trade[] = [
  ...TRADES_CURRENT_MONTH,
  ...TRADES_LAST_MONTH,
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
