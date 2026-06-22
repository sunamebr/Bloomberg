import { useState, useEffect, useRef } from 'react';

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function HeroPanel() {
  const [pnl, setPnl] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const target = 406925;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      setPnl(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const miniCards = [
    { value: '+31,423', label: 'ETH 1.5K · APR' },
    { value: '+29,247', label: 'UP · APR 0' },
    { value: '+28,862', label: 'BTC MOON · JUNE' },
    { value: '+14,276', label: 'ETH X2 4K · APR' },
  ];

  const sparkPoints = "0,45 20,40 40,38 60,35 80,30 100,28 120,22 140,18 160,12 180,8 200,3";
  const areaPath = `M0,45 L20,40 L40,38 L60,35 L80,30 L100,28 L120,22 L140,18 L160,12 L180,8 L200,3 L200,50 L0,50 Z`;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #d8d8d2',
      borderRadius: 10,
      padding: 20,
      display: 'flex',
      gap: 24,
      fontFamily: "'IBM Plex Mono', monospace",
      boxShadow: 'var(--shadow-md)',
      animation: 'fade-in-up 0.4s ease-out both',
    }}>
      <div style={{ flex: '0 0 60%' }}>
        <div style={{ fontSize: 10, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
          CLAUDE FABLE 5 · TOTAL PNL
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{
            fontSize: 9,
            border: '1px solid #d8d8d2',
            borderRadius: 999,
            padding: '2px 8px',
            color: '#8b8b84',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            CRYPTO TAIL SNIPER
          </span>
          <span style={{
            fontSize: 9,
            border: '1px solid #d8d8d2',
            borderRadius: 999,
            padding: '2px 8px',
            color: '#8b8b84',
            textTransform: 'uppercase',
          }}>
            +1 BTC
          </span>
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 6,
            fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(135deg, #181818 0%, #3f8f5f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 8px rgba(63,143,95,0.4))',
          }}
        >
          +{pnl.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#8b8b84', marginBottom: 16 }}>
          REALISED · ANONYMOUS · 5,944 TRADES · 71% WR · SHARPE 4.21
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {miniCards.map((c, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                flex: 1,
                background: 'linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)',
                border: '1px solid #d8d8d2',
                borderRadius: 6,
                padding: '8px 10px',
                transform: hoveredCard === i ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredCard === i ? 'var(--shadow-md)' : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                animation: `fade-in-up 0.4s ease-out ${i * 0.08}s both`,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#3f8f5f', marginBottom: 2, fontVariantNumeric: 'tabular-nums' }}>
                {'↑ '}{c.value}
              </div>
              <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: '0 0 40%', display: 'flex', gap: 0 }}>
        <div style={{ width: 2, background: 'linear-gradient(180deg, #d8d8d2, #3f8f5f, #d8d8d2)', flexShrink: 0, borderRadius: 1 }} />
        <div style={{ paddingLeft: 20, flex: 1 }}>
          <div style={{ fontSize: 10, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            TOP WINS · BTC · POLYMARKET
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#181818', marginBottom: 2, fontVariantNumeric: 'tabular-nums' }}>#0.38</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3f8f5f', marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>+31,423</div>
          <svg viewBox="0 0 200 50" style={{ width: '100%', height: 50, marginBottom: 10 }}>
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3f8f5f" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3f8f5f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sparkGrad)" />
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="#3f8f5f"
              strokeWidth="2"
              className="animate-draw"
            />
          </svg>
          <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>ENTRY 0.42</span>
            <span>EXIT 0.98</span>
            <span>FAVOR 3,629</span>
            <span>PAYOUT 34,452</span>
          </div>
        </div>
      </div>
    </div>
  );
}
