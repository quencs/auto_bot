import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutGrid, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import EmbedEditor from '../components/EmbedEditor.jsx';
import EmbedPreview from '../components/EmbedPreview.jsx';

function intToHex(color) {
  if (color == null) return '#5865F2';
  return '#' + color.toString(16).padStart(6, '0');
}

const DEFAULT_DATA = {
  title: '',
  description: '',
  url: '',
  color: 0x5865F2,
  timestamp: false,
  author: { name: '', url: '', icon_url: '' },
  footer: { text: '', icon_url: '' },
  thumbnail: { url: '' },
  image: { url: '' },
  fields: [],
};

export default function Embeds() {
  const { guildId } = useParams();
  const [embeds, setEmbeds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, 'new' | embed object
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Editor state
  const [name, setName] = useState('');
  const [data, setData] = useState(DEFAULT_DATA);
  const [channelId, setChannelId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getEmbeds(guildId),
      api.getGuild(guildId),
    ])
      .then(([embs, guild]) => {
        setEmbeds(embs);
        setChannels(guild.channels || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [guildId]);

  function openNew() {
    setEditing('new');
    setName('');
    setData({ ...DEFAULT_DATA, fields: [] });
    setChannelId(null);
    setError(null);
  }

  function openEdit(embed) {
    setEditing(embed);
    setName(embed.name);
    setData(JSON.parse(JSON.stringify(embed.data)));
    setChannelId(embed.channelId);
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        const created = await api.createEmbed(guildId, { name, data, channelId });
        setEmbeds((prev) => [created, ...prev]);
        setEditing(created);
      } else {
        const updated = await api.updateEmbed(guildId, editing._id, { name, data, channelId });
        setEmbeds((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
        setEditing(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(embed) {
    if (!confirm(`Delete embed "${embed.name}"?`)) return;
    try {
      await api.deleteEmbed(guildId, embed._id);
      setEmbeds((prev) => prev.filter((e) => e._id !== embed._id));
      if (editing && editing._id === embed._id) setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend() {
    if (!editing || editing === 'new') return;
    setSending(true);
    setError(null);
    try {
      await api.sendEmbed(guildId, editing._id, channelId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  // Editor mode
  if (editing) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">
            {editing === 'new' ? 'Nouvel Embed' : `Modifier : ${editing.name}`}
          </h1>
          <p className="page-description">
            Construisez un embed Discord et envoyez-le dans n'importe quel canal.
          </p>
        </div>

        {error && <div className="ee-error">{error}</div>}

        <div className="embed-split-layout">
          <div className="embed-split-editor">
            <EmbedEditor
              name={name}
              data={data}
              channelId={channelId}
              channels={channels}
              onNameChange={setName}
              onDataChange={setData}
              onChannelChange={setChannelId}
              onSave={handleSave}
              onCancel={closeEditor}
              onSend={handleSend}
              saving={saving}
              sending={sending}
              isNew={editing === 'new'}
            />
          </div>
          <div className="embed-split-preview">
            <EmbedPreview data={data} />
          </div>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Embeds</h1>
          <p className="page-description">
            Create, save and send rich embeds to any channel.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Embed</button>
      </div>

      {error && <div className="ee-error">{error}</div>}

      {embeds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <LayoutGrid size={48} strokeWidth={1.5} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No embeds yet</p>
          <button className="btn btn-primary" onClick={openNew}>Create your first embed</button>
        </div>
      ) : (
        <div className="embeds-grid">
          {embeds.map((embed) => (
            <div key={embed._id} className="embed-card" style={{ '--embed-color': intToHex(embed.data?.color) }}>
              <div className="embed-card-color" />
              <div className="embed-card-body">
                <div className="embed-card-name">{embed.name}</div>
                <div className="embed-card-desc">
                  {embed.data?.description
                    ? (embed.data.description.length > 80
                      ? embed.data.description.slice(0, 80) + '...'
                      : embed.data.description)
                    : embed.data?.title || 'No content'}
                </div>
                <div className="embed-card-meta">
                  {new Date(embed.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="embed-card-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(embed)}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(embed)}>
                  <Trash2 size={14} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
