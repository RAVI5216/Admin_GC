# 🗑️ GarbageGuardian — Smart City IoT & Automated Waste Operations Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey.svg)](https://expressjs.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-yellow.svg)](https://www.python.org/)
[![Scikit--Learn](https://img.shields.io/badge/scikit--learn-1.3-orange.svg)](https://scikit-learn.org/)
[![AWS DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-4053D6.svg)](https://aws.amazon.com/dynamodb/)

**GarbageGuardian** is an enterprise-grade IoT fleet monitoring and municipal waste operations platform. It combines real-time sensor telemetry, automated citizen report triage powered by Machine Learning, intelligent collector task dispatch, and interactive city route mapping.

---

## 🏛️ Monorepo Architecture

The repository is organized into an npm workspace monorepo separating web applications, backend APIs, and ML microservices:

```text
Admin_GC/
├── package.json               # Root monorepo configuration with npm workspaces
├── .gitignore                 # Unified gitignore across all workspaces
├── README.md                  # Project overview & quickstart guide
├── docs/                      # 📚 System architecture & team documentation
│   ├── ARCHITECTURE.md        # Monorepo architecture & data flow diagrams
│   ├── GETTING_STARTED.md     # Step-by-step local setup guide
│   ├── TEAM_PROGRESS.md       # Engineering milestones & changelog
│   └── FULL_SESSION_CHANGELOG.md # Comprehensive engineering report
├── apps/
│   ├── web/                   # (@smartbin/web) React 18, Vite, Tailwind CSS, Recharts
│   └── api/                   # (@smartbin/api) Express, AWS DynamoDB, WebSockets
└── services/
    └── ml/                    # Python Flask + Scikit-Learn NLP Incident Classifier
```

---

## 🚀 Key Features

* **Real-Time IoT Fleet Monitoring:** Live ultrasonic distance sensors, fill percentages, internal temperature, humidity, gas levels, signal strength (RSSI), and battery voltage across municipal smart bins.
* **Smart Per-Device Telemetry Charts:** Area charts tracking live filling trends with automatic idle-state detection (`Steady {bin.fillLevel}% • No change in {time}`) when bins are offline or stable.
* **AI-Powered Incident Classification:** NLP microservice (TF-IDF + Logistic Regression) that classifies citizen hazard reports into 7 categories, assigning severity, confidence, and responsible department.
* **Event-Driven Lifecycle Notifications:** Deduplicated notification system tied to real municipal events (critical hazardous spills, collector task assignments, task completions) with "Mark All as Read", filter tabs, and 14-day auto-retention.
* **Interactive Live GPS Fleet Map:** Leaflet-powered GIS mapping displaying real-time smart bin coordinates, color-coded capacity halos, and collection routing.
* **Collector Task Management & Dispatch:** Seamless assignment of high-priority bin collections and citizen complaints to field employers.
* **Instant 0ms Page Navigation:** Client-side Stale-While-Revalidate (SWR) in-memory caching for instant page transitions without loading spinners or white flashes.
* **Global Error Boundary:** Resilient UI error handling preventing blank screens during unexpected runtime failures.

---

## ⚡ Quickstart Setup Guide

### 1. Prerequisites
* **Node.js** `v18.x` or `v20.x`
* **Python** `3.10+`
* **AWS Credentials** configured in `~/.aws/credentials` or environment variables with DynamoDB read/write permissions.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/RAVI5216/Admin_GC.git
cd Admin_GC

# Install Node workspace dependencies
npm install

# Set up Python ML virtual environment
cd services/ml
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 3. Running Services Locally

You can launch each service from the root directory:

```bash
# Terminal 1: Backend API (Port 5000)
npm run dev:api

# Terminal 2: Python ML Microservice (Port 5001)
npm run dev:ml

# Terminal 3: Web Admin Portal (Port 5173)
npm run dev:web
```

Once started, open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Root NPM Scripts

All commands can be run directly from the repository root:

| Command | Action |
| :--- | :--- |
| `npm run dev:web` | Start the Vite web portal dev server (`http://localhost:5173`) |
| `npm run dev:api` | Start the Express backend API server (`http://localhost:5000`) |
| `npm run dev:ml` | Start the Python ML microservice (`http://localhost:5001`) |
| `npm run test:web` | Execute the smart bin telemetry chart unit test suite (5/5 tests) |
| `npm run build:web` | Compile production Vite bundle for `@smartbin/web` |
| `npm run train:ml` | Retrain the scikit-learn NLP model on municipal datasets |

---

## 📡 Service Ports & API Endpoints

| Service | Port | Health Check | Primary Function |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `5173` | `/` | Responsive React Admin Portal |
| **Backend API** | `5000` | `/health` | REST API, WebSocket bridge, DynamoDB controller |
| **Python ML** | `5001` | `/health` | `/classify` (NLP complaint categorizer & urgency triage) |

---

## 🗄️ AWS DynamoDB Tables

* **`GarbageGuardianDashAdmin`**: Administrator credentials, event-driven alert notifications, and system incident logs.
* **`SmartBins`**: Real-time snapshot of telemetry hardware (fill levels, temperatures, battery, GPS coordinates).
* **`GarbageGuardianReports`**: Citizen complaints and hazard reports with AI classifications.
* **`GarbageGuardianTasks`**: Waste collection and maintenance jobs assigned to field workers.
* **`GarbageGuardianUsers`**: Registered staff and collection crew roster.

---

## 📖 Team Documentation

For detailed architectural workflows, data flows, and progress history, consult the `docs/` folder:

* 📐 [**System Architecture & Data Flow**](docs/ARCHITECTURE.md)
* 🚀 [**Team Setup & Getting Started Guide**](docs/GETTING_STARTED.md)
* 📋 [**Milestones & Engineering Progress Tracker**](docs/TEAM_PROGRESS.md)
* 📝 [**Full Engineering Changelog & Session Audit**](docs/FULL_SESSION_CHANGELOG.md)

---

## 👥 Contributors & Maintainers

* **GarbageGuardian Municipal Development Team**
* **Repository:** [https://github.com/RAVI5216/Admin_GC](https://github.com/RAVI5216/Admin_GC)
