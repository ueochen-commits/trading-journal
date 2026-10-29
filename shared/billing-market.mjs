import ipaddr from 'ipaddr.js';
// Versioned launch prices. Country comes from Vercel, never browser language or a client parameter.
export const PRICE_VERSION = '2026-10-v2';
export const PRICES = Object.freeze({
  CNY: Object.freeze({ pro: { monthly: 29, yearly: 290 }, elite: { monthly: 69, yearly: 690 } }),
  USD: Object.freeze({ pro: { monthly: 9, yearly: 90 }, elite: { monthly: 19, yearly: 190 } }),
});
// Cloudflare public proxy ranges checked 2026-10-29 against its official IPv4/IPv6 lists.
// Vercel overwrites X-Forwarded-For unless an Enterprise Trusted Proxy is configured.
const proxyRanges = ['173.245.48.0/20','103.21.244.0/22','103.22.200.0/22','103.31.4.0/22','141.101.64.0/18','108.162.192.0/18','190.93.240.0/20','188.114.96.0/20','197.234.240.0/22','198.41.128.0/17','162.158.0.0/15','104.16.0.0/13','104.24.0.0/14','172.64.0.0/13','131.0.72.0/22','2400:cb00::/32','2606:4700::/32','2803:f800::/32','2405:b500::/32','2405:8100::/32','2a06:98c0::/29','2c0f:f248::/32'].map(value => ipaddr.parseCIDR(value));
function cloudflareProxy(value) {
  try { const ip=ipaddr.process(value); return proxyRanges.some(([range,bits])=>ip.kind()===range.kind()&&ip.match(range,bits)); } catch { return false; }
}
export function billingMarket(headers = {}, env = process.env) {
  const header = name => typeof headers.get === 'function' ? headers.get(name) : headers[name];
  const proxied = env.VERCEL === '1' && cloudflareProxy(header('x-forwarded-for'));
  // CF-IPCountry is only accepted behind the known CDN, never by presence alone.
  const value = proxied ? header('cf-ipcountry') : header('x-vercel-ip-country');
  if (proxied && !value) throw Error('payment_region_unavailable');
  // Local requests cannot spoof production geography. Tests inject the hosting environment.
  const country = env.VERCEL === '1' && typeof value === 'string' && /^[A-Z]{2}$/.test(value) ? value : null;
  const currency = country === 'CN' ? 'CNY' : 'USD';
  return { country, currency, provider: currency === 'CNY' ? 'xorpay' : 'creem', version: PRICE_VERSION, prices: PRICES[currency] };
}
