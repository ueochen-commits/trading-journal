import React from 'react';

interface LogoProps {
    className?: string;
    textClassName?: string;
    iconClassName?: string;
    showText?: boolean;
    mode?: 'light' | 'dark' | 'auto'; // Force specific color mode if needed
}

export const Logo: React.FC<LogoProps> = ({ 
    className = "", 
    textClassName = "", 
    iconClassName = "w-10 h-10", // Increased default size slightly
    showText = true,
    mode = 'auto'
}) => {
    // Determine theme-specific classes based on the 'mode' prop
    const textThemeClass = mode === 'dark' ? 'text-white' : mode === 'light' ? 'text-slate-900' : 'text-slate-900 dark:text-white';
    const leftPillarClass = mode === 'dark' ? 'fill-slate-600' : mode === 'light' ? 'fill-slate-400' : 'fill-slate-400 dark:fill-slate-600';
    const rightPillarClass = mode === 'dark' ? 'fill-white' : mode === 'light' ? 'fill-slate-900' : 'fill-slate-900 dark:fill-white';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* 
                Logo Mark: "The Ascending Signal"
                Represents momentum, growth, and structured progress.
                Three pillars rising with sharp aerodynamic tops.
            */}
            <svg 
                viewBox="0 0 44 44" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className={`${iconClassName} shrink-0`}
            >
                {/* Left Pillar - The Foundation (Lighter/Subtle) */}
                <path 
                    d="M4 38H12V24L4 29V38Z" 
                    className={leftPillarClass} 
                />
                
                {/* Middle Pillar - The Process (Brand Color) */}
                <path 
                    d="M16 38H24V14L16 19V38Z" 
                    className="fill-indigo-500" 
                />
                
                {/* Right Pillar - The Peak (Strongest Contrast) */}
                <path 
                    d="M28 38H36V4L28 9V38Z" 
                    className={rightPillarClass} 
                />
            </svg>

            {/* Typography - Mimicking TraderSync: Uppercase, Wide Tracking, Geometric */}
            {showText && (
                <div className={`flex flex-col justify-center ${textClassName}`}>
                    <span className={`text-xl font-bold tracking-[0.2em] uppercase leading-none font-sans ${textThemeClass}`}>
                        TradeGrail
                    </span>
                </div>
            )}
        </div>
    );
};