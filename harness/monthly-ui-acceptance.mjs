// Local UI-only fixture: monthly catalog, with every payment mutation blocked.
import { createServer } from 'node:http';
import { preview } from 'vite';
import { billingMarket } from '../shared/billing-market.mjs';

const api = createServer((req, res) => {
  const path = req.url.split('?')[0];
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (path === '/api/billing-market') return res.end(JSON.stringify(billingMarket({ 'x-vercel-ip-country': 'US' }, { VERCEL: '1' })));
  if (path === '/api/creem/catalog') return res.end(JSON.stringify({ enabled: true, mode: 'test', offers: ['pro', 'elite'].map((plan, i) => ({ plan, cycle: 'monthly', amount: [9, 19][i], currency: 'USD', taxMode: 'exclusive' })) }));
  res.statusCode = 503; res.end(JSON.stringify({ error: 'ui_fixture_no_payment_mutations' }));
});
await new Promise(resolve => api.listen(3022, '127.0.0.1', resolve));
const app = await preview({ preview: { host: '127.0.0.1', port: 3021, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3022' } } });
console.log('Monthly-only UI fixture: http://127.0.0.1:3021 (all payment mutations blocked)');
const stop = () => { app.httpServer.close(); api.close(); process.exit(0); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
