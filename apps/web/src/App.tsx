import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SmartBinsPage = lazy(() => import('./pages/SmartBinsPage'));
const BinDetailsPage = lazy(() => import('./pages/BinDetailsPage'));
const LiveMapPage = lazy(() => import('./pages/LiveMapPage'));
const CollectionRoutesPage = lazy(() => import('./pages/CollectionRoutesPage'));
const CollectionHistoryPage = lazy(() => import('./pages/CollectionHistoryPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EmployersPage = lazy(() => import('./pages/EmployersPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[300px] w-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallbackTitle="GarbageGuardian Application Error">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="smart-bins" element={<SmartBinsPage />} />
            <Route path="smart-bins/:id" element={<BinDetailsPage />} />
            <Route path="live-map" element={<LiveMapPage />} />
            <Route path="collection-routes" element={<CollectionRoutesPage />} />
            <Route path="collection-history" element={<CollectionHistoryPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="employers" element={<EmployersPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="search" element={<SearchResultsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
