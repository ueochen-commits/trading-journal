import React from 'react';

interface WelcomeHeaderProps {
    title: string;
    subtitle: string;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ title, subtitle }) => (
    <div style={{
        background: 'linear-gradient(135deg, #0e1428 0%, #1a1040 100%)',
        padding: '28px 32px 52px', textAlign: 'center', position: 'relative',
        borderRadius: '20px 20px 0 0',
    }}>
        <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 300, height: 200,
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
        }} />
        <h2 style={{
            fontSize: 22, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.3px', marginBottom: 6, position: 'relative', zIndex: 1,
        }}>
            {title}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1, margin: 0 }}>
            {subtitle}
        </p>
        {/* Floating logo — bottom: -34 = half of 68px logo */}
        <div style={{
            position: 'absolute', bottom: -34, left: '50%', transform: 'translateX(-50%)',
            width: 68, height: 68, borderRadius: '50%', background: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, border: '3px solid rgba(255,255,255,0.9)',
        }}>
            <img src="/lion-logo.png" alt="TradeGrail" style={{ width: 46, height: 46, objectFit: 'contain', display: 'block' }} />
        </div>
    </div>
);

export default WelcomeHeader;
