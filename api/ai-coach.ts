export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI service not configured' });
    }

    const { message, history = [], trades = [], language = 'cn', tradingRules = [], riskSettings = null } = req.body;

    // 构建交易数据摘要（限制 token 用量）
    const recentTrades = trades.slice(0, 30).map((t: any) => ({
        date: t.date || t.entryDate,
        symbol: t.symbol,
        direction: t.direction,
        pnl: t.pnl,
        status: t.status,
        setup: t.setup || '',
        mistakes: t.mistakes || [],
        notes: t.notes || ''
    }));

    const totalPnl = recentTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const wins = recentTrades.filter((t: any) => t.pnl > 0).length;
    const winRate = recentTrades.length > 0 ? ((wins / recentTrades.length) * 100).toFixed(1) : '0';

    const isChinese = language === 'cn';

    const systemPrompt = isChinese
        ? `你是一名顶级交易教练，拥有对冲基金级别的专业知识。你现在正在辅导这位交易者。

【交易者的真实数据】
最近 ${recentTrades.length} 笔交易统计：
- 总盈亏：${totalPnl.toFixed(2)}
- 胜率：${winRate}%
- 盈利交易：${wins} 笔，亏损交易：${recentTrades.length - wins} 笔

最近交易明细：
${JSON.stringify(recentTrades.slice(0, 15), null, 2)}

${tradingRules.length > 0 ? `交易者设定的规则：\n${tradingRules.map((r: any) => `- ${r.text}`).join('\n')}` : ''}
${riskSettings ? `风险设置：单日最大亏损 ${riskSettings.maxDailyLoss}，单笔最大风险 ${riskSettings.maxTradeRisk}` : ''}

【你的任务】
根据以上真实数据，回答交易者的问题。要求：
1. 直接引用具体数据支撑你的分析
2. 语言专业但不失亲切，像一个严格但关心学生的导师
3. 指出具体问题并给出可执行的改进建议
4. 回复长度适中，重点突出
5. 禁止使用任何 Markdown 格式（不要用 **、*、##、# 等符号），用纯文本回复`
        : `You are an elite trading coach with hedge fund-level expertise, currently mentoring this trader.

[TRADER'S REAL DATA]
Last ${recentTrades.length} trades summary:
- Total P&L: ${totalPnl.toFixed(2)}
- Win Rate: ${winRate}%
- Wins: ${wins}, Losses: ${recentTrades.length - wins}

Recent trades:
${JSON.stringify(recentTrades.slice(0, 15), null, 2)}

${tradingRules.length > 0 ? `Trader's rules:\n${tradingRules.map((r: any) => `- ${r.text}`).join('\n')}` : ''}
${riskSettings ? `Risk settings: Max daily loss ${riskSettings.maxDailyLoss}, Max trade risk ${riskSettings.maxTradeRisk}` : ''}

[YOUR TASK]
Answer the trader's question based on the real data above.
Requirements:
1. Reference specific data to support your analysis
2. Be professional yet approachable, like a strict but caring mentor
3. Identify specific issues and give actionable improvements
4. Keep responses concise and focused
5. No Markdown formatting — no **, *, ##, or # symbols. Plain text only`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map((h: any) => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content })),
        { role: 'user', content: message }
    ];

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages,
                max_tokens: 800,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('DeepSeek error:', err);
            return res.status(500).json({ error: 'AI service error' });
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const text = raw.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^#{1,3}\s/gm, '');
        return res.status(200).json({ text });

    } catch (error) {
        console.error('ai-coach error:', error);
        return res.status(500).json({
            text: isChinese ? 'AI 服务暂时不可用，请稍后再试。' : 'AI service unavailable. Please try again.'
        });
    }
}
