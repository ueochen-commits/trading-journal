
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import { Calculator, AlertTriangle, TrendingUp, CheckCircle2, Circle } from 'lucide-react';

const PositionCalculator: React.FC = () => {
    const { t, language } = useLanguage();
    
    // State
    const [accountSize, setAccountSize] = useState(10000);
    const [riskPercent, setRiskPercent] = useState(1.0);
    const [entry, setEntry] = useState(0);
    const [stopLoss, setStopLoss] = useState(0);
    const [target, setTarget] = useState(0);
    
    // Checklist State
    const [checklist, setChecklist] = useState({
        step1: false,
        step2: false,
        step3: false,
        step4: false,
        step5: false
    });

    // Calculations
    const results = useMemo(() => {
        if (!entry || !stopLoss) return null;
        
        const riskAmount = accountSize * (riskPercent / 100);
        const distance = Math.abs(entry - stopLoss);
        if (distance === 0) return null;
        
        const quantity = riskAmount / distance;
        
        let rewardAmount = 0;
        let rr = 0;
        
        if (target) {
            const rewardDistance = Math.abs(target - entry);
            rewardAmount = rewardDistance * quantity;
            rr = rewardAmount / riskAmount;
        }

        return {
            quantity: quantity,
            riskAmount,
            rewardAmount,
            rr,
            distance
        };
    }, [accountSize, riskPercent, entry, stopLoss, target]);

    const isChecklistComplete = Object.values(checklist).every(Boolean);

    // Visual Bar Logic
    const getBarWidths = () => {
        if (!results || !target) return { risk: 50, reward: 0 };
        const totalDist = results.distance + Math.abs(target - entry);
        const riskW = (results.distance / totalDist) * 100;
        const rewardW = (Math.abs(target - entry) / totalDist) * 100;
        return { risk: riskW, reward: rewardW };
    };

    const { risk: riskWidth, reward: rewardWidth } = getBarWidths();

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-full mb-4">
                    <Calculator className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.calculator.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{t.calculator.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Input Section */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">Trade Parameters</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.balance}</label>
                                <input 
                                    type="number" 
                                    value={accountSize}
                                    onChange={e => setAccountSize(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.risk}</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={riskPercent}
                                    onChange={e => setRiskPercent(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.entry}</label>
                                <input 
                                    type="number" 
                                    value={entry}
                                    onChange={e => setEntry(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.stopLoss}</label>
                                <input 
                                    type="number" 
                                    value={stopLoss}
                                    onChange={e => setStopLoss(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.target}</label>
                                <input 
                                    type="number" 
                                    value={target}
                                    onChange={e => setTarget(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results Display */}
                    {results && (
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{t.calculator.results}</h4>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
                                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase">{t.calculator.units}</p>
                                    <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{results.quantity.toFixed(4)}</p>
                                </div>
                                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30">
                                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase">{t.calculator.riskAmount}</p>
                                    <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">${results.riskAmount.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Visual R:R Bar */}
                            {target > 0 && (
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-rose-500">1R Risk</span>
                                        <span className={results.rr >= 2 ? "text-emerald-500" : "text-amber-500"}>{results.rr.toFixed(2)}R Reward</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                        <div style={{ width: `${riskWidth}%` }} className="h-full bg-rose-500"></div>
                                        <div style={{ width: `${rewardWidth}%` }} className="h-full bg-emerald-500"></div>
                                    </div>
                                    {results.rr < 1.5 && (
                                        <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Risk:Reward is low (&#60; 1.5)
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 5-Step Checklist */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        {t.calculator.fiveStep}
                    </h3>
                    <p className="text-slate-400 text-xs mb-6">Complete this before placing any order.</p>

                    <div className="flex-1 space-y-4">
                        {[
                            { key: 'step1', label: t.calculator.step1 },
                            { key: 'step2', label: t.calculator.step2 },
                            { key: 'step3', label: t.calculator.step3 },
                            { key: 'step4', label: t.calculator.step4 },
                            { key: 'step5', label: t.calculator.step5 },
                        ].map((item) => (
                            <div 
                                key={item.key}
                                onClick={() => setChecklist(prev => ({...prev, [item.key]: !prev[item.key as keyof typeof checklist]}))}
                                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                                    checklist[item.key as keyof typeof checklist] 
                                    ? 'bg-emerald-500/20 border-emerald-500/50' 
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                {checklist[item.key as keyof typeof checklist] 
                                    ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    : <Circle className="w-6 h-6 text-slate-500" />
                                }
                                <span className={`font-bold ${checklist[item.key as keyof typeof checklist] ? 'text-white' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className={`mt-6 p-4 rounded-xl text-center font-bold transition-all ${isChecklistComplete ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-slate-800 text-slate-500'}`}>
                        {isChecklistComplete ? "READY TO EXECUTE" : "COMPLETE CHECKLIST FIRST"}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PositionCalculator;
