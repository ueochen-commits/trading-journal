
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
/* Added ArrowRight to imports */
import { Search, PlayCircle, BookOpen, Clock, Star, Lock, Zap, GraduationCap, CheckCircle2, ChevronRight, FileQuestion, ArrowLeft, ArrowRight, Trophy, BarChart3, AlertTriangle, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    instructor: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number; 
    rating: number;
    students: number;
    duration: string;
    lessons: number;
    thumbnail: string;
    category: string;
    tags: string[];
}

interface ExamQuestion {
    id: number;
    text: string;
    options: string[];
    correct: number; // Index
    topic: string;
}

const MOCK_COURSES: Course[] = [
    {
        id: '1',
        title: 'Risk Management 101',
        instructor: 'Dr. Alex Elder',
        level: 'Beginner',
        price: 0,
        rating: 4.8,
        students: 1205,
        duration: '2.5h',
        lessons: 12,
        thumbnail: 'bg-gradient-to-br from-emerald-400 to-cyan-500',
        category: 'Risk',
        tags: ['Free', 'Essential']
    },
    {
        id: '2',
        title: 'Price Action Masterclass',
        instructor: 'Sarah Tradez',
        level: 'Advanced',
        price: 199,
        rating: 4.9,
        students: 850,
        duration: '12h',
        lessons: 45,
        thumbnail: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        category: 'Strategy',
        tags: ['Premium', 'Best Seller']
    },
    {
        id: '3',
        title: 'Trading Psychology: The Inner Game',
        instructor: 'Mark Douglas AI',
        level: 'Intermediate',
        price: 0,
        rating: 4.7,
        students: 3400,
        duration: '4h',
        lessons: 20,
        thumbnail: 'bg-gradient-to-br from-orange-400 to-rose-500',
        category: 'Psychology',
        tags: ['Free']
    }
];

// CFA Exam Question Generator (Mocking 50 Questions)
const generateCfaQuestions = (count: number): ExamQuestion[] => {
    const topics = ['Ethics', 'Derivatives', 'Fixed Income', 'Portfolio Management', 'Equity', 'Alternative Investments'];
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        text: `CFA Level ${i % 2 === 0 ? 'II' : 'III'} Scenario: Which of the following best describes the ${topics[i % topics.length]} implications of a sudden increase in market volatility given a delta-neutral position?`,
        options: [
            "Gamma exposure leads to significant rebalancing costs.",
            "The position remains unaffected due to zero delta sensitivity.",
            "Theta decay will accelerate linearly relative to implied volatility."
        ],
        correct: 0,
        topic: topics[i % topics.length]
    }));
};

const CFA_QUESTIONS = generateCfaQuestions(50);

