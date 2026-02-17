import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import ServerList from './pages/ServerList.jsx';
import Overview from './pages/Overview.jsx';
import Welcome from './pages/Welcome.jsx';
import Logs from './pages/Logs.jsx';
import Embeds from './pages/Embeds.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Tickets from './pages/Tickets.jsx';

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
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
    </BrowserRouter>
  );
}
