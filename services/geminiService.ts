import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { Trade, DailyPlan, RiskSettings } from '../types';

// --- Helper: Retry Logic with Quota Protection ---
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        // Stop retrying if we hit a hard quota limit (429 Resource Exhausted)
        if (error.status === 429 || (error.message && error.message.includes('429')) || (error.message && error.message.includes('quota'))) {
            console.warn("Gemini Quota Exceeded. Switching to fallback mode.");
            throw new Error("QUOTA_EXHAUSTED"); // Custom error to be caught by caller
        }

        if (retries > 0 && (error.status === 503 || error.status === 500)) {
            // Only retry on server errors
            console.warn(`Retrying Gemini request... attempts left: ${retries}`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

// --- Local Fallback Quotes (Disciplined Persona) ---
const FALLBACK_QUOTES_CN = [
    "纪律是交易者的生命线。",
    "不要为了交易而交易。等待完美的设置。",
    "亏损是生意的一部分，但情绪化亏损不是。",
    "今天的复盘写了吗？没有记录就没有进步。",
    "市场永远是对的，错的只有你的执念。",
    "保护好你的本金，这是你唯一的弹药。",
    "不要让上一笔交易的结果影响下一笔决策。",
    "甚至连最好的交易员也只有50%的胜率，区别在于风控。",
    "耐心，耐心，还是耐心。",
    "如果你感到兴奋或恐惧，你现在的仓位太大了。"
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

const logTradeTool: FunctionDeclaration = {
    name: "log_trade",
    description: "Logs a new trade into the user's journal. CALL THIS ONLY when you have specific values for Symbol, Direction, Entry Price, and Quantity.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            symbol: { type: Type.STRING, description: "The ticker symbol (e.g., BTCUSDT, AAPL)." },
            direction: { type: Type.STRING, description: "Direction: 'LONG' (buy) or 'SHORT' (sell)." },
            entryPrice: { type: Type.NUMBER, description: "The specific entry price." },
            quantity: { type: Type.NUMBER, description: "The position size/quantity." },
            setup: { type: Type.STRING, description: "The strategy (e.g., Breakout)." },
            notes: { type: Type.STRING, description: "Context or emotions." },
            leverage: { type: Type.NUMBER, description: "Leverage multiplier used (e.g., 5 for 5x, 10 for 10x)." },
            pnl: { type: Type.NUMBER, description: "The realized Profit or Loss amount if mentioned (e.g. 500 for $500 profit, -200 for $200 loss)." }
        },
        required: ["symbol", "direction", "entryPrice"]
    }
};

// --- New: Get Mentor Advice ---
export const getMentorAdvice = async (
    recentTrades: Trade[], 
    recentPlans: DailyPlan[], 
    riskSettings: RiskSettings,
    language: 'en' | 'cn' = 'cn'
): Promise<string> => {
    // 1. Local Rule Checks (Immediate Feedback)
    const today = new Date().toDateString();
    const todayTrades = recentTrades.filter(t => new Date(t.entryDate).toDateString() === today);
    const todayLoss = todayTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
    
    // Hard rule check: Max Loss
    if (todayLoss <= -Math.abs(riskSettings.maxDailyLoss)) {
        return language === 'cn' 
            ? "🛑 停下！你已经触及单日亏损红线。关掉电脑，立刻离开！明天市场还在。" 
            : "🛑 STOP! You hit your daily loss limit. Close the screen. Walk away now.";
    }

    if (!process.env.API_KEY) {
        const quotes = language === 'cn' ? FALLBACK_QUOTES_CN : FALLBACK_QUOTES_EN;
        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    // 2. AI Generation
    const tradeSummary = recentTrades.slice(0, 3).map(t => `${t.symbol} (${t.status}, PnL: ${t.pnl})`).join(', ');
    const lastPlan = recentPlans[0]?.content.replace(/<[^>]*>?/gm, '').slice(0, 50) || "No recent journal";

    const prompt = `
        Roleplay: You are an elite, stoic, and extremely disciplined Trading Mentor.
        
        Context:
        - Recent Trades: ${tradeSummary || "None today"}
        - Recent Journal: ${lastPlan}
        - Current PnL Today: ${todayLoss}
        
        Task: Give a ONE SENTENCE short, punchy piece of advice, warning, or comfort.
        Tone: Strict, Professional, Concise. Max 20 words.
        Language: ${language === 'cn' ? "Chinese (中文)" : "English"}
    `;

    try {
        // Create new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        }));
        
        return response.text?.trim() || (language === 'cn' ? "保持专注，严格执行你的计划。" : "Stay focused. Execute your plan.");
    } catch (error) {
        // Fallback for quota limit or other API errors
        console.log("Using fallback quote due to API error.");
        const quotes = language === 'cn' ? FALLBACK_QUOTES_CN : FALLBACK_QUOTES_EN;
        return quotes[Math.floor(Math.random() * quotes.length)];
    }
};

export const analyzeChartImage = async (base64Image: string, language: 'en' | 'cn' = 'cn'): Promise<string> => {
    if (!process.env.API_KEY) {
        return language === 'cn' ? "<p><em>请配置 API Key 以使用 AI 图表分析功能。</em></p>" : "<p><em>Please configure API Key to use AI Chart Analysis.</em></p>";
    }

    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const langInstruction = language === 'cn' ? "请用**中文**回答。" : "Please answer in **English**.";

    const prompt = `
        Analyze this trading chart image.
        Structure response in HTML (<h3>, <ul>, <li>, <p>).
        Focus on: 1. Trend 2. Key Levels 3. Patterns 4. Actionable Plan.
        Keep it concise.
        ${langInstruction}
    `;

    try {
        // Create new GoogleGenAI instance right before making an API call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64
                        }
                    }
                ]
            }
        }));

        return response.text || (language === 'cn' ? "<p>AI 无法生成分析结果。</p>" : "<p>AI could not generate analysis.</p>");
    } catch (error) {
        console.error("Gemini Image Analysis Error:", error);
        return language === 'cn' ? "<p>AI 服务暂时不可用（配额超限），请稍后再试。</p>" : "<p>AI service temporarily unavailable (quota exceeded).</p>";
    }
};

