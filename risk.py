class RiskAnalyzer:
    def __init__(self):
        self.previous_count = 0

    def calculate_risk(self, total_people, zones):
        max_zone_density = max(zones.values())
        growth = total_people - self.previous_count
        self.previous_count = total_people

        risk_score = (0.5 * total_people) + \
                     (0.3 * max_zone_density) + \
                     (0.2 * growth)

        if risk_score < 10:
            return "Low"
        elif risk_score < 25:
            return "Medium"
        else:
            return "High"