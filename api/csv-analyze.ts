export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { headers, sampleRows, exchangeName, timezone } = req.body;
  if (!headers || !sampleRows) return res.status(400).json({ error: 'Missing headers or sampleRows' });

  const systemPrompt = `你是一个交易数据结构分析专家。用户会提供一个交易记录 CSV/Excel 的表头和前15行数据。
你的任务是分析这个文件来自哪个交易所，以及每一列对应我们系统中的哪个字段。

关于时间字段的处理规则（非常重要）：
- 如果文件只有一个时间列（如"时间"、"Time"、"Date"、"日期"等），把它映射到 openTime，closeTime 设为 null
- 如果文件有两个时间列（如"开仓时间"+"平仓时间"，或"Open Time"+"Close Time"），分别映射到 openTime 和 closeTime
- openTime 必须映射到一个真实存在的列名，绝对不能为 null

我们的目标字段结构：
- openTime: 开仓/交易时间（必填，如果只有一个时间列就用它）
- closeTime: 平仓时间（可选，只有文件明确有两个时间列时才填，否则为 null）
- symbol: 交易品种（如 BTCUSDT）
- side: 方向，必须是 'long' 或 'short'
- quantity: 数量（浮点数）
- openPrice: 开仓价格
- closePrice: 平仓价格（可选，没有则为 null）
- netPnl: 净盈亏（浮点数，已扣除手续费）
- grossPnl: 毛盈亏（可选，没有则为 null）
- commission: 手续费（正数，没有则为 null）

返回严格的 JSON，不要包含任何其他文字或 Markdown 标记：
{
  "detectedExchange": "Binance" | "Bybit" | "OKX" | "Bitget" | "Unknown",
  "detectedAccountType": "futures" | "spot" | "margin" | "unknown",
  "confidence": 0到100的整数,
  "fieldMapping": {
    "openTime": "源表格中真实存在的列名（必填，不能为null）",
    "closeTime": "源表格中的列名或null",
    "symbol": "源表格中的列名",
    "side": "源表格中的列名",
    "quantity": "源表格中的列名",
    "openPrice": "源表格中的列名",
    "closePrice": "源表格中的列名或null",
    "netPnl": "源表格中的列名",
    "grossPnl": "源表格中的列名或null",
    "commission": "源表格中的列名或null"
  },
  "sideValues": {
    "long": ["Buy", "做多", "LONG"],
    "short": ["Sell", "做空", "SHORT"]
  },
  "dateFormat": "识别到的日期格式，如 YYYY-MM-DD HH:mm:ss",
  "warnings": ["任何识别不确定的字段说明"]
}`;

  const userPrompt = `交易所提示：${exchangeName || '未知'}
用户时区：${timezone || 'UTC+8'}

表头：${JSON.stringify(headers)}

前15行数据：
${JSON.stringify(sampleRows, null, 2)}`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1500,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'AI service error', detail: err });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const rules = JSON.parse(cleaned);
    return res.status(200).json(rules);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to parse AI response', detail: e.message });
  }
}
