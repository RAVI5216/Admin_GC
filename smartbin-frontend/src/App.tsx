import { Route, Routes, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SmartBinsPage from './pages/SmartBinsPage';
import BinDetailsPage from './pages/BinDetailsPage';
import LiveMapPage from './pages/LiveMapPage';
import CollectionRoutesPage from './pages/CollectionRoutesPage';
import CollectionHistoryPage from './pages/CollectionHistoryPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import EmployersPage from './pages/EmployersPage';
import SearchResultsPage from './pages/SearchResultsPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
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
        <Route path="search" element={<SearchResultsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
