import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DailyPlan, Trade, TradeStatus, Direction, Strategy } from '../types';
import {
    Save, Trash2, Bold, Italic, Underline, Strikethrough, Image as ImageIcon,
    Search, Folder, FileText, Plus, MoreHorizontal,
    ChevronRight, BookOpen, Target, StickyNote, BarChart3,
    Calendar, CheckSquare, Link as LinkIcon, X, Clock, DollarSign, Activity, Share2, CandlestickChart,
    Tag, LayoutTemplate, MoreVertical, FilePlus, ChevronDown, FolderPlus, RotateCcw, RotateCw,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Code, Eraser, CheckCircle2, Circle, Copy,
    Edit2, CornerDownLeft, Play, CornerDownRight, Share, FolderInput, ArrowRight, ArrowUpDown, Check,
    Printer, FileDown, Files, RefreshCw, Cloud, Wand2, AlertCircle, BookMarked, Undo2, Layout, AppWindow,
    TrendingUp
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import NotesPanel from './NotesPanel';

interface TradingPlansProps {
  plans: DailyPlan[];
  trades: Trade[]; 
  strategies: Strategy[];
  onSavePlan: (plan: DailyPlan) => void;
  onDeletePlan: (id: string) => void;
  onSaveStrategies: (strategies: Strategy[]) => void;
  onShare: (plan: DailyPlan) => void;
  autoCreate?: boolean; 
  onResetAutoCreate?: () => void;
  selectionIntent?: string | null;
  onClearSelectionIntent?: () => void;
  creationIntent?: { date: string, linkedTradeIds: string[] } | null;
  onClearCreationIntent?: () => void;
}

// --- Helper: Image Compression ---
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

// --- Templates Helper ---
const getTemplates = (language: 'en' | 'cn') => {
    return [
        { id: 't1', isSystem: true, name: language === 'cn' ? '每日交易计划' : 'Daily Game Plan', content: '<h3>盘前分析:</h3><ul><li>支撑/压力位:</li><li>今日偏见:</li></ul>' },
        { id: 't2', isSystem: true, name: language === 'cn' ? '周度复盘' : 'Weekly Review', content: '<h3>本周总结:</h3><p>盈亏情况: </p><p>核心错误: </p>' },
        { id: 't3', isSystem: true, name: language === 'cn' ? '心态检查' : 'Psychology Check', content: '<h3>情绪状态:</h3><p>当前的压力感(1-10): </p>' }
    ];
};

// --- Component: Rich Text Editor ---
const RichTextEditor = ({ content, onChange }: { content: string, onChange: (html: string) => void }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const { t, language } = useLanguage();

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            if (content === '' && editorRef.current.innerHTML === '<br>') return;
            editorRef.current.innerHTML = content;
        }
    }, [content]);

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const base64 = await compressImage(file);
                editorRef.current?.focus();
                execCmd('insertImage', base64);
            } catch (error) {
                console.error("Image upload failed", error);
            }
        }
    };

    const handleLink = () => {
        const url = prompt(t.plans.editor.link);
        if (url) {
            execCmd('createLink', url);
        }
    };

    const handleInsertCheckbox = () => {
        const checkboxHtml = '<input type="checkbox" style="margin-right: 6px; vertical-align: middle; accent-color: #4f46e5; transform: scale(1.2);" />&nbsp;';
        execCmd('insertHTML', checkboxHtml);
    };

    const ToolbarButton = ({ onClick, icon: Icon, title }: { onClick: () => void, icon: any, title: string }) => (
        <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick} 
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors" 
            title={title}
            type="button"
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    const Divider = () => <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1"></div>;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50" onMouseDown={(e) => e.preventDefault()}>
                <ToolbarButton onClick={() => execCmd('undo')} icon={RotateCcw} title={t.plans.editor.undo} />
                <ToolbarButton onClick={() => execCmd('redo')} icon={RotateCw} title={t.plans.editor.redo} />
                <Divider />
                <select 
                    onChange={(e) => execCmd('formatBlock', e.target.value)} 
                    className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 rounded p-1 hover:bg-white dark:hover:bg-slate-800 transition-colors h-7 cursor-pointer"
                    title="Format"
                >
                    <option value="P">{t.plans.editor.normal}</option>
                    <option value="H2">{t.plans.editor.h1}</option>
                    <option value="H3">{t.plans.editor.h2}</option>
                    <option value="PRE">{t.plans.editor.code}</option>
                </select>
                <select 
                    onChange={(e) => execCmd('fontName', e.target.value)} 
                    className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 rounded p-1 hover:bg-white dark:hover:bg-slate-800 transition-colors w-20 h-7 cursor-pointer"
                    title={t.plans.editor.fontName}
                >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Mono</option>
                    <option value="Times New Roman">Times</option>
                </select>
                <select 
                    onChange={(e) => execCmd('fontName', e.target.value)} 
                    className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 rounded p-1 hover:bg-white dark:hover:bg-slate-800 transition-colors w-14 h-7 cursor-pointer"
                    title={t.plans.editor.fontSize}
                >
                    <option value="3">16px</option>
                    <option value="1">10px</option>
                    <option value="2">13px</option>
                    <option value="4">18px</option>
                    <option value="5">24px</option>
                    <option value="6">32px</option>
                </select>
                <Divider />
                <ToolbarButton onClick={() => execCmd('bold')} icon={Bold} title={t.plans.editor.bold} />
                <ToolbarButton onClick={() => execCmd('italic')} icon={Italic} title={t.plans.editor.italic} />
                <ToolbarButton onClick={() => execCmd('underline')} icon={Underline} title={t.plans.editor.underline} />
                <ToolbarButton onClick={() => execCmd('strikeThrough')} icon={Strikethrough} title={t.plans.editor.strike} />
                <ToolbarButton onClick={() => execCmd('formatBlock', 'PRE')} icon={Code} title={t.plans.editor.code} />
                <Divider />
                <ToolbarButton onClick={() => execCmd('justifyLeft')} icon={AlignLeft} title={t.plans.editor.left} />
                <ToolbarButton onClick={() => execCmd('justifyCenter')} icon={AlignCenter} title={t.plans.editor.center} />
                {/* Fixed incorrect translation path t.reports.filters.right to t.plans.editor.right */}
                <ToolbarButton onClick={() => execCmd('justifyRight')} icon={AlignRight} title={t.plans.editor.right} />
                <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={List} title={t.plans.editor.bullet} />
                <ToolbarButton onClick={() => execCmd('insertOrderedList')} icon={ListOrdered} title={t.plans.editor.number} />
                <ToolbarButton onClick={handleInsertCheckbox} icon={CheckSquare} title={language === 'cn' ? "插入复选框" : "Insert Checkbox"} />
                <Divider />
                <ToolbarButton onClick={handleLink} icon={LinkIcon} title={t.plans.editor.link} />
                <label 
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer" 
                    title={t.plans.editor.image}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <ImageIcon className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <Divider />
                <ToolbarButton onClick={() => execCmd('removeFormat')} icon={Eraser} title={t.plans.editor.clear} />
            </div>
            <div 
                ref={editorRef}
                contentEditable
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                className="flex-1 p-8 outline-none overflow-y-auto prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-sans leading-relaxed"
                style={{ minHeight: '400px' }}
            >
            </div>
        </div>
    );
};

