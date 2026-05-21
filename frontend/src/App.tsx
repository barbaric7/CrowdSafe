import { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";
import VideoFeed from "./components/VideoFeed";
import RiskGauge from "./components/RiskGauge";
import StatCard from "./components/StatCard";
import DensityChart from "./components/DensityChart";
import { useWebSocket } from "./hooks/useWebSocket";
import type { FrameResult, AlertEntry, InputMode, RiskLevel } from "./types";

// ── Alert Log Component (inline) ─────────────────────────────────────────────
function AlertLog({ alerts }: { alerts: AlertEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [alerts]);

  return (
    <div className="alert-log glass">
      <div className="al-header">
        <span className="al-title">ALERT LOG</span>
        <span className="al-count">{alerts.length}</span>
      </div>
      <div className="al-list">
        {alerts.length === 0 && (
          <div className="al-empty">No alerts triggered</div>
        )}
        {alerts.map((a) => (
          <div key={a.id} className={`al-item al-${a.risk_level.toLowerCase()} animate-slide-up`}>
            <div className="al-item-left">
              <span className="al-dot" />
              <span className="al-msg">{a.message}</span>
            </div>
            <div className="al-item-right">
              <span className="al-count-badge">{a.count}</span>
              <span className="al-time">{a.timestamp}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Zone Grid Component (inline) ──────────────────────────────────────────────
function ZoneGrid({ zones }: { zones: FrameResult["zones"] | null }) {
  const entries = zones
    ? [
        { label: "TOP LEFT", value: zones.top_left },
        { label: "TOP RIGHT", value: zones.top_right },
        { label: "BTM LEFT", value: zones.bottom_left },
        { label: "BTM RIGHT", value: zones.bottom_right },
      ]
    : Array(4).fill({ label: "—", value: 0 });

  const max = Math.max(...entries.map((e) => e.value), 1);

  return (
    <div className="zone-grid glass">
      <div className="zg-header">ZONE DISTRIBUTION</div>
      <div className="zg-cells">
        {entries.map((e, i) => {
          const pct = (e.value / max) * 100;
          const heat = pct > 66 ? "high" : pct > 33 ? "med" : "low";
          return (
            <div key={i} className={`zg-cell zg-${heat}`}>
              <div className="zg-fill" style={{ height: `${pct}%` }} />
              <div className="zg-value">{e.value}</div>
              <div className="zg-label">{e.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Alert Banner Component (inline) ──────────────────────────────────────────
function AlertBanner({ alert }: { alert: AlertEntry | null }) {
  if (!alert) return null;
  const isHigh = alert.risk_level === "High";
  return (
    <div className={`alert-banner ${isHigh ? "banner-high" : "banner-med"} animate-slide-up`}>
      <span className="banner-icon">{isHigh ? "⚠" : "△"}</span>
      <span className="banner-msg">{alert.message}</span>
      <span className="banner-count">{alert.count} people</span>
      <span className="banner-time">{alert.timestamp}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<InputMode>("idle");
  const [latestData, setLatestData] = useState<FrameResult | null>(null);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [activeAlert, setActiveAlert] = useState<AlertEntry | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(0);
  const prevRisk = useRef<RiskLevel | null>(null);
  const fpsCountRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webcamRef = useRef<MediaStream | null>(null);
  const webcamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    };
    window.addEventListener("click", unlock, { once: true });
    return () => window.removeEventListener("click", unlock);
  }, []);
  
  const handleFrame = useCallback((data: FrameResult) => {
    setLatestData(data);
    fpsCountRef.current++;

    if (data.frame_count !== undefined) setFrameCount(data.frame_count);
    if (data.total_frames !== undefined) setTotalFrames(data.total_frames);
    if (data.progress !== undefined) setProgress(data.progress);

    // Alert logic: fire when risk level escalates
    const curr = data.risk_level;
    // voice feedback
    if (curr === "High" && prevRisk.current !== "High") {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance("Warning. Critical crowd density detected. Stampede risk is high.");
      utter.rate = 0.9; utter.pitch = 0.8;
      synthRef.current = utter;
      window.speechSynthesis.speak(utter);
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      [0, 0.25, 0.5].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    }
    const prev = prevRisk.current;
    const shouldAlert =
      (curr === "High" && prev !== "High") ||
      (curr === "Medium" && prev === "Low");

    if (shouldAlert) {
      const entry: AlertEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: data.timestamp,
        message:
          curr === "High"
            ? `CRITICAL: Stampede risk detected — ${data.total_people} people in frame`
            : `WARNING: Crowd density rising — ${data.total_people} people detected`,
        risk_level: curr,
        count: data.total_people,
      };
      setAlerts((prev) => [...prev.slice(-49), entry]);
      setActiveAlert(entry);
      setTimeout(() => setActiveAlert(null), 4000);
    }
    prevRisk.current = curr;
  }, []);

  const handleDone = useCallback(() => {
    setMode("idle");
    stopWebcam();
  }, []);

  const { state, connect, disconnect, sendVideoFile, sendWebcamFrame } =
    useWebSocket(handleFrame, handleDone);

  // FPS counter
  useEffect(() => {
    fpsTimerRef.current = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => {
      if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
    };
  }, []);

  const stopWebcam = useCallback(() => {
    if (webcamIntervalRef.current) clearInterval(webcamIntervalRef.current);
    webcamRef.current?.getTracks().forEach((t) => t.stop());
    webcamRef.current = null;
  }, []);

  const handleVideoUpload = useCallback(
    async (file: File) => {
      setMode("video");
      setFrameCount(0);
      setTotalFrames(0);
      setProgress(0);
      connect();
      await sendVideoFile(file);
    },
    [connect, sendVideoFile]
  );

  const handleWebcamStart = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamRef.current = stream;
      setMode("webcam");
      connect();

      const videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.play();

      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d")!;

      webcamIntervalRef.current = setInterval(() => {
        ctx.drawImage(videoEl, 0, 0, 640, 480);
        canvas.toBlob(
          (blob) => { if (blob) sendWebcamFrame(blob); },
          "image/jpeg",
          0.7
        );
      }, 200); // ~5fps to server
    } catch {
      alert("Could not access webcam.");
    }
  }, [connect, sendWebcamFrame]);

  const handleStop = useCallback(() => {
    disconnect();
    stopWebcam();
    setMode("idle");
  }, [disconnect, stopWebcam]);

  const currentRisk: RiskLevel = latestData?.risk_level ?? "Low";
  const sessionDuration = (() => {
    if (!latestData) return "00:00";
    const total = latestData.density_history.length;
    const mins = Math.floor(total / 60).toString().padStart(2, "0");
    const secs = (total % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  })();

  const avgDensity = latestData?.density_history.length
    ? Math.round(
        latestData.density_history.reduce((a, b) => a + b, 0) /
          latestData.density_history.length
      )
    : 0;

  const peakDensity = latestData?.density_history.length
    ? Math.max(...latestData.density_history)
    : 0;

  useEffect(() => {
    document.body.className = `risk-${currentRisk.toLowerCase()}`;
  }, [currentRisk]);

  return (
    <div className={`app risk-${currentRisk.toLowerCase()}`}>
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="16" stroke="url(#hg)" strokeWidth="1.5" opacity="0.6" />
              <path d="M18 6 C14 10 10 14 10 20 C10 26 14 30 18 30 C22 30 26 26 26 20 C26 14 22 10 18 6Z"
                fill="url(#hg2)" opacity="0.8" />
              <path d="M18 14 C16 16 15 18 15 21 C15 24 16.5 26 18 26 C19.5 26 21 24 21 21 C21 18 20 16 18 14Z"
                fill="url(#hg3)" />
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="36" y2="36">
                  <stop stopColor="#ff2200" /><stop offset="1" stopColor="#ffb300" />
                </linearGradient>
                <linearGradient id="hg2" x1="18" y1="6" x2="18" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ff6a00" stopOpacity="0.3" /><stop offset="1" stopColor="#ff2200" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="hg3" x1="18" y1="14" x2="18" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffe566" /><stop offset="1" stopColor="#ff6a00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="header-title">CROWDSAFE</div>
            <div className="header-subtitle">CROWD DENSITY MONITOR · v2.0</div>
          </div>
        </div>

        <AlertBanner alert={activeAlert} />

        <div className="header-status">
          <span
            className={`status-dot ${
              state === "processing" ? "active"
              : state === "error" ? "error"
              : state === "done" ? ""
              : "idle"
            }`}
          />
          <span>
            {state === "connecting" ? "CONNECTING…"
              : state === "processing" ? mode === "webcam" ? `LIVE · ${fps} FPS` : `PROCESSING · ${fps} FPS`
              : state === "done" ? "ANALYSIS DONE"
              : state === "error" ? "CONNECTION ERROR"
              : "STANDBY"}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="app-body">
        {/* Left column */}
        <div className="col-main">
          {/* Stats row */}
          <div className="stats-row">
            <StatCard
              label="PEOPLE COUNT"
              value={latestData?.total_people ?? 0}
              sub="current frame"
              risk={currentRisk}
              trend={
                (latestData?.growth ?? 0) > 0 ? "up"
                : (latestData?.growth ?? 0) < 0 ? "down"
                : "neutral"
              }
              icon="👥"
            />
            <StatCard
              label="PEAK COUNT"
              value={peakDensity}
              sub="this session"
              accent="var(--fire-orange)"
              trend="neutral"
              icon="📈"
            />
            <StatCard
              label="AVG DENSITY"
              value={avgDensity}
              sub="people / frame"
              accent="var(--fire-amber)"
              icon="⊞"
            />
            <StatCard
              label="GROWTH RATE"
              value={latestData?.growth ?? 0}
              sub="Δ from last frame"
              risk={
                (latestData?.growth ?? 0) > 5 ? "High"
                : (latestData?.growth ?? 0) > 2 ? "Medium"
                : "Low"
              }
              trend={
                (latestData?.growth ?? 0) > 0 ? "up"
                : (latestData?.growth ?? 0) < 0 ? "down"
                : "neutral"
              }
              icon="⚡"
            />
          </div>

          {/* Video feed */}
          <VideoFeed
            mode={mode}
            state={state}
            frame={latestData?.frame ?? null}
            progress={progress}
            frameCount={frameCount}
            totalFrames={totalFrames}
            onVideoUpload={handleVideoUpload}
            onWebcamStart={handleWebcamStart}
            onStop={handleStop}
          />

          {/* Charts row */}
          <div className="charts-row">
            <DensityChart
              densityHistory={latestData?.density_history ?? []}
              growthHistory={latestData?.growth_history ?? []}
              timestamps={latestData?.timestamps ?? []}
              title="DENSITY OVER TIME"
              showGrowth={false}
            />
            <DensityChart
              densityHistory={latestData?.density_history ?? []}
              growthHistory={latestData?.growth_history ?? []}
              timestamps={latestData?.timestamps ?? []}
              title="GROWTH RATE"
              showGrowth={true}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="col-side">
          <RiskGauge
            risk={currentRisk}
            count={latestData?.total_people ?? 0}
            predicted={latestData?.predicted_next ?? null}
          />
          <ZoneGrid zones={latestData?.zones ?? null} />
          <AlertLog alerts={alerts} />
        </div>
      </main>

      <style>{`
        /* ── Alert Banner ── */
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          border-radius: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 1px;
          max-width: 480px;
        }
        .banner-high {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
          animation: pulse-fire 0.8s ease-in-out infinite;
        }
        .banner-med {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #f59e0b;
        }
        .banner-icon { font-size: 16px; }
        .banner-msg { flex: 1; }
        .banner-count { opacity: 0.7; }
        .banner-time { opacity: 0.5; font-size: 10px; }

        /* ── Alert Log ── */
        .alert-log {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .al-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px 8px;
          border-bottom: 1px solid var(--glass-border);
        }
        .al-title {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 3px;
          color: var(--text-dim);
        }
        .al-count {
          font-family: var(--font-display);
          font-size: 18px;
          color: var(--fire-orange);
        }
        .al-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
          max-height: 220px;
        }
        .al-empty {
          padding: 20px 12px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-dim);
          text-align: center;
          letter-spacing: 1px;
        }
        .al-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-bottom: 1px solid rgba(255, 80, 0, 0.05);
          gap: 8px;
        }
        .al-item-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .al-item-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .al-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .al-high .al-dot { background: var(--risk-high); box-shadow: 0 0 6px var(--risk-high); }
        .al-medium .al-dot { background: var(--risk-medium); box-shadow: 0 0 6px var(--risk-medium); }
        .al-low .al-dot { background: var(--risk-low); }
        .al-msg {
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .al-count-badge {
          font-family: var(--font-display);
          font-size: 16px;
          color: var(--fire-orange);
          min-width: 24px;
          text-align: right;
        }
        .al-time {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-dim);
          white-space: nowrap;
        }

        /* ── Zone Grid ── */
        .zone-grid {
          padding: 12px;
        }
        .zg-header {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 3px;
          color: var(--text-dim);
          margin-bottom: 10px;
        }
        .zg-cells {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .zg-cell {
          position: relative;
          height: 60px;
          border-radius: 6px;
          border: 1px solid var(--glass-border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 4px 6px;
          background: rgba(0,0,0,0.2);
        }
        .zg-fill {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          transition: height 0.5s ease;
          border-radius: 0 0 5px 5px;
        }
        .zg-high .zg-fill { background: rgba(239, 68, 68, 0.3); }
        .zg-med .zg-fill { background: rgba(245, 158, 11, 0.25); }
        .zg-low .zg-fill { background: rgba(34, 197, 94, 0.2); }
        .zg-value {
          position: relative;
          font-family: var(--font-display);
          font-size: 22px;
          line-height: 1;
          color: var(--text-primary);
          z-index: 1;
        }
        .zg-high .zg-value { color: var(--risk-high); text-shadow: 0 0 10px var(--risk-high); }
        .zg-med .zg-value { color: var(--risk-medium); }
        .zg-low .zg-value { color: var(--risk-low); }
        .zg-label {
          position: relative;
          font-family: var(--font-mono);
          font-size: 8px;
          letter-spacing: 1px;
          color: var(--text-dim);
          z-index: 1;
        }
      `}</style>
    </div>
  );
}