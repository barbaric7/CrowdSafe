import React from "react";
import type { RiskLevel } from "../types";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  risk?: RiskLevel | null;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}

export default function StatCard({ label, value, sub, risk, icon, trend, accent }: StatCardProps) {
  const riskColor = risk === "High" ? "var(--risk-high)"
    : risk === "Medium" ? "var(--risk-medium)"
    : risk === "Low" ? "var(--risk-low)"
    : accent || "var(--fire-orange)";

  const trendIcon = trend === "up" ? "▲" : trend === "down" ? "▼" : "—";
  const trendColor = trend === "up" ? "var(--risk-high)" : trend === "down" ? "var(--risk-low)" : "var(--text-dim)";

  return (
    <div className="stat-card glass" style={{ "--card-accent": riskColor } as React.CSSProperties}>
      <div className="sc-glow" />
      <div className="sc-header">
        <span className="sc-label">{label}</span>
        {icon && <span className="sc-icon">{icon}</span>}
      </div>
      <div className="sc-value" style={{ color: riskColor }}>
        {value}
      </div>
      <div className="sc-footer">
        {sub && <span className="sc-sub">{sub}</span>}
        {trend && (
          <span className="sc-trend" style={{ color: trendColor }}>
            {trendIcon}
          </span>
        )}
      </div>
      <div className="sc-bar" style={{ background: riskColor }} />

      <style>{`
        .stat-card {
          position: relative;
          padding: 14px 16px 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .sc-glow {
          position: absolute;
          top: -30px; right: -30px;
          width: 80px; height: 80px;
          background: radial-gradient(circle, var(--card-accent, var(--fire-orange)) 0%, transparent 70%);
          opacity: 0.15;
          pointer-events: none;
        }
        .sc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sc-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 2px;
          color: var(--text-dim);
          text-transform: uppercase;
        }
        .sc-icon {
          font-size: 14px;
          opacity: 0.6;
        }
        .sc-value {
          font-family: var(--font-display);
          font-size: 38px;
          line-height: 1;
          letter-spacing: 1px;
          text-shadow: 0 0 20px currentColor;
        }
        .sc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 2px;
        }
        .sc-sub {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-dim);
        }
        .sc-trend {
          font-size: 11px;
          font-family: var(--font-mono);
        }
        .sc-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}