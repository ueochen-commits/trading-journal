import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Friend, PrivateMessage } from '../types';


interface SocialContextType {
    friends: Friend[];
    isFriendDrawerOpen: boolean;
    openFriendDrawer: () => void;
    closeFriendDrawer: () => void;
    activeChatId: string | null;
    openChat: (friendId: string) => void;
    closeChat: () => void;
    chatHistory: Record<string, PrivateMessage[]>; // friendId -> messages
    sendMessage: (friendId: string, text: string) => void;
    markAsRead: (friendId: string) => void;
    totalUnreadCount: number; // New property
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider = ({ children }: { children?: ReactNode }) => {
    const [friends] = useState<Friend[]>([]);

    const [isFriendDrawerOpen, setIsFriendDrawerOpen] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    
    const [chatHistory, setChatHistory] = useState<Record<string, PrivateMessage[]>>({});

    const openFriendDrawer = () => setIsFriendDrawerOpen(true);
    const closeFriendDrawer = () => setIsFriendDrawerOpen(false);

    const openChat = (friendId: string) => {
        setActiveChatId(friendId);
        // On mobile, maybe close drawer when chat opens? For now keep it simple.
        if (window.innerWidth < 768) setIsFriendDrawerOpen(false);
    };

    const closeChat = () => setActiveChatId(null);

    const sendMessage = (friendId: string, text: string) => {
        const newMessage: PrivateMessage = {
            id: Date.now().toString(),
            senderId: 'me',
            text,
            timestamp: new Date().toISOString(),
            read: true
        };

        setChatHistory(prev => ({
            ...prev,
            [friendId]: [...(prev[friendId] || []), newMessage]
        }));

        // Simulate Reply
        setTimeout(() => {
            const reply: PrivateMessage = {
                id: (Date.now() + 1).toString(),
                senderId: friendId,
                text: getMockReply(),
                timestamp: new Date().toISOString(),
                read: false // Incoming message is unread
            };
            setChatHistory(prev => ({
                ...prev,
                [friendId]: [...(prev[friendId] || []), reply]
            }));
        }, 3000 + Math.random() * 2000); // 3-5s delay
    };

    const markAsRead = (friendId: string) => {
        setChatHistory(prev => {
            const msgs = prev[friendId] || [];
            // Only update if there are unread messages to avoid unnecessary re-renders
            if (!msgs.some(m => !m.read)) return prev;
            
            return {
                ...prev,
                [friendId]: msgs.map(m => ({ ...m, read: true }))
            };
        });
    };

    // Calculate total unread messages across all friends
    const totalUnreadCount = useMemo(() => {
        let count = 0;
        (Object.values(chatHistory) as PrivateMessage[][]).forEach(msgs => {
            count += msgs.filter(m => !m.read && m.senderId !== 'me').length;
        });
        return count;
    }, [chatHistory]);

    return (
        <SocialContext.Provider value={{
            friends,
            isFriendDrawerOpen,
            openFriendDrawer,
            closeFriendDrawer,
            activeChatId,
            openChat,
            closeChat,
            chatHistory,
            sendMessage,
            markAsRead,
            totalUnreadCount
        }}>
            {children}
        </SocialContext.Provider>
    );
};

export const useSocial = () => {
    const context = useContext(SocialContext);
    if (!context) {
        throw new Error('useSocial must be used within a SocialProvider');
    }
    return context;
};

// Simple Mock Replies
const replies = [
    "Nice trade! 🚀",
    "Have you checked the 4H chart?",
    "I'm long on BTC as well.",
    "Careful with that leverage.",
    "Haha, totally agree.",
    "What's your stop loss?",
    "Lunch?",
    "Market is chopping me up today 😭",
    "Solid execution.",
    "Let's review this weekend."
];

const getMockReply = () => replies[Math.floor(Math.random() * replies.length)];