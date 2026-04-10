
import React, { useState } from 'react';
import { X, Shield, Bot, Database, LogOut, HelpCircle, ChevronLeft, Monitor, Smartphone, Check, Minus, FileText, BarChart2, Calendar } from 'lucide-react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';

type Panel = 'main' | 'overview' | 'benefits' | 'devices' | 'features' | 'stats';

const TIER_LIMITS = {
    free:  { ai: 5,   trades: 100,  aiLabel: '5次/天' },
    pro:   { ai: 100, trades: 1000, aiLabel: '100次/天' },
    elite: { ai: null, trades: null, aiLabel: '无限制' },
};

const UserProfileModal: React.FC = () => {
    const { isProfileOpen, closeProfile, user, openPricing, logout } = useUser();
    const { language } = useLanguage();
    const [panel, setPanel] = useState<Panel>('main');

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
    const tradeCount = user.tradeCount ?? 0;
    const tradeLimit = limits.trades;
    const tradePercent = tradeLimit ? Math.min(100, Math.round((tradeCount / tradeLimit) * 100)) : 0;

    const tierName = user.tier === 'free'
        ? (language === 'cn' ? '基础账户' : 'Basic')
        : user.tier === 'pro'
            ? (language === 'cn' ? '专业账户' : 'Pro')
            : (language === 'cn' ? '尊享账户' : 'Elite');

    const handleClose = () => { setPanel('main'); closeProfile(); };

    const PanelHeader = ({ title }: { title: string }) => (
        <div className="flex items-center gap-2 mb-7">
            <button
                onClick={() => setPanel('main')}
                className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-tight">{title}</span>
        </div>
    );

    // ── Panel: 账户一览 ──────────────────────────────────────────────
    const OverviewPanel = () => (
        <div className="p-8">
            <PanelHeader title={language === 'cn' ? '账户一览' : 'Account Overview'} />
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {([
                    { label: language === 'cn' ? '登录邮箱' : 'Email', value: user.email, mono: false, green: false },
                    { label: language === 'cn' ? '账户 ID' : 'Account ID', value: `TG-${(user.id ?? 'XXXXXXXX').slice(0, 8).toUpperCase()}`, mono: true, green: false },
                    { label: language === 'cn' ? '注册日期' : 'Joined', value: joinedDate, mono: false, green: false },
                    { label: language === 'cn' ? '账户级别' : 'Plan', value: `TradeGrail ${tierName}`, mono: false, green: false },
                    { label: language === 'cn' ? '到期时间' : 'Expires', value: user.tier === 'free' ? (language === 'cn' ? '永久有效' : 'No expiry') : subEndDate ?? '--', mono: false, green: false },
                    { label: language === 'cn' ? '账户状态' : 'Status', value: language === 'cn' ? '正常' : 'Active', mono: false, green: true },
                ] as { label: string; value: string; mono: boolean; green: boolean }[]).map(({ label, value, mono, green }) => (
                    <div key={label} className="flex justify-between items-center py-3.5">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                        <span className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${green ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // ── Panel: 权益说明 ──────────────────────────────────────────────
    const BenefitsPanel = () => {
        const features: { name: string; free: boolean | string; pro: boolean | string; elite: boolean | string }[] = [
            { name: language === 'cn' ? '交易记录条数' : 'Trade Records', free: '100', pro: '1,000', elite: language === 'cn' ? '无限制' : 'Unlimited' },
            { name: language === 'cn' ? 'AI 教练对话' : 'AI Coach', free: '5/天', pro: '100/天', elite: language === 'cn' ? '无限制' : 'Unlimited' },
            { name: language === 'cn' ? '截图上传分析' : 'Screenshot Analysis', free: false, pro: true, elite: true },
            { name: language === 'cn' ? '周报 / 月报生成' : 'Weekly/Monthly Reports', free: false, pro: true, elite: true },
            { name: language === 'cn' ? '多端同步' : 'Multi-device Sync', free: true, pro: true, elite: true },
            { name: language === 'cn' ? '数据导出' : 'Data Export', free: false, pro: true, elite: true },
            { name: language === 'cn' ? '优先客服支持' : 'Priority Support', free: false, pro: false, elite: true },
        ];
        const tiers = [
            { key: 'free' as const,  label: language === 'cn' ? '基础' : 'Basic', current: user.tier === 'free'  },
            { key: 'pro'  as const,  label: 'Pro',                                 current: user.tier === 'pro'   },
            { key: 'elite'as const,  label: 'Elite',                               current: user.tier === 'elite' },
        ];
        return (
            <div className="p-8">
                <PanelHeader title={language === 'cn' ? '权益说明' : 'Plan Benefits'} />
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left pb-4 w-1/2" />
                            {tiers.map(tier => (
                                <th key={tier.key} className="text-center pb-4">
                                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${tier.current ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                        {tier.label}{tier.current && (language === 'cn' ? ' · 当前' : ' · Now')}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {features.map(f => (
                            <tr key={f.name}>
                                <td className="py-3 text-slate-600 dark:text-slate-300">{f.name}</td>
                                {tiers.map(tier => (
                                    <td key={tier.key} className="py-3 text-center">
                                        {typeof f[tier.key] === 'boolean' ? (
                                            f[tier.key]
                                                ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                                : <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                                        ) : (
                                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{f[tier.key] as string}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!isElite && (
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button onClick={() => { handleClose(); openPricing(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded text-sm font-semibold transition-colors">
                            {language === 'cn' ? '升级账户' : 'Upgrade Account'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // ── Panel: 管理设备 ──────────────────────────────────────────────
    const DevicesPanel = () => {
        const devices = [
            { id: 1, name: language === 'cn' ? '当前设备' : 'This device', type: 'desktop', os: 'macOS', lastActive: language === 'cn' ? '刚刚' : 'Just now', current: true },
            { id: 2, name: 'iPhone 15 Pro', type: 'mobile', os: 'iOS 17', lastActive: language === 'cn' ? '2 小时前' : '2h ago', current: false },
            { id: 3, name: 'Windows PC', type: 'desktop', os: 'Windows 11', lastActive: language === 'cn' ? '3 天前' : '3d ago', current: false },
        ];
        return (
            <div className="p-8">
                <PanelHeader title={language === 'cn' ? '管理设备' : 'Manage Devices'} />
                <p className="text-xs text-slate-400 mb-5 -mt-2">{language === 'cn' ? '以下设备当前已登录你的账户。' : 'Devices currently signed in to your account.'}</p>
                <div className="space-y-2.5">
                    {devices.map(device => (
                        <div key={device.id} className="flex items-center justify-between px-4 py-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                                    {device.type === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{device.name}</span>
                                        {device.current && (
                                            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                                                {language === 'cn' ? '当前' : 'Current'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{device.os} · {language === 'cn' ? '最近活跃：' : 'Last active: '}{device.lastActive}</p>
                                </div>
                            </div>
                            {!device.current && (
                                <button className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors font-medium">
                                    {language === 'cn' ? '移除' : 'Remove'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ── Panel: 功能说明 ──────────────────────────────────────────────
    const FeaturesPanel = () => {
        const colorMap: Record<string, string> = {
            indigo:  'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
            violet:  'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
            emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
            amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
        };
        const features = [
            { icon: <Bot className="w-5 h-5" />, color: 'indigo', name: language === 'cn' ? 'AI 教练对话' : 'AI Coach', desc: language === 'cn' ? '基于你的交易记录，分析交易模式、识别常见错误，并提供针对性的改进建议。' : 'Analyzes your trade history to identify patterns, common mistakes, and provide targeted improvement suggestions.', limit: isElite ? (language === 'cn' ? '无限制' : 'Unlimited') : `${limits.ai}${language === 'cn' ? '次/天' : '/day'}` },
            { icon: <FileText className="w-5 h-5" />, color: 'violet', name: language === 'cn' ? '周报 / 月报生成' : 'Weekly / Monthly Reports', desc: language === 'cn' ? '自动汇总交易表现，生成包含盈亏分析、胜率统计、最佳与最差交易的专业报告。' : 'Auto-generates professional reports with P&L analysis, win rate stats, and best/worst trade breakdowns.', limit: isPro ? (language === 'cn' ? '已开通' : 'Included') : (language === 'cn' ? '需升级' : 'Upgrade required') },
            { icon: <BarChart2 className="w-5 h-5" />, color: 'emerald', name: language === 'cn' ? '截图上传分析' : 'Screenshot Analysis', desc: language === 'cn' ? '上传交易截图，自动识别并录入交易数据，省去手动输入的繁琐步骤。' : 'Upload trade screenshots and automatically extract and log trade data, eliminating manual entry.', limit: isPro ? (language === 'cn' ? '已开通' : 'Included') : (language === 'cn' ? '需升级' : 'Upgrade required') },
            { icon: <Calendar className="w-5 h-5" />, color: 'amber', name: language === 'cn' ? '交易日历视图' : 'Trade Calendar', desc: language === 'cn' ? '以日历形式直观展示每日盈亏，快速识别最佳和最差交易日。' : 'Visualize daily P&L in calendar format to quickly identify your best and worst trading days.', limit: language === 'cn' ? '全部账户' : 'All plans' },
        ];
        return (
            <div className="p-8">
                <PanelHeader title={language === 'cn' ? '功能说明' : 'Feature Details'} />
                <div className="space-y-6">
                    {features.map(f => (
                        <div key={f.name} className="flex gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[f.color]}`}>{f.icon}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-3 mb-1">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{f.name}</span>
                                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{f.limit}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ── Panel: 详细统计 ──────────────────────────────────────────────
    const StatsPanel = () => {
        const aiPercent = aiLimit ? Math.min(100, Math.round((aiUsed / aiLimit) * 100)) : 0;
        const accountDays = user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000) : null;
        return (
            <div className="p-8">
                <PanelHeader title={language === 'cn' ? '详细统计' : 'Usage Statistics'} />
                <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
                    <div>
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{language === 'cn' ? '交易记录' : 'Trade Records'}</span>
                            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{tradeCount.toLocaleString()} / {tradeLimit !== null ? tradeLimit.toLocaleString() : (language === 'cn' ? '无限制' : 'Unlimited')}</span>
                        </div>
                        {tradeLimit !== null && (
                            <>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${tradePercent > 80 ? 'bg-rose-500' : tradePercent > 60 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${tradePercent}%` }} />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">{language === 'cn' ? `已使用 ${tradePercent}% · 剩余 ${(tradeLimit - tradeCount).toLocaleString()} 条` : `${tradePercent}% used · ${(tradeLimit - tradeCount).toLocaleString()} remaining`}</p>
                            </>
                        )}
                    </div>
                    <div className="pt-6">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{language === 'cn' ? 'AI 今日用量' : 'AI Usage Today'}</span>
                            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{aiUsed} / {aiLimit !== null ? aiLimit : (language === 'cn' ? '无限制' : 'Unlimited')}</span>
                        </div>
                        {aiLimit !== null && (
                            <>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${aiPercent > 80 ? 'bg-rose-500' : aiPercent > 60 ? 'bg-amber-500' : 'bg-violet-500'}`} style={{ width: `${aiPercent}%` }} />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">{language === 'cn' ? `今日剩余 ${Math.max(0, aiLimit - aiUsed)} 次 · 每日 00:00 重置` : `${Math.max(0, aiLimit - aiUsed)} remaining today · Resets at midnight`}</p>
                            </>
                        )}
                    </div>
                    <div className="pt-6 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{language === 'cn' ? '账户使用天数' : 'Account Age'}</span>
                        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{accountDays !== null ? `${accountDays} ${language === 'cn' ? '天' : 'days'}` : '--'}</span>
                    </div>
                </div>
            </div>
        );
    };

    // ── Main panel ───────────────────────────────────────────────────
    const MainContent = () => (
        <div className="p-8 space-y-8">
            <div className="grid grid-cols-[80px_1fr] gap-y-6 text-sm">
                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">{language === 'cn' ? '登录账户:' : 'Account:'}</div>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base mb-1">{user.email}</p>
                        <p className="text-slate-400 text-xs">{joinedDate} {language === 'cn' ? '开始使用 TradeGrail' : 'Joined TradeGrail'}</p>
                    </div>
                    <button onClick={() => setPanel('overview')} className="text-indigo-600 hover:text-indigo-500 text-xs transition-colors">{language === 'cn' ? '账户一览' : 'Overview'}</button>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">{language === 'cn' ? '账户级别:' : 'Level:'}</div>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1.5 rounded-md ${isElite ? 'bg-amber-100 text-amber-600' : isPro ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                                <Shield className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">TradeGrail {tierName}</span>
                        </div>
                        <p className="text-slate-400 text-xs">
                            {language === 'cn' ? '到期日：' : 'Expires: '}
                            {user.tier === 'free' ? (language === 'cn' ? '永久有效' : 'No expiry') : subEndDate ?? '--'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setPanel('benefits')} className="text-indigo-600 hover:text-indigo-500 text-xs transition-colors">{language === 'cn' ? '权益说明' : 'Benefits'}</button>
                        {!isElite && (
                            <button onClick={() => { handleClose(); openPricing(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors">
                                {language === 'cn' ? '升级' : 'Upgrade'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">{language === 'cn' ? '设备:' : 'Devices:'}</div>
                <div className="flex justify-between items-start">
                    <div className="text-slate-700 dark:text-slate-300">{language === 'cn' ? '你的账户现在已在 3 台设备上登录' : 'Logged in on 3 devices currently'}</div>
                    <button onClick={() => setPanel('devices')} className="text-indigo-600 hover:text-indigo-500 text-xs transition-colors">{language === 'cn' ? '管理设备' : 'Manage'}</button>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-medium self-start pt-1">{language === 'cn' ? '专属邮箱:' : 'Email Gateway:'}</div>
                <div>
                    <span className="text-indigo-600 text-sm font-mono">upload.{user.name.replace(' ', '').toLowerCase()}@tradegrail.net</span>
                </div>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />
            <div className="grid grid-cols-[48px_1fr] gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 dark:text-white">TradeGrail AI</h4>
                        <div className="text-right">
                            <div className="text-xs text-slate-500">{language === 'cn' ? '今日已用: ' : 'Used today: '}<span className="text-slate-900 dark:text-white font-mono">{aiUsed}</span>{aiLimit !== null && <span className="text-slate-400"> / {aiLimit}</span>}</div>
                            <div className="text-xs text-slate-500">{language === 'cn' ? '每日上限: ' : 'Daily limit: '}<span className="text-slate-900 dark:text-white font-mono">{isElite ? (language === 'cn' ? '无限制' : 'Unlimited') : limits.aiLabel}</span></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{language === 'cn' ? '包含 AI 教练对话、周报及月报生成。' : 'Includes AI coach, weekly and monthly reports.'}</p>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setPanel('features')} className="text-indigo-600 hover:text-indigo-500 text-xs transition-colors">{language === 'cn' ? '功能说明' : 'Details'}</button>
                            {!isPro && (
                                <button onClick={() => { handleClose(); openPricing(); }} className="border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1 rounded text-xs font-bold transition-colors">
                                    {language === 'cn' ? '立即开通' : 'Subscribe'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />
            <div className="grid grid-cols-[48px_1fr] gap-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-slate-800 dark:text-white">{language === 'cn' ? '交易记录存储' : 'Trade Record Storage'}</h4>
                        <div className="font-mono text-sm text-slate-700 dark:text-slate-300">{tradeCount.toLocaleString()} / {tradeLimit !== null ? tradeLimit.toLocaleString() : (language === 'cn' ? '无限制' : 'Unlimited')}</div>
                    </div>
                    {tradeLimit !== null && (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${tradePercent}%` }} />
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{language === 'cn' ? '云端加密存储，支持多端同步。' : 'Encrypted cloud storage with multi-device sync.'}</p>
                        <button onClick={() => setPanel('stats')} className="text-indigo-600 hover:text-indigo-500 text-xs transition-colors">{language === 'cn' ? '详细统计' : 'Usage Stats'}</button>
                    </div>
                </div>
            </div>
            {!isElite && (
                <div className="mt-4">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 max-w-md">
                            {language === 'cn' ? '升级 TradeGrail 尊享会员，解锁无限记录、无限 AI 次数！' : 'Upgrade to TradeGrail Elite for unlimited records and AI usage!'}
                        </p>
                        <button onClick={() => { handleClose(); openPricing(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap ml-4 shadow-sm">
                            {language === 'cn' ? '升级账户' : 'Upgrade Account'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const panelMap: Record<Panel, React.ReactNode> = {
        main:     <MainContent />,
        overview: <OverviewPanel />,
        benefits: <BenefitsPanel />,
        devices:  <DevicesPanel />,
        features: <FeaturesPanel />,
        stats:    <StatsPanel />,
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{language === 'cn' ? '账户信息' : 'Account Info'}</h2>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-64 border-r border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center bg-slate-50/50 dark:bg-slate-950/30">
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
                    <div className="flex-1 overflow-y-auto">
                        {panelMap[panel]}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
