
import React, { useState } from 'react';
import { useSocial } from './SocialContext';
import { X, Search, MessageCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const FriendListDrawer: React.FC = () => {
    const { friends, isFriendDrawerOpen, closeFriendDrawer, openChat, chatHistory } = useSocial();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFriends = friends.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort: Online first, then alphabetical
    const sortedFriends = filteredFriends.sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.name.localeCompare(b.name);
    });

    const getUnreadCount = (friendId: string) => {
        const msgs = chatHistory[friendId] || [];
        return msgs.filter(m => m.senderId === friendId && !m.read).length;
    };

    // Use CSS transform to slide in/out instead of conditionally rendering null
    // This keeps the DOM present but hidden, or we can use the existing conditional return
    // But since we want to remove the backdrop, we just render the drawer div.
    
    // Note: To make it slide smoothly, we can keep it mounted or use the transition class.
    // For simplicity with existing code structure:
    if (!isFriendDrawerOpen) return null;

    return (
        <div className="fixed top-0 right-0 h-screen w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[45] flex flex-col animate-fade-in-right transform transition-transform duration-300">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {t.social.friends} <span className="text-xs font-normal text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{friends.length}</span>
                </h3>
                <button onClick={closeFriendDrawer} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t.social.search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-200"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
                {sortedFriends.map(friend => {
                    const unread = getUnreadCount(friend.id);
                    return (
                        <div 
                            key={friend.id} 
                            onClick={() => openChat(friend.id)}
                            className="group flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: friend.color }}>
                                    {friend.initials}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${friend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{friend.name}</h4>
                                    <span className="text-[10px] text-slate-400">{friend.status === 'online' ? t.social.online : friend.lastSeen}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {chatHistory[friend.id]?.slice(-1)[0]?.text || friend.tier}
                                </p>
                            </div>
                            {unread > 0 ? (
                                <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-bounce">
                                    {unread}
                                </div>
                            ) : (
                                <div className="opacity-0 group-hover:opacity-100 text-slate-400">
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FriendListDrawer;
