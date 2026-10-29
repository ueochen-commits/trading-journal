// No journal prose, symbols, credentials or chat history is needed for numeric reviews.
export function aiReviewPayload(trades) {
 return (Array.isArray(trades)?trades:[]).map(t=>({
  status:['WIN','LOSS','BE','OPEN'].includes(t?.status)?t.status:'',
  pnl:typeof t?.pnl==='number'&&Number.isFinite(t.pnl)?t.pnl:null,
  fees:typeof t?.fees==='number'&&Number.isFinite(t.fees)&&t.fees>=0?t.fees:0,
 }));
}
