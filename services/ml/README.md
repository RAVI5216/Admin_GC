# SmartBin Machine Learning Microservice

Python-based Natural Language Processing (NLP) microservice built with **scikit-learn** and **Flask** to categorize citizen and operator waste complaints, predict severity, recommend responsible municipal departments, and report academic evaluation metrics.

---

## 1. System Architecture

```
[ Frontend: React / Vite ]
         │
         ▼  HTTP POST /api/reports/classify
[ Backend: Node.js Express ]
         │
         ▼  HTTP POST /predict
[ Python ML Service: Flask + scikit-learn (Port 5001) ]
         │
         ├── 1. NLP Text Preprocessing (Tokenization, stopword filtering)
         ├── 2. Feature Extraction: TF-IDF (unigrams + bigrams)
         ├── 3. Classification: Multinomial Logistic Regression with Softmax
         └── 4. Smart Metadata: Severity Grading & Department Dispatch
```

---

## 2. Machine Learning Pipeline

### A. TF-IDF (Term Frequency — Inverse Document Frequency)
Converts raw text into numerical feature vectors that represent the importance of words in the complaint relative to the corpus:
$$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \log\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
- **N-gram Range:** `(1, 2)` (captures both single words like `"fire"`, `"smoke"` and phrases like `"dead dog"`, `"toxic chemical"`).
- **Sublinear TF:** Uses $1 + \log(\text{TF})$ to prevent frequent words from dominating feature weights.

### B. Multinomial Logistic Regression
Uses the Softmax function to compute probabilities across the 7 distinct complaint classes:
$$P(Y = k \mid X = x) = \frac{e^{\mathbf{w}_k^T x + b_k}}{\sum_{j=1}^{K} e^{\mathbf{w}_j^T x + b_j}}$$
- **Optimization Solver:** L-BFGS (Limited-memory Broyden–Fletcher–Goldfarb–Shanno).
- **Regularization:** $L_2$ penalty with $C = 8.0$.

---

## 3. Dataset Classes & Department Mapping

| # | Class Name | Severity | Responsible Department | Recommended Action |
|---|------------|----------|------------------------|--------------------|
| 0 | **Hazardous Waste** | Critical | Hazardous Materials Unit | Deploy hazmat team for containment and neutralization |
| 1 | **Vandalism & Fire Hazard** | Critical | Emergency & Maintenance Operations | Dispatch emergency unit to secure fire/electrical risk |
| 2 | **Dead Animal / Biohazard** | High | Sanitation & Animal Control | Immediate sanitary removal and area disinfection |
| 3 | **Overflowing Bin** | High | Waste Collection | Priority dispatch to empty bin and clear litter |
| 4 | **Odor & Pest Infestation** | Medium | Sanitation & Pest Control | Deep pressure wash and apply pest deterrent spray |
| 5 | **Illegal Dumping** | Medium | Municipal Enforcement & Heavy Haul | Deploy flatbed vehicle and log municipal violation |
| 6 | **Damaged Hardware** | Low | Hardware Maintenance | Schedule repair, sensor replacement, or calibration |

---

## 4. Evaluation Metrics (Academic Report)

- **Total Labelled Complaints:** 210 (30 per category)
- **Train/Test Split:** 80% Train (168 samples) / 20% Test (42 samples)
- **Test Set Accuracy:** **81.0%**
- **5-Fold Stratified Cross-Validation:** **77.14% (± 6.83%)**
- **Macro-Averaged F1-Score:** **81.0%**
- **Weighted-Averaged F1-Score:** **81.0%**

---

## 5. How to Run the Service

### Quick Start
```bash
cd smartbin-ml-service
# Activate virtual environment
source venv/bin/activate

# Retrain model and evaluate metrics
python train.py

# Start the Flask microservice (port 5001)
python app.py
```

### API Endpoints
- `GET /health` — Verifies service status and loaded model classes.
- `POST /predict` — Classifies input text and returns category, confidence, severity, department, and Softmax probabilities.
- `GET /metrics` — Returns cross-validation scores, classification report, and confusion matrix.
- `GET /categories` — Returns metadata for all 7 waste categories.
