import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { supabase } from '../supabaseClient';

interface OnboardingModalProps {
    onComplete: () => void;
}

type ReferralOption = 'bilibili' | 'douyin' | 'xiaohongshu' | 'wechat' | 'friend' | 'other';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
    const { t } = useLanguage();
    const [selected, setSelected] = useState<ReferralOption | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ob = (t as any).onboarding;
    const options: { key: ReferralOption; label: string }[] = [
        { key: 'bilibili', label: ob.options.bilibili },
        { key: 'douyin', label: ob.options.douyin },
        { key: 'xiaohongshu', label: ob.options.xiaohongshu },
        { key: 'wechat', label: ob.options.wechat },
        { key: 'friend', label: ob.options.friend },
        { key: 'other', label: ob.options.other },
    ];

    const handleSubmit = async () => {
        if (!selected || isSubmitting) return;
        setIsSubmitting(true);

        // Save to localStorage
        localStorage.setItem('tg_referral_source', selected);
        localStorage.setItem('tg_onboarding_done', '1');

        // Save to Supabase profiles table
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').upsert({
                    id: user.id,
                    referral_source: selected,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
            }
        } catch (e) {
            // Non-blocking — localStorage already saved
            console.error('Failed to save referral source to Supabase:', e);
        }

        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-md mx-4 flex flex-col gap-6">
                {/* Header */}
                <div className="text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{ob.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ob.subtitle}</p>
                </div>

                {/* Question */}
                <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{ob.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {options.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setSelected(key)}
                                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all duration-150 text-left
                                    ${selected === key
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!selected || isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-150"
                >
                    {ob.startBtn}
                </button>
            </div>
        </div>
    );
};

export default OnboardingModal;
