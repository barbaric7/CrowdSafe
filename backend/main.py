import cv2
from detector import CrowdDetector
from density import DensityAnalyzer
from risk import RiskAnalyzer

# Initialize modules
detector = CrowdDetector()
density_analyzer = DensityAnalyzer()
risk_analyzer = RiskAnalyzer()

# Load image
image_path = "test.jpg"   # Change image name if needed
frame = cv2.imread(image_path)

if frame is None:
    print("Error: Image not found.")
    exit()

# Detect people
boxes = detector.detect_people(frame)

# Calculate density
total_people, zones = density_analyzer.calculate_density(boxes, frame.shape)

# Calculate risk
risk_level = risk_analyzer.calculate_risk(total_people, zones)

# Draw bounding boxes
for box in boxes:
    x1, y1, x2, y2 = map(int, box)
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

# Draw zone division lines
height, width, _ = frame.shape
cv2.line(frame, (width//2, 0), (width//2, height), (255, 255, 0), 2)
cv2.line(frame, (0, height//2), (width, height//2), (255, 255, 0), 2)

# Display total people count
cv2.putText(frame, f"People: {total_people}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            2)

# Dynamic risk color
if risk_level == "Low":
    risk_color = (0, 255, 0)
elif risk_level == "Medium":
    risk_color = (0, 255, 255)
else:
    risk_color = (0, 0, 255)

cv2.putText(frame, f"Risk: {risk_level}",
            (20, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            risk_color,
            3)

# Display zone counts
y_offset = 120
for zone, count in zones.items():
    cv2.putText(frame,
                f"{zone}: {count}",
                (20, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2)
    y_offset += 30

# Show window
cv2.imshow("CrowdSafe - Vision-Based Crowd Risk System", frame)
cv2.waitKey(0)
cv2.destroyAllWindows()