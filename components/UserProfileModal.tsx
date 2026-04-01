
import React from 'react';
import { X, User, Edit2, Shield, Monitor, Mail, Bot, Database, Crown, LogOut, HelpCircle, Smartphone, ExternalLink } from 'lucide-react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';

const TIER_LIMITS = {
    free:  { ai: 5,   trades: 100,  aiLabel: '5次/天' },
    pro:   { ai: 100, trades: 1000, aiLabel: '100次/天' },
    elite: { ai: null, trades: null, aiLabel: '无限制' },
};

const UserProfileModal: React.FC = () => {
    const { isProfileOpen, closeProfile, user, openPricing, openSettings, logout } = useUser();
    const { t, language } = useLanguage();

    if (!isProfileOpen) return null;

    const isPro = user.tier === 'pro' || user.tier === 'elite';
    const isElite = user.tier === 'elite';
    const limits = TIER_LIMITS[user.tier];

    const joinedDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
        : '--';

    const subEndDate = user.subscriptionEnd
        ? new Date(user.subscriptionEnd).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
        : null;

    const aiUsed = user.aiUsageToday ?? 0;
    const aiLimit = limits.ai;
    const aiRemaining = aiLimit !== null ? Math.max(0, aiLimit - aiUsed) : null;

    const tradeCount = user.tradeCount ?? 0;
    const tradeLimit = limits.trades;
    const tradePercent = tradeLimit ? Math.min(100, Math.round((tradeCount / tradeLimit) * 100)) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={closeProfile}>
            <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        {language === 'cn' ? '账户信息' : 'Account Info'}
                    </h2>
                    <button onClick={closeProfile} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Left Column: Avatar & Main Actions */}
                    <div className="w-64 border-r border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center bg-slate-50/50 dark:bg-slate-950/30">
                        {/* Avatar - Read Only */}
                        <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold">
                                        {user.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-8">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate max-w-[140px]">{user.name}</h3>
                        </div>

                        <div className="mt-auto w-full space-y-3">
                            <button className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                {language === 'cn' ? '绑定微信 / Teams' : 'Connect Teams'}
                            </button>
                            <button className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <HelpCircle className="w-4 h-4" />
                                {language === 'cn' ? '用户支持' : 'Support'}
                            </button>
                            <button onClick={logout} className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-600 hover:border-rose-200 transition-colors flex items-center justify-center gap-2">
                                <LogOut className="w-4 h-4" />
                                {language === 'cn' ? '退出登录' : 'Logout'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 space-y-8">
                            
                            {/* Section 1: Basic Info */}
                            <div className="grid grid-cols-[80px_1fr] gap-y-6 text-sm">
                                {/* Account */}
                                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">
                                    {language === 'cn' ? '登录账户:' : 'Account:'}
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-base mb-1">{user.email}</p>
                                        <p className="text-slate-400 text-xs">{joinedDate} {language === 'cn' ? '开始使用 TradeGrail' : 'Joined TradeGrail'}</p>
                                    </div>
                                    <a href="#" className="text-indigo-600 hover:underline text-xs">{language === 'cn' ? '账户一览' : 'Overview'}</a>
                                </div>

                                {/* Level */}
                                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">
                                    {language === 'cn' ? '账户级别:' : 'Level:'}
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${isElite ? 'bg-amber-100 text-amber-600' : isPro ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                TradeGrail {user.tier === 'free' ? (language === 'cn' ? '基础账户' : 'Basic') : user.tier === 'pro' ? (language === 'cn' ? '专业账户' : 'Pro') : (language === 'cn' ? '尊享账户' : 'Elite')}
                                            </span>
                                        </div>
                                        {subEndDate && (
                                            <p className="text-slate-400 text-xs">{language === 'cn' ? '到期日：' : 'Expires: '}{subEndDate}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <a href="#" className="text-indigo-600 hover:underline text-xs">{language === 'cn' ? '权益说明' : 'Benefits'}</a>
                                        {!isElite && (
                                            <button
                                                onClick={() => { closeProfile(); openPricing(); }}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors"
                                            >
                                                {language === 'cn' ? '升级' : 'Upgrade'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Devices */}
                                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">
                                    {language === 'cn' ? '设备:' : 'Devices:'}
                                </div>
                                <div className="flex justify-between items-start">
                                    <div className="text-slate-700 dark:text-slate-300">
                                        {language === 'cn' ? '你的账户现在已在 3 台设备上登录' : 'Logged in on 3 devices currently'}
                                    </div>
                                    <a href="#" className="text-indigo-600 hover:underline text-xs">{language === 'cn' ? '管理设备' : 'Manage'}</a>
                                </div>

                                {/* Email to */}
                                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">
                                    {language === 'cn' ? '专属邮箱:' : 'Email Gateway:'}
                                </div>
                                <div>
                                    <a href="#" className="text-indigo-600 hover:underline decoration-dashed underline-offset-4">
                                        upload.{user.name.replace(' ', '').toLowerCase()}@tradegrail.net
                                    </a>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

                            {/* Section 2: AI Quota */}
                            <div className="grid grid-cols-[48px_1fr] gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white">TradeGrail AI</h4>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500">
                                                {language === 'cn' ? '今日已用: ' : 'Used today: '}
                                                <span className="text-slate-900 dark:text-white font-mono">{aiUsed}</span>
                                                {aiLimit !== null && <span className="text-slate-400"> / {aiLimit}</span>}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {language === 'cn' ? '每日上限: ' : 'Daily limit: '}
                                                <span className="text-slate-900 dark:text-white font-mono">{isElite ? (language === 'cn' ? '无限制' : 'Unlimited') : limits.aiLabel}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {language === 'cn' ? '包含 AI 教练对话、周报及月报生成。' : 'Includes AI coach, weekly and monthly reports.'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <a href="#" className="text-indigo-600 hover:underline text-xs">{language === 'cn' ? '功能说明' : 'Details'}</a>
                                            {!isPro && (
                                                <button
                                                    onClick={() => { closeProfile(); openPricing(); }}
                                                    className="border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1 rounded text-xs font-bold transition-colors"
                                                >
                                                    {language === 'cn' ? '立即开通' : 'Subscribe'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

                            {/* Section 3: Data Usage */}
                            <div className="grid grid-cols-[48px_1fr] gap-4">
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Database className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white">{language === 'cn' ? '交易记录存储' : 'Trade Record Storage'}</h4>
                                        <div className="font-mono text-sm text-slate-700 dark:text-slate-300">
                                            {tradeCount.toLocaleString()} / {tradeLimit !== null ? tradeLimit.toLocaleString() : (language === 'cn' ? '无限制' : 'Unlimited')}
                                        </div>
                                    </div>
                                    {tradeLimit !== null && (
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${tradePercent}%` }}></div>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {language === 'cn' ? '云端加密存储，支持多端同步。' : 'Encrypted cloud storage with multi-device sync.'}
                                        </p>
                                        <a href="#" className="text-indigo-600 hover:underline text-xs">{language === 'cn' ? '详细统计' : 'Usage Stats'}</a>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Promo Section */}
                            {!isElite && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 max-w-md">
                                            {language === 'cn'
                                             ? '升级 TradeGrail 尊享会员，解锁无限记录、无限 AI 次数！'
                                             : 'Upgrade to TradeGrail Elite for unlimited records and AI usage!'}
                                        </p>
                                        <button
                                            onClick={() => { closeProfile(); openPricing(); }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap ml-4 shadow-sm"
                                        >
                                            {language === 'cn' ? '升级账户' : 'Upgrade Account'}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
