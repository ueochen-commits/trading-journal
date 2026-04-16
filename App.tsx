import React, { useState, useEffect, useMemo } from 'react';

// 上传图片到 Supabase Storage
const uploadImage = async (userId: string, imageBase64: string): Promise<string | null> => {
  try {
    console.log('Starting image upload...');
    console.log('UserId:', userId);
    console.log('ImageBase64 length:', imageBase64?.length);

    // 转换 base64 为 Blob
    const response = await fetch(imageBase64);
    const blob = await response.blob();
    console.log('Blob created, size:', blob.size);

    // 生成唯一文件名
    const fileName = `${userId}/${Date.now()}.jpg`;

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('trade-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg'
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    console.log('Upload successful, data:', data);

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('trade-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import PlaybookPage from './components/PlaybookPage';
import Reports from './components/Reports';
import TradingPlans from './components/TradingPlans';
import Psychology from './components/Psychology';
import CalendarView from './components/CalendarView';
import SocialPlaza from './components/SocialPlaza';
import Academy from './components/Academy';
import NotificationCenter from './components/NotificationCenter';
import SettingsModal from './components/SettingsModal';
import SettingsPage from './components/SettingsPage';
import PricingModal from './components/PricingModal';
import AuthPage from './components/AuthPage';
import UserProfileModal from './components/UserProfileModal';
import ReferralCenter from './components/ReferralCenter';
import ChatAssistant from './components/ChatAssistant';
import ChatWindow from './components/ChatWindow';
import FriendListDrawer from './components/FriendListDrawer';
import TourOverlay from './components/TourOverlay';
// import OnboardingModal from './components/OnboardingModal'; // TEMPORARILY DISABLED
import WelcomeModal from './components/WelcomeModal';
import ConnectExchangePage from './components/ConnectExchangePage';
import SelectImportMethodPage from './components/SelectImportMethodPage';
import BrokerSyncPage from './components/BrokerSyncPage';
import ChartPage from './components/ChartPage';
import LeaderboardPage from './components/LeaderboardPage';
import TradeShareModal from './components/TradeShareModal';

import { UserProvider, useUser } from './components/UserContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { TourProvider, useTour } from './components/TourContext';
import { SocialProvider } from './components/SocialContext';
import { supabase } from './supabaseClient';
import { userDataService } from './services/userDataService';
import { fetchTradesFromExchange, generateAccountName } from './services/exchangeService';
import { Plus, MessageSquarePlus, FileText, BookOpen, Globe, HelpCircle, TrendingUp, X } from 'lucide-react';

import { 
  MOCK_STRATEGIES, MOCK_PRE_TRADE_CHECKLIST, 
  DEFAULT_TRACKER_RULES, MOCK_POSTS, MOCK_NOTIFICATIONS, 
  DEFAULT_DISCIPLINE_RULES 
} from './constants';
import {
  Trade, Strategy, ChecklistItem, RiskSettings, DailyPlan,
  TrackerRule, Post, Notification, ShareIntent, DisciplineRule,
  DailyDisciplineRecord, WeeklyGoal, TradeStatus, Direction,
  TradingAccount
} from './types';

const PageContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="py-6 px-4 md:py-8 md:px-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="w-full h-full">
            {children}
        </div>
    </div>
);

// --- Local Storage Helper ---
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== 'undefined') {
        try {
            const stickyValue = window.localStorage.getItem(key);
            return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
        } catch (e) {
            console.error(`Error loading ${key}`, e);
            return defaultValue;
        }
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue];
}

// 工具函数：将 DB 行转换为前端 Trade 对象，正确计算 status
const formatTradeFromDB = (trade: any): Trade => {
  const pnl = trade.pnl || 0;
  const exitPrice = trade.exit_price || 0;
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
    id: trade.id,
    entryDate: trade.date,
    exitDate: trade.exit_date || trade.date,
    symbol: trade.symbol,
    direction: trade.direction === 'long' ? Direction.LONG : Direction.SHORT,
    entryPrice: trade.entry_price,
    exitPrice: exitPrice,
    quantity: trade.quantity || 1,
    leverage: trade.leverage || 1,
    riskAmount: trade.risk_amount || 0,
    status,
    pnl,
    setup: trade.setup || '',
    notes: trade.notes || '',
    reviewNotes: trade.review_notes || '',
    fees: trade.fees || 0,
    mistakes: trade.mistakes ? (typeof trade.mistakes === 'string' ? JSON.parse(trade.mistakes) : trade.mistakes) : [],
    images: trade.screenshot_url ? [trade.screenshot_url] : [],
    rating: trade.rating || undefined,
    compliance: trade.compliance || undefined,
    executionGrade: trade.execution_grade || undefined,
    accountId: trade.account_id || undefined,
    profitTarget: trade.profit_target ?? undefined,
    stopLoss: trade.stop_loss ?? undefined,
  };
};

