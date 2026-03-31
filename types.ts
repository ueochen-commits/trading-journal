
export enum TradeStatus {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BE = 'BE', // Break Even
  OPEN = 'OPEN' // Active Trade
}

export enum Direction {
  LONG = '做多',
  SHORT = '做空'
}

export interface TradingAccount {
    id: string;
    name: string;
    isReal: boolean;
}

export interface Trade {
  id: string;
  symbol: string;
  entryDate: string; // ISO Date string
  exitDate: string; // Can be empty string if open
  entryPrice: number;
  exitPrice: number; // Can be 0 if open
  executionScore?: number; // Execution quality score (1-10)
  executionGrade?: string; // Execution quality grade (A+, A, B, C, D)
  quantity: number;
  direction: Direction;
  status: TradeStatus;
  pnl: number;
  leverage?: number; // New Leverage Field
  riskAmount?: number; // Stop Loss Amount ($)
  setup: string;
  notes: string; // 开仓理由/笔记
  reviewNotes?: string; // 交易复盘
  fees: number;
  mistakes?: string[]; // 犯的错误
  customTags?: Record<string, string[]>; // Dynamic categories (e.g., { "Mental": ["Calm"], "Session": ["NY"] })
  images?: string[]; // Base64 strings of screenshots
  rating?: number; // 1-5 Star Rating
  compliance?: Record<string, boolean>; // Rule ID -> isFollowed mapping for Playbook
  accountId?: string; // Optional for backward compatibility, but populated in mocks
}

export interface CalendarDay {
  date: string;
  pnl: number;
  tradeCount: number;
}

export interface AiInsight {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface RiskSettings {
  accountSize: number;
  maxDailyLoss: number;
  maxTradeRisk: number;
  maxConsecutiveLosses?: number; // Added: Max consecutive losses before stop
  maxOpenPositions?: number; // NEW: Max simultaneous open trades
  dailyProfitTarget?: number; // NEW: Walk away profit target
  lockedAt?: string; // ISO timestamp when settings were locked
  lastResetAt?: string; // ISO timestamp of last reset
}

export interface TradingRule {
  id: string;
  text: string;
  isActive: boolean;
}

// New Types for Tracker
export type TrackerRuleType = 'no_mistakes' | 'max_loss' | 'daily_trade_limit' | 'win_streak';

export interface TrackerRule {
    id: string;
    type: TrackerRuleType;
    name: string;
    value?: number; // Threshold value (e.g. 3 trades, $200 loss)
    isActive: boolean;
}

export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  title?: string; // Optional title for the note
  folder: string; // 'daily-journal', 'strategy', 'goals', etc.
  content: string; // HTML Content
  focusTickers: string[];
  linkedTradeIds?: string[];
  isDeleted?: boolean; // Soft delete flag
}

export interface ReviewStatus {
  lastDailyReview: string | null;
  lastWeeklyReview: string | null;
  lastMonthlyReview: string | null;
}

export interface ReviewSessionConfig {
    isOpen: boolean;
    type: 'daily' | 'weekly' | 'monthly';
    dateRange: { start: Date; end: Date }; // The period being reviewed
    title: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface StrategyNote {
  id: string;
  title: string;
  content: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  notes?: StrategyNote[]; // Updated to support directory structure
  checklist: ChecklistItem[];
  color?: string;
}

// Social / Friend System
export interface Friend {
    id: string;
    name: string;
    initials: string;
    tier: string; // 'Gold', 'Platinum', etc.
    winRate: number;
    pnl: number;
    color: string; // Chart color
    equityCurve: number[]; // Simplified array of equity values matching user's timeline
    followers?: number;
    isFollowing?: boolean;
    status?: 'online' | 'offline' | 'busy'; // Chat status
    lastSeen?: string;
}

export interface PrivateMessage {
    id: string;
    senderId: string; // 'me' or friendId
    text: string;
    timestamp: string; // ISO
    read: boolean;
}

export interface PrivateMessage {
    id: string;
    senderId: string; // 'me' or friendId
    text: string;
    timestamp: string; // ISO
    read: boolean;
}

export interface Comment {
    id: string;
    authorName: string;
    authorInitials: string;
    content: string;
    timestamp: string;
}

// Plaza Post System
export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorInitials: string;
    authorTier: string;
    content: string;
    timestamp: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    image?: string; // Base64 or URL
    linkedTrade?: Trade; // Embedded Trade
    linkedPlan?: DailyPlan; // Embedded Note
    commentsList?: Comment[]; // List of comments
    quotedPost?: Post; // Reference to another post
}

// Sharing Mechanism
export interface ShareIntent {
    type: 'trade' | 'plan';
    data: Trade | DailyPlan;
}

// --- New Discipline System Types ---
export interface DisciplineRule {
    id: string;
    text: string;
    xpReward: number; // usually 10
}

export interface DailyDisciplineRecord {
    date: string; // YYYY-MM-DD
    completedRuleIds: string[]; // List of IDs completed that day
    totalPossibleXp: number;
    earnedXp: number;
    isSuccess: boolean; // Computed based on threshold (e.g. > 80%)
}

export interface UserLevelProfile {
    level: number;
    currentXp: number;
    nextLevelXp: number; // XP needed to reach next level
    totalLifetimeXp: number;
}

// --- Goal System Types ---
export type GoalType = 'amount' | 'percentage' | 'r_multiple';

export interface WeeklyGoal {
    type: GoalType;
    value: number; // The target value (e.g. 500, 5, 10)
    isActive: boolean;
}

// --- Notification System Types ---
export type NotificationType = 'system' | 'alert' | 'invite' | 'upgrade' | 'removal';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    senderName?: string; // For invites/social
    senderInitials?: string;
}

// --- New Types for Psychology & Calculator ---
export interface EmotionLog {
    id: string;
    date: string;
    score: number; // 1 (Fear) to 10 (Greed), 5 is Neutral
    notes: string;
    tags: string[]; // e.g. "FOMO", "Revenge", "Calm"
}

export interface PositionPlan {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskPercent: number;
    accountSize: number;
}

// --- API Sync Types ---
export interface ExchangeConnection {
    id: string;
    exchange: 'Binance' | 'Bybit' | 'OKX' | 'Coinbase';
    apiKey: string;
    apiSecret: string; // In real app, never store secret in frontend storage like this
    label?: string;
    lastSync?: string;
    isConnected: boolean;
}

// --- AI Report Types ---
export interface Report {
    id: string;
    user_id: string;
    report_type: 'weekly' | 'monthly';
    title: string;
    content: {
        html: string;
        period: string;
        generated_at: string;
    };
    status: 'pending' | 'completed' | 'failed';
    created_at: string;
}