const TradeSummaryCard = ({ trades, onViewDetails }: { trades: Trade[], onViewDetails: () => void }) => {
    const { t } = useLanguage();
    if (trades.length === 0) return null;
    const netPnl = trades.reduce((acc, t) => acc + t.pnl - t.fees, 0);
    const grossPnl = trades.reduce((acc, t) => acc + t.pnl, 0);
    const commissions = trades.reduce((acc, t) => acc + t.fees, 0);
    const volume = trades.reduce((acc, t) => acc + t.quantity, 0);
    const totalTrades = trades.length;
    const totalExposure = trades.reduce((acc, t) => acc + (t.entryPrice * t.quantity), 0);
    const netRoi = totalExposure > 0 ? (netPnl / totalExposure) * 100 : 0;
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 shadow-sm relative group">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                    <p className={`text-xl font-bold font-mono ${netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.dashboard.netPnl} {netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}
                    </p>
                </div>
                <button 
                    onClick={onViewDetails}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                >
                    Edit / Link More
                </button>
            </div>
            <div className="grid grid-cols-5 gap-6 text-sm">
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-1">{t.plans.summary.trades}</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-200 text-lg">{totalTrades}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-1">{t.plans.summary.volume}</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-200 text-lg">{volume.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-1">{t.plans.summary.commissions}</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-200 text-lg">${commissions.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-1">Net ROI</p>
                    <p className={`font-mono font-bold text-lg ${netRoi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{netRoi.toFixed(2)}%</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-1">{t.plans.summary.grossPnl}</p>
                    <p className={`font-mono font-bold text-lg ${grossPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${grossPnl.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
};

interface FolderObj {
    id: string;
    name: string;
    parentId: string | null;
}

type SortType = 'updated' | 'created' | 'title' | 'tag';

const TradingPlans: React.FC<TradingPlansProps> = ({ 
    plans, trades, strategies, onSavePlan, onDeletePlan, onSaveStrategies, onShare,
    autoCreate, onResetAutoCreate, selectionIntent, onClearSelectionIntent,
    creationIntent, onClearCreationIntent
}) => {
  const { t, language } = useLanguage();
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('saved');
  const saveTimeoutRef = useRef<any>(null);
  const [folders, setFolders] = useState<FolderObj[]>([
      { id: 'Trade Notes', name: 'Trade Notes', parentId: null },
      { id: 'Quarterly Goals', name: 'Quarterly Goals', parentId: null },
      { id: 'Plan of Action', name: 'Plan of Action', parentId: null }
  ]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [isCreatingRootFolder, setIsCreatingRootFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingSubfolderFor, setCreatingSubfolderFor] = useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [menuOpenFolderId, setMenuOpenFolderId] = useState<string | null>(null);
  const [folderMoveTargetId, setFolderMoveTargetId] = useState<string | null>(null);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [noteMenuOpenId, setNoteMenuOpenId] = useState<string | null>(null);
  const [editorMenuOpen, setEditorMenuOpen] = useState(false);
  const [sortType, setSortType] = useState<SortType>('updated');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isLinkTradeModalOpen, setIsLinkTradeModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [tempLinkedTradeIds, setTempLinkedTradeIds] = useState<string[]>([]);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [folderSelectorOpen, setFolderSelectorOpen] = useState(false);
  const [dailyJournalContent, setDailyJournalContent] = useState('');

  // New States for Template Management
  const [isTemplateGridModalOpen, setIsTemplateGridModalOpen] = useState(false);
  const [selectedTemplateInGrid, setSelectedTemplateInGrid] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [hiddenTemplateIds, setHiddenTemplateIds] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- SMART NAVIGATION INTENT HANDLING ---
  
  // Handle Scenario A: View Existing
  useEffect(() => {
    if (selectionIntent) {
        // Find the note to ensure it exists and reset folder view if needed
        const target = plans.find(p => p.id === selectionIntent);
        if (target) {
            setSelectedPlanId(selectionIntent);
            // Auto-switch to the folder of the note for better context
            if (target.folder && activeFolder !== 'all' && activeFolder !== target.folder) {
                setActiveFolder(target.folder);
            }
        }
        onClearSelectionIntent?.();
    }
  }, [selectionIntent, plans, activeFolder, onClearSelectionIntent]);

  // Handle Scenario B: Auto-Create
  useEffect(() => {
    if (creationIntent) {
        const { date, linkedTradeIds } = creationIntent;
        
        // 1. Safety Check: Check if a note for this date and folder already exists
        const existing = plans.find(p => p.date === date && p.folder === 'daily-journal' && !p.isDeleted);
        
        if (existing) {
            // If exists, just select it (Scenario A fallback)
            setSelectedPlanId(existing.id);
        } else {
            // 2. Create New Note object
            const newPlan: DailyPlan = {
                id: Date.now().toString(),
                date: date,
                folder: 'daily-journal',
                content: '',
                focusTickers: [],
                title: language === 'cn' ? `每日复盘 - ${date}` : `Daily Review - ${date}`,
                linkedTradeIds: linkedTradeIds,
                isDeleted: false
            };
            
            // 3. Save to Global State
            onSavePlan(newPlan);
            
            // 4. Select immediately to open editor
            setSelectedPlanId(newPlan.id);
            
            // UI Hint: Switch to relevant folder
            setActiveFolder('daily-journal');
        }
        
        // 5. Clear Intent
        onClearCreationIntent?.();
    }
  }, [creationIntent, plans, language, onSavePlan, onClearCreationIntent]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'F6') {
              e.preventDefault();
              searchInputRef.current?.focus();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const systemFolders = [
      { id: 'daily-journal', label: t.plans.dailyJournal, icon: BookOpen },
      { id: 'weekly-review', label: t.plans.weeklyReview, icon: Calendar },
      { id: 'monthly-review', label: t.plans.monthlyReview, icon: BarChart3 },
      { id: 'chart-analysis', label: t.plans.chartAnalysis, icon: CandlestickChart },
      { id: 'templates', label: t.plans.templates, icon: LayoutTemplate },
  ];

  const currentFolderName = useMemo(() => {
      if (activeFolder === 'all') return t.plans.allNotes;
      if (activeFolder === 'trash') return language === 'cn' ? '回收站' : 'Recently Deleted';
      const customFolder = folders.find(f => f.id === activeFolder);
      if (customFolder) return customFolder.name;
      const sysFolder = systemFolders.find(f => f.id === activeFolder);
      return sysFolder ? sysFolder.label : activeFolder;
  }, [activeFolder, folders, t.plans.allNotes, systemFolders, language]);

  const getFolderNameById = (id: string) => {
      if (id === 'all') return t.plans.allNotes;
      if (id === 'trash') return language === 'cn' ? '回收站' : 'Trash';
      const sys = systemFolders.find(f => f.id === id);
      if (sys) return sys.label;
      const custom = folders.find(f => f.id === id);
      if (custom) return custom.name;
      return id; 
  };

  const commonTags = [
      'FOMC', 'Equities', 'Futures', 'Psychology', 'Crypto', 'Mistake', 'Strategy', 'Review'
  ];

  const filteredPlans = useMemo(() => {
      let filtered = plans;
      if (activeFolder === 'trash') {
          filtered = filtered.filter(p => p.isDeleted === true);
      } else {
          filtered = filtered.filter(p => p.isDeleted !== true);
          const isSearching = !!searchQuery;
          const shouldFilterByFolder = !isSearching || (isSearching && searchScope === 'current');
          if (shouldFilterByFolder && activeFolder !== 'all') {
              const targetIds = [activeFolder];
              const subfolders = folders.filter(f => f.parentId === activeFolder);
              targetIds.push(...subfolders.map(f => f.id));
              filtered = filtered.filter(p => targetIds.includes(p.folder || 'daily-journal'));
          }
      }

      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          filtered = filtered.filter(p => 
             p.date.includes(lowerQ) || 
             (p.title && p.title.toLowerCase().includes(lowerQ)) ||
             p.content.toLowerCase().includes(lowerQ)
          );
      }
      return filtered.sort((a, b) => {
          switch (sortType) {
              case 'created': return parseInt(b.id) - parseInt(a.id);
              case 'title': return (a.title || '').localeCompare(b.title || '');
              case 'tag':
                  const tagA = a.focusTickers?.[0] || 'zzzz'; 
                  const tagB = b.focusTickers?.[0] || 'zzzz';
                  return tagA.localeCompare(tagB) || new Date(b.date).getTime() - new Date(a.date).getTime();
              default: return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
      });
  }, [plans, activeFolder, searchQuery, searchScope, sortType, folders]);

  const uniqueTags = useMemo(() => {
      const tags = new Set<string>();
      plans.filter(p => !p.isDeleted).forEach(p => p.focusTickers?.forEach(tag => tags.add(tag)));
      return Array.from(tags);
  }, [plans]);

  const allTemplates = useMemo(() => {
      const staticTemplates = getTemplates(language).map(t => ({ 
          ...t, 
          preview: t.content.replace(/<[^>]*>?/gm, '').slice(0, 80) + '...' 
      }));
      const userTemplates = plans
          .filter(p => p.folder === 'templates' && !p.isDeleted)
          .map(p => ({
              id: p.id,
              name: p.title || 'Untitled Template',
              content: p.content,
              preview: p.content.replace(/<[^>]*>?/gm, '').slice(0, 80) + '...',
              isSystem: false
          }));
      return [...staticTemplates, ...userTemplates].filter(t => !hiddenTemplateIds.includes(t.id));
  }, [plans, language, hiddenTemplateIds]);

  const handleCreateNote = (initialContent: string = '') => {
      const today = new Date().toISOString().slice(0, 10);
      const newPlan: DailyPlan = {
          id: Date.now().toString(),
          date: today,
          folder: activeFolder === 'all' || activeFolder === 'trash' ? 'daily-journal' : activeFolder,
          content: initialContent,
          focusTickers: [],
          title: '', 
          linkedTradeIds: [],
          isDeleted: false
      };
      onSavePlan(newPlan);
      setSelectedPlanId(newPlan.id);
      if (activeFolder === 'trash') setActiveFolder('all');
  };

  const activePlan = plans.find(p => p.id === selectedPlanId);

  const handleUpdateActivePlan = (updates: Partial<DailyPlan>) => {
      if (!activePlan) return;
      setSaveStatus('saving');
      onSavePlan({ ...activePlan, ...updates });
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('saved');
      }, 800);
  };

  const handleSoftDelete = (e: React.MouseEvent, plan: DailyPlan) => {
    e.stopPropagation();
    const isAlreadyDeleted = plan.isDeleted === true;
    if (isAlreadyDeleted) {
        if (window.confirm(language === 'cn' ? "确定要彻底删除这条笔记吗？此操作无法撤销。" : "Permanently delete this note? This action cannot be undone.")) {
            onDeletePlan(plan.id);
            if (selectedPlanId === plan.id) setSelectedPlanId(null);
        }
    } else {
        onDeletePlan(plan.id);
        setToastMessage(language === 'cn' ? "笔记已移至回收站" : "Note moved to trash");
        setIsToastOpen(true);
        setTimeout(() => setIsToastOpen(false), 2000);
        if (selectedPlanId === plan.id) setSelectedPlanId(null);
        setNoteMenuOpenId(null);
    }
  };

  const handleOpenTemplateForm = (e?: React.MouseEvent, template?: any) => {
      if (e) e.stopPropagation();
      if (template) {
          setEditingTemplate(template);
          setFormName(template.name);
          setFormContent(template.content);
      } else {
          setEditingTemplate(null);
          setFormName('');
          setFormContent('');
      }
      setIsTemplateFormOpen(true);
  };

  const handleSaveTemplateForm = () => {
      if (!formName.trim()) return;
      const templatePlan: DailyPlan = {
          id: editingTemplate && !editingTemplate.isSystem ? editingTemplate.id : `tpl-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          title: formName,
          folder: 'templates',
          content: formContent,
          focusTickers: [],
          isDeleted: false
      };
      onSavePlan(templatePlan);
      setIsTemplateFormOpen(false);
      setToastMessage(language === 'cn' ? "模板已保存" : "Template saved");
      setIsToastOpen(true);
      setTimeout(() => setIsToastOpen(false), 2000);
  };

  const handleDeleteTemplate = (e: React.MouseEvent, templateId: string) => {
      e.stopPropagation();
      if (window.confirm(language === 'cn' ? "确定要把此模板移入回收站吗？" : "Move this template to trash?")) {
          if (templateId.startsWith('t')) {
              setHiddenTemplateIds(prev => [...prev, templateId]);
          } else {
              onDeletePlan(templateId);
          }
          if (selectedTemplateInGrid === templateId) setSelectedTemplateInGrid(null);
      }
  };

  const handleApplyTemplateGrid = () => {
    if (!selectedTemplateInGrid) return;
    const tpl = allTemplates.find(t => t.id === selectedTemplateInGrid);
    if (tpl) {
        handleInsertTemplate(tpl.content);
        setSelectedTemplateInGrid(null);
    }
  };

  const handleRestore = (e: React.MouseEvent, plan: DailyPlan) => {
    e.stopPropagation();
    onSavePlan({ ...plan, isDeleted: false });
    setToastMessage(language === 'cn' ? "笔记已恢复" : "Note restored");
    setIsToastOpen(true);
    setTimeout(() => setIsToastOpen(false), 2000);
    if (selectedPlanId === plan.id) setSelectedPlanId(null);
  };

  const handleCreateRootFolder = () => {
      if (!newFolderName.trim()) {
          setIsCreatingRootFolder(false);
          return;
      }
      const newId = newFolderName.trim(); 
      if (!folders.some(f => f.id === newId)) {
          setFolders([...folders, { id: newId, name: newFolderName.trim(), parentId: null }]);
      }
      setNewFolderName('');
      setIsCreatingRootFolder(false);
  };

  const handleCreateSubfolder = (parentId: string) => {
      if (!newSubfolderName.trim()) {
          setCreatingSubfolderFor(null);
          return;
      }
      const newId = `${parentId}/${newSubfolderName.trim()}`; 
      if (!folders.some(f => f.id === newId)) {
          setFolders([...folders, { id: newId, name: newSubfolderName.trim(), parentId }]);
          if (!expandedFolderIds.includes(parentId)) {
              setExpandedFolderIds([...expandedFolderIds, parentId]);
          }
      }
      setNewSubfolderName('');
      setCreatingSubfolderFor(null);
  };

  const toggleFolderExpand = (id: string) => {
      setExpandedFolderIds(prev => 
          prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      );
  };

  const handleDeleteFolder = (id: string) => {
      const folder = folders.find(f => f.id === id);
      if (!folder) return;
      if (window.confirm(t.plans.confirmDelete.replace('{folder}', folder.name))) {
          const idsToDelete = [id];
          const children = folders.filter(f => f.parentId === id);
          idsToDelete.push(...children.map(c => c.id));
          setFolders(folders.filter(f => !idsToDelete.includes(f.id)));
          if (idsToDelete.includes(activeFolder)) setActiveFolder('all');
      }
      setMenuOpenFolderId(null);
  };

  const startEditFolder = (folderId: string, currentName: string) => {
      setEditingFolderId(folderId);
      setEditFolderName(currentName);
      setMenuOpenFolderId(null);
  };

  const saveEditFolder = (folderId: string) => {
      if (editFolderName.trim()) {
          setFolders(folders.map(f => f.id === folderId ? { ...f, name: editFolderName } : f));
      }
      setEditingFolderId(null);
  };

  const showShareToast = (name: string) => {
      setToastMessage(language === 'cn' ? `已复制 "${name}" 的共享链接` : `Shared link for "${name}" copied`);
      setIsToastOpen(true);
      setTimeout(() => setIsToastOpen(false), 3000);
      setMenuOpenFolderId(null);
      setNoteMenuOpenId(null);
      setEditorMenuOpen(false);
  };

  const initiateMoveFolder = (folderId: string) => {
      setFolderMoveTargetId(folderId);
      setMenuOpenFolderId(null);
  };

  const confirmMoveFolder = (newParentId: string) => {
      if (folderMoveTargetId) {
          setFolders(folders.map(f => f.id === folderMoveTargetId ? { ...f, parentId: newParentId } : f));
          setFolderMoveTargetId(null);
      }
  };

  useEffect(() => {
      if (autoCreate) {
          handleCreateNote();
          if (onResetAutoCreate) onResetAutoCreate();
      }
  }, [autoCreate, onResetAutoCreate]);

  useEffect(() => {
      if (filteredPlans.length > 0) {
          if (!selectedPlanId || !filteredPlans.find(p => p.id === selectedPlanId)) {
             setSelectedPlanId(filteredPlans[0].id);
          }
      } else {
          setSelectedPlanId(null);
      }
  }, [activeFolder, filteredPlans, selectedPlanId]);

  const activePlanTrades = useMemo(() => {
      if (!activePlan) return [];
      return trades.filter(t => activePlan.linkedTradeIds?.includes(t.id));
  }, [activePlan, trades]);

  const handleInsertTemplate = (content: string) => {
      if (!activePlan) return;
      const newContent = (activePlan.content || '') + content;
      handleUpdateActivePlan({ content: newContent });
      setIsTemplateGridModalOpen(false);
  };

  const handleDuplicatePlan = (plan: DailyPlan) => {
      const copy: DailyPlan = {
          ...plan,
          id: Date.now().toString(),
          title: `${plan.title || 'Untitled'} (Copy)`,
          date: new Date().toISOString().slice(0, 10), 
          isDeleted: false
      };
      onSavePlan(copy);
      setSelectedPlanId(copy.id);
      setNoteMenuOpenId(null);
      setEditorMenuOpen(false);
      setToastMessage(language === 'cn' ? "笔记副本已创建" : "Note duplicated");
      setIsToastOpen(true);
      setTimeout(() => setIsToastOpen(false), 2000);
  };

  const handleExport = (plan: DailyPlan, type: 'word' | 'pdf') => {
      if (type === 'pdf') {
          const printWindow = window.open('', '', 'height=600,width=800');
          if (printWindow) {
              printWindow.document.write(`
                  <html>
                      <head>
                          <title>${plan.title || 'Note'}</title>
                          <style>body { font-family: sans-serif; padding: 40px; line-height: 1.6; } img { max-width: 100%; }</style>
                      </head>
                      <body>
                          <h1>${plan.title || 'Untitled Note'}</h1>
                          <p><strong>Date:</strong> ${plan.date}</p>
                          <hr/>
                          ${plan.content}
                      </body>
                  </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
          }
      } else {
          const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
          const footer = "</body></html>";
          const sourceHTML = header + `<h1>${plan.title || 'Untitled'}</h1>` + plan.content + footer;
          const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
          const fileDownload = document.createElement("a");
          document.body.appendChild(fileDownload);
          fileDownload.href = source;
          fileDownload.download = `${plan.title || 'note'}.doc`;
          fileDownload.click();
          document.body.removeChild(fileDownload);
      }
      setNoteMenuOpenId(null);
      setEditorMenuOpen(false);
  };

  const openSaveTemplateModal = () => {
      if (!activePlan) return;
      setTemplateName(''); 
      setIsSaveTemplateModalOpen(true);
  };

  const confirmSaveTemplate = () => {
      if (!templateName.trim() || !activePlan) return;
      const newTemplate: DailyPlan = {
          id: `tpl-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          title: templateName,
          folder: 'templates', 
          content: activePlan.content || '', 
          focusTickers: [], 
          linkedTradeIds: [],
          isDeleted: false
      };
      onSavePlan(newTemplate);
      setIsSaveTemplateModalOpen(false);
      setIsTemplatesOpen(true); 
      setToastMessage(language === 'cn' ? "模板已保存" : "Template Saved");
      setIsToastOpen(true);
      setTimeout(() => setIsToastOpen(false), 3000);
  };

  const handleAddTag = (tag: string) => {
      if (!activePlan || !tag.trim()) return;
      const currentTags = activePlan.focusTickers || [];
      if (!currentTags.includes(tag)) {
          handleUpdateActivePlan({ focusTickers: [...currentTags, tag] });
      }
      setNewTagInput('');
      setIsTagPopoverOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
      if (!activePlan) return;
      const currentTags = activePlan.focusTickers || [];
      handleUpdateActivePlan({ focusTickers: currentTags.filter(t => t !== tagToRemove) });
  };

  const openLinkTradeModal = () => {
      if (activePlan) {
          setTempLinkedTradeIds(activePlan.linkedTradeIds || []);
          setIsLinkTradeModalOpen(true);
      }
  };

  const toggleTempLinkedTrade = (tradeId: string) => {
      setTempLinkedTradeIds(prev => 
          prev.includes(tradeId) 
          ? prev.filter(id => id !== tradeId) 
          : [...prev, tradeId]
      );
  };

  const saveLinkedTrades = () => {
      handleUpdateActivePlan({ linkedTradeIds: tempLinkedTradeIds });
      setIsLinkTradeModalOpen(false);
  };

  const savedTemplates = plans.filter(p => p.folder === 'templates' && !p.isDeleted);
  const trashCount = plans.filter(p => p.isDeleted === true).length;

  return (
    <div className="flex h-full bg-white dark:bg-slate-900 overflow-hidden transition-colors relative">
      {(menuOpenFolderId || isSortMenuOpen || noteMenuOpenId || editorMenuOpen || folderSelectorOpen) && (
          <div className="fixed inset-0 z-10" onClick={() => {
              setMenuOpenFolderId(null);
              setIsSortMenuOpen(false);
              setNoteMenuOpenId(null);
              setEditorMenuOpen(false);
              setFolderSelectorOpen(false);
          }}></div>
      )}
      {isToastOpen && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl text-sm flex items-center gap-2 animate-fade-in-up">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMessage}
          </div>
      )}
      <div className="border-r border-[#E5E7EB] dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950 flex-shrink-0" style={{ width: '220px' }}>
          <div className="px-4 pt-4 pb-3 space-y-3">
              <span className="text-[15px] font-medium text-[#1F2937] dark:text-slate-100 px-[6px]">{language === 'cn' ? '笔记本' : 'Notebook'}</span>
              <button
                onClick={() => handleCreateNote()}
                className="w-full flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white py-[9px] px-3 rounded-[8px] text-[13px] font-medium transition-colors"
              >
                  <Plus className="w-4 h-4" />
                  {language === 'cn' ? '新建笔记' : 'New Note'}
              </button>
              <button
                onClick={() => setIsCreatingRootFolder(true)}
                className="flex items-center gap-1.5 text-[#9CA3AF] text-[12px] hover:text-[#6B7280] transition-colors px-[6px]"
              >
                  <Plus className="w-3 h-3" />
                  {language === 'cn' ? '添加文件夹' : 'Add Folder'}
              </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
              <div className="space-y-0.5">
                  {/* 所有笔记 */}
                  {[
                      { id: 'all', label: language === 'cn' ? '所有笔记' : 'All Notes', icon: FileText },
                      { id: 'favorites', label: language === 'cn' ? '收藏' : 'Favorites', icon: BookMarked },
                  ].map(item => {
                      const isActive = activeFolder === item.id;
                      return (
                          <button key={item.id} onClick={() => setActiveFolder(item.id)}
                            className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-[6px] transition-colors text-left ${isActive ? 'bg-[#EEF0FF] dark:bg-indigo-900/20' : 'hover:bg-[#F9FAFB] dark:hover:bg-slate-800/50'}`}
                          >
                              <ChevronRight className={`w-[9px] h-[9px] flex-shrink-0 ${isActive ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`} />
                              <item.icon className={`w-[13px] h-[13px] flex-shrink-0 ${isActive ? 'text-[#6366F1]' : 'text-[#6B7280]'}`} />
                              <span className={`text-[13px] flex-1 truncate ${isActive ? 'text-[#6366F1] font-medium' : 'text-[#4B5563] dark:text-slate-400'}`}>{item.label}</span>
                              <span className={`text-[11px] ml-auto ${isActive ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`}>
                                  {item.id === 'all' ? plans.filter(p => !p.isDeleted).length : plans.filter(p => !p.isDeleted && p.focusTickers?.includes('⭐')).length || ''}
                              </span>
                          </button>
                      );
                  })}

                  {/* 分组分隔线 */}
                  <div className="my-2 border-t border-[#F3F4F6] dark:border-slate-800 mx-1" />

                  {/* 交易笔记分类 */}
                  {[
                      { id: 'trade-notes', label: language === 'cn' ? '交易笔记' : 'Trade Notes', icon: FileText },
                      { id: 'daily-journal', label: language === 'cn' ? '每日复盘' : 'Daily Review', icon: Calendar },
                      { id: 'weekly-review', label: language === 'cn' ? '周度复盘' : 'Weekly Review', icon: TrendingUp },
                      { id: 'monthly-review', label: language === 'cn' ? '月度复盘' : 'Monthly Review', icon: BarChart3 },
                      { id: 'chart-analysis', label: language === 'cn' ? '图表分析' : 'Chart Analysis', icon: CandlestickChart },
                  ].map(item => {
                      const isActive = activeFolder === item.id;
                      const count = plans.filter(p => !p.isDeleted && p.folder === item.id).length;
                      return (
                          <button key={item.id} onClick={() => setActiveFolder(item.id)}
                            className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-[6px] transition-colors text-left ${isActive ? 'bg-[#EEF0FF] dark:bg-indigo-900/20' : 'hover:bg-[#F9FAFB] dark:hover:bg-slate-800/50'}`}
                          >
                              <ChevronRight className={`w-[9px] h-[9px] flex-shrink-0 ${isActive ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`} />
                              <item.icon className={`w-[13px] h-[13px] flex-shrink-0 ${isActive ? 'text-[#6366F1]' : 'text-[#6B7280]'}`} />
                              <span className={`text-[13px] flex-1 truncate ${isActive ? 'text-[#6366F1] font-medium' : 'text-[#4B5563] dark:text-slate-400'}`}>{item.label}</span>
                              {count > 0 && <span className={`text-[11px] ml-auto ${isActive ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`}>{count}</span>}
                          </button>
                      );
                  })}

                  {/* 分组分隔线 */}
                  <div className="my-2 border-t border-[#F3F4F6] dark:border-slate-800 mx-1" />

                  {/* 标签 */}
                  <button onClick={() => setActiveFolder('tags')}
                    className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-[6px] transition-colors text-left ${activeFolder === 'tags' ? 'bg-[#EEF0FF] dark:bg-indigo-900/20' : 'hover:bg-[#F9FAFB] dark:hover:bg-slate-800/50'}`}
                  >
                      <ChevronRight className={`w-[9px] h-[9px] flex-shrink-0 ${activeFolder === 'tags' ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`} />
                      <Tag className={`w-[13px] h-[13px] flex-shrink-0 ${activeFolder === 'tags' ? 'text-[#6366F1]' : 'text-[#6B7280]'}`} />
                      <span className={`text-[13px] flex-1 ${activeFolder === 'tags' ? 'text-[#6366F1] font-medium' : 'text-[#4B5563] dark:text-slate-400'}`}>{language === 'cn' ? '标签' : 'Tags'}</span>
                  </button>

                  {/* 回收站 */}
                  <button onClick={() => setActiveFolder('trash')}
                    className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-[6px] transition-colors text-left ${activeFolder === 'trash' ? 'bg-[#EEF0FF] dark:bg-indigo-900/20' : 'hover:bg-[#F9FAFB] dark:hover:bg-slate-800/50'}`}
                  >
                      <ChevronRight className={`w-[9px] h-[9px] flex-shrink-0 ${activeFolder === 'trash' ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`} />
                      <Trash2 className={`w-[13px] h-[13px] flex-shrink-0 ${activeFolder === 'trash' ? 'text-[#6366F1]' : 'text-[#6B7280]'}`} />
                      <span className={`text-[13px] flex-1 ${activeFolder === 'trash' ? 'text-[#6366F1] font-medium' : 'text-[#4B5563] dark:text-slate-400'}`}>{language === 'cn' ? '回收站' : 'Trash'}</span>
                      {trashCount > 0 && <span className={`text-[11px] ml-auto ${activeFolder === 'trash' ? 'text-[#6366F1]' : 'text-[#9CA3AF]'}`}>{trashCount}</span>}
                  </button>

                  {/* 自定义文件夹（保留功能） */}
                  {isCreatingRootFolder && (
                      <div className="px-2 py-1">
                          <input autoFocus type="text" value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateRootFolder()}
                            onBlur={() => handleCreateRootFolder()}
                            className="w-full text-[13px] bg-[#F9FAFB] dark:bg-slate-800 border border-[#6366F1] rounded-[6px] px-2 py-1.5 outline-none text-[#1F2937] dark:text-slate-200 placeholder-[#9CA3AF]"
                            placeholder={language === 'cn' ? '文件夹名称...' : 'Folder name...'}
                          />
                      </div>
                  )}
              </div>
          </div>
      </div>
      <div className="border-r border-[#E5E7EB] dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 flex-shrink-0" style={{ width: '280px' }}>
          <div className="p-3 border-b border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
              <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[#9CA3AF]" />
                  <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={language === 'cn' ? "搜索笔记" : "Search notes"}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#F9FAFB] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[8px] pl-8 pr-10 py-2 text-[12px] outline-none focus:border-[#6366F1] transition-colors placeholder-[#9CA3AF] text-[#1F2937] dark:text-slate-200"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF] bg-white dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded px-1 py-0.5">F6</span>
              </div>
              {activeFolder !== 'all' && activeFolder !== 'trash' && (
                  <div className="flex items-center gap-2 pb-1">
                      <span className="px-[10px] py-[3px] bg-[#EEF0FF] text-[#6366F1] text-[11px] font-medium rounded-[10px]">{currentFolderName}</span>
                  </div>
              )}
          </div>
          <div className="px-4 py-2 border-b border-[#E5E7EB] dark:border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-[#9CA3AF]">{filteredPlans.length} {language === 'cn' ? '篇' : 'notes'}</span>
              <div className="relative">
                  <button
                      onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                      className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#1F2937] dark:hover:text-slate-200 transition-colors"
                  >
                      {language === 'cn' ? '最新' : 'Latest'} <ChevronDown className="w-3 h-3" />
                  </button>
                  {isSortMenuOpen && (
                      <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-800 rounded-[8px] shadow-xl border border-[#E5E7EB] dark:border-slate-700 py-1 z-30">
                          {[
                              { id: 'updated', label: language === 'cn' ? '更新时间' : 'Updated' },
                              { id: 'created', label: language === 'cn' ? '创建时间' : 'Created' },
                              { id: 'title', label: language === 'cn' ? '标题' : 'Title' },
                          ].map((option) => (
                              <button key={option.id} onClick={() => { setSortType(option.id as SortType); setIsSortMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 text-[12px] flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"
                              >
                                  {option.label}
                                  {sortType === option.id && <Check className="w-3 h-3 text-[#6366F1]" />}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredPlans.length === 0 ? (
                  <div className="p-8 text-center text-[#9CA3AF] text-[13px]">
                      {activeFolder === 'trash' ? (language === 'cn' ? '回收站为空' : 'Trash is empty') : t.plans.noNotes}
                  </div>
              ) : (
                  filteredPlans.map(plan => {
                      const isSelected = selectedPlanId === plan.id;
                      const linkedTrades = trades.filter(t => plan.linkedTradeIds?.includes(t.id));
                      let displayPnl: number | null = null;
                      if (linkedTrades.length > 0) displayPnl = linkedTrades.reduce((acc, t) => acc + t.pnl - t.fees, 0);
                      const isMenuOpen = noteMenuOpenId === plan.id;
                      const relativeTime = (() => {
                          const now = Date.now();
                          const created = parseInt(plan.id) || new Date(plan.date).getTime();
                          const diff = now - created;
                          if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} ${language === 'cn' ? '分钟前' : 'min ago'}`;
                          if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${language === 'cn' ? '小时前' : 'hr ago'}`;
                          return `${Math.floor(diff / 86400000)} ${language === 'cn' ? '天前' : 'd ago'}`;
                      })();
                      const dateLabel = (() => {
                          const d = new Date(plan.date + 'T00:00:00');
                          return language === 'cn'
                              ? `${d.getMonth() + 1} 月 ${d.getDate()} 日`
                              : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      })();
                      const previewText = plan.content ? plan.content.replace(/<[^>]+>/g, '').slice(0, 80) : '';
                      return (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`cursor-pointer transition-all group relative ${isMenuOpen ? 'z-[25]' : 'z-0'} ${plan.isDeleted ? 'opacity-70' : ''}`}
                            style={{
                                padding: '12px 14px',
                                borderBottom: '0.5px solid #F3F4F6',
                                borderLeft: isSelected ? '2px solid #6366F1' : '2px solid transparent',
                                paddingLeft: isSelected ? '12px' : '14px',
                                background: isSelected ? '#EEF0FF' : undefined,
                            }}
                        >
                            <div className="flex justify-between items-start mb-0.5">
                                <h4 className={`text-[13px] truncate pr-2 flex-1 ${isSelected ? 'font-medium text-[#1F2937] dark:text-indigo-100' : 'font-normal text-[#1F2937] dark:text-slate-200'}`}>
                                    {plan.title || plan.date}
                                </h4>
                                {displayPnl !== null ? (
                                    <span className={`text-[11px] font-medium flex-shrink-0 ${displayPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                        {displayPnl >= 0 ? `+$${displayPnl.toFixed(0)}` : `-$${Math.abs(displayPnl).toFixed(0)}`}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-medium text-[#9CA3AF] flex-shrink-0">$0</span>
                                )}
                            </div>
                            <p className="text-[11px] text-[#9CA3AF] mb-0.5">{dateLabel} · {relativeTime}</p>
                            {previewText && (
                                <p className="text-[12px] text-[#6B7280] dark:text-slate-400 overflow-hidden" style={{ lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                    {previewText}
                                </p>
                            )}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {plan.isDeleted && (
                                    <button onClick={(e) => handleRestore(e, plan)} className="p-1 rounded-[4px] hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#9CA3AF] hover:text-[#10B981] transition-colors" title="Restore"><Undo2 className="w-3.5 h-3.5" /></button>
                                )}
                                <button onClick={(e) => handleSoftDelete(e, plan)} className="p-1 rounded-[4px] hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#9CA3AF] hover:text-[#EF4444] transition-colors" title={plan.isDeleted ? 'Delete' : 'Trash'}><Trash2 className="w-3.5 h-3.5" /></button>
                                {!plan.isDeleted && (
                                    <button onClick={(e) => { e.stopPropagation(); setNoteMenuOpenId(isMenuOpen ? null : plan.id); }} className="p-1 rounded-[4px] hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#9CA3AF] transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                                )}
                            </div>
                            {isMenuOpen && !plan.isDeleted && (
                                <div className="absolute right-0 top-10 w-40 bg-white dark:bg-slate-800 rounded-[8px] shadow-xl border border-[#E5E7EB] dark:border-slate-700 z-50 py-1">
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedPlanId(plan.id); setNoteMenuOpenId(null); }} className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Folder className="w-3 h-3" /> Open</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDuplicatePlan(plan); }} className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Copy className="w-3 h-3" /> Duplicate</button>
                                    <button onClick={(e) => { e.stopPropagation(); showShareToast(plan.title || 'Note'); }} className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Share2 className="w-3 h-3" /> Share</button>
                                    <div className="h-px bg-[#F3F4F6] dark:bg-slate-700 my-1"></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleExport(plan, 'pdf'); }} className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Printer className="w-3 h-3" /> Export PDF</button>
                                    <div className="h-px bg-[#F3F4F6] dark:bg-slate-700 my-1"></div>
                                    <button onClick={(e) => handleSoftDelete(e, plan)} className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-red-50 dark:hover:bg-rose-900/20 text-[#EF4444]"><Trash2 className="w-3 h-3" /> {language === 'cn' ? '移至回收站' : 'Move to Trash'}</button>
                                </div>
                            )}
                        </div>
                      );
                  })
              )}
          </div>
      </div>
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/30 relative overflow-hidden">
          {activePlan ? (
              <div className="flex flex-col h-full">
                <div className="px-10 pt-7 pb-2 flex items-start justify-between relative">
                    <div className="flex-1">
                        <input type="text" placeholder={t.plans.untitled} value={activePlan.title || ''} onChange={(e) => handleUpdateActivePlan({ title: e.target.value })} className="w-full bg-transparent border-none outline-none placeholder:text-[#9CA3AF] dark:placeholder:text-slate-700 mb-1" style={{ fontSize: '22px', fontWeight: 600, color: '#1F2937', lineHeight: '1.3' }} />
                        {/* 元信息行 */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] mb-5">
                            <span>{language === 'cn' ? '创建' : 'Created'} {new Date(parseInt(activePlan.id) || Date.now()).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            <span>·</span>
                            <span>{language === 'cn' ? '最后更新' : 'Updated'} {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>·</span>
                            <span className={`flex items-center gap-1 ${saveStatus === 'saving' ? 'text-[#6366F1]' : 'text-[#10B981]'}`}>
                                {saveStatus === 'saving' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                {saveStatus === 'saving' ? (language === 'cn' ? '保存中...' : 'Saving...') : (language === 'cn' ? '已自动保存' : 'Auto Saved')}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {activePlan.isDeleted && (
                            <button onClick={(e) => handleRestore(e, activePlan)} className="flex items-center gap-2 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[8px] text-[13px] font-medium transition-colors"><Undo2 className="w-4 h-4" /> {language === 'cn' ? '恢复笔记' : 'Restore'}</button>
                        )}
                        <button onClick={(e) => handleSoftDelete(e, activePlan)} className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[#F9FAFB] dark:hover:bg-slate-800 text-[#6B7280] hover:text-[#EF4444] rounded-[6px] transition-colors" title={activePlan.isDeleted ? 'Delete' : t.plans.delete}><Trash2 className="w-4 h-4" /></button>
                        {!activePlan.isDeleted && (
                            <div className="relative">
                                <button onClick={() => setEditorMenuOpen(!editorMenuOpen)} className={`w-[30px] h-[30px] flex items-center justify-center hover:bg-[#F9FAFB] dark:hover:bg-slate-800 text-[#6B7280] rounded-[6px] transition-colors ${editorMenuOpen ? 'bg-[#F9FAFB] dark:bg-slate-800' : ''}`}><MoreHorizontal className="w-4 h-4" /></button>
                                {editorMenuOpen && (
                                    <div className="absolute right-0 top-9 w-44 bg-white dark:bg-slate-800 rounded-[8px] shadow-xl border border-[#E5E7EB] dark:border-slate-700 z-30 py-1">
                                        <button onClick={() => handleDuplicatePlan(activePlan)} className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-3 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Copy className="w-4 h-4 text-[#6B7280]" /> Duplicate</button>
                                        <button onClick={() => showShareToast(activePlan.title || 'Note')} className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-3 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Share2 className="w-4 h-4 text-[#6B7280]" /> Share</button>
                                        <div className="h-px bg-[#F3F4F6] dark:bg-slate-700 my-1"></div>
                                        <button onClick={() => handleExport(activePlan, 'pdf')} className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-3 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 text-[#4B5563] dark:text-slate-200"><Printer className="w-4 h-4 text-[#6B7280]" /> Export PDF</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-10 pb-8 custom-scrollbar">
                    {/* Net P&L 信息卡 */}
                    {activePlanTrades.length > 0 ? (() => {
                        const netPnl = activePlanTrades.reduce((acc, t) => acc + t.pnl - t.fees, 0);
                        const winCount = activePlanTrades.filter(t => t.pnl - t.fees > 0).length;
                        const winRate = activePlanTrades.length > 0 ? Math.round((winCount / activePlanTrades.length) * 100) : 0;
                        return (
                            <div className="mb-5 bg-[#F9FAFB] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-700 rounded-[8px] px-4 py-3 flex items-center">
                                <div className="flex items-center gap-6 flex-1">
                                    <div>
                                        <p className="text-[11px] text-[#9CA3AF] mb-0.5">{language === 'cn' ? '当日净盈亏' : 'Net P&L'}</p>
                                        <p className={`text-[15px] font-semibold ${netPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}</p>
                                    </div>
                                    <div className="w-px h-8 bg-[#E5E7EB] dark:bg-slate-700" />
                                    <div>
                                        <p className="text-[11px] text-[#9CA3AF] mb-0.5">{language === 'cn' ? '交易' : 'Trades'}</p>
                                        <p className="text-[13px] font-medium text-[#1F2937] dark:text-slate-200">{activePlanTrades.length}</p>
                                    </div>
                                    <div className="w-px h-8 bg-[#E5E7EB] dark:bg-slate-700" />
                                    <div>
                                        <p className="text-[11px] text-[#9CA3AF] mb-0.5">{language === 'cn' ? '胜率' : 'Win Rate'}</p>
                                        <p className="text-[13px] font-medium text-[#1F2937] dark:text-slate-200">{winRate}%</p>
                                    </div>
                                </div>
                                <button onClick={openLinkTradeModal} className="text-[11px] font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors flex-shrink-0">
                                    {language === 'cn' ? '查看交易 →' : 'View Trades →'}
                                </button>
                            </div>
                        );
                    })() : (
                        <div className="mb-5 bg-[#F9FAFB] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-700 rounded-[8px] px-4 py-3 flex items-center justify-between">
                            <span className="text-[12px] text-[#9CA3AF]">{language === 'cn' ? '当日无交易记录' : 'No trades for this day'}</span>
                            <button onClick={openLinkTradeModal} className="text-[11px] font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors">
                                {language === 'cn' ? '添加一笔交易 →' : 'Link a trade →'}
                            </button>
                        </div>
                    )}
                    {/* 快捷按钮行 */}
                    <div className="flex items-center gap-2 mb-5 flex-wrap">
                        <div className="relative">
                            <button onClick={() => setFolderSelectorOpen(!folderSelectorOpen)} className="flex items-center gap-1.5 px-[10px] py-[5px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[6px] text-[12px] text-[#4B5563] dark:text-slate-300 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 transition-colors">
                                <Folder className="w-3.5 h-3.5 text-[#6B7280]" />
                                {activePlan.isDeleted ? (language === 'cn' ? '回收站' : 'Trash') : getFolderNameById(activePlan.folder)}
                                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                            </button>
                            {folderSelectorOpen && (
                                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-[8px] shadow-xl border border-[#E5E7EB] dark:border-slate-800 z-20 p-1 max-h-60 overflow-y-auto">
                                    {[
                                        { id: 'trade-notes', label: language === 'cn' ? '交易笔记' : 'Trade Notes' },
                                        { id: 'daily-journal', label: language === 'cn' ? '每日复盘' : 'Daily Review' },
                                        { id: 'weekly-review', label: language === 'cn' ? '周度复盘' : 'Weekly Review' },
                                        { id: 'monthly-review', label: language === 'cn' ? '月度复盘' : 'Monthly Review' },
                                        { id: 'chart-analysis', label: language === 'cn' ? '图表分析' : 'Chart Analysis' },
                                    ].map(f => (
                                        <button key={f.id} onClick={() => { handleUpdateActivePlan({ folder: f.id, isDeleted: false }); setFolderSelectorOpen(false); }}
                                          className={`w-full text-left px-3 py-2 text-[13px] rounded-[6px] hover:bg-[#F9FAFB] dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${!activePlan.isDeleted && activePlan.folder === f.id ? 'text-[#6366F1] font-medium bg-[#EEF0FF] dark:bg-indigo-900/20' : 'text-[#4B5563] dark:text-slate-300'}`}>
                                            <Folder className="w-3.5 h-3.5" />{f.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <button onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)} className="flex items-center gap-1.5 px-[10px] py-[5px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[6px] text-[12px] text-[#4B5563] dark:text-slate-300 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 transition-colors">
                                <Tag className="w-3.5 h-3.5 text-[#6B7280]" />
                                {language === 'cn' ? '添加标签' : 'Add Tag'}
                            </button>
                            {isTagPopoverOpen && (
                                <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-slate-900 rounded-[8px] shadow-xl border border-[#E5E7EB] dark:border-slate-700 z-20 p-3">
                                    <input type="text" autoFocus placeholder={language === 'cn' ? '输入标签...' : 'Tag name...'} className="w-full bg-[#F9FAFB] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[6px] px-3 py-2 text-[13px] outline-none focus:border-[#6366F1] mb-2 text-[#1F2937] dark:text-white" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(newTagInput); }} />
                                    <div className="flex flex-wrap gap-1.5">
                                        {commonTags.map(tag => (
                                            <button key={tag} onClick={() => handleAddTag(tag)} className="px-2 py-1 bg-[#F3F4F6] dark:bg-slate-800 hover:bg-[#EEF0FF] text-[11px] rounded-[6px] text-[#4B5563] dark:text-slate-300 hover:text-[#6366F1] transition-colors">{tag}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsTemplateGridModalOpen(true)} className="flex items-center gap-1.5 px-[10px] py-[5px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[6px] text-[12px] text-[#4B5563] dark:text-slate-300 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 transition-colors">
                            <Layout className="w-3.5 h-3.5 text-[#6B7280]" />
                            {language === 'cn' ? '选择模板' : 'Template'}
                        </button>
                        <button onClick={openSaveTemplateModal} className="flex items-center gap-1.5 px-[10px] py-[5px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[6px] text-[12px] text-[#4B5563] dark:text-slate-300 hover:bg-[#F9FAFB] dark:hover:bg-slate-700 transition-colors">
                            <BookMarked className="w-3.5 h-3.5 text-[#6B7280]" />
                            {language === 'cn' ? '保存为模板' : 'Save Template'}
                        </button>
                    </div>
                    <NotesPanel
                      symbol={activePlanTrades[0]?.symbol}
                      date={activePlan.date}
                      tradeNoteContent={activePlan.content}
                      dailyJournalContent={dailyJournalContent}
                      onContentChange={(tab, content) => {
                        if (tab === 'trade-note') {
                          handleUpdateActivePlan({ content });
                        } else {
                          setDailyJournalContent(content);
                        }
                      }}
                      onSave={(tab, content) => {
                        if (tab === 'trade-note') {
                          handleUpdateActivePlan({ content });
                        } else {
                          setDailyJournalContent(content);
                        }
                      }}
                      tradeMetadata={activePlanTrades[0] ? {
                        symbol: activePlanTrades[0].symbol,
                        date: activePlan.date,
                        dateFormatted: new Date(activePlan.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                        direction: activePlanTrades[0].direction,
                        pnlPercent: `${activePlanTrades[0].pnl >= 0 ? '+' : ''}${((activePlanTrades[0].pnl / (activePlanTrades[0].entryPrice * activePlanTrades[0].quantity || 1)) * 100).toFixed(2)}%`,
                        account: activePlanTrades[0].accountId,
                        entryPrice: `$${activePlanTrades[0].entryPrice}`,
                        exitPrice: activePlanTrades[0].exitPrice ? `$${activePlanTrades[0].exitPrice}` : undefined,
                        leverage: activePlanTrades[0].leverage ? `${activePlanTrades[0].leverage}x` : undefined,
                        quantity: `${activePlanTrades[0].quantity}`,
                      } : {
                        symbol: activePlan.title || 'Note',
                        date: activePlan.date,
                        dateFormatted: new Date(activePlan.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                        direction: '',
                        pnlPercent: '',
                      }}
                      templates={allTemplates.map(t => ({ id: t.id, name: t.name, content: t.content }))}
                      onApplyTemplate={(content) => handleInsertTemplate(content)}
                      onDeleteNote={() => {
                        handleUpdateActivePlan({ content: '' });
                      }}
                    />
                </div>
              </div>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><BookOpen className="w-8 h-8 text-slate-400" /></div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-300">{t.plans.selectNotePlaceholder}</p>
                  <p className="text-sm">{t.plans.selectNoteDesc}</p>
              </div>
          )}
      </div>
      {isTemplateGridModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
                  <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950">
                      <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{language === 'cn' ? '选择模板' : 'Select Template'}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{language === 'cn' ? '选择您预设的复盘或计划模板，快速填充笔记。' : 'Select your preferred review or planning template to fill your note.'}</p>
                      </div>
                      <button onClick={() => setIsTemplateGridModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="mb-6">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{language === 'cn' ? '推荐模板' : 'Recommended templates'}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div onClick={() => handleOpenTemplateForm()} className="group flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/10 transition-all min-h-[180px]">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-50" /></div>
                                  <span className="font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-500">{language === 'cn' ? '创建新模板' : 'Create Custom Template'}</span>
                              </div>
                              {allTemplates.map(template => {
                                  const isSelected = selectedTemplateInGrid === template.id;
                                  return (
                                      <div key={template.id} onClick={() => setSelectedTemplateInGrid(template.id)} className={`group relative flex flex-col p-5 bg-white dark:bg-slate-800/50 border rounded-2xl cursor-pointer transition-all min-h-[180px] shadow-sm hover:shadow-md ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                                          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenTemplateForm(e, template); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-500 transition-colors" title="Edit Template"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(e, template.id); }} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-slate-400 hover:text-rose-500 transition-colors" title="Delete Template"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                          <div className="flex items-center gap-3 mb-3">
                                              <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                                              <h4 className="font-bold text-slate-900 dark:text-white truncate pr-12">{template.name}</h4>
                                          </div>
                                          <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed overflow-hidden">{template.preview}</div>
                                          {isSelected && <div className="absolute bottom-3 right-3 bg-indigo-600 text-white rounded-full p-1 shadow-lg"><Check className="w-4 h-4" /></div>}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-950">
                      <button onClick={() => setIsTemplateGridModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">{language === 'cn' ? '取消' : 'Cancel'}</button>
                      <button onClick={handleApplyTemplateGrid} disabled={!selectedTemplateInGrid} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"><CheckSquare className="w-4 h-4" />{language === 'cn' ? '应用模板' : '应用'}</button>
                  </div>
              </div>
              {isTemplateFormOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <h3 className="font-bold text-slate-900 dark:text-white">{editingTemplate ? (language === 'cn' ? '编辑模板' : 'Edit Template') : (language === 'cn' ? '创建新模板' : 'Create Template')}</h3>
                            <button onClick={() => setIsTemplateFormOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4 bg-white dark:bg-slate-900">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{language === 'cn' ? '模板名称' : 'Template Name'}</label>
                                <input autoFocus type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder={language === 'cn' ? "输入模板标题..." : "Enter template title..."} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{language === 'cn' ? '模板内容' : 'Template Content'}</label>
                                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 h-48 resize-none" placeholder={language === 'cn' ? "输入复盘或计划结构..." : "Enter review or plan structure..."} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsTemplateFormOpen(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{language === 'cn' ? '取消' : 'Cancel'}</button>
                                <button onClick={handleSaveTemplateForm} disabled={!formName.trim()} className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-lg transition-all">{language === 'cn' ? '保存' : 'Save'}</button>
                            </div>
                        </div>
                    </div>
                </div>
              )}
          </div>
      )}

      {isSaveTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Save className="w-4 h-4 text-indigo-500" />{language === 'cn' ? '保存为模板' : 'Save as Template'}</h3>
                      <button onClick={() => setIsSaveTemplateModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-900">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{language === 'cn' ? '模板名称' : 'Template Name'}</label>
                      <input autoFocus type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmSaveTemplate()} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-4" placeholder={language === 'cn' ? "例如：日内突破..." : "e.g. Breakout Strategy..."} />
                      <button onClick={confirmSaveTemplate} disabled={!templateName.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20">{language === 'cn' ? '保存' : 'Save'}</button>
                  </div>
              </div>
          </div>
      )}
      {isLinkTradeModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.plans.selectTrades}</h3>
                        <div className="flex gap-3 items-center"><span className="text-xs text-slate-500">{tempLinkedTradeIds.length} selected</span><button onClick={() => setIsLinkTradeModalOpen(false)}><X className="w-5 h-5 text-slate-500" /></button></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                        {trades.length === 0 && <p className="text-center text-slate-400 py-10">No trades recorded yet.</p>}
                        {trades.sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).map(trade => {
                            const isSelected = tempLinkedTradeIds.includes(trade.id);
                            return (
                                <div key={trade.id} onClick={() => toggleTempLinkedTrade(trade.id)} className={`p-3 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>{isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}</div>
                                        <div>
                                            <div className="flex items-center gap-2"><p className="font-bold text-slate-900 dark:text-white">{trade.symbol}</p><span className={`text-[10px] px-1.5 rounded font-bold ${trade.direction === '做多' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{trade.direction}</span></div>
                                            <p className="text-xs text-slate-500">{new Date(trade.entryDate).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right"><p className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${trade.pnl.toFixed(2)}</p><p className="text-xs text-slate-400">{trade.setup}</p></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-3"><button onClick={() => setIsLinkTradeModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button><button onClick={saveLinkedTrades} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all">Save Selection ({tempLinkedTradeIds.length})</button></div>
                </div>
            </div>
      )}
    </div>
  );
};

export default TradingPlans;