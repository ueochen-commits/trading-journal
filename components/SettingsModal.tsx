
import React, { useState, useEffect, useRef } from 'react';
import { X, User, Lock, Smartphone, CreditCard, Clock, Bell, Share2, Globe, MessageCircle, Video, Upload, HelpCircle, AlertCircle, Settings as SettingsIcon, CheckCircle2, Link2, RefreshCw, Trash2, Key, Terminal } from 'lucide-react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';
import { ExchangeConnection, Trade } from '../types';
import { fetchTradesFromExchange } from '../services/exchangeService';

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
                const MAX_WIDTH = 400; // Avatar optimization
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
    });
};

interface SettingsModalProps {
    onImportTrades?: (trades: Trade[]) => void;
}

const SettingsModal = ({ onImportTrades }: SettingsModalProps) => {
    const { isSettingsOpen, closeSettings, user, updateProfile, addExchangeConnection, removeExchangeConnection, updateExchangeConnectionLastSync } = useUser();
    const { t, language } = useLanguage();
    
    // --- HOOKS ---
    const [username, setUsername] = useState(user.name);
    const [selectedExchange, setSelectedExchange] = useState('Binance');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLogs, setSyncLogs] = useState<string[]>([]); 
    
    // --- 新增设置项状态 ---
    const [enableChecklist, setEnableChecklist] = useState(() => {
        return localStorage.getItem('tg_enable_checklist') !== 'false';
    });

    const [socials, setSocials] = useState({
        wechat: '',
        bilibili: '',
        douyin: '',
        weibo: '',
        website: ''
    });

    const [activeTab, setActiveTab] = useState('public-profile');
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('Settings Saved Successfully');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [syncLogs]);

    useEffect(() => {
        if (isSettingsOpen) {
            setUsername(user.name);
            setShowSuccessToast(false);
            setSyncLogs([]);
            // 同步最新的本地存储状态
            setEnableChecklist(localStorage.getItem('tg_enable_checklist') !== 'false');
        }
    }, [isSettingsOpen, user.name]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await compressImage(e.target.files[0]);
                updateProfile({ avatarUrl: base64 });
                showToast();
            } catch (err) {
                console.error("Avatar upload failed", err);
            }
        }
    };

    const handleUsernameChange = () => {
        if (username.trim() && username !== user.name) {
            updateProfile({ name: username });
            showToast();
        }
    };

    const handleSave = () => {
        if (username.trim() && username !== user.name) {
            updateProfile({ name: username });
        }
        showToast();
    };

    const showToast = (msg?: string) => {
        setToastMsg(msg || 'Settings Saved Successfully');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleToggleChecklist = (val: boolean) => {
        setEnableChecklist(val);
        localStorage.setItem('tg_enable_checklist', String(val));
        showToast(val ? (language === 'cn' ? '检查清单已启用' : 'Checklist enabled') : (language === 'cn' ? '检查清单已禁用' : 'Checklist disabled'));
    };

    const addLog = (msg: string) => {
        setSyncLogs(prev => [...prev, msg]);
    };

    const handleConnectExchange = async () => {
        if (!apiKey.trim() || !apiSecret.trim()) return;
        setIsSyncing(true);
        setSyncLogs([`[System] Initializing connection to ${selectedExchange}...`]);
        try {
            const newTrades = await fetchTradesFromExchange(selectedExchange, apiKey, apiSecret, addLog);
            const newConnection: ExchangeConnection = {
                id: Date.now().toString(),
                exchange: selectedExchange as any,
                apiKey: apiKey.slice(0, 4) + '...' + apiKey.slice(-4),
                apiSecret: '***',
                isConnected: true,
                lastSync: new Date().toLocaleString()
            };
            addExchangeConnection(newConnection);
            if (onImportTrades) onImportTrades(newTrades);
            setApiKey('');
            setApiSecret('');
            showToast(`${newTrades.length} trades imported from ${selectedExchange}`);
        } catch (error) {
            addLog(`[Error] Connection failed: ${(error as Error).message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncExisting = async (connection: ExchangeConnection) => {
        setIsSyncing(true);
        setSyncLogs([`[System] Re-syncing ${connection.exchange}...`]);
        try {
            const newTrades = await fetchTradesFromExchange(connection.exchange, 'mock-key', 'mock-secret', addLog);
            updateExchangeConnectionLastSync(connection.id);
            if (onImportTrades) onImportTrades(newTrades);
            showToast(`Synced ${newTrades.length} new trades.`);
        } catch (error) {
            addLog(`[Error] Sync failed.`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isSettingsOpen) return null;

    const menuItems = [
        { header: t.settings.menu.profileHeader, items: [
            { id: 'public-profile', label: t.settings.menu.publicProfile, icon: User },
            { id: 'privacy', label: t.settings.menu.privacy, icon: Lock },
        ]},
        { header: t.settings.menu.accountHeader, items: [
            { id: 'account', label: t.settings.menu.account, icon: SettingsIcon },
            { id: 'sessions', label: t.settings.menu.sessions, icon: Smartphone },
            { id: 'api-sync', label: t.settings.menu.apiSync, icon: Link2 },
        ]},
        { header: t.settings.menu.billingHeader, items: [
            { id: 'subscription', label: t.settings.menu.subscription, icon: CreditCard },
            { id: 'payment', label: t.settings.menu.payment, icon: CreditCard }, 
            { id: 'history', label: t.settings.menu.history, icon: Clock },
        ]},
        { header: t.settings.menu.notificationsHeader, items: [
            { id: 'alerts', label: t.settings.menu.alerts, icon: Bell },
        ]},
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={closeSettings}>
            <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex relative" onClick={e => e.stopPropagation()}>
                
                {showSuccessToast && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-up">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold text-sm">{toastMsg}</span>
                    </div>
                )}

                <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col hidden md:flex">
                    <div className="p-6"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.settings.title}</h2></div>
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 custom-scrollbar">
                        {menuItems.map((section, idx) => (
                            <div key={idx}>
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">{section.header}</h3>
                                <div className="space-y-0.5">
                                    {section.items.map(item => (
                                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                                            <item.icon className="w-4 h-4" />{item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative">
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={closeSettings} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                        {activeTab === 'account' && (
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.menu.account}</h2>
                                <div className="space-y-6">
                                    {/* 交易前检查清单开关 */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                                                {language === 'cn' ? '启用交易前检查清单' : 'Enable Pre-trade Checklist'}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {language === 'cn' ? '点击“添加交易”时，先弹出风控检查清单' : 'Show the risk checklist before logging a new trade'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleChecklist(!enableChecklist)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enableChecklist ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableChecklist ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
                                    {/* 其他账户设置... */}
                                    <p className="text-sm text-slate-400 italic">More account security settings coming soon.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'api-sync' && (
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.settings.api.title}</h2>
                                <p className="text-slate-500 text-sm mb-8">{t.settings.api.desc}</p>
                                {user.exchangeConnections && user.exchangeConnections.length > 0 && (
                                    <div className="mb-10 space-y-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t.settings.api.connected}</h3>
                                        {user.exchangeConnections.map(conn => (
                                            <div key={conn.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-indigo-600 text-lg shadow-sm">{conn.exchange.slice(0,1)}</div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white">{conn.exchange}</h4>
                                                        <p className="text-xs text-slate-500 font-mono">{conn.apiKey}</p>
                                                        <div className="flex items-center gap-2 mt-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</span><span className="text-[10px] text-slate-400">• {t.settings.api.lastSync}: {conn.lastSync}</span></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleSyncExisting(conn)} disabled={isSyncing} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /></button>
                                                    <button onClick={() => removeExchangeConnection(conn.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-indigo-500" />{t.settings.api.addBtn}</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t.settings.api.exchangeLabel}</label>
                                                <select value={selectedExchange} onChange={(e) => setSelectedExchange(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"><option value="Binance">Binance</option><option value="Bybit">Bybit</option><option value="OKX">OKX</option><option value="Coinbase">Coinbase</option></select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t.settings.api.keyLabel}</label>
                                                <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="e.g. vmPUZE6mv9sd..." className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors font-mono" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t.settings.api.secretLabel}</label>
                                                <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="•••••••••••••••••••••" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors font-mono" />
                                            </div>
                                            <button onClick={handleConnectExchange} disabled={isSyncing || !apiKey || !apiSecret} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2">{isSyncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t.settings.api.syncing}</> : t.settings.api.connect}</button>
                                            <p className="text-[10px] text-slate-400 flex items-start gap-1 mt-2 leading-tight"><AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{t.settings.api.disclaimer}</p>
                                        </div>
                                    </div>
                                    {syncLogs.length > 0 && (
                                        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-hidden shadow-inner">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-slate-500"><Terminal className="w-3 h-3" /><span>Sync Logs</span></div>
                                            <div ref={logContainerRef} className="space-y-1 h-32 overflow-y-auto custom-scrollbar">{syncLogs.map((log, i) => (<p key={i} className="animate-fade-in-right">{log}</p>))}{isSyncing && <p className="animate-pulse">_</p>}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'public-profile' && (
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.menu.publicProfile}</h2>
                                <div className="mb-10">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{t.settings.profile.photoTitle}</h3>
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-md overflow-hidden relative group">
                                            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.slice(0, 2).toUpperCase()}
                                            <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Upload className="w-6 h-6 text-white" /></div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 max-w-xs leading-relaxed">{t.settings.profile.photoDesc}</p>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t.settings.profile.uploadBtn}</button>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t.settings.profile.usernameLabel}</label>
                                        <div className="flex gap-4">
                                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                                            <button onClick={handleUsernameChange} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 transition-colors whitespace-nowrap">{t.settings.profile.changeUserBtn}</button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-6"><h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.settings.profile.socialTitle}</h3><HelpCircle className="w-4 h-4 text-slate-400 cursor-help" /></div>
                                    <div className="space-y-5">
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-600" /> {t.settings.profile.wechat}</label><input type="text" placeholder="wxid_..." value={socials.wechat} onChange={e => setSocials({...socials, wechat: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2"><Video className="w-4 h-4 text-sky-500" /> {t.settings.profile.bilibili}</label><input type="text" placeholder="space.bilibili.com/..." value={socials.bilibili} onChange={e => setSocials({...socials, bilibili: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2"><Share2 className="w-4 h-4 text-slate-900 dark:text-white" /> {t.settings.profile.douyin}</label><input type="text" placeholder="@username" value={socials.douyin} onChange={e => setSocials({...socials, douyin: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2"><EyeIcon className="w-4 h-4 text-rose-500" /> {t.settings.profile.weibo}</label><input type="text" placeholder="weibo.com/..." value={socials.weibo} onChange={e => setSocials({...socials, weibo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> {t.settings.profile.website}</label><input type="text" placeholder="https://..." value={socials.website} onChange={e => setSocials({...socials, website: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div>
                                    </div>
                                    <div className="mt-10"><button onClick={handleSave} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t.settings.profile.saveBtn}</button></div>
                                </div>
                            </div>
                        )}
                        {activeTab !== 'public-profile' && activeTab !== 'api-sync' && activeTab !== 'account' && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <SettingsIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p>Section under construction.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Icon for Weibo simulation
const EyeIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default SettingsModal;
