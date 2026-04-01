export const config = { runtime: 'nodejs' };
import { createClient } from '@supabase/supabase-js';

async function checkAndIncrementAiQuota(userId: string): Promise<string | null> {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const today = new Date().toISOString().split('T')[0];
    const AI_LIMITS: Record<string, number | null> = { free: 5, pro: 100, elite: null };

    const { data: subs } = await supabase.from('subscriptions').select('plan, current_period_end').eq('user_id', userId).eq('status', 'active');
    const validSubs = (subs || []).filter((s: any) => { const end = s.current_period_end ? new Date(s.current_period_end) : null; return !end || end > new Date(); });
    const tierPriority: Record<string, number> = { elite: 3, pro: 2, free: 1 };
    let tier = 'free';
    if (validSubs.length > 0) { validSubs.sort((a: any, b: any) => (tierPriority[b.plan] || 0) - (tierPriority[a.plan] || 0)); tier = validSubs[0].plan; }

    const limit = AI_LIMITS[tier];
    if (limit === null) return null;

    await supabase.from('ai_usage').upsert({ user_id: userId, date: today, count: 0 }, { onConflict: 'user_id,date', ignoreDuplicates: true });
    const { data: current } = await supabase.from('ai_usage').select('count').eq('user_id', userId).eq('date', today).single();
    const currentCount = current?.count ?? 0;
    if (currentCount >= limit) return `AI usage limit reached (${limit}/day for ${tier} plan).`;
    await supabase.from('ai_usage').update({ count: currentCount + 1 }).eq('user_id', userId).eq('date', today);
    return null;
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI service not configured' });
    }

    const { trades = [], language = 'cn', userId } = req.body;

    if (userId) {
        const quotaError = await checkAndIncrementAiQuota(userId);
        if (quotaError) return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: quotaError });
    }

    const isChinese = language === 'cn';

    const tradeData = trades.slice(0, 20).map((t: any) => ({
        symbol: t.symbol,
        status: t.status,
        pnl: t.pnl,
        setup: t.setup || '',
        mistakes: t.mistakes || [],
        direction: t.direction,
        date: t.date || t.entryDate
    }));

    const wins = tradeData.filter((t: any) => t.pnl > 0).length;
    const losses = tradeData.filter((t: any) => t.pnl < 0).length;
    const totalPnl = tradeData.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const winRate = tradeData.length > 0 ? ((wins / tradeData.length) * 100).toFixed(1) : '0';

    const prompt = isChinese
        ? `分析以下交易数据，以专业交易教练的视角给出评估。

交易数据：
${JSON.stringify(tradeData, null, 2)}

统计摘要：
- 总交易数：${tradeData.length}，盈利：${wins}，亏损：${losses}
- 胜率：${winRate}%
- 总盈亏：${totalPnl.toFixed(2)}

请严格按以下 JSON 格式返回，不要添加任何额外文字：
{
  "summary": "2-3句话的整体评估",
  "insights": [
    { "title": "洞察标题", "description": "具体描述", "type": "positive" },
    { "title": "洞察标题", "description": "具体描述", "type": "negative" },
    { "title": "洞察标题", "description": "具体描述", "type": "neutral" }
  ],
  "coachMessage": "给交易者的一段激励或警示的话（2-3句）"
}`
        : `Analyze the following trade data as a professional trading coach.

Trade data:
${JSON.stringify(tradeData, null, 2)}

Summary stats:
- Total trades: ${tradeData.length}, Wins: ${wins}, Losses: ${losses}
- Win rate: ${winRate}%
- Total P&L: ${totalPnl.toFixed(2)}

Return ONLY this JSON format, no additional text:
{
  "summary": "2-3 sentence overall assessment",
  "insights": [
    { "title": "insight title", "description": "specific description", "type": "positive" },
    { "title": "insight title", "description": "specific description", "type": "negative" },
    { "title": "insight title", "description": "specific description", "type": "neutral" }
  ],
  "coachMessage": "A 2-3 sentence motivational or cautionary message for the trader"
}`;

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.5,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '{}';
        const result = JSON.parse(text);
        return res.status(200).json(result);

    } catch (error) {
        console.error('ai-analyze error:', error);
        return res.status(200).json({
            summary: isChinese ? 'AI 分析服务暂时不可用。' : 'AI analysis temporarily unavailable.',
            insights: [],
            coachMessage: isChinese ? '请稍后再试。' : 'Please try again later.'
        });
    }
}
