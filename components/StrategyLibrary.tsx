
import React, { useState, useEffect } from 'react';
import { Strategy, ChecklistItem } from '../types';
import { Check, ChevronDown, Plus, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface StrategyLibraryProps {
  strategies: Strategy[];
  onSaveStrategies: (strategies: Strategy[]) => void;
}

const StrategyLibrary: React.FC<StrategyLibraryProps> = ({ strategies, onSaveStrategies }) => {
  const { t } = useLanguage();
  const [activeStrategyId, setActiveStrategyId] = useState<string>(strategies.length > 0 ? strategies[0].id : '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  // Find active strategy object
  const activeStrategy = strategies.find(s => s.id === activeStrategyId) || (strategies.length > 0 ? strategies[0] : null);

  useEffect(() => {
      if (!activeStrategyId && strategies.length > 0) {
          setActiveStrategyId(strategies[0].id);
      }
  }, [strategies, activeStrategyId]);

  const handleToggleItem = (itemId: string) => {
    if (!activeStrategy) return;
    const updatedChecklist = activeStrategy.checklist.map(item => 
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    const updatedStrategy = { ...activeStrategy, checklist: updatedChecklist };
    const updatedStrategies = strategies.map(s => s.id === activeStrategy.id ? updatedStrategy : s);
    onSaveStrategies(updatedStrategies);
  };

  const handleAddItem = () => {
      if (!newItemText.trim() || !activeStrategy) return;
      const newItem: ChecklistItem = {
          id: Date.now().toString(),
          text: newItemText,
          isCompleted: false
      };
      const updatedStrategy = { ...activeStrategy, checklist: [...activeStrategy.checklist, newItem] };
      const updatedStrategies = strategies.map(s => s.id === activeStrategy.id ? updatedStrategy : s);
      onSaveStrategies(updatedStrategies);
      setNewItemText('');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeStrategy) return;
    const updatedChecklist = activeStrategy.checklist.filter(item => item.id !== itemId);
    const updatedStrategy = { ...activeStrategy, checklist: updatedChecklist };
    const updatedStrategies = strategies.map(s => s.id === activeStrategy.id ? updatedStrategy : s);
    onSaveStrategies(updatedStrategies);
  };

  const handleAddStrategy = () => {
      const name = prompt(t.plans.strategyLib.addStrategy);
      if (name) {
          const newStrategy: Strategy = {
              id: Date.now().toString(),
              name,
              checklist: []
          };
          onSaveStrategies([...strategies, newStrategy]);
          setActiveStrategyId(newStrategy.id);
      }
  };

  const handleDeleteStrategy = () => {
      if (!activeStrategy || !window.confirm("Are you sure?")) return;
      const updated = strategies.filter(s => s.id !== activeStrategy.id);
      onSaveStrategies(updated);
      if (updated.length > 0) setActiveStrategyId(updated[0].id);
      else setActiveStrategyId('');
  };

  // Calculate Progress
  const totalItems = activeStrategy?.checklist.length || 0;
  const completedItems = activeStrategy?.checklist.filter(i => i.isCompleted).length || 0;
  const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  if (!activeStrategy) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
              <p>No strategies defined.</p>
              <button onClick={handleAddStrategy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                  {t.plans.strategyLib.addStrategy}
              </button>
          </div>
      );
  }

  return (
    <div className="flex items-center justify-center h-full p-4 md:p-12 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        {/* Glassmorphism Card */}
        <div className="w-full max-w-md relative">
            {/* Background Glows */}
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-700/50 shadow-2xl backdrop-blur-xl">
                
                {/* Header Section */}
                <div className="p-6 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border-b border-white/5">
                    <h2 className="text-sm font-medium text-indigo-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4" /> {t.plans.strategyLib.title}
                    </h2>
                    
                    {/* Strategy Selector (Dropdown Look) */}
                    <div className="relative">
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-all group"
                        >
                            <span>{activeStrategy.name}</span>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in-up">
                                {strategies.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setActiveStrategyId(s.id); setDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${activeStrategyId === s.id ? 'text-indigo-400 bg-slate-700/50' : 'text-slate-300'}`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                                <div className="border-t border-slate-700 p-2">
                                     <button onClick={() => { handleAddStrategy(); setDropdownOpen(false); }} className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-2">
                                        + {t.plans.strategyLib.addStrategy}
                                     </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                            <span>{t.plans.strategyLib.progress}</span>
                            <span>{completedItems}/{totalItems}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Checklist Content */}
                <div className="p-6 bg-slate-900/80">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-slate-400">{t.plans.strategyLib.technicals}</h3>
                        <button onClick={handleDeleteStrategy} className="text-xs text-rose-500 hover:text-rose-400 opacity-50 hover:opacity-100 transition-opacity">
                             {t.plans.strategyLib.delete}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {activeStrategy.checklist.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => handleToggleItem(item.id)}
                                className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                                    item.isCompleted 
                                    ? 'bg-emerald-900/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                        item.isCompleted 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                                        : 'bg-slate-800 border border-slate-600 group-hover:border-slate-500'
                                    }`}>
                                        {item.isCompleted && <Check className="w-4 h-4 font-bold" />}
                                    </div>
                                    <span className={`text-sm font-medium transition-colors ${
                                        item.isCompleted ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                                    }`}>
                                        {item.text}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 transition-all p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Item Input */}
                    <div className="mt-6 flex gap-2">
                        <input 
                            type="text" 
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            placeholder={t.plans.strategyLib.addItem}
                            className="flex-1 bg-transparent border-b border-slate-700 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors"
                        />
                        <button 
                            onClick={handleAddItem}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default StrategyLibrary;
