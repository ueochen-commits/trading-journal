import React from 'react';
import { FEE_BASIS_LABELS, type FeeTemplate } from '../utils/tradeCalculation';
import type { futuresSpec, futuresGrossPnl } from '../utils/tradeCalculation';
interface Props {
  language: string; editing: boolean; currency?: string;
  spec: ReturnType<typeof futuresSpec>; calculation: ReturnType<typeof futuresGrossPnl> | null;
  calculationError: string; automatic: boolean; onAutomatic: (enabled: boolean) => void;
  template?: FeeTemplate; templateFee: number | null; useTemplate: boolean; onUseTemplate: (enabled: boolean) => void;
}
export default function TradeCalculationControls(p: Props) {
  const cn = p.language === 'cn';
  return <div className="space-y-3 text-xs leading-6 text-slate-600 dark:text-slate-300">
    <div className="space-y-1">
      <p className="font-semibold">{cn ? '手续费来源' : 'Fee source'}：{p.templateFee !== null && p.useTemplate ? (cn ? '账户模板估算' : 'Account template estimate') : (cn ? '本笔手动金额' : 'Manual amount')}</p>
      {p.template && <p>{p.template.symbol} · {p.template.currency} {p.template.rate} · {FEE_BASIS_LABELS[p.template.basis][cn ? 'cn' : 'en']}{p.templateFee !== null ? ` → ${p.template.currency} ${p.templateFee.toFixed(2)}` : (cn ? '；仅完整平仓时估算，持仓费用请手动填写。' : '; estimates completed trades only. Enter fees manually for open positions.')}</p>}
      {p.template && <button type="button" className="font-semibold text-indigo-600 dark:text-indigo-300" onClick={() => p.onUseTemplate(!p.useTemplate)}>{p.useTemplate ? (cn ? '改为手动填写手续费' : 'Enter fees manually') : (cn ? '使用该账户模板估算手续费' : 'Use account fee template')}</button>}
      {p.editing && <p>{cn ? '编辑已有记录保留已保存的费用；应用新模板需主动选择。' : 'Saved fees stay unchanged unless you explicitly apply a template.'}</p>}
    </div>
    {(p.spec || p.automatic) && <div className="border-t border-slate-200 pt-3 dark:border-[var(--tg-border)]">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{cn ? '期货盈亏计算' : 'Futures P&L calculation'}{p.spec ? ` · ${p.spec.symbol}` : ''}</p><button type="button" className="rounded-lg border border-indigo-200 px-3 py-1 font-semibold text-indigo-600 dark:border-indigo-800 dark:text-indigo-300" onClick={() => p.onAutomatic(!p.automatic)}>{p.automatic ? (cn ? '改为手动校正盈亏' : 'Override P&L manually') : (cn ? `按 ${p.spec?.symbol} 合约计算` : `Calculate using ${p.spec?.symbol}`)}</button></div>
      {p.spec && <p>{p.spec.name} · {cn ? '每点每手' : 'USD per point/contract'} ${p.spec.multiplier} · {cn ? '最小变动' : 'Tick'} {p.spec.tickSize} = ${p.spec.tickValue} <a className="underline" target="_blank" rel="noreferrer" href={p.spec.source}>CME</a></p>}
      {p.automatic && p.calculation && !p.calculationError && <p aria-live="polite">{cn ? '方向调整后的价差' : 'Directional price change'} {p.calculation.priceDifference} × {p.calculation.quantity} {cn ? '手' : 'contracts'} × ${p.calculation.spec.multiplier} = {cn ? '毛盈亏' : 'gross P&L'} ${p.calculation.gross.toFixed(2)}</p>}
      {p.automatic && p.calculationError && <p role="alert" className="text-amber-700 dark:text-amber-300">{p.calculationError}</p>}
      <p>{cn ? '合约计算以 USD 计价，不乘杠杆。适用于相同手数的完整开平仓；部分平仓请拆分记录，券商结单可手动校正。' : 'USD calculation uses the contract multiplier, without multiplying leverage. Split partial exits into matched lots, or use broker-reported P&L.'}</p>
    </div>}
  </div>;
}
