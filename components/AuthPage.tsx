import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Logo } from './Logo';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const AuthPage: React.FC = () => {
    const { language } = useLanguage();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailConfirmSent, setEmailConfirmSent] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');

    const getFriendlyError = (message: string): string => {
        if (message === 'Failed to fetch') {
            return language === 'cn'
                ? '网络连接失败，请检查网络后重试。'
                : 'Connection failed. Please check your network and try again.';
        }
        if (message === 'Invalid login credentials') {
            return language === 'cn'
                ? '邮箱或密码错误，请重新输入。'
                : 'Incorrect email or password.';
        }
        if (message === 'User already registered') {
            return language === 'cn'
                ? '该邮箱已注册，请直接登录。'
                : 'This email is already registered. Please sign in.';
        }
        if (message === 'Email rate limit exceeded') {
            return language === 'cn'
                ? '发送邮件过于频繁，请稍后再试。'
                : 'Too many emails sent. Please wait a moment and try again.';
        }
        return message;
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setUnconfirmedEmail(null);

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
                // Show "check your email" screen on successful signup
                setEmailConfirmSent(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) {
                    // Special handling for unconfirmed email — show resend option
                    if (error.message === 'Email not confirmed') {
                        setUnconfirmedEmail(email);
                        return;
                    }
                    throw error;
                }
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            setError(getFriendlyError(err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async (targetEmail: string) => {
        setIsResending(true);
        setResendSuccess(false);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: targetEmail,
            });
            if (error) throw error;
            setResendSuccess(true);
        } catch (err: any) {
            setError(getFriendlyError(err.message));
        } finally {
            setIsResending(false);
        }
    };

    const handleSwitchTab = (toSignUp: boolean) => {
        setIsSignUp(toSignUp);
        setError(null);
        setConfirmPassword('');
        setUnconfirmedEmail(null);
        setEmailConfirmSent(false);
        setResendSuccess(false);
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(getFriendlyError(err.message));
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md">
                <div className="flex justify-center mb-10">
                    <img src="/TRADEGRAIL-lion.png" alt="TradeGrail" className="scale-125" style={{ height: '48px', width: 'auto' }} />
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden p-8">

                    {/* ── "Check your email" screen after signup ── */}
                    {emailConfirmSent ? (
                        <div className="flex flex-col items-center text-center gap-4 py-4">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Mail className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {language === 'cn' ? '确认邮件已发送' : 'Check your email'}
                            </h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {language === 'cn'
                                    ? <>我们已将确认邮件发送至 <span className="font-bold text-slate-700 dark:text-slate-300">{email}</span>，请点击邮件中的链接完成注册。</>
                                    : <>We sent a confirmation link to <span className="font-bold text-slate-700 dark:text-slate-300">{email}</span>. Click the link to activate your account.</>
                                }
                            </p>
                            <p className="text-xs text-slate-400">
                                {language === 'cn' ? '没收到？请检查垃圾邮件文件夹。' : "Didn't receive it? Check your spam folder."}
                            </p>

                            {resendSuccess ? (
                                <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {language === 'cn' ? '已重新发送！' : 'Email resent!'}
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleResend(email)}
                                    disabled={isResending}
                                    className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600 font-bold disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                                    {language === 'cn' ? '重新发送确认邮件' : 'Resend confirmation email'}
                                </button>
                            )}

                            <button
                                onClick={() => handleSwitchTab(false)}
                                className="mt-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                {language === 'cn' ? '返回登录' : 'Back to sign in'}
                            </button>
                        </div>
                    ) : unconfirmedEmail ? (
                        /* ── "Email not confirmed" inline state ── */
                        <div className="flex flex-col items-center text-center gap-4 py-4">
                            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <Mail className="w-8 h-8 text-amber-500" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {language === 'cn' ? '邮箱尚未验证' : 'Email not confirmed'}
                            </h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {language === 'cn'
                                    ? <>请前往 <span className="font-bold text-slate-700 dark:text-slate-300">{unconfirmedEmail}</span> 查收确认邮件，点击邮件中的链接后即可登录。</>
                                    : <>Please check <span className="font-bold text-slate-700 dark:text-slate-300">{unconfirmedEmail}</span> for a confirmation link.</>
                                }
                            </p>

                            {resendSuccess ? (
                                <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {language === 'cn' ? '确认邮件已重新发送！' : 'Confirmation email resent!'}
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleResend(unconfirmedEmail)}
                                    disabled={isResending}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                                    {language === 'cn' ? '重新发送确认邮件' : 'Resend confirmation email'}
                                </button>
                            )}

                            <button
                                onClick={() => setUnconfirmedEmail(null)}
                                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                {language === 'cn' ? '返回登录' : 'Back to sign in'}
                            </button>
                        </div>
                    ) : (
                        /* ── Normal login / signup form ── */
                        <>
                            {/* Toggle Tabs */}
                            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-8">
                                <button
                                    onClick={() => handleSwitchTab(false)}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isSignUp ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {language === 'cn' ? '登录' : 'Sign In'}
                                </button>
                                <button
                                    onClick={() => handleSwitchTab(true)}
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
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                    className="w-full mt-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3"
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    {language === 'cn' ? '使用 Google 登录' : 'Continue with Google'}
                                </button>

                                <div className="relative flex items-center my-2">
                                    <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-600 text-xs">{language === 'cn' ? '或' : 'or'}</span>
                                    <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                                </div>

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
                        </>
                    )}
                </div>

                {!emailConfirmSent && !unconfirmedEmail && (
                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-xs font-medium">
                            {isSignUp
                                ? (language === 'cn' ? '已经有账户了？' : 'Already have an account? ')
                                : (language === 'cn' ? '还没有账户？' : 'Don\'t have an account? ')}
                            <button
                                onClick={() => handleSwitchTab(!isSignUp)}
                                className="text-indigo-500 hover:underline font-bold ml-1"
                            >
                                {isSignUp ? (language === 'cn' ? '立即登录' : 'Sign In') : (language === 'cn' ? '免费注册' : 'Sign Up')}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthPage;
