import { supabase } from '../supabaseClient';
import { Trade, Strategy, ChecklistItem, TrackerRule, DailyPlan, Notification, DisciplineRule, DailyDisciplineRecord, WeeklyGoal, RiskSettings, TradingAccount, ExchangeConnection } from '../types';

// 获取当前用户ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ============ DB ↔ TS 映射工具 ============

function dbToStrategy(row: any): Strategy {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    checklist: row.checklist || [],
    color: row.color || '',
    notes: row.notes || [],
  };
}

function dbToChecklist(row: any): ChecklistItem {
  return {
    id: row.id,
    text: row.title || '',
    isCompleted: row.is_enabled ?? false,
  };
}

function dbToTrackerRule(row: any): TrackerRule {
  return {
    id: row.id,
    type: row.type,
    name: row.name || '',
    value: row.value,
    isActive: row.is_enabled ?? true,
  };
}

function dbToPlan(row: any): DailyPlan {
  return {
    id: row.id,
    date: row.date || '',
    title: row.title || '',
    folder: row.folder || 'daily-journal',
    content: row.content || '',
    focusTickers: [],
    linkedTradeIds: row.linked_trade_ids || [],
    isDeleted: row.is_deleted ?? false,
  };
}
function dbToNotification(row: any): Notification {
  return {
    id: row.id,
    type: row.type || 'system',
    title: row.title || '',
    content: row.message || '',
    timestamp: row.created_at || new Date().toISOString(),
    isRead: row.is_read ?? false,
  };
}

function dbToDisciplineRule(row: any): DisciplineRule {
  return {
    id: row.id,
    text: row.text || '',
    xpReward: row.xp_reward ?? 10,
  };
}

function dbToDisciplineRecord(row: any): DailyDisciplineRecord {
  return {
    date: row.date,
    completedRuleIds: row.completed_rule_ids || [],
    totalPossibleXp: row.total_possible_xp ?? 0,
    earnedXp: row.earned_xp ?? 0,
    isSuccess: row.is_success ?? false,
  };
}

function dbToTradingAccount(row: any): TradingAccount {
  return {
    id: row.id,
    name: row.name || '',
    isReal: row.account_type !== 'demo',
    exchange: row.exchange || undefined,
    brokerLogoUrl: row.broker_logo_url || undefined,
    brokerBrandColor: row.broker_brand_color || undefined,
    balance: row.balance ?? 0,
    currency: row.currency || 'USD',
    profitMethod: row.profit_method || 'FIFO',
    type: row.account_type || 'manual',
    syncStatus: row.sync_status || 'synced',
    lastSync: row.last_sync || undefined,
    nextSync: row.next_sync || undefined,
    exchangeConnectionId: row.exchange_connection_id || undefined,
  };
}

function dbToExchangeConnection(row: any): ExchangeConnection {
  return {
    id: row.id,
    exchange: row.exchange || '',
    apiKey: row.api_key_encrypted || '',
    apiSecret: row.api_secret_encrypted || '',
    label: row.label || undefined,
    accountType: row.account_type || 'main',
    skipSpot: row.skip_spot ?? false,
    startDate: row.start_date || undefined,
    lastSync: row.last_sync || undefined,
    isConnected: row.is_active ?? true,
  };
}

