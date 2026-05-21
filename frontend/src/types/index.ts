export type RiskLevel = "Low" | "Medium" | "High";

export interface ZoneData {
  top_left: number;
  top_right: number;
  bottom_left: number;
  bottom_right: number;
}

export interface FrameResult {
  type?: string;
  frame: string;
  total_people: number;
  risk_level: RiskLevel;
  zones: ZoneData;
  growth: number;
  predicted_next: number | null;
  density_history: number[];
  growth_history: number[];
  timestamps: string[];
  timestamp: string;
  frame_count?: number;
  total_frames?: number;
  progress?: number;
}

export interface AlertEntry {
  id: string;
  timestamp: string;
  message: string;
  risk_level: RiskLevel;
  count: number;
}

export type InputMode = "idle" | "video" | "webcam";
export type ProcessingState = "idle" | "connecting" | "processing" | "done" | "error";