import asyncio
import base64
import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
from datetime import datetime

from detector import CrowdDetector
from density import DensityAnalyzer
from risk import RiskAnalyzer
from predictor import DensityPredictor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models once at startup
detector = CrowdDetector()
density_analyzer = DensityAnalyzer()
risk_analyzer = RiskAnalyzer()
predictor = DensityPredictor(lookback_window=5)

density_history = []
growth_history = []
timestamps = []


def process_frame(frame: np.ndarray) -> dict:
    """Run detection pipeline on a single frame, return annotated frame + metrics."""
    global density_history, growth_history, timestamps

    boxes = detector.detect_people(frame)
    total_people, zones = density_analyzer.calculate_density(boxes, frame.shape)
    risk_level = risk_analyzer.calculate_risk(total_people, zones)

    growth = total_people - density_history[-1] if density_history else 0
    density_history.append(total_people)
    growth_history.append(growth)
    timestamps.append(datetime.now().strftime("%H:%M:%S"))

    # Keep history bounded
    MAX_HISTORY = 100
    if len(density_history) > MAX_HISTORY:
        density_history = density_history[-MAX_HISTORY:]
        growth_history = growth_history[-MAX_HISTORY:]
        timestamps = timestamps[-MAX_HISTORY:]

    predicted_next = predictor.predict_next(density_history)

    # Draw bounding boxes on frame
    for box in boxes:
        x1, y1, x2, y2 = map(int, box)
        color = (0, 80, 255) if risk_level == "High" else (0, 200, 100) if risk_level == "Low" else (0, 165, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.rectangle(frame, (x1, y1 - 18), (x1 + 50, y1), color, -1)
        cv2.putText(frame, "person", (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    # Overlay HUD
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (320, 60), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)

    risk_color = (0, 80, 255) if risk_level == "High" else (0, 200, 100) if risk_level == "Low" else (0, 165, 255)
    cv2.putText(frame, f"COUNT: {total_people}  |  RISK: {risk_level.upper()}",
                (12, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.8, risk_color, 2)

    # Encode frame to base64 JPEG
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    frame_b64 = base64.b64encode(buffer).decode("utf-8")

    return {
        "frame": frame_b64,
        "total_people": total_people,
        "risk_level": risk_level,
        "zones": zones,
        "growth": growth,
        "predicted_next": predicted_next,
        "density_history": density_history[-30:],
        "growth_history": growth_history[-30:],
        "timestamps": timestamps[-30:],
        "timestamp": datetime.now().strftime("%H:%M:%S"),
    }


@app.post("/reset")
async def reset_history():
    """Reset session history."""
    global density_history, growth_history, timestamps
    density_history = []
    growth_history = []
    timestamps = []
    density_analyzer.__init__()
    risk_analyzer.__init__()
    return {"status": "reset"}


@app.websocket("/ws/video")
async def video_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for video file processing.
    Client sends: { "type": "upload", "data": "<base64 video>" }
    Server streams back per-frame analytics.
    """
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "upload":
                # Decode and save video to temp file
                video_data = base64.b64decode(msg["data"])
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp.write(video_data)
                    tmp_path = tmp.name

                # Reset history for new video
                global density_history, growth_history, timestamps
                density_history = []
                growth_history = []
                timestamps = []
                density_analyzer.__init__()
                risk_analyzer.__init__()

                cap = cv2.VideoCapture(tmp_path)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = int(cap.get(cv2.CAP_PROP_FPS)) or 25
                frame_delay = 1.0 / fps

                frame_count = 0
                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break

                    frame_count += 1
                    result = process_frame(frame)
                    result["frame_count"] = frame_count
                    result["total_frames"] = total_frames
                    result["progress"] = round(frame_count / total_frames * 100, 1)

                    await websocket.send_text(json.dumps(result))
                    await asyncio.sleep(frame_delay * 0.5)  # ~2x speed

                cap.release()
                os.unlink(tmp_path)

                await websocket.send_text(json.dumps({"type": "done"}))

            elif msg.get("type") == "webcam_frame":
                # Handle live webcam frame
                frame_data = base64.b64decode(msg["data"])
                nparr = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is not None:
                    result = process_frame(frame)
                    result["type"] = "webcam_result"
                    await websocket.send_text(json.dumps(result))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass


@app.get("/health")
async def health():
    return {"status": "ok", "models": "loaded"}