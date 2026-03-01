
import React from 'react';
import { Lock } from 'lucide-react';
import { useUser, UserTier } from './UserContext';
import { useLanguage } from '../LanguageContext';

interface FeatureGateProps {
    children: React.ReactNode;
    tier: UserTier; // Minimum tier required
    blur?: boolean; // Whether to blur the content or hide it
    fallback?: React.ReactNode; // Custom fallback UI
}

const FeatureGate: React.FC<FeatureGateProps> = ({ children, tier, blur = true, fallback }) => {
    const { user, openPricing } = useUser();
    const { t } = useLanguage();

    const tiers = ['free', 'pro', 'elite'];
    const userTierIndex = tiers.indexOf(user.tier);
    const requiredTierIndex = tiers.indexOf(tier);

    if (userTierIndex >= requiredTierIndex) {
        return <>{children}</>;
    }

    // Default Locked UI
    const LockedOverlay = (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm text-center p-6 border border-white/20 rounded-xl">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-xl mb-4 animate-bounce">
                <Lock className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.gates.lockedTitle}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mb-6">
                {t.gates.lockedDesc}
            </p>
            <button 
                onClick={openPricing}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105"
            >
                {t.gates.unlockBtn}
            </button>
        </div>
    );

    if (fallback) {
        return <div onClick={openPricing} className="cursor-pointer">{fallback}</div>;
    }

    return (
        <div className="relative w-full h-full overflow-hidden rounded-xl">
            {LockedOverlay}
            <div className={`w-full h-full pointer-events-none select-none ${blur ? 'filter blur-md opacity-50' : 'opacity-20'}`}>
                {children}
            </div>
        </div>
    );
};

export default FeatureGate;
