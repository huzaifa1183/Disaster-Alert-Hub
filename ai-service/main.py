from fastapi import FastAPI
from pydantic import BaseModel, Field

from services.classifier import DemoClassifier

app = FastAPI(title="Disaster Alert Hub Demo Classifier", version="1.0.0")
classifier = DemoClassifier()


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=10, max_length=4000)
    location: str = Field(default="", max_length=120)


@app.get("/health")
def health():
    return {"status": "ok", "mode": "heuristic-demo"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    return classifier.classify(payload.text, payload.location)