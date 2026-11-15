from pathlib import Path

import nltk
from flask import Flask, jsonify
from nltk.sentiment import SentimentIntensityAnalyzer

nltk.data.path.insert(0, str(Path(__file__).resolve().parent))
analyzer = SentimentIntensityAnalyzer()
app = Flask(__name__)


@app.get("/")
@app.get("/health")
def health():
    return jsonify(status="OK")


@app.get("/analyze/<path:input_txt>")
def analyze_sentiment(input_txt):
    if len(input_txt) > 2000:
        return jsonify(error="Review must be 2000 characters or fewer."), 400
    score = analyzer.polarity_scores(input_txt)["compound"]
    sentiment = "positive" if score >= 0.05 else "negative" if score <= -0.05 else "neutral"
    return jsonify(sentiment=sentiment)
