import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trade, Direction, TradeStatus, Strategy, ChecklistItem, DailyPlan, TradingAccount } from '../types';
import {
    X, ChevronLeft, ChevronRight, Star, Plus, Trash2, Calendar, Clock, Hash, Tag,
    AlertTriangle, FileText, Check, MoreHorizontal, GripVertical, Edit2, Share2,
    Paperclip, BookOpen, Layers, MapPin, ChevronDown, Settings, Save, Zap, Flag,
    RefreshCw, CheckCircle2, Trophy, Cloud, Bold, Italic, Underline, List, ListOrdered,
    Wand2, FileDown, AlignLeft, RotateCcw, RotateCw, Strikethrough, Code, AlignCenter,
    AlignRight, Palette, Highlighter, Eraser, Link as LinkIcon, Image as ImageIcon, CheckSquare,
    BookMarked, GripHorizontal, FilePlus, Menu, Maximize2, Minimize2, Mic, MicOff,
    Download, Type, Minus, CaseSensitive, AlignJustify, Table, ListTodo, SeparatorHorizontal,
    Camera, PlusCircle
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import NotesPanel from './NotesPanel';

// ─── Risk Gauge Component ─────────────────────────────────────────────────────
interface RiskTooltipData {
    score: number | null;
    label: string;
    color: string;
    isPending: boolean;
    analysisText: string | null;
    metrics: { positionRatio: number | null; stopLossPercent: number | null; rrRatio: number | null; maxLoss: number | null };
    footerText: string;
    footerHighlight?: string;
    missingHint?: string;
}

interface RiskGaugeProps {
    score: number | null;
    tooltipData: RiskTooltipData;
    onClickSetup?: () => void;
}

function getMetricColor(type: string, value: number): string {
    if (type === 'position') return value > 10 ? '#e24b4a' : value > 5 ? '#ef9f27' : '#1d9e75';
    if (type === 'stoploss') return value > 5 ? '#e24b4a' : value > 3 ? '#ef9f27' : '#1d9e75';
    if (type === 'rr') return value >= 2 ? '#1d9e75' : value >= 1 ? '#ef9f27' : '#e24b4a';
    return '#e24b4a';
}

const RiskTooltipCard: React.FC<{ visible: boolean; top: number; left: number; data: RiskTooltipData; onClickSetup?: () => void }> = ({ visible, top, left, data, onClickSetup }) => {
    const { score, label, color, isPending, analysisText, metrics, footerText, footerHighlight, missingHint } = data;
    const displayScore = score != null ? Math.max(0, Math.min(100, score)) : null;

    return (
        <div style={{
            position: 'fixed', top, left,
            width: '480px',
            background: '#ffffff', border: '0.5px solid #e8e8f0', borderRadius: '10px',
            padding: '16px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            zIndex: 100, opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
            pointerEvents: visible ? 'auto' : 'none',
        }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                {/* 左侧评分 */}
                <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: '10px', flexShrink: 0 }}>
                    <div style={{ fontSize: '28px', fontWeight: 500, color, letterSpacing: '-1px', lineHeight: 1 }}>
                        {displayScore != null ? Math.round(displayScore) : '--'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>/ 100</div>
                    <div style={{ fontSize: '11px', color, marginTop: '4px', fontWeight: 500 }}>{label}</div>
                </div>

                {/* 右侧内容 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* 进度条 */}
                    <div style={{ fontSize: '10px', color: '#999', letterSpacing: '0.8px', marginBottom: '4px' }}>风险区间</div>
                    <div style={{ height: '4px', background: '#ebebf0', borderRadius: '99px', overflow: 'visible', position: 'relative', margin: '5px 0 3px' }}>
                        <div style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #1d9e75 0%, #ef9f27 50%, #e24b4a 100%)', opacity: isPending ? 0.3 : 1 }} />
                        <div style={{ position: 'absolute', top: '-3px', width: '2px', height: '10px', background: isPending ? '#ccc' : 'rgba(0,0,0,0.25)', borderRadius: '1px', left: `${displayScore ?? 50}%`, transform: 'translateX(-50%)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#999' }}>低风险</span>
                        <span style={{ fontSize: '10px', color: '#999' }}>中等</span>
                        <span style={{ fontSize: '10px', color: '#999' }}>高风险</span>
                    </div>

                    {/* 分析文字 */}
                    {isPending ? (
                        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                            {missingHint === '请设置账户总资产'
                                ? <>暂无足够数据。请补充<span style={{ color: '#7c3aed', cursor: 'pointer' }} onClick={onClickSetup}> 账户总资产 </span>以启用风险评级。</>
                                : <>请填写<span style={{ color: '#7c3aed', cursor: 'pointer' }}> 风险金额 </span>或<span style={{ color: '#7c3aed' }}> 计划止损价格 </span>以启用风险评级。</>
                            }
                        </div>
                    ) : (
                        <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{analysisText}</div>
                    )}

                    {/* 四项指标 */}
                    <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {[
                            { label: '仓位占比', value: metrics.positionRatio != null ? `${metrics.positionRatio.toFixed(1)}%` : '--', type: 'position', raw: metrics.positionRatio },
                            { label: '止损距离', value: metrics.stopLossPercent != null ? `${metrics.stopLossPercent.toFixed(1)}%` : '--', type: 'stoploss', raw: metrics.stopLossPercent },
                            { label: '盈亏比', value: metrics.rrRatio != null ? `${metrics.rrRatio.toFixed(2)}R` : '--', type: 'rr', raw: metrics.rrRatio },
                            { label: '最大潜在亏损', value: metrics.maxLoss != null ? `-${metrics.maxLoss.toFixed(0)}` : '--', type: 'maxloss', raw: metrics.maxLoss },
                        ].map(({ label: ml, value, type, raw }) => (
                            <div key={ml}>
                                <div style={{ fontSize: '11px', color: '#888' }}>{ml}</div>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: raw != null ? getMetricColor(type, raw) : '#ccc' }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* 底部建议 */}
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '0.5px solid #f0f0f6', fontSize: '12px', color: '#888', lineHeight: 1.5 }}>
                        {footerHighlight
                            ? footerText.split(footerHighlight).map((part, i, arr) =>
                                i < arr.length - 1
                                    ? <span key={i}>{part}<span style={{ color }}>{footerHighlight}</span></span>
                                    : <span key={i}>{part}</span>
                              )
                            : footerText
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

function getRiskLevel(score: number) {
    if (score < 33) return { label: '低风险', sub: '风险可控，执行良好', color: '#1d9e75' };
    if (score < 66) return { label: '中等风险', sub: '仓位适中，注意止损', color: '#ef9f27' };
    return { label: '高风险', sub: '仓位偏重，建议减仓', color: '#e24b4a' };
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score, tooltipData, onClickSetup }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
    const gaugeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setIsHovered(false);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    const handleMouseEnter = () => {
        if (gaugeRef.current) {
            const rect = gaugeRef.current.getBoundingClientRect();
            setCardPos({ top: rect.bottom + 8, left: rect.left - 20 });
        }
        setIsHovered(true);
    };

    const clampedScore = score != null ? Math.max(0, Math.min(100, score)) : 50;
    const unknown = score === null;
    const { label, sub, color } = unknown
        ? { label: '待评估', sub: tooltipData.missingHint ?? '数据不足', color: '#aaaacc' }
        : getRiskLevel(clampedScore);

    const rotateDeg = -90 + clampedScore * 1.8;

    return (
        <div
            ref={gaugeRef}
            style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
        >
            <svg width="100" height="58" viewBox="0 0 100 58">
                <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1d9e75" />
                        <stop offset="50%" stopColor="#ef9f27" />
                        <stop offset="100%" stopColor="#e24b4a" />
                    </linearGradient>
                    <linearGradient id="needleGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity="0" />
                        <stop offset="100%" stopColor={color} stopOpacity="1" />
                    </linearGradient>
                </defs>
                <path d="M10,52 A40,40 0 0,1 90,52" fill="none" stroke="#f0f0f6" strokeWidth="7" strokeLinecap="round" />
                <path d="M10,52 A40,40 0 0,1 90,52" fill="none" stroke="url(#riskGrad)" strokeWidth="7" strokeLinecap="round" opacity={unknown ? 0.3 : 1} />
                <g style={{ transform: `rotate(${rotateDeg}deg)`, transformOrigin: '50px 52px', transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
                    <polygon points="50,19 52.5,52 50,49 47.5,52" fill="url(#needleGrad)" />
                </g>
                <circle cx="50" cy="52" r="4" fill={color} />
                <circle cx="50" cy="52" r="2" fill="white" opacity="0.6" />
            </svg>
            <div style={{ fontSize: 12, fontWeight: 600, color, textAlign: 'center', marginTop: 2, lineHeight: 1.3 }}>{label}</div>
            <div style={{ fontSize: 10, color: '#aaaacc', textAlign: 'center', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
            <RiskTooltipCard visible={isHovered} top={cardPos.top} left={cardPos.left} data={tooltipData} onClickSetup={onClickSetup} />
        </div>
    );
};

function calcRiskScore(riskAmountRatio: number, rrRatio: number): number {
    // riskAmountRatio: 风险金额占账户总资产的百分比
    // 0-1%: 低风险, 1-3%: 中低, 3-5%: 中等, 5-10%: 中高, 10%+: 高风险
    const riskScore = riskAmountRatio <= 1 ? riskAmountRatio * 20
        : riskAmountRatio <= 3 ? 20 + (riskAmountRatio - 1) / 2 * 25
        : riskAmountRatio <= 5 ? 45 + (riskAmountRatio - 3) / 2 * 20
        : riskAmountRatio <= 10 ? 65 + (riskAmountRatio - 5) / 5 * 20
        : Math.min(100, 85 + (riskAmountRatio - 10) / 10 * 15);

    // 盈亏比越高，风险越合理，最多抵扣 20 分
    const rrBonus = rrRatio >= 3 ? 20 : rrRatio >= 2 ? 12 : rrRatio >= 1.5 ? 6 : 0;
    return Math.max(0, Math.min(100, riskScore - rrBonus));
}
// ─────────────────────────────────────────────────────────────────────────────

interface TradeReviewModalProps {
    trade: Trade;
    allTrades: Trade[]; // To enable next/prev navigation
    isOpen: boolean; // Kept for API compatibility
    onClose: () => void;
    onUpdateTrade: (trade: Trade) => void;
    strategies?: Strategy[];
    tradingAccounts?: TradingAccount[];
    onSavePlan?: (plan: DailyPlan) => void; // New Prop for Notebook Sync
}

// Default Constants
const DEFAULT_MISTAKES = ["FOMO", "Revenge Trading", "Too Large Size", "Hesitation", "Early Exit", "No Stop Loss", "Chasing", "Impulsive", "Distracted"];
const DEFAULT_SETUPS = ["Breakout", "Trend Pullback", "Liquidity Sweep", "Fib Retracement", "Support Bounce", "Gap Fill", "Gap and Go", "Reversal"];

// Icon Mapping (String Keys to Components) to prevent React State errors
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
    'mistake': AlertTriangle,
    'setup': MapPin,
    'custom': Tag,
    'habit': Zap,
    'routine': Clock,
    'flag': Flag
};

interface CategoryDef {
    id: string;
    label: string;
    options: string[];
    type: 'single' | 'multi';
    isSystem?: boolean; 
    iconKey: string; 
    color: string;
}

// Helper to compress image
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

// Helper for calculating grade from percentage
const calculateGradeFromPercent = (percent: number) => {
    if (percent === 100) return 'A+';
    if (percent >= 80) return 'A';
    if (percent >= 60) return 'B';
    if (percent >= 40) return 'C';
    if (percent > 0) return 'D';
    return '-';
};

// --- Rich Text Editor Components ---

const REVIEW_TEMPLATES = [
    {
        name: "Standard Review",
        content: "<p><strong>What went well?</strong></p><ul><li></li></ul><p><strong>What went wrong?</strong></p><ul><li></li></ul><p><strong>Key Takeaway:</strong></p><p></p>"
    },
    {
        name: "Mistake Analysis",
        content: "<p><strong>Mistake Identified:</strong></p><p></p><p><strong>Why did I do it? (Root Cause):</strong></p><p></p><p><strong>Correction for next time:</strong></p><p></p>"
    },
    {
        name: "Psychology Check",
        content: "<p><strong>Mental State:</strong> (Calm / Anxious / Greed / Fear)</p><p><strong>Focus Level (1-10):</strong> </p><p><strong>Notes:</strong></p><p></p>"
    }
];

// Quick Access Templates for the new Toolbar Header
const QUICK_TEMPLATES = [
    { name: 'Intra-day Check-in', icon: '📝', content: "<h4>Intra-day Check-in</h4><p><strong>Current PnL:</strong> </p><p><strong>Mental State:</strong> </p><p><strong>Active Positions:</strong> </p>" },
    { name: 'Pre-Market Analysis', icon: '🌅', content: "<h4>Pre-Market Plan</h4><p><strong>Key Levels:</strong> </p><p><strong>News Events:</strong> </p><p><strong>Bias:</strong> </p>" },
    { name: 'Post-Session Review', icon: '🌙', content: "<h4>EOD Review</h4><p><strong>Did I follow my plan?</strong> </p><p><strong>Best Trade:</strong> </p><p><strong>Worst Trade:</strong> </p>" },
    { name: 'All-In-One Journal', icon: '📓', content: "<h4>Daily Journal</h4><p><strong>Reflections:</strong></p><br/><hr/><br/><p><strong>Improvements:</strong></p>" },
];

interface ReviewEditorProps {
    content: string;
    onChange: (html: string) => void;
    onSave: () => void;
    placeholder: string;
}

const ReviewEditor: React.FC<ReviewEditorProps> = ({ content, onChange, onSave, placeholder }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'trade' | 'journal'>('trade');

    // Sync content updates
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            // Only update if significantly different to avoid cursor jumps, 
            // or if the editor is empty/initial load.
            if (content === '' && editorRef.current.innerHTML === '<br>') return;
            editorRef.current.innerHTML = content;
        }
    }, [content]);

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const handleInsertTemplate = (templateContent: string) => {
        if (editorRef.current) {
            const currentContent = editorRef.current.innerHTML;
            const newContent = currentContent + (currentContent && currentContent !== '<br>' ? "<br/><hr/><br/>" : "") + templateContent;
            onChange(newContent);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const base64 = await compressImage(file);
                // Ensure focus is back on editor
                editorRef.current?.focus();
                execCmd('insertImage', base64);
            } catch (error) {
                console.error("Image upload failed", error);
            }
        }
    };

    const handleLink = () => {
        const url = prompt("Enter URL:");
        if (url) {
            execCmd('createLink', url);
        }
    };

    const handleInsertCheckbox = () => {
        const checkboxHtml = '<input type="checkbox" style="margin-right: 6px; vertical-align: middle; accent-color: #4f46e5; transform: scale(1.2);" />&nbsp;';
        execCmd('insertHTML', checkboxHtml);
    };

    const handleExportWord = () => {
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Trade Review</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + (editorRef.current?.innerHTML || "") + footer;
        
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `trade-review-${new Date().toISOString().slice(0,10)}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    const ToolbarButton = ({ onClick, icon: Icon, title, active = false }: any) => (
        <button 
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
            onClick={onClick} 
            className={`p-1.5 rounded-md transition-colors ${active ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            title={title}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    );

    const Divider = () => <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            
            {/* Header Section (Tabs & Quick Templates) */}
            <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('trade')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'trade' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Trade note
                        </button>
                        <button 
                            onClick={() => setActiveTab('journal')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'journal' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Daily Journal
                        </button>
                    </div>
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleExportWord} 
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                        title="Export Note"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap tracking-wide mr-1">Recently used templates</span>
                    {QUICK_TEMPLATES.map((t, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => handleInsertTemplate(t.content)} 
                            className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap flex items-center gap-1 group"
                        >
                            <span className="opacity-70 group-hover:opacity-100">{t.name}</span>
                            <span className="opacity-50">{t.icon}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 sticky top-0 z-10">
                
                {/* History */}
                <ToolbarButton onClick={() => execCmd('undo')} icon={RotateCcw} title="Undo" />
                <ToolbarButton onClick={() => execCmd('redo')} icon={RotateCw} title="Redo" />
                <Divider />

                {/* Typography Selects */}
                <select 
                    onChange={(e) => execCmd('formatBlock', e.target.value)} 
                    className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 rounded p-1 hover:bg-white dark:hover:bg-slate-800 transition-colors h-6 cursor-pointer w-16"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <option value="P">Normal</option>
                    <option value="H2">H1</option>
                    <option value="H3">H2</option>
                    <option value="PRE">Code</option>
                </select>
                <select 
                    onChange={(e) => execCmd('fontName', e.target.value)} 
                    className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 rounded p-1 hover:bg-white dark:hover:bg-slate-800 transition-colors h-6 cursor-pointer w-16"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Mono</option>
                </select>
                <Divider />

                {/* Styling */}
                <ToolbarButton onClick={() => execCmd('bold')} icon={Bold} title="Bold" />
                <ToolbarButton onClick={() => execCmd('italic')} icon={Italic} title="Italic" />
                <ToolbarButton onClick={() => execCmd('underline')} icon={Underline} title="Underline" />
                <ToolbarButton onClick={() => execCmd('strikeThrough')} icon={Strikethrough} title="Strike" />
                <Divider />

                {/* Colors */}
                <label className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer relative flex items-center justify-center" title="Text Color" onMouseDown={(e) => e.preventDefault()}>
                    <Palette className="w-3.5 h-3.5" />
                    <input type="color" onChange={(e) => execCmd('foreColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
                <label className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer relative flex items-center justify-center" title="Highlight Color" onMouseDown={(e) => e.preventDefault()}>
                    <Highlighter className="w-3.5 h-3.5" />
                    <input type="color" onChange={(e) => execCmd('hiliteColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" defaultValue="#ffff00" />
                </label>
                <Divider />

                {/* Alignment & Lists */}
                <ToolbarButton onClick={() => execCmd('justifyLeft')} icon={AlignLeft} title="Left" />
                <ToolbarButton onClick={() => execCmd('justifyCenter')} icon={AlignCenter} title="Center" />
                <ToolbarButton onClick={() => execCmd('justifyRight')} icon={AlignRight} title="Right" />
                <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={List} title="Bullet List" />
                <ToolbarButton onClick={() => execCmd('insertOrderedList')} icon={ListOrdered} title="Numbered List" />
                <ToolbarButton onClick={handleInsertCheckbox} icon={CheckSquare} title="Checkbox" />
                <Divider />

                {/* Insert */}
                <ToolbarButton onClick={handleLink} icon={LinkIcon} title="Link" />
                <label 
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer flex items-center" 
                    title="Insert Image"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <ToolbarButton onClick={() => execCmd('removeFormat')} icon={Eraser} title="Clear Format" />
            </div>

            {/* Editor Area */}
            <div 
                ref={editorRef}
                contentEditable
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                onBlur={onSave}
                className="flex-1 p-6 overflow-y-auto outline-none prose prose-sm prose-slate dark:prose-invert max-w-none font-sans leading-relaxed text-slate-900 dark:text-slate-100"
                data-placeholder={placeholder}
                style={{ minHeight: '100%' }} // Fill height
            >
            </div>
        </div>
    );
};

interface TagSelectorProps {
    cat: CategoryDef;
    tags: string[];
    onAdd: (tag: string) => void;
    onRemove: (tag: string) => void;
    onDeleteCategory: () => void;
    onRenameCategory: (newName: string) => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({ 
    cat,
    tags, 
    onAdd, 
    onRemove, 
    onDeleteCategory,
    onRenameCategory
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const Icon = CATEGORY_ICON_MAP[cat.iconKey] || Tag;

    // Filter options
    const filteredOptions = cat.options.filter(opt => 
        opt.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(opt)
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            setInputValue('');
        }
        if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onRemove(tags[tags.length - 1]);
        }
    };

    const handleRename = () => {
        const newName = prompt("Rename category:", cat.label);
        if (newName) onRenameCategory(newName);
        setIsMenuOpen(false);
    };

    return (
        <div className="mb-5 relative group/section" ref={containerRef}>
            {/* Header Row: Icon + Label + ... Menu */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Drag Handle (Visual only for now) */}
                    <div className="opacity-0 group-hover/section:opacity-100 cursor-grab text-slate-300 -ml-4 absolute">
                        <GripVertical className="w-3 h-3" />
                    </div>
                    
                    <Icon className="w-3.5 h-3.5" fill={cat.color === 'text-amber-500' ? '#eab308' : cat.color === 'text-indigo-500' ? '#818cf8' : '#34d399'} strokeWidth={0} />
                    <span className="text-[13px] font-medium" style={{ color: '#9ca3af' }}>{cat.label}</span>
                </div>
                
                {/* 3 Dots Menu */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 top-6 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 py-1 overflow-hidden animate-fade-in-up">
                            <button onClick={handleRename} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Edit2 className="w-3 h-3" /> Rename
                            </button>
                            {!cat.isSystem && (
                                <button onClick={onDeleteCategory} className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 flex items-center gap-2">
                                    <Trash2 className="w-3 h-3" /> Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Box */}
            <div 
                className={`
                    relative min-h-[42px] bg-white dark:bg-slate-900 border rounded-xl px-2 py-1.5 flex flex-wrap gap-2 transition-all cursor-text
                    ${isFocused 
                        ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600'
                    }
                `}
                onClick={() => setIsFocused(true)}
            >
                {/* Selected Tags (Pills) */}
                {tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 animate-fade-in">
                        {tag}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
                            className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                {/* Input Field */}
                <div className="flex-1 min-w-[60px] relative flex items-center">
                    <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        placeholder={tags.length === 0 ? "Select tag" : ""}
                        className="w-full bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 h-full py-1"
                    />
                </div>

                {/* Dropdown Arrow Indicator (Fixed Right) */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isFocused ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Menu Overlay */}
                {isFocused && (
                    <div className="absolute top-[105%] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto animate-fade-in-up">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => (
                                <button
                                    key={i}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); 
                                        onAdd(opt);
                                        setInputValue('');
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center group"
                                >
                                    {opt}
                                    <span className="opacity-0 group-hover:opacity-100 text-slate-400">
                                        <Plus className="w-3 h-3" />
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-xs text-slate-400">
                                {inputValue ? (
                                    <button 
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            onAdd(inputValue);
                                            setInputValue('');
                                        }}
                                        className="text-indigo-500 font-bold hover:underline"
                                    >
                                        Create "{inputValue}"
                                    </button>
                                ) : (
                                    <span className="italic">Type to create new...</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const TradeReviewModal: React.FC<TradeReviewModalProps> = ({ trade, allTrades, isOpen, onClose, onUpdateTrade, strategies, tradingAccounts, onSavePlan }) => {
    const { t, language } = useLanguage();
    const [currentTrade, setCurrentTrade] = useState<Trade>(trade);
    const [noteContent, setNoteContent] = useState(trade.reviewNotes || trade.notes || '');
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null); // For sizing calculations
    const [leftTab, setLeftTab] = useState<'stats' | 'playbook' | 'executions' | 'attachments'>('stats');

    // --- Resizable Split Pane Logic ---
    const [splitRatio, setSplitRatio] = useState(60); // Default chart height %
    const [isDragging, setIsDragging] = useState(false);

    // Playbook Menu State
    const [isStrategyMenuOpen, setIsStrategyMenuOpen] = useState(false);
    const strategyMenuRef = useRef<HTMLDivElement>(null);

    // Save Status Indicator State
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('saved');
    const autoSaveTimerRef = useRef<any>(null);
    const [isReviewed, setIsReviewed] = useState(!!trade.reviewNotes);

    // Dynamic Categories State - Initialize safely from localStorage or Default
    const [categoryDefs, setCategoryDefs] = useState<CategoryDef[]>(() => {
        try {
            const saved = localStorage.getItem('tradeGrail_categoryDefs');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.warn("Parse error", e); }
        
        return [
            { id: 'mistakes', label: 'Mistakes', options: DEFAULT_MISTAKES, type: 'multi', isSystem: true, iconKey: 'mistake', color: 'text-amber-500' },
            { id: 'setup', label: 'Setups', options: DEFAULT_SETUPS, type: 'single', isSystem: true, iconKey: 'setup', color: 'text-indigo-500' },
            { id: 'custom_tags', label: 'Custom Tags', options: ["Did not sleep well", "Phone Distraction"], type: 'multi', isSystem: false, iconKey: 'custom', color: 'text-emerald-500' }
        ];
    });

    // Modals for Category Management
    const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [manageActiveCatId, setManageActiveCatId] = useState<string>('mistakes');
    const [manageNewTag, setManageNewTag] = useState('');

    useEffect(() => {
        localStorage.setItem('tradeGrail_categoryDefs', JSON.stringify(categoryDefs));
    }, [categoryDefs]);

    // Close strategy menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (strategyMenuRef.current && !strategyMenuRef.current.contains(event.target as Node)) {
                setIsStrategyMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync strategies to 'setup' category options
    useEffect(() => {
        if (strategies && strategies.length > 0) {
            const strategyNames = strategies.map(s => s.name);
            setCategoryDefs(prev => {
                return prev.map(c => {
                    if (c.id === 'setup') {
                        // Only update if different to avoid infinite loops if utilizing objects
                        // Simple array comparison (assuming order matters or sort first)
                        if (JSON.stringify(c.options) !== JSON.stringify(strategyNames)) {
                             return { ...c, options: strategyNames };
                        }
                    }
                    return c;
                });
            });
        }
    }, [strategies]);

    // Sync state when trade prop changes & handle Auto-save indicator
    useEffect(() => {
        // If we switched to a completely different trade ID, fully reset
        if (trade.id !== currentTrade.id) {
            setCurrentTrade(trade);
            setNoteContent(trade.reviewNotes || trade.notes || '');
            setSaveStatus('saved');
        } else {
            // Same trade, just updated data (likely from our own save or background sync)
            // We update currentTrade reference, but NOT noteContent to avoid overwriting user typing
            // We DO update status to 'saved' to acknowledge the sync finished
            setCurrentTrade(trade);
            setSaveStatus('saved');
        }
    }, [trade, currentTrade.id]);

    // --- AUTO SAVE TO NOTEBOOK LOGIC ---
    useEffect(() => {
        // Debounce auto-save to notebook
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        
        // Normalize comparison to avoid false positives with null/undefined
        const currentSavedContent = currentTrade.reviewNotes || currentTrade.notes || '';
        const currentLocalContent = noteContent || '';

        if (currentLocalContent !== currentSavedContent) {
            setSaveStatus('saving');
            autoSaveTimerRef.current = setTimeout(() => {
                // Perform Save to Notebook
                if (onSavePlan) {
                    const planId = `review-${currentTrade.id}`;
                    const tradeDate = new Date(currentTrade.entryDate).toISOString().slice(0, 10);
                    const newPlan: DailyPlan = {
                        id: planId,
                        date: tradeDate,
                        title: `Review: ${currentTrade.symbol} - ${tradeDate}`,
                        folder: 'daily-journal',
                        content: noteContent,
                        focusTickers: [currentTrade.symbol],
                        linkedTradeIds: [currentTrade.id]
                    };
                    onSavePlan(newPlan);
                    // We rely on the subsequent onUpdateTrade -> parent update -> prop update -> effect to set status to 'saved'
                    
                    // Also update local trade state
                    onUpdateTrade({ ...currentTrade, reviewNotes: noteContent });
                } else {
                    setSaveStatus('saved');
                }
            }, 1500); // 1.5s delay
        }
    }, [noteContent, onSavePlan, currentTrade]);

    // --- DRAG HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !rightPanelRef.current) return;
            
            const rect = rightPanelRef.current.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            let newRatio = (relativeY / rect.height) * 100;
            
            // Constrain ratio (min 20%, max 80%)
            newRatio = Math.max(20, Math.min(80, newRatio));
            setSplitRatio(newRatio);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
        } else {
            document.body.style.cursor = 'default';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isDragging]);


    const currentIndex = allTrades?.findIndex(t => t.id === currentTrade.id) ?? -1;
    
    // NAVIGATION LOGIC: 
    // Left Arrow (<) goes to Index - 1 (Newer trade in standard desc list)
    // Right Arrow (>) goes to Index + 1 (Older trade in standard desc list)
    
    const handlePrev = () => {
        if (allTrades && currentIndex > 0) {
            onUpdateTrade({...currentTrade, reviewNotes: noteContent}); // Save current before switch
            setCurrentTrade(allTrades[currentIndex - 1]);
        }
    };

    const handleNext = () => {
        if (allTrades && currentIndex < allTrades.length - 1) {
            onUpdateTrade({...currentTrade, reviewNotes: noteContent}); // Save current before switch
            setCurrentTrade(allTrades[currentIndex + 1]);
        }
    };

    const handleSave = () => {
        onUpdateTrade({
            ...currentTrade,
            reviewNotes: noteContent
        });
        setSaveStatus('saved');
    };

    // Load TradingView Advanced Chart Widget
    useEffect(() => {
        const chartContainer = chartContainerRef.current;
        if (!chartContainer) return;

        while (chartContainer.firstChild) {
            chartContainer.removeChild(chartContainer.firstChild);
        }

        // Build TradingView symbol: ensure USDT suffix + BINANCE prefix
        let tvSymbol = currentTrade.symbol.replace(/_PERP$/, '').replace(/\//, '').toUpperCase();
        if (!tvSymbol.endsWith('USDT') && !tvSymbol.endsWith('BUSD')) tvSymbol += 'USDT';
        if (!tvSymbol.includes(':')) tvSymbol = `BINANCE:${tvSymbol}`;

        const isDark = document.documentElement.classList.contains('dark');

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.textContent = JSON.stringify({
            autosize: true,
            symbol: tvSymbol,
            interval: '15',
            timezone: 'Etc/UTC',
            theme: isDark ? 'dark' : 'light',
            style: '1',
            locale: language === 'cn' ? 'zh_CN' : 'en',
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            save_image: false,
            calendar: false,
            studies: ['Volume@tv-basicstudies'],
            support_host: 'https://www.tradingview.com',
        });
        chartContainer.appendChild(script);

        return () => {
            try {
                while (chartContainer.firstChild) {
                    chartContainer.removeChild(chartContainer.firstChild);
                }
            } catch { /* ignore cleanup errors */ }
        };
    }, [currentTrade.symbol, language]);

    // --- Dynamic Tag Handlers ---
    const handleAddTag = (catId: string, tag: string) => {
        // 1. Add to Available Options if not exists
        const catDef = categoryDefs.find(c => c.id === catId);
        if (catDef && !catDef.options.includes(tag)) {
            const newDefs = categoryDefs.map(c => c.id === catId ? { ...c, options: [...c.options, tag] } : c);
            setCategoryDefs(newDefs);
        }

        // 2. Add to Trade
        if (catId === 'mistakes') {
            const updated = { ...currentTrade, mistakes: [...(currentTrade.mistakes || []), tag] };
            setCurrentTrade(updated);
            onUpdateTrade(updated);
        } else if (catId === 'setup') {
            const updated = { ...currentTrade, setup: tag };
            setCurrentTrade(updated);
            onUpdateTrade(updated);
        } else {
            // Custom Categories
            const currentTags = currentTrade.customTags?.[catId] || [];
            if (!currentTags.includes(tag)) {
                const newCustomTags = { ...currentTrade.customTags, [catId]: [...currentTags, tag] };
                const updated = { ...currentTrade, customTags: newCustomTags };
                setCurrentTrade(updated);
                onUpdateTrade(updated);
            }
        }
    };

    const handleRemoveTag = (catId: string, tag: string) => {
        if (catId === 'mistakes') {
            const updated = { ...currentTrade, mistakes: currentTrade.mistakes?.filter(m => m !== tag) };
            setCurrentTrade(updated);
            onUpdateTrade(updated);
        } else if (catId === 'setup') {
            const updated = { ...currentTrade, setup: '' };
            setCurrentTrade(updated);
            onUpdateTrade(updated);
        } else {
            const currentTags = currentTrade.customTags?.[catId] || [];
            const newCustomTags = { ...currentTrade.customTags, [catId]: currentTags.filter(t => t !== tag) };
            const updated = { ...currentTrade, customTags: newCustomTags };
            setCurrentTrade(updated);
            onUpdateTrade(updated);
        }
    };

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) return;
        const newId = newCategoryName.toLowerCase().replace(/\s+/g, '_');
        if (categoryDefs.some(c => c.id === newId)) {
            alert("Category already exists");
            return;
        }
        
        // Randomly assign color
        const colors = ['text-pink-500', 'text-purple-500', 'text-cyan-500', 'text-orange-500'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newCat: CategoryDef = {
            id: newId,
            label: newCategoryName,
            options: [],
            type: 'multi',
            isSystem: false,
            iconKey: 'custom', // Default icon for new cats
            color: randomColor
        };
        setCategoryDefs([...categoryDefs, newCat]);
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
    };

    const handleRenameCategory = (id: string, newName: string) => {
        setCategoryDefs(prev => prev.map(c => c.id === id ? { ...c, label: newName } : c));
    };

    const handleDeleteCategory = (id: string) => {
        if(window.confirm("Delete this category?")) {
            setCategoryDefs(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleManageAddTag = () => {
        if (!manageNewTag.trim()) return;
        setCategoryDefs(prev => prev.map(c => 
            c.id === manageActiveCatId && !c.options.includes(manageNewTag) 
            ? { ...c, options: [...c.options, manageNewTag] } 
            : c
        ));
        setManageNewTag('');
    };

    const handleManageDeleteTag = (tag: string) => {
        setCategoryDefs(prev => prev.map(c => 
            c.id === manageActiveCatId 
            ? { ...c, options: c.options.filter(o => o !== tag) } 
            : c
        ));
    };

    // --- Playbook Logic ---
    const activeStrategy = strategies?.find(s => s.name === currentTrade.setup);
    
    // Group checklist items by section (Title: Rule) or "General"
    const playbookSections = useMemo(() => {
        if (!activeStrategy) return [];
        const sections: { title: string; rules: ChecklistItem[] }[] = [];
        const map: Record<string, ChecklistItem[]> = {};
        const general: ChecklistItem[] = [];

        activeStrategy.checklist.forEach(item => {
            const match = item.text.match(/^(.+?):\s*(.*)$/);
            if (match) {
                const title = match[1].trim();
                const ruleText = match[2].trim();
                // Create a temporary item for display that only shows the rule part
                const displayItem = { ...item, text: ruleText };
                if (!map[title]) map[title] = [];
                map[title].push(displayItem);
            } else {
                general.push(item);
            }
        });

        Object.keys(map).forEach(title => {
            sections.push({ title, rules: map[title] });
        });

        if (general.length > 0) {
            sections.push({ title: 'General Rules', rules: general });
        }

        return sections;
    }, [activeStrategy]);

    const handleToggleRuleCompliance = (ruleId: string) => {
        const currentCompliance = currentTrade.compliance || {};
        const newStatus = !currentCompliance[ruleId];
        const newCompliance = { ...currentCompliance, [ruleId]: newStatus };
        
        // Calculate new grade based on unified truth
        let newGrade = '-';
        if (activeStrategy) {
            const total = activeStrategy.checklist.length;
            const checked = activeStrategy.checklist.filter(i => newCompliance[i.id]).length;
            newGrade = calculateGradeFromPercent((checked / total) * 100);
        }

        const updated = { 
            ...currentTrade, 
            compliance: newCompliance,
            executionGrade: newGrade
        };
        setCurrentTrade(updated);
        onUpdateTrade(updated);
    };

    const handleCheckAllRules = () => {
        if (!activeStrategy) return;
        const newCompliance = { ...currentTrade.compliance };
        activeStrategy.checklist.forEach(item => {
            newCompliance[item.id] = true;
        });
        const updated = { ...currentTrade, compliance: newCompliance, executionGrade: 'A+' };
        setCurrentTrade(updated);
        onUpdateTrade(updated);
    };

    const calculateComplianceProgress = () => {
        if (!activeStrategy || activeStrategy.checklist.length === 0) return 0;
        const total = activeStrategy.checklist.length;
        const checked = activeStrategy.checklist.filter(item => currentTrade.compliance?.[item.id]).length;
        return (checked / total) * 100;
    };

    const complianceProgress = calculateComplianceProgress();

    // --- Execution Stats (Refactored to match truth) ---
    const executionStats = useMemo(() => {
        if (!activeStrategy || activeStrategy.checklist.length === 0) {
            return { percent: 0, label: 'N/A', color: 'bg-slate-200', textColor: 'text-slate-400', checked: 0, total: 0 };
        }
        
        const total = activeStrategy.checklist.length;
        const checked = activeStrategy.checklist.filter(i => currentTrade.compliance?.[i.id]).length;
        const percent = Math.round((checked / total) * 100);

        // UI only: determine color based on grade
        const grade = currentTrade.executionGrade || '-';
        let color = 'bg-rose-500';
        if (grade.startsWith('A')) color = 'bg-emerald-500';
        else if (grade === 'B') color = 'bg-blue-500';
        else if (grade === 'C') color = 'bg-yellow-500';

        return { percent, label: grade, color, checked, total };
    }, [activeStrategy, currentTrade.compliance, currentTrade.executionGrade]);

    const setRating = (r: number) => {
        const updated = { ...currentTrade, rating: r };
        setCurrentTrade(updated);
        onUpdateTrade(updated);
    };

    const isWin = currentTrade.pnl >= 0;
    const pnlHex = isWin ? '#00c896' : '#ff4d4d';
    const pnlColor = isWin ? 'text-emerald-500' : 'text-rose-500';
    const borderColor = isWin ? 'border-emerald-500' : 'border-rose-500';

    // Calculate Computed Stats
    const riskAmount = currentTrade.riskAmount || 0;
    const grossPnl = currentTrade.pnl + currentTrade.fees;
    const realizedR = riskAmount > 0 ? (currentTrade.pnl / riskAmount).toFixed(2) + 'R' : 'N/A';

    // Net ROI %
    const adjustedCost = currentTrade.entryPrice * currentTrade.quantity;
    const netRoi = adjustedCost > 0 ? (currentTrade.pnl / adjustedCost) * 100 : 0;
    const leverage = currentTrade.leverage ?? 1;
    const margin = leverage > 1 ? adjustedCost / leverage : (currentTrade.riskAmount || null);

    // Duration
    const durationStr = (() => {
        if (!currentTrade.entryDate || !currentTrade.exitDate) return '--';
        const start = new Date(currentTrade.entryDate);
        const end = new Date(currentTrade.exitDate);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs <= 0) return '--';
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(' ');
    })();

    // Risk & Reward calculations (based on user-input profitTarget / stopLoss)
    const tradeRisk = currentTrade.stopLoss && currentTrade.entryPrice && currentTrade.quantity
        ? Math.abs(currentTrade.entryPrice - currentTrade.stopLoss) * currentTrade.quantity
        : null;
    const initialTarget = currentTrade.profitTarget && currentTrade.entryPrice && currentTrade.quantity
        ? Math.abs(currentTrade.profitTarget - currentTrade.entryPrice) * currentTrade.quantity
        : null;
    const plannedR = tradeRisk && tradeRisk > 0 && initialTarget != null
        ? (initialTarget / tradeRisk).toFixed(2) + 'R'
        : 'N/A';
    const realizedRFromTarget = tradeRisk && tradeRisk > 0
        ? (currentTrade.pnl / tradeRisk).toFixed(2) + 'R'
        : realizedR;

    // Calculate Implied Stop Loss Price based on risk amount
    let impliedStopLoss = '--';
    if (currentTrade.entryPrice && currentTrade.quantity && riskAmount) {
        const riskPerUnit = riskAmount / currentTrade.quantity;
        const slPrice = currentTrade.direction === Direction.LONG
            ? currentTrade.entryPrice - riskPerUnit
            : currentTrade.entryPrice + riskPerUnit;
        impliedStopLoss = slPrice.toFixed(2);
    }

    // Risk Gauge score + tooltip data
    const currentAccount = tradingAccounts?.find(a => a.id === currentTrade.accountId);
    const totalAsset = currentAccount?.type === 'auto_sync' && currentAccount.balance
        ? currentAccount.balance
        : currentAccount?.type === 'manual' && currentAccount.manualBalance != null
        ? currentAccount.manualBalance
        : null;

    const riskMissingHint = (() => {
        if (totalAsset == null) return '请设置账户总资产';
        const hasRiskAmount = (currentTrade.riskAmount ?? 0) > 0;
        const hasStopLoss = !!currentTrade.stopLoss && !!currentTrade.entryPrice;
        if (!hasRiskAmount && !hasStopLoss) return '请填写风险金额或计划止损价';
        return null;
    })();

    const riskGaugeScore = useMemo(() => {
        if (totalAsset == null || totalAsset <= 0) return null;
        let riskAmount = currentTrade.riskAmount ?? 0;
        if (riskAmount <= 0 && currentTrade.stopLoss && currentTrade.entryPrice && currentTrade.quantity) {
            riskAmount = Math.abs(currentTrade.entryPrice - currentTrade.stopLoss) * currentTrade.quantity;
        }
        if (riskAmount <= 0) return null;
        const riskAmountRatio = (riskAmount / totalAsset) * 100;
        const rrRatio = (currentTrade.profitTarget && currentTrade.stopLoss && currentTrade.entryPrice)
            ? Math.abs(currentTrade.profitTarget - currentTrade.entryPrice) / Math.abs(currentTrade.entryPrice - currentTrade.stopLoss)
            : 1;
        return Math.max(0, Math.min(100, calcRiskScore(riskAmountRatio, rrRatio)));
    }, [totalAsset, currentTrade.riskAmount, currentTrade.stopLoss, currentTrade.profitTarget, currentTrade.entryPrice, currentTrade.quantity]);

    const riskTooltipData: RiskTooltipData = useMemo(() => {
        const isPending = riskGaugeScore === null;
        const s = riskGaugeScore ?? 0;

        // compute metrics
        let riskAmt = currentTrade.riskAmount ?? 0;
        if (riskAmt <= 0 && currentTrade.stopLoss && currentTrade.entryPrice && currentTrade.quantity) {
            riskAmt = Math.abs(currentTrade.entryPrice - currentTrade.stopLoss) * currentTrade.quantity;
        }
        const positionRatio = totalAsset && adjustedCost > 0 ? (adjustedCost / totalAsset) * 100 : null;
        const stopLossPercent = currentTrade.stopLoss && currentTrade.entryPrice
            ? Math.abs(currentTrade.entryPrice - currentTrade.stopLoss) / currentTrade.entryPrice * 100
            : null;
        const rrRatio = (currentTrade.profitTarget && currentTrade.stopLoss && currentTrade.entryPrice)
            ? Math.abs(currentTrade.profitTarget - currentTrade.entryPrice) / Math.abs(currentTrade.entryPrice - currentTrade.stopLoss)
            : null;
        const maxLoss = riskAmt > 0 ? riskAmt : null;

        if (isPending) {
            return {
                score: null, label: '待评估', color: '#aaaacc', isPending: true,
                analysisText: null,
                metrics: { positionRatio, stopLossPercent, rrRatio, maxLoss },
                footerText: '补充数据后将自动计算并显示风险评级',
                missingHint: riskMissingHint ?? undefined,
            };
        }

        const { label, color } = getRiskLevel(s);
        const posStr = positionRatio != null ? `${positionRatio.toFixed(1)}%` : null;
        const slStr = stopLossPercent != null ? `${stopLossPercent.toFixed(1)}%` : null;
        const rrStr = rrRatio != null ? `${rrRatio.toFixed(2)}R` : null;
        const maxLossStr = maxLoss != null ? maxLoss.toFixed(0) : null;
        const currency = currentAccount?.currency || '';

        // 每个维度独立判断，只说有问题的，不说废话
        const issues: string[] = [];
        if (positionRatio != null) {
            if (positionRatio > 25) issues.push(`仓位 ${posStr}，超出建议上限 ${(positionRatio - 10).toFixed(1)}%，单笔风险过高`);
            else if (positionRatio > 10) issues.push(`仓位 ${posStr}，超出 10% 建议上限 ${(positionRatio - 10).toFixed(1)}%`);
        }
        if (stopLossPercent != null) {
            if (stopLossPercent > 8) issues.push(`止损距离 ${slStr}，超出合理范围 ${(stopLossPercent - 5).toFixed(1)}%`);
            else if (stopLossPercent > 5) issues.push(`止损距离 ${slStr}，偏宽 ${(stopLossPercent - 5).toFixed(1)}%`);
        }
        if (rrRatio != null) {
            if (rrRatio < 1) issues.push(`盈亏比仅 ${rrStr}，期望值为负`);
            else if (rrRatio < 1.5) issues.push(`盈亏比 ${rrStr}，建议至少达到 1.5R`);
        }
        if (maxLoss != null && totalAsset && (maxLoss / totalAsset) > 0.02) {
            issues.push(`最大亏损 ${maxLossStr} ${currency}，超过账户 2%`);
        }

        const analysisText = issues.length === 0
            ? `风险金额 ${maxLossStr ? maxLossStr + ' ' + currency : '--'}，各项指标均在合理范围内。`
            : issues.join('；') + '。';

        // 底部建议也根据最严重的问题给出
        let footerText = '';
        let footerHighlight: string | undefined;
        if (maxLoss != null && totalAsset) {
            const pct = (maxLoss / totalAsset * 100).toFixed(1);
            if (parseFloat(pct) > 2) {
                footerText = `本笔风险占账户 ${pct}%，超过 2% 法则建议上限`;
                footerHighlight = '2% 法则';
            } else {
                footerText = `本笔风险占账户 ${pct}%，符合 2% 法则`;
                footerHighlight = '2% 法则';
            }
        } else {
            footerText = '补充止损价格或风险金额可获得更精准的评估';
        }

        return {
            score: s, label, color, isPending: false,
            analysisText,
            metrics: { positionRatio, stopLossPercent, rrRatio, maxLoss },
            footerText,
            footerHighlight,
        };
    }, [riskGaugeScore, totalAsset, adjustedCost, currentTrade.riskAmount, currentTrade.stopLoss, currentTrade.profitTarget, currentTrade.entryPrice, currentTrade.quantity, riskMissingHint]);

    // Localized Labels
    const labels = {
        edit: language === 'cn' ? '编辑' : 'Edit',
        share: language === 'cn' ? '分享' : 'Share',
        back: language === 'cn' ? '返回日志' : 'Back to Journal',
        tabs: {
            stats: language === 'cn' ? '统计数据' : 'Stats',
            playbook: language === 'cn' ? '策略手册' : 'Playbook',
            executions: language === 'cn' ? '成交明细' : 'Executions',
            attachments: language === 'cn' ? '附件截图' : 'Attachments',
        },
        stats: {
            netPnl: language === 'cn' ? '净盈亏' : 'Net P&L',
            netRoi: language === 'cn' ? '净收益率' : 'Net ROI',
            account: language === 'cn' ? '账户' : 'Account',
            strategy: language === 'cn' ? '策略' : 'Strategy',
            side: language === 'cn' ? '方向' : 'Side',
            leverage: language === 'cn' ? '杠杆' : 'Leverage',
            contracts: language === 'cn' ? '交易数量' : 'Quantity',
            adjustedCost: language === 'cn' ? '持仓价值' : 'Position Value',
            margin: language === 'cn' ? '保证金' : 'Margin',
            entryTime: language === 'cn' ? '入场时间' : 'Entry Time',
            exitTime: language === 'cn' ? '出场时间' : 'Exit Time',
            entryPrice: language === 'cn' ? '入场价格' : 'Entry Price',
            exitPrice: language === 'cn' ? '出场价格' : 'Exit Price',
            grossPnl: language === 'cn' ? '毛利润' : 'Gross P&L',
            fees: language === 'cn' ? '手续费' : 'Fees',
            duration: language === 'cn' ? '持仓时间' : 'Duration',
            playbook: language === 'cn' ? '策略' : 'Playbook',
            grailScale: language === 'cn' ? '执行评分' : 'Execution Score',
            maeMfe: "MAE / MFE",
            rating: language === 'cn' ? '交易评分' : 'Trade Rating',
            profitTarget: language === 'cn' ? '目标止盈价格' : 'Profit Target',
            stopLoss: language === 'cn' ? '计划止损价格' : 'Stop Loss',
            initialTarget: language === 'cn' ? '初始目标' : 'Initial Target',
            tradeRisk: language === 'cn' ? '交易风险' : 'Trade Risk',
            plannedR: language === 'cn' ? '计划盈亏比' : 'Planned R',
            realizedR: language === 'cn' ? '实际盈亏比' : 'Realized R',
            selectTag: language === 'cn' ? '选择标签' : 'Select tag',
        },
        playbook: {
            title: language === 'cn' ? '策略规则' : 'Playbook Rules',
            strategyName: language === 'cn' ? '策略名称' : 'Strategy Name',
            noStrategy: language === 'cn' ? '未选择策略' : 'No strategy selected',
            selectStrategy: language === 'cn' ? '选择策略' : 'Select Strategy',
            rulesFollowed: language === 'cn' ? '规则执行情况' : 'Rules Followed',
            checkAll: language === 'cn' ? '全选' : 'CHECK ALL',
            addPlaybookDesc: language === 'cn' ? '为您的交易添加策略并跟踪效果' : 'Add a Playbook to your trade and track what works'
        },
        executions: {
            title: language === 'cn' ? '订单历史' : 'Order History',
            entryFill: language === 'cn' ? '开仓成交' : 'Entry Fill',
            exitFill: language === 'cn' ? '平仓成交' : 'Exit Fill',
            limitOrder: language === 'cn' ? '限价单' : 'Limit',
            marketOrder: language === 'cn' ? '市价单' : 'Market',
            buy: language === 'cn' ? '买入' : 'Buy',
            sell: language === 'cn' ? '卖出' : 'Sell',
        },
        attachments: {
            title: language === 'cn' ? '图表截图' : 'Screenshots',
            none: language === 'cn' ? '暂无附件' : 'No attachments',
            upload: language === 'cn' ? '+ 上传图片' : '+ Upload Image',
        },
        notes: {
            title: language === 'cn' ? '交易笔记' : 'Trade Notes',
            executions: language === 'cn' ? '成交明细' : 'Executions',
            placeholder: language === 'cn' ? '在此处撰写复盘... 哪些做得好？哪些做错了？' : 'Write your review here... What went well? What went wrong?',
            autoSaved: language === 'cn' ? '已自动保存' : 'Auto-saved',
        }
    };

    const getGradeColorClass = (grade?: string) => {
        if (!grade || grade === '-') return 'text-slate-400';
        if (grade.startsWith('A')) return 'text-emerald-500';
        if (grade === 'B') return 'text-yellow-500';
        if (grade === 'C' || grade === 'D') return 'text-rose-500';
        return 'text-slate-400';
    };

    const activeCategory = categoryDefs.find(c => c.id === manageActiveCatId);

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 animate-fade-in overflow-hidden">
            
            {/* Header */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-950 shrink-0 z-10">
                <div className="flex items-center gap-6">
                    {/* Navigation Group */}
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button 
                            onClick={onClose}
                            className="p-1.5 px-3 border-r border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Trade List"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={handlePrev}
                            disabled={!allTrades || currentIndex <= 0}
                            className="p-1.5 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-200 dark:border-slate-700"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={handleNext}
                            disabled={!allTrades || currentIndex >= allTrades.length - 1}
                            className="p-1.5 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Title Info */}
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                                {currentTrade.symbol}
                            </h2>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {new Date(currentTrade.entryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5 tracking-wide">
                           {new Date(currentTrade.entryDate).toISOString().split('T')[0]} • {new Date(currentTrade.entryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-5">
                    {/* Mark as Reviewed */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                        <div
                            onClick={() => setIsReviewed(!isReviewed)}
                            className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                                isReviewed
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-400'
                            }`}
                        >
                            {isReviewed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-xs font-medium transition-colors ${
                            isReviewed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}>
                            {language === 'cn' ? '标记为已复盘' : 'Reviewed'}
                        </span>
                    </label>

                    {/* Logo */}
                    <img
                        src="/lion-care.png"
                        alt="TradeGrail"
                        className="w-10 h-10 rounded-full object-cover"
                        title="TradeGrail"
                    />

                    {/* Share Button */}
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(`${currentTrade.symbol} | ${currentTrade.direction} | PnL: $${currentTrade.pnl.toFixed(2)}`);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                        title={language === 'cn' ? '分享' : 'Share'}
                    >
                        <Share2 className="w-4.5 h-4.5" />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Body Layout */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* LEFT SIDEBAR: Trade Details */}
                <div className="w-96 bg-white dark:bg-[#0d0f14] border-r border-slate-200 dark:border-white/[0.04] flex flex-col flex-shrink-0">
                    
                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:border-indigo-400">
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>{labels.edit}</span>
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:border-indigo-400">
                                <Share2 className="w-3.5 h-3.5" />
                                <span>{labels.share}</span>
                            </button>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5">
                            {/* Status Badge */}
                            <span className={`text-[10px] font-medium px-2 py-1 rounded uppercase tracking-wider ${
                                currentTrade.status === TradeStatus.WIN ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                currentTrade.status === TradeStatus.LOSS ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                                'bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400'
                            }`}>
                                {currentTrade.status}
                            </span>

                            {/* Save Indicator */}
                            <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide transition-all duration-300 ${saveStatus === 'saving' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                {saveStatus === 'saving' ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>{language === 'cn' ? '保存中...' : 'Saving...'}</span>
                                    </>
                                ) : (saveStatus === 'synced' || saveStatus === 'saved') ? (
                                    <>
                                        <BookMarked className="w-3 h-3" />
                                        <span>{language === 'cn' ? '已同步到笔记本' : 'Saved to Notebook'}</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>{language === 'cn' ? '已保存' : 'Saved'}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="px-5 pb-0">
                        <div className="flex gap-0 border-b border-slate-200 dark:border-white/[0.06]">
                            {['stats', 'playbook', 'executions', 'attachments'].map(tabKey => {
                                const id = tabKey as typeof leftTab;
                                const isActive = leftTab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setLeftTab(id)}
                                        className={`px-3 pb-3 pt-1 text-[11px] font-medium uppercase tracking-wider transition-all duration-200 relative ${
                                            isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {labels.tabs[id]}
                                        {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: '#818cf8' }} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SCROLLABLE CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* --- TAB: STATS --- */}
                        {leftTab === 'stats' && (
                            <>
                                {/* Top PnL Block */}
                                <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-normal uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">{labels.stats.netPnl}</p>
                                        <div className="flex items-baseline gap-3">
                                            <h3 className={`text-[32px] font-semibold tracking-tight leading-none ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {currentTrade.pnl >= 0 ? '+' : ''}{currentTrade.pnl.toFixed(2)}
                                            </h3>
                                            <span className={`text-[14px] font-medium opacity-70 ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {netRoi >= 0 ? '+' : ''}{netRoi.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <RiskGauge score={riskGaugeScore} tooltipData={riskTooltipData} />
                                    </div>
                                </div>

                                {/* Stats Rows */}
                                <div className="px-5 pb-4">

                                    {/* ── Basic Info ── */}
                                    <p className="text-[10px] font-medium uppercase tracking-[1.2px] pb-2 pt-1 text-slate-400 dark:text-slate-500">{language === 'cn' ? '基本信息' : 'BASIC INFO'}</p>
                                    {currentTrade.accountId && tradingAccounts && (
                                        <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.account}</span>
                                            <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">
                                                {tradingAccounts.find(a => a.id === currentTrade.accountId)?.name || currentTrade.accountId}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.side}</span>
                                        <span className={`text-[13px] font-medium uppercase ${currentTrade.direction === Direction.LONG ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {currentTrade.direction}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.strategy}</span>
                                        {activeStrategy
                                            ? <span className="text-[13px] font-medium text-indigo-500 dark:text-indigo-400">{activeStrategy.name}</span>
                                            : <span className="text-[13px] text-slate-300 dark:text-slate-600">--</span>
                                        }
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.netRoi}</span>
                                        <span className={`text-[13px] font-medium font-mono ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>{netRoi >= 0 ? '+' : ''}{netRoi.toFixed(2)}%</span>
                                    </div>
                                    {(currentTrade.leverage ?? 1) > 1 && (
                                        <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.leverage}</span>
                                            <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">{currentTrade.leverage}x</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.contracts}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">{currentTrade.quantity}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.adjustedCost}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">${adjustedCost.toFixed(2)}</span>
                                    </div>
                                    {margin != null && margin > 0 && (
                                        <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.margin}</span>
                                            <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">${margin.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.entryTime}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">
                                            {currentTrade.entryDate ? new Date(currentTrade.entryDate).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.exitTime}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">
                                            {currentTrade.exitDate ? new Date(currentTrade.exitDate).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}
                                        </span>
                                    </div>

                                    {/* 执行评分 — 持仓成本下方 */}
                                    <div className="py-2 border-b border-slate-100 dark:border-white/[0.04]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[13px] flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                <Trophy className="w-3.5 h-3.5" fill="#818cf8" strokeWidth={0} />
                                                {labels.stats.grailScale}
                                            </span>
                                            <span className={`text-[16px] font-bold font-mono leading-none ${getGradeColorClass(currentTrade.executionGrade)}`}>
                                                {currentTrade.executionGrade || '-'}
                                            </span>
                                        </div>
                                        <div className="relative h-[6px] rounded-full overflow-hidden mb-1.5 bg-slate-100 dark:bg-white/[0.06]">
                                            <div className="h-full transition-all duration-700 ease-out rounded-full" style={{ width: `${executionStats.percent}%`, background: '#818cf8' }}></div>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                                            <span>Based on Playbook rules</span>
                                            <span className="font-mono font-medium">{executionStats.checked}/{executionStats.total} Rules</span>
                                        </div>
                                    </div>

                                    {/* ── Price Info ── */}
                                    <p className="text-[10px] font-medium uppercase tracking-[1.2px] pb-2 pt-5 text-slate-400 dark:text-slate-500">{language === 'cn' ? '价格信息' : 'PRICE INFO'}</p>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.entryPrice}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">${currentTrade.entryPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.exitPrice}</span>
                                        <span className={`text-[13px] font-medium font-mono ${currentTrade.exitPrice ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{currentTrade.exitPrice ? `$${currentTrade.exitPrice.toFixed(2)}` : '--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] font-medium" style={{ color: '#00c896' }}>{labels.stats.profitTarget}</span>
                                        <input
                                            type="number" step="any" placeholder="--"
                                            value={currentTrade.profitTarget ?? ''}
                                            onChange={(e) => { const val = e.target.value ? parseFloat(e.target.value) : undefined; setCurrentTrade(prev => ({ ...prev, profitTarget: val })); }}
                                            onBlur={() => onUpdateTrade({ ...currentTrade })}
                                            className="w-24 text-right text-[13px] font-mono font-medium outline-none bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] font-medium" style={{ color: '#ff4d4d' }}>{labels.stats.stopLoss}</span>
                                        <input
                                            type="number" step="any" placeholder="--"
                                            value={currentTrade.stopLoss ?? ''}
                                            onChange={(e) => { const val = e.target.value ? parseFloat(e.target.value) : undefined; setCurrentTrade(prev => ({ ...prev, stopLoss: val })); }}
                                            onBlur={() => onUpdateTrade({ ...currentTrade })}
                                            className="w-24 text-right text-[13px] font-mono font-medium outline-none bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
                                        />
                                    </div>

                                    {/* 交易评分 — 计划止损价格下方 */}
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.rating}</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button key={star} onClick={() => setRating(star)} className="p-0.5 transition-transform hover:scale-110">
                                                    <Star className={`w-[18px] h-[18px] fill-current ${(currentTrade.rating || 0) >= star ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── P&L Details ── */}
                                    <p className="text-[10px] font-medium uppercase tracking-[1.2px] pb-2 pt-5 text-slate-400 dark:text-slate-500">{language === 'cn' ? '盈亏详情' : 'P&L DETAILS'}</p>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.grossPnl}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">${grossPnl.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.fees}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">${currentTrade.fees.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.duration}</span>
                                        <span className="text-[13px] font-medium font-mono text-slate-700 dark:text-slate-200">{durationStr}</span>
                                    </div>

                                    {/* ── Risk & Reward ── */}
                                    <p className="text-[10px] font-medium uppercase tracking-[1.2px] pb-2 pt-5 text-slate-400 dark:text-slate-500">{language === 'cn' ? '风险与回报' : 'RISK & REWARD'}</p>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.tradeRisk}</span>
                                        <span className={`text-[13px] font-medium font-mono ${tradeRisk != null ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{tradeRisk != null ? `$${tradeRisk.toFixed(2)}` : '--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.initialTarget}</span>
                                        <span className={`text-[13px] font-medium font-mono ${initialTarget != null ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{initialTarget != null ? `$${initialTarget.toFixed(2)}` : '--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.plannedR}</span>
                                        <span className={`text-[13px] font-medium font-mono ${plannedR !== 'N/A' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{plannedR}</span>
                                    </div>
                                    <div className="flex justify-between items-center h-[38px] border-b border-slate-100 dark:border-white/[0.04]">
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{labels.stats.realizedR}</span>
                                        <span className={`text-[13px] font-medium font-mono ${realizedRFromTarget !== 'N/A' ? (isWin ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-300 dark:text-slate-600'}`}>{realizedRFromTarget}</span>
                                    </div>

                                    {/* CATEGORIES SECTION */}
                                    <div className="mt-4 pt-4 space-y-2 border-t border-slate-100 dark:border-white/[0.04]">
                                        {categoryDefs.map(cat => (
                                            <TagSelector 
                                                key={cat.id}
                                                cat={cat}
                                                tags={
                                                    cat.id === 'mistakes' ? (currentTrade.mistakes || []) :
                                                    cat.id === 'setup' ? (currentTrade.setup ? [currentTrade.setup] : []) :
                                                    (currentTrade.customTags?.[cat.id] || [])
                                                }
                                                onAdd={(tag) => handleAddTag(cat.id, tag)}
                                                onRemove={(tag) => handleRemoveTag(cat.id, tag)}
                                                onDeleteCategory={() => handleDeleteCategory(cat.id)}
                                                onRenameCategory={(newName) => handleRenameCategory(cat.id, newName)}
                                            />
                                        ))}
                                    </div>

                                    {/* Add New Category Action */}
                                    <div className="flex justify-between items-center pt-3">
                                        <button
                                            onClick={() => setIsAddCategoryOpen(true)}
                                            className="text-[11px] font-medium transition-colors flex items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-indigo-500"
                                        >
                                            <Plus className="w-3 h-3" /> Add new category
                                        </button>
                                        <button
                                            onClick={() => setIsManageTagsOpen(true)}
                                            className="text-[11px] font-medium transition-colors flex items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-indigo-500"
                                        >
                                            <Settings className="w-3 h-3" /> Manage tags
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- TAB: PLAYBOOK --- */}
                        {leftTab === 'playbook' && (
                            <div className="p-6 h-full flex flex-col">
                                <div className="relative mb-6 z-20" ref={strategyMenuRef}>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                        {labels.playbook.selectStrategy}
                                    </label>
                                    <button
                                        onClick={() => setIsStrategyMenuOpen(!isStrategyMenuOpen)}
                                        className={`
                                            w-full flex items-center justify-between px-4 py-3.5 
                                            bg-white dark:bg-slate-800 border transition-all duration-200 rounded-xl
                                            ${isStrategyMenuOpen 
                                                ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-lg' 
                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-8 h-8 rounded-lg flex items-center justify-center text-lg
                                                ${activeStrategy ? '' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}
                                            `} style={activeStrategy ? { backgroundColor: `${activeStrategy.color || '#6366f1'}20`, color: activeStrategy.color || '#6366f1' } : {}}>
                                                {activeStrategy ? <BookOpen className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </div>
                                            <span className={`font-bold text-sm ${activeStrategy ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                {activeStrategy ? activeStrategy.name : labels.playbook.noStrategy}
                                            </span>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isStrategyMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isStrategyMenuOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up origin-top max-h-64 overflow-y-auto custom-scrollbar">
                                            {strategies?.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        const updated = { ...currentTrade, setup: s.name };
                                                        setCurrentTrade(updated);
                                                        onUpdateTrade(updated);
                                                        setIsStrategyMenuOpen(false);
                                                    }}
                                                    className={`
                                                        w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                                                        ${currentTrade.setup === s.name 
                                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' 
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                        }
                                                    `}
                                                >
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#94a3b8' }}></div>
                                                    {s.name}
                                                    {currentTrade.setup === s.name && <Check className="w-4 h-4 ml-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {activeStrategy ? (
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-6 border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-end mb-3">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.playbook.rulesFollowed}</span>
                                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                                        {Math.round(complianceProgress)}%
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                     <button 
                                                        onClick={handleCheckAllRules}
                                                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md"
                                                    >
                                                        {labels.playbook.checkAll}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-700 ease-out rounded-full ${complianceProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${complianceProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            {playbookSections.map((section, sIdx) => (
                                                <div key={sIdx} className="group/section">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 group-hover/section:bg-slate-200 transition-colors"></div>
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{section.title}</h4>
                                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 group-hover/section:bg-slate-200 transition-colors"></div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {section.rules.map(rule => {
                                                            const isChecked = currentTrade.compliance?.[rule.id] || false;
                                                            return (
                                                                <label key={rule.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${isChecked ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500/20' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'}`}>
                                                                    <div className="relative flex items-center justify-center mt-0.5">
                                                                        <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-emerald-500 transition-all cursor-pointer" checked={isChecked} onChange={() => handleToggleRuleCompliance(rule.id)} />
                                                                        <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                                                                    </div>
                                                                    <span className={`text-sm leading-snug transition-colors ${isChecked ? 'text-slate-500 line-through decoration-slate-400/50' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>{rule.text}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                                        <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Playbook Selected</h3>
                                        <button onClick={() => setIsStrategyMenuOpen(true)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md">{labels.playbook.selectStrategy}</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- TAB: EXECUTIONS & ATTACHMENTS (Unchanged) --- */}
                        {leftTab === 'executions' && (
                            <div className="p-6 space-y-4">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-500" /> {labels.executions.title}
                                </h3>
                                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{labels.executions.entryFill}</span>
                                        <span className="text-xs text-slate-400 font-mono">{new Date(currentTrade.entryDate).toLocaleTimeString()}</span>
                                    </div>
                                    <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">{currentTrade.quantity} @ {currentTrade.entryPrice}</span>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">{labels.executions.exitFill}</span>
                                        <span className="text-xs text-slate-400 font-mono">{currentTrade.exitDate ? new Date(currentTrade.exitDate).toLocaleTimeString() : '--:--:--'}</span>
                                    </div>
                                    <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">{currentTrade.quantity} @ {currentTrade.exitPrice || '---'}</span>
                                </div>
                            </div>
                        )}

                        {leftTab === 'attachments' && (
                            <div className="p-6">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-indigo-500" /> {labels.attachments.title}
                                </h3>
                                {currentTrade.images && currentTrade.images.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {currentTrade.images.map((img, i) => (
                                            <img key={i} src={img} className="w-full rounded-xl border border-slate-200 dark:border-slate-700" alt={`Screenshot ${i+1}`} />
                                        ))}
                                    </div>
                                ) : <div className="text-sm text-slate-500 italic">{labels.attachments.none}</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT CONTENT: Chart & Notes */}
                <div ref={rightPanelRef} className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 relative">
                    <div style={{ height: `${splitRatio}%` }} className="border-b border-slate-200 dark:border-slate-800 relative">
                        {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}

                        {/* TradingView Chart */}
                        <div ref={chartContainerRef} className="w-full h-full" />
                    </div>
                    <div onMouseDown={handleMouseDown} className="h-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 cursor-row-resize transition-colors flex items-center justify-center z-40 border-y border-slate-200 dark:border-slate-700">
                        <GripHorizontal className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/30 overflow-hidden pt-3">
                        <NotesPanel
                          dragHandleWidth={29}
                          symbol={currentTrade.symbol}
                          date={currentTrade.entryDate?.slice(0, 10)}
                          tradeNoteContent={noteContent}
                          dailyJournalContent=""
                          onContentChange={(tab, content) => {
                            if (tab === 'trade-note') setNoteContent(content);
                          }}
                          onSave={(tab, content) => {
                            if (tab === 'trade-note') {
                              setNoteContent(content);
                              handleSave();
                            }
                          }}
                          tradeMetadata={{
                            symbol: currentTrade.symbol,
                            date: currentTrade.entryDate?.slice(0, 10) || '',
                            dateFormatted: new Date(currentTrade.entryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                            direction: currentTrade.direction,
                            pnlPercent: `${currentTrade.pnl >= 0 ? '+' : ''}${((currentTrade.pnl / (currentTrade.entryPrice * currentTrade.quantity || 1)) * 100).toFixed(2)}%`,
                            account: currentTrade.accountId,
                            entryPrice: `$${currentTrade.entryPrice}`,
                            exitPrice: currentTrade.exitPrice ? `$${currentTrade.exitPrice}` : undefined,
                            leverage: currentTrade.leverage ? `${currentTrade.leverage}x` : undefined,
                            quantity: `${currentTrade.quantity}`,
                          }}
                          onDeleteNote={() => {
                            setNoteContent('');
                            handleSave();
                          }}
                        />
                    </div>
                </div>
            </div>

            {/* Modals (Existing) */}
            {isAddCategoryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm p-4 border border-slate-200">
                        <h3 className="font-bold mb-4">Add New Category</h3>
                        <input type="text" placeholder="Category Name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm mb-4" />
                        <button onClick={handleCreateCategory} disabled={!newCategoryName.trim()} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold">Create</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TradeReviewModal;