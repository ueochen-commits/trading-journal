import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { ExchangeConnection } from '../types';

export type UserTier = 'free' | 'pro' | 'elite';

export interface UserProfile {
    id?: string;
    name: string;
    email: string;
    tier: UserTier;
    avatarUrl?: string;
    exchangeConnections?: ExchangeConnection[];
    createdAt?: string;         // 注册时间
    subscriptionEnd?: string;   // 会员到期日
    aiUsageToday?: number;      // 今日 AI 使用次数
    tradeCount?: number;        // 交易记录总条数
}

interface UserContextType {
    user: UserProfile;
    isAuthenticated: boolean;
    isLoading: boolean;
    isPricingOpen: boolean;
    isProfileOpen: boolean;
    isReferralOpen: boolean;
    isSettingsOpen: boolean;
    login: () => void;
    logout: () => void;
    openPricing: () => void;
    closePricing: () => void;
    openProfile: () => void;
    closeProfile: () => void;
    openReferral: () => void;
    closeReferral: () => void;
    openSettings: () => void;
    closeSettings: () => void;
    upgradeTier: (tier: UserTier) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    addExchangeConnection: (connection: ExchangeConnection) => void;
    removeExchangeConnection: (id: string) => void;
    updateExchangeConnectionLastSync: (id: string) => void;
    refreshUser: () => Promise<void>; // 新增：刷新用户信息
}

const TIER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedTier = (userId: string): { tier: UserTier; subscriptionEnd?: string } | null => {
    try {
        const raw = localStorage.getItem(`tier_cache_${userId}`);
        if (!raw) return null;
        const { tier, subscriptionEnd, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) {
            localStorage.removeItem(`tier_cache_${userId}`);
            return null;
        }
        return { tier: tier as UserTier, subscriptionEnd };
    } catch {
        return null;
    }
};

const setCachedTier = (userId: string, tier: UserTier, subscriptionEnd?: string) => {
    try {
        localStorage.setItem(`tier_cache_${userId}`, JSON.stringify({
            tier,
            subscriptionEnd,
            expiresAt: Date.now() + TIER_CACHE_TTL
        }));
    } catch {}
};

