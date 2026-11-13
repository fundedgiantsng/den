import React from 'react';

export function BullHeroGraphic() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8 overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 candlestick-glow pointer-events-none" />

      {/* Candlestick Matrix in Background (Pure SVG / Code, not flat image) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 600"
      >
        <defs>
          <linearGradient id="candleGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Dynamic rising candlesticks */}
        <line x1="280" y1="180" x2="280" y2="440" stroke="#10B981" strokeWidth="2" opacity="0.6" />
        <rect x="272" y="220" width="16" height="150" fill="url(#candleGrad)" rx="2" />

        <line x1="330" y1="140" x2="330" y2="480" stroke="#10B981" strokeWidth="2" opacity="0.6" />
        <rect x="322" y="190" width="16" height="210" fill="url(#candleGrad)" rx="2" />

        <line x1="380" y1="100" x2="380" y2="520" stroke="#10B981" strokeWidth="2" opacity="0.7" />
        <rect x="372" y="150" width="16" height="260" fill="url(#candleGrad)" rx="2" />

        <line x1="430" y1="80" x2="430" y2="460" stroke="#10B981" strokeWidth="2" opacity="0.8" />
        <rect x="422" y="120" width="16" height="220" fill="url(#candleGrad)" rx="2" />

        <line x1="480" y1="60" x2="480" y2="490" stroke="#10B981" strokeWidth="2" opacity="0.9" />
        <rect x="472" y="90" width="16" height="280" fill="url(#candleGrad)" rx="2" />

        <line x1="530" y1="40" x2="530" y2="430" stroke="#10B981" strokeWidth="2" opacity="1" />
        <rect x="522" y="70" width="16" height="260" fill="url(#candleGrad)" rx="2" />
      </svg>

      {/* Glowing 3D Polygonal Bull Silhouette Container */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-80 h-80 rounded-2xl flex items-center justify-center p-4">
          <svg
            className="w-full h-full text-emerald-400 drop-shadow-[0_0_35px_rgba(16,185,129,0.5)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Polygonal Geometric Bull representation */}
            <path d="M7 21l3-7 4-1 3 8" />
            <path d="M12 3l4 6 5 2-4 4 1 6-6-3-6 3 1-6-4-4 5-2 4-6z" />
            <path d="M9 13l3-2 3 2" />
            <path d="M5 8l-3-4 6 1" />
            <path d="M19 8l3-4-6 1" />
          </svg>
        </div>

        {/* Brand Tagline */}
        <div className="mt-8 text-center">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-1">
            FundedGiants
          </p>
          <h2 className="text-3xl font-heading font-extrabold text-white">
            More Than Capital. <br />
            <span className="text-emerald-400">It's a Platform.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
