import { useRef, useState, useCallback } from "react";
import { FrameResult, ProcessingState } from "../types";

const WS_URL = "ws://localhost:8000/ws/video";

interface UseWebSocketReturn {
  state: ProcessingState;
  connect: () => void;
  disconnect: () => void;
  sendVideoFile: (file: File) => Promise<void>;
  sendWebcamFrame: (blob: Blob) => void;
  latestFrame: FrameResult | null;
  error: string | null;
}

export function useWebSocket(
  onFrame: (data: FrameResult) => void,
  onDone?: () => void
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [latestFrame, setLatestFrame] = useState<FrameResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setState("processing");
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "done") {
          setState("done");
          onDone?.();
          return;
        }

        if (data.type === "error") {
          setError(data.message);
          setState("error");
          return;
        }

        setLatestFrame(data as FrameResult);
        onFrame(data as FrameResult);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed. Is the backend running?");
      setState("error");
    };

    ws.onclose = () => {
      if (state !== "done" && state !== "error") {
        setState("idle");
      }
    };
  }, [onFrame, onDone, state]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setState("idle");
  }, []);

  const sendVideoFile = useCallback(async (file: File) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 5000);
        const check = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      wsRef.current?.send(JSON.stringify({ type: "upload", data: base64 }));
    };
    reader.readAsDataURL(file);
  }, [connect]);

  const sendWebcamFrame = useCallback((blob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      wsRef.current?.send(JSON.stringify({ type: "webcam_frame", data: base64 }));
    };
    reader.readAsDataURL(blob);
  }, []);

  return {
    state,
    connect,
    disconnect,
    sendVideoFile,
    sendWebcamFrame,
    latestFrame,
    error,
  };
}