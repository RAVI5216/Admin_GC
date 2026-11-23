# 🎓 Faculty Project Evaluation & Execution Guide
## GarbageGuardian — Smart City IoT & Automated Waste Operations Platform

Welcome! This guide is prepared specifically to help you set up, execute, and evaluate the **GarbageGuardian** monorepo on your local machine quickly and seamlessly.

---

## 📌 1. Project Overview & Architecture

**GarbageGuardian** is an enterprise-grade IoT fleet monitoring and municipal waste operations platform. It integrates IoT telemetry, automated citizen report triage powered by Machine Learning, and field task dispatch into a single unified monorepo.

### Monorepo Architecture:
* **Frontend (`apps/web`)**: Modern React 18, Vite, TypeScript, Tailwind CSS, Recharts, and Leaflet interactive GIS mapping.
* **Backend API (`apps/api`)**: Node.js & Express REST API, Socket.IO real-time bi-directional events, and AWS DynamoDB database integration.
* **ML Microservice (`services/ml`)**: Python Flask microservice using scikit-learn (TF-IDF + Softmax Logistic Regression) for citizen hazard report classification, priority grading, and automated municipal department routing.
* **Cloud Database**: AWS DynamoDB (`ap-southeast-2`) storing fleet telemetry, reports, tasks, staff, and admin accounts.

```text
GarbageGuardian Monorepo
├── apps/
│   ├── web/               # React 18 + Vite Frontend Portal (Port 5173)
│   └── api/               # Express + Socket.IO Backend API (Port 5000)
├── services/
│   └── ml/                # Python Flask + Scikit-Learn Service (Port 5001)
├── scripts/
│   ├── run_for_faculty.sh # Automated launcher for Linux / macOS
│   └── run_for_faculty.bat# Automated launcher for Windows
├── docs/                  # Architecture & engineering documentation
│   └── FACULTY_RUN_GUIDE.md # This evaluation guide
└── package.json           # Root npm workspaces script runner
```

---

## 💻 2. System Tech Stack & Prerequisites

The launcher scripts (**`scripts/run_for_faculty.sh`** and **`scripts/run_for_faculty.bat`**) automatically inspect your laptop for required tools and can install or assist you with any missing components:
* **Node.js** (`v18.x` or `v20.x`) & **npm** (`v9+` or `v10+`)
* **Python 3** (`3.10+`) with `pip` & `venv`
* **AWS CLI** *(Optional — the project connects directly to DynamoDB via configured IAM keys in `.env`)*
* **AWS Credentials**: AWS IAM access keys with DynamoDB permissions (provided in your evaluation document/PDF).

---

## ⚡ 3. Quickstart: 1-Click Automated Setup (Recommended)

To make evaluation as simple as possible, an automated startup script is provided in the `scripts/` directory that takes care of everything (checking dependencies, setting up AWS credentials, installing packages, and booting all 3 services):

### On macOS / Linux:
```bash
git clone https://github.com/RAVI5216/Admin_GC.git
cd Admin_GC

# Run the automated launcher:
./scripts/run_for_faculty.sh
```

### On Windows (CMD / PowerShell):
```cmd
git clone https://github.com/RAVI5216/Admin_GC.git
cd Admin_GC

REM Run the automated launcher:
scripts\run_for_faculty.bat
```

> **🔑 AWS Credentials Prompt**:  
> When the launcher runs, it will interactively prompt you to enter the **AWS Access Key ID** and **AWS Secret Access Key** (provided separately in your project evaluation PDF / documentation). The script automatically saves them to your local `.env` and bypasses the 2FA OTP email step for evaluation convenience. On future runs, it will remember your credentials.

---

## 🛠️ 4. Manual Step-by-Step Setup (Alternative)

If you prefer to set up and inspect each component manually:

### Step 1: Install Node Dependencies
From the repository root:
```bash
npm install
```

### Step 2: Setup Python ML Microservice
```bash
cd services/ml
python3 -m venv venv
source venv/bin/activate    # On Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ../..
```

### Step 3: Configure Environment Files
1. Copy `apps/api/.env.example` to `apps/api/.env`:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
   Add your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Ensure `DISABLE_EMAIL_OTP=true` is set.
2. Ensure `apps/web/.env` contains `VITE_API_URL=http://localhost:5000`.

### Step 4: Run Services
```bash
npm run dev
```

You can run all services using **one single command** or by launching them in **separate terminal tabs**.

### Option A: One-Command Startup (Recommended)
From the repository root:
```bash
npm run dev
```
*(This uses `concurrently` to start the Web Portal, Express API, and Python ML service simultaneously).*

---

### Option B: Dedicated Terminal Windows (Recommended for Debugging)

If you prefer to inspect logs for each service individually:

* **Terminal 1 — Express Backend API (Port 5000)**:
  ```bash
  npm run dev:api
  ```
* **Terminal 2 — Python ML Microservice (Port 5001)**:
  ```bash
  npm run dev:ml
  ```

