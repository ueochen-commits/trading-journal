
import React, { useState, useEffect, useRef } from 'react';
import { useSocial } from './SocialContext';
import { X, Send, Phone, Video } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const ChatWindow: React.FC = () => {
    const { activeChatId, closeChat, friends, chatHistory, sendMessage, markAsRead, isFriendDrawerOpen } = useSocial();
    const { t } = useLanguage();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const friend = friends.find(f => f.id === activeChatId);
    const messages = activeChatId ? (chatHistory[activeChatId] || []) : [];

    useEffect(() => {
        if (activeChatId) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            markAsRead(activeChatId);
        }
    }, [messages, activeChatId]);

    const handleSend = () => {
        if (!input.trim() || !activeChatId) return;
        sendMessage(activeChatId, input);
        setInput('');
    };

    if (!activeChatId || !friend) return null;

    // Dynamic positioning: If friend list is open, push chat to the left of it (320px + margin)
    const positionClass = isFriendDrawerOpen 
        ? "right-8 md:right-[340px]" 
        : "right-4 md:right-8";

    return (
        <div className={`fixed bottom-0 ${positionClass} w-80 md:w-96 h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-2xl z-[50] flex flex-col transition-all duration-300 animate-fade-in-up`}>
            
            {/* Header */}
            <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 rounded-t-2xl text-white cursor-pointer" onClick={() => {}}>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white text-indigo-600 border border-indigo-400">
                            {friend.initials}
                        </div>
                        {friend.status === 'online' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-indigo-600"></div>}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm leading-tight">{friend.name}</h4>
                        <span className="text-[10px] text-indigo-200 opacity-90">{friend.status === 'online' ? t.social.online : t.social.offline}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Phone className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Video className="w-4 h-4" /></button>
                    <button onClick={closeChat} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors ml-1"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                        {t.social.noMessages}
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                            msg.senderId === 'me' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={t.social.typeMessage}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    autoFocus
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full transition-all shadow-md"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
