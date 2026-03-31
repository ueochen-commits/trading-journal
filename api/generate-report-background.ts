export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { reportId } = req.body;

    if (!reportId) {
        return res.status(400).json({ error: 'Missing reportId' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !deepseekKey) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 获取报告记录
        const reportRes = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${reportId}&select=*`, {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            }
        });
        const reports = await reportRes.json();
        if (!reports || reports.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reports[0];
        const { user_id, report_type, content } = report;
        const { trades, plans, disciplineHistory, riskSettings, language } = content.metadata;

        // 调用 ai-report API 生成内容
        const aiReportRes = await fetch(`${req.headers.origin || 'http://localhost:5173'}/api/ai-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trades,
                plans,
                period: report_type,
                language,
                disciplineHistory,
                riskSettings
            })
        });

        if (!aiReportRes.ok) {
            throw new Error('AI report generation failed');
        }

        const { html } = await aiReportRes.json();

        // 更新报告状态为 completed
        await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${reportId}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                status: 'completed',
                content: {
                    html,
                    period: report_type,
                    generated_at: new Date().toISOString(),
                    metadata: content.metadata
                }
            })
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Background report generation error:', error);

        // 更新状态为 failed
        await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${reportId}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ status: 'failed' })
        });

        return res.status(500).json({ error: 'Report generation failed' });
    }
}
