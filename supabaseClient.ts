import { createClient } from '@supabase/supabase-js';
import { Report } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

const normalizeReportContent = (content: unknown): Report['content'] => {
    if (content && typeof content === 'object') {
        const source = content as Partial<Report['content']>;
        return {
            html: typeof source.html === 'string' ? source.html : '',
            period: typeof source.period === 'string' ? source.period : '',
            generated_at: typeof source.generated_at === 'string' ? source.generated_at : '',
        };
    }

    return {
        html: '',
        period: '',
        generated_at: '',
    };
};

const normalizeReport = (row: any): Report => ({
    id: typeof row?.id === 'string' ? row.id : '',
    user_id: typeof row?.user_id === 'string' ? row.user_id : '',
    report_type: row?.report_type === 'monthly' ? 'monthly' : 'weekly',
    title: typeof row?.title === 'string' && row.title.trim().length > 0 ? row.title : 'Untitled report',
    content: normalizeReportContent(row?.content),
    status: row?.status === 'pending' || row?.status === 'failed' || row?.status === 'completed'
        ? row.status
        : 'pending',
    created_at: typeof row?.created_at === 'string' ? row.created_at : new Date(0).toISOString(),
});

// Report operations
export const saveReport = async (report: Omit<Report, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('reports')
        .insert([report])
        .select()
        .single();
    if (error) throw error;
    return data as Report;
};

export const fetchReports = async (userId: string) => {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeReport);
};

export const deleteReport = async (reportId: string) => {
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
    if (error) throw error;
};

export const updateReportStatus = async (reportId: string, status: 'pending' | 'completed' | 'failed', content?: any) => {
    const updateData: any = { status };
    if (content) updateData.content = content;
    const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);
    if (error) throw error;
};
