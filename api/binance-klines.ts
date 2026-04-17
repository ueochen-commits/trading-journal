export const config = {
  runtime: 'nodejs',
  regions: ['sin1'],
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, interval, startTime, endTime } = req.body;

  if (!symbol || !interval) {
    return res.status(400).json({ error: 'Missing symbol or interval' });
  }

  try {
    const params = new URLSearchParams({
      symbol,
      interval,
      limit: '1500',
    });
    if (startTime) params.set('startTime', String(startTime));
    if (endTime) params.set('endTime', String(endTime));

    const url = `https://fapi.binance.com/fapi/v1/klines?${params}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: text });
    }

    const data = await resp.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
