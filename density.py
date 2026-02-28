class DensityAnalyzer:
    def calculate_density(self, boxes, frame_shape):
        height, width, _ = frame_shape

        zones = {
            "top_left": 0,
            "top_right": 0,
            "bottom_left": 0,
            "bottom_right": 0
        }

        for box in boxes:
            x1, y1, x2, y2 = box
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2

            if center_x < width/2 and center_y < height/2:
                zones["top_left"] += 1
            elif center_x >= width/2 and center_y < height/2:
                zones["top_right"] += 1
            elif center_x < width/2 and center_y >= height/2:
                zones["bottom_left"] += 1
            else:
                zones["bottom_right"] += 1

        total_people = len(boxes)

        return total_people, zones