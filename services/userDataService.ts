import { supabase } from '../supabaseClient';
import { Trade, Strategy, ChecklistItem, TrackerRule, DailyPlan, Notification, DisciplineRule, DailyDisciplineRecord, WeeklyGoal, RiskSettings } from '../types';

// 获取当前用户ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// 用户数据服务
export const userDataService = {
  // 加载用户数据
  async loadUserData() {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const [tradesRes, strategiesRes, checklistRes, trackerRulesRes, plansRes, notificationsRes, disciplineRulesRes, disciplineHistoryRes, weeklyGoalRes, settingsRes, profilesRes] = await Promise.all([
      supabase.from('trading_journals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('strategies').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('checklist_items').select('*').eq('user_id', userId).order('order_index'),
      supabase.from('tracker_rules').select('*').eq('user_id', userId),
      supabase.from('daily_plans').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('discipline_rules').select('*').eq('user_id', userId),
      supabase.from('daily_discipline_records').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('user_settings').select('settings, risk_settings').eq('user_id', userId).single(),
      supabase.from('profiles').select('*').eq('id', userId).single()
    ]);

    return {
      trades: tradesRes.data || [],
      strategies: strategiesRes.data || [],
      checklist: checklistRes.data || [],
      trackerRules: trackerRulesRes.data || [],
      plans: plansRes.data || [],
      notifications: notificationsRes.data || [],
      disciplineRules: disciplineRulesRes.data || [],
      disciplineHistory: disciplineHistoryRes.data || [],
      weeklyGoal: weeklyGoalRes.data?.settings?.weeklyGoal || null,
      riskSettings: settingsRes.data?.risk_settings || null,
      profile: profilesRes?.data || null
    };
  },

  // 保存交易
  async saveTrade(trade: any) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('trading_journals').insert({
      user_id: userId,
      date: trade.date,
      exit_date: trade.exitDate || null,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      quantity: trade.quantity || 1,
      leverage: trade.leverage || 1,
      risk_amount: trade.riskAmount || 0,
      fees: trade.fees || 0,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      review_notes: trade.reviewNotes || '',
      mistakes: JSON.stringify(trade.mistakes || []),
      emotions: trade.emotions
    });

    return { error };
  },

  // 更新交易
  async updateTrade(id: string, trade: any) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('trading_journals').update({
      date: trade.date,
      exit_date: trade.exitDate || null,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      quantity: trade.quantity || 1,
      leverage: trade.leverage || 1,
      risk_amount: trade.riskAmount || 0,
      fees: trade.fees || 0,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      review_notes: trade.reviewNotes || '',
      mistakes: JSON.stringify(trade.mistakes || []),
      emotions: trade.emotions
    }).eq('id', id).eq('user_id', userId);

    return { error };
  },

  // 删除交易
  async deleteTrade(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('trading_journals').delete().eq('id', id).eq('user_id', userId);
    return { error };
  },

  // 批量保存交易（用于导入）
  async importTrades(trades: any[]) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const data = trades.map(trade => ({
      user_id: userId,
      date: trade.date,
      exit_date: trade.exitDate || null,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      quantity: trade.quantity || 1,
      leverage: trade.leverage || 1,
      risk_amount: trade.riskAmount || 0,
      fees: trade.fees || 0,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      review_notes: trade.reviewNotes || '',
      mistakes: JSON.stringify(trade.mistakes || []),
      emotions: trade.emotions
    }));

    const { error } = await supabase.from('trading_journals').insert(data);
    return { error };
  },

  // 保存策略
  async saveStrategy(strategy: any) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('strategies').insert({
      user_id: userId,
      name: strategy.name,
      description: strategy.description,
      rules: strategy.rules,
      is_active: strategy.isActive
    });

    return { error };
  },

  // 更新策略
  async updateStrategy(id: string, strategy: any) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('strategies').update({
      name: strategy.name,
      description: strategy.description,
      rules: strategy.rules,
      is_active: strategy.isActive
    }).eq('id', id).eq('user_id', userId);

    return { error };
  },

  // 删除策略
  async deleteStrategy(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('strategies').delete().eq('id', id).eq('user_id', userId);
    return { error };
  },

  // 保存用户设置
  async saveSettings(settings: any) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return { error };
  },

  // 保存风险设置
  async saveRiskSettings(riskSettings: RiskSettings) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    // 先获取现有设置
    const { data: existing } = await supabase.from('user_settings').select('settings').eq('user_id', userId).single();

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      settings: existing?.settings || {},
      risk_settings: riskSettings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return { error };
  },

  // 保存每周目标
  async saveWeeklyGoal(goal: WeeklyGoal) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { data: existing } = await supabase.from('user_settings').select('settings').eq('user_id', userId).single();

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      settings: {
        ...existing?.settings,
        weeklyGoal: goal
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return { error };
  },

  // 保存追踪规则
  async saveTrackerRules(rules: TrackerRule[]) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    // 删除旧的，插入新的
    await supabase.from('tracker_rules').delete().eq('user_id', userId);

    const data = rules.map(rule => ({
      user_id: userId,
      type: rule.type,
      name: rule.name,
      value: rule.value,
      is_enabled: rule.isEnabled
    }));

    const { error } = await supabase.from('tracker_rules').insert(data);
    return { error };
  },

  // 保存检查清单
  async saveChecklist(checklist: ChecklistItem[]) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    await supabase.from('checklist_items').delete().eq('user_id', userId);

    const data = checklist.map((item, index) => ({
      user_id: userId,
      checklist_type: 'pre_trade',
      title: item.title,
      description: item.description,
      is_enabled: item.isEnabled,
      order_index: index
    }));

    const { error } = await supabase.from('checklist_items').insert(data);
    return { error };
  },

  // 保存每日计划
  async savePlan(plan: DailyPlan) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('daily_plans').upsert({
      user_id: userId,
      id: plan.id,
      date: plan.date,
      focus_symbols: plan.focusSymbols,
      trade_ideas: plan.tradeIdeas,
      key_levels: plan.keyLevels,
      risk_percentage: plan.riskPercentage,
      is_completed: plan.isDeleted ? true : plan.isCompleted,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    return { error };
  },

  // 保存通知
  async saveNotification(notification: Notification) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.isRead
    });

    return { error };
  },

  // 标记通知为已读
  async markNotificationRead(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
    return { error };
  },

  // 保存纪律规则
  async saveDisciplineRules(rules: DisciplineRule[]) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    await supabase.from('discipline_rules').delete().eq('user_id', userId);

    const data = rules.map(rule => ({
      user_id: userId,
      rule_type: rule.type,
      description: rule.description,
      is_enabled: rule.isEnabled
    }));

    const { error } = await supabase.from('discipline_rules').insert(data);
    return { error };
  },

  // 保存纪律记录
  async saveDisciplineRecord(record: DailyDisciplineRecord) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('daily_discipline_records').upsert({
      user_id: userId,
      id: record.id,
      date: record.date,
      rule_id: record.ruleId,
      is_completed: record.isCompleted,
      notes: record.notes
    }, { onConflict: 'id' });

    return { error };
  },

  // 保存用户资料
  async saveProfile(profile: { name?: string; username?: string; avatar_url?: string }) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: profile.name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    return { error };
  }
};
