
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import { Notification } from '../types';
import { Bell, Zap, UserPlus, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

interface NotificationCenterProps {
    notifications: Notification[];
    onMarkAllRead: () => void;
    onMarkOneRead: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onMarkAllRead, onMarkOneRead }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');

    // Filter Logic
    const filteredNotifications = useMemo(() => {
        if (activeTab === 'pending') {
            return notifications.filter(n => !n.isRead);
        } else {
            return notifications.filter(n => n.isRead);
        }
    }, [notifications, activeTab]);

    const getIcon = (type: string) => {
        switch(type) {
            case 'system': return <div className="p-2 bg-indigo-500 rounded-full text-white"><Zap className="w-4 h-4" /></div>;
            case 'invite': return <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">1</div>; // Mimic screenshot
            case 'upgrade': return <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full text-white"><Sparkles className="w-4 h-4" /></div>;
            case 'removal': 
                return <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></div>;
            case 'alert':
                return <div className="p-2 bg-amber-500 rounded-full text-white"><AlertTriangle className="w-4 h-4" /></div>;
            default: return <div className="p-2 bg-slate-200 rounded-full text-slate-500"><Bell className="w-4 h-4" /></div>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    {t.notifications.title}
                </h2>
            </div>

            {/* Tabs & Actions Bar */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-0">
                <div className="flex gap-8">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        {t.notifications.pending}({notifications.filter(n => !n.isRead).length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('processed')}
                        className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'processed' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        {t.notifications.processed}({notifications.filter(n => n.isRead).length})
                    </button>
                </div>
                
                {activeTab === 'pending' && (
                    <button 
                        onClick={onMarkAllRead}
                        className="mb-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.notifications.markAllRead}
                    </button>
                )}
            </div>

            {/* Notification List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Bell className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{t.notifications.empty}</p>
                    </div>
                ) : (
                    filteredNotifications.map(notification => (
                        <div 
                            key={notification.id} 
                            onClick={() => !notification.isRead && onMarkOneRead(notification.id)}
                            className={`group relative flex items-start gap-4 p-5 bg-white dark:bg-slate-900 border rounded-2xl transition-all hover:shadow-md ${notification.isRead ? 'border-slate-100 dark:border-slate-800 opacity-80' : 'border-indigo-100 dark:border-indigo-900/50 shadow-sm bg-indigo-50/10'}`}
                        >
                            {/* Icon Column */}
                            <div className="flex-shrink-0 pt-1">
                                {notification.senderInitials ? (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${notification.type === 'removal' ? 'bg-rose-400' : 'bg-emerald-400'}`}>
                                        {notification.senderInitials}
                                    </div>
                                ) : (
                                    getIcon(notification.type)
                                )}
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1">
                                    {notification.senderName && (
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                            {notification.senderName}
                                        </span>
                                    )}
                                    {!notification.senderName && (
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                            {notification.title}
                                        </span>
                                    )}
                                    {/* Content Preview if strictly structured like screenshot */}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {notification.content}
                                </p>
                            </div>

                            {/* Date / Action Column */}
                            <div className="flex flex-col items-end justify-between self-stretch">
                                <div className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-indigo-500">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap mt-auto">
                                    {notification.timestamp}
                                </span>
                            </div>
                            
                            {/* Unread Indicator Dot */}
                            {!notification.isRead && (
                                <div className="absolute top-5 right-5 w-2 h-2 bg-rose-500 rounded-full animate-pulse md:hidden"></div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
