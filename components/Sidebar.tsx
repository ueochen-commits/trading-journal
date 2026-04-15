
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { useTour } from './TourContext';
import { useUser } from './UserContext';
import { useSocial } from './SocialContext';

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

const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Chart: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M2 13h2V8H2v5zm4 0h2V5H6v8zm4 0h2V2h-2v11zm4 0h2v-4h-2v4z"/>
    </svg>
  ),
  Journal: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
    </svg>
  ),
  Playbook: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
    </svg>
  ),
  Reports: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd"/>
    </svg>
  ),
  Plans: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
    </svg>
  ),
  Psychology: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
    </svg>
  ),
  Plaza: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/>
    </svg>
  ),
  Academy: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
    </svg>
  ),
  Message: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
    </svg>
  ),
  Crown: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M2 5l4 4 4-8 4 8 4-4-2 9H4L2 5z"/>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd"/>
    </svg>
  ),
  Languages: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-3.754 1 1 0 111.94-.485c.261.104.52.198.78.284A17.502 17.502 0 007.478 6H4a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.992a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.99A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
    </svg>
  ),
  Gift: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd"/>
      <path d="M9 11H3v5a2 2 0 002 2h4v-7zm2 7h4a2 2 0 002-2v-5h-6v7z"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
    </svg>
  ),
};

const ICON_BAR_W = 60;
const SIDEBAR_W = 224;
const COLLAPSED_W = 56;

