export const config = { runtime: 'nodejs' };
export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if(req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  return res.status(410).json({error:'integration_paused', message:'API sync is paused. Use manual entry or CSV import; existing journal data is preserved.'});
}
