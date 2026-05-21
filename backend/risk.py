class RiskAnalyzer:
    def __init__(self):
        # Set to None so we can identify the very first frame
        self.previous_count = None

    def calculate_risk(self, total_people, zones):
        max_zone_density = max(zones.values()) if zones else 0
        
        # Fix the initial growth spike
        if self.previous_count is None:
            growth = 0
        else:
            growth = total_people - self.previous_count
            
        self.previous_count = total_people

        # Calculate the risk score
        risk_score = (0.5 * total_people) + \
                     (0.3 * max_zone_density) + \
                     (0.2 * growth)

        # Adjusted realistic thresholds
        if risk_score < 20:        # Increased from 10
            return "Low"
        elif risk_score < 50:      # Increased from 25
            return "Medium"
        else:
            return "High"