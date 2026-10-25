import React from 'react';
import { Info } from 'lucide-react';
import type { RiskSettings } from '../../types';

interface Props {
  settings?: RiskSettings;
  language: string;
  currencySymbol?: string;
  onViewRules?: () => void;
}

const RiskReferenceNotice: React.FC<Props> = ({ settings, language, currencySymbol = '$', onViewRules }) => {
  const cn = language === 'cn';
  const values = [
    settings?.maxTradeRisk > 0 ? (cn ? `单笔风险 ${currencySymbol}${settings.maxTradeRisk}` : `Risk per trade ${currencySymbol}${settings.maxTradeRisk}`) : '',
    settings?.maxDailyLoss > 0 ? (cn ? `日亏损 ${currencySymbol}${settings.maxDailyLoss}` : `Daily loss ${currencySymbol}${settings.maxDailyLoss}`) : '',
    settings?.maxConsecutiveLosses > 0 ? (cn ? `连续亏损 ${settings.maxConsecutiveLosses} 笔` : `${settings.maxConsecutiveLosses} consecutive losses`) : '',
  ].filter(Boolean);
  return (
    <div className="tg-module rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-[var(--tg-border)] dark:bg-slate-800/40 dark:text-slate-400">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><Info size={14} className="shrink-0" />{cn ? '风控仅作提醒，不限制交易记录' : 'Risk reminders do not block your journal'}</p>
        {onViewRules && <button type="button" onClick={onViewRules} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{cn ? '查看心态风控 →' : 'View risk rules →'}</button>}
      </div>
      <p className="mt-1">{cn ? '可以正常添加、补录和编辑交易。参考规则来自「心态风控」' : 'You can add, backfill and edit trades. References come from Risk & Psychology'}{values.length ? `${cn ? '：' : ': '}${values.join(' · ')}` : (cn ? '。' : '.')}</p>
    </div>
  );
};
export default RiskReferenceNotice;
