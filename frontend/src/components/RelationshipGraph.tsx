import { useState, useEffect, useMemo } from 'react';

export default function RelationshipGraph() {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [counters, setCounters] = useState<Record<string, string>>({});

  const legendItems = [
    { color: '#b92f4a', label: 'Bear signal', count: 579 },
    { color: '#3f8f5f', label: 'Bull signal', count: 1424 },
    { color: '#c7c7c0', label: 'Median path', count: 69 },
    { color: '#111111', label: 'Catalyst', count: 12 },
    { color: '#7a1f2e', label: 'Cluster hub', count: 3 },
  ];

  const stats = [
    { label: 'P(UP)', value: '0.71', color: '#3f8f5f' },
    { label: 'P(DOWN)', value: '0.29', color: '#b92f4a' },
    { label: 'EDGE VS BOOK', value: '+38¢', color: '#181818' },
    { label: 'CONFIDENCE', value: '91.4%', color: '#181818' },
  ];

  const nodes = useMemo(() => [
    { cx: 80, cy: 120, r: 12, fill: '#b92f4a', label: 'BEAR_CLUSTER', type: 'bear', weight: 0.9 },
    { cx: 200, cy: 140, r: 14, fill: '#111111', label: 'CATALYST_KING', type: 'catalyst', weight: 1.0 },
    { cx: 320, cy: 100, r: 10, fill: '#3f8f5f', label: 'BULL_PRICE', type: 'bull', weight: 0.85 },
    { cx: 280, cy: 200, r: 11, fill: '#7a1f2e', label: 'HERO_A', type: 'hub', weight: 0.95 },
    { cx: 140, cy: 60, r: 7, fill: '#3f8f5f', label: '', type: 'bull', weight: 0.6 },
    { cx: 260, cy: 70, r: 6, fill: '#3f8f5f', label: '', type: 'bull', weight: 0.5 },
    { cx: 350, cy: 160, r: 5, fill: '#c7c7c0', label: '', type: 'median', weight: 0.4 },
    { cx: 100, cy: 200, r: 6, fill: '#b92f4a', label: '', type: 'bear', weight: 0.5 },
    { cx: 180, cy: 220, r: 5, fill: '#c7c7c0', label: '', type: 'median', weight: 0.4 },
    { cx: 240, cy: 180, r: 6, fill: '#7a1f2e', label: '', type: 'hub', weight: 0.55 },
    { cx: 60, cy: 80, r: 5, fill: '#b92f4a', label: '', type: 'bear', weight: 0.45 },
    { cx: 120, cy: 160, r: 6, fill: '#b92f4a', label: '', type: 'bear', weight: 0.5 },
    { cx: 300, cy: 140, r: 7, fill: '#3f8f5f', label: '', type: 'bull', weight: 0.65 },
    { cx: 220, cy: 100, r: 6, fill: '#111111', label: '', type: 'catalyst', weight: 0.55 },
    { cx: 160, cy: 180, r: 5, fill: '#c7c7c0', label: '', type: 'median', weight: 0.4 },
    { cx: 340, cy: 220, r: 5, fill: '#c7c7c0', label: '', type: 'median', weight: 0.4 },
    { cx: 90, cy: 240, r: 4, fill: '#b92f4a', label: '', type: 'bear', weight: 0.35 },
    { cx: 370, cy: 120, r: 4, fill: '#c7c7c0', label: '', type: 'median', weight: 0.3 },
  ], []);

  const edges = useMemo(() => [
    { from: 0, to: 1, strength: 0.9 },
    { from: 1, to: 2, strength: 0.85 },
    { from: 1, to: 3, strength: 0.95 },
    { from: 2, to: 12, strength: 0.7 },
    { from: 0, to: 11, strength: 0.8 },
    { from: 3, to: 9, strength: 0.75 },
    { from: 0, to: 7, strength: 0.65 },
    { from: 2, to: 5, strength: 0.6 },
    { from: 1, to: 13, strength: 0.7 },
    { from: 3, to: 15, strength: 0.5 },
    { from: 4, to: 1, strength: 0.55 },
    { from: 12, to: 6, strength: 0.4 },
    { from: 7, to: 10, strength: 0.5 },
    { from: 11, to: 14, strength: 0.45 },
    { from: 9, to: 8, strength: 0.4 },
    { from: 13, to: 4, strength: 0.5 },
    { from: 16, to: 7, strength: 0.35 },
    { from: 6, to: 17, strength: 0.3 },
  ], []);

  const histBars = useMemo(() => [
    { h: 45, color: '#3f8f5f', label: '+0.8' },
    { h: 28, color: '#b92f4a', label: '-0.4' },
    { h: 58, color: '#3f8f5f', label: '+1.2' },
    { h: 35, color: '#b92f4a', label: '-0.6' },
    { h: 65, color: '#3f8f5f', label: '+1.5' },
    { h: 22, color: '#b92f4a', label: '-0.3' },
    { h: 50, color: '#3f8f5f', label: '+1.0' },
    { h: 30, color: '#b92f4a', label: '-0.5' },
  ], []);

  useEffect(() => {
    const targets: Record<string, number> = { 'P(UP)': 0.71, 'P(DOWN)': 0.29, 'CONFIDENCE': 91.4 };
    const duration = 1000;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const c: Record<string, string> = {};
      c['P(UP)'] = (targets['P(UP)'] * ease).toFixed(2);
      c['P(DOWN)'] = (targets['P(DOWN)'] * ease).toFixed(2);
      c['CONFIDENCE'] = (targets['CONFIDENCE'] * ease).toFixed(1) + '%';
      c['EDGE VS BOOK'] = '+' + Math.round(38 * ease) + '¢';
      setCounters(c);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const { connectedNodes, connectedEdges } = useMemo(() => {
    if (hoveredNode === null) return { connectedNodes: new Set<number>(), connectedEdges: new Set<number>() };
    const cn = new Set<number>([hoveredNode]);
    const ce = new Set<number>();
    edges.forEach((e, i) => {
      if (e.from === hoveredNode) { cn.add(e.to); ce.add(i); }
      if (e.to === hoveredNode) { cn.add(e.from); ce.add(i); }
    });
    return { connectedNodes: cn, connectedEdges: ce };
  }, [hoveredNode, edges]);

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
        MIROFISH · Relationship Graph Simulation
      </div>
      <div style={{ fontSize: 9, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        EDGE CLASS · NETWORK TOPOLOGY · LIVE
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: '0 0 18%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>LEGEND</div>
          {legendItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: hoveredLegend === i ? 'rgba(0,0,0,0.03)' : 'transparent',
                borderRadius: 4, padding: '3px 6px',
                opacity: hoveredLegend !== null && hoveredLegend !== i ? 0.5 : 1,
              }}
              onMouseEnter={() => setHoveredLegend(i)}
              onMouseLeave={() => setHoveredLegend(null)}
            >
              <div style={{ 
                width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0,
                boxShadow: hoveredLegend === i ? `0 0 6px ${item.color}40` : 'none',
                transition: 'box-shadow 0.15s ease',
              }} />
              <span style={{ fontSize: 9, color: '#8b8b84', textTransform: 'uppercase', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 8, color: '#c7c7c0', fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <svg viewBox="0 0 400 280" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <radialGradient id="nodeGrad-red" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#d4637a" />
                <stop offset="100%" stopColor="#b92f4a" />
              </radialGradient>
              <radialGradient id="nodeGrad-green" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#5cc77a" />
                <stop offset="100%" stopColor="#3f8f5f" />
              </radialGradient>
              <radialGradient id="nodeGrad-black" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#444" />
                <stop offset="100%" stopColor="#111" />
              </radialGradient>
              <radialGradient id="nodeGrad-hub" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#a33a50" />
                <stop offset="100%" stopColor="#7a1f2e" />
              </radialGradient>
              <radialGradient id="nodeGrad-median" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#d8d8d0" />
                <stop offset="100%" stopColor="#c7c7c0" />
              </radialGradient>
            </defs>

            {edges.map((e, i) => {
              const from = nodes[e.from];
              const to = nodes[e.to];
              const active = connectedEdges.has(i);
              return (
                <line
                  key={`e-${i}`}
                  x1={from.cx} y1={from.cy}
                  x2={to.cx} y2={to.cy}
                  stroke={active ? '#181818' : '#d8d8d2'}
                  strokeWidth={active ? 1.5 : 0.5 * e.strength + 0.25}
                  strokeOpacity={hoveredNode === null ? 0.4 : active ? 0.9 : 0.1}
                  style={{ transition: 'all 0.15s ease' }}
                />
              );
            })}

            {nodes.map((n, i) => {
              const active = connectedNodes.has(i);
              const gradId = n.type === 'bear' ? 'nodeGrad-red'
                : n.type === 'bull' ? 'nodeGrad-green'
                : n.type === 'catalyst' ? 'nodeGrad-black'
                : n.type === 'hub' ? 'nodeGrad-hub'
                : 'nodeGrad-median';
              return (
                <g key={`n-${i}`}
                  onMouseEnter={() => setHoveredNode(i)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={n.cx} cy={n.cy}
                    r={hoveredNode === i ? n.r + 3 : n.r}
                    fill={`url(#${gradId})`}
                    opacity={hoveredNode === null ? 0.9 : active ? 1 : 0.2}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {n.label && (
                    <text
                      x={n.cx} y={n.cy - n.r - 4}
                      textAnchor="middle"
                      fontSize={7}
                      fontWeight={600}
                      fill="#181818"
                      opacity={hoveredNode === null ? 0.7 : active ? 1 : 0.15}
                      style={{ transition: 'opacity 0.15s ease', fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ flex: '0 0 22%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>STATS</div>
          {stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {counters[s.label] || s.value}
              </span>
            </div>
          ))}

          <div style={{ fontSize: 8, color: '#8b8b84', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>DISTRIBUTION</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70 }}>
            {histBars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div
                  style={{
                    width: '100%', height: b.h, background: b.color, borderRadius: '2px 2px 0 0',
                    opacity: hoveredBar === i ? 1 : 0.75, transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                />
                <span style={{ fontSize: 6, color: '#8b8b84' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
