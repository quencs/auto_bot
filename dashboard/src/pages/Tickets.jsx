import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ModuleCard from '../components/ModuleCard.jsx';
import ChannelSelect from '../components/ChannelSelect.jsx';
import SaveBar from '../components/SaveBar.jsx';
import TicketTypeList from '../components/tickets/TicketTypeList.jsx';
import { Ticket } from 'lucide-react';

export default function Tickets() {
  const { guildId } = useParams();
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [channels, setChannels] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getTickets(guildId),
      api.getGuild(guildId),
    ])
      .then(([tickets, guild]) => {
        setConfig(tickets);
        setOriginal(JSON.stringify(tickets));
        setChannels(guild.channels || []);
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
      const result = await api.updateTickets(guildId, {
        enabled: config.enabled,
        channelId: config.channelId,
        ticketTypes: config.ticketTypes,
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
        <h1 className="page-title">Tickets</h1>
        <p className="page-description">
          Configure the ticket system: ticket types, modal fields, and actions (webhook or private thread).
        </p>
      </div>

      <ModuleCard
        icon={
          <Ticket color="var(--primary)" />
        }
        title="Ticket Module"
        description="Let users create tickets via a button panel and dropdown ticket types."
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
              <label className="form-label">Ticket Channel</label>
              <ChannelSelect
                channels={channels}
                value={config.channelId}
                onChange={(v) => update('channelId', v)}
                placeholder="Select a channel for tickets"
              />
              <p className="form-hint">
                The channel where the ticket panel will be posted via /ticket setup.
              </p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Ticket Types</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {config.ticketTypes?.length || 0} / 25
              </span>
            </div>

            <TicketTypeList
              ticketTypes={config.ticketTypes || []}
              channels={channels}
              emojis={emojis}
              onChange={(ticketTypes) => update('ticketTypes', ticketTypes)}
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
