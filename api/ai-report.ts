export const config = { runtime: 'nodejs' };
import { checkAndIncrementAiQuota } from '../lib/aiQuota';

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
        riskSettings = null,
        userId
    } = req.body;

    if (userId) {
        const quotaError = await checkAndIncrementAiQuota(userId);
        if (quotaError) return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: quotaError });
    }

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

【报告输出规范】
直接输出 HTML，禁止使用 markdown 代码块（不要加 \`\`\`html）。
禁止在任何标题或正文中使用 emoji 符号。
风格参考：摩根士丹利、高盛的机构研究报告——极度专业、冷静克制、数据驱动。

HTML 结构如下（使用内联 CSS 确保专业外观）：

<div style="font-family: 'Georgia', serif; color: #1a1a2e; line-height: 1.8;">

<div style="border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 28px;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px; flex-shrink: 0;">
        <rect x="4" y="14" width="4" height="6" rx="1" fill="#94a3b8"/>
        <rect x="10" y="8" width="4" height="12" rx="1" fill="#6366f1"/>
        <rect x="16" y="4" width="4" height="16" rx="1" fill="#818cf8"/>
      </svg>
      <div>
        <div style="font-size: 15px; font-weight: bold; letter-spacing: 1px; color: #1a1a2e; font-family: 'Georgia', serif;">TRADEGRAIL</div>
        <div style="font-size: 10px; letter-spacing: 1.5px; color: #6366f1; text-transform: uppercase; margin-top: 1px;">Trade with Discipline. Grow with Insight.</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 10px; color: #999; letter-spacing: 0.5px;">tradegrail.net</div>
    </div>
  </div>
  <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-bottom: 8px;">CONFIDENTIAL — FOR INTERNAL USE ONLY</div>
  <h1 style="font-size: 22px; font-weight: bold; margin: 0; color: #1a1a2e;">${periodLabel}</h1>
  <div style="font-size: 12px; color: #666; margin-top: 6px;">报告期间：${period === 'daily' ? '本交易日' : period === 'weekly' ? '本周' : '本月'} | 生成日期：${new Date().toLocaleDateString('zh-CN')}</div>
</div>

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">I. 执行摘要</h2>
[内容]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">II. 量化绩效分析</h2>
[内容，包含数据表格，使用 <table style="width:100%;border-collapse:collapse;"> <th style="background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left;font-size:12px;"> <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">III. 行为与纪律评估</h2>
[内容]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">IV. 风险因素识别</h2>
[内容]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">V. 改进建议与行动计划</h2>
[内容，使用编号列表]

<div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>本报告由 TradeGrail AI 分析系统自动生成，基于用户交易数据，仅供参考，不构成投资建议。</div>
    <div style="font-size: 10px; color: #bbb;">tradegrail.net</div>
  </div>
</div>
</div>

语气：克制、客观、精准，全程不使用感叹号，不使用口语化表达`
        : `You are a senior research analyst at a top-tier investment bank (Goldman Sachs / Morgan Stanley style) writing an institutional-grade trading performance report.

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

[OUTPUT REQUIREMENTS]
Output HTML directly. No markdown code blocks. No \`\`\`html. No emoji symbols anywhere.
Style: Institutional research report — Morgan Stanley / Goldman Sachs level. Cold, data-driven, precise.

HTML structure:
<div style="font-family: 'Georgia', serif; color: #1a1a2e; line-height: 1.8;">

<div style="border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 28px;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px; flex-shrink: 0;">
        <rect x="4" y="14" width="4" height="6" rx="1" fill="#94a3b8"/>
        <rect x="10" y="8" width="4" height="12" rx="1" fill="#6366f1"/>
        <rect x="16" y="4" width="4" height="16" rx="1" fill="#818cf8"/>
      </svg>
      <div>
        <div style="font-size: 15px; font-weight: bold; letter-spacing: 1px; color: #1a1a2e; font-family: 'Georgia', serif;">TRADEGRAIL</div>
        <div style="font-size: 10px; letter-spacing: 1.5px; color: #6366f1; text-transform: uppercase; margin-top: 1px;">Trade with Discipline. Grow with Insight.</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 10px; color: #999; letter-spacing: 0.5px;">tradegrail.net</div>
    </div>
  </div>
  <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #666;">CONFIDENTIAL — FOR INTERNAL USE ONLY</div>
  <h1 style="font-size: 22px; font-weight: bold; margin: 4px 0; color: #1a1a2e;">${periodLabel}</h1>
  <div style="font-size: 12px; color: #666;">Report Period: This ${period} | Generated: ${new Date().toLocaleDateString('en-US')}</div>
</div>

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">I. Executive Summary</h2>
[content]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">II. Quantitative Performance Analysis</h2>
[content with data tables: <table style="width:100%;border-collapse:collapse;"> <th style="background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left;font-size:12px;"> <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">III. Behavioral & Discipline Assessment</h2>
[content]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">IV. Risk Factor Identification</h2>
[content]

<h2 style="font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px;">V. Recommendations & Action Plan</h2>
[numbered list]

<div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>This report was generated by TradeGrail AI analysis system based on user trading data. For reference only. Not investment advice.</div>
    <div style="font-size: 10px; color: #bbb;">tradegrail.net</div>
  </div>
</div>
</div>

Tone: Restrained, objective, precise. No exclamation marks. No colloquial language.`;

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
        const raw = data.choices?.[0]?.message?.content || '';
        // 去除 AI 可能包裹的 markdown 代码块
        const html = raw.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
        return res.status(200).json({ html });

    } catch (error) {
        console.error('ai-report error:', error);
        const errHtml = isChinese
            ? '<h3>报告生成失败</h3><p>AI 服务暂时不可用，请稍后再试。</p>'
            : '<h3>Report Generation Failed</h3><p>AI service temporarily unavailable. Please try again.</p>';
        return res.status(200).json({ html: errHtml });
    }
}
