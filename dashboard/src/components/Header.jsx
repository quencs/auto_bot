import { Link } from 'react-router-dom';
import { Smile } from 'lucide-react';
import { useAuth } from './ProtectedRoute.jsx';
import { api } from '../api/client.js';

function getAvatarUrl(user) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}

export default function Header() {
  const user = useAuth();

  async function handleLogout() {
    await api.logout();
    window.location.href = '/dashboard';
  }

  return (
    <header className="header">
      <Link to="/servers" className="header-logo">
        <Smile size={24} />
        Teemate
      </Link>
      <div className="header-user">
        <span className="header-username">{user.username}</span>
        {getAvatarUrl(user) && (
          <img className="header-avatar" src={getAvatarUrl(user)} alt="" />
        )}
        <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: '13px', padding: '6px 12px' }}>
          Logout
        </button>
      </div>
    </header>
  );
}
