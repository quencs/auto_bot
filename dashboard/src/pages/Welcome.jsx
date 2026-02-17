import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { api } from '../api/client.js';
import ModuleCard from '../components/ModuleCard.jsx';
import ChannelSelect from '../components/ChannelSelect.jsx';
import SaveBar from '../components/SaveBar.jsx';

export default function Welcome() {
  const { guildId } = useParams();
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getWelcome(guildId),
      api.getGuild(guildId),
    ])
      .then(([welcome, guild]) => {
        setConfig(welcome);
        setOriginal(JSON.stringify(welcome));
        setChannels(guild.channels || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [guildId]);

  const hasChanges = config && JSON.stringify(config) !== original;

  const update = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.updateWelcome(guildId, config);
      setConfig(result);
      setOriginal(JSON.stringify(result));
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(JSON.parse(original));
  }

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
        <h1 className="page-title">Welcome Messages</h1>
        <p className="page-description">
          Send a custom message when new members join your server.
        </p>
      </div>

      <ModuleCard
        icon={<UserRound size={24} />}
        title="Welcome Module"
        description="Enable or disable welcome messages for this server."
        enabled={config?.enabled || false}
        onToggle={() => update('enabled', !config.enabled)}
      />

      {config?.enabled && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Configuration</div>
            </div>

            <div className="form-group">
              <label className="form-label">Channel</label>
              <ChannelSelect
                channels={channels}
                value={config.channelId}
                onChange={(v) => update('channelId', v)}
                placeholder="Select a welcome channel"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea"
                value={config.message || ''}
                onChange={(e) => update('message', e.target.value)}
                placeholder="Welcome {user} to {server}!"
              />
              <p className="form-hint">
                Variables: {'{user}'} = mention, {'{server}'} = server name, {'{username}'} = username
              </p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Embed</div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={config.embedEnabled || false}
                  onChange={() => update('embedEnabled', !config.embedEnabled)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {config.embedEnabled && (
              <>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={config.embedColor || '#5865F2'}
                      onChange={(e) => update('embedColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={config.embedColor || '#5865F2'}
                      onChange={(e) => update('embedColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.embedTitle || ''}
                    onChange={(e) => update('embedTitle', e.target.value)}
                    placeholder="Welcome!"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={config.embedDescription || ''}
                    onChange={(e) => update('embedDescription', e.target.value)}
                    placeholder="Welcome to our server! Read the rules in #rules."
                  />
                </div>

                <div className="section-title" style={{ marginTop: 16 }}>Preview</div>
                <div
                  className="embed-preview"
                  style={{ borderLeftColor: config.embedColor || '#5865F2' }}
                >
                  {config.embedTitle && (
                    <div className="embed-preview-title">{config.embedTitle}</div>
                  )}
                  <div className="embed-preview-desc">
                    {config.embedDescription || 'Your embed description will appear here.'}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <SaveBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
