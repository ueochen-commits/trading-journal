import React, { useState } from 'react';
import { X, Loader2, Save, Bot } from 'lucide-react';
import { chatWithAnalyst } from '../services/geminiService';
import { useLanguage } from '../LanguageContext';
import { Trade } from '../types';
interface Props {
 isOpen:boolean; onClose:()=>void; onSaveToNotebook:(content:string)=>void;
 onAutoLogTrade?:(data:any)=>Trade; onViewTrade?:(id:string)=>void;
 trades?:Trade[]; tradingRules?:any[]; riskSettings?:any;
}
export default function ChatAssistant({isOpen,onClose,onSaveToNotebook,trades=[]}:Props) {
 const {language}=useLanguage(),cn=language==='cn';
 const [busy,setBusy]=useState(false),[text,setText]=useState(''),[saved,setSaved]=useState(false);
 if(!isOpen)return null;
 const run=async(task:string)=>{if(busy)return;setBusy(true);setSaved(false);try{const r=await chatWithAnalyst(task,null,[],language,trades);setText(r.text);}finally{setBusy(false);}};
 return <aside role="dialog" aria-label={cn?'历史复盘助手':'Historical review assistant'} className="fixed z-[90] bottom-5 right-5 w-[min(440px,calc(100vw-40px))] max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--tg-border)] bg-[var(--tg-surface)] text-[var(--tg-text)] shadow-2xl p-5">
  <header className="flex items-center justify-between gap-3 mb-4"><h2 className="font-bold flex items-center gap-2"><Bot size={20}/>{cn?'历史复盘助手':'Historical review assistant'}</h2><button onClick={onClose} aria-label={cn?'关闭':'Close'}><X size={20}/></button></header>
  <p className="text-sm text-[var(--tg-secondary)] mb-4">{cn?'整理已平仓记录、回顾费用、检查记录完整性。仅发送汇总统计，不提供行情预测、买卖建议或自动下单。':'Summarize closed records, review fees and check record completeness. Only aggregate statistics are sent. No predictions, trade recommendations or order execution.'}</p>
  <div className="flex flex-wrap gap-2 mb-5">{[['summary',cn?'历史摘要':'Historical summary'],['fees',cn?'费用回顾':'Fee review'],['questions',cn?'记录检查':'Record check']].map(([task,label])=><button key={task} disabled={busy} onClick={()=>run(task)} className="px-3 py-2 rounded-lg border border-[var(--tg-border)] text-sm disabled:opacity-50">{label}</button>)}</div>
  {busy&&<p role="status" className="flex gap-2 text-sm"><Loader2 className="animate-spin" size={16}/>{cn?'正在整理历史数据…':'Reviewing historical data…'}</p>}
  {text&&<><div className="whitespace-pre-wrap text-sm leading-7 rounded-xl p-4 bg-[var(--tg-bg)] border border-[var(--tg-border)]">{text}</div><button disabled={saved} onClick={()=>{onSaveToNotebook(text);setSaved(true);}} className="mt-4 flex gap-2 items-center text-sm"><Save size={16}/>{saved?(cn?'已保存':'Saved'):(cn?'保存到笔记':'Save to notebook')}</button></>}
 </aside>;
}
