
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
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z"/>
    </svg>
  ),
  Chart: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M1 12h2V7H1v5zm4 0h2V4H5v8zm4 0h2V1H9v11zm4 0h2V9h-2v3z"/>
    </svg>
  ),
  Journal: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M3 1a1 1 0 00-1 1v12a1 1 0 001 1h8a2 2 0 002-2V4.414A2 2 0 0012.586 3L11 1.414A2 2 0 009.586 1H3zm6 1.414L10.586 4H9V2.414zM3 2h5v3h4v9a1 1 0 01-1 1H3V2zm2 5h4v1H5V7zm0 2h4v1H5V9zm0 2h3v1H5v-1z"/>
    </svg>
  ),
  Playbook: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h8v1H2V9zm0 3h6v1H2v-1z"/>
    </svg>
  ),
  Reports: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-.5 2v5.5l4 2-.5.87-4.5-2.37V4h1z"/>
    </svg>
  ),
  Plans: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M13.5 1l-8 8-3-3-1.5 1.5 4.5 4.5 9.5-9.5L13.5 1z"/>
    </svg>
  ),
  Psychology: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1a5 5 0 00-3.54 8.54l-.46 3.46 4-1.5 4 1.5-.46-3.46A5 5 0 008 1zm0 1a4 4 0 110 8A4 4 0 018 2zm0 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M5 1v1H2a1 1 0 00-1 1v11a1 1 0 001 1h12a1 1 0 001-1V3a1 1 0 00-1-1h-3V1h-1v1H6V1H5zm-3 4h12v8H2V5zm2 2v1h1V7H4zm3 0v1h1V7H7zm3 0v1h1V7h-1zM4 10v1h1v-1H4zm3 0v1h1v-1H7zm3 0v1h1v-1h-1z"/>
    </svg>
  ),
  Plaza: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1c.9 0 1.76.2 2.53.55L9 4H7L5.47 2.55A6 6 0 018 2zM4.7 3.3L6 5v2H2.07A6 6 0 014.7 3.3zM2.07 8H6v2l-1.3 1.7A6 6 0 012.07 8zm3.63 4.45L7 11h2l1.3 1.45A6 6 0 015.7 12.45zm5.6.25L10 11V9h3.93a6 6 0 01-2.63 3.7zM13.93 8H10V6l1.3-1.7A6 6 0 0113.93 8z"/>
    </svg>
  ),
  Academy: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1L1 5l7 4 7-4-7-4zM3 7.5v3.5c0 1.1 2.24 2 5 2s5-.9 5-2V7.5L8 11 3 7.5z"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1a5 5 0 00-5 5v3l-1.5 2h13L13 9V6a5 5 0 00-5-5zm0 14a2 2 0 01-2-2h4a2 2 0 01-2 2z"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Message: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 2V3a1 1 0 011-1z"/>
    </svg>
  ),
  Crown: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 2L5 7 1 4l2 9h10l2-9-4 3-3-5z"/>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 5a3 3 0 100 6A3 3 0 008 5zM8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M14 10.5A6.5 6.5 0 015.5 2a6.5 6.5 0 000 12A6.5 6.5 0 0014 10.5z"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 5a3 3 0 100 6A3 3 0 008 5zm0 1a2 2 0 110 4A2 2 0 018 6zm5.66 1.5l-1.1-.63a5.1 5.1 0 000-1.74l1.1-.63-.5-.87-1.1.63a5 5 0 00-1.5-.87V2h-1v1.39a5 5 0 00-1.5.87l-1.1-.63-.5.87 1.1.63a5.1 5.1 0 000 1.74l-1.1.63.5.87 1.1-.63c.44.37.95.65 1.5.87V10h1V8.89a5 5 0 001.5-.87l1.1.63.5-.87z"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1a3 3 0 100 6A3 3 0 008 1zm0 7c-3.33 0-6 1.34-6 3v1h12v-1c0-1.66-2.67-3-6-3z"/>
    </svg>
  ),
  Gift: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 3a2 2 0 01-2-2 2 2 0 012 2zm0 0a2 2 0 012-2 2 2 0 01-2 2zM1 4h14v3H1V4zm1 4h5v6H2V8zm6 0h5v6H8V8z"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M6 2H2v12h4v-1H3V3h3V2zm5 3l-1 1 2 2H5v1h7l-2 2 1 1 3-3-3-4z"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M6 3l5 5-5 5-1-1 4-4-4-4 1-1z"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <path d="M10 3L5 8l5 5 1-1-4-4 4-4-1-1z"/>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M1 2l4 1.5 6-2 4 1.5v11l-4-1.5-6 2-4-1.5V2zm4 2.3v8.4l6-2V4.3l-6 2z"/>
    </svg>
  ),
  Languages: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M7 2H1v1h2.5C3 5 2 6.5 1 8l.8.6C2.5 7.5 3 6.8 3.5 6c.5.8 1 1.5 1.7 2.6L6 8C5 6.5 4.2 5 4 3H7V2zm2 3l-3 9h1.2l.8-2.5h3l.8 2.5H13L10 5H9zm.5 1.5L11 10H8.5l1-3.5z"/>
    </svg>
  ),
};

