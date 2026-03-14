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
}

interface UserContextType {
    user: UserProfile;
    isAuthenticated: boolean;
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children?: ReactNode }) => {
    const [user, setUser] = useState<UserProfile>({
        name: "Trader",
        email: "demo@tradegrail.com",
        tier: 'elite', // Default to elite for development
        exchangeConnections: []
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Listen for Auth Changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                syncUser(session.user);
                setIsAuthenticated(true);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                syncUser(session.user);
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const syncUser = (supabaseUser: any) => {
        setUser(prev => ({
            ...prev,
            id: supabaseUser.id,
            email: supabaseUser.email || prev.email,
            name: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || prev.name,
            avatarUrl: supabaseUser.user_metadata?.avatar_url
        }));
    };

    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const login = () => setIsAuthenticated(true);
    const logout = async () => {
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
            updateExchangeConnectionLastSync
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