import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../LanguageContext';
import { DynamicOrb } from './DynamicOrb';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AuthPage: React.FC = () => {
  const { language } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authMode = params.get('auth') || params.get('mode');
    if (authMode === 'signup') {
      setIsSignUp(true);
    }
    if (authMode === 'login') {
      setIsSignUp(false);
    }
  }, []);

  const copy = {
    loginTitle: language === 'cn' ? '欢迎回到 TradeGrail' : 'Welcome back to TradeGrail',
    loginDesc: language === 'cn' ? '继续您的系统化交易之路，充满信心。' : 'Continue your structured trading review workflow.',
    signupTitle: language === 'cn' ? '激活您的个人 AI 分析师' : 'Activate your personal AI analyst',
    signupDesc: language === 'cn' ? '您的系统化交易之路从现在开始。' : 'Your structured trading workflow starts here.',
    tags: language === 'cn' ? ['分析', '回测', 'AI 分析师'] : ['Analyze', 'Backtest', 'AI Analyst'],
  };

  const getFriendlyError = (message: string): string => {
    if (message === 'Failed to fetch') {
      return language === 'cn' ? '网络连接失败，请检查网络后重试。' : 'Connection failed. Please check your network and try again.';
    }
    if (message === 'Invalid login credentials') {
      return language === 'cn' ? '邮箱或密码错误，请重新输入。' : 'Incorrect email or password.';
    }
    if (message === 'User already registered') {
      return language === 'cn' ? '该邮箱已注册，请直接登录。' : 'This email is already registered. Please sign in.';
    }
    if (message === 'Email rate limit exceeded') {
      return language === 'cn' ? '发送邮件过于频繁，请稍后再试。' : 'Too many emails sent. Please wait a moment and try again.';
    }
    return message;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setUnconfirmedEmail(null);

    if (isSignUp && !agreeTerms) {
      setError(language === 'cn' ? '请同意条款和条件' : 'Please agree to the terms and conditions.');
      setIsLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError(language === 'cn' ? '两次输入的密码不一致' : 'Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (isSignUp && password.length < 6) {
      setError(language === 'cn' ? '密码至少需要6个字符' : 'Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setEmailConfirmSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message === 'Email not confirmed') {
            setUnconfirmedEmail(email);
            return;
          }
          throw error;
        }
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
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
        options: { emailRedirectTo: window.location.origin },
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

  const renderNotice = () => {
    const targetEmail = unconfirmedEmail || email;
    const isUnconfirmed = Boolean(unconfirmedEmail);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center text-center gap-6 py-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-[#6E64FF]/10 border border-[#6E64FF]/20 flex items-center justify-center">
          <Mail className="w-10 h-10 text-[#6E64FF]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isUnconfirmed
              ? (language === 'cn' ? '邮箱尚未验证' : 'Email not confirmed')
              : (language === 'cn' ? '确认邮件已发送' : 'Check your email')}
          </h2>
          <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
            {language === 'cn'
              ? <>请前往 <span className="text-white font-semibold">{targetEmail}</span> 查收确认邮件，点击邮件中的链接后即可进入 TradeGrail。</>
              : <>Please check <span className="text-white font-semibold">{targetEmail}</span> and open the confirmation link to continue.</>}
          </p>
        </div>

        <div className="w-full border-t border-white/5" />

        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-xs text-white/30">
            {language === 'cn' ? '没收到？请检查垃圾邮件文件夹。' : "Didn't receive it? Check your spam folder."}
          </p>
          {resendSuccess ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'cn' ? '确认邮件已重新发送' : 'Confirmation email resent'}
            </div>
          ) : (
            <button
              onClick={() => handleResend(targetEmail)}
              disabled={isResending}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
            >
              {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
              {language === 'cn' ? '重新发送确认邮件' : 'Resend confirmation email'}
            </button>
          )}

          <button
            onClick={() => {
              setEmailConfirmSent(false);
              setUnconfirmedEmail(null);
              handleSwitchTab(false);
            }}
            className="mt-2 text-xs text-white/50 hover:text-white underline underline-offset-4"
          >
            {language === 'cn' ? '返回登录' : 'Back to sign in'}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A051A] flex flex-col items-center relative overflow-hidden selection:bg-[#6E64FF]/30">
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50">
        <img src="/TRADEGRAIL-lion.png" alt="TradeGrail" style={{ height: '40px', width: 'auto' }} />
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 items-center relative z-10 py-24">
        <div className="hidden lg:flex flex-col items-start justify-center relative h-full">
          <div className="absolute -left-[25%] top-1/2 -translate-y-1/2 w-[120%] aspect-square pointer-events-none opacity-80">
            <DynamicOrb />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-20 max-w-lg"
          >
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              {isSignUp ? copy.signupTitle : copy.loginTitle}
            </h1>
            <p className="text-lg text-white/50 mb-10 leading-relaxed max-w-md">
              {isSignUp ? copy.signupDesc : copy.loginDesc}
            </p>

            <div className="flex flex-wrap gap-3">
              {copy.tags.map((tag, i) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium backdrop-blur-md"
                >
                  {tag}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="bg-[#120B2E]/60 border border-white/5 rounded-[2.5rem] p-10 md:p-12 backdrop-blur-2xl shadow-2xl relative">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

            {emailConfirmSent || unconfirmedEmail ? (
              renderNotice()
            ) : (
              <form className="space-y-6 relative z-10" onSubmit={handleAuth}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-xs font-bold flex gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {isSignUp && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">
                      {language === 'cn' ? '用户名' : 'Username'}
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder={language === 'cn' ? '请输入用户名' : 'Choose a username'}
                      className="w-full bg-[#0A051A] border border-white/10 rounded-xl py-3.5 px-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#6E64FF]/60 transition-all"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">
                    {isSignUp
                      ? (language === 'cn' ? '邮箱' : 'Email')
                      : (language === 'cn' ? '邮箱或用户名' : 'Email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={language === 'cn' ? '请输入邮箱' : 'Enter your email'}
                    className="w-full bg-[#0A051A] border border-white/10 rounded-xl py-3.5 px-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#6E64FF]/60 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">
                      {language === 'cn' ? '密码' : 'Password'}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder={isSignUp
                        ? (language === 'cn' ? '请输入密码' : 'Create a password')
                        : (language === 'cn' ? '请输入密码' : 'Enter your password')}
                      className="w-full bg-[#0A051A] border border-white/10 rounded-xl py-3.5 px-5 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-[#6E64FF]/60 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 ml-1">
                        {language === 'cn' ? '确认密码' : 'Confirm password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder={language === 'cn' ? '请再次输入密码' : 'Confirm your password'}
                          className="w-full bg-[#0A051A] border border-white/10 rounded-xl py-3.5 px-5 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-[#6E64FF]/60 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 text-xs text-white/40">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-[#0A051A] text-[#6E64FF] focus:ring-[#6E64FF]"
                      />
                      <span>
                        {language === 'cn' ? '我同意' : 'I agree to the'}{' '}
                        <a href="https://www.tradegrail.net" className="text-white/60 hover:text-white underline underline-offset-4">
                          {language === 'cn' ? '条款和条件' : 'terms and conditions'}
                        </a>
                      </span>
                    </label>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white text-gray-800 py-4 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'cn' ? '使用 Google 继续' : 'Continue with Google')}
                </button>

                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="flex-shrink-0 mx-4 text-white/40 text-xs">{language === 'cn' ? '或' : 'or'}</span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#6E64FF] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#5D54E6] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6E64FF]/20"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? (language === 'cn' ? '注册' : 'Sign up') : (language === 'cn' ? '登录' : 'Sign in'))}
                </button>

                <div className="pt-4 text-center">
                  <p className="text-xs text-white/40 font-medium">
                    {isSignUp
                      ? (language === 'cn' ? '已经是用户？' : 'Already have an account?')
                      : (language === 'cn' ? '还没有账号？' : "Don't have an account?")}{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchTab(!isSignUp)}
                      className="text-white/60 hover:text-white underline underline-offset-4 ml-1"
                    >
                      {isSignUp ? (language === 'cn' ? '登录' : 'Sign in') : (language === 'cn' ? '创建账号' : 'Create account')}
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#6E64FF]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full" />
      </div>
    </div>
  );
};

export default AuthPage;
