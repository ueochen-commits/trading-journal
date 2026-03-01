
import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { RiskSettings } from '../types';
import { ShieldAlert, ArrowRight, CheckCircle2, TrendingUp, AlertTriangle, Shield, HelpCircle } from 'lucide-react';

interface RiskAssessmentModalProps {
    isOpen: boolean;
    onComplete: (settings: RiskSettings) => void;
    onClose: () => void;
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative ml-1.5 inline-flex">
        <HelpCircle className="w-3 h-3 text-slate-400 cursor-help hover:text-indigo-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center leading-snug">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

const RiskAssessmentModal: React.FC<RiskAssessmentModalProps> = ({ isOpen, onComplete, onClose }) => {
    const { language, t } = useLanguage();
    const [step, setStep] = useState(1);
    
    // Form State
    const [accountSize, setAccountSize] = useState<number>(10000);
    const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'pro'>('beginner');
    const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
    const [drawdownPain, setDrawdownPain] = useState<number>(500); // Amount that hurts to lose in a day

    // Analysis Result State
    const [recommendedSettings, setRecommendedSettings] = useState<RiskSettings | null>(null);
    const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);

    if (!isOpen) return null;

    const handleAnalyze = () => {
        const warnings: string[] = [];
        
        // 1. Calculate Recommended Risk Per Trade
        let riskPerTradePct = 0.01; // Default 1%
        if (riskTolerance === 'conservative') riskPerTradePct = 0.005; // 0.5%
        if (riskTolerance === 'aggressive') riskPerTradePct = 0.02; // 2%

        // Downgrade risk if beginner
        if (experience === 'beginner' && riskPerTradePct > 0.01) {
            riskPerTradePct = 0.01;
            warnings.push(language === 'cn' 
                ? "对于新手交易者，我们强烈建议单笔风险不要超过 1%，即使你选择了激进模式。" 
                : "For beginners, we strongly recommend keeping risk under 1% per trade, even if you feel aggressive.");
        }

        const maxTradeRisk = Math.floor(accountSize * riskPerTradePct);

        // 2. Calculate Max Daily Loss
        // Usually 3x single trade risk, OR the user's "Pain Point" if lower
        let calculatedDailyLoss = maxTradeRisk * 3;
        
        if (drawdownPain < calculatedDailyLoss) {
            calculatedDailyLoss = drawdownPain;
            warnings.push(language === 'cn'
                ? `您的心理止损点 ($${drawdownPain}) 低于标准风控模型的 3R ($${maxTradeRisk * 3})。已调整为您的心理舒适区。`
                : `Your psychological pain point ($${drawdownPain}) is lower than standard 3R risk. We adjusted to your comfort zone.`);
        } else if (drawdownPain > accountSize * 0.05) {
            // If user says they are okay losing > 5% a day, warn them hard
            calculatedDailyLoss = Math.floor(accountSize * 0.05); // Cap at 5% hard limit
            warnings.push(language === 'cn'
                ? "警告：您设置的单日亏损承受力过高 (>5%)。为了防止爆仓，建议将其限制在账户的 5% 以内。"
                : "WARNING: Your daily loss tolerance is dangerously high (>5%). We've capped it at 5% to prevent ruin.");
        }

        // 3. Max Consecutive Losses
        // Beginners tilt faster
        const maxConsecutiveLosses = experience === 'beginner' ? 3 : 4;

        // 4. Other Factors
        const dailyProfitTarget = calculatedDailyLoss * 1.5; // Aim for 1.5x daily risk
        const maxOpenPositions = experience === 'pro' ? 4 : 2; // Beginners shouldn't manage too many

        setRecommendedSettings({
            accountSize,
            maxDailyLoss: calculatedDailyLoss,
            maxTradeRisk: maxTradeRisk,
            maxConsecutiveLosses,
            maxOpenPositions,
            dailyProfitTarget
        });
        setAnalysisWarnings(warnings);
        setStep(3);
    };

    const handleFinalConfirm = () => {
        if (recommendedSettings) {
            onComplete(recommendedSettings);
        }
    };

