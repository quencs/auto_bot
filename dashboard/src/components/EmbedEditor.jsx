import { useRef } from 'react';
import { Send, UserRound, Image, ChevronUp, ChevronDown, X } from 'lucide-react';
import ChannelSelect from './ChannelSelect.jsx';

const COLOR_PRESETS = [
  0xED4245, 0xE67E22, 0xFEE75C, 0x57F287,
  0x1ABC9C, 0x5865F2, 0x9B59B6, 0xEB459E,
];

function intToHex(num) {
  if (num == null) return '#5865f2';
  return '#' + num.toString(16).padStart(6, '0');
}

function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

function countChars(data) {
  let total = 0;
  if (data.title) total += data.title.length;
  if (data.description) total += data.description.length;
  if (data.author?.name) total += data.author.name.length;
  if (data.footer?.text) total += data.footer.text.length;
  if (data.fields) {
    for (const f of data.fields) {
      total += (f.name || '').length + (f.value || '').length;
    }
  }
  return total;
}

function AvatarPlaceholder({ src, size = 32 }) {
  if (src) {
    return <img className="ve-avatar-img" src={src} alt="" style={{ width: size, height: size }} />;
  }
  return (
    <div className="ve-avatar-placeholder" style={{ width: size, height: size }}>
      <UserRound size={size * 0.5} strokeWidth={1.5} />
    </div>
  );
}

function ImagePlaceholder({ src, onUrlChange, className }) {
  if (src) {
    return (
      <div className={`ve-img-filled ${className || ''}`}>
        <img src={src} alt="" />
        <button className="ve-img-remove" onClick={() => onUrlChange('')}>&times;</button>
      </div>
    );
  }
  return (
    <div className={`ve-img-drop ${className || ''}`}>
      <Image size={24} strokeWidth={1.5} />
      <input
        type="text"
        className="ve-img-url-input"
        placeholder="Image URL"
        onBlur={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onUrlChange(e.target.value); }}
      />
    </div>
  );
}

