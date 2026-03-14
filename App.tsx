import React, { useState, useEffect } from 'react';
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
import PricingModal from './components/PricingModal';
import AuthPage from './components/AuthPage';
import UserProfileModal from './components/UserProfileModal';
import ReferralModal from './components/ReferralModal';
import ChatAssistant from './components/ChatAssistant';
import ChatWindow from './components/ChatWindow';
import FriendListDrawer from './components/FriendListDrawer';
import TourOverlay from './components/TourOverlay';
import ChartPage from './components/ChartPage';
import LeaderboardPage from './components/LeaderboardPage';
import TradeShareModal from './components/TradeShareModal';

import { UserProvider, useUser } from './components/UserContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { TourProvider } from './components/TourContext';
import { SocialProvider } from './components/SocialContext';
import { supabase } from './supabaseClient';
import { Plus, MessageSquare, FileText, BookOpen, Globe, HelpCircle, TrendingUp, X } from 'lucide-react';

import { 
  MOCK_STRATEGIES, MOCK_PRE_TRADE_CHECKLIST, 
  DEFAULT_TRACKER_RULES, MOCK_POSTS, MOCK_NOTIFICATIONS, 
  DEFAULT_DISCIPLINE_RULES 
} from './constants';
import { 
  Trade, Strategy, ChecklistItem, RiskSettings, DailyPlan, 
  TrackerRule, Post, Notification, ShareIntent, DisciplineRule, 
  DailyDisciplineRecord, WeeklyGoal, TradeStatus, Direction
} from './types';

// PageContainer updated to reduce side margins and increase max width for a wider view
const PageContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="py-6 px-4 md:py-8 md:px-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-[1600px] mx-auto h-full">
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

