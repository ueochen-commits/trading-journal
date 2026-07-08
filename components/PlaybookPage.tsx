
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Strategy, Trade, ChecklistItem, TradeStatus, Direction, DailyPlan, StrategyNote } from '../types';
import { useLanguage } from '../LanguageContext';
import { useTour } from './TourContext';
import { Plus, MoreHorizontal, Lock, Trash2, RefreshCw, X, Edit2, Search, ArrowRight, CheckCircle2, Settings, ChevronDown, ArrowUp, ArrowDown, Layout, ExternalLink, LayoutGrid, List as ListIcon, GripVertical, ArrowLeft, Info, GripHorizontal, MoreVertical, Activity, BookMarked, Play, Bold, Sparkles, Wand2, Cloud, StickyNote } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MOCK_ACCOUNTS } from '../constants';
import TradeReviewModal from './TradeReviewModal';

interface PlaybookPageProps {
  strategies: Strategy[];
  trades: Trade[];
  onAddStrategy: (strategy: Strategy) => void;
  onUpdateStrategy: (strategy: Strategy) => void;
  onDeleteStrategy: (id: string) => void;
  onUpdateTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
  onSavePlan: (plan: DailyPlan) => void;
  autoCreate?: boolean;
  onResetAutoCreate?: () => void;
}

// --- Colors ---
const PLAYBOOK_COLORS = [
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#ef4444', // Rose
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#64748b', // Slate
];

// --- Helper Components ---

const CircularProgress = ({ percentage, size = 48, strokeWidth = 4, color = '#10b981' }: { percentage: number, size?: number, strokeWidth?: number, color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90 transition-all duration-500">
                <circle
                    className="text-slate-100 dark:text-slate-800"
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke={color}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
        </div>
    );
};

