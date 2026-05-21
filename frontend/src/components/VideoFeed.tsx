import React, { useRef, useCallback, useEffect, useState } from "react";
import type { InputMode, ProcessingState, FrameResult } from "../types";

interface VideoFeedProps {
  mode: InputMode;
  state: ProcessingState;
  frame: string | null;
  progress: number;
  frameCount: number;
  totalFrames: number;
  onVideoUpload: (file: File) => void;
  onWebcamStart: () => void;
  onStop: () => void;
}

export default function VideoFeed({
  mode, state, frame, progress, frameCount, totalFrames,
  onVideoUpload, onWebcamStart, onStop,
}: VideoFeedProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) onVideoUpload(file);
  }, [onVideoUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onVideoUpload(file);
  }, [onVideoUpload]);

  const isActive = state === "processing" || state === "connecting";

  return (
    <div className="video-feed glass">
      {/* Header bar */}
      <div className="vf-header">
        <div className="vf-title-row">
          <span className="vf-label">LIVE FEED</span>
          {isActive && (
            <span className="vf-badge">
              <span className="vf-badge-dot" />
              {mode === "webcam" ? "WEBCAM LIVE" : "PROCESSING"}
            </span>
          )}
          {state === "done" && <span className="vf-badge done">ANALYSIS COMPLETE</span>}
        </div>
        {isActive && (
          <button className="vf-stop-btn" onClick={onStop}>
            ■ STOP
          </button>
        )}
      </div>

      {/* Main display */}
      <div className="vf-screen">
        {frame ? (
          <>
            <img
              src={`data:image/jpeg;base64,${frame}`}
              alt="Detection feed"
              className="vf-img"
            />
            {/* Scan line effect */}
            <div className="vf-scanline" />
            {/* Corner brackets */}
            <div className="vf-corner tl" />
            <div className="vf-corner tr" />
            <div className="vf-corner bl" />
            <div className="vf-corner br" />
          </>
        ) : (
          <div
            className={`vf-dropzone ${dragOver ? "drag-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="vf-drop-icon">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 8L20 20H28V36H36V20H44L32 8Z" fill="currentColor" opacity="0.6"/>
                <path d="M8 44V52C8 54.2 9.8 56 12 56H52C54.2 56 56 54.2 56 52V44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M20 44H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" opacity="0.5"/>
              </svg>
            </div>
            <p className="vf-drop-title">Drop video here</p>
            <p className="vf-drop-sub">MP4, MOV, AVI supported</p>
            <div className="vf-actions">
              <button className="vf-btn primary" onClick={() => fileRef.current?.click()}>
                Upload Video
              </button>
              <button className="vf-btn secondary" onClick={onWebcamStart}>
                Use Webcam
              </button>
            </div>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFileChange} />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {mode === "video" && totalFrames > 0 && (
        <div className="vf-progress-row">
          <div className="vf-progress-bar">
            <div className="vf-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="vf-progress-label">
            {frameCount} / {totalFrames} frames · {progress.toFixed(1)}%
          </span>
        </div>
      )}

      <style>{`
        .video-feed {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          flex: 1;
        }
        .vf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--glass-border);
        }
        .vf-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .vf-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 3px;
          color: var(--text-dim);
        }
        .vf-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--fire-orange);
          background: rgba(255, 100, 0, 0.12);
          border: 1px solid rgba(255, 100, 0, 0.3);
          border-radius: 4px;
          padding: 2px 7px;
          letter-spacing: 1px;
        }
        .vf-badge.done { color: var(--risk-low); background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); }
        .vf-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--fire-orange);
          box-shadow: 0 0 6px var(--fire-orange);
          animation: pulse-fire 1s ease-in-out infinite;
        }
        .vf-stop-btn {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 2px;
          color: var(--fire-red);
          background: rgba(255, 34, 0, 0.1);
          border: 1px solid rgba(255, 34, 0, 0.3);
          border-radius: 4px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vf-stop-btn:hover { background: rgba(255, 34, 0, 0.2); border-color: var(--fire-red); }
        .vf-screen {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          background: rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .vf-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .vf-scanline {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255, 120, 0, 0.4), transparent);
          animation: scan-line 3s linear infinite;
          pointer-events: none;
        }
        .vf-corner {
          position: absolute;
          width: 18px; height: 18px;
          pointer-events: none;
        }
        .vf-corner::before, .vf-corner::after {
          content: '';
          position: absolute;
          background: var(--fire-orange);
        }
        .vf-corner.tl { top: 8px; left: 8px; }
        .vf-corner.tl::before { top: 0; left: 0; width: 100%; height: 2px; }
        .vf-corner.tl::after { top: 0; left: 0; width: 2px; height: 100%; }
        .vf-corner.tr { top: 8px; right: 8px; }
        .vf-corner.tr::before { top: 0; right: 0; width: 100%; height: 2px; }
        .vf-corner.tr::after { top: 0; right: 0; width: 2px; height: 100%; }
        .vf-corner.bl { bottom: 8px; left: 8px; }
        .vf-corner.bl::before { bottom: 0; left: 0; width: 100%; height: 2px; }
        .vf-corner.bl::after { bottom: 0; left: 0; width: 2px; height: 100%; }
        .vf-corner.br { bottom: 8px; right: 8px; }
        .vf-corner.br::before { bottom: 0; right: 0; width: 100%; height: 2px; }
        .vf-corner.br::after { bottom: 0; right: 0; width: 2px; height: 100%; }
        .vf-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 100%;
          min-height: 0;
          flex: 1;
          padding: 30px;
          transition: background 0.2s;
          cursor: default;
        }
        .vf-dropzone.drag-active {
          background: rgba(255, 100, 0, 0.1);
        }
        .vf-drop-icon {
          width: 56px; height: 56px;
          color: var(--fire-orange);
          opacity: 0.7;
          margin-bottom: 4px;
        }
        .vf-drop-title {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 2px;
          color: var(--text-primary);
        }
        .vf-drop-sub {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 1px;
        }
        .vf-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        .vf-btn {
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 1px;
          padding: 8px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vf-btn.primary {
          background: linear-gradient(135deg, var(--fire-red), var(--fire-orange));
          color: #fff;
          box-shadow: 0 4px 16px rgba(255, 80, 0, 0.35);
        }
        .vf-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(255, 80, 0, 0.5);
        }
        .vf-btn.secondary {
          background: var(--glass-bg);
          color: var(--fire-amber);
          border: 1px solid var(--glass-border);
        }
        .vf-btn.secondary:hover {
          background: rgba(255, 120, 0, 0.12);
          border-color: var(--fire-amber);
        }
        .vf-progress-row {
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-top: 1px solid var(--glass-border);
        }
        .vf-progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 80, 0, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }
        .vf-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--fire-red), var(--fire-orange), var(--fire-amber));
          border-radius: 2px;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px rgba(255, 150, 0, 0.6);
        }
        .vf-progress-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}