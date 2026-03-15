import { useState, useEffect, useCallback } from 'react';
import { Trade, Strategy, ChecklistItem, TrackerRule, DailyPlan, Notification, DisciplineRule, DailyDisciplineRecord, WeeklyGoal, RiskSettings, Direction, TradeStatus } from '../types';
import { userDataService } from '../services/userDataService';
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

  const loadData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      const result = await userDataService.loadUserData();
      if (!result) return;

      // 交易数据需要格式转换（raw DB rows）
      const formattedTrades = (result.trades || []).map((t: any) => {
        const pnl = t.pnl || 0;
        const exitPrice = t.exit_price || 0;
        let status: TradeStatus;
        if (!exitPrice) {
          status = TradeStatus.OPEN;
        } else if (pnl > 0) {
          status = TradeStatus.WIN;
        } else if (pnl < 0) {
          status = TradeStatus.LOSS;
        } else {
          status = TradeStatus.BE;
        }
        return {
          id: t.id,
          entryDate: t.date,
          exitDate: t.exit_date || t.date,
          symbol: t.symbol,
          direction: t.direction === 'long' ? Direction.LONG : Direction.SHORT,
          entryPrice: t.entry_price,
          exitPrice,
          quantity: t.quantity || 1,
          leverage: t.leverage || 1,
          riskAmount: t.risk_amount || 0,
          status,
          pnl,
          setup: t.setup || '',
          notes: t.notes || '',
          reviewNotes: t.review_notes || '',
          fees: t.fees || 0,
          mistakes: t.mistakes ? (typeof t.mistakes === 'string' ? JSON.parse(t.mistakes) : t.mistakes) : [],
          images: t.screenshot_url ? [t.screenshot_url] : [],
          rating: t.rating || undefined,
          compliance: t.compliance || undefined,
          executionGrade: t.execution_grade || undefined
        };
      });

      setTrades(formattedTrades);
      // 其余数据已在 userDataService.loadUserData 中完成 DB→TS 映射
      setStrategies(result.strategies);
      setChecklist(result.checklist);
      setTrackerRules(result.trackerRules.length > 0 ? result.trackerRules : DEFAULT_TRACKER_RULES);
      setPlans(result.plans);
      setNotifications(result.notifications);
      setDisciplineRules(result.disciplineRules.length > 0 ? result.disciplineRules : DEFAULT_DISCIPLINE_RULES);
      setDisciplineHistory(result.disciplineHistory);
      if (result.weeklyGoal) setWeeklyGoal(result.weeklyGoal);
      if (result.riskSettings) {
        setRiskSettings(result.riskSettings);
      } else {
        setRiskSettings({
          accountSize: 10000,
          maxDailyLoss: 500,
          maxTradeRisk: 100,
          maxConsecutiveLosses: 3,
          maxOpenPositions: 2
        });
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
    await userDataService.saveTrade({
      date: trade.entryDate,
      exitDate: trade.exitDate,
      symbol: trade.symbol,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      quantity: trade.quantity,
      leverage: trade.leverage,
      riskAmount: trade.riskAmount,
      fees: trade.fees,
      pnl: trade.pnl,
      setup: trade.setup,
      notes: trade.notes,
      reviewNotes: trade.reviewNotes,
      mistakes: trade.mistakes,
    });
    await loadData();
  };

  const updateTrade = async (id: string, trade: Trade) => {
    if (!userId) return;
    await userDataService.updateTrade(id, {
      date: trade.entryDate,
      exitDate: trade.exitDate,
      symbol: trade.symbol,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      quantity: trade.quantity,
      leverage: trade.leverage,
      riskAmount: trade.riskAmount,
      fees: trade.fees,
      pnl: trade.pnl,
      setup: trade.setup,
      notes: trade.notes,
      reviewNotes: trade.reviewNotes,
      mistakes: trade.mistakes,
    });
    setTrades(prev => prev.map(t => t.id === id ? { ...trade, id } : t));
  };

  const deleteTrade = async (id: string) => {
    if (!userId) return;
    await userDataService.deleteTrade(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const importTrades = async (imported: Trade[]) => {
    if (!userId) return;
    await userDataService.importTrades(imported.map(t => ({
      date: t.entryDate,
      symbol: t.symbol,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      quantity: t.quantity,
      pnl: t.pnl,
      setup: t.setup,
      notes: t.notes,
    })));
    await loadData();
  };

  // 策略操作
  const saveStrategy = async (strategy: Strategy) => {
    if (!userId) return;
    const { data } = await userDataService.saveStrategy(strategy);
    if (data) setStrategies(prev => [...prev, { ...strategy, id: data.id }]);
  };

  const updateStrategy = async (id: string, strategy: Strategy) => {
    if (!userId) return;
    await userDataService.updateStrategy(id, strategy);
    setStrategies(prev => prev.map(s => s.id === id ? { ...strategy, id } : s));
  };

  const deleteStrategy = async (id: string) => {
    if (!userId) return;
    await userDataService.deleteStrategy(id);
    setStrategies(prev => prev.filter(s => s.id !== id));
  };

  const saveRiskSettings = async (settings: RiskSettings) => {
    if (!userId) return;
    await userDataService.saveRiskSettings(settings);
    setRiskSettings(settings);
  };

  const saveWeeklyGoal = async (goal: WeeklyGoal) => {
    if (!userId) return;
    await userDataService.saveWeeklyGoal(goal);
    setWeeklyGoal(goal);
  };

  const saveTrackerRules = async (rules: TrackerRule[]) => {
    if (!userId) return;
    await userDataService.saveTrackerRules(rules);
    setTrackerRules(rules);
  };

  const saveChecklist = async (items: ChecklistItem[]) => {
    if (!userId) return;
    await userDataService.saveChecklist(items);
    setChecklist(items);
  };

  const savePlan = async (plan: DailyPlan) => {
    if (!userId) return;
    await userDataService.savePlan(plan);
    setPlans(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) return prev.map(p => p.id === plan.id ? plan : p);
      return [plan, ...prev];
    });
  };

  const saveDisciplineRules = async (rules: DisciplineRule[]) => {
    if (!userId) return;
    await userDataService.saveDisciplineRules(rules);
    setDisciplineRules(rules);
  };

  const saveDisciplineRecord = async (record: DailyDisciplineRecord) => {
    if (!userId) return;
    await userDataService.saveDisciplineRecord(record);
    setDisciplineHistory(prev => {
      const exists = prev.find(h => h.date === record.date);
      if (exists) return prev.map(h => h.date === record.date ? record : h);
      return [record, ...prev];
    });
  };

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