export default function EmbedEditor({
  name, data, channelId, channels,
  onNameChange, onDataChange, onChannelChange,
  onSave, onCancel, onSend, saving, sending, isNew,
}) {
  const colorRef = useRef(null);
  const charCount = countChars(data);
  const overLimit = charCount > 6000;
  const embedColor = intToHex(data.color);

  function updateField(path, value) {
    const next = JSON.parse(JSON.stringify(data));
    const keys = path.split('.');
    let obj = next;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onDataChange(next);
  }

  function addField() {
    onDataChange({ ...data, fields: [...(data.fields || []), { name: '', value: '', inline: false }] });
  }

  function removeField(index) {
    const fields = [...(data.fields || [])];
    fields.splice(index, 1);
    onDataChange({ ...data, fields });
  }

  function updateFieldItem(index, key, value) {
    const fields = [...(data.fields || [])];
    fields[index] = { ...fields[index], [key]: value };
    onDataChange({ ...data, fields });
  }

  function moveField(index, dir) {
    const fields = [...(data.fields || [])];
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    onDataChange({ ...data, fields });
  }

  return (
    <div className="ve-root">
      {/* Top bar: name + channel + send */}
      <div className="ve-topbar">
        <input
          type="text"
          className="ve-name-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nom de l'embed"
        />
        <div className="ve-topbar-right">
          <ChannelSelect
            channels={channels}
            value={channelId}
            onChange={onChannelChange}
            placeholder="Canal d'envoi"
          />
          <button
            className="btn btn-primary"
            onClick={onSend}
            disabled={sending || isNew}
            title={isNew ? "Sauvegardez d'abord" : ''}
          >
            <Send size={16} />
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>

      {/* Color swatches */}
      <div className="ve-colors">
        <span className="ve-colors-label">Couleur</span>
        <div className="ve-swatches">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              className={`ve-swatch ${data.color === c ? 've-swatch-active' : ''}`}
              style={{ background: intToHex(c) }}
              onClick={() => updateField('color', c)}
            />
          ))}
          <button className="ve-swatch ve-swatch-custom" onClick={() => colorRef.current?.click()}>
            <input
              ref={colorRef}
              type="color"
              value={embedColor}
              onChange={(e) => updateField('color', hexToInt(e.target.value))}
              tabIndex={-1}
            />
          </button>
        </div>
      </div>

      {/* Visual embed editor */}
      <div className="ve-embed" style={{ '--ve-color': embedColor }}>
        <div className="ve-bar" />

        <div className="ve-body">
          <div className="ve-main">
            {/* Author row */}
            <div className="ve-author-row">
              <AvatarPlaceholder src={data.author?.icon_url} size={28} />
              <input
                type="text"
                className="ve-inline-input"
                value={data.author?.name || ''}
                onChange={(e) => updateField('author.name', e.target.value)}
                placeholder="Nom"
                maxLength={256}
              />
              <input
                type="text"
                className="ve-inline-input ve-inline-input-secondary"
                value={data.author?.url || ''}
                onChange={(e) => updateField('author.url', e.target.value)}
                placeholder="Lien"
              />
            </div>

            {/* Author icon URL (subtle) */}
            <input
              type="text"
              className="ve-subtle-url"
              value={data.author?.icon_url || ''}
              onChange={(e) => updateField('author.icon_url', e.target.value)}
              placeholder="URL icone auteur"
            />

            {/* Title */}
            <input
              type="text"
              className="ve-title-input"
              value={data.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Titre"
              maxLength={256}
            />

            {/* Title URL */}
            <input
              type="text"
              className="ve-subtle-url"
              value={data.url || ''}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="URL du titre"
            />

            {/* Description */}
            <textarea
              className="ve-desc-input"
              value={data.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Description"
              maxLength={4096}
              rows={4}
            />

            {/* Fields */}
            {(data.fields || []).map((field, i) => (
              <div key={i} className="ve-field-card">
                <div className="ve-field-top">
                  <span className="ve-field-badge">Champ {i + 1}</span>
                  <div className="ve-field-controls">
                    <button onClick={() => moveField(i, -1)} disabled={i === 0} title="Monter">
                      <ChevronUp size={12} />
                    </button>
                    <button onClick={() => moveField(i, 1)} disabled={i === (data.fields || []).length - 1} title="Descendre">
                      <ChevronDown size={12} />
                    </button>
                    <button onClick={() => removeField(i)} title="Supprimer" className="ve-field-remove">
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <div className="ve-field-inputs">
                  <input
                    type="text"
                    className="ve-inline-input"
                    value={field.name}
                    onChange={(e) => updateFieldItem(i, 'name', e.target.value)}
                    placeholder="Nom"
                    maxLength={256}
                  />
                  <textarea
                    className="ve-field-value"
                    value={field.value}
                    onChange={(e) => updateFieldItem(i, 'value', e.target.value)}
                    placeholder="Valeur"
                    maxLength={1024}
                    rows={2}
                  />
                </div>
                <label className="ve-field-inline-check">
                  <input
                    type="checkbox"
                    checked={field.inline || false}
                    onChange={(e) => updateFieldItem(i, 'inline', e.target.checked)}
                  />
                  Inline
                </label>
              </div>
            ))}

            {(data.fields || []).length < 25 && (
              <button className="ve-add-field-btn" onClick={addField}>
                Ajouter Un Champ
              </button>
            )}

            {/* Image zone */}
            <ImagePlaceholder
              src={data.image?.url}
              onUrlChange={(v) => updateField('image.url', v)}
              className="ve-image-zone"
            />
          </div>

          {/* Thumbnail (right side) */}
          <div className="ve-thumb-col">
            <ImagePlaceholder
              src={data.thumbnail?.url}
              onUrlChange={(v) => updateField('thumbnail.url', v)}
              className="ve-thumb-zone"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="ve-footer-row">
          <AvatarPlaceholder src={data.footer?.icon_url} size={22} />
          <input
            type="text"
            className="ve-inline-input"
            value={data.footer?.text || ''}
            onChange={(e) => updateField('footer.text', e.target.value)}
            placeholder="Pied de page"
            maxLength={2048}
          />
          <label className="ve-ts-check">
            <input
              type="checkbox"
              checked={data.timestamp || false}
              onChange={(e) => updateField('timestamp', e.target.checked)}
            />
            Timestamp
          </label>
        </div>

        {/* Footer icon URL (subtle) */}
        <input
          type="text"
          className="ve-subtle-url ve-subtle-url-footer"
          value={data.footer?.icon_url || ''}
          onChange={(e) => updateField('footer.icon_url', e.target.value)}
          placeholder="URL icone pied de page"
        />
      </div>

      {/* Bottom actions */}
      <div className="ve-actions">
        <span className={`ve-char-count ${overLimit ? 've-char-over' : ''}`}>
          {charCount} / 6000
        </span>
        <div className="ve-actions-right">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving || overLimit || !name?.trim()}>
            {saving ? 'Sauvegarde...' : isNew ? 'Creer' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
