import React, { useMemo } from "react";

interface DensityChartProps {
  densityHistory: number[];
  growthHistory: number[];
  timestamps: string[];
  title?: string;
  showGrowth?: boolean;
}

export default function DensityChart({
  densityHistory,
  growthHistory,
  timestamps,
  title = "DENSITY OVER TIME",
  showGrowth = false,
}: DensityChartProps) {
  const data = showGrowth ? growthHistory : densityHistory;
  const W = 320, H = 90, PAD = { t: 8, r: 8, b: 20, l: 28 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const { minV, maxV, points, areaPath, linePath, gradId } = useMemo(() => {
    if (!data.length) return { minV: 0, maxV: 1, points: [], areaPath: "", linePath: "", gradId: "dcg0" };
    const minV = Math.min(...data, 0);
    const maxV = Math.max(...data, 1);
    const range = maxV - minV || 1;
    const pts = data.map((v, i) => ({
      x: PAD.l + (i / (data.length - 1 || 1)) * chartW,
      y: PAD.t + chartH - ((v - minV) / range) * chartH,
      v,
    }));

    // Smooth curve via bezier
    let line = `M ${pts[0]?.x} ${pts[0]?.y}`;
    let area = `M ${pts[0]?.x} ${PAD.t + chartH}`;
    area += ` L ${pts[0]?.x} ${pts[0]?.y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      line += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
      area += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    area += ` L ${pts[pts.length - 1].x} ${PAD.t + chartH} Z`;

    return { minV, maxV, points: pts, areaPath: area, linePath: line, gradId: `dcg${Date.now()}` };
  }, [data]);

  const hasData = data.length > 1;
  const lastVal = data[data.length - 1] ?? 0;
  const prevVal = data[data.length - 2] ?? lastVal;
  const trend = lastVal > prevVal ? "▲" : lastVal < prevVal ? "▼" : "—";
  const trendColor = showGrowth
    ? (lastVal > 0 ? "var(--risk-high)" : lastVal < 0 ? "var(--risk-low)" : "var(--text-dim)")
    : "var(--fire-orange)";

  // Y axis ticks
  const ticks = [minV, (minV + maxV) / 2, maxV].map(v => Math.round(v));

  return (
    <div className="density-chart glass">
      <div className="dc-header">
        <span className="dc-title">{title}</span>
        <span className="dc-current" style={{ color: trendColor }}>
          {trend} {lastVal}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="dc-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={showGrowth ? "#f59e0b" : "#ff6a00"} stopOpacity="0.4" />
            <stop offset="100%" stopColor={showGrowth ? "#f59e0b" : "#ff2200"} stopOpacity="0" />
          </linearGradient>
          <filter id="dc-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {ticks.map((t, i) => {
          const range = maxV - minV || 1;
          const y = PAD.t + chartH - ((t - minV) / range) * chartH;
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD.l - 4} y={y + 4} fill="rgba(255,180,80,0.35)"
                fontSize="7" fontFamily="var(--font-mono)" textAnchor="end">{t}</text>
            </g>
          );
        })}

        {/* Zero line for growth chart */}
        {showGrowth && minV < 0 && maxV > 0 && (() => {
          const range = maxV - minV;
          const y = PAD.t + chartH - ((0 - minV) / range) * chartH;
          return <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,3" />;
        })()}

        {hasData && (
          <>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none"
              stroke={showGrowth ? "#f59e0b" : "var(--fire-orange)"}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              filter="url(#dc-glow)"
            />
            {/* Last point dot */}
            {points.length > 0 && (
              <circle cx={points[points.length-1].x} cy={points[points.length-1].y}
                r="3" fill={showGrowth ? "#f59e0b" : "var(--fire-amber)"}
                filter="url(#dc-glow)"
              />
            )}
          </>
        )}

        {!hasData && (
          <text x={W/2} y={H/2} fill="rgba(255,180,80,0.2)"
            fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">
            AWAITING DATA
          </text>
        )}

        {/* X axis timestamps */}
        {timestamps.length > 0 && [timestamps[0], timestamps[Math.floor(timestamps.length/2)], timestamps[timestamps.length-1]]
          .filter(Boolean)
          .map((ts, i) => {
            const xPos = i === 0 ? PAD.l : i === 1 ? W/2 : W - PAD.r;
            return (
              <text key={i} x={xPos} y={H - 3} fill="rgba(255,180,80,0.25)"
                fontSize="7" fontFamily="var(--font-mono)"
                textAnchor={i === 0 ? "start" : i === 1 ? "middle" : "end"}>
                {ts}
              </text>
            );
          })}
      </svg>

      <style>{`
        .density-chart {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dc-title {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 2px;
          color: var(--text-dim);
        }
        .dc-current {
          font-family: var(--font-display);
          font-size: 18px;
          letter-spacing: 1px;
        }
        .dc-svg {
          width: 100%;
          height: 90px;
          overflow: visible;
        }
      `}</style>
    </div>
  );
}