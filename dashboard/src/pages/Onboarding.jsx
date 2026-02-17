import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { api } from '../api/client.js';
import ModuleCard from '../components/ModuleCard.jsx';
import ChannelSelect from '../components/ChannelSelect.jsx';
import SaveBar from '../components/SaveBar.jsx';
import BlockList from '../components/onboarding/BlockList.jsx';

export default function Onboarding() {
  const { guildId } = useParams();
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getOnboarding(guildId),
      api.getGuild(guildId),
    ])
      .then(([onboarding, guild]) => {
        setConfig(onboarding);
        setOriginal(JSON.stringify(onboarding));
        setChannels(guild.channels || []);
        setRoles(guild.roles || []);
        setEmojis(guild.emojis || []);
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
      const result = await api.updateOnboarding(guildId, {
        enabled: config.enabled,
        channelId: config.channelId,
        blocks: config.blocks,
      });
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

  async function handleTest() {
    setTesting(true);
    try {
      await api.testOnboarding(guildId);
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTesting(false);
    }
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
        <h1 className="page-title">Onboarding V2</h1>
        <p className="page-description">
          Create a private thread workflow for new members joining your server.
        </p>
      </div>

      <ModuleCard
        icon={<ClipboardCheck size={24} />}
        title="Onboarding Module"
        description="Create a guided onboarding workflow in a private thread for new members."
        enabled={config?.enabled || false}
        onToggle={() => update('enabled', !config.enabled)}
      />

      {config?.enabled && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Configuration</div>
              <button
                className="btn btn-ghost ob-test-btn"
                onClick={handleTest}
                disabled={testing || !config.channelId || !config.blocks?.length}
              >
                {testing ? 'Testing...' : 'Test Onboarding'}
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Parent Channel</label>
              <ChannelSelect
                channels={channels}
                value={config.channelId}
                onChange={(v) => update('channelId', v)}
                placeholder="Select a channel for threads"
              />
              <p className="form-hint">
                Private threads will be created inside this channel for each new member.
              </p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Workflow Blocks</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {config.blocks?.length || 0} / 20
              </span>
            </div>

            <BlockList
              blocks={config.blocks || []}
              roles={roles}
              emojis={emojis}
              onChange={(blocks) => update('blocks', blocks)}
            />
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
