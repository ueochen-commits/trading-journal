import React, { useState } from 'react';
import { X, Copy, Mail, Facebook, Twitter, Calendar, AlertCircle } from 'lucide-react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';

const ReferralModal = () => {
    const { isReferralOpen, closeReferral } = useUser();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'refer' | 'redeem' | 'stats'>('refer');

    if (!isReferralOpen) return null;

    const copyLink = () => {
        navigator.clipboard.writeText("https://tradepulse.net/pricing/?share_your_love=tradepulse_user");
        alert("Link copied!");
    };

    const currentBalance = 0.25;

    // Redeem Options Data
    const redeemOptions = [
        { name: 'Essential', duration: language === 'cn' ? '1个月' : '1 Month', price: 14.95, months: 1 },
        { name: 'Plus', duration: language === 'cn' ? '1个月' : '1 Month', price: 33.95, months: 1 },
        { name: 'Premium', duration: language === 'cn' ? '1个月' : '1 Month', price: 67.95, months: 1 },
        { name: 'Essential', duration: language === 'cn' ? '12个月' : '12 Months', price: 155.40, months: 12 },
        { name: 'Plus', duration: language === 'cn' ? '12个月' : '12 Months', price: 339.48, months: 12 },
        { name: 'Premium', duration: language === 'cn' ? '12个月' : '12 Months', price: 677.88, months: 12 },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={closeReferral}>
            <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header Section */}
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">${currentBalance}</h2>
                            <p className="text-xs text-slate-500">{t.referral.balance}</p>
                        </div>
                        <button onClick={closeReferral} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setActiveTab('refer')}
                            className={`pb-3 text-sm font-bold transition-all ${
                                activeTab === 'refer' 
                                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {t.referral.tabs.refer}
                        </button>
                        <button 
                            onClick={() => setActiveTab('redeem')}
                            className={`pb-3 text-sm font-bold transition-all ${
                                activeTab === 'redeem' 
                                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {t.referral.tabs.redeem}
                        </button>
                        <button 
                            onClick={() => setActiveTab('stats')}
                            className={`pb-3 text-sm font-bold transition-all ${
                                activeTab === 'stats' 
                                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {t.referral.tabs.stats}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {/* --- REFER TAB --- */}
                    {activeTab === 'refer' && (
                        <div className="animate-fade-in">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                    {t.referral.heroTitle}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                    {t.referral.heroDesc}
                                </p>
                            </div>

                            <div className="mb-6">
                                <p className="text-xs text-slate-500 mb-2">{t.referral.copyLink}</p>
                                <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value="https://tradepulse.net/pricing/?share_your_love=tradepulse_user"
                                        className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none truncate"
                                    />
                                    <button onClick={copyLink} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 transition-colors">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <button className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium">
                                    <Mail className="w-4 h-4" /> {t.referral.socials.email}
                                </button>
                                <button className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium">
                                    <Facebook className="w-4 h-4 text-blue-600" /> {t.referral.socials.facebook}
                                </button>
                                <button className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium">
                                    <Twitter className="w-4 h-4" /> {t.referral.socials.x}
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center mb-8 shadow-sm">
                                <div className="text-center md:text-left mb-4 md:mb-0">
                                    <h4 className="text-4xl font-bold text-slate-900 dark:text-white mb-1">${currentBalance}</h4>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">{t.referral.stats.earned}</p>
                                </div>
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <div className="flex justify-between items-center gap-8 md:gap-12">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{t.referral.stats.free}</span>
                                        <span className="font-bold text-slate-900 dark:text-white">6</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-8 md:gap-12">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{t.referral.stats.paid}</span>
                                        <span className="font-bold text-slate-900 dark:text-white">0</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 leading-relaxed">
                                {t.referral.footer} <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Affiliate Program</a>
                            </p>
                        </div>
                    )}

                    {/* --- REDEEM TAB --- */}
                    {activeTab === 'redeem' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    {language === 'cn' ? '使用您的推荐收入' : 'Use your referral earnings'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {language === 'cn' 
                                        ? '您可以将其用于付费方案（和以后的其他福利）。' 
                                        : 'You can use it for paid plans (and other future benefits). '}
                                    <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                                        {language === 'cn' ? '详细了解我们的方案。' : 'Learn more about our plans.'}
                                    </a>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {redeemOptions.map((option, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-500 transition-all cursor-pointer group shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {option.name}
                                                    </h4>
                                                    <p className="text-sm text-slate-500 mt-1">{option.duration}</p>
                                                </div>
                                                <div className="relative">
                                                    <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-1.5">
                                                        {option.months}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">${option.price}</p>
                                                {currentBalance < option.price && (
                                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                        {language === 'cn' ? '资金不足' : 'Insufficient funds'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                {language === 'cn' 
                                    ? 'TradeGrail, Inc.在某些国家/地区注册了销售税。因此，根据您所在的位置，您的最终账单可能会添加销售税。' 
                                    : 'TradeGrail, Inc. is registered for sales tax in certain jurisdictions. Sales tax may be added to your final bill based on your location.'}
                            </p>
                        </div>
                    )}

                    {/* --- STATS TAB (Placeholder) --- */}
                    {activeTab === 'stats' && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-fade-in">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">{language === 'cn' ? '统计数据正在生成中...' : 'Stats are being generated...'}</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ReferralModal;