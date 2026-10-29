import { billingRoute } from '../../server/creem.mjs';

// Native Vercel Web handler: preserve exact webhook bytes without Node's lazy body parser.
export default {
  async fetch(request: Request) {
    const action = new URL(request.url).pathname.split('/').pop()!;
    if (!['checkout', 'catalog', 'status', 'portal', 'webhook'].includes(action)) return Response.json({ error: 'not_found' }, { status: 404 });
    let body: unknown;
    if (request.method === 'POST') {
      if (Number(request.headers.get('content-length')) > 512 * 1024) return Response.json({ error: 'payload_too_large' }, { status: 413 });
      const bytes = Buffer.from(await request.arrayBuffer());
      if (bytes.length > 512 * 1024) return Response.json({ error: 'payload_too_large' }, { status: 413 });
      try { body = action === 'webhook' ? bytes : JSON.parse(bytes.toString('utf8')); }
      catch { return Response.json({ error: 'invalid_payload' }, { status: 400 }); }
    }
    let status = 200; const headers = new Headers();
    const res = {
      setHeader(name: string, value: string) { headers.set(name, value); },
      status(code: number) { status = code; return this; },
      json(value: unknown) { return Response.json(value, { status, headers }); },
    };
    return billingRoute(action, { method: request.method, headers: Object.fromEntries(request.headers), body }, res);
  },
};
