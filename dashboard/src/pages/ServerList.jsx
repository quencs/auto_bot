import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

function guildIconUrl(guild) {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
}

export default function ServerList() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getGuilds()
      .then((data) => {
        if (!cancelled) setGuilds(data);
      })
      .catch((err) => console.error('Failed to fetch guilds:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your Servers</h1>
        <p className="page-description">
          Select a server to manage its settings.
        </p>
      </div>

      {guilds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            No servers found. Make sure the bot is added to your server and you have administrator permissions.
          </p>
          <a
            href={`https://discord.com/oauth2/authorize?client_id=${window.__APP_ID__}&permissions=8&scope=bot`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Add Bot to Server
          </a>
        </div>
      ) : (
        <div className="server-grid">
          {guilds.map((guild) => (
            <Link key={guild.id} to={`/${guild.id}`} className="server-card">
              <div className="server-card-icon">
                {guildIconUrl(guild) ? (
                  <img src={guildIconUrl(guild)} alt="" />
                ) : (
                  guild.name?.[0] || '?'
                )}
              </div>
              <div className="server-card-name">{guild.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
