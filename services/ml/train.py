#!/usr/bin/env python3
"""
Waste Complaint Classifier Training & Evaluation Script
======================================================
Machine Learning Pipeline for Academic AI Subject Demonstration:
- Feature Extraction: TF-IDF (Term Frequency - Inverse Document Frequency) with unigrams & bigrams
- Algorithm: Multi-class Logistic Regression with Softmax
- Evaluation: Stratified Train/Test Split, 5-Fold Cross Validation,
  Precision, Recall, F1-Score, and Confusion Matrix
"""

import json
import os
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'waste_complaints_dataset.json')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'classifier_model.joblib')
METRICS_PATH = os.path.join(MODELS_DIR, 'evaluation_metrics.json')

# Department and Severity Mapping for Intelligent Dispatch
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

def load_dataset(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    texts = [item['text'] for item in data]
    labels = [item['category'] for item in data]
    return texts, labels

def train_and_evaluate():
    os.makedirs(MODELS_DIR, exist_ok=True)
    print("=" * 70)
    print("  SMARTBIN AI: TF-IDF + LOGISTIC REGRESSION TRAINING PIPELINE")
    print("=" * 70)

    texts, labels = load_dataset(DATA_PATH)
    unique_labels = sorted(list(set(labels)))
    total_samples = len(texts)

    print(f"\n[1] Dataset Loaded:")
    print(f"    - Total Samples: {total_samples}")
    print(f"    - Number of Classes: {len(unique_labels)}")
    for lbl in unique_labels:
        count = labels.count(lbl)
        print(f"      * {lbl:<26}: {count} samples")

    # Stratified Train/Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=42, stratify=labels
    )
    print(f"\n[2] Data Split: {len(X_train)} Train samples, {len(X_test)} Test samples")

    # Create Scikit-Learn Pipeline
    # 1. TF-IDF Vectorizer with unigrams + bigrams and sublinear term frequency
    # 2. Logistic Regression with L2 regularization
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            sublinear_tf=True,
            min_df=1,
            max_features=3000
        )),
        ('clf', LogisticRegression(
            C=8.0,
            max_iter=1000,
            random_state=42,
            solver='lbfgs'
        ))
    ])

    # 5-Fold Stratified Cross Validation
    print("\n[3] Running 5-Fold Stratified Cross-Validation on Dataset...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, texts, labels, cv=cv, scoring='accuracy')
    mean_cv = float(np.mean(cv_scores))
    std_cv = float(np.std(cv_scores))
    print(f"    - Fold Accuracies: {[round(s, 4) for s in cv_scores]}")
    print(f"    - Mean CV Accuracy: {mean_cv * 100:.2f}% (+/- {std_cv * 100:.2f}%)")

    # Train on Full Train Split
    print("\n[4] Training Pipeline on Training Split...")
    pipeline.fit(X_train, y_train)

    # Evaluate on Test Split
    print("\n[5] Evaluating on Unseen Test Split...")
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    test_accuracy = float(accuracy_score(y_test, y_pred))
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro', zero_division=0)
    p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)

    # Detailed Classification Report
    clf_report = classification_report(y_test, y_pred, target_names=unique_labels, output_dict=True, zero_division=0)
    text_report = classification_report(y_test, y_pred, target_names=unique_labels, zero_division=0)
    print("\nClassification Report:\n")
    print(text_report)

    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred, labels=unique_labels)
    cm_list = cm.tolist()

    print("Confusion Matrix:")
    print(f"{'':<28} " + " ".join([f"[{i}]" for i in range(len(unique_labels))]))
    for i, row in enumerate(cm):
        row_str = " ".join([f"{val:^3}" for val in row])
        print(f"[{i}] {unique_labels[i]:<25}: {row_str}")

    # Retrain on 100% of the dataset for the final deployable model
    print("\n[6] Fitting Final Model on 100% of Dataset for Production Service...")
    final_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            sublinear_tf=True,
            min_df=1,
            max_features=3000
        )),
        ('clf', LogisticRegression(
            C=8.0,
            max_iter=1000,
            random_state=42,
            solver='lbfgs'
        ))
    ])
    final_pipeline.fit(texts, labels)

    # Save Model Artifact
    joblib.dump(final_pipeline, MODEL_PATH)
    print(f"    ✓ Model artifact saved to: {MODEL_PATH}")

    # Package Metrics for Dashboard and Presentation
    evaluation_payload = {
        "model_name": "TF-IDF + Logistic Regression",
        "algorithm": "Multinomial Logistic Regression with Softmax",
        "feature_extractor": "TF-IDF (unigrams + bigrams, sublinear_tf)",
        "total_training_samples": total_samples,
        "num_classes": len(unique_labels),
        "classes": unique_labels,
        "metrics": {
            "test_accuracy": round(test_accuracy, 4),
            "macro_precision": round(float(p_macro), 4),
            "macro_recall": round(float(r_macro), 4),
            "macro_f1": round(float(f1_macro), 4),
            "weighted_f1": round(float(f1_weight), 4),
            "cross_validation": {
                "n_splits": 5,
                "fold_scores": [round(float(s), 4) for s in cv_scores],
                "mean_accuracy": round(mean_cv, 4),
                "std_deviation": round(std_cv, 4)
            }
        },
        "per_class_metrics": {
            lbl: {
                "precision": round(clf_report[lbl]['precision'], 3),
                "recall": round(clf_report[lbl]['recall'], 3),
                "f1_score": round(clf_report[lbl]['f1-score'], 3),
                "support": int(clf_report[lbl]['support']),
                "department": CATEGORY_METADATA.get(lbl, {}).get("department", "General"),
                "severity": CATEGORY_METADATA.get(lbl, {}).get("severity", "medium")
            }
            for lbl in unique_labels
        },
        "confusion_matrix": {
            "labels": unique_labels,
            "matrix": cm_list
        }
    }

    with open(METRICS_PATH, 'w', encoding='utf-8') as f:
        json.dump(evaluation_payload, f, indent=2)
    print(f"    ✓ Evaluation metrics saved to: {METRICS_PATH}")
    print("\n" + "=" * 70)
    print("  TRAINING & EVALUATION COMPLETE")
    print("=" * 70)

if __name__ == '__main__':
    train_and_evaluate()
