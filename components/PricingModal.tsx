
import React, { useState } from 'react';
import { X, Check, Zap, Crown, ShieldCheck, Star, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';

const PricingModal: React.FC = () => {
    const { isPricingOpen, closePricing, upgradeTier, user } = useUser();
    const { t, language } = useLanguage();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    if (!isPricingOpen) return null;

    const currency = language === 'cn' ? '¥' : '$';

    // Pricing Configuration
    const pricing = {
        monthly: {
            pro: language === 'cn' ? '29' : '5',
            elite: language === 'cn' ? '79' : '12',
        },
        yearly: {
            pro: language === 'cn' ? '199' : '29',
            elite: language === 'cn' ? '599' : '89',
            savePro: language === 'cn' ? '¥149' : '$31',
            saveElite: language === 'cn' ? '¥349' : '$55',
            totalPro: language === 'cn' ? '199' : '29',
            totalElite: language === 'cn' ? '599' : '89'
        }
    };

    const [showEarlyBirdModal, setShowEarlyBirdModal] = useState(false);

    const FeatureItem = ({ text, highlight = false }: { text: string, highlight?: boolean }) => (
        <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-0.5 rounded-full flex-shrink-0 ${highlight ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-emerald-400'}`}>
                <Check className="w-2.5 h-2.5" strokeWidth={4} />
            </div>
            <span className={`text-sm leading-tight ${highlight ? 'text-white font-medium' : 'text-slate-400'}`}>{text}</span>
        </div>
    );

    return (
        <>
            {/* Early Bird Modal */}
            {showEarlyBirdModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-amber-500/30 shadow-2xl shadow-amber-500/20">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Crown className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {language === 'cn' ? '早鸟终身买断' : 'Lifetime Early Bird'}
                            </h3>
                            <div className="text-4xl font-black text-amber-500 mb-4">¥1999</div>
                            <p className="text-slate-400 mb-6">
                                {language === 'cn'
                                    ? '限前100名用户，一次付费终身使用 Elite 所有功能。支付功能即将开放，如需预约请添加微信。'
                                    : 'Limited to first 100 users. One-time payment for lifetime Elite access. Payment coming soon, add WeChat to reserve.'}
                            </p>
                            <div className="bg-slate-800 rounded-lg p-4 mb-6">
                                <p className="text-sm text-slate-400 mb-2">{language === 'cn' ? '添加微信预约：' : 'WeChat to reserve:'}</p>
                                <p className="text-xl font-bold text-white">your_wechat_id</p>
                            </div>
                            <button
                                onClick={() => setShowEarlyBirdModal(false)}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors"
                            >
                                {language === 'cn' ? '知道了' : 'Got it'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto md:overflow-hidden">
            
            {/* Main Container */}
            <div className="w-full max-w-7xl relative flex flex-col items-center">
                
                {/* Header Section */}
                <div className="text-center mb-8 relative z-10 w-full">
                    <button 
                        onClick={closePricing}
                        className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                        {language === 'cn' ? '解锁全套交易工具' : 'Unlock Your Trading Edge'}
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-4">
                        {language === 'cn' ? '加入前 5% 的盈利交易员行列，用专业数据武装自己。' : 'Stop guessing. Start trading with institutional-grade data and AI coaching.'}
                    </p>

                    {/* Beta Notice */}
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-5 py-2.5 rounded-full mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                        {language === 'cn' ? '目前 TraderGrad 正在内测中，所有功能均免费测试使用。' : 'TraderGrad is currently in beta — all features are free to use.'}
                    </div>

                    {/* Billing Toggle */}
                    <div className="inline-flex bg-slate-900 p-1 rounded-full border border-slate-800 relative">
                        <div className={`absolute top-1 bottom-1 w-[50%] bg-indigo-600 rounded-full transition-all duration-300 shadow-lg ${billingCycle === 'monthly' ? 'left-1' : 'left-[49%]'}`}></div>
                        <button 
                            onClick={() => setBillingCycle('monthly')}
                            className="relative z-10 px-8 py-2.5 rounded-full text-sm font-bold text-white transition-colors w-32"
                        >
                            {language === 'cn' ? '月付' : 'Monthly'}
                        </button>
                        <button 
                            onClick={() => setBillingCycle('yearly')}
                            className="relative z-10 px-8 py-2.5 rounded-full text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 w-32"
                        >
                            {language === 'cn' ? '年付' : 'Yearly'}
                        </button>
                        
                        {/* Discount Badge */}
                        <div className="absolute -right-24 top-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-bounce hidden md:block">
                            {language === 'cn' ? '省 30%' : 'SAVE 30%'}
                        </div>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start perspective-1000">
                    
                    {/* 1. Free Plan */}
                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 hover:border-slate-700 transition-all duration-300 relative group">
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:text-white transition-colors">
                                <Star className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{language === 'cn' ? "基础版" : "Basic"}</h3>
                            <p className="text-sm text-slate-500 mt-1">{language === 'cn' ? "适合刚开始的新手" : "For beginners just starting out"}</p>
                        </div>
                        
                        <div className="mb-8">
                            <div className="flex items-baseline">
                                <span className="text-4xl font-black text-white">{currency}0</span>
                                <span className="text-slate-500 ml-1">/ mo</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 h-4"></p>
                        </div>

                        <button 
                            onClick={() => { if(user.tier === 'free') closePricing(); }}
                            disabled={user.tier === 'free'}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all border border-slate-700 ${user.tier === 'free' ? 'bg-slate-800 text-slate-500 cursor-default' : 'bg-transparent text-white hover:bg-slate-800'}`}
                        >
                            {user.tier === 'free' ? (language === 'cn' ? '当前方案' : 'Current Plan') : (language === 'cn' ? '降级' : 'Downgrade')}
                        </button>

                        <div className="mt-8 space-y-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Features</p>
                            <FeatureItem text={language === 'cn' ? "手动记录交易" : "Manual Trade Logging"} />
                            <FeatureItem text={language === 'cn' ? "基础数据统计" : "Basic Analytics"} />
                            <FeatureItem text={language === 'cn' ? "仅限 100 条历史" : "Last 100 Trades Only"} />
                            <FeatureItem text={language === 'cn' ? "社区访问权限" : "Community Access"} />
                        </div>
                    </div>

                    {/* 2. Pro Plan (HERO) */}
                    <div className="relative transform md:-translate-y-4 z-10">
                        {/* Most Popular Header Banner */}
                        <div className="bg-indigo-500 text-white text-center py-2 rounded-t-3xl font-bold text-sm flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4 fill-current" />
                            {t.pricing.mostPopular}
                        </div>
                        
                        <div className="bg-slate-900 rounded-b-3xl rounded-t-none p-8 border-x-2 border-b-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)] relative overflow-hidden">
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none"></div>

                            <div className="mb-6 relative">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg shadow-indigo-500/30">
                                    <Crown className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Pro Trader</h3>
                                <p className="text-sm text-indigo-300 mt-1">{language === 'cn' ? "严肃交易者的首选" : "Everything you need to scale"}</p>
                            </div>
                            
                            <div className="mb-8 relative">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-white tracking-tight">
                                        {currency}{billingCycle === 'yearly' ? pricing.yearly.pro : pricing.monthly.pro}
                                    </span>
                                    <span className="text-slate-400 font-medium">/ mo</span>
                                </div>
                                
                                {billingCycle === 'yearly' ? (
                                    <>
                                        <div className="text-sm text-slate-400 font-medium mt-1">
                                            {currency}{pricing.yearly.totalPro}/{language === 'cn' ? '年' : 'year'}
                                        </div>
                                        <div className="mt-3 inline-flex items-center gap-2 bg-indigo-900/30 px-2 py-1 rounded border border-indigo-500/30">
                                            <span className="text-xs text-indigo-300 line-through">{currency}{Number(pricing.monthly.pro) * 12}</span>
                                            <span className="text-xs text-indigo-400 font-bold">{language === 'cn' ? `立省 ${pricing.yearly.savePro}` : `Save ${pricing.yearly.savePro}`}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-9"></div> 
                                )}
                            </div>

                            <button
                                disabled
                                className="w-full py-4 rounded-xl font-bold text-sm bg-slate-800 text-slate-500 cursor-default flex items-center justify-center gap-2"
                            >
                                {language === 'cn' ? '内测期间免费开放' : 'Free During Beta'}
                            </button>
                            
                            {!user.tier && <p className="text-[10px] text-center text-slate-500 mt-3">{language === 'cn' ? '7天免费试用，随后按年收费' : '7-day free trial, then billed yearly'}</p>}

                            <div className="mt-8 space-y-5">
                                <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Analytics</p>
                                    <div className="space-y-3">
                                        <FeatureItem text={language === 'cn' ? "无限历史数据存储" : "Unlimited Trade History"} highlight />
                                        <FeatureItem text={language === 'cn' ? "高级盈亏日历 & 热力图" : "Advanced Calendar & Heatmaps"} highlight />
                                        <FeatureItem text={language === 'cn' ? "CSV 自动导入" : "Auto-Sync Broker Data"} highlight />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">AI & Growth</p>
                                    <div className="space-y-3">
                                        <FeatureItem text={language === 'cn' ? "AI 交易教练 (每日复盘)" : "AI Trade Coach (Daily Review)"} highlight />
                                        <FeatureItem text={language === 'cn' ? "策略回测引擎" : "Strategy Backtesting Engine"} highlight />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Elite Plan */}
                    <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 hover:border-amber-500/30 transition-all duration-300 group">
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-amber-500 group-hover:scale-110 transition-transform">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Elite</h3>
                            <p className="text-sm text-slate-500 mt-1">{language === 'cn' ? "全职交易员/机构" : "For full-time scalpers"}</p>
                        </div>
                        
                        <div className="mb-8">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">
                                    {currency}{billingCycle === 'yearly' ? pricing.yearly.elite : pricing.monthly.elite}
                                </span>
                                <span className="text-slate-500 font-medium">/ mo</span>
                            </div>
                            
                            {billingCycle === 'yearly' ? (
                                <>
                                    <p className="text-sm text-slate-400 font-medium mt-1">
                                        {currency}{pricing.yearly.totalElite}/{language === 'cn' ? '年' : 'year'}
                                    </p>
                                    <p className="text-xs text-amber-500 mt-2 bg-amber-900/20 inline-block px-2 py-0.5 rounded">
                                        {language === 'cn' ? `立省 ${pricing.yearly.saveElite}` : `Save ${pricing.yearly.saveElite}`}
                                    </p>
                                </>
                            ) : <div className="h-10"></div>}
                        </div>

                        <button
                            disabled
                            className="w-full py-3.5 rounded-xl font-bold text-sm bg-slate-800 border border-slate-800 text-slate-500 cursor-default"
                        >
                            {language === 'cn' ? '内测期间免费开放' : 'Free During Beta'}
                        </button>

                        {/* Early Bird Lifetime Deal */}
                        <button
                            onClick={() => setShowEarlyBirdModal(true)}
                            className="w-full mt-3 text-center text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium"
                        >
                            {language === 'cn' ? '🎁 早鸟买断 ¥1999 终身 · 限前100名' : '🎁 Lifetime Deal ¥1999 · First 100 Only'}
                        </button>

                        <div className="mt-8 space-y-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">VIP Access</p>
                            <FeatureItem text={language === 'cn' ? "包含 Pro 版所有功能" : "Everything in Pro"} />
                            <FeatureItem text={language === 'cn' ? "专属导师交流群" : "Private Mentor Group Access"} />
                            <FeatureItem text={language === 'cn' ? "实时交易信号" : "Live Trading Signals"} />
                            <FeatureItem text={language === 'cn' ? "1对1 账户诊断" : "1-on-1 Monthly Audit"} />
                            <FeatureItem text={language === 'cn' ? "优先客服支持" : "Priority Support"} />
                        </div>
                    </div>

                </div>

                {/* Footer Trust Indicators */}
                <div className="mt-12 flex flex-col md:flex-row items-center gap-6 md:gap-12 opacity-60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <ShieldCheck className="w-4 h-4" /> 
                        {language === 'cn' ? 'SSL 安全支付' : 'Secure SSL Payment'}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <HelpCircle className="w-4 h-4" />
                        {language === 'cn' ? '7天无理由退款' : '7-Day Money-Back Guarantee'}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <div className="flex -space-x-2">
                            <div className="w-5 h-5 rounded-full bg-slate-600 border border-slate-900"></div>
                            <div className="w-5 h-5 rounded-full bg-slate-500 border border-slate-900"></div>
                            <div className="w-5 h-5 rounded-full bg-slate-400 border border-slate-900"></div>
                        </div>
                        {language === 'cn' ? '15,000+ 交易员都在用' : 'Trusted by 15,000+ Traders'}
                    </div>
                </div>

            </div>
        </>
    );
};

export default PricingModal;
