import { authenticateAiUser } from './ai-access.mjs';
/** @returns {Promise<{status?: number, error?: string, db?: any, user?: any, token?: string, report?: any}>} */
export async function ownedReport(req, client) {
  const auth = await authenticateAiUser(req, client);
  if (auth.error) return { status: auth.status, error: auth.error };
  const reportId=req.body?.reportId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId || '')) return {status:400,error:'INVALID_REPORT'};
  const {data,error}=await auth.db.from('reports').select('*').eq('id',reportId).eq('user_id',auth.user.id).maybeSingle();
  if(error)return {status:503,error:'REPORT_UNAVAILABLE'};
  if(!data)return {status:404,error:'REPORT_NOT_FOUND'};
  return {...auth,report:data};
}
export function reportApiOrigin(env=process.env) {
  // No request Origin/Host is used: private report data and bearer tokens stay on our backend.
  return env.VERCEL_ENV==='preview' && /^[a-z0-9-]+\.vercel\.app$/i.test(env.VERCEL_URL || '') ? `https://${env.VERCEL_URL}` : 'https://dashboard.tradegrail.net';
}
