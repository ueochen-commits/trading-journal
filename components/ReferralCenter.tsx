import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

const ReferralCenter: React.FC = () => {
  const { language } = useLanguage();
  const cn = language === 'cn';
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const url = 'https://www.tradegrail.net';
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setError(false); }
    catch { setError(true); }
  };
  return <div className="p-6 md:p-10 text-slate-900 dark:text-slate-100">
    <section className="tg-module max-w-2xl rounded-2xl border border-slate-200 dark:border-[var(--tg-border)] bg-white dark:bg-slate-900 p-7">
      <h1 className="text-2xl font-bold">{cn ? '分享 TradeGrail' : 'Share TradeGrail'}</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-400">{cn ? '把官网链接发给朋友，邀请他们免费体验交易日志与复盘。' : 'Invite a friend to try the free trading journal and review tools.'}</p>
      <label htmlFor="tradegrail-share-link" className="block text-sm mt-6 mb-2">{cn ? '官网链接' : 'Website link'}</label>
      <input id="tradegrail-share-link" readOnly value={url} onFocus={event => event.currentTarget.select()} className="w-full rounded-xl border border-slate-200 dark:border-[var(--tg-border)] bg-slate-50 dark:bg-slate-800 p-3" />
      <button onClick={copy} className="mt-4 px-5 py-3 rounded-xl bg-indigo-600 text-white">{copied ? (cn ? '已复制' : 'Copied') : (cn ? '复制官网链接' : 'Copy website link')}</button>
      {error && <p role="status" className="text-sm mt-3 text-slate-500">{cn ? '请选中上方链接手动复制。' : 'Select the link above to copy it manually.'}</p>}
    </section>
  </div>;
};
export default ReferralCenter;
