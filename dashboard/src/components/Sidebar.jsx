import { NavLink, useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Ticket, LayoutDashboard, User, Logs, PanelsTopLeft, ArrowLeft, ClipboardCheck } from 'lucide-react';

function guildIconUrl(guild) {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=80`;
}

export default function Sidebar() {
  const { guildId } = useParams();
  const [guild, setGuild] = useState(null);

  useEffect(() => {
    if (guildId) {
      api.getGuild(guildId).then(setGuild).catch(() => {});
    }
  }, [guildId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-guild">
        <div className="sidebar-guild-icon">
          {guild?.icon ? (
            <img src={guildIconUrl(guild)} alt="" />
          ) : (
            guild?.name?.[0] || '?'
          )}
        </div>
        <div className="sidebar-guild-name">{guild?.name || 'Loading...'}</div>
      </div>
      <nav className="sidebar-nav">
        <NavLink
          to={`/${guildId}`}
          end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard />
          Overview
        </NavLink>
        <NavLink
          to={`/${guildId}/welcome`}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <User />
          Welcome
        </NavLink>
        <NavLink
          to={`/${guildId}/logs`}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Logs />
          Logs
        </NavLink>
        <NavLink
          to={`/${guildId}/embeds`}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <PanelsTopLeft />
          Embeds
        </NavLink>
        <NavLink
          to={`/${guildId}/onboarding`}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <ClipboardCheck/>
          Onboarding
        </NavLink>
        <NavLink
          to={`/${guildId}/tickets`}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Ticket />
          Tickets
        </NavLink>
      </nav>
      <div className="sidebar-back">
        <Link to="/servers" className="sidebar-link">
          <ArrowLeft />
          All Servers
        </Link>
      </div>
    </aside>
  );
}