* **Terminal 3 — React Web Portal (Port 5173)**:
  ```bash
  npm run dev:web
  ```

---

## 🌐 5. Service Endpoints & Health Verification

Once launched, verify each service is responsive:

| Service | Local URL | Health Endpoint | Expected Status |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | [http://localhost:5173](http://localhost:5173) | `/` | Web application loads |
| **Backend API** | [http://localhost:5000](http://localhost:5000) | `http://localhost:5000/health` | `{"status":"ok", ...}` |
| **Python ML Microservice** | [http://localhost:5001](http://localhost:5001) | `http://localhost:5001/health` | `{"status":"healthy", "model_loaded":true}` |

---

## 🔑 6. Login & Administrator Access

1. Open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**
2. Enter the administrator credentials:
   * **Email**: *(Provided in submission or see project `.env`)*
   * **Password**: *(Provided in submission)*
3. **If 2FA OTP is prompted**:
   * If `DISABLE_EMAIL_OTP=true` is enabled in `apps/api/.env`, OTP verification is bypassed automatically.
   * If `DEV_OTP_CODE` is set, enter `123456` in the verification field.
   * Or check your inbox for the 6-digit code if your SMTP configuration is active.

*(Optional: To create a fresh test admin account in DynamoDB, you can run: `npm run seed-admin --workspace=@smartbin/api` with `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` defined in `apps/api/.env`)*.

---

## 🧭 7. Evaluation & Guided Feature Tour

Here is a recommended walk-through path to evaluate the primary modules:

### 1. 📊 Executive Dashboard (`/`)
* **Overview KPI Cards**: Live bin statuses, fleet occupancy percentage, active reports, and dispatched tasks.
* **Real-time Telemetry Charts**: Fill level trends over time, automatic idle-state detection (`Steady {bin.fillLevel}% • No change in {time}`).

### 2. 🗺️ Live GPS Fleet Map (`/map`)
* Interactive GIS Leaflet map displaying real-time smart bin coordinates.
* Color-coded status halos (green for normal, amber for warning, red for critical/overflow).
* Dynamic marker popups showing battery voltage, RSSI signal strength, and fill levels.

### 3. 🗑️ Smart Bins Fleet Manager (`/bins`)
* Tabular and grid views of municipal smart bin units.
* Detail view for each bin displaying multi-sensor telemetry (temperature, humidity, gas levels, ultrasonic distance).

### 4. 🧠 Citizen Reports & AI Incident Classifier (`/reports`)
* View incoming citizen hazard reports.
* **AI NLP Classification in action**: Displays category, priority/urgency classification, model confidence percentage, and recommended municipal department assigned by the Python scikit-learn microservice.

### 5. 📋 Task Dispatch & Field Operations (`/tasks`)
* Create, manage, and dispatch waste collection and hazard containment tasks to municipal workers.
* Dynamic status updates (Assigned, In Progress, Resolved).

### 6. 👷 Employer & Field Crew Roster (`/employers`)
* Personnel registry for municipal drivers and sanitation teams.
* Generates structured employee IDs (`EMP-XXXXX`) and tracks assigned work orders.

### 7. 🔔 Real-Time Event Notifications
* Event-driven alert bell icon in top navigation.
* Deduplicated alert logs for hazardous spills, battery low-power events, and full-bin triggers with auto-retention.

---

## 🧪 8. Automated Testing & Verification

You can execute the built-in automated test suites from the root directory:

```bash
# 1. Run frontend telemetry chart test suite
npm run test:web

# 2. Test production build compilation and TypeScript checks
npm run build:web

# 3. Test Python ML microservice prediction directly (in a terminal)
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Chemical waste container leaking dangerous toxic liquid near Park Street gate"}'
```

---

## ❓ 9. Troubleshooting & FAQ

* **Port Already in Use (`EADDRINUSE`)**:  
  Ensure ports `5173`, `5000`, or `5001` are not being used by other processes. You can kill existing Node/Python listeners using:
  ```bash
  # Linux/macOS
  npx kill-port 5173 5000 5001
  ```
* **Python Microservice ModuleNotFoundError**:  
  Ensure the virtual environment is activated before running `pip install -r requirements.txt`. You can verify by executing `python3 services/ml/app.py`.
* **AWS DynamoDB Credential Errors**:  
  Ensure your terminal has active AWS credentials configured (`aws configure` or export `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`). Region must be set to `ap-southeast-2`.
* **Login OTP Issue**:  
  Set `DISABLE_EMAIL_OTP=true` in `apps/api/.env` and restart the backend API to log in directly without requiring email delivery.

---

## 📞 Support & Repository Information

* **Repository**: [https://github.com/RAVI5216/Admin_GC](https://github.com/RAVI5216/Admin_GC)
* **Lead Student Contact**: [Insert your contact email / student ID here]
* **Monorepo Version**: 1.0.0
