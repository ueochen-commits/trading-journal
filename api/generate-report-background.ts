import { aiReviewPayload } from '../utils/aiReviewPayload.mjs';
import { ownedReport, reportApiOrigin } from '../server/background-report.mjs';
export const config = { runtime: 'nodejs' };
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const owned = await ownedReport(req);
  if (owned.error) return res.status(owned.status).json({ error: owned.error });
  const { db, user, report, token } = owned;
  if (report.status === 'completed') return res.status(200).json({ success: true });
  try {
    const { trades, plans, disciplineHistory, riskSettings, language } = report.content?.metadata || {};
    const response = await fetch(`${reportApiOrigin()}/api/ai-report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trades: aiReviewPayload(trades), period: report.report_type, language })
    });
    if (!response.ok) throw Error('AI report generation failed');
    const { html } = await response.json();
    if (typeof html !== 'string' || !html.trim()) throw Error('Empty report');
    const { error } = await db.from('reports').update({ status: 'completed', content: { html, period: report.report_type, generated_at: new Date().toISOString(), metadata: report.content.metadata } }).eq('id', report.id).eq('user_id', user.id);
    if (error) throw Error('Report persistence failed');
    return res.status(200).json({ success: true });
  } catch {
    await db.from('reports').update({ status: 'failed' }).eq('id', report.id).eq('user_id', user.id);
    return res.status(500).json({ error: 'Report generation failed' });
  }
}
