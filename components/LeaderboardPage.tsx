
import React, { useState } from 'react';
import { ArrowLeft, Share2, Award, Clock, Trophy, Medal, ThumbsUp, UserPlus, Zap } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface LeaderboardPageProps {
    onBack: () => void;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onBack }) => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [subTab, setSubTab] = useState<'pnl' | 'volume'>('pnl');

    const leaderboardData = [
        { rank: 1, name: "음메음메", pnl: 761654.13, reward: 4000 },
        { rank: 2, name: "08****0", pnl: 237836.70, reward: 2000 },
        { rank: 3, name: "찹살", pnl: 232604.18, reward: 1200 },
        { rank: 4, name: "Cypt0_h1gh", pnl: 216526.57, reward: 400 },
        { rank: 5, name: "43****4", pnl: 200113.56, reward: 400 },
        { rank: 6, name: "Gyeonggido", pnl: 165890.73, reward: 400 },
        { rank: 7, name: "bountyjager", pnl: 145450.20, reward: 400 },
        { rank: 8, name: "26****4", pnl: 95049.74, reward: 400 },
        { rank: 9, name: "24****1", pnl: 93728.73, reward: 400 },
        { rank: 10, name: "Yoyowbey", pnl: 80326.10, reward: 400 },
    ];

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-amber-400" fill="currentColor" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" fill="currentColor" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" fill="currentColor" />;
        return <span className="font-mono font-bold text-slate-400">{rank}</span>;
    };

    return (
        <div className="min-h-full bg-slate-950 text-white relative overflow-hidden animate-fade-in">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Back Button */}
            <button 
                onClick={onBack}
                className="absolute top-6 left-6 z-50 p-2 bg-slate-900/50 backdrop-blur-md rounded-full text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
                
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-indigo-400">
                        <Zap className="w-4 h-4" /> {t.leaderboard.title}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                        {t.leaderboard.subtitle} <br/>
                        <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
                            $80,000
                        </span>
                    </h1>
                    
                    <div className="flex justify-center gap-4 text-sm font-medium mb-12">
                        <span className="text-slate-400">Event Period: 2025-12-01 00:00 ~ 2026-01-01 00:00</span>
                        <div className="flex gap-4">
                            <button className="text-white hover:text-amber-400 transition-colors border border-white/20 px-4 py-1 rounded-full hover:bg-white/5">{t.leaderboard.invite}</button>
                            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-1 rounded-full transition-colors shadow-lg shadow-indigo-500/20">{t.leaderboard.register}</button>
                        </div>
                    </div>

                    {/* Prize Pool Progress */}
                    <div className="max-w-3xl mx-auto mb-16">
                        <h3 className="text-xl font-bold mb-8">{t.leaderboard.prizePool}</h3>
                        <div className="flex justify-between text-sm text-slate-400 mb-2">
                            <div className="text-left">
                                <p className="text-xs mb-1">{t.leaderboard.registeredUsers}</p>
                                <p className="text-2xl font-bold text-white">19,106</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs mb-1">{t.leaderboard.unlockedPool}</p>
                                <p className="text-2xl font-bold text-amber-400">80,000</p>
                            </div>
                        </div>
                        
                        {/* Progress Bar Container */}
                        <div className="relative h-2 bg-slate-800 rounded-full mt-4">
                            <div className="absolute top-0 left-0 h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" style={{ width: '80%' }}></div>
                            
                            {/* Milestones */}
                            {[0, 30, 60, 80, 100].map((pct) => (
                                <div key={pct} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 border-2 border-amber-500 rounded-full" style={{ left: `${pct}%` }}></div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                            <span>0</span>
                            <span>5,000</span>
                            <span>10,000</span>
                            <span>20,000</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-amber-500/50 mt-1 font-mono">
                            <span>30,000</span>
                            <span>60,000</span>
                            <span>80,000</span>
                            <span>100,000</span>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                        <div className="flex bg-slate-950 p-1 rounded-xl">
                            {(['daily', 'weekly', 'monthly'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                        activeTab === tab 
                                        ? 'bg-indigo-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {t.leaderboard[`${tab}Rank` as keyof typeof t.leaderboard]}
                                    {tab === 'monthly' && (
                                        <div className="flex items-center gap-1 text-[10px] font-normal opacity-80 mt-0.5 justify-center">
                                            <Trophy className="w-3 h-3" /> $80,000
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* CTA Banner */}
                        <div className="flex-1 w-full md:w-auto bg-indigo-900/20 border border-indigo-500/20 rounded-xl px-4 py-3 flex justify-between items-center text-xs md:text-sm">
                            <span className="text-indigo-200">You haven't joined this round yet.</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 border border-indigo-500/50 rounded-lg hover:bg-indigo-500/10 transition-colors flex items-center gap-1">
                                    <Share2 className="w-3 h-3" /> Share
                                </button>
                                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                    Register Now
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sub Tabs & Timer */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setSubTab('pnl')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${subTab === 'pnl' ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                {t.leaderboard.pnlRanking}
                            </button>
                            <button 
                                onClick={() => setSubTab('volume')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${subTab === 'volume' ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                {t.leaderboard.volRanking}
                            </button>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-xs mb-1">{t.leaderboard.desc}</p>
                            <p className="text-amber-500 text-xs font-mono font-bold flex items-center justify-end gap-2">
                                <Clock className="w-3 h-3" />
                                {t.leaderboard.countdown}: 16 D 01 H 47 m 45 s
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                                    <th className="py-4 px-6 text-center w-24">{t.leaderboard.table.rank}</th>
                                    <th className="py-4 px-6">{t.leaderboard.table.user}</th>
                                    <th className="py-4 px-6 text-right">{t.leaderboard.table.pnl}</th>
                                    <th className="py-4 px-6 text-right">{t.leaderboard.table.reward}</th>
                                    <th className="py-4 px-6 text-right">{t.leaderboard.table.interactions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {leaderboardData.map((row) => (
                                    <tr key={row.rank} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex justify-center items-center">
                                                {getRankIcon(row.rank)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-bold text-slate-200 group-hover:text-white transition-colors">
                                            {row.name}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">
                                            ${row.pnl.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-amber-400">
                                            ${row.reward.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-[10px] text-slate-300 transition-colors flex items-center gap-1 border border-slate-700">
                                                    <UserPlus className="w-3 h-3" /> {t.leaderboard.recommend}
                                                </button>
                                                <button className="p-1.5 hover:bg-slate-800 rounded-full text-slate-500 hover:text-amber-500 transition-colors">
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LeaderboardPage;
