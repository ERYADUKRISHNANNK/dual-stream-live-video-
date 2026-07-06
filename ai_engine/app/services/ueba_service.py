import math

class UEBAService:
    def __init__(self):
        # Known baseline centroids for biometrics or telemetry thresholds
        # Standard keystroke hold time average is ~80ms-120ms, mouse trajectory jitter
        self.device_weights = {
            "is_known_device": 35,
            "is_known_ip": 25,
            "is_known_location": 20,
            "is_known_browser": 20
        }

    def calculate_travel_velocity(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        # Haversine formula to compute distance in km
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        return distance

    def evaluate_behavior(
        self,
        telemetry: dict
    ) -> dict:
        """
        Expects:
        {
            "username": str,
            "ip": str,
            "location": {"lat": float, "lon": float, "country": str},
            "device": {"os": str, "browser": str, "fingerprint": str},
            "previous_login": {"lat": float, "lon": float, "timestamp": int},
            "session_concurrent": int,
            "downloads_last_hour": int,
            "biometrics": {
                "keystroke_average_hold_ms": float,
                "mouse_jitter_index": float
            }
        }
        """
        risk_score = 0
        reasons = []

        # 1. Impossible Travel Logic
        prev_login = telemetry.get("previous_login")
        curr_loc = telemetry.get("location")
        if prev_login and curr_loc:
            distance = self.calculate_travel_velocity(
                prev_login.get("lat", 0.0), prev_login.get("lon", 0.0),
                curr_loc.get("lat", 0.0), curr_loc.get("lon", 0.0)
            )
            time_diff_hours = (telemetry.get("timestamp", 0) - prev_login.get("timestamp", 0)) / 3600.0
            
            if time_diff_hours > 0.0:
                velocity = distance / time_diff_hours
                # If velocity is greater than commercial flight speeds (e.g. 900 km/h)
                if velocity > 900.0 and distance > 100.0:
                    risk_score += 45
                    reasons.append(f"Impossible Travel Detected: {round(velocity, 1)} km/h velocity between logins")

        # 2. Device Fingerprint Integrity
        device_trust = 100
        device_metrics = telemetry.get("device_trust_metrics", {})
        for metric, weight in self.device_weights.items():
            if not device_metrics.get(metric, True):
                device_trust -= weight
                risk_score += int(weight * 0.5)
                reasons.append(f"Unverified ingress telemetry: {metric.replace('is_', '')}")
        
        # 3. Abnormal Downloads (Insider Threat)
        downloads = telemetry.get("downloads_last_hour", 0)
        if downloads > 50:
            risk_score += 40
            reasons.append(f"High-frequency file downloads ({downloads} in last hour) - Threat: Data Exfiltration")
        elif downloads > 20:
            risk_score += 15
            reasons.append(f"Elevated file download count ({downloads} in last hour)")

        # 4. Session Concurrency
        concurrency = telemetry.get("session_concurrent", 1)
        if concurrency > 3:
            risk_score += 35
            reasons.append(f"High concurrent active sessions ({concurrency}) - Suspicious Login Concurrency")
        elif concurrency > 1:
            risk_score += 10

        # 5. Behavioral Biometrics Verification
        # Let's check key dynamics and mouse dynamics compared to user base profile
        biometrics = telemetry.get("biometrics", {})
        keystroke_hold = biometrics.get("keystroke_average_hold_ms", 100.0)
        mouse_jitter = biometrics.get("mouse_jitter_index", 1.0)

        # Baseline profiles simulated: keystroke hold range [75ms - 135ms], jitter [0.1 - 2.5]
        if keystroke_hold < 60.0 or keystroke_hold > 180.0:
            risk_score += 20
            reasons.append("Behavioral Biometrics Anomaly: Typing cadence deviates from registered profile")
        if mouse_jitter > 4.5:
            risk_score += 15
            reasons.append("Behavioral Biometrics Anomaly: Erratic cursor tracking movements")

        # Normalize score
        risk_score = min(risk_score, 100)
        
        # Action determination
        if risk_score >= 70:
            action = "REQUIRE_MFA_CHALLENGE"
            security_posture = "CRITICAL"
        elif risk_score >= 40:
            action = "ALERT_AND_MONITOR"
            security_posture = "WARNING"
        else:
            action = "ALLOW"
            security_posture = "SECURE"

        return {
            "username": telemetry.get("username", "anonymous"),
            "risk_score": risk_score,
            "device_trust_score": device_trust,
            "security_posture": security_posture,
            "reasons": reasons,
            "action": action,
            "timestamp": telemetry.get("timestamp")
        }
