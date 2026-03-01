import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import { Trade, DailyPlan, RiskSettings, TradeStatus } from '../types';
import { X } from 'lucide-react';

// Local "Trading Chicken Soup" Database
const QUOTES_CN = [
    "纪律是交易者的生命线。",
    "不要为了交易而交易。等待完美的设置。",
    "亏损是生意的一部分，但情绪化亏损不是。",
    "今天的复盘写了吗？没有记录就没有进步。",
    "市场永远是对的，错的只有你的执念。",
    "保护好你的本金，这是你唯一的弹药。",
    "不要让上一笔交易的结果影响下一笔决策。",
    "甚至连最好的交易员也只有50%的胜率，区别在于风控。",
    "耐心，耐心，还是耐心。",
    "如果你感到兴奋或恐惧，你现在的仓位太大了。",
    "截断亏损，让利润奔跑。",
    "计划你的交易，交易你的计划。",
    "弱者等待机会，强者把握机会，智者创造机会。",
    "在此刻，除了你的规则，什么都不要信。",
    "不要追涨杀跌，要做那个在场边冷静的猎人。"
];

const QUOTES_EN = [
    "Discipline is the bridge between goals and accomplishment.",
    "Plan the trade, trade the plan.",
    "The market doesn't care about your feelings.",
    "Protect your capital at all costs.",
    "Revenge trading is the fastest way to zero.",
    "Are you trading your setup, or your emotions?",
    "Consistency > Intensity.",
    "Wait for the candle close.",
    "If in doubt, stay out.",
    "Your job is not to predict, but to react and manage risk.",
    "Cut losses short, let winners run.",
    "Patience is the most important tool.",
    "Don't get high on your wins or low on your losses.",
    "The trend is your friend until it bends."
];

interface MentorWidgetProps {
    trades: Trade[];
    plans: DailyPlan[];
    riskSettings: RiskSettings;
    className?: string; // Allow custom positioning
}

type MoodState = 'normal' | 'sad' | 'danger';

