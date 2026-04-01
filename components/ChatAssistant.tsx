import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Image as ImageIcon, Mic, X, ChevronDown, Loader2, Save, Maximize2, Minimize2, CheckCircle2, ArrowRight } from 'lucide-react';
import { chatWithAnalyst } from '../services/geminiService';
import { useLanguage } from '../LanguageContext';
import { useUser } from './UserContext';
import { Trade, Direction } from '../types';

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    image?: string;
    timestamp: Date;
    tradeDetails?: Trade; // If message represents a logged trade
}

interface ChatAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveToNotebook: (content: string) => void;
    onAutoLogTrade?: (tradeData: any) => Trade;
    onViewTrade?: (tradeId: string) => void;
    trades?: Trade[];
    tradingRules?: any[];
    riskSettings?: any;
}

const ChatAssistant = ({ isOpen, onClose, onSaveToNotebook, onAutoLogTrade, onViewTrade, trades = [], tradingRules = [], riskSettings = null }: ChatAssistantProps) => {
    const { language } = useLanguage();
    const { user } = useUser();
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'model',
            content: language === 'cn' 
                ? "你好！我是你的 AI 交易助手。告诉你的交易（例如：'我刚刚在65000买入2个BTC'），我会自动记录。如果信息不全，我会向你确认。" 
                : "Hello! I'm your AI Trading Analyst. Tell me about your trade (e.g., 'Bought 2 BTC at 65k'), and I'll log it. I'll ask for details if anything is missing.",
            timestamp: new Date()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = language === 'cn' ? 'zh-CN' : 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(prev => prev ? prev + " " + transcript : transcript);
                    setIsRecording(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech error", event.error);
                    setIsRecording(false);
                };
                
                recognitionRef.current.onend = () => {
                    setIsRecording(false);
                };
            }
        }
    }, [language]);

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            image: selectedImage || undefined,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSelectedImage(null);
        setIsLoading(true);

        // Convert messages to history format for API
        const history = messages.map(m => ({ role: m.role, content: m.content }));

        try {
            const response = await chatWithAnalyst(userMsg.content, userMsg.image || null, history, language, trades, tradingRules, riskSettings, user.id);
            
            let loggedTrade: Trade | undefined = undefined;

            // Handle Function Call Result (Auto Log)
            if (response.tradeData && onAutoLogTrade) {
                loggedTrade = onAutoLogTrade(response.tradeData);
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: response.text,
                timestamp: new Date(),
                tradeDetails: loggedTrade
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSelectedImage(ev.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser.");
            return;
        }
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    const handleSave = (content: string) => {
        onSaveToNotebook(content);
    };

    const handleViewClick = (tradeId: string) => {
        if (onViewTrade) {
            onViewTrade(tradeId);
            onClose();
        }
    };

    return (
        <>
            {/* Chat Interface Window */}
            {isOpen && (
                <div className={`fixed z-[60] flex flex-col bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 overflow-hidden animate-fade-in-up
                    ${isExpanded 
                        ? 'inset-4 md:inset-20 rounded-2xl' 
                        : 'bottom-28 right-8 w-[90vw] md:w-[400px] h-[600px] rounded-3xl'
                    }
                `}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">AI Analyst</h3>
                                <p className="text-[10px] text-indigo-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                {isExpanded ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
                            </button>
                            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                                }`}>
                                    {msg.image && (
                                        <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                                            <img src={msg.image} alt="User upload" className="max-w-full h-auto" />
                                        </div>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    
                                    {/* Trade Log Confirmation Card */}
                                    {msg.tradeDetails && (
                                        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-500/30">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Trade Logged
                                                </div>
                                                <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[9px] text-emerald-600 dark:text-emerald-300 font-bold">
                                                    JOURNAL
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-800 dark:text-white font-mono font-bold text-sm mb-2">
                                                <span>{msg.tradeDetails.symbol}</span>
                                                <span className={msg.tradeDetails.direction === Direction.LONG ? 'text-emerald-500' : 'text-rose-500'}>
                                                    {msg.tradeDetails.direction}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500 pb-2 border-b border-emerald-100 dark:border-emerald-500/20 mb-2">
                                                <span>Price: {msg.tradeDetails.entryPrice}</span>
                                                <span>Qty: {msg.tradeDetails.quantity}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleViewClick(msg.tradeDetails!.id)} 
                                                className="w-full py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center justify-center gap-1 transition-colors"
                                            >
                                                View in Journal <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Action Footer for AI Messages (Normal Chat) */}
                                    {msg.role === 'model' && !msg.tradeDetails && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                            <button 
                                                onClick={() => handleSave(msg.content)}
                                                className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors uppercase font-bold tracking-wider"
                                                title="Save to Notebook"
                                            >
                                                <Save className="w-3 h-3" /> Save Note
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-2 text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    <span className="text-xs">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        {/* Image Preview */}
                        {selectedImage && (
                            <div className="relative inline-block mb-3">
                                <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-indigo-200" />
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-0.5 hover:bg-rose-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col gap-2 border border-transparent focus-within:border-indigo-500 transition-colors">
                                <textarea 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder={isRecording ? "Listening..." : language === 'cn' ? "说：'65000买入BTC'..." : "Say 'Bought BTC at 65k'..."}
                                    className="w-full bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white resize-none max-h-24 font-sans"
                                    rows={1}
                                />
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-1">
                                        <label className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg cursor-pointer transition-colors">
                                            <ImageIcon className="w-4 h-4" />
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                        </label>
                                        <button 
                                            onClick={toggleRecording}
                                            className={`p-1.5 rounded-lg transition-all ${
                                                isRecording 
                                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 animate-pulse ring-2 ring-rose-500/50' 
                                                : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                            }`}
                                            title="Voice Command"
                                        >
                                            <Mic className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold tracking-wide">Gemini 2.5 Flash</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleSend}
                                disabled={(!input.trim() && !selectedImage) || isLoading}
                                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 disabled:scale-100 disabled:shadow-none"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatAssistant;