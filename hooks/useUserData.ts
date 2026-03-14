import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Trade, Strategy, ChecklistItem, TrackerRule, DailyPlan, Notification, DisciplineRule, DailyDisciplineRecord, WeeklyGoal, RiskSettings } from '../types';
import { DEFAULT_TRACKER_RULES, DEFAULT_DISCIPLINE_RULES } from '../constants';

export function useUserData(userId: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [trackerRules, setTrackerRules] = useState<TrackerRule[]>([]);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [disciplineRules, setDisciplineRules] = useState<DisciplineRule[]>([]);
  const [disciplineHistory, setDisciplineHistory] = useState<DailyDisciplineRecord[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);

  // 加载用户数据
  const loadData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const [
        tradesRes,
        strategiesRes,
        checklistRes,
        trackerRulesRes,
        plansRes,
        notificationsRes,
        disciplineRulesRes,
        disciplineHistoryRes,
        settingsRes
      ] = await Promise.all([
        supabase.from('trading_journals').select('*').order('created_at', { ascending: false }),
        supabase.from('strategies').select('*').order('created_at', { ascending: false }),
        supabase.from('checklist_items').select('*').order('order_index'),
        supabase.from('tracker_rules').select('*'),
        supabase.from('daily_plans').select('*').order('date', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('discipline_rules').select('*'),
        supabase.from('daily_discipline_records').select('*').order('date', { ascending: false }),
        supabase.from('user_settings').select('settings, risk_settings').eq('user_id', userId).single()
      ]);

      // 转换数据格式
      setTrades((tradesRes.data || []).map(t => ({
        id: t.id,
        date: t.date,
        symbol: t.symbol,
        direction: t.direction as 'long' | 'short',
        entryPrice: t.entry_price,
        exitPrice: t.exit_price,
        pnl: t.pnl,
        pnlPercent: t.pnl_percent,
        setup: t.setup,
        notes: t.notes,
        emotions: t.emotions
      })));

      setStrategies((strategiesRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        rules: s.rules,
        isActive: s.is_active
      })));

      setChecklist((checklistRes.data || []).map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        isEnabled: c.is_enabled
      })));

      setTrackerRules((trackerRulesRes.data || []).map(r => ({
        id: r.id,
        type: r.type as any,
        name: r.name,
        value: r.value,
        isEnabled: r.is_enabled
      })));

      setPlans((plansRes.data || []).map(p => ({
        id: p.id,
        date: p.date,
        focusSymbols: p.focus_symbols || [],
        tradeIdeas: p.trade_ideas,
        keyLevels: p.key_levels,
        riskPercentage: p.risk_percentage,
        isCompleted: p.is_completed,
        isDeleted: p.is_deleted
      })));

      setNotifications((notificationsRes.data || []).map(n => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at
      })));

      setDisciplineRules((disciplineRulesRes.data || []).map(r => ({
        id: r.id,
        type: r.rule_type as any,
        description: r.description,
        isEnabled: r.is_enabled
      })));

      setDisciplineHistory((disciplineHistoryRes.data || []).map(h => ({
        id: h.id,
        date: h.date,
        ruleId: h.rule_id,
        isCompleted: h.is_completed,
        notes: h.notes
      })));

      // 设置 - 从数据库或使用默认值
      if (settingsRes.data?.settings?.weeklyGoal) {
        setWeeklyGoal(settingsRes.data.settings.weeklyGoal);
      }

      if (settingsRes.data?.risk_settings) {
        setRiskSettings(settingsRes.data.risk_settings);
      } else {
        setRiskSettings({
          accountSize: 10000,
          maxDailyLoss: 500,
          maxTradeRisk: 100,
          maxConsecutiveLosses: 3,
          maxOpenPositions: 2
        });
      }

      // 如果数据库没有数据，使用默认值（仅首次）
      if (!trackerRulesRes.data?.length) {
        setTrackerRules(DEFAULT_TRACKER_RULES);
        // 保存默认值到数据库
        await saveTrackerRules(DEFAULT_TRACKER_RULES);
      }

      if (!disciplineRulesRes.data?.length) {
        setDisciplineRules(DEFAULT_DISCIPLINE_RULES);
        await saveDisciplineRules(DEFAULT_DISCIPLINE_RULES);
      }

      if (!checklistRes.data?.length) {
        // 默认检查清单
        const defaultChecklist = [
          { id: '1', title: 'Check market trend', description: 'Is the trend favoring my trade direction?', isEnabled: true },
          { id: '2', title: 'Check key levels', description: 'Are there support/resistance levels near entry?', isEnabled: true },
          { id: '3', title: 'Confirm risk/reward', description: 'Is risk/reward at least 1:2?', isEnabled: true },
          { id: '4', title: 'Check news', description: 'Any major news events coming up?', isEnabled: true },
          { id: '5', title: 'Review setup', description: 'Does the setup meet my strategy criteria?', isEnabled: true }
        ];
        setChecklist(defaultChecklist as ChecklistItem[]);
        await saveChecklist(defaultChecklist as ChecklistItem[]);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 交易操作
  const saveTrade = async (trade: Trade) => {
    if (!userId) return;

    const { data, error } = await supabase.from('trading_journals').insert({
      user_id: userId,
      date: trade.date,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      emotions: trade.emotions
    }).select().single();

    if (!error && data) {
      setTrades(prev => [{ ...trade, id: data.id }, ...prev]);
    }
  };

  const updateTrade = async (id: string, trade: Trade) => {
    if (!userId) return;

    const { error } = await supabase.from('trading_journals').update({
      date: trade.date,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      emotions: trade.emotions
    }).eq('id', id).eq('user_id', userId);

    if (!error) {
      setTrades(prev => prev.map(t => t.id === id ? { ...trade, id } : t));
    }
  };

  const deleteTrade = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase.from('trading_journals').delete().eq('id', id).eq('user_id', userId);

    if (!error) {
      setTrades(prev => prev.filter(t => t.id !== id));
    }
  };

  const importTrades = async (imported: Trade[]) => {
    if (!userId) return;

    const data = imported.map(trade => ({
      user_id: userId,
      date: trade.date,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      pnl: trade.pnl,
      pnl_percent: trade.pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      emotions: trade.emotions
    }));

    const { error } = await supabase.from('trading_journals').insert(data);

    if (!error) {
      await loadData(); // 重新加载
    }
  };

  // 策略操作
  const saveStrategy = async (strategy: Strategy) => {
    if (!userId) return;

    const { data, error } = await supabase.from('strategies').insert({
      user_id: userId,
      name: strategy.name,
      description: strategy.description,
      rules: strategy.rules,
      is_active: strategy.isActive
    }).select().single();

    if (!error && data) {
      setStrategies(prev => [...prev, { ...strategy, id: data.id }]);
    }
  };

  const updateStrategy = async (id: string, strategy: Strategy) => {
    if (!userId) return;

    const { error } = await supabase.from('strategies').update({
      name: strategy.name,
      description: strategy.description,
      rules: strategy.rules,
      is_active: strategy.isActive
    }).eq('id', id).eq('user_id', userId);

    if (!error) {
      setStrategies(prev => prev.map(s => s.id === id ? { ...strategy, id } : s));
    }
  };

  const deleteStrategy = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase.from('strategies').delete().eq('id', id).eq('user_id', userId);

    if (!error) {
      setStrategies(prev => prev.filter(s => s.id !== id));
    }
  };

  // 设置操作
  const saveRiskSettings = async (settings: RiskSettings) => {
    if (!userId) return;

    const { data: existing } = await supabase.from('user_settings').select('settings').eq('user_id', userId).single();

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      settings: existing?.settings || {},
      risk_settings: settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (!error) {
      setRiskSettings(settings);
    }
  };

  const saveWeeklyGoal = async (goal: WeeklyGoal) => {
    if (!userId) return;

    const { data: existing } = await supabase.from('user_settings').select('settings').eq('user_id', userId).single();

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      settings: {
        ...existing?.settings,
        weeklyGoal: goal
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (!error) {
      setWeeklyGoal(goal);
    }
  };

  // 追踪规则
  const saveTrackerRules = async (rules: TrackerRule[]) => {
    if (!userId) return;

    await supabase.from('tracker_rules').delete().eq('user_id', userId);

    const data = rules.map(rule => ({
      user_id: userId,
      type: rule.type,
      name: rule.name,
      value: rule.value,
      is_enabled: rule.isEnabled
    }));

    const { error } = await supabase.from('tracker_rules').insert(data);

    if (!error) {
      setTrackerRules(rules);
    }
  };

  // 检查清单
  const saveChecklist = async (items: ChecklistItem[]) => {
    if (!userId) return;

    await supabase.from('checklist_items').delete().eq('user_id', userId);

    const data = items.map((item, index) => ({
      user_id: userId,
      checklist_type: 'pre_trade',
      title: item.title,
      description: item.description,
      is_enabled: item.isEnabled,
      order_index: index
    }));

    const { error } = await supabase.from('checklist_items').insert(data);

    if (!error) {
      setChecklist(items);
    }
  };

  // 每日计划
  const savePlan = async (plan: DailyPlan) => {
    if (!userId) return;

    const { error } = await supabase.from('daily_plans').upsert({
      user_id: userId,
      id: plan.id,
      date: plan.date,
      focus_symbols: plan.focusSymbols,
      trade_ideas: plan.tradeIdeas,
      key_levels: plan.keyLevels,
      risk_percentage: plan.riskPercentage,
      is_completed: plan.isCompleted,
      is_deleted: plan.isDeleted,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (!error) {
      setPlans(prev => {
        const exists = prev.find(p => p.id === plan.id);
        if (exists) return prev.map(p => p.id === plan.id ? plan : p);
        return [plan, ...prev];
      });
    }
  };

  // 纪律规则
  const saveDisciplineRules = async (rules: DisciplineRule[]) => {
    if (!userId) return;

    await supabase.from('discipline_rules').delete().eq('user_id', userId);

    const data = rules.map(rule => ({
      user_id: userId,
      rule_type: rule.type,
      description: rule.description,
      is_enabled: rule.isEnabled
    }));

    const { error } = await supabase.from('discipline_rules').insert(data);

    if (!error) {
      setDisciplineRules(rules);
    }
  };

  // 纪律记录
  const saveDisciplineRecord = async (record: DailyDisciplineRecord) => {
    if (!userId) return;

    const { error } = await supabase.from('daily_discipline_records').upsert({
      user_id: userId,
      id: record.id,
      date: record.date,
      rule_id: record.ruleId,
      is_completed: record.isCompleted,
      notes: record.notes
    }, { onConflict: 'id' });

    if (!error) {
      setDisciplineHistory(prev => {
        const exists = prev.find(h => h.id === record.id);
        if (exists) return prev.map(h => h.id === record.id ? record : h);
        return [record, ...prev];
      });
    }
  };

  // 加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    trades,
    strategies,
    checklist,
    trackerRules,
    plans,
    notifications,
    disciplineRules,
    disciplineHistory,
    weeklyGoal,
    riskSettings,
    loadData,
    saveTrade,
    updateTrade,
    deleteTrade,
    importTrades,
    saveStrategy,
    updateStrategy,
    deleteStrategy,
    saveRiskSettings,
    saveWeeklyGoal,
    saveTrackerRules,
    saveChecklist,
    savePlan,
    saveDisciplineRules,
    saveDisciplineRecord
  };
}