// --- Strategy Notes Component ---
const StrategyNotes = ({ strategy, onUpdate }: { strategy: Strategy, onUpdate: (notes: StrategyNote[]) => void }) => {
    const { language } = useLanguage();
    
    // Manage a list of notes/scenarios
    const [notes, setNotes] = useState<StrategyNote[]>(
        Array.isArray(strategy.notes) && strategy.notes.length > 0 
            ? strategy.notes 
            : [{ id: 'default', title: language === 'cn' ? '通用逻辑' : 'General Logic', content: '' }]
    );
    const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || 'default');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimerRef = useRef<any>(null);

    const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

    // Reset view when strategy changes
    useEffect(() => {
        if (Array.isArray(strategy.notes)) {
            const initialNotes = strategy.notes.length > 0 ? strategy.notes : [{ id: 'default', title: language === 'cn' ? '通用逻辑' : 'General Logic', content: '' }];
            setNotes(initialNotes);
            setActiveNoteId(initialNotes[0].id);
        }
    }, [strategy.id]);

    // Update editor content when active note changes
    useEffect(() => {
        if (editorRef.current) {
            if (editorRef.current.innerHTML !== activeNote.content) {
                editorRef.current.innerHTML = activeNote.content || '<p><br></p>';
            }
        }
    }, [activeNoteId]);

    const handleContentChange = (html: string) => {
        setSaveStatus('saving');
        const updatedNotes = notes.map(n => n.id === activeNoteId ? { ...n, content: html } : n);
        setNotes(updatedNotes);

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            onUpdate(updatedNotes);
            setSaveStatus('saved');
        }, 1200);
    };

    const handleAddNote = () => {
        const newNote: StrategyNote = {
            id: Date.now().toString(),
            title: language === 'cn' ? '新场景' : 'New Scenario',
            content: '<p><br></p>'
        };
        const updated = [...notes, newNote];
        setNotes(updated);
        setActiveNoteId(newNote.id);
        onUpdate(updated);
    };

    const handleDeleteNote = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (notes.length <= 1) return;
        if (!window.confirm(language === 'cn' ? '确认删除此笔记吗？' : 'Are you sure you want to delete this note?')) return;
        
        const updated = notes.filter(n => n.id !== id);
        setNotes(updated);
        if (activeNoteId === id) {
            setActiveNoteId(updated[0].id);
        }
        onUpdate(updated);
    };

    const handleRenameNote = (id: string, newTitle: string) => {
        const updated = notes.map(n => n.id === id ? { ...n, title: newTitle } : n);
        setNotes(updated);
        onUpdate(updated);
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) handleContentChange(editorRef.current.innerHTML);
    };

    const insertTemplate = (templateHtml: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand('insertHTML', false, templateHtml);
            handleContentChange(editorRef.current.innerHTML);
        }
    };

    const templates = {
        logic: `<h3>核心逻辑:</h3><ul><li>为什么这个策略有效？</li><li>市场心理是什么？</li></ul>`,
        entry: `<h3>入场信号:</h3><ul><li>关键K线形态:</li><li>所有的指标条件:</li></ul>`,
        filters: `<h3>过滤条件 (什么情况不做):</h3><ul><li>避免的新闻事件:</li><li>避免的市场环境:</li></ul>`
    };

    return (
        <div className="flex h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-fade-in">
            
            {/* --- LEFT SIDEBAR: Directory --- */}
            <div className="w-[280px] flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {language === 'cn' ? '笔记 & 场景' : 'Notes & Scenarios'}
                    </h3>
                    <button 
                        onClick={handleAddNote}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-indigo-600 dark:text-indigo-400 transition-colors"
                        title="Add Note"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {notes.map((note) => {
                        const isActive = activeNoteId === note.id;
                        return (
                            <div 
                                key={note.id}
                                onClick={() => setActiveNoteId(note.id)}
                                className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/10' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <StickyNote size={14} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
                                    <input 
                                        type="text"
                                        value={note.title}
                                        onChange={(e) => handleRenameNote(note.id, e.target.value)}
                                        onClick={(e) => isActive && e.stopPropagation()}
                                        className={`bg-transparent border-none outline-none text-sm font-bold p-0 focus:ring-0 truncate ${isActive ? 'w-full' : 'w-auto'}`}
                                    />
                                </div>
                                {!isActive && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(e, note.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-all"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- RIGHT COLUMN: Editor --- */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 sticky top-0 z-10">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                        <button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors" title="Bold"><Bold size={16} /></button>
                        <button onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors" title="List"><ListIcon size={16} /></button>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                        
                        <button 
                            onClick={() => insertTemplate(templates.logic)} 
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap flex items-center gap-1.5 uppercase tracking-wide border border-indigo-100 dark:border-indigo-800"
                        >
                            <Sparkles size={12} /> {language === 'cn' ? '策略逻辑' : 'Logic'}
                        </button>
                        <button 
                            onClick={() => insertTemplate(templates.entry)} 
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap flex items-center gap-1.5 uppercase tracking-wide border border-emerald-100 dark:border-emerald-800"
                        >
                            <Wand2 size={12} /> {language === 'cn' ? '入场信号' : 'Signals'}
                        </button>
                        <button 
                            onClick={() => insertTemplate(templates.filters)} 
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap flex items-center gap-1.5 uppercase tracking-wide border border-rose-100 dark:border-rose-800"
                        >
                            <Activity size={12} /> {language === 'cn' ? '行情过滤' : 'Filters'}
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 pr-2 ml-auto">
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors duration-500 ${saveStatus === 'saving' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                            {saveStatus === 'saving' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                            {saveStatus === 'saving' ? 'Auto-saving...' : 'Saved'}
                        </span>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-[#F9FAFC] dark:bg-[#0A0A12] overflow-hidden p-8">
                    <div 
                        ref={editorRef}
                        contentEditable
                        onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
                        className="w-full h-full outline-none overflow-y-auto prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-sans leading-relaxed custom-scrollbar"
                        style={{ minHeight: '400px' }}
                        data-placeholder="Start typing your strategy blueprint..."
                    >
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Section Title Component with Local State Fix ---
const SectionTitleInput = ({ initialValue, onSave, className }: { initialValue: string, onSave: (val: string) => void, className: string }) => {
    const [val, setVal] = useState(initialValue);

    useEffect(() => {
        setVal(initialValue);
    }, [initialValue]);

    const handleBlur = () => {
        const trimmed = val.trim();
        if (!trimmed) {
            setVal(initialValue);
        } else if (trimmed !== initialValue) {
            onSave(trimmed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
            setVal(initialValue);
            e.currentTarget.blur();
        }
    };

    return (
        <input 
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={className}
        />
    );
};

// --- Dynamic Rule Section Types ---
interface RuleSectionData {
    id: string;
    title: string;
    rules: { id: string; text: string }[];
}

// --- Create/Edit Modal ---
const CreatePlaybookModal = ({ 
    isOpen, 
    onClose, 
    onSave,
    initialData
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (strategy: Strategy) => void; 
    initialData?: Strategy;
}) => {
    const { language } = useLanguage();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState(PLAYBOOK_COLORS[0]);
    const [sections, setSections] = useState<RuleSectionData[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description || '');
                setSelectedColor(initialData.color || PLAYBOOK_COLORS[0]);
                
                const parsedSections: RuleSectionData[] = [];
                const tempMap: Record<string, { id: string; text: string }[]> = {};

                initialData.checklist.forEach(item => {
                    const match = item.text.match(/^(.+?):\s*(.*)$/);
                    if (match) {
                        const title = match[1].trim();
                        const ruleText = match[2].trim();
                        if (!tempMap[title]) tempMap[title] = [];
                        tempMap[title].push({ id: item.id, text: ruleText });
                    } else {
                        if (!tempMap['General']) tempMap['General'] = [];
                        tempMap['General'].push({ id: item.id, text: item.text });
                    }
                });

                Object.keys(tempMap).forEach((key, index) => {
                    parsedSections.push({
                        id: Date.now().toString() + index,
                        title: key,
                        rules: tempMap[key]
                    });
                });

                if (parsedSections.length === 0) {
                    setSections(getDefaultSections());
                } else {
                    setSections(parsedSections);
                }

            } else {
                setName('');
                setDescription('');
                setSelectedColor(PLAYBOOK_COLORS[0]);
                setSections(getDefaultSections());
            }
        }
    }, [isOpen, initialData, language]);

    const getDefaultSections = (): RuleSectionData[] => [
        { id: 'market', title: language === 'cn' ? '市场环境' : 'Market Conditions', rules: [{ id: Date.now().toString() + '1', text: '' }] },
        { id: 'entry', title: language === 'cn' ? '入场条件' : 'Entry Criteria', rules: [{ id: Date.now().toString() + '2', text: '' }] },
        { id: 'exit', title: language === 'cn' ? '出场条件' : 'Exit Criteria', rules: [{ id: Date.now().toString() + '3', text: '' }] }
    ];

    if (!isOpen) return null;

    const handleAddSection = () => {
        setSections([...sections, {
            id: Date.now().toString(),
            title: language === 'cn' ? '新规则组' : 'New Section',
            rules: [{ id: Date.now().toString() + 'r', text: '' }]
        }]);
    };

    const handleDeleteSection = (sectionId: string) => {
        if (sections.length <= 1) return;
        setSections(sections.filter(s => s.id !== sectionId));
    };

    const handleMoveSection = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sections.length - 1) return;
        const newSections = [...sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
        setSections(newSections);
    };

    const handleSectionTitleChange = (sectionId: string, newTitle: string) => {
        setSections(sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s));
    };

    const handleRuleChange = (sectionId: string, ruleId: string, text: string) => {
        setSections(sections.map(s => s.id !== sectionId ? s : {
            ...s,
            rules: s.rules.map(r => r.id === ruleId ? { ...r, text } : r)
        }));
    };

    const handleAddRule = (sectionId: string) => {
        setSections(sections.map(s => s.id !== sectionId ? s : {
            ...s,
            rules: [...s.rules, { id: Date.now().toString() + Math.random(), text: '' }]
        }));
    };

    const handleDeleteRule = (sectionId: string, ruleId: string) => {
        setSections(sections.map(s => {
            if (s.id !== sectionId) return s;
            const newRules = s.rules.filter(r => r.id !== ruleId);
            if (newRules.length === 0) newRules.push({ id: Date.now().toString(), text: '' });
            return { ...s, rules: newRules };
        }));
    };

    const handleSave = () => {
        if (!name.trim()) return;
        const checklist: ChecklistItem[] = [];
        sections.forEach(section => {
            section.rules.forEach(rule => {
                if (rule.text.trim()) {
                    checklist.push({
                        id: rule.id,
                        text: `${section.title}: ${rule.text.trim()}`, 
                        isCompleted: false
                    });
                }
            });
        });

        onSave({
            id: initialData ? initialData.id : Date.now().toString(),
            name,
            description,
            checklist,
            color: selectedColor,
            notes: initialData?.notes || []
        });
        onClose();
    };

    const lbl = {
        title: initialData ? (language === 'cn' ? '编辑策略' : 'Edit Playbook') : (language === 'cn' ? '创建策略手册' : 'Create playbook'),
        genInfo: language === 'cn' ? '基本信息' : 'General information',
        name: language === 'cn' ? '策略名称' : 'Playbook name',
        color: language === 'cn' ? '图标色' : 'Icon Color',
        label: language === 'cn' ? '标签' : 'Label',
        rulesTitle: language === 'cn' ? '交易策略规则' : 'Trading Playbook Rules',
        rulesDesc: language === 'cn' ? '列出你的规则，跟踪并优化你的策略。' : 'List your rules, track and optimize your playbooks grouping.',
        addRule: language === 'cn' ? '添加新规则' : 'Create new rule',
        addSection: language === 'cn' ? '添加规则组' : 'Add Section',
        createBtn: initialData ? (language === 'cn' ? '保存更改' : 'Save Changes') : (language === 'cn' ? '创建策略' : 'Create Playbook'),
        cancel: language === 'cn' ? '取消' : 'Cancel',
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div id="playbook-create-modal" className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{lbl.title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="mb-10 space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">{lbl.genInfo}</h3>
                        <div className="space-y-6 pl-1">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{lbl.name}</label>
                                <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Breakout" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{lbl.color}</label>
                                <div className="flex gap-3 flex-wrap">
                                    {PLAYBOOK_COLORS.map(c => (
                                        <button key={c} onClick={() => setSelectedColor(c)} className={`w-10 h-10 rounded-xl transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{lbl.label}</label>
                                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all shadow-sm" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="mb-6"><h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{lbl.rulesTitle}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{lbl.rulesDesc}</p></div>
                        <div className="space-y-4">
                            {sections.map((section, idx) => (
                                <div key={section.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6 transition-all hover:border-indigo-300 dark:hover:border-indigo-600 group shadow-sm">
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10 transition-colors">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-400 cursor-grab active:cursor-grabbing hover:text-indigo-500 transition-colors"><GripVertical className="w-3.5 h-3.5" /></div>
                                            <input type="text" value={section.title} onChange={(e) => handleSectionTitleChange(section.id, e.target.value)} className="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-white text-sm w-full focus:ring-0 p-0 placeholder-slate-400" placeholder="Section Title" />
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleMoveSection(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ArrowUp className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleMoveSection(idx, 'down')} disabled={idx === sections.length - 1} className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ArrowDown className="w-3.5 h-3.5" /></button>
                                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                                            <button onClick={() => handleDeleteSection(section.id)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {section.rules.map((rule) => (
                                            <div key={rule.id} className="flex gap-3 items-center group/rule">
                                                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab opacity-50 group-hover/rule:opacity-100" />
                                                <input type="text" value={rule.text} onChange={(e) => handleRuleChange(section.id, rule.id, e.target.value)} placeholder="Type a rule..." className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400" />
                                                <button onClick={() => handleDeleteRule(section.id, rule.id)} className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover/rule:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddRule(section.id)} className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-2 px-1 py-1 rounded transition-colors group/btn"><Plus className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> {lbl.addRule}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddSection} className="mt-6 w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-sm hover:border-indigo-500 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> {lbl.addSection}</button>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">{lbl.cancel}</button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">{lbl.createBtn}</button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-component: Strategy Detail View (TradeZella Style) ---
const StrategyDetailView = ({ 
    strategy, 
    trades, 
    onBack,
    onUpdateStrategy,
    onUpdateTrade,
    onDeleteTrade,
    onSavePlan,
    strategies,
    language,
    t
}: { 
    strategy: any, 
    trades: Trade[], 
    onBack: () => void,
    onUpdateStrategy: (strategy: Strategy) => void,
    onUpdateTrade: (trade: Trade) => void,
    onDeleteTrade: (id: string) => void,
    onSavePlan: (plan: DailyPlan) => void,
    strategies: Strategy[],
    language: string,
    t: any
}) => {
    const [activeTab, setActiveTab] = useState<'executed' | 'overview' | 'rules' | 'notes'>('overview');
    const [reviewTrade, setReviewTrade] = useState<Trade | null>(null);
    const [draggedSectionTitle, setDraggedSectionTitle] = useState<string | null>(null);
    
    // 1. Calculations for Statistics
    const { filteredTrades, overviewStats, equityData, playbookSections, zeroOffset } = useMemo(() => {
        const relatedTrades = trades.filter(t => t.setup === strategy.name)
                                    .sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
        
        const closed = relatedTrades.filter(t => t.status !== TradeStatus.OPEN);
        const wins = closed.filter(t => t.pnl > 0);
        const losses = closed.filter(t => t.pnl < 0);
        
        const totalNetPnl = closed.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
        const totalTrades = closed.length;
        const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
        
        const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
        const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
        const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.9 : 0) : grossProfit / grossLoss;
        
        const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
        const avgLoss = losses.length > 0 ? -grossLoss / losses.length : 0;
        
        const largestProfit = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
        const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;
        
        const expectancy = totalTrades > 0 ? totalNetPnl / totalTrades : 0;
        
        const totalR = closed.reduce((acc, t) => {
            const r = t.riskAmount && t.riskAmount > 0 ? (t.pnl - t.fees) / t.riskAmount : 0;
            return acc + r;
        }, 0);

        // Rules Followed (Compliance Calculation)
        let totalRulesPossible = 0;
        let totalRulesFollowed = 0;
        closed.forEach(t => {
            if (t.compliance) {
                const keys = Object.keys(t.compliance);
                totalRulesPossible += keys.length;
                totalRulesFollowed += Object.values(t.compliance).filter(v => v).length;
            }
        });
        const rulesFollowedPercent = totalRulesPossible > 0 ? (totalRulesFollowed / totalRulesPossible) * 100 : 100;

        // Playbook Rules Tab: Statistical Calculations per Rule
        const sections: { title: string; rules: any[] }[] = [];
        const map: Record<string, ChecklistItem[]> = {};
        const sectionOrder: string[] = []; 

        strategy.checklist.forEach((item: any) => {
            const match = item.text.match(/^(.+?):\s*(.*)$/);
            if (match) {
                const title = match[1].trim();
                const ruleText = match[2].trim();
                if (!map[title]) {
                    map[title] = [];
                    sectionOrder.push(title);
                }
                map[title].push({ ...item, text: ruleText });
            } else {
                if (!map['General']) {
                    map['General'] = [];
                    sectionOrder.push('General');
                }
                map['General'].push(item);
            }
        });

        const computeRuleStats = (ruleId: string) => {
            const relevantTrades = closed; 
            const followedTrades = relevantTrades.filter(t => t.compliance?.[ruleId]);
            const followRate = relevantTrades.length > 0 ? (followedTrades.length / relevantTrades.length) * 100 : 0;
            const followedWins = followedTrades.filter(t => t.pnl > 0);
            const netPnl = followedTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
            const winRate = followedTrades.length > 0 ? (followedWins.length / followedTrades.length) * 100 : 0;
            const gProfit = followedWins.reduce((acc, t) => acc + t.pnl, 0);
            const followedLosses = followedTrades.filter(t => t.pnl < 0);
            const gLoss = Math.abs(followedLosses.reduce((acc, t) => acc + t.pnl, 0));
            const pFactor = gLoss === 0 ? (gProfit > 0 ? 99 : 0) : gProfit / gLoss;
            return { followRate, netPnl, winRate, pFactor };
        };

        sectionOrder.forEach(title => {
            sections.push({ 
                title, 
                rules: map[title].map(r => ({ ...r, stats: computeRuleStats(r.id) })) 
            });
        });

        let runningEquity = 0;
        const curve = closed.map(t => {
            runningEquity += (t.pnl - t.fees);
            return {
                date: new Date(t.entryDate).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' }),
                equity: runningEquity
            };
        });

        const equities = curve.map(d => d.equity);
        const maxEquity = Math.max(...equities, 0);
        const minEquity = Math.min(...equities, 0);
        const range = maxEquity - minEquity;
        const offset = range === 0 ? 0 : maxEquity / range;

        return {
            filteredTrades: [...relatedTrades].reverse(),
            overviewStats: {
                totalNetPnl, totalTrades, winRate, profitFactor, avgWin, avgLoss,
                largestProfit, largestLoss, expectancy, totalR, rulesFollowedPercent
            },
            equityData: curve,
            playbookSections: sections,
            zeroOffset: offset
        };
    }, [trades, strategy.name, strategy.checklist]);

    const handleDragSectionStart = (title: string) => {
        setDraggedSectionTitle(title);
    };

    const handleDragSectionOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropSection = (targetTitle: string) => {
        if (!draggedSectionTitle || draggedSectionTitle === targetTitle) {
            setDraggedSectionTitle(null);
            return;
        }

        const sectionTitles = playbookSections.map(s => s.title);
        const dragIdx = sectionTitles.indexOf(draggedSectionTitle);
        const dropIdx = sectionTitles.indexOf(targetTitle);

        if (dragIdx === -1 || dropIdx === -1) return;

        const newOrder = [...sectionTitles];
        newOrder.splice(dragIdx, 1);
        newOrder.splice(dropIdx, 0, draggedSectionTitle);

        const newChecklist: ChecklistItem[] = [];
        const originalChecklist = [...strategy.checklist];

        newOrder.forEach(title => {
            const sectionItems = originalChecklist.filter(item => {
                const match = item.text.match(/^(.+?):\s*(.*)$/);
                const itemTitle = match ? match[1].trim() : 'General';
                return itemTitle === title;
            });
            newChecklist.push(...sectionItems);
        });

        onUpdateStrategy({ ...strategy, checklist: newChecklist });
        setDraggedSectionTitle(null);
    };

    const handleCreateRule = (sectionTitle: string) => {
        const newItem: ChecklistItem = {
            id: 'rule-' + Date.now() + Math.random().toString(36).substr(2, 5),
            text: `${sectionTitle}: `,
            isCompleted: false
        };
        onUpdateStrategy({ ...strategy, checklist: [...strategy.checklist, newItem] });
    };

    const handleRuleTextChange = (ruleId: string, sectionTitle: string, newText: string) => {
        const updated = strategy.checklist.map((i: any) => 
            i.id === ruleId ? { ...i, text: `${sectionTitle}: ${newText}` } : i
        );
        onUpdateStrategy({ ...strategy, checklist: updated });
    };

    const handleSectionTitleChange = (oldTitle: string, newTitle: string) => {
        const finalTitle = newTitle.trim() || oldTitle || 'Section'; 
        const updated = strategy.checklist.map((i: any) => {
            const match = i.text.match(/^(.+?):\s*(.*)$/);
            const itemTitle = match ? match[1].trim() : 'General';
            
            if (itemTitle === oldTitle) {
                const ruleText = match ? match[2].trim() : i.text;
                return { ...i, text: `${finalTitle}: ${ruleText}` };
            }
            return i;
        });
        onUpdateStrategy({ ...strategy, checklist: updated });
    };

    const handleDeleteRule = (ruleId: string) => {
        const updated = strategy.checklist.filter((i: any) => i.id !== ruleId);
        onUpdateStrategy({ ...strategy, checklist: updated });
    };

    const handleDeleteSection = (sectionTitle: string) => {
        if (!window.confirm(language === 'cn' ? `确定删除整个 "${sectionTitle}" 分组及其所有规则？` : `Delete entire "${sectionTitle}" section and all its rules?`)) return;
        const updated = strategy.checklist.filter((i: any) => {
            const match = i.text.match(/^(.+?):\s*(.*)$/);
            const title = match ? match[1].trim() : 'General';
            return title !== sectionTitle;
        });
        onUpdateStrategy({ ...strategy, checklist: updated });
    };

    const tabs = [
        { id: 'overview', label: t.playbook.detail.tabs.overview },
        { id: 'rules', label: t.playbook.detail.tabs.rules },
        { id: 'executed', label: t.playbook.detail.tabs.executed },
        { id: 'notes', label: t.playbook.detail.tabs.notes },
    ];

    const StatBox = ({ label, value, colorClass = "text-slate-900 dark:text-white" }: { label: string, value: string | number, colorClass?: string }) => (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                <Info className="w-3 h-3 text-indigo-400 opacity-50" />
            </div>
            <div className={`text-xl font-black font-mono leading-none ${colorClass}`}>
                {value}
            </div>
        </div>
    );

    if (reviewTrade) {
        const activeTrade = trades.find(t => t.id === reviewTrade.id) || reviewTrade;
        return (
            <div className="absolute inset-0 z-[70] bg-white dark:bg-slate-950">
                <TradeReviewModal 
                    trade={activeTrade}
                    allTrades={filteredTrades} 
                    isOpen={true}
                    onClose={() => setReviewTrade(null)}
                    onUpdateTrade={onUpdateTrade}
                    strategies={strategies}
                    onSavePlan={onSavePlan}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#F9FAFC] dark:bg-slate-950 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-white dark:bg-slate-900 shrink-0">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: strategy.color }}></div>
                        {strategy.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">{t.playbook.detail.back}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-8 pt-4 flex gap-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-sm font-bold transition-all relative ${
                            activeTab === tab.id 
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>
                        )}
                    </button>
                ))}
                <div className="ml-auto pb-3">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 custom-scrollbar">
                
                {activeTab === 'overview' && (
                    <div className="space-y-6 w-full animate-fade-in-up">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                            <StatBox label="Net P&L" value={`$${overviewStats.totalNetPnl.toLocaleString(undefined, {minimumFractionDigits:2})}`} colorClass={overviewStats.totalNetPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                            <StatBox label="Trades" value={overviewStats.totalTrades} />
                            <StatBox label="Win Rate %" value={`${overviewStats.winRate.toFixed(0)}%`} />
                            <StatBox label="Profit Factor" value={overviewStats.profitFactor.toFixed(2)} />
                            <StatBox label="Expectancy" value={`$${overviewStats.expectancy.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
                            
                            <StatBox label="Rules Followed" value={`${overviewStats.rulesFollowedPercent.toFixed(0)}%`} />
                            <StatBox label="Average Winner" value={`$${overviewStats.avgWin.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
                            <StatBox label="Average Loser" value={`$${overviewStats.avgLoss.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
                            <StatBox label="Largest Profit" value={`$${overviewStats.largestProfit.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
                            <StatBox label="Largest Loss" value={`$${overviewStats.largestLoss.toLocaleString(undefined, {minimumFractionDigits:2})}`} />
                            <StatBox label="Total R Multiple" value={`${overviewStats.totalR.toFixed(2)}`} />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                                Daily Net Cumulative P&L
                                <Info className="w-3 h-3 text-slate-400" />
                            </h3>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={equityData}>
                                        <defs>
                                            <linearGradient id="equityFillGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={0.2} />
                                            </linearGradient>
                                            <linearGradient id="equityStrokeGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={1} />
                                                <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                        <XAxis dataKey="date" hide />
                                        <YAxis orientation="left" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '0.5rem' }} 
                                            itemStyle={{ fontSize: '12px' }}
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Equity']}
                                        />
                                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.5} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="equity" 
                                            stroke="url(#equityStrokeGradient)" 
                                            strokeWidth={3} 
                                            fillOpacity={1} 
                                            fill="url(#equityFillGradient)" 
                                            animationDuration={1500}
                                            baseValue={0}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="space-y-10 animate-fade-in-up w-full">
                        <div className="overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <table className="w-full text-left table-fixed border-collapse">
                                <thead className="bg-[#F8F9FB] dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="w-1/3 px-6 py-4 text-[11px] font-black uppercase tracking-wider">Rule Details</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-center">Follow Rate</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-right">Net Profit / Loss</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-center">Profit Factor</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-center">Win Rate</th>
                                        <th className="w-12 px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {playbookSections.map((section, sIdx) => (
                                        <React.Fragment key={sIdx}>
                                            <tr 
                                                className={`bg-white dark:bg-slate-900 group transition-all ${draggedSectionTitle === section.title ? 'opacity-40 grayscale scale-[0.98]' : ''}`}
                                                draggable="true"
                                                onDragStart={() => handleDragSectionStart(section.title)}
                                                onDragOver={handleDragSectionOver}
                                                onDrop={() => handleDropSection(section.title)}
                                            >
                                                <td colSpan={6} className="px-6 py-6 cursor-move">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 w-full max-w-md">
                                                            <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-indigo-500 transition-colors" />
                                                            <SectionTitleInput 
                                                                initialValue={section.title}
                                                                onSave={(newVal) => handleSectionTitleChange(section.title, newVal)}
                                                                className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight bg-transparent border-none focus:ring-0 w-full p-0 outline-none cursor-text"
                                                            />
                                                            <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.title); }}
                                                                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {section.rules.map(rule => {
                                                const stats = rule.stats;
                                                const isFollowLow = stats.followRate < 50;
                                                return (
                                                    <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                        <td className="px-6 py-4 pl-12 flex items-center gap-3 overflow-hidden">
                                                            <GripVertical className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-400 flex-shrink-0" />
                                                            <input 
                                                                type="text"
                                                                value={rule.text}
                                                                onChange={(e) => handleRuleTextChange(rule.id, section.title, e.target.value)}
                                                                className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent border-none focus:ring-0 w-full p-0 outline-none"
                                                                placeholder="Enter rule text..."
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`font-black font-mono text-sm ${isFollowLow ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                {stats.followRate.toFixed(0)} %
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`font-mono font-bold text-sm ${stats.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {stats.netPnl >= 0 ? '+' : ''}${Math.abs(stats.netPnl).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-mono font-bold text-sm text-slate-600 dark:text-slate-300">
                                                                {stats.pFactor === 0 ? 'N/A' : stats.pFactor.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-mono font-bold text-sm text-slate-600 dark:text-slate-300">
                                                                {stats.winRate.toFixed(2)} %
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button 
                                                                onClick={() => handleDeleteRule(rule.id)}
                                                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-white dark:bg-slate-900">
                                                <td colSpan={6} className="px-6 py-3 pl-12 border-b border-slate-50 dark:border-slate-800">
                                                    <button 
                                                        onClick={() => handleCreateRule(section.title)}
                                                        className="text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
                                                    >
                                                        <Plus className="w-4 h-4" /> Create new rule
                                                    </button>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center bg-slate-50/30 dark:bg-slate-900/10">
                                            <div className="flex flex-col items-center gap-4">
                                                 <button 
                                                    onClick={() => {
                                                        const newTitle = language === 'cn' ? '新规则分组' : 'New Rule Section';
                                                        const placeholderRule: ChecklistItem = {
                                                            id: 'rule-' + Date.now() + Math.random().toString(36).substr(2, 5),
                                                            text: `${newTitle}: `,
                                                            isCompleted: false
                                                        };
                                                        onUpdateStrategy({ 
                                                            ...strategy, 
                                                            checklist: [...strategy.checklist, placeholderRule] 
                                                        });
                                                    }}
                                                    className="px-10 py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 font-black text-xs hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all uppercase tracking-widest flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 shadow-sm"
                                                >
                                                    <Plus className="w-5 h-5" /> Add New Rule Section
                                                </button>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Organize your technicals and mindset</p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'executed' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in-up">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">{t.playbook.detail.table.openDate}</th>
                                        <th className="px-6 py-4">{t.playbook.detail.table.symbol}</th>
                                        <th className="px-6 py-4 text-center">{t.playbook.detail.table.status}</th>
                                        <th className="px-6 py-4">{t.playbook.detail.table.closeDate}</th>
                                        <th className="px-6 py-4 text-right">{t.playbook.detail.table.entryPrice}</th>
                                        <th className="px-6 py-4 text-right">{t.playbook.detail.table.exitPrice}</th>
                                        <th className="px-6 py-4 text-right">{t.playbook.detail.table.netPnl}</th>
                                        <th className="px-6 py-4 text-right">{t.playbook.detail.table.netRoi}</th>
                                        <th className="px-6 py-4">{t.playbook.detail.table.setups}</th>
                                        <th className="px-6 py-4">{t.playbook.detail.table.account}</th>
                                        <th className="px-6 py-4 text-center w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {filteredTrades.map(t => {
                                        const isWin = t.pnl >= 0;
                                        const exposure = t.entryPrice * t.quantity;
                                        const roi = exposure > 0 ? ((t.pnl - t.fees) / exposure) * 100 : 0;
                                        const accountName = MOCK_ACCOUNTS.find(a => a.id === t.accountId)?.name || 'Default Account';

                                        return (
                                            <tr 
                                                key={t.id} 
                                                onClick={() => setReviewTrade(t)}
                                                className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/5 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                                                    {new Date(t.entryDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 font-black text-slate-800 dark:text-white">
                                                    {t.symbol}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${
                                                        isWin 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-500/30' 
                                                        : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30'
                                                    }`}>
                                                        {isWin ? 'WIN' : 'LOSS'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                    {t.exitDate ? new Date(t.exitDate).toLocaleDateString() : '--'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                                                    ${t.entryPrice.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                                                    ${t.exitPrice ? t.exitPrice.toLocaleString() : '---'}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {isWin ? '+' : ''}${(t.pnl - t.fees).toLocaleString()}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-full uppercase">
                                                        {t.setup}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 italic">
                                                    {accountName}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm("Are you sure you want to delete this trade?")) {
                                                                onDeleteTrade(t.id);
                                                            }
                                                        }}
                                                        className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredTrades.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="py-20 text-center text-slate-400 italic">
                                                No executed trades found for this strategy.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="h-full flex flex-col">
                        <StrategyNotes 
                            strategy={strategy} 
                            onUpdate={(notes) => onUpdateStrategy({ ...strategy, notes })} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Page ---
const PlaybookPage: React.FC<PlaybookPageProps> = ({ 
    strategies, trades, onAddStrategy, onUpdateStrategy, onDeleteStrategy, 
    onUpdateTrade, onDeleteTrade, onSavePlan, 
    autoCreate, onResetAutoCreate 
}) => {
    const { t, language } = useLanguage();
    const { registerStepAction, unregisterStepAction } = useTour();
    const [detailedStrategyId, setDetailedStrategyId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editStrategy, setEditStrategy] = useState<Strategy | undefined>(undefined);
    const [activeCollection, setActiveCollection] = useState<'mine' | 'shared' | 'templates'>('mine');
    const [lifecycleTab, setLifecycleTab] = useState<'active' | 'archived'>('active');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [selectedTimeLabel, setSelectedTimeLabel] = useState(language === 'cn' ? '时间范围' : 'Date range');
    const [selectedAccountLabel, setSelectedAccountLabel] = useState(language === 'cn' ? '所有账户' : 'All accounts');
    const menuRef = useRef<HTMLDivElement>(null);

    const tableColumns = useMemo(() => ([
        { id: 'title', label: language === 'cn' ? '标题' : 'Title' },
        { id: 'missedTrades', label: language === 'cn' ? '错过交易' : 'Missed trades' },
        { id: 'sharedStrategies', label: language === 'cn' ? '共享策略' : 'Shared strategies' },
        { id: 'avgLoss', label: language === 'cn' ? '平均亏损' : 'Average loser' },
        { id: 'avgWin', label: language === 'cn' ? '平均盈利' : 'Average winner' },
        { id: 'netPnl', label: language === 'cn' ? '总净盈亏' : 'Total net P&L' },
        { id: 'profitFactor', label: language === 'cn' ? '盈利因子' : 'Profit factor' },
        { id: 'trades', label: language === 'cn' ? '交易数' : 'Trades' },
        { id: 'winRate', label: language === 'cn' ? '胜率' : 'Win rate' },
    ]), [language]);
    const defaultVisibleColumns = useMemo(
        () => ['title', 'missedTrades', 'sharedStrategies', 'avgLoss', 'avgWin', 'netPnl', 'profitFactor', 'trades'],
        []
    );
    const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);
    const [draftVisibleColumns, setDraftVisibleColumns] = useState<string[]>(defaultVisibleColumns);

    const handleCreatePlaybook = () => { setEditStrategy(undefined); setIsCreateModalOpen(true); };
    const handleEditPlaybook = (strategy: Strategy) => { setEditStrategy(strategy); setIsCreateModalOpen(true); setMenuOpenId(null); };

    useEffect(() => {
        registerStepAction('playbookCreate', () => {
            setIsCreateModalOpen(false);
        });
        registerStepAction('playbookModal', () => {
            setEditStrategy(undefined);
            setIsCreateModalOpen(true);
        });
        registerStepAction('playbookCards', () => {
            setIsCreateModalOpen(false);
        });
        registerStepAction('__close__', () => {
            setIsCreateModalOpen(false);
        });
        return () => {
            ['playbookCreate', 'playbookModal', 'playbookCards', '__close__'].forEach(k => unregisterStepAction(k));
        };
    }, []);

    useEffect(() => {
        setSelectedTimeLabel(language === 'cn' ? '时间范围' : 'Date range');
        setSelectedAccountLabel(language === 'cn' ? '所有账户' : 'All accounts');
    }, [language]);

    useEffect(() => {
        if (!autoCreate) return;
        setEditStrategy(undefined);
        setIsCreateModalOpen(true);
        onResetAutoCreate?.();
    }, [autoCreate, onResetAutoCreate]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const handleSaveStrategy = (strategy: Strategy) => {
        const exists = strategies.some(s => s.id === strategy.id);
        if (exists) onUpdateStrategy(strategy);
        else onAddStrategy(strategy);
    };

    const playbookData = useMemo(() => {
        return strategies.map(strategy => {
            const relatedTrades = trades
                .filter(t => t.setup === strategy.name)
                .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
            const count = relatedTrades.length;
            const wins = relatedTrades.filter(t => t.pnl > 0);
            const losses = relatedTrades.filter(t => t.pnl <= 0);
            const winRate = count > 0 ? (wins.length / count) * 100 : 0;
            const netPnl = relatedTrades.reduce((acc, t) => acc + (t.pnl - t.fees), 0);
            const grossWin = wins.reduce((acc, t) => acc + t.pnl, 0);
            const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
            const profitFactor = grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : grossWin / grossLoss;
            const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
            const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
            const winPctDec = winRate / 100;
            const expectancy = (winPctDec * avgWin) - ((1 - winPctDec) * avgLoss);
            const uniqueTradeDays = new Set(
                relatedTrades.map(trade => new Date(trade.entryDate).toDateString()).filter(Boolean)
            );
            const winningTradeDays = new Set(
                relatedTrades
                    .filter(trade => trade.pnl > 0)
                    .map(trade => new Date(trade.entryDate).toDateString())
                    .filter(Boolean)
            );
            const dailyWinRate = uniqueTradeDays.size > 0 ? (winningTradeDays.size / uniqueTradeDays.size) * 100 : 0;
            const closedTrades = relatedTrades.filter(trade => Boolean(trade.exitDate));
            const avgDurationMs = closedTrades.length > 0
                ? closedTrades.reduce((sum, trade) => {
                    const start = new Date(trade.entryDate).getTime();
                    const end = new Date(trade.exitDate || trade.entryDate).getTime();
                    return sum + Math.max(0, end - start);
                }, 0) / closedTrades.length
                : 0;
            const avgTradeDurationHours = avgDurationMs / (1000 * 60 * 60);
            const winLossRatio = losses.length > 0 ? wins.length / losses.length : wins.length > 0 ? wins.length : 0;
            const tags = Array.from(
                new Set(
                    strategy.checklist
                        .map(item => item.text.match(/^(.+?):/)?.[1]?.trim())
                        .filter(Boolean)
                )
            ).slice(0, 4) as string[];

            return {
                ...strategy,
                count,
                winRate,
                netPnl,
                profitFactor,
                avgWin,
                avgLoss,
                expectancy,
                dailyWinRate,
                avgTradeDurationHours,
                winLossRatio,
                missedTrades: 0,
                sharedStrategies: '—',
                tags,
            };
        });
    }, [strategies, trades]);

    const activeStrategies = useMemo(() => playbookData, [playbookData]);
    const archivedStrategies = useMemo(() => [] as typeof playbookData, []);
    const visibleStrategies = lifecycleTab === 'active' ? activeStrategies : archivedStrategies;

    const summaryCards = useMemo(() => {
        const fallback = {
            name: language === 'cn' ? '暂无策略' : 'No strategies yet',
            count: 0,
            netPnl: 0,
            winRate: 0,
            color: '#8b5cf6',
        };
        const best = [...activeStrategies].sort((a, b) => b.netPnl - a.netPnl)[0] || fallback;
        const least = [...activeStrategies].sort((a, b) => a.netPnl - b.netPnl)[0] || fallback;
        const mostActive = [...activeStrategies].sort((a, b) => b.count - a.count)[0] || fallback;
        const bestWinRate = [...activeStrategies].sort((a, b) => b.winRate - a.winRate)[0] || fallback;

        return [
            {
                id: 'best',
                title: language === 'cn' ? '最佳表现策略' : 'Best performing strategy',
                icon: <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />,
                strategy: best,
                value: best.count > 0 ? `${best.netPnl >= 0 ? '+' : '-'}$${Math.abs(best.netPnl).toFixed(2)}` : '',
                chipClass: best.netPnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                footer: best.count > 0 ? `${best.count} ${language === 'cn' ? '笔交易' : best.count === 1 ? 'trade' : 'trades'}` : (language === 'cn' ? '暂无数据' : 'No data'),
            },
            {
                id: 'least',
                title: language === 'cn' ? '最差表现策略' : 'Least performing strategy',
                icon: <ArrowDown className="h-3.5 w-3.5 text-rose-500" />,
                strategy: least,
                value: least.count > 0 ? `${least.netPnl >= 0 ? '+' : '-'}$${Math.abs(least.netPnl).toFixed(2)}` : '',
                chipClass: least.netPnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                footer: least.count > 0 ? `${least.count} ${language === 'cn' ? '笔交易' : least.count === 1 ? 'trade' : 'trades'}` : (language === 'cn' ? '暂无数据' : 'No data'),
            },
            {
                id: 'active',
                title: language === 'cn' ? '最活跃策略' : 'Most active strategy',
                icon: <Activity className="h-3.5 w-3.5 text-amber-500" />,
                strategy: mostActive,
                value: '',
                chipClass: 'bg-slate-100 text-slate-600',
                footer: mostActive.count > 0 ? `${mostActive.count} ${language === 'cn' ? '笔交易' : mostActive.count === 1 ? 'trade' : 'trades'}` : (language === 'cn' ? '暂无数据' : 'No data'),
            },
            {
                id: 'win-rate',
                title: language === 'cn' ? '最高胜率' : 'Best win rate',
                icon: <Sparkles className="h-3.5 w-3.5 text-violet-500" />,
                strategy: bestWinRate,
                value: '',
                chipClass: 'bg-slate-100 text-slate-600',
                footer: bestWinRate.count > 0
                    ? `${bestWinRate.winRate.toFixed(0)}% / ${bestWinRate.count} ${language === 'cn' ? '笔交易' : bestWinRate.count === 1 ? 'trade' : 'trades'}`
                    : (language === 'cn' ? '暂无数据' : 'No data'),
            },
        ];
    }, [activeStrategies, language]);

    const collectionTabs = [
        {
            id: 'mine' as const,
            label: `${language === 'cn' ? '我的策略' : 'My Strategies'} (${strategies.length}/${strategies.length})`,
            icon: <BookMarked className="h-3.5 w-3.5" />,
        },
        {
            id: 'shared' as const,
            label: language === 'cn' ? '共享给我' : 'Shared with me',
            icon: <Lock className="h-3.5 w-3.5" />,
        },
        {
            id: 'templates' as const,
            label: language === 'cn' ? '模板' : 'Templates',
            icon: <Layout className="h-3.5 w-3.5" />,
        },
    ];

    const iconTile = (color?: string) => (
        <div
            className="flex h-7 w-7 items-end gap-[2.5px] rounded-[8px] border border-slate-200/80 bg-white px-[4px] py-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            style={{ borderColor: `${color || '#8b5cf6'}22` }}
        >
            <span className="w-1.5 rounded-full bg-emerald-500/90" style={{ height: '72%' }} />
            <span className="w-1.5 rounded-full bg-indigo-500/90" style={{ height: '100%' }} />
            <span className="w-1.5 rounded-full bg-rose-500/90" style={{ height: '56%' }} />
        </div>
    );

    const formatMoney = (value: number) => value === 0 ? '$0' : `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`;
    const formatDuration = (hours: number) => {
        if (!hours || hours <= 0) return '0h';
        if (hours >= 24) return `${(hours / 24).toFixed(1)}d`;
        return `${hours.toFixed(1)}h`;
    };
    const formatMetricValue = (columnId: string, value: any) => {
        switch (columnId) {
            case 'avgLoss':
                return formatMoney(-Math.abs(Number(value || 0)));
            case 'avgWin':
            case 'netPnl':
                return formatMoney(Number(value || 0));
            case 'profitFactor':
                return Number(value || 0).toFixed(1);
            case 'winRate':
                return `${Number(value || 0).toFixed(0)}%`;
            case 'trades':
            case 'missedTrades':
                return String(value ?? 0);
            default:
                return String(value ?? '—');
        }
    };

    const toggleDraftColumn = (columnId: string) => {
        setDraftVisibleColumns(current =>
            current.includes(columnId)
                ? current.filter(id => id !== columnId)
                : [...current, columnId]
        );
    };

    const openColumnModal = () => {
        setDraftVisibleColumns(visibleColumns);
        setIsColumnModalOpen(true);
    };

    if (detailedStrategyId) {
        const strategy = strategies.find(s => s.id === detailedStrategyId);
        if (strategy) {
            return (
                <StrategyDetailView 
                    strategy={strategy} 
                    trades={trades} 
                    strategies={strategies}
                    onBack={() => setDetailedStrategyId(null)}
                    onUpdateStrategy={onUpdateStrategy}
                    onUpdateTrade={onUpdateTrade} 
                    onDeleteTrade={onDeleteTrade}
                    onSavePlan={onSavePlan} 
                    language={language}
                    t={t}
                />
            );
        }
    }

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-[#f6f5f1] dark:bg-slate-950">
            <CreatePlaybookModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleSaveStrategy} initialData={editStrategy} />
            {isColumnModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-[750px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between px-6 pb-4 pt-6">
                            <div>
                                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                                    {language === 'cn' ? '选择列' : 'Select columns'}
                                </h3>
                                <p className="mt-2 text-[14px] text-slate-500 dark:text-slate-400">
                                    {language === 'cn' ? '选择你希望在表格中展示的列' : 'Choose the columns you want to display in the table'}
                                </p>
                                <div className="mt-4 flex items-center gap-4 text-[13px] font-medium text-violet-600 dark:text-violet-400">
                                    <button onClick={() => setDraftVisibleColumns(tableColumns.map(column => column.id))}>
                                        {language === 'cn' ? '全部' : 'All'}
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button onClick={() => setDraftVisibleColumns([])}>
                                        {language === 'cn' ? '清空' : 'None'}
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button onClick={() => setDraftVisibleColumns(defaultVisibleColumns)}>
                                        {language === 'cn' ? '默认' : 'Default'}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsColumnModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-x-12 gap-y-4 px-6 pb-8 pt-2 md:grid-cols-2">
                            {tableColumns.map(column => {
                                const checked = draftVisibleColumns.includes(column.id);
                                return (
                                    <label key={column.id} className="flex items-center gap-3 text-[14px] text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleDraftColumn(column.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span>{column.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                            <button
                                onClick={() => setIsColumnModalOpen(false)}
                                className="rounded-xl border border-slate-200 px-6 py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                {language === 'cn' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={() => {
                                    setVisibleColumns(draftVisibleColumns);
                                    setIsColumnModalOpen(false);
                                }}
                                className="rounded-xl bg-violet-600 px-6 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-violet-700"
                            >
                                {language === 'cn' ? '更新' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="shrink-0 border-b border-slate-200/80 bg-[#faf9f7] dark:border-slate-800 dark:bg-slate-900">
                <div className="px-5 pb-0 pt-6 lg:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">
                        {language === 'cn' ? '策略手册' : 'Strategies'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button className="flex h-9 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 text-[14px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            <Activity className="h-3.5 w-3.5 text-violet-500" />
                            <span>{selectedTimeLabel}</span>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                        <button className="flex h-9 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 text-[14px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            <BookMarked className="h-3.5 w-3.5 text-violet-500" />
                            <span>{selectedAccountLabel}</span>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>
                </div>
                <div className="mt-4 flex gap-8 overflow-x-auto border-t border-slate-200/80 dark:border-slate-800">
                    {collectionTabs.map(tab => {
                        const active = activeCollection === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveCollection(tab.id)}
                                className={`relative flex items-center gap-2 whitespace-nowrap pb-3 text-[14px] font-medium transition-colors ${
                                    active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <span className={active ? 'text-violet-500' : 'text-slate-400'}>
                                    {tab.icon}
                                </span>
                                <span>{tab.label}</span>
                                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-violet-600" />}
                            </button>
                        );
                    })}
                </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar lg:px-8">
                {activeCollection !== 'mine' ? (
                    <div className="rounded-[18px] border border-slate-200 bg-white px-10 py-20 text-center shadow-[0_8px_24px_rgba(15,23,42,0.035)] dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">
                            {activeCollection === 'shared'
                                ? (language === 'cn' ? '共享策略即将上线' : 'Shared strategies coming soon')
                                : (language === 'cn' ? '模板中心即将上线' : 'Templates coming soon')}
                        </h3>
                        <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-6 text-slate-500 dark:text-slate-400">
                            {language === 'cn'
                                ? '这次先完成策略手册主页的视觉升级。共享与模板能力会在后续版本接上真实逻辑。'
                                : 'This pass focuses on the strategies home UI. Shared and template flows will be wired in a later release.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button
                                id="playbook-create-btn"
                                onClick={handleCreatePlaybook}
                                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-violet-600 px-4 text-[14px] font-semibold text-white shadow-[0_10px_20px_rgba(109,90,220,0.18)] transition-colors hover:bg-violet-700"
                            >
                                <Plus className="h-4 w-4" />
                                <span>{language === 'cn' ? '创建策略' : 'Create strategy'}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                            {summaryCards.map(card => (
                                <div
                                    key={card.id}
                                    className="min-h-[116px] rounded-[18px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                        {card.icon}
                                        <span>{card.title}</span>
                                    </div>
                                    <div className="mt-3.5 flex items-center gap-2.5">
                                        {iconTile(card.strategy.color)}
                                        <div className="min-w-0">
                                            <div className="truncate text-[15px] font-semibold leading-6 text-slate-700 dark:text-white">
                                                {card.strategy.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                                        <span>{card.footer}</span>
                                        {card.value && (
                                            <span className={`rounded-[8px] px-2 py-0.5 text-[12px] font-semibold ${card.chipClass}`}>
                                                {card.value}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)] dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex min-h-[56px] items-center justify-end gap-2 border-b border-slate-200/80 px-5 py-3 dark:border-slate-800">
                                {([
                                    { id: 'grid', icon: <LayoutGrid className="h-5 w-5" /> },
                                    { id: 'table', icon: <ListIcon className="h-5 w-5" /> },
                                ] as const).map(item => {
                                    const active = viewMode === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setViewMode(item.id)}
                                            className={`relative rounded-lg p-2 transition-colors ${
                                                active ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {item.icon}
                                            {active && <span className="absolute inset-x-1 -bottom-[13px] h-0.5 rounded-full bg-violet-600" />}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={openColumnModal}
                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <Settings className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="px-3 py-4">
                                <div className="inline-flex rounded-[14px] bg-slate-100 p-1 dark:bg-slate-800">
                                    {([
                                        { id: 'active', label: language === 'cn' ? '进行中' : 'Active' },
                                        { id: 'archived', label: language === 'cn' ? '已归档' : 'Archived' },
                                    ] as const).map(item => {
                                        const active = lifecycleTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setLifecycleTab(item.id)}
                                                className={`rounded-[11px] px-4 py-2 text-[14px] font-medium transition-all ${
                                                    active
                                                        ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.08)] dark:bg-slate-700 dark:text-white'
                                                        : 'text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {visibleStrategies.length === 0 ? (
                                <div className="px-10 py-20 text-center">
                                    <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400">
                                        {language === 'cn' ? '这个分组里还没有策略。' : 'There are no strategies in this view yet.'}
                                    </p>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div ref={menuRef} className="grid grid-cols-1 gap-4 px-4 pb-4 xl:grid-cols-3">
                                    {visibleStrategies.map(strategy => {
                                        const isMenuOpen = menuOpenId === strategy.id;
                                        return (
                                            <article
                                                key={strategy.id}
                                                onClick={() => setDetailedStrategyId(strategy.id)}
                                                className="group cursor-pointer rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            {iconTile(strategy.color)}
                                                            <h3 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-slate-700 dark:text-white">
                                                                {strategy.name}
                                                            </h3>
                                                        </div>
                                                        {strategy.tags.length > 0 && (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {strategy.tags.map(tag => (
                                                                    <span
                                                                        key={tag}
                                                                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <button
                                                            onClick={event => {
                                                                event.stopPropagation();
                                                                setMenuOpenId(current => current === strategy.id ? null : strategy.id);
                                                            }}
                                                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                        {isMenuOpen && (
                                                            <div className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_16px_40px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
                                                                <button
                                                                    onClick={event => {
                                                                        event.stopPropagation();
                                                                        handleEditPlaybook(strategy);
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                    <span>{language === 'cn' ? '编辑' : 'Edit'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={event => {
                                                                        event.stopPropagation();
                                                                        if (window.confirm(language === 'cn' ? '确认删除该策略？' : 'Delete this strategy?')) {
                                                                            onDeleteStrategy(strategy.id);
                                                                        }
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/10"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    <span>{language === 'cn' ? '删除' : 'Delete'}</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-1">
                                                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{language === 'cn' ? '胜率' : 'Win rate'}</div>
                                                            <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{strategy.winRate.toFixed(0)}%</div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{language === 'cn' ? '日胜率' : 'Daily win rate'}</div>
                                                            <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{strategy.dailyWinRate.toFixed(0)}%</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{language === 'cn' ? '交易数' : 'Trades'}</div>
                                                            <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{strategy.count}</div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{language === 'cn' ? '平均时长' : 'Avg trade duration'}</div>
                                                            <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{formatDuration(strategy.avgTradeDurationHours)}</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{language === 'cn' ? '盈利因子' : 'Profit factor'}</div>
                                                            <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{strategy.profitFactor === 999 ? '999' : strategy.profitFactor.toFixed(1)}</div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{language === 'cn' ? '盈亏比' : 'Win/Loss'}</div>
                                                            <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{strategy.winLossRatio.toFixed(1)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div ref={menuRef} className="overflow-x-auto px-0 pb-2">
                                    <table className="min-w-full border-separate border-spacing-0">
                                        <thead>
                                            <tr className="bg-[#f0eef8] text-left dark:bg-slate-800/80">
                                                {visibleColumns.map(columnId => {
                                                    const column = tableColumns.find(item => item.id === columnId);
                                                    if (!column) return null;
                                                    return (
                                                        <th
                                                            key={columnId}
                                                            className={`whitespace-nowrap px-5 py-4 text-[13px] font-medium text-slate-600 dark:text-slate-300 ${
                                                                columnId === 'title' ? 'text-left' : 'text-center'
                                                            }`}
                                                        >
                                                            {column.label}
                                                        </th>
                                                    );
                                                })}
                                                <th className="w-12 px-5 py-4" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleStrategies.map(strategy => {
                                                const isMenuOpen = menuOpenId === strategy.id;
                                                return (
                                                    <tr
                                                        key={strategy.id}
                                                        onClick={() => setDetailedStrategyId(strategy.id)}
                                                        className="cursor-pointer bg-white transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                                                    >
                                                        {visibleColumns.map(columnId => {
                                                            let content: React.ReactNode = null;
                                                            if (columnId === 'title') {
                                                                content = (
                                                                    <div className="flex items-center gap-3">
                                                                        {iconTile(strategy.color)}
                                                                        <span className="truncate text-[14px] font-medium text-slate-800 dark:text-white">
                                                                            {strategy.name}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            } else {
                                                                const rawValue =
                                                                    columnId === 'trades' ? strategy.count :
                                                                    columnId === 'sharedStrategies' ? strategy.sharedStrategies :
                                                                    (strategy as any)[columnId];
                                                                const colorClass =
                                                                    columnId === 'netPnl'
                                                                        ? Number(rawValue) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                                                        : 'text-slate-700 dark:text-slate-300';
                                                                content = (
                                                                    <span className={`text-[14px] ${colorClass}`}>
                                                                        {formatMetricValue(columnId, rawValue)}
                                                                    </span>
                                                                );
                                                            }

                                                            return (
                                                                <td
                                                                    key={columnId}
                                                                    className={`border-t border-slate-200 px-5 py-5 align-middle dark:border-slate-800 ${
                                                                        columnId === 'title' ? 'text-left' : 'text-center'
                                                                    }`}
                                                                >
                                                                    {content}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="relative border-t border-slate-200 px-5 py-5 text-center dark:border-slate-800">
                                                            <button
                                                                onClick={event => {
                                                                    event.stopPropagation();
                                                                    setMenuOpenId(current => current === strategy.id ? null : strategy.id);
                                                                }}
                                                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>
                                                            {isMenuOpen && (
                                                                <div className="absolute right-4 top-[calc(100%-6px)] z-20 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_16px_40px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
                                                                    <button
                                                                        onClick={event => {
                                                                            event.stopPropagation();
                                                                            handleEditPlaybook(strategy);
                                                                        }}
                                                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5" />
                                                                        <span>{language === 'cn' ? '编辑' : 'Edit'}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={event => {
                                                                            event.stopPropagation();
                                                                            if (window.confirm(language === 'cn' ? '确认删除该策略？' : 'Delete this strategy?')) {
                                                                                onDeleteStrategy(strategy.id);
                                                                            }
                                                                        }}
                                                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/10"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                        <span>{language === 'cn' ? '删除' : 'Delete'}</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-center px-6 py-7">
                                        <div className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-6 py-3 text-[14px] text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                            <span className="font-semibold">
                                                {language === 'cn'
                                                    ? `结果：1 - ${visibleStrategies.length} / 共 ${visibleStrategies.length} 个策略`
                                                    : `Result: 1 - ${visibleStrategies.length} of ${visibleStrategies.length} strategies`}
                                            </span>
                                            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                                            <button className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700">1</button>
                                            <span>{language === 'cn' ? '共 1 页' : 'of 1 pages'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaybookPage;
