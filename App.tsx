import { tradePnlPercent, type FeeTemplate } from './utils/tradeCalculation';
import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';

import { persistTradeScreenshots, readTradeScreenshots, validateScreenshotCount } from './utils/tradeScreenshots';
import { countNonDemoJournalTrades } from './utils/journalRiskAdvisories';

const uploadImage = async (userId: string, imageBase64: string): Promise<string | null> => {
  const response = await fetch(imageBase64);
  const blob = await response.blob();
  const fileName = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('trade-images').upload(fileName, blob, { contentType: 'image/jpeg' });
  if (error) return null;
  return supabase.storage.from('trade-images').getPublicUrl(fileName).data.publicUrl;
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
import CsvImportPage from './components/CsvImportPage';
import ChartPage from './components/ChartPage';
import LeaderboardPage from './components/LeaderboardPage';
import TradeShareModal from './components/TradeShareModal';
import AccountDetailsModal from './components/AccountDetailsModal';

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
  TradingAccount, TagCategoryDefinition
} from './types';
import { normalizeTagCategories } from './utils/tagCategories';

const PageContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="min-w-0 py-6 px-4 md:py-8 md:px-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="min-w-0 w-full h-full">
            {children}
        </div>
    </div>
);

const TAB_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  charts: '/charts',
  journal: '/journal',
  playbook: '/playbook',
  reports: '/reports',
  plans: '/notebook',
  psychology: '/psychology',
  calendar: '/calendar',
  plaza: '/community/plaza',
  academy: '/academy',
  notifications: '/notifications',
  leaderboard: '/leaderboard',
  settings: '/settings',
};

const PATH_TO_TAB: Record<string, string> = Object.entries(TAB_TO_PATH).reduce((acc, [tab, path]) => {
  acc[path] = tab;
  return acc;
}, {} as Record<string, string>);

PATH_TO_TAB['/'] = 'dashboard';
PATH_TO_TAB['/plans'] = 'plans';

