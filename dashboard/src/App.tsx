import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RealtimeDashboard from './pages/RealtimeDashboard';
import PageDetail from './pages/PageDetail';
import PerformanceTrend from './pages/PerformanceTrend';
import ComparisonAnalysis from './pages/ComparisonAnalysis';
import BehaviorAnalytics from './pages/BehaviorAnalytics';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RealtimeDashboard />} />
        <Route path="/page-detail" element={<PageDetail />} />
        <Route path="/performance" element={<PerformanceTrend />} />
        <Route path="/comparison" element={<ComparisonAnalysis />} />
        <Route path="/behavior" element={<BehaviorAnalytics />} />
      </Route>
    </Routes>
  );
}
