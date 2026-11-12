import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.classifier import DemoClassifier

app = FastAPI(title="Disaster Alert Hub Classifier", version="1.0.0")
classifier = DemoClassifier()


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=10, max_length=4000)
    location: str = Field(default="", max_length=120)


@app.get("/health")
def health():
    enabled = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
    return {"status": "ok", "mode": "heuristic-demo" if enabled else "disabled"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    if os.getenv("USE_MOCK_DATA", "false").lower() != "true":
        raise HTTPException(status_code=503, detail="The heuristic classifier is disabled unless USE_MOCK_DATA=true.")
    return classifier.classify(payload.text, payload.location)