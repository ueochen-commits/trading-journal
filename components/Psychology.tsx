
import React, { useState, useEffect, useRef } from 'react';
import { RiskSettings, TradingRule, ReviewStatus } from '../types';
import { Brain, Smile, Frown, Meh, Wind, BookOpen, Clock, Activity, Zap, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import RiskManagement from './RiskManagement'; 
import RiskAssessmentModal from './RiskAssessmentModal';

interface PsychologyProps {
    riskSettings: RiskSettings;
    onSaveSettings: (settings: RiskSettings) => void;
    rules: TradingRule[];
    onToggleRule: (id: string) => void;
    onAddRule: (text: string) => void;
    onDeleteRule: (id: string) => void;
    reviewStatus: ReviewStatus;
    onUpdateReview: (type: 'daily' | 'weekly' | 'monthly') => void;
}

const Psychology: React.FC<PsychologyProps> = ({
    riskSettings,
    onSaveSettings,
    rules,
    onToggleRule,
    onAddRule,
    onDeleteRule,
    reviewStatus,
    onUpdateReview
}) => {
    const { t } = useLanguage();
    const [mood, setMood] = useState<number | null>(null); // 1-5
    const [isMeditating, setIsMeditating] = useState(false);
    const [timer, setTimer] = useState(60);
    const intervalRef = useRef<any>(null);
    const [showAssessment, setShowAssessment] = useState(false);

    // Check if user has done the risk assessment
    useEffect(() => {
        const hasDoneAssessment = localStorage.getItem('trade_risk_assessment_done');
        if (!hasDoneAssessment) {
            // Short delay for better UX
            setTimeout(() => setShowAssessment(true), 500);
        }
    }, []);

    const handleAssessmentComplete = (newSettings: RiskSettings) => {
        onSaveSettings(newSettings);
        localStorage.setItem('trade_risk_assessment_done', 'true');
        setShowAssessment(false);
        // Optionally trigger a toast or welcome message here
    };

    // Meditation Timer
    useEffect(() => {
        if (isMeditating && timer > 0) {
            intervalRef.current = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsMeditating(false);
            setTimer(60); // Reset
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isMeditating, timer]);

    const startMeditation = () => {
        setTimer(60);
        setIsMeditating(true);
    };

    const stopMeditation = () => {
        setIsMeditating(false);
        setTimer(60);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    // Helper for breathing text
    const getBreathingText = () => {
        if (timer > 40) return t.psychology.breatheIn;
        if (timer > 35) return t.psychology.hold;
        if (timer > 20) return t.psychology.breatheOut;
        if (timer > 15) return t.psychology.hold;
        return t.psychology.breatheIn; // Loop roughly
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12 relative">
            
            <RiskAssessmentModal 
                isOpen={showAssessment} 
                onClose={() => setShowAssessment(false)}
                onComplete={handleAssessmentComplete}
            />

            {/* Header */}
            <div className="text-center">
                <div className="inline-flex p-3 bg-rose-100 dark:bg-rose-900/20 rounded-full mb-4">
                    <Brain className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.psychology.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{t.psychology.subtitle}</p>
                <button 
                    onClick={() => setShowAssessment(true)}
                    className="mt-2 text-xs text-indigo-500 hover:underline"
                >
                    {t.psychology.recalibrate || "Recalibrate Risk Profile"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Emotion Check-in */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" /> {t.psychology.checkIn}
                    </h3>
                    
                    <p className="text-sm text-slate-500 mb-6">{t.psychology.howFeeling}</p>
                    
                    <div className="flex justify-between items-center gap-2">
                        <button onClick={() => setMood(1)} className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mood === 1 ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <Frown className={`w-8 h-8 ${mood === 1 ? 'text-rose-500' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">{t.psychology.fear}</span>
                        </button>
                        <button onClick={() => setMood(3)} className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mood === 3 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <Meh className={`w-8 h-8 ${mood === 3 ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">{t.psychology.neutral}</span>
                        </button>
                        <button onClick={() => setMood(5)} className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mood === 5 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <Smile className={`w-8 h-8 ${mood === 5 ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">{t.psychology.greed}</span>
                        </button>
                    </div>

                    {mood && (
                        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                            <div className="flex items-start gap-3">
                                <Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">AI Advice</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                        {mood === 1 ? "Fear can cause hesitation. Reduce position size by 50% to regain confidence." : 
                                         mood === 5 ? "Overconfidence kills accounts. Stick to your setup. Do not add to losers." : 
                                         "You are in a balanced state. Execute your plan without emotion."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Mindfulness Timer */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center">
                    {/* Background Animation circles */}
                    {isMeditating && (
                        <>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full animate-ping"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/20 rounded-full animate-pulse"></div>
                        </>
                    )}
                    
                    <div className="relative z-10">
                        <Wind className="w-12 h-12 mx-auto mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold mb-2">{t.psychology.meditation}</h3>
                        <p className="text-indigo-100 mb-8 max-w-sm mx-auto">{t.psychology.meditationDesc}</p>
                        
                        {isMeditating ? (
                            <div className="space-y-4">
                                <div className="text-5xl font-black font-mono tabular-nums">{timer}s</div>
                                <p className="text-lg font-medium animate-pulse">{getBreathingText()}</p>
                                <button onClick={stopMeditation} className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-bold transition-colors">Stop</button>
                            </div>
                        ) : (
                            <button onClick={startMeditation} className="px-8 py-3 bg-white text-indigo-600 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                                {t.psychology.startBreathe}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Mental Hacks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-rose-400 transition-colors group">
                    <BookOpen className="w-6 h-6 text-rose-500 mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">"{t.psychology.hack1}"</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-400 transition-colors group">
                    <BookOpen className="w-6 h-6 text-emerald-500 mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">"{t.psychology.hack2}"</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 transition-colors group">
                    <BookOpen className="w-6 h-6 text-indigo-500 mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">"{t.psychology.hack3}"</p>
                </div>
            </div>

            {/* 4. Risk & Discipline (Sub-Component) */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                <RiskManagement 
                    settings={riskSettings}
                    onSaveSettings={onSaveSettings}
                    rules={rules}
                    onToggleRule={onToggleRule}
                    onAddRule={onAddRule}
                    onDeleteRule={onDeleteRule}
                    reviewStatus={reviewStatus}
                    onUpdateReview={onUpdateReview}
                />
            </div>

        </div>
    );
};

export default Psychology;
