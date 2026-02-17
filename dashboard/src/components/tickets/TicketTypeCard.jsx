import EmojiPicker from '../onboarding/EmojiPicker.jsx';
import ChannelSelect from '../ChannelSelect.jsx';
import { Trash2, X, ChevronUp, ChevronDown, CirclePlus } from 'lucide-react';

const ACTION_INFO = {
  webhook: { label: 'Webhook', color: 'var(--success)' },
  'private-thread': { label: 'Private Thread', color: 'var(--warning)' },
};

function generateFieldId() {
  return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function FieldRow({ field, onUpdate, onRemove }) {
  return (
    <div className="tk-field-row">
      <input
        type="text"
        className="form-input"
        style={{ flex: 1, minWidth: 50, maxWidth: 125 }}
        value={field.name || ''}
        onChange={(e) => onUpdate({ ...field, name: e.target.value })}
        placeholder="Field name"
        maxLength={45}
      />
      <input
        type="text"
        className="form-input"
        style={{ flex: 1, minWidth: 100 }}
        value={field.label || ''}
        onChange={(e) => onUpdate({ ...field, label: e.target.value })}
        placeholder="Field label"
        maxLength={45}
      />
      <input
        type="text"
        className="form-input"
        style={{ flex: 1, minWidth: 100 }}
        value={field.placeholder || ''}
        onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
        placeholder="Placeholder text"
        maxLength={100}
      />
      <select
        className="form-select"
        style={{ width: 110 }}
        value={field.style || 'short'}
        onChange={(e) => onUpdate({ ...field, style: e.target.value })}
      >
        <option value="short">Short</option>
        <option value="paragraph">Paragraph</option>
      </select>
      <label className="ob-multi-toggle" title="Required field">
        <input
          type="checkbox"
          checked={field.required !== false}
          onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
        />
        <span>Req.</span>
      </label>
      <button className="btn btn-ghost btn-sm" onClick={onRemove} title="Remove field">
        <X color="#ffffff" />
      </button>
    </div>
  );
}

export default function TicketTypeCard({ ticketType, index, total, emojis, channels, onUpdate, onRemove, onMove }) {
  const action = ticketType.action || { type: 'webhook' };
  const info = ACTION_INFO[action.type] || ACTION_INFO.webhook;

  function updateField(fieldIndex, data) {
    const fields = [...(ticketType.fields || [])];
    fields[fieldIndex] = data;
    onUpdate({ ...ticketType, fields });
  }

  function addField() {
    const fields = [...(ticketType.fields || [])];
    if (fields.length >= 5) return;
    fields.push({
      id: generateFieldId(),
      label: '',
      placeholder: '',
      style: 'short',
      required: true,
      maxLength: 2000,
    });
    onUpdate({ ...ticketType, fields });
  }

  function removeField(fieldIndex) {
    onUpdate({ ...ticketType, fields: ticketType.fields.filter((_, i) => i !== fieldIndex) });
  }

  function updateAction(updates) {
    onUpdate({ ...ticketType, action: { ...action, ...updates } });
  }

  function changeActionType(newType) {
    const newAction = { type: newType };
    if (newType === 'webhook') {
      newAction.webhookUrl = action.webhookUrl || '';
    } else {
      newAction.threadChannelId = action.threadChannelId || null;
      newAction.notifyChannelId = action.notifyChannelId || null;
    }
    onUpdate({ ...ticketType, action: newAction });
  }

  return (
    <div className="ob-block-card" style={{ borderLeftColor: info.color }}>
      <div className="ob-block-header">
        <span className="ob-block-badge" style={{ background: info.color }}>{info.label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{index + 1}</span>
        <div className="ob-block-controls">
          <button
            className="btn btn-ghost btn-sm"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            title="Move up"
          >
            <ChevronUp color="#ffffff" />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            title="Move down"
          >
            <ChevronDown color="#ffffff" />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRemove} title="Delete ticket type">
            <Trash2 color="var(--danger)"/>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {/* Emoji + Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <EmojiPicker
            customEmojis={emojis}
            value={ticketType.emoji}
            onChange={(emoji) => onUpdate({ ...ticketType, emoji })}
          />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={ticketType.label || ''}
            onChange={(e) => onUpdate({ ...ticketType, label: e.target.value })}
            placeholder="Ticket type label (shown in dropdown)"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="form-group" style={{ margin: '8px 0' }}>
          <input
            type="text"
            className="form-input"
            value={ticketType.description || ''}
            onChange={(e) => onUpdate({ ...ticketType, description: e.target.value })}
            placeholder="Description (shown below label in dropdown)"
            maxLength={100}
          />
        </div>

        {/* Modal Fields */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Modal Fields
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {(ticketType.fields || []).length} / 5
            </span>
          </div>

          {(ticketType.fields || []).map((field, i) => (
            <FieldRow
              key={field.id}
              field={field}
              onUpdate={(data) => updateField(i, data)}
              onRemove={() => removeField(i)}
            />
          ))}

          {(ticketType.fields || []).length < 5 && (
            <button className="btn btn-ghost btn-sm" onClick={addField} style={{ marginTop: 4 }}>
              <CirclePlus color="#ffffff" />
              Add field
            </button>
          )}
        </div>

        {/* Action Config */}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Action
          </span>

          <select
            className="form-select"
            value={action.type}
            onChange={(e) => changeActionType(e.target.value)}
            style={{ marginBottom: 10 }}
          >
            <option value="webhook">Call a Webhook</option>
            <option value="private-thread">Open a Private Thread</option>
          </select>

          {action.type === 'webhook' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Webhook URL</label>
              <input
                type="text"
                className="form-input"
                value={action.webhookUrl || ''}
                onChange={(e) => updateAction({ webhookUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          {action.type === 'private-thread' && (
            <>
              <div className="form-group" style={{ margin: '0 0 8px 0' }}>
                <label className="form-label" style={{ fontSize: 12 }}>Thread Parent Channel</label>
                <ChannelSelect
                  channels={channels}
                  value={action.threadChannelId}
                  onChange={(v) => updateAction({ threadChannelId: v })}
                  placeholder="Select a channel for threads"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Notification Channel</label>
                <ChannelSelect
                  channels={channels}
                  value={action.notifyChannelId}
                  onChange={(v) => updateAction({ notifyChannelId: v })}
                  placeholder="Select a channel for mod notifications (optional)"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
