import TicketTypeCard from './TicketTypeCard.jsx';
import { CirclePlus } from 'lucide-react';

function generateId() {
  return `tt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateFieldId() {
  return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultTicketType() {
  return {
    id: generateId(),
    label: '',
    emoji: null,
    description: '',
    fields: [
      { id: generateFieldId(), name: 'title', label: 'Titre', placeholder: 'Résumé court', style: 'short', required: true, maxLength: 100 },
      { id: generateFieldId(), name: 'description', label: 'Description', placeholder: 'Décris en détail...', style: 'paragraph', required: true, maxLength: 2000 },
    ],
    action: { type: 'webhook', webhookUrl: '' },
  };
}

export default function TicketTypeList({ ticketTypes, channels, emojis, onChange }) {
  function addTicketType() {
    if (ticketTypes.length >= 25) return;
    onChange([...ticketTypes, createDefaultTicketType()]);
  }

  function removeTicketType(index) {
    onChange(ticketTypes.filter((_, i) => i !== index));
  }

  function updateTicketType(index, data) {
    const updated = [...ticketTypes];
    updated[index] = data;
    onChange(updated);
  }

  function moveTicketType(index, dir) {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= ticketTypes.length) return;
    const updated = [...ticketTypes];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    onChange(updated);
  }

  return (
    <div className="ob-block-list">
      {ticketTypes.map((tt, i) => (
        <div key={tt.id}>
          {i > 0 && <div className="ob-connector" />}
          <TicketTypeCard
            ticketType={tt}
            index={i}
            total={ticketTypes.length}
            emojis={emojis}
            channels={channels}
            onUpdate={(data) => updateTicketType(i, data)}
            onRemove={() => removeTicketType(i)}
            onMove={(dir) => moveTicketType(i, dir)}
          />
        </div>
      ))}

      <div className="ob-add-row">
        <button className="btn btn-ghost" onClick={addTicketType} disabled={ticketTypes.length >= 25}>
            <CirclePlus color="#ffffff" /> Add Ticket Type
        </button>
      </div>
    </div>
  );
}