const clearCachedTier = (userId: string) => {
    try {
        localStorage.removeItem(`tier_cache_${userId}`);
    } catch {}
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children?: ReactNode }) => {
    const [user, setUser] = useState<UserProfile>({
        name: "Trader",
        email: "demo@tradegrail.com",
        tier: 'free',
        exchangeConnections: []
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Listen for Auth Changes
    // 只用 onAuthStateChange，避免与 getSession() 竞态（Chrome 兼容性问题）
    useEffect(() => {
        const timeout = setTimeout(() => setIsLoading(false), 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'INITIAL_SESSION') {
                if (session) {
                    // 立刻设置已登录和加载完成，不等待订阅查询
                    setIsAuthenticated(true);
                    clearTimeout(timeout);
                    setIsLoading(false);
                    // 在后台查询会员等级（不阻塞页面显示）
                    syncUser(session.user).catch(e => console.error('Auth init error:', e));
                } else {
                    clearTimeout(timeout);
                    setIsLoading(false);
                }
            } else if (session) {
                setIsAuthenticated(true);
                syncUser(session.user).catch(e => console.error('Sync user error:', e));
            } else {
                setIsAuthenticated(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const syncUser = async (supabaseUser: any, forceRefresh = false) => {
        // 先同步基本信息（包括注册时间）
        setUser(prev => ({
            ...prev,
            id: supabaseUser.id,
            email: supabaseUser.email || prev.email,
            name: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || prev.name,
            avatarUrl: supabaseUser.user_metadata?.avatar_url,
            createdAt: supabaseUser.created_at,
        }));

        // 优先读缓存，命中则跳过数据库查询
        if (!forceRefresh) {
            const cached = getCachedTier(supabaseUser.id);
            if (cached) {
                setUser(prev => ({ ...prev, tier: cached.tier, subscriptionEnd: cached.subscriptionEnd }));
                // 后台加载其他数据
                loadUserStats(supabaseUser.id).catch(() => {});
                return;
            }
        }

        // 从 subscriptions 表读取真实会员等级和到期日
        try {
            const { data: subs } = await supabase
                .from('subscriptions')
                .select('plan, status, current_period_end')
                .eq('user_id', supabaseUser.id)
                .eq('status', 'active');

            const tierPriority: Record<string, number> = { elite: 3, pro: 2, free: 1 };

            const validSubs = (subs || []).filter(s => {
                const periodEnd = s.current_period_end ? new Date(s.current_period_end) : null;
                return !periodEnd || periodEnd > new Date();
            });

            let tier: UserTier = 'free';
            let subscriptionEnd: string | undefined;
            if (validSubs.length > 0) {
                validSubs.sort((a, b) => (tierPriority[b.plan] || 0) - (tierPriority[a.plan] || 0));
                tier = validSubs[0].plan as UserTier;
                subscriptionEnd = validSubs[0].current_period_end;
            }

            setCachedTier(supabaseUser.id, tier, subscriptionEnd);
            setUser(prev => ({ ...prev, tier, subscriptionEnd }));
        } catch {
            setUser(prev => ({ ...prev, tier: 'free' }));
        }

        // 后台加载 AI 使用次数和交易记录条数
        loadUserStats(supabaseUser.id).catch(() => {});
    };

    const loadUserStats = async (userId: string) => {
        const today = new Date().toISOString().split('T')[0];

        const [usageResult, tradeResult] = await Promise.all([
            supabase.from('ai_usage').select('count').eq('user_id', userId).eq('date', today).maybeSingle(),
            supabase.from('trading_journals').select('id', { count: 'exact', head: true }).eq('user_id', userId)
        ]);

        setUser(prev => ({
            ...prev,
            aiUsageToday: usageResult.data?.count ?? 0,
            tradeCount: tradeResult.count ?? 0,
        }));
    };

    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const login = () => setIsAuthenticated(true);
    const logout = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) clearCachedTier(session.user.id);
        await supabase.auth.signOut();
        setIsAuthenticated(false);
    };

    const openPricing = () => setIsPricingOpen(true);
    const closePricing = () => setIsPricingOpen(false);
    const openProfile = () => setIsProfileOpen(true);
    const closeProfile = () => setIsProfileOpen(false);
    const openReferral = () => setIsReferralOpen(true);
    const closeReferral = () => setIsReferralOpen(false);
    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    const upgradeTier = (tier: UserTier) => {
        setUser(prev => ({ ...prev, tier }));
        closePricing();
    };

    // 主动刷新用户会员状态（支付成功后调用，强制跳过缓存）
    const refreshUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await syncUser(session.user, true);
        }
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        setUser(prev => ({ ...prev, ...updates }));
        try {
            if (updates.name) {
                await supabase.auth.updateUser({
                    data: { username: updates.name }
                });
            }
        } catch (e) {}
    };

    const addExchangeConnection = (connection: ExchangeConnection) => {
        setUser(prev => ({
            ...prev,
            exchangeConnections: [...(prev.exchangeConnections || []), connection]
        }));
    };

    const removeExchangeConnection = (id: string) => {
        setUser(prev => ({
            ...prev,
            exchangeConnections: (prev.exchangeConnections || []).filter(c => c.id !== id)
        }));
    };

    const updateExchangeConnectionLastSync = (id: string) => {
        const now = new Date().toLocaleString();
        setUser(prev => ({
            ...prev,
            exchangeConnections: (prev.exchangeConnections || []).map(c => 
                c.id === id ? { ...c, lastSync: now } : c
            )
        }));
    };

    return (
        <UserContext.Provider value={{
            user,
            isAuthenticated,
            isLoading,
            login,
            logout,
            isPricingOpen, 
            isProfileOpen, 
            isReferralOpen, 
            isSettingsOpen,
            openPricing, 
            closePricing, 
            openProfile, 
            closeProfile, 
            openReferral, 
            closeReferral,
            openSettings,
            closeSettings,
            upgradeTier,
            updateProfile,
            addExchangeConnection,
            removeExchangeConnection,
            updateExchangeConnectionLastSync,
            refreshUser
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};