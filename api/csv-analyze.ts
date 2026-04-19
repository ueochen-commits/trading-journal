export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  const { headers, sampleRows, exchangeName, timezone } = req.body;
  if (!headers || !sampleRows) return res.status(400).json({ error: 'Missing headers or sampleRows' });

  const systemPrompt = `你是一个交易数据结构分析专家。用户会提供一个交易记录 CSV/Excel 的表头和前15行数据。
你的任务是：
1. 判断这份数据是哪种记录类型
2. 识别每一列对应的字段
3. 返回解析规则 JSON

## 第一步：判断记录类型（recordType）

"paired_trades"（已整理的完整交易记录）：
- 每行已经是一笔完整交易，包含开仓和平仓信息
- 通常有盈亏字段（盈利、PnL、Profit、收益等）
- 可能有方向字段（long/short/做多/做空）
- 示例：手写交易日志、已整理的复盘表格、交易所的 Trade History

"raw_orders"（原始订单流，需要配对）：
- 每行是单边操作（BUY 或 SELL），没有盈亏字段
- 需要把同一品种的 BUY+SELL 配对才能得到完整交易
- 示例：交易所的 Order History、原始成交记录

## 第二步：时间字段规则

- 只有一个时间列 → openTime 映射到该列，closeTime 为 null
- 有两个时间列（开仓+平仓）→ 分别映射
- openTime 必须是真实存在的列名，绝对不能为 null

## 第三步：缺字段处理

- symbol 缺失 → 映射为 null（代码会填 "UNKNOWN"）
- openPrice/closePrice 缺失 → 映射为 null（代码会填 0）
- side 缺失 → 映射为 null（代码会默认 long）
- netPnl 缺失但有 grossPnl → 映射 grossPnl 到 netPnl
- 手写记录可能只有盈亏金额，没有价格和品种，这是正常的

## 返回格式

返回严格的 JSON，不要包含任何其他文字或 Markdown 标记：
{
  "recordType": "paired_trades" | "raw_orders",
  "detectedExchange": "Binance" | "Bybit" | "OKX" | "Bitget" | "Custom" | "Unknown",
  "detectedAccountType": "futures" | "spot" | "margin" | "manual" | "unknown",
  "confidence": 0到100的整数,
  "fieldMapping": {
    "openTime": "源表格中真实存在的列名（必填）",
    "closeTime": "源表格中的列名或null",
    "symbol": "源表格中的列名或null",
    "side": "源表格中的列名或null",
    "quantity": "源表格中的列名或null",
    "openPrice": "源表格中的列名或null",
    "closePrice": "源表格中的列名或null",
    "netPnl": "源表格中的列名或null",
    "grossPnl": "源表格中的列名或null",
    "commission": "源表格中的列名或null"
  },
  "sideValues": {
    "long": ["Buy", "做多", "LONG", "long"],
    "short": ["Sell", "做空", "SHORT", "short"]
  },
  "dateFormat": "识别到的日期格式，如 YYYY-MM-DD HH:mm:ss",
  "warnings": ["任何识别不确定的字段说明，或缺失的重要字段"]
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
        max_tokens: 1800,
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
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const rules = JSON.parse(cleaned);
    return res.status(200).json(rules);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to parse AI response', detail: e.message });
  }
}
