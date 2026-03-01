import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { 
    Camera, Save, Image as ImageIcon, Bold, Italic, 
    Bot, Loader2, TrendingUp, Maximize2, Minimize2, 
    Search, CheckCircle2, ArrowRight,
    Columns, Rows, GripVertical, GripHorizontal,
    RotateCcw, RotateCw, Underline, Strikethrough, Code, 
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered, 
    CheckSquare, Link as LinkIcon, Eraser, Palette, Highlighter,
    X
} from 'lucide-react';
import { DailyPlan, Trade } from '../types';
import { analyzeChartImage } from '../services/geminiService';

interface ChartPageProps {
    onSavePlan?: (plan: DailyPlan) => void;
    onNavigateToNotebook?: () => void;
}

const TIMEFRAMES = [
    { label: '15m', value: '15' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: '1D', value: 'D' },
];

const ChartPage: React.FC<ChartPageProps> = ({ onSavePlan, onNavigateToNotebook }) => {
  const container = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();
  
  // --- Chart Configuration State ---
  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [tempSymbol, setTempSymbol] = useState('BINANCE:BTCUSDT');
  const [interval, setInterval] = useState('15');
  
  // --- Layout State ---
  const [layoutMode, setLayoutMode] = useState<'split' | 'chart-only' | 'note-only'>('split');
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [splitRatio, setSplitRatio] = useState(65); 
  const [isDragging, setIsDragging] = useState(false);

  // --- Note/Editor State ---
  const [noteTitle, setNoteTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // --- Toast State ---
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Load TradingView Widget
  useEffect(() => {
    if (container.current) {
        container.current.innerHTML = ""; // Clear previous widget
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    const isDark = document.documentElement.classList.contains('dark');

    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": symbol,
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": isDark ? "dark" : "light",
      "style": "1",
      "locale": language === 'cn' ? "zh_CN" : "en",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "calendar": false,
      "hide_side_toolbar": false,
      "support_host": "https://www.tradingview.com"
    });

    if (container.current) {
        try {
            container.current.appendChild(script);
        } catch(e) {
            console.warn("Failed to append TradingView script", e);
        }
    }
    
    // Auto-update title when chart context changes if empty
    if (!noteTitle) {
        const tfLabel = TIMEFRAMES.find(t => t.value === interval)?.label || interval;
        const cleanSymbol = symbol.split(':')[1] || symbol;
        setNoteTitle(`${cleanSymbol} - ${tfLabel} Analysis`);
    }

  }, [language, symbol, interval]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging || !mainContainerRef.current) return;
          
          const rect = mainContainerRef.current.getBoundingClientRect();
          let newRatio = 0;

          if (splitDirection === 'horizontal') {
              const relativeX = e.clientX - rect.left;
              newRatio = (relativeX / rect.width) * 100;
          } else {
              const relativeY = e.clientY - rect.top;
              newRatio = (relativeY / rect.height) * 100;
          }

          // Limit between 20% and 80%
          newRatio = Math.max(20, Math.min(80, newRatio));
          setSplitRatio(newRatio);
      };

      const handleMouseUp = () => {
          setIsDragging(false);
      };

      if (isDragging) {
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = splitDirection === 'horizontal' ? 'col-resize' : 'row-resize';
      } else {
          document.body.style.cursor = 'default';
      }

      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = 'default';
      };
  }, [isDragging, splitDirection]);

  // Editor Command Helper
  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
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
      >
          <Icon className="w-3.5 h-3.5" />
      </button>
  );

  const Divider = () => <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>;

  const insertImageToEditor = (base64: string) => {
      if (editorRef.current) {
          editorRef.current.focus();
          execCmd('insertImage', base64);
          execCmd('insertHTML', '<br/>'); 
      }
  };

  const captureScreen = async (): Promise<string | null> => {
      let stream: MediaStream | null = null;
      let video: HTMLVideoElement | null = null;
      try {
          setIsCapturing(true);
          // @ts-ignore
          stream = await navigator.mediaDevices.getDisplayMedia({
              video: { displaySurface: "browser" },
              audio: false,
              preferCurrentTab: true
          } as any);

          const track = stream.getVideoTracks()[0];
          let base64Image: string | null = null;

          if ('ImageCapture' in window) {
              try {
                  const imageCapture = new (window as any).ImageCapture(track);
                  const bitmap = await imageCapture.grabFrame();
                  const canvas = document.createElement('canvas');
                  canvas.width = bitmap.width;
                  canvas.height = bitmap.height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(bitmap, 0, 0);
                      base64Image = canvas.toDataURL('image/jpeg', 0.8);
                  }
              } catch (e) { console.warn("ImageCapture API failed", e); }
          }

          if (!base64Image) {
              video = document.createElement('video');
              video.srcObject = stream;
              video.muted = true;
              video.playsInline = true;
              await video.play();
              await new Promise(resolve => setTimeout(resolve, 300));
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(video, 0, 0);
                  base64Image = canvas.toDataURL('image/jpeg', 0.8);
              }
          }
          track.stop();
          if (video) { video.pause(); video.srcObject = null; }
          return base64Image;
      } catch (err: any) {
          console.error("Screenshot failed:", err);
          
          let msg = "Failed to capture screen.";
          if (err.name === 'NotAllowedError' || err.message?.includes('denied')) {
             msg = "Capture permission denied.";
          }
          
          setToastMessage(msg);
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);

          if (stream) (stream as MediaStream).getTracks().forEach(t => t.stop());
          return null;
      } finally {
          setIsCapturing(false);
      }
  };

  const handleScreenshot = async () => {
      const base64 = await captureScreen();
      if (base64) insertImageToEditor(base64);
  };

  const handleAIAnalysis = async (promptType: 'general' | 'levels' | 'plan' = 'general') => {
      const base64 = await captureScreen();
      if (base64) {
          insertImageToEditor(base64);
          setIsAnalyzing(true);
          if (editorRef.current) {
              editorRef.current.focus();
              const loadingId = `loading-${Date.now()}`;
              execCmd('insertHTML', `<p id="${loadingId}" style="color:#6366f1; font-style:italic; font-size: 12px;">${t.charts.analyzing} (${promptType})...</p>`);
              try {
                  const analysisHtml = await analyzeChartImage(base64, language);
                  execCmd('insertHTML', `<div style="background: rgba(99, 102, 241, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid #6366f1; margin: 10px 0;">${analysisHtml}</div><br/>`);
              } catch (error) {
                  execCmd('insertHTML', `<p style="color:red;">AI Analysis Failed.</p>`);
              } finally {
                  const el = document.getElementById(loadingId);
                  if(el) el.remove();
                  setIsAnalyzing(false);
              }
          }
      }
  };

  const handleSaveToNotebook = () => {
      if (!contentHtml.trim() && !noteTitle.trim()) return;
      if (!onSavePlan) return;

      const today = new Date().toISOString().slice(0, 10);
      const title = noteTitle.trim() || `${symbol} Analysis`;
      
      const newPlan: DailyPlan = {
          id: Date.now().toString(),
          date: today,
          title: title,
          folder: 'chart-analysis',
          content: contentHtml,
          focusTickers: [symbol.split(':')[1] || symbol]
      };

      onSavePlan(newPlan);
      
      setToastMessage("Saved to Notebook");
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans relative">
      
      {/* Top Control Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-col md:flex-row items-center gap-3 shrink-0 z-20 shadow-sm">
          
          {/* Left: Symbol & Timeframe */}
          <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                  <input 
                    type="text" 
                    value={tempSymbol}
                    onChange={(e) => setTempSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && setSymbol(tempSymbol)}
                    onBlur={() => setSymbol(tempSymbol)}
                    className="pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white w-32 md:w-40 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="SYMBOL"
                  />
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                  {TIMEFRAMES.map(tf => (
                      <button
                        key={tf.value}
                        onClick={() => setInterval(tf.value)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                            interval === tf.value 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                          {tf.label}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex-1"></div>

          {/* Right: Tools & Layout */}
          <div className="flex items-center gap-2">
              
              {/* View Toggles */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button onClick={() => setLayoutMode('chart-only')} className={`p-1.5 rounded ${layoutMode === 'chart-only' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}><Maximize2 className="w-4 h-4" /></button>
                  <button onClick={() => setLayoutMode('note-only')} className={`p-1.5 rounded ${layoutMode === 'note-only' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}><Minimize2 className="w-4 h-4" /></button>
              </div>

              {/* Split Controls */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-1">
                  <button onClick={() => { setLayoutMode('split'); setSplitDirection('horizontal'); }} className={`p-1.5 rounded ${layoutMode === 'split' && splitDirection === 'horizontal' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}><Columns className="w-4 h-4" /></button>
                  <button onClick={() => { setLayoutMode('split'); setSplitDirection('vertical'); }} className={`p-1.5 rounded ${layoutMode === 'split' && splitDirection === 'vertical' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400'}`}><Rows className="w-4 h-4" /></button>
              </div>
          </div>
      </div>

      <div ref={mainContainerRef} className={`flex-1 flex overflow-hidden relative ${splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
          
          {/* Main Chart Area */}
          <div 
            style={{ 
                flexBasis: layoutMode === 'chart-only' ? '100%' : layoutMode === 'note-only' ? '0%' : `${splitRatio}%`,
                display: layoutMode === 'note-only' ? 'none' : 'block'
            }}
            className="relative transition-none"
          >
              {/* Overlay for dragging (prevent iframe capture) */}
              {isDragging && <div className="absolute inset-0 z-50 bg-transparent"></div>}

              <div className="w-full h-full bg-slate-900" ref={container}>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-slate-400 animate-pulse text-sm">Loading Chart...</span>
                 </div>
              </div>
          </div>

          {/* Resizer Handle */}
          {layoutMode === 'split' && (
              <div 
                  onMouseDown={handleMouseDown}
                  className={`
                      z-40 flex items-center justify-center bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors
                      ${splitDirection === 'horizontal' ? 'w-2 cursor-col-resize h-full border-x border-slate-300 dark:border-slate-700' : 'h-2 cursor-row-resize w-full border-y border-slate-300 dark:border-slate-700'}
                  `}
              >
                  {splitDirection === 'horizontal' 
                    ? <GripVertical className="w-3 h-3 text-slate-400" />
                    : <GripHorizontal className="w-3 h-3 text-slate-400" />
                  }
              </div>
          )}

          {/* Note Editor Area */}
          <div 
            style={{ 
                flexBasis: layoutMode === 'note-only' ? '100%' : layoutMode === 'chart-only' ? '0%' : `${100 - splitRatio}%`,
                display: layoutMode === 'chart-only' ? 'none' : 'flex'
            }}
            className="flex flex-col bg-white dark:bg-slate-900 z-10 transition-none overflow-hidden"
          >
              {/* Note Toolbar (Rich Text) */}
              <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                  {/* Row 1: Text Formatting */}
                  <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800">
                      <ToolbarButton onClick={() => execCmd('undo')} icon={RotateCcw} title={t.plans.editor.undo} />
                      <ToolbarButton onClick={() => execCmd('redo')} icon={RotateCw} title={t.plans.editor.redo} />
                      <Divider />
                      <select 
                          onChange={(e) => execCmd('formatBlock', e.target.value)} 
                          className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none border border-slate-200 dark:border-slate-700 rounded p-1 hover:bg-white dark:hover:bg-slate-800 transition-colors h-6 cursor-pointer w-20"
                      >
                          <option value="P">{t.plans.editor.normal}</option>
                          <option value="H2">{t.plans.editor.h1}</option>
                          <option value="H3">{t.plans.editor.h2}</option>
                          <option value="PRE">{t.plans.editor.code}</option>
                      </select>
                      <Divider />
                      <ToolbarButton onClick={() => execCmd('bold')} icon={Bold} title={t.plans.editor.bold} />
                      <ToolbarButton onClick={() => execCmd('italic')} icon={Italic} title={t.plans.editor.italic} />
                      <ToolbarButton onClick={() => execCmd('underline')} icon={Underline} title={t.plans.editor.underline} />
                      <ToolbarButton onClick={() => execCmd('strikeThrough')} icon={Strikethrough} title={t.plans.editor.strike} />
                      
                      <label className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer relative flex items-center justify-center" title={language === 'cn' ? "字体颜色" : "Text Color"}>
                          <Palette className="w-3.5 h-3.5" />
                          <input 
                              type="color" 
                              onChange={(e) => execCmd('foreColor', e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                      </label>
                      <label className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer relative flex items-center justify-center" title={language === 'cn' ? "背景颜色" : "Highlight Color"}>
                          <Highlighter className="w-3.5 h-3.5" />
                          <input 
                              type="color" 
                              onChange={(e) => execCmd('hiliteColor', e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              defaultValue="#ffff00"
                          />
                      </label>

                      <Divider />
                      <ToolbarButton onClick={() => execCmd('justifyLeft')} icon={AlignLeft} title={t.plans.editor.left} />
                      <ToolbarButton onClick={() => execCmd('justifyCenter')} icon={AlignCenter} title={t.plans.editor.center} />
                      <ToolbarButton onClick={() => execCmd('justifyRight')} icon={AlignRight} title={t.plans.editor.right} />
                      <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={List} title={t.plans.editor.bullet} />
                      <ToolbarButton onClick={() => execCmd('insertOrderedList')} icon={ListOrdered} title={t.plans.editor.number} />
                      <ToolbarButton onClick={handleInsertCheckbox} icon={CheckSquare} title={language === 'cn' ? "插入复选框" : "Insert Checkbox"} />
                      <Divider />
                      <ToolbarButton onClick={handleLink} icon={LinkIcon} title={t.plans.editor.link} />
                      <ToolbarButton onClick={() => execCmd('removeFormat')} icon={Eraser} title={t.plans.editor.clear} />
                  </div>

                  {/* Row 2: Page Actions (AI, Screenshot, Save) */}
                  <div className="flex items-center justify-between px-3 py-2">
                       <div className="flex items-center gap-2">
                          <button onClick={() => handleAIAnalysis('general')} className="flex items-center gap-1 px-2 py-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400 text-[10px] font-bold transition-colors" title="General Analysis">
                              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Bot className="w-3 h-3"/>} Analysis
                          </button>
                          <button onClick={() => handleAIAnalysis('levels')} className="flex items-center gap-1 px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400 text-[10px] font-bold transition-colors" title="Find S/R Levels">
                              <TrendingUp className="w-3 h-3"/> Levels
                          </button>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={handleScreenshot} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded text-indigo-500 transition-colors" title="Capture Chart">
                              <Camera className="w-4 h-4" />
                          </button>
                          <button 
                          onClick={handleSaveToNotebook} 
                          className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all text-xs font-bold"
                          >
                              <Save className="w-3 h-3"/> {t.charts.saveToNotebook}
                          </button>
                       </div>
                  </div>
              </div>

              {/* Editor Title & Body */}
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                  <input 
                      type="text" 
                      placeholder="Note Title..." 
                      value={noteTitle}
                      onChange={e => setNoteTitle(e.target.value)}
                      className="px-5 py-3 text-sm font-bold bg-transparent border-b border-slate-100 dark:border-slate-800 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                      <div
                          ref={editorRef}
                          contentEditable
                          onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
                          className="w-full h-full outline-none prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 font-sans leading-relaxed"
                          data-placeholder={t.charts.notePlaceholder}
                          style={{ whiteSpace: 'pre-wrap' }}
                      />
                  </div>
              </div>
          </div>

          {/* Toast Notification */}
          {showToast && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl animate-fade-in-up border border-slate-700">
                  <div className="flex items-center gap-2">
                      {toastType === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                          <X className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="font-bold text-xs">{toastMessage}</span>
                  </div>
                  {onNavigateToNotebook && toastType === 'success' && (
                      <button 
                        onClick={() => { onNavigateToNotebook(); setShowToast(false); }}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-white transition-colors"
                      >
                          View <ArrowRight className="w-3 h-3" />
                      </button>
                  )}
              </div>
          )}

      </div>
    </div>
  );
};

export default ChartPage;