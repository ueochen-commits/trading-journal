import React, { useState, useRef, useCallback } from 'react';
import { Trade } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'upload' | 'parsing' | 'preview' | 'done';

interface ParsedTrade {
  time: string;
  symbol: string;
  direction: string;
  netPnl: number;
}

interface ParseResult {
  total: number;
  duplicates: number;
  netPnl: number;
  winRate: number;
  profitFactor: number;
  dateRange: string;
  exchange: string;
  confidence: number;
  preview: ParsedTrade[];
}

interface Props {
  exchangeName?: string;
  exchangeLogoUrl?: string;
  exchangeBrandColor?: string;
  onBack?: () => void;
  onClose?: () => void;
  onImportComplete?: (trades: Trade[]) => void;
}

// ─── Exchange tutorial data ───────────────────────────────────────────────────

const TUTORIALS: Record<string, { steps: string[]; assets: string[] }> = {
  Binance: {
    assets: ['加密货币', '现货'],
    steps: [
      '登录 Binance 网页版，点击右上角头像',
      '进入「订单」→「交易历史」',
      '选择时间范围（最长 3 个月），点击「导出」',
      '下载 CSV 文件后上传到此处',
    ],
  },
  Bybit: {
    assets: ['加密货币', '合约'],
    steps: [
      '登录 Bybit 网页版',
      '进入「资产」→「衍生品账户」',
      '点击「交易记录」，选择时间范围（最长 2 年）',
      '点击「导出」下载 CSV 文件',
    ],
  },
  OKX: {
    assets: ['加密货币', '合约', '现货'],
    steps: [
      '登录 OKX 网页版，进入「交易」',
      '点击「订单」→「成交明细」',
      '选择时间范围，点击右上角「导出」',
      '下载 CSV 文件后上传到此处',
    ],
  },
  Bitget: {
    assets: ['加密货币', '合约'],
    steps: [
      '登录 Bitget 网页版',
      '进入「订单」→「历史订单」',
      '选择时间范围，点击「导出」',
      '下载 CSV 文件后上传到此处',
    ],
  },
};

const DEFAULT_TUTORIAL = {
  assets: ['加密货币', '股票', '期货', '外汇'],
  steps: [
    '导出你的交易记录为 CSV 或 Excel 格式',
    '确保文件包含：时间、品种、方向、盈亏等字段',
    'AI 会自动识别字段格式，无需手动映射',
    '上传文件后预览确认即可完成导入',
  ],
};

// ─── Timezone options ─────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'Asia/Shanghai', label: 'UTC+8 上海 / 北京' },
  { value: 'Asia/Tokyo', label: 'UTC+9 东京' },
  { value: 'America/New_York', label: 'UTC-5 纽约' },
  { value: 'America/Los_Angeles', label: 'UTC-8 洛杉矶' },
  { value: 'Europe/London', label: 'UTC+0 伦敦' },
  { value: 'Europe/Berlin', label: 'UTC+1 柏林' },
  { value: 'UTC', label: 'UTC+0 协调世界时' },
];

// ─── Checklist steps for parsing ─────────────────────────────────────────────

