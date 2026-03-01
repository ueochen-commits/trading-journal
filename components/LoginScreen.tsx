
import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';
import { Logo } from './Logo';
import { QrCode, Smartphone, ShieldCheck, ArrowRight, ScanLine, CheckCircle2 } from 'lucide-react';

const LoginScreen: React.FC = () => {
    const { login } = useUser();
    const { t } = useLanguage();
    const [step, setStep] = useState<'scan' | 'processing' | 'success'>('scan');

    const handleLogin = () => {
        setStep('processing');
        // Simulate scan delay
        setTimeout(() => {
            setStep('success');
            setTimeout(() => {
                login();
            }, 800);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="relative z-10 w-full max-w-md">
                {/* Logo Area */}
                <div className="flex justify-center mb-8">
                    <Logo className="scale-125" textClassName="text-white" />
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8 flex flex-col items-center text-center">
                        
                        {step === 'scan' && (
                            <div className="animate-fade-in w-full flex flex-col items-center">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    {t.login.title}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 px-4">
                                    {t.login.subtitle}
                                </p>

                                {/* QR Code Simulation */}
                                <div 
                                    className="relative w-48 h-48 bg-white p-2 rounded-xl shadow-inner mb-8 cursor-pointer group"
                                    onClick={handleLogin}
                                >
                                    <div className="w-full h-full border-2 border-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        {/* Fake QR Pattern */}
                                        <div className="absolute inset-0 opacity-80" style={{
                                            backgroundImage: 'radial-gradient(#334155 2px, transparent 2px)',
                                            backgroundSize: '12px 12px'
                                        }}></div>
                                        
                                        {/* Corners */}
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-slate-900 rounded-tl-md"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-slate-900 rounded-tr-md"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-slate-900 rounded-bl-md"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-slate-900 rounded-br-md"></div>

                                        {/* Center Icon */}
                                        <div className="relative z-10 bg-white p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                            <Logo showText={false} iconClassName="w-8 h-8" />
                                        </div>

                                        {/* Scan Line Animation */}
                                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                    </div>
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                        <div className="bg-white/90 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                            Click to Log In
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 py-2 px-4 rounded-full">
                                    <Smartphone className="w-3 h-3" />
                                    <span>{t.login.scanTip}</span>
                                </div>
                            </div>
                        )}

                        {step === 'processing' && (
                            <div className="py-12 animate-fade-in flex flex-col items-center">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
                                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <ScanLine className="w-6 h-6 text-indigo-500" />
                                    </div>
                                </div>
                                <p className="text-slate-900 dark:text-white font-bold animate-pulse">{t.login.scanned}</p>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="py-12 animate-fade-in flex flex-col items-center">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Success!</h3>
                                <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
                            </div>
                        )}

                    </div>
                    
                    {/* Footer */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            {t.login.secure}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {t.login.mobile}
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button 
                        onClick={handleLogin}
                        className="text-slate-500 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-1 w-full"
                    >
                        Use Password Instead <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LoginScreen;
