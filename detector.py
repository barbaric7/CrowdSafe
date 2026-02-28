from ultralytics import YOLO

class CrowdDetector:
    def __init__(self, model_path="yolov8n.pt"):
        self.model = YOLO(model_path)

    def detect_people(self, frame):
        results = self.model(frame)
        people_boxes = []

        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                if self.model.names[cls] == "person":
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    people_boxes.append([x1, y1, x2, y2])

        return people_boxes