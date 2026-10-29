import { billingMarket } from '../shared/billing-market.mjs';
export default {
  async fetch(request: Request) {
    const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'x-vercel-ip-country', 'X-Robots-Tag': 'noindex' };
    if (request.method !== 'GET') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers });
    try { return Response.json(billingMarket(request.headers), { headers }); }
    catch { return Response.json({error:'payment_region_unavailable'}, {status:503,headers}); }
  },
};
