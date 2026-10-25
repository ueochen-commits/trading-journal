import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props { images: string[]; index: number; language: string; onClose: () => void; embedded?: boolean }

export default function ScreenshotViewer({ images, index, language, onClose, embedded = false }: Props) {
  const cn = language === 'cn';
  const [current, setCurrent] = useState(Math.min(index, images.length - 1));
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dialog = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; distance: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const zoom = (change: number) => setScale(value => Math.min(5, Math.max(1, value + change)));
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };
  useEffect(() => { reset(); pointers.current.clear(); last.current = null; }, [current]);
  useEffect(() => { if (scale === 1) setOffset({ x: 0, y: 0 }); }, [scale]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (!embedded) document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      // A docked image must never take keys/focus away from the chart or notes.
      if (embedded && !dialog.current?.contains(event.target as Node)) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key === 'ArrowLeft') setCurrent(value => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setCurrent(value => Math.min(images.length - 1, value + 1));
      if (!embedded && event.key === 'Tab') {
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        if (!buttons.length) return;
        if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === dialog.current)) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (!event.shiftKey && (document.activeElement === buttons[buttons.length - 1] || document.activeElement === dialog.current)) { event.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener('keydown', keydown, true);
    const element = stage.current;
    const wheel = (event: WheelEvent) => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.25 : -0.25); };
    element?.addEventListener('wheel', wheel, { passive: false });
    return () => {
      if (!embedded) document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown, true);
      element?.removeEventListener('wheel', wheel);
      if (!embedded || dialog.current?.contains(document.activeElement)) previousFocus?.isConnected && previousFocus.focus();
    };
  }, [images.length, embedded]);
  const pointerState = () => {
    const points = [...pointers.current.values()];
    const first = points[0];
    if (!first) return null;
    const second = points[1] || first;
    return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2, distance: Math.hypot(first.x - second.x, first.y - second.y) };
  };
  const button = 'rounded-lg p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400';
  if (!images.length) return null;
  const content = (
    <div ref={dialog} role={embedded ? 'region' : 'dialog'} aria-modal={embedded ? undefined : true} aria-label={cn ? '截图查看器' : 'Screenshot viewer'} tabIndex={-1}
      className={`${embedded ? 'relative h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-700' : 'fixed inset-0 z-[13000]'} flex flex-col bg-slate-950/95 text-white outline-none`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-3 py-3 sm:px-6">
        <span className="text-sm">{cn ? '截图' : 'Screenshot'} {current + 1} / {images.length}</span>
        <div className="flex items-center gap-1">
          <button type="button" className={button} aria-label={cn ? '缩小截图' : 'Zoom out'} disabled={scale <= 1} onClick={() => zoom(-0.5)}><ZoomOut size={20} /></button>
          <span className="w-12 text-center text-xs" aria-live="polite">{Math.round(scale * 100)}%</span>
          <button type="button" className={button} aria-label={cn ? '放大截图' : 'Zoom in'} disabled={scale >= 5} onClick={() => zoom(0.5)}><ZoomIn size={20} /></button>
          <button type="button" className={button} aria-label={cn ? '重置截图大小' : 'Reset zoom'} onClick={reset}><RotateCcw size={20} /></button>
          <button type="button" className={button} aria-label={cn ? '关闭截图查看器' : 'Close screenshot viewer'} onClick={onClose}><X size={22} /></button>
        </div>
      </div>
      <div ref={stage} className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden p-4"
        onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); last.current = pointerState(); }}
        onPointerMove={event => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const next = pointerState(), previous = last.current;
          if (next && previous) {
            if (next.distance && previous.distance) setScale(value => Math.min(5, Math.max(1, value * next.distance / previous.distance)));
            if (scale > 1) setOffset(value => ({ x: value.x + next.x - previous.x, y: value.y + next.y - previous.y }));
          }
          last.current = next;
        }}
        onPointerUp={event => { pointers.current.delete(event.pointerId); last.current = pointerState(); }}
        onPointerCancel={event => { pointers.current.delete(event.pointerId); last.current = pointerState(); }}>
        <img src={images[current]} alt={`${cn ? '交易截图' : 'Trade screenshot'} ${current + 1}`} draggable={false}
          className="max-h-full max-w-full object-contain" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'zoom-in' }} />
      </div>
      <div className="flex shrink-0 items-center justify-center gap-5 border-t border-slate-700 px-4 py-3">
        <button type="button" className={button} disabled={current === 0} aria-label={cn ? '上一张截图' : 'Previous screenshot'} onClick={() => setCurrent(value => value - 1)}><ChevronLeft size={24} /></button>
        <span className="text-center text-xs text-slate-400">{cn ? '滚轮或双指缩放 · 放大后拖动查看' : 'Scroll or pinch to zoom · Drag to pan'}</span>
        <button type="button" className={button} disabled={current === images.length - 1} aria-label={cn ? '下一张截图' : 'Next screenshot'} onClick={() => setCurrent(value => value + 1)}><ChevronRight size={24} /></button>
      </div>
    </div>
  );
  return embedded ? content : createPortal(content, document.body);
}
