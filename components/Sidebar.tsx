
import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Calendar as CalendarIcon, Bot, TrendingUp, ShieldAlert, NotebookPen, Sun, Moon, Languages, BarChart2, Globe, CandlestickChart, GraduationCap, Map, Crown, ChevronRight, ChevronLeft, Settings, LogOut, User, Gift, Bell, CreditCard, MessageSquare, Calculator, Brain, Plus, BookText } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useTour } from './TourContext';
import { useUser } from './UserContext';
import { useSocial } from './SocialContext';
import { Logo } from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  unreadNotificationsCount?: number;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onAddTrade: () => void;
}

const Sidebar = ({ activeTab, setActiveTab, theme, toggleTheme, unreadNotificationsCount = 0, isCollapsed, toggleCollapse, onAddTrade }: SidebarProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { startTourForTab, onUserNavigateToTab } = useTour();
  const { user, openPricing, openProfile, openReferral, openSettings, logout } = useUser();
  const { openFriendDrawer, totalUnreadCount } = useSocial(); 
  
  // Menu State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'charts', label: t.sidebar.charts, icon: CandlestickChart, color: 'text-amber-500', tourId: 'chart-nav-item' }, 
    { id: 'journal', label: t.sidebar.journal, icon: BookOpen, color: 'text-emerald-500' },
    { id: 'playbook', label: t.sidebar.playbook, icon: BookText, color: 'text-cyan-500' }, // NEW ITEM
    { id: 'reports', label: t.sidebar.reports, icon: BarChart2, color: 'text-pink-500' },
    { id: 'plans', label: t.sidebar.plans, icon: NotebookPen, color: 'text-purple-500' },
    { id: 'psychology', label: t.sidebar.psychology, icon: Brain, color: 'text-rose-500' }, 
    { id: 'calendar', label: t.sidebar.calendar, icon: CalendarIcon, color: 'text-orange-500' },
    { id: 'plaza', label: t.sidebar.plaza, icon: Globe, color: 'text-sky-500' },
    { id: 'academy', label: t.sidebar.academy, icon: GraduationCap, color: 'text-yellow-500' },
    { id: 'notifications', label: t.sidebar.notifications, icon: Bell, color: 'text-rose-500' }, 
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'cn' ? 'en' : 'cn');
  };

  const getTierLabel = () => {
      switch(user.tier) {
          case 'pro': return t.sidebar.tierPro;
          case 'elite': return t.sidebar.tierElite;
          default: return t.sidebar.tierFree;
      }
  };

  const getTierColor = () => {
      switch(user.tier) {
          case 'pro': return 'bg-indigo-500 text-white';
          case 'elite': return 'bg-amber-500 text-white';
          default: return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
      }
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setIsProfileMenuOpen(false);
          }
      };
      if (isProfileMenuOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isProfileMenuOpen]);

  return (
    <div id="sidebar-nav" className={`bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/50 flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-20 md:w-64'}`}>
      
      {/* Circular Collapse Button on the Edge */}
      <button 
          onClick={toggleCollapse}
          className="absolute -right-3 top-9 z-50 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden md:flex items-center justify-center group"
          title={isCollapsed ? "Expand" : "Collapse"}
      >
          {isCollapsed ? <ChevronRight size={14} className="group-hover:scale-110 transition-transform" /> : <ChevronLeft size={14} className="group-hover:scale-110 transition-transform" />}
      </button>

      {/* Header */}
      <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-6'} relative`}>
        <div className="flex items-center gap-3">
             <div className={`${isCollapsed ? 'block' : 'md:hidden'}`}>
                <Logo showText={false} iconClassName="w-10 h-10" />
             </div>
             <div className={`${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
                <Logo iconClassName="w-8 h-8" textClassName="mt-1" showText={true} />
                <div className="flex items-center gap-1.5 mt-1 ml-11">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono text-slate-400 font-medium uppercase tracking-wider">内测版 v1.2</span>
                </div>
             </div>
        </div>
      </div>

      {/* Add Trade Button */}
      <div className="px-3 mb-2">
          <button 
              onClick={onAddTrade}
              className={`w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isCollapsed ? 'px-0' : 'px-4'}`}
              title={isCollapsed ? t.journal.addTrade : undefined}
          >
              <Plus className="w-5 h-5" />
              {!isCollapsed && <span>{t.journal.addTrade}</span>}
          </button>
      </div>
      
      {/* Navigation Tabs */}
      <nav className="flex-1 py-2 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={item.tourId} 
              onClick={() => { setActiveTab(item.id); onUserNavigateToTab(item.id); }}
              className={`relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-4'} py-3 transition-all duration-300 group rounded-xl outline-none
                ${isActive 
                  ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200'
                }
              `}
              title={isCollapsed ? item.label : undefined}
            >
              {/* Active Glow Indicator */}
              {isActive && (
                   <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]`}></div>
              )}

              <div className={`relative transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} transition-colors`} />
                  
                  {/* Notification Badge on Icon (Collapsed View) */}
                  {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                      <div className={`absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center animate-pulse ${isCollapsed ? 'flex' : 'hidden'}`}>
                         <span className="text-white text-[8px] font-black">{unreadNotificationsCount}</span>
                      </div>
                  )}
              </div>
              
              {!isCollapsed && (
                  <span className={`ml-3 font-medium text-sm hidden md:block transition-all ${isActive ? 'font-semibold tracking-wide' : ''}`}>
                      {item.label}
                  </span>
              )}

              {/* Notification Badge (Expanded View - Perfect Circle Fix) */}
              {item.id === 'notifications' && unreadNotificationsCount > 0 && !isCollapsed && (
                  <div className="hidden md:flex ml-auto w-5 h-5 items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                      {unreadNotificationsCount}
                  </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Settings */}
      <div className="p-4 mx-2 mb-4 space-y-2">
        
        {/* Friends Trigger */}
        <button 
            onClick={openFriendDrawer}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-4'} py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm group relative`}
            title={isCollapsed ? t.social.friends : undefined}
        >
            <div className="relative">
                <MessageSquare className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                {totalUnreadCount > 0 && (
                    <div className={`absolute -top-2 -right-2 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white dark:border-slate-900 animate-pulse ${!isCollapsed ? 'md:hidden' : ''}`}>
                        {totalUnreadCount}
                    </div>
                )}
            </div>
            {!isCollapsed && <span className="ml-3 font-bold text-xs hidden md:block">{t.social.friends}</span>}
            
            {/* Desktop Badge - Perfect Circle Fix */}
            {totalUnreadCount > 0 && !isCollapsed && (
                <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-md">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </div>
            )}
        </button>

        {/* UPGRADE CARD */}
        {user.tier === 'free' && !isCollapsed && (
            <div className="hidden md:block bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 mb-2 text-white relative overflow-hidden group cursor-pointer" onClick={openPricing}>
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                    <Crown className="w-12 h-12 text-yellow-400" />
                </div>
                <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">PRO PLAN</p>
                <p className="text-sm font-medium mb-3 opacity-90">{t.sidebar.upgrade}</p>
                <button className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">
                    {t.pricing.upgrade}
                </button>
            </div>
        )}
        {/* Minimized Upgrade Icon */}
        {user.tier === 'free' && isCollapsed && (
             <button onClick={openPricing} className="hidden md:flex w-full items-center justify-center p-2.5 bg-slate-900 text-yellow-400 rounded-xl hover:bg-slate-800 transition-colors" title={t.pricing.upgrade}>
                 <Crown className="w-5 h-5" />
             </button>
        )}

        <div className={`bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50 ${isCollapsed ? 'space-y-2' : ''}`}>
             {/* Guide Mode Toggle */}
             <button
              onClick={() => startTourForTab(activeTab)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-between'} p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all ${!isCollapsed ? 'mb-1' : ''}`}
              title={isCollapsed ? t.sidebar.guide : undefined}
            >
               <div className="flex items-center">
                   <Map className="w-4 h-4 text-emerald-500" />
                   {!isCollapsed && (
                       <span className="ml-2 text-xs font-medium hidden md:block">
                         {t.sidebar.guide}
                       </span>
                   )}
               </div>
            </button>

             {/* Feedback */}
            <a
              href="https://tally.so/r/7RZGA2"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-between'} p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all ${!isCollapsed ? 'mb-1' : ''}`}
              title={isCollapsed ? (language === 'cn' ? '用户反馈' : 'Feedback') : undefined}
            >
               <div className="flex items-center">
                   <MessageSquare className="w-4 h-4 text-indigo-500" />
                   {!isCollapsed && (
                       <span className="ml-2 text-xs font-medium hidden md:block">
                         {language === 'cn' ? '用户反馈' : 'Feedback'}
                       </span>
                   )}
               </div>
            </a>

             {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-between'} p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all ${!isCollapsed ? 'mb-1' : ''}`}
              title={isCollapsed ? (language === 'cn' ? 'Language' : '语言') : undefined}
            >
               <div className="flex items-center">
                   <Languages className="w-4 h-4" />
                   {!isCollapsed && (
                       <span className="ml-2 text-xs font-medium hidden md:block">
                         {language === 'cn' ? 'Language' : '语言'}
                       </span>
                   )}
               </div>
               {!isCollapsed && <span className="text-[10px] font-bold font-mono bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded hidden md:block">{language.toUpperCase()}</span>}
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-between'} p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all`}
              title={isCollapsed ? (theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode) : undefined}
            >
               <div className="flex items-center">
                   {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                   {!isCollapsed && (
                       <span className="ml-2 text-xs font-medium hidden md:block">
                         {theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode}
                       </span>
                   )}
               </div>
            </button>
        </div>

        {/* User Profile Trigger & Menu */}
        <div className="relative" ref={menuRef}>
            {/* Pop-up Menu */}
            {isProfileMenuOpen && (
                <div className="absolute bottom-[110%] left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in-up origin-bottom-left">
                    <div className="p-1 space-y-0.5">
                        <button 
                            onClick={() => { setIsProfileMenuOpen(false); openPricing(); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-bold transition-colors"
                        >
                            {language === 'cn' ? '探索我们的方案' : 'Explore our plans'}
                        </button>
                        
                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1"></div>

                        <button 
                            onClick={() => { setIsProfileMenuOpen(false); openProfile(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                        >
                            <User className="w-4 h-4 text-slate-400" />
                            {language === 'cn' ? '您的个人资料' : 'Profile'}
                        </button>

                        <button 
                            onClick={() => { setIsProfileMenuOpen(false); openSettings(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                        >
                            <Settings className="w-4 h-4 text-slate-400" />
                            {language === 'cn' ? '设置和账单' : 'Settings and Billing'}
                        </button>

                        <button 
                            onClick={() => { setIsProfileMenuOpen(false); openReferral(); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Gift className="w-4 h-4 text-slate-400" />
                                <span>{language === 'cn' ? '推荐朋友' : 'Refer a friend'}</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-bold">$15</span>
                        </button>

                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1"></div>

                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/10 text-rose-500 text-sm font-medium transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            {language === 'cn' ? '退出' : 'Sign out'}
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Bar Trigger */}
            <div 
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start'} p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative z-50`}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title={isCollapsed ? user.name : undefined}
            >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        user.name.slice(0, 2).toUpperCase()
                    )}
                </div>
                {!isCollapsed && (
                    <>
                        <div className="ml-3 hidden md:block overflow-hidden flex-1">
                            <p className="text-sm font-bold truncate text-slate-800 dark:text-white">{user.name}</p>
                            <div className="flex items-center gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getTierColor()}`}>
                                    {getTierLabel()}
                                </span>
                            </div>
                        </div>
                        <div className="hidden md:block ml-2 text-slate-400">
                            <ChevronRight className={`w-4 h-4 transition-transform ${isProfileMenuOpen ? '-rotate-90' : ''}`} />
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
