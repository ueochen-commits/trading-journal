import React from 'react';
import { useLanguage } from '../LanguageContext';
export default function RetiredFeature(_props: any) {
  const { language } = useLanguage();
  return <main className="p-8 text-slate-900 dark:text-slate-100"><h1 className="text-2xl font-bold">{language === 'cn' ? '此功能尚未开放' : 'This feature is not available'}</h1><p className="mt-4 text-slate-500 dark:text-slate-400">{language === 'cn' ? '当前提供交易日志、CSV 导入、笔记和历史复盘。' : 'Use the trading journal, CSV import, notes and historical review.'}</p><a className="inline-block mt-6 text-indigo-600 dark:text-indigo-300 underline" href="/journal">{language === 'cn' ? '前往交易日志' : 'Open journal'}</a></main>;
}
