import { ChevronUp, ChevronDown, Trash2, X } from 'lucide-react';
import RoleSelect from '../RoleSelect.jsx';
import EmojiPicker from './EmojiPicker.jsx';

function MessageBlockEditor({ block, onChange }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <textarea
        className="form-textarea"
        value={block.content || ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Write your message here..."
        rows={3}
      />
      <p className="form-hint">
        Variables: {'{user}'} = mention, {'{username}'} = username, {'{server}'} = server name
      </p>
    </div>
  );
}

function DelayBlockEditor({ block, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="number"
        className="form-input"
        style={{ width: 100 }}
        min={1}
        max={300}
        value={block.delaySeconds || 5}
        onChange={(e) => onChange({ ...block, delaySeconds: Math.max(1, Math.min(300, Number(e.target.value))) })}
      />
      <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>seconds</span>
    </div>
  );
}

function OptionEditor({ option, index, roles, emojis, showEmoji, onUpdate, onRemove }) {
  return (
    <div className="ob-option-row">
      {showEmoji && (
        <EmojiPicker
          customEmojis={emojis}
          value={option.emoji}
          onChange={(emoji) => onUpdate({ ...option, emoji })}
        />
      )}
      <input
        type="text"
        className="form-input"
        style={{ flex: 1 }}
        value={option.label || ''}
        onChange={(e) => onUpdate({ ...option, label: e.target.value })}
        placeholder="Label"
      />
      <RoleSelect
        roles={roles}
        value={option.action?.roleId || ''}
        onChange={(roleId) => onUpdate({ ...option, action: { type: 'addRole', roleId } })}
        placeholder="Role..."
      />
      <button className="btn btn-ghost btn-sm" onClick={onRemove} title="Remove option">
        <X size={14} />
      </button>
    </div>
  );
}

function ComponentEditor({ component, compIndex, roles, emojis, onUpdate }) {
  function updateOptions(newOptions) {
    onUpdate({ ...component, options: newOptions });
  }

  function addOption() {
    const options = [...(component.options || [])];
    if (options.length >= 25) return;
    options.push({
      label: '',
      value: `opt_${Date.now()}`,
      description: '',
      emoji: null,
      action: { type: 'addRole', roleId: null },
    });
    updateOptions(options);
  }

  function updateOption(idx, data) {
    const options = [...component.options];
    options[idx] = data;
    updateOptions(options);
  }

  function removeOption(idx) {
    updateOptions(component.options.filter((_, i) => i !== idx));
  }

  return (
    <div className="ob-component-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, minWidth: 120 }}
          value={component.placeholder || ''}
          onChange={(e) => onUpdate({ ...component, placeholder: e.target.value })}
          placeholder="Placeholder text..."
        />
        <label className="ob-multi-toggle" title="Allow selecting multiple options">
          <input
            type="checkbox"
            checked={component.multiSelect || false}
            onChange={(e) => onUpdate({ ...component, multiSelect: e.target.checked })}
          />
          <span>Multi-select</span>
        </label>
      </div>
      {(component.options || []).map((opt, i) => (
        <OptionEditor
          key={i}
          option={opt}
          index={i}
          roles={roles}
          emojis={emojis}
          showEmoji={true}
          onUpdate={(data) => updateOption(i, data)}
          onRemove={() => removeOption(i)}
        />
      ))}
      {(component.options || []).length < 25 && (
        <button className="btn btn-ghost btn-sm" onClick={addOption} style={{ marginTop: 4 }}>
          + Add option
        </button>
      )}
    </div>
  );
}

function ActionBlockEditor({ block, roles, emojis, onChange }) {
  function updateComponent(idx, data) {
    const components = [...(block.components || [])];
    components[idx] = data;
    onChange({ ...block, components });
  }

  function addComponent() {
    const components = [...(block.components || [])];
    components.push({ type: 'dropdown', placeholder: '', multiSelect: false, options: [] });
    onChange({ ...block, components });
  }

  function removeComponent(idx) {
    onChange({ ...block, components: block.components.filter((_, i) => i !== idx) });
  }

  return (
    <div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <textarea
          className="form-textarea"
          value={block.actionMessage || ''}
          onChange={(e) => onChange({ ...block, actionMessage: e.target.value })}
          placeholder="Message displayed above the dropdown..."
          rows={2}
        />
      </div>
      {(block.components || []).map((comp, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Component {i + 1}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => removeComponent(i)}>
              Remove
            </button>
          </div>
          <ComponentEditor
            component={comp}
            compIndex={i}
            roles={roles}
            emojis={emojis}
            onUpdate={(data) => updateComponent(i, data)}
          />
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={addComponent} style={{ marginTop: 4 }}>
        + Add component
      </button>
    </div>
  );
}

const TYPE_LABELS = {
  message: { label: 'Message', color: 'var(--primary)' },
  delay: { label: 'Delay', color: 'var(--warning)' },
  action: { label: 'Dropdown', color: 'var(--success)' },
};

export default function BlockCard({ block, index, total, roles, emojis, onUpdate, onRemove, onMove }) {
  const info = TYPE_LABELS[block.type] || TYPE_LABELS.message;

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
            <ChevronUp size={14} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            title="Move down"
          >
            <ChevronDown size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRemove} title="Delete block">
            <Trash2 size={14} color="var(--danger)" />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {block.type === 'message' && (
          <MessageBlockEditor block={block} onChange={onUpdate} />
        )}
        {block.type === 'delay' && (
          <DelayBlockEditor block={block} onChange={onUpdate} />
        )}
        {block.type === 'action' && (
          <ActionBlockEditor block={block} roles={roles} emojis={emojis} onChange={onUpdate} />
        )}
      </div>
    </div>
  );
}
