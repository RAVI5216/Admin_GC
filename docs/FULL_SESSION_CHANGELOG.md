# GarbageGuardian — Full Session Changelog & Engineering Report

**Generated:** October 26, 2026  
**Repository:** `Admin_GC` (Smart City IoT & Waste Management Operations Platform)

---

## Executive Summary

During this session, the codebase underwent comprehensive stabilization, performance optimization, architectural refactoring, and feature expansion:
1. **Restructured the repository into an enterprise monorepo workspace** (`apps/web`, `apps/api`, `services/ml`).
2. **Fixed the smart bin telemetry chart bug** and implemented flat-line rendering for idle/stale bins.
3. **Overhauled the alert & notification system**, eliminating 2,032 legacy duplicates, adding deduplication, 14-day auto-retention, and "Mark All as Read".
4. **Resolved white-screen rendering crashes** with a global React Error Boundary and safe enum fallbacks.
5. **Eliminated loading flicker** with Stale-While-Revalidate (SWR) in-memory caching across all data pages.
6. **Unified the Main Dashboard** to read from the real notification database context.

---

## 1. Monorepo Workspace Restructuring

### Architecture
Reorganized the repository layout to isolate concerns into distinct packages and services:
* **`apps/web/`** (`@smartbin/web`): React 18, Vite, Tailwind CSS, Recharts, Leaflet.
* **`apps/api/`** (`@smartbin/api`): Node.js, Express, AWS DynamoDB DocumentClient, Socket.io.
* **`services/ml/`**: Python 3.10+, Flask, Scikit-Learn NLP classifier.
* **`docs/`**: Centralized documentation and team onboarding guides.

### Root Orchestration (`package.json`)
Created root npm workspace configuration enabling root-level commands:
* `npm run dev:web` — Start Vite frontend dev server.
* `npm run dev:api` — Start Express API server.
* `npm run dev:ml` — Start Python ML microservice.
* `npm run test:web` — Execute frontend unit & chart test suite.
* `npm run build:web` — Compile production Vite bundle.
* `npm run train:ml` — Retrain NLP model on dataset.

*Full Git commit history was preserved across all moved files via `git mv`.*

---

## 2. SmartBin Telemetry & Fill Level History Chart Fix

### The Problem
* The "Fill Level History" chart on [`BinDetailsPage.tsx`](../apps/web/src/pages/BinDetailsPage.tsx) was reading `data.charts.fillLevelHistory`, which was hardcoded to a 12-item slice of **all bins in the city**.
* As a result, visiting `/smart-bins/SmartBin01` or `/smart-bins/SmartBin02` rendered the exact same global curve.
* If a bin had not received updates for 30 days, the chart displayed misleading peaks and valleys extracted from unrelated bins from August.

### The Solution
* **Per-Device History:** Updated [`SmartBinContext.tsx`](../apps/web/src/context/SmartBinContext.tsx) to track `deviceHistory[bin.deviceId]`.
* **Calculation Engine ([`chartDataHelper.ts`](../apps/web/src/utils/chartDataHelper.ts)):** Extracted pure calculation logic:
  * Detects staleness: `(now - lastUpdated) >= 24 hours`.
  * If stale / idle: Generates a flat horizontal plateau at that bin's **actual current fill level** across checkpoints (`24h ago`, `18h ago`, `12h ago`, `6h ago`, `Now`).
  * If live: Dynamically plots real incoming telemetry points for that specific bin.
* **UI Indicator Badge:** Added status badge:
  * Stale: `Steady 47% • No change in ~2 months` (with clock icon).
  * Active: `Live Telemetry Stream` (with pulsing green dot).
* **Scaling:** Set `domain={[0, 100]}` and `unit="%"` on the Y-axis.
* **Automated Test Suite ([`test_chart_generation.mjs`](../apps/web/scripts/test_chart_generation.mjs)):** Created 5 test cases with an ASCII graph renderer (`npm run test:web`).

---

## 3. Real Event Alerts & Notification System Overhaul

### The Problem
* The backend sync function `syncBinsFromDynamo()` was executing an automated `saveAlertNotification()` loop every 20 seconds for every bin with fill >= 70%, filling the DynamoDB `GarbageGuardianDashAdmin` table with over 2,000 duplicate notifications.
* Main dashboard showed 4 static alerts from August that could not be dismissed.