const Sidebar = ({
  activeTab, setActiveTab, theme, toggleTheme,
  unreadNotificationsCount = 0, isCollapsed, toggleCollapse, onAddTrade
}: SidebarProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { startTourForTab, onUserNavigateToTab } = useTour();
  const { user, openPricing, openProfile, openReferral, openSettings, logout } = useUser();
  const { openFriendDrawer, totalUnreadCount } = useSocial();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mainMenuItems = [
    { id: 'dashboard',  label: t.sidebar.dashboard,  icon: Icons.Dashboard, tourId: undefined },
    { id: 'charts',     label: t.sidebar.charts,     icon: Icons.Chart,     tourId: 'chart-nav-item' },
    { id: 'journal',    label: t.sidebar.journal,    icon: Icons.Journal,   tourId: undefined },
    { id: 'playbook',   label: t.sidebar.playbook,   icon: Icons.Playbook,  tourId: undefined },
    { id: 'reports',    label: t.sidebar.reports,    icon: Icons.Reports,   tourId: undefined },
    { id: 'plans',      label: t.sidebar.plans,      icon: Icons.Plans,     tourId: undefined },
    { id: 'psychology', label: t.sidebar.psychology, icon: Icons.Psychology,tourId: undefined },
    { id: 'calendar',   label: t.sidebar.calendar,   icon: Icons.Calendar,  tourId: undefined },
  ];

  const communityItems = [
    { id: 'plaza',         label: t.sidebar.plaza,         icon: Icons.Plaza,   pro: true },
    { id: 'academy',       label: t.sidebar.academy,       icon: Icons.Academy, pro: true },
    { id: 'notifications', label: t.sidebar.notifications, icon: Icons.Bell,    pro: false },
  ];

  const toggleLanguage = () => setLanguage(language === 'cn' ? 'en' : 'cn');

  const getTierLabel = () => {
    if (user.tier === 'elite') return 'ELITE';
    if (user.tier === 'pro') return 'PRO';
    return 'FREE';
  };

  const getTierBadgeStyle = (): React.CSSProperties => {
    if (user.tier === 'elite') return {
      fontSize: 8.5, fontWeight: 800, color: '#F59E0B',
      background: 'rgba(245,158,11,0.12)', border: '0.5px solid rgba(245,158,11,0.28)',
      padding: '1px 5px', borderRadius: 3, width: 'fit-content',
    };
    if (user.tier === 'pro') return {
      fontSize: 8.5, fontWeight: 800, color: '#8B7CF6',
      background: 'rgba(139,124,246,0.18)', border: '0.5px solid rgba(139,124,246,0.35)',
      padding: '1px 5px', borderRadius: 3, width: 'fit-content',
    };
    return {
      fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,0.35)',
      background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.15)',
      padding: '1px 5px', borderRadius: 3, width: 'fit-content',
    };
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  // Shared nav item renderer
  const NavBtn = ({
    id, label, icon: Icon, tourId, pro, badge,
  }: {
    id: string; label: string; icon: () => JSX.Element;
    tourId?: string; pro?: boolean; badge?: number;
  }) => {
    const isActive = activeTab === id;
    return (
      <button
        id={tourId}
        onClick={() => { setActiveTab(id); onUserNavigateToTab(id); }}
        title={isCollapsed ? label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          padding: isCollapsed ? '8px 0' : '8px 10px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          borderRadius: 7, gap: 10, marginBottom: 1,
          width: '100%', border: 'none', cursor: 'pointer', outline: 'none',
          position: 'relative',
          background: isActive ? 'rgba(88,80,220,0.25)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {/* Active left bar */}
        {isActive && (
          <span style={{
            position: 'absolute', left: 0, top: '20%', height: '60%',
            width: 2.5, borderRadius: '0 2px 2px 0',
            background: 'linear-gradient(180deg, #6B5EF8, #9B8FF8)',
          }} />
        )}
        {/* Icon */}
        <span style={{ color: isActive ? '#9B8FF8' : 'rgba(255,255,255,0.38)', flexShrink: 0, display: 'flex' }}>
          <Icon />
        </span>
        {/* Label */}
        {!isCollapsed && (
          <span style={{
            fontSize: 13.5, fontWeight: isActive ? 600 : 400,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.48)',
            whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
          }}>
            {label}
          </span>
        )}
        {/* PRO tag */}
        {pro && !isCollapsed && (
          <span style={{
            fontSize: 9.5, fontWeight: 700, color: '#8B7CF6',
            background: 'rgba(139,124,246,0.18)', border: '0.5px solid rgba(139,124,246,0.35)',
            padding: '2px 6px', borderRadius: 4, marginLeft: 'auto', flexShrink: 0,
          }}>PRO</span>
        )}
        {/* Notification badge */}
        {badge != null && badge > 0 && (
          <span style={{
            position: isCollapsed ? 'absolute' : 'static',
            top: isCollapsed ? 4 : undefined, right: isCollapsed ? 4 : undefined,
            marginLeft: isCollapsed ? undefined : 'auto',
            minWidth: 16, height: 16, padding: '0 4px',
            background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarWidth = isCollapsed ? COLLAPSED_W : SIDEBAR_W;

  const iconBarItems = [
    { id: 'plaza',         label: t.sidebar.plaza,         icon: Icons.Plaza },
    { id: 'academy',       label: t.sidebar.academy,       icon: Icons.Academy },
    { id: 'notifications', label: t.sidebar.notifications, icon: Icons.Bell,  badge: unreadNotificationsCount },
  ];

  return (
    <>
      {/* ── Vertical icon bar (leftmost strip) ── */}
      <div style={{
        width: ICON_BAR_W,
        height: '100vh',
        background: 'linear-gradient(180deg, #080d1e 0%, #0a0f22 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'fixed',
        left: 0, top: 0,
        zIndex: 101,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Logo icon */}
        <img
          src="/lion-logo.png"
          alt="TradeGrail"
          style={{ width: 48, height: 48, objectFit: 'contain', marginTop: 12, marginBottom: 16 }}
        />

        {/* Nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 4 }}>
          {iconBarItems.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveTab(id); onUserNavigateToTab(id); }}
                title={label}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'rgba(88,80,220,0.3)' : 'transparent',
                  color: isActive ? '#9B8FF8' : 'rgba(255,255,255,0.35)',
                  position: 'relative', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon />
                {badge != null && badge > 0 && (
                  <span style={{
                    position: 'absolute', top: 3, right: 3,
                    minWidth: 14, height: 14, padding: '0 3px',
                    background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700,
                    borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main sidebar ── */}
    <div
      id="sidebar-nav"
      style={{
        width: sidebarWidth,
        height: '100vh',
        background: 'linear-gradient(180deg, #0e1428 0%, #111830 50%, #0f1128 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: ICON_BAR_W, top: 0,
        zIndex: 100,
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Collapse toggle removed — handled by icon bar */}

      {/* Logo row */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', flexShrink: 0,
        padding: isCollapsed ? '0 10px' : '0 14px',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: 10,
      }}>
        {isCollapsed ? (
          /* Expand button — shown when collapsed */
          <button
            onClick={toggleCollapse}
            title="Expand"
            style={{
              width: 36, height: 36, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              flexShrink: 0, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
          >
            {/* Double chevron right */}
            <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              <path fillRule="evenodd" d="M3.293 14.707a1 1 0 010-1.414L6.586 10 3.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
          </button>
        ) : (
          /* Logo + collapse button — shown when expanded */
          <>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <img src="/tradegrail-logo.png" alt="TradeGrail" style={{ height: 22, width: 'auto', objectFit: 'contain' }} />
            </div>
            <button
              onClick={toggleCollapse}
              title="Collapse"
              style={{
                width: 30, height: 30, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                flexShrink: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
            >
              {/* Double chevron left */}
              <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L13.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Add Trade button */}
      <div style={{ padding: isCollapsed ? '0 8px 6px' : '0 12px 6px', flexShrink: 0 }}>
        <button
          onClick={onAddTrade}
          title={isCollapsed ? t.journal.addTrade : undefined}
          style={{
            width: '100%', height: 38,
            background: 'linear-gradient(135deg, #5B6BF0, #7C5CF6)',
            borderRadius: 8, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, color: '#fff', fontSize: 13, fontWeight: 600,
          }}
        >
          <Icons.Plus />
          {!isCollapsed && <span>{t.journal.addTrade}</span>}
        </button>
      </div>

      {/* Main nav */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: isCollapsed ? '4px 6px' : '4px 10px',
      }}
        className="no-scrollbar"
      >
        {mainMenuItems.map(item => (
          <NavBtn key={item.id} {...item} />
        ))}

        {/* Community section */}
        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
        {!isCollapsed && (
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 2px 6px',
          }}>
            Community
          </div>
        )}
        {communityItems.map(item => (
          <NavBtn
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            pro={item.pro}
            badge={item.id === 'notifications' ? unreadNotificationsCount : undefined}
          />
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '0 10px', flexShrink: 0 }} />

      {/* Bottom utilities */}
      <div style={{ flexShrink: 0, padding: isCollapsed ? '4px 6px' : '4px 10px' }}>
        {[
          { label: t.social.friends, icon: Icons.Message, onClick: openFriendDrawer, badge: totalUnreadCount },
          { label: t.sidebar.guide, icon: Icons.Map, onClick: () => startTourForTab(activeTab) },
          {
            label: language === 'cn' ? 'Language' : '语言',
            icon: Icons.Languages, onClick: toggleLanguage,
            extra: language.toUpperCase(),
          },
          {
            label: theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode,
            icon: theme === 'dark' ? Icons.Sun : Icons.Moon, onClick: toggleTheme,
          },
          ...(user.tier === 'free' ? [{
            label: language === 'cn' ? '升级 Pro' : 'Upgrade',
            icon: Icons.Crown, onClick: openPricing,
            goldColor: true,
          }] : []),
        ].map(({ label, icon: Icon, onClick, badge, extra, goldColor }: any) => (
          <button
            key={label}
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              height: 40, padding: isCollapsed ? '0' : '0 8px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: 10, background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: 7, position: 'relative',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{ color: goldColor ? 'rgba(245,158,11,0.7)' : 'rgba(255,255,255,0.35)', display: 'flex', flexShrink: 0 }}>
              <Icon />
            </span>
            {!isCollapsed && (
              <span style={{ fontSize: 13, color: goldColor ? 'rgba(245,158,11,0.7)' : 'rgba(255,255,255,0.35)', flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            )}
            {extra && !isCollapsed && (
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', padding: '2px 5px', borderRadius: 4 }}>
                {extra}
              </span>
            )}
            {badge != null && badge > 0 && (
              <span style={{
                position: isCollapsed ? 'absolute' : 'static',
                top: isCollapsed ? 4 : undefined, right: isCollapsed ? 4 : undefined,
                marginLeft: isCollapsed ? undefined : 'auto',
                minWidth: 16, height: 16, padding: '0 4px',
                background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* User area */}
      <div style={{ flexShrink: 0, position: 'relative' }} ref={menuRef}>
        {/* Pop-up menu */}
        {isProfileMenuOpen && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 4px)', left: 8,
            width: 210, background: '#161b38', border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden', zIndex: 200,
          }}>
            <div style={{ padding: 4 }}>
              <button onClick={() => { setIsProfileMenuOpen(false); openPricing(); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#8B7CF6', borderRadius: 7 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                {language === 'cn' ? '探索我们的方案' : 'Explore plans'}
              </button>
              <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '4px 8px' }} />
              {[
                { label: language === 'cn' ? '个人资料' : 'Profile', icon: Icons.User, action: openProfile },
                { label: language === 'cn' ? '设置与账单' : 'Settings & Billing', icon: Icons.Settings, action: () => setActiveTab('settings') },
              ].map(({ label, icon: Icon, action }) => (
                <button key={label} onClick={() => { setIsProfileMenuOpen(false); action(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)', borderRadius: 7 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                  <Icon />{label}
                </button>
              ))}
              <button onClick={() => { setIsProfileMenuOpen(false); setActiveTab('referrals'); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)', borderRadius: 7 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icons.Gift />{language === 'cn' ? '推荐朋友' : 'Refer a friend'}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>$15</span>
              </button>
              <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '4px 8px' }} />
              <button onClick={logout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#f87171', borderRadius: 7 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                <Icons.LogOut />{language === 'cn' ? '退出' : 'Sign out'}
              </button>
            </div>
          </div>
        )}

        {/* User row */}
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          title={isCollapsed ? user.name : undefined}
          style={{
            height: 54, display: 'flex', alignItems: 'center',
            gap: 10, padding: isCollapsed ? '0' : '0 14px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            width: '100%', background: 'none', border: 'none',
            borderTopColor: 'rgba(255,255,255,0.06)',
            borderTopStyle: 'solid', borderTopWidth: 1,
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #4B5EE8, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden',
          }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : user.name.slice(0, 2).toUpperCase()
            }
          </div>
          {/* Info */}
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {user.name}
              </div>
              <div style={{ ...getTierBadgeStyle(), flexShrink: 0 }}>
                {getTierLabel()}
              </div>
            </div>
          )}
          {/* Chevron */}
          {!isCollapsed && (
            <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginLeft: 'auto', display: 'flex' }}>
              <Icons.ChevronRight />
            </span>
          )}
        </button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
