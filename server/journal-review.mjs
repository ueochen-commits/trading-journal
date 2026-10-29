// Historical journaling only: no caller messages, roles, notes, symbols or prompts reach the model.
import { AI_USE_INSTRUCTION, assertAiContentAllowed, hasProhibitedAiContent, aiSafetyResponse } from './ai-safety.mjs';
import { authenticateAiUser, checkAiAccess } from './ai-access.mjs';
export const REVIEW_TASKS = ['summary', 'fees', 'questions'];
export function journalStats(trades) {
  const source = Array.isArray(trades) ? trades : [];
  const closed = source.filter(t => t && ['WIN','LOSS','BE'].includes(t.status) && typeof t.pnl === 'number' && Number.isFinite(t.pnl) && Math.abs(t.pnl) <= 1e12);
  const rows = closed.slice(0,10000);
  const sum = (list) => list.reduce((n,t) => n+t.pnl,0);
  const wins = rows.filter(t=>t.pnl>0), losses=rows.filter(t=>t.pnl<0);
  return {count: rows.length, excluded: source.length-rows.length, wins:wins.length, losses:losses.length, breakeven:rows.length-wins.length-losses.length, netPnl:sum(rows), fees:rows.reduce((n,t)=>n+(typeof t.fees==='number'&&Number.isFinite(t.fees)&&t.fees>=0&&t.fees<=1e12?t.fees:0),0), winRate:rows.length?wins.length/rows.length*100:0, averageWin:wins.length?sum(wins)/wins.length:0, averageLoss:losses.length?sum(losses)/losses.length:0};
}
export function reviewMessages(stats, task, language) {
  if (!REVIEW_TASKS.includes(task)) throw Error('Unsupported review task');
  return [
    {role:'system',content:`${AI_USE_INSTRUCTION} You summarize a user's historical journal statistics. You are a software assistant, not a financial adviser or trading expert. Discuss only recorded outcomes and record completeness. Never recommend trades, instruments, entry/exit prices, targets, positions, leverage, allocation or future investment actions. No predictions, signals or promises. Do not infer causation or skill from a small sample. P&L is already NET of fees: never subtract fees again. Return JSON only with {"summary":"short historical description","insights":[{"title":"short title","description":"historical observation","type":"neutral"}],"coachMessage":"question about reviewing past records"}. At most 3 insights. ${language==='cn'?'Write Chinese.':'Write English.'}`},
    {role:'user',content:JSON.stringify({task,taskDescription:{summary:'Summarize recorded results only.',fees:'Describe recorded fees without changing net P&L.',questions:'Suggest questions to check historical record completeness.'}[task],historicalStatistics:stats})}
  ];
}
const unsafe = /(?:\b(?:buy|sell|long|short)\b.{0,45}\b(?:now|next|tomorrow|at|should|recommend|target)\b|\b(?:should|recommend|must)\b.{0,45}\b(?:buy|sell|invest|trade|allocate)\b|\b(?:price target|stop.?loss|take.?profit|guaranteed return|hedge fund|financial adviser)\b|建议.{0,15}(?:买入|卖出|做多|做空|建仓|加仓|减仓|持仓|杠杆)|(?:买入价|卖出价|目标价|止盈价|止损价|稳赚|保证收益|对冲基金)|https?:\/\/|<[^>]*>)/i;
export function safeReview(raw) {
  assertAiContentAllowed(raw);
  let x;try{x=JSON.parse(raw);}catch{throw Error('Invalid review');}
  const safeText=(s,max)=>{if(typeof s!=='string'||!s.trim()||s.length>max||unsafe.test(s))throw Error('Out-of-scope review');return s.trim();};
  if(!Array.isArray(x.insights)||x.insights.length>3)throw Error('Invalid insights');
  return {summary:safeText(x.summary,1000),insights:x.insights.map(i=>({title:safeText(i.title,100),description:safeText(i.description,700),type:['neutral','positive','negative'].includes(i.type)?i.type:'neutral'})),coachMessage:safeText(x.coachMessage,700)};
}
export function fallbackReview(stats, language) {
 const cn=language==='cn';
 return {summary:cn?`本次复盘包含 ${stats.count} 笔已平仓记录，已记录净盈亏 ${stats.netPnl.toFixed(2)}。`:`This review includes ${stats.count} closed records with recorded net P&L of ${stats.netPnl.toFixed(2)}.`,insights:[{title:cn?'记录范围':'Record scope',description:cn?`盈利 ${stats.wins} 笔，亏损 ${stats.losses} 笔；未纳入 ${stats.excluded} 条未平仓、无效或超出上限的记录。`:`${stats.wins} wins and ${stats.losses} losses; ${stats.excluded} open, invalid or over-limit records excluded.`,type:'neutral'}],coachMessage:cn?'请核对历史记录、费用和缺失信息。历史结果不能预测未来表现。':'Check historical records, fees and missing information. Past results do not predict future performance.'};
}
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reviewHtml(review,stats,language,period) {
 const cn=language==='cn';const title=cn?({'daily':'历史日报','weekly':'历史周报','monthly':'历史月报'}[period]||'历史复盘报告'):({'daily':'Historical daily review','weekly':'Historical weekly review','monthly':'Historical monthly review'}[period]||'Historical journal review');
 return `<article><h1>${title}</h1><p>${esc(review.summary)}</p><dl><dt>${cn?'已平仓记录':'Closed records'}</dt><dd>${stats.count}</dd><dt>${cn?'净盈亏（已含费用）':'Net P&L (fees already included)'}</dt><dd>${stats.netPnl.toFixed(2)}</dd><dt>${cn?'已记录费用':'Recorded fees'}</dt><dd>${stats.fees.toFixed(2)}</dd><dt>${cn?'胜率':'Win rate'}</dt><dd>${stats.winRate.toFixed(1)}%</dd></dl>${review.insights.map(i=>`<section><h2>${esc(i.title)}</h2><p>${esc(i.description)}</p></section>`).join('')}<p>${esc(review.coachMessage)}</p><small>${cn?'仅用于历史记录整理，不提供交易信号或投资建议。':'For historical record review only. No trading signals or investment advice.'}</small></article>`;
}
export function createReviewHandler(kind, deps={}) {
 const authenticate=deps.authenticate||authenticateAiUser, quota=deps.quota||checkAiAccess, request=deps.fetch||globalThis.fetch;
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const auth=await authenticate(req);if(auth?.error)return res.status(auth.status).json({error:auth.error});
  const body=req.body||{}, language=body.language==='en'?'en':'cn';
  if(hasProhibitedAiContent(body))return res.status(400).json(aiSafetyResponse(language));
  const task=kind==='coach'?body.task:'summary';
  if(!REVIEW_TASKS.includes(task))return res.status(400).json({error:'HISTORICAL_REVIEW_ONLY',text:language==='cn'?'请选择历史摘要、费用回顾或记录检查。不提供自由投资问答。':'Choose a historical summary, fee review or record check. Open investment chat is not available.'});
  const stats=journalStats(body.trades);let result=fallbackReview(stats,language);
  if(stats.count){
   if(!process.env.DEEPSEEK_API_KEY)return res.status(503).json({error:'AI_UNAVAILABLE'});
   const error=await quota(req);if(error)return res.status(error.status).json({error:error.error});
   try{
    const response=await request('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.DEEPSEEK_API_KEY}`},body:JSON.stringify({model:'deepseek-flash',thinking:{type:'disabled'},messages:reviewMessages(stats,task,language),temperature:0.2,max_tokens:1200,response_format:{type:'json_object'}}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Provider unavailable');
    const data=await response.json();result=safeReview(data.choices?.[0]?.message?.content||'');
   }catch(error){if(error?.code==='AI_CONTENT_NOT_ALLOWED')return res.status(502).json(aiSafetyResponse(language));return res.status(503).json({error:'AI_REVIEW_UNAVAILABLE',text:language==='cn'?'本次历史复盘未完成，请稍后再试。':'Historical review could not be completed. Please try again.'});}
  }
  if(kind==='report')return res.status(200).json({html:reviewHtml(result,stats,language,body.period)});
  if(kind==='coach')return res.status(200).json({text:[result.summary,...result.insights.map(i=>`${i.title}: ${i.description}`),result.coachMessage].join('\n\n')});
  return res.status(200).json(result);
 };
}