    const ProgressBar = () => (
        <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 pb-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {language === 'cn' ? '风控配置向导' : 'Risk Calibration'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {language === 'cn' ? '让我们根据专业标准为您定制风控参数' : 'Lets tailor your risk parameters to professional standards'}
                            </p>
                        </div>
                    </div>
                    <ProgressBar />
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    
                    {/* STEP 1: Account & Experience */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in-right">
                            <div>
                                <label className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    {language === 'cn' ? '账户总资金 ($)' : 'Total Account Size ($)'} <InfoTooltip text={t.risk.tooltips.accountSize} />
                                </label>
                                <input 
                                    type="number" 
                                    value={accountSize}
                                    onChange={e => setAccountSize(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    {language === 'cn' ? '您的交易经验' : 'Your Experience Level'} <InfoTooltip text={t.risk.tooltips.experience} />
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'beginner', label: language === 'cn' ? '新手 (<1年)' : 'Beginner (<1yr)', desc: language === 'cn' ? '还在学习基础，容易情绪化' : 'Learning basics, prone to emotions' },
                                        { id: 'intermediate', label: language === 'cn' ? '进阶 (1-3年)' : 'Intermediate (1-3yrs)', desc: language === 'cn' ? '有一定系统，但不够稳定' : 'Have a system, consistent-ish' },
                                        { id: 'pro', label: language === 'cn' ? '专业 (>3年)' : 'Pro (>3yrs)', desc: language === 'cn' ? '全职交易，稳定盈利' : 'Full-time, consistently profitable' }
                                    ].map((opt) => (
                                        <div 
                                            key={opt.id}
                                            onClick={() => setExperience(opt.id as any)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                experience === opt.id 
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className={`font-bold ${experience === opt.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                                                {experience === opt.id && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {language === 'cn' ? '下一步' : 'Next Step'} <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Psychology */}
                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in-right">
                            <div>
                                <label className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    {language === 'cn' ? '风险偏好' : 'Risk Appetite'} <InfoTooltip text={t.risk.tooltips.riskAppetite} />
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'conservative', label: language === 'cn' ? '保守 (Low)' : 'Conservative' },
                                        { id: 'moderate', label: language === 'cn' ? '稳健 (Mid)' : 'Moderate' },
                                        { id: 'aggressive', label: language === 'cn' ? '激进 (High)' : 'Aggressive' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setRiskTolerance(opt.id as any)}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                                                riskTolerance === opt.id
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    {language === 'cn' ? '“疼痛”阈值' : '"Pain" Threshold'} <InfoTooltip text={t.risk.tooltips.painThreshold} />
                                </label>
                                <p className="text-xs text-slate-500 mb-3">
                                    {language === 'cn' ? '当一天亏损多少钱时，你会感到情绪失控或想要报复市场？' : 'At what daily loss amount do you start feeling emotional or wanting to revenge trade?'}
                                </p>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input 
                                        type="number" 
                                        value={drawdownPain}
                                        onChange={e => setDrawdownPain(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-3 text-lg font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleAnalyze}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {language === 'cn' ? '生成风控方案' : 'Generate Protocol'} <TrendingUp className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Results */}
                    {step === 3 && recommendedSettings && (
                        <div className="space-y-6 animate-fade-in-right">
                            <div className="text-center mb-4">
                                <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 mb-2">
                                    <Shield className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {language === 'cn' ? '风控协议已生成' : 'Risk Protocol Generated'}
                                </h3>
                            </div>

                            {analysisWarnings.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                                    <h4 className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm mb-2">
                                        <AlertTriangle className="w-4 h-4" /> 
                                        {language === 'cn' ? '风险调整建议' : 'Risk Adjustments'}
                                    </h4>
                                    <ul className="space-y-1">
                                        {analysisWarnings.map((w, i) => (
                                            <li key={i} className="text-xs text-amber-600 dark:text-amber-300 list-disc list-inside">
                                                {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="flex items-center text-xs text-slate-500 uppercase font-bold">
                                        Max Trade Risk <InfoTooltip text={t.risk.tooltips.maxTradeRisk} />
                                    </p>
                                    <p className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        ${recommendedSettings.maxTradeRisk}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="flex items-center text-xs text-slate-500 uppercase font-bold">
                                        Max Daily Loss <InfoTooltip text={t.risk.tooltips.maxDailyLoss} />
                                    </p>
                                    <p className="text-lg font-mono font-bold text-rose-500">
                                        ${recommendedSettings.maxDailyLoss}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="flex items-center text-xs text-slate-500 uppercase font-bold">
                                        Max Loss Streak <InfoTooltip text={t.risk.tooltips.maxConsecutiveLosses} />
                                    </p>
                                    <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {recommendedSettings.maxConsecutiveLosses} Trades
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="flex items-center text-xs text-slate-500 uppercase font-bold">
                                        Daily Profit Target <InfoTooltip text={t.risk.tooltips.dailyProfitTarget} />
                                    </p>
                                    <p className="text-lg font-mono font-bold text-emerald-500">
                                        ${recommendedSettings.dailyProfitTarget?.toFixed(0)}
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={handleFinalConfirm}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                {language === 'cn' ? '应用此配置' : 'Apply Settings'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RiskAssessmentModal;
