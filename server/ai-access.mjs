import { createClient } from '@supabase/supabase-js';

export async function authenticateAiUser(req, client) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { status: 401, error: 'AUTH_REQUIRED' };
  try {
    const db = client || createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user?.email_confirmed_at) return { status: 401, error: 'AUTH_REQUIRED' };
    return { db, user: data.user, token };
  } catch { return { status: 503, error: 'QUOTA_UNAVAILABLE' }; }
}
export async function checkAiAccess(req, client) {
  const auth = await authenticateAiUser(req, client);
  if (auth.error) return { status: auth.status, error: auth.error };
  try {
    const quota = await auth.db.rpc('consume_ai_quota', { p_user_id: auth.user.id });
    if (quota.error || !quota.data) return { status: 503, error: 'QUOTA_UNAVAILABLE' };
    return quota.data.allowed ? null : { status: 429, error: 'QUOTA_EXCEEDED' };
  } catch { return { status: 503, error: 'QUOTA_UNAVAILABLE' }; }
}
