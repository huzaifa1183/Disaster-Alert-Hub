import re
from difflib import SequenceMatcher

HAZARDS = {
    "Flood": ("flood", "waterlogging", "inundat", "river overflow"),
    "Heavy Rain": ("heavy rain", "downpour", "cloudburst", "rainfall"),
    "Cyclone": ("cyclone", "tropical storm"),
    "Thunderstorm": ("thunderstorm", "thunder", "storm"),
    "Heatwave": ("heatwave", "heat wave", "extreme heat", "hot conditions"),
    "Lightning": ("lightning", "thunderbolt"),
    "Earthquake": ("earthquake", "tremor", "shaking"),
    "Landslide": ("landslide", "mudslide", "slope collapse"),
    "Tsunami": ("tsunami", "coastal wave"),
    "Strong Winds": ("strong wind", "gust", "wind damage"),
}
LOCATIONS = (
    "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Guwahati", "Jaipur",
    "Puri", "Bhopal", "Lucknow", "Patna", "Hyderabad", "Gangtok", "Srinagar",
    "Visakhapatnam", "Ahmedabad", "Panaji", "Manali", "Dehradun", "Raipur",
)
URGENT_TERMS = ("trapped", "collapsed", "evacuate", "severe", "critical", "people injured", "rapidly rising")
SUSPICIOUS_TERMS = ("guaranteed miracle", "send money", "forward this everywhere", "100% confirmed")


class DemoClassifier:
    """Transparent keyword baseline; output is a suggestion for human review only."""

    def __init__(self):
        self.recent_texts = []

    def classify(self, text: str, supplied_location: str = "") -> dict:
        cleaned = re.sub(r"\s+", " ", re.sub(r"https?://\S+|www\.\S+", " ", text.lower())).strip()
        scores = {
            event: sum(1 for keyword in keywords if keyword in cleaned)
            for event, keywords in HAZARDS.items()
        }
        event, matches = max(scores.items(), key=lambda item: item[1])
        if matches == 0:
            event = "Unknown"

        location = supplied_location.strip()
        if not location:
            location = next((name for name in LOCATIONS if re.search(rf"\b{re.escape(name)}\b", text, re.I)), "Unknown")

        urgent = any(term in cleaned for term in URGENT_TERMS)
        severity = "High" if urgent else "Medium" if matches and location != "Unknown" else "Low"
        confidence = min(0.94, 0.38 + 0.13 * matches + 0.12 * (location != "Unknown") + 0.05 * (len(cleaned) > 100))
        duplicate = any(SequenceMatcher(None, cleaned, previous).ratio() >= 0.84 for previous in self.recent_texts[-100:])
        suspicious = duplicate or any(term in cleaned for term in SUSPICIOUS_TERMS) or len(cleaned) < 20
        self.recent_texts.append(cleaned)
        self.recent_texts = self.recent_texts[-100:]
        date_match = re.search(r"\b(?:today|tomorrow|yesterday|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b", text, re.I)

        return {
            "event": event,
            "location": location,
            "severity": severity,
            "confidence": round(confidence, 2),
            "duplicate": duplicate,
            "suspicious": suspicious,
            "verificationRequired": True,
            "extractedDate": date_match.group(0) if date_match else None,
            "method": "transparent-rule-demo",
        }