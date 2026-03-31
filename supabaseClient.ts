import { createClient } from '@supabase/supabase-js';
import { Report } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    return data as Report[];
};

export const deleteReport = async (reportId: string) => {
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
    if (error) throw error;
};