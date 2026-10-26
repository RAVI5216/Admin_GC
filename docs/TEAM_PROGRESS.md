# Team Progress Tracker & Changelog

This document tracks completed engineering milestones, bug fixes, and architectural improvements across the GarbageGuardian platform.

---

## Completed Milestones

### Milestone 1: Monorepo Workspace Restructuring
* **Date:** October 26, 2026
* **Changes:**
  * Restructured codebase into clean monorepo: `apps/web/`, `apps/api/`, `services/ml/`.
  * Added unified root `package.json` with npm workspaces (`@smartbin/web`, `@smartbin/api`).
  * Created `docs/` folder for architectural documentation and team progress tracking.
  * Preserved full Git history with `git mv`.

---

### Milestone 2: SmartBin Chart Generation & Stale Bin Telemetry
* **Problem:** Charts on bin details pages were mistakenly displaying a shared 12-bin slice of the entire fleet, causing every bin to render identical curves.
* **Resolution:**
  * Created pure calculation helper [`chartDataHelper.ts`](../apps/web/src/utils/chartDataHelper.ts).
  * Maintained per-device history mapping (`deviceHistory[bin.deviceId]`) in `SmartBinContext`.
  * If a bin has had no telemetry changes in >= 24 hours (or months), it displays a flat horizontal line reflecting that bin's **actual current fill level** (`Steady 47% • No change in ~2 months`).
  * Explicitly bounded the Y-axis to `domain={[0, 100]}` with `%` formatting.
  * Created automated unit test suite with ASCII visualizer (`npm test:web`).

---

### Milestone 3: Real Event Alerts & Spam Notification Cleanup
* **Problem:** Every 20 seconds, the backend looped through all bins and created notifications for every full bin, accumulating 2,032 duplicate records in DynamoDB.
* **Resolution:**
  * Removed the periodic telemetry notification insertion loop in `server.js`.
  * Purged all 2,032 legacy duplicate notifications from `GarbageGuardianDashAdmin` while preserving admin accounts.
  * Implemented an in-memory 10-minute duplicate suppression service (`notificationHelper.js`).
  * Tied notifications exclusively to real lifecycle events:
    1. AI Urgent Hazard Triage (Critical toxic/flammable spills).
    2. Task Assignments (collector assigned to an overflow job).
    3. Task Completions (problem resolved).
  * Added "Mark All as Read", view filter tabs (`Active`, `All`, `Resolved`), and single-item deletion.
  * Added 14-day auto-retention service to automatically prune old incident logs.
  * Unified the main Dashboard "Live Alerts" widget to read from the real notification context.

---

### Milestone 4: Instant Navigation (SWR In-Memory Caching)
* **Problem:** Switching between Reports, Tasks, and Employers tabs caused 2-second loading spinners and screen flickering.
* **Resolution:**
  * Built [`dataCache.ts`](../apps/web/src/services/dataCache.ts) implementing Stale-While-Revalidate (SWR).
  * Pages now render cached data instantly (0ms) upon navigation while revalidating silently in the background.

---

### Milestone 5: Global Error Boundary & Crash Prevention
* **Problem:** Invalid legacy task statuses (`assigned`, `unassigned`) and missing priorities caused unhandled React crashes resulting in a white screen.
* **Resolution:**
  * Built [`ErrorBoundary.tsx`](../apps/web/src/components/ErrorBoundary.tsx) wrapping router outlets and top-level views.
  * Added fallback lookups `getPriorityMeta()` and `getStatusMeta()` in `TasksPage.tsx`.

---

## Active Service Endpoints

* **Frontend Web Portal:** `http://localhost:5173/`
* **Backend API:** `http://localhost:5000/` (Health check: `/health`)
* **Python ML Classifier:** `http://localhost:5001/` (Health check: `/health`, Predict: `/classify`)
