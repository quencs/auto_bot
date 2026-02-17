import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const ServerList = lazy(() => import('./pages/ServerList.jsx'));
const Overview = lazy(() => import('./pages/Overview.jsx'));
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const Logs = lazy(() => import('./pages/Logs.jsx'));
const Embeds = lazy(() => import('./pages/Embeds.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Tickets = lazy(() => import('./pages/Tickets.jsx'));

function PageLoader() {
  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/servers" element={<Layout />}>
              <Route index element={<ServerList />} />
            </Route>
            <Route path="/:guildId" element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="welcome" element={<Welcome />} />
              <Route path="logs" element={<Logs />} />
              <Route path="embeds" element={<Embeds />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="tickets" element={<Tickets />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
