# Getting Started — Team Setup Guide

This guide will help any team member set up and run the GarbageGuardian monorepo on their local machine.

---

## 1. Prerequisites

* **Node.js**: `v18.x` or `v20.x`
* **Python**: `3.10+`
* **AWS Credentials**: AWS IAM credentials configured with read/write access to DynamoDB tables (`~/.aws/credentials` or environment variables).

---

## 2. Installation

Clone the repository and install all dependencies:

```bash
# Clone the repository
git clone <repo-url>
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

---

## 3. Running Services Locally

You can launch each service from the root directory:

### Terminal 1: Backend API
```bash
npm run dev:api
# Running on http://localhost:5000
```

### Terminal 2: Python ML Microservice
```bash
# Activate virtual environment and start Flask
services/ml/venv/bin/python services/ml/app.py
# Running on http://localhost:5001
```

### Terminal 3: Frontend Web Portal
```bash
npm run dev:web
# Running on http://localhost:5173
```

---

## 4. Running Tests & Builds

```bash
# Run unit & chart simulation tests
npm run test:web

# Build frontend production bundle
npm run build:web
```
