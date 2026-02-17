import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRound, FileText, LayoutGrid, ChevronRight } from 'lucide-react';
import { api } from '../api/client.js';
import ModuleCard from '../components/ModuleCard.jsx';

export default function Overview() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getConfig(guildId),
      api.getGuild(guildId),
    ])
      .then(([cfg, g]) => {
        setConfig(cfg);
        setGuild(g);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [guildId]);

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
        <h1 className="page-title">Overview</h1>
        <p className="page-description">
          Manage modules for {guild?.name || 'your server'}.
        </p>
      </div>

      {guild && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="server-card-icon" style={{ width: 56, height: 56, fontSize: 24 }}>
              {guild.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`} alt="" />
              ) : (
                guild.name[0]
              )}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{guild.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                {guild.channels?.length || 0} channels &middot; {guild.roles?.length || 0} roles
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">Modules</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => navigate(`/${guildId}/welcome`)} style={{ cursor: 'pointer' }}>
            <ModuleCard
              icon={<UserRound size={24} />}
              title="Welcome Messages"
              description="Send a custom welcome message when new members join your server."
              enabled={config?.welcome?.enabled || false}
              onToggle={async (e) => {
                e.stopPropagation();
                const updated = { ...config, welcome: { ...config.welcome, enabled: !config.welcome.enabled } };
                setConfig(updated);
                await api.updateWelcome(guildId, { enabled: !config.welcome.enabled });
              }}
            />
          </div>
          <div onClick={() => navigate(`/${guildId}/logs`)} style={{ cursor: 'pointer' }}>
            <ModuleCard
              icon={<FileText size={24} />}
              title="Moderation Logs"
              description="Track member joins, leaves, message edits/deletes, bans, and more."
              enabled={config?.logs?.enabled || false}
              onToggle={async (e) => {
                e.stopPropagation();
                const updated = { ...config, logs: { ...config.logs, enabled: !config.logs.enabled } };
                setConfig(updated);
                await api.updateLogs(guildId, { enabled: !config.logs.enabled });
              }}
            />
          </div>
          <div onClick={() => navigate(`/${guildId}/embeds`)} style={{ cursor: 'pointer' }}>
            <div className="module-card">
              <div className="module-card-icon">
                <LayoutGrid size={24} />
              </div>
              <div className="module-card-info">
                <div className="module-card-title">Embeds</div>
                <div className="module-card-desc">Create, save and send rich embed messages to any channel.</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