// Wrapper to use context
const MainAppInner: React.FC<{ onSetActiveTabReady: (fn: (tab: string) => void) => void }> = ({ onSetActiveTabReady }) => {
  const { isAuthenticated, isLoading, openProfile, user, onboardingCompleted, markOnboardingComplete } = useUser();
  const { t, language } = useLanguage();
  const { /* startInitialTour */ } = useTour(); // TEMPORARILY DISABLED
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tg_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  // const [showOnboarding, setShowOnboarding] = useState(false); // TEMPORARILY DISABLED
  // showWelcome: derived from context but controlled by local state so Step2 can stay open
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcome = isAuthenticated && onboardingCompleted === false && !welcomeDismissed;
  const [showConnectExchange, setShowConnectExchange] = useState(false);
  const [showSelectImportMethod, setShowSelectImportMethod] = useState(false);
  const [showBrokerSync, setShowBrokerSync] = useState(false);
  const [connectingExchange, setConnectingExchange] = useState<{ id: string; name: string; logoUrl?: string; brandColor?: string } | null>(null);

  // Register setActiveTab with TourProvider so Tour can switch tabs
  const handleSetActiveTab = React.useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  React.useEffect(() => {
    onSetActiveTabReady(handleSetActiveTab);
  }, [handleSetActiveTab, onSetActiveTabReady]);

  // Data State - 从 Supabase 加载，不再使用 localStorage
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [trackerRules, setTrackerRules] = useState<TrackerRule[]>([]);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [posts, setPosts] = useStickyState<Post[]>(MOCK_POSTS, 'tg_posts');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Discipline & Goals
  const [disciplineRules, setDisciplineRules] = useState<DisciplineRule[]>([]);
  const [disciplineHistory, setDisciplineHistory] = useState<DailyDisciplineRecord[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal>({ type: 'amount', value: 1000, isActive: true });

  // Risk Settings
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    accountSize: 10000,
    maxDailyLoss: 500,
    maxTradeRisk: 100,
    maxConsecutiveLosses: 3,
    maxOpenPositions: 2
  });

  // Trading Accounts (从 Supabase 加载)
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([]);

  // 全局账户选择（持久化，跨页面同步）
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const filteredTrades = useMemo(
    () => selectedAccountId === 'all' ? trades : trades.filter(t => t.accountId === selectedAccountId),
    [trades, selectedAccountId]
  );

  // 控制 SettingsPage 打开时默认显示哪个 section
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined);

  // Toast 通知
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 4000);
  };

  // 从 Supabase 加载所有用户数据
  useEffect(() => {
    const loadAllData = async () => {
      if (!isAuthenticated) return;

      setIsDataLoading(true);
      try {
        const [result, broadcastNotifications] = await Promise.all([
          userDataService.loadUserData(),
          userDataService.loadBroadcastNotifications(),
        ]);
        if (!result) return;

        // 交易数据需要格式转换
        const formattedTrades = (result.trades || []).map(formatTradeFromDB);

        setTrades(formattedTrades);
        if (result.strategies.length > 0) setStrategies(result.strategies);
        if (result.checklist.length > 0) setChecklist(result.checklist);
        if (result.trackerRules.length > 0) setTrackerRules(result.trackerRules);
        if (result.plans.length > 0) setPlans(result.plans);
        // 广播通知排在前面，后面跟用户个人通知
        const allNotifications = [...broadcastNotifications, ...(result.notifications || [])];
        if (allNotifications.length > 0) setNotifications(allNotifications);
        if (result.disciplineRules.length > 0) setDisciplineRules(result.disciplineRules);
        if (result.disciplineHistory.length > 0) setDisciplineHistory(result.disciplineHistory);
        if (result.weeklyGoal) setWeeklyGoal(result.weeklyGoal);
        if (result.riskSettings) setRiskSettings(result.riskSettings);

        // 确保 Demo Account 存在，并将 NULL account_id 的旧交易迁移过去
        const demoAccount = await userDataService.ensureDefaultAccount();

        // 重新加载账户列表（可能新增了 Demo Account）
        const freshAccounts = await userDataService.loadTradingAccounts();
        setTradingAccounts(freshAccounts);

        // 用 Demo Account id 补全旧交易的 accountId
        if (demoAccount) {
          const refreshedTrades = (result.trades || []).map((t: any) => ({
            ...t,
            account_id: t.account_id || demoAccount.id,
          })).map(formatTradeFromDB);
          setTrades(refreshedTrades);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadAllData();
  }, [isAuthenticated]);

  // First-login detection: show onboarding survey if not done yet
  // TEMPORARILY DISABLED — replaced by new first-login flow
  // useEffect(() => {
  //   if (isAuthenticated && !localStorage.getItem('tg_onboarding_done')) {
  //     setShowOnboarding(true);
  //   }
  // }, [isAuthenticated]);

  // New welcome card: onboardingCompleted comes from UserContext (no extra request)

  // Realtime：订阅新广播，用户在线时立刻收到通知
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('broadcast_notifications_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, (payload) => {
        const row = payload.new as any;
        if (!row.is_active) return;
        const newNotification: Notification = {
          id: `broadcast_${row.id}`,
          type: row.type || 'system',
          title: row.title,
          content: row.message,
          timestamp: row.created_at,
          isRead: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  // UI State for Auto-Actions (Not persisted)
  const [journalAutoOpen, setJournalAutoOpen] = useState(false);
  const [noteAutoCreate, setNoteAutoCreate] = useState(false);
  const [playbookAutoCreate, setPlaybookAutoCreate] = useState(false);
  
  // Intent state for smart bridging
  const [noteSelectionIntent, setNoteSelectionIntent] = useState<string | null>(null);
  const [noteCreationIntent, setNoteCreationIntent] = useState<{ date: string, linkedTradeIds: string[] } | null>(null);

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Review Status (Mock - could be persisted if needed)
  const [reviewStatus, setReviewStatus] = useState({
      lastDailyReview: null,
      lastWeeklyReview: null,
      lastMonthlyReview: null
  });

  // Effects
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('tg_theme', next); } catch {}
      return next;
    });
  };

  // Handlers
  // 保存交易到 Supabase
  const handleAddTrade = async (trade: Trade) => {
    // 获取当前用户
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      console.error('No user logged in');
      return;
    }

    // 检查交易记录条数上限
    const TRADE_LIMITS: Record<string, number | null> = { free: 100, pro: 1000, elite: null };
    const tradeLimit = TRADE_LIMITS[user.tier];
    if (tradeLimit !== null && (user.tradeCount ?? 0) >= tradeLimit) {
      alert(language === 'cn'
        ? `你的 ${user.tier === 'free' ? '基础' : '专业'} 账户最多可存储 ${tradeLimit} 条交易记录，请升级会员以继续添加。`
        : `Your ${user.tier} plan allows up to ${tradeLimit} trade records. Please upgrade to add more.`
      );
      return;
    }

    // Free 用户不支持截图上传
    if (user.tier === 'free' && trade.images && trade.images.length > 0) {
      alert(language === 'cn'
        ? '基础账户不支持上传截图，请升级会员后使用此功能。'
        : 'Screenshot upload is not available on the free plan. Please upgrade to use this feature.'
      );
      trade = { ...trade, images: [] };
    }

    // 计算 pnl_percent
    const pnlPercent = trade.entryPrice > 0 ? (trade.pnl / (trade.entryPrice * trade.quantity)) * 100 : 0;

    console.log('Saving trade for user:', authUser.id);
    console.log('Trade direction:', trade.direction);

    // Direction enum 是 '做多'/'做空'，需要转换为 'long'/'short'
    const direction = trade.direction === '做多' || (trade.direction as any) === 'long'
      ? 'long'
      : 'short';

    // 上传图片（如果有）
    let screenshotUrl = null;
    if (trade.images && trade.images.length > 0) {
      screenshotUrl = await uploadImage(authUser.id, trade.images[0]);
    }

    const { data, error } = await supabase.from('trading_journals').insert({
      user_id: authUser.id,
      account_id: trade.accountId || null,
      date: trade.entryDate,
      exit_date: trade.exitDate || null,
      symbol: trade.symbol,
      direction: direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      quantity: trade.quantity || 1,
      leverage: trade.leverage || 1,
      risk_amount: trade.riskAmount || 0,
      fees: trade.fees || 0,
      pnl: trade.pnl,
      pnl_percent: pnlPercent,
      setup: trade.setup,
      notes: trade.notes,
      review_notes: trade.reviewNotes || '',
      mistakes: JSON.stringify(trade.mistakes || []),
      screenshot_url: screenshotUrl
    }).select().single();

    if (error) {
      console.error('Error saving trade:', error);
      return;
    }

    if (data) {
      // 直接将新交易追加到本地列表，无需重新拉取
      setTrades(prev => [formatTradeFromDB(data), ...prev]);
    }
  };

  // 更新交易到 Supabase
  const handleUpdateTrade = async (updated: Trade) => {
    // 乐观更新：立刻反映到 UI
    setTrades(prev => prev.map((t: Trade) => t.id === updated.id ? updated : t));

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const pnlPercent = updated.entryPrice > 0 ? (updated.pnl / (updated.entryPrice * updated.quantity)) * 100 : 0;

    // Direction enum 转换为字符串
    const direction = updated.direction === '做多' || (updated.direction as any) === 'long'
      ? 'long'
      : 'short';

    // 检查是否有新图片需要上传
    let screenshotUrl = null;
    if (updated.images && updated.images.length > 0) {
      if (updated.images[0].startsWith('data:')) {
        // Free 用户不支持截图上传
        if (user.tier === 'free') {
          alert(language === 'cn'
            ? '基础账户不支持上传截图，请升级会员后使用此功能。'
            : 'Screenshot upload is not available on the free plan. Please upgrade to use this feature.'
          );
          updated = { ...updated, images: [] };
        } else {
          screenshotUrl = await uploadImage(authUser.id, updated.images[0]);
        }
      } else {
        screenshotUrl = updated.images[0];
      }
    }

    const { error } = await supabase.from('trading_journals').update({
      date: updated.entryDate,
      exit_date: updated.exitDate || null,
      symbol: updated.symbol,
      direction: direction,
      entry_price: updated.entryPrice,
      exit_price: updated.exitPrice,
      quantity: updated.quantity || 1,
      leverage: updated.leverage || 1,
      risk_amount: updated.riskAmount || 0,
      fees: updated.fees || 0,
      pnl: updated.pnl,
      pnl_percent: pnlPercent,
      setup: updated.setup,
      notes: updated.notes,
      review_notes: updated.reviewNotes || '',
      mistakes: JSON.stringify(updated.mistakes || []),
      screenshot_url: screenshotUrl,
      rating: updated.rating || null,
      compliance: updated.compliance || null,
      execution_grade: updated.executionGrade || null,
      account_id: updated.accountId || null,
      profit_target: updated.profitTarget || null,
      stop_loss: updated.stopLoss || null
    }).eq('id', updated.id).eq('user_id', user.id);

    if (!error) {
      setTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
    }
  };

  // 删除交易从 Supabase
  const handleDeleteTrade = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 尝试用 id 直接删除（适用于 UUID id）
    const { error } = await supabase.from('trading_journals').delete().eq('id', id).eq('user_id', user.id);

    if (error) {
      // 如果 id 不是合法 UUID（如 binance-xxx），Supabase 会返回 400
      // 此时尝试通过匹配字段来定位并删除
      const trade = trades.find(t => t.id === id);
      if (trade) {
        const { error: fallbackError } = await supabase
          .from('trading_journals')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', trade.symbol)
          .eq('date', trade.entryDate)
          .eq('pnl', trade.pnl);

        if (fallbackError) {
          console.error('Fallback delete failed:', fallbackError);
        }
      }
    }

    // 无论数据库删除是否成功，都从本地移除
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  // 导入交易到 Supabase
  const handleImportTrades = async (imported: Trade[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const data = imported.map(trade => {
      const pnlPercent = trade.entryPrice > 0 ? (trade.pnl / (trade.entryPrice * trade.quantity)) * 100 : 0;
      // Direction enum 是 '做多'/'做空'，需要转换为 'long'/'short'
      const direction = trade.direction === '做多' || (trade.direction as any) === 'long'
        ? 'long'
        : 'short';
      return {
        user_id: user.id,
        account_id: trade.accountId || null,
        date: trade.entryDate,
        exit_date: trade.exitDate || null,
        symbol: trade.symbol,
        direction,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        quantity: trade.quantity || 1,
        leverage: trade.leverage || 1,
        risk_amount: trade.riskAmount || 0,
        fees: trade.fees || 0,
        pnl: trade.pnl,
        pnl_percent: pnlPercent,
        setup: trade.setup,
        notes: trade.notes,
        review_notes: trade.reviewNotes || '',
        mistakes: JSON.stringify(trade.mistakes || [])
      };
    });

    const { error } = await supabase.from('trading_journals').insert(data);

    if (error) {
      console.error('Error importing trades:', error);
    } else {
      setTrades([...imported, ...trades]);
    }
  };


  const handleAddStrategy = async (strategy: Strategy) => {
    const { data, error } = await userDataService.saveStrategy(strategy);
    if (!error && data) {
      setStrategies(prev => [{ ...strategy, id: data.id }, ...prev]);
    } else {
      // fallback: 用本地 id
      setStrategies(prev => [...prev, strategy]);
    }
  };
  const handleUpdateStrategy = async (updated: Strategy) => {
    setStrategies(strategies.map(s => s.id === updated.id ? updated : s));
    await userDataService.updateStrategy(updated.id, updated);
  };
  const handleDeleteStrategy = async (id: string) => {
    setStrategies(strategies.filter(s => s.id !== id));
    await userDataService.deleteStrategy(id);
  };

  const handleSavePlan = async (plan: DailyPlan) => {
      // 先乐观更新本地 state
      setPlans(prev => {
          const exists = prev.find(p => p.id === plan.id);
          if (exists) return prev.map(p => p.id === plan.id ? plan : p);
          return [plan, ...prev];
      });

      const { data, error } = await userDataService.savePlan(plan);

      // 如果 DB 返回了新 id（前端临时 id 被替换），更新本地
      if (!error && data && data.id !== plan.id) {
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...plan, id: data.id } : p));
      }
  };

  const handleDeletePlan = async (id: string) => {
      const plan = plans.find(p => p.id === id);
      if (!plan) return;

      if (plan.isDeleted) {
          // 已经软删除过，真正删除
          setPlans(prev => prev.filter(p => p.id !== id));
          await userDataService.deletePlan(id);
      } else {
          // 软删除
          const softDeleted = { ...plan, isDeleted: true };
          setPlans(prev => prev.map(p => p.id === id ? softDeleted : p));
          await userDataService.savePlan(softDeleted);
      }
  };

  const onClearShareIntent = () => setShareIntent(null);

  // --- Supabase 同步 wrapper ---
  const handleUpdateTrackerRules = (rules: TrackerRule[]) => {
    setTrackerRules(rules);
    userDataService.saveTrackerRules(rules);
  };

  const handleUpdateChecklist = (items: ChecklistItem[]) => {
    setChecklist(items);
    userDataService.saveChecklist(items);
  };

  const handleSetWeeklyGoal = (goal: WeeklyGoal) => {
    setWeeklyGoal(goal);
    userDataService.saveWeeklyGoal(goal);
  };

  const handleSaveRiskSettings = (settings: RiskSettings) => {
    setRiskSettings(settings);
    userDataService.saveRiskSettings(settings);
  };

  const handleUpdateDisciplineRules = async (rules: DisciplineRule[]) => {
    setDisciplineRules(rules);
    const { data } = await userDataService.saveDisciplineRules(rules);
    // 用 DB 返回的真实 uuid 替换前端临时 id
    if (data && data.length > 0) {
      const dbRules: DisciplineRule[] = data.map((r: any) => ({
        id: r.id,
        text: r.text,
        xpReward: r.xp_reward ?? 10,
      }));
      setDisciplineRules(dbRules);
    }
  };

  const handleUpdateStrategiesFromPlans = (strats: Strategy[]) => {
    setStrategies(strats);
    // 逐个更新到 Supabase
    strats.forEach(s => userDataService.updateStrategy(s.id, s));
  };

  const handlePushNotification = (n: Notification) => {
    setNotifications(prev => [n, ...prev]);
    userDataService.saveNotification(n);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    userDataService.markAllNotificationsRead();
    // 同时标记所有未读广播
    notifications
      .filter(n => n.id.startsWith('broadcast_') && !n.isRead)
      .forEach(n => userDataService.markBroadcastRead(n.id.replace('broadcast_', '')));
  };

  const handleMarkOneNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (id.startsWith('broadcast_')) {
      userDataService.markBroadcastRead(id.replace('broadcast_', ''));
    } else {
      userDataService.markNotificationRead(id);
    }
  };

  // ============ 交易所连接完整流程 ============
  const handleExchangeConnect = async (data: {
    accountType: string;
    apiKey: string;
    apiSecret: string;
    skipSpot: boolean;
    startDate: string;
  }) => {
    if (!connectingExchange) return;

    try {
      // 1. 保存 exchange_connection 到 Supabase
      const { data: connData, error: connError } = await userDataService.saveExchangeConnection({
        exchange: connectingExchange.name,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        label: connectingExchange.name,
        accountType: data.accountType,
        skipSpot: data.skipSpot,
        startDate: data.startDate,
      });

      if (connError || !connData) {
        console.error('保存连接失败:', connError);
        showToast('连接失败，请重试');
        return;
      }

      // 2. 生成账户名 & 创建 trading_account（先用余额 0，后面更新）
      const accountName = generateAccountName(connectingExchange.name);
      const { data: accountData, error: accountError } = await userDataService.saveTradingAccount({
        name: accountName,
        exchange: connectingExchange.name,
        brokerLogoUrl: connectingExchange.logoUrl,
        brokerBrandColor: connectingExchange.brandColor,
        balance: 0,
        currency: 'USDT',
        profitMethod: 'FIFO',
        accountType: 'auto_sync',
        syncStatus: 'syncing',
        exchangeConnectionId: connData.id,
      });

      if (accountError || !accountData) {
        console.error('创建账户失败:', accountError);
        showToast('创建账户失败，请重试');
        return;
      }

      // 3. 调用真实 Binance API 拉取交易数据 + 余额
      const { trades: importedTrades, balance: fetchedBalance, currency: fetchedCurrency } = await fetchTradesFromExchange(
        connectingExchange.name,
        data.apiKey,
        data.apiSecret,
        undefined,
        accountData.id,
        data.startDate,
      );

      // 4. 写入 trading_journals（带 account_id）
      if (importedTrades.length > 0) {
        const importResult = await userDataService.importTradesWithAccount(
          importedTrades.map(t => ({
            date: t.entryDate,
            exitDate: t.exitDate,
            symbol: t.symbol,
            direction: t.direction,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            quantity: t.quantity,
            leverage: t.leverage,
            riskAmount: t.riskAmount,
            fees: t.fees,
            pnl: t.pnl,
            setup: t.setup,
            notes: t.notes,
            reviewNotes: t.reviewNotes,
            mistakes: t.mistakes,
          })),
          accountData.id,
        );

        // 更新本地 trades 状态 — 优先使用数据库返回的真实 UUID
        let tradesWithAccount: Trade[];
        if (importResult.data && importResult.data.length > 0) {
          tradesWithAccount = importResult.data.map(formatTradeFromDB);
        } else {
          tradesWithAccount = importedTrades.map(t => ({ ...t, accountId: accountData.id }));
        }
        setTrades(prev => [...tradesWithAccount, ...prev]);
      }

      // 5. 更新账户同步状态 + 真实余额
      await userDataService.updateTradingAccount(accountData.id, {
        syncStatus: 'synced',
        lastSync: new Date().toISOString(),
        balance: fetchedBalance,
        currency: fetchedCurrency,
      });

      // 6. 刷新本地账户列表（先更新，再跳转，确保 SettingsPage 拿到最新数据）
      const freshAccounts = await userDataService.loadTradingAccounts();
      setTradingAccounts(freshAccounts);

      // 7. 关闭所有 overlay
      setShowBrokerSync(false);
      setShowSelectImportMethod(false);
      setShowConnectExchange(false);
      setConnectingExchange(null);

      // 自动切换到新账户，确保交易日志等页面能看到新导入的数据
      setSelectedAccountId(accountData.id);

      // 8. 显示成功 Toast（先显示，再跳转，避免跳转后 toast 消失）
      showToast(`连接成功！已导入 ${importedTrades.length} 笔交易到 ${accountName}`);

      // 9. 延迟一帧跳转，确保 React 已将 tradingAccounts 更新刷入 SettingsPage
      setTimeout(() => {
        setSettingsInitialSection('brokers');
        setActiveTab('settings');
        // 跳转后清除 initialSection，避免下次进入设置页时仍跳到 brokers
        setTimeout(() => setSettingsInitialSection(undefined), 200);
      }, 50);

    } catch (error) {
      console.error('连接流程出错:', error);
      showToast('连接过程中出现错误，请重试');
    }
  };

  const handleCheckDisciplineRule = (ruleId: string, isChecked: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = disciplineHistory.find(r => r.date === todayStr);
    let newHistory = [...disciplineHistory];
    let updatedRecord: DailyDisciplineRecord;

    if (todayRecord) {
      const newCompletedIds = isChecked
        ? [...todayRecord.completedRuleIds, ruleId]
        : todayRecord.completedRuleIds.filter(id => id !== ruleId);
      updatedRecord = { ...todayRecord, completedRuleIds: newCompletedIds };
      newHistory = newHistory.map(r => r.date === todayStr ? updatedRecord : r);
    } else {
      updatedRecord = {
        date: todayStr,
        completedRuleIds: isChecked ? [ruleId] : [],
        totalPossibleXp: disciplineRules.length * 10,
        earnedXp: isChecked ? 10 : 0,
        isSuccess: true,
      };
      newHistory.push(updatedRecord);
    }

    setDisciplineHistory(newHistory);
    userDataService.saveDisciplineRecord(updatedRecord);
  };

  const handleShare = (intent: ShareIntent) => {
      setShareIntent(intent);
      if (intent.type === 'trade') {
          setIsShareModalOpen(true);
      } else {
          handleSetActiveTab('plaza');
      }
  };

  // --- FAB Handlers ---
  const fabActions = [
      {
          id: 'trade',
          label: t.fab?.trade || (language === 'cn' ? '记录交易' : 'Log Trade'),
          icon: TrendingUp,
          color: 'bg-emerald-500',
          onClick: () => {
              handleSetActiveTab('journal');
              setJournalAutoOpen(true);
              setIsFabOpen(false);
          }
      },
      {
          id: 'note',
          label: t.fab?.note || (language === 'cn' ? '记笔记' : 'Quick Note'),
          icon: FileText,
          color: 'bg-indigo-500',
          onClick: () => {
              handleSetActiveTab('plans');
              setNoteAutoCreate(true);
              setIsFabOpen(false);
          }
      },
      {
          id: 'strategy',
          label: language === 'cn' ? '新增策略' : 'Add Strategy',
          icon: BookOpen,
          color: 'bg-purple-500',
          onClick: () => {
              handleSetActiveTab('playbook');
              setPlaybookAutoCreate(true);
              setIsFabOpen(false);
          }
      },
      {
          id: 'post',
          label: t.fab?.post || (language === 'cn' ? '发表观点' : 'Post View'),
          icon: Globe,
          color: 'bg-sky-500',
          onClick: () => {
              handleSetActiveTab('plaza');
              setIsFabOpen(false);
          }
      },
      {
          id: 'support',
          label: language === 'cn' ? '客服支持' : 'Support',
          icon: HelpCircle,
          color: 'bg-slate-500',
          onClick: () => {
              openProfile();
              setIsFabOpen(false);
          }
      }
  ];

  if (isLoading) {
      return (
          <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
      );
  }

  if (!isAuthenticated) {
      return <AuthPage />;
  }

  const renderContent = () => {
      switch (activeTab) {
          case 'dashboard':
              return (
                  <PageContainer>
                      <Dashboard
                          trades={trades}
                          riskSettings={riskSettings}
                          trackerRules={trackerRules}
                          onUpdateTrackerRules={handleUpdateTrackerRules}
                          plans={plans}
                          onSavePlan={handleSavePlan}
                          onQuickAddTrade={() => { handleSetActiveTab('journal'); setJournalAutoOpen(true); }}
                          weeklyGoal={weeklyGoal}
                          onSetWeeklyGoal={handleSetWeeklyGoal}
                          onViewGoals={() => {/* Navigate to goals detail if needed */}}
                          onViewLeaderboard={() => handleSetActiveTab('leaderboard')}
                          onViewPsychology={() => handleSetActiveTab('psychology')}
                          userProfile={{ level: 5, currentXp: 450, nextLevelXp: 1000, totalLifetimeXp: 4500 }} // Mock
                          disciplineHistory={disciplineHistory}
                          disciplineRules={disciplineRules}
                          onUpdateDisciplineRules={handleUpdateDisciplineRules}
                          onCheckDisciplineRule={handleCheckDisciplineRule}
                          tradingAccounts={tradingAccounts}
                          selectedAccountId={selectedAccountId}
                          onAccountChange={setSelectedAccountId}
                          onManageAccounts={() => { setSettingsInitialSection('brokers'); handleSetActiveTab('settings'); setTimeout(() => setSettingsInitialSection(undefined), 200); }}
                      />
                  </PageContainer>
              );
          case 'leaderboard':
              return (
                  <LeaderboardPage onBack={() => handleSetActiveTab('dashboard')} />
              );
          case 'journal':
              return (
                  <PageContainer>
                      <Journal
                          trades={trades}
                          plans={plans}
                          onAddTrade={handleAddTrade}
                          onUpdateTrade={handleUpdateTrade}
                          onDeleteTrade={handleDeleteTrade}
                          checklist={checklist}
                          onUpdateChecklist={handleUpdateChecklist}
                          onImportTrades={handleImportTrades}
                          onShare={(t) => handleShare({ type: 'trade', data: t })}
                          riskSettings={riskSettings}
                          onSavePlan={handleSavePlan}
                          autoOpen={journalAutoOpen}
                          onResetAutoOpen={() => journalAutoOpen && setJournalAutoOpen(false)}
                          strategies={strategies}
                          tradingAccounts={tradingAccounts}
                          initialAccountId={selectedAccountId}
                          onNavigateToNote={(id) => {
                              setNoteSelectionIntent(id);
                              handleSetActiveTab('plans');
                          }}
                          onCreateNoteIntent={(date, tradeIds) => {
                              setNoteCreationIntent({ date, linkedTradeIds: tradeIds });
                              handleSetActiveTab('plans');
                          }}
                      />
                  </PageContainer>
              );
          case 'playbook':
              return (
                  <div className="h-full overflow-hidden">
                      <PlaybookPage
                          strategies={strategies}
                          trades={filteredTrades}
                          onAddStrategy={handleAddStrategy}
                          onUpdateStrategy={handleUpdateStrategy}
                          onDeleteStrategy={handleDeleteStrategy}
                          onUpdateTrade={handleUpdateTrade}
                          onDeleteTrade={handleDeleteTrade}
                          onSavePlan={handleSavePlan}
                          autoCreate={playbookAutoCreate}
                          onResetAutoCreate={() => setPlaybookAutoCreate(false)}
                      />
                  </div>
              );
          case 'charts':
              return (
                  <div className="h-full overflow-hidden">
                      <ChartPage 
                          onSavePlan={handleSavePlan}
                          onNavigateToNotebook={() => handleSetActiveTab('plans')}
                      />
                  </div>
              );
          case 'reports':
              return (
                  <PageContainer>
                      <Reports
                          trades={filteredTrades}
                          accountSize={riskSettings.accountSize}
                          plans={plans}
                          onSavePlan={handleSavePlan}
                          onPushNotification={handlePushNotification}
                          disciplineHistory={disciplineHistory}
                          riskSettings={riskSettings}
                      />
                  </PageContainer>
              );
          case 'plans':
              return (
                  <div className="h-full overflow-hidden p-4 bg-slate-50 dark:bg-slate-950">
                      <TradingPlans 
                          plans={plans}
                          trades={trades}
                          strategies={strategies}
                          onSavePlan={handleSavePlan}
                          onDeletePlan={handleDeletePlan}
                          onSaveStrategies={handleUpdateStrategiesFromPlans}
                          onShare={(p) => handleShare({ type: 'plan', data: p })}
                          autoCreate={noteAutoCreate}
                          onResetAutoCreate={() => setNoteAutoCreate(false)}
                          selectionIntent={noteSelectionIntent}
                          onClearSelectionIntent={() => setNoteSelectionIntent(null)}
                          creationIntent={noteCreationIntent}
                          onClearCreationIntent={() => setNoteCreationIntent(null)}
                      />
                  </div>
              );
          case 'psychology':
              return (
                  <PageContainer>
                      <Psychology
                          riskSettings={riskSettings}
                          onSaveSettings={handleSaveRiskSettings}
                          rules={[]}
                          onToggleRule={() => {}}
                          onAddRule={() => {}}
                          onDeleteRule={() => {}}
                          reviewStatus={reviewStatus}
                          onUpdateReview={() => {}}
                          trades={filteredTrades}
                          disciplineRules={disciplineRules}
                          disciplineHistory={disciplineHistory}
                      />
                  </PageContainer>
              );
          case 'calendar':
              return (
                  <PageContainer>
                      <CalendarView
                          trades={filteredTrades}
                          plans={plans}
                          onSavePlan={handleSavePlan}
                      />
                  </PageContainer>
              );
          case 'referrals':
              return (
                  <div className="h-full overflow-hidden">
                      <ReferralCenter />
                  </div>
              );
          case 'plaza':
              return (
                  <PageContainer>
                      <SocialPlaza 
                          userTrades={trades}
                          userPlans={plans}
                          userProfile={{ name: 'Me', initials: 'ME', tier: 'Pro' }}
                          posts={posts}
                          onUpdatePosts={setPosts}
                          shareIntent={shareIntent}
                          onClearShareIntent={onClearShareIntent}
                      />
                  </PageContainer>
              );
          case 'academy':
              return (
                  <PageContainer>
                      <Academy />
                  </PageContainer>
              );
          case 'notifications':
              return (
                  <PageContainer>
                      <NotificationCenter
                          notifications={notifications}
                          onMarkAllRead={handleMarkAllNotificationsRead}
                          onMarkOneRead={handleMarkOneNotificationRead}
                      />
                  </PageContainer>
              );
          case 'settings':
              return <SettingsPage
                onImportTrades={handleImportTrades}
                tradingAccounts={tradingAccounts}
                initialSection={settingsInitialSection}
                onAddAccount={() => setShowConnectExchange(true)}
                onDeleteAccount={async (id) => {
                  await userDataService.deleteTradingAccount(id);
                  setTradingAccounts(prev => prev.filter(a => a.id !== id));
                  setTrades(prev => prev.filter(t => t.accountId !== id));
                }}
                onSyncAccount={async (id) => {
                  const account = tradingAccounts.find(a => a.id === id);
                  if (!account || !account.exchangeConnectionId) return;

                  // 获取 API 凭证
                  const connections = await userDataService.loadExchangeConnections();
                  const conn = connections.find(c => c.id === account.exchangeConnectionId);
                  if (!conn) { showToast('找不到 API 凭证，请重新连接'); return; }

                  showToast('正在同步...');
                  try {
                    // 以上次同步时间为起点，只拉取新数据
                    const startDate = account.lastSync ?? undefined;
                    const { trades: newTrades, balance, currency } = await fetchTradesFromExchange(
                      account.exchange ?? conn.exchange,
                      conn.apiKey,
                      conn.apiSecret,
                      undefined,
                      id,
                      startDate,
                    );

                    // 去重：过滤掉内存中已存在的交易（清除后state为空，不会过滤任何东西，符合预期）
                    const existingKeys = new Set(trades.filter(t => t.accountId === id).map(t => `${t.symbol}-${t.entryDate}`));
                    const dedupedTrades = newTrades.filter(t => !existingKeys.has(`${t.symbol}-${t.entryDate}`));

                    if (dedupedTrades.length > 0) {
                      const result = await userDataService.importTradesWithAccount(
                        dedupedTrades.map(t => ({
                          date: t.entryDate, exitDate: t.exitDate, symbol: t.symbol,
                          direction: t.direction, entryPrice: t.entryPrice, exitPrice: t.exitPrice,
                          quantity: t.quantity, leverage: t.leverage, riskAmount: t.riskAmount,
                          fees: t.fees, pnl: t.pnl, setup: t.setup, notes: t.notes,
                          reviewNotes: t.reviewNotes, mistakes: t.mistakes,
                        })),
                        id,
                      );
                      if (result.data) {
                        setTrades(prev => [...result.data!.map(formatTradeFromDB), ...prev]);
                      }
                    }

                    // 更新账户余额和同步时间
                    const now = new Date().toISOString();
                    await userDataService.updateTradingAccount(id, { syncStatus: 'synced', lastSync: now, balance, currency });
                    setTradingAccounts(prev => prev.map(a => a.id === id ? { ...a, balance, currency, syncStatus: 'synced', lastSync: now } : a));
                    showToast(dedupedTrades.length > 0 ? `同步完成，新增 ${dedupedTrades.length} 笔交易` : '同步完成，暂无新交易');
                  } catch (err: any) {
                    showToast(`同步失败：${err?.message ?? '请重试'}`);
                  }
                }}
                onUpdateAccount={async (id, updates) => {
                  await userDataService.updateTradingAccount(id, updates);
                  setTradingAccounts(prev => prev.map(a => a.id === id
                    ? { ...a, ...(updates.manualBalance !== undefined ? { manualBalance: updates.manualBalance ?? undefined } : {}), ...(updates.balance !== undefined ? { balance: updates.balance } : {}) }
                    : a
                  ));
                }}
                onClearTrades={async (accountId) => {
                  await userDataService.clearAccountTrades(accountId);
                  // 同时清空 lastSync，确保下次同步能从头拉取所有历史数据
                  await userDataService.updateTradingAccount(accountId, { lastSync: '' });
                  setTrades(prev => prev.filter(t => t.accountId !== accountId));
                  setTradingAccounts(prev => prev.map(a => a.id === accountId ? { ...a, lastSync: undefined } : a));
                }}
                riskSettings={riskSettings}
                onSaveRiskSettings={handleSaveRiskSettings}
              />;
          default:
              return <div className="p-10 text-center">404 - Module Not Found</div>;
      }
  };

  return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:white font-sans transition-colors duration-300">
          <Sidebar 
              activeTab={activeTab} 
              setActiveTab={handleSetActiveTab}
              theme={theme}
              toggleTheme={toggleTheme}
              unreadNotificationsCount={notifications.filter(n => !n.isRead).length}
              isCollapsed={isSidebarCollapsed}
              toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onAddTrade={() => { handleSetActiveTab('journal'); setJournalAutoOpen(true); }}
          />
          <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-200 ${isSidebarCollapsed ? 'ml-[116px]' : 'ml-[116px] md:ml-[284px]'}`}>
              {renderContent()}
              <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
                  <div className={`flex flex-col items-end gap-3 transition-all duration-300 ease-out mb-2 ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none scale-90'}`}>
                      {fabActions.map((action, idx) => (
                          <div 
                            key={action.id} 
                            className="flex items-center gap-3 transition-all duration-300"
                            style={{ transitionDelay: isFabOpen ? `${(fabActions.length - 1 - idx) * 50}ms` : '0ms' }}
                          >
                              <span className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap">
                                  {action.label}
                              </span>
                              <button
                                  onClick={action.onClick}
                                  className={`w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform ${action.color}`}
                              >
                                  <action.icon className="w-5 h-5" />
                              </button>
                          </div>
                      ))}
                  </div>
                  <div className="pointer-events-auto flex gap-3 items-end">
                      {!isFabOpen && (
                          <button
                              onClick={() => setIsChatOpen(true)}
                              className="w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-600 transition-all hover:scale-110 animate-fade-in"
                              title={language === 'cn' ? 'AI 交易助手' : 'AI Trading Assistant'}
                          >
                              <MessageSquarePlus className="w-5 h-5" />
                          </button>
                      )}
                      <button 
                          onClick={() => setIsFabOpen(!isFabOpen)}
                          className={`w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 transform ${isFabOpen ? 'rotate-45 bg-rose-50 hover:bg-rose-600' : 'hover:scale-110'}`}
                      >
                          <Plus className="w-8 h-8" />
                      </button>
                  </div>
              </div>
          </main>
          <ChatAssistant 
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              onSaveToNotebook={(content) => handleSavePlan({ 
                  id: Date.now().toString(), 
                  date: new Date().toISOString().split('T')[0], 
                  folder: 'daily-journal', 
                  content, 
                  focusTickers: [],
                  title: 'AI Conversation' 
              })}
              onAutoLogTrade={(data) => {
                  const newTrade: Trade = {
                      id: Date.now().toString(),
                      symbol: data.symbol || 'UNK',
                      direction: data.direction === 'SHORT' ? Direction.SHORT : Direction.LONG,
                      entryPrice: data.entryPrice || 0,
                      quantity: data.quantity || 0,
                      status: TradeStatus.OPEN,
                      pnl: 0,
                      entryDate: new Date().toISOString(),
                      exitDate: '',
                      exitPrice: 0,
                      fees: 0,
                      setup: data.setup || '',
                      notes: data.notes || 'Logged via AI',
                      mistakes: []
                  };
                  handleAddTrade(newTrade);
                  return newTrade;
              }}
              onViewTrade={(id) => { handleSetActiveTab('journal'); }}
              trades={trades}
              tradingRules={trackerRules}
              riskSettings={riskSettings}
          />
          <ChatWindow />
          <FriendListDrawer />
          <SettingsModal onImportTrades={handleImportTrades} />
          <PricingModal />
          <UserProfileModal />
          {/* TEMPORARILY DISABLED — OnboardingModal replaced by new first-login flow */}
          {/* {showOnboarding && (
              <OnboardingModal onComplete={() => { setShowOnboarding(false); startInitialTour(); }} />
          )} */}
          {showWelcome && user.id && (
              <WelcomeModal
                  userId={user.id}
                  userEmail={user.email}
                  userMetaUsername={user.name !== 'Trader' ? user.name : undefined}
                  onComplete={() => setWelcomeDismissed(true)}
                  onNavigate={(tab, action) => {
                      if (tab === 'connect-exchange') {
                          setWelcomeDismissed(true);
                          setShowConnectExchange(true);
                          return;
                      }
                      handleSetActiveTab(tab);
                      if (action === 'add-trade') setJournalAutoOpen(true);
                  }}
              />
          )}
          <TourOverlay />
          {showConnectExchange && (
              <ConnectExchangePage
                onClose={() => setShowConnectExchange(false)}
                onContinue={(exchange) => {
                  setConnectingExchange(exchange);
                  setShowConnectExchange(false);
                  setShowSelectImportMethod(true);
                }}
              />
          )}
          {showSelectImportMethod && connectingExchange && (
              <SelectImportMethodPage
                exchangeName={connectingExchange.name}
                exchangeLogoUrl={connectingExchange.logoUrl}
                exchangeBrandColor={connectingExchange.brandColor}
                onBack={() => { setShowSelectImportMethod(false); setShowConnectExchange(true); }}
                onClose={() => setShowSelectImportMethod(false)}
                onContinue={(method) => {
                  if (method === 'auto') {
                    setShowSelectImportMethod(false);
                    setShowBrokerSync(true);
                  } else {
                    console.log('导入方式：', method, '交易所：', connectingExchange.name);
                    setShowSelectImportMethod(false);
                  }
                }}
              />
          )}
          {showBrokerSync && connectingExchange && (
              <BrokerSyncPage
                exchangeName={connectingExchange.name}
                exchangeLogoUrl={connectingExchange.logoUrl}
                exchangeBrandColor={connectingExchange.brandColor}
                supportedAssets={{ 股票: false, 期货: false, 期权: false, 外汇: false, 加密货币: true, 差价合约: false }}
                onBack={() => { setShowBrokerSync(false); setShowSelectImportMethod(true); }}
                onClose={() => setShowBrokerSync(false)}
                onConnect={async (data) => { await handleExchangeConnect(data); }}
              />
          )}
          {isShareModalOpen && shareIntent?.type === 'trade' && (
              <TradeShareModal 
                isOpen={isShareModalOpen} 
                trade={shareIntent.data as Trade} 
                onClose={() => { setIsShareModalOpen(false); onClearShareIntent(); }} 
              />
          )}
          {isFabOpen && (
              <div
                className="fixed inset-0 bg-slate-900/20 z-30 transition-opacity duration-300"
                onClick={() => setIsFabOpen(false)}
              ></div>
          )}
          {/* Toast 通知 */}
          <div style={{
            position: 'fixed', bottom: 32, left: '50%', transform: `translateX(-50%) translateY(${toast.visible ? '0' : '12px'})`,
            zIndex: 99999, background: '#1a1a2e', color: '#fff', padding: '12px 24px',
            borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: toast.visible ? 1 : 0,
            pointerEvents: toast.visible ? 'auto' : 'none',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            whiteSpace: 'nowrap',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            {toast.message}
          </div>
      </div>
  );
};

// MainApp wraps MainAppInner with TourProvider so setActiveTab is accessible
const MainApp: React.FC = () => {
  const setActiveTabRef = React.useRef<(tab: string) => void>(() => {});
  const onSetActiveTabReady = React.useCallback((fn: (tab: string) => void) => {
    setActiveTabRef.current = fn;
  }, []);
  return (
    <TourProvider setActiveTab={(tab) => setActiveTabRef.current(tab)}>
      <MainAppInner onSetActiveTabReady={onSetActiveTabReady} />
    </TourProvider>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <UserProvider>
        <SocialProvider>
          <MainApp />
        </SocialProvider>
      </UserProvider>
    </LanguageProvider>
  );
};

export default App;