
import React, { useState, useRef, useEffect } from 'react';
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

// Filled SVG icons — no AI-feel, matches TradeZilla's solid icon style
const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M2 10a8 8 0 1116 0A8 8 0 012 10zm8-3a1 1 0 00-1 1v2H7a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2V8a1 1 0 00-1-1z" />
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm13 0a1 1 0 00-1-1h-4a1 1 0 000 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 002 0V4z" clipRule="evenodd" />
    </svg>
  ),
  Chart: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  Journal: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  ),
  Playbook: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  Reports: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
    </svg>
  ),
  Plans: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  ),
  Psychology: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ),
  Plaza: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
    </svg>
  ),
  Academy: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
  Message: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
    </svg>
  ),
  Crown: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M10 1l2.928 5.618L19 7.618l-4.5 4.382 1.072 6.25L10 15.118l-5.572 3.132L5.5 12 1 7.618l6.072-1L10 1z" clipRule="evenodd" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  Gift: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
      <path d="M9 11H3v5a2 2 0 002 2h4v-7zm2 7h4a2 2 0 002-2v-5h-6v7z" />
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
    </svg>
  ),
  Languages: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
      <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-3.754 1 1 0 111.94-.485c.261.104.52.198.78.284A17.502 17.502 0 007.478 6H4a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.992a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.99A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" />
    </svg>
  ),
};

