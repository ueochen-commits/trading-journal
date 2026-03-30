export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI service not configured' });
    }

    const {
        trades = [],
        plans = [],
        period = 'weekly',
        language = 'cn',
        disciplineHistory = [],
        riskSettings = null
    } = req.body;

    const isChinese = language === 'cn';

    // 统计数据
    const wins = trades.filter((t: any) => t.pnl > 0);
    const losses = trades.filter((t: any) => t.pnl < 0);
    const totalPnl = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const totalFees = trades.reduce((sum: number, t: any) => sum + (t.fees || 0), 0);
    const netPnl = totalPnl - totalFees;
    const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
    const avgWin = wins.length > 0 ? (wins.reduce((s: number, t: any) => s + t.pnl, 0) / wins.length).toFixed(2) : '0';
    const avgLoss = losses.length > 0 ? (losses.reduce((s: number, t: any) => s + t.pnl, 0) / losses.length).toFixed(2) : '0';
    const profitFactor = losses.length > 0 && Math.abs(Number(avgLoss)) > 0
        ? (Math.abs(Number(avgWin)) * wins.length / (Math.abs(Number(avgLoss)) * losses.length)).toFixed(2)
        : 'N/A';

    // 最常犯的错误
    const mistakeCount: Record<string, number> = {};
    trades.forEach((t: any) => {
        (t.mistakes || []).forEach((m: string) => {
            mistakeCount[m] = (mistakeCount[m] || 0) + 1;
        });
    });
    const topMistakes = Object.entries(mistakeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([m, c]) => `${m} (${c}次)`);

    // 策略表现
    const setupStats: Record<string, { wins: number; total: number; pnl: number }> = {};
    trades.forEach((t: any) => {
        if (t.setup) {
            if (!setupStats[t.setup]) setupStats[t.setup] = { wins: 0, total: 0, pnl: 0 };
            setupStats[t.setup].total++;
            setupStats[t.setup].pnl += t.pnl || 0;
            if (t.pnl > 0) setupStats[t.setup].wins++;
        }
    });
    const setupSummary = Object.entries(setupStats)
        .map(([name, s]) => `${name}: ${s.total}笔, 胜率${((s.wins / s.total) * 100).toFixed(0)}%, PnL ${s.pnl.toFixed(2)}`)
        .join('\n');

    // 纪律数据
    const disciplineRate = disciplineHistory.length > 0
        ? ((disciplineHistory.filter((d: any) => d.isSuccess).length / disciplineHistory.length) * 100).toFixed(0)
        : 'N/A';

    const periodLabel = {
        daily: isChinese ? '日报' : 'Daily Report',
        weekly: isChinese ? '周报' : 'Weekly Report',
        monthly: isChinese ? '月报' : 'Monthly Report'
    }[period] || (isChinese ? '报告' : 'Report');

    const prompt = isChinese
        ? `你是一位顶级对冲基金交易主管，正在撰写一份专业的交易${periodLabel}。

【量化数据】
交易期间：${period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '本月'}
总交易次数：${trades.length}
盈利交易：${wins.length} | 亏损交易：${losses.length}
胜率：${winRate}%
总盈亏：${totalPnl.toFixed(2)} | 手续费：${totalFees.toFixed(2)} | 净盈亏：${netPnl.toFixed(2)}
平均盈利：${avgWin} | 平均亏损：${avgLoss}
盈亏比（Profit Factor）：${profitFactor}
纪律执行率：${disciplineRate}%
${topMistakes.length > 0 ? `\n高频错误：\n${topMistakes.join('\n')}` : ''}
${setupSummary ? `\n策略表现：\n${setupSummary}` : ''}
${riskSettings ? `\n风控设置：单日最大亏损 ${riskSettings.maxDailyLoss}，单笔风险 ${riskSettings.maxTradeRisk}` : ''}

【日志内容】
${plans.slice(0, 10).map((p: any) => `${p.date}: ${(p.content || '').replace(/<[^>]*>/g, '').slice(0, 200)}`).join('\n')}

【报告要求】
用 HTML 格式撰写专业${periodLabel}，结构如下：
<h3>📊 执行摘要</h3> — 用数据说话，3-4句核心评估
<h3>📈 量化绩效分析</h3> — 深入分析胜率、盈亏比、各策略表现
<h3>🧠 心理与纪律分析</h3> — 基于高频错误和纪律数据，分析情绪对交易的影响
<h3>⚠️ 关键风险点</h3> — 识别最危险的行为模式
<h3>✅ 下${period === 'daily' ? '交易日' : period === 'weekly' ? '周' : '月'}行动计划</h3> — 具体、可执行的3-5条改进措施

语气：专业、直接、基于数据，像对冲基金内部报告`
        : `You are a top hedge fund trading manager writing a professional ${periodLabel}.

[QUANTITATIVE DATA]
Period: This ${period}
Total trades: ${trades.length}
Winning: ${wins.length} | Losing: ${losses.length}
Win Rate: ${winRate}%
Total P&L: ${totalPnl.toFixed(2)} | Fees: ${totalFees.toFixed(2)} | Net P&L: ${netPnl.toFixed(2)}
Avg Win: ${avgWin} | Avg Loss: ${avgLoss}
Profit Factor: ${profitFactor}
Discipline Rate: ${disciplineRate}%
${topMistakes.length > 0 ? `\nTop Mistakes:\n${topMistakes.join('\n')}` : ''}
${setupSummary ? `\nSetup Performance:\n${setupSummary}` : ''}

[JOURNAL ENTRIES]
${plans.slice(0, 10).map((p: any) => `${p.date}: ${(p.content || '').replace(/<[^>]*>/g, '').slice(0, 200)}`).join('\n')}

[REPORT REQUIREMENTS]
Write a professional ${periodLabel} in HTML format with this structure:
<h3>📊 Executive Summary</h3> — Data-driven, 3-4 sentence core assessment
<h3>📈 Quantitative Performance Analysis</h3> — Deep dive into win rate, profit factor, setup performance
<h3>🧠 Psychology & Discipline Analysis</h3> — Emotion impact based on mistakes and discipline data
<h3>⚠️ Key Risk Factors</h3> — Identify the most dangerous behavioral patterns
<h3>✅ Action Plan for Next ${period === 'daily' ? 'Session' : period === 'weekly' ? 'Week' : 'Month'}</h3> — 3-5 specific, actionable improvements

Tone: Professional, direct, data-driven, like a hedge fund internal report`;

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
                max_tokens: 2000,
                temperature: 0.4
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek error: ${response.status}`);
        }

        const data = await response.json();
        const html = data.choices?.[0]?.message?.content || '';
        return res.status(200).json({ html });

    } catch (error) {
        console.error('ai-report error:', error);
        const errHtml = isChinese
            ? '<h3>报告生成失败</h3><p>AI 服务暂时不可用，请稍后再试。</p>'
            : '<h3>Report Generation Failed</h3><p>AI service temporarily unavailable. Please try again.</p>';
        return res.status(200).json({ html: errHtml });
    }
}
