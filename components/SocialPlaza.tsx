
import React, { useState, useRef, useEffect } from 'react';
import { Post, Trade, DailyPlan, Friend, Direction, Comment, ShareIntent } from '../types';
import { useLanguage } from '../LanguageContext';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, Link as LinkIcon, FileText, CheckCircle2, TrendingUp, TrendingDown, BookOpen, UserPlus, Search, Globe, Users, MoreHorizontal, X, MessageSquare, Repeat } from 'lucide-react';
import { MOCK_FRIENDS } from '../constants';

interface SocialPlazaProps {
    userTrades: Trade[];
    userPlans: DailyPlan[];
    userProfile: { name: string; initials: string; tier: string };
    posts: Post[];
    onUpdatePosts: (posts: Post[]) => void;
    shareIntent?: ShareIntent | null;
    onClearShareIntent?: () => void;
}

const SocialPlaza: React.FC<SocialPlazaProps> = ({ userTrades, userPlans, userProfile, posts, onUpdatePosts, shareIntent, onClearShareIntent }) => {
    const { t } = useLanguage();
    
    // Create Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [attachedTrade, setAttachedTrade] = useState<Trade | null>(null);
    const [attachedPlan, setAttachedPlan] = useState<DailyPlan | null>(null);
    const [quotedPost, setQuotedPost] = useState<Post | null>(null); // For sharing/quoting
    
    // View States
    const [viewPlan, setViewPlan] = useState<DailyPlan | null>(null);

    // Comments State
    const [expandedComments, setExpandedComments] = useState<string[]>([]);
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

    // Modals
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    
    // Friends / Followers State (Mock)
    const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>(MOCK_FRIENDS.map(f => ({...f, followers: Math.floor(Math.random() * 5000) + 100, isFollowing: false})));

    const topRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Handle incoming share intent from other parts of the app
    useEffect(() => {
        if (shareIntent) {
            // Reset existing attachments
            setAttachedTrade(null);
            setAttachedPlan(null);
            setQuotedPost(null);
            setSelectedImage(null);

            if (shareIntent.type === 'trade') {
                setAttachedTrade(shareIntent.data as Trade);
            } else if (shareIntent.type === 'plan') {
                setAttachedPlan(shareIntent.data as DailyPlan);
            }
            
            // Scroll to top to see compose box
            topRef.current?.scrollIntoView({ behavior: 'smooth' });
            
            // Focus input so user can type their "paragraph" immediately
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);

            // Clear intent to prevent loop
            if (onClearShareIntent) onClearShareIntent();
        }
    }, [shareIntent, onClearShareIntent]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSelectedImage(ev.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handlePost = () => {
        if (!newPostContent.trim() && !selectedImage && !attachedTrade && !attachedPlan && !quotedPost) return;

        const newPost: Post = {
            id: Date.now().toString(),
            authorId: 'me',
            authorName: userProfile.name,
            authorInitials: userProfile.initials,
            authorTier: userProfile.tier,
            content: newPostContent,
            timestamp: "Just now",
            likes: 0,
            comments: 0,
            shares: 0,
            isLiked: false,
            image: selectedImage || undefined,
            linkedTrade: attachedTrade || undefined,
            linkedPlan: attachedPlan || undefined,
            quotedPost: quotedPost || undefined,
            commentsList: []
        };

        onUpdatePosts([newPost, ...posts]);
        
        // Reset Form
        setNewPostContent('');
        setSelectedImage(null);
        setAttachedTrade(null);
        setAttachedPlan(null);
        setQuotedPost(null);
    };

    const toggleLike = (postId: string) => {
        onUpdatePosts(posts.map(p => 
            p.id === postId 
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
            : p
        ));
    };

    const toggleFollow = (friendId: string) => {
        setSuggestedFriends(prev => prev.map(f => f.id === friendId ? { ...f, isFollowing: !f.isFollowing } : f));
    };

    // --- Comment Logic ---
    const toggleComments = (postId: string) => {
        setExpandedComments(prev => 
            prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
        );
    };

    const handleCommentSubmit = (postId: string) => {
        const text = commentInputs[postId]?.trim();
        if (!text) return;

        const newComment: Comment = {
            id: Date.now().toString(),
            authorName: userProfile.name,
            authorInitials: userProfile.initials,
            content: text,
            timestamp: 'Just now'
        };

        onUpdatePosts(posts.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    comments: p.comments + 1,
                    commentsList: [newComment, ...(p.commentsList || [])]
                };
            }
            return p;
        }));

        setCommentInputs(prev => ({...prev, [postId]: ''}));
    };

    // --- Share / Quote Logic ---
    const handleQuotePost = (post: Post) => {
        setQuotedPost(post);
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
    };

    const RenderAttachedTrade = ({ trade }: { trade: Trade }) => (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 relative group w-full">
            <div className={`p-2 rounded-lg ${trade.pnl >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {trade.pnl >= 0 ? <TrendingUp className="w-5 h-5"/> : <TrendingDown className="w-5 h-5"/>}
            </div>
            <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{trade.symbol} {trade.direction}</p>
                <p className={`text-xs font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                </p>
            </div>
        </div>
    );

    const RenderAttachedPlan = ({ plan, onClick }: { plan: DailyPlan, onClick?: () => void }) => (
        <div 
            onClick={onClick}
            className={`flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/30 relative w-full ${onClick ? 'cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors group' : ''}`}
        >
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300">
                <BookOpen className="w-5 h-5"/>
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.title || 'Untitled Note'}</p>
                <p className="text-xs text-slate-500">{plan.date}</p>
            </div>
            {onClick && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-400">
                        <FileText className="w-4 h-4" />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full" ref={topRef}>
            {/* Main Feed Section */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* Compose Box */}
                <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all duration-300 shadow-sm ${attachedTrade || attachedPlan ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {userProfile.initials}
                        </div>
                        <div className="flex-1">
                            <textarea 
                                ref={inputRef}
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder={t.plaza.whatsNew}
                                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-lg resize-none min-h-[80px]"
                            />
                            
                            {/* Attachments Previews */}
                            {selectedImage && (
                                <div className="relative inline-block mt-2">
                                    <img src={selectedImage} alt="Preview" className="h-32 w-auto rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                                </div>
                            )}
                            
                            {/* Quoted Post Preview */}
                            {quotedPost && (
                                <div className="mt-3 relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30">
                                    <button onClick={() => setQuotedPost(null)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"><X className="w-4 h-4"/></button>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Repeat className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">{t.plaza.quoted} {quotedPost.authorName}</span>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                                        {quotedPost.content}
                                    </div>
                                </div>
                            )}

                            {attachedTrade && (
                                <div className="mt-2 relative inline-block max-w-sm animate-fade-in-up">
                                    <div className="absolute -top-2 -right-2 z-10">
                                        <button onClick={() => setAttachedTrade(null)} className="bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-rose-500"><X className="w-3 h-3"/></button>
                                    </div>
                                    <RenderAttachedTrade trade={attachedTrade} />
                                </div>
                            )}
                            {attachedPlan && (
                                <div className="mt-2 relative inline-block max-w-sm animate-fade-in-up">
                                    <div className="absolute -top-2 -right-2 z-10">
                                        <button onClick={() => setAttachedPlan(null)} className="bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-rose-500"><X className="w-3 h-3"/></button>
                                    </div>
                                    <RenderAttachedPlan plan={attachedPlan} />
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-2">
                                    <label className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full cursor-pointer transition-colors" title="Image">
                                        <ImageIcon className="w-5 h-5" />
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                    <button onClick={() => setShowTradeModal(true)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-colors" title={t.plaza.attachTrade}>
                                        <TrendingUp className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setShowPlanModal(true)} className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors" title={t.plaza.attachNote}>
                                        <FileText className="w-5 h-5" />
                                    </button>
                                </div>
                                <button 
                                    onClick={handlePost}
                                    disabled={!newPostContent.trim() && !attachedTrade && !attachedPlan && !selectedImage && !quotedPost}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full font-bold transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    {t.plaza.post}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feed Tabs */}
                <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 px-2">
                    <button className="pb-3 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold">{t.plaza.feed}</button>
                    <button className="pb-3 border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium">{t.plaza.following}</button>
                </div>

                {/* Posts List */}
                <div className="space-y-6">
                    {posts.map(post => {
                        const showComments = expandedComments.includes(post.id);
                        return (
                            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                {/* Author Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                            {post.authorInitials}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 dark:text-white">{post.authorName}</h4>
                                                {/* Tier Badge */}
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                                    {post.authorTier}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">{post.timestamp}</p>
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed mb-4 text-base">
                                    {post.content}
                                </p>

                                {/* Quoted Post Display */}
                                {post.quotedPost && (
                                    <div className="mb-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-bold">
                                                {post.quotedPost.authorInitials}
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{post.quotedPost.authorName}</span>
                                            <span className="text-[10px] text-slate-400">• {post.quotedPost.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {post.quotedPost.content}
                                        </p>
                                    </div>
                                )}

                                {/* Image Attachment */}
                                {post.image && (
                                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                        <img src={post.image} alt="Post attachment" className="w-full max-h-[400px] object-cover" />
                                    </div>
                                )}

                                {/* Trade Attachment */}
                                {post.linkedTrade && (
                                    <div className="mb-4">
                                        <RenderAttachedTrade trade={post.linkedTrade} />
                                    </div>
                                )}

                                {/* Plan Attachment */}
                                {post.linkedPlan && (
                                    <div className="mb-4">
                                        <RenderAttachedPlan plan={post.linkedPlan} onClick={() => setViewPlan(post.linkedPlan!)} />
                                    </div>
                                )}

                                {/* Action Bar */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        onClick={() => toggleLike(post.id)}
                                        className={`flex items-center gap-2 text-sm transition-colors group ${post.isLiked ? 'text-rose-500 font-medium' : 'text-slate-500 hover:text-rose-500'}`}
                                    >
                                        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : 'group-hover:scale-110 transition-transform'}`} />
                                        <span>{post.likes}</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => toggleComments(post.id)}
                                        className={`flex items-center gap-2 text-sm transition-colors ${showComments ? 'text-blue-500 font-medium' : 'text-slate-500 hover:text-blue-500'}`}
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        <span>{post.comments}</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleQuotePost(post)}
                                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-500 transition-colors"
                                        title={t.plaza.shareQuote}
                                    >
                                        <Share2 className="w-5 h-5" />
                                        <span>{post.shares}</span>
                                    </button>
                                </div>

                                {/* Comments Section */}
                                {showComments && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                                        {/* Input */}
                                        <div className="flex gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {userProfile.initials}
                                            </div>
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text" 
                                                    placeholder={t.plaza.writeComment}
                                                    value={commentInputs[post.id] || ''}
                                                    onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-4 pr-10 py-2 text-sm outline-none focus:border-indigo-500 transition-colors"
                                                />
                                                <button 
                                                    onClick={() => handleCommentSubmit(post.id)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {post.commentsList && post.commentsList.length > 0 ? (
                                                post.commentsList.map(comment => (
                                                    <div key={comment.id} className="flex gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold flex-shrink-0">
                                                            {comment.authorInitials}
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-tl-none">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{comment.authorName}</span>
                                                                <span className="text-[10px] text-slate-400">{comment.timestamp}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-4 text-slate-400 text-sm italic">
                                                    No comments yet. Be the first!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar Section */}
            <div className="hidden lg:block space-y-6">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search Plaza..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                {/* Who to Follow */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-500" />
                        Who to Follow
                    </h3>
                    <div className="space-y-4">
                        {suggestedFriends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{backgroundColor: friend.color}}>
                                        {friend.initials}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{friend.name}</p>
                                        <p className="text-[10px] text-slate-500">{friend.followers?.toLocaleString()} {t.plaza.followers}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleFollow(friend.id)}
                                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                                        friend.isFollowing 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20'
                                    }`}
                                >
                                    {friend.isFollowing ? t.plaza.followingBtn : t.plaza.follow}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trending Topics (Static Mock) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-sky-500" />
                        Trending
                    </h3>
                    <div className="space-y-3">
                        <div className="cursor-pointer group">
                            <p className="text-xs text-slate-500">Trending in Crypto</p>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-500">#BitcoinATH</p>
                            <p className="text-xs text-slate-400">125K Posts</p>
                        </div>
                        <div className="cursor-pointer group">
                            <p className="text-xs text-slate-500">Trending in Forex</p>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-500">#EURUSD</p>
                            <p className="text-xs text-slate-400">45K Posts</p>
                        </div>
                        <div className="cursor-pointer group">
                            <p className="text-xs text-slate-500">Strategy</p>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-500">ICT Concepts</p>
                            <p className="text-xs text-slate-400">12K Posts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trade Selection Modal */}
            {showTradeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t.plaza.selectTrade}</h3>
                            <button onClick={() => setShowTradeModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {userTrades.map(trade => (
                                <div 
                                    key={trade.id}
                                    onClick={() => { setAttachedTrade(trade); setShowTradeModal(false); }}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${trade.pnl >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600'}`}>
                                            {trade.pnl >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{trade.symbol}</p>
                                            <p className="text-xs text-slate-500">{new Date(trade.entryDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <p className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        ${trade.pnl.toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Selection Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t.plaza.selectNote}</h3>
                            <button onClick={() => setShowPlanModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {userPlans.map(plan => (
                                <div 
                                    key={plan.id}
                                    onClick={() => { setAttachedPlan(plan); setShowPlanModal(false); }}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{plan.title || 'Untitled'}</p>
                                        <p className="text-xs text-slate-500">{plan.date}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2">
                                        {plan.content.replace(/<[^>]*>?/gm, '')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* View Plan Content Modal */}
            {viewPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewPlan(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewPlan.title || 'Untitled Note'}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{viewPlan.date}</span>
                                    {viewPlan.folder && <span className="capitalize px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-xs">{viewPlan.folder.replace('-', ' ')}</span>}
                                </p>
                            </div>
                            <button onClick={() => setViewPlan(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 flex-1">
                            {viewPlan.focusTickers && viewPlan.focusTickers.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {viewPlan.focusTickers.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-500/30">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            <div className="prose prose-slate dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:font-bold prose-a:text-indigo-500">
                                <div dangerouslySetInnerHTML={{ __html: viewPlan.content }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SocialPlaza;