// ============ 用户数据服务 ============
export const userDataService = {
  // 加载用户数据
  async loadUserData() {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const [tradesRes, strategiesRes, checklistRes, trackerRulesRes, plansRes, notificationsRes, disciplineRulesRes, disciplineHistoryRes, settingsRes, profilesRes, accountsRes, connectionsRes] = await Promise.all([
      supabase.from('trading_journals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('strategies').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('checklist_items').select('*').eq('user_id', userId).order('order_index'),
      supabase.from('tracker_rules').select('*').eq('user_id', userId),
      supabase.from('daily_plans').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('discipline_rules').select('*').eq('user_id', userId),
      supabase.from('daily_discipline_records').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('user_settings').select('settings, risk_settings').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('trading_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('exchange_connections').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    // 过滤软删除的笔记（在应用层处理，避免依赖 DB 列）
    const activePlans = (plansRes.data || []).filter((p: any) => !p.is_deleted);

    return {
      trades: tradesRes.data || [],
      strategies: (strategiesRes.data || []).map(dbToStrategy),
      checklist: (checklistRes.data || []).map(dbToChecklist),
      trackerRules: (trackerRulesRes.data || []).map(dbToTrackerRule),
      plans: activePlans.map(dbToPlan),
      notifications: (notificationsRes.data || []).map(dbToNotification),
      disciplineRules: (disciplineRulesRes.data || []).map(dbToDisciplineRule),
      disciplineHistory: (disciplineHistoryRes.data || []).map(dbToDisciplineRecord),
      weeklyGoal: settingsRes.data?.settings?.weeklyGoal || null,
      riskSettings: settingsRes.data?.risk_settings || null,
      profile: profilesRes?.data || null,
      tradingAccounts: (accountsRes.data || []).map(dbToTradingAccount),
      exchangeConnections: (connectionsRes.data || []).map(dbToExchangeConnection),
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
  async saveStrategy(strategy: Strategy) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { data, error } = await supabase.from('strategies').insert({
      user_id: userId,
      name: strategy.name,
      description: strategy.description || '',
      checklist: strategy.checklist || [],
      color: strategy.color || '',
      notes: strategy.notes || [],
    }).select().single();

    return { data, error };
  },

  // 更新策略
  async updateStrategy(id: string, strategy: Strategy) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('strategies').update({
      name: strategy.name,
      description: strategy.description || '',
      checklist: strategy.checklist || [],
      color: strategy.color || '',
      notes: strategy.notes || [],
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

    await supabase.from('tracker_rules').delete().eq('user_id', userId);

    if (rules.length === 0) return { error: null };

    const data = rules.map(rule => ({
      user_id: userId,
      type: rule.type,
      name: rule.name,
      value: rule.value,
      is_enabled: rule.isActive,
    }));

    const { error } = await supabase.from('tracker_rules').insert(data);
    return { error };
  },

  // 保存检查清单
  async saveChecklist(checklist: ChecklistItem[]) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    await supabase.from('checklist_items').delete().eq('user_id', userId);

    if (checklist.length === 0) return { error: null };

    const data = checklist.map((item, index) => ({
      user_id: userId,
      checklist_type: 'pre_trade',
      title: item.text,
      is_enabled: item.isCompleted,
      order_index: index,
    }));

    const { error } = await supabase.from('checklist_items').insert(data);
    return { error };
  },

  // 保存每日计划/笔记
  async savePlan(plan: DailyPlan) {
    const userId = await getCurrentUserId();
    if (!userId) return { data: null, error: 'Not authenticated' };

    // 判断 id 是否为合法 uuid（Supabase 表的 id 列是 uuid 类型）
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.id);

    const payload = {
      user_id: userId,
      date: plan.date,
      title: plan.title || '',
      folder: plan.folder || 'daily-journal',
      content: plan.content || '',
      linked_trade_ids: plan.linkedTradeIds || [],
      is_deleted: plan.isDeleted ?? false,
    };

    if (isUuid) {
      // 已有合法 uuid，用 upsert
      const { data, error } = await supabase.from('daily_plans').upsert({
        ...payload,
        id: plan.id,
      }, { onConflict: 'id' }).select().single();
      console.log('[savePlan] upsert result:', { data: data?.id, error });
      return { data, error };
    } else {
      // 前端生成的临时 id，让 DB 自动生成 uuid
      const { data, error } = await supabase.from('daily_plans').insert(payload).select().single();
      console.log('[savePlan] insert result:', { data: data?.id, error });
      return { data, error };
    }
  },

  // 删除计划
  async deletePlan(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('daily_plans').delete().eq('id', id).eq('user_id', userId);
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
      message: notification.content,
      is_read: notification.isRead,
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

  // 批量标记通知已读
  async markAllNotificationsRead() {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    return { error };
  },

  // 加载广播通知（含已读状态）
  async loadBroadcastNotifications(): Promise<Notification[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const [broadcastsRes, readsRes] = await Promise.all([
      supabase.from('broadcast_notifications').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('broadcast_reads').select('broadcast_id').eq('user_id', userId),
    ]);

    const broadcasts = broadcastsRes.data || [];
    const readIds = new Set((readsRes.data || []).map((r: any) => r.broadcast_id));

    return broadcasts.map((row: any) => ({
      id: `broadcast_${row.id}`,
      type: row.type || 'system',
      title: row.title,
      content: row.message,
      timestamp: row.created_at,
      isRead: readIds.has(row.id),
    }));
  },

  // 标记广播通知已读
  async markBroadcastRead(broadcastId: string) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase.from('broadcast_reads').upsert(
      { user_id: userId, broadcast_id: broadcastId },
      { ignoreDuplicates: true }
    );
  },

  // 保存纪律规则
  async saveDisciplineRules(rules: DisciplineRule[]) {
    const userId = await getCurrentUserId();
    if (!userId) return { data: null, error: 'Not authenticated' };

    await supabase.from('discipline_rules').delete().eq('user_id', userId);

    if (rules.length === 0) return { data: [], error: null };

    const data = rules.map(rule => ({
      user_id: userId,
      text: rule.text,
      xp_reward: rule.xpReward,
    }));

    const { data: inserted, error } = await supabase.from('discipline_rules').insert(data).select();
    return { data: inserted, error };
  },

  // 保存纪律记录
  async saveDisciplineRecord(record: DailyDisciplineRecord) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('daily_discipline_records').upsert({
      user_id: userId,
      date: record.date,
      completed_rule_ids: record.completedRuleIds,
      total_possible_xp: record.totalPossibleXp,
      earned_xp: record.earnedXp,
      is_success: record.isSuccess,
    }, { onConflict: 'user_id,date' });

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
  },

  // ============ 交易所连接 ============

  async saveExchangeConnection(conn: {
    exchange: string;
    apiKey: string;
    apiSecret: string;
    label?: string;
    accountType?: string;
    skipSpot?: boolean;
    startDate?: string;
  }) {
    const userId = await getCurrentUserId();
    if (!userId) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase.from('exchange_connections').insert({
      user_id: userId,
      exchange: conn.exchange,
      api_key_encrypted: conn.apiKey,
      api_secret_encrypted: conn.apiSecret,
      label: conn.label || null,
      account_type: conn.accountType || 'main',
      skip_spot: conn.skipSpot ?? false,
      start_date: conn.startDate || null,
      is_active: true,
    }).select().single();

    return { data, error };
  },

  async loadExchangeConnections(): Promise<ExchangeConnection[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data } = await supabase.from('exchange_connections')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false });

    return (data || []).map(dbToExchangeConnection);
  },

  async deleteExchangeConnection(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('exchange_connections').delete().eq('id', id).eq('user_id', userId);
    return { error };
  },

  // ============ 交易账户 ============

  async saveTradingAccount(account: {
    name: string;
    exchange?: string;
    brokerLogoUrl?: string;
    brokerBrandColor?: string;
    balance?: number;
    currency?: string;
    profitMethod?: string;
    accountType?: string;
    syncStatus?: string;
    exchangeConnectionId?: string;
  }) {
    const userId = await getCurrentUserId();
    if (!userId) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase.from('trading_accounts').insert({
      user_id: userId,
      name: account.name,
      exchange: account.exchange || null,
      broker_logo_url: account.brokerLogoUrl || null,
      broker_brand_color: account.brokerBrandColor || null,
      balance: account.balance ?? 0,
      currency: account.currency || 'USD',
      profit_method: account.profitMethod || 'FIFO',
      account_type: account.accountType || 'manual',
      sync_status: account.syncStatus || 'synced',
      exchange_connection_id: account.exchangeConnectionId || null,
    }).select().single();

    return { data, error };
  },

  async loadTradingAccounts(): Promise<TradingAccount[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data } = await supabase.from('trading_accounts')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false });

    return (data || []).map(dbToTradingAccount);
  },

  async updateTradingAccount(id: string, updates: Partial<{
    name: string;
    balance: number;
    currency: string;
    profitMethod: string;
    syncStatus: string;
    lastSync: string;
    nextSync: string;
  }>) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.profitMethod !== undefined) dbUpdates.profit_method = updates.profitMethod;
    if (updates.syncStatus !== undefined) dbUpdates.sync_status = updates.syncStatus;
    if (updates.lastSync !== undefined) dbUpdates.last_sync = updates.lastSync;
    if (updates.nextSync !== undefined) dbUpdates.next_sync = updates.nextSync;

    const { error } = await supabase.from('trading_accounts').update(dbUpdates).eq('id', id).eq('user_id', userId);
    return { error };
  },

  async deleteTradingAccount(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase.from('trading_accounts').delete().eq('id', id).eq('user_id', userId);
    return { error };
  },

  // 批量导入交易（带 account_id）
  async importTradesWithAccount(trades: any[], accountId: string) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const data = trades.map(trade => ({
      user_id: userId,
      account_id: accountId,
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
    }));

    const { error } = await supabase.from('trading_journals').insert(data);
    return { error };
  },
};