### The Solution
1. **Telemetry Notification Loop Removed:** Removed `saveAlertNotification(bin)` loop from `server.js`.
2. **Database Purge:** Ran batch deletion script, safely erasing 2,032 legacy duplicates while preserving all 5 administrator accounts.
3. **Event-Driven Lifecycle Alerts ([`notificationHelper.js`](../apps/api/services/notificationHelper.js)):**
   * Implemented 10-minute duplicate suppression in memory.
   * Notifications are now triggered only by real administrative events:
     * **AI Urgent Hazard Alerts:** Created when a hazardous report is flagged.
     * **Task Assignments:** Created when a collector is assigned to an overflow bin.
     * **Task Completions:** Created when a problem is resolved.
4. **"Mark All as Read" & Filtering:**
   * Backend endpoint: `PUT /api/notifications/mark-all-read`.
   * Backend endpoint: `DELETE /api/notifications/:id`.
   * Frontend: Added "Mark All as Read" button, view filter tabs (`Active & Urgent`, `All Incident Logs`, `Resolved History`), and per-item delete buttons in [`AlertsPage.tsx`](../apps/web/src/pages/AlertsPage.tsx).
   * Dropdown: Added "Mark all read" link in [`DashboardLayout.tsx`](../apps/web/src/layouts/DashboardLayout.tsx).
5. **14-Day Auto-Retention Service:** Daily background prune in `server.js` erases resolved alerts older than 14 days.
6. **Main Dashboard Unification ([`DashboardPage.tsx`](../apps/web/src/pages/DashboardPage.tsx)):**
   * Replaced client-side synthetic `createAlertsFromBins` with `useNotifications()`.
   * Dashboard "Active Alerts" counter and "Live Alerts" widget now reflect the real database notifications.

---

## 4. Instant Navigation via SWR Data Caching

### The Problem
* Navigating between Reports, Tasks, Employers, and Alerts showed 1–2 second white flashes and loading spinners on every tab click.

### The Solution
* Created [`dataCache.ts`](../apps/web/src/services/dataCache.ts) implementing Stale-While-Revalidate (SWR).
* Cached data renders instantly (**0ms**) from memory while a background fetch silently refreshes the data.
* Integrated into `reportService.ts`, `taskService.ts`, `employerService.ts`, and their respective page components.

---

## 5. Blank Screen Crash Prevention & Global Error Boundary

### The Problem
* Database tasks with legacy statuses (`assigned`, `unassigned`) or missing priorities evaluated to `undefined` in UI metadata maps, throwing runtime exceptions that caused a blank white screen.

### The Solution
* Created [`ErrorBoundary.tsx`](../apps/web/src/components/ErrorBoundary.tsx) with a friendly fallback UI and recovery button.
* Wrapped `<Outlet />` in `DashboardLayout.tsx` and top-level routes in `App.tsx`.
* Added safe getter functions `getPriorityMeta()` and `getStatusMeta()` in `TasksPage.tsx` with fallback defaults.

---

## 6. Python ML Service & AI Incident Triage

* Flask microservice running on port `5001` with a trained scikit-learn TF-IDF + Logistic Regression pipeline.
* Classifies citizen waste complaints into 7 municipal categories (Overflowing Bin, Hazardous Waste, Biohazard, Illegal Dumping, Odor/Pests, Damaged Hardware, Vandalism).
* Suggests responsible department, urgency level, and confidence score.
* Frontend AI playground modal, holdout metrics evaluation modal, and CSV/PDF export modal.

---

## Verification & Status Summary

| Check | Result | Command |
| :--- | :--- | :--- |
| **Monorepo Build** | 0 errors (built in ~2.4s) | `npm run build:web` |
| **Chart Test Suite** | 5/5 passing | `npm run test:web` |
| **API Health** | `{"status":"OK","iot":"Connected"}` | `curl http://localhost:5000/health` |
| **ML Health** | `{"status":"healthy","model_loaded":true}` | `curl http://localhost:5001/health` |
| **Git Working Tree** | Clean / All files tracked | `git status` |
