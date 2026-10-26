#!/usr/bin/env python3
"""
SmartBin Python ML Microservice (Flask + scikit-learn)
=====================================================
REST API service providing NLP complaint categorization, severity grading,
department routing, and academic evaluation metrics.
Runs on port 5001 (configurable via ML_PORT env var).
"""

import os
import json
import re
import joblib
import numpy as np
from flask import Flask, request, jsonify

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'classifier_model.joblib')
METRICS_PATH = os.path.join(BASE_DIR, 'models', 'evaluation_metrics.json')

# Intelligent Metadata Map
CATEGORY_METADATA = {
    "Hazardous Waste": {
        "severity": "critical",
        "department": "Hazardous Materials Unit",
        "action": "Immediate hazmat deployment for chemical containment and safe neutralisation"
    },
    "Vandalism & Fire Hazard": {
        "severity": "critical",
        "department": "Emergency & Maintenance Operations",
        "action": "Dispatch emergency unit to contain fire hazard and inspect electrical safety"
    },
    "Dead Animal / Biohazard": {
        "severity": "high",
        "department": "Sanitation & Animal Control",
        "action": "Sanitary retrieval, biohazard containment, and antiseptic area wash"
    },
    "Overflowing Bin": {
        "severity": "high",
        "department": "Waste Collection",
        "action": "Priority waste collection run to empty bin and clear perimeter litter"
    },
    "Odor & Pest Infestation": {
        "severity": "medium",
        "department": "Sanitation & Pest Control",
        "action": "Deep pressure clean bin interior and apply anti-pest detergent spray"
    },
    "Illegal Dumping": {
        "severity": "medium",
        "department": "Municipal Enforcement & Heavy Haul",
        "action": "Deploy heavy flatbed vehicle, document site, and log municipal violation"
    },
    "Damaged Hardware": {
        "severity": "low",
        "department": "Hardware Maintenance",
        "action": "Schedule hardware repair, sensor calibration, or unit replacement"
    }
}

LOCATION_PATTERNS = [
    r'(?:near|at|by|beside|opposite|behind|front of|around|outside)\s+([A-Z0-9a-z\s]{3,35})(?:[,\.]|$)',
    r'(?:gate|building|wing|block|park|street|road|hall|canteen|lake|ground|hostel|campus)\s*([0-9A-Za-z\-]+)?'
]

app = Flask(__name__)

# Load model pipeline
pipeline = None
if os.path.exists(MODEL_PATH):
    try:
        pipeline = joblib.load(MODEL_PATH)
        print(f"[ML Service] Successfully loaded trained model from {MODEL_PATH}")
    except Exception as e:
        print(f"[ML Service] Error loading model: {e}")
else:
    print(f"[ML Service] WARNING: Model artifact not found at {MODEL_PATH}. Run train.py first.")

def extract_location(text, hint=""):
    if hint and hint.strip():
        return hint.strip()
    for pat in LOCATION_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m and m.group(1):
            return m.group(1).strip()
    return None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "SmartBin Python ML Classifier",
        "framework": "scikit-learn + Flask",
        "model_loaded": pipeline is not None,
        "classes": list(pipeline.classes_) if pipeline is not None else []
    })

@app.route('/predict', methods=['POST'])
def predict():
    if pipeline is None:
        return jsonify({"error": "Model pipeline is not loaded. Please train the model."}), 503

    payload = request.get_json(silent=True) or {}
    text = payload.get('text', '').strip()
    location_hint = payload.get('location', '')

    if not text:
        return jsonify({"error": "Field 'text' is required."}), 400

    # Get probabilities from Logistic Regression Softmax
    probabilities = pipeline.predict_proba([text])[0]
    classes = list(pipeline.classes_)
    best_idx = int(np.argmax(probabilities))
    predicted_category = classes[best_idx]
    confidence = float(probabilities[best_idx])

    meta = CATEGORY_METADATA.get(predicted_category, {
        "severity": "medium",
        "department": "Waste Collection",
        "action": "Inspect site and resolve reported issue"
    })

    extracted_loc = extract_location(text, location_hint)

    # Class probability distribution (top classes)
    distribution = [
        {"category": cls_name, "probability": round(float(prob), 4)}
        for cls_name, prob in sorted(zip(classes, probabilities), key=lambda x: x[1], reverse=True)
    ]

    return jsonify({
        "category": predicted_category,
        "severity": meta["severity"],
        "suggestedAction": meta["action"],
        "suggestedDepartment": meta["department"],
        "confidence": round(confidence, 3),
        "summary": f"{predicted_category} identified ({round(confidence * 100)}% confidence). Recommended action: {meta['action']}.",
        "extractedLocation": extracted_loc,
        "probabilities": distribution,
        "source": "python-scikit-learn"
    })

@app.route('/metrics', methods=['GET'])
def get_metrics():
    if not os.path.exists(METRICS_PATH):
        return jsonify({"error": "Evaluation metrics not found. Run train.py first."}), 404
    with open(METRICS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/categories', methods=['GET'])
def get_categories():
    return jsonify({
        "categories": CATEGORY_METADATA
    })

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"[ML Service] Starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