export const analyzeJournal = async (trades: Trade[], language: 'en' | 'cn' = 'cn'): Promise<any> => {
  if (!process.env.API_KEY) {
    return {
        summary: language === 'cn' ? "API Key 未配置。" : "API Key missing.",
        insights: [],
        coachMessage: language === 'cn' ? "请配置 API Key。" : "Please configure API Key."
    };
  }

  // Optimize token usage
  const tradeData = trades.slice(0, 20).map(t => ({ // Limit to last 20 trades to save tokens
    symbol: t.symbol,
    status: t.status,
    pnl: t.pnl,
    setup: t.setup
  }));

  const prompt = `
    Analyze these trades. Return JSON: { "summary": string, "insights": [{ "title": string, "description": string, "type": "positive"|"negative"|"neutral" }], "coachMessage": string }.
    Language: ${language === 'cn' ? "Chinese" : "English"}.
    Data: ${JSON.stringify(tradeData)}
  `;

  try {
    // Create new GoogleGenAI instance right before making an API call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                insights: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["positive", "negative", "neutral"] }
                        }
                    }
                },
                coachMessage: { type: Type.STRING }
            }
        }
      }
    }));

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Return mock error object so UI doesn't crash
    return {
        summary: language === 'cn' ? "AI 分析服务暂时繁忙。" : "AI Analysis service is busy.",
        insights: [{
            title: "Quota Limit",
            description: language === 'cn' ? "已达到 API 调用限制。请稍后再试。" : "API quota reached. Try again later.",
            type: "neutral"
        }],
        coachMessage: language === 'cn' ? "休息一下，喝杯咖啡吧。" : "Take a break."
    };
  }
};

