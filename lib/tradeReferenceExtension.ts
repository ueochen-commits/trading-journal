import { Node, mergeAttributes } from '@tiptap/core';

export interface TradeReferenceAttrs {
  tradeId: string;
  time: string;
  symbol: string;
  direction: string;
  netPnl: number;
}

const TradeReference = Node.create({
  name: 'tradeReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      tradeId:   { default: null },
      time:      { default: '' },
      symbol:    { default: '' },
      direction: { default: '' },
      netPnl:    { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-trade-ref]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { tradeId, time, symbol, direction, netPnl } = HTMLAttributes;
    const pnlNum = Number(netPnl);
    const pnlColor = pnlNum >= 0 ? '#15803D' : '#DC2626';
    const pnlText = pnlNum >= 0
      ? `+$${pnlNum.toFixed(2)}`
      : `\u2212$${Math.abs(pnlNum).toFixed(2)}`;

    return [
      'span',
      mergeAttributes({
        'data-trade-ref': tradeId,
        style: [
          'display:inline-flex',
          'align-items:center',
          'gap:6px',
          'padding:2px 10px',
          'margin:0 2px',
          'background:#FAFBFC',
          'border:1px solid #E2E8F0',
          'border-radius:6px',
          'font-size:12.5px',
          'vertical-align:middle',
          'white-space:nowrap',
          'cursor:default',
          'font-family:inherit',
        ].join(';'),
      }),
      ['span', { style: 'font-family:monospace;color:#64748B;font-size:11px;' }, time],
      ['span', { style: 'display:inline-block;padding:1px 6px;background:#EEF2FF;color:#4338CA;border-radius:3px;font-size:11px;font-weight:500;' }, symbol],
      ['span', { style: 'color:#0F172A;font-weight:500;font-size:12px;' }, direction],
      ['span', { style: `color:${pnlColor};font-weight:500;font-variant-numeric:tabular-nums;font-size:12px;` }, pnlText],
    ];
  },
});

export default TradeReference;