// Inline styles for gradient backgrounds (can't be done in Tailwind)
const sidebarStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0f1535 0%, #131b45 40%, #1a1040 100%)',
  position: 'relative',
};

const sidebarOverlayStyle: React.CSSProperties = {
  content: '',
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'radial-gradient(ellipse at 30% 20%, rgba(99,88,255,0.12) 0%, transparent 60%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const addBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #5566FF, #8855EE)',
  borderRadius: '8px',
  padding: '9px 14px',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 500,
  width: 'calc(100% - 1.75rem)',
  margin: '0.875rem',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
};

const logoIconStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'linear-gradient(135deg, #4455EE, #9966FF)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const Sidebar = ({ activeTab, setActiveTab, theme, toggleTheme, unreadNotificationsCount = 0, isCollapsed, toggleCollapse, onAddTrade }: SidebarProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { startTourForTab, onUserNavigateToTab } = useTour();
  const { user, openPricing, openProfile, openReferral, openSettings, logout } = useUser();
  const { openFriendDrawer, totalUnreadCount } = useSocial();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mainMenuItems = [
    { id: 'dashboard',     label: t.sidebar.dashboard,     icon: Icons.Dashboard, tourId: undefined },
    { id: 'charts',        label: t.sidebar.charts,        icon: Icons.Chart,     tourId: 'chart-nav-item' },
    { id: 'journal',       label: t.sidebar.journal,       icon: Icons.Journal,   tourId: undefined },
    { id: 'playbook',      label: t.sidebar.playbook,      icon: Icons.Playbook,  tourId: undefined },
    { id: 'reports',       label: t.sidebar.reports,       icon: Icons.Reports,   tourId: undefined },
    { id: 'plans',         label: t.sidebar.plans,         icon: Icons.Plans,     tourId: undefined },
    { id: 'psychology',    label: t.sidebar.psychology,    icon: Icons.Psychology,tourId: undefined },
    { id: 'calendar',      label: t.sidebar.calendar,      icon: Icons.Calendar,  tourId: undefined },
  ];

  const proMenuItems = [
    { id: 'plaza',         label: t.sidebar.plaza,         icon: Icons.Plaza,     tourId: undefined },
    { id: 'academy',       label: t.sidebar.academy,       icon: Icons.Academy,   tourId: undefined },
    { id: 'notifications', label: t.sidebar.notifications, icon: Icons.Bell,      tourId: undefined },
  ];

  const toggleLanguage = () => setLanguage(language === 'cn' ? 'en' : 'cn');

  const getTierLabel = () => {
    if (user.tier === 'elite') return 'ELITE';
    if (user.tier === 'pro') return 'PRO';
    return 'FREE';
  };

  const getTierBadgeStyle = (): React.CSSProperties => {
    if (user.tier === 'elite') return { color: '#FFD700', background: 'rgba(255,215,0,0.15)', border: '0.5px solid rgba(255,215,0,0.3)' };
    if (user.tier === 'pro') return { color: '#AA88FF', background: 'rgba(170,136,255,0.15)', border: '0.5px solid rgba(170,136,255,0.3)' };
    return { color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)' };
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

  const NavItem = ({ item }: { item: typeof mainMenuItems[0] }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        id={item.tourId}
        onClick={() => { setActiveTab(item.id); onUserNavigateToTab(item.id); }}
        title={isCollapsed ? item.label : undefined}
        style={isActive ? {
          background: 'rgba(99,88,255,0.2)',
          border: '0.5px solid rgba(99,88,255,0.3)',
        } : {}}
        className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-start px-3 py-[0.6rem]'} rounded-[7px] cursor-pointer mb-[1px] outline-none transition-all group
          ${isActive ? '' : 'hover:bg-white/5 border border-transparent'}`}
      >
        {/* Active left bar */}
        {isActive && (
          <span
            className="absolute left-0 top-[20%] rounded-r-[2px]"
            style={{
              width: '2.5px',
              height: '60%',
              background: 'linear-gradient(180deg, #6655FF, #AA77FF)',
            }}
          />
        )}
        <span style={{ color: isActive ? 'rgba(180,160,255,0.95)' : 'rgba(255,255,255,0.4)' }}
          className="group-hover:!text-white/70 transition-colors shrink-0">
          <Icon />
        </span>
        {!isCollapsed && (
          <span
            className="ml-[10px] text-[13px] leading-none hidden md:block"
            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: isActive ? 500 : 400 }}
          >
            {item.label}
          </span>
        )}
        {item.id === 'notifications' && unreadNotificationsCount > 0 && (
          <span className={`${isCollapsed ? 'absolute top-1 right-1' : 'ml-auto hidden md:flex'} min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full items-center justify-center flex`}>
            {unreadNotificationsCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      id="sidebar-nav"
      style={sidebarStyle}
      className={`flex flex-col h-screen fixed left-0 top-0 transition-all duration-200 z-50 ${isCollapsed ? 'w-[60px]' : 'w-[60px] md:w-[220px]'}`}
    >
      {/* Radial overlay */}
      <div style={sidebarOverlayStyle} />

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-8 z-50 w-6 h-6 rounded-full border border-white/10 text-white/30 hover:text-white/70 transition-colors hidden md:flex items-center justify-center"
        style={{ background: '#1c1f3a' }}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
      </button>

      {/* Logo */}
      <div className={`h-[56px] flex items-center shrink-0 relative z-10 ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start md:px-4'}`}>
        <div style={logoIconStyle}>
          <svg viewBox="0 0 44 44" fill="none" width="20" height="20">
            <path d="M4 38H12V24L4 29V38Z" fill="rgba(255,255,255,0.4)" />
            <path d="M16 38H24V14L16 19V38Z" fill="white" />
            <path d="M28 38H36V4L28 9V38Z" fill="white" />
          </svg>
        </div>
        {!isCollapsed && (
          <div className="hidden md:flex items-center ml-2.5">
            <span className="font-semibold text-[15px] tracking-[0.5px] text-white">TRADE</span>
            <span className="font-semibold text-[15px] tracking-[0.5px]" style={{ color: '#8877FF' }}>GRAIL</span>
          </div>
        )}
      </div>

      {/* Add Trade button */}
      <div className="relative z-10 shrink-0">
        <button
          onClick={onAddTrade}
          title={isCollapsed ? t.journal.addTrade : undefined}
          style={isCollapsed ? { ...addBtnStyle, width: 'calc(100% - 1.75rem)', justifyContent: 'center', padding: '9px 0' } : addBtnStyle}
        >
          <Icons.Plus />
          {!isCollapsed && <span className="hidden md:block">{t.journal.addTrade}</span>}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative z-10 px-[0.875rem] pt-1">
        {mainMenuItems.map((item) => <NavItem key={item.id} item={item} />)}

        {/* PRO section divider */}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '0.5rem 0' }} />

        {!isCollapsed && (
          <p className="hidden md:block text-[10px] font-semibold uppercase tracking-widest px-1 mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Community
          </p>
        )}

        {proMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onUserNavigateToTab(item.id); }}
              title={isCollapsed ? item.label : undefined}
              style={isActive ? { background: 'rgba(99,88,255,0.2)', border: '0.5px solid rgba(99,88,255,0.3)' } : {}}
              className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-start px-3 py-[0.6rem]'} rounded-[7px] cursor-pointer mb-[1px] outline-none transition-all group
                ${isActive ? '' : 'hover:bg-white/5 border border-transparent'}`}
            >
              {isActive && (
                <span className="absolute left-0 top-[20%] rounded-r-[2px]"
                  style={{ width: '2.5px', height: '60%', background: 'linear-gradient(180deg, #6655FF, #AA77FF)' }} />
              )}
              <span style={{ color: isActive ? 'rgba(180,160,255,0.95)' : 'rgba(255,255,255,0.4)' }}
                className="group-hover:!text-white/70 transition-colors shrink-0">
                <Icon />
              </span>
              {!isCollapsed && (
                <span className="ml-[10px] text-[13px] leading-none hidden md:flex items-center gap-2 flex-1"
                  style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: isActive ? 500 : 400 }}>
                  {item.label}
                  {(item.id === 'plaza' || item.id === 'academy') && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#FFD700', background: 'rgba(255,215,0,0.12)', border: '0.5px solid rgba(255,215,0,0.25)', padding: '2px 7px', borderRadius: 4 }}>
                      PRO
                    </span>
                  )}
                </span>
              )}
              {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                <span className={`${isCollapsed ? 'absolute top-1 right-1' : 'ml-auto hidden md:flex'} min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full items-center justify-center flex`}>
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '0 0.875rem' }} className="shrink-0 relative z-10" />

      {/* Bottom utilities */}
      <div className="px-[0.875rem] py-2 space-y-[1px] shrink-0 relative z-10">
        {[
          { label: t.social.friends, icon: Icons.Message, onClick: openFriendDrawer, badge: totalUnreadCount },
          { label: t.sidebar.guide, icon: Icons.Map, onClick: () => startTourForTab(activeTab) },
          { label: language === 'cn' ? 'Language' : '语言', icon: Icons.Languages, onClick: toggleLanguage, extra: language.toUpperCase() },
          { label: theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode, icon: theme === 'dark' ? Icons.Sun : Icons.Moon, onClick: toggleTheme },
        ].map(({ label, icon: Icon, onClick, badge, extra }) => (
          <button
            key={label}
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-[0.6rem]'} rounded-[7px] hover:bg-white/5 transition-colors group relative`}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)' }} className="group-hover:!text-white/60 transition-colors shrink-0">
              <Icon />
            </span>
            {!isCollapsed && (
              <span className="ml-[10px] text-[13px] hidden md:block flex-1 text-left" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {label}
              </span>
            )}
            {extra && !isCollapsed && (
              <span className="hidden md:block text-[10px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                {extra}
              </span>
            )}
            {badge != null && badge > 0 && (
              <span className={`${isCollapsed ? 'absolute top-1 right-1' : 'ml-auto hidden md:flex'} min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full items-center justify-center flex`}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}

        {user.tier === 'free' && (
          <button
            onClick={openPricing}
            title={isCollapsed ? (language === 'cn' ? '升级' : 'Upgrade') : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-[0.6rem]'} rounded-[7px] hover:bg-white/5 transition-colors group`}
          >
            <span style={{ color: 'rgba(255,215,0,0.6)' }} className="group-hover:!text-yellow-400 transition-colors shrink-0">
              <Icons.Crown />
            </span>
            {!isCollapsed && (
              <span className="ml-[10px] text-[13px] hidden md:block" style={{ color: 'rgba(255,215,0,0.6)' }}>
                {language === 'cn' ? '升级 Pro' : 'Upgrade'}
              </span>
            )}
          </button>
        )}
      </div>

      {/* User area */}
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }} className="shrink-0 relative z-10" ref={menuRef}>
        {/* Pop-up menu */}
        {isProfileMenuOpen && (
          <div
            className="absolute bottom-[calc(100%+4px)] left-2 w-56 rounded-lg shadow-2xl overflow-hidden z-[60]"
            style={{ background: '#1a1d3a', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            <div className="p-1 space-y-[1px]">
              <button onClick={() => { setIsProfileMenuOpen(false); openPricing(); }}
                className="w-full text-left px-3 py-2 rounded-md text-[13px] font-semibold transition-colors hover:bg-white/5"
                style={{ color: '#8877FF' }}>
                {language === 'cn' ? '探索我们的方案' : 'Explore plans'}
              </button>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '4px 4px' }} />
              {[
                { label: language === 'cn' ? '个人资料' : 'Profile', icon: Icons.User, action: openProfile },
                { label: language === 'cn' ? '设置与账单' : 'Settings & Billing', icon: Icons.Settings, action: openSettings },
              ].map(({ label, icon: Icon, action }) => (
                <button key={label} onClick={() => { setIsProfileMenuOpen(false); action(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <Icon />{label}
                </button>
              ))}
              <button onClick={() => { setIsProfileMenuOpen(false); openReferral(); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
                <div className="flex items-center gap-2.5"><Icons.Gift />{language === 'cn' ? '推荐朋友' : 'Refer a friend'}</div>
                <span className="text-[11px] font-bold" style={{ color: '#4ade80' }}>$15</span>
              </button>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '4px 4px' }} />
              <button onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-rose-500/10"
                style={{ color: '#f87171' }}>
                <Icons.LogOut />{language === 'cn' ? '退出' : 'Sign out'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          title={isCollapsed ? user.name : undefined}
          style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', width: '100%', background: 'transparent', border: 'none' }}
          className="hover:bg-white/5 transition-colors"
        >
          <div
            className="rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[12px] font-bold"
            style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #4455EE, #9966FF)', color: '#fff' }}
          >
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              : user.name.slice(0, 2).toUpperCase()
            }
          </div>
          {!isCollapsed && (
            <div className="hidden md:flex flex-col items-start flex-1 min-w-0">
              <span className="text-[13px] font-medium truncate w-full leading-tight" style={{ color: '#fff' }}>{user.name}</span>
              <span
                className="text-[9px] font-bold tracking-[0.05em] mt-0.5 px-[5px] py-[1px] rounded"
                style={getTierBadgeStyle()}
              >
                {getTierLabel()}
              </span>
            </div>
          )}
          {!isCollapsed && (
            <span className="hidden md:block ml-auto" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <Icons.ChevronRight />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
