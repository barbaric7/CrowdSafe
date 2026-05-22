import React from "react";
import type { RiskLevel } from "../types";

interface RiskGaugeProps {
  risk: RiskLevel;
  count: number;
  predicted: number | null;
}

const RISK_CONFIG = {
  Low:    { color: "#22c55e", angle: -120, label: "LOW",    glow: "rgba(34, 197, 94, 0.4)" },
  Medium: { color: "#f59e0b", angle: 0,    label: "MEDIUM", glow: "rgba(245, 158, 11, 0.4)" },
  High:   { color: "#ef4444", angle: 120,  label: "HIGH",   glow: "rgba(239, 68, 68, 0.5)" },
};

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToXY(startAngle, r, cx, cy);
  const e = polarToXY(endAngle, r, cx, cy);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function RiskGauge({ risk, count, predicted }: RiskGaugeProps) {
  const cfg = RISK_CONFIG[risk];
  const cx = 90, cy = 90, r = 68;
  const startAngle = -150;
  const endAngle = 150;
  const [smoothAngle, setSmoothAngle] = React.useState(cfg.angle);
const animRef = React.useRef<number>(0);
const currentAngleRef = React.useRef(cfg.angle);
const targetAngleRef = React.useRef(cfg.angle);
React.useEffect(() => {
  targetAngleRef.current = cfg.angle;
  cancelAnimationFrame(animRef.current);
  const animate = () => {
    const diff = targetAngleRef.current - currentAngleRef.current;
    if (Math.abs(diff) < 0.5) {
      currentAngleRef.current = targetAngleRef.current;
      setSmoothAngle(targetAngleRef.current);
      return;
    }
    currentAngleRef.current += diff * 0.12;
    const val = currentAngleRef.current;
    if (isFinite(val)) setSmoothAngle(val);
    animRef.current = requestAnimationFrame(animate);
  };
  animRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animRef.current);
}, [cfg.angle]);
const needleAngle = smoothAngle; // -120 (low) to 120 (high) mapped to gauge arc

  const needleEnd = polarToXY(isFinite(needleAngle) ? needleAngle : -120, 56, cx, cy);

  return (
    <div className="risk-gauge glass">
      <div className="rg-label-top">RISK ASSESSMENT</div>
      <div className="rg-main">
        <svg viewBox="0 0 180 140" className="rg-svg" style={{ overflow: "visible" }}>
          <defs>
            <filter id="glow-gauge">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={describeArc(cx, cy, r, startAngle, endAngle)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Low zone */}
          <path
            d={describeArc(cx, cy, r, startAngle, -60)}
            fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" opacity="0.5"
          />
          {/* Medium zone */}
          <path
            d={describeArc(cx, cy, r, -60, 60)}
            fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" opacity="0.5"
          />
          {/* High zone */}
          <path
            d={describeArc(cx, cy, r, 60, endAngle)}
            fill="none" stroke="#ef4444" strokeWidth="10" strokeLinecap="round" opacity="0.5"
          />

          {/* Active arc glow */}
          <path
            d={describeArc(cx, cy, r, startAngle, needleAngle)}
            fill="none"
            stroke={cfg.color}
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#glow-gauge)"
            opacity="0.85"
          />

          {/* Needle */}
          <line
            x1={cx} y1={cy}
            x2={needleEnd.x} y2={needleEnd.y}
            stroke={cfg.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#glow-gauge)"
            style={{ transition: "x2 0.8s cubic-bezier(0.34,1.56,0.64,1), y2 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
          {/* Needle pivot */}
          <circle cx={cx} cy={cy} r="5" fill={cfg.color} opacity="0.8" />
          <circle cx={cx} cy={cy} r="2.5" fill="var(--bg-deep)" />

          {/* Zone labels */}
          <text x="20" y="115" fill="#22c55e" fontSize="8" fontFamily="var(--font-mono)" opacity="0.7">LOW</text>
          <text x="77" y="28" fill="#f59e0b" fontSize="8" fontFamily="var(--font-mono)" opacity="0.7" textAnchor="middle">MED</text>
          <text x="148" y="115" fill="#ef4444" fontSize="8" fontFamily="var(--font-mono)" opacity="0.7" textAnchor="end">HIGH</text>
        </svg>

        <div className="rg-center">
          <div className="rg-risk-label" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}>
            {cfg.label}
          </div>
          <div className="rg-count">{count}</div>
          <div className="rg-count-label">people detected</div>
        </div>
      </div>

      {predicted !== null && (
        <div className="rg-prediction">
          <span className="rg-pred-label">NEXT FRAME ESTIMATE</span>
          <span className="rg-pred-value" style={{ color: cfg.color }}>{Math.round(predicted)}</span>
        </div>
      )}

      <style>{`
        .risk-gauge {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rg-label-top {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 3px;
          color: var(--text-dim);
        }
        .rg-main {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .rg-svg {
          width: 100%;
          max-width: 170px;
        }
        .rg-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: -12px;
        }
        .rg-risk-label {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 4px;
          line-height: 1;
        }
        .rg-count {
          font-family: var(--font-display);
          font-size: 32px;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .rg-count-label {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 1px;
        }
        .rg-prediction {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          border: 1px solid var(--glass-border);
        }
        .rg-pred-label {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 1.5px;
          color: var(--text-dim);
        }
        .rg-pred-value {
          font-family: var(--font-display);
          font-size: 16px;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}