export const generatePeriodicReport = async (
    plans: DailyPlan[], 
    period: 'weekly' | 'monthly', 
    language: 'en' | 'cn' = 'cn'
): Promise<string> => {
    if (!process.env.API_KEY) {
        return language === 'cn' 
            ? "<h3>API Key 未配置</h3><p>请在设置中配置 API Key 以使用高级 AI 报告功能。</p>" 
            : "<h3>API Key Missing</h3><p>Please configure your API Key to use this feature.</p>";
    }

    const reportTitle = period === 'weekly' 
        ? (language === 'cn' ? "周度交易深度复盘" : "Weekly Trading Analysis")
        : (language === 'cn' ? "月度交易深度复盘" : "Monthly Trading Analysis");

    // Extract text content from recent plans
    const journalContent = plans.map(p => `Date: ${p.date}\nContent: ${p.content.replace(/<[^>]*>?/gm, '')}`).join('\n---\n');

    const prompt = `
        You are a professional Hedge Fund Manager reviewing a trader's journal.
        
        Task: Generate a ${period} performance report based on the following journal entries.
        Language: ${language === 'cn' ? "Chinese (Mandarin)" : "English"}
        Format: HTML (Use <h3>, <ul>, <li>, <p>, <strong>, <blockquote>). No markdown ticks.
        
        Structure:
        1. <h3> Executive Summary (${reportTitle})
        2. <h3> Psychological Analysis (Identify emotions: Fear, Greed, Tilt)
        3. <h3> Technical Execution (Mistakes made, setups worked)
        4. <h3> Key Actionable Items for Next ${period === 'weekly' ? 'Week' : 'Month'}
        
        Journal Entries:
        ${journalContent.substring(0, 10000)} // Limit context size
    `;

    try {
        // Create new GoogleGenAI instance right before making an API call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        }));

        return response.text || (language === 'cn' ? "<p>无法生成报告。</p>" : "<p>Could not generate report.</p>");
    } catch (error) {
        console.error("Gemini Report Generation Error:", error);
        return language === 'cn' 
            ? "<p>报告生成失败（可能是 API 配额限制或网络问题）。请稍后再试。</p>" 
            : "<p>Report generation failed (API quota or network issue). Try again later.</p>";
    }
};

export const generateDashboardTips = async (plans: DailyPlan[], trades: Trade[], language: 'en' | 'cn' = 'cn'): Promise<string[]> => {
    if (!process.env.API_KEY) return [];

    try {
        const prompt = `
            Analyze recent trading performance.
            Generate 3 short, actionable tips (max 15 words each).
            Language: ${language === 'cn' ? "Chinese" : "English"}.
            Output JSON Array of strings.
        `;

        // Create new GoogleGenAI instance right before making an API call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        }));

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        return []; // Fail silently for dashboard tips
    }
};

export const chatWithAnalyst = async (
    message: string, 
    imageBase64: string | null, 
    history: {role: string, content: string}[],
    language: 'en' | 'cn' = 'cn'
): Promise<{ text: string, tradeData?: any }> => {
    if (!process.env.API_KEY) return { text: "Please configure your API Key." };

    try {
        const systemInstruction = `You are a Trading Analyst. Help log trades. Language: ${language === 'cn' ? 'Chinese' : 'English'}.`;
        
        const contents: any[] = history.slice(-4).map(h => ({ // Limit history context
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));

        const parts: any[] = [{ text: message }];
        if (imageBase64) {
            const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        }
        contents.push({ role: 'user', parts });

        // Create new GoogleGenAI instance right before making an API call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 300,
                tools: [{ functionDeclarations: [logTradeTool] }]
            }
        }));

        // Access functionCalls property directly from the response object
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            if (call && call.name === 'log_trade') {
                return {
                    text: language === 'cn' ? "收到了，正在记录..." : "Got it, logging trade...",
                    tradeData: call.args
                };
            }
        }

        return { text: response.text || "..." };
    } catch (error) {
        return { text: language === 'cn' ? "AI 服务暂时不可用。" : "AI Service unavailable." };
    }
};