const Sidebar = ({ activeTab, setActiveTab, theme, toggleTheme, unreadNotificationsCount = 0, isCollapsed, toggleCollapse, onAddTrade }: SidebarProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { startTourForTab, onUserNavigateToTab } = useTour();
  const { user, openPricing, openProfile, openReferral, openSettings, logout } = useUser();
  const { openFriendDrawer, totalUnreadCount } = useSocial();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: Icons.Dashboard, tourId: undefined },
    { id: 'charts',    label: t.sidebar.charts,    icon: Icons.Chart,     tourId: 'chart-nav-item' },
    { id: 'journal',   label: t.sidebar.journal,   icon: Icons.Journal,   tourId: undefined },
    { id: 'playbook',  label: t.sidebar.playbook,  icon: Icons.Playbook,  tourId: undefined },
    { id: 'reports',   label: t.sidebar.reports,   icon: Icons.Reports,   tourId: undefined },
    { id: 'plans',     label: t.sidebar.plans,     icon: Icons.Plans,     tourId: undefined },
    { id: 'psychology',label: t.sidebar.psychology,icon: Icons.Psychology,tourId: undefined },
    { id: 'calendar',  label: t.sidebar.calendar,  icon: Icons.Calendar,  tourId: undefined },
    { id: 'plaza',     label: t.sidebar.plaza,     icon: Icons.Plaza,     tourId: undefined },
    { id: 'academy',   label: t.sidebar.academy,   icon: Icons.Academy,   tourId: undefined },
    { id: 'notifications', label: t.sidebar.notifications, icon: Icons.Bell, tourId: undefined },
  ];

  const toggleLanguage = () => setLanguage(language === 'cn' ? 'en' : 'cn');

  const getTierLabel = () => {
    if (user.tier === 'elite') return 'Elite';
    if (user.tier === 'pro') return 'Pro';
    return language === 'cn' ? '免费版' : 'Free';
  };

  const getTierColor = () => {
    if (user.tier === 'elite') return 'bg-amber-500/20 text-amber-400';
    if (user.tier === 'pro') return 'bg-indigo-500/20 text-indigo-400';
    return 'bg-white/10 text-white/40';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  return (
    <div
      id="sidebar-nav"
      className={`bg-[#111318] flex flex-col h-screen fixed left-0 top-0 transition-all duration-200 z-50 border-r border-white/[0.06] ${isCollapsed ? 'w-[60px]' : 'w-[60px] md:w-[220px]'}`}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-8 z-50 w-6 h-6 bg-[#1c1f26] border border-white/10 rounded-full text-white/30 hover:text-white/70 transition-colors hidden md:flex items-center justify-center"
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
      </button>

      {/* Logo */}
      <div className={`h-[56px] flex items-center shrink-0 ${isCollapsed ? 'justify-center px-0' : 'justify-center md:justify-start md:px-5'}`}>
        {isCollapsed ? (
          <Logo showText={false} iconClassName="w-7 h-7" />
        ) : (
          <div className="hidden md:flex items-center gap-2.5">
            <Logo showText={false} iconClassName="w-7 h-7" />
            <span className="text-white font-bold text-[15px] tracking-wide">TradeGrail</span>
          </div>
        )}
        <div className={`${isCollapsed ? 'block' : 'md:hidden'}`}>
          <Logo showText={false} iconClassName="w-7 h-7" />
        </div>
      </div>

      {/* Add Trade */}
      <div className={`px-3 mb-3 shrink-0`}>
        <button
          onClick={onAddTrade}
          title={isCollapsed ? t.journal.addTrade : undefined}
          className={`w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-md font-semibold text-[13px] transition-colors ${isCollapsed ? 'py-2.5' : 'py-2.5 md:px-3'}`}
        >
          <Icons.Plus />
          {!isCollapsed && <span className="hidden md:block">{t.journal.addTrade}</span>}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={item.tourId}
              onClick={() => { setActiveTab(item.id); onUserNavigateToTab(item.id); }}
              title={isCollapsed ? item.label : undefined}
              className={`relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-3'} py-2.5 rounded-md transition-colors group outline-none
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                }`}
            >
              {/* Active left bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
              )}

              <Icon />

              {!isCollapsed && (
                <span className={`ml-2.5 text-[13px] font-medium hidden md:block leading-none ${isActive ? 'text-white' : ''}`}>
                  {item.label}
                </span>
              )}

              {/* Notification badge */}
              {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                <span className={`${isCollapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto hidden md:flex'} min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full items-center justify-center flex`}>
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-white/[0.06] shrink-0" />

      {/* Bottom utilities */}
      <div className="px-2 py-2 space-y-0.5 shrink-0">

        {/* Friends */}
        <button
          onClick={openFriendDrawer}
          title={isCollapsed ? t.social.friends : undefined}
          className={`relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-3'} py-2.5 rounded-md text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors`}
        >
          <Icons.Message />
          {!isCollapsed && <span className="ml-2.5 text-[13px] font-medium hidden md:block">{t.social.friends}</span>}
          {totalUnreadCount > 0 && (
            <span className={`${isCollapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto hidden md:flex'} min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full items-center justify-center flex`}>
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>

        {/* Guide */}
        <button
          onClick={() => startTourForTab(activeTab)}
          title={isCollapsed ? t.sidebar.guide : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-3'} py-2.5 rounded-md text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors`}
        >
          <Icons.Map />
          {!isCollapsed && <span className="ml-2.5 text-[13px] font-medium hidden md:block">{t.sidebar.guide}</span>}
        </button>

        {/* Language */}
        <button
          onClick={toggleLanguage}
          title={isCollapsed ? (language === 'cn' ? 'Language' : '语言') : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-3'} py-2.5 rounded-md text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors`}
        >
          <Icons.Languages />
          {!isCollapsed && (
            <span className="ml-2.5 text-[13px] font-medium hidden md:block flex-1 text-left">
              {language === 'cn' ? 'Language' : '语言'}
            </span>
          )}
          {!isCollapsed && (
            <span className="hidden md:block text-[10px] font-bold font-mono bg-white/10 text-white/50 px-1.5 py-0.5 rounded">
              {language.toUpperCase()}
            </span>
          )}
        </button>

        {/* Theme */}
        <button
          onClick={toggleTheme}
          title={isCollapsed ? (theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode) : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-3'} py-2.5 rounded-md text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors`}
        >
          {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          {!isCollapsed && (
            <span className="ml-2.5 text-[13px] font-medium hidden md:block">
              {theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode}
            </span>
          )}
        </button>

        {/* Upgrade (free tier only) */}
        {user.tier === 'free' && (
          <button
            onClick={openPricing}
            title={isCollapsed ? (language === 'cn' ? '升级' : 'Upgrade') : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-3'} py-2.5 rounded-md text-amber-400/70 hover:bg-white/5 hover:text-amber-400 transition-colors`}
          >
            <Icons.Crown />
            {!isCollapsed && <span className="ml-2.5 text-[13px] font-medium hidden md:block">{language === 'cn' ? '升级 Pro' : 'Upgrade'}</span>}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-white/[0.06] shrink-0" />

      {/* User profile */}
      <div className="px-2 py-3 shrink-0 relative" ref={menuRef}>
        {/* Pop-up menu */}
        {isProfileMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-2 w-56 bg-[#1c1f26] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-[60]">
            <div className="p-1 space-y-0.5">
              <button
                onClick={() => { setIsProfileMenuOpen(false); openPricing(); }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 text-indigo-400 text-[13px] font-semibold rounded-md transition-colors"
              >
                {language === 'cn' ? '探索我们的方案' : 'Explore plans'}
              </button>
              <div className="h-px bg-white/[0.06] mx-1 my-1" />
              <button
                onClick={() => { setIsProfileMenuOpen(false); openProfile(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-white/60 hover:text-white text-[13px] rounded-md transition-colors"
              >
                <Icons.User />
                {language === 'cn' ? '个人资料' : 'Profile'}
              </button>
              <button
                onClick={() => { setIsProfileMenuOpen(false); openSettings(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-white/60 hover:text-white text-[13px] rounded-md transition-colors"
              >
                <Icons.Settings />
                {language === 'cn' ? '设置与账单' : 'Settings & Billing'}
              </button>
              <button
                onClick={() => { setIsProfileMenuOpen(false); openReferral(); }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 text-white/60 hover:text-white text-[13px] rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icons.Gift />
                  <span>{language === 'cn' ? '推荐朋友' : 'Refer a friend'}</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold">$15</span>
              </button>
              <div className="h-px bg-white/[0.06] mx-1 my-1" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/10 text-rose-400 text-[13px] rounded-md transition-colors"
              >
                <Icons.LogOut />
                {language === 'cn' ? '退出' : 'Sign out'}
              </button>
            </div>
          </div>
        )}

        {/* Profile trigger */}
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          title={isCollapsed ? user.name : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-2'} gap-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors`}
        >
          <div className="w-7 h-7 rounded-md bg-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400 overflow-hidden shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.slice(0, 2).toUpperCase()
            )}
          </div>
          {!isCollapsed && (
            <div className="hidden md:flex flex-col items-start flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-white/80 truncate w-full leading-tight">{user.name}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${getTierColor()}`}>
                {getTierLabel()}
              </span>
            </div>
          )}
          {!isCollapsed && (
            <span className="hidden md:block text-white/20 ml-auto">
              <Icons.ChevronRight />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