const tabFromPath = (pathname: string) => PATH_TO_TAB[pathname.replace(/\/+$/, '') || '/'] || 'dashboard';
const pathFromTab = (tab: string) => TAB_TO_PATH[tab] || TAB_TO_PATH.dashboard;

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
  if (!exitPrice && !trade.exit_date) {
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
    exitDate: status === TradeStatus.OPEN ? '' : trade.exit_date || trade.date,
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
    customTags: trade.custom_tags ? (typeof trade.custom_tags === 'string' ? JSON.parse(trade.custom_tags) : trade.custom_tags) : {},
    images: readTradeScreenshots(trade),
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    return tabFromPath(window.location.pathname);
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1440 : window.innerWidth);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tg_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState('');
  const [dataLoadAttempt, setDataLoadAttempt] = useState(0);
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [defaultTradingAccountId, setDefaultTradingAccountId] = useState('');
  // const [showOnboarding, setShowOnboarding] = useState(false); // TEMPORARILY DISABLED
  // showWelcome: derived from context but controlled by local state so Step2 can stay open
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcome = isAuthenticated && onboardingCompleted === false && !welcomeDismissed;
  const [showConnectExchange, setShowConnectExchange] = useState(false);
  const [showSelectImportMethod, setShowSelectImportMethod] = useState(false);
  const [showBrokerSync, setShowBrokerSync] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const csvCreatedAccountId = React.useRef<string | null>(null);
  const [showManualAccount, setShowManualAccount] = useState(false);
  const [connectingExchange, setConnectingExchange] = useState<{ id: string; name: string; logoUrl?: string; brandColor?: string } | null>(null);
  const isAutoCompactSidebar = viewportWidth < 1280;
  const isRailOnlySidebar = viewportWidth < 768;
  const effectiveSidebarCollapsed = isSidebarCollapsed || isAutoCompactSidebar;
  const mainOffsetClass = isRailOnlySidebar
    ? 'ml-[60px]'
    : effectiveSidebarCollapsed
      ? 'ml-[116px]'
      : 'ml-[284px]';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Register setActiveTab with TourProvider so Tour can switch tabs
  const handleSetActiveTab = React.useCallback((tab: string) => {
    const nextPath = pathFromTab(tab);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState({ tab }, '', nextPath + window.location.search);
    }
    setActiveTab(tab);
  }, []);

  React.useEffect(() => {
    onSetActiveTabReady(handleSetActiveTab);
  }, [handleSetActiveTab, onSetActiveTabReady]);

  React.useEffect(() => {
    const handlePopState = () => {
      setActiveTab(tabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
  const [tagCategories, setTagCategories] = useState<TagCategoryDefinition[]>(() => normalizeTagCategories(null));

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

  // Commit a complete load together; a failed read stays visible and can be retried.
  useEffect(() => {
    if (!isAuthenticated || !user.id) return;
    let cancelled = false;
    const loadAllData = async () => {
      setIsDataLoading(true);
      setDataLoadError('');
      try {
        await userDataService.ensureDefaultAccount();
        const [result, broadcastNotifications] = await Promise.all([
          userDataService.loadUserData(),
          userDataService.loadBroadcastNotifications().catch(() => []),
        ]);
        if (!result) throw new Error('登录状态已过期，请重新登录');
        if (cancelled) return;
        setCurrentUserId(user.id!);
        setTrades((result.trades || []).map(formatTradeFromDB));
        setStrategies(result.strategies);
        setChecklist(result.checklist);
        setTrackerRules(result.trackerRules);
        setPlans(result.plans);
        setNotifications([...broadcastNotifications, ...(result.notifications || [])]);
        setDisciplineRules(result.disciplineRules);
        setDisciplineHistory(result.disciplineHistory);
        if (result.weeklyGoal) setWeeklyGoal(result.weeklyGoal);
        if (result.riskSettings) setRiskSettings(result.riskSettings);
        setTagCategories(normalizeTagCategories((result as any).tagCategories));
        setTradingAccounts(result.tradingAccounts);
        setDefaultTradingAccountId(result.defaultTradingAccountId || '');
        setFeeTemplates(result.feeTemplates || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading user data:', error);
          setDataLoadError(language === 'cn' ? '账户或交易数据加载失败，暂时无法保存。请重试，你填写的交易会保留。' : 'Account or trade data could not load. Retry to save; your draft is kept.');
        }
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    };
    loadAllData();
    return () => { cancelled = true; };
  }, [isAuthenticated, user.id, dataLoadAttempt]);

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
  const [journalReviewTradeId, setJournalReviewTradeId] = useState<string | null>(null);
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

  // Set the root theme before charts paint; CSS variables update all inline UI.
  useLayoutEffect(() => {
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
    if (!authUser || authUser.id !== user.id) {
      throw new Error('登录状态已过期，请重新登录');
    }

    // Sample/demo records never consume the real-journal allowance.
    if (dataLoadError) throw new Error(dataLoadError);
    if (!tradingAccounts.some(account => account.id === trade.accountId)) throw new Error(language === 'cn' ? '请选择交易归属账户，或先创建自己的账户。' : 'Select a trading account or create your own first.');
    if (isDataLoading) throw new Error(language === 'cn' ? '账户数据仍在加载，请稍候再保存。' : 'Account data is loading. Please save again shortly.');
    const TRADE_LIMITS: Record<string, number | null> = { free: 100, pro: 1000, elite: null };
    const tradeLimit = TRADE_LIMITS[user.tier];
    const isDemoTarget = tradingAccounts.some(account => account.id === trade.accountId && account.type === 'demo');
    if (!isDemoTarget && tradeLimit !== null && countNonDemoJournalTrades(trades, tradingAccounts) >= tradeLimit) {
      throw new Error(language === 'cn'
        ? `当前方案最多可记录 ${tradeLimit} 笔非演示交易，演示数据不计入额度。请升级方案后继续添加。`
        : `Your plan allows ${tradeLimit} non-demo trades. Demo data does not count. Please upgrade to add more.`);
    }

    validateScreenshotCount(user.tier, trade.images?.length || 0);

    // 计算 pnl_percent
    const pnlPercent = tradePnlPercent(trade);

    console.log('Saving trade for user:', authUser.id);
    console.log('Trade direction:', trade.direction);

    // Direction enum 是 '做多'/'做空'，需要转换为 'long'/'short'
    const direction = trade.direction === '做多' || (trade.direction as any) === 'long'
      ? 'long'
      : 'short';

    const screenshotUrls = await persistTradeScreenshots(trade.images || [], image => uploadImage(authUser.id, image));

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
      custom_tags: trade.customTags || {},
      screenshot_url: screenshotUrls[0] || null,
      screenshot_urls: screenshotUrls
    }).select().single();

    if (error) {
      throw new Error(error.message || '保存交易失败，请重试');
    }

    if (!data) throw new Error('交易未能保存，请重试');
    const saved = formatTradeFromDB(data);
    setTrades(prev => [saved, ...prev]);
    return saved;
  };

  // 更新交易到 Supabase
  const handleUpdateTrade = async (updated: Trade) => {
    const previousImages = trades.find(trade => trade.id === updated.id)?.images || [];
    if (JSON.stringify(updated.images || []) !== JSON.stringify(previousImages)) validateScreenshotCount(user.tier, updated.images?.length || 0);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || authUser.id !== user.id) throw new Error('登录状态已过期，请重新登录');

    const pnlPercent = tradePnlPercent(updated);

    // Direction enum 转换为字符串
    const direction = updated.direction === '做多' || (updated.direction as any) === 'long'
      ? 'long'
      : 'short';

    const screenshotUrls = await persistTradeScreenshots(updated.images || [], image => uploadImage(authUser.id, image));

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
      custom_tags: updated.customTags || {},
      screenshot_url: screenshotUrls[0] || null,
      screenshot_urls: screenshotUrls,
      rating: updated.rating || null,
      compliance: updated.compliance || null,
      execution_grade: updated.executionGrade || null,
      account_id: updated.accountId || null,
      profit_target: updated.profitTarget || null,
      stop_loss: updated.stopLoss || null
    }).eq('id', updated.id).eq('user_id', user.id);

    if (error) throw new Error(error.message || '保存交易失败，请重试');
    setTrades(prev => prev.map(t => t.id === updated.id ? { ...updated, images: screenshotUrls } : t));
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

  // 批量删除 — 一条 SQL 删除所有，避免 N 次串行请求
  const handleBatchDeleteTrades = async (ids: string[]) => {
    if (!ids.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('trading_journals').delete().in('id', ids).eq('user_id', user.id);
    setTrades(prev => prev.filter(t => !ids.includes(t.id)));
  };

  // 导入交易到 Supabase
  const handleImportTrades = async (imported: Trade[]) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || authUser.id !== user.id) throw new Error('登录状态已过期，请重新登录后导入');

    const data = imported.map(trade => {
      const pnlPercent = tradePnlPercent(trade);
      // Direction enum 是 '做多'/'做空'，需要转换为 'long'/'short'
      const direction = trade.direction === '做多' || (trade.direction as any) === 'long'
        ? 'long'
        : 'short';
      return {
        user_id: authUser.id,
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
        mistakes: JSON.stringify(trade.mistakes || []),
        custom_tags: trade.customTags || {}
      };
    });

    const { data: savedRows, error } = await supabase.from('trading_journals').insert(data).select();

    if (error) {
      if (error.code === '23505') {
        // 唯一约束冲突：部分或全部记录已存在，逐条插入跳过重复
        const results = await Promise.allSettled(
          data.map(row => supabase.from('trading_journals').insert(row).select().single())
        );
        const insertedTrades = results.flatMap(result => result.status === 'fulfilled' && result.value.data ? [formatTradeFromDB(result.value.data)] : []);
        if (insertedTrades.length) setTrades(prev => [...insertedTrades, ...prev]);
        const failures = results.filter(result => result.status === 'rejected' || (result.value.error && result.value.error.code !== '23505'));
        if (failures.length) throw new Error(`已保存 ${insertedTrades.length} 笔，另有 ${failures.length} 笔保存失败。请重新上传核对，已保存的记录会跳过。`);
      } else {
        throw new Error(error.message || '导入失败，请重试');
      }
    } else {
      setTrades(prev => [...(savedRows || []).map(formatTradeFromDB), ...prev]);
    }
  };


  const handleAddStrategy = async (strategy: Strategy) => {
    const { data, error } = await userDataService.saveStrategy(strategy);
    if (!error && data) {
      setStrategies(prev => {
        const next = [{ ...strategy, id: data.id }, ...prev];
        return next;
      });
    } else {
      // fallback: 用本地 id
      setStrategies(prev => {
        const next = [...prev, strategy];
        return next;
      });
    }
  };
  const handleUpdateStrategy = async (updated: Strategy) => {
    setStrategies(prev => prev.map(s => s.id === updated.id ? updated : s));
    await userDataService.updateStrategy(updated.id, updated);
  };
  const handleDeleteStrategy = async (id: string) => {
    setStrategies(prev => {
      const removed = prev.find(s => s.id === id);
      const next = prev.filter(s => s.id !== id);
      setTagCategories(current => {
        const normalized = normalizeTagCategories(current);
        if (!removed) return normalized;
        return normalized.map(category => ({
          ...category,
          options: category.options.filter(option => option !== removed.name),
        }));
      });
      return next;
    });
    await userDataService.deleteStrategy(id);
  };

  const handleSaveTagCategories = async (nextCategories: TagCategoryDefinition[]) => {
    const normalized = normalizeTagCategories(nextCategories);
    setTagCategories(normalized);
    await userDataService.saveTagCategories(normalized);
  };

  const handleSavePlan = async (plan: DailyPlan) => {
      const { data, error } = await userDataService.savePlan(plan, user.id);
      if (error || !data) throw new Error('笔记未能保存，请重试');
      const savedPlan = { ...plan, id: data.id };
      setPlans(prev => prev.some(p => p.id === plan.id) ? prev.map(p => p.id === plan.id ? savedPlan : p) : [savedPlan, ...prev]);
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
          await userDataService.savePlan(softDeleted, user.id);
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

    if (isDataLoading || dataLoadError) throw new Error(dataLoadError || '账户数据仍在加载，请稍候再连接。');
    const limit = user.tier === 'elite' ? Infinity : user.tier === 'pro' ? 3 : 1;
    if (tradingAccounts.filter(a => a.type !== 'demo').length >= limit) throw new Error('已达到当前方案的账户数量上限');

    // Validate credentials and fetch data before persisting anything or taking a slot.
    const { trades: importedTrades, balance, currency } = await fetchTradesFromExchange(
      connectingExchange.name, data.apiKey.trim(), data.apiSecret.trim(), undefined, undefined, data.startDate, data.skipSpot,
    );
    const { data: connData, error: connError } = await userDataService.saveExchangeConnection({
      exchange: connectingExchange.name, apiKey: data.apiKey.trim(), apiSecret: data.apiSecret.trim(),
      label: connectingExchange.name, accountType: 'main', skipSpot: data.skipSpot, startDate: data.startDate,
    }, user.id);
    if (connError || !connData) throw new Error('API 已验证，但连接未能保存，请重试。');

    const accountName = generateAccountName(connectingExchange.name);
    const { data: accountData, error: accountError } = await userDataService.saveTradingAccount({
      name: accountName, exchange: connectingExchange.name,
      brokerLogoUrl: connectingExchange.logoUrl, brokerBrandColor: connectingExchange.brandColor,
      balance, currency, profitMethod: 'FIFO', accountType: 'auto_sync', syncStatus: 'syncing', exchangeConnectionId: connData.id,
    }, user.id);
    if (accountError || !accountData) {
      await userDataService.deleteExchangeConnection(connData.id);
      throw new Error('账户未能创建，未占用账户名额，请重试。');
    }
    const localAccount: TradingAccount = {
      id: accountData.id, name: accountName, exchange: connectingExchange.name,
      brokerLogoUrl: connectingExchange.logoUrl, brokerBrandColor: connectingExchange.brandColor,
      balance, currency, profitMethod: 'FIFO', type: 'auto_sync', isReal: true, syncStatus: 'syncing', exchangeConnectionId: connData.id,
    };
    setTradingAccounts(previous => [...previous, localAccount]);
    setSelectedAccountId(accountData.id);
    let syncError = false;
    try {
      if (importedTrades.length) {
        const result = await userDataService.importTradesWithAccount(importedTrades.map(t => ({ ...t, date: t.entryDate })), accountData.id, user.id);
        if (result.error) throw result.error;
        setTrades(previous => [...(result.data || []).map(formatTradeFromDB), ...previous]);
      }
      const { error } = await userDataService.updateTradingAccount(accountData.id, { syncStatus: 'synced', lastSync: new Date().toISOString(), balance, currency });
      if (error) throw error;
      setTradingAccounts(previous => previous.map(a => a.id === accountData.id ? { ...a, syncStatus: 'synced', lastSync: new Date().toISOString() } : a));
    } catch {
      syncError = true;
      await userDataService.updateTradingAccount(accountData.id, { syncStatus: 'error' });
      setTradingAccounts(previous => previous.map(a => a.id === accountData.id ? { ...a, syncStatus: 'error' } : a));
    }
    setShowBrokerSync(false); setShowSelectImportMethod(false); setShowConnectExchange(false); setConnectingExchange(null);
    setSettingsInitialSection('brokers'); handleSetActiveTab('settings');
    setTimeout(() => setSettingsInitialSection(undefined), 200);
    showToast(syncError ? '账户已创建，但交易同步未完成。请在此账户点击「同步」，无需重新创建账户。' : `连接成功！已导入 ${importedTrades.length} 笔交易到 ${accountName}`);
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
                          isDataLoading={isDataLoading}
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
                          onNavigateToJournal={() => handleSetActiveTab('journal')}
                          onNavigateToPlans={() => handleSetActiveTab('plans')}
                          onResync={async (accountId) => {
                            // Reuse the same sync logic from SettingsPage
                            const account = tradingAccounts.find(a => a.id === accountId);
                            if (!account || !account.exchangeConnectionId) { showToast(language === 'cn' ? '该账户不支持自动同步' : 'This account does not support auto-sync'); return; }
                            const connections = await userDataService.loadExchangeConnections();
                            const conn = connections.find((c: any) => c.id === account.exchangeConnectionId);
                            if (!conn) { showToast(language === 'cn' ? '找不到 API 凭证，请重新连接' : 'API credentials not found'); return; }
                            showToast(language === 'cn' ? '正在同步...' : 'Syncing...');
                            try {
                              const { trades: newTrades, balance, currency } = await fetchTradesFromExchange(account.exchange ?? conn.exchange, conn.apiKey, conn.apiSecret, undefined, accountId, undefined);
                              const toKey = (symbol: string, date: string, entryPrice: number, quantity: number) => `${symbol}-${new Date(date).toISOString().slice(0, 16)}-${entryPrice}-${quantity}`;
                              const existingKeys = await userDataService.getAccountTradeKeys(accountId);
                              const uniqueTrades = newTrades.filter((t: any) => !existingKeys.has(toKey(t.symbol, t.entryDate, t.entryPrice, t.quantity)));
                              if (uniqueTrades.length > 0) await handleImportTrades(uniqueTrades.map((t: any) => ({ ...t, accountId })));
                              const now = new Date().toISOString();
                              await userDataService.updateTradingAccount(accountId, { syncStatus: 'synced', lastSync: now, balance, currency });
                              setTradingAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance, currency, syncStatus: 'synced', lastSync: now } : a));
                              showToast(language === 'cn' ? `同步完成，新增 ${uniqueTrades.length} 笔` : `Synced, ${uniqueTrades.length} new trades`);
                            } catch (e) { showToast(language === 'cn' ? '同步失败，请检查 API 凭证' : 'Sync failed'); }
                          }}
                          userProfile={{ level: 5, currentXp: 450, nextLevelXp: 1000, totalLifetimeXp: 4500 }} // Mock
                          disciplineHistory={disciplineHistory}
                          disciplineRules={disciplineRules}
                          onUpdateDisciplineRules={handleUpdateDisciplineRules}
                          onCheckDisciplineRule={handleCheckDisciplineRule}
                          tradingAccounts={tradingAccounts}
                          selectedAccountId={selectedAccountId}
                          onAccountChange={setSelectedAccountId}
                          onManageAccounts={() => { setSettingsInitialSection('brokers'); handleSetActiveTab('settings'); setTimeout(() => setSettingsInitialSection(undefined), 200); }}
                          onOpenTradeReview={(tradeId: string) => { setJournalReviewTradeId(tradeId); handleSetActiveTab('journal'); }}
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
                          onDeleteTrade={handleDeleteTrade} onBatchDeleteTrades={handleBatchDeleteTrades}
                          checklist={checklist}
                          onUpdateChecklist={handleUpdateChecklist}
                          onImportTrades={handleImportTrades}
                          onShare={(t) => handleShare({ type: 'trade', data: t })}
                          riskSettings={riskSettings}
                          feeTemplates={feeTemplates}
                          defaultAccountId={defaultTradingAccountId}
                          onCreateAccount={() => { setConnectingExchange(null); setShowManualAccount(true); }}
                          isDataLoading={isDataLoading}
                          dataLoadError={dataLoadError}
                          onRetryData={() => setDataLoadAttempt(attempt => attempt + 1)}
                          onViewRiskRules={() => handleSetActiveTab('psychology')}
                          onSavePlan={handleSavePlan}
                          autoOpen={journalAutoOpen}
                          onResetAutoOpen={() => journalAutoOpen && setJournalAutoOpen(false)}
                          initialReviewTradeId={journalReviewTradeId}
                          onResetReviewTradeId={() => journalReviewTradeId && setJournalReviewTradeId(null)}
                          strategies={strategies}
                          tagCategories={tagCategories}
                          onSaveTagCategories={handleSaveTagCategories}
                          onManageTags={() => {
                              setSettingsInitialSection('tags');
                              handleSetActiveTab('settings');
                              setTimeout(() => setSettingsInitialSection(undefined), 200);
                          }}
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
                          onDeleteTrade={handleDeleteTrade} onBatchDeleteTrades={handleBatchDeleteTrades}
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
                          trades={trades}
                          accountSize={riskSettings.accountSize}
                          plans={plans}
                          strategies={strategies}
                          tagCategories={tagCategories}
                          isDataLoading={isDataLoading}
                          onSavePlan={handleSavePlan}
                          onPushNotification={handlePushNotification}
                          disciplineHistory={disciplineHistory}
                          riskSettings={riskSettings}
                          tradingAccounts={tradingAccounts}
                          selectedAccountId={selectedAccountId}
                          onAccountChange={setSelectedAccountId}
                          onOpenTradeReview={(tradeId: string) => { setJournalReviewTradeId(tradeId); handleSetActiveTab('journal'); }}
                      />
                  </PageContainer>
              );
          case 'plans':
              return (
                  <div className="h-full overflow-hidden bg-white dark:bg-slate-900">
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
                tagCategories={tagCategories}
                onSaveTagCategories={handleSaveTagCategories}
                feeTemplates={feeTemplates}
                onSaveFeeTemplates={async templates => {
                  if (isDataLoading || dataLoadError) throw new Error(dataLoadError || '账户数据仍在加载');
                  await userDataService.saveFeeTemplates(templates, user.id);
                  setFeeTemplates(templates);
                }}
                defaultAccountId={defaultTradingAccountId}
                onSaveDefaultAccount={async id => {
                  if (isDataLoading || dataLoadError) throw new Error(dataLoadError || '账户数据仍在加载');
                  await userDataService.saveDefaultTradingAccount(id, user.id);
                  setDefaultTradingAccountId(id);
                }}
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
                    // 拉全量数据，不用lastSync做时间过滤
                    // 原因：用户可能手动删除了历史记录，增量同步无法补回
                    const { trades: newTrades, balance, currency } = await fetchTradesFromExchange(
                      account.exchange ?? conn.exchange,
                      conn.apiKey,
                      conn.apiSecret,
                      undefined,
                      id,
                      undefined,
                      conn.skipSpot,
                    );

                    // 去重：从数据库查询，用symbol+时间+开仓价+数量四元组，比单纯时间更可靠
                    const toKey = (symbol: string, date: string, entryPrice: number, quantity: number) =>
                      `${symbol}-${new Date(date).toISOString().slice(0, 16)}-${entryPrice}-${quantity}`;
                    const existingKeys = await userDataService.getAccountTradeKeys(id);
                    const dedupedTrades = newTrades.filter(t =>
                      !existingKeys.has(toKey(t.symbol, t.entryDate, t.entryPrice, t.quantity))
                    );

                    let actualInserted = 0;
                    if (dedupedTrades.length > 0) {
                      const result = await userDataService.importTradesWithAccount(
                        dedupedTrades.map(t => ({
                          date: t.entryDate, exitDate: t.exitDate, symbol: t.symbol,
                          direction: t.direction, entryPrice: t.entryPrice, exitPrice: t.exitPrice,
                          quantity: t.quantity, leverage: t.leverage, riskAmount: t.riskAmount,
                          fees: t.fees, pnl: t.pnl, setup: t.setup, notes: t.notes,
                          reviewNotes: t.reviewNotes, mistakes: t.mistakes,
                        })),
                        id, user.id
                      );
                      if (result.error) throw result.error;
                      if (result.data) {
                        actualInserted = result.data.length;
                        setTrades(prev => [...result.data!.map(formatTradeFromDB), ...prev]);
                      }
                    }

                    // 更新账户余额和同步时间
                    const now = new Date().toISOString();
                    const update = await userDataService.updateTradingAccount(id, { syncStatus: 'synced', lastSync: now, balance, currency });
                    if (update.error) throw update.error;
                    setTradingAccounts(prev => prev.map(a => a.id === id ? { ...a, balance, currency, syncStatus: 'synced', lastSync: now } : a));
                    showToast(actualInserted > 0 ? `同步完成，新增 ${actualInserted} 笔交易` : '同步完成，暂无新交易');
                  } catch (err: any) {
                    showToast(`同步失败：${err?.message ?? '请重试'}`);
                  }
                }}
                onUpdateAccount={async (id, updates) => {
                  const { error } = await userDataService.updateTradingAccount(id, updates);
                  if (error) throw new Error(typeof error === 'string' ? error : error.message);
                  setTradingAccounts(prev => prev.map(a => a.id === id
                    ? { ...a, ...updates, ...(updates.manualBalance !== undefined ? { manualBalance: updates.manualBalance ?? undefined } : {}) }
                    : a
                  ));
                }}
                onClearTrades={async (accountId) => {
                  await userDataService.clearAccountTrades(accountId);
                  // 同时清空 lastSync，确保下次同步能从头拉取所有历史数据
                  await userDataService.updateTradingAccount(accountId, { lastSync: null });
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
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
          <Sidebar 
              activeTab={activeTab} 
              setActiveTab={handleSetActiveTab}
              theme={theme}
              toggleTheme={toggleTheme}
              unreadNotificationsCount={notifications.filter(n => !n.isRead).length}
              isCollapsed={effectiveSidebarCollapsed}
              isRailOnly={isRailOnlySidebar}
              toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onAddTrade={() => { handleSetActiveTab('journal'); setJournalAutoOpen(true); }}
          />
          <main className={`min-w-0 flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-200 ${mainOffsetClass}`}>
              {dataLoadError && <div role="alert" className="m-4 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <span>{dataLoadError}</span><button onClick={() => setDataLoadAttempt(attempt => attempt + 1)} disabled={isDataLoading} className="shrink-0 font-semibold underline">{isDataLoading ? '加载中…' : '重新加载'}</button>
              </div>}
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
                          className={`w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 transform ${isFabOpen ? 'rotate-45 bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40' : 'hover:scale-110'}`}
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
          {/* <FriendListDrawer /> */}
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
                onCustomAccount={() => {
                  setConnectingExchange(null);
                  setShowConnectExchange(false);
                  setShowManualAccount(true);
                }}
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
                    setShowBrokerSync(true);
                    setShowSelectImportMethod(false);
                  } else if (method === 'file') {
                    csvCreatedAccountId.current = null;
                    setShowCsvImport(true);
                    setShowSelectImportMethod(false);
                  } else {
                    setShowSelectImportMethod(false);
                    setShowManualAccount(true);
                  }
                }}
              />
          )}
          {showManualAccount && (
            <AccountDetailsModal mode="create" showBroker
              initial={{ name: connectingExchange ? `${connectingExchange.name} 手动账户` : '我的交易账户', balance: 0, currency: 'USD', broker: connectingExchange?.name || '' }}
              onClose={() => setShowManualAccount(false)}
              onSave={async details => {
                if (isDataLoading || dataLoadError) throw new Error(dataLoadError || '账户数据仍在加载，请稍候再创建。');
                const limit = user.tier === 'elite' ? Infinity : user.tier === 'pro' ? 3 : 1;
                if (tradingAccounts.filter(a => a.type !== 'demo').length >= limit) throw new Error('已达到当前方案的账户数量上限');
                const sameBroker = details.broker === connectingExchange?.name;
                const { data, error } = await userDataService.saveTradingAccount({
                  name: details.name, balance: details.balance, currency: details.currency,
                  exchange: details.broker || undefined,
                  brokerLogoUrl: sameBroker ? connectingExchange?.logoUrl : undefined,
                  brokerBrandColor: sameBroker ? connectingExchange?.brandColor : undefined,
                  accountType: 'manual', profitMethod: 'FIFO', syncStatus: 'synced',
                }, user.id);
                if (error || !data) throw new Error('创建账户失败，请重试');
                // The insert already succeeded. Do not retry it just because a later list read fails.
                setTradingAccounts(previous => [...previous, { id: data.id, name: details.name, balance: details.balance, currency: details.currency, exchange: details.broker || undefined, type: 'manual', isReal: true, profitMethod: 'FIFO', syncStatus: 'synced' }]);
                setSelectedAccountId(data.id);
                setConnectingExchange(null);
                if (activeTab !== 'journal') {
                  setSettingsInitialSection('brokers');
                  handleSetActiveTab('settings');
                  setTimeout(() => setSettingsInitialSection(undefined), 200);
                }
                showToast('账户已创建，可在交易日志中添加交易');
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
          {showCsvImport && connectingExchange && (
              <CsvImportPage
                exchangeName={connectingExchange.name}
                exchangeLogoUrl={connectingExchange.logoUrl}
                exchangeBrandColor={connectingExchange.brandColor}
                onBack={() => { setShowCsvImport(false); setShowSelectImportMethod(true); }}
                onClose={() => setShowCsvImport(false)}
                onImportComplete={async (trades) => {
                  if (isDataLoading || dataLoadError) throw new Error(dataLoadError || '账户数据仍在加载');
                  let accountId = csvCreatedAccountId.current;
                  if (!accountId) {
                    const limit = user.tier === 'elite' ? Infinity : user.tier === 'pro' ? 3 : 1;
                    if (tradingAccounts.filter(a => a.type !== 'demo').length >= limit) throw new Error('当前方案账户数量已达上限，请从交易日志导入到已有账户。');
                    const accountName = `${connectingExchange.name}（文件导入）`;
                    const { data, error } = await userDataService.saveTradingAccount({
                      name: accountName, exchange: connectingExchange.name,
                      brokerLogoUrl: connectingExchange.logoUrl, brokerBrandColor: connectingExchange.brandColor,
                      balance: 0, currency: 'USD', profitMethod: 'FIFO', accountType: 'manual', syncStatus: 'synced',
                    }, user.id);
                    if (error || !data) throw new Error('创建导入账户失败，请重试');
                    accountId = data.id;
                    csvCreatedAccountId.current = accountId;
                    setTradingAccounts(previous => [...previous, { id: data.id, name: accountName, balance: 0, currency: 'USD', exchange: connectingExchange.name, type: 'manual', isReal: true, profitMethod: 'FIFO', syncStatus: 'synced' }]);
                    setSelectedAccountId(data.id);
                  }
                  await handleImportTrades(trades.map(t => ({ ...t, accountId: accountId! })));

                  setShowCsvImport(false);
                }}
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
  const { user } = useUser();
  const setActiveTabRef = React.useRef<(tab: string) => void>(() => {});
  const onSetActiveTabReady = React.useCallback((fn: (tab: string) => void) => {
    setActiveTabRef.current = fn;
  }, []);
  return (
    <TourProvider setActiveTab={(tab) => setActiveTabRef.current(tab)}>
      <MainAppInner key={user.id || 'signed-out'} onSetActiveTabReady={onSetActiveTabReady} />
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