const PARSE_STEPS = [
  { id: 'read',    label: '文件已读取',              detail: '' },
  { id: 'cols',    label: '识别出数据结构',           detail: '' },
  { id: 'format',  label: 'AI 正在识别交易所格式',    detail: '' },
  { id: 'map',     label: '映射字段到 TradeGrail 结构', detail: '' },
  { id: 'parse',   label: '解析所有交易记录',          detail: '' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

const CheckCircle = ({ size = 18, color = '#16a34a' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill={color} fillOpacity="0.12"/>
    <circle cx="12" cy="12" r="8" fill={color}/>
    <polyline points="8,12 11,15 16,9" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SpinnerCircle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite' }}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="#e0e0f0" strokeWidth="2.5"/>
    <path d="M12 3 A9 9 0 0 1 21 12" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const EmptyCircle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="none" stroke="#d0d0e0" strokeWidth="2"/>
  </svg>
);

const BigCheck = () => (
  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <polyline points="4,12 9,17 20,6" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CsvImportPage: React.FC<Props> = ({
  exchangeName = 'Binance',
  exchangeLogoUrl,
  exchangeBrandColor = '#f5a500',
  onBack,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [tzOpen, setTzOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const [parseProgress, setParseProgress] = useState(0); // 0-4 steps done
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [backHovered, setBackHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tutorial = TUTORIALS[exchangeName] || DEFAULT_TUTORIAL;
  const isCustom = !TUTORIALS[exchangeName];

  // Simulate parsing
  const startParsing = useCallback((f: File) => {
    setStep('parsing');
    setParseProgress(0);
    const delays = [400, 800, 1400, 900, 600];
    let done = 0;
    delays.forEach((d, i) => {
      setTimeout(() => {
        done = i + 1;
        setParseProgress(done);
        if (done === delays.length) {
          setTimeout(() => {
            setParseResult({
              total: 287, duplicates: 12, netPnl: 1284.56,
              winRate: 47.3, profitFactor: 1.84,
              dateRange: '2026.1.3 → 4.18',
              exchange: `${exchangeName} 衍生品`,
              confidence: 94,
              preview: [
                { time: '04-18 22:52', symbol: 'BTCUSDT', direction: '做多', netPnl: 331.04 },
                { time: '04-17 14:23', symbol: 'ETHUSDT', direction: '做空', netPnl: -88.50 },
                { time: '04-16 09:11', symbol: 'SOLUSDT', direction: '做多', netPnl: 142.30 },
                { time: '04-15 18:44', symbol: 'BNBUSDT', direction: '做空', netPnl: 56.20 },
                { time: '04-14 11:02', symbol: 'ONTUSDT', direction: '做多', netPnl: -23.10 },
              ],
            });
            setStep('preview');
          }, 400);
        }
      }, delays.slice(0, i + 1).reduce((a, b) => a + b, 0));
    });
  }, [exchangeName]);

  const handleFile = useCallback((f: File) => {
    const ok = /\.(csv|xlsx|xls|txt)$/i.test(f.name);
    if (!ok) { alert('暂不支持此格式，请上传 CSV 或 Excel'); return; }
    if (f.size > 50 * 1024 * 1024) { alert('文件过大，请分段导出后多次上传'); return; }
    setFile(f);
    startParsing(f);
  }, [startParsing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleConfirmImport = () => setStep('done');

  // ── Shared nav chrome ──────────────────────────────────────────────────────

  const progressFill = step === 'upload' ? 3 : step === 'parsing' ? 3.5 : step === 'preview' ? 4 : 5;

  const navChrome = (showBack = true) => (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .csv-page { animation: fadeUp 0.25s ease-out; }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', zIndex: 100, height: 3 }}>
        <div style={{ flex: progressFill, background: '#5b5bd6', transition: 'flex 0.4s ease' }} />
        <div style={{ flex: 5 - progressFill, background: '#dcd8f0' }} />
      </div>
      {showBack && (
        <button onClick={onBack} onMouseEnter={() => setBackHovered(true)} onMouseLeave={() => setBackHovered(false)}
          style={{ position: 'fixed', top: 28, left: 32, zIndex: 100, background: 'transparent', border: 'none', cursor: 'pointer', color: backHovered ? '#3a3ab8' : '#6b6b9a', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
      )}
      <button onClick={onClose} onMouseEnter={() => setCloseHovered(true)} onMouseLeave={() => setCloseHovered(false)}
        style={{ position: 'fixed', top: 28, right: 32, zIndex: 100, background: 'transparent', border: 'none', cursor: 'pointer', color: closeHovered ? '#3a3ab8' : '#6b6b9a', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </>
  );

  const pageTitle = (kicker: string, title: string) => (
    <div style={{ textAlign: 'center', marginBottom: 36 }}>
      <div style={{ fontSize: 13, color: '#8888b0', fontWeight: 400, letterSpacing: '0.03em', marginBottom: 8 }}>{kicker}</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a3a', margin: 0 }}>{title}</h1>
    </div>
  );

  // ── Step 1: Upload ─────────────────────────────────────────────────────────

  if (step === 'upload') return (
    <div className="csv-page" style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#f5f5ff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', zIndex: 200 }}>
      {navChrome()}
      <div style={{ width: '100%', maxWidth: 900, paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {pageTitle('添加交易', '上传文件')}
        <div style={{ width: '100%', display: 'flex', gap: 24 }}>

          {/* LEFT */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '28px 28px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a3a' }}>上传你的文件</span>
              <span style={{ background: '#ede9fe', color: '#6366f1', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>用时少于 2 分钟</span>
            </div>

            {/* Timezone */}
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6b9a', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>时区</label>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setTzOpen(v => !v)} style={{ width: '100%', height: 44, background: '#fff', border: '1.5px solid #e0e0f0', borderRadius: 10, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 14, color: '#1a1a3a', fontFamily: 'inherit' }}>
                  <span>{TIMEZONES.find(t => t.value === timezone)?.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 15.5a1 1 0 0 1-.7-.3l-5-5a1 1 0 1 1 1.4-1.4l4.3 4.3 4.3-4.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-.7.3Z"/></svg>
                </button>
                {tzOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setTzOpen(false)} />
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e0e0f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                      {TIMEZONES.map(tz => (
                        <button key={tz.value} onClick={() => { setTimezone(tz.value); setTzOpen(false); }}
                          style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: tz.value === timezone ? '#f0f0ff' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13.5, color: tz.value === timezone ? '#5b5bd6' : '#1a1a3a', fontFamily: 'inherit', fontWeight: tz.value === timezone ? 600 : 400 }}>
                          {tz.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p style={{ fontSize: 11.5, color: '#9396aa', marginTop: 6, lineHeight: 1.5 }}>请选择数据文件的时区。想在应用中以其他时区查看数据请到设置修改</p>
            </div>

            {/* Drop zone */}
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ marginTop: 18, border: `2px dashed ${dragOver ? '#6366f1' : '#d0d0e8'}`, borderRadius: 14, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', background: dragOver ? '#f0f0ff' : '#fafaff', transition: 'all 0.15s' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a3a', margin: '0 0 4px' }}>拖拽文件到此处或点击选择</p>
                <p style={{ fontSize: 12, color: '#9396aa', margin: 0 }}>支持 CSV、Excel（.xlsx/.xls）、TXT 格式</p>
              </div>
              <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{ marginTop: 4, height: 36, padding: '0 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                选择文件
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* RIGHT */}
          <div style={{ width: 360, flexShrink: 0, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Exchange header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: exchangeBrandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {exchangeLogoUrl ? <img src={exchangeLogoUrl} alt={exchangeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{exchangeName[0]}</span>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a3a' }}>{exchangeName}</span>
            </div>

            {/* Supported assets */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9396aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>支持的资产类型</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tutorial.assets.map(a => (
                  <span key={a} style={{ padding: '3px 10px', borderRadius: 20, background: '#ede9fe', color: '#5b5bd6', fontSize: 12, fontWeight: 500 }}>{a}</span>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: '#f0f0f8' }} />

            {/* Tutorial */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a3a', margin: 0 }}>
                  {isCustom ? 'AI 智能解析任何格式' : `如何从 ${exchangeName} 导出`}
                </p>
                <button style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>详细指引</button>
              </div>
              {(tutorialExpanded ? tutorial.steps : tutorial.steps.slice(0, 4)).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 13, color: '#3a3a5a', margin: 0, lineHeight: 1.55 }}>{s}</p>
                </div>
              ))}
              {tutorial.steps.length > 4 && (
                <button onClick={() => setTutorialExpanded(v => !v)} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                  {tutorialExpanded ? '收起 ▴' : '展开完整指令 ▾'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Parsing ────────────────────────────────────────────────────────

  if (step === 'parsing') return (
    <div className="csv-page" style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#f5f5ff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', zIndex: 200 }}>
      {navChrome(false)}
      <div style={{ width: '100%', maxWidth: 900, paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {pageTitle('添加交易', 'AI 解析中')}
        <div style={{ width: '100%', display: 'flex', gap: 24 }}>
          {/* LEFT */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '28px 28px 24px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a3a', marginBottom: 16 }}>正在处理你的文件</p>
            <div style={{ background: '#f8f8fc', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a3a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name || 'trades.csv'}</p>
                <p style={{ fontSize: 12, color: '#9396aa', margin: 0 }}>{file ? `${(file.size / 1024).toFixed(1)} KB` : '—'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PARSE_STEPS.map((s, i) => {
                const done = i < parseProgress;
                const active = i === parseProgress;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {done ? <CheckCircle size={20} /> : active ? <SpinnerCircle size={20} /> : <EmptyCircle size={20} />}
                    <span style={{ fontSize: 13.5, color: done ? '#1a1a3a' : active ? '#6366f1' : '#b0b0c8', fontWeight: done || active ? 500 : 400 }}>{s.label}</span>
                    {done && i === 1 && <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#9396aa', fontVariantNumeric: 'tabular-nums' }}>287 行</span>}
                    {done && i === 0 && file && <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#9396aa', fontVariantNumeric: 'tabular-nums' }}>{(file.size / 1024).toFixed(1)} KB</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 24, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#92400e', lineHeight: 1.5 }}>
              通常需要 3–8 秒，你可以切换到其他页面，解析完成后会通知你
            </div>
          </div>
          {/* RIGHT */}
          <div style={{ width: 360, flexShrink: 0, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/lion-care.png" alt="TradeGrail" style={{ width: 36, height: 36, objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a3a' }}>TradeGrail AI</span>
            </div>
            <p style={{ fontSize: 13, color: '#5a5a7a', lineHeight: 1.65, margin: 0 }}>AI 不是简单做字段映射，而是逐行理解你的数据：识别日期时间格式、判断方向字段的表达方式、计算手续费扣除前后的盈亏差异、处理重复开平仓的合并。</p>
            <div style={{ height: 1, background: '#f0f0f8' }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9396aa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>正在理解什么</p>
            {[
              ['时间格式', '识别 2026-04-15 05:40:58、2026/4/15 5:40 等多种写法'],
              ['方向字段', 'Buy / Sell / 做多 / 做空 / Long / Short'],
              ['盈亏计算', '是否已扣除手续费、是否已计算资金费率'],
              ['开平仓合并', '自动配对同一笔交易的开仓和平仓记录'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 6 }} />
                <div><span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a3a' }}>{title}：</span><span style={{ fontSize: 13, color: '#5a5a7a' }}>{desc}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Preview ────────────────────────────────────────────────────────

  if (step === 'preview' && parseResult) return (
    <div className="csv-page" style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#f5f5ff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', zIndex: 200 }}>
      {navChrome()}
      <div style={{ width: '100%', maxWidth: 900, paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {pageTitle('添加交易', '预览并确认')}
        <div style={{ width: '100%', display: 'flex', gap: 24 }}>
          {/* LEFT */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a3a' }}>导入摘要</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                已识别：{parseResult.exchange}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '总交易数', value: String(parseResult.total), color: '#0F172A' },
                { label: '累计净盈亏', value: `+$${parseResult.netPnl.toFixed(2)}`, color: '#15803d' },
                { label: '时间范围', value: parseResult.dateRange, color: '#0F172A' },
                { label: '重复将跳过', value: `${parseResult.duplicates} 笔`, color: '#0F172A' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: '#f8f8fc', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11.5, color: '#9396aa', margin: '0 0 6px', fontWeight: 500 }}>{kpi.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: kpi.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#92400e', lineHeight: 1.5 }}>
              检测到 {parseResult.duplicates} 笔交易可能与已有记录重复（基于时间 + 品种 + 数量），导入时将自动跳过
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onBack} style={{ flex: 1, height: 44, background: '#fff', border: '1.5px solid #e0e0f0', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#6b6b9a', cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
              <button onClick={handleConfirmImport} style={{ flex: 2, height: 44, background: '#6366f1', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>确认导入 {parseResult.total} 笔</button>
            </div>
          </div>
          {/* RIGHT */}
          <div style={{ width: 360, flexShrink: 0, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a3a' }}>前 5 笔预览</span>
              <span style={{ fontSize: 11.5, color: '#9396aa' }}>下滑查看完整 {parseResult.total} 笔</span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f8' }}>
                    {['时间', '品种', '方向', '净盈亏'].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9396aa', textAlign: 'left', padding: '0 8px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.preview.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8f8fc' }}>
                      <td style={{ padding: '10px 8px', fontSize: 12, color: '#6b6b9a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{t.time}</td>
                      <td style={{ padding: '10px 8px' }}><span style={{ background: '#ede9fe', color: '#5b5bd6', fontSize: 11.5, fontWeight: 500, padding: '2px 7px', borderRadius: 4 }}>{t.symbol}</span></td>
                      <td style={{ padding: '10px 8px', fontSize: 13, color: '#1a1a3a', fontWeight: 500 }}>{t.direction}</td>
                      <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: t.netPnl >= 0 ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{t.netPnl >= 0 ? '+' : ''}${t.netPnl.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11.5, color: '#9396aa', lineHeight: 1.55, margin: 0 }}>如果数据看起来不对（比如方向识别错误、盈亏数字异常），请点击取消并重新检查源文件</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 4: Done ───────────────────────────────────────────────────────────

  const imported = parseResult ? parseResult.total - parseResult.duplicates : 275;
  const skipped = parseResult?.duplicates ?? 12;

  return (
    <div className="csv-page" style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#f5f5ff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', zIndex: 200 }}>
      {navChrome(false)}
      <div style={{ width: '100%', maxWidth: 900, paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><BigCheck /></div>
          <div style={{ fontSize: 56, fontWeight: 600, color: '#1a1a3a', letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>{imported}</div>
          <p style={{ fontSize: 15, color: '#6b6b9a', margin: 0 }}>笔交易已加入你的交易日志 · {skipped} 笔重复已跳过</p>
        </div>
        <div style={{ width: '100%', display: 'flex', gap: 24 }}>
          {/* LEFT */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e8e8f0', padding: '24px 24px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9396aa', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>导入摘要</p>
            {[
              ['数据来源', parseResult?.exchange ?? `${exchangeName} 衍生品`],
              ['时间范围', parseResult?.dateRange ?? '—'],
              ['累计净盈亏', `+$${parseResult?.netPnl.toFixed(2) ?? '—'}`],
              ['胜率', `${parseResult?.winRate.toFixed(1) ?? '—'}%`],
              ['盈利因子', `${parseResult?.profitFactor.toFixed(2) ?? '—'}`],
            ].map(([label, val], i) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < 4 ? '1px solid #f4f4f8' : 'none' }}>
                <span style={{ fontSize: 13, color: '#9396aa' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: label === '累计净盈亏' ? '#15803d' : '#1a1a3a', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
              </div>
            ))}
          </div>
          {/* RIGHT */}
          <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9396aa', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>下一步推荐</p>
            {[
              { icon: '📅', title: '查看交易日历', desc: '在日历视图看每天的盈亏分布' },
              { icon: '📝', title: '写一份本月复盘', desc: '基于导入的数据记录交易心得' },
              { icon: '🏷️', title: '给交易打策略标签', desc: `${imported} 笔交易还没有策略标签` },
            ].map(card => (
              <div key={card.title} style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#a5b4fc'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e8e8f0'; }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{card.icon}</div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a3a', margin: '0 0 2px' }}>{card.title}</p>
                  <p style={{ fontSize: 12, color: '#9396aa', margin: 0 }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button onClick={onBack} style={{ height: 44, padding: '0 24px', background: '#fff', border: '1.5px solid #e0e0f0', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#6b6b9a', cursor: 'pointer', fontFamily: 'inherit' }}>继续导入</button>
          <button onClick={onClose} style={{ height: 44, padding: '0 28px', background: '#6366f1', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>查看完整报表 →</button>
        </div>
      </div>
    </div>
  );
};

export default CsvImportPage;
