import React from 'react';
import { motion } from 'motion/react';

export const DynamicOrb = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="relative w-[500px] h-[500px] rounded-full"
      >
        <div className="absolute inset-0 rounded-full bg-[#6E64FF]/20 blur-[80px] animate-pulse" />

        <div className="absolute inset-10 rounded-full bg-gradient-to-br from-[#6E64FF]/40 via-purple-600/30 to-transparent backdrop-blur-sm border border-white/10 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100">
            <defs>
              <radialGradient id="tgSphereGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <linearGradient id="tgTrailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6E64FF" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#tgSphereGrad)" />

            {[...Array(12)].map((_, i) => (
              <motion.ellipse
                key={i}
                cx="50"
                cy="50"
                rx={48}
                ry={15}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
                style={{ rotate: `${i * 15}deg` }}
              />
            ))}

            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#tgTrailGrad)"
              strokeWidth="1"
              strokeDasharray="10 150"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            />
          </svg>

          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-white/10 blur-2xl rounded-full" />
        </div>

        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#6E64FF] rounded-full"
            initial={{
              x: Math.random() * 500,
              y: Math.random() * 500,
              opacity: Math.random(),
            }}
            animate={{
              y: [null, Math.random() * -100, null],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(110,100,255,0.08),transparent_65%)] blur-3xl pointer-events-none" />
    </div>
  );
};
