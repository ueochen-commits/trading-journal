import React, { useEffect, useState, useRef } from 'react';
import { useTour } from './TourContext';
import { useLanguage } from '../LanguageContext';
import { X, ChevronRight, ChevronLeft, Flag } from 'lucide-react';

const TourOverlay = () => {
    const { isTourOpen, currentStep, nextStep, prevStep, closeTour, currentStepIndex, totalSteps } = useTour();
    const { t } = useLanguage();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const updateTimeout = useRef<any>(null);

    // Track window resize and step changes to update position
    useEffect(() => {
        // Reset rect immediately on step change so stale highlight doesn't linger
        setTargetRect(null);

        const updatePosition = () => {
            if (isTourOpen && currentStep) {
                const el = document.getElementById(currentStep.targetId);
                if (el) {
                    setTargetRect(el.getBoundingClientRect());
                } else {
                    // Element not in DOM yet (modal animating in) — retry a few times
                    let attempts = 0;
                    const retry = setInterval(() => {
                        attempts++;
                        const retryEl = document.getElementById(currentStep.targetId);
                        if (retryEl) {
                            setTargetRect(retryEl.getBoundingClientRect());
                            clearInterval(retry);
                        } else if (attempts >= 6) {
                            // Give up — no highlight for this step
                            setTargetRect(null);
                            clearInterval(retry);
                        }
                    }, 200);
                }
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        // Polling ensuring position stays correct during animations
        const interval = setInterval(updatePosition, 1000);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            clearInterval(interval);
        };
    }, [isTourOpen, currentStep, currentStepIndex]);

    if (!isTourOpen || !currentStep) return null;

    // Helper to get translation safely (since keys are dynamic strings)
    const getTourText = (key: string) => {
        // @ts-ignore
        return t.tour[key] || key;
    };

    // Calculate Tooltip Position
    const getTooltipStyle = () => {
        if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const gap = 12;
        const width = 320; // approximate width of card
        
        let top = 0;
        let left = 0;

        switch (currentStep.position) {
            case 'right':
                top = targetRect.top;
                left = targetRect.right + gap;
                break;
            case 'left':
                top = targetRect.top;
                left = targetRect.left - width - gap;
                break;
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left;
                break;
            case 'top':
                top = targetRect.top - 200 - gap; // rough height
                left = targetRect.left;
                break;
            case 'center':
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        // Boundary checks to keep inside viewport
        if (left < 10) left = 10;
        if (left + width > window.innerWidth) left = window.innerWidth - width - 10;
        if (top < 10) top = 10;
        if (top + 200 > window.innerHeight) top = window.innerHeight - 250;

        return { top, left, width: `${width}px` };
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
            {/* Dark overlay with a transparent cutout over the target element */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
            >
                <defs>
                    <mask id="tour-spotlight-mask">
                        {/* White = visible (dark overlay shows), Black = hidden (cutout) */}
                        <rect width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - 6}
                                y={targetRect.top - 6}
                                width={targetRect.width + 12}
                                height={targetRect.height + 12}
                                rx="10"
                                ry="10"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(15,23,42,0.78)"
                    mask="url(#tour-spotlight-mask)"
                />
            </svg>

            {/* Highlight border around target */}
            {targetRect && (
                <div
                    className="absolute rounded-xl border-2 border-indigo-400 shadow-[0_0_0_4px_rgba(99,102,241,0.25)] transition-all duration-300 ease-in-out"
                    style={{
                        top: targetRect.top - 6,
                        left: targetRect.left - 6,
                        width: targetRect.width + 12,
                        height: targetRect.height + 12,
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* Tooltip Card — needs pointer events */}
            <div
                className="absolute bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out flex flex-col gap-3"
                style={{ ...getTooltipStyle(), pointerEvents: 'auto', maxWidth: 340 }}
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {currentStepIndex + 1} / {totalSteps}
                        </span>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {getTourText(currentStep.titleKey)}
                        </h3>
                    </div>
                    <button onClick={closeTour} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {getTourText(currentStep.contentKey)}
                </p>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={closeTour}
                        className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        {getTourText('skip')}
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevStep}
                            disabled={currentStepIndex === 0}
                            className="text-sm text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" /> {getTourText('back')}
                        </button>
                        <button
                            onClick={nextStep}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        >
                            {currentStepIndex === totalSteps - 1 ? getTourText('finish') : getTourText('next')} <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TourOverlay;