// Wrapper to use context
const MainApp: React.FC = () => {
  const { isAuthenticated, openProfile } = useUser();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Data State with Persistence - 使用空数组，从 Supabase 加载
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useStickyState<Strategy[]>(MOCK_STRATEGIES, 'tg_strategies');
  const [checklist, setChecklist] = useStickyState<ChecklistItem[]>(MOCK_PRE_TRADE_CHECKLIST, 'tg_checklist');
  const [trackerRules, setTrackerRules] = useStickyState<TrackerRule[]>(DEFAULT_TRACKER_RULES, 'tg_trackerRules');
  const [plans, setPlans] = useStickyState<DailyPlan[]>([], 'tg_plans');
  const [posts, setPosts] = useStickyState<Post[]>(MOCK_POSTS, 'tg_posts');
  const [notifications, setNotifications] = useStickyState<Notification[]>(MOCK_NOTIFICATIONS, 'tg_notifications');

  // Discipline & Goals Persistence
  const [disciplineRules, setDisciplineRules] = useStickyState<DisciplineRule[]>(DEFAULT_DISCIPLINE_RULES, 'tg_disciplineRules');
  const [disciplineHistory, setDisciplineHistory] = useStickyState<DailyDisciplineRecord[]>([], 'tg_disciplineHistory');
  const [weeklyGoal, setWeeklyGoal] = useStickyState<WeeklyGoal>({ type: 'amount', value: 1000, isActive: true }, 'tg_weeklyGoal');

  // Risk Settings Persistence
  const [riskSettings, setRiskSettings] = useStickyState<RiskSettings>({
    accountSize: 10000,
    maxDailyLoss: 500,
    maxTradeRisk: 100,
    maxConsecutiveLosses: 3,
    maxOpenPositions: 2
  }, 'tg_riskSettings');

  // 从 Supabase 加载用户交易数据
  useEffect(() => {
    const loadTrades = async () => {
      if (!isAuthenticated) return;

      setIsDataLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        const { data, error } = await supabase
          .from('trading_journals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading trades:', error);
          return;
        }

        // 转换数据格式
        const formattedTrades = (data || []).map((trade: any) => ({
          id: trade.id,
          entryDate: trade.date,
          exitDate: trade.date,
          symbol: trade.symbol,
          direction: trade.direction as 'long' | 'short',
          entryPrice: trade.entry_price,
          exitPrice: trade.exit_price || 0,
          quantity: 1,
          status: trade.exit_price ? 'closed' as const : 'open' as const,
          pnl: trade.pnl || 0,
          setup: trade.setup || '',
          notes: trade.notes || '',
          fees: 0
        }));

        setTrades(formattedTrades);
      } catch (error) {
        console.error('Error loading trades:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadTrades();
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
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handlers
  // 保存交易到 Supabase
  const handleAddTrade = async (trade: Trade) => {
    if (!currentUserId) return;

    // 计算 pnl_percent
    const pnlPercent = trade.entryPrice > 0 ? (trade.pnl / (trade.entryPrice * trade.quantity)) * 100 : 0;

    const { data, error } = await supabase.from('trading_journals').insert({
      user_id: currentUserId,
      date: trade.entryDate,
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      pnl: trade.pnl,
      pnl_percent: pnlPercent,
      setup: trade.setup,
      notes: trade.notes
    }).select().single();

    if (!error && data) {
      setTrades([{ ...trade, id: data.id }, ...trades]);
    }
  };

  // 更新交易到 Supabase
  const handleUpdateTrade = async (updated: Trade) => {
    if (!currentUserId) return;

    const pnlPercent = updated.entryPrice > 0 ? (updated.pnl / (updated.entryPrice * updated.quantity)) * 100 : 0;

    const { error } = await supabase.from('trading_journals').update({
      date: updated.entryDate,
      symbol: updated.symbol,
      direction: updated.direction,
      entry_price: updated.entryPrice,
      exit_price: updated.exitPrice,
      pnl: updated.pnl,
      pnl_percent: pnlPercent,
      setup: updated.setup,
      notes: updated.notes
    }).eq('id', updated.id).eq('user_id', currentUserId);

    if (!error) {
      setTrades(trades.map(t => t.id === updated.id ? updated : t));
    }
  };

  // 删除交易从 Supabase
  const handleDeleteTrade = async (id: string) => {
    if (!currentUserId) return;

    const { error } = await supabase.from('trading_journals').delete().eq('id', id).eq('user_id', currentUserId);

    if (!error) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  // 导入交易到 Supabase
  const handleImportTrades = async (imported: Trade[]) => {
    if (!currentUserId) return;

    const data = imported.map(trade => {
      const pnlPercent = trade.entryPrice > 0 ? (trade.pnl / (trade.entryPrice * trade.quantity)) * 100 : 0;
      return {
        user_id: currentUserId,
        date: trade.entryDate,
        symbol: trade.symbol,
        direction: trade.direction,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        pnl: trade.pnl,
        pnl_percent: pnlPercent,
        setup: trade.setup,
        notes: trade.notes
      };
    });

    const { error } = await supabase.from('trading_journals').insert(data);

    if (!error) {
      setTrades([...imported, ...trades]);
    }
  };

  const handleAddStrategy = (strategy: Strategy) => setStrategies([...strategies, strategy]);
  const handleUpdateStrategy = (updated: Strategy) => setStrategies(strategies.map(s => s.id === updated.id ? updated : s));
  const handleDeleteStrategy = (id: string) => setStrategies(strategies.filter(s => s.id !== id));

  const handleSavePlan = (plan: DailyPlan) => {
      setPlans(prev => {
          const exists = prev.find(p => p.id === plan.id);
          if (exists) return prev.map(p => p.id === plan.id ? plan : p);
          return [plan, ...prev];
      });
  };
  
  const handleDeletePlan = (id: string) => {
      setPlans(prev => {
          const plan = prev.find(p => p.id === id);
          if (!plan) return prev;
          if (plan.isDeleted) {
              return prev.filter(p => p.id !== id);
          }
          return prev.map(p => p.id === id ? { ...p, isDeleted: true } : p);
      });
  };

  const onClearShareIntent = () => setShareIntent(null);

  const handleShare = (intent: ShareIntent) => {
      setShareIntent(intent);
      if (intent.type === 'trade') {
          setIsShareModalOpen(true);
      } else {
          setActiveTab('plaza');
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
              setActiveTab('journal');
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
              setActiveTab('plans');
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
              setActiveTab('playbook');
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
              setActiveTab('plaza');
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
                          onUpdateTrackerRules={setTrackerRules}
                          plans={plans}
                          onSavePlan={handleSavePlan}
                          onQuickAddTrade={() => { setActiveTab('journal'); setJournalAutoOpen(true); }}
                          weeklyGoal={weeklyGoal}
                          onSetWeeklyGoal={setWeeklyGoal}
                          onViewGoals={() => {/* Navigate to goals detail if needed */}}
                          onViewLeaderboard={() => setActiveTab('leaderboard')}
                          userProfile={{ level: 5, currentXp: 450, nextLevelXp: 1000, totalLifetimeXp: 4500 }} // Mock
                          disciplineHistory={disciplineHistory}
                          disciplineRules={disciplineRules}
                          onUpdateDisciplineRules={setDisciplineRules}
                          onCheckDisciplineRule={(ruleId, isChecked) => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              const todayRecord = disciplineHistory.find(r => r.date === todayStr);
                              let newHistory = [...disciplineHistory];
                              if (todayRecord) {
                                  const newCompletedIds = isChecked 
                                      ? [...todayRecord.completedRuleIds, ruleId]
                                      : todayRecord.completedRuleIds.filter(id => id !== ruleId);
                                  newHistory = newHistory.map(r => r.date === todayStr ? { ...r, completedRuleIds: newCompletedIds } : r);
                              } else {
                                  if (isChecked) {
                                      newHistory.push({
                                          date: todayStr,
                                          completedRuleIds: [ruleId],
                                          totalPossibleXp: disciplineRules.length * 10,
                                          earnedXp: 10,
                                          isSuccess: true
                                      });
                                  }
                              }
                              setDisciplineHistory(newHistory);
                          }}
                      />
                  </PageContainer>
              );
          case 'leaderboard':
              return (
                  <LeaderboardPage onBack={() => setActiveTab('dashboard')} />
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
                          onUpdateChecklist={setChecklist}
                          onImportTrades={handleImportTrades}
                          onShare={(t) => handleShare({ type: 'trade', data: t })}
                          riskSettings={riskSettings}
                          onSavePlan={handleSavePlan}
                          autoOpen={journalAutoOpen}
                          onResetAutoOpen={() => journalAutoOpen && setJournalAutoOpen(false)}
                          strategies={strategies}
                          onNavigateToNote={(id) => {
                              setNoteSelectionIntent(id);
                              setActiveTab('plans');
                          }}
                          onCreateNoteIntent={(date, tradeIds) => {
                              setNoteCreationIntent({ date, linkedTradeIds: tradeIds });
                              setActiveTab('plans');
                          }}
                      />
                  </PageContainer>
              );
          case 'playbook':
              return (
                  <div className="h-full overflow-hidden">
                      <PlaybookPage 
                          strategies={strategies}
                          trades={trades}
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
                          onNavigateToNotebook={() => setActiveTab('plans')}
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
                          onSavePlan={handleSavePlan}
                          onPushNotification={(n) => setNotifications([n, ...notifications])}
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
                          onSaveStrategies={setStrategies}
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
                          onSaveSettings={setRiskSettings}
                          rules={[]} 
                          onToggleRule={() => {}}
                          onAddRule={() => {}}
                          onDeleteRule={() => {}}
                          reviewStatus={reviewStatus}
                          onUpdateReview={() => {}}
                      />
                  </PageContainer>
              );
          case 'calendar':
              return (
                  <PageContainer>
                      <CalendarView 
                          trades={trades} 
                          plans={plans}
                          onSavePlan={handleSavePlan}
                      />
                  </PageContainer>
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
                          onMarkAllRead={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))}
                          onMarkOneRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))}
                      />
                  </PageContainer>
              );
          default:
              return <div className="p-10 text-center">404 - Module Not Found</div>;
      }
  };

  return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:white font-sans transition-colors duration-300">
          <Sidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              theme={theme}
              toggleTheme={toggleTheme}
              unreadNotificationsCount={notifications.filter(n => !n.isRead).length}
              isCollapsed={isSidebarCollapsed}
              toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onAddTrade={() => { setActiveTab('journal'); setJournalAutoOpen(true); }}
          />
          <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-0 md:ml-64'}`}>
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
                              className="w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-700 transition-all hover:scale-110 animate-fade-in"
                              title={t.fab?.chat || "AI Chat"}
                          >
                              <MessageSquare className="w-5 h-5" />
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
              onViewTrade={(id) => { setActiveTab('journal'); }}
          />
          <ChatWindow />
          <FriendListDrawer />
          <SettingsModal onImportTrades={handleImportTrades} />
          <PricingModal />
          <UserProfileModal />
          <ReferralModal />
          <TourOverlay />
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
      </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <UserProvider>
        <SocialProvider>
          <TourProvider setActiveTab={(_: string) => {}}>
             <MainApp />
          </TourProvider>
        </SocialProvider>
      </UserProvider>
    </LanguageProvider>
  );
};

export default App;