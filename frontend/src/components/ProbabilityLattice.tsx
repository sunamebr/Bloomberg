import { useMemo, useState, useEffect } from 'react';

export default function ProbabilityLattice() {
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProgressWidth(74.8), 50);
    return () => clearTimeout(t);
  }, []);

  const metrics = [
    ['BALLS DROPPED', '323'],
    ['LADDER GREEN', '74.8%'],
    ['EV / TRADE', '+$72'],
    ['SESSION PNL', '+$23,275'],
    ['ALL-TIME', '5,944'],
    ['REALIZED', '+$401,819'],
  ];

  const dots = useMemo(() => {
    const seed = [
      45, 120, 180, 90, 220, 310, 150, 270, 60, 340,
      100, 200, 250, 170, 290, 380, 130, 50, 360, 240,
      75, 195, 305, 140, 260, 350, 110, 215, 330, 85,
      160, 280, 370, 125, 235, 320, 95, 205, 355, 145,
      55, 175, 265, 345, 105, 225, 315, 70, 190, 295,
      385, 135, 245, 335, 65, 185, 275, 365, 115, 210,
      300, 80, 170, 255, 340, 155, 230, 325, 45, 195,
      285, 375, 120, 205, 295, 385,
    ];
    const pts: { cx: number; cy: number; r: number; fill: string; weight: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const raw = seed[i % seed.length] % 380 + 10;
      const pull = 0.35;
      const cx = raw + (200 - raw) * pull;
      const cy = (seed[(i + 13) % seed.length] % 200) + 15;
      const weight = 0.3 + (seed[(i + 7) % seed.length] % 70) / 100;
      const r = 1.5 + weight * 2.5;
      const fill = i % 5 === 0 ? 'url(#dotGradMuted)' : 'url(#dotGrad)';
      pts.push({ cx, cy, r, fill, weight });
    }
    return pts;
  }, []);

  const histBars = [
    { x: 60, h: 30 },
    { x: 100, h: 55 },
    { x: 140, h: 80 },
    { x: 180, h: 95 },
    { x: 220, h: 70 },
    { x: 260, h: 45 },
    { x: 300, h: 25 },
  ];

  const profitPoints = "5,10 20,15 35,22 50,30 65,38 80,45 95,52";
  const areaPath = `M5,10 L20,15 L35,22 L50,30 L65,38 L80,45 L95,52 L95,60 L5,60 Z`;

  return (
    <div className="fade-in-up" style={{
      background: '#ffffff',
      border: '1px solid #d8d8d2',
      borderRadius: 10,
      padding: 20,
      fontFamily: "'IBM Plex Mono', monospace",
      boxShadow: 'var(--shadow-md)',
      animation: 'fade-in-up 0.4s ease-out both',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#181818', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
        Probability Lattice · 5,944 Trades, One Board
      </div>
      <div style={{ fontSize: 9, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        LIVE CONVERGENCE · QUANTILE · GATES · EDGE TILTS
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: '0 0 18%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {metrics.map(([label, value], i) => (
            <div key={i} style={{ animation: `fade-in-up 0.4s ease-out ${i * 0.06}s both` }}>
              <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#181818', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <svg viewBox="0 0 400 250" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3f8f5f" />
                <stop offset="100%" stopColor="#2d6b47" />
              </linearGradient>
              <radialGradient id="dotGrad">
                <stop offset="0%" stopColor="#333" />
                <stop offset="100%" stopColor="#111" />
              </radialGradient>
              <radialGradient id="dotGradMuted">
                <stop offset="0%" stopColor="#ddd" />
                <stop offset="100%" stopColor="#aaa" />
              </radialGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(185,47,74,0.2)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            {histBars.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={250 - b.h}
                width={30}
                height={b.h}
                fill="url(#barGrad)"
                opacity={hoveredBar === i ? 0.9 : 0.6}
                className="animate-grow"
                style={{ animationDelay: `${i * 0.06}s`, transformOrigin: 'bottom', transition: 'opacity 0.15s ease' }}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
              />
            ))}
            <line
              x1={200} y1={10} x2={200} y2={240}
              stroke="#8b8b84" strokeWidth={1} strokeDasharray="4"
              style={{ animation: 'count-glow 3s ease-in-out infinite' }}
            />
            {dots.map((d, i) => (
              <circle
                key={i}
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                fill={d.fill}
                style={{
                  animation: `fade-in-up 0.3s ease-out ${i * 0.015}s both`,
                  cursor: 'pointer',
                  transform: hoveredDot === i ? 'scale(1.5)' : 'scale(1)',
                  transformOrigin: `${d.cx}px ${d.cy}px`,
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={() => setHoveredDot(i)}
                onMouseLeave={() => setHoveredDot(null)}
              >
                <title>Value: {Math.round(d.cx)}</title>
              </circle>
            ))}
            <text x={350} y={20} fontSize={8} fill="#8b8b84" textAnchor="end" fontFamily="'IBM Plex Mono', monospace">WINRATE</text>
          </svg>
        </div>

        <div style={{ flex: '0 0 18%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <svg viewBox="0 0 100 60" style={{ width: '100%', height: 60 }}>
            <defs>
              <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(185,47,74,0.2)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#profitAreaGrad)" />
            <polyline
              points={profitPoints}
              fill="none"
              stroke="#b92f4a"
              strokeWidth="2"
              className="animate-draw"
            />
          </svg>
          <div style={{ fontSize: 9, color: '#8b8b84', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>PROFIT · 70%</div>
          <div style={{ marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: '#d8d8d2', overflow: 'hidden' }}>
              <div style={{
                width: `${progressWidth}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #5aaf7a, #3f8f5f)',
                borderRadius: 3,
                boxShadow: '0 0 8px rgba(63,143,95,0.3)',
                transition: 'width 1s ease-out',
              }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#181818', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>74.8%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
