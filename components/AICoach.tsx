
import React, { useState } from 'react';
import { Trade } from '../types';
import { analyzeJournal } from '../services/geminiService';
import { Bot, Sparkles, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import FeatureGate from './FeatureGate';

interface AICoachProps {
  trades: Trade[];
}

const AICoach: React.FC<AICoachProps> = ({ trades }) => {
  const { t, language } = useLanguage();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyzeJournal(trades, language);
      setAnalysis(result);
    } catch (err) {
      setError(t.aiCoach.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-full min-h-[600px] relative">
      <FeatureGate tier="pro">
        <div className="text-center space-y-4 py-8">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full mb-2">
                <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.aiCoach.title}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            {t.aiCoach.subtitle}
            </p>
            
            {!analysis && !loading && (
                <button 
                    onClick={handleAnalyze}
                    className="mt-6 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
                >
                    <Sparkles className="w-5 h-5" />
                    {t.aiCoach.analyzeBtn}
                </button>
            )}
        </div>

        {loading && (
            <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400 animate-pulse">{t.aiCoach.analyzing.replace('{count}', trades.length.toString())}</p>
            </div>
        )}

        {error && (
            <div className="p-4 bg-rose-100 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-300 text-center">
                {error}
            </div>
        )}

        {analysis && !loading && (
            <div className="space-y-6 animate-fade-in-up">
                {/* Summary Section */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Bot className="w-32 h-32" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.aiCoach.summary}</h3>
                    <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis.insights.map((insight: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                {insight.type === 'positive' && <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
                                {insight.type === 'negative' && <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400" />}
                                {insight.type === 'neutral' && <Bot className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                                <span className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide opacity-80">{insight.type}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{insight.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{insight.description}</p>
                        </div>
                    ))}
                </div>

                {/* Coach Message */}
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/50 dark:to-slate-900 p-8 rounded-xl border border-indigo-100 dark:border-indigo-500/30 transition-colors">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                        {t.aiCoach.coachMessage}
                    </h3>
                    <p className="text-slate-700 dark:text-slate-200 italic border-l-4 border-indigo-500 pl-4 py-2 bg-white dark:bg-slate-800/50 rounded-r-lg">
                        "{analysis.coachMessage}"
                    </p>
                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={handleAnalyze}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t.aiCoach.reAnalyze}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </FeatureGate>
    </div>
  );
};

export default AICoach;
