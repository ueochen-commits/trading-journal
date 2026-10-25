import React, { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { UserTier } from '../UserContext';
import { screenshotLimit } from '../../utils/tradeScreenshots';

const compress = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Invalid image'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) { reject(new Error('Image processing unavailable')); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

interface Props {
  images: string[];
  tier: UserTier;
  language: string;
  onChange: (images: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}

const TradeScreenshotPicker: React.FC<Props> = ({ images, tier, language, onChange, onBusyChange }) => {
  const current = useRef(images);
  current.current = images;
  const pending = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; onBusyChange(false); };
  }, [onBusyChange]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const limit = screenshotLimit(tier);
  const cn = language === 'cn';
  const full = images.length >= limit;
  const limitMessage = cn ? '免费账户每笔交易最多上传 2 张截图，可删除后重新上传。' : 'Free accounts allow 2 screenshots per trade. Remove one to upload another.';

  const change = (next: string[]) => { current.current = next; onChange(next); };
  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    pending.current += 1; setBusy(true); onBusyChange(true); setError('');
    try {
      for (const file of files) {
        if (!alive.current) break;
        if (!file.type.startsWith('image/')) continue;
        if (current.current.length >= limit) { setError(limitMessage); break; }
        const image = await compress(file);
        if (!alive.current) break;
        // Recheck after processing: another paste/upload may have finished first.
        if (current.current.length >= limit) { setError(limitMessage); break; }
        change([...current.current, image]);
      }
    } catch { setError(cn ? '图片处理失败，请重试。' : 'Could not process the image. Please retry.'); }
    finally {
      pending.current -= 1;
      if (!pending.current && alive.current) { setBusy(false); onBusyChange(false); }
    }
  };

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items || []).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => Boolean(file));
      if (files.length) { event.preventDefault(); void addFiles(files); }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [tier, language, onChange]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5" aria-label={cn ? '交易截图' : 'Trade screenshots'}>
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>{cn ? '截图' : 'Screenshots'} {images.length}{Number.isFinite(limit) ? ` / ${limit}` : ''}</span>
        {tier === 'free' && <span>{cn ? '每笔最多 2 张' : '2 per trade'}</span>}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto">
        {images.map((image, index) => (
          <div key={`${index}-${image.slice(-24)}`} className="relative min-h-[64px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <img src={image} alt={`${cn ? '截图' : 'Screenshot'} ${index + 1}`} className="h-full max-h-[96px] w-full object-cover" />
            <button type="button" aria-label={`${cn ? '删除截图' : 'Remove screenshot'} ${index + 1}`} disabled={busy} onClick={() => change(current.current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-white hover:bg-rose-600 disabled:opacity-50"><X size={12} /></button>
          </div>
        ))}
        {!full && <label className={`flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 ${images.length === 0 ? 'col-span-2' : ''}`}>
          <Upload size={18} /><span className="mt-1 text-[10px]">{busy ? (cn ? '处理中…' : 'Processing…') : (cn ? '上传 / 粘贴截图' : 'Upload / paste')}</span>
          <input type="file" aria-label={cn ? '上传交易截图' : 'Upload trade screenshots'} accept="image/*" multiple disabled={busy} className="hidden" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void addFiles(files); }} />
        </label>}
      </div>
      {error && <p role="alert" className="text-[10px] leading-snug text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
};
export default TradeScreenshotPicker;
