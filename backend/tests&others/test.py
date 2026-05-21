import cv2
from ultralytics import YOLO

# Load YOLOv8 model
model = YOLO("yolov8n.pt")   # you can also use yolov8s.pt for better accuracy

# Read input image
image = cv2.imread("test.jpg")

# Run detection
results = model(image)

# Copy image for drawing
output = image.copy()

for result in results:
    for box in result.boxes:
        cls = int(box.cls[0])

        # Class 0 = person
        if cls == 0:
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # Draw bounding box
            cv2.rectangle(output, (x1, y1), (x2, y2), (0,255,0), 2)

# Draw grid lines (center cross)
h, w, _ = output.shape

cv2.line(output, (w//2, 0), (w//2, h), (0,255,255), 2)
cv2.line(output, (0, h//2), (w, h//2), (0,255,255), 2)

# Show output
cv2.imshow("Crowd Detection", output)
cv2.waitKey(0)
cv2.destroyAllWindows()

# Save result
cv2.imwrite("output.jpg", output)