const MentorWidget: React.FC<MentorWidgetProps> = ({ trades, plans, riskSettings, className }) => {
    const { language } = useLanguage();
    const [message, setMessage] = useState<string>('');
    const [isVisible, setIsVisible] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    // --- Draggable State ---
    const [position, setPosition] = useState<{x: number, y: number} | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const widgetRef = useRef<HTMLDivElement>(null);

    // Cooldown to prevent spamming click
    const lastFetchTime = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Calculate Mood State ---
    const currentState: MoodState = useMemo(() => {
        const today = new Date().toDateString();
        const todaysTrades = trades
            .filter(t => new Date(t.entryDate).toDateString() === today)
            .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()); // Newest first

        const todayPnl = todaysTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
        
        // Check for max loss
        if (todayPnl <= -Math.abs(riskSettings.maxDailyLoss)) {
            return 'danger';
        }

        // Check for consecutive losses (last 3 closed trades)
        const closedTrades = todaysTrades.filter(t => t.status !== TradeStatus.OPEN);
        let consecutiveLosses = 0;
        for (const t of closedTrades) {
            if (t.pnl < 0) consecutiveLosses++;
            else break;
        }
        if (consecutiveLosses >= 3) {
            return 'danger';
        }

        // Check for general loss state (Sad)
        if (todayPnl < 0) {
            return 'sad';
        }

        // Default (Profit or Neutral)
        return 'normal';
    }, [trades, riskSettings]);

    // Initial greeting
    useEffect(() => {
        let initialMsg = "";
        if (currentState === 'danger') {
            initialMsg = language === 'cn' ? "警告：风控警报！请立即停止交易！" : "WARNING: Risk limit hit. Stop trading!";
        } else if (currentState === 'sad') {
            initialMsg = language === 'cn' ? "没关系，调整呼吸。下一笔会更好。" : "It's okay. Breathe. Focus on the next setup.";
        } else {
            initialMsg = language === 'cn' ? "保持专注。我在这里盯着你。" : "Stay focused. I'm watching your P&L.";
        }
        
        setMessage(initialMsg);
        
        if (!className) {
             setIsVisible(true);
             const t = setTimeout(() => setIsVisible(false), 5000); 
             return () => clearTimeout(t);
        }
    }, [language, className, currentState]);

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        // Only allow dragging from the main container or grip, not buttons
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        
        e.preventDefault(); 
        setIsDragging(true);
        
        if (widgetRef.current) {
            const rect = widgetRef.current.getBoundingClientRect();
            // Calculate offset from the top-left corner of the element
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            // If it's the first drag (popping out of layout), set initial position
            if (!position) {
                setPosition({ x: rect.left, y: rect.top });
            }
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        };
        
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const showQuote = (force = false) => {
        const now = Date.now();
        // Simple debounce: 1.5 seconds between clicks
        if (!force && now - lastFetchTime.current < 1500) {
            setIsVisible(true);
            return;
        }

        setIsThinking(true);
        setIsVisible(true);
        
        // Simulate a brief "thinking" moment for UX effect, without API call
        setTimeout(() => {
            // Specific quotes based on mood
            let quotes = language === 'cn' ? QUOTES_CN : QUOTES_EN;
            
            if (currentState === 'danger') {
                quotes = language === 'cn' 
                    ? ["停下来！你的情绪已经失控。", "风控就是生命。关掉电脑。", "今天不是你的日子，接受它。"] 
                    : ["STOP! Your emotions are compromised.", "Risk management is survival. Quit now.", "Today is not your day. Walk away."];
            } else if (currentState === 'sad') {
                quotes = language === 'cn' 
                    ? ["不要为了回本而交易。", "忘记上一笔亏损。", "市场还在，别着急。"]
                    : ["Don't revenge trade.", "Forget the last loss.", "The market will be here tomorrow."];
            }

            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            
            setMessage(randomQuote);
            setIsThinking(false);
            lastFetchTime.current = Date.now();

            // Auto hide logic
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                if (!isHovered) setIsVisible(false);
            }, 6000);
        }, 400); // 400ms delay for "thinking" animation
    };

    const handleClick = () => {
        if (!isDragging) showQuote(true);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if(!isDragging) {
            timerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        }
    };

    // --- 3D Styles & Constants ---
    const cubeSize = 48; // px
    const halfSize = cubeSize / 2;

    // Apply fixed position style if dragging has occurred
    const style: React.CSSProperties = {
        perspective: '800px',
        ...(position ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 } : {})
    };

    // --- Dynamic Styles based on Mood ---
    const getMoodStyles = () => {
        switch (currentState) {
            case 'danger': // Red
                return {
                    faceFront: 'bg-rose-600 border-rose-400',
                    faceBack: 'bg-rose-800 border-rose-600',
                    faceRight: 'bg-rose-700 border-rose-500',
                    faceLeft: 'bg-rose-700 border-rose-500',
                    faceTop: 'bg-rose-500 border-rose-300',
                    faceBottom: 'bg-rose-900 border-rose-800',
                    glow: 'bg-rose-400',
                    eye: 'bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]',
                    mouth: 'bg-rose-200',
                    bubbleBorder: 'border-rose-500',
                    textColor: 'text-rose-500',
                    eyeShape: 'w-2.5 h-1', // Squint
                    eyeRotateLeft: 'rotate-12',
                    eyeRotateRight: '-rotate-12',
                    mouthShape: 'rounded-t-full border-t-2 mt-1' // Frown
                };
            case 'sad': // Purple
                return {
                    faceFront: 'bg-purple-600 border-purple-400',
                    faceBack: 'bg-purple-800 border-purple-600',
                    faceRight: 'bg-purple-700 border-purple-500',
                    faceLeft: 'bg-purple-700 border-purple-500',
                    faceTop: 'bg-purple-500 border-purple-300',
                    faceBottom: 'bg-purple-900 border-purple-800',
                    glow: 'bg-purple-400',
                    eye: 'bg-purple-200 shadow-none opacity-80',
                    mouth: 'bg-purple-300',
                    bubbleBorder: 'border-purple-500',
                    textColor: 'text-purple-500',
                    eyeShape: 'w-2.5 h-2.5 rounded-full',
                    eyeRotateLeft: 'translate-y-1', // Droopy
                    eyeRotateRight: 'translate-y-1',
                    mouthShape: 'w-3 h-0.5 mt-2' // Flat/Sad
                };
            case 'normal': // Green/Emerald (Calm)
            default:
                return {
                    faceFront: 'bg-emerald-500 border-emerald-300',
                    faceBack: 'bg-emerald-700 border-emerald-500',
                    faceRight: 'bg-emerald-600 border-emerald-400',
                    faceLeft: 'bg-emerald-600 border-emerald-400',
                    faceTop: 'bg-emerald-400 border-emerald-200',
                    faceBottom: 'bg-emerald-800 border-emerald-700',
                    glow: 'bg-emerald-400',
                    eye: 'bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]',
                    mouth: 'bg-emerald-100',
                    bubbleBorder: 'border-emerald-500',
                    textColor: 'text-emerald-600 dark:text-emerald-400',
                    eyeShape: 'w-2.5 h-2.5 rounded-full',
                    eyeRotateLeft: '',
                    eyeRotateRight: '',
                    mouthShape: 'rounded-b-full border-b-2 h-1.5' // Smile
                };
        }
    };

    const moodStyle = getMoodStyles();

    return (
        <div 
            ref={widgetRef}
            className={`${position ? '' : (className || "fixed bottom-28 right-8 z-[55] flex flex-col items-end pointer-events-none")}`}
            style={style}
        >
            {/* Speech Bubble - Repositioned to Left of Avatar to avoid Clipping */}
            <div 
                className={`
                    pointer-events-auto absolute right-full mr-4 top-0 w-[200px] z-[60]
                    bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                    p-3 rounded-xl rounded-tr-none border-2 ${moodStyle.bubbleBorder}
                    shadow-xl
                    transition-all duration-300 origin-top-right
                    ${isVisible ? 'scale-100 opacity-100 translate-x-0' : 'scale-75 opacity-0 translate-x-4 pointer-events-none'}
                `}
                onMouseDown={(e) => e.stopPropagation()} // Prevent dragging from bubble
            >
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${moodStyle.textColor}`}>The Mentor</span>
                    <button onClick={(e) => { e.stopPropagation(); setIsVisible(false); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-3 h-3"/></button>
                </div>
                <p className="text-xs font-medium leading-relaxed font-mono">
                    {isThinking ? (
                        <span className="animate-pulse">{language === 'cn' ? "思考中..." : "Thinking..."}</span>
                    ) : (
                        message
                    )}
                </p>
            </div>

            {/* 3D Character Container (Draggable Trigger) */}
            <div 
                className={`pointer-events-auto relative group select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{ width: cubeSize, height: cubeSize }}
            >
                {/* Drag Hint (Visible on Hover) */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                    Drag Me
                </div>

                {/* Ping Animation for attention (Behind character) */}
                {!isVisible && !isDragging && (
                    <span className="absolute top-0 right-0 flex h-full w-full -z-10">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${moodStyle.glow}`}></span>
                    </span>
                )}

                {/* The 3D Cube Head */}
                <div 
                    className={`w-full h-full relative preserve-3d ${isDragging ? '' : 'animate-float'}`}
                    style={{ 
                        transformStyle: 'preserve-3d',
                        transition: isDragging ? 'none' : 'transform 0.3s ease'
                    }}
                >
                    {/* Inner Cube Rotation Wrapper */}
                    <div className="w-full h-full relative preserve-3d animate-spin-slow group-hover:animate-spin-fast" style={{ transformStyle: 'preserve-3d' }}>
                        
                        {/* Front Face (Face) */}
                        <div 
                            className={`absolute w-full h-full border-2 flex flex-col items-center justify-center gap-1 backface-hidden transition-colors duration-500 ${moodStyle.faceFront}`}
                            style={{ transform: `translateZ(${halfSize}px)` }}
                        >
                            {/* Eyes */}
                            <div className="flex gap-3 mt-1">
                                <div className={`${moodStyle.eyeShape} ${moodStyle.eye} ${moodStyle.eyeRotateLeft} animate-blink`}></div>
                                <div className={`${moodStyle.eyeShape} ${moodStyle.eye} ${moodStyle.eyeRotateRight} animate-blink`}></div>
                            </div>
                            {/* Mouth */}
                            <div className={`w-4 ${moodStyle.mouthShape} ${moodStyle.mouth}`}></div>
                        </div>

                        {/* Back Face */}
                        <div 
                            className={`absolute w-full h-full border-2 transition-colors duration-500 ${moodStyle.faceBack}`}
                            style={{ transform: `rotateY(180deg) translateZ(${halfSize}px)` }}
                        >
                            <div className="w-full h-4 bg-black/20 absolute top-0"></div>
                        </div>

                        {/* Right Face */}
                        <div 
                            className={`absolute w-full h-full border-2 transition-colors duration-500 ${moodStyle.faceRight}`}
                            style={{ transform: `rotateY(90deg) translateZ(${halfSize}px)` }}
                        >
                            <div className="w-2 h-4 bg-black/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded"></div>
                        </div>

                        {/* Left Face */}
                        <div 
                            className={`absolute w-full h-full border-2 transition-colors duration-500 ${moodStyle.faceLeft}`}
                            style={{ transform: `rotateY(-90deg) translateZ(${halfSize}px)` }}
                        >
                             <div className="w-2 h-4 bg-black/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded"></div>
                        </div>

                        {/* Top Face */}
                        <div 
                            className={`absolute w-full h-full border-2 transition-colors duration-500 ${moodStyle.faceTop}`}
                            style={{ transform: `rotateX(90deg) translateZ(${halfSize}px)` }}
                        ></div>

                        {/* Bottom Face */}
                        <div 
                            className={`absolute w-full h-full border-2 transition-colors duration-500 ${moodStyle.faceBottom}`}
                            style={{ transform: `rotateX(-90deg) translateZ(${halfSize}px)` }}
                        ></div>
                    </div>
                </div>

                {/* Body / Stand (2D visual anchor) */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-slate-800 rounded-full blur-sm opacity-40 pointer-events-none"></div>
            </div>

            {/* Styles for 3D Animations */}
            <style>{`
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                
                @keyframes spin-slow {
                    0% { transform: rotateY(0deg) rotateX(-5deg); }
                    100% { transform: rotateY(360deg) rotateX(-5deg); }
                }
                
                @keyframes spin-fast {
                    0% { transform: rotateY(0deg) rotateX(-5deg); }
                    100% { transform: rotateY(360deg) rotateX(-5deg); }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }

                .animate-spin-slow {
                    animation: spin-slow 10s linear infinite;
                }
                
                .animate-spin-fast {
                    animation: spin-fast 2s linear infinite; /* Faster on hover */
                }

                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default MentorWidget;