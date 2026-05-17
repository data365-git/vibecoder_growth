import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api/client';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Team from './pages/Team';
import Dashboard from './pages/Dashboard';
import DailyOverview from './pages/DailyOverview';
// PAUSED 2026-05-16: /standup is paused on the bot, hidden from the
// sidebar, and the route is muted. Restore by un-commenting both lines.
// import Standup from './pages/Standup';
import StatusGrid from './pages/StatusGrid';
import WeeklyReview from './pages/WeeklyReview';
import MonthlyScores from './pages/MonthlyScores';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Help from './pages/Help';

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="daily" element={<DailyOverview />} />
        {/* PAUSED: <Route path="standup" element={<Standup />} /> */}
        <Route path="status" element={<StatusGrid />} />
        <Route path="team" element={<Team />} />
        <Route path="weekly/:vibecoderId?" element={<WeeklyReview />} />
        <Route path="scores/:yyyymm?" element={<MonthlyScores />} />
        <Route path="logs/:type?" element={<Logs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
      </Route>
    </Routes>
  );
}
