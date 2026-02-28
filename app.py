import streamlit as st
import cv2
import numpy as np
import pandas as pd
from datetime import datetime
import time

from detector import CrowdDetector
from density import DensityAnalyzer
from risk import RiskAnalyzer
from predictor import DensityPredictor

# ---------------- PAGE CONFIG ----------------
st.set_page_config(layout="wide")
st.title("CrowdSafe — Predictive Crowd Risk Analytics System")

# ---------------- SIDEBAR ----------------
st.sidebar.header("Configuration Panel")

rolling_window = st.sidebar.slider("Rolling Average Window", 3, 30, 5)
forecast_window = st.sidebar.slider("Forecast Lookback Frames", 3, 20, 5)

view_mode = st.sidebar.radio(
    "Navigation",
    ["Monitoring", "Analytics", "Logs"]
)

# ---------------- INITIALIZE MODULES ----------------
detector = CrowdDetector()
density_analyzer = DensityAnalyzer()
risk_analyzer = RiskAnalyzer()
predictor = DensityPredictor(lookback_window=forecast_window)

video_file = st.file_uploader("Upload Crowd Video", type=["mp4", "avi", "mov"])

if video_file:

    with open("temp_video.mp4", "wb") as f:
        f.write(video_file.read())

    cap = cv2.VideoCapture("temp_video.mp4")

    density_history = []
    growth_history = []
    timestamps = []
    logs = []
    frame_count = 0

    # Static layout containers (prevents scrolling effect)
    video_col, metrics_col = st.columns([3, 1])
    frame_placeholder = video_col.empty()
    metrics_placeholder = metrics_col.empty()
    analytics_container = st.container()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        timestamp = datetime.now().strftime("%H:%M:%S")

        # ----- Core Detection -----
        boxes = detector.detect_people(frame)
        total_people, zones = density_analyzer.calculate_density(boxes, frame.shape)
        risk_level = risk_analyzer.calculate_risk(total_people, zones)

        # ----- Growth -----
        if density_history:
            growth = total_people - density_history[-1]
        else:
            growth = 0

        density_history.append(total_people)
        growth_history.append(growth)
        timestamps.append(timestamp)

        # ----- Prediction (Separate Module) -----
        predicted_next = predictor.predict_next(density_history)

        if predicted_next is not None:
            if predicted_next < 10:
                forecast_risk = "Low"
            elif predicted_next < 25:
                forecast_risk = "Medium"
            else:
                forecast_risk = "High"
        else:
            forecast_risk = "Insufficient Data"

        # ----- Logging -----
        if risk_level == "High":
            logs.append(f"[{timestamp}] High risk detected")

        # ----- Draw Detection -----
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 140, 0), 2)

        h, w, _ = frame.shape
        cv2.line(frame, (w//2, 0), (w//2, h), (0, 170, 170), 2)
        cv2.line(frame, (0, h//2), (w, h//2), (0, 170, 170), 2)

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # ================= MONITORING =================
        if view_mode == "Monitoring":

            frame_placeholder.image(frame_rgb, use_container_width=True)

            with metrics_placeholder.container():
                st.subheader("Live Metrics")

                st.metric("Frame Count", frame_count)
                st.metric("Timestamp", timestamp)
                st.metric("People Count", total_people)
                st.metric("Growth Rate", growth)
                st.metric("Current Risk", risk_level)

                st.subheader("Next Frame Forecast")

                if predicted_next is not None:
                    st.metric("Predicted People Count", predicted_next)
                    st.metric("Predicted Risk Level", forecast_risk)
                else:
                    st.info("Collecting data for prediction...")

        # ================= ANALYTICS =================
        elif view_mode == "Analytics":

            df = pd.DataFrame({
                "People Count": density_history,
                "Growth Rate": growth_history
            })

            df["Rolling Avg"] = df["People Count"].rolling(
                window=rolling_window
            ).mean()

            with analytics_container:
                st.subheader("Density Trend with Rolling Average")
                st.line_chart(df)

                st.subheader("Zone-wise Distribution (Latest Frame)")
                zone_df = pd.DataFrame(
                    list(zones.items()),
                    columns=["Zone", "Count"]
                )
                st.bar_chart(zone_df.set_index("Zone"))

                st.subheader("Export Analytics Data")
                export_df = pd.DataFrame({
                    "Timestamp": timestamps,
                    "People Count": density_history,
                    "Growth Rate": growth_history
                })

                csv = export_df.to_csv(index=False).encode("utf-8")
                st.download_button(
                    "Download CSV",
                    csv,
                    "crowd_analytics.csv",
                    "text/csv"
                )

        # ================= LOGS =================
        elif view_mode == "Logs":
            st.subheader("Alert Logs")
            if logs:
                for log in logs[-20:]:
                    st.text(log)
            else:
                st.info("No alerts recorded.")

        time.sleep(0.03)

    cap.release()