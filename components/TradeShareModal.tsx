import React, { useState, useRef } from 'react';
import { X, Copy, Download, Share2, QrCode, Instagram, Twitter, Send, Check, Link as LinkIcon, ExternalLink, RefreshCw } from 'lucide-react';
import { Trade, Direction, TradeStatus } from '../types';
import { useLanguage } from '../LanguageContext';
import { Logo } from './Logo';
import html2canvas from 'html2canvas';

interface TradeShareModalProps {
    trade: Trade;
    isOpen: boolean;
    onClose: () => void;
}

const TradeShareModal: React.FC<TradeShareModalProps> = ({ trade, isOpen, onClose }) => {
    const { t, language } = useLanguage();
    const [isCopied, setIsCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const isWin = trade.pnl >= 0;
    const shareUrl = `https://tradegrail.com/share/${trade.id}`;

    // ROI Calculation (Estimated based on risk or position size)
    const exposure = trade.entryPrice * trade.quantity;
    const roi = exposure > 0 ? ((trade.pnl - trade.fees) / exposure) * 100 : 0;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSaveToAlbum = async () => {
        if (!cardRef.current || isGenerating) return;
        
        try {
            setIsGenerating(true);
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2, // High resolution for better quality
                backgroundColor: null, // Keep transparency/gradient
                logging: false,
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            
            link.href = image;
            link.download = `tradegrail-share-${trade.symbol}-${date}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Log for debugging
            console.log("Image saved to album successfully.");
        } catch (error) {
            console.error("Failed to generate share image:", error);
            alert(language === 'cn' ? "保存图片失败，请重试。" : "Failed to save image. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const SocialButton = ({ icon: Icon, color, label }: any) => (
        <button className="flex flex-col items-center gap-2 group">
            <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-active:scale-95`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg flex flex-col items-center">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* SECTION A: THE SHAREABLE CARD (Target for Screenshot) */}
                <div 
                    ref={cardRef}
                    className="w-full aspect-[4/5] max-w-[380px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl relative border border-white/10"
                >
                    {/* Background Design */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-950 to-slate-900"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full -ml-20 -mb-20"></div>
                    
                    {/* Content Overlay */}
                    <div className="relative z-10 h-full flex flex-col p-8">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-10">
                            <Logo mode="dark" iconClassName="w-8 h-8" textClassName="text-sm tracking-[0.3em] text-white" />
                            <div className="text-right">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-80">Verified Trade</p>
                                <p className="text-[10px] text-slate-400 font-mono">{new Date().toISOString().split('T')[0]}</p>
                            </div>
                        </div>

                        {/* Ticker & Leverage */}
                        <div className="mb-2">
                            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                {trade.symbol}
                                <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                                    {trade.leverage || 20}x
                                </span>
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-black uppercase tracking-widest ${trade.direction === Direction.LONG ? 'text-blue-400' : 'text-orange-400'}`}>
                                    {trade.direction === Direction.LONG ? 'Long' : 'Short'}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perpetual</span>
                            </div>
                        </div>

                        {/* Main Numbers */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="space-y-1">
                                <p className={`text-6xl font-black font-mono tracking-tighter ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {isWin ? '+' : ''}{roi.toFixed(2)}%
                                </p>
                                <p className={`text-2xl font-bold font-mono opacity-80 ${isWin ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                    {isWin ? '+' : ''}${Math.abs(trade.pnl).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-2 gap-y-6 border-t border-white/5 pt-8 mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Entry Price</p>
                                <p className="text-sm font-bold text-white font-mono">{trade.entryPrice.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Last Price</p>
                                <p className="text-sm font-bold text-white font-mono">{trade.exitPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Footer Branding */}
                        <div className="flex justify-between items-end pt-4 border-t border-white/5 mt-auto">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Journaled at</p>
                                <p className="text-lg font-bold text-white tracking-tighter">TradeGrail.com</p>
                            </div>
                            <div className="w-16 h-16 bg-white p-1.5 rounded-xl shadow-lg shadow-black/50 overflow-hidden">
                                <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                                    <QrCode className="w-8 h-8 text-white opacity-40" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gloss Reflection Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
                </div>

                {/* SECTION B: ACTION SHEET */}
                <div className="w-full mt-6 space-y-6 animate-fade-in-up">
                    
                    {/* Share Link Field */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex items-center shadow-xl">
                        <div className="pl-3 text-slate-400">
                            <LinkIcon className="w-4 h-4" />
                        </div>
                        <input 
                            type="text" 
                            readOnly 
                            value={shareUrl}
                            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-600 dark:text-slate-300 outline-none truncate font-medium"
                        />
                        <button 
                            onClick={handleCopyLink}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'}`}
                        >
                            {isCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                        </button>
                    </div>

                    {/* Social Buttons */}
                    <div className="flex justify-between px-2">
                        <SocialButton icon={Twitter} color="bg-black" label="X" />
                        <SocialButton icon={Send} color="bg-sky-500" label="Telegram" />
                        <SocialButton icon={Instagram} color="bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600" label="Stories" />
                        <SocialButton icon={Share2} color="bg-slate-700" label="More" />
                    </div>

                    {/* Download Button */}
                    <button 
                        onClick={handleSaveToAlbum}
                        disabled={isGenerating}
                        className={`w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:scale-[1.02] active:scale-[0.98] ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {isGenerating ? (
                            /* Fix: added RefreshCw icon to imports from lucide-react */
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        {language === 'cn' ? (isGenerating ? '正在生成...' : '保存到相册') : (isGenerating ? 'Generating...' : 'Save Image')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeShareModal;