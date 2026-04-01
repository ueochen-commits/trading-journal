import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const AI_LIMITS: Record<string, number | null> = {
    free: 5,
    pro: 100,
    elite: null, // unlimited
};

// Check quota and increment usage. Returns error string if over limit, null if ok.
export async function checkAndIncrementAiQuota(userId: string): Promise<string | null> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const today = new Date().toISOString().split('T')[0];

    // Get user tier from subscriptions
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('plan, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active');

    const validSubs = (subs || []).filter((s: any) => {
        const end = s.current_period_end ? new Date(s.current_period_end) : null;
        return !end || end > new Date();
    });

    const tierPriority: Record<string, number> = { elite: 3, pro: 2, free: 1 };
    let tier = 'free';
    if (validSubs.length > 0) {
        validSubs.sort((a: any, b: any) => (tierPriority[b.plan] || 0) - (tierPriority[a.plan] || 0));
        tier = validSubs[0].plan;
    }

    const limit = AI_LIMITS[tier];
    if (limit === null) return null; // elite: unlimited

    // Upsert today's usage row
    const { data: usage, error } = await supabase
        .from('ai_usage')
        .upsert({ user_id: userId, date: today, count: 0 }, { onConflict: 'user_id,date', ignoreDuplicates: false })
        .select('count')
        .single();

    // If upsert didn't return data, fetch current count
    const { data: current } = await supabase
        .from('ai_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    const currentCount = current?.count ?? 0;

    if (currentCount >= limit) {
        return `AI usage limit reached (${limit}/day for ${tier} plan). Upgrade to use more.`;
    }

    // Increment
    await supabase
        .from('ai_usage')
        .update({ count: currentCount + 1 })
        .eq('user_id', userId)
        .eq('date', today);

    return null;
}