const Academy: React.FC = () => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'all' | 'free' | 'premium'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Exam States
    const [view, setView] = useState<'main' | 'exam' | 'result'>('main');
    const [currentQ, setCurrentQ] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [examScore, setExamScore] = useState(0);

    const filteredCourses = MOCK_COURSES.filter(course => {
        const matchesTab = activeTab === 'all' 
            ? true 
            : activeTab === 'free' ? course.price === 0 : course.price > 0;
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const handleStartExam = () => {
        setUserAnswers({});
        setCurrentQ(0);
        setView('exam');
    };

    const handleAnswer = (optionIdx: number) => {
        setUserAnswers({ ...userAnswers, [CFA_QUESTIONS[currentQ].id]: optionIdx });
    };

    const handleSubmitExam = () => {
        let score = 0;
        CFA_QUESTIONS.forEach(q => {
            if (userAnswers[q.id] === q.correct) score++;
        });
        setExamScore(score);
        setView('result');
    };

    const getEvaluation = (score: number) => {
        const pct = (score / 50) * 100;
        if (pct >= 85) return t.academy.exam.evaluation.expert;
        if (pct >= 70) return t.academy.exam.evaluation.advanced;
        if (pct >= 60) return t.academy.exam.evaluation.intermediate;
        if (pct >= 45) return t.academy.exam.evaluation.basic;
        return t.academy.exam.evaluation.poor;
    };

    const getScoreColor = (score: number) => {
        const pct = (score / 50) * 100;
        if (pct >= 70) return 'text-emerald-500';
        if (pct >= 60) return 'text-amber-500';
        return 'text-rose-500';
    };

    if (view === 'exam') {
        const q = CFA_QUESTIONS[currentQ];
        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                {/* Exam Header */}
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('main')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h3 className="font-bold text-lg">{t.academy.exam.cfaTitle}</h3>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{q.topic}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            Question {currentQ + 1} / 50
                        </p>
                        <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentQ + 1) / 50) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Question Body */}
                <div className="flex-1 max-w-3xl mx-auto w-full py-8 space-y-10">
                    <div className="space-y-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">ID: #CFA-2025-{q.id}</span>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">
                            {q.text}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {q.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                    userAnswers[q.id] === idx 
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-4 ring-indigo-500/10' 
                                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${userAnswers[q.id] === idx ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={`font-medium ${userAnswers[q.id] === idx ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>{opt}</span>
                                </div>
                                {userAnswers[q.id] === idx && <CheckCircle2 className="w-6 h-6 text-indigo-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <button 
                        disabled={currentQ === 0}
                        onClick={() => setCurrentQ(v => v - 1)}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold disabled:opacity-30"
                    >
                        Previous
                    </button>
                    {currentQ === 49 ? (
                        <button 
                            onClick={handleSubmitExam}
                            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Submit Exam
                        </button>
                    ) : (
                        <button 
                            disabled={userAnswers[q.id] === undefined}
                            onClick={() => setCurrentQ(v => v + 1)}
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            Next Question
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'result') {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 shadow-xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Trophy className="w-64 h-64" />
                    </div>
                    
                    <div className="relative z-10 space-y-6">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                            <Trophy className="w-10 h-10" />
                        </div>
                        
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {t.academy.exam.resultsTitle}
                        </h2>
                        
                        <div className="flex justify-center gap-12 py-10">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.academy.exam.scoreLabel}</p>
                                <p className={`text-6xl font-black font-mono ${getScoreColor(examScore)}`}>
                                    {examScore}<span className="text-2xl text-slate-400">/50</span>
                                </p>
                            </div>
                            <div className="w-px h-24 bg-slate-100 dark:bg-slate-800"></div>
                            <div className="text-left max-w-xs">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.academy.exam.ratingLabel}</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                                    {getEvaluation(examScore)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                            <button 
                                onClick={handleStartExam}
                                className="px-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" /> {t.academy.exam.retakeBtn}
                            </button>
                            <button 
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-5 h-5" /> {t.academy.exam.aiAnalysis}
                            </button>
                            <button 
                                onClick={() => setView('main')}
                                className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                            >
                                {t.academy.exam.backToAcademy}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Score Distribution Breakdown (Static Mock for visual quality) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Ethics', 'Derivatives', 'Economics'].map((topic, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-4">{topic}</h4>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-black font-mono">82%</span>
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">MASTERED</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-900/80 z-10"></div>
                <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"></div>
                
                <div className="relative z-20 p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="max-w-xl space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                            <Zap className="w-3 h-3" />
                            {language === 'cn' ? '全新上线' : 'New Feature'}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            {t.academy.title}
                        </h1>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            {t.academy.subtitle}
                        </p>
                        <div className="flex gap-4 pt-2">
                            <button className="px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">
                                {language === 'cn' ? '开始学习' : 'Start Learning'}
                            </button>
                            <button className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors backdrop-blur-sm">
                                {language === 'cn' ? '我的课程' : 'My Courses'}
                            </button>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center justify-center">
                        <div className="w-48 h-48 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl rotate-6 shadow-2xl flex items-center justify-center border-4 border-white/10">
                            <GraduationCap className="w-24 h-24 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Courses (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
                            {(['all', 'free', 'premium'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none capitalize ${
                                        activeTab === tab 
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {t.academy.filters[tab]}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder={t.academy.search}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none outline-none pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCourses.map(course => (
                            <div key={course.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                                <div className={`h-48 w-full ${course.thumbnail} relative p-6 flex flex-col justify-between`}>
                                    <div className="flex justify-between items-start">
                                        <span className="bg-black/30 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                            {course.level}
                                        </span>
                                        {course.price > 0 ? (
                                            <span className="bg-white text-indigo-900 text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                                <Lock className="w-3 h-3" /> ${course.price}
                                            </span>
                                        ) : (
                                            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                                FREE
                                            </span>
                                        )}
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <button className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                                            <PlayCircle className="w-4 h-4" /> Preview
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessons} Lessons</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors line-clamp-2">{course.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">by {course.instructor}</p>
                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                                            <Star className="w-4 h-4 fill-current" /> {course.rating}
                                            <span className="text-slate-400 text-xs font-normal ml-1">({course.students})</span>
                                        </div>
                                        <button className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                            {t.academy.course.start} <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Exam & Assessment Center (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                    <FileQuestion className="w-6 h-6 text-amber-400" />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-tight">{t.academy.exam.title}</h3>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-2xl font-black leading-tight">{t.academy.exam.cfaTitle}</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {t.academy.exam.cfaDesc}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Items</p>
                                    <p className="text-xl font-black">50</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Level</p>
                                    <p className="text-xl font-black">II - III</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleStartExam}
                                className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn"
                            >
                                {t.academy.exam.startBtn}
                                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Additional Resources / Stats */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-500" /> Top Performers
                        </h4>
                        <div className="space-y-4">
                            {[
                                { name: 'Zhang W.', score: '48/50', rank: 'Expert' },
                                { name: 'Li M.', score: '45/50', rank: 'Advanced' },
                                { name: 'Wang X.', score: '42/50', rank: 'Advanced' }
                            ].map((user, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">#{i+1}</div>
                                        <div>
                                            <p className="text-sm font-bold">{user.name}</p>
                                            <p className="text-[10px] text-indigo-500 font-bold uppercase">{user.rank}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-sm">{user.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Academy;
