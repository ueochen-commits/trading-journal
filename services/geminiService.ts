import { Trade, DailyPlan, RiskSettings } from '../types';

// --- Local Fallback Quotes ---
const FALLBACK_QUOTES_CN = [
    "纪律是交易者的生命线。",
    "不要为了交易而交易。等待完美的设置。",
    "亏损是生意的一部分，但情绪化亏损不是。",
    "今天的复盘写了吗？没有记录就没有进步。",
    "市场永远是对的，错的只有你的执念。",
    "保护好你的本金，这是你唯一的弹药。",
    "不要让上一笔交易的结果影响下一笔决策。",
    "耐心，耐心，还是耐心。",
    "如果你感到兴奋或恐惧，你现在的仓位太大了。",
    "甚至连最好的交易员也只有50%的胜率，区别在于风控。"
];

const FALLBACK_QUOTES_EN = [
    "Discipline is the bridge between goals and accomplishment.",
    "Plan the trade, trade the plan.",
    "The market doesn't care about your feelings.",
    "Protect your capital at all costs.",
    "Revenge trading is the fastest way to zero.",
    "Are you trading your setup, or your emotions?",
    "Consistency > Intensity.",
    "Wait for the candle close.",
    "If in doubt, stay out.",
    "Your job is not to predict, but to react and manage risk."
];

// --- AI 交易教练（对话）---
export const chatWithAnalyst = async (
    message: string,
    imageBase64: string | null,
    history: { role: string; content: string }[],
    language: 'en' | 'cn' = 'cn',
    trades: Trade[] = [],
    tradingRules: any[] = [],
    riskSettings: any = null
): Promise<{ text: string; tradeData?: any }> => {
    try {
        const response = await fetch('/api/ai-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, trades, language, tradingRules, riskSettings })
        });

        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        return { text: data.text || '' };
    } catch (error) {
        return {
            text: language === 'cn' ? 'AI 服务暂时不可用，请稍后再试。' : 'AI service unavailable. Please try again.'
        };
    }
};

// --- 交易日志分析（AICoach 组件）---
export const analyzeJournal = async (trades: Trade[], language: 'en' | 'cn' = 'cn'): Promise<any> => {
    try {
        const response = await fetch('/api/ai-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trades, language })
        });

        if (!response.ok) throw new Error('API error');
        return await response.json();
    } catch (error) {
        return {
            summary: language === 'cn' ? 'AI 分析服务暂时不可用。' : 'AI analysis temporarily unavailable.',
            insights: [],
            coachMessage: language === 'cn' ? '请稍后再试。' : 'Please try again later.'
        };
    }
};

// --- 专业分析报告（日报/周报/月报）---
export const generatePeriodicReport = async (
    plans: DailyPlan[],
    period: 'weekly' | 'monthly',
    language: 'en' | 'cn' = 'cn',
    trades: Trade[] = [],
    disciplineHistory: any[] = [],
    riskSettings: any = null
): Promise<string> => {
    try {
        const response = await fetch('/api/ai-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trades, plans, period, language, disciplineHistory, riskSettings })
        });

        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        return data.html || '';
    } catch (error) {
        return language === 'cn'
            ? '<h3>报告生成失败</h3><p>AI 服务暂时不可用，请稍后再试。</p>'
            : '<h3>Report Generation Failed</h3><p>AI service temporarily unavailable. Please try again.</p>';
    }
};

// --- Mentor 建议（本地兜底，不消耗 API）---
export const getMentorAdvice = async (
    recentTrades: Trade[],
    recentPlans: DailyPlan[],
    riskSettings: RiskSettings,
    language: 'en' | 'cn' = 'cn'
): Promise<string> => {
    const today = new Date().toDateString();
    const todayTrades = recentTrades.filter(t => new Date(t.entryDate).toDateString() === today);
    const todayLoss = todayTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);

    if (todayLoss <= -Math.abs(riskSettings.maxDailyLoss)) {
        return language === 'cn'
            ? '🛑 停下！你已经触及单日亏损红线。关掉电脑，立刻离开！明天市场还在。'
            : '🛑 STOP! You hit your daily loss limit. Close the screen. Walk away now.';
    }

    const quotes = language === 'cn' ? FALLBACK_QUOTES_CN : FALLBACK_QUOTES_EN;
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// --- 图表分析（已停用）---
export const analyzeChartImage = async (base64Image: string, language: 'en' | 'cn' = 'cn'): Promise<string> => {
    return language === 'cn'
        ? '<p>图表 AI 分析功能暂未开放。</p>'
        : '<p>Chart AI analysis is not available yet.</p>';
};

// --- 仪表板提示（本地返回空，不消耗 API）---
export const generateDashboardTips = async (plans: DailyPlan[], trades: Trade[], language: 'en' | 'cn' = 'cn'): Promise<string[]> => {
    return [];
};
