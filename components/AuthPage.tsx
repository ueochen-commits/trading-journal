import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Logo } from './Logo';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const AuthPage: React.FC = () => {
    const { language } = useLanguage();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (isSignUp && password !== confirmPassword) {
            setError(language === 'cn' ? '两次输入的密码不一致' : 'Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (isSignUp && password.length < 6) {
            setError(language === 'cn' ? '密码至少需要6个字符' : 'Password must be at least 6 characters');
            setIsLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username }
                    }
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            // Handle "Failed to fetch" specifically which usually means Supabase URL is invalid
            if (err.message === 'Failed to fetch') {
                setError(language === 'cn' 
                    ? "连接 Supabase 失败。请检查 supabaseClient.ts 中的 URL 和 Key 是否正确。" 
                    : "Connection to Supabase failed. Please ensure the URL and Key in supabaseClient.ts are valid.");
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="relative z-10 w-full max-w-md">
                <div className="flex justify-center mb-10">
                    <Logo className="scale-125" textClassName="text-white" />
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden p-8">
                    {/* Toggle Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-8">
                        <button 
                            onClick={() => { setIsSignUp(false); setError(null); setConfirmPassword(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isSignUp ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {language === 'cn' ? '登录' : 'Sign In'}
                        </button>
                        <button 
                            onClick={() => { setIsSignUp(true); setError(null); setConfirmPassword(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isSignUp ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {language === 'cn' ? '注册' : 'Sign Up'}
                        </button>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                        {isSignUp 
                            ? (language === 'cn' ? '创建新账户' : 'Create Account') 
                            : (language === 'cn' ? '欢迎回来' : 'Welcome Back')}
                    </h2>
                    <p className="text-sm text-slate-500 mb-8">
                        {isSignUp 
                            ? (language === 'cn' ? '加入 TradeGrail，开启专业复盘之路' : 'Join thousands of profitable traders') 
                            : (language === 'cn' ? '请输入您的凭据以访问您的日志' : 'Enter your credentials to access your journal')}
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl flex items-start gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'cn' ? '用户名' : 'Username'}</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="TraderName"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'cn' ? '电子邮箱' : 'Email Address'}</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'cn' ? '密码' : 'Password'}</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {isSignUp && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                                    {language === 'cn' ? '确认密码' : 'Confirm Password'}
                                    {isSignUp && confirmPassword && password !== confirmPassword && (
                                        <span className="text-rose-500 normal-case">{language === 'cn' ? '密码不一致' : 'Passwords do not match'}</span>
                                    )}
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${confirmPassword && password !== confirmPassword ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'}`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? (language === 'cn' ? '开始交易' : 'Create Account') : (language === 'cn' ? '进入系统' : 'Sign In')}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        SECURED BY SUPABASE AUTH
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-xs font-medium">
                        {isSignUp 
                            ? (language === 'cn' ? '已经有账户了？' : 'Already have an account? ') 
                            : (language === 'cn' ? '还没有账户？' : 'Don\'t have an account? ')}
                        <button 
                            onClick={() => { setIsSignUp(!isSignUp); setError(null); setConfirmPassword(''); }}
                            className="text-indigo-500 hover:underline font-bold ml-1"
                        >
                            {isSignUp ? (language === 'cn' ? '立即登录' : 'Sign In') : (language === 'cn' ? '免费注册' : 'Sign Up')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;