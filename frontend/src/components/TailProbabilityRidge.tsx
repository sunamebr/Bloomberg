import { useState, useMemo } from 'react';

export default function TailProbabilityRidge() {
  const [hoveredRidge, setHoveredRidge] = useState<number | null>(null);

  const metrics = [
    ['SESSIONS', '1,293'],
    ['TAIL MASS', '0.21%'],
    ['IMPLIED MULT', 'x476.2'],
    ['AVG ENTRY', '1.2¢'],
    ['BEST NET', '+$81.2'],
    ['ALL-TIME', '5,944'],
    ['REALIZED', '+$401,819'],
  ];

  const NUM_RIDGES = 9;
  const W = 400;
  const H = 260;
  const MARGIN = { top: 20, bottom: 20, left: 10, right: 10 };
  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;
  const ridgeSpacing = plotH / (NUM_RIDGES - 1);
  const ridgeHeight = ridgeSpacing * 1.8;

  const ridges = useMemo(() => {
    const result: { path: string; fillPath: string; peakX: number; peakY: number; label: string; strike: string }[] = [];

    for (let i = 0; i < NUM_RIDGES; i++) {
      const baseY = MARGIN.top + i * ridgeSpacing;
      const phaseShift = i * 12;
      const skew = (i - NUM_RIDGES / 2) * 8;
      const amplitude = 0.7 + Math.sin(i * 0.8) * 0.3;
      const spread = 55 + Math.abs(i - 4) * 8;

      const points: { x: number; y: number }[] = [];
      const numPoints = 80;

      for (let j = 0; j <= numPoints; j++) {
        const t = j / numPoints;
        const x = MARGIN.left + t * plotW;
        const center = MARGIN.left + plotW * 0.45 + skew + phaseShift * 0.3;
        const dx = (x - center) / spread;
        const gaussian = Math.exp(-0.5 * dx * dx) * ridgeHeight * amplitude;
        const secondary = Math.exp(-0.5 * Math.pow((x - (center + 60)) / (spread * 0.5), 2)) * ridgeHeight * 0.25 * (1 - i / NUM_RIDGES);
        const y = baseY - gaussian - secondary;
        points.push({ x, y });
      }

      let path = `M ${points[0].x},${points[0].y}`;
      for (let j = 1; j < points.length - 1; j++) {
        const xc = (points[j].x + points[j + 1].x) / 2;
        const yc = (points[j].y + points[j + 1].y) / 2;
        path += ` Q ${points[j].x},${points[j].y} ${xc},${yc}`;
      }
      path += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;

      const fillPath = path + ` L ${MARGIN.left + plotW},${baseY} L ${MARGIN.left},${baseY} Z`;

      let peakX = MARGIN.left + plotW * 0.45 + skew + phaseShift * 0.3;
      let peakY = baseY - ridgeHeight * amplitude;
      for (const p of points) {
        if (p.y < peakY) {
          peakY = p.y;
          peakX = p.x;
        }
      }

      const strikeVal = (0.02 + i * 0.015).toFixed(3);
      const labels = ['T-8σ', 'T-7σ', 'T-6σ', 'T-5σ', 'T-4σ', 'T-3σ', 'T-2σ', 'T-1σ', 'T₀'];

      result.push({
        path,
        fillPath,
        peakX,
        peakY,
        label: labels[i],
        strike: strikeVal,
      });
    }
    return result;
  }, []);

  const tailZoneX = MARGIN.left + plotW * 0.72;

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
        Tail Probability Ridge · Strike Landscape
      </div>
      <div style={{ fontSize: 9, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        TAIL SCANNER · WAVE PROPAGATION · LIVE
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

        <div style={{ flex: 1, position: 'relative' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
              <linearGradient id="tailZoneGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#b92f4a" stopOpacity={0} />
                <stop offset="30%" stopColor="#b92f4a" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#b92f4a" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="ridgeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#181818" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#181818" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ridgeFillHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3f8f5f" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3f8f5f" stopOpacity={0.03} />
              </linearGradient>
              <clipPath id="plotArea">
                <rect x={MARGIN.left} y={MARGIN.top - 10} width={plotW} height={plotH + 20} />
              </clipPath>
            </defs>

            <rect x={tailZoneX} y={MARGIN.top - 10} width={MARGIN.left + plotW - tailZoneX} height={plotH + 20} fill="url(#tailZoneGrad)" />

            {[0, 1, 2, 3, 4].map(i => {
              const x = MARGIN.left + (plotW / 4) * i;
              return <line key={`v${i}`} x1={x} y1={MARGIN.top} x2={x} y2={MARGIN.top + plotH} stroke="#e8e8e4" strokeWidth={0.5} strokeDasharray="2,4" />;
            })}

            <g clipPath="url(#plotArea)">
              {ridges.map((ridge, i) => {
                const isHovered = hoveredRidge === i;
                const animDelay = i * 0.08;
                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredRidge(i)}
                    onMouseLeave={() => setHoveredRidge(null)}
                    style={{ cursor: 'pointer', animation: `fade-in-up 0.5s ease-out ${animDelay}s both` }}
                  >
                    <path
                      d={ridge.fillPath}
                      fill="url(#ridgeFill)"
                    />
                    <path
                      d={ridge.fillPath}
                      fill="url(#ridgeFillHover)"
                      style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}
                    />
                    <path
                      d={ridge.path}
                      fill="none"
                      stroke={isHovered ? '#3f8f5f' : '#55554f'}
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      strokeLinecap="round"
                      style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
                    />
                  </g>
                );
              })}
            </g>

            <line
              x1={tailZoneX} y1={MARGIN.top - 5}
              x2={MARGIN.left + plotW - 20} y2={MARGIN.top + plotH + 5}
              stroke="#b92f4a" strokeWidth={1} strokeDasharray="4,3"
              opacity={0.6}
              style={{ animation: 'dash-flow 3s linear infinite' }}
            />

            {hoveredRidge !== null && (
              <g>
                <line
                  x1={ridges[hoveredRidge].peakX} y1={ridges[hoveredRidge].peakY}
                  x2={ridges[hoveredRidge].peakX} y2={MARGIN.top + plotH}
                  stroke="#3f8f5f" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.6}
                />
                <circle cx={ridges[hoveredRidge].peakX} cy={ridges[hoveredRidge].peakY} r={3} fill="#3f8f5f" style={{ filter: 'drop-shadow(0 0 3px rgba(63,143,95,0.4))' }} />
              </g>
            )}

            {ridges.map((ridge, i) => (
              <text
                key={`label-${i}`}
                x={MARGIN.left - 2}
                y={MARGIN.top + i * ridgeSpacing + 3}
                fontSize={6}
                fill={hoveredRidge === i ? '#3f8f5f' : '#8b8b84'}
                textAnchor="end"
                fontFamily="'IBM Plex Mono', monospace"
                style={{ transition: 'fill 0.2s ease' }}
              >
                {ridge.label}
              </text>
            ))}

            <text x={MARGIN.left + plotW / 2} y={H - 2} fontSize={7} fill="#8b8b84" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace">
              STRIKE PRICE →
            </text>

            <text x={W - 5} y={MARGIN.top + 10} fontSize={7} fill="#b92f4a" textAnchor="end" fontFamily="'IBM Plex Mono', monospace" opacity={0.7}>
              TAIL ZONE
            </text>

            <text x={MARGIN.left} y={MARGIN.top - 6} fontSize={7} fill="#8b8b84" fontFamily="'IBM Plex Mono', monospace">
              PROPAGATION DENSITY
            </text>

            {hoveredRidge !== null && (
              <foreignObject
                x={ridges[hoveredRidge].peakX + 8}
                y={ridges[hoveredRidge].peakY - 10}
                width={110}
                height={55}
                style={{ opacity: 1, transition: 'opacity 0.2s ease' }}
              >
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #d8d8d2',
                  borderRadius: 6,
                  padding: '5px 7px',
                  fontSize: 8,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: '#181818',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  opacity: 1,
                  transition: 'opacity 0.2s ease',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{ridges[hoveredRidge].label}</div>
                  <div style={{ fontVariantNumeric: 'tabular-nums' }}>Strike: {ridges[hoveredRidge].strike}</div>
                  <div style={{ fontVariantNumeric: 'tabular-nums', color: '#b92f4a' }}>Mass: {(0.21 - hoveredRidge * 0.02).toFixed(2)}%</div>
                </div>
              </foreignObject>
            )}
          </svg>
        </div>

        <div style={{ flex: '0 0 18%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>PROPAGATION</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {ridges.map((r, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredRidge(i)}
                onMouseLeave={() => setHoveredRidge(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 4px',
                  borderRadius: 3,
                  background: hoveredRidge === i ? '#f0f7f3' : 'transparent',
                  transition: 'background 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: hoveredRidge === i ? '#3f8f5f' : '#c7c7c0',
                  transition: 'background 0.15s ease',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 7,
                  color: hoveredRidge === i ? '#3f8f5f' : '#8b8b84',
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: 'color 0.15s ease',
                }}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, borderTop: '1px solid #e8e8e4', paddingTop: 8 }}>
            <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5 }}>FILTERED</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#181818', fontVariantNumeric: 'tabular-nums' }}>0.07</div>
            <div style={{ fontSize: 8, color: '#b92f4a', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>IMPLIED +0.08</div>
          </div>
        </div>
      </div>
    </div>
  );
}
